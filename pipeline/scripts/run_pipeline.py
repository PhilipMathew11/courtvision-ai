"""
Main pipeline runner.
Usage: python scripts/run_pipeline.py [--season 2024-25] [--players-only] [--games-only]
"""
import argparse
import logging
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from collectors.nba_collector import get_all_players, get_all_teams, get_season_games
from processors.cleaner import clean_players, clean_teams, clean_games
from loaders.postgres_loader import PostgresLoader

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


def run(season: str = "2024-25", players_only: bool = False, games_only: bool = False):
    loader = PostgresLoader()

    if not games_only:
        logger.info("── Collecting teams ──")
        raw_teams = get_all_teams()
        teams = clean_teams(raw_teams)
        loader.upsert_teams(teams)
        logger.info(f"  ✓ {len(teams)} teams loaded")

        logger.info("── Collecting players ──")
        raw_players = get_all_players()
        clean = clean_players(raw_players)
        loader.upsert_players(clean)
        logger.info(f"  ✓ {len(clean)} players loaded")

    if not players_only:
        logger.info(f"── Collecting games for {season} ──")
        raw_games = get_season_games(season)
        games = clean_games(raw_games)
        loader.upsert_games(games)
        logger.info(f"  ✓ {len(games)} game records loaded")

    logger.info("✅ Pipeline complete")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--season", default="2024-25")
    parser.add_argument("--players-only", action="store_true")
    parser.add_argument("--games-only", action="store_true")
    args = parser.parse_args()
    run(args.season, args.players_only, args.games_only)
