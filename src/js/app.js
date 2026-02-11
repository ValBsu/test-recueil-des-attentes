// app.js (fichier complet corrigé à copier-coller)

const select = document.getElementById("educSelect");
const badge = document.getElementById("educBadge");
const btn = document.getElementById("startBtn");
const out = document.getElementById("out");

// ✅ Dossier de base des pictos (d'après ton arborescence)
const PICTOS_BASE_PATH = "./src/assets/pictos/";

// ✅ Picto FALC dans le blanc tout à droite de la barre du haut
const EDUC_FALC_PICTO_FILE = "FALC.jpg"; // ⚠️ respecte la casse exacte (vu dans ton dossier)
let falcHeaderImg = null;

let questionnaire = null;
let qIndex = 0;
let answers = {}; // qId -> value
let quizBox = null;

/* ------------------- FALC en haut à droite (barre header) ------------------- */
function findEducPillElement() {
  // On remonte depuis le badge sur un “conteneur” plausible
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

  // Le header doit être le repère pour position:absolute
  try {
    const cs = window.getComputedStyle(headerEl);
    if (cs.position === "static") headerEl.style.position = "relative";
  } catch (e) {
    headerEl.style.position = "relative";
  }

  // Réserver un peu de place à droite pour éviter tout chevauchement
  // (on n'écrase pas si déjà défini en inline)
  if (!headerEl.style.paddingRight) headerEl.style.paddingRight = "70px";

  falcHeaderImg = document.createElement("img");
  falcHeaderImg.id = "falcHeaderImg";
  falcHeaderImg.alt = "FALC";
  falcHeaderImg.src = encodeURI(`${PICTOS_BASE_PATH}${EDUC_FALC_PICTO_FILE}`);
  falcHeaderImg.style.display = "none";

  // ✅ position “tout à droite” dans le blanc
  falcHeaderImg.style.position = "absolute";
  falcHeaderImg.style.right = "18px";
  falcHeaderImg.style.top = "50%";
  falcHeaderImg.style.transform = "translateY(-50%)";

  // taille correcte (ajustable)
  falcHeaderImg.style.height = "40px";
  falcHeaderImg.style.width = "40px";
  falcHeaderImg.style.objectFit = "contain";

  // si fichier introuvable => on masque (pas de bug visuel)
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
/* --------------------------------------------------------------------------- */

function updateBadge() {
  const label = select.options[select.selectedIndex]?.textContent;
  badge.textContent = label && label !== "— Sélectionner —" ? label : "à choisir";
  updateFalcHeaderVisibility();
}

select.addEventListener("change", updateBadge);
updateBadge();

async function loadQuestionnaire() {
  const res = await fetch("./src/data/questionnaire.json", { cache: "no-store" });
  questionnaire = await res.json();
}

function getCurrentQuestion() {
  return questionnaire.questions[qIndex];
}

/* ------------------- PICTOS (sous la question, en haut) ------------------- */
// ✅ accepte plusieurs noms de clé possibles sans te forcer à modifier ton JSON
function getQuestionPictoFile(q) {
  return q?.pictogram || q?.picto || q?.pictogramme || "";
}

function getPictoSrc(fileName) {
  if (!fileName) return "";
  return encodeURI(`${PICTOS_BASE_PATH}${fileName}`);
}

// ✅ affiche le picto juste sous le titre de la question (au-dessus des réponses)
function updateQuestionPictoTop(q) {
  if (!quizBox?.pictoWrap || !quizBox?.pictoImg) return;

  const file = getQuestionPictoFile(q);
  const src = getPictoSrc(file);

  if (!src) {
    quizBox.pictoWrap.style.display = "none";
    quizBox.pictoImg.src = "";
    return;
  }

  quizBox.pictoWrap.style.display = "flex";
  quizBox.pictoImg.src = src;
  quizBox.pictoImg.alt = q?.title ? `Pictogramme: ${q.title}` : "Pictogramme";
}
/* ------------------------------------------------------------------------- */

/* ------------------- SCALE (curseur fluide) ------------------- */
function renderScaleQuestion(q) {
  const min = Number.isFinite(q.min) ? q.min : 1;
  const max = Number.isFinite(q.max) ? q.max : 5;

  // ✅ fluide par défaut
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

  // Labels (optionnels, pour le résumé surtout)
  const labels = Array.isArray(q.labels)
    ? q.labels
    : ["Très mal", "Mal", "Bof", "Bien", "Très bien"];

  // Visages au-dessus (emoji simples)
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
  range.step = step; // ✅ "any" = fluide
  range.value = String(value);
  range.className = "scaleRange";

  // Stockage fluide (décimal possible)
  range.addEventListener("input", () => {
    const v = Number(range.value);
    answers[q.id] = Number.isFinite(v) ? v : range.value;
  });

  // valeur initiale
  answers[q.id] = Number(range.value);

  // Style local (ne casse pas ton CSS global)
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
/* ------------------------------------------------------------ */

/* ------------------- AUDIO (lecture) ------------------- */
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
/* ------------------------------------------------------- */

/* ------------------- DICTÉE (micro) ------------------- */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let recog = null;
let listening = false;
let interimBaseValue = "";

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
    recog.stop();
    setMicUI(false);
  }
}
/* ------------------------------------------------------ */

function ensureQuizBox() {
  if (quizBox) return;

  const card = document.querySelector(".card");
  card.innerHTML = `
    <div class="qHeader">
      <h2 id="qTitle"></h2>

      <!-- ✅ Picto juste sous la question (au-dessus des réponses) -->
      <div id="qPictoWrap" class="qPictoWrap" style="display:none;">
        <img id="qPicto" class="qPicto" src="" alt="Pictogramme" />
      </div>
    </div>

    <div id="choices" class="choices"></div>

    <!-- ✅ Nav avec actions centrées entre Précédent et Suivant -->
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

  // ✅ Style local (ne casse pas ton CSS global)
  // 🔻 MODIF : taille du pictogramme divisée par 2 (140px -> 70px)
  const style = document.createElement("style");
  style.textContent = `
    .qPictoWrap{margin:10px 0 6px; display:flex; justify-content:center}
    .qPicto{height:70px; width:auto}

    /* nav 3 colonnes : gauche / centre / droite */
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
    pictoImg: document.getElementById("qPicto"),
  };

  quizBox.pictoImg.addEventListener("error", () => {
    quizBox.pictoWrap.style.display = "none";
    quizBox.pictoImg.src = "";
  });

  quizBox.speak.addEventListener("click", () => {
    const q = getCurrentQuestion();
    speakFR(buildSpeechTextForQuestion(q));
  });

  quizBox.mic.addEventListener("click", () => {
    toggleDictation();
  });

  quizBox.prev.addEventListener("click", () => {
    qIndex = Math.max(0, qIndex - 1);
    renderQuestion();
  });

  quizBox.next.addEventListener("click", () => {
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

  // ✅ picto sous la question
  updateQuestionPictoTop(q);

  quizBox.choices.innerHTML = "";

  const type = q.type || "single";

  // ✅ slider fluide + visages
  if (type === "scale") {
    renderScaleQuestion(q);
    quizBox.prev.disabled = qIndex === 0;
    quizBox.next.textContent =
      qIndex === questionnaire.questions.length - 1 ? "Terminer →" : "Suivant →";
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
      label.textContent = c.label;

      row.appendChild(input);
      row.appendChild(label);
      quizBox.choices.appendChild(row);
    });
  }

  quizBox.prev.disabled = qIndex === 0;
  quizBox.next.textContent =
    qIndex === questionnaire.questions.length - 1 ? "Terminer →" : "Suivant →";
}

function renderSummary() {
  const educatorId = select.value;
  const educLabel = badge.textContent;

  const summary = questionnaire.questions.map((q) => {
    const val = answers[q.id] ?? "";
    const type = q.type || "single";
    const isMultiple = q.type === "multiple";

    if (type === "scale") {
      // Affichage lisible : si labels existent, on approxime vers le plus proche
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

        const t = (n - min) / (max - min); // 0..1
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
    div.innerHTML = `<strong>${escapeHtml(item.question)}</strong><div>${escapeHtml(
      item.answer
    )}</div>`;
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

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

btn.addEventListener("click", async () => {
  if (!select.value) {
    out.textContent = "Merci de choisir ton éducateur avant de continuer.";
    return;
  }
  out.textContent = "";

  await loadQuestionnaire();
  ensureQuizBox();
  renderQuestion();
});
