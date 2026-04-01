"use strict";

/* Dictée */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null;
let listening = false;
let interimBaseValue = "";
let activeDictationField = null;

/* Audio */
let lastSpokenText = "";
let autoSpeakTimer = null;

function getSpeechLang() {
  return SPEECH_LANG_MAP[currentLang] || "fr-FR";
}

function cancelSpeech() {
  if (!("speechSynthesis" in window)) return;
  window.clearTimeout(autoSpeakTimer);
  window.speechSynthesis.cancel();
}

function speakText(text, options = {}) {
  if (!text) return;
  if (!("speechSynthesis" in window)) {
    alert(t("audio_unavailable"));
    return;
  }

  const {
    force = true,
    remember = true,
    delay = 0
  } = options;

  window.clearTimeout(autoSpeakTimer);

  const run = () => {
    if (!force && text === lastSpokenText) return;

    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = getSpeechLang();
    u.rate = 0.95;
    u.pitch = 0.9;

    if (remember) lastSpokenText = text;
    window.speechSynthesis.speak(u);
  };

  if (delay > 0) {
    autoSpeakTimer = window.setTimeout(run, delay);
  } else {
    run();
  }
}

/* Compatibilité ancien code :
   on garde speakHover, mais il ne fait plus de lecture au survol.
   Comme ça, si ton app l'appelle encore ailleurs, ça ne casse rien.
*/
function speakHover() {
  return;
}

/* Lecture auto de la question courante */
function speakCurrentQuestionAuto() {
  const q = typeof getCurrentQuestion === "function" ? getCurrentQuestion() : null;
  if (!q) return;

  let text = "";

  if (typeof getQuestionTitle === "function") {
    text = getQuestionTitle(q);
  } else if (typeof getLocalizedValue === "function") {
    text = getLocalizedValue(q?.title);
  } else {
    text = q?.title || "";
  }

  if (!text) return;

  speakText(text, {
    force: true,
    remember: true,
    delay: 250
  });
}

function bindChoiceSpeakInteractions(target, q, text) {
  if (!target || !text) return;

  target.addEventListener("click", () => {
    speakText(text, { force: true, remember: true });
  });

  target.addEventListener(
    "touchstart",
    () => {
      speakText(text, { force: true, remember: true });
    },
    { passive: true }
  );
}

function getVisibleTextInputs() {
  return Array.from(document.querySelectorAll(".textAnswer, .otherAnswerInput")).filter(
    (el) => el && el.offsetParent !== null
  );
}

function getActiveTextArea() {
  const active = document.activeElement;
  if (active && active.matches && active.matches(".textAnswer, .otherAnswerInput")) {
    return active;
  }

  if (
    activeDictationField &&
    document.body.contains(activeDictationField) &&
    activeDictationField.offsetParent !== null
  ) {
    return activeDictationField;
  }

  const q = getCurrentQuestion();
  if (q && (q?.type || "single") === "text") {
    const main = document.querySelector(".textAnswer");
    if (main) return main;
  }

  const other = document.querySelector(".otherAnswerInput");
  if (other) return other;

  return getVisibleTextInputs()[0] || null;
}

function setMicUI(on) {
  listening = on;
  if (!quizBox?.mic) return;
  quizBox.mic.textContent = on ? "⏹️" : "🎤";
  quizBox.mic.classList.toggle("is-listening", on);
  quizBox.mic.title = on ? t("stop_dictation") : t("dictate_answer");
}

function setupSpeechRecognitionIfNeeded() {
  if (!SpeechRecognition || recog) return;

  recog = new SpeechRecognition();
  recog.lang = getSpeechLang();
  recog.interimResults = true;
  recog.continuous = false;

  recog.onresult = (e) => {
    const ta = getActiveTextArea();
    if (!ta) return;

    let interim = "";
    let finalText = "";

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const chunk = (e.results[i][0]?.transcript || "").trim();
      if (!chunk) continue;
      if (e.results[i].isFinal) finalText += (finalText ? " " : "") + chunk;
      else interim += (interim ? " " : "") + chunk;
    }

    const base = interimBaseValue ? interimBaseValue + " " : "";

    if (finalText) {
      ta.value = (base + finalText).trim();
      saveTextareaValueToState(ta);
      interimBaseValue = ta.value.trim();
    } else if (interim) {
      ta.value = (base + interim).trim();
    }
  };

  recog.onerror = (e) => {
    setMicUI(false);
    if (e?.error === "not-allowed") {
      alert(t("dictation_micro_authorize"));
    }
  };

  recog.onend = () => {
    setMicUI(false);
    const ta = getActiveTextArea();
    if (ta) saveTextareaValueToState(ta);
  };
}

function toggleDictation() {
  const ta = getActiveTextArea();

  if (!ta) {
    alert(t("no_textarea_for_dictation"));
    return;
  }

  if (!SpeechRecognition) {
    ta.focus();
    alert(t("dictation_unsupported"));
    return;
  }

  setupSpeechRecognitionIfNeeded();
  if (!recog) return;

  recog.lang = getSpeechLang();

  if (!listening) {
    try {
      ta.focus();
      activeDictationField = ta;
      interimBaseValue = ta.value.trim();
      recog.start();
      setMicUI(true);
    } catch (e) {}
  } else {
    try {
      recog.stop();
    } catch (e) {}
    setMicUI(false);
    saveTextareaValueToState(ta);
  }
}

function resetSpeechState() {
  activeDictationField = null;
  cancelSpeech();
}

window.speakHover = speakHover;
window.speakText = speakText;
window.speakCurrentQuestionAuto = speakCurrentQuestionAuto;
window.bindChoiceSpeakInteractions = bindChoiceSpeakInteractions;
window.getVisibleTextInputs = getVisibleTextInputs;
window.getActiveTextArea = getActiveTextArea;
window.setMicUI = setMicUI;
window.toggleDictation = toggleDictation;
window.resetSpeechState = resetSpeechState;
window.getSpeechLang = getSpeechLang;
window.cancelSpeech = cancelSpeech;

window.__speechState = {
  get recog() {
    return recog;
  },
  get listening() {
    return listening;
  },
  get activeDictationField() {
    return activeDictationField;
  },
  set activeDictationField(val) {
    activeDictationField = val;
  }
};