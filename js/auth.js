/* =========================================================
   THE VELMORIC CODEX — auth.js
   Dua jalur masuk yang terpisah:

   1. PEMBACA -> otomatis, anonim, tanpa form (hanya baca)
   2. ADMIN   -> email + password, lalu diverifikasi lewat
                 dokumen admins/{uid} di Firestore.

   Akun email yang BUKAN admin langsung di-sign-out dan
   dikembalikan menjadi pembaca anonim.

   Pengecekan di sini hanya untuk tampilan. Penegakan
   sebenarnya ada di firestore.rules.
========================================================= */

import {
  auth,
  db,
  doc,
  getDoc,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut
} from "./firebase.js";

import { codeError } from "./utils.js";

export const ROLE = Object.freeze({
  NONE: "none",     // belum ada sesi (sedang masuk / gagal)
  READER: "reader", // anonim, hanya baca
  ADMIN: "admin"    // email + terdaftar di admins/{uid}
});

const LOGIN_TIMEOUT_MS = 20000;

let started = false;
let state = Object.freeze({ role: ROLE.NONE, user: null, error: null });
let pendingLogin = null;

const listeners = new Set();

function publish(role, user = null, error = null) {
  state = Object.freeze({ role, user, error });

  for (const listener of listeners) {
    try {
      listener(state);
    } catch (err) {
      console.error("[Velmoric Auth] listener error:", err);
    }
  }
}

async function isVerifiedAdmin(user) {
  if (!user || user.isAnonymous) return false;

  try {
    const snapshot = await getDoc(doc(db, "admins", user.uid));
    return snapshot.exists() && snapshot.data().role === "admin";
  } catch (error) {
    console.error("[Velmoric Auth] Pemeriksaan admin gagal:", error);
    return false;
  }
}

async function handleUser(user) {
  // Tidak ada sesi -> masuk sebagai pembaca anonim.
  if (!user) {
    publish(ROLE.NONE);

    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("[Velmoric Auth] Login anonim gagal:", error);
      publish(ROLE.NONE, null, error.code || "auth/anonymous-failed");
    }

    return;
  }

  if (user.isAnonymous) {
    publish(ROLE.READER, user);
    return;
  }

  // Sesi email -> harus admin terverifikasi.
  const verified = await isVerifiedAdmin(user);

  // Sesi bisa berubah selama menunggu (mis. logout). Abaikan hasil basi.
  if (auth.currentUser?.uid !== user.uid) return;

  if (verified) {
    publish(ROLE.ADMIN, user);
    pendingLogin?.resolve();
    return;
  }

  console.warn("[Velmoric Auth] Akun bukan admin, sesi dihentikan.");

  pendingLogin?.reject(
    codeError("not-admin", "Akun ini tidak memiliki hak administrator.")
  );

  // Keluar -> listener menerima null -> kembali ke pembaca anonim.
  try {
    await signOut(auth);
  } catch (error) {
    console.error("[Velmoric Auth] signOut gagal:", error);
  }
}

export function start() {
  if (started) return;

  started = true;

  onAuthStateChanged(auth, user => {
    handleUser(user).catch(error =>
      console.error("[Velmoric Auth] Kesalahan tak terduga:", error)
    );
  });
}

/** Daftarkan listener; langsung dipanggil dengan status terkini. */
export function onChange(listener) {
  listeners.add(listener);
  listener(state);

  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

/**
 * Login admin. Resolve jika terverifikasi admin.
 * Reject dengan error ber-`code`, misalnya:
 *   "not-admin", "auth/invalid-credential", "auth/timeout".
 */
export async function loginAdmin(email, password) {
  if (!started) throw codeError("auth/not-ready", "Firebase belum siap.");

  let timer;

  const attempt = {};
  attempt.promise = new Promise((resolve, reject) => {
    attempt.resolve = resolve;
    attempt.reject = reject;
  });
  attempt.promise.catch(() => {}); // cegah "unhandled rejection"

  pendingLogin = attempt;

  try {
    timer = setTimeout(
      () => attempt.reject(codeError("auth/timeout", "Waktu login habis.")),
      LOGIN_TIMEOUT_MS
    );

    await signInWithEmailAndPassword(auth, email, password);
    await attempt.promise;
  } finally {
    clearTimeout(timer);
    if (pendingLogin === attempt) pendingLogin = null;
  }
}

/** Logout admin; otomatis kembali menjadi pembaca anonim. */
export function logoutAdmin() {
  return signOut(auth);
}
