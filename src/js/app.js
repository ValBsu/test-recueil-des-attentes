// app.js (fichier complet corrigé à copier-coller)

const select = document.getElementById("educSelect");
const badge = document.getElementById("educBadge");
const btn = document.getElementById("startBtn");
const out = document.getElementById("out");

let questionnaire = null;
let qIndex = 0;
let answers = {}; // qId -> value
let quizBox = null;

function updateBadge() {
  const label = select.options[select.selectedIndex]?.textContent;
  badge.textContent = label && label !== "— Sélectionner —" ? label : "à choisir";
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
  const choices = (q.choices || []).map((c) => c.label).join(". ");
  return choices ? `${q.title}. Choix possibles : ${choices}.` : `${q.title}.`;
}
/* ------------------------------------------------------- */

/* ------------------- DICTÉE (micro) ------------------- */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let recog = null;
let listening = false;
let interimBaseValue = ""; // contenu de départ au moment où on lance la dictée

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
  recog.interimResults = true; // on affiche pendant qu'il parle
  recog.continuous = false;

  // ✅ FIX: on remplace l'interim au lieu d'ajouter en boucle
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

      // maj answers
      const q = getCurrentQuestion();
      answers[q.id] = ta.value;

      // on actualise la base (utile si plusieurs segments finaux arrivent)
      interimBaseValue = ta.value.trim();
    } else if (interim) {
      // provisoire : on affiche sans "coller" définitivement
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

      // ✅ FIX: on mémorise le texte avant dictée (base)
      interimBaseValue = ta.value.trim();

      recog.start();
      setMicUI(true);
    } catch (e) {
      // start peut throw si déjà lancé
    }
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

      <div class="qActions">
        <button class="iconBtn" id="speakBtn" type="button" title="Énoncer la question">🔊</button>
        <button class="iconBtn" id="micBtn" type="button" title="Dicter la réponse">🎤</button>
      </div>
    </div>

    <div id="choices" class="choices"></div>

    <div class="navRow">
      <button class="btn secondary" id="prevBtn" type="button">← Précédent</button>
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
  };

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

    if (required && (!val || String(val).trim() === "")) {
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

  // coupe dictée si en cours
  if (recog && listening) {
    try {
      recog.stop();
    } catch (e) {}
    setMicUI(false);
  }

  const q = getCurrentQuestion();
  quizBox.title.textContent = q.title;
  quizBox.choices.innerHTML = "";

  const type = q.type || "single";

  // ---------- QUESTION TEXTE ----------
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
  }

  // ---------- QUESTION A CHOIX ----------
  else {
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
    const isMultiple = q.type === "multiple";

    if ((q.type || "single") === "text") {
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
