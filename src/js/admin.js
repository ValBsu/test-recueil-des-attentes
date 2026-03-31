if (sessionStorage.getItem("adminAuth") !== "true") {
  alert("Accès refusé");
  window.location.href = "./index.html";
}

const listEl = document.getElementById("list");
const addBtn = document.getElementById("addBtn");

let educators = [];

/* =========================
   Load
   ========================= */
async function loadEducators() {
  try {
    const res = await fetch("./src/data/educators.json", { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    educators = await res.json();

    if (!Array.isArray(educators)) {
      throw new Error("educators.json invalide");
    }

    render();
  } catch (err) {
    console.error(err);
    if (listEl) {
      listEl.innerHTML = `<div class="empty" style="color:#e0565b;">Erreur chargement : ${escapeHtml(err.message)}</div>`;
    }
  }
}

/* =========================
   Render
   ========================= */
function render() {
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!educators.length) {
    listEl.innerHTML = `<div class="empty">Aucun professionnel</div>`;
    return;
  }

  educators.forEach((e, index) => {
    const div = document.createElement("article");
    div.className = "card";

    div.innerHTML = `
      <div class="row">
        <div class="field">
          <label class="field-label">Nom</label>
          <input type="text" value="${escapeHtml(e.name || "")}" data-field="name">
        </div>

        <div class="field">
          <label class="field-label">Rôle</label>
          <input type="text" value="${escapeHtml(e.role || "")}" data-field="role">
        </div>

        <div class="field">
          <label class="field-label">Pôle</label>
          <input type="text" value="${escapeHtml(e.group || "")}" data-field="group">
        </div>

        <div class="field">
          <label class="field-label">Email</label>
          <input type="email" value="${escapeHtml(e.email || "")}" data-field="email">
        </div>

        <div class="field small">
          <label class="field-label">Ordre</label>
          <input type="text" value="${escapeHtml(e.order ?? "")}" data-field="order">
        </div>

        <div class="field small">
          <label class="field-label">État</label>
          <label class="check-wrap">
            <input type="checkbox" ${e.isActive ? "checked" : ""} data-field="isActive">
            <span>Actif</span>
          </label>
        </div>
      </div>

      <div class="row">
        <div class="actions">
          <button type="button" class="glass-btn primary" data-action="save">💾 Enregistrer</button>
          <button type="button" class="glass-btn danger" data-action="delete">🗑️ Supprimer</button>
        </div>
      </div>
    `;

    const saveBtn = div.querySelector('[data-action="save"]');
    const deleteBtn = div.querySelector('[data-action="delete"]');

    saveBtn.addEventListener("click", () => {
      const inputs = div.querySelectorAll("input");

      inputs.forEach((input) => {
        const field = input.dataset.field;
        if (!field) return;

        if (field === "isActive") {
          e[field] = input.checked;
        } else if (field === "order") {
          const n = Number(input.value);
          e[field] = Number.isFinite(n) ? n : index + 1;
        } else {
          e[field] = input.value.trim();
        }
      });

      console.log("Modifié :", e);
      alert("Modification enregistrée (temporaire)");
    });

    deleteBtn.addEventListener("click", () => {
      if (!confirm("Supprimer ce professionnel ?")) return;

      educators.splice(index, 1);
      render();
    });

    listEl.appendChild(div);
  });
}

/* =========================
   Add
   ========================= */
if (addBtn) {
  addBtn.addEventListener("click", () => {
    educators.push({
      id: "new-" + Date.now(),
      name: "Nouveau professionnel",
      role: "",
      group: "",
      email: "",
      photo: "/src/assets/avatar.png",
      isActive: true,
      order: educators.length + 1
    });

    render();
  });
}

/* =========================
   Utils
   ========================= */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   Init
   ========================= */
loadEducators();