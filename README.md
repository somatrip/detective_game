# Echoes in the Atrium

An LLM-powered detective mystery game. Interrogate nine AI-driven suspects at a luxury hotel gala to solve a murder. Each NPC has a unique personality, hidden secrets, and a realistic pressure/rapport system that governs how they respond to your questioning.

## Quick Start

```bash
# 1. Create a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r server/requirements.txt

# 3. Configure an LLM provider (pick one)
export ECHO_LLM_PROVIDER=anthropic   # or openai, or local
export ANTHROPIC_API_KEY=sk-ant-...  # for Anthropic
# export OPENAI_API_KEY=sk-...       # for OpenAI

# 4. Start the server
uvicorn server.app:app --port 8000

# 5. Open http://localhost:8000 in your browser
```

## How to Play

1. Read the case briefing on the title card and click **Begin Investigation**.
2. Select a person of interest from the Hub to start an interrogation.
3. Ask questions — NPCs guard secrets and will only reveal them under the right pressure or rapport.
4. Evidence is automatically tracked in the Case Board as NPCs mention key details.
5. Switch between NPCs freely; conversation history and pressure/rapport are preserved per character.
6. When all key evidence is collected, click **Make Arrest** and select who you think is the killer.
7. Your arrest is graded based on the evidence you gathered.

**Tip:** Start with Detective Lila Chen (your partner) for an overview of the case. Use the hint button when talking to her for investigative guidance.

## Features

- **LLM-powered NPCs** — each suspect has a detailed backstory, timeline, secrets, and personality that shape every response
- **Interrogation mechanics** — hidden pressure/rapport system with 3 NPC archetypes, 8 tactic types, and 4 evidence strength levels
- **Discovery-based evidence** — secrets are revealed individually (not all-or-nothing) with LLM-generated summaries
- **Voice mode** — speak to suspects and hear their responses using OpenAI Whisper + TTS, with auto-silence detection
- **NPC portraits** — 6 expression states per character that update based on conversation context
- **Interactive evidence** — keycard log viewer for investigating suspect movements
- **Cloud saves** — optional Supabase auth with local-first persistence and cloud sync
- **Bilingual** — full English and Serbian support with gender-correct grammar
- **Case-agnostic engine** — the engine reads everything from a case package, making it possible to build new mysteries

## Repository Layout

```
web/                              Frontend (single HTML file + case assets)
├── index.html                    All CSS, HTML, and JS (~5000 lines)
├── icons/                        Pressure/rapport gauge icons
└── cases/echoes-in-atrium/       Case-specific assets
    ├── case.js                   Case manifest (evidence maps, grading config)
    ├── i18n-en.js                English strings
    ├── i18n-sr.js                Serbian strings
    ├── data/keycard_logs.json    Interactive keycard evidence
    └── portraits/                NPC portraits (6 expressions each)

server/                           FastAPI backend
├── app.py                        Main app, chat pipeline, API routes
├── interrogation.py              Deterministic pressure/rapport engine
├── config.py                     Environment variable configuration
├── schemas.py                    Pydantic request/response models
├── npc_registry.py               NPCProfile dataclass and accessors
├── auth_routes.py                Supabase auth + cloud saves
├── tracking_routes.py            Gameplay analytics
├── supabase_client.py            Supabase client factory
├── llm/                          LLM provider abstraction
│   ├── factory.py                Provider factory
│   ├── base.py                   Abstract LLM client interface
│   ├── classifier.py             Turn classification + discovery detection
│   ├── openai_client.py          OpenAI implementation
│   ├── anthropic_client.py       Anthropic implementation
│   └── local_stub.py             Echo bot for offline testing
└── cases/                        Case data packages
    ├── __init__.py               CaseData dataclass + loader
    └── echoes_in_the_atrium/     Active case
        ├── __init__.py            Case assembly
        ├── world_context.py       Shared world knowledge (all NPCs)
        ├── npc_profiles.py        Per-NPC personality + secrets
        ├── timelines.py           Per-NPC story bible timelines
        ├── archetypes.py          NPC → archetype mapping
        └── evidence.py            Evidence catalog, discoveries, scoring

docs/                             Documentation
├── case-creation-guide.md        How to build a new case from scratch
└── game-mechanics.md             Complete game systems reference
```

## LLM Providers

| Provider | Env Vars | Notes |
| --- | --- | --- |
| **Anthropic** | `ANTHROPIC_API_KEY`, `ECHO_ANTHROPIC_MODEL` | Default: `claude-sonnet-4-20250514`. Best roleplay quality. |
| **OpenAI** | `OPENAI_API_KEY`, `ECHO_OPENAI_MODEL` | Default: `gpt-3.5-turbo`. Voice always uses OpenAI. |
| **Local stub** | `ECHO_LLM_PROVIDER=local` | Echo bot for UI testing without an API key. |

Set `ECHO_LLM_PROVIDER` to `anthropic`, `openai`, or `local`.

Each provider uses a cheaper model for turn classification and discovery detection:
- OpenAI: `gpt-4o-mini`
- Anthropic: `claude-haiku-4-5-20251001`

## Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `ECHO_LLM_PROVIDER` | LLM provider to use | `openai` |
| `ANTHROPIC_API_KEY` | Anthropic API key | — |
| `ECHO_ANTHROPIC_MODEL` | Primary Anthropic model | `claude-sonnet-4-20250514` |
| `ECHO_ANTHROPIC_CLASSIFIER_MODEL` | Classifier Anthropic model | `claude-haiku-4-5-20251001` |
| `OPENAI_API_KEY` | OpenAI API key | — |
| `ECHO_OPENAI_MODEL` | Primary OpenAI model | `gpt-3.5-turbo` |
| `ECHO_OPENAI_CLASSIFIER_MODEL` | Classifier OpenAI model | `gpt-4o-mini` |
| `ECHO_OPENAI_TTS_MODEL` | Text-to-speech model | `gpt-4o-mini-tts` |
| `ECHO_OPENAI_STT_MODEL` | Speech-to-text model | `whisper-1` |
| `ECHO_CASE_ID` | Active case package | `echoes_in_the_atrium` |
| `SUPABASE_URL` | Supabase project URL (optional) | — |
| `SUPABASE_KEY` | Supabase anon key (optional) | — |

## Documentation

- **[Game Mechanics](docs/game-mechanics.md)** — comprehensive reference for all game systems (interrogation engine, chat pipeline, evidence/discovery system, voice I/O, save system, etc.)
- **[Case Creation Guide](docs/case-creation-guide.md)** — step-by-step guide for building new detective cases

## Extending with a Custom LLM

The `LocalEchoLLMClient` in `server/llm/local_stub.py` demonstrates the interface. Replace its
`generate` method with calls to your preferred model runtime (Ollama, llama.cpp, LM Studio, etc.)
and register it in `server/llm/factory.py`.

## Deployment

The project is configured for Vercel deployment via `vercel.json`. Environment variables should be set in the Vercel dashboard. Static assets are served by FastAPI's `StaticFiles` mount.
