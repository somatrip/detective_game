"""Unit tests for server.llm.classifier (tactic classification + evidence detection)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Mock settings so llm_provider = "openai" (avoids the "local" short-circuit)
# ---------------------------------------------------------------------------

_mock_settings_attrs = {
    "llm_provider": "openai",
    "openai_api_key": "test-key",
    "anthropic_api_key": "",
    "classifier_timeout": 10.0,
    "classifier_connect_timeout": 5.0,
    "openai_classifier_model": "gpt-4o-mini",
    "anthropic_classifier_model": "claude-3-haiku",
}


@pytest.fixture(autouse=True)
def _patch_settings():
    """Ensure classifier sees llm_provider='openai' for all tests."""
    with patch("server.llm.classifier.settings") as mock_settings:
        for attr, val in _mock_settings_attrs.items():
            setattr(mock_settings, attr, val)
        yield mock_settings


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _patch_classifier(return_value=None, side_effect=None):
    """Return a patch context-manager for _call_classifier_json."""
    kwargs: dict = {"new_callable": AsyncMock}
    if side_effect is not None:
        kwargs["side_effect"] = side_effect
    elif return_value is not None:
        kwargs["return_value"] = return_value
    else:
        kwargs["return_value"] = {}
    return patch("server.llm.classifier._call_classifier_json", **kwargs)


def _make_mock_case():
    """Return a minimal mock case object for classify_player_turn."""
    case = MagicMock()
    case.npc_relevant_evidence = {"detective-npc": ["evidence-a"]}
    case.smoking_gun_map = {"detective-npc": ["evidence-b"]}
    case.npc_profiles = {}
    case.discovery_catalog = {}
    return case


# ===================================================================
# classify_player_turn tests
# ===================================================================


class TestClassifyPlayerTurn:
    """Tests for classify_player_turn."""

    async def test_valid_classification(self):
        from server.llm.classifier import classify_player_turn

        with _patch_classifier(
            {"tactic_type": "empathy", "evidence_strength": "strong"}
        ):
            result = await classify_player_turn(
                message="I understand how you feel",
                npc_id="detective-npc",
                player_evidence_ids=["evidence-a"],
                conversation_history=[],
                npc_name="Test NPC",
            )

        assert result["tactic_type"] == "empathy"
        assert result["evidence_strength"] == "strong"
        assert result["degraded"] is False

    async def test_invalid_tactic_type_falls_back(self):
        from server.llm.classifier import classify_player_turn

        with _patch_classifier(
            {"tactic_type": "BOGUS_TACTIC", "evidence_strength": "weak"}
        ):
            result = await classify_player_turn(
                message="hello",
                npc_id="detective-npc",
                player_evidence_ids=[],
                conversation_history=[],
                npc_name="Test NPC",
            )

        assert result["tactic_type"] == "open_ended"
        assert result["evidence_strength"] == "weak"

    async def test_invalid_evidence_strength_falls_back(self):
        from server.llm.classifier import classify_player_turn

        with _patch_classifier(
            {"tactic_type": "direct_accusation", "evidence_strength": "mega_strong"}
        ):
            result = await classify_player_turn(
                message="you did it",
                npc_id="detective-npc",
                player_evidence_ids=[],
                conversation_history=[],
                npc_name="Test NPC",
            )

        assert result["tactic_type"] == "direct_accusation"
        assert result["evidence_strength"] == "none"

    async def test_exception_sets_degraded(self):
        from server.llm.classifier import classify_player_turn

        with _patch_classifier(side_effect=RuntimeError("LLM down")):
            result = await classify_player_turn(
                message="tell me everything",
                npc_id="detective-npc",
                player_evidence_ids=[],
                conversation_history=[],
                npc_name="Test NPC",
            )

        assert result["degraded"] is True
        assert result["tactic_type"] == "open_ended"
        assert result["evidence_strength"] == "none"

    async def test_empty_response_uses_defaults(self):
        from server.llm.classifier import classify_player_turn

        with _patch_classifier({}):
            result = await classify_player_turn(
                message="hi",
                npc_id="detective-npc",
                player_evidence_ids=[],
                conversation_history=[],
                npc_name="Test NPC",
            )

        assert result["tactic_type"] == "open_ended"
        assert result["evidence_strength"] == "none"
        assert result["degraded"] is False

    async def test_conversation_history_passed(self):
        from server.llm.classifier import classify_player_turn

        with _patch_classifier(
            {"tactic_type": "repeat_pressure", "evidence_strength": "none"}
        ) as mock_call:
            await classify_player_turn(
                message="I asked you already",
                npc_id="detective-npc",
                player_evidence_ids=[],
                conversation_history=[
                    {"role": "user", "content": "where were you?"},
                    {"role": "assistant", "content": "I was at home."},
                ],
                npc_name="Test NPC",
            )
            mock_call.assert_awaited_once()


# ===================================================================
# detect_evidence tests
# ===================================================================


class TestDetectEvidence:
    """Tests for detect_evidence using real case data."""

    @pytest.fixture()
    def case(self, sample_case_data):
        """Provide the real case data."""
        return sample_case_data

    def _pick_npc_and_discovery(self, case):
        """Pick the first NPC that has discoveries in the catalog."""
        for did, info in case.discovery_catalog.items():
            npc_id = info["npc_id"]
            return npc_id, did, info["evidence_id"]
        raise RuntimeError("No discoveries in catalog")

    async def test_valid_detection(self, case):
        from server.llm.classifier import detect_evidence

        npc_id, disc_id, evi_id = self._pick_npc_and_discovery(case)

        with _patch_classifier(
            {
                "discovery_ids": [disc_id],
                "expression": "guarded",
                "discovery_summaries": {disc_id: "The NPC revealed an important secret."},
            }
        ):
            result = await detect_evidence(
                npc_response="I confess, I did lend my key.",
                npc_id=npc_id,
                player_discovery_ids=[],
                player_message="Did you lend someone your key?",
                npc_name="Test NPC",
                discovery_catalog=case.discovery_catalog,
            )

        assert disc_id in result["discovery_ids"]
        assert evi_id in result["evidence_ids"]
        assert result["expression"] == "guarded"
        assert result["degraded"] is False

    async def test_already_collected_filtered_out(self, case):
        from server.llm.classifier import detect_evidence

        npc_id, disc_id, _evi_id = self._pick_npc_and_discovery(case)

        with _patch_classifier(
            {
                "discovery_ids": [disc_id],
                "expression": "neutral",
                "discovery_summaries": {disc_id: "Already known info."},
            }
        ):
            result = await detect_evidence(
                npc_response="I already told you this.",
                npc_id=npc_id,
                player_discovery_ids=[disc_id],
                npc_name="Test NPC",
                discovery_catalog=case.discovery_catalog,
            )

        assert disc_id not in result["discovery_ids"]
        assert result["evidence_ids"] == []

    async def test_invalid_expression_falls_back(self, case):
        from server.llm.classifier import detect_evidence

        npc_id, _disc_id, _evi_id = self._pick_npc_and_discovery(case)

        with _patch_classifier(
            {
                "discovery_ids": [],
                "expression": "INVALID_MOOD",
                "discovery_summaries": {},
            }
        ):
            result = await detect_evidence(
                npc_response="Nothing to see here.",
                npc_id=npc_id,
                player_discovery_ids=[],
                npc_name="Test NPC",
                discovery_catalog=case.discovery_catalog,
            )

        assert result["expression"] == "neutral"

    async def test_exception_sets_degraded(self, case):
        from server.llm.classifier import detect_evidence

        npc_id, _disc_id, _evi_id = self._pick_npc_and_discovery(case)

        with _patch_classifier(side_effect=RuntimeError("LLM exploded")):
            result = await detect_evidence(
                npc_response="Something went wrong.",
                npc_id=npc_id,
                player_discovery_ids=[],
                npc_name="Test NPC",
                discovery_catalog=case.discovery_catalog,
            )

        assert result["degraded"] is True
        assert result["discovery_ids"] == []
        assert result["expression"] == "neutral"

    async def test_empty_response_defaults(self, case):
        from server.llm.classifier import detect_evidence

        npc_id, _disc_id, _evi_id = self._pick_npc_and_discovery(case)

        with _patch_classifier({}):
            result = await detect_evidence(
                npc_response="I have nothing to say.",
                npc_id=npc_id,
                player_discovery_ids=[],
                npc_name="Test NPC",
                discovery_catalog=case.discovery_catalog,
            )

        assert result["discovery_ids"] == []
        assert result["evidence_ids"] == []
        assert result["expression"] == "neutral"
        assert result["degraded"] is False

    async def test_bogus_discovery_id_filtered(self, case):
        from server.llm.classifier import detect_evidence

        npc_id, _disc_id, _evi_id = self._pick_npc_and_discovery(case)

        with _patch_classifier(
            {
                "discovery_ids": ["totally-fake-id"],
                "expression": "angry",
                "discovery_summaries": {},
            }
        ):
            result = await detect_evidence(
                npc_response="I said nothing useful.",
                npc_id=npc_id,
                player_discovery_ids=[],
                npc_name="Test NPC",
                discovery_catalog=case.discovery_catalog,
            )

        assert result["discovery_ids"] == []
        assert result["expression"] == "angry"

    async def test_npc_with_no_discoveries_returns_empty(self, case):
        """An NPC not in the discovery catalog returns immediate empty result."""
        from server.llm.classifier import detect_evidence

        with _patch_classifier(
            {"discovery_ids": ["x"], "expression": "angry"}
        ) as mock_call:
            result = await detect_evidence(
                npc_response="Hello.",
                npc_id="nonexistent-npc-999",
                player_discovery_ids=[],
                npc_name="Test NPC",
                discovery_catalog=case.discovery_catalog,
            )

        mock_call.assert_not_awaited()
        assert result["discovery_ids"] == []
        assert result["expression"] == "neutral"
        assert result["degraded"] is False

    async def test_discovery_summaries_included(self, case):
        from server.llm.classifier import detect_evidence

        npc_id, disc_id, _evi_id = self._pick_npc_and_discovery(case)
        summary_text = "Amelia admits she lent her key to Eddie."

        with _patch_classifier(
            {
                "discovery_ids": [disc_id],
                "expression": "distressed",
                "discovery_summaries": {disc_id: summary_text},
            }
        ):
            result = await detect_evidence(
                npc_response="Fine, I gave Eddie my key.",
                npc_id=npc_id,
                player_discovery_ids=[],
                npc_name="Test NPC",
                discovery_catalog=case.discovery_catalog,
            )

        assert disc_id in result["discovery_summaries"]
        assert result["discovery_summaries"][disc_id] == summary_text
