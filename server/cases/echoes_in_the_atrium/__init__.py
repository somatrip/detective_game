"""Echoes in the Atrium — case data assembly.

Imports all submodules and builds the :class:`~server.cases.CaseData` instance
that the engine loads at startup.
"""

from __future__ import annotations

from ..import CaseData
from .archetypes import NPC_ARCHETYPE_MAP
from .evidence import (
    DISCOVERY_CATALOG,
    DISCOVERY_GATES,
    EVIDENCE_CATALOG_DESCRIPTIONS,
    NPC_RELEVANT_EVIDENCE,
    SMOKING_GUN_MAP,
)
from .npc_profiles import NPC_PROFILES
from .world_context import WORLD_CONTEXT_PROMPT

# ---------------------------------------------------------------------------
# Detective intuition — case-specific inner monologue prompt
# ---------------------------------------------------------------------------

INTUITION_PROMPT = (
    "You are the inner voice of a hard-boiled detective working a murder case "
    "at the Lyric Atrium Hotel, a refurbished 1920s art deco landmark. "
    "Write ONE brief sentence (max 15 words). "
    "No quotation marks. No game mechanics. Just a raw thought.\n\n"

    "ATMOSPHERIC MODE (when no moment_type is provided):\n"
    "Write scene observations, character impressions, or detective self-reflection. "
    "Examples of good atmospheric lines:\n"
    "- The chandelier threw crooked shadows across the lobby tile.\n"
    "- Something about the way she held her coffee cup.\n"
    "- Another long night in a building full of locked doors.\n"
    "- The rain hadn't let up. Neither had the lies.\n"
    "- Art deco angels watched from the ceiling. Lousy witnesses.\n"
    "Do NOT comment on what just happened in the conversation. "
    "Do NOT evaluate whether a question worked or failed. "
    "Just atmosphere.\n\n"

    "MAJOR MOMENT MODE (when moment_type IS provided):\n"
    "- dead_end: The detective senses there's nothing left to learn from this "
    "person. Suggest moving on, in-world. Example: Nothing left to shake "
    "loose here. Time to knock on another door.\n"
    "- breakthrough: The detective feels a thread coming loose. Something just "
    "cracked open. Example: There it is. The first real thread in this knot.\n"
    "- smoking_gun: The detective knows this evidence changes everything. "
    "Example: That one landed. No walking that back.\n"
    "Stay noir. Stay in-world. No game terminology."
)

case_data = CaseData(
    case_id="echoes_in_the_atrium",
    title="Echoes in the Atrium",
    world_context_prompt=WORLD_CONTEXT_PROMPT,
    npc_profiles=NPC_PROFILES,
    npc_archetype_map=NPC_ARCHETYPE_MAP,
    npc_relevant_evidence=NPC_RELEVANT_EVIDENCE,
    smoking_gun_map=SMOKING_GUN_MAP,
    evidence_catalog=EVIDENCE_CATALOG_DESCRIPTIONS,
    discovery_catalog=DISCOVERY_CATALOG,
    discovery_gates=DISCOVERY_GATES,
    intuition_prompt=INTUITION_PROMPT,
)
