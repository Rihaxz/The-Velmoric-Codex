/* =========================================================
   THE VELMORIC CODEX — schema.js
   Satu-satunya tempat mendefinisikan bentuk data entri.

   Ingin menambah field baru? Cukup tambahkan satu baris di
   INFO_FIELDS (tabel infobox) atau SECTIONS (bagian artikel).
   Form admin, halaman artikel, pencarian, dan impor JSON
   otomatis ikut menyesuaikan.

   PENTING: `key` adalah nama field di Firestore. Jangan ubah
   key yang sudah dipakai, atau data lama tidak akan terbaca.
========================================================= */

export const CATEGORIES = Object.freeze([
  "Karakter",
  "Kerajaan",
  "Ras",
  "Makhluk",
  "Artefak",
  "Lokasi",
  "Organisasi",
  "Peristiwa",
  "Lainnya"
]);

export const DEFAULT_CATEGORY = "Lainnya";

/** Field singkat: tampil di infobox artikel. */
export const INFO_FIELDS = Object.freeze([
  { key: "gelar", label: "Gelar" },
  { key: "ras", label: "Ras" },
  { key: "gender", label: "Jenis Kelamin" },
  { key: "usia", label: "Usia" },
  { key: "tinggi", label: "Tinggi" },
  { key: "berat", label: "Berat" },
  { key: "asal", label: "Asal" },
  { key: "afiliasi", label: "Afiliasi" },
  { key: "status", label: "Status" },
  { key: "kelas", label: "Kelas" }
]);

/** Field panjang: tampil sebagai bagian artikel + daftar isi. */
export const SECTIONS = Object.freeze([
  { key: "deskripsi", label: "Deskripsi" },
  { key: "kepribadian", label: "Kepribadian" },
  { key: "latar", label: "Latar Belakang" },
  { key: "kemampuan", label: "Kemampuan" },
  { key: "kelemahan", label: "Kelemahan" }
]);

/** Semua field yang boleh disimpan (whitelist untuk form & impor). */
export const EDITABLE_KEYS = Object.freeze([
  "nama",
  "kategori",
  "foto",
  ...INFO_FIELDS.map(field => field.key),
  ...SECTIONS.map(field => field.key)
]);

/** Field yang ikut dicari oleh kotak pencarian. */
export const SEARCH_KEYS = Object.freeze(
  EDITABLE_KEYS.filter(key => key !== "foto")
);

/** Batas panjang teks agar dokumen Firestore tidak membengkak. */
export const MAX_LENGTH = Object.freeze({
  short: 200,
  long: 20000
});

const LONG_KEYS = new Set(SECTIONS.map(field => field.key));

export function isHttpUrl(value) {
  return /^https?:\/\/\S+$/i.test(String(value || "").trim());
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

  for (const key of EDITABLE_KEYS) {
    const raw = input[key];

    if (raw === undefined || raw === null) {
      entry[key] = "";
      continue;
    }

    const limit = LONG_KEYS.has(key) ? MAX_LENGTH.long : MAX_LENGTH.short;
    const value = String(raw).trim();

    // URL gambar boleh lebih panjang dari field singkat lain.
    entry[key] = key === "foto" ? value.slice(0, 2000) : value.slice(0, limit);
  }

  if (!entry.nama) {
    throw new Error("Nama entri wajib diisi.");
  }

  // Kategori di luar daftar tetap dipertahankan (data lama).
  if (!entry.kategori) {
    entry.kategori = DEFAULT_CATEGORY;
  }

  if (entry.foto && !isHttpUrl(entry.foto)) {
    throw new Error("URL gambar harus diawali http:// atau https://");
  }

  return entry;
}
