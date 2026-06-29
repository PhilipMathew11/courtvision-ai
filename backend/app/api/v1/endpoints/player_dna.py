from fastapi import APIRouter, HTTPException
from sqlalchemy import create_engine, text
import os
import json
import math

router = APIRouter()

def get_engine():
    return create_engine(os.getenv("DATABASE_URL", "postgresql://courtvision:password@postgres:5432/courtvision_db"))

def cosine_similarity(a: dict, b: dict) -> float:
    keys = list(a.keys())
    dot = sum(a[k] * b.get(k, 0) for k in keys)
    mag_a = math.sqrt(sum(a[k]**2 for k in keys))
    mag_b = math.sqrt(sum(b.get(k, 0)**2 for k in keys))
    if mag_a == 0 or mag_b == 0:
        return 0
    return round(dot / (mag_a * mag_b) * 100, 1)

@router.get("/search")
def search_players(q: str = ""):
    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT nba_id, full_name, team_abbreviation, position, dna_scores, season_stats
            FROM players
            WHERE dna_scores IS NOT NULL
            AND (LOWER(full_name) LIKE :q OR LOWER(team_abbreviation) LIKE :q)
            ORDER BY full_name
            LIMIT 20
        """), {"q": f"%{q.lower()}%"})
        rows = result.fetchall()
    return [
        {
            "nba_id": r[0],
            "full_name": r[1],
            "team": r[2] or "—",
            "position": r[3] or "—",
            "dna": r[4],
            "stats": r[5],
        }
        for r in rows
    ]

@router.get("/{nba_id}")
def get_player_dna(nba_id: int):
    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT nba_id, full_name, team_abbreviation, position, dna_scores, season_stats
            FROM players WHERE nba_id = :id
        """), {"id": nba_id})
        row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Player not found")
    return {
        "nba_id": row[0],
        "full_name": row[1],
        "team": row[2] or "—",
        "position": row[3] or "—",
        "dna": row[4],
        "stats": row[5],
    }

@router.get("/{nba_id}/similar")
def get_similar_players(nba_id: int, limit: int = 5):
    engine = get_engine()
    with engine.connect() as conn:
        # Get target player
        target = conn.execute(text("""
            SELECT nba_id, full_name, team_abbreviation, position, dna_scores, season_stats
            FROM players WHERE nba_id = :id
        """), {"id": nba_id}).fetchone()

        if not target or not target[4]:
            raise HTTPException(status_code=404, detail="Player not found or no DNA")

        # Get all other players with DNA
        others = conn.execute(text("""
            SELECT nba_id, full_name, team_abbreviation, position, dna_scores, season_stats
            FROM players WHERE dna_scores IS NOT NULL AND nba_id != :id
        """), {"id": nba_id}).fetchall()

    target_dna = target[4] if isinstance(target[4], dict) else json.loads(target[4])

    scored = []
    for p in others:
        pdna = p[4] if isinstance(p[4], dict) else json.loads(p[4])
        sim = cosine_similarity(target_dna, pdna)
        scored.append({
            "nba_id": p[0],
            "full_name": p[1],
            "team": p[2] or "—",
            "position": p[3] or "—",
            "similarity": sim,
            "dna": pdna,
            "stats": p[5],
        })

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return {
        "player": {
            "nba_id": target[0],
            "full_name": target[1],
            "team": target[2] or "—",
            "position": target[3] or "—",
            "dna": target_dna,
            "stats": target[5],
        },
        "similar": scored[:limit],
    }