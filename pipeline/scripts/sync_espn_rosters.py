"""Refresh NBA player team assignments from ESPN's current roster API."""
import json
import logging
import os
import re
import time
import unicodedata
from urllib.error import URLError
from urllib.request import Request, urlopen

from nba_api.stats.static import players
from sqlalchemy import create_engine, text


ESPN_API = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
ESPN_TO_NBA_ABBREVIATION = {
    "GS": "GSW",
    "NO": "NOP",
    "NY": "NYK",
    "SA": "SAS",
    "UTAH": "UTA",
    "WSH": "WAS",
}
logger = logging.getLogger(__name__)


def _get_json(url):
    request = Request(url, headers={"User-Agent": "CourtVisionAI/1.0"})
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def _normalize_name(name):
    normalized = unicodedata.normalize("NFKD", name)
    ascii_name = normalized.encode("ascii", "ignore").decode("ascii")
    return " ".join(re.sub(r"[^a-z0-9]+", " ", ascii_name.lower()).split())


def fetch_espn_rosters():
    response = _get_json(f"{ESPN_API}/teams?limit=30")
    espn_teams = response["sports"][0]["leagues"][0]["teams"]
    if len(espn_teams) != 30:
        raise RuntimeError(f"Expected 30 ESPN teams, received {len(espn_teams)}")

    rosters = {}
    for entry in espn_teams:
        team = entry["team"]
        espn_abbreviation = team["abbreviation"]
        nba_abbreviation = ESPN_TO_NBA_ABBREVIATION.get(
            espn_abbreviation, espn_abbreviation
        )
        roster_data = _get_json(f"{ESPN_API}/teams/{espn_abbreviation.lower()}/roster")
        athletes = roster_data.get("athletes", [])
        if len(athletes) < 8:
            raise RuntimeError(
                f"ESPN returned only {len(athletes)} roster entries for "
                f"{nba_abbreviation}; refusing a partial refresh"
            )
        rosters[nba_abbreviation] = athletes
        logger.info("Fetched %s roster entries for %s", len(athletes), nba_abbreviation)
        time.sleep(0.1)

    if len(rosters) != 30:
        raise RuntimeError(f"Expected 30 NBA rosters, mapped {len(rosters)}")
    return rosters


def _build_player_lookup(database_players):
    lookup = {}
    for player in players.get_players():
        key = _normalize_name(player["full_name"])
        if key:
            lookup.setdefault(key, player)
    for player in database_players:
        key = _normalize_name(player["full_name"])
        if key:
            lookup[key] = {
                "id": player["nba_id"],
                "full_name": player["full_name"],
                "first_name": player["first_name"] or player["full_name"].split()[0],
                "last_name": player["last_name"] or player["full_name"].split()[-1],
            }
    return lookup


def update_rosters(database_url, rosters):
    engine = create_engine(database_url, pool_pre_ping=True)
    assignments = []
    unmatched = []
    seen_player_ids = {}

    with engine.connect() as connection:
        database_players = connection.execute(
            text("SELECT nba_id, full_name, first_name, last_name FROM players")
        ).mappings()
        lookup = _build_player_lookup(database_players)
        team_ids = dict(
            connection.execute(text("SELECT abbreviation, id FROM teams")).fetchall()
        )
        missing_teams = sorted(set(rosters) - set(team_ids))
        if missing_teams:
            raise RuntimeError(
                "Database is missing team records for: " + ", ".join(missing_teams)
            )

        for abbreviation, athletes in rosters.items():
            for athlete in athletes:
                name = athlete.get("fullName") or athlete.get("displayName") or ""
                player = lookup.get(_normalize_name(name))
                if player is None:
                    unmatched.append(f"{name} ({abbreviation})")
                    continue

                nba_id = int(player["id"])
                previous_team = seen_player_ids.get(nba_id)
                if previous_team and previous_team != abbreviation:
                    raise RuntimeError(
                        f"{name} appears on both {previous_team} and {abbreviation}"
                    )
                if previous_team:
                    continue
                seen_player_ids[nba_id] = abbreviation

                position = athlete.get("position") or {}
                assignments.append(
                    {
                        "nba_id": nba_id,
                        "full_name": player["full_name"],
                        "first_name": player["first_name"],
                        "last_name": player["last_name"],
                        "team_id": team_ids[abbreviation],
                        "team_abbreviation": abbreviation,
                        "jersey_number": str(athlete.get("jersey") or "") or None,
                        "position": position.get("abbreviation")
                        or position.get("displayName"),
                        "height": athlete.get("displayHeight"),
                        "weight": str(athlete.get("displayWeight") or "")
                        .removesuffix(" lbs")
                        or None,
                    }
                )

        if len(assignments) < 300:
            raise RuntimeError(
                f"Only matched {len(assignments)} roster players; refusing refresh"
            )

        connection.commit()
        with connection.begin():
            connection.execute(
                text(
                    """
                    INSERT INTO players
                        (nba_id, full_name, first_name, last_name, is_active)
                    VALUES
                        (:nba_id, :full_name, :first_name, :last_name, TRUE)
                    ON CONFLICT (nba_id) DO UPDATE SET
                        full_name = EXCLUDED.full_name,
                        first_name = EXCLUDED.first_name,
                        last_name = EXCLUDED.last_name,
                        is_active = TRUE,
                        updated_at = NOW()
                    """
                ),
                assignments,
            )
            connection.execute(
                text(
                    """
                    UPDATE players
                    SET team_id = NULL, team_abbreviation = NULL, updated_at = NOW()
                    WHERE is_active IS TRUE
                    """
                )
            )
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
                    WHERE nba_id = :nba_id
                    """
                ),
                assignments,
            )

    engine.dispose()
    logger.info(
        "Roster refresh complete: %s player assignments across 30 teams; "
        "%s ESPN players did not match the NBA player directory",
        len(assignments),
        len(unmatched),
    )
    if unmatched:
        logger.warning("Unmatched ESPN roster entries: %s", "; ".join(unmatched))
    return len(assignments), unmatched


def main():
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s | %(levelname)s | %(message)s",
    )
    run_espn_roster_sync()


def run_espn_roster_sync():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL must be configured for roster refresh")
    try:
        rosters = fetch_espn_rosters()
    except (KeyError, TypeError, URLError, ValueError) as exc:
        raise RuntimeError(f"Could not fetch complete ESPN rosters: {exc}") from exc
    update_rosters(database_url, rosters)


if __name__ == "__main__":
    main()
