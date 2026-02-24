# Echoes in the Atrium – Detective Game

A narrative detective mystery game where each NPC is powered by a large language model.
Interrogate nine persons of interest at a high-tech gala to uncover who murdered the CEO of
Vireo Dynamics. Collect evidence, spot contradictions, and make your accusation.

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

## Repository Layout

- `web/` – Single-page game UI (served automatically by the backend).
- `server/` – FastAPI backend that brokers chat between the frontend and the LLM.
- `docs/` – Story bible, NPC dossiers, and development roadmap.

## How to Play

1. Read the case briefing on the intro screen and click **Begin Investigation**.
2. Select a person of interest from the left sidebar to start an interrogation.
3. Ask questions — NPCs guard secrets and will only reveal them under the right pressure.
4. Evidence is automatically tracked in the right sidebar as NPCs mention key details.
5. Switch between NPCs freely; conversation history is preserved per character.
6. When you're ready, click **Make an Accusation** and select who you think is the killer.

**Tip:** Start with Detective Lila Chen (your partner) for an overview of the case.

## LLM Providers

| Provider | Env Vars | Notes |
| --- | --- | --- |
| **Anthropic** | `ANTHROPIC_API_KEY`, `ECHO_ANTHROPIC_MODEL` | Default model: `claude-sonnet-4-20250514` |
| **OpenAI** | `OPENAI_API_KEY`, `ECHO_OPENAI_MODEL` | Default model: `gpt-3.5-turbo` |
| **Local stub** | `ECHO_LLM_PROVIDER=local` | Echo bot for testing without an API key |

Set `ECHO_LLM_PROVIDER` to `anthropic`, `openai`, or `local`.

## Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `ECHO_LLM_PROVIDER` | Which LLM client to use. | `openai` |
| `ANTHROPIC_API_KEY` | API key for the Anthropic provider. | _None_ |
| `ECHO_ANTHROPIC_MODEL` | Model to use for Anthropic completions. | `claude-sonnet-4-20250514` |
| `OPENAI_API_KEY` | API key for the OpenAI provider. | _None_ |
| `ECHO_OPENAI_MODEL` | Model to use for OpenAI completions. | `gpt-3.5-turbo` |

## Extending with a Custom LLM

The `LocalEchoLLMClient` in `server/llm/local_stub.py` demonstrates the interface. Replace its
`generate` method with calls to your preferred model runtime (Ollama, llama.cpp, LM Studio, etc.)
and register it in `server/llm/factory.py`.
