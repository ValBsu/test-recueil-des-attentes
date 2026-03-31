"use strict";

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
    if (
      labels &&
      Number.isFinite(Number(val)) &&
      Number.isFinite(Number(q.min)) &&
      Number.isFinite(Number(q.max))
    ) {
      const min = Number(q.min);
      const max = Number(q.max);
      const n = Number(val);
      const tNum = (n - min) / (max - min);
      const idx = Math.max(
        0,
        Math.min(labels.length - 1, Math.round(tNum * (labels.length - 1)))
      );
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

/* PDF */
function assertPdfLib() {
  const lib = window.PDFLib;
  if (!lib || !lib.PDFDocument) {
    throw new Error(
      "pdf-lib introuvable. Ajoute ./src/libs/pdf-lib.min.js (local) et charge-le dans le HTML."
    );
  }
  return lib;
}

function assertHtml2Canvas() {
  const h2c = window.html2canvas;
  if (!h2c) {
    throw new Error(
      "html2canvas introuvable. Ajoute ./src/libs/html2canvas.min.js (local) et charge-le dans le HTML."
    );
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
    .map(
      (img) =>
        new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        })
    );
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
        .map(
          (f) =>
            `<img src="${getPictoSrc(
              f
            )}" alt="" loading="lazy" onerror="this.style.display='none'"/>`
        )
        .join("");

      const aPics = (item.aPictos || [])
        .map(
          (f) =>
            `<img src="${getPictoSrc(
              f
            )}" alt="" loading="lazy" onerror="this.style.display='none'"/>`
        )
        .join("");

      const otherHtml = item.otherAnswer
        ? `<div class="summaryOtherAnswer">${escapeHtml(
            t("summary_other_answer")
          )} ${escapeHtml(item.otherAnswer)}</div>`
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

window.formatDuration = formatDuration;
window.getAnswerLabel = getAnswerLabel;
window.getCombinedAnswerLabel = getCombinedAnswerLabel;
window.getAnswerPictos = getAnswerPictos;
window.downloadRecapAsPdf = downloadRecapAsPdf;
window.renderSummary = renderSummary;