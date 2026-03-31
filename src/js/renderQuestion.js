"use strict";

function shouldShowOtherAnswerField(q) {
  return (q?.type || "single") !== "text";
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

function buildSpeechTextForQuestion(q) {
  return getQuestionTitle(q) || t("question_word");
}

function renderScaleQuestion(q) {
  const min = Number.isFinite(q.min) ? q.min : 1;
  const max = Number.isFinite(q.max) ? q.max : 5;
  const step =
    q.step !== undefined && q.step !== null && q.step !== "" ? String(q.step) : "1";
  const def = Number.isFinite(q.default) ? q.default : Math.round((min + max) / 2);

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
    window.__speechState.activeDictationField = textarea;
  });
  textarea.addEventListener("focus", () => {
    window.__speechState.activeDictationField = textarea;
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
        <button class="iconBtn" id="speakBtn" type="button" title="${escapeHtml(
          t("speak_question")
        )}">🔊</button>
        <button class="iconBtn" id="micBtn" type="button" title="${escapeHtml(
          t("dictate_answer")
        )}">🎤</button>
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

  if (window.__speechState?.recog && window.__speechState?.listening) {
    try {
      window.__speechState.recog.stop();
    } catch (e) {}
    setMicUI(false);
  }

  resetSpeechState();

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
  if (quizBox.mic) {
    quizBox.mic.title = window.__speechState?.listening
      ? t("stop_dictation")
      : t("dictate_answer");
  }

  if (type === "scale") {
    renderScaleQuestion(q);
    renderOtherAnswerField(q);
    quizBox.prev.disabled = qIndex === 0;
    quizBox.next.textContent =
      qIndex === safeQuestionsArray(questionnaire).length - 1
        ? t("finish")
        : t("next");
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
      window.__speechState.activeDictationField = textarea;
    });
    textarea.addEventListener("focus", () => {
      window.__speechState.activeDictationField = textarea;
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
      input.checked = isMultiple
        ? selectedArray.includes(c.value)
        : c.value === selected;

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
        window.__speechState.suppressHoverUntil = Date.now() + 500;
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
  quizBox.next.textContent =
    qIndex === safeQuestionsArray(questionnaire).length - 1
      ? t("finish")
      : t("next");
  updateProgressUI();
}

window.shouldShowOtherAnswerField = shouldShowOtherAnswerField;
window.getQuestionTitle = getQuestionTitle;
window.getQuestionPlaceholder = getQuestionPlaceholder;
window.getChoiceLabel = getChoiceLabel;
window.focusFirstAnswerField = focusFirstAnswerField;
window.updateProgressUI = updateProgressUI;
window.buildSpeechTextForQuestion = buildSpeechTextForQuestion;
window.renderScaleQuestion = renderScaleQuestion;
window.renderOtherAnswerField = renderOtherAnswerField;
window.ensureQuizBox = ensureQuizBox;
window.renderQuestion = renderQuestion;