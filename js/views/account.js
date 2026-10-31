/* =========================================================
   views/account.js — halaman profil akun staf (owner & moderator).
   Nama & bio bisa diubah sendiri; password diganti dengan
   verifikasi password lama.
========================================================= */

import { esc } from "../utils.js";
import { formatDate, pageHeader } from "./common.js";
import { roleBadge } from "./owner.js";

export function profileHTML(profile) {
  if (!profile) return `<p class="empty">Profil hanya tersedia untuk moderator dan owner.</p>`;

  return `
    ${pageHeader("PROFIL", "Profil Akun", "Atur tampilan namamu di komentar dan panel.")}

    <div class="panel-stack">
      <section class="panel">
        <h2>Identitas</h2>
        <table class="profile-table">
          <tr><th>Peran</th><td>${roleBadge(profile.role)}</td></tr>
          <tr><th>Email</th><td>${esc(profile.email || "")}</td></tr>
          <tr><th>Dibuat</th><td>${esc(formatDate(profile.dibuatPada)) || "—"}</td></tr>
        </table>
      </section>

      <section class="panel">
        <h2>Nama & Bio</h2>
        <form class="stack-form" data-form="profile">
          <label>Nama tampilan<input name="nama" maxlength="80" required value="${esc(profile.nama || "")}"></label>
          <label>Bio<textarea name="bio" maxlength="500" rows="3">${esc(profile.bio || "")}</textarea></label>
          <div class="form-actions">
            <small class="muted">Nama ini tampil di komentar dan log aktivitas.</small>
            <button class="btn primary" type="submit">Simpan profil</button>
          </div>
        </form>
      </section>

      <section class="panel">
        <h2>Ganti Password</h2>
        <form class="stack-form" data-form="password">
          <label>Password saat ini<input name="current" type="password" autocomplete="current-password" required></label>
          <label>Password baru<input name="next" type="password" minlength="8" autocomplete="new-password" required></label>
          <div class="form-actions">
            <small class="muted">Minimal 8 karakter.</small>
            <button class="btn primary" type="submit">Ganti password</button>
          </div>
        </form>
      </section>
    </div>`;
}
