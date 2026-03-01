/**
 * Case manifest: Echoes in the Atrium
 *
 * Single source of truth for every case-specific constant that the
 * generic engine needs.  Loaded before the engine boots; the engine
 * reads window.CASE and never hard-codes any of these values.
 */
(function () {
  "use strict";

  window.CASE = {
    /* ── Identity ──────────────────────────────────────────── */
    id:    "echoes-in-atrium",
    title: "Echoes in the Atrium",

    /* ── Key NPCs ──────────────────────────────────────────── */
    partnerNpcId: "lila-chen",
    culpritNpcId: "noah-sterling",

    /* ── NPC metadata (initials for avatar fallback, grid order) */
    npcMeta: {
      "lila-chen":     { initials: "LC", order: 0 },
      "amelia-reyes":  { initials: "AR", order: 1 },
      "noah-sterling": { initials: "NS", order: 2 },
      "celeste-ward":  { initials: "CW", order: 3 },
      "matthias-holt": { initials: "MH", order: 4 },
      "mira-kline":    { initials: "MK", order: 5 },
      "eddie-voss":    { initials: "EV", order: 6 },
      "priya-shah":    { initials: "PS", order: 7 },
      "matthew-vale":  { initials: "MV", order: 8 },
    },

    /* ── Evidence catalog (id -> display metadata) ─────────── */
    evidenceCatalog: {
      "burned-notebook":      { label: "Burned Notebook Fragment" },
      "keycard-logs":         { label: "Keycard Access Logs" },
      "key-trail":            { label: "Maintenance Key Trail" },
      "power-outage":         { label: "Deliberate Power Sabotage" },
      "encrypted-schedule":   { label: "Encrypted Schedule" },
      "financial-misconduct": { label: "Financial Misconduct" },
      "surveillance":         { label: "CCTV Footage Gaps" },
      "secret-affair":        { label: "Secret Affair" },
      "audio-recording":      { label: "Audio Recording" },
      "nda-ip":               { label: "NDA / IP Theft" },
      "blackmail":            { label: "Blackmail Evidence" },
      "data-sales":           { label: "Illegal Data Sales" },
      "plagiarism":           { label: "Plagiarized Research" },
      "lockpick-marks":       { label: "Lockpick Marks" },
      "hotel-sale":           { label: "Hotel Sale Plan" },
      "stage-timing":         { label: "Stage Timing Gaps" },
      "conspiracy":           { label: "Blackout Conspiracy" },
    },

    /* ── Discovery -> evidence mapping (mirrors server DISCOVERY_CATALOG) */
    discoveryEvidenceMap: {
      "amelia-key-loan":          "key-trail",
      "amelia-breaker":           "power-outage",
      "amelia-hotel-sale":        "hotel-sale",
      "amelia-lockpick":          "lockpick-marks",
      "noah-embezzlement":        "financial-misconduct",
      "noah-board-vote":          "encrypted-schedule",
      "noah-key-access":          "key-trail",
      "noah-cctv-gap":            "surveillance",
      "celeste-affair":           "secret-affair",
      "celeste-recordings":       "audio-recording",
      "celeste-rooftop-witness":  "surveillance",
      "matthias-blackmail":       "blackmail",
      "matthias-data-sales":      "data-sales",
      "matthias-saw-noah":        "surveillance",
      "matthias-noah-financial":  "financial-misconduct",
      "mira-plagiarism":          "plagiarism",
      "mira-meeting":             "encrypted-schedule",
      "mira-suite-search":        "conspiracy",
      "amelia-conspiracy-admission": "conspiracy",
      "mira-conspiracy-admission":   "conspiracy",
      "eddie-key-loan":           "key-trail",
      "eddie-gave-noah-key":      "key-trail",
      "priya-saw-noah":           "surveillance",
      "priya-holt-argument":      "blackmail",
      "priya-mira-tip":           "plagiarism",
      "priya-board-vote":         "encrypted-schedule",
      "matthew-noah-absence":     "stage-timing",
      "matthew-celeste-break":    "stage-timing",
      "matthew-amelia-direction": "conspiracy",
    },

    /* ── Evidence grouping for the case board ──────────────── */
    evidenceGroups: {
      physical:    ["lockpick-marks"],
      documentary: ["burned-notebook", "encrypted-schedule", "nda-ip"],
      testimony:   ["secret-affair", "audio-recording", "plagiarism", "hotel-sale", "conspiracy"],
      access:      ["keycard-logs", "key-trail", "power-outage", "stage-timing"],
      motive:      ["financial-misconduct", "blackmail", "data-sales", "surveillance"],
    },

    /* ── Starting evidence (seeded at game init) ───────────── */
    startingEvidence: [
      { id: "burned-notebook", textKey: "evidence.burned-notebook_desc" },
      { id: "keycard-logs",    textKey: "evidence.security_systems" },
    ],

    /* ── Canonical evidence (required for "case ready" prompt) */
    canonicalEvidence: [
      "burned-notebook",
      "keycard-logs",
      "key-trail",
      "financial-misconduct",
      "encrypted-schedule",
      "surveillance",
    ],

    /* ── Arrest grading discovery sets ─────────────────────── */
    culpritMotiveDiscoveries: [
      "noah-embezzlement",
      "noah-board-vote",
      "priya-board-vote",
      "matthias-noah-financial",
    ],
    culpritOpportunityDiscoveries: [
      "noah-key-access",
      "noah-cctv-gap",
      "eddie-gave-noah-key",
      "celeste-rooftop-witness",
      "matthias-saw-noah",
      "priya-saw-noah",
      "matthew-noah-absence",
    ],

    /* ── Hint display i18n keys (random selection for partner hints) */
    hintDisplayKeys: [
      "chat.hint_display.0",
      "chat.hint_display.1",
      "chat.hint_display.2",
      "chat.hint_display.3",
      "chat.hint_display.4",
      "chat.hint_display.5",
      "chat.hint_display.6",
      "chat.hint_display.7",
      "chat.hint_display.8",
      "chat.hint_display.9",
    ],

    /* ── Briefing i18n keys (case intro screen) ────────────── */
    briefingKeys: [
      "intro.victim",
      "intro.time_of_death",
      "intro.body_discovered",
      "intro.circumstances",
      "intro.starting_evidence",
      "intro.your_role",
      "intro.your_partner",
      "intro.tip",
    ],

    /* ── Asset paths ───────────────────────────────────────── */
    portraitBasePath:  "cases/echoes-in-atrium/portraits",
    keycardLogsPath:   "cases/echoes-in-atrium/data/keycard_logs.json",

    /* ── Evidence-specific renderers ───────────────────────── */
    evidenceRenderers: {
      "keycard-logs": "keycard-modal",
    },
  };
})();
