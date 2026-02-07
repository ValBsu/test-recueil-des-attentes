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
    // Evite crash si dépasse la page (simple)
    if (y < 60) return;
    page.drawText(text, { x, y, size, font });
    y -= size * 1.6;
  };

  line("Recueil des attentes", 18);
  y -= 10;
  line(`Éducateur : ${educatorLabel}`);
  line(`Date : ${nowFR()}`);
  y -= 15;

  summary.forEach((item) => {
    line(`• ${clean(item.question)}`, 11);
    line(`  → ${clean(item.answer)}`, 11);
    y -= 6;
  });

  const bytes = await pdf.save(); // Uint8Array
  // Buffer est OK en Netlify Function (Node)
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

    if (!to) {
      return { statusCode: 400, body: "Educator not found" };
    }

    const pdfBuffer = await buildPdf({ educatorLabel, summary });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        to: [to],
        subject: `Recueil des attentes – ${educatorLabel}`,
        text: `Un recueil des attentes vient d’être complété.\n\nÉducateur : ${educatorLabel}\nDate : ${nowFR()}`,
        attachments: [
          {
            filename: "recueil-attentes.pdf",
            content: pdfBuffer.toString("base64"),
          },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return { statusCode: 500, body: t };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (e) {
    return { statusCode: 500, body: "Server error" };
  }
}
