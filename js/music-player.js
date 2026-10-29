
(() => {
  "use strict";

  const audio = document.getElementById("bgMusic");
  const player = document.getElementById("musicPlayer");
  const titleElement = document.getElementById("trackTitle");
  const playButton = document.getElementById("btnPlayPause");
  const playIcon = document.getElementById("iconPlay");
  const pauseIcon = document.getElementById("iconPause");
  const previousButton = document.getElementById("btnPrevTrack");
  const nextButton = document.getElementById("btnNextTrack");
  const currentTimeElement = document.getElementById("timeCurrent");
  const totalTimeElement = document.getElementById("timeTotal");
  const progressBar = document.getElementById("progressBar");
  const progressFill = document.getElementById("progressFill");

  if (!audio || !player) {
    console.warn("Music player: elemen audio atau player tidak ditemukan.");
    return;
  }

  function getPlaylist() {
    return Array.isArray(window.musicPlaylist)
      ? window.musicPlaylist
      : typeof musicPlaylist !== "undefined"
        ? musicPlaylist
        : [];
  }

  function getCurrentIndex() {
    return typeof currentTrackIndex === "number"
      ? currentTrackIndex
      : 0;
  }

  function setCurrentIndex(index) {
    if (typeof currentTrackIndex !== "undefined") {
      currentTrackIndex = index;
    }
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  function updatePlayPauseIcon() {
    const isPlaying = !audio.paused;

    if (playIcon) {
      playIcon.hidden = isPlaying;
    }

    if (pauseIcon) {
      pauseIcon.hidden = !isPlaying;
    }

    if (playButton) {
      playButton.setAttribute(
        "aria-label",
        isPlaying ? "Jeda musik" : "Putar musik"
      );
      playButton.setAttribute(
        "title",
        isPlaying ? "Jeda musik" : "Putar musik"
      );
    }
  }

  function updateProgress() {
    const duration = audio.duration;
    const current = audio.currentTime;

    if (currentTimeElement) {
      currentTimeElement.textContent = formatTime(current);
    }

    if (totalTimeElement) {
      totalTimeElement.textContent = formatTime(duration);
    }

    if (progressFill) {
      const percentage =
        Number.isFinite(duration) && duration > 0
          ? (current / duration) * 100
          : 0;

      progressFill.style.width = `${Math.max(
        0,
        Math.min(100, percentage)
      )}%`;
    }

    if (progressBar) {
      progressBar.setAttribute(
        "aria-valuenow",
        String(
          Number.isFinite(duration) && duration > 0
            ? Math.round((current / duration) * 100)
            : 0
        )
      );
    }
  }

  function getTrackUrl(track) {
    if (typeof track === "string") {
      return track.trim();
    }

    if (track && typeof track === "object") {
      return String(track.url || track.src || "").trim();
    }

    return "";
  }

  function getTrackTitle(track, index) {
    if (track && typeof track === "object" && track.title) {
      return String(track.title);
    }

    const url = getTrackUrl(track);

    if (url) {
      try {
        const pathname = new URL(url, window.location.href).pathname;
        const filename = decodeURIComponent(pathname.split("/").pop() || "");
        if (filename) {
          return filename.replace(/\.[^/.]+$/, "");
        }
      } catch {
        // Gunakan nama default jika URL tidak valid.
      }
    }

    return `Track ${index + 1}`;
  }

  function loadTrack(index, playNow = true) {
    const playlist = getPlaylist();

    if (!playlist.length) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();

      if (titleElement) {
        titleElement.textContent = "Belum ada musik";
      }

      updateProgress();
      updatePlayPauseIcon();
      return false;
    }

    const safeIndex = ((index % playlist.length) + playlist.length) % playlist.length;
    const track = playlist[safeIndex];
    const url = getTrackUrl(track);

    if (!url) {
      console.warn("Music player: URL track kosong.", track);
      return false;
    }

    setCurrentIndex(safeIndex);

    if (titleElement) {
      titleElement.textContent = getTrackTitle(track, safeIndex);
    }

    if (audio.src !== new URL(url, window.location.href).href) {
      audio.src = url;
      audio.load();
    }

    updateProgress();

    if (playNow) {
      audio.play().catch((error) => {
        console.warn("Musik tidak dapat diputar otomatis:", error);
        updatePlayPauseIcon();
      });
    }

    return true;
  }

  function togglePlayPause() {
    if (audio.paused) {
      if (!audio.src) {
        if (!loadTrack(getCurrentIndex(), false)) {
          return;
        }
      }

      audio.play().catch((error) => {
        console.warn("Gagal memutar musik:", error);
        updatePlayPauseIcon();
      });
    } else {
      audio.pause();
    }
  }

  function playNext() {
    loadTrack(getCurrentIndex() + 1, true);
  }

  function playPrevious() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    loadTrack(getCurrentIndex() - 1, true);
  }

  if (playButton) {
    playButton.addEventListener("click", togglePlayPause);
  }

  if (nextButton) {
    nextButton.addEventListener("click", playNext);
  }

  if (previousButton) {
    previousButton.addEventListener("click", playPrevious);
  }

  audio.addEventListener("play", updatePlayPauseIcon);
  audio.addEventListener("pause", updatePlayPauseIcon);
  audio.addEventListener("ended", playNext);
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("loadedmetadata", updateProgress);
  audio.addEventListener("durationchange", updateProgress);
  audio.addEventListener("error", () => {
    console.warn("Musik gagal dimuat. Periksa URL dan akses file musik.");
    updatePlayPauseIcon();
  });

  if (progressBar) {
    progressBar.addEventListener("click", (event) => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        return;
      }

      const rect = progressBar.getBoundingClientRect();
      if (rect.width <= 0) return;

      const ratio = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width)
      );

      audio.currentTime = ratio * audio.duration;
      updateProgress();
    });
  }

  // Dipakai oleh storage.js setelah pengaturan musik dimuat.
  window.loadTrack = loadTrack;
  window.updatePlayPauseIcon = updatePlayPauseIcon;
  window.formatMusicTime = formatTime;

  updatePlayPauseIcon();
  updateProgress();
})();
