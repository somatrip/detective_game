"""Unit tests for server.config.Settings."""

import pytest

from server.config import Settings

# Fields whose env vars (prefixed or aliased) might leak from the host.
_ENV_VARS_TO_CLEAR = [
    "ECHO_LLM_PROVIDER",
    "ECHO_OPENAI_API_KEY",
    "OPENAI_API_KEY",
    "ECHO_ANTHROPIC_API_KEY",
    "ANTHROPIC_API_KEY",
    "ECHO_SUPABASE_URL",
    "SUPABASE_URL",
    "ECHO_SUPABASE_KEY",
    "SUPABASE_KEY",
    "ECHO_CORS_ORIGINS",
    "ECHO_CASE_ID",
    "ECHO_OPENAI_MODEL",
    "ECHO_CLASSIFIER_TIMEOUT",
    "ECHO_CLASSIFIER_CONNECT_TIMEOUT",
]


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    """Remove host env vars that could influence Settings defaults."""
    for var in _ENV_VARS_TO_CLEAR:
        monkeypatch.delenv(var, raising=False)


class TestSettingsDefaults:
    """Verify default values when no env vars or overrides are supplied."""

    def test_llm_provider_default(self):
        s = Settings(_env_file=None)
        assert s.llm_provider == "openai"

    def test_openai_model_default(self):
        s = Settings(_env_file=None)
        assert s.openai_model == "gpt-4o-mini"

    def test_case_id_default(self):
        s = Settings(_env_file=None)
        assert s.case_id == "echoes_in_the_atrium"

    def test_cors_origins_default(self):
        s = Settings(_env_file=None)
        assert s.cors_origins is None

    def test_classifier_timeout_default(self):
        s = Settings(_env_file=None)
        assert s.classifier_timeout == 30.0

    def test_classifier_connect_timeout_default(self):
        s = Settings(_env_file=None)
        assert s.classifier_connect_timeout == 10.0

    def test_api_keys_default_none(self):
        s = Settings(_env_file=None)
        assert s.openai_api_key is None
        assert s.anthropic_api_key is None
        assert s.supabase_url is None
        assert s.supabase_key is None


class TestSettingsOverrides:
    """Verify that explicit keyword overrides take effect."""

    def test_llm_provider_override(self):
        s = Settings(_env_file=None, llm_provider="anthropic")
        assert s.llm_provider == "anthropic"

    def test_classifier_timeout_override(self):
        s = Settings(_env_file=None, classifier_timeout=15.0)
        assert s.classifier_timeout == 15.0

    def test_case_id_override(self):
        s = Settings(_env_file=None, case_id="my_custom_case")
        assert s.case_id == "my_custom_case"

    def test_openai_model_override(self):
        s = Settings(_env_file=None, openai_model="gpt-4o")
        assert s.openai_model == "gpt-4o"

    def test_cors_origins_override(self):
        s = Settings(_env_file=None, cors_origins="http://localhost:3000")
        assert s.cors_origins == "http://localhost:3000"
