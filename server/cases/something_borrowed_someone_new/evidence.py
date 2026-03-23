"""Evidence and discovery catalogs for *Something Borrowed, Someone New*."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ...interrogation import GateCondition

# ---------------------------------------------------------------------------
# Evidence knowledge base (used by tactic classifier for strength scoring)
# ---------------------------------------------------------------------------

#: Evidence relevant to each NPC (for evidence-strength scoring).
NPC_RELEVANT_EVIDENCE: dict[str, list[str]] = {
    "devon-james": [
        "devon-missing-30min",
        "mystery-cologne",
        "devon-upstairs",
        "rafi-upstairs",
        "dating-app-connection",
        "devon-rafi-bar-chat",
        "devon-phone-alibi-false",
    ],
    "rafi-ansari": [
        "mystery-cologne",
        "devon-upstairs",
        "rafi-upstairs",
        "dating-app-connection",
        "devon-rafi-bar-chat",
        "val-marco-bedroom",
    ],
    "val-park": [
        "val-marco-bedroom",
        "val-inside-out-top",
        "val-marco-together",
        "val-has-boyfriend",
        "deleted-instagram",
        "garden-deck-hookup",
        "devon-rafi-bar-chat",
    ],
    "marco-delgado": [
        "val-marco-bedroom",
        "val-inside-out-top",
        "val-marco-together",
        "val-has-boyfriend",
        "deleted-instagram",
        "devon-upstairs",
    ],
    "sam-deluca": [
        "devon-upstairs",
        "rafi-upstairs",
        "devon-missing-30min",
        "val-marco-together",
    ],
    "tanya-rhodes": [
        "devon-phone-alibi-false",
        "rafi-upstairs",
        "val-marco-bedroom",
        "val-inside-out-top",
        "devon-rafi-bar-chat",
        "val-has-boyfriend",
    ],
    "nadia-okafor": [],
}

#: Evidence that constitutes a "smoking gun" for a specific NPC.
SMOKING_GUN_MAP: dict[str, list[str]] = {
    "devon-james": ["dating-app-connection"],
    "rafi-ansari": ["mystery-cologne"],
    "val-park": ["val-inside-out-top"],
    "marco-delgado": ["val-marco-bedroom"],
}

#: Full evidence catalog with descriptions (used by classify_player_turn
#: for evidence-strength scoring).
EVIDENCE_CATALOG_DESCRIPTIONS: dict[str, str] = {
    "devon-missing-30min": (
        "Devon disappeared for approximately 30 minutes during the bachelor party "
        "around 10:45-11:15 PM. Nobody knew where he was"
    ),
    "mystery-cologne": (
        "When Devon got home, he smelled like someone else's cologne -- expensive, "
        "musky, Tom Ford Oud Wood. Not his usual scent. This is Rafi Ansari's "
        "signature cologne"
    ),
    "devon-upstairs": (
        "Devon went upstairs at the lake house around 10:45 PM, claiming he had "
        "a headache"
    ),
    "rafi-upstairs": (
        "Rafi Ansari was also upstairs at the lake house around the same time as "
        "Devon (~10:45-11:15 PM)"
    ),
    "dating-app-connection": (
        "Devon and Rafi matched on a dating app (Hinge) three weeks before the "
        "wedding weekend and had been messaging each other"
    ),
    "devon-rafi-bar-chat": (
        "Devon and Rafi were seen talking intensely together by the bar area "
        "early in the evening at the bachelor party, standing unusually close"
    ),
    "devon-phone-alibi-false": (
        "Devon's headache story is false -- he was seen coming downstairs looking "
        "flushed and sweaty, not like someone who was resting"
    ),
    "val-marco-bedroom": (
        "Val Park and Marco Delgado were seen going into or coming out of a guest "
        "bedroom together at the lake house around 12:30 AM"
    ),
    "val-inside-out-top": (
        "Val's top was inside-out when she came out of the bedroom, physical "
        "evidence that something happened"
    ),
    "val-marco-together": (
        "Val and Marco were getting very cozy and physically close throughout the "
        "party after the bachelorette girls arrived"
    ),
    "val-has-boyfriend": (
        "Val has a boyfriend named Blake who was not at either party"
    ),
    "deleted-instagram": (
        "Val posted then immediately deleted an Instagram story from the lake "
        "house at approximately 1 AM"
    ),
    "garden-deck-hookup": (
        "Evidence that Val went to the lake house from the bachelorette and "
        "hooked up with someone there late at night"
    ),
}

# ---------------------------------------------------------------------------
# Discovery catalog -- used for discovery-level detection
# ---------------------------------------------------------------------------
# Each entry maps a discovery ID to the NPC that reveals it, the parent
# evidence category, and a specific description of what the NPC must
# EXPLICITLY reveal for this discovery to fire.

DISCOVERY_CATALOG: dict[str, dict[str, str]] = {
    # Sam DeLuca (easy, cooperative)
    "sam-saw-devon-upstairs": {
        "npc_id": "sam-deluca",
        "evidence_id": "devon-upstairs",
        "description": (
            "Sam saw Devon go upstairs around 10:45 PM saying he had a headache"
        ),
    },
    "sam-saw-rafi-upstairs": {
        "npc_id": "sam-deluca",
        "evidence_id": "rafi-upstairs",
        "description": (
            "Sam noticed Rafi heading upstairs around the same time as Devon, "
            "maybe a minute or two after"
        ),
    },
    "sam-devon-sweaty": {
        "npc_id": "sam-deluca",
        "evidence_id": "devon-missing-30min",
        "description": (
            "Sam saw Devon come back downstairs around 11:15 PM looking sweaty "
            "and flushed"
        ),
    },
    "sam-saw-val-marco": {
        "npc_id": "sam-deluca",
        "evidence_id": "val-marco-together",
        "description": (
            "Sam saw Val and Marco getting cozy after the bachelorette girls arrived"
        ),
    },
    # Devon James (hardest to crack)
    "devon-admits-upstairs": {
        "npc_id": "devon-james",
        "evidence_id": "devon-upstairs",
        "description": (
            "Devon admits he went upstairs at the lake house, not just 'resting "
            "in the living room'"
        ),
    },
    "devon-admits-rafi": {
        "npc_id": "devon-james",
        "evidence_id": "dating-app-connection",
        "description": (
            "Devon admits he and Rafi knew each other from a dating app before "
            "the party"
        ),
    },
    "devon-full-confession": {
        "npc_id": "devon-james",
        "evidence_id": "dating-app-connection",
        "description": (
            "Devon confesses to hooking up with Rafi upstairs at the lake house"
        ),
    },
    "devon-saw-val-disheveled": {
        "npc_id": "devon-james",
        "evidence_id": "val-inside-out-top",
        "description": (
            "Devon saw Val leaving a bedroom with her top inside-out"
        ),
    },
    # Rafi Ansari (cracks via empathy)
    "rafi-dating-app": {
        "npc_id": "rafi-ansari",
        "evidence_id": "dating-app-connection",
        "description": (
            "Rafi reveals he and Devon matched on a dating app (Hinge) weeks "
            "before the wedding"
        ),
    },
    "rafi-admits-hookup": {
        "npc_id": "rafi-ansari",
        "evidence_id": "dating-app-connection",
        "description": (
            "Rafi admits to hooking up with Devon upstairs at the lake house"
        ),
    },
    "rafi-saw-val-marco": {
        "npc_id": "rafi-ansari",
        "evidence_id": "val-marco-bedroom",
        "description": (
            "Rafi saw Marco and Val making out in the kitchen around midnight"
        ),
    },
    # Val Park (proud, deflects)
    "val-admits-lake-house": {
        "npc_id": "val-park",
        "evidence_id": "garden-deck-hookup",
        "description": (
            "Val admits she went to the lake house from the bachelorette party"
        ),
    },
    "val-admits-hookup": {
        "npc_id": "val-park",
        "evidence_id": "garden-deck-hookup",
        "description": (
            "Val confesses she and Marco hooked up at the lake house"
        ),
    },
    "val-has-bf-blake": {
        "npc_id": "val-park",
        "evidence_id": "val-has-boyfriend",
        "description": (
            "Val reveals she has a boyfriend named Blake who was not at either party"
        ),
    },
    "val-saw-devon-rafi-chatty": {
        "npc_id": "val-park",
        "evidence_id": "devon-rafi-bar-chat",
        "description": (
            "Val saw Devon and Rafi talking intensely and standing close by the "
            "bar early in the evening"
        ),
    },
    "val-deleted-story": {
        "npc_id": "val-park",
        "evidence_id": "deleted-instagram",
        "description": (
            "Val admits she posted and deleted an Instagram story from the lake house"
        ),
    },
    # Marco Delgado (weakest link, cracks fast)
    "marco-admits-hookup": {
        "npc_id": "marco-delgado",
        "evidence_id": "val-marco-bedroom",
        "description": (
            "Marco confesses to hooking up with Val in a guest bedroom at the "
            "lake house"
        ),
    },
    "marco-val-has-bf": {
        "npc_id": "marco-delgado",
        "evidence_id": "val-has-boyfriend",
        "description": (
            "Marco admits he knew Val has a boyfriend named Blake"
        ),
    },
    "marco-saw-devon-rafi-stairs": {
        "npc_id": "marco-delgado",
        "evidence_id": "devon-upstairs",
        "description": (
            "Marco saw Devon and Rafi going upstairs together around 10:50 PM"
        ),
    },
    "marco-deleted-insta": {
        "npc_id": "marco-delgado",
        "evidence_id": "deleted-instagram",
        "description": (
            "Marco saw Val post and delete an Instagram story at around 1 AM"
        ),
    },
    # Tanya Rhodes (gatekeeps, needs justification)
    "tanya-saw-devon-flushed": {
        "npc_id": "tanya-rhodes",
        "evidence_id": "devon-phone-alibi-false",
        "description": (
            "Tanya saw Devon coming downstairs looking flushed around 11:15 PM"
        ),
    },
    "tanya-saw-rafi-quiet": {
        "npc_id": "tanya-rhodes",
        "evidence_id": "rafi-upstairs",
        "description": (
            "Tanya noticed Rafi acting 'weird and quiet' when she arrived at "
            "the lake house"
        ),
    },
    "tanya-saw-val-marco-bedroom": {
        "npc_id": "tanya-rhodes",
        "evidence_id": "val-marco-bedroom",
        "description": (
            "Tanya saw Val and Marco disappear into a guest bedroom together "
            "around 12:30 AM"
        ),
    },
    "tanya-val-top": {
        "npc_id": "tanya-rhodes",
        "evidence_id": "val-inside-out-top",
        "description": (
            "Tanya noticed Val's top was inside-out when she came out of the "
            "bedroom"
        ),
    },
    "tanya-devon-texting": {
        "npc_id": "tanya-rhodes",
        "evidence_id": "devon-rafi-bar-chat",
        "description": (
            "Tanya heard Devon was texting intensely all evening from the "
            "bachelorette-bachelor party text chain"
        ),
    },
    "tanya-val-bf": {
        "npc_id": "tanya-rhodes",
        "evidence_id": "val-has-boyfriend",
        "description": (
            "Tanya confirms Val has a boyfriend named Blake"
        ),
    },
}

# ---------------------------------------------------------------------------
# Discovery gates -- mechanical conditions that must be met before a discovery
# is registered, even if the LLM reveals the information.  Each gate is a list
# of condition dicts (OR logic -- any single condition passing = gate open).
# Within each condition dict, ALL requirements must be met (AND).
# ---------------------------------------------------------------------------

DISCOVERY_GATES: dict[str, list[GateCondition]] = {
    # Devon -- hardest to crack (proud_executive)
    "devon-admits-upstairs": [
        {"requires_evidence": ["devon-upstairs"], "min_pressure": 30},
        {"requires_discovery": ["sam-saw-devon-upstairs"], "min_pressure": 20},
    ],
    "devon-admits-rafi": [
        {
            "requires_discovery": ["devon-admits-upstairs"],
            "requires_evidence": ["dating-app-connection"],
            "min_pressure": 50,
        },
        {"requires_discovery": ["rafi-admits-hookup"]},
    ],
    "devon-full-confession": [
        {
            "requires_discovery": ["devon-admits-upstairs", "devon-admits-rafi"],
            "min_pressure": 60,
        },
        {"requires_discovery": ["rafi-admits-hookup"], "min_pressure": 30},
    ],
    # Rafi -- cracks via empathy (anxious_insider)
    "rafi-dating-app": [
        {"min_rapport": 70},
        {"min_pressure": 40},
        {"requires_evidence": ["devon-rafi-bar-chat"]},
    ],
    "rafi-admits-hookup": [
        {"requires_discovery": ["rafi-dating-app"], "min_rapport": 85},
        {"requires_discovery": ["rafi-dating-app"], "min_pressure": 30},
        {"requires_discovery": ["devon-admits-rafi"]},
    ],
    # Marco -- weakest link (anxious_insider)
    "marco-admits-hookup": [
        {"min_pressure": 15},
        {"min_rapport": 40},
    ],
    "marco-saw-devon-rafi-stairs": [
        {"min_pressure": 20},
        {"min_rapport": 50},
    ],
    # Val -- proud deflector (proud_executive)
    "val-admits-hookup": [
        {"requires_evidence": ["val-marco-together"], "min_pressure": 50},
        {"requires_discovery": ["marco-admits-hookup"]},
    ],
    "val-deleted-story": [
        {"min_pressure": 40},
        {"requires_discovery": ["marco-deleted-insta"]},
    ],
    # Tanya -- gatekeeps (professional_fixer)
    "tanya-saw-val-marco-bedroom": [
        {"min_pressure": 25},
        {"min_rapport": 50},
    ],
    "tanya-saw-devon-flushed": [
        {"min_rapport": 40},
        {"requires_evidence": ["devon-upstairs"]},
    ],
}

# ---------------------------------------------------------------------------
# Locked secret descriptions -- injected into NPC prompts when a gate is locked
# so the LLM avoids revealing gated secrets prematurely.
# ---------------------------------------------------------------------------

LOCKED_SECRET_DESCRIPTIONS: dict[str, str] = {
    "devon-admits-upstairs": (
        "Do NOT admit that you went upstairs at the lake house. Stick to your "
        "headache story. If the player says you went upstairs, deflect: 'Yeah, I "
        "went to lie down. What about it?' Do NOT acknowledge that anyone else was "
        "upstairs with you. The player has not yet presented enough evidence to "
        "corner you."
    ),
    "devon-admits-rafi": (
        "Do NOT admit to knowing Rafi from a dating app. Do NOT admit to any "
        "romantic or sexual connection with Rafi. If asked about Rafi, say he's "
        "just Tyler's friend, you barely talked to him. You have NOT been "
        "confronted with proof of the dating app connection yet."
    ),
    "devon-full-confession": (
        "Do NOT confess to hooking up with Rafi. Do NOT describe what happened "
        "upstairs. Even if you've admitted going upstairs or knowing Rafi, do NOT "
        "admit the hookup itself until the player has assembled enough evidence "
        "and applied real pressure. This is the hardest secret to crack."
    ),
    "rafi-dating-app": (
        "Do NOT reveal that you and Devon matched on a dating app. If asked about "
        "Devon, say you met him at the party -- he's someone's boyfriend, that's "
        "all you know. You are protecting Devon's privacy and your own "
        "involvement. The player has not earned your trust yet."
    ),
    "rafi-admits-hookup": (
        "Do NOT admit to hooking up with Devon. Even if you've acknowledged the "
        "dating app connection, do NOT describe what happened upstairs. You are "
        "protecting Devon. The player needs to demonstrate real empathy or present "
        "overwhelming evidence before you'll open up about this."
    ),
    "marco-admits-hookup": (
        "Do NOT admit to hooking up with Val. If asked about Val, say you talked "
        "on the deck, she's cool, nothing happened. You are trying to play it "
        "cool but you are a terrible liar -- stumble over your words, contradict "
        "yourself slightly, but do NOT outright confess yet."
    ),
    "marco-saw-devon-rafi-stairs": (
        "Do NOT volunteer that you saw Devon and Rafi go upstairs together. This "
        "is something you noticed but it's not your business. Only bring it up if "
        "the player specifically asks about Devon's movements or what you saw "
        "around 10:45-11 PM AND applies some pressure or has built rapport."
    ),
    "val-admits-hookup": (
        "Do NOT admit to hooking up with Marco. If asked, you talked to him on "
        "the deck, that's it. You are confident and dismissive -- 'Nothing "
        "happened, why is everyone so obsessed with this?' The player has not "
        "yet presented enough evidence to break through your deflection."
    ),
    "val-deleted-story": (
        "Do NOT mention the deleted Instagram story. If confronted about posting "
        "something, deny it or brush it off: 'I post stories all the time, so "
        "what?' Do NOT acknowledge deleting it until the player has enough "
        "pressure or independent corroboration."
    ),
    "tanya-saw-val-marco-bedroom": (
        "Do NOT volunteer that you saw Val and Marco go into a bedroom. You are "
        "gatekeeping this information to avoid wedding drama. If the player asks "
        "about Val and Marco, be vague: 'They were hanging out, I wasn't keeping "
        "tabs.' You need a reason to share -- protecting Nadia, or enough pressure."
    ),
    "tanya-saw-devon-flushed": (
        "Do NOT volunteer that Devon looked flushed when he came downstairs. You "
        "are withholding details about the bachelor party because you don't want "
        "to start gossip. If asked about Devon specifically, be vague: 'I got "
        "there late, I didn't really notice.' Share only if the player builds "
        "trust or presents context about Devon being upstairs."
    ),
}
