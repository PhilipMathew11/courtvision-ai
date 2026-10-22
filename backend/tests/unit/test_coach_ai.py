import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from app.api.coach import CoachQuestion, coach_ask
from app.services.coach_ai import ask_coach


class CoachAITests(unittest.IsolatedAsyncioTestCase):
    @patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}, clear=False)
    @patch("app.services.coach_ai.AsyncGroq")
    async def test_uses_configured_groq_model(self, groq_client):
        completion = AsyncMock(
            return_value=SimpleNamespace(
                choices=[
                    SimpleNamespace(message=SimpleNamespace(content="Basketball analysis"))
                ]
            )
        )
        groq_client.return_value.chat.completions.create = completion
        with patch.dict(os.environ, {"GROQ_MODEL": "openai/gpt-oss-120b"}):
            result = await ask_coach("Why did the team win?")

        self.assertEqual(result["model"], "openai/gpt-oss-120b")
        self.assertEqual(result["answer"], "Basketball analysis")
        self.assertEqual(
            completion.await_args.kwargs["model"],
            "openai/gpt-oss-120b",
        )

    @patch("app.api.coach.ask_coach", new_callable=AsyncMock)
    async def test_reports_unavailable_model_as_service_error(self, ask_mock):
        ask_mock.side_effect = Exception(
            "Error code: 404 model_not_found"
        )

        with self.assertRaises(HTTPException) as raised:
            await coach_ask(CoachQuestion(question="Analyze the game"))

        self.assertEqual(raised.exception.status_code, 503)
        self.assertIn("GROQ_MODEL", raised.exception.detail)


if __name__ == "__main__":
    unittest.main()
