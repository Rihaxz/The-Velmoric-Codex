/* =========================================================
   THE VELMORIC CODEX — theme-core.js
   Logika murni sistem tema (tanpa DOM & tanpa Firebase),
   jadi mudah diuji dan aman dipakai di storage.js.

   Konsep:
     - Situs hanya punya DUA mode: "gelap" dan "terang".
       Siapa pun (termasuk pembaca anonim) bisa berpindah.
     - Owner bisa membuat tema kustom untuk tiap mode, lalu
       memilih tema mana yang dipakai di mode itu. Tema
       tersimpan di pengaturan situs (dilihat semua orang).
========================================================= */

export const MODES = Object.freeze(["gelap", "terang"]);
export const MAX_THEMES = 12;

/** Warna yang bisa diatur owner untuk setiap tema. */
export const COLOR_FIELDS = Object.freeze([
  { key: "bg", label: "Latar halaman" },
  { key: "panel", label: "Panel & kartu" },
  { key: "panel2", label: "Panel kedua" },
  { key: "text", label: "Teks utama" },
  { key: "muted", label: "Teks redup" },
  { key: "aksen", label: "Warna aksen" }
]);

/** Warna bawaan: dipakai sebagai titik awal tema baru. */
export const STARTERS = Object.freeze({
  gelap: Object.freeze({
    bg: "#0e0e14", panel: "#17171f", panel2: "#1e1e29",
    text: "#ece7dc", muted: "#a8a5b3", aksen: "#cfae6f"
  }),
  terang: Object.freeze({
    bg: "#f4efe4", panel: "#fbf8f1", panel2: "#ece4d2",
    text: "#2a2418", muted: "#6b6455", aksen: "#8a6a2f"
  })
});

/** Semua variabel CSS yang ditulis tema kustom (untuk dibersihkan). */
export const PALETTE_VARS = Object.freeze([
  "--bg", "--panel", "--panel2", "--text", "--muted", "--gold", "--gold-hi", "--gold-lo",
  "--accent-rgb", "--accent-hi-rgb", "--bg-rgb", "--panel-rgb",
  "--border", "--border-soft", "--on-accent", "--gold-grad", "--grad-text",
  "--prose", "--placeholder"
]);

// =========================================================
// WARNA
// =========================================================

export const isHex = value => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

export function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map(start => parseInt(value.slice(start, start + 2), 16));
}

export function rgbToHex(rgb) {
  return `#${rgb.map(channel => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0")).join("")}`;
}

/** Campur warna `a` ke arah `b` sebesar `amount` (0–1). */
export function mix(a, b, amount) {
  const from = hexToRgb(a);
  const to = hexToRgb(b);
  return rgbToHex(from.map((channel, index) => channel + (to[index] - channel) * amount));
}

export const lighten = (hex, amount) => mix(hex, "#ffffff", amount);
export const darken = (hex, amount) => mix(hex, "#000000", amount);

/** Luminansi relatif (WCAG). */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(channel => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rasio kontras WCAG antara dua warna (1–21). */
export function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const rgbText = hex => hexToRgb(hex).join(", ");

// =========================================================
// TURUNAN PALET
// =========================================================

/** Isi warna yang kosong/tidak valid dengan warna bawaan mode. */
export function completeColors(warna, dasar) {
  const base = STARTERS[dasar === "terang" ? "terang" : "gelap"];
  const out = {};

  for (const { key } of COLOR_FIELDS) {
    out[key] = isHex(warna?.[key]) ? warna[key].toLowerCase() : base[key];
  }

  return out;
}

/**
 * Ubah 6 warna pilihan owner menjadi seluruh variabel CSS situs
 * (nama variabel -> nilai). Variabel turunan (tepi, gradasi, warna
 * teks di atas aksen, dll.) dihitung di sini supaya tampilan tetap
 * serasi dan terbaca apa pun warna yang dipilih.
 */
export function derivePalette(warna, dasar) {
  const light = dasar === "terang";
  const c = completeColors(warna, dasar);

  const hi = light ? lighten(c.aksen, 0.2) : lighten(c.aksen, 0.35);
  const lo = darken(c.aksen, 0.3);
  const onAccent = contrast(c.aksen, "#1a140a") >= contrast(c.aksen, "#fffaf0") ? "#1a140a" : "#fffaf0";

  const borderAlpha = light ? 0.3 : 0.22;
  const softAlpha = light ? 0.18 : 0.12;

  const gradText = light
    ? `linear-gradient(180deg, ${darken(c.aksen, 0.05)}, ${darken(c.aksen, 0.35)})`
    : `linear-gradient(180deg, ${lighten(c.aksen, 0.65)}, ${lighten(c.aksen, 0.1)})`;

  return {
    "--bg": c.bg,
    "--panel": c.panel,
    "--panel2": c.panel2,
    "--text": c.text,
    "--muted": c.muted,
    "--gold": c.aksen,
    "--gold-hi": hi,
    "--gold-lo": lo,
    "--accent-rgb": rgbText(c.aksen),
    "--accent-hi-rgb": rgbText(hi),
    "--bg-rgb": rgbText(c.bg),
    "--panel-rgb": rgbText(c.panel),
    "--border": `rgba(${rgbText(c.aksen)}, ${borderAlpha})`,
    "--border-soft": `rgba(${rgbText(c.aksen)}, ${softAlpha})`,
    "--on-accent": onAccent,
    "--gold-grad": `linear-gradient(135deg, ${hi} 0%, ${c.aksen} 45%, ${lo} 100%)`,
    "--grad-text": gradText,
    "--prose": mix(c.text, c.bg, 0.1),
    "--placeholder": mix(c.muted, c.bg, 0.4)
  };
}

/** Peringatan kontras untuk editor: daftar masalah yang ditemukan. */
export function contrastIssues(warna, dasar) {
  const c = completeColors(warna, dasar);
  const issues = [];

  if (contrast(c.text, c.bg) < 4.5) issues.push("teks utama sulit dibaca di atas latar");
  if (contrast(c.text, c.panel) < 4.5) issues.push("teks utama sulit dibaca di atas panel");
  if (contrast(c.muted, c.panel) < 3) issues.push("teks redup terlalu pudar di atas panel");
  if (contrast(c.aksen, c.panel) < 3) issues.push("aksen kurang terlihat di atas panel");

  return issues;
}

// =========================================================
// VALIDASI DATA (dipakai normalizeSettings)
// =========================================================

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Buat id unik dari nama, menghindari id yang sudah dipakai. */
export function uniqueId(name, taken) {
  const base = slugify(name) || "tema";
  let id = base;
  let counter = 2;

  while (taken.has(id)) id = `${base.slice(0, 36)}-${counter++}`;

  return id;
}

/**
 * Bersihkan konfigurasi tema dari Firestore/cache/backup:
 * { daftar: [{ id, nama, dasar, warna }], gelap: id|"", terang: id|"" }
 */
export function normalizeThemes(input) {
  const source = input && typeof input === "object" ? input : {};
  const seen = new Set();
  const daftar = [];

  for (const item of Array.isArray(source.daftar) ? source.daftar : []) {
    if (daftar.length >= MAX_THEMES) break;
    if (!item || typeof item !== "object") continue;

    const nama = String(item.nama || "").trim().slice(0, 40);
    if (!nama) continue;

    const dasar = item.dasar === "terang" ? "terang" : "gelap";
    const id = uniqueId(item.id || nama, seen);

    seen.add(id);
    daftar.push({ id, nama, dasar, warna: completeColors(item.warna, dasar) });
  }

  const pick = mode => {
    const found = daftar.find(theme => theme.id === source[mode] && theme.dasar === mode);
    return found ? found.id : "";
  };

  return { daftar, gelap: pick("gelap"), terang: pick("terang") };
}

/** Tema kustom yang dipakai untuk satu mode (atau null = bawaan). */
export function themeForMode(config, mode) {
  const id = config?.[mode];
  return config?.daftar?.find(theme => theme.id === id && theme.dasar === mode) || null;
}
