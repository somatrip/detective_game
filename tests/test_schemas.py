"""Unit tests for Pydantic models in server.schemas."""

import pytest
from pydantic import ValidationError

from server.schemas import (
    ChatRequest,
    ChatResponse,
    ChatTurn,
    SpeakRequest,
    StringboardCardPosition,
    StringboardLink,
    StringboardState,
)


class TestChatTurn:
    def test_valid_user(self):
        t = ChatTurn(role="user", content="hello")
        assert t.role == "user"
        assert t.content == "hello"

    def test_valid_assistant(self):
        t = ChatTurn(role="assistant", content="hi there")
        assert t.role == "assistant"

    def test_invalid_role(self):
        with pytest.raises(ValidationError):
            ChatTurn(role="system", content="x")

    def test_empty_content(self):
        with pytest.raises(ValidationError):
            ChatTurn(role="user", content="")


class TestChatRequest:
    def test_minimal(self):
        r = ChatRequest(npc_id="npc1", message="hi")
        assert r.npc_id == "npc1"
        assert r.message == "hi"
        assert r.history == []
        assert r.language == "en"
        assert r.pressure == 0
        assert r.rapport == 25
        assert r.player_evidence_ids == []
        assert r.player_discovery_ids == []
        assert r.peak_pressure == 0
        assert r.session_id is None

    def test_empty_message_rejected(self):
        with pytest.raises(ValidationError):
            ChatRequest(npc_id="npc1", message="")

    def test_pressure_out_of_range(self):
        with pytest.raises(ValidationError):
            ChatRequest(npc_id="npc1", message="hi", pressure=-1)
        with pytest.raises(ValidationError):
            ChatRequest(npc_id="npc1", message="hi", pressure=101)

    def test_rapport_out_of_range(self):
        with pytest.raises(ValidationError):
            ChatRequest(npc_id="npc1", message="hi", rapport=-1)
        with pytest.raises(ValidationError):
            ChatRequest(npc_id="npc1", message="hi", rapport=101)

    def test_peak_pressure_out_of_range(self):
        with pytest.raises(ValidationError):
            ChatRequest(npc_id="npc1", message="hi", peak_pressure=101)

    def test_history_trimmed_to_100(self):
        turns = [ChatTurn(role="user", content=f"msg{i}") for i in range(150)]
        r = ChatRequest(npc_id="npc1", message="hi", history=turns)
        assert len(r.history) == 100
        # Should keep the most recent 100
        assert r.history[0].content == "msg50"
        assert r.history[-1].content == "msg149"

    def test_history_under_limit_unchanged(self):
        turns = [ChatTurn(role="user", content="a"), ChatTurn(role="assistant", content="b")]
        r = ChatRequest(npc_id="npc1", message="hi", history=turns)
        assert len(r.history) == 2


class TestChatResponse:
    def test_minimal(self):
        r = ChatResponse(reply="answer", npc_id="npc1", history=[])
        assert r.reply == "answer"
        assert r.evidence_ids == []
        assert r.discovery_ids == []
        assert r.expression == "neutral"
        assert r.pressure == 0
        assert r.rapport == 25
        assert r.pressure_band == "calm"
        assert r.rapport_band == "neutral"
        assert r.tactic_type == "open_ended"
        assert r.evidence_strength == "none"
        assert r.peak_pressure == 0
        assert r.degraded is False
        assert r.intuition_line is None
        assert r.blocked_discovery_ids == []

    def test_with_history(self):
        turns = [ChatTurn(role="user", content="q"), ChatTurn(role="assistant", content="a")]
        r = ChatResponse(reply="ok", npc_id="npc1", history=turns)
        assert len(r.history) == 2


class TestSpeakRequest:
    def test_valid(self):
        r = SpeakRequest(text="Hello world")
        assert r.text == "Hello world"
        assert r.voice == "alloy"
        assert r.instructions == ""

    def test_empty_text_rejected(self):
        with pytest.raises(ValidationError):
            SpeakRequest(text="")

    def test_text_too_long(self):
        with pytest.raises(ValidationError):
            SpeakRequest(text="x" * 4097)

    def test_text_at_max_length(self):
        r = SpeakRequest(text="x" * 4096)
        assert len(r.text) == 4096

    def test_text_min_length(self):
        r = SpeakRequest(text="a")
        assert r.text == "a"


class TestStringboardCardPosition:
    def test_defaults(self):
        p = StringboardCardPosition()
        assert p.x == 0
        assert p.y == 0

    def test_custom_values(self):
        p = StringboardCardPosition(x=1.5, y=-3.2)
        assert p.x == 1.5
        assert p.y == -3.2


class TestStringboardLink:
    def test_alias_construction(self):
        link = StringboardLink(**{"from": "a", "to": "b"})
        assert link.from_id == "a"
        assert link.to_id == "b"

    def test_field_name_construction(self):
        link = StringboardLink(from_id="a", to_id="b")
        assert link.from_id == "a"
        assert link.to_id == "b"

    def test_serialization_uses_alias(self):
        link = StringboardLink(from_id="a", to_id="b")
        data = link.model_dump(by_alias=True)
        assert data["from"] == "a"
        assert data["to"] == "b"


class TestStringboardState:
    def test_defaults(self):
        s = StringboardState()
        assert s.cardPositions == {}
        assert s.links == []

    def test_with_data(self):
        s = StringboardState(
            cardPositions={"c1": StringboardCardPosition(x=10, y=20)},
            links=[StringboardLink(from_id="a", to_id="b")],
        )
        assert s.cardPositions["c1"].x == 10
        assert len(s.links) == 1
