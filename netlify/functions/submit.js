// netlify/functions/submit.js (corrigé: pas de "→" + logs)

import { PDFDocument, StandardFonts } from "pdf-lib";

function nowFR() {
  return new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
}

function clean(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

async function buildPdf({ educatorLabel, summary }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  let y = 800;
  const x = 50;

  const line = (text, size = 12) => {
    if (y < 60) return;
    page.drawText(text, { x, y, size, font });
    y -= size * 1.6;
  };

  line("Recueil des attentes", 18);
  y -= 10;
  line(`Educateur : ${educatorLabel}`); // (optionnel: sans accent si tu veux être 100% safe)
  line(`Date : ${nowFR()}`);
  y -= 15;

  summary.forEach((item) => {
    line(`• ${clean(item.question)}`, 11);
    line(`  -> ${clean(item.answer)}`, 11); // ✅ remplacé
    y -= 6;
  });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { educatorId, educatorLabel, summary } = body;

    if (!educatorId || !educatorLabel || !Array.isArray(summary)) {
      return { statusCode: 400, body: "Bad request" };
    }

    const emailMap = JSON.parse(process.env.EDUCATOR_EMAIL_MAP || "{}");
    const to = emailMap[educatorId];
    if (!to) return { statusCode: 400, body: "Educator not found" };

    const from = process.env.MAIL_FROM;
    const apiKey = process.env.RESEND_API_KEY;
    if (!from) return { statusCode: 500, body: "Missing MAIL_FROM env var" };
    if (!apiKey) return { statusCode: 500, body: "Missing RESEND_API_KEY env var" };

    const pdfBuffer = await buildPdf({ educatorLabel, summary });

    const payload = {
      from,
      to: [to],
      subject: `Recueil des attentes – ${educatorLabel}`,
      text: `Un recueil des attentes vient d’etre complete.\n\nEducateur : ${educatorLabel}\nDate : ${nowFR()}`,
      attachments: [
        {
          filename: "recueil-attentes.pdf",
          content: pdfBuffer.toString("base64"),
        },
      ],
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("Resend error:", res.status, text);
      return { statusCode: 500, body: text || `Resend error ${res.status}` };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (e) {
    console.error("Submit error:", e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
}
