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
  badge.textContent =
    label && label !== "— Sélectionner —" ? label : "à choisir";
}

select.addEventListener("change", updateBadge);
updateBadge();

async function loadQuestionnaire() {
  const res = await fetch("./src/data/questionnaire.json", {
    cache: "no-store",
  });
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
  if (type === "text") {
    return `${q.title}. Réponse libre.`;
  }
  const choices = (q.choices || [])
    .map((c) => c.label)
    .join(". ");
  return choices
    ? `${q.title}. Choix possibles : ${choices}.`
    : `${q.title}.`;
}
/* ------------------------------------------------------- */

function ensureQuizBox() {
  if (quizBox) return;

  const card = document.querySelector(".card");
  card.innerHTML = `
    <div class="qHeader">
      <h2 id="qTitle"></h2>
      <button class="iconBtn" id="speakBtn" type="button">🔊</button>
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
  };

  quizBox.speak.addEventListener("click", () => {
    const q = getCurrentQuestion();
    speakFR(buildSpeechTextForQuestion(q));
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

  const q = getCurrentQuestion();
  quizBox.title.textContent = q.title;
  quizBox.choices.innerHTML = "";

  const type = q.type || "single";

  // ---------- QUESTION TEXTE ----------
  if (type === "text") {
    const textarea = document.createElement("textarea");
    textarea.className = "textAnswer";
    textarea.rows = 4;
    textarea.placeholder =
      q.placeholder || "Écris ta réponse ici…";
    textarea.value = answers[q.id] || "";

    textarea.addEventListener("input", () => {
      answers[q.id] = textarea.value;
    });

    quizBox.choices.appendChild(textarea);
  }

  // ---------- QUESTION A CHOIX ----------
  else {
    const selected = answers[q.id] || "";

    (q.choices || []).forEach((c, i) => {
      const id = `${q.id}_${i}`;

      const row = document.createElement("div");
      row.className = "choiceRow";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = q.id;
      input.id = id;
      input.value = c.value;
      input.checked = c.value === selected;

      input.addEventListener("change", () => {
        answers[q.id] = c.value;
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
    qIndex === questionnaire.questions.length - 1
      ? "Terminer →"
      : "Suivant →";
}

function renderSummary() {
  const educatorId = select.value;
  const educLabel = badge.textContent;

  const summary = questionnaire.questions.map((q) => {
    const val = answers[q.id] ?? "";

    if ((q.type || "single") === "text") {
      return { question: q.title, answer: String(val) };
    }

    const label = (q.choices || []).find(
      (c) => c.value === val
    )?.label || "";

    return { question: q.title, answer: label };
  });

  quizBox.card.innerHTML = `
    <div id="pdfArea">
      <h2>Récapitulatif</h2>
      <p class="out"><strong>Éducateur :</strong> ${escapeHtml(
        educLabel
      )}</p>
      <p class="out"><strong>Date :</strong> ${new Date().toLocaleString(
        "fr-FR"
      )}</p>

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
    div.innerHTML = `<strong>${escapeHtml(
      item.question
    )}</strong><div>${escapeHtml(item.answer)}</div>`;
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
    out.textContent =
      "Merci de choisir ton éducateur avant de continuer.";
    return;
  }
  out.textContent = "";

  await loadQuestionnaire();
  ensureQuizBox();
  renderQuestion();
});
