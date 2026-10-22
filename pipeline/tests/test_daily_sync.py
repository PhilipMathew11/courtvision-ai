import unittest
from datetime import date

from processors.daily_sync import build_dna_scores, current_nba_season


class DailySyncTests(unittest.TestCase):
    def test_detects_nba_season_from_calendar_date(self):
        self.assertEqual(current_nba_season(date(2026, 6, 30)), "2025-26")
        self.assertEqual(current_nba_season(date(2026, 7, 1)), "2026-27")

    def test_builds_relative_profiles_for_current_players(self):
        players = [
            {
                "PLAYER_ID": 1,
                "TS_PCT": 0.55,
                "FG3_PCT": 0.30,
                "FT_PCT": 0.70,
                "AST": 2,
                "AST_TO": 1,
                "AST_PCT": 0.10,
                "FG_PCT": 0.40,
                "FTA": 2,
                "PTS": 10,
                "STL": 0.5,
                "BLK": 0.2,
                "DEF_RATING": 115,
                "REB": 3,
                "OREB_PCT": 0.05,
                "DREB_PCT": 0.10,
                "FGA": 8,
                "USG_PCT": 0.15,
                "FG3A": 3,
                "PACE": 98,
            },
            {
                "PLAYER_ID": 2,
                "TS_PCT": 0.65,
                "FG3_PCT": 0.40,
                "FT_PCT": 0.90,
                "AST": 8,
                "AST_TO": 4,
                "AST_PCT": 0.35,
                "FG_PCT": 0.55,
                "FTA": 8,
                "PTS": 25,
                "STL": 2,
                "BLK": 1,
                "DEF_RATING": 100,
                "REB": 10,
                "OREB_PCT": 0.12,
                "DREB_PCT": 0.25,
                "FGA": 18,
                "USG_PCT": 0.32,
                "FG3A": 9,
                "PACE": 104,
            },
        ]

        profiles = build_dna_scores(players)

        self.assertEqual(set(profiles), {1, 2})
        self.assertEqual(profiles[1]["shooting"], 0.0)
        self.assertEqual(profiles[2]["shooting"], 100.0)
        self.assertEqual(set(profiles[1]), set(profiles[2]))


if __name__ == "__main__":
    unittest.main()
