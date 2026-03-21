/* ================================================================
   Accusation Module
   Extracted from main.js — manages suspect accusation modal,
   suspect selection, and outcome resolution.
   ================================================================ */
import { escapeHtml, npcDisplayName, addModalCloseOnClickOutside } from "./utils.js";
import { gradeArrest, getEvidence } from "./evidence.js";

const t = (...args) => window.t(...args);

// ── CASE constants (from window.CASE) ───────────────────────────
function _case() { return window.CASE; }

// ── Module state ────────────────────────────────────────────────
let accusationTarget = null;

// ── Callbacks (set via initAccusation) ──────────────────────────
let _cb = {};

// ── DOM refs (resolved lazily to avoid timing issues) ───────────
function _dom(id) { return document.querySelector(id); }

export function initAccusation(callbacks) {
  _cb = callbacks;

  const cancelAccuse = _dom("#cancel-accuse");
  const confirmAccuse = _dom("#confirm-accuse");
  const accusationModal = _dom("#accusation-modal");
  const restartBtn = _dom("#restart-btn");
  const outcomeScreen = _dom("#outcome-screen");

  if (cancelAccuse) cancelAccuse.addEventListener("click", closeAccusationModal);
  if (confirmAccuse) confirmAccuse.addEventListener("click", resolveAccusation);

  if (restartBtn) {
    restartBtn.addEventListener("click", async () => {
      restartBtn.disabled = true;
      await _cb.clearState();
      _cb.setBriefingOpen(true);
      outcomeScreen.classList.remove("visible");
      _cb.removeNpcTab();
      _cb.getHubScreen().classList.remove("active");
      _cb.getChatMessages().innerHTML = "";
      await _cb.reinit();
      restartBtn.disabled = false;
    });
  }

  if (accusationModal) addModalCloseOnClickOutside(accusationModal, closeAccusationModal);
}

// ── Public API ──────────────────────────────────────────────────
export function openAccusationModal() {
  const accusationModal = _dom("#accusation-modal");
  const suspectGrid = _dom("#suspect-grid");
  const confirmAccuse = _dom("#confirm-accuse");
  const PARTNER_NPC_ID = _case().partnerNpcId;
  const npcs = _cb.getNpcs();

  accusationTarget = null;
  confirmAccuse.disabled = true;
  suspectGrid.innerHTML = "";

  const suspects = npcs.filter(n => n.npc_id !== PARTNER_NPC_ID);
  for (const s of suspects) {
    const btn = document.createElement("div");
    btn.className = "suspect-option";
    const img = _cb.buildPortraitImg(s.npc_id, "neutral", 48);
    img.className = "suspect-portrait";
    btn.appendChild(img);
    btn.appendChild(document.createTextNode(npcDisplayName(s.display_name)));
    btn.dataset.npcId = s.npc_id;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".suspect-option").forEach(el => el.classList.remove("selected"));
      btn.classList.add("selected");
      accusationTarget = s.npc_id;
      confirmAccuse.disabled = false;
    });
    suspectGrid.appendChild(btn);
  }
  accusationModal.classList.add("visible");
}

export function closeAccusationModal() {
  const accusationModal = _dom("#accusation-modal");
  accusationModal.classList.remove("visible");
  accusationTarget = null;
}

export function resolveAccusation() {
  if (!accusationTarget) return;
  const target = accusationTarget;
  closeAccusationModal();

  const CULPRIT_ID = _case().culpritNpcId;
  const npcs = _cb.getNpcs();
  const conversations = _cb.getConversations();
  const gameId = _cb.getGameId();

  const correct = target === CULPRIT_ID;
  const accusedName = npcDisplayName(npcs.find(n => n.npc_id === target)?.display_name) || target;

  const interviewCount = Object.keys(conversations).filter(k => conversations[k].length > 0).length;

  const outcomeCard = _dom("#outcome-card");
  const outcomeTitle = _dom("#outcome-title");
  const outcomeText = _dom("#outcome-text");
  const outcomeScreen = _dom("#outcome-screen");

  if (correct) {
    const grade = gradeArrest();
    outcomeCard.className = "outcome-card " + grade.replace(/_/g, "-");
    _cb.trackEvent("arrest", {
      session_id: gameId,
      case_id: _case().id,
      target_npc_id: target,
      correct: true,
      grade,
      evidence_count: getEvidence().length,
      interview_count: interviewCount,
    });
    outcomeTitle.textContent = t("outcome." + grade + "_title");
    outcomeText.innerHTML = t("outcome." + grade + "_text", {
      name: escapeHtml(accusedName),
      evidenceCount: getEvidence().length,
      interviewCount: interviewCount,
    });
  } else {
    outcomeCard.className = "outcome-card wrong";
    _cb.trackEvent("arrest", {
      session_id: gameId,
      case_id: _case().id,
      target_npc_id: target,
      correct: false,
      grade: "wrong",
      evidence_count: getEvidence().length,
      interview_count: interviewCount,
    });
    outcomeTitle.textContent = t("outcome.wrong_title");
    outcomeText.innerHTML = t("outcome.wrong_text", { name: escapeHtml(accusedName) });
  }
  outcomeScreen.classList.add("visible");
}
