"use strict";

/* =========================
   Helpers DOM
   ========================= */
const $id = (id) => document.getElementById(id);
const noop = () => {};

/* =========================
   DOM refs
   ========================= */
const select = $id("educSelect");
const badge = $id("educBadge");
const badgeLabel = $id("educBadgeLabel");

const poleStep = $id("poleStep");
const educStep = $id("educStep");

const groupSelect = $id("groupSelect");
const groupGrid = $id("groupGrid");
const educGrid = $id("educGrid");

const btnPoleContinue = $id("startBtn");
const btnBack = $id("backToPolesBtn");
const btnEducContinue = $id("continueAfterEducBtn");

const out = $id("out");
const educOut = $id("educOut");

const skipLink = $id("skipLink");
const siteSub = $id("siteSub");
const poleStepTitle = $id("poleStepTitle");
const educStepTitle = $id("educStepTitle");
const langSwitcher = $id("langSwitcher");

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
let answers = {};
let otherAnswers = {};

let quizBox = null;

let chronoStartMs = 0;
let chronoEndMs = 0;

/* Langue */
const LANGS = ["fr", "en", "ar"];
let currentLang = "fr";
if (!LANGS.includes(currentLang)) currentLang = "fr";

const SPEECH_LANG_MAP = {
  fr: "fr-FR",
  en: "en-US",
  ar: "ar-SA"
};

const UI = {
  fr: {
    skip_to_content: "Aller au contenu",
    subtitle: "Questionnaire accessible – FALC & audio",
    educator_label: "👤 Éducateur :",
    educator_to_choose: "à choisir",
    choose_pole: "Choisir le pôle",
    choose_professional: "Choisir le professionnel",
    continue: "Continuer",
    back: "← Retour",
    choose_questionnaire_first: "Choisis d’abord un questionnaire.",
    click_pole_to_continue: "Clique sur un pôle pour continuer.",
    choose_pole_first: "Choisis d’abord un pôle.",
    choose_professional_first: "Merci de choisir le professionnel avant de continuer.",
    choose_professional_then_continue: "Choisis le professionnel, puis Continuer.",
    no_professional_found: "Aucun professionnel trouvé pour ce pôle.",
    overlay_title: "Choisis ton questionnaire",
    overlay_hint: "Sélectionne le bon questionnaire avant de continuer.",
    overlay_locked_pole: "Choisis le pôle (seul le bon est disponible).",
    overlay_choose_pole: "Choisis d’abord le pôle.",
    question_word: "Question",
    previous: "← Précédent",
    next: "Suivant →",
    finish: "Terminer →",
    speak_question: "Énoncer la question",
    dictate_answer: "Dicter la réponse",
    stop_dictation: "Arrêter la dictée",
    dictation_unsupported: "Dictée automatique non supportée ici. Utilise le micro du clavier.",
    dictation_micro_authorize: "Autorise l’accès au micro pour utiliser la dictée.",
    no_textarea_for_dictation: "Aucune zone de texte disponible pour la dictée.",
    other_answer_label: "Autre réponse (facultatif)",
    other_answer_placeholder: "Écris une autre réponse ici…",
    text_placeholder_default: "Écris ta réponse ici…",
    identity_required: "Nom / prénom / âge : obligatoire pour continuer.",
    answer_required: "Réponds pour continuer.",
    summary_title: "Récapitulatif",
    summary_educator: "👤 Éducateur :",
    summary_duration: "🕒 Durée :",
    summary_other_answer: "Autre réponse :",
    edit: "← Modifier",
    download_pdf: "📄 Télécharger le PDF",
    send_to_referent: "✉️ Envoyer au référent",
    generating_pdf: "Génération du PDF…",
    pdf_downloaded: "PDF téléchargé ✅",
    pdf_error: "Erreur PDF ❌",
    sending: "Envoi en cours…",
    sent: "Envoyé ✅",
    send_error: "Erreur d’envoi ❌",
    questionnaire_missing: "Questionnaire introuvable ou vide. Vérifie le nom du fichier JSON.",
    audio_unavailable: "Audio non disponible sur ce navigateur.",
    q_family_label: "Questionnaire Famille",
    q_family_hint: "Parents / responsables",
    q_pole_accueil_label: "Pôle accueil",
    q_pole_accueil_hint: "Questionnaire Pôle Accueil",
    q_pole_projet_label: "Pôle projet",
    q_pole_projet_hint: "Questionnaire Pôle Projet",
    q_pole_sortie_label: "Pôle sortie",
    q_pole_sortie_hint: "Questionnaire Pôle Sortie",
    q_ut_label: "Unité transversale",
    q_ut_hint: "Questionnaire Unité Transversale",
    q_us_label: "Unité spécifique",
    q_us_hint: "Questionnaire Unité Spécifique",
    q_ulis_label: "ULIS",
    q_ulis_hint: "Questionnaire Pôle ULIS",
    q_sessad_label: "SESSAD",
    q_sessad_hint: "Questionnaire Pôle SESSAD"
  },
  en: {
    skip_to_content: "Skip to content",
    subtitle: "Accessible questionnaire – Easy to read & audio",
    educator_label: "👤 Professional:",
    educator_to_choose: "to choose",
    choose_pole: "Choose the unit",
    choose_professional: "Choose the professional",
    continue: "Continue",
    back: "← Back",
    choose_questionnaire_first: "Choose a questionnaire first.",
    click_pole_to_continue: "Click on a unit to continue.",
    choose_pole_first: "Choose a unit first.",
    choose_professional_first: "Please choose the professional before continuing.",
    choose_professional_then_continue: "Choose the professional, then Continue.",
    no_professional_found: "No professional found for this unit.",
    overlay_title: "Choose your questionnaire",
    overlay_hint: "Select the correct questionnaire before continuing.",
    overlay_locked_pole: "Choose the unit (only the correct one is available).",
    overlay_choose_pole: "Choose the unit first.",
    question_word: "Question",
    previous: "← Previous",
    next: "Next →",
    finish: "Finish →",
    speak_question: "Read the question aloud",
    dictate_answer: "Dictate the answer",
    stop_dictation: "Stop dictation",
    dictation_unsupported: "Automatic dictation is not supported here. Use the keyboard microphone.",
    dictation_micro_authorize: "Allow microphone access to use dictation.",
    no_textarea_for_dictation: "No text field is available for dictation.",
    other_answer_label: "Other answer (optional)",
    other_answer_placeholder: "Write another answer here…",
    text_placeholder_default: "Write your answer here…",
    identity_required: "Last name / first name / age: required to continue.",
    answer_required: "Answer to continue.",
    summary_title: "Summary",
    summary_educator: "👤 Professional:",
    summary_duration: "🕒 Duration:",
    summary_other_answer: "Other answer:",
    edit: "← Edit",
    download_pdf: "📄 Download PDF",
    send_to_referent: "✉️ Send to the referent",
    generating_pdf: "Generating PDF…",
    pdf_downloaded: "PDF downloaded ✅",
    pdf_error: "PDF error ❌",
    sending: "Sending…",
    sent: "Sent ✅",
    send_error: "Sending error ❌",
    questionnaire_missing: "Questionnaire not found or empty. Check the JSON filename.",
    audio_unavailable: "Audio is not available on this browser.",
    q_family_label: "Family questionnaire",
    q_family_hint: "Parents / guardians",
    q_pole_accueil_label: "Reception unit",
    q_pole_accueil_hint: "Reception unit questionnaire",
    q_pole_projet_label: "Project unit",
    q_pole_projet_hint: "Project unit questionnaire",
    q_pole_sortie_label: "Exit unit",
    q_pole_sortie_hint: "Exit unit questionnaire",
    q_ut_label: "Transversal unit",
    q_ut_hint: "Transversal unit questionnaire",
    q_us_label: "Specific unit",
    q_us_hint: "Specific unit questionnaire",
    q_ulis_label: "ULIS",
    q_ulis_hint: "ULIS questionnaire",
    q_sessad_label: "SESSAD",
    q_sessad_hint: "SESSAD questionnaire"
  },
  ar: {
    skip_to_content: "الانتقال إلى المحتوى",
    subtitle: "استبيان سهل القراءة مع دعم صوتي",
    educator_label: "👤 المهني:",
    educator_to_choose: "للاختيار",
    choose_pole: "اختر القطب",
    choose_professional: "اختر المهني",
    continue: "متابعة",
    back: "→ رجوع",
    choose_questionnaire_first: "اختر الاستبيان أولاً.",
    click_pole_to_continue: "اضغط على القطب للمتابعة.",
    choose_pole_first: "اختر القطب أولاً.",
    choose_professional_first: "يرجى اختيار المهني قبل المتابعة.",
    choose_professional_then_continue: "اختر المهني ثم تابع.",
    no_professional_found: "لم يتم العثور على مهني لهذا القطب.",
    overlay_title: "اختر الاستبيان",
    overlay_hint: "اختر الاستبيان المناسب قبل المتابعة.",
    overlay_locked_pole: "اختر القطب (المتاح فقط هو الصحيح).",
    overlay_choose_pole: "اختر القطب أولاً.",
    question_word: "السؤال",
    previous: "→ السابق",
    next: "التالي ←",
    finish: "إنهاء ←",
    speak_question: "قراءة السؤال",
    dictate_answer: "إملاء الإجابة",
    stop_dictation: "إيقاف الإملاء",
    dictation_unsupported: "الإملاء التلقائي غير مدعوم هنا. استخدم ميكروفون لوحة المفاتيح.",
    dictation_micro_authorize: "اسمح بالوصول إلى الميكروفون لاستخدام الإملاء.",
    no_textarea_for_dictation: "لا توجد خانة نص متاحة للإملاء.",
    other_answer_label: "إجابة أخرى (اختياري)",
    other_answer_placeholder: "اكتب إجابة أخرى هنا…",
    text_placeholder_default: "اكتب إجابتك هنا…",
    identity_required: "الاسم / الاسم الشخصي / العمر: مطلوب للمتابعة.",
    answer_required: "أجب للمتابعة.",
    summary_title: "الملخص",
    summary_educator: "👤 المهني:",
    summary_duration: "🕒 المدة:",
    summary_other_answer: "إجابة أخرى:",
    edit: "→ تعديل",
    download_pdf: "📄 تنزيل PDF",
    send_to_referent: "✉️ إرسال إلى المرجع",
    generating_pdf: "جارٍ إنشاء ملف PDF…",
    pdf_downloaded: "تم تنزيل PDF ✅",
    pdf_error: "خطأ في PDF ❌",
    sending: "جارٍ الإرسال…",
    sent: "تم الإرسال ✅",
    send_error: "خطأ في الإرسال ❌",
    questionnaire_missing: "الاستبيان غير موجود أو فارغ. تحقق من اسم ملف JSON.",
    audio_unavailable: "الصوت غير متوفر على هذا المتصفح.",
    q_family_label: "استبيان العائلة",
    q_family_hint: "الوالدان / المسؤولون",
    q_pole_accueil_label: "قطب الاستقبال",
    q_pole_accueil_hint: "استبيان قطب الاستقبال",
    q_pole_projet_label: "قطب المشروع",
    q_pole_projet_hint: "استبيان قطب المشروع",
    q_pole_sortie_label: "قطب الخروج",
    q_pole_sortie_hint: "استبيان قطب الخروج",
    q_ut_label: "الوحدة العرضية",
    q_ut_hint: "استبيان الوحدة العرضية",
    q_us_label: "الوحدة الخاصة",
    q_us_hint: "استبيان الوحدة الخاصة",
    q_ulis_label: "ULIS",
    q_ulis_hint: "استبيان ULIS",
    q_sessad_label: "SESSAD",
    q_sessad_hint: "استبيان SESSAD"
  }
};

function t(key) {
  return UI[currentLang]?.[key] || UI.fr[key] || key;
}

/* =========================
   Données
   ========================= */
let EDUCATORS = [];
let GROUPS = [];

const EDUCATORS_JSON_PATH = "./src/data/educators.json";

function buildGroupsFromEducators(list) {
  return Array.from(
    new Set(
      list
        .filter((e) => e && e.isActive !== false && e.group)
        .map((e) => e.group)
    )
  );
}

async function loadEducators() {
  try {
    const res = await fetch(EDUCATORS_JSON_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed: ${EDUCATORS_JSON_PATH}`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("educators.json n'est pas un tableau");

    EDUCATORS = data
      .map((e, index) => ({
        id: e?.id || normalizeId(e?.name || `educator-${index + 1}`),
        name: e?.name || "",
        role: e?.role || "",
        group: e?.group || "",
        email: e?.email || "",
        photo: e?.photo || DEFAULT_EDUC_PHOTO,
        isActive: e?.isActive !== false,
        order: Number.isFinite(Number(e?.order)) ? Number(e.order) : index + 1
      }))
      .sort((a, b) => a.order - b.order);

    GROUPS = buildGroupsFromEducators(EDUCATORS);
  } catch (error) {
    console.error("Erreur chargement educators.json :", error);
    EDUCATORS = [];
    GROUPS = [];
  }
}

const QUESTIONNAIRES = [
  {
    key: "famille",
    label: { fr: t("q_family_label"), en: UI.en.q_family_label, ar: UI.ar.q_family_label },
    hint: { fr: t("q_family_hint"), en: UI.en.q_family_hint, ar: UI.ar.q_family_hint },
    icon: "👨‍👩‍👧‍👦",
    path: "./src/data/questionnaire_famille.json"
  },
  {
    key: "pole_accueil",
    label: { fr: t("q_pole_accueil_label"), en: UI.en.q_pole_accueil_label, ar: UI.ar.q_pole_accueil_label },
    hint: { fr: t("q_pole_accueil_hint"), en: UI.en.q_pole_accueil_hint, ar: UI.ar.q_pole_accueil_hint },
    icon: "🏠",
    path: "./src/data/questionnaire_PA.json",
    fixedPole: "Pôle accueil"
  },
  {
    key: "pole_projet",
    label: { fr: t("q_pole_projet_label"), en: UI.en.q_pole_projet_label, ar: UI.ar.q_pole_projet_label },
    hint: { fr: t("q_pole_projet_hint"), en: UI.en.q_pole_projet_hint, ar: UI.ar.q_pole_projet_hint },
    icon: "🧩",
    path: "./src/data/questionnaire_PP.json",
    fixedPole: "Pôle projet"
  },
  {
    key: "pole_sortie",
    label: { fr: t("q_pole_sortie_label"), en: UI.en.q_pole_sortie_label, ar: UI.ar.q_pole_sortie_label },
    hint: { fr: t("q_pole_sortie_hint"), en: UI.en.q_pole_sortie_hint, ar: UI.ar.q_pole_sortie_hint },
    icon: "🚌",
    path: "./src/data/questionnaire_PS.json",
    fixedPole: "Pôle sortie"
  },
  {
    key: "unite_transversale",
    label: { fr: t("q_ut_label"), en: UI.en.q_ut_label, ar: UI.ar.q_ut_label },
    hint: { fr: t("q_ut_hint"), en: UI.en.q_ut_hint, ar: UI.ar.q_ut_hint },
    icon: "🔄",
    path: "./src/data/questionnaire_UT.json",
    fixedPole: "Unité transversale"
  },
  {
    key: "unite_specifique",
    label: { fr: t("q_us_label"), en: UI.en.q_us_label, ar: UI.ar.q_us_label },
    hint: { fr: t("q_us_hint"), en: UI.en.q_us_hint, ar: UI.ar.q_us_hint },
    icon: "🎯",
    path: "./src/data/questionnaire_US.json",
    fixedPole: "Unité spécifique"
  },
  {
    key: "pole_ulis",
    label: { fr: t("q_ulis_label"), en: UI.en.q_ulis_label, ar: UI.ar.q_ulis_label },
    hint: { fr: t("q_ulis_hint"), en: UI.en.q_ulis_hint, ar: UI.ar.q_ulis_hint },
    icon: "🚌",
    path: "./src/data/questionnaire_ULIS.json",
    fixedPole: "Ulis"
  },
  {
    key: "pole_sessad",
    label: { fr: t("q_sessad_label"), en: UI.en.q_sessad_label, ar: UI.ar.q_sessad_label },
    hint: { fr: t("q_sessad_hint"), en: UI.en.q_sessad_hint, ar: UI.ar.q_sessad_hint },
    icon: "🛵",
    path: "./src/data/questionnaire_SESSAD.json",
    fixedPole: "SESSAD"
  }
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

function isFamilyQuestionnaire() {
  return selectedQuestionnaireKey === "famille";
}

function getLocalizedValue(value, lang = currentLang) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    return String(
      value[lang] ??
        value.fr ??
        value.en ??
        Object.values(value)[0] ??
        ""
    );
  }
  return String(value);
}

function getSearchableText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "object") return Object.values(value).join(" ").toLowerCase();
  return String(value).toLowerCase();
}

function applyLanguageToDocument() {
  document.documentElement.lang = currentLang;
  document.body.classList.toggle("lang-ar", currentLang === "ar");
  updateLangButtons();
}

function updateLangButtons() {
  if (!langSwitcher) return;
  langSwitcher.querySelectorAll(".lang-btn").forEach((btn) => {
    const active = btn.dataset.lang === currentLang;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}

/* =========================
   FALC header
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
  badge.textContent =
    label && label !== "— Sélectionner —" ? label : t("educator_to_choose");

  ensureFalcInHeader();
  if (falcHeaderImg) falcHeaderImg.style.display = select.value ? "block" : "none";
}

/* =========================
   Textes UI fixes
   ========================= */
function refreshStaticTexts() {
  if (skipLink) skipLink.textContent = t("skip_to_content");
  if (siteSub) siteSub.textContent = t("subtitle");
  if (badgeLabel) badgeLabel.textContent = t("educator_label");
  if (poleStepTitle) poleStepTitle.textContent = t("choose_pole");
  if (educStepTitle) educStepTitle.textContent = t("choose_professional");

  if (btnPoleContinue) btnPoleContinue.textContent = t("continue");
  if (btnBack) btnBack.textContent = t("back");
  if (btnEducContinue) btnEducContinue.textContent = t("continue");

  if (out && !selectedQuestionnaireKey) out.textContent = t("choose_questionnaire_first");

  renderModeOverlayContent();
  renderGroupCards(!!selectedQuestionnaireKey);

  if (quizBox) {
    renderQuestion();
  }
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

function getQuestionnaireMetaText(item, field) {
  return getLocalizedValue(item?.[field]);
}

function ensureModeOverlay() {
  if (modeOverlay) return modeOverlay;

  modeOverlay = document.createElement("div");
  modeOverlay.id = "modeOverlay";
  document.body.appendChild(modeOverlay);

  renderModeOverlayContent();
  return modeOverlay;
}

function renderModeOverlayContent() {
  if (!modeOverlay) return;

  modeOverlay.innerHTML = `
    <div class="modePanel" role="dialog" aria-modal="true" aria-label="${escapeHtml(
      t("overlay_title")
    )}">
      <h2 class="modeTitle">${escapeHtml(t("overlay_title"))}</h2>
      <p class="modeHint">${escapeHtml(t("overlay_hint"))}</p>
      <div class="qSelectGrid" id="qSelectGrid"></div>
    </div>
  `;

  const grid = modeOverlay.querySelector("#qSelectGrid");
  if (!grid) return;

  grid.innerHTML = QUESTIONNAIRES.map(
    (q) => `
    <button type="button" class="qSelectCard" data-qkey="${escapeHtml(
      q.key
    )}" aria-label="${escapeHtml(getQuestionnaireMetaText(q, "label"))}">
      <div class="qSelectBadge" aria-hidden="true">${escapeHtml(q.icon || "📝")}</div>
      <div>
        <div class="qSelectTitle">${escapeHtml(getQuestionnaireMetaText(q, "label"))}</div>
        <div class="qSelectHint">${escapeHtml(getQuestionnaireMetaText(q, "hint"))}</div>
      </div>
    </button>
  `
  ).join("");

  grid.querySelectorAll(".qSelectCard").forEach((btn) => {
    const item = QUESTIONNAIRES.find((x) => x.key === btn.dataset.qkey);
    if (!item) return;

    btn.addEventListener("mouseenter", () =>
      speakHover(getQuestionnaireMetaText(item, "label"))
    );
    btn.addEventListener("focus", () =>
      speakHover(getQuestionnaireMetaText(item, "label"))
    );
    btn.addEventListener("click", () => onPickQuestionnaire(item));
  });
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
      ? t("overlay_locked_pole")
      : t("overlay_choose_pole");
  }

  resetSpeechState();

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

  const list = EDUCATORS
    .filter((e) => e.group === group && e.isActive !== false)
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

  if (!list.length) {
    if (educOut) educOut.textContent = t("no_professional_found");
    return;
  }

  list.forEach((e) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "educ-card";
    card.innerHTML = `
      <img class="educ-photo" src="${escapeHtml(e.photo || DEFAULT_EDUC_PHOTO)}" alt="" loading="lazy" />
      <div>
        <div class="educ-name">${escapeHtml(e.name)}</div>
        <div class="educ-role">${escapeHtml(e.role)}</div>
      </div>
    `;

    const speakLabel = `${e.name}. ${e.role}.`;
    card.addEventListener("mouseenter", () => speakHover(speakLabel));
    card.addEventListener("focus", () => speakHover(speakLabel));
    card.addEventListener(
      "touchstart",
      () => speakText(speakLabel),
      { passive: true }
    );

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
    const icon = gl.includes("accueil")
      ? "🏠"
      : gl.includes("projet")
      ? "🧩"
      : gl.includes("sortie")
      ? "🚌"
      : gl.includes("transversale")
      ? "🔄"
      : gl.includes("specifique") || gl.includes("spécifique")
      ? "🎯"
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
      if (educOut) educOut.textContent = t("choose_professional_then_continue");
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
    alert(t("questionnaire_missing"));
    questionnaire = { questions: [] };
    return;
  }

  questionnaire = data;
}

/* =========================
   Pictos
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
   Language switcher
   ========================= */
function setLanguage(lang) {
  if (!LANGS.includes(lang)) return;
  currentLang = lang;
  applyLanguageToDocument();
  refreshStaticTexts();
  updateBadge();

  if (selectedQuestionnaireKey && out && poleStep?.style.display !== "none" && !selectedPole) {
    out.textContent = fixedPoleFromOverlay
      ? t("overlay_locked_pole")
      : t("overlay_choose_pole");
  }

  if (selectedPole && educStep?.style.display !== "none" && !select?.value && educOut) {
    educOut.textContent = t("choose_professional_then_continue");
  }
}

function bindLanguageButtons() {
  if (!langSwitcher) return;
  langSwitcher.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
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
  if (out) out.textContent = t("click_pole_to_continue");
});

(btnEducContinue || { addEventListener: noop }).addEventListener("click", async () => {
  if (!selectedQuestionnaireKey) {
    if (educOut) educOut.textContent = t("choose_questionnaire_first");
    openOverlay();
    return;
  }
  if (!selectedPole) {
    if (educOut) educOut.textContent = t("choose_pole_first");
    showPoleStep();
    return;
  }
  if (!select?.value) {
    if (educOut) educOut.textContent = t("choose_professional_first");
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
    if (out) out.textContent = t("choose_questionnaire_first");
    openOverlay();
    return;
  }
  if (out) out.textContent = t("click_pole_to_continue");
});

async function init() {
  applyLanguageToDocument();
  bindLanguageButtons();

  await loadEducators();

  if (select) select.addEventListener("change", updateBadge);
  updateBadge();

  populateGroupsSelectCompat();
  renderGroupCards(false);
  showPoleStep();

  if (out) out.textContent = t("choose_questionnaire_first");

  initModeChoice();
  refreshStaticTexts();
}
init().catch((error) => {
  console.error("Erreur init app :", error);
});