/* =========================================================
   moderator.js — aksi khusus MODERATOR (dan owner):
   menyetujui/menolak usulan anonim, moderasi komentar,
   dan memuat ulang antrean.
========================================================= */

import * as Store from "./storage.js";
import * as Community from "./community.js";
import { friendlyError, render, setStatus, state } from "./ui.js";

/** Muat antrean usulan & komentar terbaru ke state. */
export async function loadModerationData() {
  const [submissions, comments] = await Promise.allSettled([
    Community.loadSubmissions(),
    Community.loadRecentComments()
  ]);

  state.moderation = {
    submissions: submissions.status === "fulfilled" ? submissions.value : submissions.reason,
    comments: comments.status === "fulfilled" ? comments.value : comments.reason
  };

  render();
}

function findSubmission(id) {
  return Array.isArray(state.moderation.submissions)
    ? state.moderation.submissions.find(item => item.id === id)
    : null;
}

async function approve(id) {
  const submission = findSubmission(id);
  if (!submission || !confirm(`Setujui usulan “${submission.nama}” sebagai draf?`)) return;

  try {
    await Community.approveSubmission(submission);
    state.moderation.submissions = state.moderation.submissions.filter(item => item.id !== id);
    setStatus("Usulan disetujui dan masuk sebagai draf.");
    await Store.loadEntries({ withDrafts: true });
    render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menyetujui usulan."), true);
  }
}

async function reject(id) {
  const submission = findSubmission(id);
  if (!submission || !confirm(`Tolak usulan “${submission.nama}”? Usulan akan dihapus.`)) return;

  try {
    await Community.rejectSubmission(submission);
    state.moderation.submissions = state.moderation.submissions.filter(item => item.id !== id);
    setStatus("Usulan ditolak.");
    render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menolak usulan."), true);
  }
}

async function deleteComment(id) {
  const comment = Array.isArray(state.moderation.comments)
    ? state.moderation.comments.find(item => item.id === id)
    : null;

  if (!comment || !confirm("Hapus komentar ini?")) return;

  try {
    await Community.removeComment(comment);
    state.moderation.comments = state.moderation.comments.filter(item => item.id !== id);
    setStatus("Komentar dihapus.");
    render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menghapus komentar."), true);
  }
}

/** Dipanggil dari panels.js. Mengembalikan true bila aksi dikenali. */
export async function handleModerator(action, target) {
  switch (action) {
    case "mod-approve": await approve(target.dataset.id); return true;
    case "mod-reject": await reject(target.dataset.id); return true;
    case "mod-del-comment": await deleteComment(target.dataset.id); return true;
    case "mod-reload": await loadModerationData(); return true;
    default: return false;
  }
}

/** Log aktivitas staf (dipakai panel moderator & owner). */
export async function loadActivity() {
  state.activity = null;
  render();

  try {
    state.activity = await Store.loadActivity();
  } catch (error) {
    console.warn("Log aktivitas:", error);
    state.activity = error;
  }

  render();
}
