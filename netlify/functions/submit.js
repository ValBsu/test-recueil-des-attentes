// netlify/functions/submit.js

function nowFR() {
  return new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
}

function clean(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const {
      educatorId,
      educatorLabel,
      summary,
      pdfBase64,
      pdfFilename
    } = body;

    if (!educatorId || !educatorLabel || !Array.isArray(summary)) {
      return { statusCode: 400, body: "Bad request" };
    }

    if (!pdfBase64) {
      return {
        statusCode: 400,
        body: "Missing pdfBase64: le PDF visuel n'a pas été transmis."
      };
    }

    const emailMap = JSON.parse(process.env.EDUCATOR_EMAIL_MAP || "{}");
    const to = emailMap[educatorId];
    if (!to) {
      return { statusCode: 400, body: "Educator not found" };
    }

    const from = process.env.MAIL_FROM;
    const apiKey = process.env.RESEND_API_KEY;

    if (!from) {
      return { statusCode: 500, body: "Missing MAIL_FROM env var" };
    }

    if (!apiKey) {
      return { statusCode: 500, body: "Missing RESEND_API_KEY env var" };
    }

    const safeSummaryText = summary
      .map((item) => {
        const q = clean(item.question);
        const a = clean(item.combinedAnswer || item.answer || "");
        return `- ${q}\n  ${a}`;
      })
      .join("\n\n");

    const payload = {
      from,
      to: [to],
      subject: `Recueil des attentes – ${educatorLabel}`,
      text:
        `Un recueil des attentes vient d'être complété.\n\n` +
        `Éducateur : ${educatorLabel}\n` +
        `Date : ${nowFR()}\n\n` +
        `Résumé :\n${safeSummaryText}`,
      attachments: [
        {
          filename: clean(pdfFilename || "recueil-attentes.pdf"),
          content: pdfBase64
        }
      ]
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("Resend error:", res.status, text);
      return { statusCode: 500, body: text || `Resend error ${res.status}` };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true })
    };
  } catch (e) {
    console.error("Submit error:", e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
}