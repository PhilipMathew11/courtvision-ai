import os
import unittest
from unittest.mock import AsyncMock, patch

from app.services.scout import (
    ScoutCriteria,
    parse_scout_brief,
    rank_scout_candidates,
    requested_min_games,
)


class ScoutRankingTests(unittest.TestCase):
    def setUp(self):
        self.criteria = ScoutCriteria(
            target_height_inches=71,
            weights={"defense": 0.7, "shooting": 0.3},
            min_games=10,
            interpretation="Prioritize strong defense with some shooting.",
        )
        self.players = [
            {
                "nba_id": 1,
                "full_name": "Exact Height",
                "team_abbreviation": "AAA",
                "position": "Guard",
                "height": "5-11",
                "dna_scores": {"defense": 80, "shooting": 40},
                "season_stats": {"gp": 20, "pts": 8},
            },
            {
                "nba_id": 2,
                "full_name": "One Inch Short",
                "team_abbreviation": "BBB",
                "position": "Guard",
                "height": "5-10",
                "dna_scores": {"defense": 60, "shooting": 80},
                "season_stats": {"gp": 20},
            },
            {
                "nba_id": 3,
                "full_name": "One Inch Tall",
                "team_abbreviation": "CCC",
                "position": "Guard",
                "height": "6-0",
                "dna_scores": {"defense": 90, "shooting": 20},
                "season_stats": {"gp": 20},
            },
            {
                "nba_id": 4,
                "full_name": "Too Tall",
                "team_abbreviation": "DDD",
                "position": "Guard",
                "height": "6-1",
                "dna_scores": {"defense": 100, "shooting": 100},
                "season_stats": {"gp": 20},
            },
            {
                "nba_id": 5,
                "full_name": "Small Sample",
                "team_abbreviation": "EEE",
                "position": "Guard",
                "height": "5-11",
                "dna_scores": {"defense": 100, "shooting": 100},
                "season_stats": {"gp": 4},
            },
        ]

    def test_includes_exact_height_and_one_inch_each_side(self):
        results = rank_scout_candidates(self.players, self.criteria)

        self.assertEqual(
            {player["nba_id"] for player in results},
            {1, 2, 3},
        )
        self.assertEqual(results[0]["full_name"], "One Inch Tall")

    def test_higher_weighted_defense_changes_rank(self):
        defense_first = rank_scout_candidates(self.players, self.criteria)
        shooting_first = ScoutCriteria(
            target_height_inches=71,
            weights={"defense": 0.2, "shooting": 0.8},
            min_games=10,
            interpretation="Prioritize shooting.",
        )
        shooting_first_results = rank_scout_candidates(self.players, shooting_first)

        self.assertEqual(defense_first[0]["nba_id"], 3)
        self.assertEqual(shooting_first_results[0]["nba_id"], 2)

    def test_normalizes_height_formats_and_rejects_unknown(self):
        from app.services.scout import height_inches

        self.assertEqual(height_inches("5-11"), 71)
        self.assertEqual(height_inches("6'0\""), 72)
        self.assertIsNone(height_inches(None))


class ScoutBriefTests(unittest.IsolatedAsyncioTestCase):
    @patch.dict(os.environ, {"GROQ_API_KEY": "test-key", "GROQ_MODEL": "test-model"})
    @patch("app.services.scout.AsyncGroq")
    async def test_parses_ai_brief_into_validated_criteria(self, groq_client):
        create = AsyncMock(
            return_value=type(
                "Response",
                (),
                {
                    "choices": [
                        type(
                            "Choice",
                            (),
                            {
                                "message": type(
                                    "Message",
                                    (),
                                    {
                                        "content": (
                                            '{"target_height_inches":71,'
                                            '"weights":{"defense":0.7,"shooting":0.3},'
                                            '"min_games":10,'
                                            '"interpretation":"Defense first, with some shooting."}'
                                        )
                                    },
                                )()
                            },
                        )()
                    ]
                },
            )()
        )
        groq_client.return_value.chat.completions.create = create

        criteria = await parse_scout_brief(
            "Strong defender with a bit of shooting, around 5'11"
        )

        self.assertEqual(criteria.target_height_inches, 71)
        self.assertAlmostEqual(criteria.weights["defense"], 0.7)
        self.assertEqual(criteria.min_games, 10)
        self.assertEqual(create.await_args.kwargs["model"], "test-model")
        self.assertEqual(create.await_args.kwargs["messages"][0]["role"], "system")

    @patch.dict(os.environ, {"GROQ_API_KEY": "test-key", "GROQ_MODEL": "openai/gpt-oss-120b"})
    @patch("app.services.scout.AsyncGroq")
    async def test_combines_prompt_for_gpt_oss(self, groq_client):
        create = AsyncMock(
            return_value=type(
                "Response",
                (),
                {
                    "choices": [
                        type(
                            "Choice",
                            (),
                            {
                                "message": type(
                                    "Message",
                                    (),
                                    {
                                        "content": (
                                            '{"target_height_inches":71,'
                                            '"weights":{"defense":1},'
                                            '"min_games":10,'
                                            '"interpretation":"Strong defender."}'
                                        )
                                    },
                                )()
                            },
                        )()
                    ]
                },
            )()
        )
        groq_client.return_value.chat.completions.create = create

        await parse_scout_brief("Find me a defender at 5'11")

        messages = create.await_args.kwargs["messages"]
        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0]["role"], "user")
        self.assertIn("Translate a basketball coach's scouting request", messages[0]["content"])
        self.assertIn("Find me a defender at 5'11", messages[0]["content"])
        self.assertEqual(create.await_args.kwargs["max_completion_tokens"], 1000)

    def test_minimum_games_is_extracted_only_from_explicit_requirements(self):
        self.assertEqual(
            requested_min_games("A defender with at least 25 games"),
            25,
        )
        self.assertEqual(
            requested_min_games("Find me a defender with a bit of shooting"),
            10,
        )


if __name__ == "__main__":
    unittest.main()
