from fastapi import APIRouter
from app.api.v1.endpoints import players, teams, games, analytics, ai, predictions, player_dna
from app.api import coach

api_router = APIRouter()

api_router.include_router(players.router,     prefix="/players",     tags=["Players"])
api_router.include_router(teams.router,       prefix="/teams",       tags=["Teams"])
api_router.include_router(games.router,       prefix="/games",       tags=["Games"])
api_router.include_router(analytics.router,   prefix="/analytics",   tags=["Analytics"])
api_router.include_router(ai.router,          prefix="/ai",          tags=["AI"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["Predictions"])
api_router.include_router(coach.router,       prefix="/coach",       tags=["Coach"])
api_router.include_router(player_dna.router,  prefix="/dna",         tags=["DNA"])