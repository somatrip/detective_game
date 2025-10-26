"""Placeholder LLM client that simulates a locally hosted model."""

from __future__ import annotations

from typing import Iterable

from .base import ChatMessage, LLMClient


class LocalEchoLLMClient(LLMClient):
    """A simple echo bot that can be swapped out for a real local LLM."""

    async def generate(self, *, npc_id: str, messages: Iterable[ChatMessage]) -> str:
        history = list(messages)
        last_user = next((m["content"] for m in reversed(history) if m.get("role") == "user"), None)
        if not last_user:
            return "I'm ready whenever you are, detective."
        return (
            "[Local model stub] You said: "
            + last_user
            + "\nReplace LocalEchoLLMClient with an actual local model implementation."
        )


__all__ = ["LocalEchoLLMClient"]
