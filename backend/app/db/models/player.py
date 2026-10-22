from sqlalchemy import Column, Integer, String, Boolean, Date, Text
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base, TimestampMixin


class Player(Base, TimestampMixin):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    nba_id = Column(Integer, unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False, index=True)
    first_name = Column(String(50))
    last_name = Column(String(50))
    team_id = Column(Integer, index=True)
    team_abbreviation = Column(String(10))
    jersey_number = Column(String(5))
    position = Column(String(20))
    height = Column(String(10))
    weight = Column(String(10))
    birth_date = Column(Date)
    country = Column(String(50))
    draft_year = Column(Integer)
    draft_round = Column(Integer)
    draft_number = Column(Integer)
    is_active = Column(Boolean, default=True)
    from_year = Column(Integer)
    to_year = Column(Integer)
    headshot_url = Column(Text)
    dna_scores = Column(JSONB)
    season_stats = Column(JSONB)
