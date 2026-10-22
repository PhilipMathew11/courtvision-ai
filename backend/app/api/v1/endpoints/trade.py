import os

from fastapi import APIRouter, HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()


def load_trade_players():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=503, detail="Player database is not configured.")

    engine = create_engine(database_url, pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text(
                    """
                    SELECT p.nba_id, p.full_name, p.team_abbreviation, p.position,
                           p.height, stats.season,
                           stats.games_played AS gp, stats.pts, stats.reb,
                           stats.ast, stats.stl, stats.blk, stats.fg_pct,
                           stats.fg3_pct, stats.ft_pct, stats.ts_pct, stats.min
                    FROM players p
                    LEFT JOIN LATERAL (
                        SELECT season, season_type, games_played, pts, reb, ast,
                               stl, blk, fg_pct, fg3_pct, ft_pct, ts_pct, min
                        FROM player_season_stats
                        WHERE player_id = p.id
                        ORDER BY season DESC,
                                 CASE WHEN season_type = 'Regular Season' THEN 0 ELSE 1 END,
                                 id DESC
                        LIMIT 1
                    ) stats ON TRUE
                    WHERE p.is_active IS TRUE
                      AND p.team_abbreviation IS NOT NULL
                    ORDER BY p.team_abbreviation, p.full_name
                    """
                )
            )
            return [dict(row._mapping) for row in result]
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not load player trade data.",
        ) from exc
    finally:
        engine.dispose()


@router.get("/players")
def trade_players():
    players = load_trade_players()
    teams = sorted({player["team_abbreviation"] for player in players})
    available_seasons = sorted(
        {str(player["season"]) for player in players if player.get("season")},
        reverse=True,
    )
    return {
        "teams": teams,
        "data_season": available_seasons[0] if available_seasons else None,
        "players": [
            {
                "nba_id": player["nba_id"],
                "full_name": player["full_name"],
                "team": player["team_abbreviation"],
                "position": player["position"] or "—",
                "height": player["height"] or "—",
                "stats": {
                    key: player[key]
                    for key in (
                        "season", "gp", "pts", "reb", "ast", "stl", "blk",
                        "fg_pct", "fg3_pct", "ft_pct", "ts_pct", "min",
                    )
                    if player[key] is not None
                },
            }
            for player in players
        ],
    }
