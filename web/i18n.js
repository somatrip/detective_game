/* ================================================================
   i18n — English / Serbian translations for Echoes in the Atrium
   ================================================================ */
window.I18N = {
  en: {
    // Intro screen
    "intro.title": "Echoes in the Atrium",
    "intro.subtitle": "A Murder Mystery Investigation",
    "intro.briefing_label": "Case Briefing",
    "intro.victim": "<strong>Victim:</strong> Julian Mercer, charismatic venture capitalist and CEO of the Panopticon surveillance startup, found dead in the rooftop observatory of the Lyric Atrium Hotel.",
    "intro.time_of_death": "<strong>Time of Death:</strong> Approximately 11:40 PM, during an exclusive tech-meets-jazz gala at the historic 1920s art deco hotel. The body was bludgeoned with an antique telescope mount.",
    "intro.circumstances": "<strong>Circumstances:</strong> A power outage struck between 11:15 and 11:30 PM — the breaker was pulled manually. Stormy weather delayed police arrival, giving suspects time to coordinate alibis.",
    "intro.starting_evidence": "<strong>Initial Evidence:</strong> Forensics recovered a <em>burned notebook fragment</em> and traces of <em>antique machine oil</em> near the body. Hotel security has also provided <em>keycard access logs</em> for the rooftop. Use these to press suspects during interrogation.",
    "intro.your_role": "<strong>Your Role:</strong> You are the lead detective. Interrogate nine persons of interest — each with their own secrets, motives, and knowledge boundaries. Uncover contradictions, gather evidence, and identify the killer.",
    "intro.your_partner": "<strong>Your Partner:</strong> Detective Lila Chen will assist with tactical advice and legal guidance. Start with her for an overview of the case.",
    "intro.tip": "<strong>Tip:</strong> Suspects will guard their secrets carefully. Present evidence and build pressure to break through their defenses. Pay attention to contradictions between testimonies.",
    "intro.start": "Begin Investigation",

    // Hub screen
    "hub.tab_suspects": "Persons of Interest",
    "hub.tab_caseboard": "Case Board",
    "chat.back_to_hub": "Case Files",
    "chat.nav_suspects": "Persons of Interest",
    "chat.nav_caseboard": "Case Board",
    "chat.dossier_heading": "Dossier",
    "sidebar.header": "Persons of Interest",
    "sidebar.accuse": "Make an Accusation",
    "chat.status_available": "Available for questioning",
    "chat.status_responding": "Responding\u2026",
    "chat.placeholder": "Select a person of interest to begin interrogation.",
    "chat.input_placeholder": "Type your question\u2026",
    "chat.hint": "Begin your interrogation of {name}. What would you like to ask?",
    "chat.sender_you": "You",
    "chat.error": "Error: {message}. Check that the server is running.",
    "chat.badge_title": "Interviewed",
    "chat.discovery_label": "Discovery",

    // Evidence panel
    "evidence.tab": "Evidence and Discoveries",
    "evidence.dossiers_tab": "Dossiers",
    "evidence.timeline_tab": "Timeline",
    "evidence.empty": "No evidence collected yet. Interrogate suspects to uncover clues.",
    "evidence.timeline_empty": "Events will appear here as you piece together what happened.",
    "evidence.mentioned_by": "Mentioned by {name} during interrogation.",
    "evidence.crime_scene": "Recovered from the crime scene by forensics.",
    "evidence.security_systems": "Obtained from hotel security systems.",

    // Evidence labels (for i18n support in evidence catalog)
    "evidence.oil-trace_label": "Antique Oil Trace",
    "evidence.burned-notebook_label": "Burned Notebook Fragment",
    "evidence.keycard-logs_label": "Keycard Access Logs",
    "evidence.key-trail_label": "Maintenance Key Trail",
    "evidence.power-outage_label": "Deliberate Power Sabotage",
    "evidence.encrypted-schedule_label": "Encrypted Schedule",
    "evidence.financial-misconduct_label": "Financial Misconduct",
    "evidence.oil-cufflinks_label": "Oil on Cufflinks",
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

    // Accusation modal
    "accuse.title": "Formal Accusation",
    "accuse.description": "This is irreversible. Select the person you believe committed the murder and present your case. Choose carefully \u2014 an incorrect accusation will damage your investigation.",
    "accuse.cancel": "Cancel",
    "accuse.confirm": "Confirm Accusation",

    // Outcome screen
    "outcome.correct_title": "Case Solved",
    "outcome.wrong_title": "Wrong Suspect",
    "outcome.correct_text": "<p>Your accusation of <strong>{name}</strong> is correct.</p><p>Noah Sterling murdered Julian Mercer to prevent his embezzlement from being exposed and to seize control of the Panopticon startup. During the blackout, he obtained the maintenance key from Eddie Voss, accessed the rooftop observatory, and bludgeoned Mercer with the antique telescope mount.</p><p>The antique oil on his cufflinks, the key trail through Eddie Voss, Celeste's eyewitness testimony, and the encrypted board vote schedule all sealed the case.</p><p style=\"margin-top:1rem; color:var(--gold);\">Evidence collected: {evidenceCount} items &bull; Suspects interviewed: {interviewCount}</p>",
    "outcome.wrong_text": "<p>You accused <strong>{name}</strong>, but they are not the killer.</p><p>The real murderer slips away as internal affairs questions your judgment. The case goes cold.</p><p style=\"margin-top:1rem; color:var(--text-faint);\">Keep investigating \u2014 look for contradictions in alibis, follow the physical evidence, and trace the maintenance key.</p>",
    "outcome.restart": "New Investigation",

    // NPC roles
    "role.lila-chen": "Your Partner",
    "role.amelia-reyes": "Head Engineer",
    "role.noah-sterling": "Co-Founder",
    "role.celeste-ward": "Jazz Vocalist",
    "role.gideon-holt": "Security Director",
    "role.mira-kline": "Ethicist Consultant",
    "role.eddie-voss": "Bartender",
    "role.priya-shah": "Journalist",
    "role.marcus-vale": "Stage Manager",

    // Voice chat
    "voice.mic_title": "Record voice message",
    "voice.mic_recording": "Recording\u2026 Click to stop",
    "voice.mic_processing": "Transcribing\u2026",
    "voice.mic_denied": "Microphone access denied. Please allow microphone access in browser settings.",
    "voice.mic_error": "Recording error: {message}",
    "voice.audio_on": "Voice: ON",
    "voice.audio_off": "Voice: OFF",
    "voice.replay_title": "Replay audio",
    "voice.status_speaking": "Speaking\u2026",
    "voice.listening": "Listening\u2026",
    "voice.mode_active": "Voice mode ON \u2014 click to exit",

    // Dossier labels
    "dossier.discoveries_heading": "Discoveries",
    "dossier.no_discoveries": "No new information uncovered yet.",
    "dossier.new_badge": "NEW",

    // Dossier bios
    "dossier.lila-chen.bio": "Your partner on this case. Pragmatic and tech-savvy with a dry sense of humor. She has access to official reports, forensic updates, and surveillance summaries. Known for her calm, methodical approach under pressure.",
    "dossier.amelia-reyes.bio": "Head engineer of the Lyric Atrium Hotel, fiercely loyal to the building's heritage. She holds the only key to the maintenance room and oversaw all technical systems during the gala. Colleagues describe her as precise and prideful. Openly critical of Mercer's modernization plans for the hotel.",
    "dossier.noah-sterling.bio": "Co-Founder of Mercer's Panopticon surveillance startup, handling investors and public relations. Charismatic and media-trained. Co-founded the company with Julian Mercer and recently led the platform's development. Was on stage delivering the keynote when the outage struck.",
    "dossier.celeste-ward.bio": "Award-winning jazz vocalist hired as the featured performer for the gala's speakeasy lounge set. Magnetic and emotionally guarded. Tabloids have speculated about a connection to Mercer, though she distances herself from corporate politics publicly.",
    "dossier.gideon-holt.bio": "Director of Security at the Lyric Atrium Hotel. Former military intelligence \u2014 two tours overseas. Stern, rule-bound, with a black-and-white worldview. Has full access to all hotel security systems including cameras, door sensors, and keycard readers. Coordinated emergency protocols during the outage.",
    "dossier.mira-kline.bio": "Ethicist consultant with a PhD in Bioethics. Brought in by Mercer six months ago to review Panopticon's compliance and public ethics profile. Previously published papers critical of unregulated surveillance technology. Was hosting an ethics roundtable in the library during the outage.",
    "dossier.eddie-voss.bio": "The hotel's bartender and Amelia Reyes's eager protege. Has worked every major event at the Lyric Atrium for three years. Known among staff for his nervous disposition and eagerness to please. Tended the VIP bar during the gala and helped calm guests during the blackout.",
    "dossier.priya-shah.bio": "Investigative journalist covering corporate surveillance abuses. Attended the gala as invited press to cover the Panopticon unveiling. Has previously broken stories on tech industry misconduct. Sharp, probing, and protective of her sources. Press credentials gave her roaming access to the venue.",
    "dossier.marcus-vale.bio": "Meticulous freelance stage manager responsible for lighting, sound cues, and technical production of the gala. Has worked events at the Lyric Atrium for two years. Tracks every performer's cue and logistics with operational precision. Stayed backstage coordinating the show during the outage.",

    // Discovery texts
    "discovery.amelia-key-loan": "Amelia admits she lent her maintenance key to Eddie Voss earlier that evening to retrieve a misplaced toolkit.",
    "discovery.amelia-breaker": "Amelia deliberately pulled the breaker to search Mercer's suite for proof that he planned to sell the hotel.",
    "discovery.amelia-hotel-sale": "Amelia learned that Mercer intended to sell the Lyric Atrium Hotel to a developer, threatening the hotel's heritage.",
    "discovery.amelia-lockpick": "Lockpick marks on the maintenance room door suggest someone without the key forced entry \u2014 Amelia's key was already with Eddie.",
    "discovery.noah-embezzlement": "Financial records reveal Noah Sterling embezzled company funds to cover gambling debts. Mercer found out.",
    "discovery.noah-board-vote": "Mercer's encrypted schedule reveals he planned a surprise board vote to oust Noah from the company.",
    "discovery.noah-oil-cufflinks": "Antique oil residue was found on Noah's cufflinks \u2014 consistent with the oil from the telescope mount at the crime scene.",
    "discovery.noah-key-access": "The maintenance key trail leads from Amelia to Eddie to Noah \u2014 giving Noah access to the rooftop during the blackout.",
    "discovery.noah-cctv-gap": "CCTV footage gaps and witness sightings place Noah near the freight elevator and maintenance corridors during the blackout.",
    "discovery.celeste-affair": "Celeste and Julian Mercer had a secret romantic relationship. He promised to free her from a predatory management contract.",
    "discovery.celeste-recordings": "Celeste possesses audio recordings of Mercer admitting to illegal surveillance tactics used in Panopticon.",
    "discovery.celeste-rooftop-witness": "Celeste saw a figure \u2014 recognizable as Noah Sterling \u2014 leaving the rooftop stairwell during the blackout.",
    "discovery.gideon-blackmail": "Mercer was blackmailing Gideon \u2014 his name appears on the burned notebook fragment's threat list.",
    "discovery.gideon-data-sales": "Gideon has been running a side business selling anonymized guest data from the hotel's systems.",
    "discovery.gideon-notebook": "The burned notebook fragment lists Gideon Holt as one of Mercer's blackmail targets.",
    "discovery.gideon-saw-noah": "Gideon saw Noah Sterling slip toward the maintenance corridors right before the blackout began.",
    "discovery.mira-plagiarism": "Mercer plagiarized Dr. Kline's research for the Panopticon ethics framework. She planned to expose him publicly.",
    "discovery.mira-meeting": "Mira scheduled a private meeting with Mercer at 11:30 PM to demand a public admission. Mercer never showed \u2014 he was already dead.",
    "discovery.eddie-key-loan": "Eddie Voss borrowed Amelia's maintenance key to retrieve a toolkit and forgot to return it immediately.",
    "discovery.eddie-gave-noah-key": "Noah Sterling pressured Eddie into handing over the maintenance key during the blackout, promising favors.",
    "discovery.priya-saw-noah": "Priya witnessed Noah Sterling near the freight elevator shortly before the lights went out.",
    "discovery.priya-holt-argument": "Priya recorded snippets of an argument between Mercer and Gideon Holt earlier that evening.",
    "discovery.priya-mira-tip": "Dr. Mira Kline tipped off Priya about Mercer's ethics violations and arranged her attendance at the gala.",
    "discovery.marcus-noah-absence": "Marcus's cue sheet shows Noah Sterling slipped away for roughly five minutes during the blackout.",
    "discovery.marcus-celeste-break": "Marcus noticed Celeste Ward took an unscheduled break during the blackout, suggesting she saw something.",

    // Conversation starters (3 per NPC)
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

    "starter.gideon-holt.1": "Walk me through what happened during the blackout.",
    "starter.gideon-holt.2": "Is there security footage from tonight?",
    "starter.gideon-holt.3": "Who had access to the rooftop observatory?",

    "starter.mira-kline.1": "What exactly is your role with the Panopticon project?",
    "starter.mira-kline.2": "Did you have any ethical concerns about Mercer's work?",
    "starter.mira-kline.3": "How well did you know Julian Mercer personally?",

    "starter.eddie-voss.1": "Did you notice anything unusual tonight?",
    "starter.eddie-voss.2": "Who was at the bar around the time of the murder?",
    "starter.eddie-voss.3": "Tell me about your work here at the hotel.",

    "starter.priya-shah.1": "What brought you to the gala tonight?",
    "starter.priya-shah.2": "What story were you working on about Panopticon?",
    "starter.priya-shah.3": "Did anyone try to feed you information tonight?",

    "starter.marcus-vale.1": "You were backstage during the blackout. What happened?",
    "starter.marcus-vale.2": "Did anyone leave the stage area during the outage?",
    "starter.marcus-vale.3": "Did you notice anyone backstage who shouldn't have been there?",

    // Interrogation pills
    "interrogation.pressure_label": "Pressure:",
    "interrogation.rapport_label": "Rapport:",
    "interrogation.calm": "Calm",
    "interrogation.tense": "Tense",
    "interrogation.shaken": "Shaken",
    "interrogation.cornered": "Cornered",
    "interrogation.cold": "Cold",
    "interrogation.neutral": "Neutral",
    "interrogation.open": "Open",
    "interrogation.trusting": "Trusting",

    // Endgame
    "endgame.title": "All Critical Evidence Gathered",
    "endgame.description": "You have gathered all the key evidence needed to build a case. Review your evidence, make an accusation, or continue investigating for additional details.",
    "endgame.review": "Review Evidence",
    "endgame.accuse": "Make Accusation",
    "endgame.continue": "Keep Investigating",
    "endgame.accuse_cta": "Ready to Make Your Accusation?",

    // Evidence groups
    "evidence.group_physical": "Physical Evidence",
    "evidence.group_documentary": "Documents & Records",
    "evidence.group_testimony": "Witness Testimony",
    "evidence.group_access": "Access & Opportunity",
    "evidence.group_motive": "Motive",

    // Settings
    "settings.title": "Settings",
    "settings.restart": "Restart Investigation",
    "settings.restart_confirm": "Are you sure? All progress will be lost.",
    "settings.restart_yes": "Yes, restart",
    "settings.restart_cancel": "Cancel",
    "settings.language": "Language",

    // Title card
    "titlecard.open": "Open Case File",
    "titlecard.case_number": "Case #1247-B",
    "titlecard.division": "Det. Division — Homicide",

    // Keycard terminal
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

    // Tutorial coach marks
    "tutorial.step_caseboard": "This is your Case Board — review evidence and the case briefing here.",
    "tutorial.step_briefing": "Expand the Case Briefing to review the crime details and initial evidence.",
    "tutorial.step_suspects": "Switch here to see all persons of interest you can interrogate.",
    "tutorial.step_npc_card": "Click a suspect to begin interrogating them.",
    "tutorial.step_gauges": "These show the suspect's emotional state — Pressure and Trust.",
    "tutorial.step_info": "Tap here to read the suspect's background dossier.",
    "tutorial.step_input": "Type your questions here, or tap the mic for voice chat.",
    "tutorial.next": "Next",
    "tutorial.skip": "Skip",
    "tutorial.got_it": "Got it",
    "tutorial.replay": "Replay Tutorial",
  },

  sr: {
    // Intro screen
    "intro.title": "Odjeci u Atrijumu",
    "intro.subtitle": "Istraga Ubistva",
    "intro.briefing_label": "Brifing o Slu\u010daju",
    "intro.victim": "<strong>\u017drtva:</strong> D\u017eulijan Merser, harizamti\u010dan preduzetnik i direktor startapa Panopticon za nadzor, prona\u0111en mrtav u opservatoriji na krovu hotela Lyric Atrium.",
    "intro.time_of_death": "<strong>Vreme smrti:</strong> Pribli\u017eno 23:40, tokom ekskluzivne gala ve\u010deri u istorijskom art deko hotelu iz 1920-ih. \u017drtva je ubijena anti\u010dkim postolem teleskopa.",
    "intro.circumstances": "<strong>Okolnosti:</strong> Nestanak struje je trajao od 23:15 do 23:30 \u2014 neko je ru\u010dno iskop\u010dao osigura\u010d. Olujno vreme je usporilo dolazak policije, daju\u0107i osumnji\u010denima vremena da usklade alibije.",
    "intro.starting_evidence": "<strong>Po\u010detni dokazi:</strong> Forenzi\u010dari su prona\u0161li <em>spaljen fragment bele\u017enice</em> i tragove <em>anti\u010dkog ma\u0161inskog ulja</em> pored tela. Hotelsko obezbe\u0111enje je tako\u0111e obezbedilo <em>evidenciju pristupnih kartica</em> za krov. Koristite ovo da pritisnete osumnji\u010dene tokom ispitivanja.",
    "intro.your_role": "<strong>Va\u0161a uloga:</strong> Vi ste glavni detektiv. Ispitajte devet osumnji\u010denih \u2014 svaki sa sopstvenim tajnama, motivima i ograni\u010denjima znanja. Otkrijte kontradikcije, prikupite dokaze i identifikujte ubicu.",
    "intro.your_partner": "<strong>Va\u0161 partner:</strong> Detektiv Lila \u010cen \u0107e vam pomo\u0107i sa takti\u010dkim savetima i pravnim smernicama. Po\u010dnite sa njom za pregled slu\u010daja.",
    "intro.tip": "<strong>Savet:</strong> Likovi \u0107e pa\u017eeljivo \u010duvati svoje tajne. Predstavite dokaze i izgradite pritisak da probijete njihovu odbranu. Obratite pa\u017enju na kontradikcije izme\u0111u svedo\u010denja.",
    "intro.start": "Zapo\u010dni Istragu",

    // Hub screen
    "hub.tab_suspects": "Osumnji\u010deni",
    "hub.tab_caseboard": "Tabla Slu\u010daja",
    "chat.back_to_hub": "Dosijei",
    "chat.nav_suspects": "Osumnjičeni",
    "chat.nav_caseboard": "Tabla Slučaja",
    "chat.dossier_heading": "Dosije",
    "sidebar.header": "Osumnji\u010deni",
    "sidebar.accuse": "Podnesi Optu\u017enicu",
    "chat.status_available": "Dostupan za ispitivanje",
    "chat.status_responding": "Odgovara\u2026",
    "chat.placeholder": "Izaberite osumnji\u010denog da po\u010dnete ispitivanje.",
    "chat.input_placeholder": "Unesite pitanje\u2026",
    "chat.hint": "Zapo\u010dnite ispitivanje \u2014 {name}. \u0160ta \u017eelite da pitate?",
    "chat.sender_you": "Vi",
    "chat.error": "Gre\u0161ka: {message}. Proverite da li server radi.",
    "chat.badge_title": "Ispitan/a",
    "chat.discovery_label": "Otkri\u0107e",

    // Evidence panel
    "evidence.tab": "Dokazi i otkri\u0107a",
    "evidence.dossiers_tab": "Dosijei",
    "evidence.timeline_tab": "Hronologija",
    "evidence.empty": "Nema prikupljenih dokaza. Ispitajte osumnji\u010dene da biste otkrili tragove.",
    "evidence.timeline_empty": "Doga\u0111aji \u0107e se pojaviti ovde dok sklapate sliku o tome \u0161ta se desilo.",
    "evidence.mentioned_by": "Pomenuo/la {name} tokom ispitivanja.",
    "evidence.crime_scene": "Prona\u0111eno na mestu zlo\u010dina od strane forenzi\u010dara.",
    "evidence.security_systems": "Dobijeno iz hotelskih sigurnosnih sistema.",

    // Evidence labels
    "evidence.oil-trace_label": "Trag Anti\u010dkog Ulja",
    "evidence.burned-notebook_label": "Spaljen Fragment Bele\u017enice",
    "evidence.keycard-logs_label": "Evidencija Pristupnih Kartica",
    "evidence.key-trail_label": "Trag Klju\u010da za Odr\u017eavanje",
    "evidence.power-outage_label": "Namerna Sabota\u017ea Struje",
    "evidence.encrypted-schedule_label": "\u0160ifrovani Raspored",
    "evidence.financial-misconduct_label": "Finansijske Nepravilnosti",
    "evidence.oil-cufflinks_label": "Ulje na Dug\u0123madima za Man\u017eetne",
    "evidence.surveillance_label": "Praznine u CCTV Snimcima",
    "evidence.secret-affair_label": "Tajna Veza",
    "evidence.audio-recording_label": "Audio Snimak",
    "evidence.nda-ip_label": "NDA / Kra\u0111a Intelektualne Svojine",
    "evidence.blackmail_label": "Dokazi o Uceni",
    "evidence.data-sales_label": "Nelegalna Prodaja Podataka",
    "evidence.plagiarism_label": "Plagirano Istra\u017eivanje",
    "evidence.lockpick-marks_label": "Tragovi Obijanja",
    "evidence.hotel-sale_label": "Plan Prodaje Hotela",
    "evidence.stage-timing_label": "Praznine u Rasporedu Scene",

    // Accusation modal
    "accuse.title": "Zvani\u010dna Optu\u017enica",
    "accuse.description": "Ovo je nepovratno. Izaberite osobu za koju verujete da je po\u010dinila ubistvo. Birajte pa\u017eljivo \u2014 pogre\u0161na optu\u017enica \u0107e o\u0161tetiti va\u0161u istragu.",
    "accuse.cancel": "Otka\u017ei",
    "accuse.confirm": "Potvrdi Optu\u017enicu",

    // Outcome screen
    "outcome.correct_title": "Slu\u010daj Re\u0161en",
    "outcome.wrong_title": "Pogre\u0161an Osumnji\u010deni",
    "outcome.correct_text": "<p>Va\u0161a optu\u017enica protiv <strong>{name}</strong> je ta\u010dna.</p><p>Noa Sterling je ubio D\u017eulijana Mersera da spre\u010di otkrivanje pronevere i preuzme kontrolu nad startapom Panopticon. Tokom nestanka struje, dobio je klju\u010d za odr\u017eavanje od Edija Vosa, pristupao opservatoriji na krovu i ubio Mersera anti\u010dkim postoljem teleskopa.</p><p>Anti\u010dko ulje na njegovim dug\u0123madima za man\u017eetne, trag klju\u010da preko Edija Vosa, svedo\u010denje Selest kao o\u010devica i \u0161ifrovani raspored glasanja uprave \u2014 sve je zape\u010datilo slu\u010daj.</p><p style=\"margin-top:1rem; color:var(--gold);\">Prikupljeni dokazi: {evidenceCount} &bull; Ispitani osumnji\u010deni: {interviewCount}</p>",
    "outcome.wrong_text": "<p>Optu\u017eili ste <strong>{name}</strong>, ali ta osoba nije ubica.</p><p>Pravi ubica izmi\u010de dok unutra\u0161nja kontrola dovodi u pitanje va\u0161 sud. Slu\u010daj se gasi.</p><p style=\"margin-top:1rem; color:var(--text-faint);\">Nastavite istragu \u2014 tra\u017eite kontradikcije u alibijima, pratite fizi\u010dke dokaze i trag klju\u010da za odr\u017eavanje.</p>",
    "outcome.restart": "Nova Istraga",

    // NPC roles
    "role.lila-chen": "Va\u0161 Partner",
    "role.amelia-reyes": "Glavni In\u017eenjer",
    "role.noah-sterling": "Koosni\u0160a\u010d",
    "role.celeste-ward": "D\u017eez Peva\u010dica",
    "role.gideon-holt": "Direktor Obezbe\u0111enja",
    "role.mira-kline": "Etik Konsultant",
    "role.eddie-voss": "Barmen",
    "role.priya-shah": "Novinarka",
    "role.marcus-vale": "Menad\u017eer Scene",

    // Voice chat
    "voice.mic_title": "Snimite glasovnu poruku",
    "voice.mic_recording": "Snimanje\u2026 Kliknite da zaustavite",
    "voice.mic_processing": "Transkribovanje\u2026",
    "voice.mic_denied": "Pristup mikrofonu odbijen. Dozvolite pristup mikrofonu u pode\u0161avanjima pregledača.",
    "voice.mic_error": "Gre\u0161ka snimanja: {message}",
    "voice.audio_on": "Glas: UKLJU\u010cEN",
    "voice.audio_off": "Glas: ISKLJU\u010cEN",
    "voice.replay_title": "Ponovo pusti audio",
    "voice.status_speaking": "Govori\u2026",
    "voice.listening": "Slu\u0161am\u2026",
    "voice.mode_active": "Glasovni re\u017eim UKLJU\u010cEN \u2014 kliknite za izlaz",

    // Dossier labels
    "dossier.discoveries_heading": "Otkri\u0107a",
    "dossier.no_discoveries": "Nema novih informacija za sada.",
    "dossier.new_badge": "NOVO",

    // Dossier bios
    "dossier.lila-chen.bio": "Va\u0161 partner na ovom slu\u010daju. Pragmati\u010dna i tehnolo\u0161ki ve\u0161ta sa suvim smislom za humor. Ima pristup zvani\u010dnim izve\u0161tajima, forenzi\u010dkim a\u017euriranjima i pregledima nadzora. Poznata po mirnom i metodi\u010dnom pristupu pod pritiskom.",
    "dossier.amelia-reyes.bio": "Glavni in\u017eenjer hotela Lyric Atrium, \u017eestoko lojalna nasle\u0111u zgrade. Dr\u017ei jedini klju\u010d prostorije za odr\u017eavanje i nadgledala je sve tehni\u010dke sisteme tokom gale. Kolege je opisuju kao preciznu i ponosnu. Otvoreno kriti\u010dna prema Merserovim planovima za modernizaciju hotela.",
    "dossier.noah-sterling.bio": "Koosni\u0161a\u010d Merserovog startapa Panopticon za nadzor, zadu\u017een za odnose sa investitorima i javnost. Harizamati\u010dan i medijski obu\u010den. Osnovao kompaniju sa D\u017eulijanom Merserom i nedavno vodio razvoj platforme. Bio je na sceni sa prezentacijom kad je nestalo struje.",
    "dossier.celeste-ward.bio": "Nagra\u0111ivana d\u017eez peva\u010dica anga\u017eovana za nastup u speakeasy salonu na gali. Magnetska i emocionalno zatvorena. Tabloidi su spekulisali o vezi sa Merserom, mada se javno distancira od korporativne politike.",
    "dossier.gideon-holt.bio": "Direktor obezbe\u0111enja hotela Lyric Atrium. Biv\u0161i vojni obave\u0161tajac \u2014 dve ture u inostranstvu. Strog, principijelan, sa crno-belim pogledom na svet. Ima potpun pristup svim hotelskim bezbednosnim sistemima uklju\u010duju\u0107i kamere, senzore i \u010dita\u010de kartica. Koordinirao je hitne protokole tokom nestanka struje.",
    "dossier.mira-kline.bio": "Eti\u010darka i konsultant sa doktoratom iz bioetike. Merser ju je anga\u017eovao pre \u0161est meseci da pregleda usklađenost i eti\u010dki profil Panopticona. Ranije objavljivala radove kriti\u010dne prema neregulisanim tehnologijama nadzora. Vodila je okrugli sto o etici u biblioteci tokom nestanka struje.",
    "dossier.eddie-voss.bio": "Barmen hotela i revni \u0161ti\u0107enik Amelije Rejes. Radio je na svakom velikom doga\u0111aju u Lyric Atriumu tri godine. Me\u0111u osobljem poznat po nervoznoj naravi i \u017eelji da udovolji. Slu\u017eio je VIP bar tokom gale i pomagao da se gosti smire tokom nestanka struje.",
    "dossier.priya-shah.bio": "Istra\u017eiva\u010dka novinarka koja prati zloupotrebe u oblasti korporativnog nadzora. Do\u0161la na galu kao pozvana \u0161tampa da pokrije predstavljanje Panopticona. Ranije je objavljivala pri\u010de o zlouporeti u tehnolo\u0161koj industriji. O\u0161tra, istra\u017ena i za\u0161titni\u010dka prema izvorima. Novinarska akreditacija joj je omogu\u0107ila pristup ve\u0107ini prostorija.",
    "dossier.marcus-vale.bio": "Pedantan slobodni menad\u017eer scene zadu\u017een za osvetljenje, zvu\u010dne signale i tehni\u010dku produkciju gale. Radio je doga\u0111aje u Lyric Atriumu dve godine. Prati svaki signal i logistiku izvo\u0111a\u010da sa operativnom precizno\u0161\u0107u. Ostao je iza scene koordiniraju\u0107i \u0161ou tokom nestanka struje.",

    // Discovery texts
    "discovery.amelia-key-loan": "Amelija priznaje da je pozajmila klju\u010d za odr\u017eavanje Ediju Vosu ranije te ve\u010deri da bi preuzeo zaboravljeni alat.",
    "discovery.amelia-breaker": "Amelija je namerno iskop\u010dala osigura\u010d da pretra\u017ei Merserov apartman u potrazi za dokazima da planira prodaju hotela.",
    "discovery.amelia-hotel-sale": "Amelija je saznala da Merser namerava da proda hotel Lyric Atrium investitoru, \u0161to bi ugrozilo nasle\u0111e hotela.",
    "discovery.amelia-lockpick": "Tragovi obijanja na vratima prostorije za odr\u017eavanje ukazuju da je neko bez klju\u010da nasilno u\u0161ao \u2014 Amelijin klju\u010d je ve\u0107 bio kod Edija.",
    "discovery.noah-embezzlement": "Finansijski izve\u0161taji otkrivaju da je Noa Sterling pronevero sredstva kompanije da pokrije kockarske dugove. Merser je to otkrio.",
    "discovery.noah-board-vote": "Merserov \u0161ifrovani raspored otkriva da je planirao iznenadno glasanje uprave da ukloni Nou iz kompanije.",
    "discovery.noah-oil-cufflinks": "Na Noinim dug\u0123madima za man\u017eetne prona\u0111en je ostatak anti\u010dkog ulja \u2014 poklapa se sa uljem sa postolja teleskopa na mestu zlo\u010dina.",
    "discovery.noah-key-access": "Trag klju\u010da za odr\u017eavanje vodi od Amelije do Edija pa do Noe \u2014 daju\u0107i Noi pristup krovu tokom nestanka struje.",
    "discovery.noah-cctv-gap": "Praznine u CCTV snimcima i svedo\u010denja o\u010devidaca postavljaju Nou blizu teretnog lifta i hodnika za odr\u017eavanje tokom nestanka struje.",
    "discovery.celeste-affair": "Selest i D\u017eulijan Merser su imali tajnu romansu. On joj je obe\u0107ao da \u0107e je osloboditi nepovoljnog menad\u017eerskog ugovora.",
    "discovery.celeste-recordings": "Selest poseduje audio snimke na kojima Merser priznaje kori\u0161\u0107enje nelegalnih taknika nadzora u Panopticonu.",
    "discovery.celeste-rooftop-witness": "Selest je videla figuru \u2014 prepoznatljivu kao Noa Sterling \u2014 kako izlazi iz stepeni\u0161ta ka krovu tokom nestanka struje.",
    "discovery.gideon-blackmail": "Merser je ucenjivao Gideona \u2014 njegovo ime se nalazi na listi pretnji iz spaljenog fragmenta bele\u017enice.",
    "discovery.gideon-data-sales": "Gideon vodi sporedni posao prodaje anonimizovanih podataka gostiju iz hotelskih sistema.",
    "discovery.gideon-notebook": "Spaljeni fragment bele\u017enice navodi Gideona Holta kao jednu od Merserovih meta za ucenu.",
    "discovery.gideon-saw-noah": "Gideon je video Nou Sterlinga kako se \u0161unja ka hodnicima za odr\u017eavanje neposredno pre nestanka struje.",
    "discovery.mira-plagiarism": "Merser je plagirao istra\u017eivanje Dr Klajn za eti\u010dki okvir Panopticona. Ona je planirala da ga javno razotkrije.",
    "discovery.mira-meeting": "Mira je zakazala privatni sastanak sa Merserom u 23:30 da zahteva javno priznanje. Merser se nije pojavio \u2014 ve\u0107 je bio mrtav.",
    "discovery.eddie-key-loan": "Edi Vos je pozajmio Amelijin klju\u010d za odr\u017eavanje da preuzme alat i zaboravio da ga odmah vrati.",
    "discovery.eddie-gave-noah-key": "Noa Sterling je pritiskao Edija da mu preda klju\u010d za odr\u017eavanje tokom nestanka struje, obe\u0107avaju\u0107i usluge.",
    "discovery.priya-saw-noah": "Prija je videla Nou Sterlinga blizu teretnog lifta neposredno pre nego \u0161to je nestalo struje.",
    "discovery.priya-holt-argument": "Prija je snimila delove svađe izme\u0111u Mersera i Gideona Holta ranije te ve\u010deri.",
    "discovery.priya-mira-tip": "Dr Mira Klajn je obavestila Priju o Merserovim eti\u010dkim prekr\u0161ajima i organizovala njeno prisustvo na gali.",
    "discovery.marcus-noah-absence": "Markusov raspored signala pokazuje da se Noa Sterling udaljio na pribli\u017eno pet minuta tokom nestanka struje.",
    "discovery.marcus-celeste-break": "Markus je primetio da je Selest Vord imala nezakazanu pauzu tokom nestanka struje, \u0161to ukazuje da je ne\u0161to videla.",

    // Conversation starters (3 per NPC)
    "starter.lila-chen.1": "\u0160ta znamo o \u017ertvi do sada?",
    "starter.lila-chen.2": "Koga treba prvo da saslu\u0161am?",
    "starter.lila-chen.3": "Provedi me kroz hronologiju doga\u0111aja ve\u010deras.",

    "starter.amelia-reyes.1": "Recite mi o ovom hotelu i va\u0161oj ulozi ovde.",
    "starter.amelia-reyes.2": "Ko ima pristup prostoriji za odr\u017eavanje?",
    "starter.amelia-reyes.3": "Kako biste opisali va\u0161 odnos sa D\u017eulijanom Merserom?",

    "starter.noah-sterling.1": "Kakav je bio va\u0161 poslovni odnos sa Merserom?",
    "starter.noah-sterling.2": "Recite mi o lansiranju Panopticona ve\u010deras.",
    "starter.noah-sterling.3": "Da li je bilo finansijskih sporova izme\u0111u vas i Mersera?",

    "starter.celeste-ward.1": "Kako ste poznavali D\u017eulijana Mersera?",
    "starter.celeste-ward.2": "Pri\u010dajte mi o va\u0161em nastupu na gali ve\u010deras.",
    "starter.celeste-ward.3": "Gde ste bili kad je nestalo struje?",

    "starter.gideon-holt.1": "Ispri\u010dajte mi \u0161ta se desilo tokom nestanka struje.",
    "starter.gideon-holt.2": "Postoje li snimci sigurnosnih kamera od ve\u010deras?",
    "starter.gideon-holt.3": "Ko je imao pristup opservatoriji na krovu?",

    "starter.mira-kline.1": "Koja je ta\u010dno va\u0161a uloga u projektu Panopticon?",
    "starter.mira-kline.2": "Da li ste imali eti\u010dke primedbe na Merserov rad?",
    "starter.mira-kline.3": "Koliko dobro ste poznavali D\u017eulijana Mersera li\u010dno?",

    "starter.eddie-voss.1": "Da li ste primetili ne\u0161to neubi\u010dajeno ve\u010deras?",
    "starter.eddie-voss.2": "Ko je bio za barom oko vremena ubistva?",
    "starter.eddie-voss.3": "Pri\u010dajte mi o va\u0161em radu ovde u hotelu.",

    "starter.priya-shah.1": "\u0160ta vas je dovelo na galu ve\u010deras?",
    "starter.priya-shah.2": "Na kojoj pri\u010di ste radili o Panopticonu?",
    "starter.priya-shah.3": "Da li vam je neko poku\u0161ao proslediti informacije ve\u010deras?",

    "starter.marcus-vale.1": "Bili ste iza scene tokom nestanka struje. \u0160ta se desilo?",
    "starter.marcus-vale.2": "Da li je neko napustio prostor scene tokom nestanka struje?",
    "starter.marcus-vale.3": "Da li ste primetili nekoga iza scene ko nije trebalo da bude tamo?",

    // Interrogation pills
    "interrogation.pressure_label": "Pritisak:",
    "interrogation.rapport_label": "Odnos:",
    "interrogation.calm": "Miran",
    "interrogation.tense": "Napet",
    "interrogation.shaken": "Uzdrman",
    "interrogation.cornered": "Prikle\u0161ten",
    "interrogation.cold": "Hladan",
    "interrogation.neutral": "Neutralan",
    "interrogation.open": "Otvoren",
    "interrogation.trusting": "Poverljiv",

    // Endgame
    "endgame.title": "Svi Klju\u010dni Dokazi Prikupljeni",
    "endgame.description": "Prikupili ste sve klju\u010dne dokaze potrebne za izgradnju slu\u010daja. Pregledajte dokaze, podnesite optu\u017enicu ili nastavite istragu za dodatne detalje.",
    "endgame.review": "Pregledaj Dokaze",
    "endgame.accuse": "Podnesi Optu\u017enicu",
    "endgame.continue": "Nastavi Istragu",
    "endgame.accuse_cta": "Spremni za Optu\u017enicu?",

    // Evidence groups
    "evidence.group_physical": "Fizi\u010dki Dokazi",
    "evidence.group_documentary": "Dokumenti i Zapisi",
    "evidence.group_testimony": "Svedo\u010denja",
    "evidence.group_access": "Pristup i Prilika",
    "evidence.group_motive": "Motiv",

    // Settings
    "settings.title": "Pode\u0161avanja",
    "settings.restart": "Ponovi istragu",
    "settings.restart_confirm": "Da li ste sigurni? Sav napredak \u0107e biti izgubljen.",
    "settings.restart_yes": "Da, ponovi",
    "settings.restart_cancel": "Otka\u017ei",
    "settings.language": "Jezik",

    // Title card
    "titlecard.open": "Otvori dosije",
    "titlecard.case_number": "Predmet #1247-B",
    "titlecard.division": "Odeljenje — Ubistva",

    // Keycard terminal
    "keycard.title": "\u25a0 HOTEL LYRIC ATRIUM \u2014 KONTROLA PRISTUPNIH KARTICA",
    "keycard.subtitle": "EVIDENCIJA \u2014 2024-11-15 \u2014 NO\u0106 GALE \u2014 SVE ZONE",
    "keycard.col_time": "VREME",
    "keycard.col_zone": "ZONA",
    "keycard.col_card": "KARTICA",
    "keycard.col_holder": "KORISNIK",
    "keycard.col_dir": "SMER",
    "keycard.col_status": "STATUS",
    "keycard.entry": "ULAZ",
    "keycard.exit": "IZLAZ",
    "keycard.granted": "ODOBRENO",
    "keycard.loading": "U\u010cITAVANJE ZAPISA O PRISTUPU...",
    "keycard.error": "GRE\u0160KA: NEMOGU\u0106E PREUZETI ZAPISE",
    "keycard.view_logs": "\u25b8 PREGLED SVIH ZAPISA",
    "keycard.system_offline": "NESTANAK STRUJE \u2014 Svi \u010dita\u010di kartica van funkcije. Aktivirano hitno osvetljenje. Rezervni generator nije uspeo da pokrene kontrolu pristupa.",
    "keycard.system_restored": "STRUJA POVRA\u0106ENA \u2014 Sistemi za kontrolu pristupa se ponovo pokre\u0107u. Svi \u010dita\u010di ponovo povezani. Sve zone se vra\u0107aju u normalan rad.",
    "keycard.zone.LOBBY-STAFF": "Slu\u017ebeni Ulaz (Bo\u010dni)",
    "keycard.zone.MAINT-LVL": "Nivo Odr\u017eavanja",
    "keycard.zone.CMD-CTR": "Komandni Centar Obezbe\u0111enja",
    "keycard.zone.KITCHEN": "Kuhinja i Priprema",
    "keycard.zone.BSTAGE": "Pozornica (Iza Scene)",
    "keycard.zone.BALL-MAIN": "Velika Balna Dvorana",
    "keycard.zone.BALL-SVC": "Servisni Hodnik Balne Dvorane",
    "keycard.zone.VIP-BAR": "VIP Bar i Salon",
    "keycard.zone.LOBBY-MAIN": "Glavni Ulaz (Lobi)",
    "keycard.zone.GUEST-7F": "Gostinski Sprat 7 (VIP)",
    "keycard.zone.SPEAK-LOUNGE": "Speakeasy Salon",
    "keycard.zone.LIBR-MAIN": "Hotelska Biblioteka",
    "keycard.zone.ROOF-OBS": "Krovna Opservatorija",
    "keycard.zone.ROOF-STAIR": "Krovne Servisne Stepenice",
    "keycard.zone.FRT-ELEV": "Teretni Lift",
    "keycard.zone.SVC-ELEV": "Servisni Lift",
    "keycard.zone.UTIL-CORR": "Tehni\u010dki Hodnik",
    "keycard.zone.CONF-2": "Sala za Sastanke 2",

    // Tutorial coach marks
    "tutorial.step_caseboard": "Ovo je vaša Tabla Slučaja — pregledajte dokaze i brifing ovde.",
    "tutorial.step_briefing": "Proširite Brifing o Slučaju da pregledate detalje zločina i početne dokaze.",
    "tutorial.step_suspects": "Prebacite se ovde da vidite sve osumnjičene koje možete ispitati.",
    "tutorial.step_npc_card": "Kliknite na osumnjičenog da započnete ispitivanje.",
    "tutorial.step_gauges": "Ovi pokazuju emocionalno stanje osumnjičenog — Pritisak i Poverenje.",
    "tutorial.step_info": "Dodirnite ovde da pročitate dosije osumnjičenog.",
    "tutorial.step_input": "Unesite pitanja ovde, ili dodirnite mikrofon za glasovni čet.",
    "tutorial.next": "Dalje",
    "tutorial.skip": "Preskoči",
    "tutorial.got_it": "Razumem",
    "tutorial.replay": "Ponovi Vodič",
  },
};

/**
 * Translate a key, interpolating {placeholder} tokens.
 * Falls back to English, then to the raw key.
 */
window.t = function t(key, vars) {
  const lang = window.currentLang || "en";
  let str = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp("\\{" + k + "\\}", "g"), v);
    }
  }
  return str;
};

/**
 * Apply translations to all elements with data-i18n attributes.
 * Elements with data-i18n-html use innerHTML; others use textContent.
 */
window.applyLanguage = function applyLanguage(lang) {
  window.currentLang = lang;
  localStorage.setItem("echoes_lang", lang);
  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const translated = t(key);
    if (el.hasAttribute("data-i18n-html")) {
      el.innerHTML = translated;
    } else {
      el.textContent = translated;
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });

  // Update language toggle active states
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
};
