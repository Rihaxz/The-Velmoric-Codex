/* =========================================================
   THE VELMORIC CODEX — library.js
   Data pribadi pembaca, disimpan di browser (localStorage):
   penanda (bookmark), riwayat baca, dan preferensi tampilan.
   Tidak dikirim ke server.
========================================================= */

import { safeStorage } from "./utils.js";

const KEY_BOOKMARKS = "velmoric:bookmarks:v1";
const KEY_RECENT = "velmoric:recent:v1";
const KEY_PREFS = "velmoric:prefs:v1";
const MAX_RECENT = 20;

export function getBookmarks() {
  const list = safeStorage.get(KEY_BOOKMARKS, []);
  return Array.isArray(list) ? list.filter(id => typeof id === "string") : [];
}

export function isBookmarked(id) {
  return getBookmarks().includes(id);
}

/** Tambah/hapus penanda. Mengembalikan status baru. */
export function toggleBookmark(id) {
  const list = getBookmarks();
  const index = list.indexOf(id);

  if (index >= 0) list.splice(index, 1);
  else list.unshift(id);

  safeStorage.set(KEY_BOOKMARKS, list);
  return index < 0;
}

export function getRecent() {
  const list = safeStorage.get(KEY_RECENT, []);
  return Array.isArray(list) ? list.filter(item => item && typeof item.id === "string") : [];
}

export function addRecent(id) {
  const list = getRecent().filter(item => item.id !== id);
  list.unshift({ id, at: Date.now() });
  safeStorage.set(KEY_RECENT, list.slice(0, MAX_RECENT));
}

export function clearRecent() {
  safeStorage.remove(KEY_RECENT);
}

export function getPrefs() {
  return { readingMode: false, ...safeStorage.get(KEY_PREFS, {}) };
}

export function setPref(key, value) {
  safeStorage.set(KEY_PREFS, { ...getPrefs(), [key]: value });
}
