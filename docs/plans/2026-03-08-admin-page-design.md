# Admin Page Design — Case Content Management

## Summary

Add an admin interface for reviewing and editing all case content (NPCs, evidence, discoveries, gates, prompts). Move all case data from Python modules into Supabase tables. Support multiple cases via a top-level `cases` table.

## Decisions

- **Architecture**: Server-rendered admin page in FastAPI (vanilla JS, no build step)
- **Database**: Supabase (already integrated)
- **Auth**: Role-based via Supabase `is_admin` user metadata
- **UI structure**: Case-centric tree view — select case, drill into NPCs/evidence/discoveries
- **Discovery chain visualization**: Dependency graph derived from discovery gates (DAG)
- **Localization**: English-only for now; skip i18n management in admin

## Database Schema

All tables in Supabase public schema with RLS (admin-only write, public read for game).

### `cases`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| slug | text UNIQUE | e.g. "echoes_in_the_atrium" |
| title | text | |
| world_context_prompt | text | Shared world knowledge |
| intuition_prompt | text | Detective inner monologue system prompt |
| partner_npc_slug | text | References npcs.npc_slug |
| culprit_npc_slug | text | References npcs.npc_slug |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `archetypes`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text UNIQUE | e.g. "professional_fixer" |
| label | text | e.g. "Professional Fixer" |
| pressure_scale | float | |
| rapport_scale | float | |
| pressure_decay | float | |
| rapport_decay | float | |
| contradiction_bonus | float | |
| empathy_bonus | float | |

### `npcs`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| case_id | uuid FK cases | |
| npc_slug | text | e.g. "noah-sterling" |
| display_name | text | |
| system_prompt | text | Persona rules |
| timeline | text | First-person story bible |
| archetype_id | uuid FK archetypes | |
| voice | text | OpenAI TTS voice |
| voice_instruction | text | |
| gender | text | "male" or "female" |
| sort_order | int | |
| UNIQUE(case_id, npc_slug) | | |

### `evidence`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| case_id | uuid FK cases | |
| evidence_slug | text | e.g. "burned-notebook" |
| label | text | Display name |
| description | text | |
| evidence_group | text | physical/documentary/testimony/access/motive |
| sort_order | int | |
| UNIQUE(case_id, evidence_slug) | | |

### `discoveries`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| case_id | uuid FK cases | |
| discovery_slug | text | e.g. "noah-embezzlement" |
| npc_id | uuid FK npcs | |
| evidence_id | uuid FK evidence | |
| description | text | What NPC must reveal |
| UNIQUE(case_id, discovery_slug) | | |

### `discovery_gates`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| discovery_id | uuid FK discoveries | |
| gate_index | int | For ordering alternatives (OR logic) |
| min_pressure | int NULL | |
| min_rapport | int NULL | |
| required_evidence_slugs | text[] NULL | |
| required_discovery_slugs | text[] NULL | |

### `locked_secret_descriptions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| discovery_id | uuid FK discoveries | |
| description | text | Prompt injected when gate is locked |

### `npc_evidence_relevance`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| npc_id | uuid FK npcs | |
| evidence_id | uuid FK evidence | |
| is_smoking_gun | boolean DEFAULT false | |
| UNIQUE(npc_id, evidence_id) | | |

### `case_config`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| case_id | uuid FK cases | |
| key | text | e.g. "starting_evidence", "briefing_keys" |
| value | jsonb | |
| UNIQUE(case_id, key) | | |

## Admin API Routes

All under `/api/admin/` prefix. Protected by admin auth middleware.

- `GET /api/admin/cases` — list all cases
- `GET /api/admin/cases/:id` — full case with nested NPCs, evidence, discoveries
- `PUT /api/admin/cases/:id` — update case metadata & prompts
- `POST /api/admin/cases` — create new case
- CRUD for npcs, evidence, discoveries, gates (nested under case)
- `GET /api/admin/cases/:id/dependency-graph` — returns discovery DAG as nodes/edges

## Admin Frontend

Single HTML page at `/admin/` served by FastAPI. Case-centric tree:

1. **Case selector** (sidebar) — list of cases, click to expand
2. **Case detail** — title, prompts (world context, intuition), partner/culprit selection
3. **NPCs section** — list, click to edit inline (prompt, timeline, archetype, voice)
4. **Evidence section** — list grouped by type, inline edit
5. **Discoveries section** — list grouped by NPC, inline edit
6. **Gates section** — per-discovery gate conditions, visual dependency graph
7. **NPC Evidence Relevance** — matrix or checklist view

## Backend Integration

The game backend (`load_case`) gains a new code path:
- If Supabase is configured and case tables exist → load from DB
- Else → fall back to Python modules (backward compatible)

This is done via a new `load_case_from_db()` function in `server/cases/__init__.py`.

## Implementation Plan

1. Create branch `admin`
2. Write Supabase migration SQL for all tables
3. Write seed script to populate DB from existing Python modules
4. Add admin auth middleware (check `is_admin` in user metadata)
5. Build admin API routes (FastAPI router)
6. Build admin frontend HTML page
7. Wire `load_case` to read from DB when available
8. Test end-to-end
