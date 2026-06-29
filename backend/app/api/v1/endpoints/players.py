from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.db.models.player import Player
from app.db.models.stat import PlayerSeasonStat

router = APIRouter()


@router.get("/")
def list_players(
    search: Optional[str] = Query(None, description="Search by name"),
    team_id: Optional[int] = None,
    is_active: bool = True,
    limit: int = Query(20, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(Player).filter(Player.is_active == is_active)
    if search:
        query = query.filter(Player.full_name.ilike(f"%{search}%"))
    if team_id:
        query = query.filter(Player.team_id == team_id)
    total = query.count()
    players = query.offset(offset).limit(limit).all()
    return {"total": total, "players": players}


@router.get("/{player_id}")
def get_player(player_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.get("/{player_id}/stats")
def get_player_stats(
    player_id: int,
    season: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(PlayerSeasonStat).filter(PlayerSeasonStat.player_id == player_id)
    if season:
        query = query.filter(PlayerSeasonStat.season == season)
    stats = query.order_by(PlayerSeasonStat.season.desc()).all()
    if not stats:
        raise HTTPException(status_code=404, detail="No stats found")
    return stats
