/* =========================================================
   THE VELMORIC CODEX
   music-player.js
   Pemutar musik latar. Berdiri sendiri; playlist diatur lewat
   setPlaylist(urls) dari app.js.
========================================================= */

import { $ } from "./utils.js";

let setPlaylistImpl = () => {};

/** Ganti playlist. Tidak me-restart lagu bila daftar sama. */
export function setPlaylist(urls) {
  setPlaylistImpl(urls);
}

(() => {

  const audio = $("bgMusic");
  const player = $("musicPlayer");
  const title = $("trackTitle");
  const playButton = $("btnPlayPause");
  const prevButton = $("btnPrevTrack");
  const nextButton = $("btnNextTrack");
  const progress = $("progressBar");
  const fill = $("progressFill");
  const iconPlay = $("iconPlay");
  const iconPause = $("iconPause");
  const timeCurrent = $("timeCurrent");
  const timeTotal = $("timeTotal");

  // Jika markup pemutar tidak ada, jangan membuat halaman error.
  if (
    !audio || !player || !title || !playButton ||
    !prevButton || !nextButton || !progress || !fill
  ) {
    console.warn("[Velmoric Music] Markup pemutar tidak lengkap.");

    return;
  }

  let playlist = [];
  let index = 0;
  let userPaused = false;
  let gestureArmed = false;
  let failedInRow = 0;

  // =======================================================
  // HELPER
  // =======================================================

  function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return "0:00";

    const minutes = Math.floor(value / 60);
    const seconds = String(Math.floor(value % 60)).padStart(2, "0");

    return `${minutes}:${seconds}`;
  }

  function trackName(url) {
    try {
      const last = url.split("?")[0].split("/").pop();

      return decodeURIComponent(last).replace(/\.[a-z0-9]{2,4}$/i, "")
        || "Lagu tanpa judul";

    } catch {
      return "Lagu tanpa judul";
    }
  }

  function updatePlayer() {
    const playing = !audio.paused;

    if (iconPlay) iconPlay.hidden = playing;
    if (iconPause) iconPause.hidden = !playing;

    if (timeCurrent) timeCurrent.textContent = formatTime(audio.currentTime);
    if (timeTotal) timeTotal.textContent = formatTime(audio.duration);

    const percent =
      audio.duration > 0
        ? (audio.currentTime / audio.duration) * 100
        : 0;

    fill.style.width = `${percent}%`;
  }

  function showPlayer(visible) {
    player.classList.toggle("active", visible);
    document.body.classList.toggle("has-player", visible);
  }

  // =======================================================
  // MEMUAT LAGU
  // =======================================================

  function loadTrack(newIndex, autoplay = true) {
    if (!playlist.length) return false;

    index = (newIndex + playlist.length) % playlist.length;

    const url = playlist[index];

    title.textContent = trackName(url);

    audio.src = url;
    audio.load();

    if (autoplay) {
      userPaused = false;
      audio.play().catch(error => console.warn("[Velmoric Music]", error));
    }

    showPlayer(true);
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

        if (playlist.length && audio.paused && !userPaused) {
          audio.play().catch(() => {});
        }
      },
      { once: true }
    );
  }

  // =======================================================
  // PLAYLIST
  // =======================================================

  function setPlaylist(urls) {
    const next = Array.isArray(urls)
      ? urls.filter(url => typeof url === "string" && url.trim())
      : [];

    // Tidak berubah -> jangan restart lagu yang sedang berjalan.
    if (
      next.length === playlist.length &&
      next.every((url, i) => url === playlist[i])
    ) return;

    failedInRow = 0;

    playlist = next;
    index = 0;

    if (!playlist.length) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();

      title.textContent = "Belum ada musik";

      showPlayer(false);
      updatePlayer();

      return;
    }

    loadTrack(0, false);
    armGesture();
  }

  // =======================================================
  // KONTROL
  // =======================================================

  playButton.addEventListener("click", () => {
    if (!playlist.length) return;

    if (audio.paused) {
      userPaused = false;
      audio.play().catch(error => console.warn("[Velmoric Music]", error));
    } else {
      userPaused = true;
      audio.pause();
    }
  });

  nextButton.addEventListener("click", () => loadTrack(index + 1));

  prevButton.addEventListener("click", () => {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
    } else {
      loadTrack(index - 1);
    }
  });

  progress.addEventListener("click", event => {
    if (!(audio.duration > 0)) return;

    const rect = progress.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;

    audio.currentTime = Math.max(0, Math.min(1, ratio)) * audio.duration;
  });

  ["play", "pause", "timeupdate", "loadedmetadata", "durationchange"]
    .forEach(name => audio.addEventListener(name, updatePlayer));

  audio.addEventListener("ended", () => loadTrack(index + 1));

  audio.addEventListener("error", () => {
    if (!playlist.length) return;

    // Tetap tampilkan nama lagu; tandai saja bahwa gagal dimuat.
    const name = trackName(playlist[index]);

    title.textContent = `${name} (gagal dimuat)`;

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

  // =======================================================
  // EXPORT
  // =======================================================

  setPlaylistImpl = setPlaylist;

  updatePlayer();

})();
