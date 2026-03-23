# Case Design: "Something Borrowed, Someone New"

## Context

Adding a second, lighthearted detective case to the game engine. Instead of solving a murder, the player and their bestie investigate who cheated on their partners at a bachelor party weekend. The existing engine supports all needed mechanics (evidence, discoveries, gated secrets, accusation grading) — we just need new case content.

**Setting:** The night before a wedding. Guys had a bachelor party at a rented lake house. Girls had a bachelorette bar-hopping downtown. Late in the night, some bachelorette girls showed up at the lake house. The player and their bestie (Nadia) left the bachelorette early and missed the crossover — now they're reconstructing what happened over brunch the next morning.

**Tagline:** *"The vows said 'forsaking all others.' Not everyone was listening."*

---

## NPC Roster (7 NPCs)

### 1. Nadia Okafor — Your Bestie (Partner NPC)
- **ID:** `nadia-okafor` | **Archetype:** `professional_fixer` | **Voice:** `nova`
- **Role:** Player's ride-or-die best friend. The "Lila" of this case — provides guidance, reacts to discoveries, suggests who to talk to next
- **Personality:** Dramatic, loyal, funny. Uses slang and hyperbole ("the math is not mathing," "I am NOT crazy, right?"). Oscillates between detective energy and emotional vulnerability
- **What she knows (starting intel):**
  - Devon disappeared for ~30 min around 11 PM at the bachelor party (she heard from another bachelorette girl)
  - When Devon got home, he smelled like cologne that wasn't his (Tom Ford Oud Wood)
  - Devon was weird and clingy in the car home — not like him
  - She heard some bachelorette girls ended up at the lake house late
- **NOT interrogated** — she's the partner NPC

### 2. Sam DeLuca — Your Partner
- **ID:** `sam-deluca` | **Archetype:** `anxious_insider` | **Voice:** `echo`
- **Age:** 29 | **Gender:** male
- **Role:** Player's boyfriend. Was at the bachelor party. Loyal, a bit oblivious to drama
- **Personality:** Sweet, spacey, rambles about tangents (the music, the food, beer pong scores). Open book but gets flustered being interrogated by his own partner. Over-explains innocently
- **What he saw:**
  - Devon went upstairs around 10:45 PM ("said he had a headache")
  - Saw Rafi heading upstairs around the same time
  - Some bachelorette girls (including Val) showed up around 11:30 PM
  - Marco and Val were "all over each other" by midnight
  - Devon came back downstairs around 11:15 PM looking "kinda sweaty"
- **Hiding:** Nothing. He's nervous because interrogation vibes are stressful
- **Cracks under:** Minimal pressure — he wants to help, just needs specific questions

### 3. Devon James — Nadia's Boyfriend (Main Cheater)
- **ID:** `devon-james` | **Archetype:** `proud_executive` | **Voice:** `ash`
- **Age:** 30 | **Gender:** male
- **Role:** Nadia's boyfriend of 2 years. Closeted bisexual. Hooked up with Rafi in a bedroom upstairs at the lake house
- **Personality:** Charming, image-conscious, smooth deflector. Under pressure: quiet and controlled, not panicky. Terrified of being outed — not from shame, but because he hasn't figured himself out yet and this isn't how he wants Nadia to find out
- **Cover story:** Went upstairs because he had a headache, lay down in a guest room for 30 minutes, came back
- **Where it breaks:**
  - No one else saw him "resting" alone — Rafi was up there too
  - The cologne (Tom Ford Oud Wood) is Rafi's signature, not something from lying on a pillow
  - He and Rafi were matched on a dating app weeks before the party
  - Sam saw both him AND Rafi go upstairs at the same time
- **Discovery escalation:** Full denial → admits going upstairs → admits knowing Rafi → full confession
- **Smoking gun:** `dating-app-connection`

### 4. Rafi Ansari — The Guy Devon Cheated With
- **ID:** `rafi-ansari` | **Archetype:** `anxious_insider` | **Voice:** `fable`
- **Age:** 31 | **Gender:** male
- **Role:** Groom's college friend. Openly gay among close friends. Single. Hooked up with Devon
- **Personality:** Thoughtful, quietly witty, reserved. Feels guilty — not because he did anything wrong as a single man, but because he knew Devon had a girlfriend. Protective of Devon's privacy. Fundamentally decent, hates lying
- **Cover story:** Was at the party all night, stepped outside for a smoke around 11 PM
- **Where it breaks:**
  - No one saw him outside at 11 PM
  - Sam saw him go upstairs at the same time as Devon
  - The dating app messages exist
  - If confronted with Devon being upstairs, his "outside smoking" story collapses
- **Key info he also has:** Saw Marco and Val making out in the kitchen around midnight (after he came back downstairs)
- **Cracks via:** Empathy and rapport more than pressure. If you're kind about it, he'll open up. Pressure makes him shut down and protect Devon harder
- **Smoking gun:** `mystery-cologne` (it's his cologne on Devon)

### 5. Val Park — Bachelorette Girl Who Cheated
- **ID:** `val-park` | **Archetype:** `proud_executive` | **Voice:** `coral`
- **Age:** 27 | **Gender:** female
- **Role:** Bride's sorority sister. Was at the bachelorette. Has a boyfriend (Blake, not at either party). Ended up at the lake house with some other girls around 11:30 PM. Hooked up with Marco
- **Personality:** Glamorous, confident, a little mean. Performatively unbothered. Drops brand names. Not very remorseful — "Blake and I are on a break, basically"
- **Cover story:** Went to the lake house "just to hang out," talked to Marco on the deck, nothing happened
- **Where it breaks:**
  - Her top was inside-out when she left (physical evidence others noticed)
  - Marco is a terrible liar and will crack immediately
  - Tanya saw them go into a bedroom together
  - She posted then deleted an Instagram story at the lake house at 1 AM (screenshot exists)
- **Smoking gun:** `val-inside-out-top`

### 6. Marco Delgado — Single Guy Val Hooked Up With
- **ID:** `marco-delgado` | **Archetype:** `anxious_insider` | **Voice:** `onyx`
- **Age:** 29 | **Gender:** male
- **Role:** Groom's cousin. Single. Has had a crush on Val for years. Hooked up with her in a guest bedroom at the lake house
- **Personality:** Friendly, bro-ish, heart on his sleeve. TERRIBLE liar. Uses "bro" and "honestly" and "like" constantly. Thrilled about the hookup but feels guilty knowing she has a boyfriend. The weakest link — cracks fast
- **What he also saw:**
  - Devon and Rafi going upstairs together around 10:50 PM (was getting a beer from the kitchen)
  - This is CRUCIAL cross-reference evidence for the main mystery
- **Cover story:** "Just hung out, played beer pong, talked to people"
- **Where it breaks:** He contradicts himself within minutes. Ask him anything specific and he fumbles
- **Smoking gun:** `val-marco-bedroom`

### 7. Tanya Rhodes — Maid of Honor / Key Witness
- **ID:** `tanya-rhodes` | **Archetype:** `professional_fixer` | **Voice:** `shimmer`
- **Age:** 28 | **Gender:** female
- **Role:** Bride's maid of honor. Was at the bachelorette, then went to the lake house with the crossover group around 11:30 PM. Saw EVERYTHING because she was the sober-ish responsible one
- **Personality:** Sharp, organized, exasperated. Wedding planner energy. Not hiding anything herself — she's gatekeeping gossip because she doesn't want drama to ruin the wedding weekend. Needs to feel like sharing is justified
- **What she saw:**
  - Devon coming downstairs around 11:15 PM looking flushed (before the bachelorette girls even arrived)
  - Rafi already downstairs acting "weird and quiet" when she arrived
  - Val and Marco disappearing into a guest bedroom around 12:30 AM
  - Val's top was inside-out when she came out
  - Devon texting intensely at the beginning of the night (she was shown this by someone at the bachelorette who was texting people at the bachelor party)
- **Cracks via:** Establishing that you need this info to protect Nadia. She's protective of the bride's friend group, so appeal to loyalty

---

## Evidence System

### Evidence Categories

| ID | Label | Type |
|----|-------|------|
| `devon-missing-30min` | Devon's Missing Half Hour | timeline |
| `mystery-cologne` | The Mystery Cologne | physical |
| `devon-upstairs` | Devon Went Upstairs | testimony |
| `rafi-upstairs` | Rafi Was Upstairs Too | testimony |
| `dating-app-connection` | The Dating App Match | receipts |
| `devon-rafi-bar-chat` | Devon & Rafi Were Chatty | testimony |
| `devon-phone-alibi-false` | Devon's Headache Story is False | testimony |
| `val-marco-bedroom` | Val & Marco in the Bedroom | testimony |
| `val-inside-out-top` | Val's Inside-Out Top | physical |
| `val-marco-together` | Val & Marco Left Together | testimony |
| `val-has-boyfriend` | Val Is Taken | receipts |
| `deleted-instagram` | The Deleted Instagram Story | receipts |
| `garden-deck-hookup` | The Late-Night Hookup | timeline |

### Evidence Groups

```
physical:    ["mystery-cologne", "val-inside-out-top"]
testimony:   ["devon-upstairs", "rafi-upstairs", "devon-rafi-bar-chat", "devon-phone-alibi-false", "val-marco-together", "val-marco-bedroom"]
timeline:    ["devon-missing-30min", "garden-deck-hookup"]
receipts:    ["dating-app-connection", "val-has-boyfriend", "deleted-instagram"]
```

### Starting Evidence (from Nadia at brunch)

1. `devon-missing-30min` — "Devon was MIA for like 30 minutes at the bachelor party. I heard from Jess's roommate who was texting people there."
2. `mystery-cologne` — "When he got home he smelled like someone else's cologne. Expensive. Musky. Not his."

### Discovery Catalog (26 discoveries)

**From Sam (easy, cooperative):**
| Discovery | Evidence | Description |
|-----------|----------|-------------|
| `sam-saw-devon-upstairs` | `devon-upstairs` | Sam saw Devon go upstairs around 10:45 PM saying he had a headache |
| `sam-saw-rafi-upstairs` | `rafi-upstairs` | Sam noticed Rafi heading upstairs around the same time |
| `sam-devon-sweaty` | `devon-missing-30min` | Devon came back downstairs around 11:15 looking sweaty |
| `sam-saw-val-marco` | `val-marco-together` | Sam saw Val and Marco getting cozy after the bachelorette girls arrived |

**From Devon (hardest to crack):**
| Discovery | Evidence | Description |
|-----------|----------|-------------|
| `devon-admits-upstairs` | `devon-upstairs` | Devon admits he went upstairs, not just "resting in the living room" |
| `devon-admits-rafi` | `dating-app-connection` | Devon admits he and Rafi knew each other from a dating app |
| `devon-full-confession` | `dating-app-connection` | Devon confesses to hooking up with Rafi upstairs |
| `devon-saw-val-disheveled` | `val-inside-out-top` | Devon saw Val leaving a bedroom with her top inside-out |

**From Rafi (cracks via empathy):**
| Discovery | Evidence | Description |
|-----------|----------|-------------|
| `rafi-dating-app` | `dating-app-connection` | Rafi reveals he and Devon matched on a dating app weeks before |
| `rafi-admits-hookup` | `dating-app-connection` | Rafi admits to the hookup with Devon |
| `rafi-saw-val-marco` | `val-marco-bedroom` | Rafi saw Marco and Val making out in the kitchen around midnight |

**From Val (proud, deflects):**
| Discovery | Evidence | Description |
|-----------|----------|-------------|
| `val-admits-lake-house` | `garden-deck-hookup` | Val admits she went to the lake house from the bachelorette |
| `val-admits-hookup` | `garden-deck-hookup` | Val confesses she and Marco hooked up |
| `val-has-bf-blake` | `val-has-boyfriend` | Val reveals she has a boyfriend Blake who wasn't at either party |
| `val-saw-devon-rafi-chatty` | `devon-rafi-bar-chat` | Val saw Devon and Rafi talking intensely early in the night |
| `val-deleted-story` | `deleted-instagram` | Val admits she posted and deleted an Instagram story from the lake house |

**From Marco (weakest link, cracks fast):**
| Discovery | Evidence | Description |
|-----------|----------|-------------|
| `marco-admits-hookup` | `val-marco-bedroom` | Marco confesses to hooking up with Val in a guest bedroom |
| `marco-val-has-bf` | `val-has-boyfriend` | Marco admits he knew Val has a boyfriend |
| `marco-saw-devon-rafi-stairs` | `devon-upstairs` | Marco saw Devon and Rafi going upstairs together around 10:50 PM |
| `marco-deleted-insta` | `deleted-instagram` | Marco saw Val post and delete an Instagram story at 1 AM |

**From Tanya (gatekeeps, needs justification):**
| Discovery | Evidence | Description |
|-----------|----------|-------------|
| `tanya-saw-devon-flushed` | `devon-phone-alibi-false` | Tanya saw Devon coming downstairs looking flushed around 11:15 PM |
| `tanya-saw-rafi-quiet` | `rafi-upstairs` | Tanya noticed Rafi acting "weird and quiet" when she arrived at the lake house |
| `tanya-saw-val-marco-bedroom` | `val-marco-bedroom` | Tanya saw Val and Marco disappear into a guest bedroom around 12:30 AM |
| `tanya-val-top` | `val-inside-out-top` | Tanya noticed Val's top was inside-out when she came out of the bedroom |
| `tanya-devon-texting` | `devon-rafi-bar-chat` | Tanya heard Devon was texting intensely all evening |
| `tanya-val-bf` | `val-has-boyfriend` | Tanya confirms Val has a boyfriend named Blake |

### Key Discovery Gates

```
# Devon — hardest to crack (proud_executive)
devon-admits-upstairs:    requires [devon-upstairs] + pressure 30, OR [sam-saw-devon-upstairs] + pressure 20
devon-admits-rafi:        requires [devon-admits-upstairs + rafi-dating-app] + pressure 50, OR [rafi-admits-hookup]
devon-full-confession:    requires [devon-admits-upstairs + devon-admits-rafi] + pressure 60, OR [rafi-admits-hookup] + pressure 30

# Rafi — cracks via empathy (anxious_insider)
rafi-dating-app:          requires rapport 70, OR pressure 40, OR [devon-rafi-bar-chat]
rafi-admits-hookup:       requires [rafi-dating-app] + rapport 85, OR [rafi-dating-app] + pressure 30, OR [devon-admits-rafi]

# Marco — weakest link (anxious_insider)
marco-admits-hookup:      requires pressure 15 OR rapport 40 (very easy)
marco-saw-devon-rafi-stairs: requires pressure 20 OR rapport 50

# Val — proud deflector (proud_executive)
val-admits-hookup:    requires [val-marco-together] + pressure 50, OR [marco-admits-hookup]
val-deleted-story:    requires pressure 40, OR [marco-deleted-insta]

# Tanya — gatekeeps (professional_fixer)
tanya-saw-val-marco-bedroom: requires pressure 25 OR rapport 50 OR mention of protecting Nadia
tanya-saw-devon-flushed:  requires rapport 40, OR [devon-upstairs] presented as context
```

### Investigation Paths

**Path A — Main mystery via Sam + Tanya (recommended):**
1. Nadia gives starting evidence (Devon missing + cologne)
2. Sam → Devon went upstairs, Rafi did too (contradicts Devon's headache story)
3. Tanya → Devon came down flushed, Rafi was acting weird
4. Confront Devon with upstairs evidence → partial admission
5. Rafi via empathy → dating app connection
6. Confront Devon with full picture → confession

**Path B — Main mystery via Marco (accidental cross-reference):**
1. Investigate Val/Marco first (easier)
2. Marco accidentally reveals seeing Devon and Rafi go upstairs together
3. Use this to crack Rafi or Devon directly

**Path C — Secondary mystery (Val + Marco):**
1. Sam mentions Val and Marco were "all over each other"
2. Marco cracks immediately under any pressure
3. Tanya confirms she saw them go into a bedroom
4. Confront Val with Marco's admission + Tanya's testimony

---

## Accusation / Brunch Reveal

**Primary target:** `devon-james` (maps to engine's `culpritNpcId`)

**Motive discoveries** (who he was with / why):
- `devon-admits-rafi`, `rafi-dating-app`, `devon-rafi-bar-chat`

**Opportunity discoveries** (proof he was there):
- `devon-admits-upstairs`, `sam-saw-devon-upstairs`, `sam-saw-rafi-upstairs`, `tanya-saw-devon-flushed`, `marco-saw-devon-rafi-stairs`

**Canonical evidence** (minimum for "case ready"):
- `devon-upstairs`, `rafi-upstairs`, `mystery-cologne`, `dating-app-connection`

### Outcome Grades

| Grade | Criteria | Scene |
|-------|----------|-------|
| **Slam Dunk** | Has motive AND opportunity discoveries | You lay it all out over mimosas. Devon goes pale. Nadia's eyes fill with tears — then harden. "We're done." The table goes silent. You had the receipts. Nadia squeezes your hand under the table. Ride or die. |
| **Plea Deal** | Has motive OR opportunity, not both | You present what you've got, but there are gaps. Devon denies it. Nadia believes you but can't confront definitively. You gave her a head start, but the case isn't closed. |
| **Released** | Correct target, minimal evidence | You point the finger but it's vibes, not evidence. Devon laughs it off. Nadia mouths "what are you doing?" Being right without proof is just gossip. |
| **Wrong Suspect** | Wrong target | The table stares. That's... not what happened. Devon relaxes visibly. Brunch is ruined and the truth stays hidden. |

---

## Briefing Text (Nadia's Brunch Kickoff)

> *[Sunday morning brunch. A diner booth. Nadia slides in across from you, sunglasses on, iced coffee already half-gone.]*
>
> Okay. OKAY. I need you to not think I'm being crazy right now.
>
> So you know how we left the bachelorette early? And Devon was at the bachelor party at that lake house? He got home at like 2 AM and I was already in bed but I WOKE UP because he smelled... different. Like, not his cologne. Something expensive and musky? Tom Ford maybe?
>
> And then this morning I'm scrolling and Jess's roommate texts me that apparently Devon just like VANISHED for half an hour during the party. Nobody knew where he was.
>
> I asked him about it and he said he "had a headache" and "went to lie down." At a bachelor party. At 11 PM. With a headache.
>
> Everyone's doing brunch at the hotel restaurant before people leave town. We can talk to people. Casually. Nobody has to know we're investigating.
>
> You're my person. Help me figure this out.

---

## World Context Adaptations

Key differences from the murder case:
1. **Not a police investigation** — friends doing gossip detective work over brunch
2. **No physical evidence handling rules** — no subpoenas, but social pressure to not snitch
3. **Casual brunch conversation tone** — NPCs gossip, deflect with humor, change subjects
4. **Social stakes, not legal** — relationships, reputations, friendships
5. **NPC refusal mode:** "That's none of your business" / "I'm not getting involved" / "Why are you asking me this?"

---

## Implementation Plan

### Files to Create

**Server-side** (`server/cases/something_borrowed_someone_new/`):
1. `__init__.py` — Case assembly (follow `echoes_in_the_atrium/__init__.py` pattern)
2. `world_context.py` — Shared world prompt (bachelor party setting, NPC list, response rules, gossip tone)
3. `archetypes.py` — NPC → archetype mapping
4. `npc_profiles.py` — 7 NPCProfile objects with system prompts + timelines
5. `timelines.py` — First-person timeline for each NPC
6. `evidence.py` — Evidence catalog, discovery catalog, gates, smoking guns, NPC-relevant evidence

**Frontend** (`web/cases/something-borrowed-someone-new/`):
7. `case.js` — Case manifest (`window.CASE`)
8. `i18n-en.js` — All English text (briefing, NPC roles, bios, starters, evidence labels, discoveries, outcomes)
9. `portraits/` — 7 NPCs × 6 expressions (42 portrait images — placeholder/generate later)

**Config:**
10. Update `server/config.py` to support case selection
11. Update `web/index.html` to load new case files (or make case loading dynamic)

### Reference Files (templates to follow)
- `server/cases/echoes_in_the_atrium/__init__.py`
- `server/cases/echoes_in_the_atrium/evidence.py`
- `server/cases/echoes_in_the_atrium/npc_profiles.py`
- `server/cases/echoes_in_the_atrium/world_context.py`
- `server/cases/echoes_in_the_atrium/timelines.py`
- `server/cases/echoes_in_the_atrium/archetypes.py`
- `web/cases/echoes-in-atrium/case.js`
- `web/cases/echoes-in-atrium/i18n-en.js`
- `docs/case-creation-guide.md` — The definitive guide to follow

### Verification
1. Run cross-reference validation checks from the case creation guide (all discovery evidence_ids exist, all NPC IDs match, etc.)
2. Start dev server: `uvicorn server.app:app --port 8000`
3. Verify case loads in browser, NPC grid shows 7 characters
4. Test interrogation flow with at least 2 NPCs to verify system prompts, discoveries, and gating work
5. Run `pytest` for any new backend tests
6. Run `cd web && npm test` for frontend tests
