import { test } from "node:test";
import assert from "node:assert/strict";

import {
  STARTERS, COLOR_FIELDS, MAX_THEMES, PALETTE_VARS,
  isHex, mix, lighten, darken, contrast, derivePalette, contrastIssues,
  slugify, uniqueId, normalizeThemes, themeForMode
} from "../js/theme-core.js";
import { normalizeSettings } from "../js/storage.js";
import { themeStudioHTML } from "../js/views/theme.js";
import { ownerSectionsHTML } from "../js/views/owner.js";

test("isHex: hanya #rrggbb", () => {
  assert.ok(isHex("#a1B2c3"));
  assert.ok(!isHex("#abc"));
  assert.ok(!isHex("red"));
  assert.ok(!isHex(null));
});

test("mix/lighten/darken", () => {
  assert.equal(mix("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(lighten("#000000", 1), "#ffffff");
  assert.equal(darken("#ffffff", 1), "#000000");
});

test("contrast: hitam-putih 21, sama 1", () => {
  assert.ok(Math.abs(contrast("#000000", "#ffffff") - 21) < 0.01);
  assert.ok(Math.abs(contrast("#777777", "#777777") - 1) < 0.01);
});

test("derivePalette: menghasilkan semua variabel dan teks aksen terbaca", () => {
  for (const mode of ["gelap", "terang"]) {
    const vars = derivePalette(STARTERS[mode], mode);
    assert.deepEqual(Object.keys(vars).sort(), [...PALETTE_VARS].sort());
    assert.ok(contrast(vars["--gold"], vars["--on-accent"]) >= 4.5, mode);
  }
});

test("derivePalette: warna rusak diganti bawaan", () => {
  const vars = derivePalette({ bg: "bukan-warna", aksen: "#112233" }, "gelap");
  assert.equal(vars["--bg"], STARTERS.gelap.bg);
  assert.equal(vars["--gold"], "#112233");
});

test("contrastIssues: bawaan aman, teks=latar bermasalah", () => {
  assert.deepEqual(contrastIssues(STARTERS.gelap, "gelap"), []);
  assert.deepEqual(contrastIssues(STARTERS.terang, "terang"), []);
  assert.ok(contrastIssues({ ...STARTERS.gelap, text: "#0e0e14" }, "gelap").length > 0);
});

test("slugify & uniqueId", () => {
  assert.equal(slugify("  Malam Emas! "), "malam-emas");
  assert.equal(slugify("Ünïcode"), "unicode");
  assert.equal(uniqueId("Malam", new Set(["malam", "malam-2"])), "malam-3");
  assert.equal(uniqueId("!!!", new Set()), "tema");
});

test("normalizeThemes: input sampah -> kosong", () => {
  const empty = { daftar: [], gelap: "", terang: "" };
  assert.deepEqual(normalizeThemes(undefined), empty);
  assert.deepEqual(normalizeThemes("x"), empty);
  assert.deepEqual(normalizeThemes({ daftar: "x" }), empty);
});

test("normalizeThemes: bersihkan nama, mode, warna, id duplikat", () => {
  const out = normalizeThemes({
    daftar: [
      { id: "a", nama: "  Satu ", dasar: "terang", warna: { bg: "#ffffff", text: "zzz" } },
      { id: "a", nama: "Dua", dasar: "ngawur" },
      { nama: "   " },
      null
    ],
    gelap: "a",
    terang: "a"
  });

  assert.equal(out.daftar.length, 2);
  assert.equal(out.daftar[0].nama, "Satu");
  assert.equal(out.daftar[0].dasar, "terang");
  assert.equal(out.daftar[0].warna.bg, "#ffffff");
  assert.equal(out.daftar[0].warna.text, STARTERS.terang.text);
  assert.notEqual(out.daftar[0].id, out.daftar[1].id);
  assert.equal(out.daftar[1].dasar, "gelap");

  // "a" bertema terang: sah untuk slot terang, ditolak untuk slot gelap.
  assert.equal(out.terang, "a");
  assert.equal(out.gelap, "");
});

test("normalizeThemes: batas jumlah tema", () => {
  const daftar = Array.from({ length: MAX_THEMES + 5 }, (_, i) => ({ nama: `T${i}` }));
  assert.equal(normalizeThemes({ daftar }).daftar.length, MAX_THEMES);
});

test("themeForMode", () => {
  const cfg = normalizeThemes({ daftar: [{ id: "m", nama: "M", dasar: "gelap" }], gelap: "m" });
  assert.equal(themeForMode(cfg, "gelap").id, "m");
  assert.equal(themeForMode(cfg, "terang"), null);
  assert.equal(themeForMode(undefined, "gelap"), null);
});

test("normalizeSettings membawa temaKustom (dan aman untuk data lama)", () => {
  assert.deepEqual(normalizeSettings({}).temaKustom, { daftar: [], gelap: "", terang: "" });

  const out = normalizeSettings({ temaKustom: { daftar: [{ nama: "Fajar", dasar: "terang" }] } });
  assert.equal(out.temaKustom.daftar[0].id, "fajar");
});

test("themeStudioHTML: daftar, slot, editor, dan escape", () => {
  const settings = {
    temaKustom: normalizeThemes({ daftar: [{ id: "x", nama: "<b>X</b>", dasar: "gelap" }], gelap: "x" })
  };

  const list = themeStudioHTML(settings, null);
  assert.ok(list.includes("data-theme-slot=\"gelap\""));
  assert.ok(list.includes("data-action=\"theme-new\""));
  assert.ok(!list.includes("<b>X</b>"));
  assert.ok(list.includes("&lt;b&gt;X&lt;/b&gt;"));

  const draft = { id: "", nama: "Baru", dasar: "gelap", warna: { ...STARTERS.gelap }, isNew: true };
  const editor = themeStudioHTML(settings, draft);
  assert.ok(editor.includes("data-form=\"theme\""));
  for (const { key } of COLOR_FIELDS) assert.ok(editor.includes(`data-theme-color="${key}"`), key);
});

test("themeStudioHTML: tanpa temaKustom tetap aman", () => {
  assert.ok(themeStudioHTML({}, null).includes("Belum ada tema kustom"));
});

test("ownerSectionsHTML memuat Studio Tema", () => {
  const html = ownerSectionsHTML({
    staff: [], settings: { musicUrls: [], kategoriTambahan: [] }, categories: [], currentUid: "o"
  });
  assert.ok(html.includes("Studio Tema"));
});
