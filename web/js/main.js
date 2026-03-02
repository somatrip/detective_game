/* ================================================================
   ECHOES IN THE ATRIUM — Game Frontend
   ================================================================ */
(() => {
  "use strict";

  const CASE = window.CASE;
  const NPC_META = CASE.npcMeta;
  const EVIDENCE_CATALOG = CASE.evidenceCatalog;
  const DISCOVERY_EVIDENCE_MAP = CASE.discoveryEvidenceMap;
  const EVIDENCE_GROUPS = CASE.evidenceGroups;
  const STARTING_EVIDENCE = CASE.startingEvidence;
  const CANONICAL_EVIDENCE = CASE.canonicalEvidence;
  const PARTNER_NPC_ID = CASE.partnerNpcId;
  const CULPRIT_ID = CASE.culpritNpcId;

  // Create toast container dynamically (avoids HTML parser issues)
  const _toastContainer = document.createElement("div");
  _toastContainer.id = "discovery-toast-container";
  document.body.appendChild(_toastContainer);

  const API_BASE = window.location.origin;

  /* ══════════════════════════════════════════════════════════════
     AUTH & CLOUD SAVE MODULE
     ══════════════════════════════════════════════════════════════ */
  const AUTH_STORAGE_KEY = "echoes_auth";
  const SUPABASE_URL = "https://hnfrnqizlahwxlootoho.supabase.co";

  // Auth state
  let authUser = null;          // { user_id, email, access_token, refresh_token }
  let cloudSaveTimer = null;
  let cloudSavePending = false;
  let _cloudMergePromise = null; // set during boot so init() can await it
  let supabaseConfigured = false;

  // ── Persist auth tokens in localStorage ───────────────────────
  function saveAuthTokens(data) {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        user_id: data.user_id,
        email: data.email,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      }));
    } catch {}
  }

  function loadAuthTokens() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  function clearAuthTokens() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  // ── Auth API calls ────────────────────────────────────────────
  async function authSignup(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Signup failed");
    return data;
  }

  async function authLogin(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Login failed");
    return data;
  }

  async function authLogout() {
    if (!authUser?.access_token) return;
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authUser.access_token}` },
      });
    } catch {}
  }

  async function authCheckSession(token) {
    const res = await fetch(`${API_BASE}/api/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Session expired");
    return await res.json();
  }

  async function authRefreshToken(refreshToken) {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) throw new Error("Refresh failed");
    return await res.json();
  }

  // ── Mid-session token refresh ────────────────────────────────
  /** Try to refresh the access token. Returns true if successful. */
  async function tryRefreshAccessToken() {
    if (!authUser?.refresh_token) return false;
    try {
      const refreshed = await authRefreshToken(authUser.refresh_token);
      authUser = refreshed;
      saveAuthTokens(refreshed);
      return true;
    } catch {
      return false;
    }
  }

  // ── Cloud state API calls ─────────────────────────────────────
  async function cloudSaveState(stateObj) {
    if (!authUser?.access_token) return;
    let res = await fetch(`${API_BASE}/api/state/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authUser.access_token}`,
      },
      body: JSON.stringify({ state: stateObj }),
    });
    // Retry once with refreshed token on 401
    if (res.status === 401 && await tryRefreshAccessToken()) {
      res = await fetch(`${API_BASE}/api/state/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authUser.access_token}`,
        },
        body: JSON.stringify({ state: stateObj }),
      });
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || `Save failed: HTTP ${res.status}`);
    }
    return await res.json();
  }

  async function cloudLoadState() {
    if (!authUser?.access_token) return null;
    let res = await fetch(`${API_BASE}/api/state/load`, {
      headers: { Authorization: `Bearer ${authUser.access_token}` },
    });
    // Retry once with refreshed token on 401
    if (res.status === 401 && await tryRefreshAccessToken()) {
      res = await fetch(`${API_BASE}/api/state/load`, {
        headers: { Authorization: `Bearer ${authUser.access_token}` },
      });
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || `Load failed: HTTP ${res.status}`);
    }
    return await res.json();
  }

  async function cloudDeleteState() {
    if (!authUser?.access_token) return;
    let res = await fetch(`${API_BASE}/api/state/delete`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authUser.access_token}` },
    });
    // Retry once with refreshed token on 401
    if (res.status === 401 && await tryRefreshAccessToken()) {
      await fetch(`${API_BASE}/api/state/delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authUser.access_token}` },
      });
    }
  }

  /** Fire-and-forget cloud save using sendBeacon (survives page close). */
  function cloudSaveBeacon() {
    if (!authUser?.access_token || !cloudSavePending) return;
    try {
      const payload = JSON.stringify({ state: buildStateObject() });
      const blob = new Blob([payload], { type: "application/json" });
      // sendBeacon can't set Authorization header, so pass token as query param
      const url = `${API_BASE}/api/state/save?token=${encodeURIComponent(authUser.access_token)}`;
      if (navigator.sendBeacon(url, blob)) {
        cloudSavePending = false;
      }
    } catch (err) {
      console.error("[cloud-save-beacon] Failed:", err);
    }
  }

  // ── Check if Supabase is configured on the server ─────────────
  async function checkSupabaseStatus() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/status`);
      const data = await res.json();
      supabaseConfigured = data.supabase_configured === true;
    } catch {
      supabaseConfigured = false;
    }
    return supabaseConfigured;
  }

  // ── Debounced cloud save (auto-save after changes) ────────────
  let cloudSaveRetries = 0;
  const MAX_CLOUD_RETRIES = 3;

  function scheduleCloudSave() {
    if (!authUser) return;
    cloudSavePending = true;
    cloudSaveRetries = 0; // fresh user action resets retry count
    if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => flushCloudSave(), 3000);
  }

  async function flushCloudSave() {
    if (!authUser || !cloudSavePending) return;
    const indicator = document.getElementById("cloud-save-indicator");
    try {
      if (indicator) {
        indicator.textContent = t("cloud.saving");
        indicator.className = "cloud-save-indicator saving";
      }
      const stateObj = buildStateObject();
      await cloudSaveState(stateObj);
      // Clear pending flag AFTER success (not before try)
      cloudSavePending = false;
      cloudSaveRetries = 0;
      if (indicator) {
        indicator.textContent = t("cloud.saved");
        indicator.className = "cloud-save-indicator saved";
        setTimeout(() => { indicator.textContent = ""; }, 2000);
      }
    } catch (err) {
      console.error("[cloud-save] Failed:", err);
      // cloudSavePending stays true — schedule retry with backoff
      cloudSaveRetries++;
      if (cloudSaveRetries <= MAX_CLOUD_RETRIES) {
        const backoff = Math.min(1000 * Math.pow(2, cloudSaveRetries), 15000);
        if (indicator) {
          indicator.textContent = t("cloud.retry");
          indicator.className = "cloud-save-indicator error";
        }
        cloudSaveTimer = setTimeout(() => flushCloudSave(), backoff);
      } else {
        console.error("[cloud-save] Giving up after", MAX_CLOUD_RETRIES, "retries");
        cloudSavePending = false;
        cloudSaveRetries = 0;
        if (indicator) {
          indicator.textContent = t("cloud.failed");
          indicator.className = "cloud-save-indicator error";
        }
      }
    }
  }

  // ── Session restore on page load ──────────────────────────────
  async function restoreAuthSession() {
    const stored = loadAuthTokens();
    if (!stored || !stored.access_token) return false;

    try {
      // Validate the token is still good
      const session = await authCheckSession(stored.access_token);
      authUser = stored;
      updateAuthUI();
      return true;
    } catch {
      // Try refreshing the token
      if (stored.refresh_token) {
        try {
          const refreshed = await authRefreshToken(stored.refresh_token);
          authUser = refreshed;
          saveAuthTokens(refreshed);
          updateAuthUI();
          return true;
        } catch {
          clearAuthTokens();
          return false;
        }
      }
      clearAuthTokens();
      return false;
    }
  }

  // ── Auth UI Management ────────────────────────────────────────
  function updateAuthUI() {
    const formsDiv = document.getElementById("auth-forms");
    const loggedInDiv = document.getElementById("auth-logged-in");
    const emailSpan = document.getElementById("auth-user-email");
    const modalTitle = document.getElementById("auth-modal-title");
    const accountBtn = document.getElementById("settings-account-btn");
    const accountLabel = document.getElementById("settings-account-label");

    const logoutRow = document.getElementById("settings-logout-row");

    if (authUser) {
      formsDiv.style.display = "none";
      loggedInDiv.style.display = "";
      emailSpan.textContent = authUser.email;
      modalTitle.textContent = t("auth.account");
      if (accountLabel) accountLabel.textContent = authUser.email;
      if (logoutRow) logoutRow.style.display = "";
    } else {
      formsDiv.style.display = "";
      loggedInDiv.style.display = "none";
      modalTitle.textContent = t("auth.signin");
      if (accountLabel) accountLabel.textContent = t("auth.signin_or_signup");
      if (logoutRow) logoutRow.style.display = "none";
    }
  }

  function openAuthModal() {
    document.getElementById("auth-error").textContent = "";
    document.getElementById("auth-info").textContent = "";
    document.getElementById("auth-modal").classList.add("visible");
    updateAuthUI();
  }

  function closeAuthModal() {
    document.getElementById("auth-modal").classList.remove("visible");
    window.__authFromTitleCard = false;
  }

  // ── Wire up auth UI events (called once at boot) ──────────────
  function initAuthUI() {
    const modal = document.getElementById("auth-modal");
    const closeBtn = document.getElementById("auth-close");
    const submitBtn = document.getElementById("auth-submit");
    const logoutBtn = document.getElementById("auth-logout");
    const emailInput = document.getElementById("auth-email");
    const passInput = document.getElementById("auth-password");
    const errorEl = document.getElementById("auth-error");
    const infoEl = document.getElementById("auth-info");
    const tabBtns = document.querySelectorAll("[data-auth-tab]");
    const accountBtn = document.getElementById("settings-account-btn");

    let currentTab = "login";

    // Tab switching
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        currentTab = btn.dataset.authTab;
        tabBtns.forEach(b => b.classList.toggle("active", b.dataset.authTab === currentTab));
        submitBtn.textContent = currentTab === "login" ? t("auth.signin") : t("auth.signup");
        passInput.placeholder = currentTab === "signup" ? t("auth.password_placeholder") : t("auth.password_label");
        passInput.autocomplete = currentTab === "signup" ? "new-password" : "current-password";
        errorEl.textContent = "";
        infoEl.textContent = "";
      });
    });

    // Submit
    submitBtn.addEventListener("click", async () => {
      // Read active tab from DOM (in case it was changed externally, e.g. title card flow)
      const activeTabBtn = document.querySelector("[data-auth-tab].active");
      if (activeTabBtn) currentTab = activeTabBtn.dataset.authTab;

      const email = emailInput.value.trim();
      const password = passInput.value;
      errorEl.textContent = "";
      infoEl.textContent = "";

      if (!email || !password) {
        errorEl.textContent = t("auth.error_empty");
        return;
      }
      if (currentTab === "signup" && password.length < 6) {
        errorEl.textContent = t("auth.error_password_short");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = currentTab === "login" ? t("auth.signing_in") : t("auth.creating_account");

      try {
        let result;
        if (currentTab === "signup") {
          result = await authSignup(email, password);
          if (!result.access_token) {
            // Email confirmation required
            infoEl.textContent = t("auth.confirm_email");
            submitBtn.disabled = false;
            submitBtn.textContent = t("auth.signup");
            return;
          }
        } else {
          result = await authLogin(email, password);
        }

        authUser = result;
        saveAuthTokens(result);
        updateAuthUI();

        // After login, try loading cloud state
        await mergeCloudState();
        renderNpcGrid();
        renderEvidence();

        // If login came from auth prompt, close modal and enter the game
        if (window.__authFromTitleCard) {
          window.__authFromTitleCard = false;
          closeAuthModal();
          const authPrompt = document.getElementById("auth-prompt");
          authPrompt.classList.add("hidden");
          showHubOnCaseboard();
          if (!isTutorialDone()) {
            chatTutorialPending = true;
            setTimeout(() => startTutorial("hub"), 500);
          }
        }

      } catch (err) {
        errorEl.textContent = err.message;
      }
      submitBtn.disabled = false;
      submitBtn.textContent = currentTab === "login" ? t("auth.signin") : t("auth.signup");
    });

    // Enter key submits
    [emailInput, passInput].forEach(input => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submitBtn.click();
      });
    });

    // Logout
    logoutBtn.addEventListener("click", async () => {
      await flushCloudSave(); // persist any pending state before clearing auth
      await authLogout();
      authUser = null;
      clearAuthTokens();
      resetLocalState();
      updateAuthUI();
      closeAuthModal();
      // Return to title card
      chatScreen.classList.remove("active");
      hubScreen.classList.remove("active");
      titleCard.classList.remove("dismissed", "hidden");
    });

    // Close
    closeBtn.addEventListener("click", closeAuthModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeAuthModal();
    });

    // Settings account button
    if (accountBtn) {
      accountBtn.addEventListener("click", () => {
        // Close settings first if it's open
        const settingsModal = document.getElementById("settings-modal");
        if (settingsModal) settingsModal.classList.remove("visible");
        openAuthModal();
      });
    }

    // Settings logout button — sign out and return to title card
    const settingsLogoutBtn = document.getElementById("settings-logout-btn");
    if (settingsLogoutBtn) {
      settingsLogoutBtn.addEventListener("click", async () => {
        await flushCloudSave(); // persist any pending state before clearing auth
        // Leave chat BEFORE resetting state so saveState() saves the real state
        if (chatScreen.classList.contains("active")) {
          leaveChat();
        }
        await authLogout();
        authUser = null;
        clearAuthTokens();
        resetLocalState();
        updateAuthUI();
        // Close settings
        const settingsModal = document.getElementById("settings-modal");
        if (settingsModal) settingsModal.classList.remove("visible");
        // Return to title card
        chatScreen.classList.remove("active");
        hubScreen.classList.remove("active");
        titleCard.classList.remove("dismissed", "hidden");
      });
    }
  }

  // ── Merge cloud state with local state ────────────────────────
  async function mergeCloudState() {
    if (!authUser) return;
    try {
      const cloudData = await cloudLoadState();
      if (!cloudData || !cloudData.state) {
        // No cloud save — push local state up (first login / new account)
        await cloudSaveState(buildStateObject());
        return;
      }

      const cloudState = cloudData.state;
      const cloudRichness = stateRichness(cloudState);

      // Read the PERSISTED localStorage state rather than calling buildStateObject(),
      // which always stamps savedAt with the current time (making local always "newer").
      let persistedLocal = null;
      try {
        const raw = localStorage.getItem("echoes_state_v2");
        if (raw) persistedLocal = JSON.parse(raw);
      } catch {}

      // Detect a fresh device by checking for real user-generated content
      // (conversations), NOT total richness — seedStartingEvidence() adds 3
      // evidence items on every fresh page load, inflating richness even when
      // the user has never actually played on this device.
      const localConvCount = persistedLocal?.conversations
        ? Object.values(persistedLocal.conversations)
            .reduce((n, msgs) => n + (Array.isArray(msgs) ? msgs.length : 0), 0)
        : 0;

      if (localConvCount === 0 && cloudRichness > 0) {
        // Fresh device / cleared local — cloud is clearly better
        console.log("[cloud-merge] Fresh device — using cloud state (%d items)", cloudRichness);
        applyStateObject(cloudState);
        saveState(); // persist to localStorage so local matches cloud
        return;
      }

      // Both sides have real user data — compare using persisted timestamps
      const cloudTime = cloudData.updated_at ? new Date(cloudData.updated_at).getTime() : 0;
      const localTime = persistedLocal?.savedAt ? new Date(persistedLocal.savedAt).getTime() : 0;
      const localRichness = stateRichness(persistedLocal);

      let useCloud;
      if (cloudRichness === 0 && localRichness > 0) {
        // Cloud is empty but local has data — keep local
        useCloud = false;
      } else if (cloudTime && localTime) {
        // Both have timestamps — newer wins, but within 5s use richness as tiebreaker
        const drift = Math.abs(cloudTime - localTime);
        if (drift < 5000) {
          useCloud = cloudRichness > localRichness;
        } else {
          useCloud = cloudTime > localTime;
        }
      } else {
        // Missing timestamp(s) — fall back to richness
        useCloud = cloudRichness >= localRichness;
      }

      if (useCloud) {
        console.log("[cloud-merge] Using cloud state (cloud=%d, local=%d items)",
                    cloudRichness, localRichness);
        applyStateObject(cloudState);
        saveState(); // persist to localStorage so local matches cloud
      } else {
        console.log("[cloud-merge] Keeping local state (local=%d, cloud=%d items)",
                    localRichness, cloudRichness);
        await cloudSaveState(buildStateObject());
      }
    } catch (err) {
      console.error("[cloud-load] Failed to merge cloud state:", err);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     END AUTH MODULE
     ══════════════════════════════════════════════════════════════ */

  const VALID_EXPRESSIONS = ["neutral", "guarded", "distressed", "angry", "contemplative", "smirking"];
  let currentExpression = {};  // npcId → last known expression

  function portraitUrl(npcId, expression = "neutral") {
    return `${CASE.portraitBasePath}/${npcId}/${expression}.webp`;
  }

  /** Build an <img> element for a portrait, falling back to initials on error. */
  function buildPortraitImg(npcId, expression = "neutral", size = 36) {
    const meta = NPC_META[npcId] || { initials: "?" };
    const img = new Image(size, size);
    img.src = portraitUrl(npcId, expression);
    img.alt = meta.initials;
    img.loading = "lazy";
    img.onerror = function() {
      this.parentElement.textContent = meta.initials;
    };
    return img;
  }

  /** Update the chat portrait to the given expression. */
  function setHeaderExpression(npcId, expression) {
    if (!VALID_EXPRESSIONS.includes(expression)) expression = "neutral";
    currentExpression[npcId] = expression;
    if (npcId === activeNpcId && chatPortraitImg) {
      chatPortraitImg.src = portraitUrl(npcId, expression);
    }
  }

  function npcRole(npcId) {
    return t("role." + npcId);
  }

  /** Update the interrogation icon gauges for the active NPC. */
  function updateInterrogationUI(npcId) {
    const gaugesContainer = document.getElementById("interrogation-gauges");
    const gaugeP = document.getElementById("gauge-pressure");
    const gaugeR = document.getElementById("gauge-rapport");
    const iconP  = document.getElementById("gauge-pressure-icon");
    const iconR  = document.getElementById("gauge-rapport-icon");
    if (!gaugeP || !gaugeR) return;

    // Partner: hide gauges, show hint button; suspects: show gauges, hide hint
    const hintBtn = document.getElementById("lila-hint-btn");
    if (npcId === PARTNER_NPC_ID) {
      gaugeP.style.display = "none";
      gaugeR.style.display = "none";
      if (hintBtn) hintBtn.classList.add("visible");
      return;
    }
    if (hintBtn) hintBtn.classList.remove("visible");
    gaugeP.style.display = "";
    gaugeR.style.display = "";

    const state = npcInterrogation[npcId] || { pressure_band: "calm", rapport_band: "neutral" };

    // Update wrapper classes for glow styling
    gaugeP.className = "gauge gauge-pressure " + state.pressure_band;
    gaugeR.className = "gauge gauge-rapport " + state.rapport_band;

    // Swap icon images with pulse animation on change
    const newPSrc = "icons/pressure-" + state.pressure_band + ".png";
    const newRSrc = "icons/rapport-" + state.rapport_band + ".png";
    if (!iconP.src.endsWith(newPSrc)) {
      iconP.src = newPSrc;
      iconP.classList.add("pulse");
      setTimeout(() => iconP.classList.remove("pulse"), 600);
    }
    if (!iconR.src.endsWith(newRSrc)) {
      iconR.src = newRSrc;
      iconR.classList.add("pulse");
      setTimeout(() => iconR.classList.remove("pulse"), 600);
    }
  }

  /** Check if all canonical evidence is collected and trigger endgame. */
  function checkEndgameTrigger() {
    if (caseReadyPromptShown) return;
    const collectedIds = evidence.map(e => e.id);
    if (!CANONICAL_EVIDENCE.every(id => collectedIds.includes(id))) return;
    caseReadyPromptShown = true;
    saveState();
    document.getElementById("case-ready-modal").classList.add("visible");
  }

  /* ── State ──────────────────────────────────────────────── */
  let npcs = [];
  let activeNpcId = null;
  let conversations = {};
  let evidence = [];
  let discoveries = {};
  let npcInterrogation = {};   // npc_id → { pressure, rapport, pressure_band, rapport_band }
  let discoveryMessageIndices = {};  // npc_id → [messageIndex, ...] — tracks which messages revealed discoveries
  let playerNotes = "";
  let caseReadyPromptShown = false;
  let sending = false;
  let accusationTarget = null;
  let subpoenaToastShown = false;

  /* ── Gameplay tracking ─────────────────────────────────── */
  let gameId = localStorage.getItem("echoes_game_id") || crypto.randomUUID();
  localStorage.setItem("echoes_game_id", gameId);

  function trackEvent(endpoint, payload) {
    fetch(`${API_BASE}/api/track/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});  // fire-and-forget
  }

  /* ── Voice State ─────────────────────────────────── */
  let audioEnabled = localStorage.getItem("echoes_audio") !== "false";
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;
  let isTranscribing = false;
  let audioCache = new Map();
  let currentAudio = null;
  let npcVoices = {};
  let npcVoiceInstructions = {};
  let voiceMode = false;
  let chatAbortController = null;
  let ttsAbortController = null;
  let silenceTimer = null;
  let audioContext = null;
  let analyserNode = null;
  let silenceCheckRAF = null;

  /* ── DOM refs ───────────────────────────────────────────── */
  const $ = (s) => document.querySelector(s);

  // Screens
  const titleCard         = $("#title-card");
  const titleCardBtn      = $("#title-card-btn");
  const hubScreen         = $("#hub-screen");
  const chatScreen        = $("#chat-screen");
  const TITLE_STORAGE_KEY = "echoes_title_seen";

  // Hub elements
  const npcGridEl         = $("#npc-grid");
  const hubSettingsTab    = $("#hub-settings-tab");

  // Chat elements
  const navToSuspects     = $("#nav-to-suspects");
  const navToCaseboard    = $("#nav-to-caseboard");
  const navToNotes        = $("#nav-to-notes");
  const chatNotesPanel    = $("#chat-notes-panel");
  const chatNotesTextarea = $("#chat-notes-textarea");
  const chatLayout        = document.querySelector("#chat-screen .chat-layout");
  const chatPortraitImg   = $("#chat-portrait-img");
  const portraitName      = $("#portrait-name");
  const portraitRole      = $("#portrait-role");
  const portraitStatus    = $("#portrait-status");
  const chatMessages      = $("#chat-messages");
  const typingIndicator   = $("#typing-indicator");
  const chatInputBar      = $("#chat-input-bar");
  const chatInput         = $("#chat-input");
  const sendBtn           = $("#send-btn");
  const cancelBtn         = $("#cancel-btn");
  const micBtn            = $("#mic-btn");
  const audioToggle       = $("#audio-toggle");

  // Chat dossier

  // Case Board (hub)
  const cbEvidenceList    = $("#cb-evidence-list");
  const cbEvidenceEmpty   = $("#cb-evidence-empty");

  // Modals
  const accusationModal   = $("#accusation-modal");
  const suspectGrid       = $("#suspect-grid");
  const cancelAccuse      = $("#cancel-accuse");
  const confirmAccuse     = $("#confirm-accuse");
  const outcomeScreen     = $("#outcome-screen");
  const outcomeCard       = $("#outcome-card");
  const outcomeTitle      = $("#outcome-title");
  const outcomeText       = $("#outcome-text");
  const restartBtn        = $("#restart-btn");

  /* ── Helpers ────────────────────────────────────────────── */

  /** Count total conversation messages + evidence items as a state richness proxy. */
  function stateRichness(s) {
    if (!s) return 0;
    let count = 0;
    if (s.conversations) {
      for (const msgs of Object.values(s.conversations)) {
        count += Array.isArray(msgs) ? msgs.length : 0;
      }
    }
    if (Array.isArray(s.evidence)) count += s.evidence.length;
    return count;
  }

  /** Build a plain object from current game state (used for both localStorage and cloud). */
  function buildStateObject() {
    return {
      caseId: CASE.id,
      conversations,
      evidence,
      activeNpcId,
      discoveries,
      npcInterrogation,
      discoveryMessageIndices,
      playerNotes,
      caseReadyPromptShown,
      briefingOpen,
      // Also persist tutorial / UI flags for full cloud restore
      tutorialDone: localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true",
      titleSeen: !!localStorage.getItem(TITLE_STORAGE_KEY),
      lilaHintSeen: !!localStorage.getItem(LILA_HINT_STORAGE_KEY),
      audioEnabled,
      language: window.currentLang || "en",
      gameId,
      savedAt: new Date().toISOString(),
    };
  }

  /** Apply a state object (from cloud or localStorage) to the running game variables. */
  function applyStateObject(s) {
    if (!s) return;
    // Skip state from a different case
    if (s.caseId && s.caseId !== CASE.id) return;
    if (s.conversations) conversations = s.conversations;
    if (s.evidence) evidence = s.evidence;
    if ("activeNpcId" in s) activeNpcId = s.activeNpcId; // may be null (on hub)
    if (s.discoveries) discoveries = s.discoveries;
    if (s.npcInterrogation) npcInterrogation = s.npcInterrogation;
    if (s.discoveryMessageIndices) discoveryMessageIndices = s.discoveryMessageIndices;
    if (s.playerNotes !== undefined) {
      playerNotes = s.playerNotes;
      const notesEl = document.getElementById("player-notes");
      if (notesEl) notesEl.value = playerNotes;
      if (chatNotesTextarea) chatNotesTextarea.value = playerNotes;
    }
    if (s.caseReadyPromptShown !== undefined) caseReadyPromptShown = s.caseReadyPromptShown;
    if (s.briefingOpen !== undefined) briefingOpen = s.briefingOpen;
    // Restore tutorial flags
    if (s.tutorialDone) localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    if (s.titleSeen) localStorage.setItem(TITLE_STORAGE_KEY, "1");
    if (s.lilaHintSeen) localStorage.setItem(LILA_HINT_STORAGE_KEY, "1");
    if (s.language && typeof switchLanguage === "function") {
      window.currentLang = s.language;
    }
    if (s.gameId) { gameId = s.gameId; localStorage.setItem("echoes_game_id", gameId); }
    if (s.audioEnabled !== undefined) {
      audioEnabled = s.audioEnabled;
      localStorage.setItem("echoes_audio", String(audioEnabled));
    }
  }

  function saveState() {
    // Always save to localStorage (offline-first) — use buildStateObject for consistency
    try {
      localStorage.setItem("echoes_state_v2", JSON.stringify(buildStateObject()));
    } catch (err) {
      console.error("[saveState] Failed to persist state:", err);
    }
    // Schedule a debounced cloud save if logged in
    scheduleCloudSave();
  }

  function loadState() {
    try {
      const raw = localStorage.getItem("echoes_state_v2");
      if (!raw) return;
      applyStateObject(JSON.parse(raw));
    } catch (err) {
      console.error("[loadState] Failed to parse saved state:", err);
    }
  }

  /** Wipe all local game state (memory + localStorage). Does NOT touch cloud. */
  function resetLocalState() {
    if (voiceMode) exitVoiceMode();
    conversations = {};
    evidence = [];
    discoveries = {};
    npcInterrogation = {};
    discoveryMessageIndices = {};
    playerNotes = "";
    caseReadyPromptShown = false;
    subpoenaToastShown = false;
    briefingOpen = true;
    activeNpcId = null;
    gameId = crypto.randomUUID();
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    for (const url of audioCache.values()) URL.revokeObjectURL(url);
    audioCache.clear();
    localStorage.removeItem("echoes_state_v2");
    localStorage.removeItem("echoes_game_id");
    localStorage.removeItem("echoes_tutorial_done");
    localStorage.removeItem("echoes_title_seen");
    localStorage.removeItem("echoes_lila_hint_seen");
    // Keep echoes_audio (device preference)
  }

  /** Full restart: wipe local state, delete cloud save, start new game session. */
  async function clearState() {
    resetLocalState();
    localStorage.setItem("echoes_game_id", gameId);
    trackEvent("session", { session_id: gameId, case_id: CASE.id, language: window.currentLang || "en" });
    if (authUser) {
      try { await cloudDeleteState(); }
      catch (err) { console.error("[cloud] Failed to delete:", err); }
    }
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  /* ── Screen Transitions ────────────────────────────────── */
  function showHub() {
    chatScreen.classList.remove("active");
    hubScreen.classList.add("active");
    renderNpcGrid();
    renderEvidence();
  }

  function showChat() {
    hubScreen.classList.remove("active");
    chatScreen.classList.add("active");
    // Ensure chat layout is visible (not notes panel)
    chatNotesPanel.style.display = "none";
    chatLayout.style.display = "";
  }

  /* ── Initialize ─────────────────────────────────────────── */
  function seedStartingEvidence() {
    let added = false;
    for (const se of STARTING_EVIDENCE) {
      const existing = evidence.find(e => e.id === se.id);
      if (existing) {
        // Migration: ensure textKey is set on older saved evidence
        if (!existing.textKey) existing.textKey = se.textKey;
        continue;
      }
      const meta = EVIDENCE_CATALOG[se.id];
      if (!meta) continue;
      evidence.unshift({
        id: se.id,
        label: t("evidence." + se.id + "_label") || meta.label,
        text: t(se.textKey),
        textKey: se.textKey,
        source: "crime-scene",
      });
      added = true;
    }
    if (added) saveState();
  }

  let briefingOpen = true; // default: open on first visit

  async function init() {
    loadState();
    seedStartingEvidence();
    // Wait for cloud merge to finish (if any) before first render
    // so we always render with the latest cloud state
    if (_cloudMergePromise) {
      await _cloudMergePromise.catch(() => {});
    }
    // Check isNewGame AFTER cloud merge — a returning user on a new device
    // will have no localStorage but WILL have a cloud save, so this avoids
    // a false-positive "new game" analytics event.
    const isNewGame = !conversations || Object.keys(conversations).length === 0;
    if (isNewGame) {
      trackEvent("session", { session_id: gameId, case_id: CASE.id, language: window.currentLang || "en" });
    }
    try {
      const res = await fetch(`${API_BASE}/api/npcs`);
      const data = await res.json();
      npcs = data.npcs.sort((a, b) => {
        const oa = NPC_META[a.npc_id]?.order ?? 99;
        const ob = NPC_META[b.npc_id]?.order ?? 99;
        return oa - ob;
      });
      for (const npc of npcs) {
        if (npc.voice) npcVoices[npc.npc_id] = npc.voice;
        if (npc.voice_instruction) npcVoiceInstructions[npc.npc_id] = npc.voice_instruction;
      }
    } catch {
      npcs = Object.entries(NPC_META).map(([id, m]) => ({
        npc_id: id,
        display_name: id.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" "),
      }));
    }

    renderNpcGrid();
    renderEvidence();

    // Populate briefing paragraphs from case data
    const briefingBody = $("#cb-briefing-body");
    briefingBody.innerHTML = "";
    for (const key of CASE.briefingKeys) {
      const p = document.createElement("p");
      p.setAttribute("data-i18n", key);
      p.setAttribute("data-i18n-html", "");
      p.innerHTML = t(key);
      briefingBody.appendChild(p);
    }

    // Restore briefing open/closed state
    const briefingToggle = $("#cb-briefing-toggle");
    briefingToggle.setAttribute("aria-expanded", String(briefingOpen));
    if (briefingOpen) briefingBody.classList.add("open");
    else briefingBody.classList.remove("open");

    const titleSeen = localStorage.getItem(TITLE_STORAGE_KEY);
    const hasConversations = Object.keys(conversations).length > 0;

    if (activeNpcId) {
      // Returning player with active chat — go directly there
      titleCard.classList.add("hidden");
      selectNpc(activeNpcId);
    } else if (!titleSeen && !hasConversations) {
      // First-time player — show title card, hub stays hidden until dismissed
      titleCard.classList.remove("hidden");
    } else {
      // Returning player — skip title card, show hub
      titleCard.classList.add("hidden");
      showHubOnCaseboard();
    }
  }

  function showHubOnCaseboard() {
    hubScreen.classList.add("active");
    document.querySelectorAll(".manila-tab[data-hub-tab]").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".hub-panel").forEach(p => p.classList.remove("active"));
    document.querySelector('.manila-tab[data-hub-tab="caseboard"]').classList.add("active");
    document.getElementById("hub-caseboard").classList.add("active");
  }

  /* ── Render NPC Grid (5 + 4 staggered rows) ────────────── */
  function renderNpcGrid() {
    npcGridEl.innerHTML = "";

    const row1 = document.createElement("div");
    row1.className = "npc-row";
    const row2 = document.createElement("div");
    row2.className = "npc-row";

    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const meta = NPC_META[npc.npc_id] || { initials: "?" };
      const card = document.createElement("div");
      card.className = "npc-card";
      if (npc.npc_id === PARTNER_NPC_ID) card.classList.add("npc-card-partner");
      if (conversations[npc.npc_id]?.length) card.classList.add("has-talked");
      card.dataset.npcId = npc.npc_id;

      const portraitDiv = document.createElement("div");
      portraitDiv.className = "npc-card-portrait";
      const img = new Image();
      img.src = portraitUrl(npc.npc_id, "neutral");
      img.alt = npc.display_name.split(" — ")[0];
      img.loading = "lazy";
      img.onerror = function() {
        this.parentElement.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;color:var(--text-faint);">${meta.initials}</div>`;
      };
      portraitDiv.appendChild(img);

      const infoDiv = document.createElement("div");
      infoDiv.className = "npc-card-info";
      infoDiv.innerHTML = `
        <div class="npc-card-name">${escapeHtml(npc.display_name.split(" — ")[0])}</div>
        <div class="npc-card-role">${escapeHtml(npcRole(npc.npc_id))}</div>
      `;

      card.appendChild(portraitDiv);
      card.appendChild(infoDiv);

      // Discovery badge — shows exclamation when this NPC yielded unseen discoveries
      if (npcsWithNewDiscoveries.has(npc.npc_id)) {
        const badge = document.createElement("div");
        badge.className = "npc-card-discovery-badge";
        badge.textContent = "!";
        card.appendChild(badge);
      }

      card.addEventListener("click", () => selectNpc(npc.npc_id));

      // First 5 go to row 1, rest to row 2
      if (i < 5) {
        row1.appendChild(card);
      } else {
        row2.appendChild(card);
      }
    }

    npcGridEl.appendChild(row1);
    if (row2.children.length > 0) {
      npcGridEl.appendChild(row2);
    }

    // Accusation button below the NPC grid
    const accuseSection = document.createElement("div");
    accuseSection.className = "accuse-section";
    accuseSection.innerHTML = `<button id="hub-accuse-btn" data-i18n="sidebar.accuse">${t("sidebar.accuse")}</button>`;
    npcGridEl.appendChild(accuseSection);
    $("#hub-accuse-btn").addEventListener("click", openAccusationModal);
  }

  /* ── Select NPC ─────────────────────────────────────────── */
  function selectNpc(npcId) {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    if (voiceMode) exitVoiceMode();
    activeNpcId = npcId;
    const npc = npcs.find(n => n.npc_id === npcId);
    const displayName = npc?.display_name?.split(" — ")[0] || npcId;

    // Update portrait
    const expr = currentExpression[npcId] || "neutral";
    chatPortraitImg.src = portraitUrl(npcId, expr);
    chatPortraitImg.alt = displayName;

    // Update nameplate and topbar
    portraitName.textContent = displayName;
    portraitRole.textContent = npcRole(npcId);
    portraitStatus.textContent = "";
    // NPC name/role shown in portrait panel only (topbar has nav buttons)

    // Render conversation and interrogation pills
    renderMessages();
    updateInterrogationUI(npcId);

    // Preload all expressions for smooth transitions
    for (const ex of VALID_EXPRESSIONS) {
      const preload = new Image();
      preload.src = portraitUrl(npcId, ex);
    }

    // Transition to chat screen
    showChat();
    chatInput.focus();
    saveState();

    // Trigger chat-phase tutorial if pending
    if (typeof chatTutorialPending !== "undefined" && chatTutorialPending) {
      if (npcId === PARTNER_NPC_ID) {
        // Partner has no gauges/info — show hint btn + input tutorial instead
        // Keep chatTutorialPending alive so gauges/info tutorial fires for suspects
        setTimeout(() => startTutorial("lila_chat"), 600);
      } else {
        chatTutorialPending = false;
        // If partner's chat already showed the input bar, only show gauges + info
        const lilaAlreadySeen = localStorage.getItem(LILA_HINT_STORAGE_KEY);
        setTimeout(() => startTutorial(lilaAlreadySeen ? "chat_short" : "chat"), 600);
      }
    }
    // Partner hint button tutorial — show once on first partner chat visit
    else if (npcId === PARTNER_NPC_ID
             && typeof LILA_HINT_STORAGE_KEY !== "undefined"
             && !localStorage.getItem(LILA_HINT_STORAGE_KEY)) {
      setTimeout(() => startTutorial("lila"), 600);
    }
  }

  /* ── Render Messages ────────────────────────────────────── */
  function renderMessages() {
    chatMessages.innerHTML = "";
    const history = conversations[activeNpcId] || [];

    if (history.length === 0) {
      // NPC bio blurb (hidden once the player sends a message)
      const bioKey = `dossier.${activeNpcId}.bio`;
      const bioText = t(bioKey);
      if (bioText !== bioKey) {
        const bio = document.createElement("div");
        bio.className = "chat-npc-bio";
        bio.id = "chat-npc-bio";
        bio.textContent = bioText;
        chatMessages.appendChild(bio);
      }

      const hint = document.createElement("div");
      hint.id = "chat-empty-hint";
      hint.className = "chat-empty-hint";
      if (activeNpcId === PARTNER_NPC_ID) {
        hint.textContent = t("chat.hint_partner");
      } else {
        const npcName = npcs.find(n => n.npc_id === activeNpcId)?.display_name?.split(" — ")[0] || "this person";
        hint.textContent = t("chat.hint", { name: npcName });
      }
      chatMessages.appendChild(hint);

      // Conversation starter buttons
      const startersDiv = document.createElement("div");
      startersDiv.className = "chat-starters";
      for (let n = 1; n <= 3; n++) {
        const key = `starter.${activeNpcId}.${n}`;
        const text = t(key);
        if (text === key) continue;
        const btn = document.createElement("button");
        btn.className = "chat-starter-btn";
        btn.textContent = text;
        btn.addEventListener("click", () => sendMessage(text));
        startersDiv.appendChild(btn);
      }
      if (startersDiv.children.length > 0) {
        chatMessages.appendChild(startersDiv);
      }
    }

    for (let i = 0; i < history.length; i++) {
      appendMessageBubble(history[i].role, history[i].content, i);
    }
    if (history.length > 0) scrollToBottom();
    else chatMessages.scrollTop = 0;
  }

  // Strip system tags (EXPRESSION, EVIDENCE and their Serbian variants) from display text
  function stripSystemTags(text) {
    return text.replace(/\[(?:EXPRESSION|EVIDENCE|IZRAŽAJ|IZRAZAJ|IZRAZ|EVIDENCIJA|DOKAZ):\s*[^\]]*\]/gi, "").trim();
  }

  function appendMessageBubble(role, content, messageIndex) {
    const div = document.createElement("div");
    div.className = `msg ${role}`;
    const senderLabel = role === "user" ? t("chat.sender_you") :
      (npcs.find(n => n.npc_id === activeNpcId)?.display_name?.split(" — ")[0] || "Suspect");

    const displayContent = role === "assistant" ? stripSystemTags(content) : content;
    let senderHtml = senderLabel;

    if (role === "assistant" && activeNpcId && messageIndex !== undefined) {
      const cacheKey = `${activeNpcId}:${messageIndex}`;
      senderHtml += `<button class="msg-audio-btn" data-cache-key="${cacheKey}"
                data-npc-id="${activeNpcId}" data-msg-index="${messageIndex}"
                title="${t('voice.replay_title')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </button>`;
    }

    let html = `<div class="msg-sender">${senderHtml}</div>${escapeHtml(displayContent)}`;

    div.innerHTML = html;

    const replayBtn = div.querySelector(".msg-audio-btn");
    if (replayBtn) {
      replayBtn.addEventListener("click", () => {
        const npcId = replayBtn.dataset.npcId;
        const idx = parseInt(replayBtn.dataset.msgIndex, 10);
        const msgContent = (conversations[npcId] || [])[idx]?.content;
        if (msgContent) speakText(msgContent, npcId, replayBtn.dataset.cacheKey);
      });
    }

    // Restore discovery icon if this message had one
    if (role === "assistant" && activeNpcId && messageIndex !== undefined
        && (discoveryMessageIndices[activeNpcId] || []).includes(messageIndex)) {
      div.classList.add("msg-has-discovery");
      const icon = document.createElement("span");
      icon.className = "msg-discovery-icon";
      icon.title = t("toast.new_discovery");
      icon.textContent = "!";
      div.appendChild(icon);
    }

    chatMessages.appendChild(div);
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  /* ── Send Message ───────────────────────────────────────── */
  async function sendMessage(overrideText, displayText) {
    const text = overrideText || chatInput.value.trim();
    if (!text || !activeNpcId || sending) return;
    const shownText = displayText || text; // what appears in the chat bubble

    sending = true;
    sendBtn.disabled = true;
    showCancelBtn();
    chatAbortController = new AbortController();
    if (!overrideText) { chatInput.value = ""; autoResize(); }

    if (!conversations[activeNpcId]) conversations[activeNpcId] = [];

    // Remove empty-state bio, hint and starters
    const bio = document.getElementById("chat-npc-bio");
    if (bio) bio.remove();
    const hint = document.getElementById("chat-empty-hint");
    if (hint) hint.remove();
    const starters = chatMessages.querySelector(".chat-starters");
    if (starters) starters.remove();

    // Add user bubble (show friendly display text, store API text in history)
    conversations[activeNpcId].push({ role: "user", content: text });
    const userIdx = conversations[activeNpcId].length - 1;
    appendMessageBubble("user", shownText, userIdx);
    scrollToBottom();

    // Show typing indicator
    typingIndicator.classList.add("visible");
    chatMessages.appendChild(typingIndicator);
    scrollToBottom();
    portraitStatus.textContent = t("chat.status_responding");

    try {
      const historyForApi = conversations[activeNpcId].slice(0, -1);
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npc_id: activeNpcId,
          message: text,
          history: historyForApi,
          language: window.currentLang || "en",
          pressure: (npcInterrogation[activeNpcId] || {}).pressure || 0,
          rapport: (npcInterrogation[activeNpcId] || {}).rapport ?? 25,
          peak_pressure: (npcInterrogation[activeNpcId] || {}).peak_pressure ??
                         (npcInterrogation[activeNpcId] || {}).pressure ?? 0,
          player_evidence_ids: evidence.map(e => e.id),
          player_discovery_ids: Object.values(discoveries).flat().map(d => d.id),
          session_id: gameId,
        }),
        signal: chatAbortController?.signal,
      });

      if (!res.ok) {
        let detail;
        try {
          const errBody = await res.json();
          detail = errBody.detail || `HTTP ${res.status}`;
        } catch (_) {
          const text = await res.text().catch(() => "");
          detail = text ? `HTTP ${res.status}: ${text.slice(0, 200)}` : `HTTP ${res.status} (no response body)`;
        }
        console.error(`[chat] Server error: ${res.status}`, detail);
        throw new Error(detail);
      }

      const data = await res.json();
      conversations[activeNpcId].push({ role: "assistant", content: data.reply });

      typingIndicator.classList.remove("visible");
      const assistantIdx = conversations[activeNpcId].length - 1;
      appendMessageBubble("assistant", data.reply, assistantIdx);
      scrollToBottom();

      // Auto-play TTS only in voice mode
      if (voiceMode) {
        const cacheKey = `${activeNpcId}:${assistantIdx}`;
        speakText(data.reply, activeNpcId, cacheKey);
      }

      // Process evidence and discoveries
      detectEvidence(data.evidence_ids || [], activeNpcId);
      detectNewDiscoveries(data.discovery_ids || [], activeNpcId, data.discovery_summaries || {});

      // Show one-time subpoena toast when a suspect mentions it
      if (activeNpcId !== PARTNER_NPC_ID && !subpoenaToastShown &&
          /subpoena|court order|lawyer|not at liberty/i.test(data.reply)) {
        subpoenaToastShown = true;
        showDiscoveryToast(t("toast.subpoena"));
      }

      // Update expression
      if (data.expression) {
        setHeaderExpression(activeNpcId, data.expression);
      }

      // Update interrogation state
      if (data.pressure !== undefined) {
        npcInterrogation[activeNpcId] = {
          pressure: data.pressure,
          rapport: data.rapport,
          pressure_band: data.pressure_band || "calm",
          rapport_band: data.rapport_band || "cold",
          peak_pressure: data.peak_pressure ?? data.pressure,
        };
        updateInterrogationUI(activeNpcId);
      }
      checkEndgameTrigger();

    } catch (err) {
      typingIndicator.classList.remove("visible");
      // Silently ignore user-initiated cancellation
      if (err.name === "AbortError") {
        // Remove the pending user message from conversation
        conversations[activeNpcId].pop();
      } else {
        // Distinguish network errors from server errors
        const isNetwork = err instanceof TypeError && err.message.includes("fetch");
        const displayMsg = isNetwork
          ? "Cannot reach server — please try again."
          : err.message;
        console.error("[chat] Request failed:", err);
        const errDiv = document.createElement("div");
        errDiv.style.cssText = "text-align:center; color:var(--danger); font-size:0.82rem; padding:0.5rem;";
        errDiv.textContent = t("chat.error", { message: displayMsg });
        chatMessages.appendChild(errDiv);
        scrollToBottom();
        conversations[activeNpcId].pop();
      }
    }

    chatAbortController = null;
    portraitStatus.textContent = "";
    sending = false;
    sendBtn.disabled = !chatInput.value.trim();
    hideCancelBtn();
    saveState();
  }

  /* ── Evidence Detection ─────────────────────────────────── */
  function gradeArrest() {
    const found = Object.values(discoveries).flat().map(d => d.id);
    const hasMotive = CASE.culpritMotiveDiscoveries.some(d => found.includes(d));
    const hasOpportunity = CASE.culpritOpportunityDiscoveries.some(d => found.includes(d));
    if (hasMotive && hasOpportunity) return "slam_dunk";
    if (hasMotive || hasOpportunity) return "plea_deal";
    return "released";
  }

  /**
   * Process new discoveries from the server's discovery-level detection.
   * Each discovery fires independently with an LLM-generated summary.
   */
  function detectNewDiscoveries(discoveryIds, npcId, discoverySummaries) {
    const newTexts = [];

    for (const did of discoveryIds) {
      const evidenceId = DISCOVERY_EVIDENCE_MAP[did];
      if (!evidenceId) continue;
      if (!discoveries[npcId]) discoveries[npcId] = [];
      if (discoveries[npcId].find(d => d.id === did)) continue;

      // Use LLM summary if available; fall back to pre-written i18n text
      const summary = discoverySummaries[did];
      const fallbackKey = "discovery." + did;
      const displayText = summary || t(fallbackKey);

      discoveries[npcId].push({
        id: did,
        text: summary || fallbackKey,  // Store literal summary or i18n key as fallback
        evidenceId: evidenceId,
        timestamp: Date.now(),
        isNew: true,
      });
      newTexts.push(displayText);
      trackEvent("discovery", { session_id: gameId, case_id: CASE.id, evidence_id: evidenceId, npc_id: npcId, discovery_id: did });
    }

    if (newTexts.length > 0) {
      for (const txt of newTexts) showDiscoveryToast(txt);
      npcsWithNewDiscoveries.add(npcId);
      markLastAssistantMessage();
      renderEvidence();
      flashCaseBoardTab();
    }
  }

  function markLastAssistantMessage() {
    const msgs = chatMessages.querySelectorAll(".msg.assistant");
    const last = msgs[msgs.length - 1];
    if (!last || last.querySelector(".msg-discovery-icon")) return;
    const icon = document.createElement("span");
    icon.className = "msg-discovery-icon";
    icon.title = t("toast.new_discovery");
    icon.textContent = "!";
    last.appendChild(icon);
    last.classList.add("msg-has-discovery");
    // Persist discovery index so icons survive re-renders and reloads
    if (activeNpcId) {
      const convLen = (conversations[activeNpcId] || []).length;
      const idx = convLen - 1;
      if (!discoveryMessageIndices[activeNpcId]) discoveryMessageIndices[activeNpcId] = [];
      if (!discoveryMessageIndices[activeNpcId].includes(idx)) {
        discoveryMessageIndices[activeNpcId].push(idx);
      }
    }
  }

  let unseenDiscoveryCount = 0;

  function flashCaseBoardTab() {
    unseenDiscoveryCount++;
    // Flash both the hub caseboard tab and the chat-nav caseboard tab
    const tabs = document.querySelectorAll('.manila-tab[data-hub-tab="caseboard"], #nav-to-caseboard');
    tabs.forEach(tab => {
      tab.classList.add("tab-flash");
      setTimeout(() => tab.classList.remove("tab-flash"), 4000);
      // Add or update badge
      let badge = tab.querySelector(".tab-badge");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "tab-badge";
        tab.appendChild(badge);
      }
      badge.textContent = unseenDiscoveryCount;
    });
  }

  function clearCaseBoardBadges() {
    unseenDiscoveryCount = 0;
    document.querySelectorAll('.manila-tab .tab-badge').forEach(b => b.remove());
    if (npcsWithNewDiscoveries.size > 0) {
      npcsWithNewDiscoveries.clear();
      renderNpcGrid();
    }
  }

  function showDiscoveryToast(text) {
    const container = document.getElementById("discovery-toast-container");
    const toast = document.createElement("div");
    toast.className = "discovery-toast";
    toast.innerHTML = `
      <div class="discovery-toast-icon">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>
      <div class="discovery-toast-body">
        <div class="discovery-toast-heading">${escapeHtml(t("toast.new_discovery"))}</div>
        <div class="discovery-toast-text">${escapeHtml(text)}</div>
      </div>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("hiding");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
    }, 4500);
  }

  /* ── NPC Discovery Badges ──────────────────────────────── */
  const npcsWithNewDiscoveries = new Set();

  function detectEvidence(evidenceIds, npcId) {
    const npcName = npcs.find(n => n.npc_id === npcId)?.display_name?.split(" — ")[0] || npcId;
    let found = false;

    for (const id of evidenceIds) {
      const meta = EVIDENCE_CATALOG[id];
      if (!meta) continue;

      if (!evidence.find(e => e.id === id)) {
        evidence.push({
          id: id,
          label: t("evidence." + id + "_label") || meta.label,
          text: t(npcId === PARTNER_NPC_ID ? "evidence.mentioned_by_partner" : "evidence.mentioned_by", { name: npcName }),
          textKey: npcId === PARTNER_NPC_ID ? "evidence.mentioned_by_partner" : "evidence.mentioned_by",
          source: npcId,
        });
        found = true;
      }
    }

    if (found) {
      renderEvidence();
    }
  }

  /* ── Render Evidence (Case Board) ────────────────────────── */
  /** Find collected discoveries linked to an evidence ID. */
  function getDiscoveriesForEvidence(evidenceId) {
    const results = [];
    for (const [npcId, discs] of Object.entries(discoveries)) {
      for (const d of discs) {
        if (d.evidenceId === evidenceId) {
          results.push({ ...d, npcId });
        }
      }
    }
    return results;
  }

  /** Render a single evidence item with its linked discoveries. */
  function renderEvidenceItem(e) {
    const div = document.createElement("div");
    div.className = "clue-item";
    // Re-translate at render time for current language
    const label = t("evidence." + e.id + "_label") || e.label;
    let text = e.text;
    if (e.textKey) {
      if (e.textKey === "evidence.mentioned_by" || e.textKey === "evidence.mentioned_by_partner") {
        const npcName = npcs.find(n => n.npc_id === e.source)?.display_name?.split(" — ")[0] || e.source;
        const key = e.source === PARTNER_NPC_ID ? "evidence.mentioned_by_partner" : "evidence.mentioned_by";
        text = t(key, { name: npcName }) || text;
      } else {
        text = t(e.textKey) || text;
      }
    }
    let html = `<div class="clue-label">${escapeHtml(label)}</div>
      <div class="clue-text">${escapeHtml(text)}</div>`;

    const linkedDisc = getDiscoveriesForEvidence(e.id);
    if (linkedDisc.length > 0) {
      html += `<div class="clue-discoveries">`;
      for (const d of linkedDisc) {
        // t() returns the key as-is when not found, so literal summaries pass through
        const displayText = t(d.text);
        html += `<div class="clue-discovery-item">${escapeHtml(displayText)}</div>`;
      }
      html += `</div>`;
    }
    if (e.id === "keycard-logs") {
      html += `<button class="clue-view-logs-btn" onclick="window.__openKeycardModal()">${t("keycard.view_logs")}</button>`;
    }
    div.innerHTML = html;
    return div;
  }

  function renderEvidence() {
    cbEvidenceList.innerHTML = "";
    cbEvidenceEmpty.style.display = evidence.length ? "none" : "block";

    if (caseReadyPromptShown && evidence.length > 0) {
      // Grouped view with section headers
      for (const [groupKey, ids] of Object.entries(EVIDENCE_GROUPS)) {
        const groupEvidence = evidence.filter(e => ids.includes(e.id));
        if (groupEvidence.length === 0) continue;
        const header = document.createElement("div");
        header.className = "evidence-group-header";
        header.textContent = t("evidence.group_" + groupKey);
        cbEvidenceList.appendChild(header);
        for (const e of groupEvidence) cbEvidenceList.appendChild(renderEvidenceItem(e));
      }
      // Accusation CTA
      const cta = document.createElement("button");
      cta.className = "evidence-accuse-cta";
      cta.textContent = t("endgame.accuse_cta");
      cta.addEventListener("click", openAccusationModal);
      cbEvidenceList.appendChild(cta);
    } else {
      for (const e of evidence) cbEvidenceList.appendChild(renderEvidenceItem(e));
    }
  }

  /* ── Auto-resize textarea ───────────────────────────────── */
  function autoResize() {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
  }

  /* ── Settings Modal ──────────────────────────────────────── */
  const settingsModal     = $("#settings-modal");
  const settingsCloseBtn  = $("#settings-close");
  const settingsRestartBtn   = $("#settings-restart-btn");
  const settingsRestartRow   = $("#settings-restart-row");
  const settingsRestartConfirm = $("#settings-restart-confirm");
  const settingsRestartCancel  = $("#settings-restart-cancel");
  const settingsRestartYes     = $("#settings-restart-yes");

  function openSettings() {
    settingsRestartRow.style.display = "";
    settingsRestartConfirm.style.display = "none";
    settingsModal.classList.add("visible");
  }

  function closeSettings() {
    settingsModal.classList.remove("visible");
  }

  hubSettingsTab.addEventListener("click", openSettings);
  settingsCloseBtn.addEventListener("click", closeSettings);
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) closeSettings();
  });

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
    clearState();
    briefingOpen = true;
    seedStartingEvidence();
    chatScreen.classList.remove("active");
    chatMessages.innerHTML = "";
    renderEvidence();
    renderNpcGrid();
    // Go to hub on Case Board tab with briefing expanded
    hubScreen.classList.add("active");
    document.querySelectorAll(".manila-tab[data-hub-tab]").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".hub-panel").forEach(p => p.classList.remove("active"));
    document.querySelector('.manila-tab[data-hub-tab="caseboard"]').classList.add("active");
    document.getElementById("hub-caseboard").classList.add("active");
    const briefingToggle = $("#cb-briefing-toggle");
    const briefingBody = $("#cb-briefing-body");
    briefingToggle.setAttribute("aria-expanded", "true");
    briefingBody.classList.add("open");
  });

  /* ── Feedback System ───────────────────────────────────── */
  const feedbackModal = $("#feedback-modal");
  const feedbackCloseBtn = $("#feedback-close");
  const feedbackText = $("#feedback-text");
  const feedbackFile = $("#feedback-file");
  const feedbackPreview = $("#feedback-preview");
  const feedbackPreviewImg = $("#feedback-preview-img");
  const feedbackPreviewRemove = $("#feedback-preview-remove");
  const feedbackSubmitBtn = $("#feedback-submit");
  const feedbackSuccess = $("#feedback-success");

  let feedbackScreenshotFile = null;

  function openFeedback() {
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

  function closeFeedback() {
    feedbackModal.classList.remove("visible");
  }

  $("#hub-feedback-tab").addEventListener("click", openFeedback);
  $("#chat-feedback-tab").addEventListener("click", openFeedback);
  feedbackCloseBtn.addEventListener("click", closeFeedback);
  feedbackModal.addEventListener("click", (e) => {
    if (e.target === feedbackModal) closeFeedback();
  });

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
          session_id: gameId,
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
    feedbackSubmitBtn.textContent = t("feedback.submit");

    setTimeout(closeFeedback, 1500);
  });

  /* ── Accusation System ──────────────────────────────────── */
  function openAccusationModal() {
    accusationTarget = null;
    confirmAccuse.disabled = true;
    suspectGrid.innerHTML = "";

    const suspects = npcs.filter(n => n.npc_id !== PARTNER_NPC_ID);
    for (const s of suspects) {
      const btn = document.createElement("div");
      btn.className = "suspect-option";
      const img = buildPortraitImg(s.npc_id, "neutral", 48);
      img.className = "suspect-portrait";
      btn.appendChild(img);
      btn.appendChild(document.createTextNode(s.display_name.split(" — ")[0]));
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

  function closeAccusationModal() {
    accusationModal.classList.remove("visible");
    accusationTarget = null;
  }

  function resolveAccusation() {
    if (!accusationTarget) return;
    const target = accusationTarget;
    closeAccusationModal();

    const correct = target === CULPRIT_ID;
    const accusedName = npcs.find(n => n.npc_id === target)?.display_name?.split(" — ")[0] || target;

    const interviewCount = Object.keys(conversations).filter(k => conversations[k].length > 0).length;

    if (correct) {
      const grade = gradeArrest();
      outcomeCard.className = "outcome-card " + grade.replace(/_/g, "-");
      trackEvent("arrest", {
        session_id: gameId,
        case_id: CASE.id,
        target_npc_id: target,
        correct: true,
        grade,
        evidence_count: evidence.length,
        interview_count: interviewCount,
      });
      outcomeTitle.textContent = t("outcome." + grade + "_title");
      outcomeText.innerHTML = t("outcome." + grade + "_text", {
        name: escapeHtml(accusedName),
        evidenceCount: evidence.length,
        interviewCount: interviewCount,
      });
    } else {
      outcomeCard.className = "outcome-card wrong";
      trackEvent("arrest", {
        session_id: gameId,
        case_id: CASE.id,
        target_npc_id: target,
        correct: false,
        grade: "wrong",
        evidence_count: evidence.length,
        interview_count: interviewCount,
      });
      outcomeTitle.textContent = t("outcome.wrong_title");
      outcomeText.innerHTML = t("outcome.wrong_text", { name: escapeHtml(accusedName) });
    }
    outcomeScreen.classList.add("visible");
  }

  /* ── Event Listeners ────────────────────────────────────── */
  // Intro screen removed — game starts on Case Board directly

  // Case board briefing toggle (persists state)
  $("#cb-briefing-toggle").addEventListener("click", () => {
    const toggle = $("#cb-briefing-toggle");
    const body = $("#cb-briefing-body");
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    body.classList.toggle("open");
    briefingOpen = !expanded;
    saveState();
  });

  /* ── Cancel button: show/hide + abort logic ──────────── */
  function showCancelBtn() {
    chatInputBar.classList.add("cancellable");
  }
  function hideCancelBtn() {
    chatInputBar.classList.remove("cancellable");
  }
  function cancelResponse() {
    // Abort in-flight chat request
    if (chatAbortController) { chatAbortController.abort(); chatAbortController = null; }
    // Abort in-flight TTS request
    if (ttsAbortController) { ttsAbortController.abort(); ttsAbortController = null; }
    // Stop any playing audio
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    // Reset UI state
    typingIndicator.classList.remove("visible");
    portraitStatus.textContent = "";
    sending = false;
    sendBtn.disabled = !chatInput.value.trim();
    hideCancelBtn();
    // Exit voice-mode waiting state (don't auto-restart recording)
    if (voiceMode) {
      micBtn.classList.remove("waiting");
      exitVoiceMode();
    }
  }
  cancelBtn.addEventListener("click", cancelResponse);

  function leaveChat() {
    cancelResponse();
    if (voiceMode) exitVoiceMode();
    activeNpcId = null;
    saveState();
  }

  function showChatFromNotes() {
    chatNotesPanel.style.display = "none";
    chatLayout.style.display = "";
  }

  navToSuspects.addEventListener("click", () => {
    showChatFromNotes();
    leaveChat();
    showHub();
    // Activate suspects tab
    document.querySelectorAll(".manila-tab[data-hub-tab]").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".hub-panel").forEach(p => p.classList.remove("active"));
    document.querySelector('.manila-tab[data-hub-tab="suspects"]').classList.add("active");
    document.getElementById("hub-suspects").classList.add("active");
  });
  navToCaseboard.addEventListener("click", () => {
    showChatFromNotes();
    leaveChat();
    showHub();
    // Activate caseboard tab
    document.querySelectorAll(".manila-tab[data-hub-tab]").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".hub-panel").forEach(p => p.classList.remove("active"));
    document.querySelector('.manila-tab[data-hub-tab="caseboard"]').classList.add("active");
    document.getElementById("hub-caseboard").classList.add("active");
    clearCaseBoardBadges();
  });
  navToNotes.addEventListener("click", () => {
    // Show notes panel, hide chat layout
    chatLayout.style.display = "none";
    chatNotesPanel.style.display = "";
    // Sync textarea value from playerNotes
    chatNotesTextarea.value = playerNotes;
  });

  // Hub manila folder tabs (only tabs with data-hub-tab attribute)
  document.querySelectorAll(".manila-tab[data-hub-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".manila-tab[data-hub-tab]").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".hub-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      const panelId = `hub-${tab.dataset.hubTab}`;
      document.getElementById(panelId).classList.add("active");
      if (tab.dataset.hubTab === "caseboard") clearCaseBoardBadges();
    });
  });

  // Notes textarea — auto-save on input
  const notesTextarea = document.getElementById("player-notes");
  if (notesTextarea) {
    notesTextarea.value = playerNotes;
    notesTextarea.addEventListener("input", () => {
      playerNotes = notesTextarea.value;
      if (chatNotesTextarea) chatNotesTextarea.value = playerNotes;
      saveState();
    });
  }
  if (chatNotesTextarea) {
    chatNotesTextarea.value = playerNotes;
    chatNotesTextarea.addEventListener("input", () => {
      playerNotes = chatNotesTextarea.value;
      if (notesTextarea) notesTextarea.value = playerNotes;
      saveState();
    });
  }

  // Chat settings tab
  $("#chat-settings-tab").addEventListener("click", openSettings);

  /* ── Portrait Info Button (bio tooltip) ──────────────── */
  const portraitInfoBtn = $("#portrait-info-btn");
  const bioTooltipEl = $("#portrait-bio-tooltip");
  const portraitFrameEl = document.querySelector(".portrait-frame");

  function showBioTooltip() {
    if (!activeNpcId) return;
    const bioKey = `dossier.${activeNpcId}.bio`;
    const bioText = t(bioKey);
    bioTooltipEl.textContent = bioText !== bioKey ? bioText : "";
    bioTooltipEl.classList.add("visible");
  }
  function hideBioTooltip() {
    bioTooltipEl.classList.remove("visible");
  }

  // Desktop: hover to show
  portraitInfoBtn.addEventListener("mouseenter", showBioTooltip);
  portraitFrameEl.addEventListener("mouseleave", hideBioTooltip);
  // Mobile: tap to toggle
  portraitInfoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (bioTooltipEl.classList.contains("visible")) {
      hideBioTooltip();
    } else {
      showBioTooltip();
    }
  });
  // Tap tooltip to dismiss
  bioTooltipEl.addEventListener("click", hideBioTooltip);

  chatInput.addEventListener("input", () => {
    autoResize();
    sendBtn.disabled = !chatInput.value.trim() || sending;
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener("click", () => sendMessage());

  // Partner hint button — sends detailed prompt but shows a casual message in chat
  document.getElementById("lila-hint-btn").addEventListener("click", () => {
    if (sending || activeNpcId !== PARTNER_NPC_ID) return;
    const displayKey = CASE.hintDisplayKeys[Math.floor(Math.random() * CASE.hintDisplayKeys.length)];
    sendMessage(t("chat.hint_prompt"), t(displayKey));
  });

  cancelAccuse.addEventListener("click", closeAccusationModal);
  confirmAccuse.addEventListener("click", resolveAccusation);

  restartBtn.addEventListener("click", async () => {
    restartBtn.disabled = true;
    await clearState();
    briefingOpen = true;
    outcomeScreen.classList.remove("visible");
    chatScreen.classList.remove("active");
    hubScreen.classList.remove("active");
    chatMessages.innerHTML = "";
    await init();
    restartBtn.disabled = false;
  });

  // Close modal on backdrop click
  accusationModal.addEventListener("click", (e) => {
    if (e.target === accusationModal) closeAccusationModal();
  });

  /* ── Case-Ready Modal (endgame trigger) ──────────────────── */
  const caseReadyModal = $("#case-ready-modal");
  $("#case-ready-review").addEventListener("click", () => {
    caseReadyModal.classList.remove("visible");
    showHub();
    // Switch to caseboard tab
    document.querySelectorAll(".manila-tab[data-hub-tab]").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".hub-panel").forEach(p => p.classList.remove("active"));
    const cbTab = document.querySelector('.manila-tab[data-hub-tab="caseboard"]');
    if (cbTab) cbTab.classList.add("active");
    const cbPanel = document.getElementById("hub-caseboard");
    if (cbPanel) cbPanel.classList.add("active");
  });
  $("#case-ready-accuse").addEventListener("click", () => {
    caseReadyModal.classList.remove("visible");
    openAccusationModal();
  });
  $("#case-ready-continue").addEventListener("click", () => {
    caseReadyModal.classList.remove("visible");
  });
  caseReadyModal.addEventListener("click", (e) => {
    if (e.target === caseReadyModal) caseReadyModal.classList.remove("visible");
  });

  /* ── Keycard Logs Terminal Modal ────────────────────────── */
  let keycardLogsCache = null;
  const keycardModal = document.getElementById("keycard-modal");
  const keycardBody  = document.getElementById("keycard-terminal-body");

  function fmtTime(ts) {
    return ts.substring(11, 19);
  }

  function padEnd(s, len) {
    return s.length >= len ? s : s + " ".repeat(len - s.length);
  }

  function renderKeycardLogs(logs) {
    let html = `<div class="kc-header">
      <span>${t("keycard.col_time")}</span><span>${t("keycard.col_zone")}</span><span>${t("keycard.col_card")}</span><span>${t("keycard.col_holder")}</span><span>${t("keycard.col_dir")}</span><span>${t("keycard.col_status")}</span>
    </div>`;
    for (const l of logs) {
      if (l.card_id === "SYSTEM") {
        const isOff = l.access === "system_offline";
        const icon = isOff ? "⚠" : "✓";
        const cls = isOff ? "offline" : "restored";
        const sysText = isOff ? t("keycard.system_offline") : t("keycard.system_restored");
        html += `<div class="kc-system ${cls}">
          <span class="kc-system-icon">${icon}</span>
          <span class="kc-system-time">${fmtTime(l.timestamp)}</span>  ${sysText}
        </div>`;
      } else {
        const dirCls = l.direction === "entry" ? "entry" : "exit";
        const dirLabel = l.direction === "entry" ? t("keycard.entry") : t("keycard.exit");
        const statusLabel = t("keycard.granted");
        const zoneLabel = t("keycard.zone." + l.zone) || l.zone;
        html += `<div class="kc-row">
          <span class="kc-time">${fmtTime(l.timestamp)}</span>
          <span class="kc-zone">${zoneLabel}</span>
          <span class="kc-card">${l.card_id}</span>
          <span class="kc-holder">${l.card_holder}</span>
          <span class="kc-dir ${dirCls}">${dirLabel}</span>
          <span class="kc-access">${statusLabel}</span>
        </div>`;
      }
    }
    keycardBody.innerHTML = html;
  }

  window.__openKeycardModal = async function() {
    keycardModal.classList.add("visible");
    // Re-translate terminal header for current language
    document.querySelector(".keycard-terminal-title").textContent = t("keycard.title");
    document.querySelector(".keycard-terminal-info").textContent = t("keycard.subtitle");
    if (keycardLogsCache) {
      renderKeycardLogs(keycardLogsCache);
      return;
    }
    keycardBody.innerHTML = '<div style="padding:2rem;text-align:center;color:rgba(120,220,100,0.4);font-family:var(--font-mono);font-size:0.75rem;">' + t("keycard.loading") + '</div>';
    try {
      const resp = await fetch(CASE.keycardLogsPath);
      keycardLogsCache = await resp.json();
      renderKeycardLogs(keycardLogsCache);
    } catch (err) {
      keycardBody.innerHTML = '<div style="padding:2rem;text-align:center;color:rgba(220,60,40,0.8);font-family:var(--font-mono);font-size:0.75rem;">' + t("keycard.error") + '</div>';
    }
  };

  function closeKeycardModal() {
    keycardModal.classList.remove("visible");
  }

  document.getElementById("keycard-modal-close").addEventListener("click", closeKeycardModal);
  keycardModal.addEventListener("click", (e) => {
    if (e.target === keycardModal) closeKeycardModal();
  });

  /* ── Voice: Audio Toggle ────────────────────────────────── */
  function updateAudioToggle() {
    audioToggle.classList.toggle("active", audioEnabled);
    audioToggle.title = audioEnabled ? t("voice.audio_on") : t("voice.audio_off");
  }

  audioToggle.addEventListener("click", () => {
    audioEnabled = !audioEnabled;
    localStorage.setItem("echoes_audio", audioEnabled);
    updateAudioToggle();
    if (!audioEnabled && currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
  });

  /* ── Voice: TTS Playback ───────────────────────────────── */
  async function speakText(text, npcId, cacheKey) {
    /* Stop any in-flight TTS fetch or playing audio first */
    if (ttsAbortController) { ttsAbortController.abort(); ttsAbortController = null; }
    if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; }

    if (audioCache.has(cacheKey)) {
      playAudioBlob(audioCache.get(cacheKey), cacheKey);
      return;
    }

    const voice = npcVoices[npcId] || "alloy";
    const instructions = npcVoiceInstructions[npcId] || "";
    ttsAbortController = new AbortController();
    showCancelBtn();
    try {
      const res = await fetch(`${API_BASE}/api/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, instructions }),
        signal: ttsAbortController.signal,
      });
      if (!res.ok) throw new Error(`TTS failed: HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      audioCache.set(cacheKey, blobUrl);
      ttsAbortController = null;
      playAudioBlob(blobUrl, cacheKey);
    } catch (err) {
      ttsAbortController = null;
      if (err.name !== "AbortError") console.error("TTS error:", err);
      if (!sending && !currentAudio) hideCancelBtn();
    }
  }

  function playAudioBlob(blobUrl, cacheKey) {
    if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }

    const audio = new Audio(blobUrl);
    currentAudio = audio;
    showCancelBtn();

    const replayBtn = document.querySelector(`.msg-audio-btn[data-cache-key="${cacheKey}"]`);
    if (replayBtn) replayBtn.classList.add("playing");
    if (activeNpcId) portraitStatus.textContent = t("voice.status_speaking");

    audio.onended = () => {
      currentAudio = null;
      if (replayBtn) replayBtn.classList.remove("playing");
      if (activeNpcId) portraitStatus.textContent = "";
      if (!sending) hideCancelBtn();
      if (voiceMode && !sending) {
        setTimeout(() => { if (voiceMode) startRecording(); }, 400);
      }
    };
    audio.onerror = () => {
      currentAudio = null;
      if (replayBtn) replayBtn.classList.remove("playing");
      if (activeNpcId) portraitStatus.textContent = "";
      if (!sending) hideCancelBtn();
      if (voiceMode && !sending) {
        setTimeout(() => { if (voiceMode) startRecording(); }, 400);
      }
    };
    audio.play().catch(console.error);
  }

  /* ── Voice: Microphone Recording with Silence Detection ── */
  const SILENCE_THRESHOLD = 0.01;
  const SILENCE_DURATION  = 1500;

  async function startRecording() {
    if (isRecording || isTranscribing || sending) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus" : "audio/webm",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stopSilenceDetection();
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        if (blob.size < 100) {
          if (voiceMode) setTimeout(() => { if (voiceMode) startRecording(); }, 300);
          return;
        }
        await transcribeAudio(blob);
      };

      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 2048;
      source.connect(analyserNode);

      let silentSince = null;
      let hasSpoken = false;
      const dataArray = new Float32Array(analyserNode.fftSize);

      function checkSilence() {
        if (!isRecording) return;
        analyserNode.getFloatTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
        const rms = Math.sqrt(sum / dataArray.length);

        if (rms > SILENCE_THRESHOLD) {
          hasSpoken = true;
          silentSince = null;
        } else if (hasSpoken) {
          if (!silentSince) silentSince = Date.now();
          else if (Date.now() - silentSince > SILENCE_DURATION) {
            stopRecording();
            return;
          }
        }
        silenceCheckRAF = requestAnimationFrame(checkSilence);
      }

      mediaRecorder.start();
      isRecording = true;
      micBtn.classList.remove("processing", "waiting");
      micBtn.classList.add("recording");
      micBtn.title = t("voice.mic_recording");
      if (voiceMode) portraitStatus.textContent = t("voice.listening");

      silenceCheckRAF = requestAnimationFrame(checkSilence);
    } catch (err) {
      if (err.name === "NotAllowedError") {
        alert(t("voice.mic_denied"));
        exitVoiceMode();
      } else {
        alert(t("voice.mic_error", { message: err.message }));
        exitVoiceMode();
      }
    }
  }

  function stopSilenceDetection() {
    if (silenceCheckRAF) { cancelAnimationFrame(silenceCheckRAF); silenceCheckRAF = null; }
    if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; }
    analyserNode = null;
  }

  function stopRecording() {
    stopSilenceDetection();
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    isRecording = false;
    micBtn.classList.remove("recording");
    if (!voiceMode) micBtn.title = t("voice.mic_title");
  }

  /* ── Voice Mode Toggle ─────────────────────────────────── */
  function enterVoiceMode() {
    voiceMode = true;
    audioEnabled = true;
    localStorage.setItem("echoes_audio", "true");
    updateAudioToggle();
    micBtn.classList.add("voice-mode");
    micBtn.title = t("voice.mode_active");
    startRecording();
  }

  function exitVoiceMode() {
    voiceMode = false;
    if (isRecording) stopRecording();
    micBtn.classList.remove("voice-mode", "recording", "processing", "waiting");
    micBtn.title = t("voice.mic_title");
    if (activeNpcId && !sending) portraitStatus.textContent = "";
  }

  micBtn.addEventListener("click", () => {
    if (isTranscribing || sending) return;
    if (voiceMode) {
      exitVoiceMode();
    } else if (isRecording) {
      stopRecording();
    } else {
      enterVoiceMode();
    }
  });

  /* ── Voice: Transcription ──────────────────────────────── */
  async function transcribeAudio(blob) {
    isTranscribing = true;
    micBtn.classList.remove("recording");
    micBtn.classList.add("processing");
    micBtn.title = t("voice.mic_processing");
    if (voiceMode) portraitStatus.textContent = t("voice.mic_processing");

    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      formData.append("language", window.currentLang || "en");

      const res = await fetch(`${API_BASE}/api/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Transcription error" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.text && data.text.trim()) {
        if (voiceMode) {
          micBtn.classList.remove("processing");
          micBtn.classList.add("waiting");
          await sendMessage(data.text.trim());
        } else {
          chatInput.value = data.text.trim();
          autoResize();
          sendBtn.disabled = false;
          chatInput.focus();
        }
      } else if (voiceMode) {
        setTimeout(() => { if (voiceMode) startRecording(); }, 300);
      }
    } catch (err) {
      const errDiv = document.createElement("div");
      errDiv.style.cssText = "text-align:center; color:var(--danger); font-size:0.82rem; padding:0.5rem;";
      errDiv.textContent = t("voice.mic_error", { message: err.message });
      chatMessages.appendChild(errDiv);
      scrollToBottom();
      if (voiceMode) setTimeout(() => { if (voiceMode) startRecording(); }, 1000);
    } finally {
      isTranscribing = false;
      micBtn.classList.remove("processing");
      if (!voiceMode) micBtn.title = t("voice.mic_title");
    }
  }

  // Hide mic if browser doesn't support it
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    micBtn.style.display = "none";
  }

  /* ── Language Toggle ────────────────────────────────────── */
  function initLanguage() {
    const saved = localStorage.getItem("echoes_lang") || "en";
    window.currentLang = saved;
    applyLanguage(saved);
  }

  function switchLanguage(lang) {
    applyLanguage(lang);
    renderNpcGrid();
    renderEvidence();
    if (activeNpcId) {
      renderMessages();
      // Update programmatically-set NPC role text in chat screen
      portraitRole.textContent = npcRole(activeNpcId);
      // topbar has nav buttons now, no role text to update
      portraitStatus.textContent = sending ? t("chat.status_responding") : "";
    }
  }

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => switchLanguage(btn.dataset.lang));
  });

  /* ── Tutorial Coach Marks System ─────────────────────────── */
  const TUTORIAL_STORAGE_KEY = "echoes_tutorial_done";
  const tutorialOverlay  = $("#tutorial-overlay");
  const tutorialBackdrop = $("#tutorial-backdrop");
  const tutorialTooltip  = $("#tutorial-tooltip");
  const tutorialText     = $("#tutorial-text");
  const tutorialStepInd  = $("#tutorial-step-indicator");
  const tutorialSkipBtn  = $("#tutorial-skip");
  const tutorialNextBtn  = $("#tutorial-next");

  // Hub-phase steps (shown on first load)
  const HUB_STEPS = [
    { selector: '.manila-tab[data-hub-tab="caseboard"]', text: "tutorial.step_caseboard", arrow: "top" },
    { selector: '#cb-briefing-toggle', text: "tutorial.step_briefing", arrow: "top" },
    { selector: '.manila-tab[data-hub-tab="suspects"]', text: "tutorial.step_suspects", arrow: "top", clickToAdvance: true },
    { selector: `.npc-card[data-npc-id="${PARTNER_NPC_ID}"]`, text: "tutorial.step_partner", arrow: "top", beforeShow() {
      // Ensure suspects tab is active (user just clicked it in the previous step)
      document.querySelectorAll(".manila-tab[data-hub-tab]").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".hub-panel").forEach(p => p.classList.remove("active"));
      document.querySelector('.manila-tab[data-hub-tab="suspects"]').classList.add("active");
      document.getElementById("hub-suspects").classList.add("active");
    }},
    { selector: `.npc-card:not([data-npc-id="${PARTNER_NPC_ID}"])`, text: "tutorial.step_npc_card", arrow: "top" },
  ];

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
  const LILA_HINT_STORAGE_KEY = "echoes_lila_hint_seen";
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

  function isTutorialDone() {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true";
  }
  function markTutorialDone() {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
  }

  function startTutorial(phase) {
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

  function endTutorial() {
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

  function skipTutorial() {
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
        // Resume from the Lila step (index 3) when user clicks suspects tab
        const resumeFromLila = () => {
          tutorialPhase = "hub";
          tutorialSteps = HUB_STEPS;
          tutorialCurrentStep = 3; // Lila partner step
          showTutorialStep(3);
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
    closeSettings();
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    localStorage.removeItem(LILA_HINT_STORAGE_KEY);
    chatTutorialPending = true; // ensure chat-phase tutorial fires after hub replay
    // Navigate to hub/caseboard first
    if (chatScreen.classList.contains("active")) {
      leaveChat();
      showHub();
    }
    document.querySelectorAll(".manila-tab[data-hub-tab]").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".hub-panel").forEach(p => p.classList.remove("active"));
    document.querySelector('.manila-tab[data-hub-tab="caseboard"]').classList.add("active");
    document.getElementById("hub-caseboard").classList.add("active");
    setTimeout(() => startTutorial("hub"), 400);
  });

  // Flag for chat-phase tutorial (set during boot, consumed in selectNpc)
  let chatTutorialPending = false;

  /* ── Boot ───────────────────────────────────────────────── */
  initLanguage();
  updateAudioToggle();
  initAuthUI();

  // Check Supabase availability and restore auth session
  // Store promise so init() can await it before first render
  _cloudMergePromise = checkSupabaseStatus().then(async configured => {
    if (!configured) {
      const accountRow = document.getElementById("settings-account-row");
      if (accountRow) accountRow.style.display = "none";
      return;
    }
    const restored = await restoreAuthSession();
    if (restored) {
      console.log("[auth] Session restored for", authUser.email);
      await mergeCloudState();
    }
  });

  // Flush cloud save when tab becomes hidden — use keepalive fetch for reliability
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && authUser?.access_token && cloudSavePending) {
      try {
        const stateObj = buildStateObject();
        fetch(`${API_BASE}/api/state/save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authUser.access_token}`,
          },
          body: JSON.stringify({ state: stateObj }),
          keepalive: true, // survives page hide
        }).then(() => { cloudSavePending = false; }).catch(() => {});
      } catch {}
    }
  });
  // beforeunload: use sendBeacon as last resort (guaranteed to be queued)
  window.addEventListener("beforeunload", () => {
    if (authUser && cloudSavePending) {
      cloudSaveBeacon();
    }
  });

  // Shared: enter the game (dismiss title card or auth prompt, show hub)
  function enterGame() {
    titleCard.classList.add("dismissed");
    localStorage.setItem(TITLE_STORAGE_KEY, "1");
    document.getElementById("auth-prompt").classList.add("hidden");
    setTimeout(() => {
      titleCard.classList.add("hidden");
      showHubOnCaseboard();
      if (!isTutorialDone()) {
        chatTutorialPending = true;
        setTimeout(() => startTutorial("hub"), 500);
      }
    }, 500);
  }

  // Title card "Open Case File" button
  titleCardBtn.addEventListener("click", () => {
    // If Supabase configured and user not logged in, show auth prompt
    if (supabaseConfigured && !authUser) {
      titleCard.classList.add("dismissed");
      localStorage.setItem(TITLE_STORAGE_KEY, "1");
      setTimeout(() => {
        titleCard.classList.add("hidden");
        document.getElementById("auth-prompt").classList.remove("hidden");
      }, 500);
      return;
    }
    // Already logged in or no Supabase — go straight to game
    enterGame();
  });

  // Auth prompt buttons
  document.getElementById("auth-prompt-skip").addEventListener("click", () => {
    document.getElementById("auth-prompt").classList.add("hidden");
    showHubOnCaseboard();
    if (!isTutorialDone()) {
      chatTutorialPending = true;
      setTimeout(() => startTutorial("hub"), 500);
    }
  });

  function authPromptFlow(tab) {
    const tabBtns = document.querySelectorAll("[data-auth-tab]");
    tabBtns.forEach(b => b.classList.toggle("active", b.dataset.authTab === tab));
    const submitBtn = document.getElementById("auth-submit");
    if (submitBtn) submitBtn.textContent = tab === "signup" ? t("auth.signup") : t("auth.signin");
    window.__authFromTitleCard = true;
    openAuthModal();
  }
  document.getElementById("auth-prompt-signin").addEventListener("click", () => authPromptFlow("login"));
  document.getElementById("auth-prompt-signup").addEventListener("click", () => authPromptFlow("signup"));

  init().then(() => {
    // Start tutorial on first visit (no existing conversations = new player)
    // Only if title card was already seen (returning player who hasn't done tutorial)
    const hasConversations = Object.keys(conversations).length > 0;
    const titleSeen = localStorage.getItem(TITLE_STORAGE_KEY);
    if (titleSeen && !isTutorialDone() && !hasConversations) {
      chatTutorialPending = true; // will fire when NPC selected
      setTimeout(() => startTutorial("hub"), 600);
    }
  });
})();
