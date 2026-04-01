import fs from "fs/promises";
import path from "path";

function normalizePublicEducator(e, index) {
  return {
    id: e?.id || `educator-${index + 1}`,
    name: e?.name || "",
    role: e?.role || "",
    group: e?.group || "",
    photo: e?.photo || "./src/assets/avatar.png",
    isActive: e?.isActive !== false,
    order: Number.isFinite(Number(e?.order)) ? Number(e.order) : index + 1
  };
}

export async function handler() {
  try {
    const filePath = path.join(process.cwd(), "src", "data", "educators.json");
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      throw new Error("educators.json invalide");
    }

    const publicData = data.map(normalizePublicEducator);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify(publicData)
    };
  } catch (err) {
    console.error("public-educators error:", err);
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