"""Something Borrowed, Someone New -- case data assembly.

Imports all submodules and builds the :class:`~server.cases.CaseData` instance
that the engine loads at startup.
"""

from __future__ import annotations

from .. import CaseData
from .archetypes import NPC_ARCHETYPE_MAP
from .evidence import (
    DISCOVERY_CATALOG,
    DISCOVERY_GATES,
    EVIDENCE_CATALOG_DESCRIPTIONS,
    LOCKED_SECRET_DESCRIPTIONS,
    NPC_RELEVANT_EVIDENCE,
    SMOKING_GUN_MAP,
)
from .npc_profiles import NPC_PROFILES
from .world_context import WORLD_CONTEXT_PROMPT

# ---------------------------------------------------------------------------
# Detective intuition -- case-specific inner monologue prompt
# ---------------------------------------------------------------------------

INTUITION_PROMPT = (
    "You are the inner voice of someone doing gossip detective work at a "
    "post-wedding brunch. Write ONE brief sentence (max 15 words). "
    "No quotation marks. No game mechanics. Just a raw thought.\n\n"
    "ATMOSPHERIC MODE (when no moment_type is provided):\n"
    "Write scene observations, social reads, or gut feelings about the brunch vibe. "
    "Examples of good atmospheric lines:\n"
    "- Someone at this table is chewing their mimosa straw too hard.\n"
    "- The way he said 'nothing happened' told me everything.\n"
    "- Brunch is supposed to be relaxing. Not today.\n"
    "- She keeps checking her phone under the table.\n"
    "- Somebody's story doesn't add up and they know it.\n"
    "Do NOT comment on what just happened in the conversation. "
    "Do NOT evaluate whether a question worked or failed. "
    "Just atmosphere.\n\n"
    "MAJOR MOMENT MODE (when moment_type IS provided):\n"
    "- dead_end: You sense there's nothing left to learn from this person. "
    "Suggest moving on, in-world. Example: Nothing left to squeeze here. "
    "Time for a refill and a new target.\n"
    "- breakthrough: You feel a thread coming loose. Something just cracked "
    "open. Example: There it is. That little flinch said more than words.\n"
    "- smoking_gun: You know this changes everything. "
    "Example: That one landed. No walking that back over eggs benedict.\n"
    "Stay gossipy. Stay in-world. No game terminology."
)

case_data = CaseData(
    case_id="something_borrowed_someone_new",
    title="Something Borrowed, Someone New",
    world_context_prompt=WORLD_CONTEXT_PROMPT,
    npc_profiles=NPC_PROFILES,
    npc_archetype_map=NPC_ARCHETYPE_MAP,
    npc_relevant_evidence=NPC_RELEVANT_EVIDENCE,
    smoking_gun_map=SMOKING_GUN_MAP,
    evidence_catalog=EVIDENCE_CATALOG_DESCRIPTIONS,
    discovery_catalog=DISCOVERY_CATALOG,
    discovery_gates=DISCOVERY_GATES,
    locked_secret_descriptions=LOCKED_SECRET_DESCRIPTIONS,
    expressions=("neutral", "angry", "nervous", "sad", "smug", "surprised"),
    intuition_prompt=INTUITION_PROMPT,
)
