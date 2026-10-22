import json
import os
import re
from groq import AsyncGroq
from pydantic import BaseModel, Field, ValidationError, field_validator
from app.services.llm import groq_messages, groq_token_limit


SKILL_LABELS = {
    "defense": "Defense",
    "shooting": "Shooting",
    "playmaking": "Playmaking",
    "finishing": "Finishing",
    "rebounding": "Rebounding",
    "rim_pressure": "Rim pressure",
    "gravity": "Off-ball gravity",
    "passing": "Passing",
    "transition": "Transition",
    "isolation": "Isolation",
    "pick_and_roll": "Pick-and-roll",
}

SCOUT_RESPONSE_SCHEMA = {
    "name": "scout_criteria",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "target_height_inches": {"type": ["integer", "null"]},
            "weights": {
                "type": "object",
                "properties": {
                    skill: {"type": "number", "minimum": 0, "maximum": 1}
                    for skill in SKILL_LABELS
                },
                "required": list(SKILL_LABELS),
                "additionalProperties": False,
            },
            "min_games": {"type": "integer", "minimum": 0, "maximum": 82},
            "interpretation": {"type": "string"},
        },
        "required": [
            "target_height_inches",
            "weights",
            "min_games",
            "interpretation",
        ],
        "additionalProperties": False,
    },
}

MIN_GAMES_PATTERNS = (
    re.compile(
        r"\b(?:at least|min(?:imum)?(?: of)?|>=)\s*(\d{1,2})\s*(?:games|gp)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(\d{1,2})\s*(?:games|gp)\s*(?:minimum|min)\b",
        re.IGNORECASE,
    ),
)


class ScoutCriteria(BaseModel):
    target_height_inches: int | None = Field(default=None, ge=55, le=90)
    weights: dict[str, float]
    min_games: int = Field(default=10, ge=0, le=82)
    interpretation: str

    @field_validator("weights")
    @classmethod
    def validate_weights(cls, weights):
        valid_weights = {
            key: value
            for key, value in weights.items()
            if key in SKILL_LABELS and 0 < value <= 1
        }
        total = sum(valid_weights.values())
        if not valid_weights or total <= 0:
            raise ValueError("At least one supported skill must have positive weight")
        return {key: value / total for key, value in valid_weights.items()}


class ScoutModelError(Exception):
    pass


def requested_min_games(brief: str) -> int:
    for pattern in MIN_GAMES_PATTERNS:
        match = pattern.search(brief)
        if match:
            return min(int(match.group(1)), 82)
    return 10


def height_inches(height: str | None) -> int | None:
    if not height:
        return None
    match = re.fullmatch(r"\s*(\d)\s*[-'′]\s*(\d{1,2})\s*(?:\"|″)?\s*", height)
    if not match:
        return None
    feet, inches = map(int, match.groups())
    if inches > 11:
        return None
    return feet * 12 + inches


async def parse_scout_brief(brief: str) -> ScoutCriteria:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ScoutModelError("Scout AI requires GROQ_API_KEY to interpret the brief.")

    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    client = AsyncGroq(api_key=api_key)
    instruction = (
        "Translate a basketball coach's scouting request into JSON only. "
        "Return keys target_height_inches (integer or null), weights "
        "(object with zero or more keys from defense, shooting, playmaking, "
        "finishing, rebounding, rim_pressure, gravity, passing, transition, "
        "isolation, pick_and_roll; values are relative priorities from 0 to 1), "
        "min_games (integer 0-82, default 10), and interpretation (brief "
        "plain-language summary). Weights should sum to 1. 'a bit of shooting' "
        "means a lower but meaningful weight than a skill called strong/great. "
        "Do not invent requirements not stated. Height examples: 5'11 is 71 "
        "inches. For an unmentioned height use null. Return every supported "
        "skill in weights, with 0 for skills not requested. Do not add markdown."
    )
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=groq_messages(model, instruction, brief),
            response_format=(
                {
                    "type": "json_schema",
                    "json_schema": SCOUT_RESPONSE_SCHEMA,
                }
                if model.startswith("openai/gpt-oss-")
                else {"type": "json_object"}
            ),
            temperature=0,
            **groq_token_limit(model, 1000),
        )
        content = response.choices[0].message.content
        if not content:
            raise ScoutModelError("Scout AI returned an empty interpretation.")
        criteria = ScoutCriteria.model_validate(json.loads(content))
        criteria.min_games = requested_min_games(brief)
        return criteria
    except ScoutModelError:
        raise
    except (json.JSONDecodeError, ValidationError) as exc:
        raise ScoutModelError("Scout AI could not interpret those requirements.") from exc
    except Exception as exc:
        raise ScoutModelError(f"Scout AI could not process the request: {exc}") from exc


def _as_object(value):
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _as_number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_dna(dna):
    values = {}
    for skill in SKILL_LABELS:
        value = _as_number(dna.get(skill))
        if value is not None and 0 <= value <= 100:
            values[skill] = value
    return values


def rank_scout_candidates(
    rows,
    criteria: ScoutCriteria,
    height_tolerance_inches: int = 1,
    limit: int = 20,
):
    if height_tolerance_inches < 0 or height_tolerance_inches > 6:
        raise ValueError("Height tolerance must be between 0 and 6 inches")

    ranked = []
    for row in rows:
        player_height = height_inches(row.get("height"))
        if criteria.target_height_inches is not None:
            if player_height is None or abs(player_height - criteria.target_height_inches) > height_tolerance_inches:
                continue

        stats = _as_object(row.get("season_stats"))
        games_played = _as_number(stats.get("gp"))
        if criteria.min_games and (games_played is None or games_played < criteria.min_games):
            continue

        dna = _normalize_dna(_as_object(row.get("dna_scores")))
        available_weights = {
            skill: weight for skill, weight in criteria.weights.items() if skill in dna
        }
        total_weight = sum(available_weights.values())
        if not total_weight:
            continue
        normalized_weights = {
            skill: weight / total_weight for skill, weight in available_weights.items()
        }
        score = sum(dna[skill] * weight for skill, weight in normalized_weights.items())
        priority_skills = sorted(
            normalized_weights, key=normalized_weights.get, reverse=True
        )
        reasons = [
            f"{SKILL_LABELS[skill]} {dna[skill]:.0f}/100"
            for skill in priority_skills[:3]
        ]
        if criteria.target_height_inches is not None and player_height is not None:
            height_delta = player_height - criteria.target_height_inches
            if height_delta == 0:
                height_match = "exact height match"
            else:
                direction = "above" if height_delta > 0 else "below"
                height_match = f"{abs(height_delta)} in {direction} target"
            reasons.append(height_match)

        ranked.append(
            {
                "nba_id": row["nba_id"],
                "full_name": row["full_name"],
                "team": row.get("team_abbreviation") or "—",
                "position": row.get("position") or "—",
                "height": row.get("height") or "—",
                "height_inches": player_height,
                "score": round(score, 1),
                "skill_scores": {skill: dna[skill] for skill in normalized_weights},
                "reasons": reasons,
                "stats": stats,
            }
        )
    ranked.sort(key=lambda candidate: (-candidate["score"], candidate["full_name"]))
    return ranked[:limit]
