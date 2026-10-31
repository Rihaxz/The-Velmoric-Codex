/* =========================================================
   THE VELMORIC CODEX — community.js
   Usulan entri dari anonim dan komentar pembaca.

     usulan/{id}    entri kiriman anonim, menunggu persetujuan
     komentar/{id}  komentar & balasan (satu tingkat)

   Usulan yang disetujui menjadi DRAF (bukan langsung terbit),
   sehingga moderator masih bisa merapikan sebelum menerbitkan.
========================================================= */

import {
  auth,
  db,
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from "./firebase.js";

import { createEntry, logActivity } from "./storage.js";
import { sanitizeEntry } from "./schema.js";
import { getState, ROLE } from "./auth.js";
import { codeError } from "./utils.js";

const USULAN = "usulan";
const KOMENTAR = "komentar";
const SUBMIT_COOLDOWN_MS = 20000;
const COMMENT_COOLDOWN_MS = 8000;
const COOLDOWN_KEY = "velmoric:cooldown:v1";

const now = () => new Date().toISOString();

// Pembatas sisi klien: mencegah kirim berulang tanpa sengaja.
// Aturan keamanan tetap jadi penegak utama.
function cooldown(key, wait) {
  let stamps = {};
  try { stamps = JSON.parse(sessionStorage.getItem(COOLDOWN_KEY) || "{}"); } catch { /* abaikan */ }

  const last = Number(stamps[key] || 0);
  if (Date.now() - last < wait) throw codeError("cooldown", "Tunggu sebentar sebelum mengirim lagi.");

  stamps[key] = Date.now();
  try { sessionStorage.setItem(COOLDOWN_KEY, JSON.stringify(stamps)); } catch { /* abaikan */ }
}

function currentIdentity() {
  const { role, user, profile } = getState();
  const isStaff = role === ROLE.MODERATOR || role === ROLE.OWNER;

  return {
    uid: user?.uid || auth.currentUser?.uid || "",
    nama: isStaff ? (profile?.nama || user?.email || "Staf") : "Pembaca Anonim",
    peran: isStaff ? role : "reader"
  };
}

// =========================================================
// USULAN
// =========================================================

/** Anonim/staf: kirim usulan entri baru (selalu mulai sebagai menunggu). */
export async function submitSubmission(input) {
  const user = auth.currentUser;
  if (!user) throw codeError("auth/no-user", "Sesi belum siap, coba lagi.");

  cooldown("usulan", SUBMIT_COOLDOWN_MS);

  const data = {
    ...sanitizeEntry(input),
    uid: user.uid,
    status: "menunggu",
    dikirimPada: now()
  };

  await addDoc(collection(db, USULAN), data);
  return data;
}

export async function loadSubmissions() {
  const snap = await getDocs(query(collection(db, USULAN), orderBy("dikirimPada", "desc"), limit(100)));
  return snap.docs.map(item => ({ id: item.id, ...item.data() }));
}

/** Moderator/owner: setujui usulan -> masuk sebagai draf, lalu hapus dari antrean. */
export async function approveSubmission(submission) {
  const { id, uid, status, dikirimPada, ...entry } = submission;

  await createEntry(entry, { draft: true });
  await deleteDoc(doc(db, USULAN, id));
  await logActivity("setujui usulan", { id: "", nama: entry.nama || "" });
}

export async function rejectSubmission(submission) {
  await deleteDoc(doc(db, USULAN, submission.id));
  await logActivity("tolak usulan", { id: "", nama: submission.nama || "" });
}

// =========================================================
// KOMENTAR
// =========================================================

/** Komentar satu entri. Diurutkan di klien agar tidak perlu indeks komposit. */
export async function loadComments(entriId) {
  const snap = await getDocs(query(collection(db, KOMENTAR), where("entriId", "==", entriId), limit(300)));

  return snap.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => String(a.dibuatPada).localeCompare(String(b.dibuatPada)));
}

/** Komentar terbaru di seluruh situs (untuk panel moderator). */
export async function loadRecentComments(count = 60) {
  const snap = await getDocs(query(collection(db, KOMENTAR), orderBy("dibuatPada", "desc"), limit(count)));
  return snap.docs.map(item => ({ id: item.id, ...item.data() }));
}

/** Kirim komentar utama (parentId kosong) atau balasan (parentId = id komentar utama). */
export async function postComment({ entriId, teks, parentId = "" }) {
  const body = String(teks || "").trim();
  if (!body) throw codeError("empty", "Komentar tidak boleh kosong.");
  if (body.length > 1000) throw codeError("too-long", "Komentar maksimal 1000 karakter.");

  cooldown("komentar", COMMENT_COOLDOWN_MS);

  const who = currentIdentity();
  if (!who.uid) throw codeError("auth/no-user", "Sesi belum siap, coba lagi.");

  const data = {
    entriId,
    parentId,
    teks: body,
    uid: who.uid,
    nama: who.nama,
    peran: who.peran,
    dibuatPada: now()
  };

  const ref = await addDoc(collection(db, KOMENTAR), data);
  return { id: ref.id, ...data };
}

/** Hapus komentar: moderator/owner, atau penulisnya sendiri. Balasan ikut dihapus. */
export async function removeComment(comment, childrenIds = []) {
  // Balasan milik orang lain mungkin tidak bisa dihapus oleh pembaca biasa;
  // kegagalan balasan tidak boleh menghalangi penghapusan komentar utama.
  await Promise.allSettled(childrenIds.map(childId => deleteDoc(doc(db, KOMENTAR, childId))));
  await deleteDoc(doc(db, KOMENTAR, comment.id));
}

