/* =========================================================
   THE VELMORIC CODEX — music-player.js
   Pemutar musik latar.

   Aturan akses:
     - Pemutar (kontrol & tampilan) hanya terlihat untuk
       MODERATOR dan OWNER. Pembaca anonim tidak melihatnya.
     - Hanya moderator & owner yang bisa memutar, menjeda,
       atau mematikan musik.
     - MUSIC_FOR_READERS menentukan apakah musik tetap
       berputar untuk pembaca anonim (tanpa kontrol).
       Ubah ke false bila musik tidak boleh terdengar sama sekali.
========================================================= */

import { $ } from "./utils.js";

const MUSIC_FOR_READERS = true;

const audio = $("bgMusic");
const player = $("musicPlayer");
const title = $("trackTitle");
const playButton = $("btnPlayPause");
const prevButton = $("btnPrevTrack");
const nextButton = $("btnNextTrack");
const stopButton = $("btnStopTrack");
const progress = $("progressBar");
const fill = $("progressFill");
const iconPlay = $("iconPlay");
const iconPause = $("iconPause");
const timeCurrent = $("timeCurrent");
const timeTotal = $("timeTotal");

let playlist = [];
let index = 0;
let userPaused = false;
let gestureArmed = false;
let failedInRow = 0;
let controlsAllowed = false;

const ready = Boolean(audio && player && title && playButton && prevButton && nextButton && progress && fill);

if (!ready) console.warn("[Velmoric Music] Markup pemutar tidak lengkap.");

// =========================================================
// HELPER
// =========================================================

function formatTime(value) {
  if (!Number.isFinite(value) || value < 0) return "0:00";

  const minutes = Math.floor(value / 60);
  const seconds = String(Math.floor(value % 60)).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function trackName(url) {
  try {
    const last = url.split("?")[0].split("/").pop();

    return decodeURIComponent(last).replace(/\.[a-z0-9]{2,4}$/i, "") || "Lagu tanpa judul";
  } catch {
    return "Lagu tanpa judul";
  }
}

function updatePlayer() {
  if (!ready) return;

  const playing = !audio.paused;

  if (iconPlay) iconPlay.hidden = playing;
  if (iconPause) iconPause.hidden = !playing;

  if (timeCurrent) timeCurrent.textContent = formatTime(audio.currentTime);
  if (timeTotal) timeTotal.textContent = formatTime(audio.duration);

  const percent = audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
  fill.style.width = `${percent}%`;
}

/** Tampilkan pemutar hanya bila ada lagu DAN pengguna berhak mengontrol. */
function syncVisibility() {
  if (!ready) return;

  const visible = controlsAllowed && playlist.length > 0;

  player.classList.toggle("active", visible);
  document.body.classList.toggle("has-player", visible);
}

function playNow() {
  audio.play().catch(error => console.warn("[Velmoric Music]", error));
}

// =========================================================
// MEMUAT LAGU
// =========================================================

function loadTrack(newIndex, autoplay = true) {
  if (!ready || !playlist.length) return false;

  index = (newIndex + playlist.length) % playlist.length;

  title.textContent = trackName(playlist[index]);
  audio.src = playlist[index];
  audio.load();

  if (autoplay) {
    userPaused = false;
    playNow();
  }

  syncVisibility();
  updatePlayer();

  return true;
}

// Browser memblokir autoplay sebelum ada interaksi.
// Mulai memutar pada interaksi pertama, kecuali pengguna
// sudah menjeda sendiri.
function armGesture() {
  if (gestureArmed) return;

  gestureArmed = true;

  document.addEventListener(
    "pointerdown",
    () => {
      gestureArmed = false;

      if (playlist.length && audio.paused && !userPaused) playNow();
    },
    { once: true }
  );
}

// =========================================================
// API PUBLIK
// =========================================================

/** Ganti playlist. Tidak me-restart lagu bila daftar sama. */
export function setPlaylist(urls) {
  if (!ready) return;

  const next = Array.isArray(urls)
    ? urls.filter(url => typeof url === "string" && url.trim())
    : [];

  if (next.length === playlist.length && next.every((url, i) => url === playlist[i])) return;

  failedInRow = 0;
  playlist = next;
  index = 0;

  if (!playlist.length) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    title.textContent = "Belum ada musik";
    syncVisibility();
    updatePlayer();

    return;
  }

  // Pembaca anonim tidak punya kontrol; musik hanya diputar bila diizinkan.
  if (controlsAllowed || MUSIC_FOR_READERS) {
    loadTrack(0, false);
    armGesture();
  }

  syncVisibility();
}

/** Dipanggil saat peran berubah. Hanya staf yang melihat & mengontrol pemutar. */
export function setControlsAllowed(allowed) {
  controlsAllowed = Boolean(allowed);

  if (!controlsAllowed && !MUSIC_FOR_READERS && ready) {
    audio.pause();
  }

  syncVisibility();
}

// =========================================================
// KONTROL (hanya terpasang; hanya bisa dipakai saat terlihat)
// =========================================================

if (ready) {
  playButton.addEventListener("click", () => {
    if (!controlsAllowed || !playlist.length) return;

    if (audio.paused) {
      userPaused = false;
      playNow();
    } else {
      userPaused = true;
      audio.pause();
    }
  });

  nextButton.addEventListener("click", () => controlsAllowed && loadTrack(index + 1));

  prevButton.addEventListener("click", () => {
    if (!controlsAllowed) return;

    if (audio.currentTime > 3) audio.currentTime = 0;
    else loadTrack(index - 1);
  });

  stopButton?.addEventListener("click", () => {
    if (!controlsAllowed) return;

    userPaused = true;
    audio.pause();
    audio.currentTime = 0;
    updatePlayer();
  });

  progress.addEventListener("click", event => {
    if (!controlsAllowed || !(audio.duration > 0)) return;

    const rect = progress.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;

    audio.currentTime = Math.max(0, Math.min(1, ratio)) * audio.duration;
  });

  ["play", "pause", "timeupdate", "loadedmetadata", "durationchange"]
    .forEach(name => audio.addEventListener(name, updatePlayer));

  audio.addEventListener("ended", () => loadTrack(index + 1));

  audio.addEventListener("error", () => {
    if (!playlist.length) return;

    title.textContent = `${trackName(playlist[index])} (gagal dimuat)`;

    // Lompat ke lagu berikutnya, tapi berhenti jika semua gagal
    // supaya tidak berputar tanpa akhir.
    failedInRow += 1;

    if (failedInRow < playlist.length && !userPaused) {
      setTimeout(() => loadTrack(index + 1), 1500);
    }
  });

  audio.addEventListener("playing", () => {
    failedInRow = 0;
  });

  updatePlayer();
}
