/* ================================================================
   i18n — English / Serbian translations (engine-level UI strings)
   Case-specific keys live in each case's own i18n files.
   ================================================================ */
window.I18N = {
  en: {

    // Hub screen
    "hub.tab_suspects": "Persons of Interest",
    "hub.tab_caseboard": "Case Board",
    "hub.tab_notes": "Notes",
    "notes.placeholder": "Type your investigation notes here...",
    "chat.back_to_hub": "Case Files",
    "chat.nav_suspects": "Persons of Interest",
    "chat.nav_caseboard": "Case Board",
    "chat.hint_btn": "Case Hint",
    "chat.hint_prompt": "Review the current state of the investigation. What evidence have we collected, what discoveries have we made, and based on that — who should I question next or what lead should I pursue?",
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

    // Arrest modal
    "accuse.title": "Formal Arrest",
    "accuse.description": "This is irreversible. Select the person you believe committed the murder. Choose carefully \u2014 an incorrect arrest will end your investigation.",
    "accuse.cancel": "Cancel",
    "accuse.confirm": "Confirm Arrest",

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

    // Settings
    "settings.title": "Settings",
    "settings.restart": "Restart Investigation",
    "settings.restart_confirm": "Are you sure? All progress will be lost.",
    "settings.restart_yes": "Yes, restart",
    "settings.restart_cancel": "Cancel",
    "settings.language": "Language",

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

    // Hub screen
    "hub.tab_suspects": "Osumnji\u010deni",
    "hub.tab_caseboard": "Tabla Slu\u010daja",
    "hub.tab_notes": "Bele\u0161ke",
    "notes.placeholder": "Unesite bele\u0161ke o istrazi ovde...",
    "chat.back_to_hub": "Dosijei",
    "chat.nav_suspects": "Osumnjičeni",
    "chat.nav_caseboard": "Tabla Slučaja",
    "chat.hint_btn": "Savet za slučaj",
    "chat.hint_prompt": "Pregledaj trenutno stanje istrage. Koje dokaze smo prikupili, šta smo otkrili, i na osnovu toga — koga treba sledećeg da ispitam ili koji trag treba da pratim?",
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

    // Arrest modal
    "accuse.title": "Zvani\u010dno Hap\u0161enje",
    "accuse.description": "Ovo je nepovratno. Izaberite osobu za koju verujete da je po\u010dinila ubistvo. Birajte pa\u017eljivo \u2014 pogre\u0161no hap\u0161enje \u0107e zavr\u0161iti va\u0161u istragu.",
    "accuse.cancel": "Otka\u017ei",
    "accuse.confirm": "Potvrdi Hap\u0161enje",

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

    // Settings
    "settings.title": "Pode\u0161avanja",
    "settings.restart": "Ponovi istragu",
    "settings.restart_confirm": "Da li ste sigurni? Sav napredak \u0107e biti izgubljen.",
    "settings.restart_yes": "Da, ponovi",
    "settings.restart_cancel": "Otka\u017ei",
    "settings.language": "Jezik",

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
