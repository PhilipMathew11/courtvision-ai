import pickle
import numpy as np
from sqlalchemy import create_engine, text
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score
from sklearn.calibration import CalibratedClassifierCV

engine = create_engine('postgresql://courtvision:password@postgres:5432/courtvision_db')

print('Loading real game results...')
with engine.connect() as conn:
    games = conn.execute(text("""
        SELECT season, game_date, home_team, away_team, home_win
        FROM game_results
        ORDER BY game_date
    """)).fetchall()

    team_stats = conn.execute(text("""
        SELECT p.team_abbreviation, s.season,
            AVG(s.pts), AVG(s.reb), AVG(s.ast),
            AVG(s.stl), AVG(s.blk), AVG(s.tov),
            AVG(s.fg_pct), AVG(s.fg3_pct), AVG(s.ft_pct),
            COUNT(*) as roster_size
        FROM player_season_stats s
        JOIN players p ON p.id = s.player_id
        WHERE p.team_abbreviation IS NOT NULL
        AND s.games_played >= 10
        GROUP BY p.team_abbreviation, s.season
    """)).fetchall()

print(f'Games: {len(games)}, Team-season records: {len(team_stats)}')

# Build team ratings lookup
ratings = {}
for row in team_stats:
    key = f"{row[0]}_{row[1]}"
    ratings[key] = {
        'pts':     float(row[2] or 0),
        'reb':     float(row[3] or 0),
        'ast':     float(row[4] or 0),
        'stl':     float(row[5] or 0),
        'blk':     float(row[6] or 0),
        'tov':     float(row[7] or 0),
        'fg_pct':  float(row[8] or 0),
        'fg3_pct': float(row[9] or 0),
        'ft_pct':  float(row[10] or 0),
    }

def get_features(home_team, away_team, season):
    hk = f"{home_team}_{season}"
    ak = f"{away_team}_{season}"
    if hk not in ratings or ak not in ratings:
        return None
    h = ratings[hk]
    a = ratings[ak]
    return [
        # Differentials
        h['pts']     - a['pts'],
        h['reb']     - a['reb'],
        h['ast']     - a['ast'],
        h['stl']     - a['stl'],
        h['blk']     - a['blk'],
        a['tov']     - h['tov'],         # positive = home advantage
        h['fg_pct']  - a['fg_pct'],
        h['fg3_pct'] - a['fg3_pct'],
        h['ft_pct']  - a['ft_pct'],
        # Raw values
        h['pts'],    a['pts'],
        h['fg_pct'], a['fg_pct'],
        h['fg3_pct'],a['fg3_pct'],
        h['stl'] + h['blk'],             # home defensive rating
        a['stl'] + a['blk'],             # away defensive rating
        h['pts'] / max(h['tov'], 0.1),   # home scoring efficiency
        a['pts'] / max(a['tov'], 0.1),   # away scoring efficiency
        # Composite scores
        (h['pts'] * 0.4 + h['fg_pct'] * 20 + h['ast'] * 2),
        (a['pts'] * 0.4 + a['fg_pct'] * 20 + a['ast'] * 2),
        1,  # home court advantage
    ]

print('Building feature matrix from real games...')
X, y = [], []
skipped = 0

for game in games:
    season, date, home, away, hw = game
    features = get_features(home, away, season)
    if features is None:
        skipped += 1
        continue
    X.append(features)
    y.append(int(hw))

print(f'Training samples: {len(X)} (skipped {skipped})')

X = np.array(X)
y = np.array(y)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

print('Training GradientBoosting on real game outcomes...')
gb = GradientBoostingClassifier(
    n_estimators=500,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    min_samples_leaf=10,
    random_state=42
)
gb.fit(X_train_s, y_train)
gb_acc = accuracy_score(y_test, gb.predict(X_test_s))
print(f'GradientBoosting accuracy: {gb_acc:.1%}')

print('Training RandomForest...')
rf = RandomForestClassifier(
    n_estimators=500,
    max_depth=8,
    min_samples_leaf=5,
    random_state=42
)
rf.fit(X_train_s, y_train)
rf_acc = accuracy_score(y_test, rf.predict(X_test_s))
print(f'RandomForest accuracy: {rf_acc:.1%}')

# Use best model
best_model = gb if gb_acc >= rf_acc else rf
best_acc   = max(gb_acc, rf_acc)
print(f'\nBest model: {"GradientBoosting" if gb_acc >= rf_acc else "RandomForest"} ({best_acc:.1%})')

# Cross-validation
cv_scores = cross_val_score(best_model, X_train_s, y_train, cv=5)
print(f'Cross-val scores: {cv_scores}')
print(f'Mean CV accuracy: {cv_scores.mean():.1%} (+/- {cv_scores.std():.1%})')

# Calibrate probabilities
calibrated = CalibratedClassifierCV(best_model, cv='prefit', method='sigmoid')
calibrated.fit(X_test_s, y_test)

# Feature importance
feature_names = [
    'pts_diff','reb_diff','ast_diff','stl_diff','blk_diff','tov_diff',
    'fg_diff','fg3_diff','ft_diff','home_pts','away_pts',
    'home_fg','away_fg','home_fg3','away_fg3',
    'home_def','away_def','home_eff','away_eff',
    'home_off_composite','away_off_composite','home_court'
]
if hasattr(best_model, 'feature_importances_'):
    importances = best_model.feature_importances_
    top = sorted(zip(feature_names, importances), key=lambda x: -x[1])[:5]
    print('\nTop 5 features:')
    for name, imp in top:
        print(f'  {name}: {imp:.3f}')

with open('/app/ml_model.pkl', 'wb') as f:
    pickle.dump({
        'model':        calibrated,
        'scaler':       scaler,
        'team_ratings': ratings,
        'accuracy':     best_acc,
        'cv_mean':      cv_scores.mean(),
        'features':     22,
    }, f)

print(f'\nModel saved! Final accuracy: {best_acc:.1%}')