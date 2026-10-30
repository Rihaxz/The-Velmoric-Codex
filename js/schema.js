/* =========================================================
   THE VELMORIC CODEX — schema.js
   Satu-satunya tempat mendefinisikan bentuk data entri.

   Menambah field baru cukup satu baris di INFO_FIELDS atau
   SECTIONS. Form admin, artikel, pencarian, dan impor JSON
   otomatis ikut menyesuaikan.

   `cats` (opsional) = field hanya muncul di form untuk
   kategori tersebut. Tanpa `cats` = berlaku untuk semua.

   PENTING: `key` adalah nama field di Firestore. Jangan ubah
   key yang sudah dipakai, atau data lama tidak akan terbaca.
========================================================= */

export const BASE_CATEGORIES = Object.freeze([
  "Karakter",
  "Kerajaan",
  "Ras",
  "Makhluk",
  "Sihir",
  "Artefak",
  "Lokasi",
  "Organisasi",
  "Peristiwa",
  "Lainnya"
]);

export const DEFAULT_CATEGORY = "Lainnya";

/** Ikon kecil per kategori (dipakai di kartu & beranda). */
export const CATEGORY_ICONS = Object.freeze({
  Karakter: "♛",
  Kerajaan: "♜",
  Ras: "❖",
  Makhluk: "☠",
  Sihir: "✦",
  Artefak: "⚔",
  Lokasi: "⌖",
  Organisasi: "⚑",
  Peristiwa: "⌛",
  Lainnya: "◈"
});

export const THREAT_LEVELS = Object.freeze([
  { value: "1", label: "Rendah" },
  { value: "2", label: "Sedang" },
  { value: "3", label: "Tinggi" },
  { value: "4", label: "Sangat Tinggi" },
  { value: "5", label: "Bencana" }
]);

/** Field singkat: tampil di infobox artikel. */
export const INFO_FIELDS = Object.freeze([
  { key: "julukan", label: "Julukan" },
  { key: "gelar", label: "Gelar" },
  { key: "ras", label: "Ras", cats: ["Karakter", "Makhluk"] },
  { key: "gender", label: "Jenis Kelamin", cats: ["Karakter"] },
  { key: "usia", label: "Usia", cats: ["Karakter", "Makhluk"] },
  { key: "tinggi", label: "Tinggi", cats: ["Karakter", "Makhluk"] },
  { key: "berat", label: "Berat", cats: ["Karakter", "Makhluk"] },
  { key: "asal", label: "Asal" },
  { key: "afiliasi", label: "Afiliasi", cats: ["Karakter", "Makhluk", "Artefak", "Organisasi"] },
  { key: "status", label: "Status" },
  { key: "kelas", label: "Kelas", cats: ["Karakter"] },

  { key: "klasifikasi", label: "Klasifikasi", cats: ["Makhluk", "Ras"] },
  { key: "habitat", label: "Habitat", cats: ["Makhluk", "Ras"] },
  { key: "ancaman", label: "Tingkat Ancaman", cats: ["Makhluk"], type: "threat" },

  { key: "penguasa", label: "Penguasa", cats: ["Kerajaan", "Lokasi"] },
  { key: "ibukota", label: "Ibu Kota", cats: ["Kerajaan"] },
  { key: "populasi", label: "Populasi", cats: ["Kerajaan", "Lokasi", "Ras"] },
  { key: "jenisLokasi", label: "Jenis Lokasi", cats: ["Lokasi"] },
  { key: "wilayah", label: "Wilayah", cats: ["Lokasi"] },

  { key: "elemen", label: "Elemen", cats: ["Sihir", "Artefak"] },
  { key: "tingkat", label: "Tingkatan", cats: ["Sihir", "Artefak", "Karakter"] },
  { key: "pemilik", label: "Pemilik", cats: ["Artefak"] },

  { key: "tahun", label: "Tahun", hint: "Angka; boleh negatif untuk sebelum era" },
  { key: "era", label: "Era" }
]);

/** Field panjang: tampil sebagai bagian artikel + daftar isi. */
export const SECTIONS = Object.freeze([
  { key: "deskripsi", label: "Deskripsi" },
  { key: "kepribadian", label: "Kepribadian", cats: ["Karakter", "Makhluk"] },
  { key: "latar", label: "Latar Belakang" },
  { key: "kemampuan", label: "Kemampuan" },
  { key: "kelemahan", label: "Kelemahan" },
  { key: "pencapaian", label: "Pencapaian & Riwayat" }
]);

/**
 * Jenis hubungan. Disimpan di entri A sebagai { id: B, tipe }
 * yang berarti: "B adalah <label> dari A".
 * `reverse` = sebutan A bila dilihat dari halaman B.
 */
export const RELATION_TYPES = Object.freeze({
  orangtua: { label: "Orang Tua", reverse: "anak", family: true },
  anak: { label: "Anak", reverse: "orangtua", family: true },
  pasangan: { label: "Pasangan", reverse: "pasangan", family: true },
  saudara: { label: "Saudara", reverse: "saudara", family: true },
  guru: { label: "Guru", reverse: "murid" },
  murid: { label: "Murid", reverse: "guru" },
  sekutu: { label: "Sekutu", reverse: "sekutu" },
  musuh: { label: "Musuh", reverse: "musuh" },
  rival: { label: "Rival", reverse: "rival" },
  afiliasi: { label: "Afiliasi", reverse: "anggota" },
  anggota: { label: "Anggota", reverse: "afiliasi" },
  penguasa: { label: "Penguasa", reverse: "wilayah" },
  wilayah: { label: "Wilayah Kekuasaan", reverse: "penguasa" },
  pemilik: { label: "Pemilik", reverse: "milik" },
  milik: { label: "Kepemilikan", reverse: "pemilik" },
  lokasi: { label: "Lokasi", reverse: "penghuni" },
  penghuni: { label: "Penghuni", reverse: "lokasi" },
  terkait: { label: "Terkait", reverse: "terkait" }
});

const LIST_KEYS = ["tags", "galeri", "relasi"];

/** Semua field teks yang boleh disimpan (whitelist untuk form & impor). */
export const TEXT_KEYS = Object.freeze([
  "nama",
  "kategori",
  "foto",
  ...INFO_FIELDS.map(field => field.key),
  ...SECTIONS.map(field => field.key)
]);

/** Kompatibilitas dengan nama lama. */
export const EDITABLE_KEYS = Object.freeze([...TEXT_KEYS, ...LIST_KEYS, "peta"]);

/** Field yang ikut dicari oleh kotak pencarian. */
export const SEARCH_KEYS = Object.freeze(TEXT_KEYS.filter(key => key !== "foto"));

export const MAX_LENGTH = Object.freeze({ short: 200, long: 20000, image: 2000 });

const LONG_KEYS = new Set(SECTIONS.map(field => field.key));

/** URL gambar yang valid: http(s) atau referensi gambar upload (media:ID). */
export function isHttpUrl(value) {
  return /^https?:\/\/\S+$/i.test(String(value || "").trim());
}

export function isImageRef(value) {
  const text = String(value || "").trim();
  return isHttpUrl(text) || /^media:[A-Za-z0-9_-]{1,64}$/.test(text);
}

export function fieldAppliesTo(field, category) {
  return !field.cats || field.cats.includes(category);
}

export function parseYear(value) {
  const match = String(value ?? "").trim().match(/^-?\d{1,7}$/);
  return match ? Number(match[0]) : null;
}

function sanitizeTags(raw) {
  const list = Array.isArray(raw) ? raw : String(raw || "").split(",");

  return [...new Set(
    list.map(tag => String(tag).trim()).filter(Boolean).map(tag => tag.slice(0, 40))
  )].slice(0, 30);
}

function sanitizeGallery(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map(item => (typeof item === "string" ? { src: item, caption: "" } : item))
    .filter(item => item && isImageRef(item.src))
    .map(item => ({
      src: String(item.src).trim().slice(0, MAX_LENGTH.image),
      caption: String(item.caption || "").trim().slice(0, 200)
    }))
    .slice(0, 40);
}

function sanitizeRelations(raw) {
  if (!Array.isArray(raw)) return [];

  const seen = new Set();

  return raw
    .filter(item => item && typeof item.id === "string" && item.id && RELATION_TYPES[item.tipe])
    .filter(item => {
      const key = `${item.tipe}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(item => ({ id: item.id.slice(0, 128), tipe: item.tipe }))
    .slice(0, 100);
}

function sanitizeMapPoint(raw) {
  if (!raw || typeof raw !== "object") return null;

  const x = Number(raw.x);
  const y = Number(raw.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const clamp = n => Math.round(Math.min(100, Math.max(0, n)) * 100) / 100;
  return { x: clamp(x), y: clamp(y) };
}

/**
 * Membersihkan input (form atau JSON impor) menjadi objek entri
 * yang aman disimpan. Melempar Error jika tidak valid.
 */
export function sanitizeEntry(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Data entri tidak valid.");
  }

  const entry = {};

  for (const key of TEXT_KEYS) {
    const raw = input[key];

    if (raw === undefined || raw === null) {
      entry[key] = "";
      continue;
    }

    let limit = MAX_LENGTH.short;
    if (LONG_KEYS.has(key)) limit = MAX_LENGTH.long;
    if (key === "foto") limit = MAX_LENGTH.image;

    entry[key] = String(raw).trim().slice(0, limit);
  }

  if (!entry.nama) throw new Error("Nama entri wajib diisi.");

  // Kategori di luar daftar tetap dipertahankan (data lama / kategori tambahan).
  if (!entry.kategori) entry.kategori = DEFAULT_CATEGORY;

  if (entry.foto && !isImageRef(entry.foto)) {
    throw new Error("URL gambar harus diawali http:// atau https://");
  }

  if (entry.tahun && parseYear(entry.tahun) === null) {
    throw new Error("Tahun harus berupa angka (contoh: 312 atau -40).");
  }

  if (entry.ancaman && !THREAT_LEVELS.some(level => level.value === entry.ancaman)) {
    entry.ancaman = "";
  }

  entry.tags = sanitizeTags(input.tags);
  entry.galeri = sanitizeGallery(input.galeri);
  entry.relasi = sanitizeRelations(input.relasi);
  entry.peta = sanitizeMapPoint(input.peta);

  return entry;
}
