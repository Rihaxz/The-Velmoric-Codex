/* =========================================================
   views/comments.js — bagian komentar di bawah artikel.
   Satu tingkat balasan: balasan selalu menempel ke komentar
   utama. Teks dari pengguna selalu lewat esc().
========================================================= */

import { esc, escMultiline } from "../utils.js";
import { formatDate } from "./common.js";
import { svg } from "../icons.js";

const ROLE_LABEL = { owner: "Owner", moderator: "Moderator" };

function badge(peran) {
  const label = ROLE_LABEL[peran];
  return label ? `<span class="role-badge role-${peran}">${svg(peran === "owner" ? "crown" : "shield", "ico-xs")}${label}</span>` : "";
}

function commentItem(comment, { uid, canModerate, canWrite, reply = false }) {
  const mine = Boolean(uid) && comment.uid === uid;

  return `
    <li class="comment${reply ? " reply" : ""}" id="c-${esc(comment.id)}">
      <div class="comment-head">
        <b>${esc(comment.nama || "Pembaca Anonim")}</b>
        ${badge(comment.peran)}
        <time>${esc(formatDate(comment.dibuatPada))}</time>
      </div>
      <p class="comment-body">${escMultiline(comment.teks)}</p>
      <div class="comment-actions">
        ${canWrite && !reply ? `<button class="btn small-btn" data-action="comment-reply" data-id="${esc(comment.id)}">${svg("reply", "ico-sm")}<span>Balas</span></button>` : ""}
        ${canModerate || mine ? `<button class="btn small-btn danger" data-action="comment-del" data-id="${esc(comment.id)}">${svg("trash", "ico-sm")}<span>Hapus</span></button>` : ""}
      </div>
      ${canWrite && !reply ? `
        <form class="reply-form" data-form="reply" data-parent="${esc(comment.id)}" hidden>
          <textarea name="teks" maxlength="1000" rows="2" placeholder="Tulis balasan…" required></textarea>
          <div class="reply-actions">
            <button class="btn small-btn" type="button" data-action="comment-cancel" data-id="${esc(comment.id)}">Batal</button>
            <button class="btn primary small-btn" type="submit">Kirim balasan</button>
          </div>
        </form>` : ""}
    </li>`;
}

/**
 * @param {object} view
 * @param {Array|null|Error} view.list   null = memuat, Error = gagal
 */
export function commentsHTML({ entryId, list, uid = "", canModerate = false, canWrite = false }) {
  let body;

  if (list === null || list === undefined) body = `<p class="muted comments-status">Memuat komentar…</p>`;
  else if (list instanceof Error) body = `<p class="error comments-status">Komentar tidak bisa dimuat: ${esc(list.message)}</p>`;
  else {
    const roots = list.filter(item => !item.parentId);
    const children = new Map();

    for (const item of list) {
      if (!item.parentId) continue;
      if (!children.has(item.parentId)) children.set(item.parentId, []);
      children.get(item.parentId).push(item);
    }

    body = roots.length
      ? `<ol class="comment-list">
          ${roots.map(root => `
            ${commentItem(root, { uid, canModerate, canWrite })}
            ${children.get(root.id)?.length ? `
              <li class="reply-wrap"><ol class="comment-list nested">
                ${children.get(root.id).map(child => commentItem(child, { uid, canModerate, canWrite, reply: true })).join("")}
              </ol></li>` : ""}
          `).join("")}
        </ol>`
      : `<p class="muted comments-status">Belum ada komentar. Jadilah yang pertama.</p>`;
  }

  return `
    <section class="section comments" id="komentar" data-entry="${esc(entryId)}">
      <h2>Komentar <small class="muted">${Array.isArray(list) ? list.length : ""}</small></h2>

      ${canWrite ? `
        <form class="comment-form" data-form="comment" data-entry="${esc(entryId)}">
          <label for="commentText" class="sr-only">Tulis komentar</label>
          <textarea id="commentText" name="teks" maxlength="1000" rows="3" placeholder="Tulis komentar tentang entri ini…" required></textarea>
          <div class="reply-actions">
            <small class="muted">Maksimal 1000 karakter</small>
            <button class="btn primary" type="submit">Kirim komentar</button>
          </div>
        </form>` : `<p class="muted">Komentar belum tersedia.</p>`}

      ${body}
    </section>`;
}
