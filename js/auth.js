/* =========================================================
   THE VELMORIC CODEX — auth.js
   Tiga peran, dari atas ke bawah:

     OWNER      : pemilik situs. Semua hak.
     MODERATOR  : kelola entri, usulan, dan komentar.
     READER     : anonim (otomatis). Membaca, mengusulkan
                  entri, dan berkomentar.

   Staf masuk dengan email + password. Perannya dibaca dari
   dokumen admins/{uid} di Firestore. Akun email yang tidak
   terdaftar atau dinonaktifkan langsung di-sign-out.

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
  NONE: "none",           // belum ada sesi (sedang masuk / gagal)
  READER: "reader",       // anonim
  MODERATOR: "moderator",
  OWNER: "owner"
});

const STAFF_ROLES = new Set([ROLE.MODERATOR, ROLE.OWNER]);
const LOGIN_TIMEOUT_MS = 20000;

let started = false;
let state = Object.freeze({ role: ROLE.NONE, user: null, profile: null, error: null });
let pendingLogin = null;

const listeners = new Set();

export const isStaffRole = role => STAFF_ROLES.has(role);

function publish(role, user = null, profile = null, error = null) {
  state = Object.freeze({ role, user, profile, error });

  for (const listener of listeners) {
    try {
      listener(state);
    } catch (err) {
      console.error("[Velmoric Auth] listener error:", err);
    }
  }
}

/**
 * Ambil profil staf. Mengembalikan { profile } jika valid,
 * { profile: null } jika bukan staf / nonaktif, atau { error } jika
 * server tidak bisa dihubungi (sesi tidak dihapus dalam kasus ini).
 */
async function loadStaffProfile(user) {
  try {
    const snapshot = await getDoc(doc(db, "admins", user.uid));
    if (!snapshot.exists()) return { profile: null };

    const data = snapshot.data();
    const valid = STAFF_ROLES.has(data.role) && data.aktif !== false;

    return {
      profile: valid
        ? { uid: user.uid, email: user.email || "", ...data }
        : null
    };
  } catch (error) {
    console.error("[Velmoric Auth] Pemeriksaan peran gagal:", error);
    return { error };
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
      publish(ROLE.NONE, null, null, error.code || "auth/anonymous-failed");
    }

    return;
  }

  if (user.isAnonymous) {
    publish(ROLE.READER, user);
    return;
  }

  // Sesi email -> harus staf terverifikasi.
  const { profile, error } = await loadStaffProfile(user);

  // Sesi bisa berubah selama menunggu (mis. logout). Abaikan hasil basi.
  if (auth.currentUser?.uid !== user.uid) return;

  if (error) {
    publish(ROLE.NONE, null, null, "auth/profile-failed");
    return;
  }

  if (profile) {
    publish(profile.role, user, profile);
    pendingLogin?.resolve();
    return;
  }

  console.warn("[Velmoric Auth] Akun bukan staf aktif, sesi dihentikan.");

  pendingLogin?.reject(
    codeError("not-admin", "Akun ini tidak memiliki hak akses moderator atau owner.")
  );

  try {
    await signOut(auth);
  } catch (err) {
    console.error("[Velmoric Auth] signOut gagal:", err);
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

/** Perbarui profil di memori setelah profil disimpan ke server. */
export function patchProfile(patch) {
  if (!state.profile) return;
  publish(state.role, state.user, { ...state.profile, ...patch }, state.error);
}

/**
 * Login staf. Resolve jika peran valid (moderator/owner).
 * Reject dengan error ber-`code`, misalnya:
 *   "not-admin", "auth/invalid-credential", "auth/timeout".
 */
export async function loginStaff(email, password) {
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

/** Keluar dari akun staf; otomatis kembali menjadi pembaca anonim. */
export function logoutStaff() {
  return signOut(auth);
}
