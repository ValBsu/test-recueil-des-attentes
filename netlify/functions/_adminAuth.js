import crypto from "crypto";

const COOKIE_NAME = "admin_session";

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function signPayload(payload) {
  const secret = getEnv("ADMIN_SESSION_SECRET");
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function timingSafeEqualString(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));

  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function parseCookies(cookieHeader = "") {
  const out = {};
  cookieHeader.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = value;
  });
  return out;
}

export function createAdminSessionCookie() {
  const maxAge = Number(process.env.ADMIN_SESSION_MAX_AGE_SECONDS || 60 * 60 * 8);
  const exp = Date.now() + maxAge * 1000;

  const payload = JSON.stringify({
    role: "admin",
    exp
  });

  const encodedPayload = base64UrlEncode(payload);
  const sig = signPayload(encodedPayload);
  const token = `${encodedPayload}.${sig}`;

  return [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${maxAge}`
  ].join("; ");
}

export function createExpiredAdminSessionCookie() {
  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0"
  ].join("; ");
}

export function isAdminAuthenticated(event) {
  try {
    const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie || "");
    const token = cookies[COOKIE_NAME];
    if (!token) return false;

    const [encodedPayload, sig] = token.split(".");
    if (!encodedPayload || !sig) return false;

    const expectedSig = signPayload(encodedPayload);
    if (!timingSafeEqualString(sig, expectedSig)) return false;

    const payloadRaw = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadRaw);

    if (payload?.role !== "admin") return false;
    if (!payload?.exp || Date.now() > Number(payload.exp)) return false;

    return true;
  } catch {
    return false;
  }
}