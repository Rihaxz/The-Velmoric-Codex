/* =========================================================
   KONSTANTA & UTILITAS
   ========================================================= */
const STORAGE_KEY = 'wikikarakter_v1';

/** ID unik pendek */
function uid() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Escape HTML agar aman dari injeksi */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Potong teks panjang + elipsis */
function potong(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n).trim() + '…' : s;
}

/** Ubah teks jadi slug (untuk id section TOC) */
function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/* =========================================================
   DATA CONTOH (dipakai saat pertama kali buka)
   ========================================================= */
function defaultData() {
  return [
    {
      id: uid(), avatar: '🐉', nama: 'Arka Wijaya', gelar: 'Sang Penjaga Naga',
      ras: 'Manusia-Penjelma Naga', gender: 'Laki-laki', usia: '27 tahun',
      tinggi: '182 cm', berat: '74 kg', asal: 'Kerajaan Arunika',
      afiliasi: 'Ordo Cakrawala', status: 'Aktif', kelas: 'Api · Ksatria',
      foto: '', // Tambahan untuk URL foto
      deskripsi: 'Ksatria muda yang mengikat perjanjian darah dengan naga langit Arunika, dijuluki "Sang Penjaga Naga" oleh rakyatnya.',
      kepribadian: 'Tenang, setia, dan sangat protektif terhadap rekan-rekannya. Lebih suka mendengarkan daripada berbicara, tetapi akan mengambil alih komando ketika situasi memburuk.',
      latar: 'Lahir di desa kecil di kaki Gunung Arunika. Ketika desanya dihancurkan oleh badai abadi, ia ditemukan oleh seekor naga tua dan dibesarkan di sarang langit selama tujuh tahun.\nSetelah kembali ke dunia manusia, ia bergabung dengan Ordo Cakrawala dan mengabdikan hidupnya untuk menjaga perbatasan utara.',
      kemampuan: 'Dapat memanggil api naga, tahan terhadap panas ekstrem, dan bertarung menggunakan pedang panjang berlapis sisik naga. Mampu berkomunikasi dengan makhluk langit.',
      kelemahan: 'Kehilangan kendali saat emosinya memuncak, sehingga api naganya bisa melukai sekutu. Tidak bisa berenang sama sekali.'
    },
    {
      id: uid(), avatar: '🧙‍♀️', nama: 'Seraphine Moonshade', gelar: 'Penyihir Bulan Perak',
      ras: 'Half-Elf', gender: 'Perempuan', usia: '143 tahun',
      tinggi: '168 cm', berat: '51 kg', asal: 'Menara Selene',
      afiliasi: 'Dewan Sihir Selene', status: 'Aktif', kelas: 'Bulan · Penyihir',
      foto: '', // Tambahan untuk URL foto
      deskripsi: 'Arsiparis sihir paling tua di Menara Selene, dikenal karena ramalan-ramalannya yang selalu datang terlambat sehari.',
      kepribadian: 'Cuek, sarkastik, tetapi diam-diam sangat peduli. Sangat menyukai teh dan buku berdebu.',
      latar: 'Meninggalkan istana elf setelah berselisih dengan ayahnya, seorang bangsawan tinggi. Menghabiskan 80 tahun mempelajari sihir bulan di Menara Selene dan kini menjadi penjaga arsip terlama.',
      kemampuan: 'Ilusi tingkat tinggi, ramalan jangka pendek, dan manipulasi cahaya bulan. Hafal lebih dari 40.000 mantra.',
      kelemahan: 'Fisiknya lemah dan mudah kelelahan; sihirnya melemah saat gerhana bulan.'
    }
  ];
}