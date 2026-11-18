/* =========================================================
   THE VELMORIC CODEX — sfx.js
   Efek suara klik + animasi sentuh (riak & denyut).

   - Suara disintesis langsung lewat WebAudio, jadi tidak ada
     file audio yang perlu diunduh (ringan & bisa offline).
   - Pembaca bisa mematikan suara lewat tombol di topbar;
     pilihannya diingat di browser (prefs.sound).
   - Aman bila WebAudio tidak ada: semua fungsi diam saja.
========================================================= */

import { getPrefs, setPref } from "./library.js";
import { $ } from "./utils.js";

const VOLUME = 0.16; // volume master (0–1); sengaja kecil agar lembut

// Elemen yang mengeluarkan suara saat diklik.
const CLICKABLE = [
  ".btn", ".icon-btn", ".player-btn", ".modal-close", ".lightbox-nav",
  ".side-link", ".brand", ".card", ".portal", ".mini-card", ".tl-card",
  ".chip", "a.tag", ".threat-step", ".map-marker", ".gallery-item",
  "[data-action]", "[data-open]", "[data-category]", "[data-era]", "[data-threat]"
].join(",");

// Elemen yang mendapat riak cahaya di titik sentuh.
const RIPPLE = ".btn, .icon-btn";

// Elemen yang mendapat denyut kecil saat diklik.
const PULSE = ".card, .portal, .mini-card, .tl-card, .chip, .threat-step";

const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");

let ctx = null;
let master = null;
let enabled = true;
let lastAt = 0;

// =========================================================
// AUDIO
// =========================================================

function audio() {
  if (ctx) return ctx;

  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;

  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = VOLUME;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }

  return ctx;
}

/** Satu nada pendek dengan envelope lembut. */
function tone({ freq, to = freq, type = "sine", start = 0, length = 0.09, gain = 1 }) {
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + length);

  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + length);

  osc.connect(amp).connect(master);
  osc.start(t0);
  osc.stop(t0 + length + 0.02);
}

/** Letupan derau singkat: memberi kesan "tik" yang tegas. */
function tick({ start = 0, length = 0.03, gain = 0.5, cutoff = 4200 } = {}) {
  const t0 = ctx.currentTime + start;
  const frames = Math.max(1, Math.floor(ctx.sampleRate * length));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();

  source.buffer = buffer;
  filter.type = "highpass";
  filter.frequency.value = cutoff;
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + length);

  source.connect(filter).connect(amp).connect(master);
  source.start(t0);
}

const SOUNDS = {
  // Klik umum: tik halus + nada kristal pendek.
  click() {
    tick({ gain: 0.35 });
    tone({ freq: 1150, to: 760, length: 0.07, gain: 0.55 });
  },

  // Tombol utama (Terbitkan, Masuk, + Tambah): dua nada naik, terasa "mewah".
  primary() {
    tick({ gain: 0.3 });
    tone({ freq: 660, length: 0.1, gain: 0.5 });
    tone({ freq: 990, start: 0.055, length: 0.16, gain: 0.45 });
  },

  // Navigasi & kartu: nada rendah, lembut.
  soft() {
    tick({ gain: 0.2, cutoff: 3000 });
    tone({ freq: 520, to: 420, length: 0.09, gain: 0.5 });
  },

  // Buka modal.
  open() {
    tone({ freq: 420, to: 640, length: 0.14, gain: 0.4 });
    tone({ freq: 840, start: 0.05, length: 0.12, gain: 0.25 });
  },

  // Tutup modal.
  close() {
    tone({ freq: 620, to: 380, length: 0.13, gain: 0.4 });
  },

  // Toggle suara dinyalakan: konfirmasi kecil.
  on() {
    tone({ freq: 784, length: 0.08, gain: 0.5 });
    tone({ freq: 1175, start: 0.06, length: 0.12, gain: 0.4 });
  }
};

export function playSound(name = "click") {
  if (!enabled) return;

  const context = audio();
  if (!context) return;

  if (context.state === "suspended") context.resume().catch(() => {});

  // Cegah dua suara menumpuk dalam sekejap (mis. klik ganda cepat).
  const now = performance.now();
  if (now - lastAt < 35) return;
  lastAt = now;

  try {
    (SOUNDS[name] || SOUNDS.click)();
  } catch {
    // Suara tidak boleh pernah merusak aplikasi.
  }
}

function soundFor(element) {
  if (element.matches(".btn.primary, #btnPublish, #btnAdd")) return "primary";
  if (element.matches(".side-link, .brand, .card, .portal, .mini-card, .tl-card")) return "soft";
  return "click";
}

// =========================================================
// ANIMASI SENTUH
// =========================================================

function ripple(element, event) {
  if (reduceMotion?.matches) return;

  const box = element.getBoundingClientRect();
  const dot = document.createElement("span");

  // Klik dari keyboard tidak punya koordinat: riak keluar dari tengah.
  const hasPoint = event.clientX || event.clientY;
  const x = hasPoint ? event.clientX - box.left : box.width / 2;
  const y = hasPoint ? event.clientY - box.top : box.height / 2;

  dot.className = "ripple";
  dot.style.left = `${x}px`;
  dot.style.top = `${y}px`;

  element.append(dot);
  dot.addEventListener("animationend", () => dot.remove(), { once: true });
}

function pulse(element) {
  if (reduceMotion?.matches) return;

  element.classList.remove("tap-pulse");
  void element.offsetWidth; // mulai ulang animasi
  element.classList.add("tap-pulse");
  element.addEventListener("animationend", () => element.classList.remove("tap-pulse"), { once: true });
}

function onClick(event) {
  const target = event.target.closest?.(CLICKABLE);
  if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") return;

  // Tombol suara punya bunyi sendiri (lihat setEnabled).
  if (target.id === "btnSound") return;

  const rippleTarget = target.closest(RIPPLE);
  if (rippleTarget) ripple(rippleTarget, event);

  const pulseTarget = target.closest(PULSE);
  if (pulseTarget) pulse(pulseTarget);

  playSound(soundFor(target));
}

// =========================================================
// TOMBOL SUARA
// =========================================================

function paintToggle() {
  const button = $("btnSound");
  if (!button) return;

  button.setAttribute("aria-pressed", String(enabled));
  button.setAttribute("aria-label", enabled ? "Matikan suara klik" : "Nyalakan suara klik");
  button.title = enabled ? "Suara klik: nyala" : "Suara klik: mati";
}

function setEnabled(value) {
  enabled = value;
  setPref("sound", value);
  paintToggle();

  // Beri bunyi konfirmasi hanya saat dinyalakan.
  if (value) playSound("on");
}

// =========================================================
// MODAL: bunyi buka/tutup tanpa mengubah ui.js
// =========================================================

function watchModals() {
  if (!("MutationObserver" in window)) return;

  const observer = new MutationObserver(records => {
    for (const record of records) {
      const modal = record.target;
      if (!modal.classList?.contains("modal-overlay")) continue;

      const was = record.oldValue?.split(/\s+/).includes("show");
      const now = modal.classList.contains("show");

      if (now && !was) playSound("open");
      else if (!now && was) playSound("close");
    }
  });

  document.querySelectorAll(".modal-overlay").forEach(modal => {
    observer.observe(modal, { attributes: true, attributeFilter: ["class"], attributeOldValue: true });
  });
}

// =========================================================
// MULAI
// =========================================================

export function initSfx() {
  enabled = getPrefs().sound !== false;
  paintToggle();

  $("btnSound")?.addEventListener("click", () => setEnabled(!enabled));

  // Browser baru boleh membunyikan audio setelah ada gestur pertama.
  const unlock = () => {
    const context = audio();
    if (context?.state === "suspended") context.resume().catch(() => {});
  };
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });

  // Capture: tetap berbunyi walau handler lain menghentikan penyebaran event.
  document.addEventListener("click", onClick, true);

  // Kartu dibuka dengan Enter/Spasi (tanpa event click): beri bunyi juga.
  document.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const card = event.target.closest?.(".card");
    if (card && event.target === card) {
      pulse(card);
      playSound("soft");
    }
  });

  watchModals();
}
