from sqlalchemy import Column, Integer, String, Float
from app.db.base import Base, TimestampMixin


class PlayerSeasonStat(Base, TimestampMixin):
    __tablename__ = "player_season_stats"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, index=True, nullable=False)
    team_id = Column(Integer)
    season = Column(String(10), index=True, nullable=False)
    season_type = Column(String(30), default="Regular Season")
    games_played = Column(Integer)
    games_started = Column(Integer)
    min = Column(Float)
    fgm = Column(Float)
    fga = Column(Float)
    fg_pct = Column(Float)
    fg3m = Column(Float)
    fg3a = Column(Float)
    fg3_pct = Column(Float)
    ftm = Column(Float)
    fta = Column(Float)
    ft_pct = Column(Float)
    oreb = Column(Float)
    dreb = Column(Float)
    reb = Column(Float)
    ast = Column(Float)
    stl = Column(Float)
    blk = Column(Float)
    tov = Column(Float)
    pts = Column(Float)
    # Advanced
    per = Column(Float)
    ts_pct = Column(Float)
    usg_pct = Column(Float)
    bpm = Column(Float)
    vorp = Column(Float)
    ws = Column(Float)
    ws_48 = Column(Float)
    off_rtg = Column(Float)
    def_rtg = Column(Float)
    net_rtg = Column(Float)
