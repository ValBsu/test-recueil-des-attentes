"use strict";

function isIdentityQuestion(q) {
  const id = String(q?.id || "").toLowerCase();
  const title = getSearchableText(q?.title);

  const has = (txt, ...words) => words.some((w) => txt.includes(w));

  const isFirst =
    has(id, "prenom", "prénom") ||
    (has(title, "prénom", "prenom", "first name") &&
      !has(title, "nom de famille", "last name"));

  const isLast = has(id, "nom") || has(title, "nom", "last name");
  const isAge = has(id, "age", "âge") || has(title, "âge", "age");

  const forbidden = has(
    title,
    "référent",
    "referent",
    "educateur",
    "éducateur",
    "professionnel",
    "professional",
    "pôle",
    "pole"
  );

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

function questionHasSelectedChoice(q) {
  if (!q) return false;
  if (q.type === "text" || q.type === "scale") return false;

  const current = answers[q.id];

  if (q.type === "multiple") {
    return Array.isArray(current) && current.length > 0;
  }

  return current !== undefined && current !== null && String(current).trim() !== "";
}

window.isIdentityQuestion = isIdentityQuestion;
window.isAnswered = isAnswered;
window.hasAnyAnswerForQuestion = hasAnyAnswerForQuestion;
window.questionHasSelectedChoice = questionHasSelectedChoice;