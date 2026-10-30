/* =========================================================
   THE VELMORIC CODEX
   auth.js
   Dua jalur masuk yang terpisah:

   1. PEMBACA  -> otomatis, anonim, tanpa form (read-only)
   2. ADMIN    -> hanya lewat email + password, lalu diverifikasi
                  lewat dokumen admins/{uid} di Firestore.

   Akun email yang BUKAN admin langsung di-sign-out dan
   dikembalikan ke sesi pembaca anonim.

   Catatan keamanan: pengecekan di sini hanya untuk tampilan (UI).
   Penegakan sebenarnya ada di firestore.rules.
========================================================= */

(() => {
  "use strict";

  const ROLE = Object.freeze({
    NONE: "none",     // belum ada sesi (sedang masuk / gagal)
    READER: "reader", // anonim, hanya baca
    ADMIN: "admin"    // email + terdaftar di admins/{uid}
  });

  const LOGIN_TIMEOUT_MS = 20000;

  let started = false;
  let state = { role: ROLE.NONE, user: null, error: null };
  let pendingLogin = null;

  const listeners = new Set();

  // =======================================================
  // HELPER
  // =======================================================

  function funcs() {
    if (!window.firebaseFuncs) {
      throw codeError("auth/not-ready", "Firebase belum siap.");
    }

    return window.firebaseFuncs;
  }

  function auth() {
    if (!window.firebaseAuth) {
      throw codeError("auth/not-ready", "Firebase Auth belum siap.");
    }

    return window.firebaseAuth;
  }

  function codeError(code, message) {
    const error = new Error(message || code);
    error.code = code;
    return error;
  }

  function deferred() {
    const d = {};

    d.promise = new Promise((resolve, reject) => {
      d.resolve = resolve;
      d.reject = reject;
    });

    // Cegah peringatan "unhandled rejection" bila ditolak
    // sebelum ada yang sempat menunggu.
    d.promise.catch(() => {});

    return d;
  }

  function publish(role, user = null, error = null) {
    state = { role, user, error };

    listeners.forEach(listener => {
      try {
        listener({ ...state });
      } catch (err) {
        console.error("[Velmoric Auth] listener error:", err);
      }
    });
  }

  // =======================================================
  // VERIFIKASI ADMIN
  // =======================================================

  async function isVerifiedAdmin(user) {
    if (!user || user.isAnonymous) return false;

    try {
      const { doc, getDoc } = funcs();

      const snapshot = await getDoc(
        doc(window.firebaseDB, "admins", user.uid)
      );

      return snapshot.exists() && snapshot.data().role === "admin";

    } catch (error) {
      console.error("[Velmoric Auth] Pemeriksaan admin gagal:", error);
      return false;
    }
  }

  // =======================================================
  // PENANGAN PERUBAHAN SESI
  // =======================================================

  async function handleUser(user) {
    // --- Tidak ada sesi -> masuk sebagai pembaca anonim ---
    if (!user) {
      publish(ROLE.NONE);

      try {
        await funcs().signInAnonymously(auth());
      } catch (error) {
        console.error("[Velmoric Auth] Login anonim gagal:", error);
        publish(ROLE.NONE, null, error.code || "auth/anonymous-failed");
      }

      return;
    }

    // --- Sesi anonim -> pembaca ---
    if (user.isAnonymous) {
      publish(ROLE.READER, user);
      return;
    }

    // --- Sesi email -> harus admin terverifikasi ---
    const verified = await isVerifiedAdmin(user);

    // Sesi bisa berubah selama menunggu (mis. logout). Abaikan hasil basi.
    if (auth().currentUser?.uid !== user.uid) return;

    if (verified) {
      publish(ROLE.ADMIN, user);

      if (pendingLogin) pendingLogin.resolve();

      return;
    }

    console.warn("[Velmoric Auth] Akun bukan admin, sesi dihentikan.");

    if (pendingLogin) {
      pendingLogin.reject(
        codeError("not-admin", "Akun ini tidak memiliki hak administrator.")
      );
    }

    // Keluar -> listener menerima null -> kembali ke pembaca anonim.
    try {
      await funcs().signOut(auth());
    } catch (error) {
      console.error("[Velmoric Auth] signOut gagal:", error);
    }
  }

  // =======================================================
  // API PUBLIK
  // =======================================================

  function start() {
    if (started) return;

    started = true;

    funcs().onAuthStateChanged(auth(), user => {
      handleUser(user).catch(error => {
        console.error("[Velmoric Auth] Kesalahan tak terduga:", error);
      });
    });
  }

  function onChange(listener) {
    listeners.add(listener);

    // Kirim status terkini agar pemanggil yang telat tetap sinkron.
    if (started) listener({ ...state });

    return () => listeners.delete(listener);
  }

  /**
   * Login admin (email + password). Resolve jika terverifikasi admin.
   * Reject dengan error ber-`code`:
   *   - "not-admin"                -> akun valid tapi bukan admin
   *   - "auth/invalid-credential"  -> email/password salah, dst.
   */
  async function loginAdmin(email, password) {
    if (!started) {
      throw codeError("auth/not-ready", "Firebase belum siap.");
    }

    const attempt = deferred();
    pendingLogin = attempt;

    const timer = setTimeout(() => {
      attempt.reject(codeError("auth/timeout", "Waktu login habis."));
    }, LOGIN_TIMEOUT_MS);

    try {
      await funcs().signInWithEmailAndPassword(auth(), email, password);
      await attempt.promise;

    } finally {
      clearTimeout(timer);

      if (pendingLogin === attempt) pendingLogin = null;
    }
  }

  /** Logout admin. Otomatis kembali ke pembaca anonim. */
  async function logoutAdmin() {
    await funcs().signOut(auth());
  }

  function getState() {
    return { ...state };
  }

  window.Auth = Object.freeze({
    ROLE,
    start,
    onChange,
    loginAdmin,
    logoutAdmin,
    getState
  });

  console.log("[Velmoric Auth] Modul auth dimuat.");

})();
