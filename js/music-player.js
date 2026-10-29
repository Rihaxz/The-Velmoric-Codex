
/* =========================================================
   MUSIC-PLAYER.JS
   Mengelola playlist, play/pause, next/previous, dan progress.
   Membutuhkan:
   - musicPlaylist
   - currentTrackIndex
   - applyGlobalSettings() dari storage.js
   ========================================================= */

const bgMusic = document.getElementById("bgMusic");

function loadTrack(index, playNow = true) {
  if (!Array.isArray(musicPlaylist) || musicPlaylist.length === 0) {
    return;
  }

  if (!bgMusic) {
    console.error("Elemen audio #bgMusic tidak ditemukan.");
    return;
  }

  currentTrackIndex =
    (index + musicPlaylist.length) % musicPlaylist.length;

  const trackUrl = musicPlaylist[currentTrackIndex];

  if (typeof trackUrl !== "string" || !trackUrl.trim()) {
    console.error("URL musik tidak valid.");
    return;
  }

  bgMusic.src = trackUrl;

  let filename = "Lagu Tanpa Judul";

  try {
    const pathname = new URL(trackUrl, window.location.href).pathname;
    filename = decodeURIComponent(pathname.split("/").pop() || "")
      .replace(/\.mp3$/i, "")
      .replace(/\.ogg$/i, "")
      .replace(/\.wav$/i, "") || filename;
  } catch {
    // Gunakan nama default jika URL tidak dapat dibaca.
  }

  const trackTitle = document.getElementById("trackTitle");

  if (trackTitle) {
    trackTitle.textContent = filename;
  }

  if (playNow) {
    bgMusic.play()
      .then(() => updatePlayPauseIcon(true))
      .catch((error) => {
        updatePlayPauseIcon(false);
        console.warn("Musik tidak dapat diputar:", error);
      });
  } else {
    updatePlayPauseIcon(false);
  }
}

function updatePlayPauseIcon(isPlaying) {
  const iconPlay = document.getElementById("iconPlay");
  const iconPause = document.getElementById("iconPause");

  if (iconPlay) {
    iconPlay.style.display = isPlaying ? "none" : "block";
  }

  if (iconPause) {
    iconPause.style.display = isPlaying ? "block" : "none";
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

function initMusicPlayer() {
  if (!bgMusic) {
    console.warn("Pemutar musik tidak ditemukan di halaman.");
    return;
  }

  const btnPlayPause = document.getElementById("btnPlayPause");
  const btnNextTrack = document.getElementById("btnNextTrack");
  const btnPrevTrack = document.getElementById("btnPrevTrack");
  const progressBar = document.getElementById("progressBar");

  btnPlayPause?.addEventListener("click", async () => {
    if (bgMusic.paused) {
      try {
        if (!bgMusic.src && musicPlaylist.length > 0) {
          loadTrack(currentTrackIndex, false);
        }

        await bgMusic.play();
        updatePlayPauseIcon(true);
      } catch (error) {
        updatePlayPauseIcon(false);
        console.warn("Gagal memutar musik:", error);
      }
    } else {
      bgMusic.pause();
      updatePlayPauseIcon(false);
    }
  });

  btnNextTrack?.addEventListener("click", () => {
    if (musicPlaylist.length > 0) {
      loadTrack(currentTrackIndex + 1);
    }
  });

  btnPrevTrack?.addEventListener("click", () => {
    if (musicPlaylist.length > 0) {
      loadTrack(currentTrackIndex - 1);
    }
  });

  bgMusic.addEventListener("ended", () => {
    if (musicPlaylist.length > 0) {
      loadTrack(currentTrackIndex + 1);
    }
  });

  bgMusic.addEventListener("play", () => {
    updatePlayPauseIcon(true);
  });

  bgMusic.addEventListener("pause", () => {
    updatePlayPauseIcon(false);
  });

  bgMusic.addEventListener("timeupdate", () => {
    const current = bgMusic.currentTime;
    const duration = bgMusic.duration || 0;

    const progressFill = document.getElementById("progressFill");
    const timeCurrent = document.getElementById("timeCurrent");
    const timeTotal = document.getElementById("timeTotal");

    if (duration > 0) {
      const percent = (current / duration) * 100;

      if (progressFill) {
        progressFill.style.width = `${percent}%`;
      }

      if (timeCurrent) {
        timeCurrent.textContent = formatTime(current);
      }

      if (timeTotal) {
        timeTotal.textContent = formatTime(duration);
      }
    }
  });

  progressBar?.addEventListener("click", (event) => {
    if (!Number.isFinite(bgMusic.duration) || bgMusic.duration <= 0) {
      return;
    }

    const rect = progressBar.getBoundingClientRect();

    if (rect.width <= 0) return;

    const percent = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width)
    );

    bgMusic.currentTime = percent * bgMusic.duration;
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMusicPlayer, {
    once: true
  });
} else {
  initMusicPlayer();
}
