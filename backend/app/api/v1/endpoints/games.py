from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.db.models.game import Game

router = APIRouter()


@router.get("/")
def list_games(
    season: Optional[str] = None,
    team_id: Optional[int] = None,
    limit: int = Query(20, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(Game)
    if season:
        query = query.filter(Game.season == season)
    if team_id:
        query = query.filter(
            (Game.home_team_id == team_id) | (Game.away_team_id == team_id)
        )
    total = query.count()
    games = query.order_by(Game.game_date.desc()).offset(offset).limit(limit).all()
    return {"total": total, "games": games}


@router.get("/{game_id}")
def get_game(game_id: int, db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Game not found")
    return game
