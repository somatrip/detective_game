"""Tests for LLM client implementations (error wrapping, initialization)."""

from __future__ import annotations

import pytest

from server.errors import LLMServiceError
from server.llm.base import LLM_TIMEOUT_SECONDS, LLMClient


class TestLLMBase:
    """Tests for the base LLM client interface."""

    def test_cannot_instantiate_abstract_class(self):
        with pytest.raises(TypeError):
            LLMClient()  # type: ignore[abstract]

    def test_timeout_constant(self):
        assert LLM_TIMEOUT_SECONDS == 60


class TestAnthropicClient:
    """Tests for AnthropicLLMClient."""

    def test_rejects_empty_api_key(self):
        from server.llm.anthropic_client import AnthropicLLMClient

        with pytest.raises(ValueError, match="API key must be provided"):
            AnthropicLLMClient(api_key="", model="claude-3-haiku-20240307")

    @pytest.mark.asyncio
    async def test_wraps_sdk_errors_in_llm_service_error(self):
        from unittest.mock import AsyncMock, MagicMock, patch

        from server.llm.anthropic_client import AnthropicLLMClient

        client = AnthropicLLMClient(api_key="test-key", model="test-model")
        mock_create = AsyncMock(side_effect=RuntimeError("API timeout"))
        with patch.object(client._client.messages, "create", mock_create):
            with pytest.raises(LLMServiceError, match="API timeout"):
                await client.generate(
                    npc_id="test",
                    messages=[{"role": "user", "content": "hello"}],
                )


class TestOpenAIClient:
    """Tests for OpenAILLMClient."""

    def test_rejects_empty_api_key(self):
        from server.llm.openai_client import OpenAILLMClient

        with pytest.raises(ValueError, match="API key must be provided"):
            OpenAILLMClient(api_key="", model="gpt-4")

    @pytest.mark.asyncio
    async def test_wraps_sdk_errors_in_llm_service_error(self):
        from unittest.mock import AsyncMock, patch

        from server.llm.openai_client import OpenAILLMClient

        client = OpenAILLMClient(api_key="test-key", model="test-model")
        mock_create = AsyncMock(side_effect=RuntimeError("Rate limited"))
        with patch.object(client._client.chat.completions, "create", mock_create):
            with pytest.raises(LLMServiceError, match="Rate limited"):
                await client.generate(
                    npc_id="test",
                    messages=[{"role": "user", "content": "hello"}],
                )
