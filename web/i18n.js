/* ================================================================
   i18n — English / Serbian translations for Echoes in the Atrium
   ================================================================ */
window.I18N = {
  en: {
    // Intro screen
    "intro.title": "Echoes in the Atrium",
    "intro.subtitle": "A Murder Mystery Investigation",
    "intro.briefing_label": "Case Briefing",
    "intro.victim": "<strong>Victim:</strong> Adrian Shore, CEO of Vireo Dynamics, found dead in his private skydeck office at the Skyline Atrium in Chicago.",
    "intro.time_of_death": "<strong>Time of Death:</strong> Approximately 11:58 PM, during the midnight product reveal gala for Project Calypso \u2014 a neural interface rumored to redefine human-machine collaboration.",
    "intro.circumstances": "<strong>Circumstances:</strong> The lights flickered during the unveiling. When power was restored, Shore was found dead. Stormy weather delayed first responders, giving suspects time to coordinate alibis.",
    "intro.your_role": "<strong>Your Role:</strong> You are the lead detective. Interrogate nine persons of interest \u2014 each with their own secrets, motives, and knowledge boundaries. Uncover contradictions, gather evidence, and identify the killer.",
    "intro.your_partner": "<strong>Your Partner:</strong> Detective Lila Chen will assist with tactical advice and legal guidance. Start with her for an overview of the case.",
    "intro.tip": "<strong>Tip:</strong> NPCs will guard their secrets carefully. Present evidence and build pressure to break through their defenses. Pay attention to contradictions between testimonies.",
    "intro.start": "Begin Investigation",

    // Game screen
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

    // Evidence panel
    "evidence.tab": "Evidence",
    "evidence.dossiers_tab": "Dossiers",
    "evidence.timeline_tab": "Timeline",
    "evidence.empty": "No evidence collected yet. Interrogate suspects to uncover clues.",
    "evidence.timeline_empty": "Events will appear here as you piece together what happened.",
    "evidence.mentioned_by": "Mentioned by {name} during interrogation.",

    // Accusation modal
    "accuse.title": "Formal Accusation",
    "accuse.description": "This is irreversible. Select the person you believe committed the murder and present your case. Choose carefully \u2014 an incorrect accusation will damage your investigation.",
    "accuse.cancel": "Cancel",
    "accuse.confirm": "Confirm Accusation",

    // Outcome screen
    "outcome.correct_title": "Case Solved",
    "outcome.wrong_title": "Wrong Suspect",
    "outcome.correct_text": "<p>Your accusation of <strong>{name}</strong> is correct.</p><p>Noah Sterling murdered Adrian Shore to prevent his embezzlement from being exposed and to seize control of Vireo Dynamics. During the blackout, he used a borrowed maintenance key to access the skydeck, confronted Shore, and fled through the backstage corridors.</p><p>The antique oil on his cufflinks, the key trail through Eddie Voss, Celeste's testimony, and the encrypted board vote schedule all sealed the case.</p><p style=\"margin-top:1rem; color:var(--gold);\">Evidence collected: {evidenceCount} items &bull; Suspects interviewed: {interviewCount}</p>",
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
    "voice.audio_on": "NPC voice: ON",
    "voice.audio_off": "NPC voice: OFF",
    "voice.replay_title": "Replay audio",
    "voice.status_speaking": "Speaking\u2026",
    "voice.listening": "Listening\u2026",
    "voice.mode_active": "Voice mode ON \u2014 click to exit",

    // Dossier labels
    "dossier.discoveries_heading": "Discoveries",
    "dossier.no_discoveries": "No new information uncovered yet.",
    "dossier.new_badge": "NEW",

    // Dossier bios
    "dossier.lila-chen.bio": "Your partner on this case. 12-year veteran of the Chicago PD Homicide Division, known for her calm, methodical approach. She requested this assignment personally after hearing about the circumstances at the Skyline Atrium.",
    "dossier.amelia-reyes.bio": "Lead engineer at Vireo Dynamics who oversaw Project Calypso from inception. Records show she was on-site for at least 72 hours before the gala. Holds three patents in neural interface technology. Colleagues describe her as brilliant but overworked.",
    "dossier.noah-sterling.bio": "Co-Founder and COO of Vireo Dynamics. Handles investor relations and public communications. Co-founded the company with Adrian Shore eight years ago. Recently led a successful Series C funding round. Known for his polished, media-trained demeanor.",
    "dossier.celeste-ward.bio": "Award-winning jazz vocalist hired as the featured performer for the gala evening. Has residencies at several prominent Chicago venues. Tabloids linked her romantically to Adrian Shore several months ago, though both publicly denied it.",
    "dossier.gideon-holt.bio": "Director of Security at the Skyline Atrium. Former Army intelligence \u2014 two tours overseas. Hired by Vireo Dynamics 18 months ago to overhaul building security. Has full access to all building systems including door sensors, cameras, and elevators.",
    "dossier.mira-kline.bio": "Ethicist and consultant with a PhD in Bioethics from Northwestern. Brought in six months ago to review Project Calypso's compliance with medical device regulations. Previously published papers critical of unregulated neural interfaces.",
    "dossier.eddie-voss.bio": "House bartender at the Skyline Atrium for three years. Works every major event. Known among staff for his sharp memory and wry sense of humor. Has a clear sightline of the main floor from the bar and regularly overhears private conversations.",
    "dossier.priya-shah.bio": "Investigative journalist with the Chicago Tribune. Invited to the gala to write a profile piece on Vireo Dynamics and the Calypso launch. Has previously broken stories on tech industry misconduct. Press credentials gave her roaming access to most areas of the venue.",
    "dossier.marcus-vale.bio": "Freelance stage manager responsible for lighting, sound cues, and technical production of the gala. Has worked events at the Atrium for two years. Had direct control of the power distribution board for the evening's presentation.",

    // Discovery texts
    "discovery.amelia-office-access": "Access logs show Amelia entered Adrian's private office outside normal hours before the gala.",
    "discovery.amelia-beta-test": "Evidence suggests Calypso's beta tests may have caused patient harm \u2014 Amelia oversaw the trials.",
    "discovery.amelia-nda": "Intellectual property concerns have surfaced around Calypso's development under Amelia's team.",
    "discovery.noah-defense-deal": "Noah appears to have been negotiating a side deal involving Calypso data and a defense contractor.",
    "discovery.noah-financial": "Financial irregularities have surfaced connected to Noah Sterling's accounts.",
    "discovery.noah-oil-cufflinks": "Antique oil residue was found on Noah's cufflinks \u2014 consistent with the crime scene.",
    "discovery.noah-board-vote": "An encrypted schedule suggests Noah was orchestrating a surprise board vote.",
    "discovery.noah-data-sales": "Evidence of unauthorized data sales may be connected to Noah.",
    "discovery.noah-blackmail": "Blackmail materials have surfaced that may involve Noah Sterling.",
    "discovery.celeste-affair": "Celeste and Adrian had a closer personal relationship than publicly acknowledged.",
    "discovery.celeste-audio-memo": "Celeste may possess an audio recording from the night of the murder.",
    "discovery.gideon-sensors": "Surveillance records raise questions about gaps in Gideon's building security coverage.",
    "discovery.gideon-elevator": "Gideon may have used a service elevator through an unauthorized route during the blackout.",
    "discovery.gideon-drill": "A security drill authorized by Gideon may have had unintended consequences.",
    "discovery.mira-whistleblower": "Leaked documents suggest Mira had access to damaging internal information about Calypso.",
    "discovery.priya-leaked-emails": "Priya may be in possession of leaked internal communications from Vireo Dynamics.",
    "discovery.eddie-sedative": "Evidence suggests Adrian's drink may have been tampered with \u2014 Eddie had direct access.",
    "discovery.eddie-key": "A trail involving a maintenance key leads back to Eddie Voss.",
    "discovery.marcus-lighting": "The lighting control board shows signs of deliberate modification \u2014 Marcus had sole access.",
    "discovery.marcus-power": "The power outage may not have been accidental \u2014 Marcus controlled the distribution board.",

    // Conversation starters (3 per NPC)
    "starter.lila-chen.1": "What do we know about the victim so far?",
    "starter.lila-chen.2": "Who should I prioritize interviewing first?",
    "starter.lila-chen.3": "Walk me through the timeline of events tonight.",

    "starter.amelia-reyes.1": "Tell me about Project Calypso and your role in it.",
    "starter.amelia-reyes.2": "You were on-site for 72 hours before the gala. Why?",
    "starter.amelia-reyes.3": "How would you describe your relationship with Adrian Shore?",

    "starter.noah-sterling.1": "What was your business relationship with Adrian like?",
    "starter.noah-sterling.2": "What can you tell me about the product launch tonight?",
    "starter.noah-sterling.3": "Were there any financial disputes between you and Adrian?",

    "starter.celeste-ward.1": "How did you know Adrian Shore?",
    "starter.celeste-ward.2": "Tell me about your performance at the gala tonight.",
    "starter.celeste-ward.3": "Where were you when the lights went out?",

    "starter.gideon-holt.1": "Walk me through what happened during the blackout.",
    "starter.gideon-holt.2": "Is there security footage from tonight?",
    "starter.gideon-holt.3": "Who had access to the upper floors of the building?",

    "starter.mira-kline.1": "What exactly is your role at Vireo Dynamics?",
    "starter.mira-kline.2": "Did you have any ethical concerns about Project Calypso?",
    "starter.mira-kline.3": "How well did you know Adrian Shore personally?",

    "starter.eddie-voss.1": "Did you serve Adrian any drinks tonight?",
    "starter.eddie-voss.2": "Who was at the bar around the time of the murder?",
    "starter.eddie-voss.3": "Did you notice anything unusual tonight?",

    "starter.priya-shah.1": "What brought you to the gala tonight?",
    "starter.priya-shah.2": "What story were you working on about Vireo Dynamics?",
    "starter.priya-shah.3": "Did anyone try to feed you information tonight?",

    "starter.marcus-vale.1": "You were in charge of the lighting. What happened?",
    "starter.marcus-vale.2": "Tell me about the power distribution setup for tonight.",
    "starter.marcus-vale.3": "Did you notice anyone backstage who shouldn't have been there?",

    // Settings
    "settings.title": "Settings",
    "settings.restart": "Restart Investigation",
    "settings.restart_confirm": "Are you sure? All progress will be lost.",
    "settings.restart_yes": "Yes, restart",
    "settings.restart_cancel": "Cancel",
  },

  sr: {
    // Intro screen
    "intro.title": "Odjeci u Atrijumu",
    "intro.subtitle": "Istraga Ubistva",
    "intro.briefing_label": "Brifing o Slu\u010daju",
    "intro.victim": "<strong>\u017drtva:</strong> Adrijan \u0160or, izvr\u0161ni direktor kompanije Vireo Dynamics, prona\u0111en mrtav u svojoj privatnoj kancelariji na sky-deck-u zgrade Skyline Atrium u \u010cikagu.",
    "intro.time_of_death": "<strong>Vreme smrti:</strong> Pribli\u017eno 23:58, tokom pono\u0107ne gala prezentacije Projekta Calypso \u2014 neuralnog interfejsa koji bi mogao da redefinise saradnju \u010doveka i ma\u0161ine.",
    "intro.circumstances": "<strong>Okolnosti:</strong> Svetla su zatreperila tokom prezentacije. Kada je struja vra\u0107ena, \u0160or je prona\u0111en mrtav. Olujno vreme je usporilo dolazak prvih slu\u017ebi, daju\u0107i osumnji\u010denima vremena da usklade alibije.",
    "intro.your_role": "<strong>Va\u0161a uloga:</strong> Vi ste glavni detektiv. Ispitajte devet osumnji\u010denih \u2014 svaki sa sopstvenim tajnama, motivima i ograni\u010denjima znanja. Otkrijte kontradikcije, prikupite dokaze i identifikujte ubicu.",
    "intro.your_partner": "<strong>Va\u0161 partner:</strong> Detektiv Lila \u010cen \u0107e vam pomo\u0107i sa takti\u010dkim savetima i pravnim smernicama. Po\u010dnite sa njom za pregled slu\u010daja.",
    "intro.tip": "<strong>Savet:</strong> Likovi \u0107e pa\u017eljivo \u010duvati svoje tajne. Predstavite dokaze i izgradite pritisak da probijete njihovu odbranu. Obratite pa\u017enju na kontradikcije izme\u0111u svedo\u010denja.",
    "intro.start": "Zapo\u010dni Istragu",

    // Game screen
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

    // Evidence panel
    "evidence.tab": "Dokazi",
    "evidence.dossiers_tab": "Dosijei",
    "evidence.timeline_tab": "Hronologija",
    "evidence.empty": "Nema prikupljenih dokaza. Ispitajte osumnji\u010dene da biste otkrili tragove.",
    "evidence.timeline_empty": "Doga\u0111aji \u0107e se pojaviti ovde dok sklapate sliku o tome \u0161ta se desilo.",
    "evidence.mentioned_by": "Pomenuo/la {name} tokom ispitivanja.",

    // Accusation modal
    "accuse.title": "Zvani\u010dna Optu\u017enica",
    "accuse.description": "Ovo je nepovratno. Izaberite osobu za koju verujete da je po\u010dinila ubistvo. Birajte pa\u017eljivo \u2014 pogre\u0161na optu\u017enica \u0107e o\u0161tetiti va\u0161u istragu.",
    "accuse.cancel": "Otka\u017ei",
    "accuse.confirm": "Potvrdi Optu\u017enicu",

    // Outcome screen
    "outcome.correct_title": "Slu\u010daj Re\u0161en",
    "outcome.wrong_title": "Pogre\u0161an Osumnji\u010deni",
    "outcome.correct_text": "<p>Va\u0161a optu\u017enica protiv <strong>{name}</strong> je ta\u010dna.</p><p>Noa Sterling je ubio Adrijana \u0160ora da spre\u010di otkrivanje pronevere i preuzme kontrolu nad Vireo Dynamics. Tokom nestanka struje, koristio je pozajmljeni klju\u010d za odr\u017eavanje da pristupi sky-deck-u, suo\u010dio se sa \u0160orom i pobegao kroz pozadinske hodnike.</p><p>Ulje sa antikvitetnog teleskopa na njegovim dug\u0123madima za man\u017eetne, trag klju\u010da preko Edija Vosa, svedo\u010denje Selest i \u0161ifrovani raspored glasanja uprave \u2014 sve je zape\u010datilo slu\u010daj.</p><p style=\"margin-top:1rem; color:var(--gold);\">Prikupljeni dokazi: {evidenceCount} &bull; Ispitani osumnji\u010deni: {interviewCount}</p>",
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
    "voice.audio_on": "Glas NPC-a: UKLJU\u010cEN",
    "voice.audio_off": "Glas NPC-a: ISKLJU\u010cEN",
    "voice.replay_title": "Ponovo pusti audio",
    "voice.status_speaking": "Govori\u2026",
    "voice.listening": "Slu\u0161am\u2026",
    "voice.mode_active": "Glasovni re\u017eim UKLJU\u010cEN \u2014 kliknite za izlaz",

    // Dossier labels
    "dossier.discoveries_heading": "Otkri\u0107a",
    "dossier.no_discoveries": "Nema novih informacija za sada.",
    "dossier.new_badge": "NOVO",

    // Dossier bios
    "dossier.lila-chen.bio": "Va\u0161 partner na ovom slu\u010daju. Veteranka Odeljenja za ubistva Policije \u010cikaga sa 12 godina iskustva, poznata po mirnom i metodi\u010dnom pristupu. Li\u010dno je zatra\u017eila ovaj slu\u010daj nakon \u0161to je \u010dula za okolnosti u Skyline Atrijumu.",
    "dossier.amelia-reyes.bio": "Glavni in\u017eenjer u Vireo Dynamics, vodila razvoj Projekta Calypso od samog po\u010detka. Evidencija pokazuje da je bila na licu mesta najmanje 72 sata pre gale. Poseduje tri patenta u oblasti neuralnih interfejsa. Kolege je opisuju kao briljantnu, ali preoptere\u0107enu.",
    "dossier.noah-sterling.bio": "Koosni\u0161a\u010d i operativni direktor Vireo Dynamics. Zadu\u017een za odnose sa investitorima i javne komunikacije. Kompaniju je osnovao sa Adrijanom \u0160orom pre osam godina. Nedavno je vodio uspe\u0161nu seriju C finansiranja. Poznat po uglađenom nastupu.",
    "dossier.celeste-ward.bio": "Nagrađivana d\u017eez peva\u010dica anga\u017eovana kao glavna izvo\u0111a\u010dica na gala ve\u010deri. Ima stalne nastupe u nekoliko istaknutih \u010dika\u0161kih lokala. Tabloidi su je romantiqu010dno povezivali sa Adrijanom \u0160orom pre nekoliko meseci, mada su oboje to javno demantovali.",
    "dossier.gideon-holt.bio": "Direktor obezbe\u0111enja u Skyline Atrijumu. Biv\u0161i vojni obave\u0161tajac \u2014 dve ture u inostranstvu. Vireo Dynamics ga je anga\u017eovao pre 18 meseci da unapredi bezbednost zgrade. Ima potpun pristup svim sistemima zgrade uklju\u010duju\u0107i senzore na vratima, kamere i liftove.",
    "dossier.mira-kline.bio": "Eti\u010darka i konsultant sa doktoratom iz bioetike na Severozapadnom univerzitetu. Anga\u017eovana pre \u0161est meseci da pregleda usklađenost Projekta Calypso sa regulativom za medicinske ure\u0111aje. Ranije objavljivala radove kriti\u010dne prema neregulisanim neuralnim interfejsima.",
    "dossier.eddie-voss.bio": "Stalni barmen u Skyline Atrijumu ve\u0107 tri godine. Radi na svakom velikom doga\u0111aju. Među osobljem poznat po o\u0161trom pam\u0107enju i duhovitosti. Ima jasan pogled na glavni hol sa bara i redovno \u010duje privatne razgovore.",
    "dossier.priya-shah.bio": "Istra\u017eiva\u010dka novinarka Chicago Tribune-a. Pozvana na galu da napi\u0161e profil o Vireo Dynamics i lansiranju Calypsa. Ranije je objavljivala pri\u010de o zlouporeti u tehnolo\u0161koj industriji. Novinarska akreditacija joj je omogu\u0107ila pristup ve\u0107ini prostorija.",
    "dossier.marcus-vale.bio": "Slobodni menad\u017eer scene zadu\u017een za osvetljenje, zvu\u010dne signale i tehni\u010dku produkciju gale. Radio je doga\u0111aje u Atrijumu ve\u0107 dve godine. Imao je direktnu kontrolu nad razvodnom tablom za ve\u010dernju prezentaciju.",

    // Discovery texts
    "discovery.amelia-office-access": "Evidencija pristupa pokazuje da je Amelija u\u0161la u Adrijanovu kancelariju van radnog vremena pre gale.",
    "discovery.amelia-beta-test": "Dokazi ukazuju da su beta testovi Calypsa mogli naneti \u0161tetu pacijentima \u2014 Amelija je nadgledala ispitivanja.",
    "discovery.amelia-nda": "Pojavila su se pitanja o intelektualnoj svojini vezana za razvoj Calypsa pod Amelijinim timom.",
    "discovery.noah-defense-deal": "Noa je izgleda pregovarao o sporednom poslu koji uklju\u010duje podatke Calypsa i odbrambenog izvođa\u010da.",
    "discovery.noah-financial": "Otkrivene su finansijske nepravilnosti povezane sa ra\u010dunima Noe Sterlinga.",
    "discovery.noah-oil-cufflinks": "Na Noinim dug\u0123madima za man\u017eetne prona\u0111en je ostatak anti\u010dkog ulja \u2014 poklapa se sa mestom zlo\u010dina.",
    "discovery.noah-board-vote": "\u0160ifrovani raspored ukazuje da je Noa organizovao iznenadno glasanje upravnog odbora.",
    "discovery.noah-data-sales": "Dokazi o neovla\u0161\u0107enoj prodaji podataka mogu biti povezani sa Noom.",
    "discovery.noah-blackmail": "Materijali za ucenu su otkriveni koji mogu uklju\u010divati Nou Sterlinga.",
    "discovery.celeste-affair": "Selest i Adrijan su imali bli\u017ei li\u010dni odnos nego \u0161to je javno poznato.",
    "discovery.celeste-audio-memo": "Selest mo\u017eda poseduje audio snimak sa ve\u010deri ubistva.",
    "discovery.gideon-sensors": "Snimci nadzora ukazuju na praznine u Gideonovom obezbeđenju zgrade.",
    "discovery.gideon-elevator": "Gideon je mo\u017eda koristio servisni lift neovla\u0161\u0107enom rutom tokom nestanka struje.",
    "discovery.gideon-drill": "Bezbednosna ve\u017eba koju je Gideon odobrio mogla je imati nenamerne posledice.",
    "discovery.mira-whistleblower": "Procureli dokumenti ukazuju da je Mira imala pristup \u0161tetnim internim informacijama o Calypsu.",
    "discovery.priya-leaked-emails": "Prija mo\u017eda poseduje procurelu internu prepisku iz Vireo Dynamics.",
    "discovery.eddie-sedative": "Dokazi ukazuju da je Adrijanov napitak mo\u017eda bio falsifikovan \u2014 Edi je imao direktan pristup.",
    "discovery.eddie-key": "Trag klju\u010da za odr\u017eavanje vodi do Edija Vosa.",
    "discovery.marcus-lighting": "Tabla za kontrolu osvetljenja pokazuje znake namernog menjanja \u2014 Markus je imao isklju\u010div pristup.",
    "discovery.marcus-power": "Nestanak struje mo\u017eda nije bio slu\u010dajan \u2014 Markus je kontrolisao razvodnu tablu.",

    // Conversation starters (3 per NPC)
    "starter.lila-chen.1": "\u0160ta znamo o \u017ertvi do sada?",
    "starter.lila-chen.2": "Koga treba prvo da saslu\u0161am?",
    "starter.lila-chen.3": "Provedi me kroz hronologiju doga\u0111aja ve\u010deras.",

    "starter.amelia-reyes.1": "Pri\u010dajte mi o Projektu Calypso i va\u0161oj ulozi.",
    "starter.amelia-reyes.2": "Bili ste ovde 72 sata pre gale. Za\u0161to?",
    "starter.amelia-reyes.3": "Kako biste opisali va\u0161 odnos sa Adrijanom Shorom?",

    "starter.noah-sterling.1": "Kakav je bio va\u0161 poslovni odnos sa Adrijanom?",
    "starter.noah-sterling.2": "\u0160ta mo\u017eete da mi ka\u017eete o lansiranju proizvoda ve\u010deras?",
    "starter.noah-sterling.3": "Da li je bilo finansijskih sporova izme\u0111u vas i Adrijana?",

    "starter.celeste-ward.1": "Kako ste poznavali Adrijana Shora?",
    "starter.celeste-ward.2": "Pri\u010dajte mi o va\u0161em nastupu na gali ve\u010deras.",
    "starter.celeste-ward.3": "Gde ste bili kad je nestalo struje?",

    "starter.gideon-holt.1": "Ispri\u010dajte mi \u0161ta se desilo tokom nestanka struje.",
    "starter.gideon-holt.2": "Postoje li snimci sigurnosnih kamera od ve\u010deras?",
    "starter.gideon-holt.3": "Ko je imao pristup gornjim spratovima zgrade?",

    "starter.mira-kline.1": "Koja je ta\u010dno va\u0161a uloga u Vireo Dynamics?",
    "starter.mira-kline.2": "Da li ste imali eti\u010dke primedbe na Projekat Calypso?",
    "starter.mira-kline.3": "Koliko dobro ste poznavali Adrijana Shora li\u010dno?",

    "starter.eddie-voss.1": "Da li ste slu\u017eili Adrijanu pi\u0107e ve\u010deras?",
    "starter.eddie-voss.2": "Ko je bio za barom oko vremena ubistva?",
    "starter.eddie-voss.3": "Da li ste primetili ne\u0161to neubi\u010dajeno ve\u010deras?",

    "starter.priya-shah.1": "\u0160ta vas je dovelo na galu ve\u010deras?",
    "starter.priya-shah.2": "Na kojoj pri\u010di ste radili o Vireo Dynamics?",
    "starter.priya-shah.3": "Da li vam je neko poku\u0161ao proslediti informacije ve\u010deras?",

    "starter.marcus-vale.1": "Vi ste bili zadu\u017eeni za osvetljenje. \u0160ta se desilo?",
    "starter.marcus-vale.2": "Pri\u010dajte mi o rasporedu napajanja za ve\u010deras.",
    "starter.marcus-vale.3": "Da li ste primetili nekoga iza scene ko nije trebalo da bude tamo?",

    // Settings
    "settings.title": "Pode\u0161avanja",
    "settings.restart": "Ponovi istragu",
    "settings.restart_confirm": "Da li ste sigurni? Sav napredak \u0107e biti izgubljen.",
    "settings.restart_yes": "Da, ponovi",
    "settings.restart_cancel": "Otka\u017ei",
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
