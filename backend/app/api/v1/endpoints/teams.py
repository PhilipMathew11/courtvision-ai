from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models.team import Team

router = APIRouter()


@router.get("/")
def list_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).order_by(Team.full_name).all()
    return teams


@router.get("/{team_id}")
def get_team(team_id: int, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team
