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
        if "api_key" in error_msg.lower() or "authentication" in error_msg.lower() or "401" in error_msg:
            raise HTTPException(status_code=503, detail="Groq authentication failed. Check GROQ_API_KEY.")
        if "model_not_found" in error_msg.lower() or "model" in error_msg.lower() and "404" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="The configured Groq model is unavailable. Set GROQ_MODEL to an active model, such as openai/gpt-oss-120b.",
            )
        raise HTTPException(status_code=500, detail=f"Coach AI error: {error_msg}")