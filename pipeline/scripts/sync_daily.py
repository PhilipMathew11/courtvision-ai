"""Refresh NBA rosters and current-season stats into PostgreSQL."""
import argparse
import json
import logging
import os
import sys
import time
from datetime import date, datetime
from math import isfinite

from sqlalchemy import create_engine, text
from nba_api.stats.endpoints import (
    commonteamroster,
    leaguegamelog,
    leaguedashplayerstats,
    leaguedashteamstats,
)
from nba_api.stats.static import players, teams

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from processors.daily_sync import build_dna_scores, current_nba_season

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)

NBA_SYNC_LOCK_ID = 2026093001
NBA_API_DELAY = float(os.getenv("NBA_API_DELAY", "1"))
NBA_API_TIMEOUT = int(os.getenv("NBA_API_TIMEOUT", "15"))
PLAYER_STAT_COLUMNS = {
    "games_played": "GP",
    "games_started": "GS",
    "min": "MIN",
    "fgm": "FGM",
    "fga": "FGA",
    "fg_pct": "FG_PCT",
    "fg3m": "FG3M",
    "fg3a": "FG3A",
    "fg3_pct": "FG3_PCT",
    "ftm": "FTM",
    "fta": "FTA",
    "ft_pct": "FT_PCT",
    "oreb": "OREB",
    "dreb": "DREB",
    "reb": "REB",
    "ast": "AST",
    "stl": "STL",
    "blk": "BLK",
    "tov": "TOV",
    "pts": "PTS",
}
ADVANCED_STAT_COLUMNS = {
    "per": "PER",
    "ts_pct": "TS_PCT",
    "usg_pct": "USG_PCT",
    "off_rtg": "OFF_RATING",
    "def_rtg": "DEF_RATING",
    "net_rtg": "NET_RATING",
}


def fetch_frame(label, factory, attempts=2):
    for attempt in range(1, attempts + 1):
        try:
            time.sleep(NBA_API_DELAY)
            return factory().get_data_frames()[0]
        except Exception:
            if attempt == attempts:
                logger.exception("NBA API request failed: %s", label)
                raise
            wait = min(2 * attempt, 4)
            logger.warning(
                "NBA API request failed (%s, attempt %s/%s); retrying in %ss",
                label,
                attempt,
                attempts,
                wait,
                exc_info=True,
            )
            time.sleep(wait)


def _number(value):
    if value is None:
        return None
    if hasattr(value, "item"):
        value = value.item()
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not isfinite(number):
        return None
    return number


def _integer(value):
    number = _number(value)
    return int(number) if number is not None else None


def _percentage_display(value):
    number = _number(value)
    return number * 100 if number is not None else None


def _date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()


def _static_team_rows():
    return [
        {
            "nba_id": int(team["id"]),
            "full_name": team["full_name"],
            "abbreviation": team["abbreviation"],
            "nickname": team["nickname"],
            "city": team["city"],
            "state": team["state"],
            "year_founded": team["year_founded"],
        }
        for team in teams.get_teams()
    ]


def _static_player_rows():
    return [
        {
            "nba_id": int(player["id"]),
            "full_name": player["full_name"],
            "first_name": player["first_name"],
            "last_name": player["last_name"],
            "is_active": bool(player["is_active"]),
        }
        for player in players.get_players()
    ]


def _fetch_rosters(season, team_rows):
    roster_records = []
    failed_teams = []
    for team in team_rows:
        try:
            frame = fetch_frame(
                f"roster {team['abbreviation']} {season}",
                lambda team_id=team["nba_id"]: commonteamroster.CommonTeamRoster(
                    team_id=team_id,
                    season=season,
                    timeout=NBA_API_TIMEOUT,
                ),
            )
            records = frame.to_dict("records")
            if not records:
                failed_teams.append(team["abbreviation"])
                logger.warning(
                    "Roster endpoint returned no players for %s in %s",
                    team["abbreviation"],
                    season,
                )
            roster_records.extend(records)
        except Exception:
            logger.exception("Roster refresh failed for %s", team["abbreviation"])
            raise RuntimeError(
                f"Roster sync failed for {team['abbreviation']}; stopping this run"
            )
    if failed_teams:
        logger.error(
            "Roster sync incomplete for %s of %s teams: %s",
            len(failed_teams),
            len(team_rows),
            ", ".join(failed_teams),
        )
    return roster_records, failed_teams


def _game_rows(records, season, season_type, team_ids):
    grouped = {}
    for row in records:
        game_id = str(row.get("GAME_ID") or "").strip()
        if game_id:
            grouped.setdefault(game_id, []).append(row)

    games = []
    for game_id, sides in grouped.items():
        if len(sides) != 2:
            logger.warning(
                "Skipping game %s: expected two team rows, got %s",
                game_id,
                len(sides),
            )
            continue
        home = next((row for row in sides if "vs." in str(row.get("MATCHUP", ""))), None)
        away = next((row for row in sides if "@" in str(row.get("MATCHUP", ""))), None)
        if home is None or away is None:
            logger.warning("Skipping game %s: unable to identify home and away teams", game_id)
            continue

        home_score = _integer(home.get("PTS"))
        away_score = _integer(away.get("PTS"))
        if home_score is None or away_score is None:
            continue
        home_abbreviation = str(home.get("TEAM_ABBREVIATION") or "").strip()
        away_abbreviation = str(away.get("TEAM_ABBREVIATION") or "").strip()
        if not home_abbreviation or not away_abbreviation:
            logger.warning("Skipping game %s: missing team abbreviation", game_id)
            continue

        game_date = _date(home["GAME_DATE"])
        games.append(
            {
                "nba_game_id": game_id,
                "season": season,
                "season_type": season_type,
                "game_date": game_date,
                "home_team_id": team_ids.get(_integer(home.get("TEAM_ID"))),
                "away_team_id": team_ids.get(_integer(away.get("TEAM_ID"))),
                "home_team_abbreviation": home_abbreviation,
                "away_team_abbreviation": away_abbreviation,
                "home_team_score": home_score,
                "away_team_score": away_score,
                "status": "Final",
                "period": 0,
                "game_clock": None,
                "attendance": None,
                "home_team": home_abbreviation,
                "away_team": away_abbreviation,
                "home_score": home_score,
                "away_score": away_score,
                "home_win": int(home_score > away_score),
            }
        )
    return games


def _player_stat_rows(base_records, advanced_records, season, season_type, player_ids, team_ids):
    advanced_by_key = {
        (_integer(row.get("PLAYER_ID")), _integer(row.get("TEAM_ID"))): row
        for row in advanced_records
    }
    rows = []
    profile_candidates = {}
    for base in base_records:
        nba_player_id = _integer(base.get("PLAYER_ID"))
        player_id = player_ids.get(nba_player_id)
        if player_id is None:
            continue
        nba_team_id = _integer(base.get("TEAM_ID"))
        team_id = team_ids.get(nba_team_id)
        advanced = advanced_by_key.get((nba_player_id, nba_team_id), {})
        values = {
            column: _number(base.get(source))
            for column, source in PLAYER_STAT_COLUMNS.items()
        }
        values.update(
            {
                column: _number(advanced.get(source))
                for column, source in ADVANCED_STAT_COLUMNS.items()
            }
        )
        values.update(
            {
                "player_id": player_id,
                "team_id": team_id,
                "season": season,
                "season_type": season_type,
            }
        )
        for column in ("games_played", "games_started"):
            values[column] = _integer(base.get(PLAYER_STAT_COLUMNS[column]))
        rows.append(values)
        if season_type == "Regular Season":
            profile = dict(base)
            profile.update(advanced)
            profile["PLAYER_ID"] = nba_player_id
            profile["SEASON"] = season
            profile["_TEAM_ID"] = nba_team_id
            profile["_PLAYER_ID"] = player_id
            profile["_TEAM_DB_ID"] = team_id
            profile_candidates.setdefault(nba_player_id, []).append(profile)
    profiles = []
    for candidates in profile_candidates.values():
        totals = [
            row for row in candidates
            if _integer(row.get("_TEAM_ID")) == 0
            or str(row.get("TEAM_ABBREVIATION", "")).upper() == "TOT"
        ]
        profiles.append(
            max(
                totals or candidates,
                key=lambda row: _number(row.get("GP")) or 0,
            )
        )
    return rows, profiles


def _team_stat_rows(basic_records, advanced_records, opponent_records, season):
    advanced_by_team = {
        _integer(row.get("TEAM_ID")): row for row in advanced_records
    }
    opponent_by_team = {
        _integer(row.get("TEAM_ID")): row for row in opponent_records
    }
    rows = []
    for basic in basic_records:
        abbreviation = str(basic.get("TEAM_ABBREVIATION") or "").strip()
        nba_team_id = _integer(basic.get("TEAM_ID"))
        if not abbreviation or nba_team_id is None:
            continue
        advanced = advanced_by_team.get(nba_team_id, {})
        opponent = opponent_by_team.get(nba_team_id, {})
        rows.append(
            {
                "team_abbreviation": abbreviation,
                "season": season,
                "gp": _integer(basic.get("GP")),
                "wins": _integer(basic.get("W")),
                "losses": _integer(basic.get("L")),
                "win_pct": _number(basic.get("W_PCT")),
                "pts": _number(basic.get("PTS")),
                "opp_pts": _number(opponent.get("PTS")),
                "reb": _number(basic.get("REB")),
                "ast": _number(basic.get("AST")),
                "stl": _number(basic.get("STL")),
                "blk": _number(basic.get("BLK")),
                "tov": _number(basic.get("TOV")),
                "fg_pct": _number(basic.get("FG_PCT")),
                "fg3_pct": _number(basic.get("FG3_PCT")),
                "ft_pct": _number(basic.get("FT_PCT")),
                "plus_minus": _number(basic.get("PLUS_MINUS")),
                "off_rating": _number(advanced.get("OFF_RATING")),
                "def_rating": _number(advanced.get("DEF_RATING")),
                "pace": _number(advanced.get("PACE")),
                "ts_pct": _number(advanced.get("TS_PCT")),
            }
        )
    return rows


def _upsert_rosters(connection, team_rows, player_rows, roster_records, failed_rosters):
    if team_rows:
        connection.execute(
            text(
                """
                INSERT INTO teams
                    (nba_id, full_name, abbreviation, nickname, city, state, year_founded)
                VALUES
                    (:nba_id, :full_name, :abbreviation, :nickname, :city, :state, :year_founded)
                ON CONFLICT (nba_id) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    abbreviation = EXCLUDED.abbreviation,
                    nickname = EXCLUDED.nickname,
                    city = EXCLUDED.city,
                    state = EXCLUDED.state,
                    year_founded = EXCLUDED.year_founded,
                    updated_at = NOW()
                """
            ),
            team_rows,
        )
    if player_rows:
        connection.execute(
            text(
                """
                INSERT INTO players
                    (nba_id, full_name, first_name, last_name, is_active)
                VALUES
                    (:nba_id, :full_name, :first_name, :last_name, :is_active)
                ON CONFLICT (nba_id) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    is_active = EXCLUDED.is_active,
                    updated_at = NOW()
                """
            ),
            player_rows,
        )
    team_ids = dict(
        connection.execute(text("SELECT nba_id, id FROM teams")).fetchall()
    )
    player_ids = dict(
        connection.execute(text("SELECT nba_id, id FROM players")).fetchall()
    )
    abbreviation_by_id = dict(
        connection.execute(text("SELECT id, abbreviation FROM teams")).fetchall()
    )
    if not failed_rosters:
        connection.execute(
            text(
                """
                UPDATE players
                SET team_id = NULL, team_abbreviation = NULL, updated_at = NOW()
                WHERE is_active IS TRUE
                """
            )
        )
    for roster_player in roster_records:
        player_id = player_ids.get(_integer(roster_player.get("PLAYER_ID")))
        team_id = team_ids.get(_integer(roster_player.get("TeamID")))
        if player_id is None or team_id is None:
            continue
        connection.execute(
            text(
                """
                UPDATE players
                SET team_id = :team_id,
                    team_abbreviation = :team_abbreviation,
                    jersey_number = :jersey_number,
                    position = :position,
                    height = :height,
                    weight = :weight,
                    updated_at = NOW()
                WHERE id = :player_id
                """
            ),
            {
                "team_id": team_id,
                "team_abbreviation": abbreviation_by_id.get(team_id),
                "jersey_number": str(roster_player.get("NUM") or "") or None,
                "position": str(roster_player.get("POSITION") or "") or None,
                "height": str(roster_player.get("HEIGHT") or "") or None,
                "weight": str(roster_player.get("WEIGHT") or "") or None,
                "player_id": player_id,
            },
        )
    return team_ids, player_ids


def _upsert_season_stats(connection, rows):
    for row in rows:
        values = dict(row)
        key_columns = {"player_id", "team_id", "season", "season_type"}
        assignments = ", ".join(
            f"{column} = :{column}" for column in values if column not in key_columns
        )
        result = connection.execute(
            text(
                f"""
                UPDATE player_season_stats
                SET {assignments}, updated_at = NOW()
                WHERE player_id = :player_id
                  AND team_id IS NOT DISTINCT FROM :team_id
                  AND season = :season
                  AND season_type = :season_type
                """
            ),
            values,
        )
        if result.rowcount == 0:
            columns = ", ".join(values)
            bind_names = ", ".join(f":{column}" for column in values)
            connection.execute(
                text(f"INSERT INTO player_season_stats ({columns}) VALUES ({bind_names})"),
                values,
            )


def _upsert_team_stats(connection, rows):
    for row in rows:
        columns = ", ".join(row)
        bind_names = ", ".join(f":{column}" for column in row)
        update_columns = [column for column in row if column not in ("season", "team_abbreviation")]
        assignments = ", ".join(
            f"{column} = EXCLUDED.{column}" for column in update_columns
        )
        connection.execute(
            text(
                f"INSERT INTO team_season_stats ({columns}) VALUES ({bind_names}) "
                "ON CONFLICT (team_abbreviation, season) DO UPDATE SET "
                f"{assignments}, updated_at = NOW()"
            ),
            row,
        )


def _upsert_games(connection, rows):
    for row in rows:
        game_values = {
            key: row[key]
            for key in (
                "nba_game_id",
                "season",
                "season_type",
                "game_date",
                "home_team_id",
                "away_team_id",
                "home_team_score",
                "away_team_score",
                "home_team_abbreviation",
                "away_team_abbreviation",
                "status",
                "period",
                "game_clock",
                "attendance",
            )
        }
        connection.execute(
            text(
                """
                INSERT INTO games (
                    nba_game_id, season, season_type, game_date,
                    home_team_id, away_team_id, home_team_score, away_team_score,
                    home_team_abbreviation, away_team_abbreviation, status, period,
                    game_clock, attendance
                ) VALUES (
                    :nba_game_id, :season, :season_type, :game_date,
                    :home_team_id, :away_team_id, :home_team_score, :away_team_score,
                    :home_team_abbreviation, :away_team_abbreviation, :status, :period,
                    :game_clock, :attendance
                )
                ON CONFLICT (nba_game_id) DO UPDATE SET
                    season = EXCLUDED.season,
                    season_type = EXCLUDED.season_type,
                    game_date = EXCLUDED.game_date,
                    home_team_id = EXCLUDED.home_team_id,
                    away_team_id = EXCLUDED.away_team_id,
                    home_team_score = EXCLUDED.home_team_score,
                    away_team_score = EXCLUDED.away_team_score,
                    home_team_abbreviation = EXCLUDED.home_team_abbreviation,
                    away_team_abbreviation = EXCLUDED.away_team_abbreviation,
                    status = EXCLUDED.status,
                    updated_at = NOW()
                """
            ),
            game_values,
        )
        result_values = {
            key: row[key]
            for key in (
                "season",
                "game_date",
                "home_team",
                "away_team",
                "home_score",
                "away_score",
                "home_win",
            )
        }
        connection.execute(
            text(
                """
                INSERT INTO game_results
                    (season, game_date, home_team, away_team, home_score, away_score, home_win)
                VALUES
                    (:season, :game_date, :home_team, :away_team, :home_score, :away_score, :home_win)
                ON CONFLICT (season, game_date, home_team, away_team) DO UPDATE SET
                    home_score = EXCLUDED.home_score,
                    away_score = EXCLUDED.away_score,
                    home_win = EXCLUDED.home_win,
                    updated_at = NOW()
                """
            ),
            result_values,
        )


def _update_players(connection, dna_profiles):
    scores = build_dna_scores(dna_profiles)
    profiles_by_player = {}
    for profile in dna_profiles:
        player_id = profile.get("_PLAYER_ID")
        if player_id is None:
            continue
        profiles_by_player[player_id] = profile

    for player_id, profile in profiles_by_player.items():
        nba_player_id = _integer(profile.get("PLAYER_ID"))
        dna_scores = scores.get(nba_player_id)
        if not dna_scores:
            continue
        season_stats = {
            "season": profile.get("SEASON"),
            "gp": _integer(profile.get("GP")),
            "min": _number(profile.get("MIN")),
            "pts": _number(profile.get("PTS")),
            "reb": _number(profile.get("REB")),
            "ast": _number(profile.get("AST")),
            "stl": _number(profile.get("STL")),
            "blk": _number(profile.get("BLK")),
            "tov": _number(profile.get("TOV")),
            "fg_pct": _percentage_display(profile.get("FG_PCT")),
            "fg3_pct": _percentage_display(profile.get("FG3_PCT")),
            "ft_pct": _percentage_display(profile.get("FT_PCT")),
            "ts_pct": _percentage_display(profile.get("TS_PCT")),
        }
        connection.execute(
            text(
                """
                UPDATE players
                SET dna_scores = CAST(:dna_scores AS JSONB),
                    season_stats = CAST(:season_stats AS JSONB),
                    updated_at = NOW()
                WHERE id = :player_id
                """
            ),
            {
                "dna_scores": json.dumps(dna_scores),
                "season_stats": json.dumps(season_stats),
                "player_id": player_id,
            },
        )


def _fetch_current_season(season):
    team_rows = _static_team_rows()
    player_rows = _static_player_rows()
    roster_records, failed_rosters = _fetch_rosters(season, team_rows)
    team_basic = fetch_frame(
        f"team basic stats {season}",
        lambda: leaguedashteamstats.LeagueDashTeamStats(
            season=season,
            season_type_all_star="Regular Season",
            per_mode_detailed="PerGame",
            timeout=NBA_API_TIMEOUT,
        ),
    ).to_dict("records")
    team_advanced = fetch_frame(
        f"team advanced stats {season}",
        lambda: leaguedashteamstats.LeagueDashTeamStats(
            season=season,
            season_type_all_star="Regular Season",
            per_mode_detailed="PerGame",
            measure_type_detailed_defense="Advanced",
            timeout=NBA_API_TIMEOUT,
        ),
    ).to_dict("records")
    team_opponent = fetch_frame(
        f"team opponent stats {season}",
        lambda: leaguedashteamstats.LeagueDashTeamStats(
            season=season,
            season_type_all_star="Regular Season",
            per_mode_detailed="PerGame",
            measure_type_detailed_defense="Opponent",
            timeout=NBA_API_TIMEOUT,
        ),
    ).to_dict("records")

    player_stats = {}
    for season_type in ("Regular Season", "Playoffs"):
        base_records = fetch_frame(
            f"player stats {season} {season_type}",
            lambda season_type=season_type: leaguedashplayerstats.LeagueDashPlayerStats(
                season=season,
                season_type_all_star=season_type,
                per_mode_detailed="PerGame",
                timeout=NBA_API_TIMEOUT,
            ),
        ).to_dict("records")
        advanced_records = fetch_frame(
            f"player advanced stats {season} {season_type}",
            lambda season_type=season_type: leaguedashplayerstats.LeagueDashPlayerStats(
                season=season,
                season_type_all_star=season_type,
                per_mode_detailed="PerGame",
                measure_type_detailed_defense="Advanced",
                timeout=NBA_API_TIMEOUT,
            ),
        ).to_dict("records")
        player_stats[season_type] = (base_records, advanced_records)

    games = {}
    for season_type in ("Regular Season", "Playoffs"):
        records = fetch_frame(
            f"game results {season} {season_type}",
            lambda season_type=season_type: leaguegamelog.LeagueGameLog(
                season=season,
                season_type_all_star=season_type,
                player_or_team_abbreviation="T",
                timeout=NBA_API_TIMEOUT,
            ),
        ).to_dict("records")
        games[season_type] = records

    return (
        team_rows,
        player_rows,
        roster_records,
        failed_rosters,
        team_basic,
        team_advanced,
        team_opponent,
        player_stats,
        games,
    )


def run_daily_sync(season=None):
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL must be configured for the NBA data sync")
    season = season or os.getenv("NBA_SYNC_SEASON") or current_nba_season()
    logger.info("Starting daily NBA data sync for season %s", season)
    engine = create_engine(database_url, pool_pre_ping=True)
    with engine.connect() as connection:
        acquired = connection.execute(
            text("SELECT pg_try_advisory_lock(:lock_id)"),
            {"lock_id": NBA_SYNC_LOCK_ID},
        ).scalar()
        connection.commit()
        if not acquired:
            logger.warning("Another NBA sync is already running; skipping this run")
            engine.dispose()
            return False
        try:
            data = _fetch_current_season(season)
            (
                team_rows,
                player_rows,
                roster_records,
                failed_rosters,
                team_basic,
                team_advanced,
                team_opponent,
                player_stats,
                game_records,
            ) = data
            with connection.begin():
                team_ids, player_ids = _upsert_rosters(
                    connection,
                    team_rows,
                    player_rows,
                    roster_records,
                    failed_rosters,
                )
                season_stat_rows = []
                dna_profiles = []
                for season_type, (base_records, advanced_records) in player_stats.items():
                    rows, profiles = _player_stat_rows(
                        base_records,
                        advanced_records,
                        season,
                        season_type,
                        player_ids,
                        team_ids,
                    )
                    season_stat_rows.extend(rows)
                    if season_type == "Regular Season":
                        dna_profiles = profiles

                _upsert_season_stats(connection, season_stat_rows)
                team_stat_rows = _team_stat_rows(
                    team_basic, team_advanced, team_opponent, season
                )
                _upsert_team_stats(connection, team_stat_rows)
                all_games = []
                for season_type, records in game_records.items():
                    all_games.extend(
                        _game_rows(records, season, season_type, team_ids)
                    )
                _upsert_games(connection, all_games)
                _update_players(connection, dna_profiles)
            logger.info(
                "NBA sync complete: %s teams, %s players, %s player season rows, "
                "%s team season rows, %s games; %s DNA profiles",
                len(team_rows),
                len(player_rows),
                len(season_stat_rows),
                len(team_stat_rows),
                len(all_games),
                len(dna_profiles),
            )
            return True
        finally:
            try:
                connection.execute(
                    text("SELECT pg_advisory_unlock(:lock_id)"),
                    {"lock_id": NBA_SYNC_LOCK_ID},
                )
                connection.commit()
            finally:
                engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--season", help="Override the automatically detected NBA season")
    args = parser.parse_args()
    run_daily_sync(args.season)
