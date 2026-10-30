/* =========================================================
   THE VELMORIC CODEX — markup.js
   Format teks ringan untuk isi artikel. Aman: teks selalu
   di-escape DULU, baru diberi format.

     **tebal**        *miring*
     ## Subjudul      > kutipan
     - daftar         ||spoiler||
     [[Nama Entri]]   [[Nama Entri|teks tampilan]]
========================================================= */

import { esc } from "./utils.js";

const WIKI_LINK = /\[\[([^\]|]{1,200})(?:\|([^\]]{1,200}))?\]\]/g;

/**
 * @param {string} text  teks mentah dari database
 * @param {(name:string)=>({id:string}|null)} resolve  cari entri dari nama
 */
export function renderMarkup(text, resolve = () => null) {
  const lines = esc(text).split(/\r?\n/);
  const html = [];
  let list = false;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${paragraph.join("<br>")}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (list) html.push("</ul>");
    list = false;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    let match;

    if ((match = line.match(/^#{2,3}\s+(.+)$/))) {
      flushParagraph();
      closeList();
      html.push(`<h3 class="md-h">${inline(match[1], resolve)}</h3>`);
    } else if ((match = line.match(/^&gt;\s?(.*)$/))) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${inline(match[1], resolve)}</blockquote>`);
    } else if ((match = line.match(/^[-*]\s+(.+)$/))) {
      flushParagraph();
      if (!list) html.push("<ul>");
      list = true;
      html.push(`<li>${inline(match[1], resolve)}</li>`);
    } else {
      closeList();
      paragraph.push(inline(line, resolve));
    }
  }

  flushParagraph();
  closeList();

  return html.join("");
}

function inline(text, resolve) {
  return text
    .replace(WIKI_LINK, (_, name, label) => {
      const target = resolve(name.trim());
      const shown = (label || name).trim();

      return target
        ? `<a class="wiki-link" href="#/e/${encodeURIComponent(target.id)}">${shown}</a>`
        : `<span class="wiki-missing" title="Entri belum ada">${shown}</span>`;
    })
    .replace(/\|\|(.+?)\|\|/g, '<span class="spoiler" tabindex="0" title="Klik untuk membuka spoiler">$1</span>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, "$1<em>$2</em>");
}

/** Teks polos (tanpa sintaks) untuk cuplikan & pencarian. */
export function plainText(text) {
  return String(text || "")
    .replace(WIKI_LINK, (_, name, label) => (label || name).trim())
    .replace(/\|\|(.+?)\|\|/g, "[spoiler]")
    .replace(/\*\*|\*|^#{2,3}\s+|^>\s?|^[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Nama-nama entri yang ditautkan dari sebuah teks. */
export function linkedNames(text) {
  const names = [];
  for (const match of String(text || "").matchAll(WIKI_LINK)) names.push(match[1].trim());
  return names;
}
