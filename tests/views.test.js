// Smoke test: render view per peran (owner, moderator, anonim) tanpa error.
import { test } from "node:test";
import assert from "node:assert/strict";
import { moderatorSectionsHTML, submissionsHTML, commentModHTML, draftsHTML, activityHTML } from "../js/views/moderator.js";
import { ownerSectionsHTML, staffHTML, settingsHTML, backupHTML, historyHTML, roleBadge } from "../js/views/owner.js";
import { profileHTML } from "../js/views/account.js";
import { commentsHTML } from "../js/views/comments.js";
import { articleHTML, skeletonHTML, notFoundHTML } from "../js/views/article.js";
import { formFieldsHTML } from "../js/views/form.js";
import { svg, categoryIcon } from "../js/icons.js";
import { cardGridHTML, chipsHTML, sidebarHTML, threatBadge } from "../js/views/common.js";
import { BASE_CATEGORIES } from "../js/schema.js";

const entry = { id: "e1", nama: "Aldric", kategori: "Karakter", deskripsi: "Halo <script>x</script>", foto: "", galeri: [{ src: "https://x.y/a.png", caption: "c" }] };
const when = "2026-10-30T10:00:00Z";

test("smoke: panel moderator render dengan data kosong dan terisi", () => {
  const counts = new Map([["Karakter", 2]]);
  const base = { submissions: [], comments: [], drafts: [], counts, needsWork: [], activity: [], nameOf: () => "", published: 3, total: 3 };
  assert.ok(moderatorSectionsHTML(base).includes("Tidak ada usulan"));

  const filled = moderatorSectionsHTML({
    ...base,
    submissions: [{ id: "s1", nama: "Lyra <i>", kategori: "Karakter", deskripsi: "Teks", dikirimPada: when }],
    comments: [{ id: "c1", entriId: "e1", parentId: "", teks: "<b>hi</b>", nama: "Pembaca Anonim", dibuatPada: when }],
    drafts: [entry],
    activity: [{ aksi: "setujui usulan", email: "mod@x", nama: "Lyra", waktu: when }]
  });
  assert.ok(filled.includes("data-action=\"mod-approve\" data-id=\"s1\""));
  assert.ok(filled.includes("data-action=\"mod-del-comment\" data-id=\"c1\""));
  assert.ok(filled.includes("Lyra &lt;i&gt;"), "nama usulan harus di-escape");
  assert.ok(filled.includes("&lt;b&gt;hi&lt;/b&gt;"), "teks komentar harus di-escape");
  assert.ok(filled.includes("menyetujui usulan dari anonim"));
});

test("smoke: panel owner menampilkan kelola moderator & tombol aksi", () => {
  const staff = [
    { uid: "o1", role: "owner", nama: "Pemilik", email: "o@x", aktif: true },
    { uid: "m1", role: "moderator", nama: "Budi", email: "b@x", aktif: false }
  ];
  const html = ownerSectionsHTML({ staff, settings: { musicUrls: ["https://a/b.mp3"], kategoriTambahan: ["Festival"] }, categories: BASE_CATEGORIES, currentUid: "o1" });
  assert.ok(html.includes("data-action=\"owner-toggle-mod\" data-id=\"m1\" data-active=\"1\""), "moderator nonaktif bisa diaktifkan");
  assert.ok(html.includes("data-action=\"owner-remove-mod\" data-id=\"m1\""));
  assert.ok(!html.includes("data-id=\"o1\" data-active"), "owner tidak bisa menonaktifkan dirinya");
  assert.ok(html.includes("data-form=\"create-mod\""));
  assert.ok(html.includes("data-form=\"music\""));
  assert.ok(html.includes("Festival"));
  assert.ok(html.includes("Nonaktif"));
});

test("smoke: staffHTML menampilkan error dengan aman & loading", () => {
  assert.ok(staffHTML(null, "x").includes("Memuat"));
  assert.ok(staffHTML(new Error("<x>"), "x").includes("&lt;x&gt;"));
  assert.ok(historyHTML(entry, []).includes("Belum ada revisi"));
  assert.ok(backupHTML().includes("owner-export"));
  assert.ok(settingsHTML({ musicUrls: [], kategoriTambahan: [] }, BASE_CATEGORIES).includes("Kategori Tambahan"));
  assert.ok(roleBadge("owner").includes("role-owner"));
});

test("smoke: profil staf dan kosong", () => {
  assert.ok(profileHTML(null).includes("hanya tersedia"));
  const html = profileHTML({ uid: "u", role: "moderator", nama: "Budi", bio: "x", email: "b@x", dibuatPada: when });
  assert.ok(html.includes("data-form=\"profile\"") && html.includes("data-form=\"password\""));
  assert.ok(html.includes("value=\"Budi\""));
});

test("smoke: komentar untuk berbagai status (memuat, error, kosong, pembaca, staf)", () => {
  assert.ok(commentsHTML({ entryId: "e1", list: null }).includes("Memuat komentar"));
  assert.ok(commentsHTML({ entryId: "e1", list: new Error("gagal") }).includes("gagal"));
  assert.ok(commentsHTML({ entryId: "e1", list: [], canWrite: true }).includes("Belum ada komentar"));
  const withReply = commentsHTML({
    entryId: "e1", uid: "me", canWrite: true, canModerate: true,
    list: [
      { id: "c1", parentId: "", teks: "a", uid: "x", nama: "A", peran: "owner", dibuatPada: when },
      { id: "c2", parentId: "c1", teks: "b", uid: "me", nama: "Saya", peran: "reader", dibuatPada: when }
    ]
  });
  assert.ok(withReply.includes("role-owner"));
  assert.ok(withReply.includes("data-action=\"comment-del\" data-id=\"c2\""));
  assert.ok(withReply.includes("data-action=\"comment-del\" data-id=\"c1\""), "moderator bisa menghapus komentar siapa pun");
});

test("smoke: artikel untuk owner, moderator, dan anonim tidak melempar error", () => {
  const ctx = (o) => ({ bookmarked: false, reading: false, resolve: () => null, relations: [], tree: null, backlinks: [], comments: { list: [], canWrite: true, uid: "u", canModerate: false }, isAdmin: false, isOwner: false, ...o });
  assert.ok(articleHTML(entry, ctx({ isAdmin: true, isOwner: true })).includes("data-action=\"history\""));
  assert.ok(articleHTML(entry, ctx({ isAdmin: true, isOwner: false })).includes("data-edit=\"e1\""));
  assert.ok(!articleHTML(entry, ctx({ isAdmin: true, isOwner: false })).includes("data-action=\"history\""));
  assert.ok(articleHTML(entry, ctx({})).includes("id=\"komentar\""));
  assert.ok(skeletonHTML().includes("skeleton"));
  assert.ok(notFoundHTML(true).includes("skeleton"));
});

test("smoke: form anonim tanpa unggah, staf dengan unggah", () => {
  const anon = formFieldsHTML(BASE_CATEGORIES, { isStaff: false });
  const staff = formFieldsHTML(BASE_CATEGORIES, { isStaff: true });
  assert.ok(!anon.includes("data-upload"));
  assert.ok(staff.includes("data-upload=\"foto\""));
  assert.ok(!staff.includes("☠"), "opsi ancaman tanpa emoji");
});

test("smoke: ikon SVG & kategori, tanpa emoji di tombol", () => {
  assert.ok(svg("skull").startsWith("<svg"));
  assert.ok(categoryIcon("Tidak Ada").includes("<svg"));
  assert.ok(threatBadge("3").includes("<svg"));
  const grid = cardGridHTML([entry], { isAdmin: true, isOwner: false, emptyText: "x" });
  assert.ok(grid.includes("style=\"--i:0\""));
  assert.ok(!grid.includes("data-action=\"delete\""));
  assert.ok(chipsHTML(new Map([["Karakter", 1]]), "", 1, BASE_CATEGORIES).includes("<svg"));
  assert.ok(sidebarHTML([entry], null, false, BASE_CATEGORIES).includes("side-group"));
});
