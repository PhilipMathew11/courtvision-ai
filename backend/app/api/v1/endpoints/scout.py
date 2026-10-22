import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.services.scout import (
    ScoutModelError,
    parse_scout_brief,
    rank_scout_candidates,
)

router = APIRouter()


class ScoutSearchRequest(BaseModel):
    brief: str = Field(min_length=5, max_length=500)
    height_tolerance_inches: int = Field(default=1, ge=0, le=6)
    min_games: int | None = Field(default=None, ge=0, le=82)
    limit: int = Field(default=20, ge=1, le=50)


@router.post("/search")
async def scout_search(request: ScoutSearchRequest):
    try:
        criteria = await parse_scout_brief(request.brief.strip())
    except ScoutModelError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if request.min_games is not None:
        criteria.min_games = request.min_games

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=503, detail="Player database is not configured.")

    engine = create_engine(database_url, pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text(
                    """
                    SELECT nba_id, full_name, team_abbreviation, position,
                           height, dna_scores, season_stats
                    FROM players
                    WHERE is_active IS TRUE
                      AND dna_scores IS NOT NULL
                    """
                )
            )
            players = [dict(row._mapping) for row in result]
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not load player scouting data.",
        ) from exc
    finally:
        engine.dispose()

    matches = rank_scout_candidates(
        players,
        criteria,
        height_tolerance_inches=request.height_tolerance_inches,
        limit=request.limit,
    )
    height_range = None
    if criteria.target_height_inches is not None:
        height_range = {
            "min_inches": criteria.target_height_inches - request.height_tolerance_inches,
            "max_inches": criteria.target_height_inches + request.height_tolerance_inches,
        }

    available_seasons = sorted(
        {
            str(player["season_stats"].get("season"))
            for player in players
            if isinstance(player.get("season_stats"), dict)
            and player["season_stats"].get("season")
        },
        reverse=True,
    )

    return {
        "interpretation": criteria.interpretation,
        "criteria": {
            "target_height_inches": criteria.target_height_inches,
            "height_tolerance_inches": request.height_tolerance_inches,
            "height_range": height_range,
            "weights": criteria.weights,
            "skill_labels": {
                key: label
                for key, label in (
                    ("defense", "Defense"),
                    ("shooting", "Shooting"),
                    ("playmaking", "Playmaking"),
                    ("finishing", "Finishing"),
                    ("rebounding", "Rebounding"),
                    ("rim_pressure", "Rim pressure"),
                    ("gravity", "Off-ball gravity"),
                    ("passing", "Passing"),
                    ("transition", "Transition"),
                    ("isolation", "Isolation"),
                    ("pick_and_roll", "Pick-and-roll"),
                )
                if key in criteria.weights
            },
            "min_games": criteria.min_games,
        },
        "total_candidates": len(matches),
        "data_season": available_seasons[0] if available_seasons else None,
        "data_source": "Player DNA and season stats stored in the local database",
        "matches": matches,
    }
