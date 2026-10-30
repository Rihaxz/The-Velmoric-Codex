import { test } from "node:test";
import assert from "node:assert/strict";

import { sanitizeEntry, EDITABLE_KEYS, isHttpUrl } from "../js/schema.js";
import { esc, normalizeText } from "../js/utils.js";
import { articleHTML, sidebarHTML, formFieldsHTML } from "../js/views.js";

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

test("sanitizeEntry: kategori kosong -> Lainnya, kategori lama dipertahankan", () => {
  assert.equal(sanitizeEntry({ nama: "A" }).kategori, "Lainnya");
  assert.equal(sanitizeEntry({ nama: "A", kategori: "Protagonist" }).kategori, "Protagonist");
});

test("sanitizeEntry: URL gambar harus http(s)", () => {
  assert.throws(() => sanitizeEntry({ nama: "A", foto: "javascript:alert(1)" }), /URL/);
  assert.equal(sanitizeEntry({ nama: "A", foto: "https://x.y/a.png" }).foto, "https://x.y/a.png");
  assert.equal(isHttpUrl("ftp://x"), false);
});

test("esc & normalizeText", () => {
  assert.equal(esc(`<img src=x onerror="a">`), "&lt;img src=x onerror=&quot;a&quot;&gt;");
  assert.equal(normalizeText("Élan VITAL"), "elan vital");
});

test("articleHTML meng-escape isi dan hanya menampilkan bagian yang terisi", () => {
  const html = articleHTML({ id: "1", nama: "<b>X</b>", deskripsi: "a\nb", kategori: "Ras" }, false);
  assert.ok(html.includes("&lt;b&gt;X&lt;/b&gt;"));
  assert.ok(html.includes("a<br>b"));
  assert.ok(!html.includes("Kelemahan"));
  assert.ok(!html.includes("data-del"));
});

test("sidebarHTML mengelompokkan per kategori", () => {
  const html = sidebarHTML(
    [{ id: "1", nama: "A", kategori: "Lokasi" }, { id: "2", nama: "B", kategori: "Karakter" }],
    "2",
    false
  );
  assert.ok(html.indexOf("Karakter") < html.indexOf("Lokasi"));
  assert.ok(html.includes('href="#/e/2"'));
});

test("formFieldsHTML memuat semua field schema", () => {
  const html = formFieldsHTML();
  for (const key of EDITABLE_KEYS) assert.ok(html.includes(`name="${key}"`), key);
});
