from sqlalchemy import Column, Integer, String, Float, Date, Boolean
from app.db.base import Base, TimestampMixin


class Game(Base, TimestampMixin):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    nba_game_id = Column(String(20), unique=True, index=True, nullable=False)
    season = Column(String(10), index=True)
    season_type = Column(String(30))
    game_date = Column(Date, index=True)
    home_team_id = Column(Integer, index=True)
    away_team_id = Column(Integer, index=True)
    home_team_score = Column(Integer)
    away_team_score = Column(Integer)
    home_team_abbreviation = Column(String(10))
    away_team_abbreviation = Column(String(10))
    status = Column(String(20), default="Scheduled")
    period = Column(Integer, default=0)
    game_clock = Column(String(10))
    attendance = Column(Integer)


class PlayerGameStat(Base, TimestampMixin):
    __tablename__ = "player_game_stats"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, index=True)
    player_id = Column(Integer, index=True)
    team_id = Column(Integer)
    season = Column(String(10), index=True)
    min = Column(Float)
    fgm = Column(Integer)
    fga = Column(Integer)
    fg_pct = Column(Float)
    fg3m = Column(Integer)
    fg3a = Column(Integer)
    fg3_pct = Column(Float)
    ftm = Column(Integer)
    fta = Column(Integer)
    ft_pct = Column(Float)
    oreb = Column(Integer)
    dreb = Column(Integer)
    reb = Column(Integer)
    ast = Column(Integer)
    stl = Column(Integer)
    blk = Column(Integer)
    tov = Column(Integer)
    pf = Column(Integer)
    pts = Column(Integer)
    plus_minus = Column(Float)
    started = Column(Boolean, default=False)
