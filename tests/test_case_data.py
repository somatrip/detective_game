"""Tests for case data validation and referential integrity."""

import pytest

from server.cases import CaseData, load_case


class TestCaseDataValidation:
    """Verify the validate() method catches broken references."""

    def _make_case(self, **overrides) -> CaseData:
        """Build a minimal valid CaseData, applying overrides."""
        from server.npc_registry import NPCProfile

        defaults = dict(
            case_id="test",
            title="Test Case",
            world_context_prompt="You are in a test.",
            npc_profiles={
                "npc-a": NPCProfile(
                    npc_id="npc-a",
                    display_name="NPC A",
                    system_prompt="You are NPC A.",
                    voice="alloy",
                ),
            },
            npc_archetype_map={"npc-a": "professional_fixer"},
            npc_relevant_evidence={"npc-a": ["clue-1"]},
            smoking_gun_map={"npc-a": ["clue-1"]},
            evidence_catalog={"clue-1": "A clue"},
            discovery_catalog={
                "disc-1": {"npc_id": "npc-a", "evidence_id": "clue-1", "description": "A discovery"},
            },
        )
        defaults.update(overrides)
        return CaseData(**defaults)

    def test_valid_case_passes(self):
        case = self._make_case()
        case.validate()  # should not raise

    def test_bad_evidence_in_relevant_evidence_raises(self):
        case = self._make_case(
            npc_relevant_evidence={"npc-a": ["nonexistent-evidence"]},
        )
        with pytest.raises(ValueError, match="unknown evidence"):
            case.validate()

    def test_bad_evidence_in_smoking_gun_raises(self):
        case = self._make_case(
            smoking_gun_map={"npc-a": ["nonexistent-evidence"]},
        )
        with pytest.raises(ValueError, match="unknown evidence"):
            case.validate()

    def test_bad_npc_in_discovery_raises(self):
        case = self._make_case(
            discovery_catalog={
                "disc-1": {"npc_id": "ghost-npc", "evidence_id": "clue-1", "description": "hmm"},
            },
        )
        with pytest.raises(ValueError, match="unknown NPC"):
            case.validate()

    def test_bad_evidence_in_discovery_raises(self):
        case = self._make_case(
            discovery_catalog={
                "disc-1": {"npc_id": "npc-a", "evidence_id": "ghost-clue", "description": "hmm"},
            },
        )
        with pytest.raises(ValueError, match="unknown evidence"):
            case.validate()


class TestRealCaseValidation:
    """Validate the actual shipped case data."""

    def test_echoes_in_atrium_validates(self):
        case = load_case("echoes_in_the_atrium")
        # validate() is already called by load_case(), but call explicitly too
        case.validate()
        assert case.case_id == "echoes_in_the_atrium"
        assert len(case.npc_profiles) > 0
        assert len(case.discovery_catalog) > 0
