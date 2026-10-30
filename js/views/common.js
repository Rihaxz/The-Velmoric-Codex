/* =========================================================
   views/common.js — komponen kecil yang dipakai ulang.
   Semua teks dari database WAJIB lewat esc().
========================================================= */

import { CATEGORY_ICONS, THREAT_LEVELS } from "../schema.js";
import { plainText } from "../markup.js";
import { imageTag } from "../media.js";
import { esc } from "../utils.js";

export const entryHref = id => `#/e/${encodeURIComponent(id)}`;

export const PAGE_SIZE = 24;

export function icon(category) {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS.Lainnya;
}

export function snippet(text, length = 140) {
  const plain = plainText(text);
  return plain.length > length ? `${plain.slice(0, length).trimEnd()}…` : plain;
}

export function avatarHTML(entry) {
  if (entry.foto) return imageTag(entry.foto, entry.nama);
  return `<span class="avatar-icon" aria-hidden="true">${esc(entry.avatar || icon(entry.kategori))}</span>`;
}

export function threatBadge(level) {
  const item = THREAT_LEVELS.find(threat => threat.value === String(level));
  if (!item) return "";
  return `<span class="threat threat-${item.value}" title="Tingkat ancaman">${"☠".repeat(Number(item.value))} ${esc(item.label)}</span>`;
}

export function draftBadge(entry) {
  return entry._draft ? `<span class="badge draft">Draf</span>` : "";
}

export function adminButtons(entry, extraClass = "") {
  return `
    <button class="btn ${extraClass}" data-edit="${esc(entry.id)}">Edit</button>
    <button class="btn danger ${extraClass}" data-del="${esc(entry.id)}">Hapus</button>`;
}

export function cardHTML(entry, { isAdmin = false, bookmarked = false } = {}) {
  const subtitle = entry.julukan || entry.gelar || entry.ras || "";

  return `
    <article class="card" data-open="${esc(entry.id)}" tabindex="0">
      <div class="avatar">${avatarHTML(entry)}</div>
      <div class="card-content">
        <div class="card-meta">
          <span class="cat-label">${icon(entry.kategori)} ${esc(entry.kategori || "Lainnya")}</span>
          ${draftBadge(entry)}
          ${bookmarked ? `<span class="badge" title="Ditandai">★</span>` : ""}
        </div>
        <h3>${esc(entry.nama)}</h3>
        ${subtitle ? `<small>${esc(subtitle)}</small>` : ""}
        ${entry.ancaman ? threatBadge(entry.ancaman) : ""}
        <p>${esc(snippet(entry.deskripsi) || "Belum ada deskripsi.")}</p>
        ${isAdmin ? `<div class="card-actions">${adminButtons(entry, "small-btn")}</div>` : ""}
      </div>
    </article>`;
}

/** Grid kartu dengan tombol "Muat lebih banyak". */
export function cardGridHTML(list, { isAdmin, bookmarks = [], emptyText, limit = PAGE_SIZE }) {
  if (!list.length) return `<p class="empty">${emptyText}</p>`;

  const marks = new Set(bookmarks);
  const shown = list.slice(0, limit);

  return `
    <div class="card-grid">
      ${shown.map(entry => cardHTML(entry, { isAdmin, bookmarked: marks.has(entry.id) })).join("")}
    </div>
    ${list.length > limit ? `
      <div class="load-more">
        <button class="btn" data-action="more">Muat lebih banyak (${list.length - limit} lagi)</button>
      </div>` : ""}`;
}

/** Tombol filter kategori; hanya kategori yang punya entri. */
export function chipsHTML(counts, active, total, categories) {
  if (!total) return "";

  const known = categories.filter(name => counts.has(name));
  const others = [...counts.keys()].filter(name => !categories.includes(name));

  const chip = (value, label, count) => `
    <button class="chip${active === value ? " active" : ""}" data-category="${esc(value)}"
            aria-pressed="${active === value}">
      ${value ? `${icon(value)} ` : ""}${esc(label)} <span>${count}</span>
    </button>`;

  return `
    <div class="chips" role="toolbar" aria-label="Filter kategori">
      ${chip("", "Semua", total)}
      ${[...known, ...others].map(name => chip(name, name, counts.get(name))).join("")}
    </div>`;
}

export function ornament() {
  return `<div class="ornament" aria-hidden="true"><span>❦</span></div>`;
}

export function pageHeader(eyebrow, title, text = "") {
  return `
    <header class="page-header">
      <p class="eyebrow">${eyebrow}</p>
      <h1 class="page-title">${title}</h1>
      ${text ? `<p class="muted">${text}</p>` : ""}
    </header>
    ${ornament()}`;
}

export function miniCard(entry, extra = "") {
  return `
    <a class="mini-card" href="${entryHref(entry.id)}">
      <span class="mini-avatar">${avatarHTML(entry)}</span>
      <span>
        <b>${esc(entry.nama)}</b>
        <small>${extra || `${icon(entry.kategori)} ${esc(entry.kategori || "Lainnya")}`}</small>
      </span>
    </a>`;
}

export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatYear(year, era) {
  const text = year < 0 ? `${Math.abs(year)} SE` : `Tahun ${year}`;
  return era ? `${text} · ${era}` : text;
}

/** Daftar entri di sidebar, dikelompokkan per kategori (bisa dilipat). */
export function sidebarHTML(list, currentId, loading, categories) {
  if (!list.length) return `<p class="empty">${loading ? "Memuat…" : "Belum ada entri."}</p>`;

  const groups = new Map();
  for (const entry of list) {
    const key = entry.kategori || "Lainnya";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  const order = [
    ...categories.filter(name => groups.has(name)),
    ...[...groups.keys()].filter(name => !categories.includes(name))
  ];

  return order.map(name => {
    const items = groups.get(name);
    const open = items.some(entry => entry.id === currentId) || items.length <= 8;

    return `
      <details class="side-group-wrap"${open ? " open" : ""}>
        <summary class="side-group">${icon(name)} ${esc(name)} <span>${items.length}</span></summary>
        ${items.map(entry => `
          <a class="side-link${entry.id === currentId ? " active" : ""}" href="${entryHref(entry.id)}">
            <span class="side-avatar">${avatarHTML(entry)}</span>
            ${esc(entry.nama)}${entry._draft ? ` <small class="muted">(draf)</small>` : ""}
          </a>`).join("")}
      </details>`;
  }).join("");
}
