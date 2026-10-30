
/* =========================================================
   THE VELMORIC CODEX
   storage.js
   Firebase Firestore Storage Manager
========================================================= */

(() => {
  "use strict";

  // =======================================================
  // KONFIGURASI FIREBASE
  // =======================================================

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

  function getFirebaseFuncs() {
    if (!window.firebaseFuncs) {
      throw new Error("Firebase functions belum tersedia.");
    }

    return window.firebaseFuncs;
  }

  function getFunction(name) {
    const funcs = getFirebaseFuncs();

    if (typeof funcs[name] !== "function") {
      throw new Error(`Firebase function "${name}" tidak ditemukan.`);
    }

    return funcs[name];
  }

  function getTimestamp() {
    return new Date().toISOString();
  }

  function normalizeSettings(settings = {}) {
    const theme =
      settings.theme === "light" ? "light" : "dark";

    let musicUrls = [];

    if (Array.isArray(settings.musicUrls)) {
      musicUrls = settings.musicUrls;
    } else if (
      typeof settings.musicUrl === "string" &&
      settings.musicUrl.trim()
    ) {
      musicUrls = [settings.musicUrl.trim()];
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

  function updateLocalCharacters(data) {
    window.characters = data;

    // Menyinkronkan variabel global dari data.js,
    // jika variabel tersebut memang tersedia.
    try {
      if (typeof characters !== "undefined") {
        characters = data;
      }
    } catch (error) {
      console.warn("Tidak dapat menyinkronkan characters:", error);
    }
  }

  function updateLocalSettings(settings) {
    window.globalSettings = settings;

    try {
      if (typeof globalSettings !== "undefined") {
        globalSettings = settings;
      }
    } catch (error) {
      console.warn("Tidak dapat menyinkronkan globalSettings:", error);
    }
  }

  function showStorageError(action, error) {
    console.error(`[Velmoric Storage] ${action}:`, error);
    throw error;
  }

  // =======================================================
  // MEMUAT DATA KARAKTER
  // =======================================================

  async function muatDataDariFirebase() {
    try {
      const db = getFirebaseDB();

      const collection = getFunction("collection");
      const getDocs = getFunction("getDocs");

      const karakterRef = collection(
        db,
        COLLECTION_KARAKTER
      );

      const snapshot = await getDocs(karakterRef);

      const data = [];

      snapshot.forEach(document => {
        data.push({
          id: document.id,
          ...document.data()
        });
      });

      // Urutkan berdasarkan waktu pembuatan.
      data.sort((a, b) => {
        const waktuA = a.dibuatPada || "";
        const waktuB = b.dibuatPada || "";

        return waktuB.localeCompare(waktuA);
      });

      updateLocalCharacters(data);

      console.log(
        `[Velmoric Storage] ${data.length} karakter berhasil dimuat.`
      );

      return data;

    } catch (error) {
      showStorageError("Gagal memuat karakter", error);
    }
  }

  // =======================================================
  // MENAMBAH KARAKTER
  // =======================================================

  async function simpanDataKeFirebase(dataKarakter) {
    try {
      if (!dataKarakter || typeof dataKarakter !== "object") {
        throw new Error("Data karakter tidak valid.");
      }

      const db = getFirebaseDB();

      const collection = getFunction("collection");
      const addDoc = getFunction("addDoc");

      const waktu = getTimestamp();

      const data = {
        ...dataKarakter,

        nama: String(dataKarakter.nama || "").trim(),

        kategori:
          String(dataKarakter.kategori || "Lainnya").trim(),

        dibuatPada:
          dataKarakter.dibuatPada || waktu,

        diperbaruiPada: waktu
      };

      if (!data.nama) {
        throw new Error("Nama karakter tidak boleh kosong.");
      }

      const karakterRef = collection(
        db,
        COLLECTION_KARAKTER
      );

      const result = await addDoc(
        karakterRef,
        data
      );

      const karakterBaru = {
        id: result.id,
        ...data
      };

      const current = Array.isArray(window.characters)
        ? window.characters
        : [];

      updateLocalCharacters([
        karakterBaru,
        ...current
      ]);

      console.log(
        "[Velmoric Storage] Karakter berhasil ditambahkan:",
        karakterBaru.nama
      );

      return karakterBaru;

    } catch (error) {
      showStorageError("Gagal menyimpan karakter", error);
    }
  }

  // =======================================================
  // MEMPERBARUI KARAKTER
  // =======================================================

  async function updateDataDiFirebase(id, dataKarakter) {
    try {
      if (!id) {
        throw new Error("ID karakter tidak ditemukan.");
      }

      if (!dataKarakter || typeof dataKarakter !== "object") {
        throw new Error("Data karakter tidak valid.");
      }

      const db = getFirebaseDB();

      const doc = getFunction("doc");
      const updateDoc = getFunction("updateDoc");

      const data = {
        ...dataKarakter,
        diperbaruiPada: getTimestamp()
      };

      if (data.nama !== undefined) {
        data.nama = String(data.nama).trim();

        if (!data.nama) {
          throw new Error("Nama karakter tidak boleh kosong.");
        }
      }

      const karakterRef = doc(
        db,
        COLLECTION_KARAKTER,
        id
      );

      await updateDoc(
        karakterRef,
        data
      );

      const current = Array.isArray(window.characters)
        ? window.characters
        : [];

      const updated = current.map(character => {
        if (character.id !== id) {
          return character;
        }

        return {
          ...character,
          ...data,
          id
        };
      });

      updateLocalCharacters(updated);

      console.log(
        "[Velmoric Storage] Karakter berhasil diperbarui:",
        id
      );

      return {
        id,
        ...data
      };

    } catch (error) {
      showStorageError("Gagal memperbarui karakter", error);
    }
  }

  // =======================================================
  // MENGHAPUS KARAKTER
  // =======================================================

  async function hapusDataDariFirebase(id) {
    try {
      if (!id) {
        throw new Error("ID karakter tidak ditemukan.");
      }

      const db = getFirebaseDB();

      const doc = getFunction("doc");
      const deleteDoc = getFunction("deleteDoc");

      const karakterRef = doc(
        db,
        COLLECTION_KARAKTER,
        id
      );

      await deleteDoc(karakterRef);

      const current = Array.isArray(window.characters)
        ? window.characters
        : [];

      const updated = current.filter(
        character => character.id !== id
      );

      updateLocalCharacters(updated);

      console.log(
        "[Velmoric Storage] Karakter berhasil dihapus:",
        id
      );

      return true;

    } catch (error) {
      showStorageError("Gagal menghapus karakter", error);
    }
  }

  // =======================================================
  // MEMUAT PENGATURAN GLOBAL
  // =======================================================

  async function muatPengaturanGlobal() {
    try {
      const db = getFirebaseDB();

      const doc = getFunction("doc");
      const getDoc = getFunction("getDoc");
      const setDoc = getFunction("setDoc");

      const settingsRef = doc(
        db,
        COLLECTION_PENGATURAN,
        SETTINGS_DOCUMENT
      );

      const snapshot = await getDoc(settingsRef);

      let settings;

      if (snapshot.exists()) {
        settings = normalizeSettings(snapshot.data());
      } else {
        settings = normalizeSettings();

        await setDoc(
          settingsRef,
          settings
        );
      }

      updateLocalSettings(settings);

      applyGlobalSettings(settings);

      console.log(
        "[Velmoric Storage] Pengaturan global berhasil dimuat."
      );

      return settings;

    } catch (error) {
      showStorageError("Gagal memuat pengaturan global", error);
    }
  }

  // =======================================================
  // MENERAPKAN PENGATURAN GLOBAL
  // =======================================================

  function applyGlobalSettings(settings = {}) {
    const normalized = normalizeSettings(settings);

    // Terapkan tema.
    document.documentElement.setAttribute(
      "data-theme",
      normalized.theme
    );

    document.documentElement.classList.toggle(
      "light-theme",
      normalized.theme === "light"
    );

    document.documentElement.classList.toggle(
      "dark-theme",
      normalized.theme === "dark"
    );

    // Sinkronkan playlist.
    window.musicPlaylist = normalized.musicUrls;

    try {
      if (typeof musicPlaylist !== "undefined") {
        musicPlaylist = normalized.musicUrls;
      }
    } catch (error) {
      console.warn("Gagal menyinkronkan playlist:", error);
    }

    // Perbarui sumber musik jika fungsi tersedia.
    if (
      normalized.musicUrls.length > 0 &&
      typeof window.loadTrack === "function"
    ) {
      try {
        window.loadTrack(0);
      } catch (error) {
        console.warn("Gagal memuat track musik:", error);
      }
    }

    updateLocalSettings(normalized);

    return normalized;
  }

  // =======================================================
  // MENYIMPAN PENGATURAN GLOBAL
  // =======================================================

  async function simpanPengaturanGlobal(settings = {}) {
    try {
      const db = getFirebaseDB();

      const doc = getFunction("doc");
      const setDoc = getFunction("setDoc");

      const normalized = normalizeSettings(settings);

      const settingsRef = doc(
        db,
        COLLECTION_PENGATURAN,
        SETTINGS_DOCUMENT
      );

      await setDoc(
        settingsRef,
        normalized,
        { merge: true }
      );

      updateLocalSettings(normalized);

      applyGlobalSettings(normalized);

      console.log(
        "[Velmoric Storage] Pengaturan berhasil disimpan."
      );

      return normalized;

    } catch (error) {
      showStorageError("Gagal menyimpan pengaturan global", error);
    }
  }

  // =======================================================
  // EXPORT DATA UNTUK LOGIC.JS
  // =======================================================

  window.muatDataDariFirebase =
    muatDataDariFirebase;

  window.simpanDataKeFirebase =
    simpanDataKeFirebase;

  window.updateDataDiFirebase =
    updateDataDiFirebase;

  window.hapusDataDariFirebase =
    hapusDataDariFirebase;

  window.muatPengaturanGlobal =
    muatPengaturanGlobal;

  window.applyGlobalSettings =
    applyGlobalSettings;

  window.simpanPengaturanGlobal =
    simpanPengaturanGlobal;

  console.log(
    "[Velmoric Storage] Storage manager berhasil dimuat."
  );

})();
