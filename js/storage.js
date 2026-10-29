
/* =========================================================
   STORAGE.JS
   Tanggung jawab: Firebase CRUD dan pengaturan global.
   Tidak menyimpan API key AI di browser.
   ========================================================= */

async function muatDataDariFirebase() {
  if (!window.firebaseReady) return;

  const { collection, getDocs } = window.firebaseFuncs;

  try {
    const snapshot = await getDocs(
      collection(window.firebaseDB, "karakter")
    );

    characters = [];

    snapshot.forEach((item) => {
      characters.push({
        id: item.id,
        ...item.data()
      });
    });

    render();
  } catch (error) {
    console.error("Gagal memuat karakter:", error);
  }
}

async function simpanDataKeFirebase(data) {
  if (!window.firebaseReady) {
    alert("Firebase belum siap.");
    return;
  }

  const { collection, addDoc } = window.firebaseFuncs;

  try {
    await addDoc(
      collection(window.firebaseDB, "karakter"),
      data
    );

    await muatDataDariFirebase();
  } catch (error) {
    console.error("Gagal menyimpan karakter:", error);
    alert("Gagal menyimpan data. Periksa login dan aturan Firebase.");
  }
}

async function updateDataDiFirebase(id, data) {
  if (!window.firebaseReady) return;

  const { doc, updateDoc } = window.firebaseFuncs;

  try {
    await updateDoc(
      doc(window.firebaseDB, "karakter", id),
      data
    );

    await muatDataDariFirebase();
  } catch (error) {
    console.error("Gagal memperbarui karakter:", error);
    alert("Gagal memperbarui data.");
  }
}

async function hapusDataDariFirebase(id) {
  if (!window.firebaseReady) return;

  const { doc, deleteDoc } = window.firebaseFuncs;

  try {
    await deleteDoc(
      doc(window.firebaseDB, "karakter", id)
    );

    await muatDataDariFirebase();
  } catch (error) {
    console.error("Gagal menghapus karakter:", error);
    alert("Gagal menghapus data.");
  }
}

/* =========================================================
   PENGATURAN GLOBAL
   ========================================================= */

async function muatPengaturanGlobal() {
  if (!window.firebaseReady) return;

  const { doc, getDoc } = window.firebaseFuncs;

  try {
    const ref = doc(
      window.firebaseDB,
      "pengaturan",
      "global"
    );

    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) return;

    const data = snapshot.data();

    // Kompatibilitas dengan format pengaturan lama.
    if (data.musicUrl && !data.musicUrls) {
      data.musicUrls = [data.musicUrl];
    }

    globalSettings = {
      theme: data.theme || "dark",
      musicUrls: Array.isArray(data.musicUrls)
        ? data.musicUrls
        : []
    };

    applyGlobalSettings();
  } catch (error) {
    console.error("Gagal memuat pengaturan:", error);
  }
}

function applyGlobalSettings() {
  document.body.classList.toggle(
    "light-mode",
    globalSettings.theme === "light"
  );

  const toggleTheme = document.getElementById("toggleTheme");

  if (toggleTheme) {
    toggleTheme.checked = globalSettings.theme === "light";
  }

  musicPlaylist = Array.isArray(globalSettings.musicUrls)
    ? globalSettings.musicUrls
    : [];

  const player = document.getElementById("musicPlayer");
  const audio = document.getElementById("bgMusic");

  if (musicPlaylist.length > 0) {
    if (player) player.classList.add("active");

    if (audio && !audio.getAttribute("src")) {
      loadTrack(0, false);
    }
  } else {
    if (player) player.classList.remove("active");

    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
  }
}

async function simpanPengaturanGlobal(theme, musicUrlsArray) {
  if (!window.firebaseReady) {
    alert("Firebase belum siap.");
    return;
  }

  if (!window.firebaseAuth?.currentUser) {
    alert("Kamu harus login sebagai admin.");
    return;
  }

  const { doc, setDoc } = window.firebaseFuncs;

  try {
    const safeMusicUrls = Array.isArray(musicUrlsArray)
      ? musicUrlsArray.filter(
          (url) => typeof url === "string" && url.trim()
        )
      : [];

    await setDoc(
      doc(window.firebaseDB, "pengaturan", "global"),
      {
        theme: theme === "light" ? "light" : "dark",
        musicUrls: safeMusicUrls
      }
    );

    globalSettings = {
      theme: theme === "light" ? "light" : "dark",
      musicUrls: safeMusicUrls
    };

    applyGlobalSettings();

    document
      .getElementById("adminSettingsModal")
      ?.classList.remove("show");

    alert("Pengaturan berhasil disimpan.");
  } catch (error) {
    console.error("Gagal menyimpan pengaturan:", error);
    alert("Gagal menyimpan pengaturan. Periksa aturan Firebase.");
  }
}
