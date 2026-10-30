# 🗺️ The Velmoric Codex

> *"Setiap dunia punya ingatan. Di sinilah ingatan Velmor disimpan."*

**The Velmoric Codex** adalah ensiklopedia dunia fantasi Velmor (karakter, kerajaan, ras, makhluk, artefak, lokasi, organisasi, peristiwa). Situs statis (HTML/CSS/JS murni) dengan data di **Firebase Firestore**.

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
5. **Firestore → Rules**: tempel isi `firestore.rules` lalu **Publish**.
6. (Disarankan) Google Cloud Console → Credentials → batasi API key ke referrer `https://rihaxz.github.io/*`.

Config Firebase ada di `index.html` (blok `firebaseConfig`).

## Struktur proyek

```text
├── index.html
├── css/style.css
├── js/
│   ├── data.js          # state global + helper
│   ├── storage.js       # CRUD Firestore + tema/pengaturan
│   ├── auth.js          # pembaca anonim vs admin (terpisah)
│   ├── music-player.js  # pemutar musik latar
│   └── logic.js         # UI, render, event
├── firestore.rules      # aturan keamanan Firestore
└── legacy/              # kode lama (tidak dipakai)
```

## Menjalankan lokal

```bash
npm start      # atau: python3 -m http.server 8080
npm run check  # cek sintaks semua file JS
```

> Buka lewat `http://localhost`, bukan `file://` (modul Firebase butuh HTTP).
