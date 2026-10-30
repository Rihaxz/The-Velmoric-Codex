/* =========================================================
   THE VELMORIC CODEX
   storage.js
   Firebase Firestore Storage Manager

   Semua fungsi melempar error jika gagal; pemanggil (logic.js)
   yang menampilkan pesan ke pengguna.
========================================================= */

(() => {
  "use strict";

  const COLLECTION_KARAKTER = "karakter";
  const COLLECTION_PENGATURAN = "pengaturan";
  const SETTINGS_DOCUMENT = "global";

  // =======================================================
  // HELPER
  // =======================================================

  function getFirebaseDB() {
    if (!window.firebaseDB) {
      throw new Error("Firebase Firestore belum diinisialisasi.");
    }

    return window.firebaseDB;
  }

  function getFunction(name) {
    const funcs = window.firebaseFuncs;

    if (!funcs || typeof funcs[name] !== "function") {
      throw new Error(`Firebase function "${name}" tidak ditemukan.`);
    }

    return funcs[name];
  }

  function getTimestamp() {
    return new Date().toISOString();
  }

  function logError(action, error) {
    console.error(`[Velmoric Storage] ${action}:`, error);
    return error;
  }

  function currentCharacters() {
    return Array.isArray(window.characters) ? window.characters : [];
  }

  function normalizeSettings(settings = {}) {
    const source = settings && typeof settings === "object" ? settings : {};

    const theme = source.theme === "light" ? "light" : "dark";

    let musicUrls = [];

    if (Array.isArray(source.musicUrls)) {
      musicUrls = source.musicUrls;
    } else if (
      typeof source.musicUrl === "string" &&
      source.musicUrl.trim()
    ) {
      musicUrls = [source.musicUrl.trim()];
    }

    musicUrls = musicUrls
      .filter(url => typeof url === "string")
      .map(url => url.trim())
      .filter(Boolean);

    return {
      theme,
      musicUrls,
      musicUrl: musicUrls[0] || ""
    };
  }

  // =======================================================
  // MEMUAT DATA
  // =======================================================

  async function muatDataDariFirebase() {
    try {
      const db = getFirebaseDB();
      const collection = getFunction("collection");
      const getDocs = getFunction("getDocs");

      const snapshot = await getDocs(
        collection(db, COLLECTION_KARAKTER)
      );

      const data = [];

      snapshot.forEach(document => {
        data.push({ id: document.id, ...document.data() });
      });

      // Terbaru dulu.
      data.sort((a, b) =>
        String(b.dibuatPada || "").localeCompare(
          String(a.dibuatPada || "")
        )
      );

      window.characters = data;

      console.log(`[Velmoric Storage] ${data.length} entri dimuat.`);

      return data;

    } catch (error) {
      throw logError("Gagal memuat entri", error);
    }
  }

  // =======================================================
  // MENAMBAH ENTRI
  // =======================================================

  async function simpanDataKeFirebase(dataKarakter) {
    try {
      if (!dataKarakter || typeof dataKarakter !== "object") {
        throw new Error("Data entri tidak valid.");
      }

      const db = getFirebaseDB();
      const collection = getFunction("collection");
      const addDoc = getFunction("addDoc");

      const waktu = getTimestamp();

      const data = {
        ...dataKarakter,
        nama: String(dataKarakter.nama || "").trim(),
        kategori: String(dataKarakter.kategori || "Lainnya").trim(),
        dibuatPada: dataKarakter.dibuatPada || waktu,
        diperbaruiPada: waktu
      };

      // ID dibuat Firestore; jangan disimpan sebagai field.
      delete data.id;

      if (!data.nama) {
        throw new Error("Nama entri tidak boleh kosong.");
      }

      const result = await addDoc(
        collection(db, COLLECTION_KARAKTER),
        data
      );

      const baru = { id: result.id, ...data };

      window.characters = [baru, ...currentCharacters()];

      return baru;

    } catch (error) {
      throw logError("Gagal menyimpan entri", error);
    }
  }

  // =======================================================
  // MEMPERBARUI ENTRI
  // =======================================================

  async function updateDataDiFirebase(id, dataKarakter) {
    try {
      if (!id) {
        throw new Error("ID entri tidak ditemukan.");
      }

      if (!dataKarakter || typeof dataKarakter !== "object") {
        throw new Error("Data entri tidak valid.");
      }

      const db = getFirebaseDB();
      const doc = getFunction("doc");
      const updateDoc = getFunction("updateDoc");

      const data = {
        ...dataKarakter,
        diperbaruiPada: getTimestamp()
      };

      delete data.id;
      delete data.dibuatPada; // tanggal dibuat tidak boleh berubah

      if (data.nama !== undefined) {
        data.nama = String(data.nama).trim();

        if (!data.nama) {
          throw new Error("Nama entri tidak boleh kosong.");
        }
      }

      await updateDoc(doc(db, COLLECTION_KARAKTER, id), data);

      window.characters = currentCharacters().map(item =>
        item.id === id ? { ...item, ...data, id } : item
      );

      return { id, ...data };

    } catch (error) {
      throw logError("Gagal memperbarui entri", error);
    }
  }

  // =======================================================
  // MENGHAPUS ENTRI
  // =======================================================

  async function hapusDataDariFirebase(id) {
    try {
      if (!id) {
        throw new Error("ID entri tidak ditemukan.");
      }

      const db = getFirebaseDB();
      const doc = getFunction("doc");
      const deleteDoc = getFunction("deleteDoc");

      await deleteDoc(doc(db, COLLECTION_KARAKTER, id));

      window.characters = currentCharacters().filter(
        item => item.id !== id
      );

      return true;

    } catch (error) {
      throw logError("Gagal menghapus entri", error);
    }
  }

  // =======================================================
  // PENGATURAN GLOBAL
  // =======================================================

  /**
   * Hanya MEMBACA. Jika dokumen belum ada, pakai nilai bawaan.
   * (Versi lama mencoba menulis dokumen default dari sesi
   * pembaca anonim -> selalu ditolak oleh rules.)
   */
  async function muatPengaturanGlobal() {
    try {
      const db = getFirebaseDB();
      const doc = getFunction("doc");
      const getDoc = getFunction("getDoc");

      const snapshot = await getDoc(
        doc(db, COLLECTION_PENGATURAN, SETTINGS_DOCUMENT)
      );

      const settings = normalizeSettings(
        snapshot.exists() ? snapshot.data() : {}
      );

      applyGlobalSettings(settings);

      return settings;

    } catch (error) {
      throw logError("Gagal memuat pengaturan", error);
    }
  }

  /**
   * Menerapkan tema + playlist ke halaman.
   * Tema memakai class `light-mode` pada <body> (sesuai CSS).
   */
  function applyGlobalSettings(settings = {}) {
    const normalized = normalizeSettings(settings);

    window.globalSettings = normalized;
    window.musicPlaylist = normalized.musicUrls;

    document.documentElement.setAttribute("data-theme", normalized.theme);

    document.body.classList.toggle(
      "light-mode",
      normalized.theme === "light"
    );

    if (window.MusicPlayer) {
      window.MusicPlayer.setPlaylist(normalized.musicUrls);
    }

    return normalized;
  }

  /**
   * Menerima objek { theme, musicUrls }
   * ATAU gaya lama: (theme, musicUrls[]).
   */
  async function simpanPengaturanGlobal(arg1 = {}, arg2) {
    try {
      const input =
        typeof arg1 === "string"
          ? { theme: arg1, musicUrls: arg2 }
          : arg1;

      const db = getFirebaseDB();
      const doc = getFunction("doc");
      const setDoc = getFunction("setDoc");

      const normalized = normalizeSettings(input);

      await setDoc(
        doc(db, COLLECTION_PENGATURAN, SETTINGS_DOCUMENT),
        normalized,
        { merge: true }
      );

      applyGlobalSettings(normalized);

      return normalized;

    } catch (error) {
      throw logError("Gagal menyimpan pengaturan", error);
    }
  }

  // =======================================================
  // EXPORT
  // =======================================================

  window.muatDataDariFirebase = muatDataDariFirebase;
  window.simpanDataKeFirebase = simpanDataKeFirebase;
  window.updateDataDiFirebase = updateDataDiFirebase;
  window.hapusDataDariFirebase = hapusDataDariFirebase;
  window.muatPengaturanGlobal = muatPengaturanGlobal;
  window.applyGlobalSettings = applyGlobalSettings;
  window.simpanPengaturanGlobal = simpanPengaturanGlobal;

  console.log("[Velmoric Storage] Storage manager dimuat.");

})();
