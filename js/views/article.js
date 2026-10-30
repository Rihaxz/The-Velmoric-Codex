/* =========================================================
   views/article.js — halaman artikel entri.
========================================================= */

import { INFO_FIELDS, SECTIONS, THREAT_LEVELS, parseYear } from "../schema.js";
import { renderMarkup } from "../markup.js";
import { imageTag } from "../media.js";
import { esc } from "../utils.js";
import {
  avatarHTML, draftBadge, entryHref, formatYear, icon, miniCard, ornament, threatBadge
} from "./common.js";

function infoValue(field, entry) {
  if (field.type === "threat") return threatBadge(entry[field.key]);
  if (field.key === "tahun") {
    const year = parseYear(entry.tahun);
    return year === null ? esc(entry.tahun) : esc(formatYear(year, ""));
  }
  return esc(entry[field.key]);
}

function treeRow(label, list, current) {
  if (!list.length) return "";

  return `
    <div class="tree-row">
      <span class="tree-label">${label}</span>
      <div class="tree-nodes">
        ${list.map(entry => entry.id === current
          ? `<span class="tree-node self">${avatarHTML(entry)}<b>${esc(entry.nama)}</b></span>`
          : `<a class="tree-node" href="${entryHref(entry.id)}">${avatarHTML(entry)}<b>${esc(entry.nama)}</b></a>`
        ).join("")}
      </div>
    </div>`;
}

function familyHTML(tree) {
  if (!tree) return "";

  return `
    <section class="section family" id="silsilah">
      <h2>Silsilah</h2>
      <div class="tree">
        ${treeRow("Kakek & Nenek", tree.grandparents)}
        ${treeRow("Orang Tua", tree.parents)}
        ${treeRow("Generasi ini", [...tree.siblings, tree.self, ...tree.spouses], tree.self.id)}
        ${treeRow("Anak", tree.children)}
        ${treeRow("Cucu", tree.grandchildren)}
      </div>
      ${tree.spouses.length ? `<p class="muted tree-note">Pasangan: ${tree.spouses.map(s => esc(s.nama)).join(", ")}</p>` : ""}
    </section>`;
}

function relationsHTML(groups) {
  if (!groups.length) return "";

  return `
    <section class="section" id="hubungan">
      <h2>Hubungan</h2>
      ${groups.map(group => `
        <div class="rel-group">
          <h3>${esc(group.label)}</h3>
          <div class="mini-grid">${group.entries.map(entry => miniCard(entry)).join("")}</div>
        </div>`).join("")}
    </section>`;
}

function galleryHTML(entry) {
  const items = entry.galeri || [];
  if (!items.length) return "";

  return `
    <section class="section" id="galeri">
      <h2>Galeri</h2>
      <div class="gallery">
        ${items.map((item, index) => `
          <figure>
            <button class="gallery-item" data-lightbox="${index}" aria-label="Perbesar gambar ${index + 1}">
              ${imageTag(item.src, item.caption || entry.nama)}
            </button>
            ${item.caption ? `<figcaption>${esc(item.caption)}</figcaption>` : ""}
          </figure>`).join("")}
      </div>
    </section>`;
}

export function articleHTML(entry, ctx) {
  const { isAdmin, bookmarked, reading, resolve, relations, tree, backlinks } = ctx;

  const info = INFO_FIELDS.filter(field => entry[field.key]);
  const sections = SECTIONS.filter(field => entry[field.key]);

  const toc = [
    ...sections.map(field => [field.key, field.label]),
    ...(tree ? [["silsilah", "Silsilah"]] : []),
    ...(relations.length ? [["hubungan", "Hubungan"]] : []),
    ...(entry.galeri?.length ? [["galeri", "Galeri"]] : [])
  ];

  return `
    <nav class="breadcrumb" aria-label="Lokasi halaman">
      <a href="#/">Beranda</a> ›
      <a href="#/jelajah?k=${encodeURIComponent(entry.kategori || "Lainnya")}">${icon(entry.kategori)} ${esc(entry.kategori || "Lainnya")}</a> ›
      <span>${esc(entry.nama)}</span>
    </nav>

    <header class="article-header">
      <div>
        <h1 class="page-title">${esc(entry.nama)} ${draftBadge(entry)}</h1>
        <p class="muted">${esc([entry.julukan && `“${entry.julukan}”`, entry.gelar].filter(Boolean).join(" · ") || entry.kategori || "Arsip Codex")}</p>
      </div>
      <div class="article-tools">
        <button class="btn${bookmarked ? " active" : ""}" data-action="bookmark" aria-pressed="${bookmarked}">${bookmarked ? "★ Ditandai" : "☆ Tandai"}</button>
        <button class="btn" data-action="share">Bagikan</button>
        <button class="btn${reading ? " active" : ""}" data-action="reading" aria-pressed="${reading}">${reading ? "Keluar Mode Baca" : "Mode Baca"}</button>
        ${entry.peta ? `<a class="btn" href="#/peta?fokus=${encodeURIComponent(entry.id)}">⌖ Lihat di Peta</a>` : ""}
      </div>
    </header>

    ${entry.tags?.length ? `
      <div class="tags">${entry.tags.map(tag => `<a class="tag" href="#/jelajah?tag=${encodeURIComponent(tag)}">#${esc(tag)}</a>`).join("")}</div>` : ""}

    <div class="article-grid">
      <article class="article-body">
        ${toc.length > 1 ? `
          <nav class="toc" aria-label="Daftar isi">
            <b>Daftar Isi</b>
            <ol>${toc.map(([key, label]) => `<li><a href="#${key}" data-scroll="${key}">${label}</a></li>`).join("")}</ol>
          </nav>` : ""}

        ${sections.map((field, index) => `
          <section class="section${index === 0 ? " first" : ""}" id="${field.key}">
            <h2>${field.label}</h2>
            <div class="prose">${renderMarkup(entry[field.key], resolve)}</div>
          </section>`).join("") || `<section class="section"><p><i>Catatan tentang entri ini masih tersegel.</i></p></section>`}

        ${familyHTML(tree)}
        ${relationsHTML(relations)}
        ${galleryHTML(entry)}

        ${backlinks.length ? `
          ${ornament()}
          <section class="backlinks">
            <h3>Disebut dalam</h3>
            <div class="mini-grid">${backlinks.map(other => miniCard(other)).join("")}</div>
          </section>` : ""}
      </article>

      <aside class="infobox">
        <h2>${esc(entry.nama)}</h2>
        <div class="infobox-img">${avatarHTML(entry)}</div>
        <table>
          <tr><th>Kategori</th><td>${icon(entry.kategori)} ${esc(entry.kategori || "Lainnya")}</td></tr>
          ${info.map(field => `<tr><th>${field.label}</th><td>${infoValue(field, entry)}</td></tr>`).join("")}
        </table>
        ${isAdmin ? `
          <div class="infobox-actions">
            <button class="btn" data-edit="${esc(entry.id)}">Edit</button>
            <button class="btn" data-action="history" data-id="${esc(entry.id)}">Riwayat</button>
            <button class="btn danger" data-del="${esc(entry.id)}">Hapus</button>
          </div>` : ""}
      </aside>
    </div>`;
}

export function notFoundHTML(loading) {
  return loading
    ? `<p class="empty">Membuka gulungan arsip…</p>`
    : `
      <a class="btn" href="#/">← Kembali</a>
      <h1 class="page-title">Entri tidak ditemukan</h1>
      <p class="muted">Catatan ini mungkin sudah dihapus, atau tautannya salah.</p>`;
}

export { THREAT_LEVELS };
