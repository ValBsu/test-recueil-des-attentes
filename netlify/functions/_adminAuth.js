export function timingSafeEqualString(a, b) {
  return String(a) === String(b);
}

export function parseCookies() {
  return {};
}

export function createAdminSessionCookie() {
  return "";
}

export function createExpiredAdminSessionCookie() {
  return "";
}

export function isAdminAuthenticated() {
  return true;
}