/**
 * Auth & Cloud Save Module
 * Extracted from main.js — handles authentication, token management,
 * and cloud state persistence via Supabase.
 * @module auth
 */
import { initApiClient, apiFetch, apiPost, API_BASE } from "./api.js";
import { addModalCloseOnClickOutside, t } from "./utils.js";

const AUTH_STORAGE_KEY = "echoes_auth";
const SUPABASE_URL = "https://hnfrnqizlahwxlootoho.supabase.co";

// Auth state
let authUser = null;          // { user_id, email, access_token, refresh_token }
let cloudSaveTimer = null;
let cloudSavePending = false;
let _cloudMergePromise = null; // set during boot so init() can await it
let supabaseConfigured = false;

// Retry state
let cloudSaveRetries = 0;
const MAX_CLOUD_RETRIES = 3;

// Callbacks from main.js — set via initAuth()
let _callbacks = {};

// ── Public getters / setters ──────────────────────────────────
export function getAuthUser() { return authUser; }
export function isSupabaseConfigured() { return supabaseConfigured; }
export function isCloudSavePending() { return cloudSavePending; }
export function getCloudMergePromise() { return _cloudMergePromise; }
export function setCloudMergePromise(p) { _cloudMergePromise = p; }

// ── Init: wire up API client and store callbacks ─────────────
export function initAuth(callbacks) {
  _callbacks = callbacks;
  initApiClient(() => authUser);
}

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
    await apiFetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
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
export async function cloudSaveState(stateObj) {
  if (!authUser?.access_token) return;
  let res = await apiPost(`${API_BASE}/api/state/save`, { state: stateObj });
  // Retry once with refreshed token on 401
  if (res.status === 401 && await tryRefreshAccessToken()) {
    res = await apiPost(`${API_BASE}/api/state/save`, { state: stateObj });
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Save failed: HTTP ${res.status}`);
  }
  return await res.json();
}

async function cloudLoadState() {
  if (!authUser?.access_token) return null;
  let res = await apiFetch(`${API_BASE}/api/state/load`);
  // Retry once with refreshed token on 401
  if (res.status === 401 && await tryRefreshAccessToken()) {
    res = await apiFetch(`${API_BASE}/api/state/load`);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Load failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function cloudDeleteState() {
  if (!authUser?.access_token) return;
  let res = await apiFetch(`${API_BASE}/api/state/delete`, {
    method: "DELETE",
  });
  // Retry once with refreshed token on 401
  if (res.status === 401 && await tryRefreshAccessToken()) {
    await apiFetch(`${API_BASE}/api/state/delete`, {
      method: "DELETE",
    });
  }
}

/** Fire-and-forget cloud save using sendBeacon (survives page close). */
export function cloudSaveBeacon() {
  if (!authUser?.access_token || !cloudSavePending) return;
  try {
    const payload = JSON.stringify({ state: _callbacks.buildStateObject() });
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
export async function checkSupabaseStatus() {
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
export function scheduleCloudSave() {
  if (!authUser) return;
  cloudSavePending = true;
  cloudSaveRetries = 0; // fresh user action resets retry count
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => flushCloudSave(), 3000);
}

export async function flushCloudSave() {
  if (!authUser || !cloudSavePending) return;
  const indicator = document.getElementById("cloud-save-indicator");
  try {
    if (indicator) {
      indicator.textContent = t("cloud.saving");
      indicator.className = "cloud-save-indicator saving";
    }
    const stateObj = _callbacks.buildStateObject();
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
export async function restoreAuthSession() {
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
export function updateAuthUI() {
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

export function openAuthModal() {
  document.getElementById("auth-error").textContent = "";
  document.getElementById("auth-info").textContent = "";
  document.getElementById("auth-modal").classList.add("visible");
  updateAuthUI();
}

export function closeAuthModal() {
  document.getElementById("auth-modal").classList.remove("visible");
  window.__authFromTitleCard = false;
}

// ── Wire up auth UI events (called once at boot) ──────────────
export function initAuthUI() {
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
      _callbacks.renderNpcGrid();
      _callbacks.renderEvidence();

      // If login came from auth prompt, close modal and enter the game
      if (window.__authFromTitleCard) {
        window.__authFromTitleCard = false;
        closeAuthModal();
        const authPrompt = document.getElementById("auth-prompt");
        authPrompt.classList.add("hidden");
        _callbacks.showHubOnCaseboard();
        if (!_callbacks.isTutorialDone()) {
          _callbacks.setChatTutorialPending(true);
          setTimeout(() => _callbacks.startTutorial("hub"), 500);
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
    _callbacks.resetLocalState();
    updateAuthUI();
    closeAuthModal();
    // Return to title card
    _callbacks.removeNpcTab();
    _callbacks.getHubScreen().classList.remove("active");
    _callbacks.getTitleCard().classList.remove("dismissed", "hidden");
  });

  // Close
  closeBtn.addEventListener("click", closeAuthModal);
  addModalCloseOnClickOutside(modal, closeAuthModal);

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
      if (_callbacks.getActiveNpcId()) {
        _callbacks.leaveChat();
        _callbacks.removeNpcTab();
      }
      await authLogout();
      authUser = null;
      clearAuthTokens();
      _callbacks.resetLocalState();
      updateAuthUI();
      // Close settings
      const settingsModal = document.getElementById("settings-modal");
      if (settingsModal) settingsModal.classList.remove("visible");
      // Return to title card
      _callbacks.getHubScreen().classList.remove("active");
      _callbacks.getTitleCard().classList.remove("dismissed", "hidden");
    });
  }
}

// ── Merge cloud state with local state ────────────────────────
export async function mergeCloudState() {
  if (!authUser) return;
  try {
    const cloudData = await cloudLoadState();
    if (!cloudData || !cloudData.state) {
      // No cloud save — push local state up (first login / new account)
      await cloudSaveState(_callbacks.buildStateObject());
      return;
    }

    const cloudState = cloudData.state;
    const cloudRichness = _callbacks.stateRichness(cloudState);

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
      _callbacks.applyStateObject(cloudState);
      _callbacks.saveState(); // persist to localStorage so local matches cloud
      return;
    }

    // Both sides have real user data — compare using persisted timestamps
    const cloudTime = cloudData.updated_at ? new Date(cloudData.updated_at).getTime() : 0;
    const localTime = persistedLocal?.savedAt ? new Date(persistedLocal.savedAt).getTime() : 0;
    const localRichness = _callbacks.stateRichness(persistedLocal);

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
      _callbacks.applyStateObject(cloudState);
      _callbacks.saveState(); // persist to localStorage so local matches cloud
    } else {
      console.log("[cloud-merge] Keeping local state (local=%d, cloud=%d items)",
                  localRichness, cloudRichness);
      await cloudSaveState(_callbacks.buildStateObject());
    }
  } catch (err) {
    console.error("[cloud-load] Failed to merge cloud state:", err);
  }
}
