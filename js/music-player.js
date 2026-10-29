(() => {
  const audio = document.getElementById("bgMusic");
  const player = document.getElementById("musicPlayer");
  const title = document.getElementById("trackTitle");
  const playButton = document.getElementById("btnPlayPause");
  const progress = document.getElementById("progressBar");
  const fill = document.getElementById("progressFill");

  function formatTime(value) {
    return Number.isFinite(value) && value >= 0
      ? `${Math.floor(value / 60)}:${String(
          Math.floor(value % 60)
        ).padStart(2, "0")}`
      : "0:00";
  }

  function updatePlayer() {
    const playing = !audio.paused;

    document.getElementById("iconPlay").hidden = playing;
    document.getElementById("iconPause").hidden = !playing;

    document.getElementById("timeCurrent").textContent =
      formatTime(audio.currentTime);

    document.getElementById("timeTotal").textContent =
      formatTime(audio.duration);

    const percent = audio.duration > 0
      ? (audio.currentTime / audio.duration) * 100
      : 0;

    fill.style.width = percent + "%";
  }

  function loadTrack(index, autoplay = true) {
    if (!musicPlaylist.length) {
      title.textContent = "Belum ada musik";
      player.classList.remove("active");
      return false;
    }

    currentTrackIndex =
      (index + musicPlaylist.length) % musicPlaylist.length;

    const track = musicPlaylist[currentTrackIndex];
    const url = typeof track === "string"
      ? track
      : track.url || track.src;

    if (!url) return false;

    title.textContent =
      typeof track === "object" && track.title
        ? track.title
        : decodeURIComponent(
            url.split("/").pop().split("?")[0]
          );

    if (audio.src !== new URL(url, location.href).href) {
      audio.src = url;
      audio.load();
    }

    if (autoplay) {
      audio.play().catch(console.warn);
    }

    player.classList.add("active");
    updatePlayer();
    return true;
  }

  playButton.addEventListener("click", () => {
    if (audio.paused) {
      if (!audio.src && !loadTrack(currentTrackIndex, false)) {
        return;
      }

      audio.play().catch(console.warn);
    } else {
      audio.pause();
    }
  });

  document.getElementById("btnNextTrack").addEventListener(
    "click",
    () => loadTrack(currentTrackIndex + 1)
  );

  document.getElementById("btnPrevTrack").addEventListener(
    "click",
    () => {
      if (audio.currentTime > 3) {
        audio.currentTime = 0;
      } else {
        loadTrack(currentTrackIndex - 1);
      }
    }
  );

  [
    "play",
    "pause",
    "timeupdate",
    "loadedmetadata",
    "durationchange"
  ].forEach(event => {
    audio.addEventListener(event, updatePlayer);
  });

  audio.addEventListener("ended", () => {
    loadTrack(currentTrackIndex + 1);
  });

  progress.addEventListener("click", event => {
    if (audio.duration > 0) {
      const rect = progress.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;

      audio.currentTime =
        Math.max(0, Math.min(1, ratio)) * audio.duration;
    }
  });

  window.loadTrack = loadTrack;
  updatePlayer();
})();