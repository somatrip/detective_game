# Echoes in the Atrium – Detective Game Prototype

This repository contains early planning documents and a proof-of-concept conversation UI for
"Echoes in the Atrium", a narrative detective game where each non-player character (NPC) is
powered by a large language model.

## Repository Layout

- `docs/` – Narrative outlines, persona dossiers, and planning notes.
- `server/` – FastAPI backend that brokers chat requests between the web client and the
  configured LLM provider.
- `web/` – Static HTML/CSS/JS prototype for selecting NPCs and chatting with them.

## Running the Backend

1. Create and activate a Python 3.10+ virtual environment.
2. Install dependencies:
   ```bash
   pip install -r server/requirements.txt
   ```
3. Choose an LLM provider:
   - **OpenAI (default)** – export `OPENAI_API_KEY` and optionally `ECHO_OPENAI_MODEL`.
   - **Local stub** – export `ECHO_LLM_PROVIDER=local` to use the placeholder echo bot until
     a real local model integration is implemented.
4. Launch the API server:
   ```bash
   uvicorn server.app:app --reload --port 8000
   ```
5. Verify it is running by visiting `http://localhost:8000/health`.

### Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | API key for the OpenAI provider. | _None_ |
| `ECHO_LLM_PROVIDER` | Which LLM client to use (`openai` or `local`). | `openai` |
| `ECHO_OPENAI_MODEL` | Chat model to request when using OpenAI. | `gpt-3.5-turbo` |

## Running the Web Client

The prototype is a static page in `web/index.html`. You can open the file directly in a browser
or serve it using a lightweight web server (e.g., VS Code Live Server, or
`python3 -m http.server 8000 --directory web`). When the backend is running on `localhost:8000`
the page will display a conversation view that forwards each turn to the API and streams back the
NPC's response.

### Front-End Flow

1. Select an NPC from the dropdown.
2. Type a message into the chat input and press **Send**.
3. The request is POSTed to `/api/chat`, which applies the shared world context plus the
   character-specific system prompt before calling the configured LLM provider.
4. Replies are rendered in the chat log. Each NPC maintains an independent history so you can
   bounce between suspects without losing progress.

## Extending with a Real Local Model

The `LocalEchoLLMClient` in `server/llm/local_stub.py` demonstrates the interface required for
custom providers. Replace its implementation with calls to your preferred local model or runtime
(e.g., llama.cpp, Ollama, LM Studio) while preserving the `generate` signature. Then set
`ECHO_LLM_PROVIDER` to a provider name that the factory recognizes (or register a new one) to
switch without modifying the rest of the application.
