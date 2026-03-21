/* ================================================================
   Settings, Feedback & Language Module
   ================================================================ */
import { addModalCloseOnClickOutside } from "./utils.js";
import { API_BASE } from "./api.js";

/* ── DOM refs ─────────────────────────────────────────────── */
const settingsModal          = document.querySelector("#settings-modal");
const settingsCloseBtn       = document.querySelector("#settings-close");
const settingsRestartBtn     = document.querySelector("#settings-restart-btn");
const settingsRestartRow     = document.querySelector("#settings-restart-row");
const settingsRestartConfirm = document.querySelector("#settings-restart-confirm");
const settingsRestartCancel  = document.querySelector("#settings-restart-cancel");
const settingsRestartYes     = document.querySelector("#settings-restart-yes");

const feedbackModal         = document.querySelector("#feedback-modal");
const feedbackCloseBtn      = document.querySelector("#feedback-close");
const feedbackText          = document.querySelector("#feedback-text");
const feedbackFile          = document.querySelector("#feedback-file");
const feedbackPreview       = document.querySelector("#feedback-preview");
const feedbackPreviewImg    = document.querySelector("#feedback-preview-img");
const feedbackPreviewRemove = document.querySelector("#feedback-preview-remove");
const feedbackSubmitBtn     = document.querySelector("#feedback-submit");
const feedbackSuccess       = document.querySelector("#feedback-success");

/* ── State ────────────────────────────────────────────────── */
let feedbackScreenshotFile = null;

/* ── Settings Modal ──────────────────────────────────────── */
export function openSettings() {
  settingsRestartRow.style.display = "";
  settingsRestartConfirm.style.display = "none";
  settingsModal.classList.add("visible");
}

export function closeSettings() {
  settingsModal.classList.remove("visible");
}

/* ── Feedback System ─────────────────────────────────────── */
export function openFeedback() {
  feedbackText.value = "";
  feedbackText.style.display = "";
  feedbackFile.value = "";
  feedbackScreenshotFile = null;
  feedbackPreview.style.display = "none";
  document.querySelector(".feedback-screenshot-row").style.display = "";
  feedbackSubmitBtn.style.display = "";
  feedbackSuccess.style.display = "none";
  feedbackModal.classList.add("visible");
  feedbackText.focus();
}

export function closeFeedback() {
  feedbackModal.classList.remove("visible");
}

/* ── Language Toggle ─────────────────────────────────────── */
export function initLanguage() {
  const saved = localStorage.getItem("echoes_lang") || "en";
  window.currentLang = saved;
  window.applyLanguage(saved);
}

export function switchLanguage(lang) {
  window.applyLanguage(lang);
  _callbacks.renderNpcGrid();
  _callbacks.renderEvidence();
  if (_callbacks.getActiveNpcId()) {
    _callbacks.renderMessages();
    _callbacks.getPortraitRole().textContent = _callbacks.npcRole(_callbacks.getActiveNpcId());
    _callbacks.getPortraitStatus().textContent = _callbacks.getSending() ? window.t("chat.status_responding") : "";
  }
}

/* ── Stored callbacks ────────────────────────────────────── */
let _callbacks = {};

/* ── Init (wire up all event listeners) ──────────────────── */
export function initSettings(callbacks) {
  _callbacks = callbacks;

  const hubSettingsTab = document.querySelector("#hub-settings-tab");
  hubSettingsTab.addEventListener("click", openSettings);
  settingsCloseBtn.addEventListener("click", closeSettings);
  addModalCloseOnClickOutside(settingsModal, closeSettings);

  settingsRestartBtn.addEventListener("click", () => {
    settingsRestartRow.style.display = "none";
    settingsRestartConfirm.style.display = "";
  });

  settingsRestartCancel.addEventListener("click", () => {
    settingsRestartRow.style.display = "";
    settingsRestartConfirm.style.display = "none";
  });

  settingsRestartYes.addEventListener("click", () => {
    closeSettings();
    callbacks.clearState();
    callbacks.setBriefingOpen(true);
    callbacks.seedStartingEvidence();
    callbacks.removeNpcTab();
    callbacks.getChatMessages().innerHTML = "";
    callbacks.renderEvidence();
    callbacks.renderNpcGrid();
    // Go to hub on Case Board tab with briefing expanded
    callbacks.getHubScreen().classList.add("active");
    callbacks.activateTab("caseboard");
    const briefingToggle = document.querySelector("#cb-briefing-toggle");
    const briefingBody = document.querySelector("#cb-briefing-body");
    briefingToggle.setAttribute("aria-expanded", "true");
    briefingBody.classList.add("open");
  });

  /* ── Feedback listeners ───────────────────────────────── */
  document.querySelector("#hub-feedback-tab").addEventListener("click", openFeedback);
  feedbackCloseBtn.addEventListener("click", closeFeedback);
  addModalCloseOnClickOutside(feedbackModal, closeFeedback);

  feedbackFile.addEventListener("change", () => {
    const file = feedbackFile.files[0];
    if (!file) return;
    feedbackScreenshotFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      feedbackPreviewImg.src = e.target.result;
      feedbackPreview.style.display = "";
    };
    reader.readAsDataURL(file);
  });

  feedbackPreviewRemove.addEventListener("click", () => {
    feedbackScreenshotFile = null;
    feedbackFile.value = "";
    feedbackPreview.style.display = "none";
  });

  feedbackSubmitBtn.addEventListener("click", async () => {
    const text = feedbackText.value.trim();
    if (!text) return;

    feedbackSubmitBtn.disabled = true;
    feedbackSubmitBtn.textContent = "…";

    let screenshotUrl = null;

    // Upload screenshot if attached
    if (feedbackScreenshotFile) {
      try {
        const form = new FormData();
        form.append("file", feedbackScreenshotFile);
        const res = await fetch(`${API_BASE}/api/feedback/upload`, {
          method: "POST",
          body: form,
        });
        if (res.ok) {
          const data = await res.json();
          screenshotUrl = data.url;
        }
      } catch (_) { /* proceed without screenshot */ }
    }

    // Submit feedback
    try {
      await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: callbacks.getGameId(),
          feedback_text: text,
          screenshot_url: screenshotUrl,
        }),
      });
    } catch (_) { /* fire-and-forget */ }

    // Show success
    feedbackSubmitBtn.style.display = "none";
    feedbackText.style.display = "none";
    document.querySelector(".feedback-screenshot-row").style.display = "none";
    feedbackSuccess.style.display = "";
    feedbackSubmitBtn.disabled = false;
    feedbackSubmitBtn.textContent = window.t("feedback.submit");

    setTimeout(closeFeedback, 1500);
  });

  /* ── Language listeners ───────────────────────────────── */
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => switchLanguage(btn.dataset.lang));
  });
}
