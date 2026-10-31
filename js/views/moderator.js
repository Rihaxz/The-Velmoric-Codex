/* =========================================================
   views/moderator.js — bagian panel MODERATOR.
   Dipakai juga oleh panel OWNER (owner = moderator + owner).
   Fitur: usulan anonim, moderasi komentar, draf, perlu
   dilengkapi, dan aktivitas.
========================================================= */

import { BASE_CATEGORIES } from "../schema.js";
import { esc, escMultiline } from "../utils.js";
import { formatDate, icon, entryHref, miniCard, snippet } from "./common.js";
import { svg } from "../icons.js";

export const ACTION_LABELS = {
  buat: "membuat",
  "buat-draf": "membuat draf",
  ubah: "mengubah",
  hapus: "menghapus",
  terbitkan: "menerbitkan",
  "tarik-ke-draf": "menarik ke draf",
  pulihkan: "memulihkan",
  "setujui usulan": "menyetujui usulan dari anonim",
  "tolak usulan": "menolak usulan dari anonim",
  "hapus komentar": "menghapus komentar",
  "buat moderator": "membuat moderator",
  "aktifkan moderator": "mengaktifkan moderator",
  "nonaktifkan moderator": "menonaktifkan moderator",
  "hapus moderator": "menghapus moderator",
  "simpan pengaturan": "mengubah pengaturan situs"
};

export function statBars(counts, categories) {
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

export function activityHTML(activity) {
  if (activity === null) return `<p class="muted">Memuat log…</p>`;
  if (activity instanceof Error) return `<p class="error">Log tidak bisa dimuat: ${esc(activity.message)}</p>`;
  if (!activity.length) return `<p class="muted">Belum ada aktivitas.</p>`;

  return `
    <ol class="activity">
      ${activity.map(item => `
        <li>
          <time>${esc(formatDate(item.waktu))}</time>
          <span><b>${esc(item.email || "staf")}</b> ${esc(ACTION_LABELS[item.aksi] || item.aksi)}
          ${item.entriId ? `<a href="${entryHref(item.entriId)}">${esc(item.nama)}</a>` : esc(item.nama || "")}</span>
        </li>`).join("")}
    </ol>`;
}

/** Antrean usulan dari anonim. */
export function submissionsHTML(list) {
  if (list === null) return `<p class="muted">Memuat usulan…</p>`;
  if (list instanceof Error) return `<p class="error">Usulan tidak bisa dimuat: ${esc(list.message)}</p>`;
  if (!list.length) return `<p class="muted">Tidak ada usulan yang menunggu.</p>`;

  return `
    <ul class="queue">
      ${list.map(item => `
        <li class="queue-item">
          <div class="queue-main">
            <b>${esc(item.nama || "Tanpa nama")}</b>
            <small class="muted">${icon(item.kategori)} ${esc(item.kategori || "Lainnya")} · dikirim ${esc(formatDate(item.dikirimPada))}</small>
            <p class="muted">${esc(snippet(item.deskripsi, 160) || "Tanpa deskripsi.")}</p>
            ${item.deskripsi ? `
              <details class="queue-detail">
                <summary>Lihat isi lengkap</summary>
                <div class="prose">${escMultiline(item.deskripsi)}</div>
              </details>` : ""}
          </div>
          <div class="queue-actions">
            <button class="btn primary small-btn" data-action="mod-approve" data-id="${esc(item.id)}">${svg("check", "ico-sm")}<span>Setujui sebagai draf</span></button>
            <button class="btn danger small-btn" data-action="mod-reject" data-id="${esc(item.id)}">${svg("x", "ico-sm")}<span>Tolak</span></button>
          </div>
        </li>`).join("")}
    </ul>`;
}

/** Moderasi komentar terbaru di seluruh situs. */
export function commentModHTML(list, nameOf = () => "") {
  if (list === null) return `<p class="muted">Memuat komentar…</p>`;
  if (list instanceof Error) return `<p class="error">Komentar tidak bisa dimuat: ${esc(list.message)}</p>`;
  if (!list.length) return `<p class="muted">Belum ada komentar.</p>`;

  return `
    <ul class="queue">
      ${list.map(item => `
        <li class="queue-item">
          <div class="queue-main">
            <b>${esc(item.nama || "Pembaca Anonim")}</b>
            <small class="muted">${item.parentId ? "Balasan" : "Komentar"} pada <a href="${entryHref(item.entriId)}">${esc(nameOf(item.entriId) || "entri")}</a> · ${esc(formatDate(item.dibuatPada))}</small>
            <p>${escMultiline(item.teks)}</p>
          </div>
          <div class="queue-actions">
            <button class="btn danger small-btn" data-action="mod-del-comment" data-id="${esc(item.id)}" data-entry="${esc(item.entriId)}">${svg("trash", "ico-sm")}<span>Hapus</span></button>
          </div>
        </li>`).join("")}
    </ul>`;
}

export function draftsHTML(drafts) {
  return drafts.length
    ? `<div class="mini-grid">${drafts.map(entry => miniCard(entry, "Belum terbit")).join("")}</div>`
    : `<p class="muted">Tidak ada draf. Setujui usulan anonim atau simpan draf dari form entri.</p>`;
}

export function needsWorkHTML(needsWork) {
  return needsWork.length
    ? `<div class="mini-grid">${needsWork.slice(0, 12).map(({ entry, missing }) => miniCard(entry, `Belum ada: ${missing.join(", ")}`)).join("")}</div>`
    : `<p class="muted">Semua entri sudah punya gambar dan deskripsi.</p>`;
}

/** Bagian bersama: hero, statistik, dan antrean moderasi. */
export function moderatorSectionsHTML(view) {
  const { submissions, comments, drafts, counts, needsWork, activity, nameOf, published, total } = view;
  const pending = Array.isArray(submissions) ? submissions.length : 0;

  return `
    <section class="stats">
      <div class="stat"><strong>${published}</strong><span>Terbit</span></div>
      <div class="stat"><strong>${drafts.length}</strong><span>Draf</span></div>
      <div class="stat"><strong>${pending}</strong><span>Usulan menunggu</span></div>
      <div class="stat"><strong>${Array.isArray(comments) ? comments.length : 0}</strong><span>Komentar terbaru</span></div>
      <div class="stat"><strong>${counts.get("Makhluk") || 0}</strong><span>Makhluk</span></div>
      <div class="stat"><strong>${needsWork.length}</strong><span>Perlu dilengkapi</span></div>
    </section>

    <div class="panel-stack">
      <section class="panel">
        <h2>Usulan dari Anonim <small class="muted">${pending}</small>
          <button class="btn small-btn" data-action="mod-reload">Muat ulang</button></h2>
        <p class="muted">Usulan disetujui menjadi draf, lalu bisa dirapikan dan diterbitkan dari form entri.</p>
        ${submissionsHTML(submissions)}
      </section>

      <section class="panel">
        <h2>Moderasi Komentar <small class="muted">${Array.isArray(comments) ? comments.length : ""}</small></h2>
        ${commentModHTML(comments, nameOf)}
      </section>

      <section class="panel">
        <h2>Draf <small class="muted">${drafts.length}</small></h2>
        ${draftsHTML(drafts)}
      </section>

      <section class="panel">
        <h2>Perlu Dilengkapi <small class="muted">${needsWork.length}</small></h2>
        ${needsWorkHTML(needsWork)}
      </section>

      <section class="panel">
        <h2>Komposisi Arsip <small class="muted">${total}</small></h2>
        ${statBars(counts, BASE_CATEGORIES)}
      </section>

      <section class="panel">
        <h2>Aktivitas Terbaru <button class="btn small-btn" data-action="reload-log">Muat ulang</button></h2>
        ${activityHTML(activity)}
      </section>
    </div>`;
}
