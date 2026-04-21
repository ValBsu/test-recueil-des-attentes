import { createAdminSessionCookie, timingSafeEqualString } from "./_adminAuth.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({ ok: false, error: "Method Not Allowed" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const login = String(body.login || "").trim();
    const password = String(body.password || "");

    const expectedLogin = String(process.env.ADMIN_LOGIN || "").trim();
    const expectedPassword = String(process.env.ADMIN_PASSWORD || "");

    if (!expectedLogin || !expectedPassword) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        },
        body: JSON.stringify({ ok: false, error: "Admin credentials are not configured" })
      };
    }

    const loginOk = timingSafeEqualString(login, expectedLogin);
    const passwordOk = timingSafeEqualString(password, expectedPassword);

    if (!loginOk || !passwordOk) {
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        },
        body: JSON.stringify({ ok: false, error: "Identifiant ou mot de passe incorrect" })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Set-Cookie": createAdminSessionCookie()
      },
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    console.error("admin-login error:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({ ok: false, error: "Erreur serveur admin-login" })
    };
  }
}