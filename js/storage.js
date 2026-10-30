/* =========================================================
   THE VELMORIC CODEX — storage.js
   Semua akses Firestore + cache lokal.

   - Data entri disimpan di memori (urut nama) beserta indeks
     pencarian, jadi pencarian tidak perlu memproses ulang
     seluruh objek di setiap ketikan.
   - Salinan terakhir disimpan di localStorage sehingga arsip
     langsung tampil saat halaman dibuka, lalu diperbarui
     begitu data dari Firestore tiba.
   - Semua fungsi async melempar error; pemanggil (app.js)
     yang menampilkan pesan.
========================================================= */

import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch
} from "./firebase.js";

import { SEARCH_KEYS, isHttpUrl, sanitizeEntry } from "./schema.js";
import { collator, normalizeText, safeStorage } from "./utils.js";

const COLLECTION_ENTRIES = "karakter";
const COLLECTION_SETTINGS = "pengaturan";
const SETTINGS_DOC = "global";

const CACHE_ENTRIES = "velmoric:entries:v1";
const CACHE_SETTINGS = "velmoric:settings:v1";

const BATCH_LIMIT = 400; // batas Firestore 500 operasi per batch

// =========================================================
// STATE ENTRI
// =========================================================

let entries = [];
let byId = new Map();
let searchIndex = new Map();

function setEntries(list, { persist = true } = {}) {
  entries = [...list].sort((a, b) =>
    collator.compare(String(a.nama || ""), String(b.nama || ""))
  );

  byId = new Map(entries.map(entry => [entry.id, entry]));

  searchIndex = new Map(
    entries.map(entry => [
      entry.id,
      normalizeText(SEARCH_KEYS.map(key => entry[key] || "").join(" \u0001 "))
    ])
  );

  if (persist) safeStorage.set(CACHE_ENTRIES, entries);
}

export function getEntries() {
  return entries;
}

export function getEntry(id) {
  return byId.get(id) || null;
}

/**
 * Filter berdasarkan kata kunci + kategori.
 * Semua kata harus cocok (urutan bebas): "naga api" cocok
 * dengan entri yang memuat "api" dan "naga".
 */
export function queryEntries({ text = "", category = "" } = {}) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean);

  return entries.filter(entry => {
    if (category && entry.kategori !== category) return false;
    if (!words.length) return true;

    const haystack = searchIndex.get(entry.id) || "";
    return words.every(word => haystack.includes(word));
  });
}

/** Jumlah entri per kategori, untuk tombol filter. */
export function countByCategory() {
  const counts = new Map();

  for (const entry of entries) {
    const key = entry.kategori || "Lainnya";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
}

// =========================================================
// MEMUAT
// =========================================================

/** Tampilkan data terakhir dari cache (instan, tanpa jaringan). */
export function loadCachedEntries() {
  const cached = safeStorage.get(CACHE_ENTRIES, []);

  if (Array.isArray(cached) && cached.length) {
    setEntries(cached, { persist: false });
    return true;
  }

  return false;
}

export async function loadEntries() {
  const snapshot = await getDocs(collection(db, COLLECTION_ENTRIES));

  setEntries(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));

  return entries;
}

// =========================================================
// TULIS (hanya admin; ditegakkan oleh firestore.rules)
// =========================================================

const now = () => new Date().toISOString();

export async function createEntry(input) {
  const time = now();

  const data = {
    ...sanitizeEntry(input),
    dibuatPada: time,
    diperbaruiPada: time
  };

  const ref = await addDoc(collection(db, COLLECTION_ENTRIES), data);
  const created = { id: ref.id, ...data };

  setEntries([...entries, created]);

  return created;
}

export async function updateEntry(id, input) {
  if (!id) throw new Error("ID entri tidak ditemukan.");

  const data = { ...sanitizeEntry(input), diperbaruiPada: now() };

  await updateDoc(doc(db, COLLECTION_ENTRIES, id), data);

  setEntries(entries.map(entry =>
    entry.id === id ? { ...entry, ...data } : entry
  ));

  return getEntry(id);
}

export async function deleteEntry(id) {
  if (!id) throw new Error("ID entri tidak ditemukan.");

  await deleteDoc(doc(db, COLLECTION_ENTRIES, id));

  setEntries(entries.filter(entry => entry.id !== id));
}

/**
 * Impor banyak entri sekaligus memakai batch write
 * (jauh lebih cepat daripada satu per satu).
 * Entri tidak valid dilewati dan dilaporkan.
 */
export async function importEntries(items) {
  const valid = [];
  const skipped = [];

  items.forEach((item, index) => {
    try {
      const time = now();
      const created =
        typeof item?.dibuatPada === "string" && !Number.isNaN(Date.parse(item.dibuatPada))
          ? item.dibuatPada
          : time;

      valid.push({ ...sanitizeEntry(item), dibuatPada: created, diperbaruiPada: time });
    } catch (error) {
      skipped.push({ index, reason: error.message });
    }
  });

  let written = 0;

  for (let start = 0; start < valid.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db);

    for (const data of valid.slice(start, start + BATCH_LIMIT)) {
      batch.set(doc(collection(db, COLLECTION_ENTRIES)), data);
    }

    await batch.commit();
    written += Math.min(BATCH_LIMIT, valid.length - start);
  }

  if (written) await loadEntries();

  return { written, skipped };
}

export function buildBackup(settings) {
  return {
    app: "The Velmoric Codex",
    version: 2,
    exportedAt: now(),
    characters: entries,
    settings
  };
}

// =========================================================
// PENGATURAN GLOBAL
// =========================================================

export function normalizeSettings(source = {}) {
  const input = source && typeof source === "object" ? source : {};

  let urls = [];

  if (Array.isArray(input.musicUrls)) {
    urls = input.musicUrls;
  } else if (typeof input.musicUrl === "string") {
    urls = [input.musicUrl]; // format lama
  }

  const musicUrls = [...new Set(
    urls
      .filter(url => typeof url === "string")
      .map(url => url.trim())
      .filter(isHttpUrl)
  )];

  return {
    theme: input.theme === "light" ? "light" : "dark",
    musicUrls,
    musicUrl: musicUrls[0] || "" // kompatibilitas data lama
  };
}

export function getCachedSettings() {
  return normalizeSettings(safeStorage.get(CACHE_SETTINGS, {}));
}

/** Hanya membaca; pembaca anonim tidak boleh menulis. */
export async function loadSettings() {
  const snapshot = await getDoc(doc(db, COLLECTION_SETTINGS, SETTINGS_DOC));
  const settings = normalizeSettings(snapshot.exists() ? snapshot.data() : {});

  safeStorage.set(CACHE_SETTINGS, settings);

  return settings;
}

export async function saveSettings(input) {
  const settings = normalizeSettings(input);

  await setDoc(doc(db, COLLECTION_SETTINGS, SETTINGS_DOC), settings, { merge: true });

  safeStorage.set(CACHE_SETTINGS, settings);

  return settings;
}
