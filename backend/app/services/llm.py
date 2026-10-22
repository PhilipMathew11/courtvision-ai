def groq_messages(model: str, instruction: str, user_content: str) -> list[dict[str, str]]:
    if model.startswith("openai/gpt-oss-"):
        return [{"role": "user", "content": f"{instruction}\n\n{user_content}"}]
    return [
        {"role": "system", "content": instruction},
        {"role": "user", "content": user_content},
    ]


def groq_token_limit(model: str, tokens: int) -> dict[str, int]:
    key = "max_completion_tokens" if model.startswith("openai/gpt-oss-") else "max_tokens"
    return {key: tokens}
