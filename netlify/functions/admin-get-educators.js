import fs from "fs/promises";
import path from "path";
import { isAdminAuthenticated } from "./_adminAuth.js";

export async function handler(event) {
  if (!isAdminAuthenticated(event)) {
    return {
      statusCode: 401,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({ error: "Unauthorized" })
    };
  }

  try {
    const filePath = path.join(process.cwd(), "src", "data", "educators.json");
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      throw new Error("educators.json invalide");
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error("admin-get-educators error:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify([])
    };
  }
}