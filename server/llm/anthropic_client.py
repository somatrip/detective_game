"""Anthropic Claude client implementation."""

from __future__ import annotations

from typing import Iterable, List

import anthropic

from .base import ChatMessage, LLMClient


class AnthropicLLMClient(LLMClient):
    """LLM client that proxies requests to the Anthropic Messages API."""

    def __init__(self, *, api_key: str, model: str) -> None:
        if not api_key:
            raise ValueError("Anthropic API key must be provided when using the Anthropic provider.")

        self._client = anthropic.AsyncAnthropic(api_key=api_key)
        self._model = model

    async def generate(self, *, npc_id: str, messages: Iterable[ChatMessage]) -> str:
        all_msgs: List[ChatMessage] = list(messages)

        # Extract system messages and combine them into a single system prompt.
        # The Anthropic API takes system as a top-level parameter, not in messages.
        system_parts: list[str] = []
        conversation: list[dict[str, str]] = []

        for msg in all_msgs:
            if msg["role"] == "system":
                system_parts.append(msg["content"])
            else:
                conversation.append({"role": msg["role"], "content": msg["content"]})

        system_prompt = "\n\n".join(system_parts) if system_parts else ""

        response = await self._client.messages.create(
            model=self._model,
            max_tokens=1024,
            system=system_prompt,
            messages=conversation,
        )
        return response.content[0].text


__all__ = ["AnthropicLLMClient"]
