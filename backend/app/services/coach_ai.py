import os
from typing import Optional
from groq import AsyncGroq

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

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    if context:
        messages.append({
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {question}"
        })
    else:
        messages.append({"role": "user", "content": question})

    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=800,
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
        "model": "llama-3.3-70b-versatile"
    }