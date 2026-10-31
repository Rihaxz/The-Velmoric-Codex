/* =========================================================
   THE VELMORIC CODEX — editor.js
   Form entri. Dua mode:

     STAF (moderator/owner): tambah, edit, simpan draf, terbitkan.
     ANONIM (pembaca)      : hanya mengirim USULAN baru. Usulan
                             masuk antrean dan wajib disetujui
                             moderator sebelum menjadi draf.
========================================================= */

import * as Store from "./storage.js";
import { submitSubmission } from "./community.js";
import { isImageRef } from "./schema.js";
import { hydrateImages, imageTag, uploadImage } from "./media.js";
import { formFieldsHTML, galleryRowHTML, relationRowHTML } from "./views/form.js";
import { entryHref } from "./views/common.js";
import { friendlyError, go, guardClose, hide, onClose, setStatus, show, state } from "./ui.js";
import { $, esc } from "./utils.js";

const overlay = () => $("overlay");
const form = () => $("charForm");

let editingId = null;
let editingPoint = null;
let snapshot = "";

// =========================================================
// SETUP
// =========================================================

/** Bangun ulang field form (dipanggil saat kategori atau peran berubah). */
export function buildForm() {
  $("formFields").innerHTML = formFieldsHTML(Store.getCategories(state.settings), { isStaff: state.isAdmin });
}

function refreshDatalists() {
  $("entryOptions").innerHTML = Store.getEntries()
    .map(entry => `<option value="${esc(entry.nama)}">`).join("");

  $("eraOptions").innerHTML = Store.distinctValues("era")
    .map(era => `<option value="${esc(era)}">`).join("");
}

/** Tampilkan hanya field yang relevan untuk kategori terpilih. */
function applyCategoryVisibility() {
  const category = form().elements.kategori.value;

  for (const element of form().querySelectorAll("[data-cats]")) {
    const cats = element.dataset.cats.split("|");
    const input = element.querySelector("input, select, textarea");
    // Field yang sudah berisi tetap tampil agar data tidak "hilang".
    element.hidden = !cats.includes(category) && !input?.value;
  }
}

// =========================================================
// SNAPSHOT (deteksi perubahan belum disimpan)
// =========================================================

function collect() {
  const data = Object.fromEntries(new FormData(form()));
  delete data[""];

  data.relasi = [...$("relationRows").querySelectorAll(".rel-row")].map(row => {
    const name = row.querySelector("[data-rel-name]").value.trim();
    return { tipe: row.querySelector("[data-rel-type]").value, name, id: Store.findByName(name)?.id || "" };
  }).filter(rel => rel.name);

  data.galeri = [...$("galleryRows").querySelectorAll(".gallery-row")].map(row => ({
    src: row.dataset.src,
    caption: row.querySelector("[data-caption]").value
  }));

  data.peta = editingPoint;
  return data;
}

const takeSnapshot = () => JSON.stringify(collect());
export const isDirty = () => overlay().classList.contains("show") && takeSnapshot() !== snapshot;

// =========================================================
// BARIS RELASI & GALERI
// =========================================================

function addRelationRow(rel) {
  $("relationRows").insertAdjacentHTML(
    "beforeend",
    relationRowHTML(rel, id => Store.getEntry(id)?.nama || "")
  );
}

function addGalleryRow(item) {
  $("galleryRows").insertAdjacentHTML("beforeend", galleryRowHTML(item, imageTag(item.src, "")));
  hydrateImages($("galleryRows"));
}

function updatePreview(ref) {
  const preview = $("fotoPreview");
  const valid = isImageRef(ref);

  preview.hidden = !valid;
  if (!valid) return;

  preview.outerHTML = imageTag(ref, "Pratinjau gambar", 'id="fotoPreview"');
  hydrateImages(form());
}

// =========================================================
// MODE & TOMBOL
// =========================================================

/** Sesuaikan label tombol dengan peran dan kondisi entri. */
function applyModeLabels(entry) {
  const staff = state.isAdmin;

  $("btnDraft").hidden = !staff;
  $("btnPublish").hidden = false;

  if (!staff) {
    $("btnPublish").textContent = "Kirim Usulan";
    return;
  }

  $("btnPublish").textContent = entry && !entry._draft ? "Simpan & Terbit" : "Terbitkan";
  $("btnDraft").textContent = entry && !entry._draft ? "Tarik ke Draf" : "Simpan Draf";
}

// =========================================================
// BUKA / SIMPAN
// =========================================================

export function openForm(id = null, preset = {}) {
  // Anonim hanya boleh membuka form baru (usulan), bukan mengedit.
  if (id && !state.isAdmin) return;
  if (!state.isAdmin && state.role === "none") return;

  const entry = id ? Store.getEntry(id) : null;
  const select = form().elements.kategori;

  editingId = entry?.id || null;
  editingPoint = entry?.peta || null;

  form().reset();
  select.querySelectorAll("[data-custom]").forEach(option => option.remove());
  $("relationRows").innerHTML = "";
  $("galleryRows").innerHTML = "";
  $("galleryUrl").value = "";
  refreshDatalists();

  $("modalTitle").textContent = entry
    ? `Edit: ${entry.nama}`
    : state.isAdmin ? "Tambah Entri" : "Usulkan Entri Baru";
  applyModeLabels(entry);

  const values = entry || preset;

  // Kategori lama di luar daftar tetap bisa dipilih.
  if (values.kategori && ![...select.options].some(option => option.value === values.kategori)) {
    const option = new Option(values.kategori);
    option.dataset.custom = "";
    select.add(option);
  }

  for (const element of form().elements) {
    if (!element.name || !(element.name in values)) continue;
    element.value = element.name === "tags"
      ? (values.tags || []).join(", ")
      : values[element.name] ?? "";
  }

  (entry?.relasi || []).forEach(addRelationRow);
  (entry?.galeri || []).forEach(addGalleryRow);

  updatePreview(form().elements.foto.value);
  applyCategoryVisibility();
  snapshot = takeSnapshot();

  show(overlay());
  form().elements.nama.focus();
}

async function submit(draft) {
  const data = collect();
  const unknown = data.relasi.filter(rel => !rel.id);

  if (unknown.length) {
    setStatus(`Entri untuk hubungan “${unknown[0].name}” tidak ditemukan. Periksa ejaan nama.`, true);
    return;
  }

  if (editingId && data.relasi.some(rel => rel.id === editingId)) {
    setStatus("Entri tidak bisa berhubungan dengan dirinya sendiri.", true);
    return;
  }

  const buttons = overlay().querySelectorAll(".modal-actions button");
  buttons.forEach(button => (button.disabled = true));

  try {
    // Anonim: kirim sebagai usulan, tidak menyentuh arsip.
    if (!state.isAdmin) {
      await submitSubmission(data);
      hide(overlay(), { force: true });
      setStatus("Usulan terkirim. Moderator akan meninjaunya sebelum menjadi draf.");
      return;
    }

    const saved = editingId
      ? await Store.updateEntry(editingId, data, { draft })
      : await Store.createEntry(data, { draft });

    hide(overlay(), { force: true });
    setStatus(draft ? "Draf disimpan (hanya terlihat oleh staf)." : "Entri diterbitkan.");
    go(entryHref(saved.id));
  } catch (error) {
    setStatus(friendlyError(error, state.isAdmin ? "Gagal menyimpan entri." : "Gagal mengirim usulan."), true);
  } finally {
    buttons.forEach(button => (button.disabled = false));
  }
}

// =========================================================
// TOOLBAR FORMAT
// =========================================================

function applyFormat(textarea, command) {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end);

  const wrap = (before, after = before, placeholder = "teks") => {
    const inner = selected || placeholder;
    textarea.setRangeText(before + inner + after, start, end, "end");
    if (!selected) textarea.setSelectionRange(start + before.length, start + before.length + inner.length);
  };

  const prefixLines = prefix => {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const block = value.slice(lineStart, end) || "teks";
    textarea.setRangeText(block.split("\n").map(line => prefix + line).join("\n"), lineStart, end, "end");
  };

  switch (command) {
    case "bold": wrap("**"); break;
    case "italic": wrap("*"); break;
    case "spoiler": wrap("||"); break;
    case "link": wrap("[[", "]]", "Nama Entri"); break;
    case "heading": prefixLines("## "); break;
    case "quote": prefixLines("> "); break;
    case "list": prefixLines("- "); break;
  }

  textarea.focus();
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

// =========================================================
// UPLOAD (hanya staf)
// =========================================================

async function handleUpload(input) {
  const files = [...input.files];
  input.value = "";
  if (!files.length || !state.isAdmin) return;

  setStatus(files.length > 1 ? `Mengompres & mengunggah ${files.length} gambar…` : "Mengompres & mengunggah gambar…");

  try {
    for (const file of files) {
      const ref = await uploadImage(file);

      if (input.dataset.upload === "foto") {
        form().elements.foto.value = ref;
        updatePreview(ref);
      } else {
        addGalleryRow({ src: ref, caption: "" });
      }
    }

    setStatus("Gambar terunggah.");
  } catch (error) {
    setStatus(friendlyError(error, "Upload gagal."), true);
  }
}

// =========================================================
// EVENT
// =========================================================

export function bindEditor() {
  guardClose(overlay(), () => !isDirty() || confirm("Buang perubahan yang belum disimpan?"));
  onClose(overlay(), () => {
    editingId = null;
  });

  form().addEventListener("submit", event => {
    event.preventDefault();
    submit(event.submitter?.id === "btnDraft");
  });

  form().addEventListener("change", event => {
    if (event.target.name === "kategori") applyCategoryVisibility();
    if (event.target.matches("[data-upload]")) handleUpload(event.target);
  });

  form().addEventListener("input", event => {
    if (event.target.id === "fotoUrlInput") updatePreview(event.target.value.trim());
  });

  form().addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.md) {
      applyFormat($(button.dataset.target), button.dataset.md);
    } else if (button.dataset.action === "add-relation") {
      addRelationRow({ tipe: "terkait" });
      $("relationRows").lastElementChild.querySelector("input").focus();
    } else if (button.dataset.action === "remove-row") {
      button.closest(".rel-row, .gallery-row")?.remove();
    } else if (button.dataset.action === "add-gallery-url") {
      const url = $("galleryUrl").value.trim();
      if (!isImageRef(url)) return setStatus("URL gambar harus diawali http:// atau https://", true);
      addGalleryRow({ src: url, caption: "" });
      $("galleryUrl").value = "";
    }
  });

  $("closeModal").addEventListener("click", () => hide(overlay()));
  $("cancelBtn").addEventListener("click", () => hide(overlay()));
}
