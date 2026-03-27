/* app.js — épuré SAFE + multilingue V1
   Flow:
   1) Overlay -> choisir questionnaire
   2) Choisir pôle
   3) Choisir pro
   4) Questionnaire
   5) Récap + envoi netlify + PDF
*/

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

/* Dictée */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null;
let listening = false;
let interimBaseValue = "";
let activeDictationField = null;

/* Hover audio */
let suppressHoverUntil = 0;

/* Langue */
const LANGS = ["fr", "en", "ar"];
let currentLang = localStorage.getItem("recueil_lang") || "fr";
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

  { name: "Marie Caillaud", role: "Éducatrice spécialisée", group: "SESSAD", photo: DEFAULT_EDUC_PHOTO, id: "marie-caillaud" },
  { name: "Lucie Chaillou", role: "Conseillère CESF", group: "SESSAD", photo: DEFAULT_EDUC_PHOTO, id: "lucie-chaillou" },
  { name: "Claire Ilias-Pillet", role: "Éducatrice spécialisée", group: "SESSAD", photo: DEFAULT_EDUC_PHOTO, id: "claire-ilias-pillet" },

  { name: "Laura Roger", role: "Conseillère CESF", group: "Ulis", photo: DEFAULT_EDUC_PHOTO, id: "laura-roger" }
];

const GROUPS = Array.from(new Set(EDUCATORS.map((e) => e.group)));

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

function shouldShowOtherAnswerField(q) {
  return (q?.type || "single") !== "text";
}

function getOtherAnswerValue(qId) {
  return String(otherAnswers[qId] || "").trim();
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

function getQuestionTitle(q) {
  return getLocalizedValue(q?.title);
}

function getQuestionPlaceholder(q) {
  return getLocalizedValue(q?.placeholder) || t("text_placeholder_default");
}

function getChoiceLabel(choice) {
  return getLocalizedValue(choice?.label);
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
  localStorage.setItem("recueil_lang", currentLang);
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
   Identité obligatoire
   ========================= */
function isIdentityQuestion(q) {
  const id = String(q?.id || "").toLowerCase();
  const title = getSearchableText(q?.title);

  const has = (txt, ...words) => words.some((w) => txt.includes(w));

  const isFirst = has(id, "prenom", "prénom") || (has(title, "prénom", "prenom", "first name") && !has(title, "nom de famille", "last name"));
  const isLast = has(id, "nom") || has(title, "nom", "last name");
  const isAge = has(id, "age", "âge") || has(title, "âge", "age");

  const forbidden = has(title, "référent", "referent", "educateur", "éducateur", "professionnel", "professional", "pôle", "pole");
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

function getSpeechLang() {
  return SPEECH_LANG_MAP[currentLang] || "fr-FR";
}

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
    u.lang = getSpeechLang();
    u.rate = 0.95;
    u.pitch = 0.9;
    window.speechSynthesis.speak(u);
  }, 120);
}

function speakText(text) {
  if (!text) return;
  if (!("speechSynthesis" in window)) {
    alert(t("audio_unavailable"));
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = getSpeechLang();
  u.rate = 0.95;
  u.pitch = 0.9;
  window.speechSynthesis.speak(u);
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
    speakText(text);
  });

  target.addEventListener("touchstart", () => {
    speakText(text);
  }, { passive: true });
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
  badge.textContent = label && label !== "— Sélectionner —" ? label : t("educator_to_choose");

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
    <div class="modePanel" role="dialog" aria-modal="true" aria-label="${escapeHtml(t("overlay_title"))}">
      <h2 class="modeTitle">${escapeHtml(t("overlay_title"))}</h2>
      <p class="modeHint">${escapeHtml(t("overlay_hint"))}</p>
      <div class="qSelectGrid" id="qSelectGrid"></div>
    </div>
  `;

  const grid = modeOverlay.querySelector("#qSelectGrid");
  if (!grid) return;

  grid.innerHTML = QUESTIONNAIRES.map((q) => `
    <button type="button" class="qSelectCard" data-qkey="${escapeHtml(q.key)}" aria-label="${escapeHtml(getQuestionnaireMetaText(q, "label"))}">
      <div class="qSelectBadge" aria-hidden="true">${escapeHtml(q.icon || "📝")}</div>
      <div>
        <div class="qSelectTitle">${escapeHtml(getQuestionnaireMetaText(q, "label"))}</div>
        <div class="qSelectHint">${escapeHtml(getQuestionnaireMetaText(q, "hint"))}</div>
      </div>
    </button>
  `).join("");

  grid.querySelectorAll(".qSelectCard").forEach((btn) => {
    const item = QUESTIONNAIRES.find((x) => x.key === btn.dataset.qkey);
    if (!item) return;

    btn.addEventListener("mouseenter", () => speakHover(getQuestionnaireMetaText(item, "label")));
    btn.addEventListener("focus", () => speakHover(getQuestionnaireMetaText(item, "label")));
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
    out.textContent = fixedPoleFromOverlay ? t("overlay_locked_pole") : t("overlay_choose_pole");
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
    if (educOut) educOut.textContent = t("no_professional_found");
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
    card.addEventListener("touchstart", () => speakText(speakText), { passive: true });

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
   Dictée
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
  quizBox.mic.title = on ? t("stop_dictation") : t("dictate_answer");
}

function commitCurrentTextAnswerIfAny() {
  const fields = getVisibleTextInputs();
  fields.forEach((field) => saveTextareaValueToState(field));
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

  quizBox.progressText.textContent = `${t("question_word")} ${current}/${total}`;
  quizBox.progressPct.textContent = `${pct}%`;
  quizBox.progressFill.style.width = `${pct}%`;
  quizBox.progressTrack?.setAttribute("aria-valuenow", String(pct));
}

/* =========================
   Questionnaire UI
   ========================= */
function buildSpeechTextForQuestion(q) {
  return getQuestionTitle(q) || t("question_word");
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
  label.textContent = t("other_answer_label");

  const textarea = document.createElement("textarea");
  textarea.className = "otherAnswerInput";
  textarea.id = `other_${q.id}`;
  textarea.rows = 2;
  textarea.placeholder = t("other_answer_placeholder");
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
      <button class="btn secondary" id="prevBtn" type="button">${escapeHtml(t("previous"))}</button>

      <div class="centerActions" aria-label="Actions audio et dictée">
        <button class="iconBtn" id="speakBtn" type="button" title="${escapeHtml(t("speak_question"))}">🔊</button>
        <button class="iconBtn" id="micBtn" type="button" title="${escapeHtml(t("dictate_answer"))}">🎤</button>
      </div>

      <button class="btn" id="nextBtn" type="button">${escapeHtml(t("next"))}</button>
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
    progressTrack: document.querySelector(".progressTrack")
  };

  quizBox.speak?.addEventListener("click", () => {
    const q = getCurrentQuestion();
    if (!q) return;
    speakText(buildSpeechTextForQuestion(q));
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
      if (quizBox?.hint) quizBox.hint.textContent = t("identity_required");
      focusFirstAnswerField();
      return;
    }

    const required = q.required !== false;
    if (required && !hasAnyAnswerForQuestion(q)) {
      if (quizBox?.hint) quizBox.hint.textContent = t("answer_required");
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
    alert(t("questionnaire_missing"));
    return;
  }

  quizBox.title.textContent = getQuestionTitle(q);

  updateQuestionPictoTop(q);
  quizBox.choices.innerHTML = "";

  const type = q.type || "single";

  if (quizBox.prev) quizBox.prev.textContent = t("previous");
  if (quizBox.speak) quizBox.speak.title = t("speak_question");
  if (quizBox.mic) quizBox.mic.title = listening ? t("stop_dictation") : t("dictate_answer");

  if (type === "scale") {
    renderScaleQuestion(q);
    renderOtherAnswerField(q);
    quizBox.prev.disabled = qIndex === 0;
    quizBox.next.textContent = (qIndex === safeQuestionsArray(questionnaire).length - 1) ? t("finish") : t("next");
    updateProgressUI();
    return;
  }

  if (type === "text") {
    const textarea = document.createElement("textarea");
    textarea.className = "textAnswer";
    textarea.rows = 4;
    textarea.placeholder = getQuestionPlaceholder(q);
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
      span.textContent = getChoiceLabel(c);
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

      bindChoiceSpeakInteractions(row, q, getChoiceLabel(c));
      bindChoiceSpeakInteractions(label, q, getChoiceLabel(c));
      bindChoiceSpeakInteractions(input, q, getChoiceLabel(c));

      row.appendChild(input);
      row.appendChild(label);
      quizBox.choices.appendChild(row);
    });

    renderOtherAnswerField(q);
  }

  quizBox.prev.disabled = qIndex === 0;
  quizBox.next.textContent = (qIndex === safeQuestionsArray(questionnaire).length - 1) ? t("finish") : t("next");
  updateProgressUI();
}

/* =========================
   Récap
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
      const tNum = (n - min) / (max - min);
      const idx = Math.max(0, Math.min(labels.length - 1, Math.round(tNum * (labels.length - 1))));
      return String(labels[idx]);
    }
    return String(val ?? "");
  }

  if (type === "text") return String(val ?? "");

  if (isMultiple) {
    const selectedVals = Array.isArray(val) ? val : [];
    return selectedVals
      .map((v) => getChoiceLabel((q.choices || []).find((c) => c.value === v)))
      .filter(Boolean)
      .join("; ");
  }

  return getChoiceLabel((q.choices || []).find((c) => c.value === val)) || "";
}

function getCombinedAnswerLabel(q, val) {
  const main = getAnswerLabel(q, val);
  const other = getOtherAnswerValue(q.id);

  if (main && other) return `${main} | ${t("summary_other_answer")} ${other}`;
  if (other) return `${t("summary_other_answer")} ${other}`;
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
   PDF
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
    windowHeight: document.documentElement.clientHeight
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
      height: drawH
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
      question: getQuestionTitle(q),
      answer: getCombinedAnswerLabel(q, val),
      rawAnswer: getAnswerLabel(q, val),
      otherAnswer: other,
      qPictos: getQuestionPictoFiles(q),
      aPictos: getAnswerPictos(q, val),
      type: q.type || "single"
    };
  });

  if (!quizBox?.card) return;

  const localeMap = { fr: "fr-FR", en: "en-US", ar: "ar-MA" };
  const dateString = new Date().toLocaleString(localeMap[currentLang] || "fr-FR");

  quizBox.card.innerHTML = `
    <div id="pdfArea">
      <h2>${escapeHtml(t("summary_title"))}</h2>

      <div class="summaryMeta">
        <span class="metaChip">${escapeHtml(t("summary_educator"))} ${escapeHtml(educLabel)}</span>
        <span class="metaChip">${escapeHtml(t("summary_duration"))} ${escapeHtml(formatDuration(durationMs))}</span>
        <span class="metaChip">📅 ${escapeHtml(dateString)}</span>
      </div>

      <div class="summaryList" id="summaryList"></div>
    </div>

    <div class="navRow" style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
      <button class="btn secondary" id="editBtn" type="button">${escapeHtml(t("edit"))}</button>
      <button class="btn secondary" id="pdfBtn" type="button">${escapeHtml(t("download_pdf"))}</button>
      <button class="btn" id="sendBtn" type="button">${escapeHtml(t("send_to_referent"))}</button>
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
        ? `<div class="summaryOtherAnswer">${escapeHtml(t("summary_other_answer"))} ${escapeHtml(item.otherAnswer)}</div>`
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
    if (hint) hint.textContent = t("generating_pdf");

    try {
      await downloadRecapAsPdf(filename);
      if (hint) hint.textContent = t("pdf_downloaded");
    } catch (e) {
      if (hint) hint.textContent = t("pdf_error");
      alert(`${t("pdf_error")}\n${e?.message || e}`);
    }
  });

  $id("sendBtn")?.addEventListener("click", async () => {
    const hint = $id("sendHint");
    if (hint) hint.textContent = t("sending");

    try {
      const res = await fetch("/.netlify/functions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          educatorId,
          educatorLabel: educLabel,
          lang: currentLang,
          summary: summary.map((x) => ({
            question: x.question,
            answer: x.rawAnswer,
            otherAnswer: x.otherAnswer || "",
            combinedAnswer: x.answer
          })),
          durationSeconds: Math.round(durationMs / 1000)
        })
      });

      const txt = await res.text();
      if (!res.ok) throw new Error(txt || "Erreur d’envoi");
      if (hint) hint.textContent = t("sent");
    } catch (err) {
      if (hint) hint.textContent = t("send_error");
      alert(`${t("send_error")}\n${err?.message || err}`);
    }
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
    out.textContent = fixedPoleFromOverlay ? t("overlay_locked_pole") : t("overlay_choose_pole");
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

/* =========================
   Init
   ========================= */
function init() {
  applyLanguageToDocument();
  bindLanguageButtons();

  if (select) select.addEventListener("change", updateBadge);
  updateBadge();

  populateGroupsSelectCompat();
  renderGroupCards(false);
  showPoleStep();
  if (out) out.textContent = t("choose_questionnaire_first");
  initModeChoice();
  refreshStaticTexts();
}

init();