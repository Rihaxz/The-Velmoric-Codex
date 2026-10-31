/* =========================================================
   THE VELMORIC CODEX — panels.js
   Penghubung aksi klik & kirim form di luar navigasi utama:
   komentar & balasan, profil, ganti password, serta dispatch
   ke aksi moderator (moderator.js) dan owner (owner.js).
========================================================= */

import * as Community from "./community.js";
import { changeOwnPassword, saveOwnProfile } from "./accounts.js";
import { handleModerator } from "./moderator.js";
import { handleOwner, handleOwnerForm, restoreRevision } from "./owner.js";
import { friendlyError, render, setStatus, state } from "./ui.js";
import { $ } from "./utils.js";

// =========================================================
// KOMENTAR
// =========================================================

/** Muat komentar satu entri ke state, lalu render ulang. */
export async function loadCommentsFor(entryId) {
  state.comments = { entryId, list: null };
  render();

  try {
    const list = await Community.loadComments(entryId);
    if (state.comments.entryId === entryId) state.comments = { entryId, list };
  } catch (error) {
    if (state.comments.entryId === entryId) state.comments = { entryId, list: error };
  }

  render();
}

function currentList() {
  return Array.isArray(state.comments.list) ? state.comments.list : [];
}

function toggleReply(id, open) {
  const form = document.querySelector(`#c-${CSS.escape(id)} .reply-form`);
  if (!form) return;

  form.hidden = !open;
  if (open) form.querySelector("textarea")?.focus();
}

async function deleteComment(id) {
  const list = currentList();
  const comment = list.find(item => item.id === id);
  if (!comment || !confirm("Hapus komentar ini? Balasannya ikut dihapus.")) return;

  const children = list.filter(item => item.parentId === id).map(item => item.id);

  try {
    await Community.removeComment(comment, children);
    state.comments = {
      ...state.comments,
      list: list.filter(item => item.id !== id && !children.includes(item.id))
    };
    setStatus("Komentar dihapus.");
    render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menghapus komentar."), true);
  }
}

async function postFrom(form, parentId) {
  const entryId = form.dataset.entry || state.comments.entryId;
  const teks = new FormData(form).get("teks");
  const button = form.querySelector("button[type=submit]");

  button.disabled = true;

  try {
    const comment = await Community.postComment({ entriId: entryId, teks, parentId });
    state.comments = { entryId, list: [...currentList(), comment] };
    setStatus(parentId ? "Balasan terkirim." : "Komentar terkirim.");
    render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal mengirim komentar."), true);
  } finally {
    button.disabled = false;
  }
}

// =========================================================
// PROFIL
// =========================================================

async function saveProfile(form) {
  const data = Object.fromEntries(new FormData(form));

  try {
    await saveOwnProfile(data);
    setStatus("Profil disimpan.");
    render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menyimpan profil."), true);
  }
}

async function changePassword(form) {
  const data = Object.fromEntries(new FormData(form));
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;

  try {
    await changeOwnPassword(data.current, data.next);
    form.reset();
    setStatus("Password berhasil diganti.");
  } catch (error) {
    const message = error?.code === "auth/invalid-credential" || error?.code === "auth/wrong-password"
      ? "Password saat ini salah."
      : friendlyError(error, "Gagal mengganti password.");
    setStatus(message, true);
  } finally {
    button.disabled = false;
  }
}

// =========================================================
// EVENT
// =========================================================

export function bindPanels() {
  document.addEventListener("click", async event => {
    const target = event.target.closest("[data-action], [data-restore]");
    if (!target) return;

    if (target.dataset.restore !== undefined) return restoreRevision(target.dataset.restore);

    const action = target.dataset.action;

    switch (action) {
      case "comment-reply": return toggleReply(target.dataset.id, true);
      case "comment-cancel": return toggleReply(target.dataset.id, false);
      case "comment-del": return deleteComment(target.dataset.id);
    }

    // Aksi moderator & owner: dikenali oleh modul masing-masing.
    if (await handleModerator(action, target)) return;
    await handleOwner(action, target);
  });

  document.addEventListener("submit", async event => {
    const form = event.target;
    const kind = form.dataset.form;
    if (!kind) return;

    event.preventDefault();

    switch (kind) {
      case "comment": return postFrom(form, "");
      case "reply": return postFrom(form, form.dataset.parent);
      case "profile": return saveProfile(form);
      case "password": return changePassword(form);
      default: await handleOwnerForm(form);
    }
  });

  // Tutup form balasan dengan tombol Escape bila sedang terbuka.
  $("main")?.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const form = event.target.closest?.(".reply-form");
    if (form) form.hidden = true;
  });
}
