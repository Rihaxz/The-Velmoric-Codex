/* =========================================================
   THE VELMORIC CODEX — accounts.js
   Kelola akun staf: owner membuat & menonaktifkan moderator
   langsung dari situs, dan setiap staf mengelola profilnya.

   Pembuatan akun email memakai aplikasi Firebase kedua
   (secondary) supaya sesi owner tidak tertimpa.
========================================================= */

import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut as signOutSecondary
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  auth,
  db,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
  firebaseConfig
} from "./firebase.js";
import { logActivity } from "./storage.js";
import { codeError } from "./utils.js";
import { patchProfile } from "./auth.js";

const ADMINS = "admins";

/** Daftar seluruh staf (hanya owner yang diizinkan Firestore membacanya). */
export async function listStaff() {
  const snap = await getDocs(collection(db, ADMINS));

  const rank = { owner: 0, moderator: 1 };

  return snap.docs
    .map(item => ({ uid: item.id, ...item.data() }))
    .sort((a, b) => (rank[a.role] ?? 2) - (rank[b.role] ?? 2)
      || String(a.nama || a.email || "").localeCompare(String(b.nama || b.email || "")));
}

/** Buat akun email di Auth tanpa mengganti sesi owner yang sedang aktif. */
async function createAuthAccount(email, password) {
  const name = `staff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const app = initializeApp(firebaseConfig, name);
  const secondary = getAuth(app);

  try {
    const credential = await createUserWithEmailAndPassword(secondary, email, password);
    return credential.user.uid;
  } finally {
    await signOutSecondary(secondary).catch(() => {});
    await deleteApp(app).catch(() => {});
  }
}

/** Owner: buat moderator baru. */
export async function createModerator({ email, password, nama }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanName = String(nama || "").trim().slice(0, 80);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw codeError("auth/invalid-email", "Format email tidak valid.");
  if (String(password || "").length < 8) throw codeError("auth/weak-password", "Password minimal 8 karakter.");
  if (!cleanName) throw codeError("invalid-name", "Nama tampilan wajib diisi.");

  const uid = await createAuthAccount(cleanEmail, password);

  await setDoc(doc(db, ADMINS, uid), {
    role: "moderator",
    nama: cleanName,
    email: cleanEmail,
    aktif: true,
    dibuatPada: new Date().toISOString(),
    dibuatOleh: auth.currentUser?.uid || ""
  });

  await logActivity("buat moderator", { id: "", nama: cleanName });
  return uid;
}

/** Owner: aktifkan atau nonaktifkan moderator (tanpa menghapus). */
export async function setModeratorActive(uid, active) {
  await updateDoc(doc(db, ADMINS, uid), {
    aktif: Boolean(active),
    diperbaruiPada: new Date().toISOString()
  });

  await logActivity(active ? "aktifkan moderator" : "nonaktifkan moderator", { id: "", nama: uid });
}

/** Owner: hapus peran moderator. Akun Auth tetap ada tetapi tidak punya hak. */
export async function removeModerator(uid) {
  await deleteDoc(doc(db, ADMINS, uid));
  await logActivity("hapus moderator", { id: "", nama: uid });
}

/** Staf: ubah nama tampilan dan bio sendiri. */
export async function saveOwnProfile({ nama, bio }) {
  const user = auth.currentUser;
  if (!user) throw codeError("auth/no-user", "Sesi tidak ditemukan.");

  const data = {
    nama: String(nama || "").trim().slice(0, 80),
    bio: String(bio || "").trim().slice(0, 500),
    diperbaruiPada: new Date().toISOString()
  };

  if (!data.nama) throw codeError("invalid-name", "Nama tampilan wajib diisi.");

  await updateDoc(doc(db, ADMINS, user.uid), data);
  patchProfile({ nama: data.nama, bio: data.bio });
}

/** Staf: ganti password. Firebase mewajibkan verifikasi password lama. */
export async function changeOwnPassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user || !user.email) throw codeError("auth/no-user", "Sesi tidak ditemukan.");
  if (String(newPassword || "").length < 8) throw codeError("auth/weak-password", "Password baru minimal 8 karakter.");

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
