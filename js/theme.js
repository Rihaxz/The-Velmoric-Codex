/* =========================================================
   THE VELMORIC CODEX — theme.js
   Dua mode (gelap/terang) + Studio Tema khusus owner.

   - Tombol mode di topbar dipakai SIAPA PUN; pilihan pembaca
     disimpan di browser (prefs.mode).
   - Mode bawaan memakai CSS di luxe.css. Bila owner memilih
     tema kustom untuk sebuah mode, variabel CSS-nya ditulis
     ke <html> (tema tersimpan di pengaturan situs).
   - Studio Tema (buat/ubah/hapus tema, pilih tema tiap mode)
     hanya bekerja bila state.isOwner === true.
========================================================= */

import * as Store from "./storage.js";
import { getPrefs, setPref } from "./library.js";
import {
  COLOR_FIELDS, MAX_THEMES, PALETTE_VARS, STARTERS,
  derivePalette, themeForMode, uniqueId
} from "./theme-core.js";
import { contrastNote } from "./views/theme.js";
import { friendlyError, render, setStatus, state } from "./ui.js";
import { $ } from "./utils.js";

const FALLBACK_BG = { gelap: "#0e0e14", terang: "#f4efe4" };

/** Tema yang sedang diedit owner (belum disimpan). */
let draft = null;

export const getThemeDraft = () => draft;

export function getMode() {
  return getPrefs().mode === "terang" ? "terang" : "gelap";
}

// =========================================================
// PENERAPAN
// =========================================================

/** Tulis palet ke <html>. `warna` null = pakai CSS bawaan mode. */
function paint(base, warna) {
  const root = document.documentElement;

  root.dataset.theme = base;

  for (const name of PALETTE_VARS) root.style.removeProperty(name);

  if (warna) {
    for (const [name, value] of Object.entries(derivePalette(warna, base))) {
      root.style.setProperty(name, value);
    }
  }

  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", warna?.bg || FALLBACK_BG[base]);
}

function paintButton(mode) {
  const button = $("btnTheme");
  if (!button) return;

  const label = mode === "gelap" ? "Ganti ke mode terang" : "Ganti ke mode gelap";

  button.setAttribute("aria-label", label);
  button.title = label;
}

/** Terapkan mode + tema yang berlaku sekarang. Aman dipanggil kapan saja. */
export function applyTheme() {
  const mode = getMode();

  document.documentElement.dataset.mode = mode;

  if (draft && state.isOwner) {
    paint(draft.dasar, draft.warna); // pratinjau di layar owner saja
  } else {
    paint(mode, themeForMode(state.settings?.temaKustom, mode)?.warna || null);
  }

  paintButton(mode);
}

function toggleMode() {
  const next = getMode() === "gelap" ? "terang" : "gelap";
  const root = document.documentElement;

  // Peralihan halus antar mode (dicabut lagi setelah selesai).
  root.classList.add("theme-fade");
  setTimeout(() => root.classList.remove("theme-fade"), 450);

  setPref("mode", next);
  state.prefs = { ...state.prefs, mode: next };
  applyTheme();
}

// =========================================================
// STUDIO TEMA (owner)
// =========================================================

function config() {
  return state.settings?.temaKustom || { daftar: [], gelap: "", terang: "" };
}

async function saveConfig(next) {
  state.settings = await Store.saveSettings({ ...state.settings, temaKustom: next });
  applyTheme();
}

function startDraft(theme) {
  draft = theme
    ? { ...theme, warna: { ...theme.warna }, isNew: false }
    : { id: "", nama: "Tema Baru", dasar: "gelap", warna: { ...STARTERS.gelap }, isNew: true };

  applyTheme();
  render();
}

function closeDraft() {
  draft = null;
  applyTheme();
  render();
}

async function saveDraft() {
  if (!draft) return;

  const nama = draft.nama.trim();
  if (!nama) return setStatus("Nama tema wajib diisi.", true);

  const current = config();
  let daftar = current.daftar;

  if (draft.isNew) {
    if (daftar.length >= MAX_THEMES) return setStatus(`Maksimal ${MAX_THEMES} tema.`, true);

    const id = uniqueId(nama, new Set(daftar.map(theme => theme.id)));
    daftar = [...daftar, { id, nama, dasar: draft.dasar, warna: draft.warna }];
  } else {
    daftar = daftar.map(theme =>
      theme.id === draft.id ? { ...theme, nama, dasar: draft.dasar, warna: draft.warna } : theme);
  }

  try {
    await saveConfig({ ...current, daftar });
    draft = null;
    applyTheme();
    setStatus(`Tema “${nama}” disimpan. Pilih di “Pemakaian Tema” agar tampil ke pembaca.`);
    render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menyimpan tema."), true);
  }
}

async function removeTheme(id) {
  const theme = config().daftar.find(item => item.id === id);
  if (!theme || !confirm(`Hapus tema “${theme.nama}”? Mode yang memakainya kembali ke tema bawaan.`)) return;

  const current = config();

  try {
    await saveConfig({
      daftar: current.daftar.filter(item => item.id !== id),
      gelap: current.gelap === id ? "" : current.gelap,
      terang: current.terang === id ? "" : current.terang
    });
    setStatus("Tema dihapus.");
    render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menghapus tema."), true);
  }
}

async function assignSlot(mode, id) {
  try {
    await saveConfig({ ...config(), [mode]: id });
    setStatus(id ? "Tema diterapkan untuk semua pembaca." : `Mode ${mode} kembali ke tema bawaan.`);
    render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menerapkan tema."), true);
    render();
  }
}

/** Aksi klik Studio Tema. Mengembalikan true bila aksi dikenali. */
export function handleThemeAction(action, target) {
  if (!state.isOwner || !String(action).startsWith("theme-")) return false;

  switch (action) {
    case "theme-new":
      if (config().daftar.length >= MAX_THEMES) setStatus(`Maksimal ${MAX_THEMES} tema.`, true);
      else startDraft(null);
      return true;

    case "theme-edit": {
      const theme = config().daftar.find(item => item.id === target.dataset.id);
      if (theme) startDraft(theme);
      return true;
    }

    case "theme-cancel":
      closeDraft();
      return true;

    case "theme-reset-colors":
      if (draft) {
        draft.warna = { ...STARTERS[draft.dasar] };
        applyTheme();
        render();
      }
      return true;

    case "theme-delete":
      removeTheme(target.dataset.id);
      return true;

    default:
      return false;
  }
}

/** Kirim form Studio Tema. Mengembalikan true bila form dikenali. */
export function handleThemeForm(form) {
  if (!state.isOwner || form.dataset.form !== "theme") return false;

  saveDraft();
  return true;
}

// =========================================================
// EVENT
// =========================================================

function onInput(event) {
  if (!state.isOwner || !draft) return;

  const input = event.target;

  if (input.matches("[data-theme-name]")) {
    draft.nama = input.value;
    return;
  }

  if (input.matches("[data-theme-color]")) {
    const key = input.dataset.themeColor;
    if (!COLOR_FIELDS.some(field => field.key === key)) return;

    draft.warna[key] = input.value.toLowerCase();

    const hex = input.closest("form")?.querySelector(`[data-theme-hex="${key}"]`);
    if (hex) hex.textContent = draft.warna[key];

    const note = input.closest("form")?.querySelector("[data-theme-contrast]");
    if (note) note.textContent = contrastNote(draft);

    applyTheme(); // pratinjau langsung
  }
}

function onChange(event) {
  if (!state.isOwner) return;

  const select = event.target;

  if (select.matches("[data-theme-slot]")) {
    assignSlot(select.dataset.themeSlot, select.value);
    return;
  }

  if (draft && select.matches("[data-theme-dasar]")) {
    // Ganti mode = ganti titik awal warna, supaya tampilan tetap serasi.
    draft.dasar = select.value === "terang" ? "terang" : "gelap";
    draft.warna = { ...STARTERS[draft.dasar] };
    applyTheme();
    render();
  }
}

export function bindTheme() {
  $("btnTheme")?.addEventListener("click", toggleMode);

  document.addEventListener("input", onInput);
  document.addEventListener("change", onChange);

  // Meninggalkan panel owner membuang pratinjau yang belum disimpan.
  window.addEventListener("hashchange", () => {
    if (draft && !location.hash.startsWith("#/owner")) {
      draft = null;
      applyTheme();
    }
  });

  applyTheme();
}
