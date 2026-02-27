"""Application settings for the detective game backend."""

from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration values loaded from environment variables.

    Fields are read from env vars with the ECHO_ prefix first, falling back to
    standard names (e.g. OPENAI_API_KEY, ANTHROPIC_API_KEY) for convenience.
    """

    model_config = SettingsConfigDict(
        env_prefix="ECHO_",
        env_file=".env",
        case_sensitive=False,
    )

    llm_provider: str = Field(
        default="openai",
        description="Identifier of the LLM provider implementation to use.",
    )
    openai_api_key: str | None = Field(
        default=None,
        description="API key used when the OpenAI provider is selected.",
        validation_alias=AliasChoices("ECHO_OPENAI_API_KEY", "OPENAI_API_KEY"),
    )
    openai_model: str = Field(
        default="gpt-3.5-turbo",
        description="Chat model name to use for OpenAI completions.",
    )
    openai_tts_model: str = Field(
        default="tts-1",
        description="TTS model for voice synthesis ('tts-1' or 'tts-1-hd').",
    )
    openai_tts_voice: str = Field(
        default="alloy",
        description="Default OpenAI TTS voice. Per-NPC overrides are in npc_registry.",
    )
    openai_stt_model: str = Field(
        default="whisper-1",
        description="Speech-to-text model for transcription.",
    )
    anthropic_api_key: str | None = Field(
        default=None,
        description="API key used when the Anthropic provider is selected.",
        validation_alias=AliasChoices("ECHO_ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY"),
    )
    anthropic_model: str = Field(
        default="claude-sonnet-4-20250514",
        description="Model name to use for Anthropic completions.",
    )
    openai_classifier_model: str = Field(
        default="gpt-4o-mini",
        description="Cheaper OpenAI model for turn classification and evidence detection.",
    )
    anthropic_classifier_model: str = Field(
        default="claude-haiku-4-5-20251001",
        description="Cheaper Anthropic model for turn classification and evidence detection.",
    )

    # ── Supabase ──────────────────────────────────────────────────────────
    supabase_url: str | None = Field(
        default=None,
        description="Supabase project URL.",
        validation_alias=AliasChoices("ECHO_SUPABASE_URL", "SUPABASE_URL"),
    )
    supabase_key: str | None = Field(
        default=None,
        description="Supabase anon or service-role key.",
        validation_alias=AliasChoices("ECHO_SUPABASE_KEY", "SUPABASE_KEY"),
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings instance so the file only loads once."""

    return Settings()


settings = get_settings()
