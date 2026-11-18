/* =========================================================
   THE VELMORIC CODEX — motion.js
   Animasi halus yang tidak mengubah logika aplikasi:

   1. Layar pembuka (splash) saat arsip dimuat.
   2. Bar progres tipis di atas layar saat pindah halaman.
   3. Elemen di bawah layar muncul pelan-pelan saat digulir.
   4. Cahaya lembut mengikuti kursor di atas kartu & panel.

   Semua efek mati otomatis bila perangkat memilih
   "kurangi gerak" (prefers-reduced-motion), dan tidak pernah
   menyembunyikan konten secara permanen.
========================================================= */

import { $ } from "./utils.js";

const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");

// =========================================================
// 1. SPLASH
// =========================================================

const SPLASH_MIN_MS = 1100;   // minimal tampil (dihitung sejak halaman mulai dimuat)
const SPLASH_MAX_MS = 8000;   // batas aman bila data tak kunjung selesai

let splashDone = false;

/** Tutup layar pembuka dengan transisi halus. Aman dipanggil berkali-kali. */
export function hideSplash() {
  if (splashDone) return;
  splashDone = true;

  const splash = $("splash");

  if (!splash) {
    document.body.classList.remove("splashing");
    return;
  }

  const wait = Math.max(0, SPLASH_MIN_MS - performance.now());

  setTimeout(() => {
    splash.classList.add("splash-hide");
    document.body.classList.remove("splashing");
    setTimeout(() => splash.remove(), 1000);
  }, wait);
}

// =========================================================
// 2. BAR PROGRES RUTE
// =========================================================

let bar = null;
let fill = null;
let progressTimer = null;

function ensureBar() {
  if (bar) return;

  bar = document.createElement("div");
  bar.className = "route-progress";
  bar.setAttribute("aria-hidden", "true");

  fill = document.createElement("i");
  bar.append(fill);
  document.body.append(bar);
}

function startProgress() {
  if (reduceMotion?.matches || !splashDone) return;

  ensureBar();
  clearTimeout(progressTimer);

  fill.style.transition = "none";
  fill.style.transform = "scaleX(0)";
  bar.style.opacity = "1";
  void fill.offsetWidth; // paksa gambar ulang sebelum animasi mulai

  fill.style.transition = "transform 1.2s cubic-bezier(.1, .7, .2, 1)";
  fill.style.transform = "scaleX(.8)";

  // Bila tak ada pergantian halaman sungguhan, selesai sendiri.
  progressTimer = setTimeout(endProgress, 700);
}

function endProgress() {
  if (!bar) return;

  clearTimeout(progressTimer);

  fill.style.transition = "transform .25s ease";
  fill.style.transform = "scaleX(1)";

  progressTimer = setTimeout(() => {
    bar.style.opacity = "0";
  }, 280);
}

// =========================================================
// 3. MUNCUL SAAT DIGULIR
// =========================================================

// Hanya blok besar. Kartu, portal, dan kartu mini sudah punya animasi sendiri.
const REVEAL = [
  ".section", ".infobox", ".toc", ".panel", ".shelf", ".lore-of-day", ".era",
  ".stat", ".tree", ".codex-intro", ".archive-heading", ".gallery", ".comments"
].join(",");

let observer = null;

function onIntersect(entries) {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;

    const element = entry.target;

    observer.unobserve(element);
    element.classList.add("reveal-in");

    // Lepas kelas setelah selesai agar transisi hover bawaan elemen pulih.
    setTimeout(() => element.classList.remove("reveal", "reveal-in"), 1100);
  }
}

function armReveals() {
  if (!("IntersectionObserver" in window) || reduceMotion?.matches) return;

  const main = $("main");
  if (!main) return;

  observer?.disconnect();
  observer = new IntersectionObserver(onIntersect, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });

  const fold = window.innerHeight * 0.92;
  let order = 0;

  for (const element of main.querySelectorAll(REVEAL)) {
    if (element.parentElement?.closest(".reveal")) continue;   // jangan bertumpuk
    if (element.getBoundingClientRect().top < fold) continue;  // yang sudah terlihat tak perlu

    element.style.setProperty("--d", `${(order++ % 4) * 70}ms`);
    element.classList.add("reveal");
    observer.observe(element);
  }
}

/** Pantau #main: efek dipasang hanya saat halaman baru (bukan tiap render ulang). */
function watchMain() {
  const main = $("main");
  if (!main || !("MutationObserver" in window)) return;

  new MutationObserver(records => {
    // app.js memasang ulang kelas "view-enter" hanya saat berpindah halaman.
    const routeChanged = records.some(record => record.type === "attributes");

    // Isi asli menggantikan kerangka pemuatan (skeleton).
    const replacedSkeleton = records.some(record =>
      [...record.removedNodes].some(node => node.classList?.contains("skeleton")));

    if (!routeChanged && !replacedSkeleton) return;

    requestAnimationFrame(() => {
      armReveals();
      if (routeChanged) endProgress();
    });
  }).observe(main, { childList: true, attributes: true, attributeFilter: ["class"] });
}

// =========================================================
// 4. SPOTLIGHT KURSOR
// =========================================================

const SPOT = ".card, .portal, .mini-card, .panel, .tl-card";

function watchPointer() {
  if (!window.matchMedia?.("(hover: hover)").matches) return;

  let frame = 0;
  let last = null;

  document.addEventListener("pointermove", event => {
    if (event.pointerType === "touch") return;

    last = event;
    if (frame) return;

    frame = requestAnimationFrame(() => {
      frame = 0;

      const target = last.target.closest?.(SPOT);
      if (!target) return;

      const box = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${last.clientX - box.left}px`);
      target.style.setProperty("--my", `${last.clientY - box.top}px`);
    });
  }, { passive: true });
}

// =========================================================
// MULAI
// =========================================================

export function initMotion() {
  // Pengaman: layar pembuka tidak boleh menutup situs selamanya.
  setTimeout(hideSplash, SPLASH_MAX_MS);

  watchMain();
  watchPointer();

  window.addEventListener("hashchange", startProgress);
}
