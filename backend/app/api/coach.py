from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.coach_ai import ask_coach

router = APIRouter()

class CoachQuestion(BaseModel):
    question: str
    context: str | None = None

@router.post("/ask")
async def coach_ask(body: CoachQuestion):
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        result = await ask_coach(body.question, body.context)
        return result
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "rate limit" in error_msg.lower():
            raise HTTPException(status_code=429, detail="Rate limit reached. Wait a moment and try again.")
        if "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
            raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured in .env")
        raise HTTPException(status_code=500, detail=f"Coach AI error: {error_msg}")