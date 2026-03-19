"""OpenAI Chat Completions client implementation."""

from __future__ import annotations

from collections.abc import Iterable

import httpx
from openai import AsyncOpenAI

from .base import LLM_TIMEOUT_SECONDS, ChatMessage, LLMClient


class OpenAILLMClient(LLMClient):
    """LLM client that proxies requests to the OpenAI Chat Completions API."""

    def __init__(self, *, api_key: str, model: str) -> None:
        if not api_key:
            raise ValueError("OpenAI API key must be provided when using the OpenAI provider.")

        self._client = AsyncOpenAI(
            api_key=api_key,
            timeout=httpx.Timeout(LLM_TIMEOUT_SECONDS, connect=10.0),
        )
        self._model = model

    async def generate(self, *, npc_id: str, messages: Iterable[ChatMessage]) -> str:
        chat_messages = list(messages)
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=chat_messages,
        )
        choice = response.choices[0]
        return choice.message.content or ""


__all__ = ["OpenAILLMClient"]
