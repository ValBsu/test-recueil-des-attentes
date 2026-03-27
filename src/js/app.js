/* app.js — épuré SAFE (sans casser)
   Flow:
   1) Overlay -> choisir questionnaire
   2) Choisir pôle (uniquement pôles visibles)
   3) Choisir pro (uniquement pros)
   4) Questionnaire (audio question uniquement, réponses parlées au survol/clic, réponse libre complémentaire, progress)
   5) Récap (chrono + pictos) + envoi netlify + téléchargement PDF (OFFLINE OK, rendu identique)
*/

"use strict";

/* =========================
   Helpers DOM (anti-crash)
   ========================= */
const $id = (id) => document.getElementById(id);
const noop = () => {};

/* =========================
   DOM refs
   ========================= */
const select = $id("educSelect");
const badge = $id("educBadge");

const poleStep = $id("poleStep");
const educStep = $id("educStep");

const groupSelect = $id("groupSelect"); // compat (caché)
const groupGrid = $id("groupGrid");
const educGrid = $id("educGrid");

const btnPoleContinue = $id("startBtn");
const btnBack = $id("backToPolesBtn");
const btnEducContinue = $id("continueAfterEducBtn");

const out = $id("out");
const educOut = $id("educOut");

/* =========================
   Config / State
   ========================= */
const PICTOS_BASE_PATH = "./src/assets/pictos/";
const EDUC_FALC_PICTO_FILE = "FALC.jpg";
const DEFAULT_EDUC_PHOTO = "./src/assets/avatar.png";

let falcHeaderImg = null;
let modeOverlay = null;

let selectedQuestionnaireKey = null;
let questionnairePath = "./src/data/questionnaire.json";
let questionnaire = null;

let fixedPoleFromOverlay = "";
let selectedPole = "";
let qIndex = 0;
let answers = {};      // qId -> valeur principale
let otherAnswers = {}; // qId -> texte "autre réponse"

let quizBox = null;

/* Chrono */
let chronoStartMs = 0;
let chronoEndMs = 0;

/* Dictée */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null;
let listening = false;
let interimBaseValue = "";
let activeDictationField = null;

/* Hover audio */
let suppressHoverUntil = 0;

/* =========================
   Données (éducateurs / pôles)
   ========================= */
const EDUCATORS = [
  { name: "Alexis Plessis", role: "Éducateur spécialisé", group: "Pôle accueil", photo: DEFAULT_EDUC_PHOTO, id: "alexis-plessis" },
  { name: "Morgane Deshaies", role: "Éducatrice spécialisée", group: "Pôle accueil", photo: DEFAULT_EDUC_PHOTO, id: "morgane-deshaies" },
  { name: "Camille Rouillé", role: "Éducatrice spécialisée", group: "Pôle accueil", photo: DEFAULT_EDUC_PHOTO, id: "camille-rouille" },
  { name: "Marina Trottier", role: "Éducatrice spécialisée", group: "Pôle accueil", photo: DEFAULT_EDUC_PHOTO, id: "marina-trottier" },
  { name: "Lucile Charrier", role: "Éducatrice spécialisée", group: "Pôle accueil", photo: DEFAULT_EDUC_PHOTO, id: "lucile-charrier" },

  { name: "Pauline Martin", role: "Éducatrice spécialisée", group: "Pôle projet", photo: DEFAULT_EDUC_PHOTO, id: "pauline-martin" },
  { name: "Marine Toureau", role: "Monitrice éducatrice", group: "Pôle projet", photo: DEFAULT_EDUC_PHOTO, id: "marine-toureau" },
  { name: "Wilfried Tijou", role: "Éducateur technique", group: "Pôle projet", photo: DEFAULT_EDUC_PHOTO, id: "wilfried-tijou" },
  { name: "Maud Février", role: "Monitrice éducatrice", group: "Pôle projet", photo: DEFAULT_EDUC_PHOTO, id: "maud-fevrier" },
  { name: "Nadège Rétif", role: "Éducatrice spécialisée", group: "Pôle projet", photo: DEFAULT_EDUC_PHOTO, id: "nadege-retif" },
  { name: "Nicolas Marmin", role: "Éducateur spécialisé", group: "Pôle projet", photo: DEFAULT_EDUC_PHOTO, id: "nicolas-marmin" },

  { name: "Karen Goujon", role: "Éducateur spécialisé", group: "Pôle sortie", photo: DEFAULT_EDUC_PHOTO, id: "karen-goujon" },
  { name: "Damien Chautard", role: "Éducateur technique", group: "Pôle sortie", photo: DEFAULT_EDUC_PHOTO, id: "damien-chautard" },
  { name: "Céline Mottais", role: "Éducateur spécialisé", group: "Pôle sortie", photo: DEFAULT_EDUC_PHOTO, id: "celine-mottais" },
  { name: "Josélita Martot", role: "Éducateur spécialisé", group: "Pôle sortie", photo: DEFAULT_EDUC_PHOTO, id: "joselita-martot" },
  { name: "Marie Boré", role: "Éducateur spécialisé", group: "Pôle sortie", photo: DEFAULT_EDUC_PHOTO, id: "marie-bore" },

  { name: "Pascal Rochard", role: "Éducateur spécialisé", group: "Unité transversale", photo: DEFAULT_EDUC_PHOTO, id: "pascal-rochard" },
  { name: "Julien Fabre", role: "Éducateur spécialisé", group: "Unité transversale", photo: DEFAULT_EDUC_PHOTO, id: "julien-fabre" },
  { name: "Chloé Galand", role: "Éducatrice spécialisée", group: "Unité transversale", photo: DEFAULT_EDUC_PHOTO, id: "chloe-galand" },
  { name: "Audrey Morille", role: "Éducatrice spécialisée", group: "Unité transversale", photo: DEFAULT_EDUC_PHOTO, id: "audrey-morille" },
  { name: "Claire Constanty", role: "Monitrice éducatrice", group: "Unité transversale", photo: DEFAULT_EDUC_PHOTO, id: "claire-constanty" },

  { name: "Matthieu Rivron", role: "Éducateur spécialisé", group: "Unité spécifique", photo: DEFAULT_EDUC_PHOTO, id: "matthieu-rivron" },
  { name: "Noémie Rat", role: "Éducatrice spécialisée", group: "Unité spécifique", photo: DEFAULT_EDUC_PHOTO, id: "noemie-rat" },
  { name: "Juliette Rousteau", role: "Monitrice éducatrice", group: "Unité spécifique", photo: DEFAULT_EDUC_PHOTO, id: "juliette-rousteau" },
  { name: "Justine Meruz", role: "Monitrice éducatrice", group: "Unité spécifique", photo: DEFAULT_EDUC_PHOTO, id: "justine-meruz" },
  { name: "Valentin Bésiau", role: "Moniteur éducateur", group: "Unité spécifique", photo: DEFAULT_EDUC_PHOTO, id: "valentin-besiau" },
];

const GROUPS = Array.from(new Set(EDUCATORS.map((e) => e.group)));

const QUESTIONNAIRES = [
  { key: "famille", label: "Questionnaire Famille", hint: "Parents / responsables", icon: "👨‍👩‍👧‍👦", path: "./src/data/questionnaire_famille.json" },

  { key: "pole_accueil", label: "Pôle accueil", hint: "Questionnaire Pôle Accueil", icon: "🏠", path: "./src/data/questionnaire_PA.json", fixedPole: "Pôle accueil" },
  { key: "pole_projet", label: "Pôle projet", hint: "Questionnaire Pôle Projet", icon: "🧩", path: "./src/data/questionnaire_PP.json", fixedPole: "Pôle projet" },
  { key: "pole_sortie", label: "Pôle sortie", hint: "Questionnaire Pôle Sortie", icon: "🚌", path: "./src/data/questionnaire_PS.json", fixedPole: "Pôle sortie" },
  { key: "unite_transversale", label: "Unité transversale", hint: "Questionnaire Unité Transversale", icon: "🔄", path: "./src/data/questionnaire_UT.json", fixedPole: "Unité transversale" },
  { key: "unite_specifique", label: "Unité spécifique", hint: "Questionnaire Unité Spécifique", icon: "🎯", path: "./src/data/questionnaire_US.json", fixedPole: "Unité spécifique" },
  { key: "pole_ulis", label: "ULIS", hint: "Questionnaire Pôle ULIS", icon: "🚌", path: "./src/data/questionnaire_ULIS.json", fixedPole: "ULIS" },  
  { key: "pole_sessad", label: "SESSAD", hint: "Questionnaire Pôle SESSAD", icon: "🛵", path: "./src/data/questionnaire_SESSAD.json", fixedPole: "SESSAD" },
];

/* =========================
   Utils
   ========================= */
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeId(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getPictoSrc(fileName) {
  if (!fileName) return "";
  return encodeURI(`${PICTOS_BASE_PATH}${fileName}`);
}

function safeQuestionsArray(qnr) {
  const arr = qnr?.questions;
  return Array.isArray(arr) ? arr : [];
}

function getCurrentQuestion() {
  const qs = safeQuestionsArray(questionnaire);
  return qs[qIndex];
}

function shouldShowOtherAnswerField(q) {
  return (q?.type || "single") !== "text";
}

function getOtherAnswerValue(qId) {
  return String(otherAnswers[qId] || "").trim();
}

function isFamilyQuestionnaire() {
  return selectedQuestionnaireKey === "famille";
}

/* =========================
   Identité obligatoire (Nom/Prénom/Âge)
   ========================= */
function isIdentityQuestion(q) {
  const id = String(q?.id || "").toLowerCase();
  const title = String(q?.title || "").toLowerCase();

  const has = (txt, ...words) => words.some((w) => txt.includes(w));

  const isFirst = has(id, "prenom", "prénom") || (has(title, "prénom", "prenom") && !has(title, "nom de famille"));
  const isLast = has(id, "nom") || (has(title, "nom") && !has(title, "prénom", "prenom"));
  const isAge = has(id, "age", "âge") || has(title, "âge", "age");

  const forbidden = has(title, "référent", "referent", "educateur", "éducateur", "professionnel", "pôle", "pole");
  if (forbidden) return false;

  return isFirst || isLast || isAge;
}

function isAnswered(val) {
  if (val === undefined || val === null) return false;
  if (Array.isArray(val)) return val.length > 0;
  return String(val).trim() !== "";
}

function hasAnyAnswerForQuestion(q) {
  const main = answers[q.id];
  const other = getOtherAnswerValue(q.id);
  return isAnswered(main) || other !== "";
}

function focusFirstAnswerField() {
  const el =
    document.querySelector(".textAnswer") ||
    document.querySelector("#choices input[type='radio']") ||
    document.querySelector("#choices input[type='checkbox']") ||
    document.querySelector("#choices input") ||
    document.querySelector(".otherAnswerInput") ||
    null;
  if (el) el.focus();
}

/* =========================
   Audio
   ========================= */
let lastSpokenText = "";
let speakTimer = null;

function speakHover(text) {
  if (!text) return;
  if (!("speechSynthesis" in window)) return;
  if (Date.now() < suppressHoverUntil) return;

  window.clearTimeout(speakTimer);
  speakTimer = window.setTimeout(() => {
    if (Date.now() < suppressHoverUntil) return;
    if (text === lastSpokenText) return;
    lastSpokenText = text;

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 0.95;
    u.pitch = 0.9;
    window.speechSynthesis.speak(u);
  }, 120);
}

function speakFR(text) {
  if (!text) return;
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

function bindSpeakInteractions(target, text) {
  if (!target || !text) return;
  target.addEventListener("mouseenter", () => speakHover(text));
  target.addEventListener("focus", () => speakHover(text), true);
  target.addEventListener("click", () => speakFR(text));
  target.addEventListener("touchstart", () => speakFR(text), { passive: true });
}

function questionHasSelectedChoice(q) {
  if (!q) return false;
  if (q.type === "text" || q.type === "scale") return false;

  const current = answers[q.id];

  if (q.type === "multiple") {
    return Array.isArray(current) && current.length > 0;
  }

  return current !== undefined && current !== null && String(current).trim() !== "";
}

function bindChoiceSpeakInteractions(target, q, text) {
  if (!target || !text) return;

  if (isFamilyQuestionnaire()) return;

  target.addEventListener("mouseenter", () => {
    if (questionHasSelectedChoice(q)) return;
    speakHover(text);
  });

  target.addEventListener("focus", () => {
    speakHover(text);
  }, true);

  target.addEventListener("click", () => {
    suppressHoverUntil = Date.now() + 500;
    speakFR(text);
  });

  target.addEventListener("touchstart", () => {
    speakFR(text);
  }, { passive: true });
}

/* =========================
   FALC header (icône en haut)
   ========================= */
function findHeaderContainerFrom(el) {
  if (!el) return null;
  return el.closest("header") || el.closest(".top") || el.parentElement;
}

function ensureFalcInHeader() {
  if (falcHeaderImg || !badge) return;

  const headerEl = findHeaderContainerFrom(badge);
  if (!headerEl) return;

  try {
    const cs = window.getComputedStyle(headerEl);
    if (cs.position === "static") headerEl.style.position = "relative";
  } catch (e) {
    headerEl.style.position = "relative";
  }

  headerEl.style.paddingRight = headerEl.style.paddingRight || "70px";

  falcHeaderImg = document.createElement("img");
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
  falcHeaderImg.addEventListener("error", () => (falcHeaderImg.style.display = "none"));

  headerEl.appendChild(falcHeaderImg);
}

function updateBadge() {
  if (!select || !badge) return;
  const label = select.options[select.selectedIndex]?.textContent;
  badge.textContent = label && label !== "— Sélectionner —" ? label : "à choisir";

  ensureFalcInHeader();
  if (falcHeaderImg) falcHeaderImg.style.display = select.value ? "block" : "none";
}

/* =========================
   Navigation steps
   ========================= */
function showPoleStep() {
  if (poleStep) poleStep.style.display = "";
  if (educStep) educStep.style.display = "none";
  if (educOut) educOut.textContent = "";
}

function showEducStep() {
  if (poleStep) poleStep.style.display = "none";
  if (educStep) educStep.style.display = "";
  if (out) out.textContent = "";
}

/* =========================
   Overlay questionnaires
   ========================= */
function setBeforePickState(disabled) {
  if (select) select.disabled = disabled;
  if (btnEducContinue) btnEducContinue.disabled = true;
  if (btnPoleContinue) btnPoleContinue.disabled = false;
}

function ensureModeOverlay() {
  if (modeOverlay) return modeOverlay;

  modeOverlay = document.createElement("div");
  modeOverlay.id = "modeOverlay";
  modeOverlay.innerHTML = `
    <div class="modePanel" role="dialog" aria-modal="true" aria-label="Choix du questionnaire">
      <h2 class="modeTitle">Choisis ton questionnaire</h2>
      <p class="modeHint">Sélectionne le bon questionnaire avant de continuer.</p>
      <div class="qSelectGrid" id="qSelectGrid"></div>
    </div>
  `;
  document.body.appendChild(modeOverlay);

  const grid = modeOverlay.querySelector("#qSelectGrid");
  grid.innerHTML = QUESTIONNAIRES.map((q) => `
    <button type="button" class="qSelectCard" data-qkey="${escapeHtml(q.key)}" aria-label="${escapeHtml(q.label)}">
      <div class="qSelectBadge" aria-hidden="true">${escapeHtml(q.icon || "📝")}</div>
      <div>
        <div class="qSelectTitle">${escapeHtml(q.label)}</div>
        <div class="qSelectHint">${escapeHtml(q.hint || "")}</div>
      </div>
    </button>
  `).join("");

  grid.querySelectorAll(".qSelectCard").forEach((btn) => {
    const item = QUESTIONNAIRES.find((x) => x.key === btn.dataset.qkey);
    if (!item) return;

    btn.addEventListener("mouseenter", () => speakHover(item.label));
    btn.addEventListener("focus", () => speakHover(item.label));
    btn.addEventListener("click", () => onPickQuestionnaire(item));
  });

  return modeOverlay;
}

function openOverlay() {
  ensureModeOverlay();
  modeOverlay.style.display = "flex";
  setBeforePickState(true);
}

function closeOverlay() {
  if (modeOverlay) modeOverlay.style.display = "none";
  setBeforePickState(false);
}

function resetForNewQuestionnaire(item) {
  selectedQuestionnaireKey = item.key;
  questionnairePath = item.path;

  fixedPoleFromOverlay = item.fixedPole || "";
  selectedPole = "";
  questionnaire = null;
  qIndex = 0;
  answers = {};
  otherAnswers = {};
  quizBox = null;
  chronoStartMs = 0;
  chronoEndMs = 0;
  activeDictationField = null;
  suppressHoverUntil = 0;

  if (select) {
    select.innerHTML = `<option value="">— Sélectionner —</option>`;
    select.value = "";
  }
  updateBadge();
  if (educGrid) educGrid.innerHTML = "";

  renderGroupCards(true);
  showPoleStep();

  if (out) {
    out.textContent = fixedPoleFromOverlay
      ? "Choisis le pôle (seul le bon est disponible)."
      : "Choisis d’abord le pôle.";
  }

  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function onPickQuestionnaire(item) {
  resetForNewQuestionnaire(item);
  closeOverlay();
}

function initModeChoice() {
  openOverlay();
}

/* =========================
   Pôles -> Pros
   ========================= */
function populateGroupsSelectCompat() {
  if (!groupSelect) return;
  groupSelect.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());
  GROUPS.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    groupSelect.appendChild(opt);
  });
}

function ensureSelectOption(id, label) {
  if (!select) return;
  if ([...select.options].some((o) => o.value === id)) return;
  const opt = document.createElement("option");
  opt.value = id;
  opt.textContent = label;
  select.appendChild(opt);
}

function renderEducatorsForGroup(group) {
  if (!educGrid) return;

  educGrid.innerHTML = "";
  const list = EDUCATORS.filter((e) => e.group === group);

  if (!list.length) {
    if (educOut) educOut.textContent = "Aucun professionnel trouvé pour ce pôle.";
    return;
  }

  list.forEach((e) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "educ-card";
    card.innerHTML = `
      <img class="educ-photo" src="${e.photo}" alt="" loading="lazy" />
      <div>
        <div class="educ-name">${escapeHtml(e.name)}</div>
        <div class="educ-role">${escapeHtml(e.role)}</div>
      </div>
    `;

    const speakText = `${e.name}. ${e.role}.`;
    card.addEventListener("mouseenter", () => speakHover(speakText));
    card.addEventListener("focus", () => speakHover(speakText));
    card.addEventListener("touchstart", () => speakFR(speakText), { passive: true });

    card.addEventListener("click", () => {
      const id = e.id || normalizeId(e.name);
      ensureSelectOption(id, e.name);

      if (select) select.value = id;
      updateBadge();

      educGrid.querySelectorAll(".educ-card").forEach((el) => el.classList.remove("is-selected"));
      card.classList.add("is-selected");

      if (btnEducContinue) btnEducContinue.disabled = false;
      if (educOut) educOut.textContent = "";
    });

    educGrid.appendChild(card);
  });
}

function highlightSelectedPoleCard(name) {
  if (!groupGrid) return;
  groupGrid.querySelectorAll(".group-card").forEach((el) => {
    el.classList.toggle("is-selected", el.dataset.group === name);
  });
}

function renderGroupCards(enabled) {
  if (!groupGrid) return;

  groupGrid.innerHTML = "";

  GROUPS.forEach((g) => {
    const locked = !!fixedPoleFromOverlay;
    const isAllowed = !locked || fixedPoleFromOverlay === g;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "group-card";
    card.dataset.group = g;

    card.disabled = !enabled || !isAllowed;
    card.style.opacity = enabled && isAllowed ? "" : "0.45";
    card.style.cursor = enabled && isAllowed ? "" : "not-allowed";

    const gl = g.toLowerCase();
    const icon = gl.includes("accueil") ? "🏠"
      : gl.includes("projet") ? "🧩"
      : gl.includes("sortie") ? "🚌"
      : gl.includes("transversale") ? "🔄"
      : gl.includes("specifique") || gl.includes("spécifique") ? "🎯"
      : "🏷️";

    card.innerHTML = `
      <div class="group-badge" aria-hidden="true">${icon}</div>
      <div class="group-name">${escapeHtml(g)}</div>
    `;

    card.addEventListener("mouseenter", () => enabled && isAllowed && speakHover(g));
    card.addEventListener("focus", () => enabled && isAllowed && speakHover(g));

    card.addEventListener("click", () => {
      if (!enabled || !isAllowed) return;

      selectedPole = g;
      if (groupSelect) groupSelect.value = g;

      highlightSelectedPoleCard(g);

      if (select) select.value = "";
      updateBadge();
      if (btnEducContinue) btnEducContinue.disabled = true;

      showEducStep();
      renderEducatorsForGroup(g);
      if (educOut) educOut.textContent = "Choisis le professionnel, puis Continuer.";
    });

    groupGrid.appendChild(card);
  });
}

/* =========================
   Chargement JSON
   ========================= */
async function loadQuestionnaire() {
  const tryFetch = async (path) => {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed: ${path}`);
    return await res.json();
  };

  let data = null;
  try {
    data = await tryFetch(questionnairePath);
  } catch (e) {
    try {
      data = await tryFetch("./src/data/questionnaire.json");
    } catch (e2) {
      data = null;
    }
  }

  const qs = safeQuestionsArray(data);
  if (!data || !qs.length) {
    alert("Questionnaire introuvable ou vide. Vérifie le nom du fichier JSON.");
    questionnaire = { questions: [] };
    return;
  }

  questionnaire = data;
}

/* =========================
   Pictos question/réponses
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
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => (img.style.display = "none"));
    quizBox.pictoWrap.appendChild(img);
  });
}

/* =========================
   Dictée (micro)
   ========================= */
function getVisibleTextInputs() {
  return Array.from(document.querySelectorAll(".textAnswer, .otherAnswerInput"))
    .filter((el) => el && el.offsetParent !== null);
}

function getActiveTextArea() {
  const active = document.activeElement;
  if (
    active &&
    active.matches &&
    active.matches(".textAnswer, .otherAnswerInput")
  ) {
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

  const anyVisible = getVisibleTextInputs()[0] || null;
  return anyVisible;
}

function saveTextareaValueToState(textarea) {
  if (!textarea) return;
  const q = getCurrentQuestion();
  if (!q) return;

  if (textarea.classList.contains("textAnswer")) {
    answers[q.id] = textarea.value;
    return;
  }

  if (textarea.classList.contains("otherAnswerInput")) {
    otherAnswers[q.id] = textarea.value;
  }
}

function setMicUI(on) {
  listening = on;
  if (!quizBox?.mic) return;
  quizBox.mic.textContent = on ? "⏹️" : "🎤";
  quizBox.mic.classList.toggle("is-listening", on);
  quizBox.mic.title = on ? "Arrêter la dictée" : "Dicter la réponse";
}

function commitCurrentTextAnswerIfAny() {
  const fields = getVisibleTextInputs();
  fields.forEach((field) => saveTextareaValueToState(field));
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
      saveTextareaValueToState(ta);
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
    const ta = getActiveTextArea();
    if (ta) saveTextareaValueToState(ta);
  };
}

function toggleDictation() {
  const ta = getActiveTextArea();

  if (!ta) {
    alert("Aucune zone de texte disponible pour la dictée.");
    return;
  }

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
      activeDictationField = ta;
      interimBaseValue = ta.value.trim();
      recog.start();
      setMicUI(true);
    } catch (e) {}
  } else {
    try { recog.stop(); } catch (e) {}
    setMicUI(false);
    saveTextareaValueToState(ta);
  }
}

/* =========================
   Progress
   ========================= */
function updateProgressUI() {
  if (!quizBox?.progressFill) return;

  const qs = safeQuestionsArray(questionnaire);
  const total = qs.length;
  if (!total) return;

  const current = Math.min(total, Math.max(1, qIndex + 1));
  const pct = Math.round((current / total) * 100);

  quizBox.progressText.textContent = `Question ${current}/${total}`;
  quizBox.progressPct.textContent = `${pct}%`;
  quizBox.progressFill.style.width = `${pct}%`;
  quizBox.progressTrack?.setAttribute("aria-valuenow", String(pct));
}

/* =========================
   Questionnaire UI
   ========================= */
function buildSpeechTextForQuestion(q) {
  return String(q?.title || "Question");
}

function renderScaleQuestion(q) {
  const min = Number.isFinite(q.min) ? q.min : 1;
  const max = Number.isFinite(q.max) ? q.max : 5;
  const step = (q.step !== undefined && q.step !== null && q.step !== "") ? String(q.step) : "1";
  const def = Number.isFinite(q.default) ? q.default : Math.round((min + max) / 2);

  const saved = answers[q.id];
  let value = (saved !== undefined && saved !== null && String(saved).trim() !== "") ? Number(saved) : def;
  if (!Number.isFinite(value)) value = def;
  value = Math.max(min, Math.min(max, value));

  const wrap = document.createElement("div");
  wrap.className = "scaleWrap";

  const labels = Array.isArray(q.labels) ? q.labels : ["Très mal", "Mal", "Bof", "Bien", "Très bien"];
  const facesDefault = ["😡", "☹️", "😐", "🙂", "😄"];
  const facesCount = Math.min(5, Math.max(2, labels.length || 5));
  const faces = facesDefault.slice(0, facesCount);

  const facesRow = document.createElement("div");
  facesRow.className = "scaleFaces";
  facesRow.innerHTML = faces.map((f) => `<div class="scaleFace" aria-hidden="true">${f}</div>`).join("");

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

  wrap.appendChild(facesRow);
  wrap.appendChild(range);
  quizBox.choices.appendChild(wrap);
}

function renderOtherAnswerField(q) {
  if (!quizBox?.choices || !shouldShowOtherAnswerField(q)) return;

  const wrap = document.createElement("div");
  wrap.className = "otherAnswerWrap";

  const label = document.createElement("label");
  label.className = "otherAnswerLabel";
  label.setAttribute("for", `other_${q.id}`);
  label.textContent = "Autre réponse (facultatif)";

  const textarea = document.createElement("textarea");
  textarea.className = "otherAnswerInput";
  textarea.id = `other_${q.id}`;
  textarea.rows = 2;
  textarea.placeholder = "Écris une autre réponse ici…";
  textarea.value = otherAnswers[q.id] || "";
  textarea.addEventListener("input", () => {
    otherAnswers[q.id] = textarea.value;
    activeDictationField = textarea;
  });
  textarea.addEventListener("focus", () => {
    activeDictationField = textarea;
  });

  wrap.appendChild(label);
  wrap.appendChild(textarea);
  quizBox.choices.appendChild(wrap);
}

function ensureQuizBox() {
  if (quizBox) return;

  const card = document.querySelector(".card");
  if (!card) return;

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

  quizBox = {
    card,
    title: $id("qTitle"),
    choices: $id("choices"),
    prev: $id("prevBtn"),
    next: $id("nextBtn"),
    hint: $id("hint"),
    speak: $id("speakBtn"),
    mic: $id("micBtn"),
    pictoWrap: $id("qPictoWrap"),

    progressText: $id("progressText"),
    progressPct: $id("progressPct"),
    progressFill: $id("progressFill"),
    progressTrack: document.querySelector(".progressTrack"),
  };

  quizBox.speak?.addEventListener("click", () => {
    const q = getCurrentQuestion();
    if (!q) return;
    speakFR(buildSpeechTextForQuestion(q));
  });

  quizBox.mic?.addEventListener("click", () => toggleDictation());

  quizBox.prev?.addEventListener("click", () => {
    commitCurrentTextAnswerIfAny();
    qIndex = Math.max(0, qIndex - 1);
    renderQuestion();
  });

  quizBox.next?.addEventListener("click", () => {
    commitCurrentTextAnswerIfAny();

    const q = getCurrentQuestion();
    if (!q) return;

    if (isIdentityQuestion(q) && !hasAnyAnswerForQuestion(q)) {
      if (quizBox?.hint) quizBox.hint.textContent = "Nom / prénom / âge : obligatoire pour continuer.";
      focusFirstAnswerField();
      return;
    }

    const required = q.required !== false;
    if (required && !hasAnyAnswerForQuestion(q)) {
      if (quizBox?.hint) quizBox.hint.textContent = "Réponds pour continuer.";
      focusFirstAnswerField();
      return;
    }

    if (quizBox?.hint) quizBox.hint.textContent = "";

    const qs = safeQuestionsArray(questionnaire);
    const last = qIndex === qs.length - 1;

    if (last) renderSummary();
    else {
      qIndex++;
      renderQuestion();
    }
  });
}

function renderQuestion() {
  if (!quizBox) return;

  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  if (recog && listening) {
    try { recog.stop(); } catch (e) {}
    setMicUI(false);
  }

  activeDictationField = null;
  suppressHoverUntil = 0;

  const q = getCurrentQuestion();
  if (!q) {
    alert("Questionnaire vide ou invalide.");
    return;
  }

  quizBox.title.textContent = q.title || "Question";

  updateQuestionPictoTop(q);
  quizBox.choices.innerHTML = "";

  const type = q.type || "single";

  if (type === "scale") {
    renderScaleQuestion(q);
    renderOtherAnswerField(q);
    quizBox.prev.disabled = qIndex === 0;
    quizBox.next.textContent = (qIndex === safeQuestionsArray(questionnaire).length - 1) ? "Terminer →" : "Suivant →";
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
      activeDictationField = textarea;
    });
    textarea.addEventListener("focus", () => {
      activeDictationField = textarea;
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

      input.addEventListener("click", () => {
        suppressHoverUntil = Date.now() + 500;
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

      bindChoiceSpeakInteractions(row, q, c.label);
      bindChoiceSpeakInteractions(label, q, c.label);
      bindChoiceSpeakInteractions(input, q, c.label);

      row.appendChild(input);
      row.appendChild(label);
      quizBox.choices.appendChild(row);
    });

    renderOtherAnswerField(q);
  }

  quizBox.prev.disabled = qIndex === 0;
  quizBox.next.textContent = (qIndex === safeQuestionsArray(questionnaire).length - 1) ? "Terminer →" : "Suivant →";
  updateProgressUI();
}

/* =========================
   Récap + chrono + envoi
   ========================= */
function formatDuration(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getAnswerLabel(q, val) {
  const type = q.type || "single";
  const isMultiple = q.type === "multiple";

  if (type === "scale") {
    const labels = Array.isArray(q.labels) ? q.labels : null;
    if (labels && Number.isFinite(Number(val)) && Number.isFinite(Number(q.min)) && Number.isFinite(Number(q.max))) {
      const min = Number(q.min);
      const max = Number(q.max);
      const n = Number(val);
      const t = (n - min) / (max - min);
      const idx = Math.max(0, Math.min(labels.length - 1, Math.round(t * (labels.length - 1))));
      return String(labels[idx]);
    }
    return String(val ?? "");
  }

  if (type === "text") return String(val ?? "");

  if (isMultiple) {
    const selectedVals = Array.isArray(val) ? val : [];
    return selectedVals
      .map((v) => (q.choices || []).find((c) => c.value === v)?.label)
      .filter(Boolean)
      .join("; ");
  }

  return (q.choices || []).find((c) => c.value === val)?.label || "";
}

function getCombinedAnswerLabel(q, val) {
  const main = getAnswerLabel(q, val);
  const other = getOtherAnswerValue(q.id);

  if (main && other) return `${main} | Autre : ${other}`;
  if (other) return `Autre : ${other}`;
  return main;
}

function getAnswerPictos(q, val) {
  const type = q.type || "single";
  const isMultiple = q.type === "multiple";
  if (type === "text" || type === "scale") return [];

  const pick = (choiceVal) => (q.choices || []).find((c) => c.value === choiceVal);
  if (isMultiple) {
    const arr = Array.isArray(val) ? val : [];
    return arr.map((v) => getChoicePictoFile(pick(v))).filter(Boolean);
  }
  return [getChoicePictoFile(pick(val))].filter(Boolean);
}

/* =========================
   PDF (CAPTURE HTML) — rendu identique + multi-pages + offline OK
   ========================= */
function assertPdfLib() {
  const lib = window.PDFLib;
  if (!lib || !lib.PDFDocument) {
    throw new Error("pdf-lib introuvable. Ajoute ./src/libs/pdf-lib.min.js (local) et charge-le dans le HTML.");
  }
  return lib;
}

function assertHtml2Canvas() {
  const h2c = window.html2canvas;
  if (!h2c) {
    throw new Error("html2canvas introuvable. Ajoute ./src/libs/html2canvas.min.js (local) et charge-le dans le HTML.");
  }
  return h2c;
}

function downloadBytesAsPdf(pdfBytes, filename) {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "recap.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function waitImagesLoaded(container) {
  const imgs = Array.from(container.querySelectorAll("img"));
  const pending = imgs
    .filter((img) => !img.complete)
    .map((img) => new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    }));
  return Promise.all(pending);
}

async function captureElementToCanvas(el) {
  const html2canvas = assertHtml2Canvas();

  await waitImagesLoaded(el);

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: document.documentElement.clientWidth,
    windowHeight: document.documentElement.clientHeight,
  });

  return canvas;
}

function canvasToPngBytes(canvas) {
  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function sliceCanvas(canvas, sliceY, sliceH) {
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = sliceH;
  const ctx = out.getContext("2d");
  ctx.drawImage(canvas, 0, sliceY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
  return out;
}

async function buildPdfFromRecapElement(el) {
  const { PDFDocument } = assertPdfLib();

  const canvas = await captureElementToCanvas(el);

  const pageW = 595.28;
  const pageH = 841.89;

  const margin = 28;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;

  const scale = contentW / canvas.width;
  const scaledTotalH = canvas.height * scale;

  const pdfDoc = await PDFDocument.create();

  const pagesCount = Math.max(1, Math.ceil(scaledTotalH / contentH));

  for (let p = 0; p < pagesCount; p++) {
    const page = pdfDoc.addPage([pageW, pageH]);

    const sliceTopScaled = p * contentH;
    const sliceBottomScaled = Math.min((p + 1) * contentH, scaledTotalH);
    const sliceHScaled = sliceBottomScaled - sliceTopScaled;

    const sliceYpx = Math.round(sliceTopScaled / scale);
    const sliceHpx = Math.min(canvas.height - sliceYpx, Math.round(sliceHScaled / scale));

    const slice = sliceCanvas(canvas, sliceYpx, sliceHpx);
    const pngBytes = canvasToPngBytes(slice);
    const img = await pdfDoc.embedPng(pngBytes);

    const drawW = contentW;
    const drawH = sliceHpx * scale;

    page.drawImage(img, {
      x: margin,
      y: pageH - margin - drawH,
      width: drawW,
      height: drawH,
    });
  }

  return await pdfDoc.save();
}

async function downloadRecapAsPdf(filename = "recap.pdf") {
  const recapEl = $id("pdfArea");
  if (!recapEl) throw new Error("Zone récap introuvable (#pdfArea).");

  const pdfBytes = await buildPdfFromRecapElement(recapEl);
  downloadBytesAsPdf(pdfBytes, filename);
}

/* =========================
   Summary UI
   ========================= */
function renderSummary() {
  commitCurrentTextAnswerIfAny();
  chronoEndMs = Date.now();
  const durationMs = chronoStartMs ? chronoEndMs - chronoStartMs : 0;

  const educatorId = select?.value || "";
  const educLabel = badge?.textContent || "";

  const qs = safeQuestionsArray(questionnaire);

  const summary = qs.map((q) => {
    const val = answers[q.id] ?? "";
    const other = getOtherAnswerValue(q.id);

    return {
      id: q.id,
      question: q.title,
      answer: getCombinedAnswerLabel(q, val),
      rawAnswer: getAnswerLabel(q, val),
      otherAnswer: other,
      qPictos: getQuestionPictoFiles(q),
      aPictos: getAnswerPictos(q, val),
      type: q.type || "single",
    };
  });

  if (!quizBox?.card) return;

  quizBox.card.innerHTML = `
    <div id="pdfArea">
      <h2>Récapitulatif</h2>

      <div class="summaryMeta">
        <span class="metaChip">👤 Éducateur : ${escapeHtml(educLabel)}</span>
        <span class="metaChip">🕒 Durée : ${escapeHtml(formatDuration(durationMs))}</span>
        <span class="metaChip">📅 ${escapeHtml(new Date().toLocaleString("fr-FR"))}</span>
      </div>

      <div class="summaryList" id="summaryList"></div>
    </div>

    <div class="navRow" style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
      <button class="btn secondary" id="editBtn" type="button">← Modifier</button>
      <button class="btn secondary" id="pdfBtn" type="button">📄 Télécharger le PDF</button>
      <button class="btn" id="sendBtn" type="button">✉️ Envoyer au référent</button>
    </div>

    <p class="out" id="sendHint"></p>
  `;

  const list = $id("summaryList");
  if (list) {
    summary.forEach((item) => {
      const qPics = (item.qPictos || [])
        .map((f) => `<img src="${getPictoSrc(f)}" alt="" loading="lazy" onerror="this.style.display='none'"/>`)
        .join("");
      const aPics = (item.aPictos || [])
        .map((f) => `<img src="${getPictoSrc(f)}" alt="" loading="lazy" onerror="this.style.display='none'"/>`)
        .join("");

      const otherHtml = item.otherAnswer
        ? `<div class="summaryOtherAnswer">Autre réponse : ${escapeHtml(item.otherAnswer)}</div>`
        : "";

      const div = document.createElement("div");
      div.className = "summaryCard";
      div.innerHTML = `
        <div class="summaryTop">
          <div style="flex:1;">
            <div class="summaryQTitle">${escapeHtml(item.question)}</div>
            <div class="summaryAnswer">${escapeHtml(item.rawAnswer || "")}</div>
            ${otherHtml}
          </div>
          <div class="summaryPictos" aria-hidden="true">
            ${qPics}${aPics}
          </div>
        </div>
      `;
      list.appendChild(div);
    });
  }

  $id("editBtn")?.addEventListener("click", () => {
    quizBox = null;
    ensureQuizBox();
    renderQuestion();
  });

  $id("pdfBtn")?.addEventListener("click", async () => {
    const safeEduc = normalizeId(educLabel || "educateur") || "educateur";
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `recap_${safeEduc}_${stamp}.pdf`;

    const hint = $id("sendHint");
    if (hint) hint.textContent = "Génération du PDF…";

    try {
      await downloadRecapAsPdf(filename);
      if (hint) hint.textContent = "PDF téléchargé ✅";
    } catch (e) {
      if (hint) hint.textContent = "Erreur PDF ❌";
      alert("Erreur génération PDF ❌\n" + (e?.message || e));
    }
  });

  $id("sendBtn")?.addEventListener("click", async () => {
    const hint = $id("sendHint");
    if (hint) hint.textContent = "Envoi en cours…";

    try {
      const res = await fetch("/.netlify/functions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          educatorId,
          educatorLabel: educLabel,
          summary: summary.map((x) => ({
            question: x.question,
            answer: x.rawAnswer,
            otherAnswer: x.otherAnswer || "",
            combinedAnswer: x.answer,
          })),
          durationSeconds: Math.round(durationMs / 1000),
        }),
      });

      const txt = await res.text();
      if (!res.ok) throw new Error(txt || "Erreur d’envoi");
      if (hint) hint.textContent = "Envoyé ✅";
    } catch (err) {
      if (hint) hint.textContent = "Erreur d’envoi ❌";
      alert("Erreur d’envoi ❌\n" + (err?.message || err));
    }
  });
}

/* =========================
   Events steps
   ========================= */
(btnBack || { addEventListener: noop }).addEventListener("click", () => {
  if (select) select.value = "";
  updateBadge();
  if (btnEducContinue) btnEducContinue.disabled = true;
  showPoleStep();
  if (out) out.textContent = "Clique sur un pôle pour continuer.";
});

(btnEducContinue || { addEventListener: noop }).addEventListener("click", async () => {
  if (!selectedQuestionnaireKey) {
    if (educOut) educOut.textContent = "Choisis d’abord un questionnaire.";
    openOverlay();
    return;
  }
  if (!selectedPole) {
    if (educOut) educOut.textContent = "Choisis d’abord un pôle.";
    showPoleStep();
    return;
  }
  if (!select?.value) {
    if (educOut) educOut.textContent = "Merci de choisir le professionnel avant de continuer.";
    return;
  }

  if (educOut) educOut.textContent = "";
  await loadQuestionnaire();
  if (!safeQuestionsArray(questionnaire).length) return;

  ensureQuizBox();

  chronoStartMs = Date.now();
  chronoEndMs = 0;

  qIndex = 0;
  renderQuestion();
});

(btnPoleContinue || { addEventListener: noop }).addEventListener("click", () => {
  if (!selectedQuestionnaireKey) {
    if (out) out.textContent = "Choisis d’abord un questionnaire.";
    openOverlay();
    return;
  }
  if (out) out.textContent = "Clique sur un pôle pour continuer.";
});

/* =========================
   Init
   ========================= */
function init() {
  if (select) select.addEventListener("change", updateBadge);
  updateBadge();

  populateGroupsSelectCompat();
  renderGroupCards(false);
  showPoleStep();
  if (out) out.textContent = "Choisis d’abord un questionnaire.";
  initModeChoice();
}

init();