from sqlalchemy import Column, Date, Float, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB

from app.db.base import Base, TimestampMixin


class TeamSeasonStat(Base, TimestampMixin):
    __tablename__ = "team_season_stats"
    __table_args__ = (
        UniqueConstraint("team_abbreviation", "season"),
    )

    id = Column(Integer, primary_key=True, index=True)
    team_abbreviation = Column(String(10), nullable=False)
    season = Column(String(10), nullable=False)
    gp = Column(Integer)
    wins = Column(Integer)
    losses = Column(Integer)
    win_pct = Column(Float)
    pts = Column(Float)
    opp_pts = Column(Float)
    reb = Column(Float)
    ast = Column(Float)
    stl = Column(Float)
    blk = Column(Float)
    tov = Column(Float)
    fg_pct = Column(Float)
    fg3_pct = Column(Float)
    ft_pct = Column(Float)
    plus_minus = Column(Float)
    off_rating = Column(Float)
    def_rating = Column(Float)
    pace = Column(Float)
    ts_pct = Column(Float)
    extra_data = Column(JSONB)


class GameResult(Base, TimestampMixin):
    __tablename__ = "game_results"
    __table_args__ = (
        UniqueConstraint("season", "game_date", "home_team", "away_team"),
    )

    id = Column(Integer, primary_key=True, index=True)
    season = Column(String(10), nullable=False)
    game_date = Column(Date, nullable=False)
    home_team = Column(String(10), nullable=False)
    away_team = Column(String(10), nullable=False)
    home_score = Column(Integer, nullable=False)
    away_score = Column(Integer, nullable=False)
    home_win = Column(Integer, nullable=False)
