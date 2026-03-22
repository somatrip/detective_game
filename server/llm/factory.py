"""LLM provider factory to keep the backend implementation swappable.

Clients are cached as singletons — one instance per process lifetime.
"""

from __future__ import annotations

from collections.abc import Callable
from functools import lru_cache

from ..config import settings
from .anthropic_client import AnthropicLLMClient
from .base import LLMClient
from .local_stub import LocalEchoLLMClient
from .openai_client import OpenAILLMClient

_PROVIDER_BUILDERS: dict[str, Callable[[], LLMClient]] = {
    "openai": lambda: OpenAILLMClient(
        api_key=settings.openai_api_key or "",
        model=settings.openai_model,
    ),
    "anthropic": lambda: AnthropicLLMClient(
        api_key=settings.anthropic_api_key or "",
        model=settings.anthropic_model,
    ),
    "local": LocalEchoLLMClient,
}


@lru_cache(maxsize=1)
def get_llm_client() -> LLMClient:
    """Return a cached LLM client for the configured provider.

    The client is instantiated once and reused for all subsequent requests,
    avoiding the overhead of creating new HTTP connection pools per turn.
    """
    provider = settings.llm_provider.lower()
    try:
        builder = _PROVIDER_BUILDERS[provider]
    except KeyError as exc:  # pragma: no cover - defensive branch
        raise ValueError(f"Unsupported LLM provider '{settings.llm_provider}'.") from exc
    return builder()


__all__ = ["get_llm_client"]
