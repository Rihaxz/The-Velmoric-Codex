
/* =========================================================
   STORAGE.JS
   Firebase database dan pengaturan global.
   API key AI tidak boleh disimpan di file ini.
   ========================================================= */

/* ---------------------------------------------------------
   CEK FIREBASE
   --------------------------------------------------------- */

function firebaseSiap() {
  return Boolean(
    window.firebaseReady &&
    window.firebaseDB &&
    window.firebaseFuncs
  );
}

/* ---------------------------------------------------------
   MEMUAT DATA KARAKTER
   --------------------------------------------------------- */

async function muatDataDariFirebase() {
  if (!firebaseSiap()) {
    console.warn("Firebase belum siap. Data belum dimuat.");
    return;
  }

  const { collection, getDocs } = window.firebaseFuncs;

  try {
    const snapshot = await getDocs(
      collection(window.firebaseDB, "karakter")
    );

    const dataBaru = [];

    snapshot.forEach((item) => {
      dataBaru.push({
        id: item.id,
        ...item.data()
      });
    });

    characters = dataBaru;

    if (typeof render === "function") {
      render();
    }
  } catch (error) {
    console.error("Gagal memuat karakter dari Firebase:", error);
  }
}

/* ---------------------------------------------------------
   MENAMBAHKAN KARAKTER
   --------------------------------------------------------- */

async function simpanDataKeFirebase(data) {
  if (!firebaseSiap()) {
    alert("Firebase belum siap. Coba lagi sebentar.");
    return false;
  }

  if (!window.firebaseAuth?.currentUser) {
    alert("Silakan login terlebih dahulu.");
    return false;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    alert("Data karakter tidak valid.");
    return false;
  }

  const nama = String(data.nama || "").trim();

  if (!nama) {
    alert("Nama karakter wajib diisi.");
    return false;
  }

  const { collection, addDoc } = window.firebaseFuncs;

  try {
    const dataAman = {
      ...data,
      nama
    };

    delete dataAman.id;

    await addDoc(
      collection(window.firebaseDB, "karakter"),
      dataAman
    );

    await muatDataDariFirebase();

    return true;
  } catch (error) {
    console.error("Gagal menyimpan karakter:", error);
    alert("Gagal menyimpan karakter. Periksa akses Firebase.");
    return false;
  }
}

/* ---------------------------------------------------------
   MEMPERBARUI KARAKTER
   --------------------------------------------------------- */

async function updateDataDiFirebase(id, data) {
  if (!firebaseSiap()) {
    alert("Firebase belum siap.");
    return false;
  }

  if (!window.firebaseAuth?.currentUser) {
    alert("Silakan login terlebih dahulu.");
    return false;
  }

  if (!id || !data || typeof data !== "object") {
    alert("Data untuk diperbarui tidak valid.");
    return false;
  }

  const nama = String(data.nama || "").trim();

  if (!nama) {
    alert("Nama karakter wajib diisi.");
    return false;
  }

  const { doc, updateDoc } = window.firebaseFuncs;

  try {
    const dataAman = {
      ...data,
      nama
    };

    delete dataAman.id;

    await updateDoc(
      doc(window.firebaseDB, "karakter", id),
      dataAman
    );

    await muatDataDariFirebase();

    return true;
  } catch (error) {
    console.error("Gagal memperbarui karakter:", error);
    alert("Gagal memperbarui karakter. Periksa akses Firebase.");
    return false;
  }
}

/* ---------------------------------------------------------
   MENGHAPUS KARAKTER
   --------------------------------------------------------- */

async function hapusDataDariFirebase(id) {
  if (!firebaseSiap()) {
    alert("Firebase belum siap.");
    return false;
  }

  if (!window.firebaseAuth?.currentUser) {
    alert("Silakan login terlebih dahulu.");
    return false;
  }

  if (!id) {
    alert("ID karakter tidak valid.");
    return false;
  }

  const { doc, deleteDoc } = window.firebaseFuncs;

  try {
    await deleteDoc(
      doc(window.firebaseDB, "karakter", id)
    );

    await muatDataDariFirebase();

    return true;
  } catch (error) {
    console.error("Gagal menghapus karakter:", error);
    alert("Gagal menghapus karakter. Periksa akses Firebase.");
    return false;
  }
}

/* ---------------------------------------------------------
   MEMUAT PENGATURAN GLOBAL
   --------------------------------------------------------- */

async function muatPengaturanGlobal() {
  if (!firebaseSiap()) {
    console.warn("Firebase belum siap untuk memuat pengaturan.");
    return;
  }

  const { doc, getDoc } = window.firebaseFuncs;

  try {
    const referensi = doc(
      window.firebaseDB,
      "pengaturan",
      "global"
    );

    const snapshot = await getDoc(referensi);

    if (!snapshot.exists()) {
      globalSettings = {
        theme: "dark",
        musicUrls: []
      };

      applyGlobalSettings();
      return;
    }

    const data = snapshot.data();

    // Mendukung pengaturan musik format lama.
    let musicUrls = [];

    if (Array.isArray(data.musicUrls)) {
      musicUrls = data.musicUrls;
    } else if (
      typeof data.musicUrl === "string" &&
      data.musicUrl.trim()
    ) {
      musicUrls = [data.musicUrl.trim()];
    }

    globalSettings = {
      theme: data.theme === "light" ? "light" : "dark",
      musicUrls: musicUrls.filter(
        (url) => typeof url === "string" && url.trim()
      )
    };

    applyGlobalSettings();
  } catch (error) {
    console.error("Gagal memuat pengaturan:", error);
  }
}

/* ---------------------------------------------------------
   MENERAPKAN PENGATURAN KE WEBSITE
   --------------------------------------------------------- */

function applyGlobalSettings() {
  if (!globalSettings) {
    globalSettings = {
      theme: "dark",
      musicUrls: []
    };
  }

  const tema = globalSettings.theme === "light"
    ? "light"
    : "dark";

  document.body.classList.toggle(
    "light-mode",
    tema === "light"
  );

  const toggleTheme = document.getElementById("toggleTheme");

  if (toggleTheme) {
    toggleTheme.checked = tema === "light";
  }

  musicPlaylist = Array.isArray(globalSettings.musicUrls)
    ? globalSettings.musicUrls
    : [];

  const player = document.getElementById("musicPlayer");
  const audio = document.getElementById("bgMusic");

  if (musicPlaylist.length > 0) {
    player?.classList.add("active");

    if (
      audio &&
      !audio.getAttribute("src") &&
      typeof loadTrack === "function"
    ) {
      loadTrack(0, false);
    }
  } else {
    player?.classList.remove("active");

    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
  }
}

/* ---------------------------------------------------------
   MENYIMPAN PENGATURAN GLOBAL
   --------------------------------------------------------- */

async function simpanPengaturanGlobal(theme, musicUrlsArray) {
  if (!firebaseSiap()) {
    alert("Firebase belum siap.");
    return false;
  }

  if (!window.firebaseAuth?.currentUser) {
    alert("Silakan login terlebih dahulu.");
    return false;
  }

  const { doc, setDoc } = window.firebaseFuncs;

  try {
    const musicUrls = Array.isArray(musicUrlsArray)
      ? musicUrlsArray
          .filter((url) => typeof url === "string")
          .map((url) => url.trim())
          .filter(Boolean)
      : [];

    const settingsBaru = {
      theme: theme === "light" ? "light" : "dark",
      musicUrls
    };

    await setDoc(
      doc(window.firebaseDB, "pengaturan", "global"),
      settingsBaru
    );

    globalSettings = settingsBaru;

    applyGlobalSettings();

    document
      .getElementById("adminSettingsModal")
      ?.classList.remove("show");

    alert("Pengaturan berhasil disimpan.");

    return true;
  } catch (error) {
    console.error("Gagal menyimpan pengaturan:", error);
    alert("Gagal menyimpan pengaturan. Periksa aturan Firebase.");
    return false;
  }
}
