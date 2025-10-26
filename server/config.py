"""Application settings for the detective game backend."""

from functools import lru_cache
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    """Runtime configuration values loaded from environment variables."""

    llm_provider: str = Field(
        default="openai",
        description="Identifier of the LLM provider implementation to use.",
    )
    openai_api_key: str | None = Field(
        default=None,
        description="API key used when the OpenAI provider is selected.",
        env="OPENAI_API_KEY",
    )
    openai_model: str = Field(
        default="gpt-3.5-turbo",
        description="Chat model name to use for OpenAI completions.",
    )

    class Config:
        env_prefix = "ECHO_"
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings instance so the file only loads once."""

    return Settings()


settings = get_settings()
