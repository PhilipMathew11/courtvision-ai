from datetime import date
from math import isfinite


DNA_COMPONENTS = {
    "shooting": (("TS_PCT", 1), ("FG3_PCT", 1), ("FT_PCT", 1)),
    "playmaking": (("AST", 1), ("AST_TO", 1), ("AST_PCT", 1)),
    "finishing": (("FG_PCT", 1), ("FTA", 1), ("PTS", 1)),
    "defense": (("STL", 1), ("BLK", 1), ("DEF_RATING", -1)),
    "rebounding": (("REB", 1), ("OREB_PCT", 1), ("DREB_PCT", 1)),
    "rim_pressure": (("FTA", 1), ("FGA", 1), ("USG_PCT", 1)),
    "gravity": (("FG3A", 1), ("FG3_PCT", 1), ("USG_PCT", 1)),
    "passing": (("AST", 1), ("AST_PCT", 1), ("AST_TO", 1)),
    "transition": (("PACE", 1), ("PTS", 1), ("STL", 1)),
    "isolation": (("USG_PCT", 1), ("PTS", 1), ("FGA", 1)),
    "pick_and_roll": (("AST", 1), ("AST_TO", 1), ("USG_PCT", 1)),
}


def current_nba_season(today: date | None = None) -> str:
    """Return the NBA season whose calendar year has started by this date."""
    today = today or date.today()
    start_year = today.year if today.month >= 7 else today.year - 1
    return f"{start_year}-{(start_year + 1) % 100:02d}"


def _percentile(value: float, population: list[float]) -> float:
    if len(population) <= 1:
        return 50.0
    below = sum(item < value for item in population)
    equal = sum(item == value for item in population)
    return round((below + (equal - 1) / 2) / (len(population) - 1) * 100, 1)


def build_dna_scores(player_rows: list[dict]) -> dict[int, dict[str, float]]:
    """Build 0-100 relative profiles from current-season box-score metrics."""
    populations: dict[str, list[float]] = {}
    for metric, _direction in {
        component
        for components in DNA_COMPONENTS.values()
        for component in components
    }:
        values = []
        for row in player_rows:
            try:
                value = float(row[metric])
            except (KeyError, TypeError, ValueError):
                continue
            if isfinite(value):
                values.append(value)
        populations[metric] = values

    scores: dict[int, dict[str, float]] = {}
    for row in player_rows:
        try:
            player_id = int(row["PLAYER_ID"])
        except (KeyError, TypeError, ValueError):
            continue
        profile: dict[str, float] = {}
        for dimension, components in DNA_COMPONENTS.items():
            component_scores = []
            for metric, direction in components:
                try:
                    value = float(row[metric])
                except (KeyError, TypeError, ValueError):
                    continue
                if isfinite(value) and populations.get(metric):
                    score = _percentile(value, populations[metric])
                    component_scores.append(score if direction > 0 else 100 - score)
            if component_scores:
                profile[dimension] = round(sum(component_scores) / len(component_scores), 1)
        if profile:
            scores[player_id] = profile
    return scores
