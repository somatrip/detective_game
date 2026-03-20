"""Shared test fixtures — mock Supabase, mock LLM, API client, sample case data."""

from __future__ import annotations

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Force local LLM provider before any server imports
os.environ["ECHO_LLM_PROVIDER"] = "local"
os.environ["ECHO_SUPABASE_URL"] = ""
os.environ["ECHO_SUPABASE_KEY"] = ""


@pytest.fixture()
def mock_supabase():
    """Patch get_supabase to return a MagicMock with chainable table/auth methods."""
    sb = MagicMock()
    # Chainable table interface: sb.table("x").select("*").execute()
    table_chain = MagicMock()
    sb.table.return_value = table_chain
    table_chain.select.return_value = table_chain
    table_chain.insert.return_value = table_chain
    table_chain.update.return_value = table_chain
    table_chain.upsert.return_value = table_chain
    table_chain.delete.return_value = table_chain
    table_chain.eq.return_value = table_chain
    table_chain.limit.return_value = table_chain
    table_chain.range.return_value = table_chain
    table_chain.order.return_value = table_chain
    table_chain.single.return_value = table_chain
    table_chain.execute.return_value = MagicMock(data=[{"id": "test-id"}])

    # Auth interface
    sb.auth = MagicMock()
    sb.auth.sign_up.return_value = MagicMock(
        user=MagicMock(id="user-123", email="test@example.com"),
        session=MagicMock(access_token="access-tok", refresh_token="refresh-tok"),
    )
    sb.auth.sign_in_with_password.return_value = MagicMock(
        user=MagicMock(id="user-123", email="test@example.com"),
        session=MagicMock(access_token="access-tok", refresh_token="refresh-tok"),
    )
    sb.auth.get_user.return_value = MagicMock(
        user=MagicMock(id="user-123", email="test@example.com", app_metadata={"is_admin": True}),
    )
    sb.auth._refresh_access_token.return_value = MagicMock(
        user=MagicMock(id="user-123", email="test@example.com"),
        session=MagicMock(access_token="new-access", refresh_token="new-refresh"),
    )

    # Storage interface
    storage_bucket = MagicMock()
    sb.storage.from_.return_value = storage_bucket
    storage_bucket.upload.return_value = None
    storage_bucket.get_public_url.return_value = "https://example.com/screenshot.png"

    with patch("server.supabase_client.get_supabase", return_value=sb):
        yield sb


@pytest.fixture()
def mock_supabase_unconfigured():
    """Patch get_supabase to return None (Supabase not configured)."""
    with patch("server.supabase_client.get_supabase", return_value=None):
        yield


@pytest.fixture()
def mock_llm_client():
    """Patch the LLM factory to return an AsyncMock."""
    client = AsyncMock()
    client.generate.return_value = "Mock LLM response."
    with patch("server.llm.factory.get_llm_client", return_value=client):
        yield client


@pytest.fixture()
def sample_case_data():
    """Load the real echoes_in_the_atrium case data."""
    from server.cases.echoes_in_the_atrium import case_data
    return case_data
