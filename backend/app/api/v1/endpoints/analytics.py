from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db

router = APIRouter()


@router.get("/advanced/{player_id}")
def get_advanced_stats(
    player_id: int,
    season: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Return advanced metrics for a player."""
    from app.db.models.stat import PlayerSeasonStat
    query = db.query(PlayerSeasonStat).filter(PlayerSeasonStat.player_id == player_id)
    if season:
        query = query.filter(PlayerSeasonStat.season == season)
    stats = query.order_by(PlayerSeasonStat.season.desc()).all()
    return stats


@router.get("/leaderboard")
def get_leaderboard(
    stat: str = Query("pts", description="Stat column name"),
    season: Optional[str] = None,
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
):
    """Top N players by a given stat."""
    from app.db.models.stat import PlayerSeasonStat
    from app.db.models.player import Player
    from sqlalchemy import desc, getattr as sa_getattr
    import sqlalchemy as sa

    query = (
        db.query(Player.full_name, Player.team_abbreviation, PlayerSeasonStat)
        .join(Player, Player.id == PlayerSeasonStat.player_id)
    )
    if season:
        query = query.filter(PlayerSeasonStat.season == season)

    stat_col = getattr(PlayerSeasonStat, stat, None)
    if stat_col is None:
        return {"error": f"Unknown stat: {stat}"}

    results = (
        query.filter(stat_col.isnot(None))
        .order_by(desc(stat_col))
        .limit(limit)
        .all()
    )
    return results
