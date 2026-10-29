
/* =========================================================
   LOGIC.JS
   UI, navigasi, pencarian, form, login, dan event website.
   API key AI tidak disimpan di browser.
   ========================================================= */

/* STATE */
let characters = [];
let currentId = null;
let editingId = null;
let query = "";
let isAdmin = false;
let currentView = "home";
let globalSettings = { theme: "dark", musicUrls: [] };

let musicPlaylist = [];
let currentTrackIndex = 0;

const WATERMARK =
  "\u200B\u200C\u200B\u200C\u200C\u200B\u200B\u200C\u200B\u200C\u200C\u200C";

function tambahWatermark(teks) {
  return teks ? teks + WATERMARK : teks;
}

/* =========================================================
   PENCARIAN DAN RENDER
   ========================================================= */

function getChar(id) {
  return characters.find((character) => character.id === id);
}

function filterList(arr) {
  if (!query) return arr;

  const keys = [
    "nama", "gelar", "ras", "kategori", "gender", "usia",
    "asal", "afiliasi", "status", "kelas", "deskripsi",
    "kepribadian", "latar", "kemampuan", "kelemahan"
  ];

  return arr.filter((character) =>
    keys.some((key) =>
      String(character[key] || "").toLowerCase().includes(query)
    )
  );
}

const mainEl = document.getElementById("main");
const charListEl = document.getElementById("charList");

function renderAvatar(character) {
  if (character.foto) {
    return `<img src="${esc(character.foto)}"
      alt="${esc(character.nama)}" loading="lazy">`;
  }

  return esc(character.avatar || "👤");
}

function render() {
  if (currentId && !getChar(currentId)) {
    currentId = null;
  }

  const adminElements = ["btnAdd", "navAdmin", "btnChatAI"];

  adminElements.forEach((id) => {
    const element = document.getElementById(id);

    if (element) {
      element.style.display = isAdmin
        ? (id === "btnAdd" ? "inline-flex" : "flex")
        : "none";
    }
  });

  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");

  if (btnLogin) {
    btnLogin.style.display = isAdmin ? "none" : "inline-flex";
  }

  if (btnLogout) {
    btnLogout.style.display = isAdmin ? "inline-flex" : "none";
  }

  renderSidebar();

  if (currentView === "admin" && isAdmin) {
    renderAdminDashboard();
  } else if (currentId && currentView === "article") {
    renderChar(getChar(currentId));
  } else {
    currentView = "home";
    renderHome();
  }
}

function renderSidebar() {
  const items = filterList(characters);

  charListEl.innerHTML = items.length
    ? items.map((character) => `
        <div class="side-link ${
          character.id === currentId && currentView === "article"
            ? "active"
            : ""
        }" data-open="${esc(character.id)}">
          <span class="side-emoji">${renderAvatar(character)}</span>
          <span class="side-name">${esc(character.nama)}</span>
        </div>
      `).join("")
    : `<div class="side-empty"
        style="padding:10px;color:var(--text-muted);font-size:13px;">
        Codex kosong
      </div>`;
}

function renderHome() {
  const list = filterList(characters);

  mainEl.innerHTML = `
    <div class="home-hero">
      <h1>The Velmoric Codex</h1>
      <p>Arsip hidup tentang benua, ras, karakter, dan segala yang ada di antaranya.</p>
      ${isAdmin
        ? `<button class="btn btn-primary" id="homeAdd">
             Tambah Entri Baru
           </button>`
        : ""}
    </div>

    <div class="section-head">
      <h2>Daftar Entri</h2>
      <span class="count">${list.length} entri</span>
    </div>

    ${
      list.length
        ? `<div class="card-grid">${list.map(cardHTML).join("")}</div>`
        : `<div class="empty-state"
             style="padding:30px;border:1px dashed var(--border-color);text-align:center;">
             Codex ini masih kosong.
           </div>`
    }
  `;
}

function cardHTML(character) {
  return `
    <article class="card" data-open="${esc(character.id)}">
      <div class="card-avatar">${renderAvatar(character)}</div>
      <div class="card-body">
        <div style="font-size:11px;color:var(--accent-gold);text-transform:uppercase;letter-spacing:1px;">
          ${esc(character.kategori || "Karakter")}
        </div>
        <h3>${esc(character.nama)}</h3>
        <div class="card-meta">
          ${esc(character.ras || "Ras belum diisi")}
        </div>
        <p>${esc(potong(character.deskripsi || "Belum ada deskripsi.", 80))}</p>
      </div>
    </article>
  `;
}

function renderAdminDashboard() {
  const totalFoto = characters.filter((character) => character.foto).length;

  mainEl.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div>
        <h1 class="page-title" style="border:none;margin:0;">Panel Admin</h1>
        <div class="page-sub" style="margin:0;">Selamat datang, Administrator.</div>
      </div>
      <button class="btn btn-outline" id="openSettingsBtn">Pengaturan</button>
    </div>

    <div class="card-grid" style="margin-bottom:30px;">
      <div class="card" style="cursor:default;border-left:3px solid var(--accent-gold);">
        <div class="card-body">
          <div class="card-meta">Total Entri</div>
          <h3 style="font-size:28px;margin:0;">${characters.length}</h3>
        </div>
      </div>

      <div class="card" style="cursor:default;border-left:3px solid var(--accent-brown);">
        <div class="card-body">
          <div class="card-meta">Entri dengan Foto</div>
          <h3 style="font-size:28px;margin:0;">${totalFoto}</h3>
        </div>
      </div>
    </div>

    <div class="section-head">
      <h2>Kelola Entri</h2>
      <button class="btn btn-primary btn-sm" id="adminAddBtn" style="margin-left:auto;">
        Tambah Baru
      </button>
    </div>

    <div style="background:var(--bg-darker);border:1px solid var(--border-color);border-radius:4px;overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;text-align:left;">
        <thead>
          <tr style="background:var(--bg-dark);border-bottom:1px solid var(--border-color);">
            <th style="padding:12px;font-family:'Cinzel';">Nama</th>
            <th style="padding:12px;font-family:'Cinzel';">Kategori</th>
            <th style="padding:12px;font-family:'Cinzel';text-align:right;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${
            characters.length
              ? characters.map((character) => `
                  <tr style="border-bottom:1px solid var(--border-color);">
                    <td style="padding:12px;">
                      <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:30px;height:30px;border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--bg-dark);">
                          ${renderAvatar(character)}
                        </div>
                        <strong>${esc(character.nama)}</strong>
                      </div>
                    </td>
                    <td style="padding:12px;color:var(--text-muted);">
                      ${esc(character.kategori || "-")}
                    </td>
                    <td style="padding:12px;text-align:right;">
                      <button class="btn btn-sm btn-outline"
                        data-edit="${esc(character.id)}">Edit</button>
                      <button class="btn btn-sm btn-danger"
                        data-del="${esc(character.id)}">Hapus</button>
                    </td>
                  </tr>
                `).join("")
              : `<tr><td colspan="3" style="padding:20px;text-align:center;">Belum ada data.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

function renderChar(character) {
  if (!character) {
    currentId = null;
    currentView = "home";
    renderHome();
    return;
  }

  const infoRows = [
    ["Kategori", character.kategori],
    ["Gelar", character.gelar],
    ["Ras / Spesies", character.ras],
    ["Jenis Kelamin", character.gender],
    ["Usia", character.usia],
    ["Tinggi", character.tinggi],
    ["Berat", character.berat],
    ["Asal / Dunia", character.asal],
    ["Afiliasi", character.afiliasi],
    ["Elemen / Kelas", character.kelas],
    ["Status", character.status]
  ].filter(([, value]) => value && String(value).trim());

  const sections = [
    ["Deskripsi", character.deskripsi],
    ["Kepribadian", character.kepribadian],
    ["Latar Belakang", character.latar],
    ["Kemampuan", character.kemampuan],
    ["Kelemahan", character.kelemahan]
  ].map(([title, value]) => [title, tambahWatermark(value)]);

  const bodyHTML = sections.map(([title, value]) => {
    const content = value && String(value).trim()
      ? String(value).trim().split(/\n+/).filter(Boolean)
          .map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")
      : `<p class="empty">Belum ada informasi.</p>`;

    return `
      <section class="sec" id="sec-${slug(title)}">
        <h2>${esc(title)}</h2>${content}
      </section>
    `;
  }).join("");

  const tocHTML = `
    <div class="toc">
      <div class="toc-title">Daftar isi</div>
      <ol>
        ${sections.map(([title]) =>
          `<li><a href="#sec-${slug(title)}">${esc(title)}</a></li>`
        ).join("")}
      </ol>
    </div>
  `;

  mainEl.innerHTML = `
    <div class="page-tabs">
      <span class="tab active">Artikel</span>
      ${
        isAdmin
          ? `<div class="tab-actions">
               <button class="btn btn-sm btn-outline"
                 data-edit="${esc(character.id)}">Edit</button>
               <button class="btn btn-sm btn-danger"
                 data-del="${esc(character.id)}">Hapus</button>
             </div>`
          : ""
      }
    </div>

    <h1 class="page-title">${esc(character.nama)}</h1>
    <div class="page-sub">Dari The Velmoric Codex, ensiklopedia bebas</div>

    <div class="article-grid">
      <div class="article-main">${tocHTML}${bodyHTML}</div>

      <aside class="infobox">
        <div class="infobox-title">${esc(character.nama)}</div>
        <div class="infobox-img">${renderAvatar(character)}</div>
        ${
          infoRows.length
            ? `<table class="infobox-table">
                 ${infoRows.map(([key, value]) =>
                   `<tr><th>${esc(key)}</th><td>${esc(value)}</td></tr>`
                 ).join("")}
               </table>`
            : ""
        }
      </aside>
    </div>
  `;
}

/* =========================================================
   FORM DAN DRAFT
   ========================================================= */

const overlay = document.getElementById("overlay");
const form = document.getElementById("charForm");
const fotoUrlInput = document.getElementById("fotoUrlInput");
const previewWrap = document.getElementById("previewWrap");
const fotoPreview = document.getElementById("fotoPreview");

form.addEventListener("input", () => {
  if (!editingId) {
    const draft = Object.fromEntries(new FormData(form).entries());
    localStorage.setItem("velmoric_draft", JSON.stringify(draft));
  }
});

function openModal(id) {
  if (!isAdmin) return;

  editingId = id || null;
  form.reset();

  if (id) {
    const character = getChar(id);

    if (character) {
      Object.keys(character).forEach((key) => {
        const element = form.elements[key];
        if (element) element.value = character[key] ?? "";
      });

      if (character.foto) {
        fotoPreview.src = character.foto;
        previewWrap.style.display = "block";
      } else {
        previewWrap.style.display = "none";
      }
    }
  } else {
    if (form.elements.avatar) {
      form.elements.avatar.value = "👤";
    }

    const savedDraft = localStorage.getItem("velmoric_draft");

    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);

        Object.keys(draft).forEach((key) => {
          const element = form.elements[key];
          if (element) element.value = draft[key];
        });

        if (draft.foto) {
          fotoPreview.src = draft.foto;
          previewWrap.style.display = "block";
        } else {
          previewWrap.style.display = "none";
        }
      } catch (error) {
        console.warn("Draft tidak dapat dibaca:", error);
        previewWrap.style.display = "none";
      }
    } else {
      previewWrap.style.display = "none";
    }
  }

  overlay.classList.add("show");
  document.body.classList.add("no-scroll");

  setTimeout(() => {
    if (form.elements.nama) form.elements.nama.focus();
  }, 50);
}

function closeModal() {
  overlay.classList.remove("show");
  document.body.classList.remove("no-scroll");
  editingId = null;
}

if (fotoUrlInput) {
  fotoUrlInput.addEventListener("input", function () {
    const url = this.value.trim();

    if (url) {
      fotoPreview.src = url;
      previewWrap.style.display = "block";
      fotoPreview.onerror = () => {
        previewWrap.style.display = "none";
      };
    } else {
      previewWrap.style.display = "none";
      fotoPreview.removeAttribute("src");
    }
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isAdmin) return;

  const data = Object.fromEntries(new FormData(form).entries());
  data.nama = (data.nama || "").trim();

  if (!data.nama) {
    alert("Nama entri wajib diisi.");
    return;
  }

  // Simpan ID terlebih dahulu karena closeModal() mengosongkannya.
  const idToUpdate = editingId;

  closeModal();
  localStorage.removeItem("velmoric_draft");

  if (idToUpdate) {
    await updateDataDiFirebase(idToUpdate, data);
  } else {
    await simpanDataKeFirebase({
      ...data,
      dibuat: Date.now()
    });
  }
});

function hapusKarakter(id) {
  if (!isAdmin || !confirm("Hapus entri ini?")) return;

  hapusDataDariFirebase(id);

  if (currentId === id) {
    currentId = null;
    currentView = "admin";
  }
}

/* =========================================================
   LOGIN DAN PENGATURAN UI
   ========================================================= */

const loginOverlay = document.getElementById("loginOverlay");
const loginForm = document.getElementById("loginForm");
const settingsModal = document.getElementById("adminSettingsModal");

document.getElementById("btnSaveSettings").addEventListener("click", () => {
  const theme = document.getElementById("toggleTheme").checked
    ? "light"
    : "dark";

  const musicUrlsArray = document.getElementById("inputMusicUrl").value
    .split("\n")
    .map((url) => url.trim())
    .filter(Boolean);

  simpanPengaturanGlobal(theme, musicUrlsArray);
});

function loadLocalSettingsToForm() {
  const toggleTheme = document.getElementById("toggleTheme");
  const inputMusicUrl = document.getElementById("inputMusicUrl");

  if (toggleTheme) {
    toggleTheme.checked = globalSettings.theme === "light";
  }

  if (inputMusicUrl) {
    inputMusicUrl.value = (globalSettings.musicUrls || []).join("\n");
  }
}

document.getElementById("btnLogin").addEventListener("click", () => {
  loginOverlay.classList.add("show");
});

document.getElementById("closeLogin").addEventListener("click", () => {
  loginOverlay.classList.remove("show");
});

document.getElementById("closeSettings").addEventListener("click", () => {
  settingsModal.classList.remove("show");
});

document.getElementById("closeChatAI").addEventListener("click", () => {
  aiChatModal.classList.remove("show");
});

document.getElementById("btnChatAI").addEventListener("click", () => {
  aiChatModal.classList.add("show");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const errorText = document.getElementById("loginError");
  const button = document.getElementById("loginBtn");

  button.disabled = true;
  button.textContent = "...";
  errorText.textContent = "";

  try {
    const { signInWithEmailAndPassword } = window.firebaseFuncs;

    await signInWithEmailAndPassword(
      window.firebaseAuth,
      email,
      password
    );

    loginOverlay.classList.remove("show");
    loginForm.reset();
    loadLocalSettingsToForm();
  } catch (error) {
    errorText.textContent = "Login gagal: " + error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Masuk";
  }
});

document.getElementById("btnLogout").addEventListener("click", async () => {
  try {
    await window.firebaseFuncs.signOut(window.firebaseAuth);
    currentView = "home";
    currentId = null;
    render();
  } catch (error) {
    console.error("Logout gagal:", error);
    alert("Gagal keluar dari akun.");
  }
});

document.getElementById("btnExport").addEventListener("click", () => {
  const json = JSON.stringify(characters, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `velmoric_backup_${Date.now()}.json`;
  link.click();

  URL.revokeObjectURL(url);
});

document.getElementById("btnImport").addEventListener("change", function (event) {
  if (!isAdmin) {
    alert("Hanya admin yang boleh mengimpor data.");
    this.value = "";
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async (loadEvent) => {
    try {
      const imported = JSON.parse(loadEvent.target.result);

      if (!Array.isArray(imported)) {
        throw new Error("Format file harus berupa array JSON.");
      }

      const validItems = imported.filter(
        (item) => item && typeof item === "object" && !Array.isArray(item)
      );

      if (!confirm(`Impor ${validItems.length} entri? Data akan ditambahkan ke database.`)) {
        return;
      }

      for (const item of validItems) {
        const { id, ...data } = item;
        await simpanDataKeFirebase(data);
      }

      alert("Impor selesai.");
    } catch (error) {
      console.error("Impor gagal:", error);
      alert("File JSON tidak valid atau impor gagal.");
    } finally {
      event.target.value = "";
    }
  };

  reader.readAsText(file);
});

/* =========================================================
   NAVIGASI DAN EVENT
   ========================================================= */

document.getElementById("brandBtn").addEventListener("click", () => {
  currentId = null;
  currentView = "home";
  query = "";
  document.getElementById("search").value = "";
  render();
  window.scrollTo({ top: 0 });
});

document.getElementById("navHome").addEventListener("click", () => {
  currentView = "home";
  currentId = null;
  render();
  tutupSidebar();
  window.scrollTo({ top: 0 });
});

document.getElementById("navAdmin").addEventListener("click", () => {
  if (!isAdmin) return;

  currentView = "admin";
  currentId = null;
  render();
  tutupSidebar();
  window.scrollTo({ top: 0 });
});

document.getElementById("btnAdd").addEventListener("click", () => {
  openModal();
});

document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelBtn").addEventListener("click", closeModal);

overlay.addEventListener("click", (event) => {
  if (event.target === overlay) closeModal();
});

charListEl.addEventListener("click", (event) => {
  const element = event.target.closest("[data-open]");
  if (!element) return;

  currentId = element.dataset.open;
  currentView = "article";
  render();
  tutupSidebar();
  window.scrollTo({ top: 0 });
});

mainEl.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  if (editButton) {
    openModal(editButton.dataset.edit);
    return;
  }

  const deleteButton = event.target.closest("[data-del]");
  if (deleteButton) {
    hapusKarakter(deleteButton.dataset.del);
    return;
  }

  if (event.target.closest("#openSettingsBtn")) {
    if (!isAdmin) return;

    loadLocalSettingsToForm();
    settingsModal.classList.add("show");
    return;
  }

  const tocLink = event.target.closest(".toc a");
  if (tocLink) {
    event.preventDefault();

    const target = document.querySelector(tocLink.getAttribute("href"));
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return;
  }

  const openElement = event.target.closest("[data-open]");
  if (openElement) {
    currentId = openElement.dataset.open;
    currentView = "article";
    render();
    window.scrollTo({ top: 0 });
    return;
  }

  if (event.target.closest("#homeAdd") || event.target.closest("#adminAddBtn")) {
    openModal();
  }
});

document.getElementById("search").addEventListener("input", (event) => {
  query = event.target.value.toLowerCase().trim();
  render();
});

const sidebar = document.getElementById("sidebar");

document.getElementById("menuBtn").addEventListener("click", (event) => {
  event.stopPropagation();
  sidebar.classList.toggle("open");
});

function tutupSidebar() {
  sidebar.classList.remove("open");
}

document.addEventListener("click", (event) => {
  if (
    window.innerWidth <= 900 &&
    sidebar.classList.contains("open") &&
    !sidebar.contains(event.target) &&
    !event.target.closest("#menuBtn")
  ) {
    tutupSidebar();
  }
});

/* =========================================================
   INISIALISASI
   ========================================================= */

render();

window.addEventListener("load", () => {
  setTimeout(() => {
    if (!window.firebaseReady || !window.firebaseFuncs) {
      console.warn("Firebase belum siap saat inisialisasi.");
      return;
    }

    window.firebaseFuncs.onAuthStateChanged(
      window.firebaseAuth,
      (user) => {
        isAdmin = !!user;

        if (!isAdmin) {
          currentView = "home";
          currentId = null;
        }

        if (isAdmin) loadLocalSettingsToForm();
        render();
      }
    );

    muatDataDariFirebase();
    muatPengaturanGlobal();
  }, 1000);
});
