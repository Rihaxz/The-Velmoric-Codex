
/* =========================================================
   THE VELMORIC CODEX
   data.js
   Data utama dan helper website
========================================================= */

(() => {
  "use strict";

  // =======================================================
  // DATA KARAKTER
  // =======================================================

  window.characters = [];

  // Struktur data karakter:
  //
  // {
  //   id: "ID_FIRESTORE",
  //   nama: "Nama Karakter",
  //   gelar: "Gelar karakter",
  //   kategori: "Protagonist",
  //   ras: "Human",
  //   umur: "Unknown",
  //   jenisKelamin: "Unknown",
  //   foto: "https://example.com/image.jpg",
  //   deskripsi: "Deskripsi karakter",
  //   kemampuan: "Kemampuan karakter",
  //   kepribadian: "Kepribadian karakter",
  //   cerita: "Latar belakang karakter",
  //   status: "Alive",
  //   dibuatPada: "2026-01-01T00:00:00.000Z",
  //   diperbaruiPada: "2026-01-01T00:00:00.000Z"
  // }

  // =======================================================
  // KATEGORI KARAKTER
  // =======================================================

  window.characterCategories = [
    "Protagonist",
    "Antagonist",
    "Supporting",
    "God",
    "Demon",
    "Angel",
    "Human",
    "Other"
  ];

  // =======================================================
  // PENGATURAN GLOBAL
  // =======================================================

  window.globalSettings = {
    theme: "dark",
    musicUrls: [],
    musicUrl: ""
  };

  // =======================================================
  // PLAYLIST MUSIK
  // =======================================================

  window.musicPlaylist = [];

  // =======================================================
  // HELPER: ESCAPE HTML
  // Mencegah teks karakter dianggap sebagai HTML.
  // =======================================================

  window.esc = function (value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // =======================================================
  // HELPER: FORMAT TANGGAL
  // =======================================================

  window.formatDate = function (date) {
    if (!date) return "Unknown";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Unknown";
    }

    return parsedDate.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  };

  // =======================================================
  // HELPER: DATA KARAKTER BERDASARKAN ID
  // =======================================================

  window.getCharacterById = function (id) {
    return window.characters.find(
      character => character.id === id
    ) || null;
  };

  // =======================================================
  // HELPER: PENCARIAN KARAKTER
  // =======================================================

  window.searchCharacters = function (keyword) {
    const query = String(keyword || "")
      .trim()
      .toLowerCase();

    if (!query) {
      return [...window.characters];
    }

    return window.characters.filter(character => {
      const searchable = [
        character.nama,
        character.gelar,
        character.kategori,
        character.ras,
        character.deskripsi
      ];

      return searchable.some(value =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );
    });
  };

  // =======================================================
  // HELPER: FILTER KATEGORI
  // =======================================================

  window.filterCharactersByCategory = function (category) {
    if (!category || category === "All") {
      return [...window.characters];
    }

    return window.characters.filter(character =>
      String(character.kategori || "").toLowerCase() ===
      String(category).toLowerCase()
    );
  };

  // =======================================================
  // HELPER: VALIDASI DATA KARAKTER
  // =======================================================

  window.validateCharacter = function (character) {
    if (!character || typeof character !== "object") {
      return {
        valid: false,
        message: "Data karakter tidak valid."
      };
    }

    if (!String(character.nama || "").trim()) {
      return {
        valid: false,
        message: "Nama karakter wajib diisi."
      };
    }

    return {
      valid: true,
      message: "Data karakter valid."
    };
  };

  console.log("[Velmoric Data] Data utama berhasil dimuat.");

})();
