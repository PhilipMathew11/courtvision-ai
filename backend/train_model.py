import json
import pickle
import numpy as np
from sqlalchemy import create_engine, text
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

engine = create_engine('postgresql://courtvision:password@postgres:5432/courtvision_db')

print('Building training dataset...')

with engine.connect() as conn:
    rows = conn.execute(text('''
        SELECT p.team_abbreviation, s.season,
            AVG(s.pts), AVG(s.reb), AVG(s.ast),
            AVG(s.stl), AVG(s.blk), AVG(s.tov),
            AVG(s.fg_pct), AVG(s.fg3_pct), AVG(s.ft_pct)
        FROM player_season_stats s
        JOIN players p ON p.id = s.player_id
        WHERE p.team_abbreviation IS NOT NULL AND s.games_played >= 10
        GROUP BY p.team_abbreviation, s.season
    ''')).fetchall()

print(f'Got {len(rows)} team-season records')

team_ratings = {}
for row in rows:
    key = f"{row[0]}_{row[1]}"
    team_ratings[key] = {
        'pts': float(row[2] or 0), 'reb': float(row[3] or 0),
        'ast': float(row[4] or 0), 'stl': float(row[5] or 0),
        'blk': float(row[6] or 0), 'tov': float(row[7] or 0),
        'fg_pct': float(row[8] or 0), 'fg3_pct': float(row[9] or 0),
        'ft_pct': float(row[10] or 0),
    }

seasons = list(set([r[1] for r in rows]))
X, y = [], []
np.random.seed(42)

for season in seasons:
    season_teams = [r[0] for r in rows if r[1] == season]
    for i, home in enumerate(season_teams):
        for away in season_teams[i+1:]:
            hk, ak = f"{home}_{season}", f"{away}_{season}"
            if hk not in team_ratings or ak not in team_ratings:
                continue
            h, a = team_ratings[hk], team_ratings[ak]
            features = [
                h['pts']-a['pts'], h['reb']-a['reb'], h['ast']-a['ast'],
                h['stl']-a['stl'], h['blk']-a['blk'], h['tov']-a['tov'],
                h['fg_pct']-a['fg_pct'], h['fg3_pct']-a['fg3_pct'],
                h['ft_pct']-a['ft_pct'], h['pts'], a['pts'],
                h['fg_pct'], a['fg_pct'], 1,
            ]
            X.append(features)
            score = (h['pts']-a['pts'])*0.4 + (h['fg_pct']-a['fg_pct'])*20 + (a['tov']-h['tov'])*0.5 + np.random.normal(0,3)
            y.append(1 if score > 0 else 0)

print(f'Training samples: {len(X)}')
X, y = np.array(X), np.array(y)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s = scaler.transform(X_test)

print('Training model...')
model = GradientBoostingClassifier(n_estimators=200, max_depth=4, learning_rate=0.05, random_state=42)
model.fit(X_train_s, y_train)

acc = accuracy_score(y_test, model.predict(X_test_s))
print(f'Accuracy: {acc:.1%}')

with open('/app/ml_model.pkl', 'wb') as f:
    pickle.dump({'model': model, 'scaler': scaler, 'team_ratings': team_ratings}, f)

print('Model saved! Done.')