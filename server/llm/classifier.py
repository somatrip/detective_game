"""Secondary LLM classifier for turn classification and evidence detection.

Uses a cheaper model (same provider) to classify player tactics, evidence
strength, detect revealed evidence, and infer NPC expression — replacing
the regex-based tag parsing system.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List

from ..config import settings

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Evidence knowledge base
# ---------------------------------------------------------------------------

#: Evidence relevant to each NPC (for evidence-strength scoring).
NPC_RELEVANT_EVIDENCE: Dict[str, List[str]] = {
    "noah-sterling": [
        "oil-cufflinks", "financial-misconduct", "encrypted-schedule",
        "key-trail", "surveillance", "burned-notebook",
    ],
    "amelia-reyes": ["key-trail", "lockpick-marks", "power-outage", "hotel-sale"],
    "eddie-voss": ["key-trail"],
    "celeste-ward": ["secret-affair", "audio-recording", "surveillance"],
    "gideon-holt": ["data-sales", "blackmail", "burned-notebook", "surveillance"],
    "mira-kline": ["plagiarism", "encrypted-schedule", "nda-ip"],
    "priya-shah": ["surveillance", "blackmail", "plagiarism"],
    "marcus-vale": ["stage-timing"],
    "lila-chen": [],
}

#: Evidence that constitutes a "smoking gun" for a specific NPC.
SMOKING_GUN_MAP: Dict[str, List[str]] = {
    "noah-sterling": ["oil-cufflinks"],
    "gideon-holt": ["data-sales"],
    "amelia-reyes": ["lockpick-marks"],
    "celeste-ward": ["audio-recording"],
}

#: Full evidence catalog with descriptions (used in prompts).
EVIDENCE_CATALOG_DESCRIPTIONS: Dict[str, str] = {
    "oil-trace": "Antique oil traces found at the crime scene or on the telescope mount",
    "burned-notebook": "A burned notebook fragment or threat list found in the incinerator",
    "keycard-logs": "Specific rooftop keycard access logs showing only four entries after 10 PM",
    "key-trail": "The maintenance key was lent from Amelia to Eddie, or from Eddie to Noah",
    "power-outage": "Someone DELIBERATELY pulled the breaker to cause the outage (not just mentioning lights went out)",
    "encrypted-schedule": "Mercer's encrypted schedule or a surprise board vote to oust Noah",
    "financial-misconduct": "Noah's embezzlement or gambling debts",
    "oil-cufflinks": "Antique oil was found on Noah Sterling's cufflinks",
    "surveillance": "Specific CCTV footage gaps or someone saw Noah near the freight elevator",
    "secret-affair": "The secret romantic relationship between Mercer and Celeste",
    "audio-recording": "Celeste possesses audio recordings of Mercer admitting illegal surveillance",
    "nda-ip": "An NDA draft implicating intellectual property theft",
    "blackmail": "Mercer was blackmailing someone using the burned notebook threat list",
    "data-sales": "Illegal selling of anonymized guest data from hotel systems",
    "plagiarism": "Mercer plagiarized Dr. Kline's research",
    "lockpick-marks": "Lockpick marks on the maintenance room door",
    "hotel-sale": "Mercer planned to sell the Lyric Atrium Hotel to a developer",
    "stage-timing": "Lighting console logs or cue sheet gaps showing someone's absence",
}

VALID_TACTIC_TYPES = {
    "open_ended", "specific_factual", "empathy", "present_evidence",
    "point_out_contradiction", "direct_accusation", "repeat_pressure",
    "topic_change",
}

VALID_EVIDENCE_STRENGTHS = {"none", "weak", "strong", "smoking_gun"}

VALID_EXPRESSIONS = {
    "neutral", "guarded", "distressed", "angry", "contemplative", "smirking",
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


_DETECT_EVIDENCE_SYSTEM = """You are analyzing an NPC's dialogue response in a detective mystery game to detect two things:

1. **evidence_ids** — List of evidence IDs for NEW secrets the NPC revealed in this response.

   CRITICAL RULES — be VERY conservative:
   - The NPC must have EXPLICITLY revealed the specific secret described in the catalog entry.
   - Merely MENTIONING a related topic is NOT enough. For example, mentioning "the power went out"
     is NOT the same as revealing "someone deliberately pulled the breaker."
   - Vague references, general knowledge, or surface-level mentions do NOT count.
   - The NPC must provide NEW SPECIFIC INFORMATION that the player did not already know.
   - Do NOT include evidence the player already collected (listed below).
   - Do NOT tag common knowledge (everyone knows about the gala, the blackout, Mercer's death).
   - When in doubt, do NOT tag it. The list should be EMPTY for most responses.
   - A typical conversation has 10+ exchanges before any evidence is revealed.

2. **expression** — The NPC's emotional state in this response. Exactly one of:
   neutral, guarded, distressed, angry, contemplative, smirking

The NPC speaking is: {npc_id} ({npc_name})

Evidence catalog (tag ONLY when the SPECIFIC secret described is explicitly revealed — not just alluded to):
{evidence_catalog}

Evidence the player has ALREADY collected (do NOT re-tag these): {already_collected}

Respond with ONLY a JSON object: {{"evidence_ids": [...], "expression": "..."}}"""

_DETECT_EVIDENCE_USER = """Player's message: \"{player_message}\"

NPC response: \"{response}\""""

# ---------------------------------------------------------------------------
# NPC display names for prompt context
# ---------------------------------------------------------------------------

_NPC_NAMES: Dict[str, str] = {
    "lila-chen": "Detective Lila Chen",
    "amelia-reyes": "Amelia Reyes (Head Engineer)",
    "noah-sterling": "Noah Sterling (Co-Founder, Panopticon)",
    "celeste-ward": "Celeste Ward (Jazz Vocalist)",
    "gideon-holt": "Gideon Holt (Security Director)",
    "mira-kline": "Dr. Mira Kline (Ethicist Consultant)",
    "eddie-voss": "Eddie Voss (Bartender)",
    "priya-shah": "Priya Shah (Investigative Journalist)",
    "marcus-vale": "Marcus Vale (Stage Manager)",
}

# ---------------------------------------------------------------------------
# Provider-specific LLM calls
# ---------------------------------------------------------------------------

async def _call_openai_json(system_prompt: str, user_prompt: str) -> Dict[str, Any]:
    """Call OpenAI classifier model and parse JSON response."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key or "")
    response = await client.chat.completions.create(
        model=settings.openai_classifier_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=256,
    )
    text = response.choices[0].message.content or "{}"
    return json.loads(text)


async def _call_anthropic_json(system_prompt: str, user_prompt: str) -> Dict[str, Any]:
    """Call Anthropic classifier model and parse JSON response."""
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key or "")
    response = await client.messages.create(
        model=settings.anthropic_classifier_model,
        max_tokens=256,
        system=system_prompt + "\n\nRespond with ONLY valid JSON, no other text.",
        messages=[{"role": "user", "content": user_prompt}],
    )
    text = response.content[0].text.strip()
    # Extract JSON from potential markdown fencing
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(
            l for l in lines if not l.startswith("```")
        ).strip()
    return json.loads(text)


async def _call_classifier_json(system_prompt: str, user_prompt: str) -> Dict[str, Any]:
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
    player_evidence_ids: List[str],
    conversation_history: List[Dict[str, str]],
) -> Dict[str, str]:
    """Classify the player's interrogation tactic and evidence strength.

    Returns ``{"tactic_type": "...", "evidence_strength": "..."}``.
    """
    relevant = NPC_RELEVANT_EVIDENCE.get(npc_id, [])
    smoking = SMOKING_GUN_MAP.get(npc_id, [])
    npc_name = _NPC_NAMES.get(npc_id, npc_id)

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

    try:
        result = await _call_classifier_json(system_prompt, user_prompt)
    except Exception:
        log.exception("Classifier failed for classify_player_turn")
        result = {}

    # Validate and default
    tactic = result.get("tactic_type", "open_ended")
    if tactic not in VALID_TACTIC_TYPES:
        tactic = "open_ended"

    strength = result.get("evidence_strength", "none")
    if strength not in VALID_EVIDENCE_STRENGTHS:
        strength = "none"

    return {"tactic_type": tactic, "evidence_strength": strength}


async def detect_evidence(
    npc_response: str,
    npc_id: str,
    already_collected: List[str],
    player_message: str = "",
) -> Dict[str, Any]:
    """Detect evidence revealed and expression in the NPC's response.

    Returns ``{"evidence_ids": [...], "expression": "..."}``.
    """
    npc_name = _NPC_NAMES.get(npc_id, npc_id)

    catalog_lines = []
    for eid, desc in EVIDENCE_CATALOG_DESCRIPTIONS.items():
        catalog_lines.append(f"- {eid}: {desc}")
    catalog_text = "\n".join(catalog_lines)

    system_prompt = _DETECT_EVIDENCE_SYSTEM.format(
        npc_id=npc_id,
        npc_name=npc_name,
        evidence_catalog=catalog_text,
        already_collected=", ".join(already_collected) if already_collected else "(none)",
    )

    user_prompt = _DETECT_EVIDENCE_USER.format(
        player_message=player_message,
        response=npc_response,
    )

    try:
        result = await _call_classifier_json(system_prompt, user_prompt)
    except Exception:
        log.exception("Classifier failed for detect_evidence")
        result = {}

    # Validate evidence IDs
    raw_ids = result.get("evidence_ids", [])
    if not isinstance(raw_ids, list):
        raw_ids = []
    valid_ids = [
        eid for eid in raw_ids
        if isinstance(eid, str) and eid in EVIDENCE_CATALOG_DESCRIPTIONS
        and eid not in already_collected
    ]

    # Validate expression
    expression = result.get("expression", "neutral")
    if expression not in VALID_EXPRESSIONS:
        expression = "neutral"

    return {"evidence_ids": valid_ids, "expression": expression}


__all__ = ["classify_player_turn", "detect_evidence"]
