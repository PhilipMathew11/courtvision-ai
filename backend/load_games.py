from nba_api.stats.endpoints import leaguegamelog
from sqlalchemy import create_engine, text
import time

engine = create_engine('postgresql://courtvision:password@postgres:5432/courtvision_db')

with engine.begin() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS game_results (
            id SERIAL PRIMARY KEY,
            season VARCHAR(10),
            game_date DATE,
            home_team VARCHAR(10),
            away_team VARCHAR(10),
            home_score INTEGER,
            away_score INTEGER,
            home_win INTEGER,
            UNIQUE(season, game_date, home_team, away_team)
        )
    """))
    print('Table ready')

seasons = ['2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26']

for season in seasons:
    print(f'Loading {season}...')
    time.sleep(1)
    try:
        log = leaguegamelog.LeagueGameLog(
            season=season,
            season_type_all_star='Regular Season',
            direction='ASC'
        )
        df = log.get_data_frames()[0]
        print(f'  Got {len(df)} rows')

        # Each game appears twice (once per team) — pair them up
        games = {}
        for _, row in df.iterrows():
            gid = str(row['GAME_ID'])
            if gid not in games:
                games[gid] = []
            games[gid].append(row)

        loaded = 0
        with engine.begin() as conn:
            for gid, rows in games.items():
                if len(rows) != 2:
                    continue
                r0, r1 = rows[0], rows[1]
                # Home team has 'vs.' in MATCHUP, away has '@'
                if 'vs.' in str(r0['MATCHUP']):
                    home, away = r0, r1
                elif 'vs.' in str(r1['MATCHUP']):
                    home, away = r1, r0
                else:
                    continue

                home_score = int(home['PTS'] or 0)
                away_score = int(away['PTS'] or 0)
                if home_score == 0 and away_score == 0:
                    continue

                try:
                    conn.execute(text("""
                        INSERT INTO game_results
                        (season, game_date, home_team, away_team, home_score, away_score, home_win)
                        VALUES (:season, :date, :home, :away, :hs, :as, :hw)
                        ON CONFLICT DO NOTHING
                    """), {
                        'season': season,
                        'date':   str(home['GAME_DATE'])[:10],
                        'home':   str(home['TEAM_ABBREVIATION']),
                        'away':   str(away['TEAM_ABBREVIATION']),
                        'hs':     home_score,
                        'as':     away_score,
                        'hw':     1 if home_score > away_score else 0,
                    })
                    loaded += 1
                except Exception:
                    continue

        print(f'  Loaded {loaded} games for {season}')
        time.sleep(1)

    except Exception as e:
        print(f'  Error: {e}')
        continue

with engine.connect() as conn:
    total = conn.execute(text("SELECT COUNT(*) FROM game_results")).scalar()
    seasons_db = conn.execute(text("SELECT season, COUNT(*) FROM game_results GROUP BY season ORDER BY season")).fetchall()
    print(f'\nTotal games: {total}')
    for s in seasons_db:
        print(f'  {s[0]}: {s[1]} games')