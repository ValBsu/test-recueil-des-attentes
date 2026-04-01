import { isAdminAuthenticated } from "./_adminAuth.js";

export async function handler(event) {
  const authenticated = isAdminAuthenticated(event);

  return {
    statusCode: authenticated ? 200 : 401,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify({ authenticated })
  };
}