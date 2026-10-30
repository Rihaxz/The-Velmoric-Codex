
let characters = [];
let currentId = null;
let editingId = null;
let query = "";
let isAdmin = false;
let isLoggedIn = false;
let currentView = "home";
let globalSettings = { theme: "dark", musicUrls: [] };
let musicPlaylist = [];
let currentTrackIndex = 0;

const $ = id => document.getElementById(id);
const main = $("main");
const sidebar = $("sidebar");
const form = $("charForm");
const overlay = $("overlay");
const loginOverlay = $("loginOverlay");
const settingsModal = $("adminSettingsModal");

function setStatus(message, error = false) {
  let element = $("appStatus");

  if (!element) {
    element = document.createElement("p");
    element.id = "appStatus";
    main.prepend(element);
  }

  element.textContent = message;
  element.className = error ? "error" : "status";
}

function getChar(id) {
  return characters.find(character => character.id === id);
}

function filtered() {
  const sorted = [...characters].sort((a, b) =>
    String(a.nama).localeCompare(String(b.nama))
  );

  if (!query) return sorted;

  return sorted.filter(character =>
    Object.values(character).some(value =>
      String(value ?? "").toLowerCase().includes(query)
    )
  );
}

function avatarHTML(character) {
  return character.foto
    ? `<img src="${esc(character.foto)}" alt="${esc(character.nama)}" loading="lazy">`
    : esc(character.avatar || "👤");
}

function cardHTML(character) {
  return `
    <article class="card" data-open="${esc(character.id)}" tabindex="0">
      <div class="avatar">${avatarHTML(character)}</div>
      <div class="card-content">
        <h3>${esc(character.nama)}</h3>
        <small>
          ${esc(character.kategori || "Karakter")} ·
          ${esc(character.gelar || character.ras || "")}
        </small>
        <p>${esc(character.deskripsi || "Belum ada deskripsi.")}</p>
        ${isAdmin ? `
          <button class="btn small-btn" data-edit="${esc(character.id)}">Edit</button>
          <button class="btn danger small-btn" data-del="${esc(character.id)}">Hapus</button>
        ` : ""}
      </div>
    </article>
  `;
}

function renderSidebar() {
  $("charList").innerHTML = filtered().map(character => `
    <button class="side-link" data-open="${esc(character.id)}">
      <span class="side-avatar">${avatarHTML(character)}</span>
      ${esc(character.nama)}
    </button>
  `).join("") || `<p class="empty">Belum ada entri.</p>`;
}

function sectionHTML(title, key) {
  const character = getChar(currentId);
  const value = character?.[key];

  return `
    <section class="section" id="${key}">
      <h2>${title}</h2>
      <p>${value
        ? esc(value).replace(/\n/g, "<br>")
        : "<i>Belum ada informasi.</i>"}
      </p>
    </section>
  `;
}

function renderHome() {
  const list = filtered();

  return `
    <section class="hero hero-illustrated">
      <div class="hero-copy">
        <p>ARSIP DUNIA VELMOR</p>
        <h1>The Velmoric Codex</h1>
        <p>
          Ensiklopedia karakter, makhluk, lokasi, artefak,
          dan sejarah dunia fantasi.
        </p>
        ${isAdmin ? `
          <button class="btn primary" id="homeAdd">Tambah Entri</button>
          <button class="btn" id="openSettingsBtn">Pengaturan</button>
        ` : ""}
      </div>
      <div class="hero-art" role="img" aria-label="Ilustrasi fantasi untuk dunia Velmor"></div>
    </section>

    <section class="codex-intro">
      <div>
        <span class="eyebrow">PENGETAHUAN YANG TERLUPAKAN</span>
        <h2>Catatan dari dunia lain</h2>
        <p>Jelajahi tokoh, kerajaan, makhluk, relik, dan peristiwa yang membentuk sejarah Velmor.</p>
      </div>
      <div class="intro-stat">
        <strong>${characters.length}</strong>
        <span>ARSIP TERSIMPAN</span>
      </div>
    </section>

    <h2 class="archive-heading">
      ${query ? "Hasil Pencarian" : "Arsip Codex"}
      <small>${list.length} entri</small>
    </h2>

    <div class="card-grid">
      ${list.map(cardHTML).join("") ||
        '<p class="empty">Tidak ada entri yang cocok.</p>'}
    </div>
  `;
}

function renderArticle(character) {
  const fields = [
    ["Kategori", "kategori"],
    ["Gelar", "gelar"],
    ["Ras", "ras"],
    ["Jenis Kelamin", "gender"],
    ["Usia", "usia"],
    ["Tinggi", "tinggi"],
    ["Berat", "berat"],
    ["Asal", "asal"],
    ["Afiliasi", "afiliasi"],
    ["Kelas", "kelas"],
    ["Status", "status"]
  ];

  return `
    <button class="btn" id="backHome">← Kembali</button>
    <h1 class="page-title">${esc(character.nama)}</h1>
    <p class="muted">${esc(character.gelar || character.kategori || "Arsip Codex")}</p>

    <div class="article-grid">
      <article>
        <nav class="toc">
          <b>Daftar Isi</b>
          <ol>
            <li><a href="#deskripsi">Deskripsi</a></li>
            <li><a href="#kepribadian">Kepribadian</a></li>
            <li><a href="#latar">Latar Belakang</a></li>
            <li><a href="#kemampuan">Kemampuan</a></li>
            <li><a href="#kelemahan">Kelemahan</a></li>
          </ol>
        </nav>

        ${sectionHTML("Deskripsi", "deskripsi")}
        ${sectionHTML("Kepribadian", "kepribadian")}
        ${sectionHTML("Latar Belakang", "latar")}
        ${sectionHTML("Kemampuan", "kemampuan")}
        ${sectionHTML("Kelemahan", "kelemahan")}
      </article>

      <aside class="infobox">
        <h2>${esc(character.nama)}</h2>
        <div class="infobox-img">${avatarHTML(character)}</div>
        <table>
          ${fields.filter(([, key]) => character[key]).map(([label, key]) => `
            <tr>
              <th>${label}</th>
              <td>${esc(character[key])}</td>
            </tr>
          `).join("")}
        </table>
        ${isAdmin ? `
          <button class="btn" data-edit="${esc(character.id)}">Edit</button>
          <button class="btn danger" data-del="${esc(character.id)}">Hapus</button>
        ` : ""}
      </aside>
    </div>
  `;
}

function render() {
  if (currentId && !getChar(currentId)) {
    currentId = null;
    currentView = "home";
  }

  $("btnLogin").hidden = isLoggedIn;
  $("btnLogout").hidden = !isLoggedIn;
  $("btnAdd").hidden = !isAdmin;
  $("navAdmin").hidden = !isAdmin;

  $("navHome").classList.toggle("active", currentView !== "admin");
  $("navAdmin").classList.toggle("active", currentView === "admin");

  renderSidebar();

  if (currentView === "article" && getChar(currentId)) {
    main.innerHTML = renderArticle(getChar(currentId));
    return;
  }

  if (currentView === "admin" && isAdmin) {
    main.innerHTML = `
      <section class="hero">
        <h1>Panel Admin</h1>
        <p>Kelola data Codex dan playlist musik.</p>
        <button class="btn primary" id="adminAddBtn">Tambah Entri</button>
        <button class="btn" id="openSettingsBtn">Pengaturan</button>
        <button class="btn" id="exportPanel">Ekspor</button>
      </section>
      <div class="card-grid">
        ${filtered().map(cardHTML).join("")}
      </div>
    `;
    return;
  }

  main.innerHTML = renderHome();
}

function show(element) {
  element.classList.add("show");
  document.body.classList.add("no-scroll");
}

function hide(element) {
  element.classList.remove("show");

  if (![overlay, loginOverlay, settingsModal].some(
    item => item.classList.contains("show")
  )) {
    document.body.classList.remove("no-scroll");
  }
}

function openForm(id = null) {
  if (!isAdmin) return;

  editingId = id;
  form.reset();
  $("fotoPreview").hidden = true;

  const character = id ? getChar(id) : null;

  $("modalTitle").textContent =
    character ? "Edit Entri" : "Tambah Entri";

  if (character) {
    Object.keys(character).forEach(key => {
      if (form.elements[key]) {
        form.elements[key].value = character[key] || "";
      }
    });
  }

  show(overlay);
}

function readForm() {
  const data = Object.fromEntries(new FormData(form));

  Object.keys(data).forEach(key => {
    data[key] = String(data[key] || "").trim();
  });

  data.avatar ||= "👤";

  return data;
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin) return;

  const success = editingId
    ? await updateDataDiFirebase(editingId, readForm())
    : await simpanDataKeFirebase(readForm());

  if (success) {
    hide(overlay);
    currentId = null;
    currentView = "home";
    render();
  }
});

$("fotoUrlInput").addEventListener("input", event => {
  $("fotoPreview").src = event.target.value;
  $("fotoPreview").hidden = !event.target.value;
});

async function removeEntry(id) {
  if (await hapusDataDariFirebase(id)) {
    currentId = null;
    currentView = "home";
    render();
  }
}

function exportData() {
  const blob = new Blob([
    JSON.stringify({
      characters,
      settings: globalSettings
    }, null, 2)
  ], { type: "application/json" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "velmoric-codex.json";
  link.click();

  URL.revokeObjectURL(url);
}

async function importData(file) {
  if (!isAdmin || !file) return;

  try {
    const parsed = JSON.parse(await file.text());
    const items = Array.isArray(parsed)
      ? parsed
      : parsed.characters;

    if (!Array.isArray(items)) {
      throw Error("Format JSON tidak valid");
    }

    if (!confirm(`Tambahkan ${items.length} entri ke Firebase?`)) {
      return;
    }

    for (const item of items) {
      const data = { ...item };
      delete data.id;

      if (data.nama) {
        await simpanDataKeFirebase(data);
      }
    }

    alert("Impor selesai");
    await muatDataDariFirebase();
  } catch (error) {
    alert("Impor gagal: " + error.message);
  } finally {
    $("btnImport").value = "";
  }
}

$("btnLogin").onclick = () => show(loginOverlay);
$("closeLogin").onclick = () => hide(loginOverlay);
$("closeModal").onclick = () => hide(overlay);
$("cancelBtn").onclick = () => hide(overlay);
$("closeSettings").onclick = () => hide(settingsModal);

$("btnLogout").onclick = () => {
  window.firebaseFuncs?.signOut(window.firebaseAuth);
};

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  try {
    await window.firebaseFuncs.signInWithEmailAndPassword(
      window.firebaseAuth,
      $("loginEmail").value.trim(),
      $("loginPassword").value
    );

    hide(loginOverlay);
    $("loginPassword").value = "";
  } catch (error) {
    $("loginError").textContent =
      "Login gagal. Periksa email, password, dan Firebase Authentication.";
  }
});

$("btnGoogleLogin").addEventListener("click", async () => {
  const button = $("btnGoogleLogin");
  const original = button.innerHTML;

  button.disabled = true;
  button.textContent = "Menghubungkan ke Google…";
  $("loginError").textContent = "";

  try {
    const provider = new window.firebaseFuncs.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    await window.firebaseFuncs.signInWithPopup(
      window.firebaseAuth,
      provider
    );

    hide(loginOverlay);
  } catch (error) {
    console.error("Google sign-in gagal:", error);

    $("loginError").textContent =
      error.code === "auth/unauthorized-domain"
        ? "Domain website belum diizinkan di Firebase Authentication."
        : error.code === "auth/popup-closed-by-user"
          ? "Jendela login ditutup sebelum selesai."
          : "Login Google gagal. Pastikan Google provider aktif di Firebase Authentication.";
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
});

$("search").addEventListener("input", event => {
  query = event.target.value.toLowerCase().trim();
  render();
});

$("brandBtn").onclick = () => {
  currentView = "home";
  currentId = null;
  query = "";
  $("search").value = "";
  render();
};

$("navHome").onclick = () => {
  currentView = "home";
  currentId = null;
  render();
  sidebar.classList.remove("open");
};

$("navAdmin").onclick = () => {
  if (!isAdmin) return;

  currentView = "admin";
  currentId = null;
  render();
  sidebar.classList.remove("open");
};

$("menuBtn").onclick = () => sidebar.classList.toggle("open");
$("btnAdd").onclick = () => openForm();

$("toggleTheme").onchange = event => {
  document.body.classList.toggle("light-mode", event.target.checked);
};

$("btnSaveSettings").onclick = () => {
  const urls = $("inputMusicUrl").value
    .split(/\r?\n/)
    .map(url => url.trim())
    .filter(Boolean);

  simpanPengaturanGlobal(
    $("toggleTheme").checked ? "light" : "dark",
    urls
  );
};

$("btnExport").onclick = exportData;
$("btnImport").onchange = event => importData(event.target.files[0]);

document.addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit]");

  if (editButton) {
    event.stopPropagation();
    openForm(editButton.dataset.edit);
    return;
  }

  const deleteButton = event.target.closest("[data-del]");

  if (deleteButton) {
    event.stopPropagation();
    removeEntry(deleteButton.dataset.del);
    return;
  }

  const openButton = event.target.closest("[data-open]");

  if (openButton) {
    currentId = openButton.dataset.open;
    currentView = "article";
    render();
    window.scrollTo(0, 0);
    return;
  }

  if (
    event.target.closest("#homeAdd") ||
    event.target.closest("#adminAddBtn")
  ) {
    openForm();
  }

  if (event.target.closest("#openSettingsBtn")) {
    $("toggleTheme").checked = globalSettings.theme === "light";
    $("inputMusicUrl").value =
      (globalSettings.musicUrls || []).join("\n");

    show(settingsModal);
  }

  if (event.target.closest("#backHome")) {
    currentView = "home";
    currentId = null;
    render();
  }

  if (event.target.closest("#exportPanel")) {
    exportData();
  }

  const tocLink = event.target.closest(".toc a");

  if (tocLink) {
    event.preventDefault();

    document.querySelector(
      tocLink.getAttribute("href")
    )?.scrollIntoView({ behavior: "smooth" });
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    [overlay, loginOverlay, settingsModal].forEach(hide);
  }

  const card = event.target.closest(".card");

  if (card && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    currentId = card.dataset.open;
    currentView = "article";
    render();
  }
});

[overlay, loginOverlay, settingsModal].forEach(element => {
  element.addEventListener("click", event => {
    if (event.target === element) hide(element);
  });
});

render();

/* MEMERIKSA STATUS ADMIN DARI FIRESTORE */
async function cekStatusAdmin(user) {
  if (!user || !firebaseSiap()) return false;

  try {
    const { doc, getDoc } = window.firebaseFuncs;

    const adminRef = doc(
      window.firebaseDB,
      "admins",
      user.uid
    );

    const adminSnap = await getDoc(adminRef);

    return adminSnap.exists() &&
      adminSnap.data().role === "admin";

  } catch (error) {
    console.error("Gagal memeriksa status admin:", error);
    return false;
  }
}

let authListenerTerpasang = false;

function mulaiPantauAuth() {
  if (!firebaseSiap() || authListenerTerpasang) return;

  authListenerTerpasang = true;

  window.firebaseFuncs.onAuthStateChanged(
    window.firebaseAuth,
    async user => {
      isLoggedIn = !!user;
      isAdmin = false;

      render();

      if (user) {
        isAdmin = await cekStatusAdmin(user);
      }

      render();

      const dataBerhasil = await muatDataDariFirebase();

      await muatPengaturanGlobal();

      if (user && !isAdmin) {
        setStatus(
          "Login berhasil, tetapi akun ini belum terdaftar sebagai admin di Firestore.",
          true
        );
      } else if (user && isAdmin) {
        setStatus("Login sebagai admin berhasil.");
      } else if (!dataBerhasil) {
        setStatus(
          "Gagal membaca Firestore. Periksa koneksi dan Firestore Security Rules.",
          true
        );
      }
    }
  );
}

window.addEventListener("firebase-ready", mulaiPantauAuth);

window.addEventListener("firebase-error", () => {
  setStatus(
    "Firebase gagal diinisialisasi. Periksa konfigurasi.",
    true
  );
});

if (window.firebaseReady) {
  mulaiPantauAuth();
}
