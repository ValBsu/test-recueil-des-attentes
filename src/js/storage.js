"use strict";

function getOtherAnswerValue(qId) {
  return String(otherAnswers[qId] || "").trim();
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

function commitCurrentTextAnswerIfAny() {
  const fields = getVisibleTextInputs();
  fields.forEach((field) => saveTextareaValueToState(field));
}

window.getOtherAnswerValue = getOtherAnswerValue;
window.saveTextareaValueToState = saveTextareaValueToState;
window.commitCurrentTextAnswerIfAny = commitCurrentTextAnswerIfAny;