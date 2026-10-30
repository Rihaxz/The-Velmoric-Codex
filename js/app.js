/* =========================================================
   THE VELMORIC CODEX — app.js
   Titik masuk aplikasi: state, routing, dan event.

   Alamat halaman (bisa dibagikan, tombol Back berfungsi):
     #/           beranda
     #/e/<id>     artikel entri
     #/admin      panel admin (khusus admin)
     #admin       membuka form login admin (link rahasia)
========================================================= */

import * as Auth from "./auth.js";
import * as Store from "./storage.js";
import { setPlaylist } from "./music-player.js";
import { isHttpUrl } from "./schema.js";
import * as View from "./views.js";
import { $, debounce, downloadJSON } from "./utils.js";

// =========================================================
// STATE
// =========================================================

const state = {
  route: { name: "home", id: null },
  query: "",
  category: "",
  isAdmin: false,
  loading: true,
  lastRole: null,
  settings: Store.getCachedSettings(),
  editingId: null,
  formSnapshot: ""
};

const el = {
  main: $("main"),
  sidebar: $("sidebar"),
  charList: $("charList"),
  search: $("search"),
  form: $("charForm"),
  formFields: $("formFields"),
  overlay: $("overlay"),
  loginOverlay: $("loginOverlay"),
  settingsModal: $("adminSettingsModal"),
  status: $("appStatus"),
  importInput: $("btnImport")
};

const MODALS = [el.overlay, el.loginOverlay, el.settingsModal];

// =========================================================
// PESAN STATUS (TOAST)
// =========================================================

let statusTimer = null;

function setStatus(message, isError = false) {
  clearTimeout(statusTimer);

  if (!message) {
    el.status.hidden = true;
    return;
  }

  el.status.textContent = message;
  el.status.className = isError ? "toast error" : "toast status";
  el.status.hidden = false;

  // Pesan biasa hilang sendiri; error bertahan sampai diklik.
  if (!isError) statusTimer = setTimeout(() => (el.status.hidden = true), 3500);
}

function friendlyError(error, fallback) {
  switch (error?.code) {
    case "permission-denied":
      return "Akses ditolak oleh Firestore. Pastikan akunmu terdaftar sebagai admin.";
    case "unavailable":
    case "auth/network-request-failed":
      return "Tidak dapat terhubung ke server. Periksa koneksi internet.";
    default:
      return error?.message ? `${fallback} (${error.message})` : fallback;
  }
}

const LOGIN_ERRORS = {
  "not-admin": "Akun ini valid, tetapi tidak memiliki hak administrator.",
  "auth/invalid-credential": "Email atau password salah.",
  "auth/wrong-password": "Email atau password salah.",
  "auth/user-not-found": "Email atau password salah.",
  "auth/invalid-email": "Format email tidak valid.",
  "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.",
  "auth/network-request-failed": "Koneksi bermasalah. Periksa internet kamu.",
  "auth/operation-not-allowed": "Provider Email/Password belum diaktifkan di Firebase Authentication.",
  "auth/timeout": "Waktu login habis. Coba lagi.",
  "auth/not-ready": "Firebase belum siap. Muat ulang halaman."
};

// =========================================================
// ROUTING
// =========================================================

function parseRoute(hash) {
  if (hash.toLowerCase() === "#admin") return { name: "login", id: null };
  if (hash === "#/admin") return { name: "admin", id: null };

  const match = hash.match(/^#\/e\/(.+)$/);
  if (match) return { name: "article", id: decodeURIComponent(match[1]) };

  return { name: "home", id: null };
}

function go(hash) {
  if (location.hash === hash) handleRoute();
  else location.hash = hash;
}

let pendingLogin = false;

function handleRoute() {
  const route = parseRoute(location.hash);

  // Link rahasia #admin: buka login (atau panel jika sudah admin).
  if (route.name === "login") {
    pendingLogin = true;
    history.replaceState(null, "", location.pathname + location.search + "#/");
    state.route = { name: "home", id: null };
    processPendingLogin();
    render();
    return;
  }

  if (route.name === "admin" && !state.isAdmin && Auth.getState().role !== Auth.ROLE.NONE) {
    history.replaceState(null, "", location.pathname + location.search + "#/");
    state.route = { name: "home", id: null };
  } else {
    state.route = route;
  }

  el.sidebar.classList.remove("open");
  render();
  window.scrollTo(0, 0);
}

function processPendingLogin() {
  if (!pendingLogin) return;

  const { role, error } = Auth.getState();

  // Tunggu sesi Firebase siap (sesi admin lama bisa dipulihkan).
  if (role === Auth.ROLE.NONE && !error) return;

  pendingLogin = false;

  if (state.isAdmin) go("#/admin");
  else openLogin();
}

// =========================================================
// RENDER
// =========================================================

function render() {
  renderChrome();
  renderSidebar();
  renderMain();
}

function renderChrome() {
  const { isAdmin, route } = state;

  $("btnLogout").hidden = !isAdmin;
  $("btnAdd").hidden = !isAdmin;
  $("navAdmin").hidden = !isAdmin;

  $("navHome").classList.toggle("active", route.name === "home");
  $("navAdmin").classList.toggle("active", route.name === "admin");
}

function renderSidebar() {
  el.charList.innerHTML = View.sidebarHTML(
    Store.queryEntries({ text: state.query }),
    state.route.name === "article" ? state.route.id : null,
    state.loading
  );
}

function renderMain() {
  const { route, isAdmin, loading, query, category } = state;
  const base = "The Velmoric Codex";

  if (route.name === "article") {
    const entry = Store.getEntry(route.id);

    document.title = entry ? `${entry.nama} — ${base}` : base;
    el.main.innerHTML = entry
      ? View.articleHTML(entry, isAdmin)
      : View.notFoundHTML(loading);
    return;
  }

  document.title = base;

  const view = {
    list: Store.queryEntries({ text: query, category }),
    total: Store.getEntries().length,
    counts: Store.countByCategory(),
    category,
    query,
    isAdmin,
    loading
  };

  el.main.innerHTML = route.name === "admin" && isAdmin
    ? View.adminHTML(view)
    : View.homeHTML(view);
}

// =========================================================
// MODAL
// =========================================================

function show(modal) {
  modal.classList.add("show");
  document.body.classList.add("no-scroll");
}

function hide(modal, { force = false } = {}) {
  if (!modal.classList.contains("show")) return true;

  // Jangan buang isian form tanpa konfirmasi.
  if (
    modal === el.overlay &&
    !force &&
    formSnapshot() !== state.formSnapshot &&
    !confirm("Buang perubahan yang belum disimpan?")
  ) {
    return false;
  }

  modal.classList.remove("show");

  if (modal === el.settingsModal) applyTheme(state.settings.theme);
  if (modal === el.overlay) state.editingId = null;

  if (!MODALS.some(item => item.classList.contains("show"))) {
    document.body.classList.remove("no-scroll");
  }

  return true;
}

// =========================================================
// FORM ENTRI
// =========================================================

const formSnapshot = () => JSON.stringify(Object.fromEntries(new FormData(el.form)));

function updatePreview(url) {
  const preview = $("fotoPreview"); // dibuat oleh formFieldsHTML()

  preview.hidden = !isHttpUrl(url);
  if (!preview.hidden) preview.src = url;
}

function openForm(id = null) {
  if (!state.isAdmin) return;

  const entry = id ? Store.getEntry(id) : null;
  const select = el.form.elements.kategori;

  state.editingId = entry ? entry.id : null;
  el.form.reset();
  select.querySelector("[data-custom]")?.remove();

  $("modalTitle").textContent = entry ? "Edit Entri" : "Tambah Entri";

  if (entry) {
    // Kategori lama di luar daftar tetap bisa dipilih.
    if (entry.kategori && ![...select.options].some(o => o.value === entry.kategori)) {
      const option = new Option(entry.kategori);
      option.dataset.custom = "";
      select.add(option);
    }

    for (const field of el.form.elements) {
      if (field.name && field.name in entry) field.value = entry[field.name] ?? "";
    }
  }

  updatePreview(el.form.elements.foto.value);
  state.formSnapshot = formSnapshot();

  show(el.overlay);
  el.form.elements.nama.focus();
}

async function submitForm(event) {
  event.preventDefault();
  if (!state.isAdmin) return;

  const button = $("submitBtn");
  const data = Object.fromEntries(new FormData(el.form));

  button.disabled = true;

  try {
    const saved = state.editingId
      ? await Store.updateEntry(state.editingId, data)
      : await Store.createEntry(data);

    hide(el.overlay, { force: true });
    setStatus("Entri berhasil disimpan.");
    go(View.entryHref(saved.id));
  } catch (error) {
    // Modal tetap terbuka supaya isian tidak hilang.
    setStatus(friendlyError(error, "Gagal menyimpan entri."), true);
  } finally {
    button.disabled = false;
  }
}

async function removeEntry(id) {
  if (!state.isAdmin) return;

  const target = Store.getEntry(id);

  if (!confirm(`Hapus "${target?.nama || "entri ini"}"? Tindakan ini tidak dapat dibatalkan.`)) {
    return;
  }

  try {
    await Store.deleteEntry(id);
    setStatus("Entri dihapus.");

    if (state.route.name === "article" && state.route.id === id) go("#/");
    else render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menghapus entri."), true);
  }
}

// =========================================================
// EKSPOR / IMPOR
// =========================================================

function exportData() {
  if (!state.isAdmin) return;

  const date = new Date().toISOString().slice(0, 10);
  downloadJSON(`velmoric-codex-${date}.json`, Store.buildBackup(state.settings));
}

async function importData(file) {
  if (!state.isAdmin || !file) return;

  try {
    const parsed = JSON.parse(await file.text());
    const items = Array.isArray(parsed) ? parsed : parsed?.characters;

    if (!Array.isArray(items) || !items.length) {
      throw new Error("Format JSON tidak valid atau tidak ada entri.");
    }

    if (!confirm(`Impor ${items.length} entri? Data yang sudah ada tidak akan dihapus.`)) return;

    setStatus("Mengimpor…");

    const { written, skipped } = await Store.importEntries(items);

    if (!Array.isArray(parsed) && parsed.settings) {
      try {
        await applySettings(await Store.saveSettings(parsed.settings));
      } catch (error) {
        console.error("Impor pengaturan gagal:", error);
      }
    }

    if (skipped.length) console.warn("Entri dilewati saat impor:", skipped);

    render();
    setStatus(
      skipped.length
        ? `Impor selesai: ${written} berhasil, ${skipped.length} dilewati (lihat console).`
        : `Impor selesai: ${written} entri.`,
      skipped.length > 0
    );
  } catch (error) {
    console.error("Impor gagal:", error);
    setStatus(friendlyError(error, "Impor gagal."), true);
  } finally {
    el.importInput.value = "";
  }
}

// =========================================================
// PENGATURAN (TEMA + MUSIK)
// =========================================================

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.body.classList.toggle("light-mode", theme === "light");
}

function applySettings(settings) {
  state.settings = settings;
  applyTheme(settings.theme);
  setPlaylist(settings.musicUrls);
}

function openSettings() {
  if (!state.isAdmin) return;

  $("toggleTheme").checked = state.settings.theme === "light";
  $("inputMusicUrl").value = state.settings.musicUrls.join("\n");

  show(el.settingsModal);
}

async function saveSettingsFromModal() {
  if (!state.isAdmin) return;

  const button = $("btnSaveSettings");
  const urls = $("inputMusicUrl").value.split(/\r?\n/).map(url => url.trim()).filter(Boolean);
  const invalid = urls.filter(url => !isHttpUrl(url));

  if (invalid.length) {
    setStatus(`URL musik harus diawali http:// atau https:// (${invalid[0]})`, true);
    return;
  }

  button.disabled = true;

  try {
    applySettings(await Store.saveSettings({
      theme: $("toggleTheme").checked ? "light" : "dark",
      musicUrls: urls
    }));

    hide(el.settingsModal);
    setStatus("Pengaturan disimpan.");
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menyimpan pengaturan."), true);
  } finally {
    button.disabled = false;
  }
}

// =========================================================
// LOGIN / LOGOUT ADMIN
// =========================================================

function openLogin() {
  if (state.isAdmin) return;

  $("loginError").textContent = "";
  show(el.loginOverlay);
  $("loginEmail").focus();
}

async function submitLogin(event) {
  event.preventDefault();

  const button = event.submitter;
  if (button) button.disabled = true;

  $("loginError").textContent = "";

  try {
    await Auth.loginAdmin($("loginEmail").value.trim(), $("loginPassword").value);

    $("loginForm").reset();
    hide(el.loginOverlay);
    setStatus("Login admin berhasil.");
    go("#/admin");
  } catch (error) {
    console.error("Login admin gagal:", error);
    $("loginError").textContent = LOGIN_ERRORS[error?.code] || "Login gagal. Periksa email dan password.";
    $("loginPassword").value = "";
  } finally {
    if (button) button.disabled = false;
  }
}

async function logout() {
  if (!state.isAdmin) return;

  try {
    await Auth.logoutAdmin();
    go("#/");
  } catch (error) {
    console.error("Logout gagal:", error);
    setStatus("Gagal logout.", true);
  }
}

// =========================================================
// MEMUAT DATA
// =========================================================

async function loadAll() {
  state.loading = true;

  // Entri dan pengaturan dimuat bersamaan.
  const [entries, settings] = await Promise.allSettled([
    Store.loadEntries(),
    Store.loadSettings()
  ]);

  if (entries.status === "rejected") {
    setStatus(friendlyError(entries.reason, "Gagal memuat arsip."), true);
  }

  if (settings.status === "fulfilled") applySettings(settings.value);
  else console.warn("Pengaturan tidak dimuat:", settings.reason);

  state.loading = false;
  render();
}

function onAuthChange(auth) {
  state.isAdmin = auth.role === Auth.ROLE.ADMIN;

  // Tutup semua UI admin begitu bukan admin lagi.
  if (!state.isAdmin) {
    hide(el.overlay, { force: true });
    hide(el.settingsModal);

    if (state.route.name === "admin" && auth.role !== Auth.ROLE.NONE) {
      history.replaceState(null, "", location.pathname + location.search + "#/");
      state.route = { name: "home", id: null };
    }
  }

  if (auth.role === Auth.ROLE.NONE && auth.error) {
    state.loading = false;
    setStatus(
      "Gagal masuk sebagai pembaca anonim. Aktifkan provider Anonymous di Firebase Authentication dan tambahkan domain situs ke Authorized domains.",
      true
    );
  }

  render();
  processPendingLogin();

  // Muat data saat pertama kali ada sesi, dan saat peran berubah.
  if (auth.role !== Auth.ROLE.NONE && auth.role !== state.lastRole) {
    state.lastRole = auth.role;
    loadAll();
  }
}

// =========================================================
// EVENT
// =========================================================

function bindEvents() {
  window.addEventListener("hashchange", handleRoute);

  // Pencarian ditunda sedikit agar tidak render di setiap huruf.
  const runSearch = debounce(() => {
    if (state.route.name === "article") go("#/");
    else render();
  }, 120);

  el.search.addEventListener("input", event => {
    state.query = event.target.value.trim();
    runSearch();
  });

  $("brandBtn").addEventListener("click", () => {
    state.query = "";
    state.category = "";
    el.search.value = "";
    go("#/");
  });

  $("navHome").addEventListener("click", () => go("#/"));
  $("navAdmin").addEventListener("click", () => go("#/admin"));
  $("menuBtn").addEventListener("click", () => el.sidebar.classList.toggle("open"));
  $("btnAdd").addEventListener("click", () => openForm());
  $("btnLogout").addEventListener("click", logout);

  el.form.addEventListener("submit", submitForm);
  $("fotoUrlInput").addEventListener("input", event => updatePreview(event.target.value.trim()));
  $("closeModal").addEventListener("click", () => hide(el.overlay));
  $("cancelBtn").addEventListener("click", () => hide(el.overlay));

  $("loginForm").addEventListener("submit", submitLogin);
  $("closeLogin").addEventListener("click", () => hide(el.loginOverlay));

  $("closeSettings").addEventListener("click", () => hide(el.settingsModal));
  $("btnSaveSettings").addEventListener("click", saveSettingsFromModal);
  $("toggleTheme").addEventListener("change", event =>
    applyTheme(event.target.checked ? "light" : "dark")   // pratinjau
  );

  el.importInput.addEventListener("change", event => importData(event.target.files[0]));
  el.status.addEventListener("click", () => setStatus(""));

  // Klik di luar modal menutup modal.
  for (const modal of MODALS) {
    modal.addEventListener("click", event => {
      if (event.target === modal) hide(modal);
    });
  }

  // Satu handler untuk semua tombol yang dirender ulang.
  document.addEventListener("click", event => {
    const target = event.target.closest(
      "[data-edit], [data-del], [data-action], [data-category], [data-scroll], [data-open]"
    );

    if (!target) return;

    const { edit, del, action, category, scroll, open } = target.dataset;

    if (edit !== undefined) return openForm(edit);
    if (del !== undefined) return removeEntry(del);

    if (category !== undefined) {
      state.category = state.category === category ? "" : category;
      return renderMain();
    }

    if (scroll !== undefined) {
      event.preventDefault();
      return document.getElementById(scroll)?.scrollIntoView({ behavior: "smooth" });
    }

    if (action === "add") return openForm();
    if (action === "settings") return openSettings();
    if (action === "export") return exportData();
    if (action === "import") return state.isAdmin && el.importInput.click();

    if (open !== undefined) go(View.entryHref(open));
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      // Tutup modal paling atas saja.
      const top = [...MODALS].reverse().find(modal => modal.classList.contains("show"));
      if (top) hide(top);
      else el.sidebar.classList.remove("open");
      return;
    }

    // Enter/Spasi pada kartu yang sedang fokus membuka artikel.
    const card = event.target.closest?.(".card");

    if (card && event.target === card && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      go(View.entryHref(card.dataset.open));
    }
  });

  // Peringatkan jika menutup tab saat form berisi perubahan.
  window.addEventListener("beforeunload", event => {
    if (el.overlay.classList.contains("show") && formSnapshot() !== state.formSnapshot) {
      event.preventDefault();
    }
  });
}

// =========================================================
// START
// =========================================================

function init() {
  el.formFields.innerHTML = View.formFieldsHTML();

  applySettings(state.settings);

  // Tampilkan cache dulu supaya arsip langsung terlihat.
  if (Store.loadCachedEntries()) state.loading = false;

  bindEvents();
  handleRoute();

  Auth.onChange(onAuthChange);
  Auth.start();
}

init();
