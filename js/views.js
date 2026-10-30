/* =========================================================
   THE VELMORIC CODEX — views.js
   Template HTML murni: menerima data, mengembalikan string.
   Tidak menyentuh DOM atau state global, jadi mudah dibaca
   dan diubah tanpa takut merusak logika.

   Semua teks dari database WAJIB lewat esc()/escMultiline().
========================================================= */

import { CATEGORIES, INFO_FIELDS, SECTIONS } from "./schema.js";
import { esc, escMultiline } from "./utils.js";

export const entryHref = id => `#/e/${encodeURIComponent(id)}`;

// =========================================================
// KOMPONEN KECIL
// =========================================================

export function avatarHTML(entry) {
  if (entry.foto) {
    return `<img src="${esc(entry.foto)}" alt="${esc(entry.nama)}" loading="lazy"
              onerror="this.style.display='none'">`;
  }

  return esc(entry.avatar || "👤");
}

function adminButtons(entry, extraClass = "") {
  return `
    <button class="btn ${extraClass}" data-edit="${esc(entry.id)}">Edit</button>
    <button class="btn danger ${extraClass}" data-del="${esc(entry.id)}">Hapus</button>`;
}

function cardHTML(entry, isAdmin) {
  const subtitle = entry.gelar || entry.ras || "";

  return `
    <article class="card" data-open="${esc(entry.id)}" tabindex="0">
      <div class="avatar">${avatarHTML(entry)}</div>
      <div class="card-content">
        <h3>${esc(entry.nama)}</h3>
        <small>${esc(entry.kategori || "Lainnya")}${subtitle ? ` · ${esc(subtitle)}` : ""}</small>
        <p>${esc(entry.deskripsi || "Belum ada deskripsi.")}</p>
        ${isAdmin ? adminButtons(entry, "small-btn") : ""}
      </div>
    </article>`;
}

function cardGridHTML(list, isAdmin, emptyText) {
  return `
    <div class="card-grid">
      ${list.map(entry => cardHTML(entry, isAdmin)).join("") || `<p class="empty">${emptyText}</p>`}
    </div>`;
}

/** Tombol filter kategori; hanya kategori yang punya entri. */
function chipsHTML(counts, active, total) {
  if (!total) return "";

  const known = CATEGORIES.filter(name => counts.has(name));
  const others = [...counts.keys()].filter(name => !CATEGORIES.includes(name));

  const chip = (value, label, count) => `
    <button class="chip${active === value ? " active" : ""}" data-category="${esc(value)}"
            aria-pressed="${active === value}">
      ${esc(label)} <span>${count}</span>
    </button>`;

  return `
    <div class="chips" role="toolbar" aria-label="Filter kategori">
      ${chip("", "Semua", total)}
      ${[...known, ...others].map(name => chip(name, name, counts.get(name))).join("")}
    </div>`;
}

function statHTML(total, label) {
  return `
    <div class="intro-stat">
      <strong>${total}</strong>
      <span>${label}</span>
    </div>`;
}

// =========================================================
// SIDEBAR (dikelompokkan per kategori)
// =========================================================

export function sidebarHTML(list, currentId, loading) {
  if (!list.length) {
    return `<p class="empty">${loading ? "Memuat…" : "Belum ada entri."}</p>`;
  }

  const groups = new Map();

  for (const entry of list) {
    const key = entry.kategori || "Lainnya";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  const order = [
    ...CATEGORIES.filter(name => groups.has(name)),
    ...[...groups.keys()].filter(name => !CATEGORIES.includes(name))
  ];

  return order.map(name => `
    <p class="side-group">${esc(name)}</p>
    ${groups.get(name).map(entry => `
      <a class="side-link${entry.id === currentId ? " active" : ""}" href="${entryHref(entry.id)}">
        <span class="side-avatar">${avatarHTML(entry)}</span>
        ${esc(entry.nama)}
      </a>`).join("")}
  `).join("");
}

// =========================================================
// HALAMAN
// =========================================================

export function homeHTML({ list, total, counts, category, query, isAdmin, loading }) {
  const filtering = Boolean(query || category);

  let emptyText = "Tidak ada entri yang cocok.";
  if (loading) emptyText = "Memuat arsip…";
  else if (!total) emptyText = "Arsip masih kosong.";

  return `
    <section class="hero hero-illustrated">
      <div class="hero-copy">
        <p>ARSIP DUNIA VELMOR</p>
        <h1>The Velmoric Codex</h1>
        <p>Ensiklopedia karakter, makhluk, lokasi, artefak, dan sejarah dunia fantasi.</p>
        ${isAdmin ? `
          <div class="actions">
            <button class="btn primary" data-action="add">Tambah Entri</button>
            <button class="btn" data-action="settings">Pengaturan</button>
          </div>` : ""}
      </div>
      <div class="hero-art" role="img" aria-label="Ilustrasi fantasi dunia Velmor"></div>
    </section>

    <section class="codex-intro">
      <div>
        <span class="eyebrow">PENGETAHUAN YANG TERLUPAKAN</span>
        <h2>Catatan dari dunia lain</h2>
        <p>Jelajahi tokoh, kerajaan, makhluk, relik, dan peristiwa yang membentuk sejarah Velmor.</p>
      </div>
      ${statHTML(total, "ARSIP TERSIMPAN")}
    </section>

    <h2 class="archive-heading">
      ${filtering ? "Hasil Pencarian" : "Arsip Codex"}
      <small>${list.length} entri</small>
    </h2>

    ${chipsHTML(counts, category, total)}
    ${cardGridHTML(list, isAdmin, emptyText)}`;
}

export function articleHTML(entry, isAdmin) {
  const info = INFO_FIELDS.filter(field => entry[field.key]);
  const sections = SECTIONS.filter(field => entry[field.key]);

  return `
    <a class="btn" href="#/">← Kembali</a>

    <h1 class="page-title">${esc(entry.nama)}</h1>
    <p class="muted">${esc(entry.gelar || entry.kategori || "Arsip Codex")}</p>

    <div class="article-grid">
      <article>
        ${sections.length > 1 ? `
          <nav class="toc" aria-label="Daftar isi">
            <b>Daftar Isi</b>
            <ol>
              ${sections.map(field => `
                <li><a href="#${field.key}" data-scroll="${field.key}">${field.label}</a></li>`).join("")}
            </ol>
          </nav>` : ""}

        ${sections.map(field => `
          <section class="section" id="${field.key}">
            <h2>${field.label}</h2>
            <p>${escMultiline(entry[field.key])}</p>
          </section>`).join("") || `
          <section class="section"><p><i>Belum ada informasi.</i></p></section>`}
      </article>

      <aside class="infobox">
        <h2>${esc(entry.nama)}</h2>
        <div class="infobox-img">${avatarHTML(entry)}</div>
        <table>
          <tr><th>Kategori</th><td>${esc(entry.kategori || "Lainnya")}</td></tr>
          ${info.map(field => `
            <tr><th>${field.label}</th><td>${esc(entry[field.key])}</td></tr>`).join("")}
        </table>
        ${isAdmin ? adminButtons(entry) : ""}
      </aside>
    </div>`;
}

export function notFoundHTML(loading) {
  return loading
    ? `<p class="empty">Memuat entri…</p>`
    : `
      <a class="btn" href="#/">← Kembali</a>
      <h1 class="page-title">Entri tidak ditemukan</h1>
      <p class="muted">Entri ini mungkin sudah dihapus atau tautannya salah.</p>`;
}

export function adminHTML({ list, total, counts, category }) {
  return `
    <section class="hero">
      <p class="eyebrow">ADMINISTRATION</p>
      <h1>Codex Control Center</h1>
      <p>Kelola seluruh arsip dan konfigurasi The Velmoric Codex.</p>
      <div class="actions">
        <button class="btn primary" data-action="add">+ Tambah Entri</button>
        <button class="btn" data-action="settings">Pengaturan Website</button>
        <button class="btn" data-action="export">Ekspor Database</button>
        <button class="btn" data-action="import">Impor Database</button>
      </div>
    </section>

    <section class="codex-intro">
      <div>
        <h2>Ringkasan Database</h2>
        <p>Status administrator terverifikasi.</p>
      </div>
      ${statHTML(total, "TOTAL ENTRI")}
    </section>

    <h2 class="archive-heading">
      Manajemen Arsip
      <small>${list.length} entri</small>
    </h2>

    ${chipsHTML(counts, category, total)}
    ${cardGridHTML(list, true, total ? "Tidak ada entri yang cocok." : "Belum ada arsip. Tambahkan entri pertama.")}`;
}

// =========================================================
// FORM ENTRI (dibuat dari schema)
// =========================================================

export function formFieldsHTML() {
  const input = ({ key, label }) => `
    <div class="field">
      <label for="f-${key}">${label}</label>
      <input id="f-${key}" name="${key}" maxlength="200">
    </div>`;

  const textarea = ({ key, label }) => `
    <div class="field full">
      <label for="f-${key}">${label}</label>
      <textarea id="f-${key}" name="${key}" maxlength="20000"></textarea>
    </div>`;

  return `
    <div class="field full">
      <label for="f-nama">Nama</label>
      <input id="f-nama" name="nama" required maxlength="200">
    </div>

    <div class="field">
      <label for="f-kategori">Kategori</label>
      <select id="f-kategori" name="kategori">
        ${CATEGORIES.map(name => `<option>${esc(name)}</option>`).join("")}
      </select>
    </div>

    ${INFO_FIELDS.map(input).join("")}

    <div class="field full">
      <label for="fotoUrlInput">URL Gambar</label>
      <input id="fotoUrlInput" name="foto" type="url" placeholder="https://...">
      <img id="fotoPreview" hidden alt="Pratinjau gambar">
    </div>

    ${SECTIONS.map(textarea).join("")}`;
}
