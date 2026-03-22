"""Domain error hierarchy for structured exception handling."""

from __future__ import annotations


class LLMServiceError(RuntimeError):
    """Raised when an LLM provider call fails (network, auth, quota, etc.)."""


class ClassifierError(LLMServiceError):
    """Raised when the secondary classifier LLM call fails."""


__all__ = ["LLMServiceError", "ClassifierError"]
