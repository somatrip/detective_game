"""Unit tests for server.llm.factory provider selection."""

from unittest.mock import patch

import pytest

from server.llm.factory import create_llm_client, get_llm_client
from server.llm.local_stub import LocalEchoLLMClient


class TestGetLlmClient:
    """Tests for get_llm_client factory function."""

    def test_local_provider(self):
        with patch("server.llm.factory.settings") as mock_settings:
            mock_settings.llm_provider = "local"
            get_llm_client.cache_clear()
            client = get_llm_client()
            assert isinstance(client, LocalEchoLLMClient)
            get_llm_client.cache_clear()

    def test_unknown_provider_raises(self):
        with patch("server.llm.factory.settings") as mock_settings:
            mock_settings.llm_provider = "nonexistent"
            get_llm_client.cache_clear()
            with pytest.raises(ValueError, match="Unsupported LLM provider"):
                get_llm_client()
            get_llm_client.cache_clear()

    def test_provider_lookup_is_case_insensitive(self):
        with patch("server.llm.factory.settings") as mock_settings:
            mock_settings.llm_provider = "LOCAL"
            get_llm_client.cache_clear()
            client = get_llm_client()
            assert isinstance(client, LocalEchoLLMClient)
            get_llm_client.cache_clear()

    def test_create_llm_client_is_legacy_alias(self):
        assert create_llm_client is get_llm_client
