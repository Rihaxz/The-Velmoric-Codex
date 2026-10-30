/* =========================================================
   THE VELMORIC CODEX — ui.js
   State aplikasi + utilitas UI bersama (toast, modal, navigasi).
   Dipakai oleh app.js, editor.js, admin.js, dan map.js.
========================================================= */

import { getCachedSettings } from "./storage.js";
import { getPrefs } from "./library.js";
import { $ } from "./utils.js";

export const state = {
  route: { name: "home", id: null, params: new URLSearchParams() },
  query: "",
  category: "",
  limit: 24,
  isAdmin: false,
  loading: true,
  lastRole: null,
  settings: getCachedSettings(),
  prefs: getPrefs(),
  activity: null,
  map: { editing: false, selectedId: "" }
};

// =========================================================
// RENDER (didaftarkan oleh app.js agar tidak saling impor)
// =========================================================

let renderFn = () => {};

export function setRenderer(fn) {
  renderFn = fn;
}

export function render() {
  renderFn();
}

// =========================================================
// NAVIGASI
// =========================================================

export function go(hash) {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else location.hash = hash;
}

export function replaceHash(hash) {
  history.replaceState(null, "", location.pathname + location.search + hash);
}

// =========================================================
// TOAST
// =========================================================

let statusTimer = null;

export function setStatus(message, isError = false) {
  const element = $("appStatus");
  clearTimeout(statusTimer);

  if (!message) {
    element.hidden = true;
    return;
  }

  element.textContent = message;
  element.className = isError ? "toast error" : "toast status";
  element.hidden = false;

  // Pesan biasa hilang sendiri; error bertahan sampai diklik.
  if (!isError) statusTimer = setTimeout(() => (element.hidden = true), 3500);
}

export function friendlyError(error, fallback) {
  switch (error?.code) {
    case "permission-denied":
      return "Akses ditolak oleh Firestore. Pastikan akunmu admin dan firestore.rules terbaru sudah dipublikasikan.";
    case "unavailable":
    case "auth/network-request-failed":
      return "Tidak dapat terhubung ke server. Periksa koneksi internet.";
    case "failed-precondition":
      return `${fallback} (Firestore butuh index; buka link di console browser untuk membuatnya.)`;
    default:
      return error?.message ? `${fallback} (${error.message})` : fallback;
  }
}

// =========================================================
// MODAL
// =========================================================

const closeGuards = new Map();
const onCloseHooks = new Map();

export function modals() {
  return [...document.querySelectorAll(".modal-overlay")];
}

/** Daftarkan pengecekan sebelum modal ditutup (return false = batal). */
export function guardClose(modal, guard) {
  closeGuards.set(modal, guard);
}

export function onClose(modal, hook) {
  onCloseHooks.set(modal, hook);
}

let lastFocus = null;

export function show(modal) {
  lastFocus = document.activeElement;
  modal.classList.add("show");
  document.body.classList.add("no-scroll");
}

export function hide(modal, { force = false } = {}) {
  if (!modal.classList.contains("show")) return true;
  if (!force && closeGuards.get(modal)?.() === false) return false;

  modal.classList.remove("show");
  onCloseHooks.get(modal)?.();

  if (!modals().some(item => item.classList.contains("show"))) {
    document.body.classList.remove("no-scroll");
    lastFocus?.focus?.();
  }

  return true;
}

export function topModal() {
  return modals().reverse().find(modal => modal.classList.contains("show")) || null;
}
