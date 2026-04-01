"use strict";

const listEl = document.getElementById("list");
const addBtn = document.getElementById("addBtn");

let educators = [];

/* =========================
   Auth admin
   ========================= */
async function ensureAdminAuthenticated() {
  try {
    const checkRes = await fetch("/.netlify/functions/admin-check", {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    });

    if (checkRes.ok) {
      const data = await checkRes.json();
      if (data?.authenticated === true) return true;
    }
  } catch (err) {
    console.error("Erreur admin-check :", err);
  }

  const login = window.prompt("Identifiant admin :");
  if (!login) {
    window.location.href = "./index.html";
    return false;
  }

  const password = window.prompt("Mot de passe :");
  if (!password) {
    window.location.href = "./index.html";
    return false;
  }

  try {
    const loginRes = await fetch("/.netlify/functions/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ login, password })
    });

    if (!loginRes.ok) {
      alert("Identifiant ou mot de passe incorrect");
      window.location.href = "./index.html";
      return false;
    }

    const data = await loginRes.json();
    if (data?.ok !== true) {
      alert("Connexion admin refusée");
      window.location.href = "./index.html";
      return false;
    }

    return true;
  } catch (err) {
    console.error("Erreur admin-login :", err);
    alert("Erreur de connexion admin");
    window.location.href = "./index.html";
    return false;
  }
}

/* =========================
   Load
   ========================= */
async function loadEducators() {
  try {
    const res = await fetch("/.netlify/functions/admin-get-educators", {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    });

    if (res.status === 401) {
      alert("Session admin expirée");
      window.location.href = "./index.html";
      return;
    }

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

      console.log("Modification locale :", e);
      alert("Sécurité admin OK ✅\nLa sauvegarde réelle sera branchée à l’étape suivante.");
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
(async function initAdmin() {
  const ok = await ensureAdminAuthenticated();
  if (!ok) return;
  await loadEducators();
})();