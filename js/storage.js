function firebaseSiap() {
  return !!(
    window.firebaseReady &&
    window.firebaseDB &&
    window.firebaseFuncs
  );
}

async function muatDataDariFirebase() {
  if (!firebaseSiap()) return false;

  try {
    const { collection, getDocs } = window.firebaseFuncs;
    const snap = await getDocs(
      collection(window.firebaseDB, "karakter")
    );

    characters = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    render();
    return true;
  } catch (e) {
    console.error(e);
    setStatus(
      "Gagal memuat data Firebase. Periksa Firestore Rules.",
      true
    );
    return false;
  }
}

async function simpanDataKeFirebase(data) {
  if (!firebaseSiap() || !window.firebaseAuth.currentUser) {
    alert("Login admin diperlukan.");
    return false;
  }

  try {
    const { collection, addDoc } = window.firebaseFuncs;
    const d = {
      ...data,
      nama: String(data.nama || "").trim()
    };

    delete d.id;

    if (!d.nama) throw Error("Nama wajib diisi");

    await addDoc(
      collection(window.firebaseDB, "karakter"),
      d
    );

    await muatDataDariFirebase();
    return true;
  } catch (e) {
    console.error(e);
    alert("Gagal menyimpan entri. Periksa Firestore Rules.");
    return false;
  }
}

async function updateDataDiFirebase(id, data) {
  if (!firebaseSiap() || !window.firebaseAuth.currentUser) {
    return false;
  }

  try {
    const { doc, updateDoc } = window.firebaseFuncs;
    const d = {
      ...data,
      nama: String(data.nama || "").trim()
    };

    delete d.id;

    await updateDoc(
      doc(window.firebaseDB, "karakter", id),
      d
    );

    await muatDataDariFirebase();
    return true;
  } catch (e) {
    console.error(e);
    alert("Gagal memperbarui entri.");
    return false;
  }
}

async function hapusDataDariFirebase(id) {
  if (!firebaseSiap() || !window.firebaseAuth.currentUser) {
    return false;
  }

  if (!confirm("Hapus entri ini secara permanen?")) {
    return false;
  }

  try {
    const { doc, deleteDoc } = window.firebaseFuncs;

    await deleteDoc(
      doc(window.firebaseDB, "karakter", id)
    );

    await muatDataDariFirebase();
    return true;
  } catch (e) {
    console.error(e);
    alert("Gagal menghapus entri.");
    return false;
  }
}

async function muatPengaturanGlobal() {
  if (!firebaseSiap()) return;

  try {
    const { doc, getDoc } = window.firebaseFuncs;
    const snap = await getDoc(
      doc(window.firebaseDB, "pengaturan", "global")
    );

    const data = snap.exists() ? snap.data() : {};

    globalSettings = {
      theme: data.theme === "light" ? "light" : "dark",
      musicUrls: Array.isArray(data.musicUrls)
        ? data.musicUrls
        : []
    };

    applyGlobalSettings();
  } catch (e) {
    console.error("Pengaturan gagal dimuat", e);
  }
}

function applyGlobalSettings() {
  document.body.classList.toggle(
    "light-mode",
    globalSettings.theme === "light"
  );

  const toggle = document.getElementById("toggleTheme");

  if (toggle) {
    toggle.checked = globalSettings.theme === "light";
  }

  musicPlaylist = globalSettings.musicUrls || [];

  const player = document.getElementById("musicPlayer");
  const audio = document.getElementById("bgMusic");

  if (musicPlaylist.length) {
    player.classList.add("active");

    if (!audio.src && window.loadTrack) {
      window.loadTrack(0, false);
    }
  } else {
    player.classList.remove("active");
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
}

async function simpanPengaturanGlobal(theme, urls) {
  if (!firebaseSiap() || !window.firebaseAuth.currentUser) {
    alert("Login admin diperlukan.");
    return false;
  }

  try {
    const data = {
      theme: theme === "light" ? "light" : "dark",
      musicUrls: urls
    };

    const { doc, setDoc } = window.firebaseFuncs;

    await setDoc(
      doc(window.firebaseDB, "pengaturan", "global"),
      data
    );

    globalSettings = data;
    applyGlobalSettings();

    document
      .getElementById("adminSettingsModal")
      .classList.remove("show");

    alert("Pengaturan tersimpan.");
    return true;
  } catch (e) {
    console.error(e);
    alert("Gagal menyimpan pengaturan.");
    return false;
  }
}