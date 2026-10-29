# 🗺️ The Velmoric Codex

> *"Every realm has a memory. This is where Velmor's is kept."*
> *"Setiap dunia punya ingatan. Di sinilah ingatan Velmor disimpan."*

**The Velmoric Codex** is a living, open-archive web application designed to chronicle the world of Velmor. It serves as a Wikipedia-style encyclopedia where you can add, edit, and explore the lore of your fictional universe, all stored locally in your browser.

**The Velmoric Codex** adalah aplikasi web arsip hidup yang didesain untuk mencatat dunia Velmor. Web ini berfungsi seperti ensiklopedia ala Wikipedia tempat kamu bisa menambah, mengedit, dan menjelajahi lore dunia fiksimu, yang tersimpan secara lokal di browser.

---

## ✨ What's Inside / Isi Codex

Didesain untuk menampung segala bentuk pengetahuan tentang dunia Velmor, termasuk:

- 🗺️ **Continents & Realms** — *Benua & Wilayah* (Geografi, perbatasan, tempat misterius).
- 🧬 **Races & Entities** — *Ras & Entitas* (Kaum fana, makhluk purba, roh).
- 👤 **Characters & Figures** — *Karakter & Tokoh* (Pahlawan, penjahat, legenda).
- ✨ **Powers & Forces** — *Kekuatan & Daya* (Sihir, afinitas, seni terlarang).
- 🌗 **Seasons & Conditions** — *Musim & Kondisi* (Siklus alam, cuaca ekstrem).
- 📜 **Events & History** — *Peristiwa & Sejarah* (Perang, perjanjian, titik balik).
- 🌀 **Anomalies & Curiosities** — *Anomali & Keanehan* (Fenomena yang menolak penjelasan).

---

## 🚀 Tech Stack & Features

- **Pure Vanilla:** HTML5, CSS3, Vanilla JavaScript (No frameworks, no dependencies).
- **LocalStorage:** Data karakter tersimpan otomatis di perangkat pengguna tanpa perlu database/server.
- **Responsive:** Tampilan optimal di PC maupun HP.
- **Wikipedia Style:** Dilengkapi Infobox, Daftar Isi (TOC), dan section artikel.
- **Anti-Copy & Watermark:** Dilindungi dari *copy-paste* sembarangan dan disisipkan *invisible watermark* pada teks.

---

## 📁 Project Structure / Struktur Proyek

```text
the-velmoric-codex/
├── index.html       # Struktur utama halaman web
├── css/
│   └── style.css    # Styling antarmuka (tema Wikipedia)
├── js/
│   ├── data.js      # Data awal & fungsi utilitas (helper)
│   └── app.js       # Logika utama (render, form, anti-copy)
└── README.md        # Dokumentasi ini# The-Velmoric-Codex