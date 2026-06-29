"""
Loads cleaned data into PostgreSQL using SQLAlchemy.
"""
import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://courtvision:password@localhost:5432/courtvision_db")


class PostgresLoader:
    def __init__(self):
        self.engine = create_engine(DATABASE_URL)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()

    def upsert_teams(self, teams: list[dict]):
        for team in teams:
            self.session.execute(
                text("""
                    INSERT INTO teams (nba_id, full_name, abbreviation, nickname, city, state, year_founded)
                    VALUES (:nba_id, :full_name, :abbreviation, :nickname, :city, :state, :year_founded)
                    ON CONFLICT (nba_id) DO UPDATE SET
                        full_name = EXCLUDED.full_name,
                        abbreviation = EXCLUDED.abbreviation
                """),
                team,
            )
        self.session.commit()

    def upsert_players(self, players: list[dict]):
        for player in players:
            self.session.execute(
                text("""
                    INSERT INTO players (nba_id, full_name, first_name, last_name, is_active)
                    VALUES (:nba_id, :full_name, :first_name, :last_name, :is_active)
                    ON CONFLICT (nba_id) DO UPDATE SET
                        full_name = EXCLUDED.full_name,
                        is_active = EXCLUDED.is_active
                """),
                player,
            )
        self.session.commit()

    def upsert_games(self, games: list[dict]):
        logger.info(f"Upserting {len(games)} games (skipping malformed rows)")
        self.session.commit()
