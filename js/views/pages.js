/* =========================================================
   views/pages.js — linimasa, bestiari, tersimpan, peta.
========================================================= */

import { THREAT_LEVELS } from "../schema.js";
import { imageTag } from "../media.js";
import { esc } from "../utils.js";
import {
  avatarHTML, cardGridHTML, entryHref, formatYear, icon, miniCard, pageHeader, snippet, threatBadge
} from "./common.js";

// =========================================================
// LINIMASA
// =========================================================

export function timelineHTML({ items, isAdmin, loading, eraFilter, eras }) {
  const filtered = eraFilter ? items.filter(item => item.entry.era === eraFilter) : items;

  // Kelompokkan berurutan per era (urutan mengikuti tahun).
  const groups = [];
  for (const item of filtered) {
    const era = item.entry.era || "Era Tak Tercatat";
    if (!groups.length || groups[groups.length - 1].era !== era) groups.push({ era, items: [] });
    groups[groups.length - 1].items.push(item);
  }

  return `
    ${pageHeader("KRONIK VELMOR", "Linimasa Dunia", "Perang besar, kejatuhan kerajaan, kelahiran tokoh — diurutkan menurut tahun.")}

    ${eras.length > 1 ? `
      <div class="chips">
        <button class="chip${!eraFilter ? " active" : ""}" data-era="">Semua Era</button>
        ${eras.map(era => `<button class="chip${era === eraFilter ? " active" : ""}" data-era="${esc(era)}">${esc(era)}</button>`).join("")}
      </div>` : ""}

    ${groups.length ? `
      <div class="timeline">
        ${groups.map(group => `
          <section class="era">
            <h2 class="era-title"><span>${esc(group.era)}</span></h2>
            <ol>
              ${group.items.map(({ entry, year }) => `
                <li class="tl-item cat-${esc(entry.kategori)}">
                  <span class="tl-year">${esc(formatYear(year, ""))}</span>
                  <a class="tl-card" href="${entryHref(entry.id)}">
                    <span class="tl-icon">${icon(entry.kategori)}</span>
                    <span>
                      <b>${esc(entry.nama)}</b>
                      <small>${esc(entry.kategori)}</small>
                      <span class="tl-text">${esc(snippet(entry.deskripsi, 160))}</span>
                    </span>
                  </a>
                </li>`).join("")}
            </ol>
          </section>`).join("")}
      </div>` : `
      <p class="empty">${loading ? "Membuka kronik…" : "Belum ada entri bertahun. Isi field <b>Tahun</b> dan <b>Era</b> pada entri (terutama kategori Peristiwa) agar muncul di sini."}</p>`}

    ${isAdmin ? `<p class="muted admin-hint">Tip admin: tahun negatif berarti sebelum penanggalan (ditampilkan sebagai “SE”).</p>` : ""}`;
}

// =========================================================
// BESTIARI
// =========================================================

export function bestiaryHTML({ list, threat, habitat, habitats, isAdmin, bookmarks, limit, loading }) {
  const counts = new Map(THREAT_LEVELS.map(level => [level.value, 0]));
  for (const entry of list.all) if (counts.has(entry.ancaman)) counts.set(entry.ancaman, counts.get(entry.ancaman) + 1);

  return `
    ${pageHeader("BESTIARI", "Makhluk & Monster Velmor", "Klasifikasi, habitat, dan tingkat ancaman setiap makhluk yang pernah tercatat.")}

    <div class="threat-scale" role="toolbar" aria-label="Filter tingkat ancaman">
      <button class="threat-step${!threat ? " active" : ""}" data-threat="">Semua <span>${list.all.length}</span></button>
      ${THREAT_LEVELS.map(level => `
        <button class="threat-step t${level.value}${threat === level.value ? " active" : ""}" data-threat="${level.value}">
          ${"☠".repeat(Number(level.value))} ${level.label} <span>${counts.get(level.value)}</span>
        </button>`).join("")}
    </div>

    ${habitats.length ? `
      <label class="filter inline">
        <span>Habitat</span>
        <select data-filter-habitat>
          <option value="">Semua habitat</option>
          ${habitats.map(value => `<option${value === habitat ? " selected" : ""}>${esc(value)}</option>`).join("")}
        </select>
      </label>` : ""}

    ${cardGridHTML(list.shown, {
      isAdmin,
      bookmarks,
      limit,
      emptyText: loading ? "Membuka bestiari…" : "Belum ada makhluk yang cocok. Tambahkan entri berkategori <b>Makhluk</b>."
    })}`;
}

// =========================================================
// TERSIMPAN (bookmark + riwayat)
// =========================================================

export function savedHTML({ bookmarks, recent }) {
  return `
    ${pageHeader("PERPUSTAKAAN PRIBADI", "Tersimpan", "Disimpan di browser ini saja — tidak perlu akun.")}

    <h2 class="archive-heading">★ Ditandai <small>${bookmarks.length}</small></h2>
    ${bookmarks.length
      ? `<div class="mini-grid">${bookmarks.map(entry => miniCard(entry)).join("")}</div>`
      : `<p class="empty">Belum ada. Tekan <b>☆ Tandai</b> di halaman artikel.</p>`}

    <h2 class="archive-heading">
      Riwayat Baca <small>${recent.length}</small>
      ${recent.length ? `<button class="btn small-btn" data-action="clear-recent">Hapus riwayat</button>` : ""}
    </h2>
    ${recent.length
      ? `<div class="mini-grid">${recent.map(({ entry, at }) => miniCard(entry, new Date(at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }))).join("")}</div>`
      : `<p class="empty">Halaman yang kamu buka akan muncul di sini.</p>`}`;
}

// =========================================================
// PETA DUNIA
// =========================================================

export function mapHTML({ image, markers, placeable, isAdmin, editing, selectedId, focusId, loading }) {
  return `
    ${pageHeader("ATLAS", "Peta Dunia Velmor", "Klik penanda untuk membuka catatan lokasi.")}

    ${isAdmin ? `
      <div class="map-admin">
        <button class="btn${editing ? " primary" : ""}" data-action="map-edit">${editing ? "Selesai Mengedit" : "Edit Penanda"}</button>
        <label class="btn">Ganti Gambar Peta<input type="file" accept="image/*" data-upload="map" hidden></label>
        ${editing ? `
          <label class="filter inline">
            <span>Tempatkan</span>
            <select data-map-select>
              <option value="">— pilih entri, lalu klik peta —</option>
              ${placeable.map(entry => `<option value="${esc(entry.id)}"${entry.id === selectedId ? " selected" : ""}>${icon(entry.kategori)} ${esc(entry.nama)}${entry.peta ? " (sudah ada)" : ""}</option>`).join("")}
            </select>
          </label>
          <span class="muted">Klik penanda saat mode edit untuk menghapusnya.</span>` : ""}
      </div>` : ""}

    ${image ? `
      <div class="map-wrap${editing ? " editing" : ""}">
        <div class="map-canvas" data-map-canvas>
          ${imageTag(image, "Peta dunia Velmor", 'class="map-image" draggable="false"')}
          ${markers.map(entry => `
            <button class="map-marker${entry.id === focusId ? " focus" : ""} cat-${esc(entry.kategori)}"
                    style="left:${entry.peta.x}%;top:${entry.peta.y}%"
                    data-marker="${esc(entry.id)}" aria-label="${esc(entry.nama)}">
              <span>${icon(entry.kategori)}</span>
              <em>${esc(entry.nama)}</em>
            </button>`).join("")}
        </div>
      </div>
      <div class="map-popup" data-map-popup hidden></div>

      ${markers.length ? `
        <h2 class="archive-heading">Lokasi di Peta <small>${markers.length}</small></h2>
        <div class="mini-grid">${markers.map(entry => miniCard(entry)).join("")}</div>` : ""}` : `
      <p class="empty">${loading ? "Membentangkan peta…" : isAdmin
        ? "Belum ada gambar peta. Tekan <b>Ganti Gambar Peta</b> untuk mengunggah."
        : "Peta dunia belum dibentangkan oleh penjaga arsip."}</p>`}`;
}

export function mapPopupHTML(entry) {
  return `
    <div class="popup-head">
      <span class="mini-avatar">${avatarHTML(entry)}</span>
      <div>
        <b>${esc(entry.nama)}</b>
        <small>${icon(entry.kategori)} ${esc(entry.kategori)}${entry.penguasa ? ` · Penguasa: ${esc(entry.penguasa)}` : ""}</small>
      </div>
      <button class="modal-close" data-action="close-popup" aria-label="Tutup">×</button>
    </div>
    <p>${esc(snippet(entry.deskripsi || entry.latar, 200) || "Belum ada deskripsi.")}</p>
    ${entry.ancaman ? threatBadge(entry.ancaman) : ""}
    <a class="btn primary" href="${entryHref(entry.id)}">Buka catatan →</a>`;
}
