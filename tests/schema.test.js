import { test } from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeEntry, EDITABLE_KEYS, isHttpUrl, isImageRef, parseYear, RELATION_TYPES
} from "../js/schema.js";
import { esc, normalizeText } from "../js/utils.js";
import { renderMarkup, plainText, linkedNames } from "../js/markup.js";
import { articleHTML } from "../js/views/article.js";
import { sidebarHTML } from "../js/views/common.js";
import { formFieldsHTML } from "../js/views/form.js";
import { commentsHTML } from "../js/views/comments.js";
import { timelineHTML } from "../js/views/pages.js";

const CATS = ["Karakter", "Kerajaan", "Lokasi", "Makhluk", "Lainnya"];
const ctx = { isAdmin: false, bookmarked: false, reading: false, resolve: () => null, relations: [], tree: null, backlinks: [] };

// ---------- schema ----------

test("sanitizeEntry: nama wajib", () => {
  assert.throws(() => sanitizeEntry({ nama: "   " }), /Nama/);
});

test("sanitizeEntry: hanya field yang dikenal, teks di-trim", () => {
  const out = sanitizeEntry({ nama: "  Aldric ", hack: "x", id: "abc", ras: " Elf " });
  assert.equal(out.nama, "Aldric");
  assert.equal(out.ras, "Elf");
  assert.equal(out.hack, undefined);
  assert.equal(out.id, undefined);
  assert.deepEqual(Object.keys(out).sort(), [...EDITABLE_KEYS].sort());
});

test("sanitizeEntry: field lama Firestore tetap ada", () => {
  const legacy = ["nama", "kategori", "foto", "gelar", "ras", "gender", "usia", "tinggi", "berat", "asal",
    "afiliasi", "status", "kelas", "deskripsi", "kepribadian", "latar", "kemampuan", "kelemahan"];
  for (const key of legacy) assert.ok(EDITABLE_KEYS.includes(key), key);
});

test("sanitizeEntry: kategori kosong -> Lainnya, kategori lama dipertahankan", () => {
  assert.equal(sanitizeEntry({ nama: "A" }).kategori, "Lainnya");
  assert.equal(sanitizeEntry({ nama: "A", kategori: "Protagonist" }).kategori, "Protagonist");
});

test("sanitizeEntry: gambar harus http(s) atau media:", () => {
  assert.throws(() => sanitizeEntry({ nama: "A", foto: "javascript:alert(1)" }), /URL/);
  assert.equal(sanitizeEntry({ nama: "A", foto: "https://x.y/a.png" }).foto, "https://x.y/a.png");
  assert.equal(sanitizeEntry({ nama: "A", foto: "media:abc123" }).foto, "media:abc123");
  assert.equal(isHttpUrl("ftp://x"), false);
  assert.equal(isImageRef("media:"), false);
});

test("sanitizeEntry: tag, galeri, relasi, peta dibersihkan", () => {
  const out = sanitizeEntry({
    nama: "A",
    tags: " Perang, legendaris ,, Perang ",
    galeri: [{ src: "https://x/1.png", caption: " c " }, { src: "javascript:x" }],
    relasi: [{ id: "b", tipe: "guru" }, { id: "", tipe: "guru" }, { id: "c", tipe: "ngawur" }],
    peta: { x: 150, y: "20" }
  });
  assert.deepEqual(out.tags, ["Perang", "legendaris"]);
  assert.equal(out.galeri.length, 1);
  assert.equal(out.galeri[0].caption, "c");
  assert.ok(out.relasi.every(rel => rel.id && RELATION_TYPES[rel.tipe]));
  assert.ok(out.peta === null || (out.peta.x <= 100 && out.peta.y === 20));
});

test("sanitizeEntry: tahun harus angka", () => {
  assert.throws(() => sanitizeEntry({ nama: "A", tahun: "kemarin" }), /Tahun/);
  assert.equal(parseYear("-40"), -40);
  assert.equal(parseYear(""), null);
});

test("RELATION_TYPES: setiap kebalikan juga terdaftar", () => {
  for (const [key, type] of Object.entries(RELATION_TYPES)) {
    assert.ok(RELATION_TYPES[type.reverse], `${key} -> ${type.reverse}`);
  }
});

// ---------- utils & markup ----------

test("esc & normalizeText", () => {
  assert.equal(esc(`<img src=x onerror="a">`), "&lt;img src=x onerror=&quot;a&quot;&gt;");
  assert.equal(normalizeText("Élan VITAL"), "elan vital");
});

test("renderMarkup: format dasar & aman dari HTML", () => {
  const html = renderMarkup("**tebal** *miring*\n## Judul\n> kutip\n- satu\n- dua\n<script>x</script>");
  assert.ok(html.includes("<strong>tebal</strong>"));
  assert.ok(html.includes("<em>miring</em>"));
  assert.ok(html.includes("<h3"));
  assert.ok(html.includes("<blockquote>kutip</blockquote>"));
  assert.equal((html.match(/<li>/g) || []).length, 2);
  assert.ok(!html.includes("<script>"));
});

test("renderMarkup: tautan wiki & spoiler", () => {
  const html = renderMarkup("Lihat [[Aldric]] dan [[Hilang|teks]] ||rahasia||", name => (name === "Aldric" ? { id: "a1" } : null));
  assert.ok(html.includes('href="#/e/a1"'));
  assert.ok(html.includes('class="wiki-missing"'));
  assert.ok(html.includes('class="spoiler"'));
  assert.deepEqual(linkedNames("[[A]] x [[B|c]]"), ["A", "B"]);
  assert.equal(plainText("**A** [[B|c]] ||d||"), "A c [spoiler]");
});

// ---------- views ----------

test("articleHTML meng-escape isi dan hanya menampilkan bagian yang terisi", () => {
  const html = articleHTML({ id: "1", nama: "<b>X</b>", deskripsi: "a\nb", kategori: "Ras" }, ctx);
  assert.ok(html.includes("&lt;b&gt;X&lt;/b&gt;"));
  assert.ok(html.includes("a<br>b"));
  assert.ok(!html.includes("Kelemahan"));
  assert.ok(!html.includes("data-del"));
});

test("articleHTML: owner melihat hapus & riwayat", () => {
  const html = articleHTML({ id: "1", nama: "A", kategori: "Karakter" }, { ...ctx, isAdmin: true, isOwner: true });
  assert.ok(html.includes('data-del="1"'));
  assert.ok(html.includes('data-action="history"'));
});

test("articleHTML: moderator hanya melihat edit, bukan hapus & riwayat", () => {
  const html = articleHTML({ id: "1", nama: "A", kategori: "Karakter" }, { ...ctx, isAdmin: true, isOwner: false });
  assert.ok(html.includes('data-edit="1"'));
  assert.ok(!html.includes('data-del="1"'));
  assert.ok(!html.includes('data-action="history"'));
});

test("articleHTML: anonim tidak melihat tombol staf", () => {
  const html = articleHTML({ id: "1", nama: "A", kategori: "Karakter" }, { ...ctx, isAdmin: false });
  assert.ok(!html.includes('data-edit="1"'));
});

test("commentsHTML: balasan hanya satu tingkat & teks di-escape", () => {
  const html = commentsHTML({
    entryId: "1",
    uid: "u1",
    canWrite: true,
    canModerate: false,
    list: [
      { id: "c1", parentId: "", teks: "<b>x</b>", uid: "u2", nama: "Pembaca Anonim", peran: "reader", dibuatPada: "2026-01-01T00:00:00Z" },
      { id: "c2", parentId: "c1", teks: "balas", uid: "u1", nama: "Saya", peran: "reader", dibuatPada: "2026-01-02T00:00:00Z" }
    ]
  });
  assert.ok(html.includes("&lt;b&gt;x&lt;/b&gt;"));
  assert.ok(!html.includes("<b>x</b>"));
  assert.ok(html.includes('data-parent="c1"'));
  assert.ok(html.includes('data-action="comment-del" data-id="c2"'));
  assert.ok(!html.includes('data-action="comment-del" data-id="c1"'));
});

test("commentsHTML: badge peran ditampilkan untuk moderator & owner", () => {
  const html = commentsHTML({
    entryId: "1", uid: "", canWrite: false, canModerate: true,
    list: [{ id: "c1", parentId: "", teks: "t", uid: "x", nama: "Mod", peran: "moderator", dibuatPada: "2026-01-01T00:00:00Z" }]
  });
  assert.ok(html.includes("role-moderator"));
});

test("sidebarHTML mengelompokkan per kategori", () => {
  const html = sidebarHTML(
    [{ id: "1", nama: "A", kategori: "Lokasi" }, { id: "2", nama: "B", kategori: "Karakter" }],
    "2",
    false,
    CATS
  );
  assert.ok(html.indexOf("Karakter") < html.indexOf("Lokasi"));
  assert.ok(html.includes('href="#/e/2"'));
});

test("formFieldsHTML memuat semua field schema + kategori tambahan", () => {
  const html = formFieldsHTML([...CATS, "Dewa"]);
  const structured = new Set(["galeri", "relasi", "peta"]);
  for (const key of EDITABLE_KEYS.filter(key => !structured.has(key))) {
    assert.ok(html.includes(`name="${key}"`), key);
  }
  assert.ok(html.includes("<option>Dewa</option>"));
});

test("timelineHTML mengelompokkan per era", () => {
  const items = [
    { entry: { id: "1", nama: "Perang A", kategori: "Peristiwa", era: "Era Pertama" }, year: -10 },
    { entry: { id: "2", nama: "Raja B", kategori: "Karakter", era: "Era Kedua" }, year: 20 }
  ];
  const html = timelineHTML({ items, isAdmin: false, loading: false, eraFilter: "", eras: ["Era Pertama", "Era Kedua"] });
  assert.ok(html.indexOf("Era Pertama") < html.indexOf("Era Kedua"));
  assert.ok(html.includes("10 SE"));
});
