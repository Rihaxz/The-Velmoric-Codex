/* =========================================================
   THE VELMORIC CODEX — relations.js
   Menghitung hubungan dua arah dan silsilah keluarga.

   Relasi hanya perlu dicatat di SATU sisi. Jika A mencatat
   "B adalah Guru dari A", halaman B otomatis menampilkan
   "A adalah Murid".
========================================================= */

import { RELATION_TYPES, SECTIONS } from "./schema.js";
import { linkedNames } from "./markup.js";
import { getEntries, getEntry, getReverseRelations, findByName } from "./storage.js";

/** Semua hubungan entri: [{ entry, tipe }] tanpa duplikat. */
export function relationsOf(entry) {
  const seen = new Set();
  const result = [];

  const push = (id, tipe) => {
    const other = getEntry(id);
    const key = `${tipe}:${id}`;
    if (!other || other.id === entry.id || seen.has(key)) return;
    seen.add(key);
    result.push({ entry: other, tipe });
  };

  for (const rel of entry.relasi || []) push(rel.id, rel.tipe);

  for (const rel of getReverseRelations(entry.id)) {
    const reverse = RELATION_TYPES[rel.tipe]?.reverse;
    if (reverse) push(rel.from, reverse);
  }

  return result;
}

/** Hubungan dikelompokkan per jenis, sesuai urutan RELATION_TYPES. */
export function groupedRelations(entry) {
  const groups = new Map();

  for (const item of relationsOf(entry)) {
    if (!groups.has(item.tipe)) groups.set(item.tipe, []);
    groups.get(item.tipe).push(item.entry);
  }

  return Object.keys(RELATION_TYPES)
    .filter(tipe => groups.has(tipe))
    .map(tipe => ({ tipe, label: RELATION_TYPES[tipe].label, entries: groups.get(tipe) }));
}

const ofType = (entry, tipe) =>
  relationsOf(entry).filter(item => item.tipe === tipe).map(item => item.entry);

/**
 * Silsilah: kakek-nenek -> orang tua -> (saudara, diri, pasangan) -> anak -> cucu.
 * Mengembalikan null jika tidak ada data keluarga sama sekali.
 */
export function familyTree(entry) {
  const parents = ofType(entry, "orangtua");
  const grandparents = unique(parents.flatMap(parent => ofType(parent, "orangtua")));
  const spouses = ofType(entry, "pasangan");
  const children = unique([
    ...ofType(entry, "anak"),
    ...spouses.flatMap(spouse => ofType(spouse, "anak"))
  ]);
  const grandchildren = unique(children.flatMap(child => ofType(child, "anak")));
  const siblings = unique([
    ...ofType(entry, "saudara"),
    ...parents.flatMap(parent => ofType(parent, "anak"))
  ]).filter(item => item.id !== entry.id);

  if (!parents.length && !spouses.length && !children.length && !siblings.length) return null;

  return { grandparents, parents, siblings, self: entry, spouses, children, grandchildren };
}

function unique(list) {
  const seen = new Set();
  return list.filter(item => !seen.has(item.id) && seen.add(item.id));
}

/** Entri lain yang menyebut entri ini lewat [[Nama]] di teksnya. */
export function backlinksOf(entry) {
  const name = entry.nama;

  return getEntries().filter(other => {
    if (other.id === entry.id) return false;

    return SECTIONS.some(section =>
      linkedNames(other[section.key]).some(linked => findByName(linked)?.id === entry.id || linked === name)
    );
  });
}
