from sqlalchemy import Column, Integer, String, Text
from app.db.base import Base, TimestampMixin


class Team(Base, TimestampMixin):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    nba_id = Column(Integer, unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    abbreviation = Column(String(10), unique=True)
    nickname = Column(String(50))
    city = Column(String(50))
    state = Column(String(50))
    conference = Column(String(10))
    division = Column(String(20))
    year_founded = Column(Integer)
    arena = Column(String(100))
    logo_url = Column(Text)
