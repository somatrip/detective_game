"""Abstract base interface for pluggable LLM clients."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Iterable, Mapping


ChatMessage = Mapping[str, str]


class LLMClient(ABC):
    """An abstraction over a conversational language model."""

    @abstractmethod
    async def generate(self, *, npc_id: str, messages: Iterable[ChatMessage]) -> str:
        """Generate the assistant's response for the supplied chat history."""


__all__ = ["ChatMessage", "LLMClient"]
