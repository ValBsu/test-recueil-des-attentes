/* app.js — épuré SAFE (sans casser)
   Flow:
   1) Overlay -> choisir questionnaire
   2) Choisir pôle (uniquement pôles visibles)
   3) Choisir pro (uniquement pros)
   4) Questionnaire (audio, dictée, pictos, progress)
   5) Récap (chrono + pictos) + envoi netlify
*/

"use strict";

/* =========================
   DOM refs
   ========================= */
const select = document.getElementById("educSelect");
const badge = document.getElementById("educBadge");

const poleStep = document.getElementById("poleStep");
const educStep = document.getElementById("educStep");

const groupSelect = document.getElementById("groupSelect"); // compat (caché)
const groupGrid = document.getElementById("groupGrid");
const educGrid = document.getElementById("educGrid");

const btnPoleContinue = document.getElementById("startBtn");
const btnBack = document.getElementById("backToPolesBtn");
const btnEducContinue = document.getElementById("continueAfterEducBtn");

const out = document.getElementById("out");
const educOut = document.getElementById("educOut");

/* =========================
   Config / State
   ========================= */
const PICTOS_BASE_PATH = "./src/assets/pictos/";
const EDUC_FALC_PICTO_FILE = "FALC.jpg";

let falcHeaderImg = null;

let modeOverlay = null;

let selectedQuestionnaireKey = null;
let questionnairePath = "./src/data/questionnaire.json";
let questionnaire = null;

let fixedPoleFromOverlay = "";
let selectedPole = "";
let qIndex = 0;
let answers = {}; // qId -> value

let quizBox = null;

/* Chrono */
let chronoStartMs = 0;
let chronoEndMs = 0;

/* Dictée */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null;
let listening = false;
let interimBaseValue = "";

/* =========================
   Données (éducateurs / pôles)
   ========================= */
const DEFAULT_EDUC_PHOTO = "./src/assets/avatar.png";

const EDUCATORS = [
  { name: "Alexis Plessis", role: "Éducateur spécialisé", group: "Pôle accueil", photo: DEFAULT_EDUC_PHOTO, id: "alexis" },
  { name: "Morgane Dehaies", role: "Éducatrice spécialisée", group: "Pôle accueil", photo: DEFAULT_EDUC_PHOTO, id: "morgane" },
  { name: "Camille Rouillé", role: "Éducatrice spécialisée", group: "Pôle accueil", photo: DEFAULT_EDUC_PHOTO, id: "camille" },
  { name: "Marina Trottier", role: "Éducatrice spécialisée", group: "Pôle accueil", photo: DEFAULT_EDUC_PHOTO, id: "marina" },
  { name: "Lucile Charrier", role: "Éducatrice spécialisée", group: "Pôle accueil", photo: DEFAULT_EDUC_PHOTO, id: "lucile" },

  { name: "Pauline Martin", role: "Éducatrice spécialisée", group: "Pôle projet", photo: DEFAULT_EDUC_PHOTO, id: "pauline-martin" },
  { name: "Marine Toureau", role: "Monitrice éducatrice", group: "Pôle projet", photo: DEFAULT_EDUC_PHOTO, id: "marine-toureau" },
  { name: "Wilfried Tijou", role: "Éducateur technique", group: "Pôle projet", photo: DEFAULT_EDUC_PHOTO, id: "wilfried-tijou" },
  { name: "Maud Février", role: "Monitrice éducatrice", group: "Pôle projet", photo: DEFAULT_EDUC_PHOTO, id: "maud-fevrier" },
  { name: "Nadège Rétif", role: "Éducatrice spécialisée", group: "Pôle projet", photo: DEFAULT_EDUC_PHOTO, id: "nadege-retif" },
  { name: "Nicolas Marmin", role: "Éducateur spécialisé", group: "Pôle projet", photo: DEFAULT_EDUC_PHOTO, id: "nicolas-marmin" },

  { name: "Karen Goujon", role: "Éducateur spécialisé", group: "Pôle sortie", photo: DEFAULT_EDUC_PHOTO, id: "karen-goujon" },
  { name: "Damien Chautard", role: "Éducateur technique", group: "Pôle sortie", photo: DEFAULT_EDUC_PHOTO, id: "damien-chautard" },
  { name: "Céline", role: "Éducateur spécialisé", group: "Pôle sortie", photo: DEFAULT_EDUC_PHOTO, id: "celine" },
  { name: "Josélita", role: "Éducateur spécialisé", group: "Pôle sortie", photo: DEFAULT_EDUC_PHOTO, id: "joselita" },
  { name: "Marie Boré", role: "Éducateur spécialisé", group: "Pôle sortie", photo: DEFAULT_EDUC_PHOTO, id: "marie-bore" },

  { name: "Pascal Bochard", role: "Éducateur spécialisé", group: "Unité transversale", photo: DEFAULT_EDUC_PHOTO, id: "pascal-bochard" },
  { name: "Julien Fabre", role: "Éducateur spécialisé", group: "Unité transversale", photo: DEFAULT_EDUC_PHOTO, id: "julien-fabre" },
  { name: "Chloé Galand", role: "Éducatrice spécialisée", group: "Unité transversale", photo: DEFAULT_EDUC_PHOTO, id: "chloe-galand" },
  { name: "Audrey Morille", role: "Éducatrice spécialisée", group: "Unité transversale", photo: DEFAULT_EDUC_PHOTO, id: "audrey-morille" },
  { name: "Claire Constanty", role: "Monitrice éducatrice", group: "Unité transversale", photo: DEFAULT_EDUC_PHOTO, id: "claire-constanty" },

  { name: "Matthieu Rivron", role: "Éducateur spécialisé", group: "Unité spécifique", photo: DEFAULT_EDUC_PHOTO, id: "matthieu" },
  { name: "Noémie Rat", role: "Éducatrice spécialisée", group: "Unité spécifique", photo: DEFAULT_EDUC_PHOTO, id: "noemie-rat" },
  { name: "Juliette Rouseau", role: "Monitrice éducatrice", group: "Unité spécifique", photo: DEFAULT_EDUC_PHOTO, id: "juliette-rouseau" },
  { name: "Justine", role: "Monitrice éducatrice", group: "Unité spécifique", photo: DEFAULT_EDUC_PHOTO, id: "justine" },
  { name: "Valentin Bésiau", role: "Moniteur éducateur", group: "Unité spécifique", photo: DEFAULT_EDUC_PHOTO, id: "valentin" },
];

const GROUPS = Array.from(new Set(EDUCATORS.map(e => e.group)));

const QUESTIONNAIRES = [
  { key: "famille", label: "Questionnaire Famille", hint: "Parents / responsables", icon: "👨‍👩‍👧‍👦", path: "./src/data/questionnaire_famille.json" },

  { key: "pole_accueil", label: "Pôle accueil", hint: "Questionnaire Pôle Accueil", icon: "🏠", path: "./src/data/questionnaire_PA.json", fixedPole: "Pôle accueil" },
  // ⚠️ IMPORTANT: vérifie le vrai nom du fichier sur ton disque.
  // Si ton fichier s'appelle encore questionnaire.PP.json, remets-le. Sinon laisse questionnaire_PP.json.
  { key: "pole_projet", label: "Pôle projet", hint: "Questionnaire Pôle Projet", icon: "🧩", path: "./src/data/questionnaire_PP.json", fixedPole: "Pôle projet" },
  { key: "pole_sortie", label: "Pôle sortie", hint: "Questionnaire Pôle Sortie", icon: "🚌", path: "./src/data/questionnaire_PS.json", fixedPole: "Pôle sortie" },

  { key: "unite_transversale", label: "Unité transversale", hint: "Questionnaire Unité Transversale", icon: "🔄", path: "./src/data/questionnaire_UT.json", fixedPole: "Unité transversale" },
  { key: "unite_specifique", label: "Unité spécifique", hint: "Questionnaire Unité Spécifique", icon: "🎯", path: "./src/data/questionnaire_US.json", fixedPole: "Unité spécifique" },
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

/* =========================
   Identité obligatoire (Nom/Prénom/Âge)
   - SAFE: auto-détection par id OU titre
   ========================= */
function isIdentityQuestion(q) {
  const id = String(q?.id || "").toLowerCase();
  const title = String(q?.title || "").toLowerCase();

  const has = (txt, ...words) => words.some(w => txt.includes(w));

  const isFirst = has(id, "prenom", "prénom") || (has(title, "prénom", "prenom") && !has(title, "nom de famille"));
  const isLast  = has(id, "nom") || (has(title, "nom") && !has(title, "prénom", "prenom"));
  const isAge   = has(id, "age", "âge") || has(title, "âge", "age");

  // évite les faux positifs (ex: "nom du référent")
  const forbidden = has(title, "référent", "referent", "educateur", "éducateur", "professionnel", "pôle", "pole");
  if (forbidden) return false;

  return isFirst || isLast || isAge;
}

function isAnswered(val) {
  if (val === undefined || val === null) return false;
  if (Array.isArray(val)) return val.length > 0;
  return String(val).trim() !== "";
}

function focusFirstAnswerField() {
  const el =
    document.querySelector(".textAnswer") ||
    document.querySelector("#choices input[type='radio']") ||
    document.querySelector("#choices input[type='checkbox']") ||
    document.querySelector("#choices input") ||
    null;
  if (el) el.focus();
}

/* =========================
   Audio (cards)
   ========================= */
let lastSpokenText = "";
let speakTimer = null;

function speakHover(text) {
  if (!text) return;
  if (!("speechSynthesis" in window)) return;

  window.clearTimeout(speakTimer);
  speakTimer = window.setTimeout(() => {
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

/* =========================
   Styles injectés (overlay + cards + recap)
   ========================= */
(function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .group-grid, .educ-grid, .qSelectGrid{
      display:grid;
      grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));
      gap:12px;
      margin-top:8px;
    }
    .group-card, .educ-card, .qSelectCard{
      display:flex; align-items:center; gap:12px;
      padding:14px;
      border:1px solid rgba(0,0,0,.12);
      border-radius:16px;
      background:#fff;
      cursor:pointer;
      text-align:left;
      box-shadow: 0 6px 18px rgba(0,0,0,.06);
    }
    .group-card:hover, .educ-card:hover, .qSelectCard:hover{ transform: translateY(-1px); }
    .group-card:active, .educ-card:active, .qSelectCard:active{transform:scale(.995)}
    .group-card.is-selected, .educ-card.is-selected{outline:3px solid rgba(0,0,0,.22)}
    .group-badge, .qSelectBadge{
      width:42px;height:42px;
      border-radius:12px;
      background:rgba(0,0,0,.06);
      display:flex; align-items:center; justify-content:center;
      font-size:20px; flex:0 0 auto;
    }
    .group-name{font-weight:900}
    .educ-photo{width:56px;height:56px;border-radius:50%;object-fit:cover;background:rgba(0,0,0,.06);flex:0 0 auto;}
    .educ-name{font-weight:900}
    .educ-role{opacity:.85}

    #modeOverlay{
      position:fixed; inset:0;
      display:flex; align-items:center; justify-content:center;
      padding:12px;
      background:rgba(255,255,255,.92);
      backdrop-filter: blur(2px);
      z-index: 9999;
    }
    .modePanel{
      width: min(1100px, 100%);
      border:1px solid rgba(0,0,0,.12);
      border-radius:16px;
      padding:14px;
      background:#fff;
      box-shadow: 0 10px 30px rgba(0,0,0,.10);
    }
    .modeTitle{margin:0 0 8px}
    .modeHint{margin:0 0 10px; opacity:.8}
    .qSelectGrid{
      grid-template-columns: repeat(3, minmax(220px, 1fr));
      gap:10px;
    }
    .qSelectCard{ padding:12px; }
    .qSelectTitle{font-weight:900}
    .qSelectHint{opacity:.8; font-size:.95em}
    @media (max-width: 900px){
      .qSelectGrid{ grid-template-columns: repeat(2, minmax(210px, 1fr)); }
    }
    @media (max-width: 560px){
      .qSelectGrid{ grid-template-columns: 1fr; }
    }

    .summaryList{display:flex; flex-direction:column; gap:12px; margin-top:12px}
    .summaryCard{
      border:1px solid rgba(0,0,0,.12);
      border-radius:16px;
      padding:12px;
      background:#fff;
      box-shadow: 0 6px 18px rgba(0,0,0,.05);
    }
    .summaryTop{display:flex; align-items:flex-start; justify-content:space-between; gap:10px}
    .summaryQTitle{font-weight:900; margin:0 0 6px}
    .summaryAnswer{opacity:.95}
    .summaryPictos{display:flex; gap:8px; flex-wrap:wrap; align-items:center}
    .summaryPictos img{height:52px; width:auto; object-fit:contain}
    .summaryMeta{margin-top:10px; display:flex; gap:10px; flex-wrap:wrap}
    .metaChip{
      display:inline-flex; align-items:center; gap:8px;
      padding:8px 10px;
      border:1px solid rgba(0,0,0,.12);
      border-radius:999px;
      background:rgba(0,0,0,.03);
      font-weight:700;
    }

    .qPictoWrap{margin:10px 0 6px;display:flex;justify-content:center;gap:10px;flex-wrap:wrap;}
    .qPicto{height:70px; width:auto; object-fit:contain}
    .choiceRow{display:flex;align-items:center;gap:10px;margin:10px 0;}
    .choiceLabel{display:flex;align-items:center;gap:10px;cursor:pointer;flex:1;}
    .choicePicto{height:44px;width:44px;object-fit:contain;margin-left:auto;}
    .navRow3{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .centerActions{display:flex;align-items:center;justify-content:center;gap:10px;min-width:110px}

  `;
  document.head.appendChild(style);
})();

/* =========================
   FALC header (icône en haut)
   ========================= */
function findHeaderContainerFrom(el) {
  if (!el) return null;
  return el.closest("header") || el.closest(".top") || el.parentElement;
}

function ensureFalcInHeader() {
  if (falcHeaderImg) return;
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
  const label = select.options[select.selectedIndex]?.textContent;
  badge.textContent = label && label !== "— Sélectionner —" ? label : "à choisir";

  ensureFalcInHeader();
  if (falcHeaderImg) falcHeaderImg.style.display = select.value ? "block" : "none";
}

select.addEventListener("change", updateBadge);
updateBadge();

/* =========================
   Navigation steps
   ========================= */
function showPoleStep() {
  poleStep.style.display = "";
  educStep.style.display = "none";
  educOut.textContent = "";
}
function showEducStep() {
  poleStep.style.display = "none";
  educStep.style.display = "";
  out.textContent = "";
}

/* =========================
   Overlay questionnaires
   ========================= */
function setBeforePickState(disabled) {
  // on bloque les interactions essentielles tant que pas de questionnaire
  select.disabled = disabled;
  btnEducContinue.disabled = true;
  // le bouton "Continuer" des pôles sert juste de rappel
  btnPoleContinue.disabled = false;
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
  grid.innerHTML = QUESTIONNAIRES.map(q => `
    <button type="button" class="qSelectCard" data-qkey="${escapeHtml(q.key)}" aria-label="${escapeHtml(q.label)}">
      <div class="qSelectBadge" aria-hidden="true">${escapeHtml(q.icon || "📝")}</div>
      <div>
        <div class="qSelectTitle">${escapeHtml(q.label)}</div>
        <div class="qSelectHint">${escapeHtml(q.hint || "")}</div>
      </div>
    </button>
  `).join("");

  grid.querySelectorAll(".qSelectCard").forEach(btn => {
    const item = QUESTIONNAIRES.find(x => x.key === btn.dataset.qkey);
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
  quizBox = null;
  chronoStartMs = 0;
  chronoEndMs = 0;

  // reset educator
  select.innerHTML = `<option value="">— Sélectionner —</option>`;
  select.value = "";
  updateBadge();
  educGrid.innerHTML = "";

  // rendu pôles cliquables
  renderGroupCards(true);
  showPoleStep();

  out.textContent = fixedPoleFromOverlay
    ? "Choisis le pôle (seul le bon est disponible)."
    : "Choisis d’abord le pôle.";

  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

/* --- Recommencer total (SAFE) --- */
function hardRestart() {
  // relance l’app depuis le tout début (overlay)
  selectedQuestionnaireKey = null;
  questionnairePath = "./src/data/questionnaire.json";
  questionnaire = null;

  fixedPoleFromOverlay = "";
  selectedPole = "";
  qIndex = 0;
  answers = {};
  quizBox = null;

  chronoStartMs = 0;
  chronoEndMs = 0;

  // reset educator
  select.innerHTML = `<option value="">— Sélectionner —</option>`;
  select.value = "";
  updateBadge();
  educGrid.innerHTML = "";

  // reset pôles
  renderGroupCards(false);
  showPoleStep();
  out.textContent = "Choisis d’abord un questionnaire.";

  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  openOverlay();
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
  groupSelect.querySelectorAll("option:not(:first-child)").forEach(o => o.remove());
  GROUPS.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    groupSelect.appendChild(opt);
  });
}

function ensureSelectOption(id, label) {
  if ([...select.options].some(o => o.value === id)) return;
  const opt = document.createElement("option");
  opt.value = id;
  opt.textContent = label;
  select.appendChild(opt);
}

function renderEducatorsForGroup(group) {
  educGrid.innerHTML = "";
  const list = EDUCATORS.filter(e => e.group === group);

  if (!list.length) {
    educOut.textContent = "Aucun professionnel trouvé pour ce pôle.";
    return;
  }

  list.forEach(e => {
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

    card.addEventListener("click", () => {
      const id = e.id || normalizeId(e.name);
      ensureSelectOption(id, e.name);

      select.value = id;
      updateBadge();

      educGrid.querySelectorAll(".educ-card").forEach(el => el.classList.remove("is-selected"));
      card.classList.add("is-selected");

      btnEducContinue.disabled = false;
      educOut.textContent = "";
    });

    educGrid.appendChild(card);
  });
}

function highlightSelectedPoleCard(name) {
  groupGrid.querySelectorAll(".group-card").forEach(el => {
    el.classList.toggle("is-selected", el.dataset.group === name);
  });
}

function renderGroupCards(enabled) {
  groupGrid.innerHTML = "";

  GROUPS.forEach(g => {
    const locked = !!fixedPoleFromOverlay;
    const isAllowed = !locked || fixedPoleFromOverlay === g;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "group-card";
    card.dataset.group = g;

    card.disabled = !enabled || !isAllowed;
    card.style.opacity = (enabled && isAllowed) ? "" : "0.45";
    card.style.cursor = (enabled && isAllowed) ? "" : "not-allowed";

    const icon = g.includes("accueil") ? "🏠"
      : g.includes("projet") ? "🧩"
      : g.includes("sortie") ? "🚌"
      : g.includes("transversale") ? "🔄"
      : g.includes("spécifique") ? "🎯"
      : "🏷️";

    card.innerHTML = `
      <div class="group-badge" aria-hidden="true">${icon}</div>
      <div class="group-name">${escapeHtml(g)}</div>
    `;

    card.addEventListener("mouseenter", () => (enabled && isAllowed) && speakHover(g));
    card.addEventListener("focus", () => (enabled && isAllowed) && speakHover(g));

    card.addEventListener("click", () => {
      if (!enabled || !isAllowed) return;

      selectedPole = g;
      if (groupSelect) groupSelect.value = g;

      highlightSelectedPoleCard(g);

      // bascule vers pros
      select.value = "";
      updateBadge();
      btnEducContinue.disabled = true;

      showEducStep();
      renderEducatorsForGroup(g);
      educOut.textContent = "Choisis le professionnel, puis Continuer.";
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
  files.forEach(file => {
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

function commitCurrentTextAnswerIfAny() {
  if (!questionnaire) return;
  const q = getCurrentQuestion();
  if (!q) return;
  if ((q?.type || "single") !== "text") return;
  const ta = document.querySelector(".textAnswer");
  if (ta) answers[q.id] = ta.value;
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
      if (q) answers[q.id] = ta.value;
      interimBaseValue = ta.value.trim();
    } else if (interim) {
      ta.value = (base + interim).trim();
    }
  };

  recog.onerror = (e) => {
    setMicUI(false);
    if (e?.error === "not-allowed") alert("Autorise l’accès au micro pour utiliser la dictée.");
  };

  recog.onend = () => {
    setMicUI(false);
    commitCurrentTextAnswerIfAny();
  };
}

function toggleDictation() {
  const q = getCurrentQuestion();
  if (!q) return;

  if ((q?.type || "single") !== "text") {
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
    try { recog.stop(); } catch (e) {}
    setMicUI(false);
    commitCurrentTextAnswerIfAny();
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
  const type = q.type || "single";
  if (type === "text") return `${q.title}. Réponse libre.`;
  if (type === "scale") return `${q.title}. Déplace le curseur.`;

  const choices = (q.choices || []).map(c => c.label).join(". ");
  return choices ? `${q.title}. Choix possibles : ${choices}.` : `${q.title}.`;
}

function renderScaleQuestion(q) {
  const min = Number.isFinite(q.min) ? q.min : 1;
  const max = Number.isFinite(q.max) ? q.max : 5;
  const step = (q.step !== undefined && q.step !== null && q.step !== "") ? String(q.step) : "any";
  const def = Number.isFinite(q.default) ? q.default : (min + max) / 2;

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
  facesRow.innerHTML = faces.map(f => `<div class="scaleFace" aria-hidden="true">${f}</div>`).join("");

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
    if (!q) return;
    speakFR(buildSpeechTextForQuestion(q));
  });

  quizBox.mic.addEventListener("click", () => toggleDictation());

  quizBox.prev.addEventListener("click", () => {
    commitCurrentTextAnswerIfAny();
    qIndex = Math.max(0, qIndex - 1);
    renderQuestion();
  });

  quizBox.next.addEventListener("click", () => {
    commitCurrentTextAnswerIfAny();

    const q = getCurrentQuestion();
    if (!q) return;

    const val = answers[q.id];

    // Blocage universel : identité obligatoire
    if (isIdentityQuestion(q) && !isAnswered(val)) {
      quizBox.hint.textContent = "Nom / prénom / âge : obligatoire pour continuer.";
      focusFirstAnswerField();
      return;
    }

    // Blocage normal : required (par défaut true)
    const required = q.required !== false;
    if (required && !isAnswered(val)) {
      quizBox.hint.textContent = "Réponds pour continuer.";
      focusFirstAnswerField();
      return;
    }

    quizBox.hint.textContent = "";

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
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  if (recog && listening) {
    try { recog.stop(); } catch (e) {}
    setMicUI(false);
  }

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
    textarea.addEventListener("input", () => (answers[q.id] = textarea.value));
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
            // ✅ énonce seulement quand on coche
            speakFR(c.label);
          } else {
            arr = arr.filter(v => v !== c.value);
          }
          answers[q.id] = arr;
        } else {
          answers[q.id] = c.value;
          // ✅ énonce à chaque sélection radio
          speakFR(c.label);
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
      .map(v => (q.choices || []).find(c => c.value === v)?.label)
      .filter(Boolean)
      .join("; ");
  }

  return (q.choices || []).find(c => c.value === val)?.label || "";
}

function getAnswerPictos(q, val) {
  const type = q.type || "single";
  const isMultiple = q.type === "multiple";
  if (type === "text" || type === "scale") return [];

  const pick = (choiceVal) => (q.choices || []).find(c => c.value === choiceVal);
  if (isMultiple) {
    const arr = Array.isArray(val) ? val : [];
    return arr.map(v => getChoicePictoFile(pick(v))).filter(Boolean);
  }
  return [getChoicePictoFile(pick(val))].filter(Boolean);
}

function renderSummary() {
  commitCurrentTextAnswerIfAny();
  chronoEndMs = Date.now();
  const durationMs = chronoStartMs ? (chronoEndMs - chronoStartMs) : 0;

  const educatorId = select.value;
  const educLabel = badge.textContent;

  const qs = safeQuestionsArray(questionnaire);

  const summary = qs.map(q => {
    const val = answers[q.id] ?? "";
    return {
      id: q.id,
      question: q.title,
      answer: getAnswerLabel(q, val),
      qPictos: getQuestionPictoFiles(q),
      aPictos: getAnswerPictos(q, val),
    };
  });

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

    <div class="navRow" style="margin-top:14px;">
      <button class="btn secondary" id="editBtn" type="button">← Modifier</button>
      <button class="btn" id="sendBtn" type="button">✉️ Envoyer au référent</button>
    </div>

    <p class="out" id="sendHint"></p>
  `;

  const list = document.getElementById("summaryList");
  summary.forEach(item => {
    const qPics = (item.qPictos || []).map(f => `
      <img src="${getPictoSrc(f)}" alt="" loading="lazy" onerror="this.style.display='none'"/>
    `).join("");
    const aPics = (item.aPictos || []).map(f => `
      <img src="${getPictoSrc(f)}" alt="" loading="lazy" onerror="this.style.display='none'"/>
    `).join("");

    const div = document.createElement("div");
    div.className = "summaryCard";
    div.innerHTML = `
      <div class="summaryTop">
        <div style="flex:1;">
          <div class="summaryQTitle">${escapeHtml(item.question)}</div>
          <div class="summaryAnswer">${escapeHtml(item.answer || "")}</div>
        </div>
        <div class="summaryPictos" aria-hidden="true">
          ${qPics}${aPics}
        </div>
      </div>
    `;
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
          summary: summary.map(x => ({ question: x.question, answer: x.answer })),
          durationSeconds: Math.round(durationMs / 1000),
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
   Events steps
   ========================= */
btnBack.addEventListener("click", () => {
  // retour aux pôles (sans reset questionnaire choisi)
  select.value = "";
  updateBadge();
  btnEducContinue.disabled = true;
  showPoleStep();
  out.textContent = "Clique sur un pôle pour continuer.";
});

btnEducContinue.addEventListener("click", async () => {
  if (!selectedQuestionnaireKey) {
    educOut.textContent = "Choisis d’abord un questionnaire.";
    openOverlay();
    return;
  }
  if (!selectedPole) {
    educOut.textContent = "Choisis d’abord un pôle.";
    showPoleStep();
    return;
  }
  if (!select.value) {
    educOut.textContent = "Merci de choisir le professionnel avant de continuer.";
    return;
  }

  educOut.textContent = "";
  await loadQuestionnaire();
  if (!safeQuestionsArray(questionnaire).length) return;

  ensureQuizBox();

  chronoStartMs = Date.now();
  chronoEndMs = 0;

  qIndex = 0;
  renderQuestion();
});

btnPoleContinue.addEventListener("click", () => {
  if (!selectedQuestionnaireKey) {
    out.textContent = "Choisis d’abord un questionnaire.";
    openOverlay();
    return;
  }
  out.textContent = "Clique sur un pôle pour continuer.";
});

/* =========================
   Init
   ========================= */
function init() {
  populateGroupsSelectCompat();
  renderGroupCards(false);
  showPoleStep();
  out.textContent = "Choisis d’abord un questionnaire.";
  initModeChoice();
}

init();
