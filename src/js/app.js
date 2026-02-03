const select = document.getElementById("educSelect");
const badge = document.getElementById("educBadge");
const btn = document.getElementById("startBtn");
const out = document.getElementById("out");

let questionnaire = null;
let qIndex = 0;
let answers = {}; // { q1: "seul", q2: "autonomie", ... }

// UI elements (créés dynamiquement)
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

function ensureQuizBox() {
  if (quizBox) return;

  // On remplace la carte de départ par une carte questionnaire
  const card = document.querySelector(".card");
  card.innerHTML = `
    <h2 id="qTitle"></h2>
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
  };

  quizBox.prev.addEventListener("click", () => {
    qIndex = Math.max(0, qIndex - 1);
    renderQuestion();
  });

  quizBox.next.addEventListener("click", () => {
    const q = getCurrentQuestion();
    if (!answers[q.id]) {
      quizBox.hint.textContent = "Choisis une réponse pour continuer.";
      return;
    }
    quizBox.hint.textContent = "";

    const last = qIndex === questionnaire.questions.length - 1;
    if (last) {
      renderSummary();
    } else {
      qIndex++;
      renderQuestion();
    }
  });
}

function renderQuestion() {
  const q = getCurrentQuestion();
  quizBox.title.textContent = q.title;

  quizBox.choices.innerHTML = "";
  const selected = answers[q.id] || "";

  q.choices.forEach((c, i) => {
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

  quizBox.prev.disabled = qIndex === 0;
  quizBox.next.textContent =
    qIndex === questionnaire.questions.length - 1 ? "Terminer →" : "Suivant →";
}

function renderSummary() {
  const educLabel = badge.textContent;

  const summary = questionnaire.questions.map((q) => {
    const val = answers[q.id];
    const label = q.choices.find((c) => c.value === val)?.label || "";
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
      <button class="btn" id="pdfBtn" type="button">⬇️ Télécharger en PDF</button>
    </div>

    <p class="out">Le PDF est généré automatiquement.</p>
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
    // Recrée la carte questionnaire
    quizBox = null;
    ensureQuizBox();
    renderQuestion();
  });

  document.getElementById("pdfBtn").addEventListener("click", async () => {
    // Vérifie que la librairie est bien chargée
    if (typeof html2pdf === "undefined") {
      alert(
        "html2pdf n’est pas chargé. Ajoute le script html2pdf dans index.html (avant app.js)."
      );
      return;
    }

    const el = document.getElementById("pdfArea");
    const filename = `recueil_${educLabel}_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`.replaceAll(" ", "_");

    const opt = {
      margin: 10,
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    try {
      await html2pdf().set(opt).from(el).save();
    } catch (e) {
      alert("Erreur lors de la génération du PDF.");
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
