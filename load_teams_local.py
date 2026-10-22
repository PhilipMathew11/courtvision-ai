from nba_api.stats.endpoints import leaguedashteamstats
from sqlalchemy import create_engine, text
import time

# Connect directly to postgres exposed on localhost:5432
engine = create_engine('postgresql://courtvision:password@localhost:5432/courtvision_db')

with engine.begin() as conn:
    conn.execute(text("DELETE FROM team_season_stats"))
    print('Cleared old data')

print('Fetching basic stats...')
basic = leaguedashteamstats.LeagueDashTeamStats(
    season='2025-26',
    per_mode_detailed='PerGame',
    season_type_all_star='Regular Season'
)
df = basic.get_data_frames()[0]
print(f'Got {len(df)} teams')

with engine.begin() as conn:
    for _, row in df.iterrows():
        abbr = str(row.get('TEAM_ABBREVIATION', ''))
        if not abbr:
            continue
        conn.execute(text(
            "INSERT INTO team_season_stats "
            "(team_abbreviation, season, gp, wins, losses, win_pct, pts, reb, ast, stl, blk, tov, fg_pct, fg3_pct, ft_pct, plus_minus) "
            "VALUES (:abbr,:season,:gp,:w,:l,:wpct,:pts,:reb,:ast,:stl,:blk,:tov,:fg,:fg3,:ft,:pm) "
            "ON CONFLICT (team_abbreviation, season) DO UPDATE SET "
            "gp=EXCLUDED.gp, wins=EXCLUDED.wins, losses=EXCLUDED.losses, win_pct=EXCLUDED.win_pct, "
            "pts=EXCLUDED.pts, reb=EXCLUDED.reb, ast=EXCLUDED.ast, stl=EXCLUDED.stl, "
            "blk=EXCLUDED.blk, tov=EXCLUDED.tov, fg_pct=EXCLUDED.fg_pct, "
            "fg3_pct=EXCLUDED.fg3_pct, ft_pct=EXCLUDED.ft_pct, plus_minus=EXCLUDED.plus_minus"
        ), {
            'abbr': abbr, 'season': '2025-26',
            'gp':   int(row.get('GP', 0) or 0),
            'w':    int(row.get('W', 0) or 0),
            'l':    int(row.get('L', 0) or 0),
            'wpct': float(row.get('W_PCT', 0) or 0),
            'pts':  float(row.get('PTS', 0) or 0),
            'reb':  float(row.get('REB', 0) or 0),
            'ast':  float(row.get('AST', 0) or 0),
            'stl':  float(row.get('STL', 0) or 0),
            'blk':  float(row.get('BLK', 0) or 0),
            'tov':  float(row.get('TOV', 0) or 0),
            'fg':   float(row.get('FG_PCT', 0) or 0),
            'fg3':  float(row.get('FG3_PCT', 0) or 0),
            'ft':   float(row.get('FT_PCT', 0) or 0),
            'pm':   float(row.get('PLUS_MINUS', 0) or 0),
        })
    print('Basic stats saved!')

time.sleep(1)

print('Fetching advanced stats...')
adv = leaguedashteamstats.LeagueDashTeamStats(
    season='2025-26',
    per_mode_detailed='PerGame',
    season_type_all_star='Regular Season',
    measure_type_detailed_defense='Advanced'
)
adf = adv.get_data_frames()[0]

with engine.begin() as conn:
    for _, row in adf.iterrows():
        abbr = str(row.get('TEAM_ABBREVIATION', ''))
        if not abbr:
            continue
        conn.execute(text(
            "UPDATE team_season_stats SET "
            "off_rating=:off, def_rating=:def, pace=:pace, ts_pct=:ts "
            "WHERE team_abbreviation=:abbr AND season=:season"
        ), {
            'off':    float(row.get('OFF_RATING', 0) or 0),
            'def':    float(row.get('DEF_RATING', 0) or 0),
            'pace':   float(row.get('PACE', 0) or 0),
            'ts':     float(row.get('TS_PCT', 0) or 0),
            'abbr':   abbr,
            'season': '2025-26'
        })
    print('Advanced stats saved!')

time.sleep(1)

print('Fetching opponent stats...')
opp = leaguedashteamstats.LeagueDashTeamStats(
    season='2025-26',
    per_mode_detailed='PerGame',
    season_type_all_star='Regular Season',
    measure_type_detailed_defense='Opponent'
)
odf = opp.get_data_frames()[0]

with engine.begin() as conn:
    for _, row in odf.iterrows():
        abbr = str(row.get('TEAM_ABBREVIATION', ''))
        if not abbr:
            continue
        conn.execute(text(
            "UPDATE team_season_stats SET opp_pts=:opp "
            "WHERE team_abbreviation=:abbr AND season=:season"
        ), {
            'opp':    float(row.get('PTS', 0) or 0),
            'abbr':   abbr,
            'season': '2025-26'
        })
    print('Opponent stats saved!')

with engine.connect() as conn:
    rows = conn.execute(text(
        "SELECT team_abbreviation, wins, losses, win_pct, pts, opp_pts, off_rating, def_rating "
        "FROM team_season_stats WHERE season='2025-26' ORDER BY win_pct DESC LIMIT 8"
    )).fetchall()
    print('Top 8 teams:')
    for r in rows:
        print(f'  {r[0]}: {r[1]}-{r[2]} ({round(float(r[3])*100,1)}%) | OFF:{round(float(r[6] or 0),1)} DEF:{round(float(r[7] or 0),1)}')