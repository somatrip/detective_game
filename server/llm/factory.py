"""LLM provider factory to keep the backend implementation swappable."""

from __future__ import annotations

from typing import Callable, Dict

from ..config import settings
from .base import LLMClient
from .local_stub import LocalEchoLLMClient
from .openai_client import OpenAILLMClient


_PROVIDER_BUILDERS: Dict[str, Callable[[], LLMClient]] = {
    "openai": lambda: OpenAILLMClient(
        api_key=settings.openai_api_key or "",
        model=settings.openai_model,
    ),
    "local": LocalEchoLLMClient,
}


def create_llm_client() -> LLMClient:
    """Instantiate an LLM client based on the configured provider name."""

    provider = settings.llm_provider.lower()
    try:
        builder = _PROVIDER_BUILDERS[provider]
    except KeyError as exc:  # pragma: no cover - defensive branch
        raise ValueError(f"Unsupported LLM provider '{settings.llm_provider}'.") from exc
    return builder()


__all__ = ["create_llm_client"]
