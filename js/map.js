/* =========================================================
   THE VELMORIC CODEX — map.js
   Interaksi halaman peta: popup penanda, mode edit admin
   (klik untuk menempatkan, klik penanda untuk menghapus),
   dan ganti gambar peta.
========================================================= */

import * as Store from "./storage.js";
import { uploadImage } from "./media.js";
import { mapPopupHTML } from "./views/pages.js";
import { friendlyError, render, setStatus, state } from "./ui.js";
import { hydrateImages } from "./media.js";

export function mapView() {
  const entries = Store.getEntries();

  return {
    image: state.settings.petaGambar,
    markers: entries.filter(entry => entry.peta),
    // Lokasi & kerajaan didahulukan, tapi entri apa pun boleh ditempatkan.
    placeable: [...entries].sort((a, b) => rank(a) - rank(b)),
    isAdmin: state.isAdmin,
    editing: state.isAdmin && state.map.editing,
    selectedId: state.map.selectedId,
    focusId: state.route.params.get("fokus") || "",
    loading: state.loading
  };
}

const rank = entry => (["Lokasi", "Kerajaan"].includes(entry.kategori) ? 0 : 1);

function openPopup(id) {
  const popup = document.querySelector("[data-map-popup]");
  const entry = Store.getEntry(id);
  if (!popup || !entry) return;

  popup.innerHTML = mapPopupHTML(entry);
  popup.hidden = false;
  hydrateImages(popup);
}

async function placeMarker(event, canvas) {
  const id = state.map.selectedId;
  if (!id) return setStatus("Pilih entri dulu di daftar “Tempatkan”, lalu klik peta.", true);

  const rect = canvas.getBoundingClientRect();
  const point = {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100
  };

  try {
    await Store.patchEntry(id, { peta: point });
    setStatus(`Penanda “${Store.getEntry(id)?.nama}” ditempatkan.`);
    state.map.selectedId = "";
    render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menyimpan penanda."), true);
  }
}

async function removeMarker(id) {
  const entry = Store.getEntry(id);
  if (!entry || !confirm(`Hapus penanda “${entry.nama}” dari peta?`)) return;

  try {
    await Store.patchEntry(id, { peta: null });
    render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal menghapus penanda."), true);
  }
}

async function replaceMapImage(input) {
  const file = input.files[0];
  input.value = "";
  if (!file) return;

  setStatus("Mengompres & mengunggah peta…");

  try {
    // Peta boleh lebih tajam dari gambar biasa.
    const ref = await uploadImage(file, { maxSide: 2400 });
    state.settings = await Store.saveSettings({ ...state.settings, petaGambar: ref });
    setStatus("Gambar peta diperbarui.");
    render();
  } catch (error) {
    setStatus(friendlyError(error, "Gagal mengganti peta."), true);
  }
}

export function bindMap() {
  document.addEventListener("click", event => {
    if (state.route.name !== "peta") return;

    const marker = event.target.closest("[data-marker]");
    const canvas = event.target.closest("[data-map-canvas]");

    if (event.target.closest('[data-action="close-popup"]')) {
      document.querySelector("[data-map-popup]").hidden = true;
      return;
    }

    if (event.target.closest('[data-action="map-edit"]')) {
      state.map.editing = !state.map.editing;
      state.map.selectedId = "";
      render();
      return;
    }

    if (marker) {
      event.stopPropagation();
      if (state.isAdmin && state.map.editing) removeMarker(marker.dataset.marker);
      else openPopup(marker.dataset.marker);
      return;
    }

    if (canvas && state.isAdmin && state.map.editing) placeMarker(event, canvas);
  });

  document.addEventListener("change", event => {
    if (state.route.name !== "peta") return;

    if (event.target.matches("[data-map-select]")) state.map.selectedId = event.target.value;
    if (event.target.matches('[data-upload="map"]')) replaceMapImage(event.target);
  });
}

/** Setelah render: buka popup entri yang difokuskan (?fokus=ID). */
export function afterMapRender() {
  const focus = state.route.params.get("fokus");
  if (focus) {
    openPopup(focus);
    document.querySelector(`[data-marker="${CSS.escape(focus)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}
