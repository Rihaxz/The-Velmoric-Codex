const STORAGE_KEY = "wikikarakter_v1";

function uid() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function defaultData() {
  return [
    {
      id: uid(),
      nama: "Arka Wijaya",
      kategori: "Karakter",
      avatar: "🐉",
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
      foto: "",
      deskripsi: "Ksatria yang mengikat perjanjian darah dengan naga langit.",
      kepribadian: "Tenang, setia, dan protektif terhadap rekan-rekannya.",
      latar: "Dibesarkan seekor naga tua setelah desanya dihancurkan badai abadi.",
      kemampuan: "Memanggil api naga dan bertarung dengan pedang bersisik naga.",
      kelemahan: "Kehilangan kendali saat emosinya memuncak."
    },
    {
      id: uid(),
      nama: "Seraphine Moonshade",
      kategori: "Karakter",
      avatar: "🧙‍♀️",
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
      foto: "",
      deskripsi: "Arsiparis sihir yang ahli dalam ramalan.",
      kepribadian: "Cuek dan sarkastik, tetapi diam-diam peduli.",
      latar: "Menghabiskan puluhan tahun mempelajari sihir bulan.",
      kemampuan: "Ilusi, ramalan jangka pendek, dan manipulasi cahaya bulan.",
      kelemahan: "Sihir melemah saat gerhana bulan."
    }
  ];
}