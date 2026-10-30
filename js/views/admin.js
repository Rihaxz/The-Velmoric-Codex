/* =========================================================
   views/admin.js — dasbor admin, riwayat revisi, form entri.
========================================================= */

import { BASE_CATEGORIES, INFO_FIELDS, RELATION_TYPES, SECTIONS, THREAT_LEVELS } from "../schema.js";
import { esc } from "../utils.js";
import { cardGridHTML, chipsHTML, entryHref, formatDate, icon, miniCard } from "./common.js";

const ACTION_LABELS = {
  buat: "membuat",
  "buat-draf": "membuat draf",
  ubah: "mengubah",
  hapus: "menghapus",
  terbitkan: "menerbitkan",
  "tarik-ke-draf": "menarik ke draf",
  pulihkan: "memulihkan"
};

function statBars(counts, categories) {
  const rows = [...categories, ...[...counts.keys()].filter(name => !categories.includes(name))]
    .filter(name => counts.get(name));
  const max = Math.max(1, ...rows.map(name => counts.get(name)));

  if (!rows.length) return `<p class="muted">Belum ada data.</p>`;

  return `
    <div class="bars">
      ${rows.map(name => `
        <div class="bar-row">
          <span>${icon(name)} ${esc(name)}</span>
          <div class="bar"><i style="width:${(counts.get(name) / max) * 100}%"></i></div>
          <b>${counts.get(name)}</b>
        </div>`).join("")}
    </div>`;
}

function activityHTML(activity) {
  if (activity === null) return `<p class="muted">Memuat log…</p>`;
  if (activity instanceof Error) return `<p class="error">Log tidak bisa dimuat: ${esc(activity.message)}</p>`;
  if (!activity.length) return `<p class="muted">Belum ada aktivitas.</p>`;

  return `
    <ol class="activity">
      ${activity.map(item => `
        <li>
          <time>${esc(formatDate(item.waktu))}</time>
          <span><b>${esc(item.email || "admin")}</b> ${esc(ACTION_LABELS[item.aksi] || item.aksi)}
          ${item.entriId ? `<a href="${entryHref(item.entriId)}">${esc(item.nama)}</a>` : esc(item.nama || "")}</span>
        </li>`).join("")}
    </ol>`;
}

export function adminHTML(view) {
  const { list, total, published, drafts, counts, category, categories, extraCategories, needsWork, activity, bookmarks, limit } = view;

  return `
    <section class="hero">
      <p class="eyebrow">ADMINISTRATION</p>
      <h1>Codex Control Center</h1>
      <p>Kelola seluruh arsip dan konfigurasi The Velmoric Codex.</p>
      <div class="actions">
        <button class="btn primary" data-action="add">+ Tambah Entri</button>
        <button class="btn" data-action="settings">Pengaturan Website</button>
        <button class="btn" data-action="export">Ekspor / Backup</button>
        <button class="btn" data-action="import">Impor / Restore</button>
      </div>
    </section>

    <section class="stats">
      <div class="stat"><strong>${published}</strong><span>Terbit</span></div>
      <div class="stat"><strong>${drafts.length}</strong><span>Draf</span></div>
      <div class="stat"><strong>${counts.get("Karakter") || 0}</strong><span>Karakter</span></div>
      <div class="stat"><strong>${counts.get("Kerajaan") || 0}</strong><span>Kerajaan</span></div>
      <div class="stat"><strong>${counts.get("Makhluk") || 0}</strong><span>Makhluk</span></div>
      <div class="stat"><strong>${needsWork.length}</strong><span>Perlu dilengkapi</span></div>
    </section>

    <div class="admin-grid">
      <section class="panel">
        <h2>Komposisi Arsip</h2>
        ${statBars(counts, categories)}
      </section>

      <section class="panel">
        <h2>Aktivitas Terbaru <button class="btn small-btn" data-action="reload-log">Muat ulang</button></h2>
        ${activityHTML(activity)}
      </section>

      <section class="panel">
        <h2>Draf <small class="muted">${drafts.length}</small></h2>
        ${drafts.length
          ? `<div class="mini-grid">${drafts.map(entry => miniCard(entry, "Belum terbit")).join("")}</div>`
          : `<p class="muted">Tidak ada draf. Gunakan tombol <b>Simpan Draf</b> di form.</p>`}
      </section>

      <section class="panel">
        <h2>Perlu Dilengkapi <small class="muted">${needsWork.length}</small></h2>
        ${needsWork.length
          ? `<div class="mini-grid">${needsWork.slice(0, 12).map(({ entry, missing }) => miniCard(entry, `Belum ada: ${missing.join(", ")}`)).join("")}</div>`
          : `<p class="muted">Semua entri sudah punya gambar dan deskripsi.</p>`}
      </section>

      <section class="panel">
        <h2>Kategori</h2>
        <p class="muted">Kategori bawaan: ${BASE_CATEGORIES.map(esc).join(", ")}.</p>
        <div class="tags">
          ${extraCategories.map(name => `
            <span class="tag">${esc(name)} <button class="tag-x" data-remove-category="${esc(name)}" aria-label="Hapus kategori ${esc(name)}">×</button></span>`).join("") || `<span class="muted">Belum ada kategori tambahan.</span>`}
        </div>
        <form class="inline-form" data-form="category">
          <input name="kategori" maxlength="40" placeholder="Nama kategori baru" required>
          <button class="btn" type="submit">Tambah</button>
        </form>
      </section>
    </div>

    <h2 class="archive-heading">Manajemen Arsip <small>${list.length} entri</small></h2>
    ${chipsHTML(counts, category, total, categories)}
    ${cardGridHTML(list, {
      isAdmin: true,
      bookmarks,
      limit,
      emptyText: total ? "Tidak ada entri yang cocok." : "Belum ada arsip. Tambahkan entri pertama."
    })}`;
}

// =========================================================
// RIWAYAT REVISI
// =========================================================

export function historyHTML(entry, revisions) {
  if (revisions === null) return `<p class="muted">Memuat riwayat…</p>`;
  if (revisions instanceof Error) return `<p class="error">Riwayat tidak bisa dimuat: ${esc(revisions.message)}</p>`;
  if (!revisions.length) return `<p class="muted">Belum ada revisi tersimpan untuk “${esc(entry?.nama || "")}”.</p>`;

  return `
    <ol class="revisions">
      ${revisions.map(rev => `
        <li>
          <div>
            <b>${esc(formatDate(rev.waktu))}</b>
            <small>${esc(rev.alasan === "hapus" ? "sebelum dihapus" : "sebelum diubah")} · ${esc(rev.email || "admin")}</small>
            <p class="muted">${esc(rev.data?.nama || "")} — ${esc(String(rev.data?.deskripsi || "").slice(0, 120))}</p>
          </div>
          <button class="btn small-btn" data-restore="${esc(rev.id)}">Pulihkan versi ini</button>
        </li>`).join("")}
    </ol>`;
}

// =========================================================
// FORM ENTRI (dibuat dari schema)
// =========================================================

const TOOLBAR = [
  ["bold", "B", "Tebal"],
  ["italic", "I", "Miring"],
  ["heading", "H", "Subjudul"],
  ["quote", "❝", "Kutipan"],
  ["list", "•", "Daftar"],
  ["link", "[[ ]]", "Tautan ke entri lain"],
  ["spoiler", "▒", "Spoiler"]
];

function catsAttr(field) {
  return field.cats ? ` data-cats="${esc(field.cats.join("|"))}"` : "";
}

export function formFieldsHTML(categories) {
  const input = field => {
    if (field.type === "threat") {
      return `
        <div class="field"${catsAttr(field)}>
          <label for="f-${field.key}">${field.label}</label>
          <select id="f-${field.key}" name="${field.key}">
            <option value="">—</option>
            ${THREAT_LEVELS.map(level => `<option value="${level.value}">${"☠".repeat(Number(level.value))} ${level.label}</option>`).join("")}
          </select>
        </div>`;
    }

    return `
      <div class="field"${catsAttr(field)}>
        <label for="f-${field.key}">${field.label}</label>
        <input id="f-${field.key}" name="${field.key}" maxlength="200"
               ${field.key === "era" ? 'list="eraOptions"' : ""}
               ${field.key === "tahun" ? 'inputmode="numeric" pattern="-?[0-9]{1,7}"' : ""}
               ${field.hint ? `placeholder="${esc(field.hint)}"` : ""}>
      </div>`;
  };

  const textarea = field => `
    <div class="field full"${catsAttr(field)}>
      <label for="f-${field.key}">${field.label}</label>
      <div class="md-toolbar" role="toolbar" aria-label="Format ${field.label}">
        ${TOOLBAR.map(([cmd, text, title]) => `<button type="button" data-md="${cmd}" data-target="f-${field.key}" title="${title}">${text}</button>`).join("")}
      </div>
      <textarea id="f-${field.key}" name="${field.key}" maxlength="20000"></textarea>
    </div>`;

  return `
    <div class="field full">
      <label for="f-nama">Nama</label>
      <input id="f-nama" name="nama" required maxlength="200">
    </div>

    <div class="field">
      <label for="f-kategori">Kategori</label>
      <select id="f-kategori" name="kategori">
        ${categories.map(name => `<option>${esc(name)}</option>`).join("")}
      </select>
    </div>

    <div class="field">
      <label for="f-tags">Tag <small class="muted">(pisahkan dengan koma)</small></label>
      <input id="f-tags" name="tags" maxlength="600" placeholder="Era Kedua, Legendaris">
    </div>

    ${INFO_FIELDS.map(input).join("")}

    <div class="field full">
      <label for="fotoUrlInput">Gambar Utama</label>
      <div class="image-input">
        <input id="fotoUrlInput" name="foto" placeholder="https://... atau unggah">
        <label class="btn">Unggah<input type="file" accept="image/*" data-upload="foto" hidden></label>
      </div>
      <img id="fotoPreview" hidden alt="Pratinjau gambar">
    </div>

    <p class="field full form-help">
      Format teks: <code>**tebal**</code> <code>*miring*</code> <code>## Subjudul</code>
      <code>&gt; kutipan</code> <code>- daftar</code> <code>||spoiler||</code>
      <code>[[Nama Entri]]</code> untuk menautkan entri lain.
    </p>

    ${SECTIONS.map(textarea).join("")}

    <div class="field full">
      <label>Hubungan</label>
      <div id="relationRows" class="rel-rows"></div>
      <button type="button" class="btn small-btn" data-action="add-relation">+ Tambah hubungan</button>
      <small class="muted">Cukup dicatat di satu sisi; entri lawan otomatis menampilkan hubungan baliknya.</small>
    </div>

    <div class="field full">
      <label>Galeri</label>
      <div id="galleryRows" class="gallery-rows"></div>
      <div class="image-input">
        <input id="galleryUrl" placeholder="Tempel URL gambar lalu tekan Tambah">
        <button type="button" class="btn" data-action="add-gallery-url">Tambah</button>
        <label class="btn">Unggah<input type="file" accept="image/*" multiple data-upload="galeri" hidden></label>
      </div>
    </div>`;
}

export function relationRowHTML(rel = {}, nameOf = () => "") {
  return `
    <div class="rel-row">
      <select data-rel-type aria-label="Jenis hubungan">
        ${Object.entries(RELATION_TYPES).map(([key, type]) => `<option value="${key}"${key === rel.tipe ? " selected" : ""}>${type.label}</option>`).join("")}
      </select>
      <input data-rel-name list="entryOptions" placeholder="Nama entri" value="${esc(nameOf(rel.id))}" aria-label="Nama entri">
      <button type="button" class="btn small-btn danger" data-action="remove-row" aria-label="Hapus baris">×</button>
    </div>`;
}

export function galleryRowHTML(item, preview) {
  return `
    <div class="gallery-row" data-src="${esc(item.src)}">
      ${preview}
      <input data-caption value="${esc(item.caption || "")}" placeholder="Keterangan (opsional)" maxlength="200">
      <button type="button" class="btn small-btn danger" data-action="remove-row" aria-label="Hapus gambar">×</button>
    </div>`;
}
