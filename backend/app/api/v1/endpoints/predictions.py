from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class GamePredictionRequest(BaseModel):
    home_team_id: int
    away_team_id: int
    season: str


@router.post("/game")
async def predict_game(request: GamePredictionRequest):
    """Predict win probability for a matchup."""
    # TODO: wire to ML models (Phase 3)
    return {
        "home_team_id": request.home_team_id,
        "away_team_id": request.away_team_id,
        "home_win_probability": None,
        "message": "Prediction Lab coming in Phase 3.",
    }


@router.get("/player/{player_id}/performance")
async def predict_player_performance(player_id: int, season: str):
    """Predict a player's performance for upcoming games."""
    return {
        "player_id": player_id,
        "season": season,
        "predicted_pts": None,
        "predicted_reb": None,
        "predicted_ast": None,
        "message": "Player performance prediction coming in Phase 3.",
    }
