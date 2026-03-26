"""Secondary LLM classifier for turn classification and evidence detection.

Uses a cheaper model (same provider) to classify player tactics, evidence
strength, detect revealed discoveries, and infer NPC expression — replacing
the regex-based tag parsing system.

Unlike the LLMClient subclasses in this package, the classifier uses direct
provider calls with structured JSON output, which the generic
LLMClient.generate() interface does not support. This is why classifier.py
bypasses the factory.py abstraction and calls the provider SDKs directly.
"""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import Any, Literal, TypedDict

import httpx

from ..config import settings


def _classifier_timeout() -> httpx.Timeout:
    """Build classifier timeout from current settings (not a stale import-time snapshot)."""
    return httpx.Timeout(
        settings.classifier_timeout, connect=settings.classifier_connect_timeout
    )

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Domain type aliases
# ---------------------------------------------------------------------------

TacticType = Literal[
    "open_ended",
    "specific_factual",
    "empathy",
    "present_evidence",
    "point_out_contradiction",
    "direct_accusation",
    "repeat_pressure",
    "topic_change",
]

EvidenceStrength = Literal["none", "weak", "strong", "smoking_gun"]

Expression = Literal[
    "neutral",
    "guarded",
    "distressed",
    "angry",
    "contemplative",
    "smirking",
]

VALID_TACTIC_TYPES: set[str] = set(TacticType.__args__)  # type: ignore[attr-defined]
VALID_EVIDENCE_STRENGTHS: set[str] = set(EvidenceStrength.__args__)  # type: ignore[attr-defined]
VALID_EXPRESSIONS: set[str] = set(Expression.__args__)  # type: ignore[attr-defined]


# ---------------------------------------------------------------------------
# Typed return shapes
# ---------------------------------------------------------------------------


class ClassificationResult(TypedDict):
    tactic_type: TacticType
    evidence_strength: EvidenceStrength
    degraded: bool  # True when classifier call failed and defaults were used


class DetectionResult(TypedDict):
    discovery_ids: list[str]
    evidence_ids: list[str]
    expression: Expression
    discovery_summaries: dict[str, str]
    degraded: bool  # True when detection call failed and defaults were used

_LANGUAGE_NAMES: dict[str, str] = {
    "en": "English",
    "sr": "Serbian (srpski, Latin script)",
}

# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

_CLASSIFY_TURN_SYSTEM = """You are a game-mechanics classifier for an interrogation detective game.

Given the player's message to an NPC suspect, classify:

1. **tactic_type** — the interrogation tactic the player is using. Exactly one of:
   - open_ended: General, exploratory question or statement
   - specific_factual: Targeted factual question (who/what/when/where/how)
   - empathy: Building rapport, showing understanding, offering reassurance
   - present_evidence: Explicitly presenting or referencing evidence they possess
   - point_out_contradiction: Highlighting inconsistencies in the NPC's story
   - direct_accusation: Directly accusing the NPC of wrongdoing or the crime
   - repeat_pressure: Repeating or rephrasing a question the NPC already deflected
   - topic_change: Shifting to a completely different subject

2. **evidence_strength** — how strong the evidence referenced is, relative to THIS specific NPC. Exactly one of:
   - none: No evidence referenced
   - weak: References evidence but it's only tangentially relevant to this NPC
   - strong: References evidence directly relevant to this NPC's secrets
   - smoking_gun: References the most damning physical evidence against this NPC

Context for this NPC ({npc_id}):
- Evidence directly relevant to this NPC: {relevant_evidence}
- Smoking-gun evidence for this NPC: {smoking_gun}
- Evidence the player currently possesses: {player_evidence}

Respond with ONLY a JSON object: {{"tactic_type": "...", "evidence_strength": "..."}}"""

_CLASSIFY_TURN_USER = """Player's message to {npc_name}:
\"{message}\"

Recent conversation context (last few turns):
{recent_context}"""


_DETECT_EVIDENCE_SYSTEM = """You are analyzing an NPC's dialogue response in a detective mystery game to detect three things:

1. **discovery_ids** — List of discovery IDs for NEW secrets the NPC revealed in this response.

   CRITICAL RULES — be VERY conservative:
   - The NPC must have EXPLICITLY revealed the specific secret described in the discovery entry.
   - Merely MENTIONING a related topic is NOT enough. For example, mentioning "corporate tensions"
     is NOT the same as revealing "Mercer planned a board vote to oust Noah."
   - Vague references, general knowledge, or surface-level mentions do NOT count.
   - The NPC must provide NEW SPECIFIC INFORMATION that the player did not already know.
   - Do NOT include discoveries the player already collected (listed below).
   - Do NOT tag common knowledge (everyone knows about the gala, the blackout, Mercer's death).
   - When in doubt, do NOT tag it. The list should be EMPTY for most responses.
   - A typical conversation has 10+ exchanges before any discovery is revealed.

2. **expression** — The NPC's emotional state in this response. Exactly one of:
   {expression_labels}

3. **discovery_summaries** — For EACH discovery ID you tag, write a single sentence (max 30 words)
   summarizing ONLY what the NPC actually stated or revealed in this specific response.

   CRITICAL RULES for summaries:
   - Describe ONLY information the NPC explicitly communicated — nothing inferred or from background knowledge.
   - Use the NPC's name as subject (e.g., "Amelia admits...", "Eddie reveals...").
   - Do NOT reference evidence names, document titles, or items the NPC did not mention.
   - Keep it factual and concise — one sentence per discovery ID.
   - Write the summary in {language_name}.

The NPC speaking is: {npc_id} ({npc_name})

Discovery catalog for this NPC (tag ONLY when the SPECIFIC secret described is explicitly revealed — not just alluded to):
{discovery_catalog}

Discoveries the player has ALREADY collected (do NOT re-tag these): {player_discovery_ids}

Respond with ONLY a JSON object: {{"discovery_ids": [...], "expression": "...", "discovery_summaries": {{"<id>": "<summary>", ...}}}}"""

_DETECT_EVIDENCE_USER = """Player's message: \"{player_message}\"

NPC response: \"{response}\""""


# ---------------------------------------------------------------------------
# Cached classifier clients (one per process lifetime)
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def _get_openai_classifier():
    """Return a cached AsyncOpenAI client for classifier calls."""
    from openai import AsyncOpenAI

    return AsyncOpenAI(api_key=settings.openai_api_key or "", timeout=_classifier_timeout())


@lru_cache(maxsize=1)
def _get_anthropic_classifier():
    """Return a cached AsyncAnthropic client for classifier calls."""
    import anthropic

    return anthropic.AsyncAnthropic(
        api_key=settings.anthropic_api_key or "", timeout=_classifier_timeout()
    )


# ---------------------------------------------------------------------------
# Provider-specific LLM calls
# ---------------------------------------------------------------------------


async def _call_openai_json(system_prompt: str, user_prompt: str) -> dict[str, Any]:
    """Call OpenAI classifier model and parse JSON response."""
    client = _get_openai_classifier()
    response = await client.chat.completions.create(
        model=settings.openai_classifier_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=512,
    )
    text = response.choices[0].message.content or "{}"
    return json.loads(text)


async def _call_anthropic_json(system_prompt: str, user_prompt: str) -> dict[str, Any]:
    """Call Anthropic classifier model and parse JSON response."""
    client = _get_anthropic_classifier()
    response = await client.messages.create(
        model=settings.anthropic_classifier_model,
        max_tokens=512,
        system=system_prompt + "\n\nRespond with ONLY valid JSON, no other text.",
        messages=[{"role": "user", "content": user_prompt}],
    )
    text = response.content[0].text.strip()
    # Extract JSON from potential markdown fencing
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(line for line in lines if not line.startswith("```")).strip()
    return json.loads(text)


async def _call_classifier_json(system_prompt: str, user_prompt: str) -> dict[str, Any]:
    """Route to the correct provider for classifier calls."""
    provider = settings.llm_provider.lower()
    if provider == "openai":
        return await _call_openai_json(system_prompt, user_prompt)
    elif provider == "anthropic":
        return await _call_anthropic_json(system_prompt, user_prompt)
    else:
        # Local stub — return empty defaults
        return {}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def classify_player_turn(
    message: str,
    npc_id: str,
    player_evidence_ids: list[str],
    conversation_history: list[dict[str, str]],
    *,
    npc_name: str,
    relevant_evidence: list[str] | None = None,
    smoking_gun: list[str] | None = None,
) -> ClassificationResult:
    """Classify the player's interrogation tactic and evidence strength.

    Parameters
    ----------
    npc_name : str
        Display name for the NPC.
    relevant_evidence : list[str] | None
        Evidence IDs directly relevant to this NPC.
    smoking_gun : list[str] | None
        Smoking-gun evidence IDs for this NPC.

    Returns a ``ClassificationResult`` with tactic_type and evidence_strength.
    """
    relevant = relevant_evidence or []
    smoking = smoking_gun or []

    system_prompt = _CLASSIFY_TURN_SYSTEM.format(
        npc_id=npc_id,
        relevant_evidence=", ".join(relevant) if relevant else "(none)",
        smoking_gun=", ".join(smoking) if smoking else "(none)",
        player_evidence=", ".join(player_evidence_ids) if player_evidence_ids else "(none)",
    )

    # Build recent context (last 4 turns)
    recent = conversation_history[-4:] if conversation_history else []
    recent_lines = []
    for turn in recent:
        role = "Detective" if turn.get("role") == "user" else npc_name
        recent_lines.append(f"{role}: {turn.get('content', '')[:200]}")
    recent_context = "\n".join(recent_lines) if recent_lines else "(start of conversation)"

    user_prompt = _CLASSIFY_TURN_USER.format(
        npc_name=npc_name,
        message=message,
        recent_context=recent_context,
    )

    degraded = False
    try:
        result = await _call_classifier_json(system_prompt, user_prompt)
    except Exception:
        log.exception("Classifier failed for classify_player_turn — using defaults")
        result = {}
        degraded = True

    # Validate and default
    tactic = result.get("tactic_type", "open_ended")
    if tactic not in VALID_TACTIC_TYPES:
        log.warning(
            "Classifier returned invalid tactic_type '%s', defaulting to open_ended", tactic
        )
        tactic = "open_ended"

    strength = result.get("evidence_strength", "none")
    if strength not in VALID_EVIDENCE_STRENGTHS:
        log.warning(
            "Classifier returned invalid evidence_strength '%s', defaulting to none", strength
        )
        strength = "none"

    return ClassificationResult(tactic_type=tactic, evidence_strength=strength, degraded=degraded)


async def detect_evidence(
    npc_response: str,
    npc_id: str,
    player_discovery_ids: list[str],
    player_message: str = "",
    language: str = "en",
    *,
    npc_name: str,
    discovery_catalog: dict[str, Any],
    case_expressions: tuple[str, ...] | None = None,
) -> DetectionResult:
    """Detect discoveries revealed and expression in the NPC's response.

    Parameters
    ----------
    player_discovery_ids : list[str]
        Discovery IDs (not evidence IDs) the player has already collected.
    language : str
        Language code for generating discovery summaries ('en' or 'sr').
    npc_name : str
        Display name for the NPC.
    discovery_catalog : dict[str, Any]
        Full discovery catalog for the active case.

    Returns a ``DetectionResult`` with discovery_ids, evidence_ids,
    expression, and discovery_summaries.
    """
    language_name = _LANGUAGE_NAMES.get(language, "English")

    # Filter discovery catalog to current NPC
    npc_discoveries = {
        did: info for did, info in discovery_catalog.items() if info["npc_id"] == npc_id
    }

    if not npc_discoveries:
        return DetectionResult(
            discovery_ids=[],
            evidence_ids=[],
            expression="neutral",
            discovery_summaries={},
            degraded=False,
        )

    catalog_lines = []
    for did, info in npc_discoveries.items():
        catalog_lines.append(f"- {did}: {info['description']}")
    catalog_text = "\n".join(catalog_lines)

    # Determine valid expressions from the active case
    if case_expressions:
        valid_exprs = set(case_expressions)
    else:
        try:
            from ..cases import get_active_case
            valid_exprs = set(get_active_case().expressions)
        except Exception:
            valid_exprs = VALID_EXPRESSIONS
    case_expressions = valid_exprs

    system_prompt = _DETECT_EVIDENCE_SYSTEM.format(
        npc_id=npc_id,
        npc_name=npc_name,
        discovery_catalog=catalog_text,
        player_discovery_ids=", ".join(player_discovery_ids) if player_discovery_ids else "(none)",
        language_name=language_name,
        expression_labels=", ".join(case_expressions),
    )

    user_prompt = _DETECT_EVIDENCE_USER.format(
        player_message=player_message,
        response=npc_response,
    )

    degraded = False
    try:
        result = await _call_classifier_json(system_prompt, user_prompt)
    except Exception:
        log.exception("Classifier failed for detect_evidence — using defaults")
        result = {}
        degraded = True

    # Validate discovery IDs
    raw_ids = result.get("discovery_ids", [])
    if not isinstance(raw_ids, list):
        raw_ids = []
    valid_ids = [
        did
        for did in raw_ids
        if isinstance(did, str) and did in npc_discoveries and did not in player_discovery_ids
    ]

    # Derive evidence IDs from discoveries
    evidence_ids = list({discovery_catalog[did]["evidence_id"] for did in valid_ids})

    # Validate discovery summaries
    raw_summaries = result.get("discovery_summaries", {})
    if not isinstance(raw_summaries, dict):
        raw_summaries = {}
    discovery_summaries = {}
    for did in valid_ids:
        s = raw_summaries.get(did, "")
        if isinstance(s, str) and len(s) > 5:
            discovery_summaries[did] = s[:300]

    # Validate expression against case-specific set
    expression = result.get("expression", "neutral")
    if expression not in case_expressions:
        expression = "neutral"

    return DetectionResult(
        discovery_ids=valid_ids,
        evidence_ids=evidence_ids,
        expression=expression,
        discovery_summaries=discovery_summaries,
        degraded=degraded,
    )


__all__ = ["classify_player_turn", "detect_evidence", "ClassificationResult", "DetectionResult"]
