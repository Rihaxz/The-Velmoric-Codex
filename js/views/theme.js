/* =========================================================
   views/theme.js — Studio Tema (khusus OWNER di panel owner).
   Hanya membuat HTML; logikanya ada di js/theme.js.
========================================================= */

import { esc } from "../utils.js";
import { svg } from "../icons.js";
import { COLOR_FIELDS, MAX_THEMES, contrastIssues } from "../theme-core.js";

const MODE_LABEL = { gelap: "Gelap", terang: "Terang" };

function swatches(warna) {
  return COLOR_FIELDS.map(({ key, label }) =>
    `<i class="theme-dot" style="background:${esc(warna[key])}" title="${esc(label)}"></i>`).join("");
}

/** Pilihan tema yang dipakai di tiap mode. */
function slotsHTML(config) {
  const slot = mode => {
    const options = config.daftar.filter(theme => theme.dasar === mode);

    return `
      <label>Mode ${MODE_LABEL[mode]}
        <select data-theme-slot="${mode}">
          <option value="">Velmoric ${MODE_LABEL[mode]} (bawaan)</option>
          ${options.map(theme => `<option value="${esc(theme.id)}"${config[mode] === theme.id ? " selected" : ""}>${esc(theme.nama)}</option>`).join("")}
        </select>
      </label>`;
  };

  return `
    <div class="form-row theme-slots">
      ${slot("gelap")}
      ${slot("terang")}
    </div>
    <p class="muted theme-note">Pembaca hanya melihat dua mode ini dan bisa berpindah lewat tombol bulan/matahari di bar atas. Tema yang kamu pilih di sini langsung berlaku untuk semua pembaca.</p>`;
}

function listHTML(config) {
  if (!config.daftar.length) return `<p class="muted">Belum ada tema kustom. Buat satu untuk mulai.</p>`;

  return `
    <ul class="theme-list">
      ${config.daftar.map(theme => `
        <li class="theme-item">
          <span class="theme-dots" aria-hidden="true">${swatches(theme.warna)}</span>
          <span class="theme-meta">
            <b>${esc(theme.nama)}</b>
            <small class="muted">Untuk mode ${MODE_LABEL[theme.dasar]}${config[theme.dasar] === theme.id ? " · sedang dipakai" : ""}</small>
          </span>
          <span class="theme-actions">
            <button class="btn small-btn" type="button" data-action="theme-edit" data-id="${esc(theme.id)}">${svg("edit", "ico-sm")}<span>Ubah</span></button>
            <button class="btn danger small-btn" type="button" data-action="theme-delete" data-id="${esc(theme.id)}">${svg("trash", "ico-sm")}<span>Hapus</span></button>
          </span>
        </li>`).join("")}
    </ul>`;
}

export function contrastNote(draft) {
  const issues = contrastIssues(draft.warna, draft.dasar);
  return issues.length
    ? `Perhatian: ${issues.join("; ")}.`
    : "Kontras warna aman dan nyaman dibaca.";
}

function editorHTML(draft) {
  return `
    <form class="theme-editor stack-form" data-form="theme">
      <h3 class="sub-heading">${draft.isNew ? "Tema Baru" : `Ubah Tema: ${esc(draft.nama)}`}</h3>

      <div class="form-row">
        <label>Nama tema
          <input data-theme-name maxlength="40" value="${esc(draft.nama)}" required>
        </label>
        <label>Untuk mode
          <select data-theme-dasar>
            <option value="gelap"${draft.dasar === "gelap" ? " selected" : ""}>Gelap</option>
            <option value="terang"${draft.dasar === "terang" ? " selected" : ""}>Terang</option>
          </select>
        </label>
      </div>

      <div class="theme-colors">
        ${COLOR_FIELDS.map(({ key, label }) => `
          <label class="theme-color">
            <span>${esc(label)}</span>
            <input type="color" data-theme-color="${key}" value="${esc(draft.warna[key])}">
            <code data-theme-hex="${key}">${esc(draft.warna[key])}</code>
          </label>`).join("")}
      </div>

      <p class="muted theme-note" data-theme-contrast role="status">${esc(contrastNote(draft))}</p>
      <p class="muted theme-note">Pratinjau langsung terlihat di layarmu saja. Tema baru dilihat pembaca setelah disimpan dan dipilih di “Pemakaian tema”.</p>

      <div class="form-actions">
        <span class="theme-actions">
          <button class="btn" type="button" data-action="theme-cancel">Batal</button>
          <button class="btn" type="button" data-action="theme-reset-colors">Reset warna</button>
        </span>
        <button class="btn primary" type="submit">Simpan tema</button>
      </div>
    </form>`;
}

/** Isi panel “Studio Tema”. `draft` = tema yang sedang diedit (atau null). */
export function themeStudioHTML(settings, draft) {
  const config = settings?.temaKustom || { daftar: [], gelap: "", terang: "" };
  const full = config.daftar.length >= MAX_THEMES;

  return `
    <p class="muted">Buat tema warna sendiri untuk mode gelap atau terang. Hanya owner yang bisa membuat dan mengubahnya.</p>

    <h3 class="sub-heading">Pemakaian Tema</h3>
    ${slotsHTML(config)}

    <h3 class="sub-heading">Tema Kustom <small class="muted">${config.daftar.length}/${MAX_THEMES}</small></h3>
    ${listHTML(config)}

    ${draft ? editorHTML(draft) : `
      <div class="actions">
        <button class="btn primary" type="button" data-action="theme-new"${full ? " disabled" : ""}>${svg("plus", "ico-sm")}<span>Buat Tema Baru</span></button>
      </div>`}`;
}
