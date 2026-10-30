/* =========================================================
   THE VELMORIC CODEX — utils.js
   Helper kecil yang dipakai di banyak modul.
========================================================= */

export const $ = id => document.getElementById(id);

/** Escape teks sebelum dimasukkan ke HTML (mencegah XSS). */
export function esc(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Escape + pertahankan baris baru. */
export function escMultiline(value) {
  return esc(value).replace(/\n/g, "<br>");
}

/** Normalisasi untuk pencarian: huruf kecil, tanpa aksen. */
export function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Pengurut nama yang paham bahasa Indonesia & angka ("Bab 2" < "Bab 10"). */
export const collator = new Intl.Collator("id", {
  sensitivity: "base",
  numeric: true
});

export function debounce(fn, wait = 150) {
  let timer = null;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** localStorage yang tidak melempar error (mode privat, kuota penuh, dll). */
export const safeStorage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* abaikan: cache hanya pelengkap */
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* abaikan */
    }
  }
};

export function codeError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

export function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Beri waktu browser memulai unduhan sebelum URL dicabut.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
