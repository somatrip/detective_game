"""Unit tests for server.npc_registry — NPCProfile dataclass and accessor functions."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from server.npc_registry import NPCProfile, get_npc_profile, list_npcs


@pytest.fixture()
def _load_case(sample_case_data):
    """Patch get_active_case to return the real sample case data."""
    with patch("server.cases.get_active_case", return_value=sample_case_data):
        yield


@pytest.mark.usefixtures("_load_case")
class TestGetNpcProfile:
    """Tests for get_npc_profile()."""

    def test_valid_npc_returns_profile(self, sample_case_data):
        first_id = next(iter(sample_case_data.npc_profiles))
        profile = get_npc_profile(first_id)
        assert isinstance(profile, NPCProfile)
        assert profile.npc_id == first_id

    def test_nonexistent_id_raises_value_error(self):
        with pytest.raises(ValueError, match="Unknown NPC id"):
            get_npc_profile("totally-fake-npc-id")


@pytest.mark.usefixtures("_load_case")
class TestListNpcs:
    """Tests for list_npcs()."""

    def test_returns_dict_of_npc_profiles(self):
        result = list_npcs()
        assert isinstance(result, dict)
        assert len(result) > 0
        for npc_id, profile in result.items():
            assert isinstance(npc_id, str)
            assert isinstance(profile, NPCProfile)

    def test_returns_copy_not_original(self, sample_case_data):
        result = list_npcs()
        # Mutating the returned dict should not affect the registry
        result["injected-fake"] = NPCProfile(
            npc_id="injected-fake",
            display_name="Fake",
            system_prompt="nope",
        )
        fresh = list_npcs()
        assert "injected-fake" not in fresh
        assert len(fresh) == len(sample_case_data.npc_profiles)
