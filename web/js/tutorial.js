/* ── Tutorial Coach Marks System ─────────────────────────── */
import { t } from "./utils.js";

export const TUTORIAL_STORAGE_KEY = "echoes_tutorial_done";
export const LILA_HINT_STORAGE_KEY = "echoes_lila_hint_seen";

const tutorialOverlay  = document.querySelector("#tutorial-overlay");
const tutorialBackdrop = document.querySelector("#tutorial-backdrop");
const tutorialTooltip  = document.querySelector("#tutorial-tooltip");
const tutorialText     = document.querySelector("#tutorial-text");
const tutorialStepInd  = document.querySelector("#tutorial-step-indicator");
const tutorialSkipBtn  = document.querySelector("#tutorial-skip");
const tutorialNextBtn  = document.querySelector("#tutorial-next");

// Module-level variable for partner NPC id, set via initTutorial
let _partnerNpcId = null;

// Callbacks provided by main.js via initTutorial
let _callbacks = {};

// Hub-phase steps (built lazily so PARTNER_NPC_ID is available)
let HUB_STEPS = [];

// Chat-phase steps (shown after entering chat for the first time)
const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
const CHAT_STEPS = [
  { selector: '#gauge-pressure', text: "tutorial.step_gauges", arrow: "bottom", selectorAlt: '#gauge-rapport' },
  { selector: '#portrait-info-btn', text: isTouchDevice ? "tutorial.step_info_mobile" : "tutorial.step_info_desktop", arrow: "left" },
  { selector: '#chat-input-bar', text: "tutorial.step_input", arrow: "bottom" },
];
// Suspect chat steps without input bar (used when Lila chat already covered it)
const CHAT_STEPS_SHORT = [
  { selector: '#gauge-pressure', text: "tutorial.step_gauges", arrow: "bottom", selectorAlt: '#gauge-rapport' },
  { selector: '#portrait-info-btn', text: isTouchDevice ? "tutorial.step_info_mobile" : "tutorial.step_info_desktop", arrow: "left" },
];

// Lila-specific tutorial (shown the first time Lila's chat is opened)
const LILA_STEPS = [
  { selector: '#lila-hint-btn', text: "tutorial.step_hint_btn", arrow: "bottom" },
];
// Combined Lila tutorial for when Lila is opened first (hint btn + input bar)
const LILA_CHAT_STEPS = [
  { selector: '#lila-hint-btn', text: "tutorial.step_hint_btn", arrow: "bottom" },
  { selector: '#chat-input-bar', text: "tutorial.step_input", arrow: "bottom" },
];

let tutorialSteps = [];
let tutorialCurrentStep = 0;
let tutorialPhase = null; // "hub" or "chat"
let tutorialResizeRAF = null;
let tutorialClickTarget = null;   // element we're listening on for clickToAdvance
let tutorialClickHandler = null;  // handler to remove later
let tutorialPulseRing = null;     // pulsing ring element

// Flag for chat-phase tutorial (set during boot, consumed in selectNpc)
let chatTutorialPending = false;

export function getChatTutorialPending() {
  return chatTutorialPending;
}
export function setChatTutorialPending(val) {
  chatTutorialPending = val;
}

export function isTutorialDone() {
  return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true";
}
export function markTutorialDone() {
  localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
}

function _buildHubSteps() {
  return [
    { selector: '.manila-tab[data-hub-tab="caseboard"]', text: "tutorial.step_caseboard", arrow: "top" },
    { selector: '#cb-briefing-toggle', text: "tutorial.step_briefing", arrow: "top" },
    { selector: '.manila-tab[data-hub-tab="notes"]', text: "tutorial.step_notes", arrow: "top" },
    { selector: '.manila-tab[data-hub-tab="stringboard"]', text: "tutorial.step_stringboard", arrow: "top" },
    { selector: '.manila-tab[data-hub-tab="suspects"]', text: "tutorial.step_suspects", arrow: "top", clickToAdvance: true },
    { selector: `.npc-card[data-npc-id="${_partnerNpcId}"]`, text: "tutorial.step_partner", arrow: "top", beforeShow() {
      // Ensure suspects tab is active (user just clicked it in the previous step)
      _callbacks.activateTab("suspects");
    }},
    { selector: `.npc-card:not([data-npc-id="${_partnerNpcId}"])`, text: "tutorial.step_npc_card", arrow: "top" },
  ];
}

export function startTutorial(phase) {
  tutorialPhase = phase;
  tutorialSteps = phase === "hub" ? HUB_STEPS
                : phase === "lila" ? LILA_STEPS
                : phase === "lila_chat" ? LILA_CHAT_STEPS
                : phase === "chat_short" ? CHAT_STEPS_SHORT
                : CHAT_STEPS;
  tutorialCurrentStep = 0;
  showTutorialStep(0);
}

function cleanupClickToAdvance() {
  if (tutorialClickTarget && tutorialClickHandler) {
    tutorialClickTarget.removeEventListener("click", tutorialClickHandler);
    tutorialClickTarget.style.zIndex = "";
    tutorialClickTarget = null;
    tutorialClickHandler = null;
  }
  if (tutorialPulseRing) {
    tutorialPulseRing.remove();
    tutorialPulseRing = null;
  }
}

function showTutorialStep(idx) {
  if (idx < 0 || idx >= tutorialSteps.length) { endTutorial(); return; }
  cleanupClickToAdvance();
  tutorialCurrentStep = idx;
  const step = tutorialSteps[idx];

  // Run pre-show action (e.g. switch tabs) before looking for the target
  if (step.beforeShow) step.beforeShow();

  const target = document.querySelector(step.selector);
  if (!target) { showTutorialStep(idx + 1); return; }

  // Ensure target is visible (scroll into view)
  target.scrollIntoView({ behavior: "smooth", block: "nearest" });

  requestAnimationFrame(() => {
    const rect = target.getBoundingClientRect();
    // If we have an alt selector (for grouping gauges), expand the rect
    let spotRect = { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom };
    if (step.selectorAlt) {
      const alt = document.querySelector(step.selectorAlt);
      if (alt) {
        const altRect = alt.getBoundingClientRect();
        spotRect.top = Math.min(spotRect.top, altRect.top);
        spotRect.left = Math.min(spotRect.left, altRect.left);
        spotRect.right = Math.max(spotRect.right, altRect.right);
        spotRect.bottom = Math.max(spotRect.bottom, altRect.bottom);
      }
    }

    const pad = 8;
    const sx = spotRect.left - pad;
    const sy = spotRect.top - pad;
    const sw = (spotRect.right - spotRect.left) + pad * 2;
    const sh = (spotRect.bottom - spotRect.top) + pad * 2;

    // Create a clip-path that cuts out the spotlight area (inverted rect)
    tutorialBackdrop.style.clipPath =
      `polygon(0% 0%, 0% 100%, ${sx}px 100%, ${sx}px ${sy}px, ${sx + sw}px ${sy}px, ${sx + sw}px ${sy + sh}px, ${sx}px ${sy + sh}px, ${sx}px 100%, 100% 100%, 100% 0%)`;

    // Position tooltip
    const isLila = tutorialPhase === "lila";
    const isLilaChat = tutorialPhase === "lila_chat";
    const isChatShort = tutorialPhase === "chat_short";
    const isChatLike = tutorialPhase === "chat" || isChatShort;
    const globalIdx = (isLila || isLilaChat) ? idx : isChatLike ? HUB_STEPS.length + idx : idx;
    const globalTotal = (isLila || isLilaChat) ? tutorialSteps.length : HUB_STEPS.length + tutorialSteps.length;
    tutorialStepInd.textContent = `${globalIdx + 1} / ${globalTotal}`;
    tutorialText.textContent = t(step.text);

    const isLast = isLila || (isLilaChat && idx === LILA_CHAT_STEPS.length - 1) || (isChatLike && idx === tutorialSteps.length - 1);
    tutorialSkipBtn.textContent = t("tutorial.skip");

    // clickToAdvance: hide Next button, show pulsing ring, advance on target click
    if (step.clickToAdvance) {
      tutorialNextBtn.style.display = "none";
      // Create pulsing ring over the target
      tutorialPulseRing = document.createElement("div");
      tutorialPulseRing.className = "tutorial-pulse-ring";
      tutorialPulseRing.style.left = sx + "px";
      tutorialPulseRing.style.top = sy + "px";
      tutorialPulseRing.style.width = sw + "px";
      tutorialPulseRing.style.height = sh + "px";
      document.body.appendChild(tutorialPulseRing);
      // Let clicks pass through to the target in the spotlight area
      tutorialClickTarget = target;
      tutorialClickHandler = () => {
        cleanupClickToAdvance();
        nextTutorialStep();
      };
      target.addEventListener("click", tutorialClickHandler, { once: true });
      // Allow clicking the spotlighted target through the overlay
      target.style.position = target.style.position || "relative";
      target.style.zIndex = "10002";
    } else {
      tutorialNextBtn.style.display = "";
      tutorialNextBtn.textContent = isLast ? t("tutorial.got_it") : t("tutorial.next");
    }
    tutorialSkipBtn.style.display = isLast ? "none" : "";

    // Arrow direction + tooltip position
    tutorialTooltip.className = "tutorial-tooltip arrow-" + step.arrow;
    const ttW = 340;
    let ttLeft, ttTop;

    if (step.arrow === "top") {
      // Tooltip below target
      ttLeft = Math.max(12, Math.min(sx, window.innerWidth - ttW - 12));
      ttTop = sy + sh + 16;
    } else if (step.arrow === "bottom") {
      // Tooltip above target
      ttLeft = Math.max(12, Math.min(sx, window.innerWidth - ttW - 12));
      ttTop = sy - 160;
      if (ttTop < 12) ttTop = sy + sh + 16; // flip if no room above
    } else if (step.arrow === "left") {
      // Tooltip to the right of target
      ttLeft = sx + sw + 16;
      ttTop = sy;
      if (ttLeft + ttW > window.innerWidth - 12) {
        ttLeft = sx - ttW - 16;
        tutorialTooltip.className = "tutorial-tooltip arrow-right";
      }
    } else {
      // arrow-right: tooltip to the left of target
      ttLeft = sx - ttW - 16;
      ttTop = sy;
    }

    tutorialTooltip.style.left = ttLeft + "px";
    tutorialTooltip.style.top = Math.max(12, ttTop) + "px";

    tutorialOverlay.classList.add("active");
  });
}

function nextTutorialStep() {
  if (tutorialCurrentStep + 1 < tutorialSteps.length) {
    showTutorialStep(tutorialCurrentStep + 1);
  } else {
    endTutorial();
  }
}

export function endTutorial() {
  cleanupClickToAdvance();
  tutorialOverlay.classList.remove("active");
  if (tutorialPhase === "hub") {
    // Don't mark as done yet — chat steps remain
  } else if (tutorialPhase === "lila" || tutorialPhase === "lila_chat") {
    localStorage.setItem(LILA_HINT_STORAGE_KEY, "1");
    // Don't markTutorialDone — chat steps for suspects still pending
  } else {
    markTutorialDone();
  }
  tutorialPhase = null;
}

export function skipTutorial() {
  cleanupClickToAdvance();
  tutorialOverlay.classList.remove("active");

  if (tutorialPhase === "lila" || tutorialPhase === "lila_chat") {
    localStorage.setItem(LILA_HINT_STORAGE_KEY, "1");
    // Don't markTutorialDone — chat steps for suspects still pending
  } else if (tutorialPhase === "hub") {
    // Don't mark tutorial as fully done — chat steps should still fire.
    // If user skipped before reaching the suspects tab, set up a one-time
    // listener so the remaining hub steps (Lila + suspects) appear when
    // they eventually click the tab.
    const suspectsTab = document.querySelector('.manila-tab[data-hub-tab="suspects"]');
    const suspPanel   = document.getElementById("hub-suspects");
    const alreadyOnSuspects = suspPanel && suspPanel.classList.contains("active");

    if (!alreadyOnSuspects && suspectsTab) {
      // Resume from the Lila step (index 5) when user clicks suspects tab
      const resumeFromLila = () => {
        tutorialPhase = "hub";
        tutorialSteps = HUB_STEPS;
        tutorialCurrentStep = 5; // Lila partner step
        showTutorialStep(5);
      };
      suspectsTab.addEventListener("click", () => {
        setTimeout(resumeFromLila, 350);
      }, { once: true });
    }
    // Keep chatTutorialPending alive so chat tutorial still fires
  } else {
    markTutorialDone();
  }
  tutorialPhase = null;
}

/**
 * Initialize the tutorial module.
 * @param {Object} callbacks - { activateTab, leaveChat, removeNpcTab, closeSettings, partnerNpcId, getActiveNpcId }
 */
export function initTutorial(callbacks) {
  _callbacks = callbacks;
  _partnerNpcId = callbacks.partnerNpcId;

  // Build HUB_STEPS now that partnerNpcId is available
  HUB_STEPS = _buildHubSteps();

  // Reposition on resize
  window.addEventListener("resize", () => {
    if (!tutorialOverlay.classList.contains("active")) return;
    if (tutorialResizeRAF) cancelAnimationFrame(tutorialResizeRAF);
    tutorialResizeRAF = requestAnimationFrame(() => showTutorialStep(tutorialCurrentStep));
  });

  tutorialNextBtn.addEventListener("click", nextTutorialStep);
  tutorialSkipBtn.addEventListener("click", skipTutorial);

  // Settings replay button
  document.getElementById("settings-tutorial-btn").addEventListener("click", () => {
    _callbacks.closeSettings();
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    localStorage.removeItem(LILA_HINT_STORAGE_KEY);
    chatTutorialPending = true; // ensure chat-phase tutorial fires after hub replay
    // Navigate to hub/caseboard first
    if (_callbacks.getActiveNpcId && _callbacks.getActiveNpcId()) {
      _callbacks.leaveChat();
      _callbacks.removeNpcTab();
    }
    _callbacks.activateTab("caseboard");
    setTimeout(() => startTutorial("hub"), 400);
  });
}
