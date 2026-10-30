
/* ==========================================
   THE VELMORIC CODEX
   DATA & UTILITIES
========================================== */

const STORAGE_KEY = "wikikarakter_v1";

/* ==========================================
   MEMBUAT ID LOKAL
========================================== */

function uid() {
  return (
    "c" +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9)
  );
}

/* ==========================================
   HTML ESCAPE
========================================== */

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]
  );
}

/* ==========================================
   STRUKTUR DATA KARAKTER
========================================== */

function buatDataKarakter(data = {}) {
  return {
    nama: data.nama || "",
    kategori: data.kategori || "Karakter",

    avatar: data.avatar || "",
    foto: data.foto || "",

    gelar: data.gelar || "",
    ras: data.ras || "",
    gender: data.gender || "",

    usia: data.usia || "",
    tinggi: data.tinggi || "",
    berat: data.berat || "",

    asal: data.asal || "",
    afiliasi: data.afiliasi || "",
    status: data.status || "",
    kelas: data.kelas || "",

    deskripsi: data.deskripsi || "",
    kepribadian: data.kepribadian || "",
    latar: data.latar || "",
    kemampuan: data.kemampuan || "",
    kelemahan: data.kelemahan || ""
  };
}

/* ==========================================
   DATA CONTOH
   HANYA UNTUK REFERENSI
========================================== */

function defaultData() {
  return [
    buatDataKarakter({
      nama: "Arka Wijaya",
      kategori: "Karakter",
      gelar: "Sang Penjaga Naga",
      ras: "Manusia-Penjelma Naga",
      gender: "Laki-laki",
      usia: "27 tahun",
      tinggi: "182 cm",
      berat: "74 kg",
      asal: "Kerajaan Arunika",
      afiliasi: "Ordo Cakrawala",
      status: "Aktif",
      kelas: "Api · Ksatria",
      foto: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=85",
      deskripsi:
        "Ksatria yang mengikat perjanjian darah dengan naga langit.",
      kepribadian:
        "Tenang, setia, dan protektif terhadap rekan-rekannya.",
      latar:
        "Dibesarkan seekor naga tua setelah desanya dihancurkan badai abadi.",
      kemampuan:
        "Memanggil api naga dan bertarung dengan pedang bersisik naga.",
      kelemahan:
        "Kehilangan kendali saat emosinya memuncak."
    }),

    buatDataKarakter({
      nama: "Seraphine Moonshade",
      kategori: "Karakter",
      gelar: "Penyihir Bulan Perak",
      ras: "Half-Elf",
      gender: "Perempuan",
      usia: "143 tahun",
      tinggi: "168 cm",
      berat: "51 kg",
      asal: "Menara Selene",
      afiliasi: "Dewan Sihir Selene",
      status: "Aktif",
      kelas: "Bulan · Penyihir",
      foto: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=85",
      deskripsi:
        "Arsiparis sihir yang ahli dalam ramalan.",
      kepribadian:
        "Cuek dan sarkastik, tetapi diam-diam peduli.",
      latar:
        "Menghabiskan puluhan tahun mempelajari sihir bulan.",
      kemampuan:
        "Ilusi, ramalan jangka pendek, dan manipulasi cahaya bulan.",
      kelemahan:
        "Sihir melemah saat gerhana bulan."
    })
  ];
}

/* ==========================================
   VALIDASI DATA
========================================== */

function validasiDataKarakter(data) {
  if (!data || typeof data !== "object") {
    return false;
  }

  if (
    typeof data.nama !== "string" ||
    !data.nama.trim()
  ) {
    return false;
  }

  return true;
}

/* ==========================================
   NORMALISASI DATA
========================================== */

function normalisasiDataKarakter(data) {
  const hasil = buatDataKarakter(data);

  hasil.nama = hasil.nama.trim();
  hasil.kategori = hasil.kategori.trim() || "Karakter";

  return hasil;
}
