/* =========================================================
   owner.js — aksi khusus OWNER: kelola moderator, pengaturan
   situs (playlist & kategori), backup/restore, dan riwayat
   revisi. Hanya dipanggil bila state.isOwner === true.
========================================================= */

import * as Store from "./storage.js";
import { listStaff, createModerator, setModeratorActive, removeModerator } from "./accounts.js";
import { setPlaylist } from "./music-player.js";
import { buildForm } from "./editor.js";
import { isHttpUrl } from "./schema.js";
import { historyHTML } from "./views/owner.js";
import { friendlyError, go, hide, render, setStatus, show, state } from "./ui.js";
import { $, downloadJSON } from "./utils.js";

const ACCOUNT_ERRORS = {
  "auth/email-already-in-use": "Email ini sudah terdaftar.",
  "auth/invalid-email": "Format email tidak valid.",
  "auth/weak-password": "Password terlalu lemah (minimal 8 karakter).",
  "auth/operation-not-allowed": "Provider Email/Password belum diaktifkan di Firebase Authentication.",
  "auth/network-request-failed": "Koneksi bermasalah. Periksa internet kamu.",
  "invalid-name": "Nama tampilan wajib diisi."
};

const accountError = (error, fallback) =>
  ACCOUNT_ERRORS[error?.code] ? ACCOUNT_ERRORS[error.code] : friendlyError(error, fallback);

// =========================================================
// PENGATURAN SITUS
// =========================================================

/** Terapkan pengaturan ke state, pemutar, dan form (bila kategori berubah). */
export function applySettings(settings) {
  const categoriesChanged =
    JSON.stringify(settings.kategoriTambahan) !== JSON.stringify(state.settings.kategoriTambahan);

  state.settings = settings;
  setPlaylist(settings.musicUrls);

  if (categoriesChanged) buildForm();
}

async function saveMusic(form) {
  const urls = String(new FormData(form).get("musicUrls") || "")
    .split(/\r?\n/).map(url => url.trim()).filter(Boolean);

  const invalid = urls.find(url => !isHttpUrl(url));
  if (invalid) return setStatus(`URL musik harus diawali http:// atau https:// (${invalid})`, true);

  try {
    applySettings(await Store.saveSettings({ ...state.settings, musicUrls: urls }));
    setStatus("Playlist disimpan.");
    render();
  } catch (error) {
    setStatus(accountError(error, "Gagal menyimpan playlist."), true);
  }
}

async function addCategory(form) {
  const value = String(new FormData(form).get("kategori") || "").trim();
  if (!value) return;

  if (Store.getCategories(state.settings).some(item => item.toLowerCase() === value.toLowerCase())) {
    return setStatus(`Kategori “${value}” sudah ada.`, true);
  }

  try {
    applySettings(await Store.saveSettings({
      ...state.settings,
      kategoriTambahan: [...state.settings.kategoriTambahan, value]
    }));
    form.reset();
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
// KELOLA MODERATOR
// =========================================================

export async function reloadStaff() {
  state.staff = null;
  render();

  try {
    state.staff = await listStaff();
  } catch (error) {
    state.staff = error;
  }

  render();
}

async function addModerator(form) {
  const data = Object.fromEntries(new FormData(form));
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;

  try {
    await createModerator(data);
    form.reset();
    setStatus(`Moderator “${data.nama}” dibuat. Berikan email & password sementaranya.`);
    await reloadStaff();
  } catch (error) {
    setStatus(accountError(error, "Gagal membuat moderator."), true);
  } finally {
    button.disabled = false;
  }
}

async function toggleModerator(uid, activate) {
  try {
    await setModeratorActive(uid, activate);
    setStatus(activate ? "Moderator diaktifkan." : "Moderator dinonaktifkan.");
    await reloadStaff();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal mengubah status moderator."), true);
  }
}

async function dropModerator(uid, name) {
  if (!confirm(`Hapus peran moderator untuk “${name}”? Akun tidak bisa lagi masuk ke panel.`)) return;

  try {
    await removeModerator(uid);
    setStatus("Peran moderator dihapus.");
    await reloadStaff();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menghapus moderator."), true);
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

export async function restoreRevision(revisionId) {
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
// EVENT (dipanggil dari panels.js; hanya bila owner)
// =========================================================

export function bindOwnerInput() {
  $("btnImport").addEventListener("change", event => importData(event.target.files[0]));
}

/** Aksi klik. Mengembalikan true bila aksi dikenali. */
export async function handleOwner(action, target) {
  if (!state.isOwner) return false;

  switch (action) {
    case "owner-toggle-mod": await toggleModerator(target.dataset.id, target.dataset.active === "1"); return true;
    case "owner-remove-mod": await dropModerator(target.dataset.id, target.dataset.name); return true;
    case "owner-remove-cat": await removeCategory(target.dataset.name); return true;
    case "owner-export": exportData(); return true;
    case "owner-import": $("btnImport").click(); return true;
    case "owner-reload-staff": await reloadStaff(); return true;
    case "history": await openHistory(target.dataset.id); return true;
    default: return false;
  }
}

/** Kirim form khusus owner. Mengembalikan true bila form dikenali. */
export async function handleOwnerForm(form) {
  if (!state.isOwner) return false;

  switch (form.dataset.form) {
    case "create-mod": await addModerator(form); return true;
    case "music": await saveMusic(form); return true;
    case "category": await addCategory(form); return true;
    default: return false;
  }
}

