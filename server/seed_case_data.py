"""Seed Supabase case content tables from existing Python modules.

Usage:
    python -m server.seed_case_data

Requires SUPABASE_URL and SUPABASE_KEY (service role key) in .env.
"""

from __future__ import annotations

import logging
import sys

from .supabase_client import get_supabase
from .interrogation import ARCHETYPES
from .cases.echoes_in_the_atrium.npc_profiles import NPC_PROFILES
from .cases.echoes_in_the_atrium.archetypes import NPC_ARCHETYPE_MAP
from .cases.echoes_in_the_atrium.world_context import WORLD_CONTEXT_PROMPT
from .cases.echoes_in_the_atrium.evidence import (
    DISCOVERY_CATALOG,
    DISCOVERY_GATES,
    EVIDENCE_CATALOG_DESCRIPTIONS,
    LOCKED_SECRET_DESCRIPTIONS,
    NPC_RELEVANT_EVIDENCE,
    SMOKING_GUN_MAP,
)
from .cases.echoes_in_the_atrium import INTUITION_PROMPT

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

# Evidence group mapping (manual, based on case.js evidenceGroups)
EVIDENCE_GROUPS = {
    "burned-notebook": "physical",
    "keycard-logs": "documentary",
    "key-trail": "physical",
    "power-outage": "physical",
    "encrypted-schedule": "documentary",
    "financial-misconduct": "documentary",
    "surveillance": "testimony",
    "secret-affair": "testimony",
    "audio-recording": "physical",
    "nda-ip": "documentary",
    "blackmail": "documentary",
    "data-sales": "documentary",
    "plagiarism": "documentary",
    "lockpick-marks": "physical",
    "hotel-sale": "documentary",
    "stage-timing": "documentary",
    "conspiracy": "testimony",
    "murder-confession": "testimony",
}


def seed():
    sb = get_supabase()
    if sb is None:
        log.error("Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY.")
        sys.exit(1)

    # ── 1. Archetypes ────────────────────────────────────────────────────
    log.info("Seeding archetypes...")
    archetype_rows = []
    for arch in ARCHETYPES.values():
        archetype_rows.append({
            "name": arch.archetype_id,
            "label": arch.label,
            "pressure_scale": arch.pressure_scale,
            "rapport_scale": arch.rapport_scale,
            "pressure_decay": arch.pressure_decay,
            "rapport_decay": arch.rapport_decay,
            "contradiction_bonus": arch.contradiction_bonus,
            "empathy_bonus": arch.empathy_bonus,
        })
    sb.table("archetypes").upsert(archetype_rows, on_conflict="name").execute()

    # Fetch archetype IDs
    arch_resp = sb.table("archetypes").select("id, name").execute()
    arch_map = {r["name"]: r["id"] for r in arch_resp.data}
    log.info("  %d archetypes seeded", len(arch_map))

    # ── 2. Case ──────────────────────────────────────────────────────────
    log.info("Seeding case...")
    case_row = {
        "slug": "echoes_in_the_atrium",
        "title": "Echoes in the Atrium",
        "world_context_prompt": WORLD_CONTEXT_PROMPT,
        "intuition_prompt": INTUITION_PROMPT,
        "partner_npc_slug": "lila-chen",
        "culprit_npc_slug": "noah-sterling",
    }
    sb.table("cases").upsert(case_row, on_conflict="slug").execute()
    case_resp = sb.table("cases").select("id").eq("slug", "echoes_in_the_atrium").single().execute()
    case_id = case_resp.data["id"]
    log.info("  Case ID: %s", case_id)

    # ── 3. NPCs ──────────────────────────────────────────────────────────
    log.info("Seeding NPCs...")
    npc_rows = []
    for i, (npc_slug, profile) in enumerate(NPC_PROFILES.items()):
        arch_name = NPC_ARCHETYPE_MAP.get(npc_slug, "professional_fixer")
        npc_rows.append({
            "case_id": case_id,
            "npc_slug": npc_slug,
            "display_name": profile.display_name,
            "system_prompt": profile.system_prompt,
            "timeline": profile.timeline or "",
            "archetype_id": arch_map.get(arch_name),
            "voice": profile.voice or "alloy",
            "voice_instruction": profile.voice_instruction or "",
            "gender": profile.gender or "male",
            "sort_order": i,
        })
    sb.table("npcs").upsert(npc_rows, on_conflict="case_id,npc_slug").execute()

    # Fetch NPC IDs
    npc_resp = sb.table("npcs").select("id, npc_slug").eq("case_id", case_id).execute()
    npc_map = {r["npc_slug"]: r["id"] for r in npc_resp.data}
    log.info("  %d NPCs seeded", len(npc_map))

    # ── 4. Evidence ──────────────────────────────────────────────────────
    log.info("Seeding evidence...")
    evidence_rows = []
    for i, (ev_slug, desc) in enumerate(EVIDENCE_CATALOG_DESCRIPTIONS.items()):
        evidence_rows.append({
            "case_id": case_id,
            "evidence_slug": ev_slug,
            "label": ev_slug.replace("-", " ").title(),
            "description": desc,
            "evidence_group": EVIDENCE_GROUPS.get(ev_slug, "physical"),
            "sort_order": i,
        })
    sb.table("evidence").upsert(evidence_rows, on_conflict="case_id,evidence_slug").execute()

    # Fetch evidence IDs
    ev_resp = sb.table("evidence").select("id, evidence_slug").eq("case_id", case_id).execute()
    ev_map = {r["evidence_slug"]: r["id"] for r in ev_resp.data}
    log.info("  %d evidence items seeded", len(ev_map))

    # ── 5. Discoveries ───────────────────────────────────────────────────
    log.info("Seeding discoveries...")
    disc_rows = []
    for disc_slug, info in DISCOVERY_CATALOG.items():
        npc_uuid = npc_map.get(info["npc_id"])
        ev_uuid = ev_map.get(info["evidence_id"])
        if not npc_uuid or not ev_uuid:
            log.warning("  Skipping discovery %s: missing NPC or evidence", disc_slug)
            continue
        disc_rows.append({
            "case_id": case_id,
            "discovery_slug": disc_slug,
            "npc_id": npc_uuid,
            "evidence_id": ev_uuid,
            "description": info["description"],
        })
    sb.table("discoveries").upsert(disc_rows, on_conflict="case_id,discovery_slug").execute()

    # Fetch discovery IDs
    disc_resp = sb.table("discoveries").select("id, discovery_slug").eq("case_id", case_id).execute()
    disc_map = {r["discovery_slug"]: r["id"] for r in disc_resp.data}
    log.info("  %d discoveries seeded", len(disc_map))

    # ── 6. Discovery gates ───────────────────────────────────────────────
    log.info("Seeding discovery gates...")
    gate_rows = []
    for disc_slug, conditions in DISCOVERY_GATES.items():
        disc_uuid = disc_map.get(disc_slug)
        if not disc_uuid:
            log.warning("  Skipping gate for %s: discovery not found", disc_slug)
            continue
        for i, cond in enumerate(conditions):
            gate_rows.append({
                "discovery_id": disc_uuid,
                "gate_index": i,
                "min_pressure": cond.get("min_pressure"),
                "min_rapport": cond.get("min_rapport"),
                "required_evidence_slugs": cond.get("requires_evidence"),
                "required_discovery_slugs": cond.get("requires_discovery"),
            })
    if gate_rows:
        sb.table("discovery_gates").upsert(
            gate_rows, on_conflict="discovery_id,gate_index"
        ).execute()
    log.info("  %d gate conditions seeded", len(gate_rows))

    # ── 7. Locked secret descriptions ────────────────────────────────────
    log.info("Seeding locked secret descriptions...")
    lsd_rows = []
    for disc_slug, desc in LOCKED_SECRET_DESCRIPTIONS.items():
        disc_uuid = disc_map.get(disc_slug)
        if not disc_uuid:
            continue
        lsd_rows.append({
            "discovery_id": disc_uuid,
            "description": desc,
        })
    if lsd_rows:
        sb.table("locked_secret_descriptions").upsert(
            lsd_rows, on_conflict="discovery_id"
        ).execute()
    log.info("  %d locked secret descriptions seeded", len(lsd_rows))

    # ── 8. NPC evidence relevance ────────────────────────────────────────
    log.info("Seeding NPC evidence relevance...")
    rel_rows = []
    for npc_slug, ev_slugs in NPC_RELEVANT_EVIDENCE.items():
        npc_uuid = npc_map.get(npc_slug)
        if not npc_uuid:
            continue
        smoking_guns = set(SMOKING_GUN_MAP.get(npc_slug, []))
        for ev_slug in ev_slugs:
            ev_uuid = ev_map.get(ev_slug)
            if not ev_uuid:
                continue
            rel_rows.append({
                "npc_id": npc_uuid,
                "evidence_id": ev_uuid,
                "is_smoking_gun": ev_slug in smoking_guns,
            })
    if rel_rows:
        sb.table("npc_evidence_relevance").upsert(
            rel_rows, on_conflict="npc_id,evidence_id"
        ).execute()
    log.info("  %d relevance entries seeded", len(rel_rows))

    log.info("Seeding complete!")


if __name__ == "__main__":
    seed()
