/* =========================================================
   views/form.js — markup form entri (tambah/edit/usulan).
   Anonim melihat versi terbatas: tanpa unggah file, dan
   tombol kirim menjadi "Kirim Usulan".
========================================================= */

import { INFO_FIELDS, RELATION_TYPES, SECTIONS, THREAT_LEVELS } from "../schema.js";
import { esc } from "../utils.js";

// Label teks biasa (tanpa simbol) agar tombol tampil konsisten.
const TOOLBAR = [
  ["bold", "B", "Tebal"],
  ["italic", "I", "Miring"],
  ["heading", "Judul", "Subjudul"],
  ["quote", "Kutip", "Kutipan"],
  ["list", "Daftar", "Daftar"],
  ["link", "Tautan", "Tautan ke entri lain"],
  ["spoiler", "Spoiler", "Spoiler"]
];

function catsAttr(field) {
  return field.cats ? ` data-cats="${esc(field.cats.join("|"))}"` : "";
}

export function formFieldsHTML(categories, { isStaff = true } = {}) {
  const input = field => {
    if (field.type === "threat") {
      return `
        <div class="field"${catsAttr(field)}>
          <label for="f-${field.key}">${field.label}</label>
          <select id="f-${field.key}" name="${field.key}">
            <option value="">—</option>
            ${THREAT_LEVELS.map(level => `<option value="${level.value}">${level.value} · ${level.label}</option>`).join("")}
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
        ${isStaff ? `<label class="btn">Unggah<input type="file" accept="image/*" data-upload="foto" hidden></label>` : ""}
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
      <button type="button" class="btn small-btn" data-action="add-relation">Tambah hubungan</button>
      <small class="muted">Cukup dicatat di satu sisi; entri lawan otomatis menampilkan hubungan baliknya.</small>
    </div>

    <div class="field full">
      <label>Galeri</label>
      <div id="galleryRows" class="gallery-rows"></div>
      <div class="image-input">
        <input id="galleryUrl" placeholder="Tempel URL gambar lalu tekan Tambah">
        <button type="button" class="btn" data-action="add-gallery-url">Tambah</button>
        ${isStaff ? `<label class="btn">Unggah<input type="file" accept="image/*" multiple data-upload="galeri" hidden></label>` : ""}
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
      <button type="button" class="btn small-btn danger" data-action="remove-row" aria-label="Hapus baris">Hapus</button>
    </div>`;
}

export function galleryRowHTML(item, preview) {
  return `
    <div class="gallery-row" data-src="${esc(item.src)}">
      ${preview}
      <input data-caption value="${esc(item.caption || "")}" placeholder="Keterangan (opsional)" maxlength="200">
      <button type="button" class="btn small-btn danger" data-action="remove-row" aria-label="Hapus gambar">Hapus</button>
    </div>`;
}
