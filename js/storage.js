/* =========================================================
   THE VELMORIC CODEX — storage.js
   Semua akses Firestore + cache lokal.

   Koleksi:
     karakter/{id}   entri terbit (dibaca semua orang)
     draf/{id}       entri draf (khusus admin)
     revisi/{id}     salinan versi lama sebelum diubah/dihapus
     log/{id}        catatan aktivitas admin
     media/{id}      gambar upload (sudah dikompres, base64)
     usulan/{id}    entri kiriman anonim (menunggu persetujuan)
     komentar/{id}  komentar & balasan (lihat community.js)
     admins/{uid}   akun staf (lihat auth.js & accounts.js)
     pengaturan/global

   Semua fungsi async melempar error; pemanggil yang
   menampilkan pesan.
========================================================= */

import {
  auth,
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  limit,
  where
} from "./firebase.js";

import { BASE_CATEGORIES, SEARCH_KEYS, isImageRef, parseYear, sanitizeEntry } from "./schema.js";
import { plainText } from "./markup.js";
import { collator, normalizeText, safeStorage } from "./utils.js";

const C = Object.freeze({
  entries: "karakter",
  drafts: "draf",
  revisions: "revisi",
  log: "log",
  media: "media",
  settings: "pengaturan"
});

const SETTINGS_DOC = "global";
const CACHE_ENTRIES = "velmoric:entries:v1";
const CACHE_SETTINGS = "velmoric:settings:v1";
const BATCH_LIMIT = 400;

// =========================================================
// STATE ENTRI (terbit + draf digabung di memori)
// =========================================================

let published = [];
let drafts = [];
let entries = [];
let byId = new Map();
let byName = new Map();
let searchIndex = new Map();
let reverseRelations = new Map();

function rebuild({ persist = true } = {}) {
  entries = [...published, ...drafts].sort((a, b) =>
    collator.compare(String(a.nama || ""), String(b.nama || ""))
  );

  byId = new Map(entries.map(entry => [entry.id, entry]));
  byName = new Map(entries.map(entry => [normalizeText(entry.nama), entry]));

  searchIndex = new Map(entries.map(entry => [
    entry.id,
    normalizeText([
      ...SEARCH_KEYS.map(key => plainText(entry[key])),
      ...(entry.tags || [])
    ].join(" \u0001 "))
  ]));

  // Hubungan balik: siapa saja yang menautkan ke entri X.
  reverseRelations = new Map();
  for (const entry of entries) {
    for (const rel of entry.relasi || []) {
      if (!reverseRelations.has(rel.id)) reverseRelations.set(rel.id, []);
      reverseRelations.get(rel.id).push({ from: entry.id, tipe: rel.tipe });
    }
  }

  if (persist) safeStorage.set(CACHE_ENTRIES, published);
}

export const getEntries = () => entries;
export const getPublished = () => published;
export const getDrafts = () => drafts;
export const getEntry = id => byId.get(id) || null;
export const findByName = name => byName.get(normalizeText(name)) || null;
export const getReverseRelations = id => reverseRelations.get(id) || [];

/**
 * Filter berdasarkan kata kunci + atribut.
 * Semua kata harus cocok (urutan bebas).
 */
export function queryEntries({ text = "", category = "", ras = "", status = "", era = "", tag = "", threat = "", includeDrafts = true } = {}) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean);
  const same = (a, b) => normalizeText(a) === normalizeText(b);

  return entries.filter(entry => {
    if (!includeDrafts && entry._draft) return false;
    if (category && entry.kategori !== category) return false;
    if (ras && !same(entry.ras, ras)) return false;
    if (status && !same(entry.status, status)) return false;
    if (era && !same(entry.era, era)) return false;
    if (threat && entry.ancaman !== threat) return false;
    if (tag && !(entry.tags || []).some(item => same(item, tag))) return false;
    if (!words.length) return true;

    const haystack = searchIndex.get(entry.id) || "";
    return words.every(word => haystack.includes(word));
  });
}

export function countByCategory(list = entries) {
  const counts = new Map();
  for (const entry of list) {
    const key = entry.kategori || "Lainnya";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

/** Nilai unik sebuah field (untuk dropdown filter). */
export function distinctValues(key) {
  const values = new Map();

  for (const entry of entries) {
    const list = key === "tags" ? entry.tags || [] : [entry[key]];
    for (const value of list) {
      const text = String(value || "").trim();
      if (text && !values.has(normalizeText(text))) values.set(normalizeText(text), text);
    }
  }

  return [...values.values()].sort(collator.compare);
}

export function timelineEntries() {
  return entries
    .map(entry => ({ entry, year: parseYear(entry.tahun) }))
    .filter(item => item.year !== null)
    .sort((a, b) => a.year - b.year || collator.compare(a.entry.nama, b.entry.nama));
}

// =========================================================
// MEMUAT
// =========================================================

const toEntry = (snap, extra = {}) => ({ id: snap.id, ...snap.data(), ...extra });

export function loadCachedEntries() {
  const cached = safeStorage.get(CACHE_ENTRIES, []);

  if (Array.isArray(cached) && cached.length) {
    published = cached;
    rebuild({ persist: false });
    return true;
  }

  return false;
}

export async function loadEntries({ withDrafts = false } = {}) {
  const jobs = [getDocs(collection(db, C.entries))];
  if (withDrafts) jobs.push(getDocs(collection(db, C.drafts)));

  const [pub, draft] = await Promise.all(jobs);

  published = pub.docs.map(snap => toEntry(snap));
  drafts = draft ? draft.docs.map(snap => toEntry(snap, { _draft: true })) : [];

  rebuild();
  return entries;
}

// =========================================================
// TULIS (hanya admin; ditegakkan oleh firestore.rules)
// =========================================================

const now = () => new Date().toISOString();
const clean = entry => {
  const { id, _draft, ...data } = entry;
  return data;
};

function who() {
  const user = auth.currentUser;
  return { uid: user?.uid || "", email: user?.email || "" };
}

/** Catat aktivitas. Kegagalan log tidak menggagalkan aksi utama. */
export async function logActivity(aksi, entry) {
  try {
    await addDoc(collection(db, C.log), {
      aksi,
      entriId: entry?.id || "",
      nama: entry?.nama || "",
      waktu: now(),
      ...who()
    });
  } catch (error) {
    console.warn("[Velmoric Storage] Log gagal:", error);
  }
}

async function saveRevision(entry, alasan) {
  if (!entry) return;

  try {
    await addDoc(collection(db, C.revisions), {
      entriId: entry.id,
      nama: entry.nama || "",
      alasan,
      data: clean(entry),
      waktu: now(),
      ...who()
    });
  } catch (error) {
    console.warn("[Velmoric Storage] Revisi gagal disimpan:", error);
  }
}

function replaceLocal(id, next, isDraft) {
  published = published.filter(item => item.id !== id);
  drafts = drafts.filter(item => item.id !== id);
  if (next) (isDraft ? drafts : published).push({ ...next, id, ...(isDraft ? { _draft: true } : {}) });
  rebuild();
}

export async function createEntry(input, { draft = false } = {}) {
  const time = now();
  const data = { ...sanitizeEntry(input), dibuatPada: time, diperbaruiPada: time };

  const ref = await addDoc(collection(db, draft ? C.drafts : C.entries), data);

  replaceLocal(ref.id, data, draft);
  await logActivity(draft ? "buat-draf" : "buat", { id: ref.id, nama: data.nama });

  return getEntry(ref.id);
}

/**
 * Simpan perubahan. `draft` menentukan tujuan akhir:
 * entri terbit bisa ditarik jadi draf dan sebaliknya.
 */
export async function updateEntry(id, input, { draft } = {}) {
  const old = getEntry(id);
  if (!old) throw new Error("Entri tidak ditemukan.");

  const toDraft = draft ?? Boolean(old._draft);
  const data = {
    ...sanitizeEntry(input),
    dibuatPada: old.dibuatPada || now(),
    diperbaruiPada: now()
  };

  await saveRevision(old, "ubah");

  const target = doc(db, toDraft ? C.drafts : C.entries, id);

  if (toDraft === Boolean(old._draft)) {
    await updateDoc(target, data);
  } else {
    // Pindah koleksi (terbitkan / tarik ke draf) secara atomik.
    const batch = writeBatch(db);
    batch.set(target, data);
    batch.delete(doc(db, old._draft ? C.drafts : C.entries, id));
    await batch.commit();
  }

  replaceLocal(id, data, toDraft);

  let action = "ubah";
  if (toDraft !== Boolean(old._draft)) action = toDraft ? "tarik-ke-draf" : "terbitkan";
  await logActivity(action, { id, nama: data.nama });

  return getEntry(id);
}

/** Ubah sebagian field tanpa melewati form (mis. posisi di peta). */
export async function patchEntry(id, patch) {
  const old = getEntry(id);
  if (!old) throw new Error("Entri tidak ditemukan.");

  const merged = sanitizeEntry({ ...old, ...patch });
  const data = {};
  for (const key of Object.keys(patch)) data[key] = merged[key];
  data.diperbaruiPada = now();

  await updateDoc(doc(db, old._draft ? C.drafts : C.entries, id), data);

  replaceLocal(id, { ...clean(old), ...data }, Boolean(old._draft));
  return getEntry(id);
}

export async function deleteEntry(id) {
  const old = getEntry(id);
  if (!old) throw new Error("Entri tidak ditemukan.");

  await saveRevision(old, "hapus");
  await deleteDoc(doc(db, old._draft ? C.drafts : C.entries, id));

  replaceLocal(id, null);
  await logActivity("hapus", old);
}

export async function importEntries(items) {
  const valid = [];
  const skipped = [];

  items.forEach((item, index) => {
    try {
      const time = now();
      const created = typeof item?.dibuatPada === "string" && !Number.isNaN(Date.parse(item.dibuatPada))
        ? item.dibuatPada
        : time;

      valid.push({
        id: typeof item?.id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(item.id) ? item.id : null,
        data: { ...sanitizeEntry(item), dibuatPada: created, diperbaruiPada: time }
      });
    } catch (error) {
      skipped.push({ index, reason: error.message });
    }
  });

  let written = 0;

  for (let start = 0; start < valid.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db);

    for (const { id, data } of valid.slice(start, start + BATCH_LIMIT)) {
      // ID asli dipertahankan agar relasi antar-entri tetap tersambung.
      batch.set(id ? doc(db, C.entries, id) : doc(collection(db, C.entries)), data);
    }

    await batch.commit();
    written += Math.min(BATCH_LIMIT, valid.length - start);
  }

  if (written) {
    await logActivity(`impor ${written} entri`, null);
    await loadEntries({ withDrafts: true });
  }

  return { written, skipped };
}

export function buildBackup(settings) {
  return {
    app: "The Velmoric Codex",
    version: 3,
    exportedAt: now(),
    characters: published,
    drafts: drafts.map(clean).map((data, i) => ({ ...data, id: drafts[i].id })),
    settings
  };
}

// =========================================================
// REVISI & LOG (khusus admin)
// =========================================================

export async function loadRevisions(entryId) {
  const snap = await getDocs(query(
    collection(db, C.revisions),
    where("entriId", "==", entryId),
    limit(50)
  ));

  return snap.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => String(b.waktu).localeCompare(String(a.waktu)));
}

export async function restoreRevision(revision) {
  const current = getEntry(revision.entriId);

  if (current) {
    return updateEntry(current.id, revision.data, { draft: Boolean(current._draft) });
  }

  // Entri sudah dihapus: pulihkan sebagai draf dengan ID yang sama.
  const data = { ...sanitizeEntry(revision.data), dibuatPada: revision.data.dibuatPada || now(), diperbaruiPada: now() };
  await setDoc(doc(db, C.drafts, revision.entriId), data);
  replaceLocal(revision.entriId, data, true);
  await logActivity("pulihkan", { id: revision.entriId, nama: data.nama });

  return getEntry(revision.entriId);
}

export async function loadActivity(count = 60) {
  const snap = await getDocs(query(collection(db, C.log), orderBy("waktu", "desc"), limit(count)));
  return snap.docs.map(item => ({ id: item.id, ...item.data() }));
}

// =========================================================
// MEDIA (gambar upload)
// =========================================================

const mediaCache = new Map();

export async function saveMedia({ dataUrl, width, height, name }) {
  const ref = await addDoc(collection(db, C.media), {
    data: dataUrl,
    width,
    height,
    nama: String(name || "").slice(0, 120),
    dibuatPada: now(),
    ...who()
  });

  mediaCache.set(ref.id, Promise.resolve(dataUrl));
  return `media:${ref.id}`;
}

/** Ubah referensi gambar menjadi URL yang bisa dipakai <img>. */
export function resolveImage(ref) {
  const text = String(ref || "");

  if (!text.startsWith("media:")) return Promise.resolve(text);

  const id = text.slice(6);

  if (!mediaCache.has(id)) {
    mediaCache.set(id, getDoc(doc(db, C.media, id))
      .then(snap => (snap.exists() ? snap.data().data : ""))
      .catch(error => {
        mediaCache.delete(id);
        throw error;
      }));
  }

  return mediaCache.get(id);
}

// =========================================================
// PENGATURAN GLOBAL
// =========================================================

export function normalizeSettings(source = {}) {
  const input = source && typeof source === "object" ? source : {};

  let urls = [];
  if (Array.isArray(input.musicUrls)) urls = input.musicUrls;
  else if (typeof input.musicUrl === "string") urls = [input.musicUrl]; // format lama

  const musicUrls = [...new Set(
    urls.filter(url => typeof url === "string").map(url => url.trim()).filter(url => /^https?:\/\//i.test(url))
  )];

  const extraCategories = [...new Set(
    (Array.isArray(input.kategoriTambahan) ? input.kategoriTambahan : [])
      .map(name => String(name || "").trim().slice(0, 40))
      .filter(name => name && !BASE_CATEGORIES.includes(name))
  )].slice(0, 30);

  return {
    musicUrls,
    musicUrl: musicUrls[0] || "", // kompatibilitas data lama
    kategoriTambahan: extraCategories,
    petaGambar: isImageRef(input.petaGambar) ? String(input.petaGambar).trim() : ""
  };
}

export function getCategories(settings) {
  return [...BASE_CATEGORIES, ...(settings?.kategoriTambahan || [])];
}

export function getCachedSettings() {
  return normalizeSettings(safeStorage.get(CACHE_SETTINGS, {}));
}

export async function loadSettings() {
  const snapshot = await getDoc(doc(db, C.settings, SETTINGS_DOC));
  const settings = normalizeSettings(snapshot.exists() ? snapshot.data() : {});

  safeStorage.set(CACHE_SETTINGS, settings);
  return settings;
}

export async function saveSettings(input) {
  const settings = normalizeSettings(input);

  await setDoc(doc(db, C.settings, SETTINGS_DOC), settings, { merge: true });

  safeStorage.set(CACHE_SETTINGS, settings);
  return settings;
}
