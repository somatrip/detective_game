/* ================================================================
   Voice I/O Module — TTS, mic recording, voice mode, transcription
   ================================================================ */

const API_BASE = window.location.origin;
const t = (...args) => window.t(...args);

/* ── Voice State ─────────────────────────────────── */
let audioEnabled = localStorage.getItem("echoes_audio") !== "false";
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let isTranscribing = false;
const AUDIO_CACHE_MAX = 30;
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

/* ── Callbacks (set by initVoice) ──────────────────── */
let _cb = {};

/* ── Public Accessors ──────────────────────────────── */
export function isAudioEnabled() { return audioEnabled; }
export function setAudioEnabled(val) {
  audioEnabled = val;
  localStorage.setItem("echoes_audio", audioEnabled);
}
export function isVoiceMode() { return voiceMode; }
export function getIsRecording() { return isRecording; }
export function getIsTranscribing() { return isTranscribing; }
export function getChatAbortController() { return chatAbortController; }
export function setChatAbortController(ctrl) { chatAbortController = ctrl; }

export function setNpcVoice(npcId, voice, instructions) {
  if (voice) npcVoices[npcId] = voice;
  if (instructions) npcVoiceInstructions[npcId] = instructions;
}

export function clearAudioCache() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  for (const url of audioCache.values()) URL.revokeObjectURL(url);
  audioCache.clear();
}

/* ── Voice: Audio Toggle ────────────────────────────── */
export function updateAudioToggle() {
  const audioToggle = document.querySelector("#audio-toggle");
  if (!audioToggle) return;
  audioToggle.classList.toggle("active", audioEnabled);
  audioToggle.title = audioEnabled ? t("voice.audio_on") : t("voice.audio_off");
}

/* ── Voice: Stop Audio ──────────────────────────────── */
export function stopAudio() {
  if (ttsAbortController) { ttsAbortController.abort(); ttsAbortController = null; }
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
}

/* ── Voice: TTS Playback ───────────────────────────── */
export async function speakText(text, npcId, cacheKey) {
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
  _cb.showCancelBtn();
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
    // LRU eviction: revoke oldest blob URL when cache exceeds limit
    if (audioCache.size >= AUDIO_CACHE_MAX) {
      const oldest = audioCache.keys().next().value;
      URL.revokeObjectURL(audioCache.get(oldest));
      audioCache.delete(oldest);
    }
    audioCache.set(cacheKey, blobUrl);
    ttsAbortController = null;
    playAudioBlob(blobUrl, cacheKey);
  } catch (err) {
    ttsAbortController = null;
    if (err.name !== "AbortError") console.error("TTS error:", err);
    if (!_cb.getSending() && !currentAudio) _cb.hideCancelBtn();
  }
}

function playAudioBlob(blobUrl, cacheKey) {
  if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }

  const audio = new Audio(blobUrl);
  currentAudio = audio;
  _cb.showCancelBtn();

  const replayBtn = document.querySelector(`.msg-audio-btn[data-cache-key="${cacheKey}"]`);
  if (replayBtn) replayBtn.classList.add("playing");
  const portraitStatus = document.querySelector("#portrait-status");
  if (_cb.getActiveNpcId()) portraitStatus.textContent = t("voice.status_speaking");

  audio.onended = () => {
    currentAudio = null;
    if (replayBtn) replayBtn.classList.remove("playing");
    if (_cb.getActiveNpcId()) portraitStatus.textContent = "";
    if (!_cb.getSending()) _cb.hideCancelBtn();
    if (voiceMode && !_cb.getSending()) {
      setTimeout(() => { if (voiceMode) startRecording(); }, 400);
    }
  };
  audio.onerror = () => {
    currentAudio = null;
    if (replayBtn) replayBtn.classList.remove("playing");
    if (_cb.getActiveNpcId()) portraitStatus.textContent = "";
    if (!_cb.getSending()) _cb.hideCancelBtn();
    if (voiceMode && !_cb.getSending()) {
      setTimeout(() => { if (voiceMode) startRecording(); }, 400);
    }
  };
  audio.play().catch(console.error);
}

/* ── Voice: Microphone Recording with Silence Detection ── */
const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION  = 1500;

export async function startRecording() {
  const micBtn = document.querySelector("#mic-btn");
  const portraitStatus = document.querySelector("#portrait-status");
  if (isRecording || isTranscribing || _cb.getSending()) return;
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

export function stopRecording() {
  const micBtn = document.querySelector("#mic-btn");
  stopSilenceDetection();
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  isRecording = false;
  micBtn.classList.remove("recording");
  if (!voiceMode) micBtn.title = t("voice.mic_title");
}

/* ── Voice Mode Toggle ─────────────────────────────── */
export function enterVoiceMode() {
  const micBtn = document.querySelector("#mic-btn");
  voiceMode = true;
  audioEnabled = true;
  localStorage.setItem("echoes_audio", "true");
  updateAudioToggle();
  micBtn.classList.add("voice-mode");
  micBtn.title = t("voice.mode_active");
  startRecording();
}

export function exitVoiceMode() {
  const micBtn = document.querySelector("#mic-btn");
  const portraitStatus = document.querySelector("#portrait-status");
  voiceMode = false;
  if (isRecording) stopRecording();
  micBtn.classList.remove("voice-mode", "recording", "processing", "waiting");
  micBtn.title = t("voice.mic_title");
  if (_cb.getActiveNpcId() && !_cb.getSending()) portraitStatus.textContent = "";
}

/* ── Voice: Transcription ──────────────────────────── */
export async function transcribeAudio(blob) {
  const micBtn = document.querySelector("#mic-btn");
  const portraitStatus = document.querySelector("#portrait-status");
  const chatMessages = document.querySelector("#chat-messages");
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
        await _cb.sendMessage(data.text.trim());
      } else {
        const chatInput = document.querySelector("#chat-input");
        const sendBtn = document.querySelector("#send-btn");
        chatInput.value = data.text.trim();
        _cb.autoResize();
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
    _cb.scrollToBottom();
    if (voiceMode) setTimeout(() => { if (voiceMode) startRecording(); }, 1000);
  } finally {
    isTranscribing = false;
    micBtn.classList.remove("processing");
    if (!voiceMode) micBtn.title = t("voice.mic_title");
  }
}

/* ── Init ───────────────────────────────────────────── */
/**
 * Wire up voice event listeners. Call once during boot.
 * @param {Object} callbacks
 * @param {Function} callbacks.getSending - () => boolean
 * @param {Function} callbacks.getActiveNpcId - () => string|null
 * @param {Function} callbacks.sendMessage - (text) => Promise
 * @param {Function} callbacks.autoResize - () => void
 * @param {Function} callbacks.showCancelBtn - () => void
 * @param {Function} callbacks.hideCancelBtn - () => void
 * @param {Function} callbacks.scrollToBottom - () => void
 */
export function initVoice(callbacks) {
  _cb = callbacks;

  const micBtn = document.querySelector("#mic-btn");
  const audioToggle = document.querySelector("#audio-toggle");

  // Audio toggle click
  audioToggle.addEventListener("click", () => {
    audioEnabled = !audioEnabled;
    localStorage.setItem("echoes_audio", audioEnabled);
    updateAudioToggle();
    if (!audioEnabled && currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
  });

  // Mic button click
  micBtn.addEventListener("click", () => {
    if (isTranscribing || _cb.getSending()) return;
    if (voiceMode) {
      exitVoiceMode();
    } else if (isRecording) {
      stopRecording();
    } else {
      enterVoiceMode();
    }
  });

  // Hide mic if browser doesn't support it
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    micBtn.style.display = "none";
  }
}
