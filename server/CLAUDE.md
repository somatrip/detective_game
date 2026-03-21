# Backend: server/

FastAPI application serving the game API and static frontend files.

## Running

```bash
uvicorn server.app:app --port 8000 --reload  # Dev server with auto-reload
pytest                                         # Run all tests
pytest tests/test_api.py -v                    # Run specific test file
```

## Key Files

- `app.py` — FastAPI app, route mounting, static file serving
- `interrogation.py` — Core chat engine: NPC personality, evidence detection, expression tagging
- `config.py` — Environment config (LLM provider, API keys, Supabase URL)
- `npc_registry.py` — NPC metadata and system prompt construction

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
