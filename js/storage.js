
/* ==========================================
   THE VELMORIC CODEX
   FIREBASE STORAGE
========================================== */

function firebaseSiap() {
  return Boolean(
    window.firebaseReady &&
    window.firebaseDB &&
    window.firebaseFuncs
  );
}

/* ==========================================
   CEK AKSES ADMIN
========================================== */

function bolehMengelolaData() {
  return Boolean(
    window.firebaseAuth?.currentUser &&
    isAdmin === true
  );
}

/* ==========================================
   MEMUAT DATA KARAKTER
========================================== */

async function muatDataDariFirebase() {
  if (!firebaseSiap()) {
    console.warn("Firebase belum siap.");
    return false;
  }

  try {
    const { collection, getDocs } = window.firebaseFuncs;

    const ref = collection(
      window.firebaseDB,
      "karakter"
    );

    const snapshot = await getDocs(ref);

    characters = snapshot.docs.map(document => ({
      id: document.id,
      ...document.data()
    }));

    console.log(
      `Berhasil memuat ${characters.length} entri.`
    );

    if (typeof render === "function") {
      render();
    }

    return true;

  } catch (error) {
    console.error("Gagal memuat karakter:", error);

    if (typeof setStatus === "function") {
      setStatus(
        "Gagal membaca Firestore. Periksa koneksi dan Security Rules.",
        true
      );
    }

    return false;
  }
}

/* ==========================================
   MENAMBAHKAN KARAKTER
========================================== */

async function simpanDataKeFirebase(data) {
  if (!firebaseSiap() || !bolehMengelolaData()) {
    alert("Akses admin diperlukan untuk menambahkan entri.");
    return false;
  }

  try {
    const { collection, addDoc } = window.firebaseFuncs;

    const dataBaru = {
      ...data,
      nama: String(data.nama || "").trim(),
      kategori: String(data.kategori || "Karakter").trim(),
      dibuatPada: new Date().toISOString(),
      diperbaruiPada: new Date().toISOString()
    };

    delete dataBaru.id;

    if (!dataBaru.nama) {
      throw new Error("Nama karakter wajib diisi.");
    }

    await addDoc(
      collection(window.firebaseDB, "karakter"),
      dataBaru
    );

    await muatDataDariFirebase();

    alert("Entri berhasil ditambahkan.");

    return true;

  } catch (error) {
    console.error("Gagal menambahkan karakter:", error);

    alert(
      "Gagal menyimpan entri. Periksa koneksi dan Firestore Rules."
    );

    return false;
  }
}

/* ==========================================
   MEMPERBARUI KARAKTER
========================================== */

async function updateDataDiFirebase(id, data) {
  if (!firebaseSiap() || !bolehMengelolaData()) {
    alert("Akses admin diperlukan.");
    return false;
  }

  if (!id) {
    alert("ID entri tidak ditemukan.");
    return false;
  }

  try {
    const { doc, updateDoc } = window.firebaseFuncs;

    const dataUpdate = {
      ...data,
      nama: String(data.nama || "").trim(),
      diperbaruiPada: new Date().toISOString()
    };

    delete dataUpdate.id;

    if (!dataUpdate.nama) {
      throw new Error("Nama wajib diisi.");
    }

    await updateDoc(
      doc(window.firebaseDB, "karakter", id),
      dataUpdate
    );

    await muatDataDariFirebase();

    alert("Entri berhasil diperbarui.");

    return true;

  } catch (error) {
    console.error("Gagal memperbarui karakter:", error);

    alert("Gagal memperbarui entri.");

    return false;
  }
}

/* ==========================================
   MENGHAPUS KARAKTER
========================================== */

async function hapusDataDariFirebase(id) {
  if (!firebaseSiap() || !bolehMengelolaData()) {
    alert("Akses admin diperlukan.");
    return false;
  }

  if (!id) {
    alert("ID entri tidak ditemukan.");
    return false;
  }

  const yakin = confirm(
    "Apakah kamu yakin ingin menghapus entri ini secara permanen?"
  );

  if (!yakin) return false;

  try {
    const { doc, deleteDoc } = window.firebaseFuncs;

    await deleteDoc(
      doc(window.firebaseDB, "karakter", id)
    );

    await muatDataDariFirebase();

    alert("Entri berhasil dihapus.");

    return true;

  } catch (error) {
    console.error("Gagal menghapus karakter:", error);

    alert("Gagal menghapus entri.");

    return false;
  }
}

/* ==========================================
   MEMUAT PENGATURAN GLOBAL
========================================== */

async function muatPengaturanGlobal() {
  if (!firebaseSiap()) return false;

  try {
    const { doc, getDoc } = window.firebaseFuncs;

    const ref = doc(
      window.firebaseDB,
      "pengaturan",
      "global"
    );

    const snapshot = await getDoc(ref);

    const data = snapshot.exists()
      ? snapshot.data()
      : {};

    globalSettings = {
      theme: data.theme === "light" ? "light" : "dark",
      musicUrls: Array.isArray(data.musicUrls)
        ? data.musicUrls
        : []
    };

    applyGlobalSettings();

    return true;

  } catch (error) {
    console.error(
      "Gagal memuat pengaturan global:",
      error
    );

    return false;
  }
}

/* ==========================================
   MENERAPKAN PENGATURAN
========================================== */

function applyGlobalSettings() {
  const theme = globalSettings.theme === "light"
    ? "light"
    : "dark";

  document.body.classList.toggle(
    "light-mode",
    theme === "light"
  );

  const toggle = document.getElementById("toggleTheme");

  if (toggle) {
    toggle.checked = theme === "light";
  }

  musicPlaylist = Array.isArray(globalSettings.musicUrls)
    ? globalSettings.musicUrls
    : [];

  const player = document.getElementById("musicPlayer");
  const audio = document.getElementById("bgMusic");

  if (!player || !audio) return;

  if (musicPlaylist.length > 0) {
    player.classList.add("active");

    if (!audio.src && typeof window.loadTrack === "function") {
      window.loadTrack(0, false);
    }

  } else {
    player.classList.remove("active");

    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
}

/* ==========================================
   MENYIMPAN PENGATURAN GLOBAL
========================================== */

async function simpanPengaturanGlobal(theme, urls) {
  if (!firebaseSiap() || !bolehMengelolaData()) {
    alert("Hanya admin yang dapat mengubah pengaturan.");
    return false;
  }

  try {
    const { doc, setDoc } = window.firebaseFuncs;

    const data = {
      theme: theme === "light" ? "light" : "dark",
      musicUrls: Array.isArray(urls)
        ? urls.filter(url => typeof url === "string" && url.trim())
        : []
    };

    await setDoc(
      doc(window.firebaseDB, "pengaturan", "global"),
      data
    );

    globalSettings = data;

    applyGlobalSettings();

    const modal = document.getElementById(
      "adminSettingsModal"
    );

    if (modal) {
      modal.classList.remove("show");
    }

    alert("Pengaturan berhasil disimpan.");

    return true;

  } catch (error) {
    console.error(
      "Gagal menyimpan pengaturan:",
      error
    );

    alert(
      "Gagal menyimpan pengaturan. Periksa Firestore Rules."
    );

    return false;
  }
}
