from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class CoachAIRequest(BaseModel):
    question: str
    context: Optional[str] = None


class ScoutAIRequest(BaseModel):
    description: str
    limit: int = 10


@router.post("/coach")
async def coach_ai(request: CoachAIRequest):
    """
    Ask a basketball 'why' question and get an AI-powered explanation.
    Powered by RAG — retrieves player/game data before generating.
    """
    # TODO: wire to CoachAI service (Phase 2)
    return {
        "question": request.question,
        "answer": "Coach AI coming in Phase 2 — RAG pipeline will power this.",
        "sources": [],
    }


@router.post("/scout")
async def scout_ai(request: ScoutAIRequest):
    """
    Describe the player profile you need; Scout AI finds matches.
    """
    # TODO: wire to ScoutAI service (Phase 2)
    return {
        "description": request.description,
        "matches": [],
        "message": "Scout AI coming in Phase 2.",
    }


@router.post("/chat")
async def basketball_chat(request: CoachAIRequest):
    """General basketball Q&A with RAG-grounded responses."""
    return {
        "question": request.question,
        "answer": "AI Chat coming in Phase 2.",
        "sources": [],
    }
