# Game Design Review: Echoes in the Atrium

**Reviewer perspective**: Game design (mechanics, narrative, UX, systems)
**Date**: March 2026

---

## Executive Summary

Echoes in the Atrium is an LLM-powered detective interrogation game with a well-constructed murder mystery, a sophisticated pressure/rapport mechanical layer, and strong narrative design. The core loop — interrogate suspects, collect evidence, build a case — is compelling and well-suited to AI-driven NPCs. However, the game has significant design gaps around player guidance, mechanical transparency, pacing, and replayability that weaken the experience in practice. What follows is a candid assessment.

---

## Strengths

### 1. Exceptional Mystery Construction

The case is the best thing about this game. The murder of Julian Mercer is layered, fair, and solvable through reasoning rather than guesswork:

- **Multiple interlocking conspiracies** (Noah's murder, Amelia/Mira's sabotage, Holt's corruption) create a web that feels authentically messy. The player has to untangle who did what without being led by the nose.
- **Every suspect has a real secret**, not just the killer. This means interrogating "innocent" characters still yields useful information and feels productive. No dead-end conversations.
- **The evidence chain is logically sound.** The keycard trail (Amelia → Eddie → Noah) requires the player to reconstruct a chain of custody across three NPCs. This is genuine detective work.
- **Red herrings are organic, not arbitrary.** Amelia pulled the breaker. Holt was on the rooftop before the murder. Mira was in the victim's suite during the murder window. These aren't cheap misdirections — they're real conspiracies that happen to share a timeline with the killing.
- **The "we" slip in Amelia's dialogue** is a subtle, well-designed tell that rewards attentive players. It's the kind of detail that makes detective games satisfying.

### 2. Smart Pressure/Rapport Dual-Axis System

The interrogation mechanics are the most carefully designed system in the game:

- **The tension between pressure and rapport is genuine.** Pushing pressure erodes rapport (via the linear decay scaling), forcing players to commit to a strategy rather than brute-forcing every NPC.
- **Accelerated decay punishes half-measures.** If you never corner an NPC (peak < 75) and ease off, pressure bleeds away at 4x speed. This is an elegant anti-cheese mechanism that prevents players from slowly grinding every NPC to high pressure with open-ended questions.
- **Archetype differentiation is meaningful.** An "Anxious Insider" (Eddie, Celeste) cracks fast under empathy (+10 bonus) but a "Proud Executive" (Noah, Mira) barely flinches at it (+3 bonus). This forces players to read their suspect and adapt, which is the core skill the game is testing.
- **Evidence multipliers create crescendo moments.** Presenting a smoking gun triples your pressure delta. Saving your best evidence for the right moment feels rewarding because the math backs it up.

### 3. NPC Persona Engineering

The prompt architecture is well-layered (world context → timeline → personality → interrogation state). Key strengths:

- **"WHAT YOU DO NOT KNOW" sections** prevent NPCs from hallucinating cross-character knowledge, which is one of the biggest risks in LLM-driven games.
- **Cover story + breakpoints for Noah** is a strong approach. Rather than giving the LLM Noah's true timeline and hoping it lies convincingly, the prompt gives it the lies as primary truth with explicit instructions on when and how each lie collapses. This is much more reliable.
- **The "never end on a question" rule** solves a real problem. LLMs naturally try to be helpful and drive conversation forward, which breaks the interrogation dynamic where the detective should be in control.
- **The physical evidence subpoena rule** is a clever narrative constraint that prevents players from short-circuiting investigations by demanding items, while still allowing verbal testimony.

### 4. Case-Agnostic Engine Design

The separation between engine and case content is genuinely well-executed. The `CaseData` structure, NPC registry, evidence catalog, and discovery mapping are all generic. A new mystery could be built without touching the engine code. This is forward-thinking architecture that most game jams and indie projects skip.

### 5. Graded Outcomes

The four-tier outcome system (Slam Dunk → Plea Deal → Released → Wrong Suspect) is much better than a binary right/wrong ending. It rewards thoroughness without demanding perfection, and the distinction between "right person, weak case" and "right person, airtight case" mirrors real criminal justice in a satisfying way.

---

## Weaknesses

### 1. Player Guidance Is Dangerously Thin

This is the most critical design problem. The game drops the player into a 9-suspect investigation with almost no strategic scaffolding:

- **No suggested interrogation order.** A first-time player might start with Matthew Vale (low-information stage manager) instead of Amelia or Matthias (high-information characters with critical secrets). The hub screen presents all 9 NPCs equally, with no visual hierarchy suggesting where to begin.
- **The partner (Lila) is underutilized.** She has a "Case Hint" button, but it relies on the LLM generating useful guidance from pre-seeded display keys. There's no structured hint system that tracks what the player has found and suggests specific next steps. In a real investigation game (Obra Dinn, Her Story, LA Noire), the "case file" or "deduction board" actively helps the player see what's connected. Here, the case board is a passive evidence list.
- **No deduction or linking mechanic.** The player collects evidence and discoveries, but there's no system for connecting them. You can't link "Eddie gave Noah the key" to "Noah was near the freight elevator" to form a theory. The game trusts the player to do this entirely in their head or in the freeform notes textarea. For a game this complex, that's asking too much of most players.
- **The tutorial covers UI mechanics, not investigative strategy.** It teaches "here's how to click things" but never teaches "here's how to think about this case." For a game where the core skill is knowing how to interrogate, this is a significant onboarding gap.

### 2. The LLM Is Both the Core Feature and the Core Risk

The game is entirely dependent on the LLM behaving correctly, and the design doesn't adequately hedge against LLM failure modes:

- **Secrets can leak prematurely.** Despite careful prompting, there's nothing mechanically preventing an NPC from revealing a secret when their pressure is at 5 and rapport is at 10. The interrogation context provides behavioral guidance, but the LLM ultimately decides what to say. A well-tuned GPT-4 might hold secrets; a GPT-3.5-turbo (the default model) leaks much more readily. The game's default configuration uses a model that may not be capable enough for the nuance required.
- **Secrets can also never appear.** Conversely, the LLM might simply refuse to reveal information even when pressure is at 100 and the player has presented a smoking gun. The "MUST begin conceding" instruction in the smoking gun prompt is a suggestion, not a mechanical guarantee. There's no fallback for when the LLM ignores it.
- **The discovery classifier is a single point of failure.** Even if the NPC perfectly reveals a secret, the secondary LLM classifier must independently detect it. If the classifier misses it (wrong model, ambiguous phrasing, conservative threshold), the player gets nothing. There's no "try again" or alternative detection path. The player has no idea why their discovery didn't register.
- **No way to debug or recover from LLM mistakes.** If an NPC contradicts itself, invents a character, or breaks immersion, the player has no recourse. There's no "that didn't seem right" button, no conversation rewind, no way to flag a bad response. The game treats every LLM response as authoritative.

### 3. Pacing Problems

- **No time pressure or escalation.** The player can interrogate indefinitely with no consequence. Real investigations have urgency — witnesses become unavailable, lawyers arrive, evidence degrades. Without any pacing mechanism, the game can stall into an aimless loop of "talk to everyone about everything."
- **The endgame trigger is opaque.** The player must collect all 6 canonical evidence types to unlock the arrest option, but they have no visibility into what "canonical" means or how close they are to the threshold. The case board shows evidence but doesn't distinguish between "nice to have" and "required for arrest."
- **No narrative escalation.** Characters don't change over time. If you leave Amelia at high pressure and come back later, the pressure has decayed and she's back to calm. There's no persistent consequence for partially breaking someone. Investigations in good detective fiction build momentum — the walls close in. Here, the walls reset between conversations.

### 4. Limited Tactical Feedback

The player rarely understands why something worked or didn't:

- **Pressure and rapport gauges are visible but not explained in play.** The tutorial shows where the gauges are, but never teaches the player what changes them. A player who alternates between empathy and accusation will see numbers bouncing randomly without understanding the underlying system. The archetype system (the main strategic differentiator) is completely invisible.
- **The tactic classification is hidden.** The player types natural language, but the game silently classifies it into one of 8 tactic types. If the player tries to present evidence but the classifier reads it as "open_ended," the player gets a weak result with no explanation. There's a fundamental mismatch between player intent and system interpretation, with no feedback loop to close the gap.
- **Evidence strength is invisible.** The player doesn't know whether their evidence was scored as "none," "weak," "strong," or "smoking_gun." They can't learn from their mistakes because the grading is hidden.

### 5. Replayability Is Near Zero

- **One case, one solution, one killer.** Once you know Noah did it, there's nothing to discover on replay. The mystery is the entire game, and it's solved permanently.
- **No procedural variation.** The evidence, NPCs, secrets, and timeline are fixed. Unlike Return of the Obra Dinn (fixed content, many deductions) or Disco Elysium (branching outcomes), there's no reason to approach the case differently a second time.
- **The grading system doesn't create replay motivation.** Getting a "Plea Deal" instead of "Slam Dunk" might motivate a completionist, but the path to improvement is "talk to more people" rather than "try a fundamentally different approach."

### 6. UI/UX Friction Points

- **2851-line monolithic JavaScript file.** While not a player-facing issue, the single-file architecture makes iteration difficult. Adding new features or fixing bugs is harder than it needs to be, which slows the design iteration cycle.
- **No conversation log across NPCs.** The player can only see conversation history for the currently selected NPC. There's no way to cross-reference what Amelia said against what Eddie said without switching back and forth and relying on memory.
- **The notes system is just a textarea.** For a game that requires connecting dots across 9 NPCs and 17 evidence types, a plain text box is insufficient. Structured notes, tagging, or at minimum a split-screen view would substantially improve the investigation experience.
- **No keyboard shortcuts or quick navigation.** In a text-heavy game where you're constantly typing and switching between NPCs, the lack of hotkeys (Esc to go back, number keys for NPCs, etc.) creates unnecessary friction.

### 7. The Voice System Is a Distraction

Voice I/O is technically impressive but design-questionable:

- **It undermines the interrogation fantasy.** Reading NPC responses and carefully analyzing their words is central to the detective experience. Audio playback is linear and harder to re-examine. Players can't skim, can't re-read a crucial phrase, can't compare statements side-by-side when listening to audio.
- **Silence detection at 1.5 seconds is aggressive.** Thinking pauses during an interrogation are natural. A player formulating a complex question will be cut off by the auto-stop.
- **It adds significant latency.** Each turn now requires: transcription API call → chat pipeline → TTS API call, roughly tripling the response time versus text-only interaction.

---

## Design Observations (Neither Strength nor Weakness)

### The "No Questions" Prompt Rule

The instruction that NPCs should never end on a question is the right call for interrogation dynamics, but it also makes NPCs feel oddly passive. Real suspects do push back with questions ("Am I under arrest?", "Do I need a lawyer?"). The current implementation trades some realism for better gameplay flow. This is a reasonable tradeoff but worth acknowledging.

### Serbian Localization

Supporting Serbian with gender-correct grammar is unusual and specific. It suggests a target audience rather than a design philosophy. The i18n system is functional but the dual-language approach makes content iteration more expensive — every string change requires two updates.

### The Conspiracy Subplot

The Amelia/Mira conspiracy is both a strength (it adds depth) and a potential confusion source. Players who crack the conspiracy first may spend too long investigating the wrong thread, believing the sabotage is connected to the murder. The game doesn't provide any mechanism to help the player distinguish "interesting secret" from "relevant to the murder."

---

## Recommendations (Prioritized)

### High Priority

1. **Add a structured deduction board** where players can link evidence and form theories. Even a simple "connect two discoveries" mechanic would transform the investigation from a memory exercise into an active reasoning game.
2. **Surface tactical feedback.** After each exchange, show the player what tactic was detected and what evidence strength was scored. This closes the feedback loop and lets players learn the system.
3. **Add mechanical secret gates.** Don't rely solely on the LLM to guard secrets. Implement hard gates: "Discovery X cannot fire unless pressure >= 50 OR rapport >= 60 OR discovery Y was already collected." This makes the game deterministically fair.
4. **Improve Lila's hint system.** Make hints context-aware: track what the player has found, what's missing, and generate specific suggestions ("You've established motive but not opportunity — who might have seen Noah near the service elevator?").

### Medium Priority

5. **Add a conversation search or log.** Let players search across all NPC conversations for keywords, or provide a unified timeline view of all statements.
6. **Show archetype hints.** After the first few exchanges with an NPC, surface their personality tendency ("This suspect seems guarded and methodical — direct confrontation may be less effective than building trust").
7. **Add pacing pressure.** Not necessarily a timer, but escalating narrative stakes: "Suspects are requesting lawyers," "The DA is pressuring for an arrest," "A suspect wants to leave." Something to prevent indefinite stalling.
8. **Consider a stronger default LLM.** GPT-3.5-turbo as the default generation model is a cost optimization that directly undermines the core experience. The nuance required for consistent NPC behavior — holding secrets, cracking under specific conditions, maintaining knowledge boundaries — likely exceeds what 3.5 can reliably deliver.

### Lower Priority

9. **Add a post-game case recap** that shows the full timeline, what the player missed, and how the pieces connected. This serves both the narrative payoff and helps players understand the systems for a potential second case.
10. **Plan for multiple cases.** The engine is case-agnostic, which is excellent. But without a second case, the architecture is theoretical. Building even a short second mystery would validate the engine design and provide content for returning players.

---

## Bottom Line

Echoes in the Atrium has the bones of a genuinely good detective game. The mystery is well-crafted, the interrogation mechanics are thoughtfully designed, and the NPC prompt engineering is among the better implementations in the LLM game space. The fundamental problem is that the game is a mechanics engine with a great story poured into it, but without enough player-facing design to make the mechanics legible and the story navigable. A player who already understands interrogation tactics, who carefully reads every response, and who takes meticulous notes will have a great time. Everyone else will bounce off the opacity. The gap between the system's depth and the player's ability to perceive that depth is where the design work remains.
