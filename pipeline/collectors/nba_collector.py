"""
NBA API collector — fetches players, teams, and game data.
Uses nba_api with rate-limiting to avoid 429s.
"""
import time
import logging
from nba_api.stats.static import players, teams
from nba_api.stats.endpoints import (
    playercareerstats,
    leaguegamefinder,
    playergamelog,
    teamgamelog,
)

logger = logging.getLogger(__name__)
DELAY = 0.6  # seconds between requests


def get_all_players(active_only: bool = False) -> list[dict]:
    """Fetch all NBA players from the static endpoint."""
    all_players = players.get_players()
    if active_only:
        all_players = [p for p in all_players if p["is_active"]]
    logger.info(f"Fetched {len(all_players)} players")
    return all_players


def get_all_teams() -> list[dict]:
    """Fetch all NBA teams from the static endpoint."""
    all_teams = teams.get_teams()
    logger.info(f"Fetched {len(all_teams)} teams")
    return all_teams


def get_player_career_stats(player_id: int) -> dict:
    """Fetch career stats for a single player."""
    time.sleep(DELAY)
    try:
        career = playercareerstats.PlayerCareerStats(player_id=player_id)
        df = career.get_data_frames()[0]
        return df.to_dict("records")
    except Exception as e:
        logger.warning(f"Failed to fetch career stats for player {player_id}: {e}")
        return []


def get_season_games(season: str = "2024-25", season_type: str = "Regular Season") -> list[dict]:
    """Fetch all games for a given season."""
    time.sleep(DELAY)
    try:
        finder = leaguegamefinder.LeagueGameFinder(
            season_nullable=season,
            season_type_nullable=season_type,
        )
        df = finder.get_data_frames()[0]
        return df.to_dict("records")
    except Exception as e:
        logger.error(f"Failed to fetch season games: {e}")
        return []
