/* =========================================================
   THE VELMORIC CODEX — app.js
   Titik masuk: routing, render, dan event umum.

   Alamat halaman (bisa dibagikan, tombol Back berfungsi):
     #/                   beranda
     #/e/<id>             artikel entri
     #/jelajah?q=&k=...   pencarian & filter lanjutan
     #/linimasa?era=      linimasa dunia
     #/peta?fokus=<id>    peta dunia
     #/bestiari?t=&h=     bestiari (ancaman, habitat)
     #/tersimpan          bookmark + riwayat baca
     #/acak               buka entri acak
     #/admin              panel admin (khusus admin)
     #admin               membuka form login admin (link rahasia)
========================================================= */

import * as Auth from "./auth.js";
import * as Store from "./storage.js";
import * as Library from "./library.js";
import { parseYear } from "./schema.js";
import { hydrateImages, imageTag } from "./media.js";
import { backlinksOf, familyTree, groupedRelations } from "./relations.js";
import { bindEditor, buildForm, isDirty, openForm } from "./editor.js";
import { applySettings, bindAdmin, loadActivity } from "./admin.js";
import { afterMapRender, bindMap, mapView } from "./map.js";
import { exploreHTML, homeHTML } from "./views/home.js";
import { articleHTML, notFoundHTML } from "./views/article.js";
import { bestiaryHTML, mapHTML, savedHTML, timelineHTML } from "./views/pages.js";
import { adminHTML } from "./views/admin.js";
import { PAGE_SIZE, entryHref, sidebarHTML } from "./views/common.js";
import {
  friendlyError, go, hide, modals, render, replaceHash, setRenderer, setStatus, show, state, topModal
} from "./ui.js";
import { $, collator, debounce } from "./utils.js";

const el = {
  main: $("main"),
  sidebar: $("sidebar"),
  charList: $("charList"),
  search: $("search"),
  loginOverlay: $("loginOverlay"),
  lightbox: $("lightbox")
};

const BASE_TITLE = "The Velmoric Codex";
const EXPLORE_KEYS = ["q", "k", "ras", "status", "era", "tag", "threat", "sort"];

// =========================================================
// ROUTING
// =========================================================

function parseRoute(hash) {
  if (hash.toLowerCase() === "#admin") return { name: "login", id: null, params: new URLSearchParams() };

  const [path, query = ""] = hash.replace(/^#/, "").split("?");
  const params = new URLSearchParams(query);

  const article = path.match(/^\/e\/(.+)$/);
  if (article) return { name: "article", id: decodeURIComponent(article[1]), params };

  const name = {
    "/jelajah": "jelajah",
    "/linimasa": "linimasa",
    "/peta": "peta",
    "/bestiari": "bestiari",
    "/tersimpan": "tersimpan",
    "/acak": "acak",
    "/admin": "admin"
  }[path] || "home";

  return { name, id: null, params };
}

/** Ubah parameter halaman sekarang tanpa menambah riwayat browser. */
function setParams(changes, path = location.hash.split("?")[0] || "#/") {
  const params = new URLSearchParams(location.hash.split("?")[1] || "");

  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }

  const text = params.toString();
  const hash = `${path}${text ? `?${text}` : ""}`;

  if (location.hash.split("?")[0] === path) {
    replaceHash(hash);
    handleRoute({ keepScroll: true });
  } else {
    go(hash);
  }
}

let pendingLogin = false;
let previousPath = "";

function handleRoute({ keepScroll = false } = {}) {
  const route = parseRoute(location.hash);

  // Link rahasia #admin: buka login (atau panel jika sudah admin).
  if (route.name === "login") {
    pendingLogin = true;
    replaceHash("#/");
    state.route = parseRoute("#/");
    processPendingLogin();
    render();
    return;
  }

  if (route.name === "acak") return openRandom();

  if (route.name === "admin" && !state.isAdmin && Auth.getState().role !== Auth.ROLE.NONE) {
    replaceHash("#/");
    state.route = parseRoute("#/");
  } else {
    state.route = route;
  }

  // Halaman baru: reset paginasi & mode peta.
  const path = `${state.route.name}:${state.route.id || ""}`;
  if (path !== previousPath) {
    state.limit = PAGE_SIZE;
    if (state.route.name !== "peta") state.map.editing = false;
    if (state.route.name === "admin" && state.isAdmin) loadActivity();
    previousPath = path;
    keepScroll = false;
  }

  if (state.route.name === "jelajah") {
    const q = state.route.params.get("q") || "";
    if (document.activeElement !== el.search) el.search.value = q;
    state.query = q;
  }

  el.sidebar.classList.remove("open");
  render();
  if (!keepScroll) window.scrollTo(0, 0);
}

function openRandom() {
  const pool = Store.getPublished();

  if (!pool.length) {
    replaceHash("#/");
    state.route = parseRoute("#/");
    setStatus(state.loading ? "Arsip masih dimuat, coba sebentar lagi." : "Arsip masih kosong.");
    render();
    return;
  }

  // Hindari membuka entri yang sama dua kali berturut-turut.
  const current = state.route.name === "article" ? state.route.id : null;
  const candidates = pool.length > 1 ? pool.filter(entry => entry.id !== current) : pool;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];

  replaceHash(entryHref(pick.id));
  handleRoute();
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
// DATA UNTUK VIEW
// =========================================================

/** Satu entri per hari, sama untuk semua pembaca pada tanggal itu. */
function loreOfTheDay() {
  const pool = Store.getPublished().filter(entry => entry.deskripsi || entry.latar);
  if (!pool.length) return null;

  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  const day = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (const char of day) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;

  return sorted[hash % sorted.length];
}

function recentEntries() {
  return Library.getRecent()
    .map(item => ({ entry: Store.getEntry(item.id), at: item.at }))
    .filter(item => item.entry);
}

function latestEntries(count = 6) {
  return [...Store.getPublished()]
    .sort((a, b) => String(b.dibuatPada || "").localeCompare(String(a.dibuatPada || "")))
    .slice(0, count);
}

function sortList(list, sort) {
  if (sort === "baru") {
    return [...list].sort((a, b) =>
      String(b.diperbaruiPada || b.dibuatPada || "").localeCompare(String(a.diperbaruiPada || a.dibuatPada || ""))
    );
  }

  if (sort === "tahun") {
    const year = entry => parseYear(entry.tahun) ?? Infinity;
    return [...list].sort((a, b) => year(a) - year(b) || collator.compare(a.nama, b.nama));
  }

  return list;
}

function common() {
  return {
    isAdmin: state.isAdmin,
    loading: state.loading,
    bookmarks: Library.getBookmarks(),
    limit: state.limit,
    categories: Store.getCategories(state.settings)
  };
}

// =========================================================
// RENDER
// =========================================================

function renderAll() {
  renderChrome();
  renderSidebar();
  renderMain();
}

function renderChrome() {
  const { isAdmin, route } = state;

  $("btnLogout").hidden = !isAdmin;
  $("btnAdd").hidden = !isAdmin;

  for (const link of document.querySelectorAll("[data-nav]")) {
    if (link.dataset.nav === "admin") link.hidden = !isAdmin;
    link.classList.toggle("active", link.dataset.nav === route.name);
  }

  document.body.classList.toggle("reading-mode", route.name === "article" && state.prefs.readingMode);
}

function renderSidebar() {
  el.charList.innerHTML = sidebarHTML(
    Store.queryEntries({ text: state.query }),
    state.route.name === "article" ? state.route.id : null,
    state.loading,
    Store.getCategories(state.settings)
  );
  hydrateImages(el.charList);
}

function renderMain() {
  const { route } = state;
  const params = route.params;
  let title = BASE_TITLE;
  let html;

  switch (route.name) {
    case "article": {
      const entry = Store.getEntry(route.id);

      if (entry) {
        Library.addRecent(entry.id);
        title = `${entry.nama} — ${BASE_TITLE}`;
        html = articleHTML(entry, {
          isAdmin: state.isAdmin,
          bookmarked: Library.isBookmarked(entry.id),
          reading: state.prefs.readingMode,
          resolve: name => Store.findByName(name),
          relations: groupedRelations(entry),
          tree: familyTree(entry),
          backlinks: backlinksOf(entry)
        });
      } else {
        html = notFoundHTML(state.loading);
      }
      break;
    }

    case "jelajah": {
      const filters = Object.fromEntries(EXPLORE_KEYS.map(key => [key, params.get(key) || ""]));
      const list = sortList(Store.queryEntries({
        text: filters.q,
        category: filters.k,
        ras: filters.ras,
        status: filters.status,
        era: filters.era,
        tag: filters.tag,
        threat: filters.threat
      }), filters.sort);

      title = `${filters.q ? `Cari “${filters.q}”` : "Jelajah"} — ${BASE_TITLE}`;
      html = exploreHTML({
        ...common(),
        list,
        total: Store.getEntries().length,
        counts: Store.countByCategory(),
        filters,
        options: {
          ras: Store.distinctValues("ras"),
          status: Store.distinctValues("status"),
          era: Store.distinctValues("era"),
          tags: Store.distinctValues("tags")
        }
      });
      break;
    }

    case "linimasa":
      title = `Linimasa — ${BASE_TITLE}`;
      html = timelineHTML({
        ...common(),
        items: Store.timelineEntries(),
        eraFilter: params.get("era") || "",
        eras: [...new Set(Store.timelineEntries().map(item => item.entry.era).filter(Boolean))]
      });
      break;

    case "peta":
      title = `Peta Dunia — ${BASE_TITLE}`;
      html = mapHTML(mapView());
      break;

    case "bestiari": {
      const threat = params.get("t") || "";
      const habitat = params.get("h") || "";
      const all = Store.getEntries().filter(entry => entry.kategori === "Makhluk");
      const shown = all.filter(entry =>
        (!threat || entry.ancaman === threat) && (!habitat || entry.habitat === habitat)
      );

      title = `Bestiari — ${BASE_TITLE}`;
      html = bestiaryHTML({
        ...common(),
        list: { all, shown },
        threat,
        habitat,
        habitats: [...new Set(all.map(entry => entry.habitat).filter(Boolean))].sort(collator.compare)
      });
      break;
    }

    case "tersimpan":
      title = `Tersimpan — ${BASE_TITLE}`;
      html = savedHTML({
        bookmarks: Library.getBookmarks().map(id => Store.getEntry(id)).filter(Boolean),
        recent: recentEntries()
      });
      break;

    case "admin":
      if (state.isAdmin) {
        title = `Panel Admin — ${BASE_TITLE}`;
        html = adminHTML({
          ...common(),
          list: Store.queryEntries({ category: state.category }),
          total: Store.getEntries().length,
          published: Store.getPublished().length,
          drafts: Store.getDrafts(),
          counts: Store.countByCategory(),
          category: state.category,
          extraCategories: state.settings.kategoriTambahan,
          needsWork: Store.getEntries()
            .map(entry => ({
              entry,
              missing: [!entry.foto && "gambar", !entry.deskripsi && "deskripsi"].filter(Boolean)
            }))
            .filter(item => item.missing.length),
          activity: state.activity
        });
        break;
      }
    // bukan admin: jatuh ke beranda
    // eslint-disable-next-line no-fallthrough
    default:
      html = homeHTML({
        ...common(),
        total: Store.getEntries().length,
        counts: Store.countByCategory(),
        lore: loreOfTheDay(),
        recent: recentEntries().slice(0, 6).map(item => item.entry),
        latest: latestEntries(),
        category: state.category,
        list: Store.queryEntries({ category: state.category })
      });
  }

  document.title = title;
  el.main.innerHTML = html;
  hydrateImages(el.main);

  if (route.name === "peta") afterMapRender();
}

setRenderer(renderAll);

// =========================================================
// AKSI ENTRI
// =========================================================

async function removeEntry(id) {
  if (!state.isAdmin) return;

  const target = Store.getEntry(id);
  if (!confirm(`Hapus "${target?.nama || "entri ini"}"? Versi terakhirnya tetap tersimpan di riwayat revisi.`)) return;

  try {
    await Store.deleteEntry(id);
    setStatus("Entri dihapus.");

    if (state.route.name === "article" && state.route.id === id) go("#/");
    else render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menghapus entri."), true);
  }
}

async function shareCurrent() {
  const entry = Store.getEntry(state.route.id);
  const url = location.href;
  const data = { title: entry?.nama || BASE_TITLE, text: entry?.deskripsi?.slice(0, 120) || "", url };

  try {
    if (navigator.share) {
      await navigator.share(data);
    } else {
      await navigator.clipboard.writeText(url);
      setStatus("Tautan disalin ke clipboard.");
    }
  } catch (error) {
    if (error?.name !== "AbortError") setStatus("Tidak bisa membagikan. Salin alamat dari address bar.", true);
  }
}

// =========================================================
// LIGHTBOX GALERI
// =========================================================

let lightboxIndex = 0;

function lightboxItems() {
  return Store.getEntry(state.route.id)?.galeri || [];
}

function showLightbox(index) {
  const items = lightboxItems();
  if (!items.length) return;

  lightboxIndex = (index + items.length) % items.length;
  const item = items[lightboxIndex];

  $("lightboxImage").innerHTML = imageTag(item.src, item.caption || "Gambar galeri");
  $("lightboxCaption").textContent = `${lightboxIndex + 1} / ${items.length}${item.caption ? ` — ${item.caption}` : ""}`;
  $("lightboxPrev").hidden = $("lightboxNext").hidden = items.length < 2;
  hydrateImages($("lightboxImage"));

  if (!el.lightbox.classList.contains("show")) show(el.lightbox);
}

// =========================================================
// LOGIN / LOGOUT ADMIN
// =========================================================

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

  const [entries, settings] = await Promise.allSettled([
    Store.loadEntries({ withDrafts: state.isAdmin }),
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
  const wasAdmin = state.isAdmin;
  state.isAdmin = auth.role === Auth.ROLE.ADMIN;

  // Tutup semua UI admin begitu bukan admin lagi.
  if (!state.isAdmin) {
    for (const id of ["overlay", "adminSettingsModal", "historyModal"]) hide($(id), { force: true });

    if (state.route.name === "admin" && auth.role !== Auth.ROLE.NONE) {
      replaceHash("#/");
      state.route = parseRoute("#/");
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

  // Muat data saat pertama kali ada sesi, dan saat peran berubah
  // (admin juga memuat draf).
  if (auth.role !== Auth.ROLE.NONE && auth.role !== state.lastRole) {
    state.lastRole = auth.role;
    loadAll();
    if (state.isAdmin && !wasAdmin && state.route.name === "admin") loadActivity();
  }
}

// =========================================================
// EVENT
// =========================================================

function bindEvents() {
  window.addEventListener("hashchange", () => handleRoute());

  // Pencarian global: hasil tampil di halaman Jelajah.
  const runSearch = debounce(() => {
    if (state.route.name === "jelajah") setParams({ q: state.query });
    else if (state.query) go(`#/jelajah?q=${encodeURIComponent(state.query)}`);
    else renderSidebar();
  }, 200);

  el.search.addEventListener("input", event => {
    state.query = event.target.value.trim();
    renderSidebar();
    runSearch();
  });

  el.search.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      go(`#/jelajah?q=${encodeURIComponent(el.search.value.trim())}`);
    }
  });

  $("brandBtn").addEventListener("click", () => {
    state.query = "";
    state.category = "";
    el.search.value = "";
    go("#/");
  });

  $("menuBtn").addEventListener("click", () => el.sidebar.classList.toggle("open"));
  $("btnAdd").addEventListener("click", () => openForm());
  $("btnLogout").addEventListener("click", logout);

  $("loginForm").addEventListener("submit", submitLogin);
  $("closeLogin").addEventListener("click", () => hide(el.loginOverlay));

  $("closeLightbox").addEventListener("click", () => hide(el.lightbox));
  $("lightboxPrev").addEventListener("click", () => showLightbox(lightboxIndex - 1));
  $("lightboxNext").addEventListener("click", () => showLightbox(lightboxIndex + 1));

  $("appStatus").addEventListener("click", () => setStatus(""));

  // Klik di luar kotak modal menutup modal.
  for (const modal of modals()) {
    modal.addEventListener("click", event => {
      if (event.target === modal) hide(modal);
    });
  }

  // Satu handler untuk semua elemen yang dirender ulang.
  document.addEventListener("click", event => {
    const spoiler = event.target.closest(".spoiler");
    if (spoiler) return spoiler.classList.toggle("revealed");

    const target = event.target.closest(
      "[data-edit], [data-del], [data-action], [data-category], [data-scroll], [data-open], [data-era], [data-threat], [data-lightbox]"
    );
    if (!target) return;

    const data = target.dataset;

    if (data.edit !== undefined) return openForm(data.edit);
    if (data.del !== undefined) return removeEntry(data.del);
    if (data.lightbox !== undefined) return showLightbox(Number(data.lightbox));
    if (data.era !== undefined) return setParams({ era: data.era });
    if (data.threat !== undefined) return setParams({ t: data.threat });

    if (data.category !== undefined) {
      if (state.route.name === "jelajah") {
        const current = state.route.params.get("k") || "";
        return setParams({ k: current === data.category ? "" : data.category });
      }
      state.category = state.category === data.category ? "" : data.category;
      state.limit = PAGE_SIZE;
      return renderMain();
    }

    if (data.scroll !== undefined) {
      event.preventDefault();
      return document.getElementById(data.scroll)?.scrollIntoView({ behavior: "smooth" });
    }

    switch (data.action) {
      case "add":
        return openForm();
      case "more":
        state.limit += PAGE_SIZE;
        return renderMain();
      case "bookmark": {
        const marked = Library.toggleBookmark(state.route.id);
        setStatus(marked ? "Ditandai. Lihat di halaman Tersimpan." : "Tanda dihapus.");
        return renderMain();
      }
      case "share":
        return shareCurrent();
      case "reading":
        state.prefs = { ...state.prefs, readingMode: !state.prefs.readingMode };
        Library.setPref("readingMode", state.prefs.readingMode);
        return render();
      case "clear-recent":
        if (confirm("Hapus seluruh riwayat baca di browser ini?")) {
          Library.clearRecent();
          renderMain();
        }
        return;
      case "reset-filters":
        el.search.value = "";
        state.query = "";
        return go("#/jelajah");
    }

    if (data.open !== undefined) go(entryHref(data.open));
  });

  // Filter dropdown (jelajah & bestiari).
  document.addEventListener("change", event => {
    const select = event.target;

    if (select.matches("[data-filter]")) setParams({ [select.dataset.filter]: select.value });
    else if (select.matches("[data-filter-habitat]")) setParams({ h: select.value });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      // Tutup modal paling atas saja.
      const top = topModal();
      if (top) hide(top);
      else el.sidebar.classList.remove("open");
      return;
    }

    if (el.lightbox.classList.contains("show") && topModal() === el.lightbox) {
      if (event.key === "ArrowLeft") return showLightbox(lightboxIndex - 1);
      if (event.key === "ArrowRight") return showLightbox(lightboxIndex + 1);
    }

    if (event.key !== "Enter" && event.key !== " ") return;

    // Spoiler bisa dibuka dengan keyboard.
    if (event.target.classList?.contains("spoiler")) {
      event.preventDefault();
      event.target.classList.toggle("revealed");
      return;
    }

    // Enter/Spasi pada kartu yang sedang fokus membuka artikel.
    const card = event.target.closest?.(".card");
    if (card && event.target === card) {
      event.preventDefault();
      go(entryHref(card.dataset.open));
    }
  });

  // Peringatkan jika menutup tab saat form berisi perubahan.
  window.addEventListener("beforeunload", event => {
    if (isDirty()) event.preventDefault();
  });
}

// =========================================================
// START
// =========================================================

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(error => console.warn("Service worker:", error));
  });
}

function init() {
  buildForm();
  applySettings(state.settings);

  // Tampilkan cache dulu supaya arsip langsung terlihat.
  if (Store.loadCachedEntries()) state.loading = false;

  bindEvents();
  bindEditor();
  bindAdmin();
  bindMap();
  handleRoute();

  Auth.onChange(onAuthChange);
  Auth.start();
  registerServiceWorker();
}

init();

