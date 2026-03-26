/**
 * Case manifest: Something Borrowed, Someone New
 *
 * Single source of truth for every case-specific constant that the
 * generic engine needs.  Loaded before the engine boots; the engine
 * reads window.CASE and never hard-codes any of these values.
 */
(function () {
  "use strict";

  window.CASE = {
    /* ── Identity ──────────────────────────────────────────── */
    id:    "something-borrowed-someone-new",
    title: "Something Borrowed, Someone New",

    /* ── Key NPCs ──────────────────────────────────────────── */
    partnerNpcId: "nadia-okafor",
    culpritNpcId: "devon-james",

    /* ── NPC metadata (initials for avatar fallback, grid order) */
    npcMeta: {
      "nadia-okafor":  { initials: "NO", order: 0 },
      "sam-deluca":    { initials: "SD", order: 1 },
      "devon-james":   { initials: "DJ", order: 2 },
      "rafi-ansari":   { initials: "RA", order: 3 },
      "val-park":      { initials: "VP", order: 5 },
      "marco-delgado": { initials: "MD", order: 4 },
      "tanya-rhodes":  { initials: "TR", order: 6 },
    },

    /* ── Evidence catalog (id -> display metadata) ─────────── */
    evidenceCatalog: {
      "devon-missing-30min":      { label: "Devon's Missing Half Hour" },
      "mystery-cologne":          { label: "The Mystery Cologne" },
      "devon-upstairs":           { label: "Devon Went Upstairs" },
      "rafi-upstairs":            { label: "Rafi Was Upstairs Too" },
      "dating-app-connection":    { label: "The Dating App Match" },
      "devon-rafi-bar-chat":      { label: "Devon & Rafi Were Chatty" },
      "devon-phone-alibi-false":  { label: "Devon's Headache Story Is False" },
      "val-marco-bedroom":        { label: "Val & Marco in the Bedroom" },
      "val-inside-out-top":       { label: "Val's Inside-Out Top" },
      "val-marco-together":       { label: "Val & Marco Left Together" },
      "val-has-boyfriend":        { label: "Val Is Taken" },
      "deleted-instagram":        { label: "The Deleted Instagram Story" },
      "garden-deck-hookup":       { label: "The Late-Night Hookup" },
    },

    /* ── Discovery -> evidence mapping (mirrors server DISCOVERY_CATALOG) */
    discoveryEvidenceMap: {
      "sam-saw-devon-upstairs":     "devon-upstairs",
      "sam-saw-rafi-upstairs":      "rafi-upstairs",
      "sam-devon-sweaty":           "devon-missing-30min",
      "sam-saw-val-marco":          "val-marco-together",
      "devon-admits-upstairs":      "devon-upstairs",
      "devon-admits-rafi":          "dating-app-connection",
      "devon-full-confession":      "dating-app-connection",
      "devon-saw-val-disheveled":   "val-inside-out-top",
      "rafi-dating-app":            "dating-app-connection",
      "rafi-admits-hookup":         "dating-app-connection",
      "rafi-saw-val-marco":         "val-marco-bedroom",
      "val-admits-lake-house":      "garden-deck-hookup",
      "val-admits-hookup":          "garden-deck-hookup",
      "val-has-bf-blake":           "val-has-boyfriend",
      "val-saw-devon-rafi-chatty":  "devon-rafi-bar-chat",
      "val-deleted-story":          "deleted-instagram",
      "marco-admits-hookup":        "val-marco-bedroom",
      "marco-val-has-bf":           "val-has-boyfriend",
      "marco-saw-devon-rafi-stairs": "devon-upstairs",
      "marco-deleted-insta":        "deleted-instagram",
      "tanya-saw-devon-flushed":    "devon-phone-alibi-false",
      "tanya-saw-rafi-quiet":       "rafi-upstairs",
      "tanya-saw-val-marco-bedroom": "val-marco-bedroom",
      "tanya-val-top":              "val-inside-out-top",
      "tanya-devon-texting":        "devon-rafi-bar-chat",
      "tanya-val-bf":               "val-has-boyfriend",
    },

    /* ── Evidence grouping for the case board ──────────────── */
    evidenceGroups: {
      physical:  ["mystery-cologne", "val-inside-out-top"],
      testimony: ["devon-upstairs", "rafi-upstairs", "devon-rafi-bar-chat", "devon-phone-alibi-false", "val-marco-together", "val-marco-bedroom"],
      timeline:  ["devon-missing-30min", "garden-deck-hookup"],
      receipts:  ["dating-app-connection", "val-has-boyfriend", "deleted-instagram"],
    },

    /* ── Starting evidence (seeded at game init) ───────────── */
    startingEvidence: [
      { id: "devon-missing-30min", textKey: "evidence.devon-missing-30min_desc" },
      { id: "mystery-cologne",     textKey: "evidence.mystery-cologne_desc" },
    ],

    /* ── Canonical evidence (required for "case ready" prompt) */
    canonicalEvidence: [
      "devon-upstairs",
      "rafi-upstairs",
      "mystery-cologne",
      "dating-app-connection",
    ],

    /* ── Arrest grading discovery sets ─────────────────────── */
    culpritMotiveDiscoveries: [
      "devon-admits-rafi",
      "rafi-dating-app",
      "devon-rafi-bar-chat",
    ],
    culpritOpportunityDiscoveries: [
      "devon-admits-upstairs",
      "sam-saw-devon-upstairs",
      "sam-saw-rafi-upstairs",
      "tanya-saw-devon-flushed",
      "marco-saw-devon-rafi-stairs",
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
      { type: "heading", key: "intro.section_situation" },
      "intro.setting",
      "intro.nadia_suspicion",
      { type: "heading", key: "intro.section_starting_evidence" },
      "intro.cologne_clue",
      { type: "highlight", key: "intro.nadia_note" },
      { type: "heading", key: "intro.section_assignment" },
      "intro.assignment",
      { type: "callout", key: "intro.tip" },
    ],

    /* ── NPC expressions (must match portrait filenames) ──── */
    expressions: ["neutral", "guarded", "distressed", "angry", "contemplative", "smirking"],

    /* ── Asset paths ───────────────────────────────────────── */
    portraitBasePath: "cases/something-borrowed-someone-new/portraits",

    /* ── Case theme (CSS variable overrides applied when this case loads) */
    /* Notebook / diary aesthetic: ruled paper, pen ink, warm cream */
    theme: {
      /* Backgrounds — lined notebook paper tones */
      "--noir-warm":         "#f7f4ef",
      "--noir-panel":        "#f0ece4",
      "--noir-panel-alt":    "#e8e3d8",
      "--noir-input":        "#ece7de",
      "--bg-dark":           "#f7f4ef",
      "--bg-panel":          "#f0ece4",
      "--bg-panel-alt":      "#e8e3d8",
      "--bg-input":          "#ece7de",
      /* Text — dark ink on paper */
      "--noir-text":         "#1a1714",
      "--noir-text-dim":     "#4a4540",
      "--noir-text-faint":   "#8a847c",
      "--text":              "#1a1714",
      "--text-dim":          "#4a4540",
      "--text-faint":        "#8a847c",
      /* Accent — coral/rose pen ink */
      "--noir-amber":        "#c2476b",
      "--noir-amber-glow":   "rgba(194,71,107,0.12)",
      "--noir-amber-border": "rgba(194,71,107,0.3)",
      "--accent":            "#c2476b",
      "--accent-glow":       "rgba(194,71,107,0.12)",
      "--gold":              "#c2476b",
      "--gold-dim":          "rgba(194,71,107,0.1)",
      "--gold-border":       "rgba(194,71,107,0.25)",
      "--border":            "rgba(26,23,20,0.12)",
      "--border-active":     "#c2476b",
      /* Overlays */
      "--noir-smoke":        "rgba(247,244,239,0.92)",
      "--noir-shadow":       "rgba(0,0,0,0.12)",
      /* Manila folder palette — darker against light bg */
      "--manila-bg":         "#e8e3d8",
      "--manila-tab":        "#ddd7c8",
      "--manila-tab-active": "#e8e3d8",
      "--manila-tab-text":   "#1a1714",
      "--manila-tab-inactive-text": "#6b6055",
      "--manila-border":     "#b8a88a",
      /* Chat message bubbles — light notebook style */
      "--msg-user-bg":       "linear-gradient(135deg, rgba(240,236,228,0.95), rgba(232,227,216,0.9))",
      "--msg-npc-bg":        "linear-gradient(135deg, rgba(247,244,239,0.98), rgba(240,236,228,0.95))",
      "--msg-border":        "rgba(194,71,107,0.15)",
      "--msg-user-accent":   "rgba(194,71,107,0.3)",
      "--msg-shadow":        "0 2px 8px rgba(0,0,0,0.08)",
      "--msg-npc-shadow":    "0 2px 8px rgba(0,0,0,0.06)",
      "--msg-corner":        "rgba(194,71,107,0.1)",
      "--msg-user-sender":   "rgba(26,23,20,0.45)",
      "--msg-user-sender-border": "rgba(26,23,20,0.1)",
      "--msg-user-sender-icon":   "rgba(26,23,20,0.3)",
      "--msg-intuition-bg":  "linear-gradient(135deg, rgba(247,244,239,0.95), rgba(240,236,228,0.9))",
      "--msg-intuition-accent": "rgba(194,71,107,0.25)",
      "--msg-intuition-icon": "rgba(194,71,107,0.5)",
      "--msg-typing-bg":     "rgba(240,236,228,0.9)",
      "--msg-bg-glow":       "rgba(194,71,107,0.04)",
      /* Toast / card backgrounds — dark card on light theme for contrast */
      "--bg-card":           "#2a2520",
      "--toast-text":        "#e8dcc8",
      "--toast-border":      "rgba(194,71,107,0.5)",
      /* Info button / bio tooltip — light notebook */
      "--info-btn-bg":       "rgba(240,236,228,0.9)",
      "--info-btn-border":   "rgba(194,71,107,0.2)",
      "--info-btn-bg-hover": "rgba(232,227,216,0.95)",
      "--bio-tooltip-bg":    "rgba(247,244,239,0.98)",
    },
  };
})();
