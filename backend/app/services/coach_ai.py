import os
from typing import Optional
from groq import AsyncGroq
from app.services.llm import groq_messages, groq_token_limit

SYSTEM_PROMPT = """You are Coach AI, an expert NBA basketball analyst powered by CourtVision AI.

You explain WHY things happen in basketball with:
- Tactical reasoning (plays, schemes, rotations)
- Statistical evidence (cite real stats when known)
- Player-specific analysis (strengths, tendencies, matchups)
- Historical context when relevant

Rules:
- Always explain the WHY, not just the WHAT
- Use basketball terminology correctly
- Be specific — cite percentages, player names, team names
- Keep answers focused and analytical (3-5 paragraphs max)
- End with 1 key insight or takeaway

Format your response clearly with natural paragraphs. No bullet point lists."""


async def ask_coach(question: str, context: Optional[str] = None) -> dict:
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    if context:
        user_content = f"Context:\n{context}\n\nQuestion: {question}"
    else:
        user_content = question

    response = await client.chat.completions.create(
        model=model,
        messages=groq_messages(model, SYSTEM_PROMPT, user_content),
        **groq_token_limit(model, 800),
        temperature=0.7,
    )

    answer = response.choices[0].message.content

    sources = []
    if any(k in question.lower() for k in ["stats", "percent", "shooting", "efficiency"]):
        sources.append("NBA Stats API")
    if any(k in question.lower() for k in ["play", "scheme", "defense", "offense", "zone"]):
        sources.append("Tactical Analysis")
    if any(k in question.lower() for k in ["history", "career", "season", "last year"]):
        sources.append("Historical Data")
    if not sources:
        sources = ["NBA Stats API", "Game Analysis"]

    return {
        "answer": answer,
        "sources": sources,
        "model": model,
    }