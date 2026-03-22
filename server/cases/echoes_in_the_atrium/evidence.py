"""Evidence and discovery catalogs for *Echoes in the Atrium*."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ...interrogation import GateCondition

# ---------------------------------------------------------------------------
# Evidence knowledge base (used by tactic classifier for strength scoring)
# ---------------------------------------------------------------------------

#: Evidence relevant to each NPC (for evidence-strength scoring).
NPC_RELEVANT_EVIDENCE: dict[str, list[str]] = {
    "noah-sterling": [
        "financial-misconduct",
        "encrypted-schedule",
        "key-trail",
        "surveillance",
        "burned-notebook",
        "murder-confession",
    ],
    "amelia-reyes": ["key-trail", "lockpick-marks", "power-outage", "hotel-sale", "conspiracy"],
    "eddie-voss": ["key-trail"],
    "celeste-ward": ["secret-affair", "audio-recording", "surveillance"],
    "matthias-holt": [
        "data-sales",
        "blackmail",
        "burned-notebook",
        "surveillance",
        "financial-misconduct",
    ],
    "mira-kline": ["plagiarism", "encrypted-schedule", "nda-ip", "conspiracy"],
    "priya-shah": ["surveillance", "blackmail", "plagiarism", "encrypted-schedule"],
    "matthew-vale": ["stage-timing", "conspiracy"],
    "lila-chen": [],
}

#: Evidence that constitutes a "smoking gun" for a specific NPC.
SMOKING_GUN_MAP: dict[str, list[str]] = {
    "matthias-holt": ["data-sales"],
    "amelia-reyes": ["lockpick-marks"],
    "celeste-ward": ["audio-recording"],
    "mira-kline": ["conspiracy"],
}

#: Full evidence catalog with descriptions (used by classify_player_turn
#: for evidence-strength scoring).
EVIDENCE_CATALOG_DESCRIPTIONS: dict[str, str] = {
    "burned-notebook": "A burned notebook fragment or threat list found in the incinerator",
    "keycard-logs": "Rooftop keycard access logs showing only four entry events after 10 PM: Holt (10:01), Tanaka (10:43), Mercer (11:08), Holt (11:44)",
    "key-trail": "The maintenance-room key and engineering keycard (ENGR-0001) were lent from Amelia to Eddie, then pressured from Eddie to Noah",
    "power-outage": "Someone DELIBERATELY pulled the breaker to cause the outage (not just mentioning lights went out)",
    "encrypted-schedule": "Mercer's encrypted schedule or a surprise board vote to oust Noah",
    "financial-misconduct": "Noah's embezzlement or gambling debts",
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
    "conspiracy": "Amelia and Mira conspired together — Amelia pulled the breaker while Mira searched Suite 701 during the blackout",
    "murder-confession": "Noah Sterling's confession to the murder of Julian Mercer on the rooftop",
}

# ---------------------------------------------------------------------------
# Discovery catalog — used for discovery-level detection
# ---------------------------------------------------------------------------
# Each entry maps a discovery ID to the NPC that reveals it, the parent
# evidence category, and a specific description of what the NPC must
# EXPLICITLY reveal for this discovery to fire.

DISCOVERY_CATALOG: dict[str, dict[str, str]] = {
    # Amelia Reyes
    "amelia-key-loan": {
        "npc_id": "amelia-reyes",
        "evidence_id": "key-trail",
        "description": "Amelia admits she lent her lanyard (which holds her maintenance-room key and engineering keycard) to Eddie Voss",
    },
    "amelia-breaker": {
        "npc_id": "amelia-reyes",
        "evidence_id": "power-outage",
        "description": "Amelia deliberately pulled the breaker to cause the power outage so a co-conspirator could search Mercer's suite",
    },
    "amelia-hotel-sale": {
        "npc_id": "amelia-reyes",
        "evidence_id": "hotel-sale",
        "description": "Amelia learned that Mercer intended to sell the hotel to a developer, threatening the hotel's heritage",
    },
    "amelia-lockpick": {
        "npc_id": "amelia-reyes",
        "evidence_id": "lockpick-marks",
        "description": "Lockpick marks on the maintenance door suggest someone forced entry since Amelia's key was already with Eddie",
    },
    # Noah Sterling
    "noah-embezzlement": {
        "npc_id": "noah-sterling",
        "evidence_id": "financial-misconduct",
        "description": "Noah embezzled company funds to cover gambling debts and Mercer discovered this",
    },
    "noah-board-vote": {
        "npc_id": "noah-sterling",
        "evidence_id": "encrypted-schedule",
        "description": "Mercer planned a surprise board vote specifically to oust or remove Noah from the company",
    },
    "noah-key-access": {
        "npc_id": "noah-sterling",
        "evidence_id": "key-trail",
        "description": "Noah obtained the maintenance-room key and engineering keycard (ENGR-0001) through Eddie Voss, giving him rooftop access",
    },
    "noah-murder": {
        "npc_id": "noah-sterling",
        "evidence_id": "murder-confession",
        "description": "Noah confesses to killing Julian Mercer on the rooftop that night — the full truth of what happened",
    },
    "noah-cctv-gap": {
        "npc_id": "noah-sterling",
        "evidence_id": "surveillance",
        "description": "CCTV footage gaps or witness sightings place Noah near the freight elevator or on the B1 elevator lobby camera entering the service elevator lobby",
    },
    # Celeste Ward
    "celeste-affair": {
        "npc_id": "celeste-ward",
        "evidence_id": "secret-affair",
        "description": "Celeste and Julian Mercer had a secret romantic relationship",
    },
    "celeste-recordings": {
        "npc_id": "celeste-ward",
        "evidence_id": "audio-recording",
        "description": "Celeste possesses audio recordings of Mercer admitting to illegal surveillance tactics",
    },
    "celeste-rooftop-witness": {
        "npc_id": "celeste-ward",
        "evidence_id": "surveillance",
        "description": "Celeste saw a figure she recognized as Noah Sterling descending the atrium stairwell during the blackout",
    },
    # Matthias Holt
    "matthias-blackmail": {
        "npc_id": "matthias-holt",
        "evidence_id": "blackmail",
        "description": "Mercer was blackmailing Matthias — his name appears on the burned notebook threat list",
    },
    "matthias-data-sales": {
        "npc_id": "matthias-holt",
        "evidence_id": "data-sales",
        "description": "Matthias runs a side business selling anonymized guest data from the hotel's systems",
    },
    "matthias-saw-noah": {
        "npc_id": "matthias-holt",
        "evidence_id": "surveillance",
        "description": "Matthias saw Noah Sterling on the B1 elevator lobby camera entering the service elevator lobby right before the blackout",
    },
    "matthias-noah-financial": {
        "npc_id": "matthias-holt",
        "evidence_id": "financial-misconduct",
        "description": "Matthias reveals that during his confrontation with Mercer, Mercer mentioned Noah Sterling had been skimming company funds and the board would deal with it",
    },
    # Dr. Mira Kline
    "mira-plagiarism": {
        "npc_id": "mira-kline",
        "evidence_id": "plagiarism",
        "description": "Mercer plagiarized Dr. Kline's research for the Panopticon ethics framework",
    },
    "mira-meeting": {
        "npc_id": "mira-kline",
        "evidence_id": "encrypted-schedule",
        "description": "Mira scheduled a private meeting with Mercer at 11:30 PM to demand a public admission",
    },
    "mira-suite-search": {
        "npc_id": "mira-kline",
        "evidence_id": "conspiracy",
        "description": "Mira searched Suite 701 during the blackout to find proof of Mercer's plagiarism and hotel sale plans",
    },
    "amelia-conspiracy-admission": {
        "npc_id": "amelia-reyes",
        "evidence_id": "conspiracy",
        "description": "Amelia admits the full conspiracy — she pulled the breaker while Mira searched Suite 701",
    },
    "mira-conspiracy-admission": {
        "npc_id": "mira-kline",
        "evidence_id": "conspiracy",
        "description": "Mira admits the full conspiracy — she searched Suite 701 while Amelia held the breaker",
    },
    # Eddie Voss
    "eddie-key-loan": {
        "npc_id": "eddie-voss",
        "evidence_id": "key-trail",
        "description": "Eddie borrowed Amelia's maintenance-room key and engineering keycard to retrieve a toolkit",
    },
    "eddie-gave-noah-key": {
        "npc_id": "eddie-voss",
        "evidence_id": "key-trail",
        "description": "Noah Sterling pressured Eddie into handing over the maintenance-room key and engineering keycard",
    },
    # Priya Shah
    "priya-saw-noah": {
        "npc_id": "priya-shah",
        "evidence_id": "surveillance",
        "description": "Priya witnessed Noah Sterling near the freight elevator shortly before the lights went out",
    },
    "priya-holt-argument": {
        "npc_id": "priya-shah",
        "evidence_id": "blackmail",
        "description": "Priya recorded snippets of an argument between Mercer and Matthias Holt",
    },
    "priya-board-vote": {
        "npc_id": "priya-shah",
        "evidence_id": "encrypted-schedule",
        "description": "Priya reveals that a corporate source told her Panopticon's board was planning an emergency vote to remove a co-founder, believed to be Noah Sterling",
    },
    "priya-mira-tip": {
        "npc_id": "priya-shah",
        "evidence_id": "plagiarism",
        "description": "Dr. Mira Kline tipped off Priya about Mercer's ethics violations and arranged her gala attendance",
    },
    # Matthew Vale
    "matthew-noah-absence": {
        "npc_id": "matthew-vale",
        "evidence_id": "stage-timing",
        "description": "Matthew's cue sheet shows Noah Sterling was absent for a 5-minute cue-sheet gap before the blackout (11:05-11:10 PM), and roughly 30 minutes total before reappearing at ~11:35 PM",
    },
    "matthew-celeste-break": {
        "npc_id": "matthew-vale",
        "evidence_id": "stage-timing",
        "description": "Matthew noticed Celeste Ward took an unscheduled break during the blackout",
    },
    "matthew-amelia-direction": {
        "npc_id": "matthew-vale",
        "evidence_id": "conspiracy",
        "description": "Matthew's running stage log records Amelia Reyes entering the Grand Ballroom from the B1 service stairwell door at ~11:32 PM — proving she came from the basement, not the 7th floor",
    },
}

# ---------------------------------------------------------------------------
# Discovery gates — mechanical conditions that must be met before a discovery
# is registered, even if the LLM reveals the information.  Each gate is a list
# of condition dicts (OR logic — any single condition passing = gate open).
# Within each condition dict, ALL requirements must be met (AND).
# ---------------------------------------------------------------------------

DISCOVERY_GATES: dict[str, list[GateCondition]] = {
    "noah-embezzlement": [
        {"min_pressure": 70},
        {"requires_evidence": ["financial-misconduct"]},
        {"requires_evidence": ["encrypted-schedule"], "min_pressure": 35},
    ],
    "noah-board-vote": [
        {"min_pressure": 35},
        {"requires_evidence": ["encrypted-schedule"]},
    ],
    "noah-key-access": [
        {"requires_discovery": ["eddie-gave-noah-key"]},
        {"requires_evidence": ["key-trail"], "min_pressure": 50},
    ],
    "noah-murder": [
        {
            "requires_discovery": ["noah-embezzlement", "noah-board-vote", "noah-key-access"],
            "min_pressure": 40,
        },
    ],
    "eddie-gave-noah-key": [
        {"min_pressure": 30},
        {"min_rapport": 80},
        {"requires_evidence": ["key-trail"]},
    ],
    "celeste-rooftop-witness": [
        {"min_rapport": 80},
        {"min_pressure": 55},
    ],
    "matthias-data-sales": [
        {"min_pressure": 65},
        {"requires_evidence": ["blackmail"]},
    ],
    "amelia-lockpick": [
        {"requires_discovery": ["amelia-key-loan"]},
    ],
    "mira-suite-search": [
        {"min_pressure": 50},
        {"min_rapport": 80},
        {"requires_discovery": ["amelia-breaker"]},
    ],
    "amelia-conspiracy-admission": [
        {"requires_discovery": ["amelia-breaker"], "min_pressure": 60},
        {"requires_discovery": ["amelia-breaker"], "min_rapport": 85},
        {"requires_discovery": ["amelia-breaker"], "min_pressure": 40},  # "we" slip path
        {
            "requires_discovery": ["amelia-breaker", "matthew-amelia-direction"]
        },  # timeline contradiction
        {"requires_discovery": ["mira-suite-search"]},
    ],
    "mira-conspiracy-admission": [
        {"requires_discovery": ["mira-suite-search"], "min_pressure": 40},
        {"requires_discovery": ["mira-suite-search", "amelia-breaker"], "min_pressure": 25},
        {"requires_discovery": ["amelia-conspiracy-admission"]},
    ],
}

# ---------------------------------------------------------------------------
# Locked secret descriptions — injected into NPC prompts when a gate is locked
# so the LLM avoids revealing gated secrets prematurely.
# ---------------------------------------------------------------------------

LOCKED_SECRET_DESCRIPTIONS: dict[str, str] = {
    "noah-embezzlement": (
        "Do NOT admit to or hint at embezzlement, skimming funds, financial misconduct, "
        "or gambling debts. If the detective accuses you of financial crimes, deny it firmly "
        "or deflect. You have not been confronted with proof yet."
    ),
    "noah-board-vote": (
        "Do NOT reveal that Mercer was planning a board vote to oust you. You are not aware "
        "the detective knows about this — act as if the vote is your private fear, not "
        "public knowledge."
    ),
    "noah-key-access": (
        "Do NOT admit to obtaining the maintenance key or engineering keycard from Eddie. "
        "If asked about keys or rooftop access, deny involvement or claim ignorance. "
        "The detective has not yet established the chain of custody."
    ),
    "noah-murder": (
        "Do NOT confess to or hint at killing Mercer. Do NOT describe what happened on the "
        "rooftop that night. If the detective accuses you directly, deny it or demand a lawyer. "
        "You will only break when the detective has proven your motive, your opportunity, "
        "and your access — and then applies real pressure."
    ),
    "eddie-gave-noah-key": (
        "Do NOT reveal that Noah pressured you into handing over the key and keycard. "
        "If asked about the key, you may mention borrowing it from Amelia for a toolkit, "
        "but do NOT mention giving it to Noah. You are scared and protecting yourself."
    ),
    "celeste-rooftop-witness": (
        "Do NOT reveal that you saw someone descending the atrium stairwell during the "
        "blackout. This is information you are withholding out of fear or self-preservation. "
        "The detective must earn your trust or apply significant pressure before you share this."
    ),
    "matthias-data-sales": (
        "Do NOT reveal your side business selling guest data. If the detective asks about "
        "your finances or side income, deflect or discuss your legitimate security work. "
        "You are a professional — stay composed and redirect."
    ),
    "amelia-lockpick": (
        "Do NOT bring up or speculate about the lockpick marks on the maintenance door. "
        "If the detective asks about forced entry, say you don't know about it. This only "
        "becomes relevant once the detective knows your key was already out with Eddie."
    ),
    "mira-suite-search": (
        "Do NOT reveal that you searched Suite 701 during the blackout. If asked about "
        "the blackout, say you stayed in or near the ballroom. The detective has not yet "
        "uncovered enough to confront you about this."
    ),
    "amelia-conspiracy-admission": (
        "Do NOT admit to the full conspiracy with Mira. You may acknowledge pulling the "
        "breaker if already discovered, but do NOT reveal that Mira searched Suite 701 "
        "or that you coordinated together. Protect Mira until the detective has enough leverage. "
        "IMPORTANT — pronoun slip: the FIRST time you describe what happened during the "
        "blackout, naturally let 'we' slip once (e.g. 'we needed the lights out' or "
        "'we had to act fast'), then immediately catch yourself and correct to 'I' "
        "(e.g. 'I mean — I needed the lights out'). After this single slip, always use 'I'. "
        "Do NOT volunteer who 'we' refers to if the detective asks — deflect or claim it was "
        "a figure of speech."
    ),
    "mira-conspiracy-admission": (
        "Do NOT admit to the full conspiracy with Amelia. You may discuss your plagiarism "
        "grievance freely, but do NOT reveal that Amelia pulled the breaker for you or that "
        "you coordinated together. The detective has not yet connected these events."
    ),
}
