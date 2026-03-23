(function() {
  const keys = {
    // ── Title card ──
    "intro.subtitle": "A Post-Party Investigation",

    // ── Case briefing (case board) ──
    "intro.briefing_label": "The Tea",

    // Section: What Happened
    "intro.section_situation": "What Happened",
    "intro.setting": "Last night was the big pre-wedding weekend. The guys had a bachelor party at a rented lake house outside town. The girls went bar-hopping downtown for the bachelorette. You and Nadia left the bachelorette early \u2014 but apparently some of the girls ended up at the lake house later that night.",
    "intro.nadia_suspicion": "<strong>The problem:</strong> Nadia\u2019s boyfriend Devon disappeared for about 30 minutes at the bachelor party around 1 AM. Nobody knew where he was. When he got home at 4 AM, he smelled like someone else\u2019s cologne \u2014 something expensive and musky, definitely not his. He claimed he \u201chad a headache\u201d and \u201cwent to lie down.\u201d At a bachelor party. At 1 AM.",

    // Section: What We Know
    "intro.section_starting_evidence": "What We Know",
    "intro.cologne_clue": "The mystery cologne is the biggest red flag. It\u2019s not Devon\u2019s \u2014 Nadia knows every cologne he owns. It smells like Tom Ford Oud Wood, which is expensive and distinctive. Someone was close enough to leave that scent on him.",
    "intro.nadia_note": "Nadia\u2019s gut is screaming that something happened. Devon has been weirdly clingy and overcompensating since he got home. That\u2019s not like him. Something doesn\u2019t add up.",

    // Section: The Plan
    "intro.section_assignment": "The Plan",
    "intro.assignment": "Everyone from both parties is doing brunch at the hotel restaurant before people leave town. You and your bestie <strong>Nadia</strong> are going to casually talk to people and figure out what actually happened last night. Nobody has to know you\u2019re investigating.",
    "intro.tip": "<strong>Investigation Tips</strong><br>\u2022 <em>Build trust</em> \u2014 people spill more when they feel like it\u2019s just a casual conversation, not an interrogation.<br>\u2022 <em>Cross-reference</em> \u2014 what one person says can be used to get the truth from someone else.<br>\u2022 <em>Watch for contradictions</em> \u2014 if stories don\u2019t match, someone is lying.<br>\u2022 <em>Ask specific questions</em> \u2014 vague questions get vague answers. Details make people slip up.",

    // ── NPC roles ──
    "role.nadia-okafor":  "Your Bestie",
    "role.sam-deluca":    "Your Partner",
    "role.devon-james":   "Nadia\u2019s Boyfriend",
    "role.rafi-ansari":   "Groom\u2019s College Friend",
    "role.val-park":      "Bride\u2019s Sorority Sister",
    "role.marco-delgado": "Groom\u2019s Cousin",
    "role.tanya-rhodes":  "Maid of Honor",

    // ── Evidence panel ──
    "evidence.tab": "Evidence and Discoveries",
    "evidence.dossiers_tab": "Dossiers",
    "evidence.timeline_tab": "Timeline",
    "evidence.empty": "No tea collected yet. Talk to people at brunch to find out what happened.",
    "evidence.timeline_empty": "Events will appear here as you piece together what went down last night.",
    "evidence.mentioned_by": "Mentioned by {name} during brunch.",
    "evidence.mentioned_by_partner": "Shared by {name} before brunch.",
    "evidence.crime_scene": "Noticed by Nadia after the party.",

    // ── Evidence descriptions ──
    "evidence.devon-missing-30min_desc": "Devon vanished for about 30 minutes at the bachelor party around 1 AM. Nobody at the party knew where he went. Nadia heard this from Jess\u2019s roommate who was texting people there.",
    "evidence.mystery-cologne_desc": "When Devon got home at 4 AM, he smelled like someone else\u2019s cologne \u2014 expensive, musky, possibly Tom Ford Oud Wood. Definitely not his.",

    // ── Evidence labels ──
    "evidence.devon-missing-30min_label":     "Devon\u2019s Missing Half Hour",
    "evidence.mystery-cologne_label":         "The Mystery Cologne",
    "evidence.devon-upstairs_label":          "Devon Went Upstairs",
    "evidence.rafi-upstairs_label":           "Rafi Was Upstairs Too",
    "evidence.dating-app-connection_label":   "The Dating App Match",
    "evidence.devon-rafi-bar-chat_label":     "Devon & Rafi Were Chatty",
    "evidence.devon-phone-alibi-false_label": "Devon\u2019s Headache Story Is False",
    "evidence.val-marco-bedroom_label":       "Val & Marco in the Bedroom",
    "evidence.val-inside-out-top_label":      "Val\u2019s Inside-Out Top",
    "evidence.val-marco-together_label":      "Val & Marco Left Together",
    "evidence.val-has-boyfriend_label":       "Val Is Taken",
    "evidence.deleted-instagram_label":       "The Deleted Instagram Story",
    "evidence.garden-deck-hookup_label":      "The Late-Night Hookup",

    // ── Evidence groups ──
    "evidence.group_physical":  "Physical Evidence",
    "evidence.group_testimony": "Witness Testimony",
    "evidence.group_timeline":  "Timeline",
    "evidence.group_receipts":  "Receipts",

    // ── Discovery texts ──
    "discovery.sam-saw-devon-upstairs":     "Sam saw Devon go upstairs around 12:45 AM, saying he had a headache.",
    "discovery.sam-saw-rafi-upstairs":      "Sam noticed Rafi heading upstairs around the same time as Devon.",
    "discovery.sam-devon-sweaty":           "Sam says Devon came back downstairs around 1:15 AM looking kind of sweaty.",
    "discovery.sam-saw-val-marco":          "Sam saw Val and Marco getting cozy after the bachelorette girls showed up.",
    "discovery.devon-admits-upstairs":      "Devon admits he went upstairs at the lake house, not just \u201cresting in the living room.\u201d",
    "discovery.devon-admits-rafi":          "Devon admits he and Rafi knew each other from a dating app before the party.",
    "discovery.devon-full-confession":      "Devon confesses to hooking up with Rafi in a guest bedroom upstairs at the lake house.",
    "discovery.devon-saw-val-disheveled":   "Devon saw Val leaving a bedroom with her top on inside-out.",
    "discovery.rafi-dating-app":            "Rafi reveals he and Devon matched on a dating app a few weeks before the bachelor party.",
    "discovery.rafi-admits-hookup":         "Rafi admits he and Devon hooked up upstairs during the bachelor party.",
    "discovery.rafi-saw-val-marco":         "Rafi saw Marco and Val making out in the kitchen around 2 AM.",
    "discovery.val-admits-lake-house":      "Val admits she went to the lake house from the bachelorette party late that night.",
    "discovery.val-admits-hookup":          "Val confesses she and Marco hooked up in a guest bedroom at the lake house.",
    "discovery.val-has-bf-blake":           "Val reveals she has a boyfriend named Blake who wasn\u2019t at either party.",
    "discovery.val-saw-devon-rafi-chatty":  "Val saw Devon and Rafi talking intensely early in the evening, like they already knew each other.",
    "discovery.val-deleted-story":          "Val admits she posted and then deleted an Instagram story from the lake house at 3 AM.",
    "discovery.marco-admits-hookup":        "Marco confesses he and Val hooked up in a guest bedroom at the lake house.",
    "discovery.marco-val-has-bf":           "Marco admits he knew Val has a boyfriend when they hooked up.",
    "discovery.marco-saw-devon-rafi-stairs": "Marco saw Devon and Rafi going upstairs together around 12:50 AM while he was getting a beer.",
    "discovery.marco-deleted-insta":        "Marco saw Val post and then delete an Instagram story from the lake house around 3 AM.",
    "discovery.tanya-saw-devon-flushed":    "Tanya saw Devon coming downstairs around 1:15 AM looking flushed and rattled \u2014 before the bachelorette girls even arrived.",
    "discovery.tanya-saw-rafi-quiet":       "Tanya noticed Rafi acting weird and quiet when she arrived at the lake house, like he was avoiding eye contact.",
    "discovery.tanya-saw-val-marco-bedroom": "Tanya saw Val and Marco disappear into a guest bedroom together around 2:30 AM.",
    "discovery.tanya-val-top":              "Tanya noticed Val\u2019s top was inside-out when she came out of the bedroom.",
    "discovery.tanya-devon-texting":        "Tanya heard from someone at the bachelorette that Devon was texting intensely all evening at the bachelor party.",
    "discovery.tanya-val-bf":              "Tanya confirms Val has a boyfriend named Blake \u2014 they\u2019ve been together for over a year.",

    // ── Dossier labels ──
    "dossier.discoveries_heading": "Discoveries",
    "dossier.no_discoveries": "No tea on this person yet.",
    "dossier.new_badge": "NEW",

    // ── Dossier bios ──
    "dossier.nadia-okafor.bio":  "Your ride-or-die best friend. Dramatic, loyal, and funny \u2014 she oscillates between detective energy and emotional vulnerability. She\u2019s been dating Devon for two years and something about last night has her gut screaming. She\u2019s counting on you to help her figure it out.",
    "dossier.sam-deluca.bio":    "Your boyfriend. Sweet, a little spacey, and an open book. He was at the bachelor party all night and genuinely wants to help, but he gets flustered when the questions feel like an interrogation. Ask him specific things and he\u2019ll come through.",
    "dossier.devon-james.bio":   "Nadia\u2019s boyfriend of two years. Charming, image-conscious, and a smooth talker. He\u2019s been weirdly clingy since the bachelor party and his story about having a headache doesn\u2019t add up. The hardest person to crack.",
    "dossier.rafi-ansari.bio":   "The groom\u2019s college friend. Thoughtful, reserved, and quietly witty. He\u2019s openly gay among close friends and came to the bachelor party solo. Something about last night has him on edge, but he seems like a fundamentally decent person.",
    "dossier.val-park.bio":      "One of the bride\u2019s sorority sisters. Glamorous, confident, and a little mean. She was at the bachelorette but ended up at the lake house later that night. Performatively unbothered by everything, which makes you wonder what she\u2019s hiding.",
    "dossier.marco-delgado.bio": "The groom\u2019s cousin. Friendly, bro-ish, and terrible at hiding things. He wears his heart on his sleeve and uses \u201chonestly\u201d and \u201clike\u201d in every sentence. If he\u2019s hiding something, he won\u2019t be hiding it for long.",
    "dossier.tanya-rhodes.bio":  "The maid of honor. Sharp, organized, and slightly exasperated by everyone else\u2019s drama. She was the sober-ish responsible one at both parties and saw everything. She\u2019s not hiding anything herself, but she\u2019s gatekeeping gossip to protect the wedding weekend.",

    // ── Conversation starters (3 per NPC) ──
    "starter.nadia-okafor.1": "Okay, walk me through it \u2014 what exactly happened last night?",
    "starter.nadia-okafor.2": "The cologne thing is wild. Are you sure it wasn\u2019t his?",
    "starter.nadia-okafor.3": "Who should we talk to first?",

    "starter.sam-deluca.1": "Hey babe, tell me about the bachelor party \u2014 what was the vibe?",
    "starter.sam-deluca.2": "Did you notice anything weird with Devon last night?",
    "starter.sam-deluca.3": "Who was hanging out with who at the lake house?",

    "starter.devon-james.1": "So Devon \u2014 how was the bachelor party?",
    "starter.devon-james.2": "I heard you stepped away for a bit last night. Everything okay?",
    "starter.devon-james.3": "Nadia said you got home pretty late. What time did things wrap up?",

    "starter.rafi-ansari.1": "Hey Rafi, how do you know the groom?",
    "starter.rafi-ansari.2": "What was the bachelor party like? Have fun?",
    "starter.rafi-ansari.3": "Were you at the lake house the whole night?",

    "starter.val-park.1": "Val! How was the bachelorette? I\u2019m so bummed we left early.",
    "starter.val-park.2": "I heard some of you ended up at the lake house?",
    "starter.val-park.3": "Did anything fun happen after we left?",

    "starter.marco-delgado.1": "Marco! How was the bachelor party, dude?",
    "starter.marco-delgado.2": "Did anything interesting happen at the lake house?",
    "starter.marco-delgado.3": "Were you up late? What time did people start leaving?",

    "starter.tanya-rhodes.1": "Tanya, you were at the bachelorette AND the lake house? You must be exhausted.",
    "starter.tanya-rhodes.2": "As maid of honor, how are you feeling about the wedding after last night?",
    "starter.tanya-rhodes.3": "Did you notice anything weird when you got to the lake house?",

    // ── Chat hint display (case-specific partner hints) ──
    "chat.hint_display.0": "Girl, where should we focus next?",
    "chat.hint_display.1": "Walk me through what we know so far.",
    "chat.hint_display.2": "Who should we talk to next?",
    "chat.hint_display.3": "Okay wait \u2014 does any of this add up to you?",
    "chat.hint_display.4": "Nadia, what\u2019s your gut telling you right now?",
    "chat.hint_display.5": "I feel like we\u2019re missing something. What do you think?",
    "chat.hint_display.6": "Give me the rundown \u2014 where do we stand?",
    "chat.hint_display.7": "Who\u2019s being the most suspicious so far?",
    "chat.hint_display.8": "I need a fresh perspective. What are we not seeing?",
    "chat.hint_display.9": "Talk me through it \u2014 what have we figured out?",

    // ── Endgame ──
    "endgame.title": "We\u2019ve Got Enough Tea",
    "endgame.description": "You\u2019ve gathered enough evidence to confront Devon at brunch. Review what you\u2019ve got, make the confrontation, or keep digging for more details.",
    "endgame.review": "Review Evidence",
    "endgame.accuse": "Confront at Brunch",
    "endgame.continue": "Keep Investigating",
    "endgame.accuse_cta": "Ready to Spill?",

    // ── Outcome screen ──
    "outcome.slam_dunk_title": "Full Receipts \u2014 Case Closed",
    "outcome.slam_dunk_text": "<p>You lay it all out over mimosas. <strong>{name}</strong> goes pale.</p><p>Devon hooked up with Rafi in a guest bedroom at the lake house during the bachelor party. They matched on a dating app weeks before and used the party as cover. The mystery cologne was Rafi\u2019s Tom Ford Oud Wood. The \u201cheadache\u201d was a lie.</p><p>Nadia\u2019s eyes fill with tears \u2014 then harden. \u201cWe\u2019re done.\u201d The table goes silent. You had the receipts. Nadia squeezes your hand under the table. Ride or die.</p><p style=\"margin-top:1rem; color:var(--gold);\">Evidence collected: {evidenceCount} items &bull; People interviewed: {interviewCount}</p>",
    "outcome.plea_deal_title": "Suspicious but Not Conclusive",
    "outcome.plea_deal_text": "<p>You present what you\u2019ve got to the table, and it\u2019s clear <strong>{name}</strong> is hiding something.</p><p>But there are gaps in your evidence. Devon denies everything and plays the victim card. Nadia believes you \u2014 she can feel it in her gut \u2014 but she can\u2019t confront him with full confidence.</p><p>You gave her a head start, but the case isn\u2019t closed. She\u2019ll be watching him closely from here on out.</p><p style=\"margin-top:1rem; color:var(--gold);\">Evidence collected: {evidenceCount} items &bull; People interviewed: {interviewCount}</p>",
    "outcome.released_title": "Right Person, Wrong Proof",
    "outcome.released_text": "<p>You point the finger at <strong>{name}</strong>, and your instinct is correct \u2014 he did cheat.</p><p>But without evidence to back it up, it\u2019s just vibes. Devon laughs it off. \u201cYou\u2019re being dramatic.\u201d Nadia mouths \u201cwhat are you doing?\u201d from across the table.</p><p>Being right without proof is just gossip. And gossip without receipts doesn\u2019t stick.</p><p style=\"margin-top:1rem; color:var(--gold);\">Evidence collected: {evidenceCount} items &bull; People interviewed: {interviewCount}</p>",
    "outcome.wrong_title": "Wrong Person",
    "outcome.wrong_text": "<p>You confront <strong>{name}</strong> at brunch, but they\u2019re not the one who cheated.</p><p>The table stares. Devon relaxes visibly. Brunch is ruined and the truth stays hidden. Nadia is mortified and you\u2019ve lost your shot at catching the real story.</p><p style=\"margin-top:1rem; color:var(--text-faint);\">Keep investigating \u2014 pay attention to timelines, cross-reference stories, and follow the cologne.</p>",
    "outcome.restart": "New Investigation",

    // ── Title card ──
    "titlecard.open": "Open the Group Chat",
    "titlecard.case_number": "Case #BFF-001",
    "titlecard.division": "Bestie Division \u2014 Gossip Bureau",

    // ── Toast messages (case-specific) ──
    "toast.subpoena": "Nobody\u2019s under oath here \u2014 keep it casual and people will open up. What they tell you about what they saw is the real evidence.",
  };

  if (!window.I18N) window.I18N = {};
  if (!window.I18N.en) window.I18N.en = {};
  Object.assign(window.I18N.en, keys);
})();
