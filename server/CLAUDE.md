# Backend: server/

FastAPI application serving the game API and static frontend files. Supports multiple cases with auto-discovery.

## Running

```bash
uvicorn server.app:app --port 8000 --reload  # Dev server with auto-reload
pytest                                         # Run all tests
pytest tests/test_api.py -v                    # Run specific test file
```

## Key Files

- `app.py` — FastAPI app, route mounting, `/api/cases` + `/api/case` endpoints, static file serving
- `chat_routes.py` — Chat, transcribe, speak, and stringboard state endpoints
- `interrogation.py` — Core chat engine: NPC personality, evidence detection, expression tagging
- `config.py` — Environment config (LLM provider, API keys, Supabase URL)
- `npc_registry.py` — NPC metadata and system prompt construction
- `cases/__init__.py` — CaseData dataclass, loader, auto-discovery, lazy init for Vercel

## Multi-Case Architecture

Case sub-packages under `server/cases/` are auto-discovered at startup (any directory with `__init__.py`). Each exports a `case_data: CaseData` attribute. Key functions:

- `load_all_cases()` — discovers and loads all cases; called by lifespan or lazily on first request
- `get_case(case_id)` — returns a loaded case; accepts both kebab-case and underscore formats
- `get_all_cases()` — returns all loaded cases
- `_ensure_all_loaded()` — lazy guard for Vercel where ASGI lifespan doesn't run

## LLM Providers

The `llm/` directory abstracts LLM access:

- `factory.py` — Provider selection based on config
- `anthropic_client.py` — Claude integration
- `openai_client.py` — OpenAI integration
- `local_stub.py` — Offline testing stub (no API key needed)
- `classifier.py` — Evidence/expression classification from responses

Always use `factory.py` to get an LLM client — never import a specific provider directly.

## Supabase

Auth and state persistence use Supabase. All Supabase operations go through `supabase_helpers.py`. Database schemas are in `*_migration.sql` files.

## Deployment

Deployed to Vercel via `vercel.json` + `api/index.py`. ASGI lifespan events do NOT run on Vercel — case loading is handled lazily via `_ensure_all_loaded()`. Any new startup-dependent code must account for this.
