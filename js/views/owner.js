/* =========================================================
   views/owner.js — bagian khusus OWNER di panel owner:
   kelola moderator, pengaturan situs, kategori, backup,
   dan riwayat revisi. Owner juga melihat bagian moderator.
========================================================= */

import { esc } from "../utils.js";
import { formatDate } from "./common.js";
import { svg } from "../icons.js";

const ROLE_LABEL = { owner: "Owner", moderator: "Moderator" };

export function roleBadge(role) {
  return `<span class="role-badge role-${esc(role)}">${svg(role === "owner" ? "crown" : "shield", "ico-xs")}${esc(ROLE_LABEL[role] || role)}</span>`;
}

/** Daftar staf + form membuat moderator. */
export function staffHTML(staff, currentUid) {
  if (staff === null) return `<p class="muted">Memuat daftar staf…</p>`;
  if (staff instanceof Error) return `<p class="error">Daftar staf tidak bisa dimuat: ${esc(staff.message)}</p>`;

  const rows = staff.map(item => {
    const isSelf = item.uid === currentUid;
    const isOwnerRow = item.role === "owner";

    return `
      <tr>
        <td><b>${esc(item.nama || "(tanpa nama)")}</b>${isSelf ? ` <small class="muted">(kamu)</small>` : ""}<br><small class="muted">${esc(item.email || "")}</small></td>
        <td>${roleBadge(item.role)}</td>
        <td>${item.aktif === false ? `<span class="badge off">Nonaktif</span>` : `<span class="badge on">Aktif</span>`}</td>
        <td class="staff-actions">
          ${isOwnerRow || isSelf ? `<small class="muted">—</small>` : `
            <button class="btn small-btn" data-action="owner-toggle-mod" data-id="${esc(item.uid)}" data-active="${item.aktif === false ? "1" : "0"}">
              ${item.aktif === false ? "Aktifkan" : "Nonaktifkan"}
            </button>
            <button class="btn danger small-btn" data-action="owner-remove-mod" data-id="${esc(item.uid)}" data-name="${esc(item.nama || item.email || "")}">Hapus peran</button>`}
        </td>
      </tr>`;
  }).join("");

  return `
    <div class="table-wrap">
      <table class="staff-table">
        <thead><tr><th>Akun</th><th>Peran</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="4" class="muted">Belum ada staf.</td></tr>`}</tbody>
      </table>
    </div>

    <h3 class="sub-heading">Buat Moderator Baru</h3>
    <p class="muted">Akun dibuat langsung dari situs, tanpa membuka Firebase Console. Sesi owner tidak terganggu.</p>
    <form class="stack-form" data-form="create-mod">
      <div class="form-row">
        <label>Nama tampilan<input name="nama" maxlength="80" required></label>
        <label>Email<input name="email" type="email" autocomplete="off" required></label>
        <label>Password sementara<input name="password" type="password" minlength="8" autocomplete="new-password" required></label>
      </div>
      <div class="form-actions">
        <small class="muted">Minimal 8 karakter. Berikan password ini ke moderator, lalu minta mereka menggantinya di halaman profil.</small>
        <button class="btn primary" type="submit">Buat moderator</button>
      </div>
    </form>`;
}

/** Pengaturan situs: playlist musik + kategori tambahan + gambar peta. */
export function settingsHTML(settings, categories) {
  return `
    <h3 class="sub-heading">Playlist Musik</h3>
    <form class="stack-form" data-form="music">
      <label>URL audio, satu per baris
        <textarea name="musicUrls" rows="4" placeholder="https://contoh.com/lagu.mp3">${esc((settings.musicUrls || []).join("\n"))}</textarea>
      </label>
      <div class="form-actions">
        <small class="muted">Hanya moderator & owner yang melihat pemutar.</small>
        <button class="btn primary" type="submit">Simpan playlist</button>
      </div>
    </form>

    <h3 class="sub-heading">Kategori Tambahan</h3>
    <p class="muted">Kategori bawaan: ${categories.filter(name => !(settings.kategoriTambahan || []).includes(name)).map(esc).join(", ")}.</p>
    <div class="tags">
      ${(settings.kategoriTambahan || []).map(name => `
        <span class="tag">${esc(name)} <button class="tag-x" data-action="owner-remove-cat" data-name="${esc(name)}" aria-label="Hapus kategori ${esc(name)}">×</button></span>`).join("")
        || `<span class="muted">Belum ada kategori tambahan.</span>`}
    </div>
    <form class="inline-form" data-form="category">
      <input name="kategori" maxlength="40" placeholder="Nama kategori baru" required>
      <button class="btn" type="submit">Tambah</button>
    </form>`;
}

export function backupHTML() {
  return `
    <p class="muted">Ekspor menyimpan seluruh entri terbit, draf, dan pengaturan dalam satu berkas JSON.</p>
    <div class="actions">
      <button class="btn" data-action="owner-export">${svg("download", "ico-sm")}<span>Ekspor / Backup</span></button>
      <button class="btn" data-action="owner-import">${svg("upload", "ico-sm")}<span>Impor / Restore</span></button>
    </div>`;
}

/** Riwayat revisi satu entri (khusus owner). */
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
            <small>${esc(rev.alasan === "hapus" ? "sebelum dihapus" : "sebelum diubah")} · ${esc(rev.email || "staf")}</small>
            <p class="muted">${esc(rev.data?.nama || "")} — ${esc(String(rev.data?.deskripsi || "").slice(0, 120))}</p>
          </div>
          <button class="btn small-btn" data-restore="${esc(rev.id)}">Pulihkan versi ini</button>
        </li>`).join("")}
    </ol>`;
}

/** Bagian owner-only di atas panel moderator. */
export function ownerSectionsHTML({ staff, settings, categories, currentUid }) {
  return `
    <div class="panel-stack">
      <section class="panel wide">
        <h2>Kelola Moderator <small class="muted">Owner</small></h2>
        ${staffHTML(staff, currentUid)}
      </section>

      <section class="panel">
        <h2>Pengaturan Situs</h2>
        ${settingsHTML(settings, categories)}
      </section>

      <section class="panel">
        <h2>Backup & Restore</h2>
        ${backupHTML()}
      </section>
    </div>`;
}
