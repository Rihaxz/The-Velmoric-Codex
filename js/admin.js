/* =========================================================
   THE VELMORIC CODEX — admin.js
   Aksi khusus admin: pengaturan, kategori, backup/restore,
   log aktivitas, dan riwayat revisi.
========================================================= */

import * as Store from "./storage.js";
import { isHttpUrl } from "./schema.js";
import { setPlaylist } from "./music-player.js";
import { buildForm } from "./editor.js";
import { historyHTML } from "./views/admin.js";
import { friendlyError, go, hide, onClose, render, setStatus, show, state } from "./ui.js";
import { $, downloadJSON } from "./utils.js";

// =========================================================
// TEMA & PENGATURAN
// =========================================================

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.body.classList.toggle("light-mode", theme === "light");
}

export function applySettings(settings) {
  const categoriesChanged =
    JSON.stringify(settings.kategoriTambahan) !== JSON.stringify(state.settings.kategoriTambahan);

  state.settings = settings;
  applyTheme(settings.theme);
  setPlaylist(settings.musicUrls);

  if (categoriesChanged) buildForm();
}

function openSettings() {
  $("toggleTheme").checked = state.settings.theme === "light";
  $("inputMusicUrl").value = state.settings.musicUrls.join("\n");
  show($("adminSettingsModal"));
}

async function saveSettingsFromModal() {
  const button = $("btnSaveSettings");
  const urls = $("inputMusicUrl").value.split(/\r?\n/).map(url => url.trim()).filter(Boolean);
  const invalid = urls.find(url => !isHttpUrl(url));

  if (invalid) return setStatus(`URL musik harus diawali http:// atau https:// (${invalid})`, true);

  button.disabled = true;

  try {
    applySettings(await Store.saveSettings({
      ...state.settings,
      theme: $("toggleTheme").checked ? "light" : "dark",
      musicUrls: urls
    }));
    hide($("adminSettingsModal"));
    setStatus("Pengaturan disimpan.");
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menyimpan pengaturan."), true);
  } finally {
    button.disabled = false;
  }
}

// =========================================================
// KATEGORI TAMBAHAN
// =========================================================

async function addCategory(name) {
  const value = name.trim();
  if (!value) return;

  if (Store.getCategories(state.settings).some(item => item.toLowerCase() === value.toLowerCase())) {
    return setStatus(`Kategori “${value}” sudah ada.`, true);
  }

  try {
    applySettings(await Store.saveSettings({
      ...state.settings,
      kategoriTambahan: [...state.settings.kategoriTambahan, value]
    }));
    setStatus(`Kategori “${value}” ditambahkan.`);
    render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menambah kategori."), true);
  }
}

async function removeCategory(name) {
  const used = Store.getEntries().filter(entry => entry.kategori === name).length;

  if (used) return setStatus(`Kategori “${name}” masih dipakai ${used} entri. Pindahkan entrinya dulu.`, true);
  if (!confirm(`Hapus kategori “${name}”?`)) return;

  try {
    applySettings(await Store.saveSettings({
      ...state.settings,
      kategoriTambahan: state.settings.kategoriTambahan.filter(item => item !== name)
    }));
    render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menghapus kategori."), true);
  }
}

// =========================================================
// BACKUP / RESTORE
// =========================================================

function exportData() {
  const date = new Date().toISOString().slice(0, 10);
  downloadJSON(`velmoric-codex-${date}.json`, Store.buildBackup(state.settings));
  setStatus("Backup diunduh.");
}

async function importData(file) {
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    const items = Array.isArray(parsed) ? parsed : parsed?.characters;

    if (!Array.isArray(items) || !items.length) throw new Error("Format JSON tidak valid atau tidak ada entri.");

    if (!confirm(`Impor ${items.length} entri? Entri dengan ID yang sama akan ditimpa; entri lain tidak dihapus.`)) return;

    setStatus("Mengimpor…");

    const { written, skipped } = await Store.importEntries(items);

    if (!Array.isArray(parsed) && parsed.settings) {
      try {
        applySettings(await Store.saveSettings({ ...state.settings, ...parsed.settings }));
      } catch (error) {
        console.error("Impor pengaturan gagal:", error);
      }
    }

    if (skipped.length) console.warn("Entri dilewati saat impor:", skipped);

    render();
    setStatus(
      skipped.length
        ? `Impor selesai: ${written} berhasil, ${skipped.length} dilewati (lihat console).`
        : `Impor selesai: ${written} entri.`,
      skipped.length > 0
    );
  } catch (error) {
    console.error("Impor gagal:", error);
    setStatus(friendlyError(error, "Impor gagal."), true);
  } finally {
    $("btnImport").value = "";
  }
}

// =========================================================
// LOG AKTIVITAS
// =========================================================

export async function loadActivity() {
  state.activity = null;

  try {
    state.activity = await Store.loadActivity();
  } catch (error) {
    console.warn("Log aktivitas:", error);
    state.activity = error;
  }

  if (state.route.name === "admin") render();
}

// =========================================================
// RIWAYAT REVISI
// =========================================================

let currentRevisions = [];

async function openHistory(id) {
  const entry = Store.getEntry(id);
  const body = $("historyBody");

  $("historyTitle").textContent = `Riwayat: ${entry?.nama || ""}`;
  body.innerHTML = historyHTML(entry, null);
  show($("historyModal"));

  try {
    currentRevisions = await Store.loadRevisions(id);
    body.innerHTML = historyHTML(entry, currentRevisions);
  } catch (error) {
    body.innerHTML = historyHTML(entry, error);
  }
}

async function restore(revisionId) {
  const revision = currentRevisions.find(item => item.id === revisionId);
  if (!revision || !confirm("Pulihkan versi ini? Versi sekarang akan disimpan di riwayat.")) return;

  try {
    const restored = await Store.restoreRevision(revision);
    hide($("historyModal"));
    setStatus("Versi lama dipulihkan.");
    go(`#/e/${encodeURIComponent(restored.id)}`);
  } catch (error) {
    setStatus(friendlyError(error, "Gagal memulihkan."), true);
  }
}

// =========================================================
// EVENT
// =========================================================

export function bindAdmin() {
  onClose($("adminSettingsModal"), () => applyTheme(state.settings.theme));

  $("closeSettings").addEventListener("click", () => hide($("adminSettingsModal")));
  $("btnSaveSettings").addEventListener("click", () => state.isAdmin && saveSettingsFromModal());
  $("toggleTheme").addEventListener("change", event => applyTheme(event.target.checked ? "light" : "dark"));
  $("btnImport").addEventListener("change", event => state.isAdmin && importData(event.target.files[0]));
  $("closeHistory").addEventListener("click", () => hide($("historyModal")));

  document.addEventListener("click", event => {
    if (!state.isAdmin) return;

    const target = event.target.closest("[data-action], [data-remove-category], [data-restore]");
    if (!target) return;

    if (target.dataset.removeCategory) return removeCategory(target.dataset.removeCategory);
    if (target.dataset.restore) return restore(target.dataset.restore);

    switch (target.dataset.action) {
      case "settings": return openSettings();
      case "export": return exportData();
      case "import": return $("btnImport").click();
      case "reload-log": return loadActivity();
      case "history": return openHistory(target.dataset.id);
    }
  });

  document.addEventListener("submit", event => {
    if (event.target.matches('[data-form="category"]') && state.isAdmin) {
      event.preventDefault();
      addCategory(new FormData(event.target).get("kategori") || "");
    }
  });
}
