# The Velmoric Codex

> *"Setiap dunia punya ingatan. Di sinilah ingatan Velmor disimpan."*

**The Velmoric Codex** adalah arsip hidup dunia fantasi Velmor: karakter, kerajaan, ras, makhluk, sihir, artefak, lokasi, organisasi, dan peristiwa. Situs statis (HTML/CSS/JS murni) dengan data di **Firebase Firestore**, tetap gratis di paket Spark.

## Fitur

**Untuk pembaca**

- **Artikel lengkap**: infobox per kategori (ras, usia, gelar, julukan, habitat, penguasa, elemen, dll), daftar isi otomatis, tag, galeri dengan lightbox.
- **Tautan antar-entri** `[[Nama Entri]]`, daftar "Disebut dalam" (backlink), dan format teks ringan (tebal, miring, subjudul, kutipan, daftar, spoiler).
- **Hubungan & silsilah**: orang tua/anak, pasangan, saudara, guru/murid, sekutu/musuh, rival, penguasa, pemilik, dll. Cukup dicatat di satu sisi; sisi lawan muncul otomatis. Pohon keluarga tiga generasi.
- **Peta dunia interaktif**: penanda per lokasi/kerajaan, klik untuk melihat info & penguasa.
- **Linimasa** per era, **Bestiari** dengan tingkat ancaman & habitat.
- **Jelajah**: pencarian global + filter ras, status, era, tag, ancaman, dan urutan.
- **Lore Hari Ini**, **Entri Acak**, entri terbaru, **Tandai** (bookmark) & **Riwayat Baca** (tersimpan di browser).
- **Mode Baca**, tema gelap/terang bernuansa perkamen, bisa dipasang sebagai aplikasi (PWA) dan tetap terbuka saat offline.

**Untuk admin**

- Dasbor statistik per kategori, daftar entri yang perlu dilengkapi, **log aktivitas**.
- **Draf & terbit**: draf hanya terlihat oleh admin.
- **Riwayat revisi**: setiap ubah/hapus menyimpan versi lama yang bisa dipulihkan.
- **Upload gambar langsung** (dikompres di browser, disimpan di Firestore koleksi `media`, tanpa Firebase Storage).
- Editor dengan toolbar format, field yang menyesuaikan kategori, editor hubungan & galeri.
- **Kategori tambahan**, editor penanda peta, ganti gambar peta, **backup/restore** JSON lengkap.

## Cara kerja akses

| Peran | Cara masuk | Hak akses |
|-------|-----------|-----------|
| **Pembaca** | Otomatis, anonim (tanpa form) | Hanya baca |
| **Admin** | Buka `https://rihaxz.github.io/The-Velmoric-Codex/#admin` → email + password | Baca + tambah/edit/hapus entri, pengaturan, ekspor/impor |

Tidak ada tombol login di tampilan publik; form admin hanya muncul lewat link `#admin` (simpan sebagai bookmark). Dua jalur ini terpisah: pembaca tidak pernah melihat form login, dan akun email yang **bukan** admin otomatis di-sign-out lalu dikembalikan menjadi pembaca. Pengecekan di browser hanya untuk tampilan; yang benar-benar melindungi data adalah `firestore.rules`.

## Setup Firebase (sekali saja)

1. **Authentication → Sign-in method**: aktifkan **Anonymous** dan **Email/Password**.
2. **Authentication → Settings → Authorized domains**: tambahkan `rihaxz.github.io` (dan domain lain yang dipakai).
3. **Authentication → Users**: buat akun admin (email + password), salin **UID**-nya.
4. **Firestore → Data**: buat dokumen `admins/<UID>` dengan field `role` (string) = `admin`.
5. **Firestore → Rules**: tempel isi `firestore.rules` lalu **Publish**. Versi ini menambah koleksi `draf`, `revisi`, `log`, dan `media`; tanpa aturan baru, fitur draf, riwayat, log, dan upload gambar akan ditolak.
6. (Sekali) Riwayat revisi memakai query `entriId`; jika console browser menampilkan link "create index", klik link itu.
7. (Disarankan) Google Cloud Console → Credentials → batasi API key ke referrer `https://rihaxz.github.io/*`.

Config Firebase ada di `js/firebase.js`. Salinan aturan yang cocok dengan kode ini ada di `firestore.rules`.

## Alamat halaman

| Alamat | Isi |
|--------|-----|
| `#/` | Beranda (portal, lore hari ini, entri terbaru) |
| `#/e/<id>` | Artikel entri — bisa dibagikan, tombol Back berfungsi |
| `#/jelajah?q=&k=&ras=&status=&era=&tag=&threat=&sort=` | Pencarian & filter |
| `#/linimasa` | Linimasa dunia per era |
| `#/peta?fokus=<id>` | Peta dunia |
| `#/bestiari` | Makhluk & monster |
| `#/tersimpan` | Tandai & riwayat baca |
| `#/acak` | Buka entri acak |
| `#/admin` | Panel admin (khusus admin) |
| `#admin` | Membuka form login admin |

## Struktur proyek

```text
├── index.html             # kerangka halaman + modal
├── manifest.webmanifest   # PWA
├── sw.js                  # service worker (offline)
├── css/style.css
├── icons/                 # ikon aplikasi & gambar pratinjau share
├── js/
│   ├── app.js             # titik masuk: routing, render, event umum
│   ├── ui.js              # state bersama, toast, modal, navigasi
│   ├── editor.js          # form tambah/edit (draf, relasi, galeri, upload)
│   ├── admin.js           # pengaturan, kategori, backup, log, revisi
│   ├── map.js             # interaksi peta
│   ├── schema.js          # DEFINISI FIELD, KATEGORI, RELASI (ubah di sini)
│   ├── storage.js         # Firestore: entri, draf, revisi, log, media, pengaturan
│   ├── relations.js       # hubungan dua arah, silsilah, backlink
│   ├── markup.js          # format teks ringan + [[tautan]]
│   ├── media.js           # kompres & tampilkan gambar
│   ├── library.js         # bookmark, riwayat, preferensi (localStorage)
│   ├── auth.js            # pembaca anonim vs admin (terpisah)
│   ├── firebase.js        # config + inisialisasi Firebase
│   ├── music-player.js    # pemutar musik latar
│   ├── utils.js           # helper kecil
│   └── views/             # template HTML (tanpa logika DOM)
├── tests/                 # tes schema, markup, dan template
├── scripts/check.js       # cek sintaks semua file JS
└── firestore.rules        # aturan keamanan Firestore
```

### Menambah field baru

Tambahkan satu baris di `js/schema.js`:

- `INFO_FIELDS` untuk data singkat (tampil di infobox), atau
- `SECTIONS` untuk teks panjang (tampil sebagai bagian artikel + daftar isi).

Isi `cats: ["Makhluk", ...]` agar field hanya muncul di form untuk kategori tersebut.

Form admin, artikel, pencarian, dan impor JSON otomatis menyesuaikan. Jangan mengganti `key` yang sudah dipakai, karena itu nama field di Firestore.

## Menjalankan lokal

```bash
npm start      # atau: python3 -m http.server 8080
npm run check  # cek sintaks semua file JS
npm test       # jalankan tes (Node 18+)
```

> Buka lewat `http://localhost`, bukan `file://` (modul ES & Firebase butuh HTTP).
