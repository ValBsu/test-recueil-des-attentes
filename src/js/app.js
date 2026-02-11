// app.js (fichier complet REORGANISÉ + PREMIUM progress réel)
// ✅ Choix AU DÉMARRAGE (Famille / Jeunes) en overlay (ne détruit pas le DOM d’accueil)
// ✅ Charge automatiquement le bon JSON (famille/jeunes) + fallback sécurité
// ✅ FIX dictée : les réponses "interim" visibles sont sauvegardées avant navigation + récap
// ✅ Audio lecture question
// ✅ Progression réelle : "Question X/Y" + "%"

const select = document.getElementById("educSelect");
const badge = document.getElementById("educBadge");
const btn = document.getElementById("startBtn");
const out = document.getElementById("out");

/* =========================
   1) Config / State
   ========================= */
const PICTOS_BASE_PATH = "./src/assets/pictos/";
const EDUC_FALC_PICTO_FILE = "FALC.jpg";

let falcHeaderImg = null;

let selectedMode = null; // "jeunes" | "famille"
let questionnairePath = "./src/data/questionnaire.json"; // default jeunes

let questionnaire = null;
let qIndex = 0;
let answers = {}; // qId -> value

let quizBox = null; // cache DOM du questionnaire
let modeOverlay = null; // overlay de choix du mode

/* Dictée */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null;
let listening = false;
let interimBaseValue = "";

/* =========================
   2) Utils
   ========================= */
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPictoSrc(fileName) {
  if (!fileName) return "";
  return encodeURI(`${PICTOS_BASE_PATH}${fileName}`);
}

function getCurrentQuestion() {
  return questionnaire.questions[qIndex];
}

/* =========================
   3) Header FALC (en haut à droite)
   ========================= */
function findEducPillElement() {
  return (
    badge.closest(".badge") ||
    badge.closest(".pill") ||
    badge.closest(".chip") ||
    badge.closest(".educBadge") ||
    badge.parentElement
  );
}

function findHeaderContainerFrom(el) {
  if (!el) return null;
  return (
    el.closest("header") ||
    el.closest(".topbar") ||
    el.closest(".header") ||
    el.closest(".appHeader") ||
    el.parentElement
  );
}

function ensureFalcInHeader() {
  if (falcHeaderImg) return;

  const pillEl = findEducPillElement();
  const headerEl = findHeaderContainerFrom(pillEl);
  if (!headerEl) return;

  try {
    const cs = window.getComputedStyle(headerEl);
    if (cs.position === "static") headerEl.style.position = "relative";
  } catch (e) {
    headerEl.style.position = "relative";
  }

  if (!headerEl.style.paddingRight) headerEl.style.paddingRight = "70px";

  falcHeaderImg = document.createElement("img");
  falcHeaderImg.id = "falcHeaderImg";
  falcHeaderImg.alt = "FALC";
  falcHeaderImg.src = getPictoSrc(EDUC_FALC_PICTO_FILE);
  falcHeaderImg.style.display = "none";

  falcHeaderImg.style.position = "absolute";
  falcHeaderImg.style.right = "18px";
  falcHeaderImg.style.top = "50%";
  falcHeaderImg.style.transform = "translateY(-50%)";
  falcHeaderImg.style.height = "40px";
  falcHeaderImg.style.width = "40px";
  falcHeaderImg.style.objectFit = "contain";

  falcHeaderImg.addEventListener("error", () => {
    falcHeaderImg.style.display = "none";
  });

  headerEl.appendChild(falcHeaderImg);
}

function updateFalcHeaderVisibility() {
  ensureFalcInHeader();
  if (!falcHeaderImg) return;
  falcHeaderImg.style.display = select.value ? "block" : "none";
}

/* =========================
   4) Educateur badge
   ========================= */
function updateBadge() {
  const label = select.options[select.selectedIndex]?.textContent;
  badge.textContent = label && label !== "— Sélectionner —" ? label : "à choisir";
  updateFalcHeaderVisibility();
}

select.addEventListener("change", updateBadge);
updateBadge();

/* =========================
   5) Overlay choix mode (Famille / Jeunes)
   ========================= */
function disableEducatorStep(disabled) {
  select.disabled = disabled;
  btn.disabled = disabled;
  btn.style.opacity = disabled ? "0.6" : "";
  btn.style.cursor = disabled ? "not-allowed" : "";
}

function ensureModeOverlay() {
  if (modeOverlay) return modeOverlay;

  const card = document.querySelector(".card");
  if (!card) return null;

  modeOverlay = document.createElement("div");
  modeOverlay.id = "modeOverlay";
  modeOverlay.innerHTML = `
    <div class="modePanel" role="dialog" aria-modal="true" aria-label="Choix du questionnaire">
      <h2 class="modeTitle">Choisis ton questionnaire</h2>
      <p class="modeSub">Avant de choisir l’éducateur.</p>

      <div class="modeGrid">
        <button type="button" class="modeBtn" id="modeFamille">
          <div class="modeBtnTitle">Questionnaire Famille</div>
          <div class="modeBtnHint">Parents / responsables</div>
        </button>

        <button type="button" class="modeBtn" id="modeJeunes">
          <div class="modeBtnTitle">Questionnaire Jeunes</div>
          <div class="modeBtnHint">Pour le jeune</div>
        </button>
      </div>

      <p class="modeInfo" id="modeInfo">Tu peux choisir l’un des deux.</p>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #modeOverlay{
      position:absolute;
      inset:0;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:14px;
      background:rgba(255,255,255,.92);
      backdrop-filter: blur(2px);
      z-index: 50;
    }
    .modePanel{
      width: min(560px, 100%);
      border:1px solid rgba(0,0,0,.12);
      border-radius:16px;
      padding:16px;
      background:#fff;
      box-shadow: 0 10px 30px rgba(0,0,0,.10);
    }
    .modeTitle{margin:0 0 6px}
    .modeSub{margin:0 0 14px; opacity:.85}
    .modeGrid{display:grid; grid-template-columns:1fr 1fr; gap:12px}
    .modeBtn{
      border:1px solid rgba(0,0,0,.15);
      border-radius:14px;
      padding:18px 12px;
      background:#fff;
      cursor:pointer;
      text-align:center;
      min-height:120px;
      display:flex;
      flex-direction:column;
      justify-content:center;
      gap:6px;
    }
    .modeBtn:active{transform:scale(.99)}
    .modeBtnTitle{font-size:18px; font-weight:700}
    .modeBtnHint{opacity:.8}
    .modeInfo{margin-top:14px; min-height:22px; opacity:.9}
    @media (max-width:560px){
      .modeGrid{grid-template-columns:1fr}
    }
  `;
  modeOverlay.appendChild(style);

  const cs = window.getComputedStyle(card);
  if (cs.position === "static") card.style.position = "relative";

  card.appendChild(modeOverlay);

  const onPick = (mode) => {
    selectedMode = mode;
    questionnairePath =
      mode === "famille"
        ? "./src/data/questionnaire_famille.json"
        : "./src/data/questionnaire.json";

    modeOverlay.style.display = "none";
    disableEducatorStep(false);

    out.textContent = `Questionnaire ${mode === "famille" ? "Famille" : "Jeunes"} choisi ✅ Choisis l’éducateur puis clique sur Démarrer.`;
  };

  modeOverlay.querySelector("#modeFamille").addEventListener("click", () => onPick("famille"));
  modeOverlay.querySelector("#modeJeunes").addEventListener("click", () => onPick("jeunes"));

  return modeOverlay;
}

function initModeChoice() {
  disableEducatorStep(true);
  ensureModeOverlay();
}

initModeChoice();

/* =========================
   6) Chargement questionnaire JSON
   ========================= */
async function loadQuestionnaire() {
  const tryFetch = async (path) => {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed: ${path}`);
    return await res.json();
  };

  try {
    questionnaire = await tryFetch(questionnairePath);
  } catch (e) {
    const res = await fetch("./src/data/questionnaire.json", { cache: "no-store" });
    questionnaire = await res.json();
  }
}

/* =========================
   7) Commit réponse texte (FIX dictée)
   ========================= */
function commitCurrentTextAnswerIfAny() {
  if (!questionnaire) return;
  const q = getCurrentQuestion();
  const type = q?.type || "single";
  if (type !== "text") return;
  const ta = document.querySelector(".textAnswer");
  if (ta) answers[q.id] = ta.value;
}

/* =========================
   8) Pictos (question + réponses)
   ========================= */
function getQuestionPictoFiles(q) {
  if (Array.isArray(q?.pictos)) return q.pictos.filter(Boolean);
  const single = q?.pictogram || q?.picto || q?.pictogramme || "";
  return single ? [single] : [];
}

function getChoicePictoFile(choice) {
  return choice?.pictogram || choice?.picto || choice?.pictogramme || "";
}

function updateQuestionPictoTop(q) {
  if (!quizBox?.pictoWrap) return;

  const files = getQuestionPictoFiles(q);

  if (!files.length) {
    quizBox.pictoWrap.style.display = "none";
    quizBox.pictoWrap.innerHTML = "";
    return;
  }

  quizBox.pictoWrap.style.display = "flex";
  quizBox.pictoWrap.innerHTML = "";

  files.forEach((file) => {
    const img = document.createElement("img");
    img.className = "qPicto";
    img.src = getPictoSrc(file);
    img.alt = q?.title ? `Pictogramme: ${q.title}` : "Pictogramme";
    img.loading = "lazy";
    img.addEventListener("error", () => (img.style.display = "none"));
    quizBox.pictoWrap.appendChild(img);
  });
}

/* =========================
   9) Scale question (range)
   ========================= */
function renderScaleQuestion(q) {
  const min = Number.isFinite(q.min) ? q.min : 1;
  const max = Number.isFinite(q.max) ? q.max : 5;

  const step =
    q.step !== undefined && q.step !== null && q.step !== ""
      ? String(q.step)
      : "any";

  const def = Number.isFinite(q.default) ? q.default : (min + max) / 2;

  const saved = answers[q.id];
  let value =
    saved !== undefined && saved !== null && String(saved).trim() !== ""
      ? Number(saved)
      : def;

  if (!Number.isFinite(value)) value = def;
  value = Math.max(min, Math.min(max, value));

  const wrap = document.createElement("div");
  wrap.className = "scaleWrap";

  const labels = Array.isArray(q.labels)
    ? q.labels
    : ["Très mal", "Mal", "Bof", "Bien", "Très bien"];

  const facesDefault = ["😡", "☹️", "😐", "🙂", "😄"];
  const facesCount = Math.min(5, Math.max(2, labels.length || 5));
  const faces = facesDefault.slice(0, facesCount);

  const facesRow = document.createElement("div");
  facesRow.className = "scaleFaces";
  facesRow.innerHTML = faces
    .map((f) => `<div class="scaleFace" aria-hidden="true">${f}</div>`)
    .join("");

  const range = document.createElement("input");
  range.type = "range";
  range.min = String(min);
  range.max = String(max);
  range.step = step;
  range.value = String(value);
  range.className = "scaleRange";

  range.addEventListener("input", () => {
    const v = Number(range.value);
    answers[q.id] = Number.isFinite(v) ? v : range.value;
  });

  answers[q.id] = Number(range.value);

  const style = document.createElement("style");
  style.textContent = `
    .scaleWrap{margin-top:12px}
    .scaleFaces{display:grid;grid-template-columns:repeat(${facesCount},1fr);gap:10px;margin:6px 0 12px}
    .scaleFace{font-size:46px;display:flex;justify-content:center;align-items:center}
    .scaleRange{width:100%; height:36px}
  `;

  wrap.appendChild(style);
  wrap.appendChild(facesRow);
  wrap.appendChild(range);

  quizBox.choices.appendChild(wrap);
}

/* =========================
   10) Audio (lecture question)
   ========================= */
function speakFR(text) {
  if (!("speechSynthesis" in window)) {
    alert("Audio non disponible sur ce navigateur.");
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  u.rate = 0.95;
  u.pitch = 0.9;
  window.speechSynthesis.speak(u);
}

function buildSpeechTextForQuestion(q) {
  const type = q.type || "single";
  if (type === "text") return `${q.title}. Réponse libre.`;
  if (type === "scale") return `${q.title}. Déplace le curseur.`;

  const choices = (q.choices || []).map((c) => c.label).join(". ");
  return choices ? `${q.title}. Choix possibles : ${choices}.` : `${q.title}.`;
}

/* =========================
   11) Dictée (micro)
   ========================= */
function getActiveTextArea() {
  return document.querySelector(".textAnswer");
}

function setMicUI(on) {
  listening = on;
  if (!quizBox?.mic) return;
  quizBox.mic.textContent = on ? "⏹️" : "🎤";
  quizBox.mic.classList.toggle("is-listening", on);
  quizBox.mic.title = on ? "Arrêter la dictée" : "Dicter la réponse";
}

function setupSpeechRecognitionIfNeeded() {
  if (!SpeechRecognition || recog) return;

  recog = new SpeechRecognition();
  recog.lang = "fr-FR";
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
      const q = getCurrentQuestion();
      answers[q.id] = ta.value;
      interimBaseValue = ta.value.trim();
    } else if (interim) {
      ta.value = (base + interim).trim();
    }
  };

  recog.onerror = (e) => {
    setMicUI(false);
    if (e?.error === "not-allowed") {
      alert("Autorise l’accès au micro pour utiliser la dictée.");
    }
  };

  recog.onend = () => {
    setMicUI(false);
    commitCurrentTextAnswerIfAny();
  };
}

function toggleDictation() {
  const q = getCurrentQuestion();
  const type = q.type || "single";

  if (type !== "text") {
    alert("Le micro est disponible seulement pour les réponses libres.");
    return;
  }

  const ta = getActiveTextArea();
  if (!ta) return;

  if (!SpeechRecognition) {
    ta.focus();
    alert("Dictée automatique non supportée ici. Utilise le micro du clavier.");
    return;
  }

  setupSpeechRecognitionIfNeeded();
  if (!recog) return;

  if (!listening) {
    try {
      ta.focus();
      interimBaseValue = ta.value.trim();
      recog.start();
      setMicUI(true);
    } catch (e) {}
  } else {
    try {
      recog.stop();
    } catch (e) {}
    setMicUI(false);
    commitCurrentTextAnswerIfAny();
  }
}

/* =========================
   12) Progress UI
   ========================= */
function updateProgressUI() {
  if (!quizBox?.progressFill || !questionnaire?.questions?.length) return;

  const total = questionnaire.questions.length;
  const current = Math.min(total, Math.max(1, qIndex + 1));
  const pct = Math.round((current / total) * 100);

  quizBox.progressText.textContent = `Question ${current}/${total}`;
  quizBox.progressPct.textContent = `${pct}%`;
  quizBox.progressFill.style.width = `${pct}%`;

  if (quizBox.progressTrack) {
    quizBox.progressTrack.setAttribute("aria-valuenow", String(pct));
  }
}

/* =========================
   13) UI Questionnaire (quizBox)
   ========================= */
function ensureQuizBox() {
  if (quizBox) return;

  const card = document.querySelector(".card");
  card.innerHTML = `
    <div class="progressWrap" aria-label="Progression du questionnaire">
      <div class="progressTop">
        <div class="progressText" id="progressText">Question 1/1</div>
        <div class="progressPct" id="progressPct">0%</div>
      </div>
      <div class="progressTrack" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="progressFill" id="progressFill" style="width:0%"></div>
      </div>
    </div>

    <div class="qHeader">
      <h2 id="qTitle"></h2>
      <div id="qPictoWrap" class="qPictoWrap" style="display:none;"></div>
    </div>

    <div id="choices" class="choices"></div>

    <div class="navRow navRow3">
      <button class="btn secondary" id="prevBtn" type="button">← Précédent</button>

      <div class="centerActions" aria-label="Actions audio et dictée">
        <button class="iconBtn" id="speakBtn" type="button" title="Énoncer la question">🔊</button>
        <button class="iconBtn" id="micBtn" type="button" title="Dicter la réponse">🎤</button>
      </div>

      <button class="btn" id="nextBtn" type="button">Suivant →</button>
    </div>

    <p id="hint" class="out" aria-live="polite"></p>
  `;

  const style = document.createElement("style");
  style.textContent = `
    .qPictoWrap{
      margin:10px 0 6px;
      display:flex;
      justify-content:center;
      gap:10px;
      flex-wrap:wrap;
    }
    .qPicto{height:70px; width:auto; object-fit:contain}

    .choiceRow{
      display:flex;
      align-items:center;
      gap:10px;
      margin:10px 0;
    }
    .choiceLabel{
      display:flex;
      align-items:center;
      gap:10px;
      cursor:pointer;
      flex:1;
    }
    .choicePicto{
      height:44px;
      width:44px;
      object-fit:contain;
      margin-left:auto;
    }

    .navRow3{display:flex; align-items:center; justify-content:space-between; gap:10px}
    .centerActions{display:flex; align-items:center; justify-content:center; gap:10px; min-width:110px}
  `;
  card.appendChild(style);

  quizBox = {
    card,
    title: document.getElementById("qTitle"),
    choices: document.getElementById("choices"),
    prev: document.getElementById("prevBtn"),
    next: document.getElementById("nextBtn"),
    hint: document.getElementById("hint"),
    speak: document.getElementById("speakBtn"),
    mic: document.getElementById("micBtn"),
    pictoWrap: document.getElementById("qPictoWrap"),

    progressText: document.getElementById("progressText"),
    progressPct: document.getElementById("progressPct"),
    progressFill: document.getElementById("progressFill"),
    progressTrack: document.querySelector(".progressTrack"),
  };

  quizBox.speak.addEventListener("click", () => {
    const q = getCurrentQuestion();
    speakFR(buildSpeechTextForQuestion(q));
  });

  quizBox.mic.addEventListener("click", () => {
    toggleDictation();
  });

  quizBox.prev.addEventListener("click", () => {
    commitCurrentTextAnswerIfAny();
    qIndex = Math.max(0, qIndex - 1);
    renderQuestion();
  });

  quizBox.next.addEventListener("click", () => {
    commitCurrentTextAnswerIfAny();

    const q = getCurrentQuestion();
    const required = q.required !== false;
    const val = answers[q.id];

    if (required && (val === undefined || val === null || String(val).trim() === "")) {
      quizBox.hint.textContent = "Réponds pour continuer.";
      return;
    }
    quizBox.hint.textContent = "";

    const last = qIndex === questionnaire.questions.length - 1;
    if (last) renderSummary();
    else {
      qIndex++;
      renderQuestion();
    }
  });
}

/* =========================
   14) Render question
   ========================= */
function renderQuestion() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  if (recog && listening) {
    try {
      recog.stop();
    } catch (e) {}
    setMicUI(false);
  }

  const q = getCurrentQuestion();
  quizBox.title.textContent = q.title;

  updateQuestionPictoTop(q);
  quizBox.choices.innerHTML = "";

  const type = q.type || "single";

  if (type === "scale") {
    renderScaleQuestion(q);
    quizBox.prev.disabled = qIndex === 0;
    quizBox.next.textContent =
      qIndex === questionnaire.questions.length - 1 ? "Terminer →" : "Suivant →";
    updateProgressUI();
    return;
  }

  if (type === "text") {
    const textarea = document.createElement("textarea");
    textarea.className = "textAnswer";
    textarea.rows = 4;
    textarea.placeholder = q.placeholder || "Écris ta réponse ici…";
    textarea.value = answers[q.id] || "";

    textarea.addEventListener("input", () => {
      answers[q.id] = textarea.value;
    });

    quizBox.choices.appendChild(textarea);
  } else {
    const isMultiple = q.type === "multiple";
    const selected = answers[q.id] || (isMultiple ? [] : "");
    const selectedArray = Array.isArray(selected) ? selected : [];

    (q.choices || []).forEach((c, i) => {
      const id = `${q.id}_${i}`;

      const row = document.createElement("div");
      row.className = "choiceRow";

      const input = document.createElement("input");
      input.type = isMultiple ? "checkbox" : "radio";
      input.name = q.id;
      input.id = id;
      input.value = c.value;

      input.checked = isMultiple ? selectedArray.includes(c.value) : c.value === selected;

      input.addEventListener("change", () => {
        if (isMultiple) {
          let arr = Array.isArray(answers[q.id]) ? [...answers[q.id]] : [];
          if (input.checked) {
            if (!arr.includes(c.value)) arr.push(c.value);
          } else {
            arr = arr.filter((v) => v !== c.value);
          }
          answers[q.id] = arr;
        } else {
          answers[q.id] = c.value;
        }
      });

      const label = document.createElement("label");
      label.setAttribute("for", id);
      label.className = "choiceLabel";

      const span = document.createElement("span");
      span.textContent = c.label;
      label.appendChild(span);

      const choicePicto = getChoicePictoFile(c);
      if (choicePicto) {
        const img = document.createElement("img");
        img.className = "choicePicto";
        img.src = getPictoSrc(choicePicto);
        img.alt = "";
        img.loading = "lazy";
        img.addEventListener("error", () => (img.style.display = "none"));
        label.appendChild(img);
      }

      row.appendChild(input);
      row.appendChild(label);
      quizBox.choices.appendChild(row);
    });
  }

  quizBox.prev.disabled = qIndex === 0;
  quizBox.next.textContent =
    qIndex === questionnaire.questions.length - 1 ? "Terminer →" : "Suivant →";

  updateProgressUI();
}

/* =========================
   15) Récap + Envoi
   ========================= */
function renderSummary() {
  commitCurrentTextAnswerIfAny();

  const educatorId = select.value;
  const educLabel = badge.textContent;

  // Progress 100% sur le récap
  if (quizBox?.progressFill) {
    quizBox.progressText.textContent = "Récapitulatif";
    quizBox.progressPct.textContent = "100%";
    quizBox.progressFill.style.width = "100%";
    if (quizBox.progressTrack) quizBox.progressTrack.setAttribute("aria-valuenow", "100");
  }

  const summary = questionnaire.questions.map((q) => {
    const val = answers[q.id] ?? "";
    const type = q.type || "single";
    const isMultiple = q.type === "multiple";

    if (type === "scale") {
      const labels = Array.isArray(q.labels) ? q.labels : null;

      if (
        labels &&
        Number.isFinite(Number(val)) &&
        Number.isFinite(Number(q.min)) &&
        Number.isFinite(Number(q.max))
      ) {
        const min = Number(q.min);
        const max = Number(q.max);
        const n = Number(val);
        const t = (n - min) / (max - min);
        const idx = Math.max(
          0,
          Math.min(labels.length - 1, Math.round(t * (labels.length - 1)))
        );
        return { question: q.title, answer: labels[idx] };
      }
      return { question: q.title, answer: String(val) };
    }

    if (type === "text") {
      return { question: q.title, answer: String(val) };
    }

    if (isMultiple) {
      const selectedVals = Array.isArray(val) ? val : [];
      const labels = selectedVals
        .map((v) => (q.choices || []).find((c) => c.value === v)?.label)
        .filter(Boolean)
        .join("; ");
      return { question: q.title, answer: labels };
    }

    const label = (q.choices || []).find((c) => c.value === val)?.label || "";
    return { question: q.title, answer: label };
  });

  quizBox.card.innerHTML = `
    <div id="pdfArea">
      <h2>Récapitulatif</h2>
      <p class="out"><strong>Éducateur :</strong> ${escapeHtml(educLabel)}</p>
      <p class="out"><strong>Date :</strong> ${new Date().toLocaleString("fr-FR")}</p>

      <div class="summaryList" id="summaryList"></div>
    </div>

    <div class="navRow">
      <button class="btn secondary" id="editBtn" type="button">← Modifier</button>
      <button class="btn" id="sendBtn" type="button">✉️ Envoyer au référent</button>
    </div>

    <p class="out" id="sendHint"></p>
  `;

  const list = document.getElementById("summaryList");
  summary.forEach((item) => {
    const div = document.createElement("div");
    div.className = "summaryItem";
    div.innerHTML = `<strong>${escapeHtml(item.question)}</strong><div>${escapeHtml(item.answer)}</div>`;
    list.appendChild(div);
  });

  document.getElementById("editBtn").addEventListener("click", () => {
    quizBox = null;
    ensureQuizBox();
    renderQuestion();
  });

  document.getElementById("sendBtn").addEventListener("click", async () => {
    const hint = document.getElementById("sendHint");
    hint.textContent = "Envoi en cours…";

    try {
      const res = await fetch("/.netlify/functions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          educatorId,
          educatorLabel: educLabel,
          summary,
        }),
      });

      const txt = await res.text();
      if (!res.ok) throw new Error(txt || "Erreur d’envoi");

      hint.textContent = "Envoyé ✅";
    } catch (err) {
      hint.textContent = "Erreur d’envoi ❌";
      alert("Erreur d’envoi ❌\n" + err.message);
    }
  });
}

/* =========================
   16) Start (bouton Démarrer)
   ========================= */
btn.addEventListener("click", async () => {
  if (!selectedMode) {
    out.textContent = "Choisissez d’abord le type de questionnaire (Famille ou Jeunes).";
    const ov = ensureModeOverlay();
    if (ov) ov.style.display = "flex";
    disableEducatorStep(true);
    return;
  }

  if (!select.value) {
    out.textContent = "Merci de choisir  l'éducateur avant de continuer.";
    return;
  }

  out.textContent = "";

  await loadQuestionnaire();
  ensureQuizBox();
  renderQuestion();
});
