/* ================================================================
   i18n — English / Serbian translations for Echoes in the Atrium
   ================================================================ */
window.I18N = {
  en: {
    // Title card
    "intro.subtitle": "A Murder Mystery Investigation",

    // Case briefing (case board)
    "intro.briefing_label": "Case Briefing",
    "intro.victim": "<strong>Victim:</strong> Julian Mercer, charismatic venture capitalist, majority owner of the Lyric Atrium Hotel, and CEO of the Panopticon surveillance startup — found dead in the hotel's rooftop observatory.",
    "intro.time_of_death": "<strong>Estimated Time of Death:</strong> Between 11:15 and 11:30 PM (during the power outage). The victim was bludgeoned with an antique telescope mount.",
    "intro.body_discovered": "<strong>Body Discovered:</strong> Approximately 11:44 PM by Security Director Matthias Holt in the rooftop observatory, during an exclusive tech-meets-jazz gala at the historic 1920s art deco hotel.",
    "intro.circumstances": "<strong>Circumstances:</strong> A power outage struck between 11:15 and 11:30 PM — the breaker was pulled manually. Stormy weather delayed police arrival, giving suspects time to coordinate alibis.",
    "intro.starting_evidence": "<strong>Initial Evidence:</strong> The murder weapon \u2014 an antique telescope mount \u2014 was found smashed beside the body. Forensics recovered a <em>burned notebook fragment</em> from the basement incinerator; it contains a partial list of names that appears to be a blackmail or threat list. The name <em>'Matt'</em> is legible. Hotel security has also provided <em>keycard access logs</em> for the rooftop. Use these to press suspects during interrogation.",
    "intro.your_role": "<strong>Your Role:</strong> You are the lead detective. Interrogate eight persons of interest — each with their own secrets, motives, and knowledge boundaries. Uncover contradictions, gather evidence, and identify the killer.",
    "intro.your_partner": "<strong>Your Partner:</strong> Detective Lila Chen will assist with tactical advice and legal guidance. She is your trusted partner.",
    "intro.tip": "<strong>Tip:</strong> Suspects will guard their secrets carefully. Present evidence and build pressure to break through their defenses. Pay attention to contradictions between testimonies.",

    // Hub screen
    "hub.tab_suspects": "Persons of Interest",
    "hub.tab_caseboard": "Case Board",
    "chat.back_to_hub": "Case Files",
    "chat.nav_suspects": "Persons of Interest",
    "chat.nav_caseboard": "Case Board",
    "chat.hint_btn": "Case Hint",
    "chat.hint_prompt": "Review the current state of the investigation. What evidence have we collected, what discoveries have we made, and based on that — who should I question next or what lead should I pursue?",
    "chat.hint_display.0": "What do you think about this case so far?",
    "chat.hint_display.1": "Help me out here — what should I do next?",
    "chat.hint_display.2": "I'm stuck. What's your read on the situation?",
    "chat.hint_display.3": "Walk me through what we've got so far.",
    "chat.hint_display.4": "Lila, where should I be focusing right now?",
    "chat.hint_display.5": "Give me a rundown — where do we stand?",
    "chat.hint_display.6": "What's your gut telling you about this case?",
    "chat.hint_display.7": "Any ideas on who I should press next?",
    "chat.hint_display.8": "I could use a fresh perspective. What are we missing?",
    "chat.hint_display.9": "Talk me through it — what have we learned so far?",
    "chat.dossier_heading": "Dossier",
    "sidebar.header": "Persons of Interest",
    "sidebar.accuse": "Make an Arrest",
    "chat.status_available": "Available for questioning",
    "chat.status_responding": "Responding\u2026",
    "chat.placeholder": "Select a person of interest to begin interrogation.",
    "chat.input_placeholder": "Type your question\u2026",
    "chat.hint": "Begin your interrogation of {name}. What would you like to ask?",
    "chat.sender_you": "You",
    "chat.error": "Error: {message}. Check that the server is running.",
    "chat.badge_title": "Interviewed",
    "chat.discovery_label": "Discovery",
    "toast.new_discovery": "New Discovery",
    "toast.subpoena": "Subpoenas take time to process. Keep investigating \u2014 what witnesses tell you about evidence is just as valuable as the physical item.",

    // Evidence panel
    "evidence.tab": "Evidence and Discoveries",
    "evidence.dossiers_tab": "Dossiers",
    "evidence.timeline_tab": "Timeline",
    "evidence.empty": "No evidence collected yet. Interrogate suspects to uncover clues.",
    "evidence.timeline_empty": "Events will appear here as you piece together what happened.",
    "evidence.mentioned_by": "Mentioned by {name} during interrogation.",
    "evidence.mentioned_by_partner": "Shared by {name} during case briefing.",
    "evidence.crime_scene": "Recovered from the crime scene by forensics.",
    "evidence.burned-notebook_desc": "Recovered from the basement incinerator. Contains a partial list of names — appears to be a blackmail or threat list. The name 'Matt' is legible.",
    "evidence.security_systems": "Obtained from hotel security systems.",

    // Evidence labels (for i18n support in evidence catalog)
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

    // Arrest modal
    "accuse.title": "Formal Arrest",
    "accuse.description": "This is irreversible. Select the person you believe committed the murder. Choose carefully \u2014 an incorrect arrest will end your investigation.",
    "accuse.cancel": "Cancel",
    "accuse.confirm": "Confirm Arrest",

    // Outcome screen
    "outcome.slam_dunk_title": "Case Closed \u2014 Killer Behind Bars",
    "outcome.slam_dunk_text": "<p>Your arrest of <strong>{name}</strong> is airtight.</p><p>Noah Sterling murdered Julian Mercer to prevent his embezzlement from being exposed and to seize control of the Panopticon startup. He pressured Eddie Voss into handing over the maintenance-room key and engineering keycard, then used them during the blackout to reach the rooftop observatory and bludgeon Mercer with the antique telescope mount.</p><p>With clear motive and undeniable proof he was at the scene, the prosecution secures a full conviction. Sterling is put away for a long time.</p><p style=\"margin-top:1rem; color:var(--gold);\">Evidence collected: {evidenceCount} items &bull; Suspects interviewed: {interviewCount}</p>",
    "outcome.plea_deal_title": "Plea Deal \u2014 Short Sentence",
    "outcome.plea_deal_text": "<p>You arrested the right person \u2014 <strong>{name}</strong> killed Julian Mercer.</p><p>But your case only established part of the picture. Without both a clear motive and evidence placing him at the scene, the prosecution offered a plea deal. Sterling accepts a reduced sentence.</p><p>You got the right suspect, but you\u2019re left with the sense you could have done more.</p><p style=\"margin-top:1rem; color:var(--gold);\">Evidence collected: {evidenceCount} items &bull; Suspects interviewed: {interviewCount}</p>",
    "outcome.released_title": "Suspect Released \u2014 Insufficient Evidence",
    "outcome.released_text": "<p>You arrested <strong>{name}</strong>, and your instinct was correct \u2014 he is the killer.</p><p>But without evidence establishing a clear motive or placing him at the scene, the prosecution cannot hold him. Sterling is released and quickly covers his tracks. The case goes cold.</p><p>You believe you found the killer, but you just can\u2019t prove it.</p><p style=\"margin-top:1rem; color:var(--gold);\">Evidence collected: {evidenceCount} items &bull; Suspects interviewed: {interviewCount}</p>",
    "outcome.wrong_title": "Wrong Suspect",
    "outcome.wrong_text": "<p>You arrested <strong>{name}</strong>, but they are not the killer.</p><p>The real murderer slips away as internal affairs questions your judgment. The case goes cold.</p><p style=\"margin-top:1rem; color:var(--text-faint);\">Keep investigating \u2014 look for contradictions in alibis, follow the physical evidence, and trace the maintenance-room key and engineering keycard.</p>",
    "outcome.restart": "New Investigation",

    // NPC roles
    "role.lila-chen": "Your Partner",
    "role.amelia-reyes": "Head Engineer",
    "role.noah-sterling": "Co-Founder",
    "role.celeste-ward": "Jazz Vocalist",
    "role.matthias-holt": "Security Director",
    "role.mira-kline": "Ethicist Consultant",
    "role.eddie-voss": "Junior Engineer",
    "role.priya-shah": "Journalist",
    "role.matthew-vale": "Stage Manager",

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
    "dossier.matthias-holt.bio": "Director of Security at the Lyric Atrium Hotel. Former military intelligence \u2014 two tours overseas. Stern, rule-bound, with a black-and-white worldview. Has full access to all hotel security systems including cameras, door sensors, and keycard readers. Coordinated emergency protocols during the outage.",
    "dossier.mira-kline.bio": "Ethicist consultant with a PhD in Bioethics. Brought in by Mercer six months ago to review Panopticon's compliance and public ethics profile. Previously published papers critical of unregulated surveillance technology. Was hosting an ethics roundtable in the library during the outage.",
    "dossier.eddie-voss.bio": "Amelia Reyes's engineering protege and the hotel's junior engineer. Despite his talent for engineering, his true passion is mixology — he volunteered to tend the VIP bar tonight. Has worked at the Lyric Atrium for three years. Known among staff for his nervous disposition and eagerness to please. Helped calm guests during the blackout.",
    "dossier.priya-shah.bio": "Investigative journalist covering corporate surveillance abuses. Attended the gala as invited press to cover the Panopticon unveiling. Has previously broken stories on tech industry misconduct. Sharp, probing, and protective of her sources. Press credentials gave her roaming access to the venue.",
    "dossier.matthew-vale.bio": "Meticulous freelance stage manager responsible for lighting, sound cues, and technical production of the gala. Has worked events at the Lyric Atrium for two years. Tracks every performer's cue and logistics with operational precision. Stayed backstage coordinating the show during the outage.",

    // Discovery texts
    "discovery.amelia-key-loan": "Amelia admits she lent her maintenance-room key and engineering keycard to Eddie Voss earlier that evening to retrieve a misplaced toolkit.",
    "discovery.amelia-breaker": "Amelia deliberately pulled the breaker to search Mercer's suite for proof that he planned to sell the hotel.",
    "discovery.amelia-hotel-sale": "Amelia learned that Mercer intended to sell the Lyric Atrium Hotel to a developer, threatening the hotel's heritage.",
    "discovery.amelia-lockpick": "Lockpick marks on the maintenance room door suggest someone without the key forced entry \u2014 Amelia's key was already with Eddie.",
    "discovery.noah-embezzlement": "Financial records reveal Noah Sterling embezzled company funds to cover gambling debts. Mercer found out.",
    "discovery.noah-board-vote": "Mercer's encrypted schedule reveals he planned a surprise board vote to oust Noah from the company.",
    "discovery.noah-key-access": "The maintenance-room key and engineering keycard trail leads from Amelia to Eddie to Noah \u2014 giving Noah access to the rooftop during the blackout.",
    "discovery.noah-cctv-gap": "CCTV footage gaps and witness sightings place Noah near the freight elevator and on the B1 elevator lobby camera during the blackout.",
    "discovery.celeste-affair": "Celeste and Julian Mercer had a secret romantic relationship. He promised to free her from a predatory management contract.",
    "discovery.celeste-recordings": "Celeste possesses audio recordings of Mercer admitting to illegal surveillance tactics used in Panopticon.",
    "discovery.celeste-rooftop-witness": "Celeste saw a figure \u2014 recognizable as Noah Sterling \u2014 descending the atrium stairwell during the blackout.",
    "discovery.matthias-blackmail": "Mercer was blackmailing Matthias \u2014 his name appears on the burned notebook fragment's threat list.",
    "discovery.matthias-data-sales": "Matthias has been running a side business selling anonymized guest data from the hotel's systems.",
    "discovery.matthias-saw-noah": "Matthias saw Noah Sterling on the B1 elevator lobby camera entering the service elevator lobby right before the blackout began.",
    "discovery.matthias-noah-financial": "Matthias reveals that during his confrontation with Mercer, Mercer mentioned Noah had been skimming company funds and the board would deal with it.",
    "discovery.mira-plagiarism": "Mercer plagiarized Dr. Kline's research for the Panopticon ethics framework. She planned to expose him publicly.",
    "discovery.mira-meeting": "Mira scheduled a private meeting with Mercer at 11:30 PM to demand a public admission. Mercer never showed \u2014 he was already dead.",
    "discovery.eddie-key-loan": "Eddie Voss borrowed Amelia's maintenance-room key and engineering keycard to retrieve a toolkit and forgot to return them immediately.",
    "discovery.eddie-gave-noah-key": "Noah Sterling pressured Eddie into handing over the maintenance-room key and engineering keycard at the VIP bar earlier that evening, promising favors.",
    "discovery.priya-saw-noah": "Priya witnessed Noah Sterling near the freight elevator shortly before the lights went out.",
    "discovery.priya-holt-argument": "Priya recorded snippets of an argument between Mercer and Matthias Holt earlier that evening.",
    "discovery.priya-board-vote": "Priya reveals that a corporate source told her Panopticon's board was planning an emergency vote to remove a co-founder \u2014 likely Noah Sterling.",
    "discovery.priya-mira-tip": "Dr. Mira Kline tipped off Priya about Mercer's ethics violations and arranged her attendance at the gala.",
    "discovery.matthew-noah-absence": "Matthew's cue sheet shows Noah Sterling was absent for a 5-minute gap before the blackout, and roughly 30 minutes total before reappearing.",
    "discovery.matthew-celeste-break": "Matthew noticed Celeste Ward took an unscheduled break during the blackout, suggesting she saw something.",

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

    "starter.matthias-holt.1": "Walk me through what happened during the blackout.",
    "starter.matthias-holt.2": "Is there security footage from tonight?",
    "starter.matthias-holt.3": "Who had access to the rooftop observatory?",

    "starter.mira-kline.1": "What exactly is your role with the Panopticon project?",
    "starter.mira-kline.2": "Did you have any ethical concerns about Mercer's work?",
    "starter.mira-kline.3": "How well did you know Julian Mercer personally?",

    "starter.eddie-voss.1": "Did you notice anything unusual tonight?",
    "starter.eddie-voss.2": "Who was at the bar around the time of the murder?",
    "starter.eddie-voss.3": "Tell me about your work here at the hotel.",

    "starter.priya-shah.1": "What brought you to the gala tonight?",
    "starter.priya-shah.2": "What story were you working on about Panopticon?",
    "starter.priya-shah.3": "Did anyone try to feed you information tonight?",

    "starter.matthew-vale.1": "You were backstage during the blackout. What happened?",
    "starter.matthew-vale.2": "Did anyone leave the stage area during the outage?",
    "starter.matthew-vale.3": "Did you notice anyone backstage who shouldn't have been there?",

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
    "endgame.description": "You have gathered all the key evidence needed to build a case. Review your evidence, make an arrest, or continue investigating for additional details.",
    "endgame.review": "Review Evidence",
    "endgame.accuse": "Make Arrest",
    "endgame.continue": "Keep Investigating",
    "endgame.accuse_cta": "Ready to Make Your Arrest?",

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
    "tutorial.step_briefing": "Expand or collapse the Case Briefing here.",
    "tutorial.step_suspects": "Click this tab to see all persons of interest.",
    "tutorial.step_partner": "This is your partner, Detective Lila Chen. She can brief you on the case and offer guidance.",
    "tutorial.step_npc_card": "Click a suspect to begin interrogating them.",
    "tutorial.step_gauges": "These show the suspect's emotional state — Pressure and Trust.",
    "tutorial.step_info_desktop": "Hover here to read the suspect's background dossier.",
    "tutorial.step_info_mobile": "Tap here to read the suspect's background dossier.",
    "tutorial.step_input": "Type your questions here, or tap the mic for voice chat.",
    "tutorial.step_hint_btn": "Use this button to ask Lila for a case hint — she'll review the evidence and suggest what to pursue next.",
    "tutorial.next": "Next",
    "tutorial.skip": "Skip",
    "tutorial.got_it": "Got it",
    "tutorial.replay": "Replay Tutorial",
  },

  sr: {
    // Title card
    "intro.subtitle": "Istraga ubistva",

    // Case briefing (case board)
    "intro.briefing_label": "Brifing o Slu\u010daju",
    "intro.victim": "<strong>\u017drtva:</strong> D\u017eulijan Merser, harizamti\u010dan preduzetnik, ve\u0107inski vlasnik hotela Lyric Atrium i direktor startapa Panopticon za nadzor \u2014 prona\u0111en mrtav u opservatoriji na krovu hotela.",
    "intro.time_of_death": "<strong>Procenjeno vreme smrti:</strong> Izme\u0111u 23:15 i 23:30 (tokom nestanka struje). \u017drtva je ubijena anti\u010dkim postolem teleskopa.",
    "intro.body_discovered": "<strong>Telo prona\u0111eno:</strong> Pribli\u017eno u 23:44, od strane direktora obezbe\u0111enja Matijasa Holta u opservatoriji na krovu, tokom ekskluzivne gala ve\u010deri u istorijskom art deko hotelu iz 1920-ih.",
    "intro.circumstances": "<strong>Okolnosti:</strong> Nestanak struje je trajao od 23:15 do 23:30 \u2014 neko je ru\u010dno iskop\u010dao osigura\u010d. Olujno vreme je usporilo dolazak policije, daju\u0107i osumnji\u010denima vremena da usklade alibije.",
    "intro.starting_evidence": "<strong>Po\u010detni dokazi:</strong> Oru\u017eje ubistva \u2014 anti\u010dko postolje teleskopa \u2014 prona\u0111eno je razbijeno pored tela. Forenzi\u010dari su prona\u0161li <em>spaljen fragment bele\u017enice</em> u podrumskom spalioniku; sadr\u017ei delimi\u010dnu listu imena koja izgleda kao lista za ucenu ili pretnje. Ime <em>\u2018Matt\u2019</em> je \u010ditljivo. Hotelsko obezbe\u0111enje je tako\u0111e obezbedilo <em>evidenciju pristupnih kartica</em> za krov. Koristite ovo da pritisnete osumnji\u010dene tokom ispitivanja.",
    "intro.your_role": "<strong>Va\u0161a uloga:</strong> Vi ste glavni detektiv. Ispitajte osam osumnji\u010denih \u2014 svaki sa sopstvenim tajnama, motivima i ograni\u010denjima znanja. Otkrijte kontradikcije, prikupite dokaze i identifikujte ubicu.",
    "intro.your_partner": "<strong>Va\u0161 partner:</strong> Detektiv Lila \u010cen \u0107e vam pomo\u0107i sa takti\u010dkim savetima i pravnim smernicama. Po\u010dnite sa njom za pregled slu\u010daja.",
    "intro.tip": "<strong>Savet:</strong> Likovi \u0107e pa\u017eeljivo \u010duvati svoje tajne. Predstavite dokaze i izgradite pritisak da probijete njihovu odbranu. Obratite pa\u017enju na kontradikcije izme\u0111u svedo\u010denja.",

    // Hub screen
    "hub.tab_suspects": "Osumnji\u010deni",
    "hub.tab_caseboard": "Tabla Slu\u010daja",
    "chat.back_to_hub": "Dosijei",
    "chat.nav_suspects": "Osumnjičeni",
    "chat.nav_caseboard": "Tabla Slučaja",
    "chat.hint_btn": "Savet za slučaj",
    "chat.hint_prompt": "Pregledaj trenutno stanje istrage. Koje dokaze smo prikupili, šta smo otkrili, i na osnovu toga — koga treba sledećeg da ispitam ili koji trag treba da pratim?",
    "chat.hint_display.0": "Šta misliš o ovom slučaju do sada?",
    "chat.hint_display.1": "Pomozi mi — šta treba sledeće da uradim?",
    "chat.hint_display.2": "Zaglavila sam. Kako ti vidiš situaciju?",
    "chat.hint_display.3": "Provedi me kroz ono što imamo do sada.",
    "chat.hint_display.4": "Lila, na šta treba da se fokusiram sada?",
    "chat.hint_display.5": "Daj mi pregled — gde stojimo?",
    "chat.hint_display.6": "Šta ti kaže instinkt za ovaj slučaj?",
    "chat.hint_display.7": "Imaš li ideju koga sledeće treba da pritisnem?",
    "chat.hint_display.8": "Treba mi sveža perspektiva. Šta propuštamo?",
    "chat.hint_display.9": "Pričaj mi — šta smo do sada saznali?",
    "chat.dossier_heading": "Dosije",
    "sidebar.header": "Osumnji\u010deni",
    "sidebar.accuse": "Izvr\u0161i Hap\u0161enje",
    "chat.status_available": "Dostupan za ispitivanje",
    "chat.status_responding": "Odgovara\u2026",
    "chat.placeholder": "Izaberite osumnji\u010denog da po\u010dnete ispitivanje.",
    "chat.input_placeholder": "Unesite pitanje\u2026",
    "chat.hint": "Zapo\u010dnite ispitivanje \u2014 {name}. \u0160ta \u017eelite da pitate?",
    "chat.sender_you": "Vi",
    "chat.error": "Gre\u0161ka: {message}. Proverite da li server radi.",
    "chat.badge_title": "Ispitan/a",
    "chat.discovery_label": "Otkri\u0107e",
    "toast.new_discovery": "Novo Otkriće",
    "toast.subpoena": "Sudski nalozi zahtevaju vreme. Nastavite istragu \u2014 ono \u0161to vam svedoci ka\u017eu o dokazima jednako je vredno kao i sam fizi\u010dki predmet.",

    // Evidence panel
    "evidence.tab": "Dokazi i otkri\u0107a",
    "evidence.dossiers_tab": "Dosijei",
    "evidence.timeline_tab": "Hronologija",
    "evidence.empty": "Nema prikupljenih dokaza. Ispitajte osumnji\u010dene da biste otkrili tragove.",
    "evidence.timeline_empty": "Doga\u0111aji \u0107e se pojaviti ovde dok sklapate sliku o tome \u0161ta se desilo.",
    "evidence.mentioned_by": "Pomenuo/la {name} tokom ispitivanja.",
    "evidence.mentioned_by_partner": "Podeljeno od {name} tokom brifinga o slučaju.",
    "evidence.crime_scene": "Prona\u0111eno na mestu zlo\u010dina od strane forenzi\u010dara.",
    "evidence.burned-notebook_desc": "Prona\u0111eno u podrumskom spalioniku. Sadr\u017ei delimi\u010dnu listu imena \u2014 izgleda kao lista za ucenu ili pretnje. Ime \u2018Matt\u2019 je \u010ditljivo.",
    "evidence.security_systems": "Dobijeno iz hotelskih sigurnosnih sistema.",

    // Evidence labels
    "evidence.burned-notebook_label": "Spaljen Fragment Bele\u017enice",
    "evidence.keycard-logs_label": "Evidencija Pristupnih Kartica",
    "evidence.key-trail_label": "Trag Klju\u010da za Odr\u017eavanje",
    "evidence.power-outage_label": "Namerna Sabota\u017ea Struje",
    "evidence.encrypted-schedule_label": "\u0160ifrovani Raspored",
    "evidence.financial-misconduct_label": "Finansijske Nepravilnosti",
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

    // Arrest modal
    "accuse.title": "Zvani\u010dno Hap\u0161enje",
    "accuse.description": "Ovo je nepovratno. Izaberite osobu za koju verujete da je po\u010dinila ubistvo. Birajte pa\u017eljivo \u2014 pogre\u0161no hap\u0161enje \u0107e zavr\u0161iti va\u0161u istragu.",
    "accuse.cancel": "Otka\u017ei",
    "accuse.confirm": "Potvrdi Hap\u0161enje",

    // Outcome screen
    "outcome.slam_dunk_title": "Slu\u010daj Zatvoren \u2014 Ubica Iza Re\u0161etaka",
    "outcome.slam_dunk_text": "<p>Va\u0161e hap\u0161enje <strong>{name}</strong> je nepobitno.</p><p>Noa Sterling je ubio D\u017eulijana Mersera da spre\u010di otkrivanje pronevere i preuzme kontrolu nad startapom Panopticon. Pritiskao je Edija Vosa da mu preda klju\u010d za odr\u017eavanje, a zatim ga iskoristio tokom nestanka struje da pristupi opservatoriji na krovu i ubije Mersera anti\u010dkim postoljem teleskopa.</p><p>Sa jasnim motivom i nepobitnim dokazom prisustva na mestu zlo\u010dina, tu\u017eila\u0161tvo osigurava punu osudu. Sterling odlazi na dugogodi\u0161nju robiju.</p><p style=\"margin-top:1rem; color:var(--gold);\">Prikupljeni dokazi: {evidenceCount} &bull; Ispitani osumnji\u010deni: {interviewCount}</p>",
    "outcome.plea_deal_title": "Nagodba \u2014 Kratka Kazna",
    "outcome.plea_deal_text": "<p>Uhapsili ste pravu osobu \u2014 <strong>{name}</strong> je ubio D\u017eulijana Mersera.</p><p>Me\u0111utim, va\u0161 slu\u010daj je utvrdio samo deo slike. Bez jasnog motiva i dokaza o prilici, tu\u017eila\u0161tvo je ponudilo nagodbu. Sterling prihvata smanjenu kaznu.</p><p>Pravi osumnji\u010deni, ali ostaje vam ose\u0107aj da ste mogli vi\u0161e.</p><p style=\"margin-top:1rem; color:var(--gold);\">Prikupljeni dokazi: {evidenceCount} &bull; Ispitani osumnji\u010deni: {interviewCount}</p>",
    "outcome.released_title": "Osumnji\u010deni Pu\u0161ten \u2014 Nedovoljno Dokaza",
    "outcome.released_text": "<p>Uhapsili ste <strong>{name}</strong>, i va\u0161 instinkt je bio ta\u010dan \u2014 on je ubica.</p><p>Ali bez dokaza koji utvr\u0111uju jasan motiv ili ga stavljaju na mesto zlo\u010dina, tu\u017eila\u0161tvo ga ne mo\u017ee zadr\u017eati. Sterling je pu\u0161ten i prikriva tragove. Slu\u010daj se gasi.</p><p>Verujete da ste na\u0161li ubicu, ali jednostavno ne mo\u017eete to da doka\u017eete.</p><p style=\"margin-top:1rem; color:var(--gold);\">Prikupljeni dokazi: {evidenceCount} &bull; Ispitani osumnji\u010deni: {interviewCount}</p>",
    "outcome.wrong_title": "Pogre\u0161an Osumnji\u010deni",
    "outcome.wrong_text": "<p>Uhapsili ste <strong>{name}</strong>, ali ta osoba nije ubica.</p><p>Pravi ubica izmi\u010de dok unutra\u0161nja kontrola dovodi u pitanje va\u0161 sud. Slu\u010daj se gasi.</p><p style=\"margin-top:1rem; color:var(--text-faint);\">Nastavite istragu \u2014 tra\u017eite kontradikcije u alibijima, pratite fizi\u010dke dokaze i trag klju\u010da za odr\u017eavanje.</p>",
    "outcome.restart": "Nova Istraga",

    // NPC roles
    "role.lila-chen": "Va\u0161 Partner",
    "role.amelia-reyes": "Glavni In\u017eenjer",
    "role.noah-sterling": "Koosni\u0160a\u010d",
    "role.celeste-ward": "D\u017eez Peva\u010dica",
    "role.matthias-holt": "Direktor Obezbe\u0111enja",
    "role.mira-kline": "Etik Konsultant",
    "role.eddie-voss": "Mladi in\u017eenjer",
    "role.priya-shah": "Novinarka",
    "role.matthew-vale": "Menad\u017eer Scene",

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
    "dossier.matthias-holt.bio": "Direktor obezbe\u0111enja hotela Lyric Atrium. Biv\u0161i vojni obave\u0161tajac \u2014 dve ture u inostranstvu. Strog, principijelan, sa crno-belim pogledom na svet. Ima potpun pristup svim hotelskim bezbednosnim sistemima uklju\u010duju\u0107i kamere, senzore i \u010dita\u010de kartica. Koordinirao je hitne protokole tokom nestanka struje.",
    "dossier.mira-kline.bio": "Eti\u010darka i konsultant sa doktoratom iz bioetike. Merser ju je anga\u017eovao pre \u0161est meseci da pregleda usklađenost i eti\u010dki profil Panopticona. Ranije objavljivala radove kriti\u010dne prema neregulisanim tehnologijama nadzora. Vodila je okrugli sto o etici u biblioteci tokom nestanka struje.",
    "dossier.eddie-voss.bio": "In\u017eenjerski \u0161ti\u0107enik Amelije Rejes i mladi in\u017eenjer hotela. Uprkos talentu za in\u017eenjering, prava strast mu je miksologija \u2014 dobrovoljno je slu\u017eio VIP bar ve\u010deras. Radi u Lyric Atriumu tri godine. Me\u0111u osobljem poznat po nervoznoj naravi i \u017eelji da udovolji. Pomagao da se gosti smire tokom nestanka struje.",
    "dossier.priya-shah.bio": "Istra\u017eiva\u010dka novinarka koja prati zloupotrebe u oblasti korporativnog nadzora. Do\u0161la na galu kao pozvana \u0161tampa da pokrije predstavljanje Panopticona. Ranije je objavljivala pri\u010de o zlouporeti u tehnolo\u0161koj industriji. O\u0161tra, istra\u017ena i za\u0161titni\u010dka prema izvorima. Novinarska akreditacija joj je omogu\u0107ila pristup ve\u0107ini prostorija.",
    "dossier.matthew-vale.bio": "Pedantan slobodni menad\u017eer scene zadu\u017een za osvetljenje, zvu\u010dne signale i tehni\u010dku produkciju gale. Radio je doga\u0111aje u Lyric Atriumu dve godine. Prati svaki signal i logistiku izvo\u0111a\u010da sa operativnom precizno\u0161\u0107u. Ostao je iza scene koordiniraju\u0107i \u0161ou tokom nestanka struje.",

    // Discovery texts
    "discovery.amelia-key-loan": "Amelija priznaje da je pozajmila klju\u010d za odr\u017eavanje Ediju Vosu ranije te ve\u010deri da bi preuzeo zaboravljeni alat.",
    "discovery.amelia-breaker": "Amelija je namerno iskop\u010dala osigura\u010d da pretra\u017ei Merserov apartman u potrazi za dokazima da planira prodaju hotela.",
    "discovery.amelia-hotel-sale": "Amelija je saznala da Merser namerava da proda hotel Lyric Atrium investitoru, \u0161to bi ugrozilo nasle\u0111e hotela.",
    "discovery.amelia-lockpick": "Tragovi obijanja na vratima prostorije za odr\u017eavanje ukazuju da je neko bez klju\u010da nasilno u\u0161ao \u2014 Amelijin klju\u010d je ve\u0107 bio kod Edija.",
    "discovery.noah-embezzlement": "Finansijski izve\u0161taji otkrivaju da je Noa Sterling pronevero sredstva kompanije da pokrije kockarske dugove. Merser je to otkrio.",
    "discovery.noah-board-vote": "Merserov \u0161ifrovani raspored otkriva da je planirao iznenadno glasanje uprave da ukloni Nou iz kompanije.",
    "discovery.noah-key-access": "Trag klju\u010da za odr\u017eavanje vodi od Amelije do Edija pa do Noe \u2014 daju\u0107i Noi pristup krovu tokom nestanka struje.",
    "discovery.noah-cctv-gap": "Praznine u CCTV snimcima i svedo\u010denja o\u010devidaca postavljaju Nou blizu teretnog lifta i hodnika za odr\u017eavanje tokom nestanka struje.",
    "discovery.celeste-affair": "Selest i D\u017eulijan Merser su imali tajnu romansu. On joj je obe\u0107ao da \u0107e je osloboditi nepovoljnog menad\u017eerskog ugovora.",
    "discovery.celeste-recordings": "Selest poseduje audio snimke na kojima Merser priznaje kori\u0161\u0107enje nelegalnih taknika nadzora u Panopticonu.",
    "discovery.celeste-rooftop-witness": "Selest je videla figuru \u2014 prepoznatljivu kao Noa Sterling \u2014 kako silazi niz stepeni\u0161te atrijuma tokom nestanka struje.",
    "discovery.matthias-blackmail": "Merser je ucenjivao Matijasa \u2014 njegovo ime se nalazi na listi pretnji iz spaljenog fragmenta bele\u017enice.",
    "discovery.matthias-data-sales": "Matijas vodi sporedni posao prodaje anonimizovanih podataka gostiju iz hotelskih sistema.",
    "discovery.matthias-saw-noah": "Matijas je video Nou Sterlinga kako se \u0161unja ka hodnicima za odr\u017eavanje neposredno pre nestanka struje.",
    "discovery.matthias-noah-financial": "Matijas otkriva da je tokom konfrontacije sa Merserom, Merser pomenuo da je Noa skidao novac sa ra\u010duna kompanije i da \u0107e se uprava time pozabaviti.",
    "discovery.mira-plagiarism": "Merser je plagirao istra\u017eivanje Dr Klajn za eti\u010dki okvir Panopticona. Ona je planirala da ga javno razotkrije.",
    "discovery.mira-meeting": "Mira je zakazala privatni sastanak sa Merserom u 23:30 da zahteva javno priznanje. Merser se nije pojavio \u2014 ve\u0107 je bio mrtav.",
    "discovery.eddie-key-loan": "Edi Vos je pozajmio Amelijin klju\u010d za odr\u017eavanje da preuzme alat i zaboravio da ga odmah vrati.",
    "discovery.eddie-gave-noah-key": "Noa Sterling je pritiskao Edija da mu preda klju\u010d za odr\u017eavanje na VIP baru ranije te ve\u010deri, obe\u0107avaju\u0107i usluge.",
    "discovery.priya-saw-noah": "Prija je videla Nou Sterlinga blizu teretnog lifta neposredno pre nego \u0161to je nestalo struje.",
    "discovery.priya-holt-argument": "Prija je snimila delove sva\u0111e izme\u0111u Mersera i Matijasa Holta ranije te ve\u010deri.",
    "discovery.priya-board-vote": "Prija otkriva da joj je korporativni izvor rekao da uprava Panopticona planira hitno glasanje za uklanjanje koosni\u010da\u010da \u2014 verovatno Noe Sterlinga.",
    "discovery.priya-mira-tip": "Dr Mira Klajn je obavestila Priju o Merserovim eti\u010dkim prekr\u0161ajima i organizovala njeno prisustvo na gali.",
    "discovery.matthew-noah-absence": "Metjuov raspored signala pokazuje da se Noa Sterling udaljio na pribli\u017eno pet minuta tokom nestanka struje.",
    "discovery.matthew-celeste-break": "Metju je primetio da je Selest Vord imala nezakazanu pauzu tokom nestanka struje, \u0161to ukazuje da je ne\u0161to videla.",

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

    "starter.matthias-holt.1": "Ispri\u010dajte mi \u0161ta se desilo tokom nestanka struje.",
    "starter.matthias-holt.2": "Postoje li snimci sigurnosnih kamera od ve\u010deras?",
    "starter.matthias-holt.3": "Ko je imao pristup opservatoriji na krovu?",

    "starter.mira-kline.1": "Koja je ta\u010dno va\u0161a uloga u projektu Panopticon?",
    "starter.mira-kline.2": "Da li ste imali eti\u010dke primedbe na Merserov rad?",
    "starter.mira-kline.3": "Koliko dobro ste poznavali D\u017eulijana Mersera li\u010dno?",

    "starter.eddie-voss.1": "Da li ste primetili ne\u0161to neubi\u010dajeno ve\u010deras?",
    "starter.eddie-voss.2": "Ko je bio za barom oko vremena ubistva?",
    "starter.eddie-voss.3": "Pri\u010dajte mi o va\u0161em radu ovde u hotelu.",

    "starter.priya-shah.1": "\u0160ta vas je dovelo na galu ve\u010deras?",
    "starter.priya-shah.2": "Na kojoj pri\u010di ste radili o Panopticonu?",
    "starter.priya-shah.3": "Da li vam je neko poku\u0161ao proslediti informacije ve\u010deras?",

    "starter.matthew-vale.1": "Bili ste iza scene tokom nestanka struje. \u0160ta se desilo?",
    "starter.matthew-vale.2": "Da li je neko napustio prostor scene tokom nestanka struje?",
    "starter.matthew-vale.3": "Da li ste primetili nekoga iza scene ko nije trebalo da bude tamo?",

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
    "endgame.description": "Prikupili ste sve klju\u010dne dokaze potrebne za izgradnju slu\u010daja. Pregledajte dokaze, izvr\u0161ite hap\u0161enje ili nastavite istragu za dodatne detalje.",
    "endgame.review": "Pregledaj Dokaze",
    "endgame.accuse": "Izvr\u0161i Hap\u0161enje",
    "endgame.continue": "Nastavi Istragu",
    "endgame.accuse_cta": "Spremni za Hap\u0161enje?",

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
    "tutorial.step_briefing": "Otvorite ili zatvorite brifing o slučaju ovde.",
    "tutorial.step_suspects": "Kliknite na ovu karticu da vidite sve osumnjičene.",
    "tutorial.step_partner": "Ovo je vaš partner, detektiv Lila Chen. Ona vas može informisati o slučaju i ponuditi smernice.",
    "tutorial.step_npc_card": "Kliknite na osumnjičenog da započnete ispitivanje.",
    "tutorial.step_gauges": "Ovi pokazuju emocionalno stanje osumnjičenog — Pritisak i Poverenje.",
    "tutorial.step_info_desktop": "Pređite kursorom ovde da pročitate dosije osumnjičenog.",
    "tutorial.step_info_mobile": "Dodirnite ovde da pročitate dosije osumnjičenog.",
    "tutorial.step_input": "Unesite pitanja ovde, ili dodirnite mikrofon za glasovni čet.",
    "tutorial.step_hint_btn": "Koristite ovo dugme da pitate Lilu za savet — ona će pregledati dokaze i predložiti šta dalje da istražite.",
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
