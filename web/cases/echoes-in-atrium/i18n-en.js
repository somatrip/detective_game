(function() {
  const keys = {
    // ── Title card ──
    "intro.subtitle": "A Murder Mystery Investigation",

    // ── Case briefing (case board) ──
    "intro.briefing_label": "Case Briefing",
    "intro.victim": "<strong>Victim:</strong> Julian Mercer, charismatic venture capitalist, majority owner of the Lyric Atrium Hotel, and CEO of the Panopticon surveillance startup \u2014 found dead in the hotel's rooftop observatory.",
    "intro.time_of_death": "<strong>Estimated Time of Death:</strong> Between 11:15 and 11:30 PM (during the power outage). The victim was bludgeoned with an antique telescope mount.",
    "intro.body_discovered": "<strong>Body Discovered:</strong> Approximately 11:44 PM by Security Director Matthias Holt in the rooftop observatory, during an exclusive tech-meets-jazz gala at the historic 1920s art deco hotel.",
    "intro.circumstances": "<strong>Circumstances:</strong> A power outage struck between 11:15 and 11:30 PM \u2014 the breaker was pulled manually. Stormy weather delayed police arrival, giving suspects time to coordinate alibis.",
    "intro.starting_evidence": "<strong>Initial Evidence:</strong> The murder weapon \u2014 an antique telescope mount \u2014 was found smashed beside the body. Forensics recovered a <em>burned notebook fragment</em> from the basement incinerator; it contains a partial list of names that appears to be a blackmail or threat list. The name <em>\u2018Matt\u2019</em> is legible. Hotel security has also provided <em>keycard access logs</em> for the rooftop. Use these to press suspects during interrogation.",
    "intro.your_role": "<strong>Your Role:</strong> You are the lead detective. Interrogate eight persons of interest \u2014 each with their own secrets, motives, and knowledge boundaries. Uncover contradictions, gather evidence, and identify the killer.",
    "intro.your_partner": "<strong>Your Partner:</strong> Detective Lila Chen will assist with tactical advice and legal guidance. She is your trusted partner.",
    "intro.tip": "<strong>Tip:</strong> Suspects will guard their secrets carefully. Present evidence and build pressure to break through their defenses. Pay attention to contradictions between testimonies.",

    // ── NPC roles ──
    "role.lila-chen": "Your Partner",
    "role.amelia-reyes": "Head Engineer",
    "role.noah-sterling": "Co-Founder",
    "role.celeste-ward": "Jazz Vocalist",
    "role.matthias-holt": "Security Director",
    "role.mira-kline": "Ethicist Consultant",
    "role.eddie-voss": "Junior Engineer",
    "role.priya-shah": "Journalist",
    "role.matthew-vale": "Stage Manager",

    // ── Evidence panel ──
    "evidence.tab": "Evidence and Discoveries",
    "evidence.dossiers_tab": "Dossiers",
    "evidence.timeline_tab": "Timeline",
    "evidence.empty": "No evidence collected yet. Interrogate suspects to uncover clues.",
    "evidence.timeline_empty": "Events will appear here as you piece together what happened.",
    "evidence.mentioned_by": "Mentioned by {name} during interrogation.",
    "evidence.mentioned_by_partner": "Shared by {name} during case briefing.",
    "evidence.crime_scene": "Recovered from the crime scene by forensics.",
    "evidence.burned-notebook_desc": "Recovered from the basement incinerator. Contains a partial list of names \u2014 appears to be a blackmail or threat list. The name \u2018Matt\u2019 is legible.",
    "evidence.security_systems": "Obtained from hotel security systems.",

    // ── Evidence labels ──
    "evidence.burned-notebook_label": "Burned Notebook Fragment",
    "evidence.keycard-logs_label": "Keycard Access Logs",
    "evidence.key-trail_label": "Maintenance Key Trail",
    "evidence.power-outage_label": "Deliberate Power Sabotage",
    "evidence.encrypted-schedule_label": "Encrypted Schedule",
    "evidence.financial-misconduct_label": "Financial Misconduct",
    "evidence.surveillance_label": "CCTV Footage Gaps",
    "evidence.secret-affair_label": "Secret Affair",
    "evidence.audio-recording_label": "Audio Recording",
    "evidence.nda-ip_label": "NDA / IP Theft",
    "evidence.blackmail_label": "Blackmail Evidence",
    "evidence.data-sales_label": "Illegal Data Sales",
    "evidence.plagiarism_label": "Plagiarized Research",
    "evidence.lockpick-marks_label": "Lockpick Marks",
    "evidence.hotel-sale_label": "Hotel Sale Plan",
    "evidence.stage-timing_label": "Stage Timing Gaps",
    "evidence.conspiracy_label": "Blackout Conspiracy",

    // ── Evidence groups ──
    "evidence.group_physical": "Physical Evidence",
    "evidence.group_documentary": "Documents & Records",
    "evidence.group_testimony": "Witness Testimony",
    "evidence.group_access": "Access & Opportunity",
    "evidence.group_motive": "Motive",

    // ── Discovery texts ──
    "discovery.amelia-key-loan": "Amelia admits she lent her maintenance-room key and engineering keycard to Eddie Voss earlier that evening to retrieve a misplaced toolkit.",
    "discovery.amelia-breaker": "Amelia deliberately pulled the breaker so a co-conspirator could search Mercer\u2019s suite for proof of the hotel sale.",
    "discovery.amelia-hotel-sale": "Amelia learned that Mercer intended to sell the Lyric Atrium Hotel to a developer, threatening the hotel\u2019s heritage.",
    "discovery.amelia-lockpick": "Lockpick marks on the maintenance room door suggest someone without the key forced entry \u2014 Amelia\u2019s key was already with Eddie.",
    "discovery.noah-embezzlement": "Financial records reveal Noah Sterling embezzled company funds to cover gambling debts. Mercer found out.",
    "discovery.noah-board-vote": "Mercer\u2019s encrypted schedule reveals he planned a surprise board vote to oust Noah from the company.",
    "discovery.noah-key-access": "The maintenance-room key and engineering keycard trail leads from Amelia to Eddie to Noah \u2014 giving Noah access to the rooftop during the blackout.",
    "discovery.noah-cctv-gap": "CCTV footage gaps and witness sightings place Noah near the freight elevator and on the B1 elevator lobby camera during the blackout.",
    "discovery.celeste-affair": "Celeste and Julian Mercer had a secret romantic relationship. He promised to free her from a predatory management contract.",
    "discovery.celeste-recordings": "Celeste possesses audio recordings of Mercer admitting to illegal surveillance tactics used in Panopticon.",
    "discovery.celeste-rooftop-witness": "Celeste saw a figure \u2014 recognizable as Noah Sterling \u2014 descending the atrium stairwell during the blackout.",
    "discovery.matthias-blackmail": "Mercer was blackmailing Matthias \u2014 his name appears on the burned notebook fragment\u2019s threat list.",
    "discovery.matthias-data-sales": "Matthias has been running a side business selling anonymized guest data from the hotel\u2019s systems.",
    "discovery.matthias-saw-noah": "Matthias saw Noah Sterling on the B1 elevator lobby camera entering the service elevator lobby right before the blackout began.",
    "discovery.matthias-noah-financial": "Matthias reveals that during his confrontation with Mercer, Mercer mentioned Noah had been skimming company funds and the board would deal with it.",
    "discovery.mira-plagiarism": "Mercer plagiarized Dr. Kline\u2019s research for the Panopticon ethics framework. She planned to expose him publicly.",
    "discovery.mira-meeting": "Mira scheduled a private meeting with Mercer at 11:30 PM to demand a public admission. Mercer never showed \u2014 he was already dead.",
    "discovery.mira-suite-search": "Mira searched Suite 701 during the blackout to find proof of Mercer\u2019s plagiarism and hotel sale plans \u2014 placing her in the victim\u2019s suite during the murder window.",
    "discovery.amelia-conspiracy-admission": "Amelia admits the full conspiracy \u2014 she pulled the breaker while Mira searched Suite 701 for documents proving Mercer\u2019s plagiarism and the hotel sale.",
    "discovery.mira-conspiracy-admission": "Mira admits the full conspiracy \u2014 she searched Suite 701 during the blackout while Amelia held the breaker at B1, both seeking proof of Mercer\u2019s corruption.",
    "discovery.eddie-key-loan": "Eddie Voss borrowed Amelia\u2019s maintenance-room key and engineering keycard to retrieve a toolkit and forgot to return them immediately.",
    "discovery.eddie-gave-noah-key": "Noah Sterling pressured Eddie into handing over the maintenance-room key and engineering keycard at the VIP bar earlier that evening, promising favors.",
    "discovery.priya-saw-noah": "Priya witnessed Noah Sterling near the freight elevator shortly before the lights went out.",
    "discovery.priya-holt-argument": "Priya recorded snippets of an argument between Mercer and Matthias Holt earlier that evening.",
    "discovery.priya-board-vote": "Priya reveals that a corporate source told her Panopticon\u2019s board was planning an emergency vote to remove a co-founder \u2014 likely Noah Sterling.",
    "discovery.priya-mira-tip": "Dr. Mira Kline tipped off Priya about Mercer\u2019s ethics violations and arranged her attendance at the gala.",
    "discovery.matthew-noah-absence": "Matthew\u2019s cue sheet shows Noah Sterling was absent for a 5-minute gap before the blackout, and roughly 30 minutes total before reappearing.",
    "discovery.matthew-celeste-break": "Matthew noticed Celeste Ward took an unscheduled break during the blackout, suggesting she saw something.",
    "discovery.matthew-amelia-direction": "Matthew\u2019s stage log records Amelia entering the ballroom from the B1 service stairwell at ~11:32 PM \u2014 she came from the basement, not the 7th floor. She never went to Suite 701.",

    // ── Dossier labels ──
    "dossier.discoveries_heading": "Discoveries",
    "dossier.no_discoveries": "No new information uncovered yet.",
    "dossier.new_badge": "NEW",

    // ── Dossier bios ──
    "dossier.lila-chen.bio": "Your partner on this case. Pragmatic and tech-savvy with a dry sense of humor. She has access to official reports, forensic updates, and surveillance summaries. Known for her calm, methodical approach under pressure.",
    "dossier.amelia-reyes.bio": "Head engineer of the Lyric Atrium Hotel, fiercely loyal to the building\u2019s heritage. She holds the only key to the maintenance room and oversaw all technical systems during the gala. Colleagues describe her as precise and prideful. Openly critical of Mercer\u2019s modernization plans for the hotel.",
    "dossier.noah-sterling.bio": "Co-Founder of Mercer\u2019s Panopticon surveillance startup, handling investors and public relations. Charismatic and media-trained. Co-founded the company with Julian Mercer and recently led the platform\u2019s development. Was on stage delivering the keynote when the outage struck.",
    "dossier.celeste-ward.bio": "Award-winning jazz vocalist hired as the featured performer for the gala\u2019s speakeasy lounge set. Magnetic and emotionally guarded. Tabloids have speculated about a connection to Mercer, though she distances herself from corporate politics publicly.",
    "dossier.matthias-holt.bio": "Director of Security at the Lyric Atrium Hotel. Former military intelligence \u2014 two tours overseas. Stern, rule-bound, with a black-and-white worldview. Has full access to all hotel security systems including cameras, door sensors, and keycard readers. Coordinated emergency protocols during the outage.",
    "dossier.mira-kline.bio": "Ethicist consultant with a PhD in Bioethics. Brought in by Mercer six months ago to review Panopticon\u2019s compliance and public ethics profile. Previously published papers critical of unregulated surveillance technology. Was hosting an ethics roundtable in the library during the outage.",
    "dossier.eddie-voss.bio": "Amelia Reyes\u2019s engineering protege and the hotel\u2019s junior engineer. Despite his talent for engineering, his true passion is mixology \u2014 he volunteered to tend the VIP bar tonight. Has worked at the Lyric Atrium for three years. Known among staff for his nervous disposition and eagerness to please. Helped calm guests during the blackout.",
    "dossier.priya-shah.bio": "Investigative journalist covering corporate surveillance abuses. Attended the gala as invited press to cover the Panopticon unveiling. Has previously broken stories on tech industry misconduct. Sharp, probing, and protective of her sources. Press credentials gave her roaming access to the venue.",
    "dossier.matthew-vale.bio": "Meticulous freelance stage manager responsible for lighting, sound cues, and technical production of the gala. Has worked events at the Lyric Atrium for two years. Tracks every performer\u2019s cue and logistics with operational precision. Stayed backstage coordinating the show during the outage.",

    // ── Conversation starters (3 per NPC) ──
    "starter.lila-chen.1": "What do we know about the victim so far?",
    "starter.lila-chen.2": "Who should I prioritize interviewing first?",
    "starter.lila-chen.3": "Walk me through the timeline of events tonight.",

    "starter.amelia-reyes.1": "Tell me about this hotel and your role here.",
    "starter.amelia-reyes.2": "Who has access to the maintenance room?",
    "starter.amelia-reyes.3": "How would you describe your relationship with Julian Mercer?",

    "starter.noah-sterling.1": "What was your business relationship with Mercer like?",
    "starter.noah-sterling.2": "Tell me about the Panopticon launch tonight.",
    "starter.noah-sterling.3": "Were there any financial disputes between you and Mercer?",

    "starter.celeste-ward.1": "How did you know Julian Mercer?",
    "starter.celeste-ward.2": "Tell me about your performance at the gala tonight.",
    "starter.celeste-ward.3": "Where were you when the power went out?",

    "starter.matthias-holt.1": "Walk me through what happened during the blackout.",
    "starter.matthias-holt.2": "Is there security footage from tonight?",
    "starter.matthias-holt.3": "Who had access to the rooftop observatory?",

    "starter.mira-kline.1": "What exactly is your role with the Panopticon project?",
    "starter.mira-kline.2": "Did you have any ethical concerns about Mercer\u2019s work?",
    "starter.mira-kline.3": "How well did you know Julian Mercer personally?",

    "starter.eddie-voss.1": "Did you notice anything unusual tonight?",
    "starter.eddie-voss.2": "Who was at the bar around the time of the murder?",
    "starter.eddie-voss.3": "Tell me about your work here at the hotel.",

    "starter.priya-shah.1": "What brought you to the gala tonight?",
    "starter.priya-shah.2": "What story were you working on about Panopticon?",
    "starter.priya-shah.3": "Did anyone try to feed you information tonight?",

    "starter.matthew-vale.1": "You were backstage during the blackout. What happened?",
    "starter.matthew-vale.2": "Did anyone leave the stage area during the outage?",
    "starter.matthew-vale.3": "Did you notice anyone backstage who shouldn\u2019t have been there?",

    // ── Chat hint display (case-specific partner hints) ──
    "chat.hint_display.0": "What do you think about this case so far?",
    "chat.hint_display.1": "Help me out here \u2014 what should I do next?",
    "chat.hint_display.2": "I\u2019m stuck. What\u2019s your read on the situation?",
    "chat.hint_display.3": "Walk me through what we\u2019ve got so far.",
    "chat.hint_display.4": "Lila, where should I be focusing right now?",
    "chat.hint_display.5": "Give me a rundown \u2014 where do we stand?",
    "chat.hint_display.6": "What\u2019s your gut telling you about this case?",
    "chat.hint_display.7": "Any ideas on who I should press next?",
    "chat.hint_display.8": "I could use a fresh perspective. What are we missing?",
    "chat.hint_display.9": "Talk me through it \u2014 what have we learned so far?",

    // ── Endgame ──
    "endgame.title": "All Critical Evidence Gathered",
    "endgame.description": "You have gathered all the key evidence needed to build a case. Review your evidence, make an arrest, or continue investigating for additional details.",
    "endgame.review": "Review Evidence",
    "endgame.accuse": "Make Arrest",
    "endgame.continue": "Keep Investigating",
    "endgame.accuse_cta": "Ready to Make Your Arrest?",

    // ── Outcome screen ──
    "outcome.slam_dunk_title": "Case Closed \u2014 Killer Behind Bars",
    "outcome.slam_dunk_text": "<p>Your arrest of <strong>{name}</strong> is airtight.</p><p>Noah Sterling murdered Julian Mercer to prevent his embezzlement from being exposed and to seize control of the Panopticon startup. He pressured Eddie Voss into handing over the maintenance-room key and engineering keycard, then used them during the blackout to reach the rooftop observatory and bludgeon Mercer with the antique telescope mount.</p><p>With clear motive and undeniable proof he was at the scene, the prosecution secures a full conviction. Sterling is put away for a long time.</p><p style=\"margin-top:1rem; color:var(--gold);\">Evidence collected: {evidenceCount} items &bull; Suspects interviewed: {interviewCount}</p>",
    "outcome.plea_deal_title": "Plea Deal \u2014 Short Sentence",
    "outcome.plea_deal_text": "<p>You arrested the right person \u2014 <strong>{name}</strong> killed Julian Mercer.</p><p>But your case only established part of the picture. Without both a clear motive and evidence placing him at the scene, the prosecution offered a plea deal. Sterling accepts a reduced sentence.</p><p>You got the right suspect, but you\u2019re left with the sense you could have done more.</p><p style=\"margin-top:1rem; color:var(--gold);\">Evidence collected: {evidenceCount} items &bull; Suspects interviewed: {interviewCount}</p>",
    "outcome.released_title": "Suspect Released \u2014 Insufficient Evidence",
    "outcome.released_text": "<p>You arrested <strong>{name}</strong>, and your instinct was correct \u2014 he is the killer.</p><p>But without evidence establishing a clear motive or placing him at the scene, the prosecution cannot hold him. Sterling is released and quickly covers his tracks. The case goes cold.</p><p>You believe you found the killer, but you just can\u2019t prove it.</p><p style=\"margin-top:1rem; color:var(--gold);\">Evidence collected: {evidenceCount} items &bull; Suspects interviewed: {interviewCount}</p>",
    "outcome.wrong_title": "Wrong Suspect",
    "outcome.wrong_text": "<p>You arrested <strong>{name}</strong>, but they are not the killer.</p><p>The real murderer slips away as internal affairs questions your judgment. The case goes cold.</p><p style=\"margin-top:1rem; color:var(--text-faint);\">Keep investigating \u2014 look for contradictions in alibis, follow the physical evidence, and trace the maintenance-room key and engineering keycard.</p>",
    "outcome.restart": "New Investigation",

    // ── Title card ──
    "titlecard.open": "Open Case File",
    "titlecard.case_number": "Case #1247-B",
    "titlecard.division": "Det. Division \u2014 Homicide",

    // ── Keycard terminal ──
    "keycard.title": "\u25a0 LYRIC ATRIUM HOTEL \u2014 KEYCARD ACCESS CONTROL",
    "keycard.subtitle": "EVENT LOG \u2014 2024-11-15 \u2014 GALA NIGHT \u2014 ALL ZONES",
    "keycard.col_time": "TIME",
    "keycard.col_zone": "ZONE",
    "keycard.col_card": "CARD ID",
    "keycard.col_holder": "HOLDER",
    "keycard.col_dir": "DIR",
    "keycard.col_status": "STATUS",
    "keycard.entry": "ENTRY",
    "keycard.exit": "EXIT",
    "keycard.granted": "GRANTED",
    "keycard.loading": "LOADING ACCESS LOGS...",
    "keycard.error": "ERROR: UNABLE TO RETRIEVE ACCESS LOGS",
    "keycard.view_logs": "\u25b8 VIEW FULL LOGS",
    "keycard.system_offline": "POWER FAILURE DETECTED \u2014 All keycard readers offline. Emergency lighting activated. Backup generator failed to engage primary access control.",
    "keycard.system_restored": "POWER RESTORED \u2014 Keycard access control systems rebooting. Full reader connectivity re-established. All zones returning to normal operation.",
    "keycard.zone.LOBBY-STAFF": "Staff Entrance (Side)",
    "keycard.zone.MAINT-LVL": "Maintenance Level",
    "keycard.zone.CMD-CTR": "Security Command Center",
    "keycard.zone.KITCHEN": "Kitchen & Prep Area",
    "keycard.zone.BSTAGE": "Backstage Area",
    "keycard.zone.BALL-MAIN": "Grand Ballroom",
    "keycard.zone.BALL-SVC": "Ballroom Service Corridor",
    "keycard.zone.VIP-BAR": "VIP Bar & Lounge",
    "keycard.zone.LOBBY-MAIN": "Main Lobby Entrance",
    "keycard.zone.GUEST-7F": "Guest Floor 7 (VIP)",
    "keycard.zone.SPEAK-LOUNGE": "Speakeasy Lounge",
    "keycard.zone.LIBR-MAIN": "Hotel Library",
    "keycard.zone.ROOF-OBS": "Rooftop Observatory",
    "keycard.zone.ROOF-STAIR": "Rooftop Service Stairs",
    "keycard.zone.FRT-ELEV": "Freight Elevator",
    "keycard.zone.SVC-ELEV": "Service Elevator",
    "keycard.zone.UTIL-CORR": "Utility Corridor",
    "keycard.zone.CONF-2": "Conference Room 2",

    // ── Toast messages (case-specific) ──
    "toast.subpoena": "Subpoenas take time to process. Keep investigating \u2014 what witnesses tell you about evidence is just as valuable as the physical item.",
  };

  if (!window.I18N) window.I18N = {};
  if (!window.I18N.en) window.I18N.en = {};
  Object.assign(window.I18N.en, keys);
})();
