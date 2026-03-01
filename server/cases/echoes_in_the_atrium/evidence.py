"""Evidence and discovery catalogs for *Echoes in the Atrium*."""

from __future__ import annotations

from typing import Dict, List

# ---------------------------------------------------------------------------
# Evidence knowledge base (used by tactic classifier for strength scoring)
# ---------------------------------------------------------------------------

#: Evidence relevant to each NPC (for evidence-strength scoring).
NPC_RELEVANT_EVIDENCE: Dict[str, List[str]] = {
    "noah-sterling": [
        "financial-misconduct", "encrypted-schedule",
        "key-trail", "surveillance", "burned-notebook",
    ],
    "amelia-reyes": ["key-trail", "lockpick-marks", "power-outage", "hotel-sale", "conspiracy"],
    "eddie-voss": ["key-trail"],
    "celeste-ward": ["secret-affair", "audio-recording", "surveillance"],
    "matthias-holt": ["data-sales", "blackmail", "burned-notebook", "surveillance", "financial-misconduct"],
    "mira-kline": ["plagiarism", "encrypted-schedule", "nda-ip", "conspiracy"],
    "priya-shah": ["surveillance", "blackmail", "plagiarism", "encrypted-schedule"],
    "matthew-vale": ["stage-timing", "conspiracy"],
    "lila-chen": [],
}

#: Evidence that constitutes a "smoking gun" for a specific NPC.
SMOKING_GUN_MAP: Dict[str, List[str]] = {
    "matthias-holt": ["data-sales"],
    "amelia-reyes": ["lockpick-marks"],
    "celeste-ward": ["audio-recording"],
    "mira-kline": ["conspiracy"],
}

#: Full evidence catalog with descriptions (used by classify_player_turn
#: for evidence-strength scoring).
EVIDENCE_CATALOG_DESCRIPTIONS: Dict[str, str] = {
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
}

# ---------------------------------------------------------------------------
# Discovery catalog — used for discovery-level detection
# ---------------------------------------------------------------------------
# Each entry maps a discovery ID to the NPC that reveals it, the parent
# evidence category, and a specific description of what the NPC must
# EXPLICITLY reveal for this discovery to fire.

DISCOVERY_CATALOG: Dict[str, Dict[str, str]] = {
    # Amelia Reyes
    "amelia-key-loan": {
        "npc_id": "amelia-reyes",
        "evidence_id": "key-trail",
        "description": "Amelia admits she lent her maintenance-room key and engineering keycard to Eddie Voss",
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
