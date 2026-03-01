"""Secondary LLM classifier for turn classification and evidence detection.

Uses a cheaper model (same provider) to classify player tactics, evidence
strength, detect revealed discoveries, and infer NPC expression — replacing
the regex-based tag parsing system.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List

from ..config import settings

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Valid classification values (engine constants — not case-specific)
# ---------------------------------------------------------------------------

VALID_TACTIC_TYPES = {
    "open_ended", "specific_factual", "empathy", "present_evidence",
    "point_out_contradiction", "direct_accusation", "repeat_pressure",
    "topic_change",
}

VALID_EVIDENCE_STRENGTHS = {"none", "weak", "strong", "smoking_gun"}

VALID_EXPRESSIONS = {
    "neutral", "guarded", "distressed", "angry", "contemplative", "smirking",
}

_LANGUAGE_NAMES: Dict[str, str] = {
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
   neutral, guarded, distressed, angry, contemplative, smirking

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

Discoveries the player has ALREADY collected (do NOT re-tag these): {already_collected}

Respond with ONLY a JSON object: {{"discovery_ids": [...], "expression": "...", "discovery_summaries": {{"<id>": "<summary>", ...}}}}"""

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
    "matthias-holt": "Matthias Holt (Security Director)",
    "mira-kline": "Dr. Mira Kline (Ethicist Consultant)",
    "eddie-voss": "Eddie Voss (Junior Engineer)",
    "priya-shah": "Priya Shah (Investigative Journalist)",
    "matthew-vale": "Matthew Vale (Stage Manager)",
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
        max_tokens=512,
    )
    text = response.choices[0].message.content or "{}"
    return json.loads(text)


async def _call_anthropic_json(system_prompt: str, user_prompt: str) -> Dict[str, Any]:
    """Call Anthropic classifier model and parse JSON response."""
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key or "")
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
    from ..cases import get_active_case
    case = get_active_case()
    relevant = case.npc_relevant_evidence.get(npc_id, [])
    smoking = case.smoking_gun_map.get(npc_id, [])
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
    language: str = "en",
) -> Dict[str, Any]:
    """Detect discoveries revealed and expression in the NPC's response.

    Uses discovery-level detection: checks against individual discovery
    descriptions for the current NPC, enabling progressive revelation.

    Parameters
    ----------
    already_collected : list[str]
        Discovery IDs (not evidence IDs) the player has already collected.
    language : str
        Language code for generating discovery summaries ('en' or 'sr').

    Returns ``{"discovery_ids": [...], "evidence_ids": [...],
               "expression": "...", "discovery_summaries": {...}}``.
    """
    from ..cases import get_active_case
    case = get_active_case()
    npc_name = _NPC_NAMES.get(npc_id, npc_id)
    language_name = _LANGUAGE_NAMES.get(language, "English")

    # Filter discovery catalog to current NPC
    npc_discoveries = {
        did: info for did, info in case.discovery_catalog.items()
        if info["npc_id"] == npc_id
    }

    if not npc_discoveries:
        return {
            "discovery_ids": [],
            "evidence_ids": [],
            "expression": "neutral",
            "discovery_summaries": {},
        }

    catalog_lines = []
    for did, info in npc_discoveries.items():
        catalog_lines.append(f"- {did}: {info['description']}")
    catalog_text = "\n".join(catalog_lines)

    system_prompt = _DETECT_EVIDENCE_SYSTEM.format(
        npc_id=npc_id,
        npc_name=npc_name,
        discovery_catalog=catalog_text,
        already_collected=", ".join(already_collected) if already_collected else "(none)",
        language_name=language_name,
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

    # Validate discovery IDs
    raw_ids = result.get("discovery_ids", [])
    if not isinstance(raw_ids, list):
        raw_ids = []
    valid_ids = [
        did for did in raw_ids
        if isinstance(did, str) and did in npc_discoveries
        and did not in already_collected
    ]

    # Derive evidence IDs from discoveries
    evidence_ids = list({
        case.discovery_catalog[did]["evidence_id"]
        for did in valid_ids
    })

    # Validate discovery summaries
    raw_summaries = result.get("discovery_summaries", {})
    if not isinstance(raw_summaries, dict):
        raw_summaries = {}
    discovery_summaries = {}
    for did in valid_ids:
        s = raw_summaries.get(did, "")
        if isinstance(s, str) and 5 < len(s) < 300:
            discovery_summaries[did] = s

    # Validate expression
    expression = result.get("expression", "neutral")
    if expression not in VALID_EXPRESSIONS:
        expression = "neutral"

    return {
        "discovery_ids": valid_ids,
        "evidence_ids": evidence_ids,
        "expression": expression,
        "discovery_summaries": discovery_summaries,
    }


__all__ = ["classify_player_turn", "detect_evidence"]
