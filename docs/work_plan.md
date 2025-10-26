# Detective Game Work Plan

## 1. Story Development and Information Architecture
- **Objective:** Craft an engaging murder mystery narrative with clear progression checkpoints that guide the player toward uncovering the culprit.
- **Key Actions:**
  - Establish the crime scene, victim background, and timeline of events.
  - Identify 4–6 major investigative checkpoints (e.g., crime scene sweep, alibi verification, secret revelation) each tied to specific narrative beats.
  - For every checkpoint, list the critical clues, revelations, or contradictions that must be uncovered.
  - Map clue dependencies to ensure information flow feels logical and prevents premature accusation.
  - Define scoring impacts for speed, accuracy, and legality at each checkpoint.
- **Deliverable:** Story bible outlining checkpoints, clue trees, and success/failure conditions.

## 2. NPC System Prompt Design
- **Objective:** Develop robust system prompts for each NPC (including the detective partner) that capture personality, background, relationship to the crime, motivations, and guarded secrets.
- **Key Actions:**
  - Enumerate core cast (suspects, witnesses, partner) with archetypes and personal stakes.
  - For each NPC, draft a system prompt structure: persona summary, knowledge boundaries, response style, cooperation threshold, secrets with unlocking conditions, and legal risk behaviors.
  - Prototype at least one full prompt per role to validate template efficacy.
  - Integrate interrogation mechanics (pressure tolerance, truthfulness scaling, lawyer invocation) into prompts.
- **Deliverable:** Prompt library with reusable templates and finalized persona prompts.

## 3. Text-Only LLM Integration
- **Objective:** Enable conversational interactions with NPCs via a text-only LLM API.
- **Key Actions:**
  - Select target LLM provider (e.g., OpenAI, Anthropic, local server) and define interface contract.
  - Implement middleware to route conversations, maintain conversation state, and inject system prompts per NPC.
  - Build safety/legality checkers to flag disallowed interrogation tactics and adjust scoring.
  - Create automated tests or mocks to simulate interrogations for regression coverage.
- **Deliverable:** Functional text-mode interrogation loop with transcript logging and scoring hooks.

## 4. Speech Interface (STT/TTS)
- **Objective:** Add optional voice interaction using Whisper or comparable speech-to-text (STT) and text-to-speech (TTS) models.
- **Key Actions:**
  - Evaluate Whisper API/local deployment for STT and select complementary TTS solution (e.g., Coqui, ElevenLabs, system-native APIs).
  - Abstract input/output layers so text-only and voice modes share core logic.
  - Implement streaming transcription and playback pipelines with latency targets.
  - Ensure legal/ethical scoring incorporates voice commands and outputs (e.g., detects shouted threats).
- **Deliverable:** Configurable audio interface module with fallback to text.

## 5. Local LLM Port
- **Objective:** Support running the entire simulation locally using an on-device LLM for privacy/offline play.
- **Key Actions:**
  - Assess feasible local models (LLaMA, Mistral, Mixtral, etc.) and hardware requirements.
  - Create adapter layer mirroring remote API interface but targeting local inference server (e.g., llama.cpp, GPT4All).
  - Optimize prompts and context windows for local model constraints, adding summarization where needed.
  - Provide setup scripts and documentation for local deployment.
- **Deliverable:** Local-first configuration profile with benchmarks and deployment guide.

## 6. Multi-Platform Delivery Strategy
- **Objective:** Architect the game for cross-platform deployment (iOS, desktop, browser).
- **Key Actions:**
  - Choose cross-platform technology stack (e.g., Unity with web export, React Native + Electron, Flutter) aligned with LLM integration constraints.
  - Define shared core logic layer (game state, scoring, conversation engine) decoupled from UI frameworks.
  - Draft platform-specific UI/UX considerations, input modalities, and compliance requirements (App Store policies, browser privacy).
  - Plan CI/CD pipelines for each target platform with automated testing, packaging, and release notes.
- **Deliverable:** Technical architecture document and roadmap for staggered platform rollouts.

## 7. Project Management & Milestones
- **Objective:** Organize development timeline, resources, and risk mitigation.
- **Key Actions:**
  - Break down deliverables into sprints with dependencies and estimated effort.
  - Assign roles (narrative designer, prompt engineer, ML engineer, client developer).
  - Identify critical risks (LLM cost, latency, legal compliance) with mitigation strategies.
  - Establish metrics for player engagement, interrogation legality scoring accuracy, and model performance.
- **Deliverable:** Master roadmap, sprint backlog, and KPI dashboard outline.
