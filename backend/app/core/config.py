from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "CourtVision AI"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change-this-in-production"
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: str = "postgresql://courtvision:password@localhost:5432/courtvision_db"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # ChromaDB
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    chroma_collection_players: str = "player_embeddings"
    chroma_collection_games: str = "game_embeddings"

    # LLM
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    embedding_model: str = "all-MiniLM-L6-v2"

    # NBA API
    nba_api_delay: float = 0.6

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
