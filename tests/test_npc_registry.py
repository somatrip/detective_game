"""Unit tests for server.npc_registry — NPCProfile dataclass."""

from __future__ import annotations

from server.npc_registry import NPCProfile


class TestNPCProfile:
    """Tests for the NPCProfile dataclass."""

    def test_required_fields(self):
        profile = NPCProfile(
            npc_id="test-npc",
            display_name="Test NPC",
            system_prompt="You are a test NPC.",
        )
        assert profile.npc_id == "test-npc"
        assert profile.display_name == "Test NPC"
        assert profile.system_prompt == "You are a test NPC."

    def test_default_values(self):
        profile = NPCProfile(
            npc_id="test-npc",
            display_name="Test NPC",
            system_prompt="prompt",
        )
        assert profile.timeline == ""
        assert profile.voice == "alloy"
        assert profile.voice_instruction == ""
        assert profile.gender == "male"

    def test_frozen(self):
        profile = NPCProfile(
            npc_id="test-npc",
            display_name="Test NPC",
            system_prompt="prompt",
        )
        import pytest

        with pytest.raises(AttributeError):
            profile.npc_id = "changed"  # type: ignore[misc]
