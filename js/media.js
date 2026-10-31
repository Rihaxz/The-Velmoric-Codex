/* =========================================================
   THE VELMORIC CODEX — media.js
   Upload & tampilan gambar.

   Gambar dikompres di browser (maks. 1600 px, WebP/JPEG)
   lalu disimpan di Firestore koleksi `media`, sehingga tetap
   gratis di paket Spark (tanpa Firebase Storage).
   Entri menyimpan referensi "media:<id>" atau URL biasa.

   Optimasi: gambar Firestore hanya diambil saat mendekati
   area layar (lazy load via IntersectionObserver).
========================================================= */

import { resolveImage, saveMedia } from "./storage.js";
import { esc } from "./utils.js";

const MAX_SIDE = 1600;
// Panjang data URL maksimum; dokumen Firestore dibatasi 1 MiB.
const MAX_CHARS = 950_000;
const PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

/** HTML <img> untuk URL maupun referensi media. */
export function imageTag(ref, alt = "", attrs = "") {
  const text = String(ref || "");

  if (text.startsWith("media:")) {
    return `<img data-media="${esc(text)}" alt="${esc(alt)}" decoding="async" ${attrs} src="${PLACEHOLDER}">`;
  }

  return `<img src="${esc(text)}" alt="${esc(alt)}" loading="lazy" decoding="async" ${attrs}
            onerror="this.style.display='none'">`;
}

function loadImage(img) {
  const ref = img.dataset.media;
  if (!ref) return;

  img.removeAttribute("data-media");

  resolveImage(ref)
    .then(url => {
      if (url) img.src = url;
      else img.style.display = "none";
    })
    .catch(() => (img.style.display = "none"));
}

const observer = typeof IntersectionObserver === "function"
  ? new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        loadImage(entry.target);
      }
    }, { rootMargin: "240px" })
  : null;

/** Isi <img data-media> di dalam `root` saat terlihat (atau langsung bila tidak didukung). */
export function hydrateImages(root = document) {
  for (const img of root.querySelectorAll("img[data-media]")) {
    if (observer) observer.observe(img);
    else loadImage(img);
  }
}

function loadBitmap(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("File bukan gambar yang bisa dibaca."));
    };
    img.src = url;
  });
}

function encode(canvas, quality) {
  const webp = canvas.toDataURL("image/webp", quality);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality);
}

/** Kompres gambar sampai muat dalam satu dokumen Firestore. */
export async function compressImage(file, maxSide = MAX_SIDE) {
  if (!file?.type?.startsWith("image/")) throw new Error("Pilih file gambar (JPG, PNG, WebP).");

  const img = await loadBitmap(file);
  let side = maxSide;

  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);

    for (const quality of [0.85, 0.72, 0.6]) {
      const dataUrl = encode(canvas, quality);
      if (dataUrl.length <= MAX_CHARS) return { dataUrl, width, height, name: file.name };
    }

    side = Math.round(side * 0.75);
  }

  throw new Error("Gambar terlalu besar walau sudah dikompres.");
}

/** Kompres + simpan. Mengembalikan referensi "media:<id>". Hanya staf. */
export async function uploadImage(file, options) {
  const compressed = await compressImage(file, options?.maxSide);
  return saveMedia(compressed);
}
