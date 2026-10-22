from fastapi import APIRouter, HTTPException
from sqlalchemy import create_engine, text
from pydantic import BaseModel
import os
import pickle
import numpy as np

router = APIRouter()

def get_engine():
    return create_engine(os.getenv("DATABASE_URL", "postgresql://courtvision:password@postgres:5432/courtvision_db"))

def load_model():
    try:
        with open('/app/ml_model.pkl', 'rb') as f:
            return pickle.load(f)
    except:
        return None

def get_team_stats(conn, team_abbr: str, season: str = '2025-26') -> dict:
    result = conn.execute(text("""
        SELECT
            AVG(pss.pts), AVG(pss.reb), AVG(pss.ast),
            AVG(pss.stl), AVG(pss.blk), AVG(pss.tov),
            AVG(pss.fg_pct), AVG(pss.fg3_pct), AVG(pss.ft_pct),
            COUNT(*) as player_count
        FROM player_season_stats pss
        JOIN players p ON p.id = pss.player_id
        WHERE p.team_abbreviation = :team
        AND pss.season = :season
        AND pss.games_played >= 15
    """), {"team": team_abbr, "season": season}).fetchone()

    if not result or not result[9] or result[9] == 0:
        return {}

    stl = float(result[3] or 0)
    blk = float(result[4] or 0)
    tov = float(result[5] or 0)
    fg  = float(result[6] or 0)
    fg3 = float(result[7] or 0)
    pts = float(result[0] or 0)

    off_score = pts * 0.35 + fg * 100 * 0.25 + float(result[2] or 0) * 0.2 + fg3 * 100 * 0.2
    def_score = stl * 2.5 + blk * 2.0 - tov * 1.5

    return {
        "pts":       round(pts, 1),
        "reb":       round(float(result[1] or 0), 1),
        "ast":       round(float(result[2] or 0), 1),
        "stl":       round(stl, 1),
        "blk":       round(blk, 1),
        "tov":       round(tov, 1),
        "fg_pct":    round(fg * 100, 1),
        "fg3_pct":   round(fg3 * 100, 1),
        "ft_pct":    round(float(result[8] or 0) * 100, 1),
        "off_score": round(off_score, 2),
        "def_score": round(def_score, 2),
        "players":   int(result[9]),
    }

def get_historical_stats(conn, team_abbr: str) -> dict:
    """Get multi-season averages for trend analysis."""
    result = conn.execute(text("""
        SELECT
            s.season,
            AVG(pss.pts), AVG(pss.fg_pct), AVG(pss.fg3_pct),
            AVG(pss.stl), AVG(pss.blk), AVG(pss.tov)
        FROM player_season_stats pss
        JOIN players p ON p.id = pss.player_id
        WHERE p.team_abbreviation = :team
        AND pss.games_played >= 10
        GROUP BY s.season
        ORDER BY s.season DESC
        LIMIT 5
    """), {"team": team_abbr}).fetchall()
    return [{"season": r[0], "pts": round(float(r[1] or 0), 1)} for r in result]

def ml_predict(model_data: dict, home: dict, away: dict) -> dict:
    try:
        model  = model_data['model']
        scaler = model_data['scaler']
        h = home
        a = away

        features = np.array([[
            h['pts']     - a['pts'],
            h['reb']     - a['reb'],
            h['ast']     - a['ast'],
            h['stl']     - a['stl'],
            h['blk']     - a['blk'],
            a['tov']     - h['tov'],
            (h['fg_pct'] - a['fg_pct']) / 100,
            (h['fg3_pct']- a['fg3_pct']) / 100,
            (h['ft_pct'] - a['ft_pct']) / 100,
            h['pts'],    a['pts'],
            h['fg_pct'] / 100, a['fg_pct'] / 100,
            h['fg3_pct']/ 100, a['fg3_pct']/ 100,
            h['stl'] + h['blk'],
            a['stl'] + a['blk'],
            h['pts'] / max(h['tov'], 0.1),
            a['pts'] / max(a['tov'], 0.1),
            (h['pts'] * 0.4 + h['fg_pct'] * 0.2 + h['ast'] * 2),
            (a['pts'] * 0.4 + a['fg_pct'] * 0.2 + a['ast'] * 2),
            1,
        ]])

        features_scaled = scaler.transform(features)
        proba = model.predict_proba(features_scaled)[0]
        home_pct = round(float(proba[1]) * 100, 1)
        away_pct = round(100 - home_pct, 1)
        diff = abs(home_pct - away_pct)
        confidence = "High" if diff > 15 else "Medium" if diff > 7 else "Low"
        accuracy = model_data.get('accuracy', 0)

        return {
            "home_win_pct": home_pct,
            "away_win_pct": away_pct,
            "confidence":   confidence,
            "method":       f"ML Model ({accuracy:.0%} accuracy)",
        }
    except Exception as e:
        home_total = home["off_score"] + home["def_score"] + 3.0
        away_total = away["off_score"] + away["def_score"]
        total = home_total + away_total
        home_pct = round((home_total / total) * 100, 1) if total > 0 else 50.0
        return {
            "home_win_pct": home_pct,
            "away_win_pct": round(100 - home_pct, 1),
            "confidence":   "Medium",
            "method":       "Statistical Model",
        }

def get_top_players(conn, team_abbr: str, limit: int = 3) -> list:
    rows = conn.execute(text("""
        SELECT p.full_name, p.position, pss.pts, pss.reb, pss.ast,
               pss.fg_pct, pss.fg3_pct, pss.games_played, pss.stl, pss.blk
        FROM player_season_stats pss
        JOIN players p ON p.id = pss.player_id
        WHERE p.team_abbreviation = :team
        AND pss.season = '2025-26'
        AND pss.games_played >= 15
        ORDER BY pss.pts DESC
        LIMIT :limit
    """), {"team": team_abbr, "limit": limit}).fetchall()
    return [{
        "name":     r[0],
        "position": r[1] or "—",
        "pts":      round(float(r[2] or 0), 1),
        "reb":      round(float(r[3] or 0), 1),
        "ast":      round(float(r[4] or 0), 1),
        "fg_pct":   round(float(r[5] or 0) * 100, 1),
        "fg3_pct":  round(float(r[6] or 0) * 100, 1),
        "gp":       int(r[7] or 0),
        "stl":      round(float(r[8] or 0), 1),
        "blk":      round(float(r[9] or 0), 1),
    } for r in rows]

def build_key_factors(home: dict, away: dict, home_team: str, away_team: str) -> list:
    factors = []
    if home["pts"] > away["pts"] + 1.5:
        factors.append(f"{home_team} has scoring edge (+{round(home['pts']-away['pts'],1)} PPG)")
    elif away["pts"] > home["pts"] + 1.5:
        factors.append(f"{away_team} has scoring edge (+{round(away['pts']-home['pts'],1)} PPG)")
    if home["fg3_pct"] > away["fg3_pct"] + 2:
        factors.append(f"{home_team} shoots better from 3 ({home['fg3_pct']}% vs {away['fg3_pct']}%)")
    elif away["fg3_pct"] > home["fg3_pct"] + 2:
        factors.append(f"{away_team} shoots better from 3 ({away['fg3_pct']}% vs {home['fg3_pct']}%)")
    if home["tov"] < away["tov"] - 0.2:
        factors.append(f"{home_team} protects the ball better ({home['tov']} vs {away['tov']} TOV)")
    elif away["tov"] < home["tov"] - 0.2:
        factors.append(f"{away_team} protects the ball better ({away['tov']} vs {home['tov']} TOV)")
    home_def = home["stl"] + home["blk"]
    away_def = away["stl"] + away["blk"]
    if home_def > away_def + 0.3:
        factors.append(f"{home_team} stronger defensively ({round(home_def,1)} STL+BLK)")
    elif away_def > home_def + 0.3:
        factors.append(f"{away_team} stronger defensively ({round(away_def,1)} STL+BLK)")
    if home["fg_pct"] > away["fg_pct"] + 2:
        factors.append(f"{home_team} more efficient from field ({home['fg_pct']}% vs {away['fg_pct']}%)")
    elif away["fg_pct"] > home["fg_pct"] + 2:
        factors.append(f"{away_team} more efficient from field ({away['fg_pct']}% vs {home['fg_pct']}%)")
    factors.append("Home court advantage factored in (+3 pts)")
    return factors[:5]

def get_season_trend(conn, team_abbr: str) -> list:
    """Get pts trend across all loaded seasons."""
    rows = conn.execute(text("""
        SELECT pss.season, ROUND(AVG(pss.pts)::numeric, 1) as avg_pts,
               ROUND(AVG(pss.fg_pct)::numeric * 100, 1) as fg_pct
        FROM player_season_stats pss
        JOIN players p ON p.id = pss.player_id
        WHERE p.team_abbreviation = :team
        AND pss.games_played >= 10
        GROUP BY pss.season
        ORDER BY pss.season ASC
    """), {"team": team_abbr}).fetchall()
    return [{"season": r[0], "pts": float(r[1] or 0), "fg_pct": float(r[2] or 0)} for r in rows]

# ── Routes ──────────────────────────────────────────────

@router.get("/teams")
def list_teams():
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT DISTINCT p.team_abbreviation
            FROM players p
            JOIN player_season_stats pss ON pss.player_id = p.id
            WHERE p.team_abbreviation IS NOT NULL
            AND pss.season = '2025-26'
            ORDER BY p.team_abbreviation
        """)).fetchall()
    return {"teams": [r[0] for r in rows]}

class MatchupRequest(BaseModel):
    home_team: str
    away_team: str

@router.post("/matchup")
def predict_matchup(body: MatchupRequest):
    home = body.home_team.upper()
    away = body.away_team.upper()
    engine = get_engine()
    model_data = load_model()

    with engine.connect() as conn:
        home_stats   = get_team_stats(conn, home)
        away_stats   = get_team_stats(conn, away)
        home_players = get_top_players(conn, home, 3)
        away_players = get_top_players(conn, away, 3)
        home_trend   = get_season_trend(conn, home)
        away_trend   = get_season_trend(conn, away)

    if not home_stats or not away_stats:
        raise HTTPException(status_code=404, detail="Stats not found for one or both teams.")

    if model_data:
        prob = ml_predict(model_data, home_stats, away_stats)
    else:
        home_total = home_stats["off_score"] + home_stats["def_score"] + 3.0
        away_total = away_stats["off_score"] + away_stats["def_score"]
        total = home_total + away_total
        home_pct = round((home_total / total) * 100, 1) if total > 0 else 50.0
        prob = {
            "home_win_pct": home_pct,
            "away_win_pct": round(100 - home_pct, 1),
            "confidence":   "Medium",
            "method":       "Statistical Model",
        }

    factors = build_key_factors(home_stats, away_stats, home, away)

    return {
        "home_team":    home,
        "away_team":    away,
        "home_stats":   home_stats,
        "away_stats":   away_stats,
        "probability":  prob,
        "key_factors":  factors,
        "home_players": home_players,
        "away_players": away_players,
        "home_trend":   home_trend,
        "away_trend":   away_trend,
        "season":       "2025-26",
        "model":        prob.get("method", "ML Model"),
    }

@router.get("/player/{player_name}")
def player_stats(player_name: str):
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT p.full_name, p.team_abbreviation, p.position,
                   pss.pts, pss.reb, pss.ast, pss.stl, pss.blk, pss.tov,
                   pss.fg_pct, pss.fg3_pct, pss.ft_pct, pss.games_played, pss.min
            FROM player_season_stats pss
            JOIN players p ON p.id = pss.player_id
            WHERE LOWER(p.full_name) LIKE :name
            AND pss.season = '2025-26'
            ORDER BY pss.pts DESC
            LIMIT 5
        """), {"name": f"%{player_name.lower()}%"}).fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="Player not found")

    players = []
    for r in rows:
        gp = int(r[12] or 0)
        players.append({
            "name":     r[0],
            "team":     r[1] or "—",
            "position": r[2] or "—",
            "current": {
                "pts":     round(float(r[3] or 0), 1),
                "reb":     round(float(r[4] or 0), 1),
                "ast":     round(float(r[5] or 0), 1),
                "stl":     round(float(r[6] or 0), 1),
                "blk":     round(float(r[7] or 0), 1),
                "tov":     round(float(r[8] or 0), 1),
                "fg_pct":  round(float(r[9] or 0) * 100, 1),
                "fg3_pct": round(float(r[10] or 0) * 100, 1),
                "ft_pct":  round(float(r[11] or 0) * 100, 1),
                "gp":      gp,
                "min":     round(float(r[13] or 0), 1),
            },
            "season_totals": {
                "pts": round(float(r[3] or 0) * gp),
                "reb": round(float(r[4] or 0) * gp),
                "ast": round(float(r[5] or 0) * gp),
            },
        })
    return {"players": players, "season": "2025-26"}