/* =========================================================
   views/home.js — beranda & halaman jelajah (pencarian lanjut).
========================================================= */

import { THREAT_LEVELS } from "../schema.js";
import { esc } from "../utils.js";
import {
  avatarHTML, cardGridHTML, chipsHTML, entryHref, icon, miniCard, ornament, snippet
} from "./common.js";

function loreHTML(lore) {
  if (!lore) return "";

  return `
    <section class="lore-of-day">
      <div class="lore-art">${avatarHTML(lore)}</div>
      <div>
        <p class="eyebrow">LORE HARI INI</p>
        <h2><a href="${entryHref(lore.id)}">${esc(lore.nama)}</a></h2>
        <p class="lore-quote">“${esc(snippet(lore.deskripsi || lore.latar, 260) || "Catatan tentang entri ini masih tersegel.")}”</p>
        <a class="btn" href="${entryHref(lore.id)}">Baca selengkapnya →</a>
      </div>
    </section>`;
}

function portalsHTML(counts) {
  const portals = [
    { href: "#/bestiari", glyph: "☠", title: "Bestiari", text: "Makhluk & monster", count: counts.get("Makhluk") || 0 },
    { href: "#/peta", glyph: "⌖", title: "Peta Dunia", text: "Kerajaan, kota, dungeon", count: (counts.get("Lokasi") || 0) + (counts.get("Kerajaan") || 0) },
    { href: "#/linimasa", glyph: "⌛", title: "Linimasa", text: "Sejarah per era", count: counts.get("Peristiwa") || 0 },
    { href: "#/jelajah?k=Sihir", glyph: "✦", title: "Sihir & Kemampuan", text: "Sistem sihir & skill", count: counts.get("Sihir") || 0 },
    { href: "#/jelajah?k=Artefak", glyph: "⚔", title: "Artefak", text: "Senjata & relik legendaris", count: counts.get("Artefak") || 0 },
    { href: "#/acak", glyph: "✧", title: "Penemuan Acak", text: "Buka halaman tak terduga", count: "" }
  ];

  return `
    <section class="portals" aria-label="Jelajahi arsip">
      ${portals.map(portal => `
        <a class="portal" href="${portal.href}">
          <span class="portal-glyph" aria-hidden="true">${portal.glyph}</span>
          <b>${portal.title}</b>
          <small>${portal.text}</small>
          ${portal.count !== "" ? `<em>${portal.count} catatan</em>` : ""}
        </a>`).join("")}
    </section>`;
}

function shelfHTML(title, list, href = "") {
  if (!list.length) return "";

  return `
    <section class="shelf">
      <h2 class="archive-heading">${title}${href ? ` <a class="small-link" href="${href}">lihat semua</a>` : ""}</h2>
      <div class="mini-grid">${list.map(entry => miniCard(entry)).join("")}</div>
    </section>`;
}

export function homeHTML(view) {
  const { total, counts, isAdmin, lore, recent, latest, categories, category, list, bookmarks, limit, loading } = view;

  let emptyText = "Tidak ada entri dalam kategori ini.";
  if (loading) emptyText = "Membuka gulungan arsip…";
  else if (!total) emptyText = "Arsip masih kosong.";

  return `
    <section class="hero hero-illustrated">
      <div class="hero-copy">
        <p>ARSIP DUNIA VELMOR</p>
        <h1>The Velmoric Codex</h1>
        <p>Setiap dunia punya ingatan. Di sinilah ingatan Velmor disimpan — tokoh, kerajaan, makhluk, relik, dan peristiwa yang membentuk sejarahnya.</p>
        <div class="actions">
          <a class="btn primary" href="#/jelajah">Buka Arsip</a>
          <a class="btn" href="#/acak">✧ Entri Acak</a>
          ${isAdmin ? `<button class="btn" data-action="add">+ Tambah Entri</button>` : ""}
        </div>
      </div>
      <div class="hero-art" role="img" aria-label="Ilustrasi fantasi dunia Velmor"></div>
    </section>

    <section class="codex-intro">
      <div>
        <span class="eyebrow">PENGETAHUAN YANG TERLUPAKAN</span>
        <h2>Catatan dari dunia lain</h2>
        <p>Jelajahi lewat portal di bawah, atau cari langsung lewat kotak pencarian di atas.</p>
      </div>
      <div class="intro-stat">
        <strong>${total}</strong>
        <span>ARSIP TERSIMPAN</span>
      </div>
    </section>

    ${portalsHTML(counts)}
    ${lore ? ornament() + loreHTML(lore) : ""}
    ${shelfHTML("Terakhir Kamu Baca", recent, "#/tersimpan")}
    ${shelfHTML("Baru Ditambahkan", latest)}

    ${ornament()}
    <h2 class="archive-heading">Arsip Codex <small>${list.length} entri</small></h2>
    ${chipsHTML(counts, category, total, categories)}
    ${cardGridHTML(list, { isAdmin, bookmarks, emptyText, limit })}`;
}

// =========================================================
// JELAJAH: pencarian + filter atribut
// =========================================================

function selectHTML(name, label, values, current) {
  if (!values.length) return "";

  return `
    <label class="filter">
      <span>${label}</span>
      <select data-filter="${name}">
        <option value="">Semua</option>
        ${values.map(value => `<option value="${esc(value)}"${value === current ? " selected" : ""}>${esc(value)}</option>`).join("")}
      </select>
    </label>`;
}

export function exploreHTML(view) {
  const { list, total, counts, filters, options, categories, isAdmin, bookmarks, limit, loading } = view;
  const active = Object.entries(filters).filter(([key, value]) => value && key !== "sort");

  return `
    <header class="page-header">
      <p class="eyebrow">RUANG ARSIP</p>
      <h1 class="page-title">${filters.q ? `Hasil untuk “${esc(filters.q)}”` : "Jelajahi Arsip"}</h1>
      <p class="muted">${list.length} dari ${total} catatan${active.length ? " cocok dengan filter" : ""}.</p>
    </header>

    ${chipsHTML(counts, filters.k, total, categories)}

    <details class="filters" ${active.some(([key]) => key !== "q" && key !== "k") ? "open" : ""}>
      <summary>Filter lanjutan</summary>
      <div class="filter-grid">
        ${selectHTML("ras", "Ras", options.ras, filters.ras)}
        ${selectHTML("status", "Status", options.status, filters.status)}
        ${selectHTML("era", "Era", options.era, filters.era)}
        ${selectHTML("tag", "Tag", options.tags, filters.tag)}
        <label class="filter">
          <span>Ancaman</span>
          <select data-filter="threat">
            <option value="">Semua</option>
            ${THREAT_LEVELS.map(level => `<option value="${level.value}"${level.value === filters.threat ? " selected" : ""}>${level.label}</option>`).join("")}
          </select>
        </label>
        <label class="filter">
          <span>Urutkan</span>
          <select data-filter="sort">
            <option value="">Nama (A–Z)</option>
            <option value="baru"${filters.sort === "baru" ? " selected" : ""}>Terbaru diperbarui</option>
            <option value="tahun"${filters.sort === "tahun" ? " selected" : ""}>Tahun (tertua)</option>
          </select>
        </label>
      </div>
      ${active.length ? `<button class="btn small-btn" data-action="reset-filters">Hapus semua filter</button>` : ""}
    </details>

    ${cardGridHTML(list, {
      isAdmin,
      bookmarks,
      limit,
      emptyText: loading ? "Membuka gulungan arsip…" : "Tidak ada catatan yang cocok. Coba kata kunci lain."
    })}`;
}

export { icon };
