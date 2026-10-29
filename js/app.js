/* =========================================================
   STATE & WATERMARK
   ========================================================= */
let characters = [];
let currentId  = null;
let editingId  = null;
let query      = '';

// Watermark Tersembunyi (Zero-Width Characters)
const WATERMARK = "\u200B\u200C\u200B\u200C\u200C\u200B\u200B\u200C\u200B\u200C\u200C\u200C"; 

function tambahWatermark(teks) {
  if (!teks) return teks;
  return teks + WATERMARK;
}

/* =========================================================
   PENYIMPANAN
   ========================================================= */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Gagal memuat data:', e);
  }
  return defaultData();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  } catch (e) {
    console.warn('Gagal menyimpan:', e);
  }
}

function getChar(id) {
  return characters.find(c => c.id === id);
}

/* =========================================================
   UPLOAD KE CATBOX.MOE
   ========================================================= */
async function uploadKeCatbox(file) {
  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('fileToUpload', file);

  const response = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Gagal mengunggah gambar ke Catbox');
  }

  const imageUrl = await response.text();
  return imageUrl.trim(); // Mengembalikan link gambar
}

/* =========================================================
   FILTER PENCARIAN
   ========================================================= */
function filterList(arr) {
  if (!query) return arr;
  const keys = [
    'nama', 'gelar', 'ras', 'gender', 'usia', 'asal',
    'afiliasi', 'status', 'kelas', 'deskripsi',
    'kepribadian', 'latar', 'kemampuan', 'kelemahan'
  ];
  return arr.filter(c =>
    keys.some(k => String(c[k] || '').toLowerCase().includes(query))
  );
}

/* =========================================================
   RENDER
   ========================================================= */
const mainEl     = document.getElementById('main');
const charListEl = document.getElementById('charList');

// Helper: Menampilkan gambar jika ada, atau Emoji jika tidak ada
function renderAvatar(c) {
  if (c.foto) {
    return `<img src="${esc(c.foto)}" alt="${esc(c.nama)}" loading="lazy">`;
  }
  return esc(c.avatar || '👤');
}

function render() {
  if (currentId && !getChar(currentId)) currentId = null;
  renderSidebar();
  const c = currentId ? getChar(currentId) : null;
  if (c) renderChar(c);
  else renderHome();
}

function renderSidebar() {
  const items = filterList(characters);
  charListEl.innerHTML = items.length
    ? items.map(c => `
        <div class="side-link ${c.id === currentId ? 'active' : ''}" data-open="${c.id}">
          <span class="side-emoji">${renderAvatar(c)}</span>
          <span class="side-name">${esc(c.nama)}</span>
        </div>`).join('')
    : `<div class="side-empty">${query ? 'Tidak ditemukan' : 'Belum ada entri'}</div>`;
}

function renderHome() {
  const list = filterList(characters);
  mainEl.innerHTML = `
    <div class="home-hero">
      <h1>The Velmoric Codex</h1>
      <p>Arsip hidup tentang benua, ras, karakter, dan segala yang ada di antaranya.
         Tambahkan entri, lengkapi detailnya, dan jelajahi semuanya di satu tempat.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" id="homeAdd">＋ Tambah Entri</button>
        <span class="hero-stat"><strong>${characters.length}</strong> entri tersimpan</span>
      </div>
    </div>
    <div class="section-head">
      <h2>Daftar Entri</h2>
      <span class="count">${list.length} entri${query ? ' (hasil pencarian)' : ''}</span>
    </div>
    ${list.length
      ? `<div class="card-grid">${list.map(cardHTML).join('')}</div>`
      : `<div class="empty-state">${
          query
            ? 'Tidak ada entri yang cocok dengan pencarianmu.'
            : 'Codex ini masih kosong. Klik “Tambah Entri” untuk memulai.'
        }</div>`}
  `;
}

function cardHTML(c) {
  return `<article class="card" data-open="${c.id}">
    <div class="card-avatar">${renderAvatar(c)}</div>
    <div class="card-body">
      <h3>${esc(c.nama)}</h3>
      <div class="card-meta">${esc(c.ras || 'Ras belum diisi')}${c.gelar ? ' · ' + esc(c.gelar) : ''}</div>
      <p>${esc(potong(c.deskripsi || 'Belum ada deskripsi.', 115))}</p>
    </div>
  </article>`;
}

function renderChar(c) {
  const infoRows = [
    ['Gelar',          c.gelar],
    ['Ras / Spesies',  c.ras],
    ['Jenis Kelamin',  c.gender],
    ['Usia',           c.usia],
    ['Tinggi',         c.tinggi],
    ['Berat',          c.berat],
    ['Asal / Dunia',   c.asal],
    ['Afiliasi',       c.afiliasi],
    ['Elemen / Kelas', c.kelas],
    ['Status',         c.status]
  ].filter(([, v]) => v && String(v).trim());

  const sections = [
    ['Deskripsi',      c.deskripsi],
    ['Kepribadian',    c.kepribadian],
    ['Latar Belakang', c.latar],
    ['Kemampuan',      c.kemampuan],
    ['Kelemahan',      c.kelemahan]
  ].map(([title, val]) => [title, tambahWatermark(val)]);

  const bodyHTML = sections.map(([title, val]) => {
    const isi = (val && String(val).trim())
      ? String(val).trim().split(/\n+/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('')
      : `<p class="empty">Belum ada informasi. Klik “Edit” untuk menambahkan.</p>`;
    return `<section class="sec" id="sec-${slug(title)}">
              <h2>${title}</h2>${isi}
            </section>`;
  }).join('');

  const tocHTML = `<div class="toc">
      <div class="toc-title">Daftar isi</div>
      <ol>${sections.map(([t]) => `<li><a href="#sec-${slug(t)}">${t}</a></li>`).join('')}</ol>
    </div>`;

  mainEl.innerHTML = `
    <div class="page-tabs">
      <span class="tab active">Artikel</span>
      <span class="tab">Pembicaraan</span>
      <div class="tab-actions">
        <button class="btn btn-sm" data-edit="${c.id}">✏️ Edit</button>
        <button class="btn btn-sm btn-danger" data-del="${c.id}">🗑️ Hapus</button>
      </div>
    </div>

    <h1 class="page-title">${esc(c.nama)}</h1>
    <div class="page-sub">Dari The Velmoric Codex, ensiklopedia bebas</div>

    <div class="article-grid">
      <div class="article-main">
        ${tocHTML}
        ${bodyHTML}
      </div>

      <aside class="infobox">
        <div class="infobox-title">${esc(c.nama)}</div>
        <div class="infobox-img">${renderAvatar(c)}</div>
        ${infoRows.length
          ? `<table class="infobox-table">${
              infoRows.map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')
            }</table>`
          : ''}
      </aside>
    </div>
  `;
}

/* =========================================================
   MODAL & FORM
   ========================================================= */
const overlay   = document.getElementById('overlay');
const form      = document.getElementById('charForm');
const modalTtl  = document.getElementById('modalTitle');
const fileInput = document.getElementById('fotoFile');
const previewWrap = document.getElementById('previewWrap');
const fotoPreview = document.getElementById('fotoPreview');
const submitBtn = document.getElementById('submitBtn');

// Tampilkan Preview saat file dipilih
fileInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      fotoPreview.src = e.target.result;
      previewWrap.style.display = 'block';
    }
    reader.readAsDataURL(file);
  } else {
    previewWrap.style.display = 'none';
    fotoPreview.src = '';
  }
});

function openModal(id) {
  editingId = id || null;
  form.reset();
  previewWrap.style.display = 'none';
  fotoPreview.src = '';
  modalTtl.textContent = id ? 'Edit Entri' : 'Tambah Entri Baru';

  if (id) {
    const c = getChar(id);
    if (c) {
      Object.keys(c).forEach(k => {
        const el = form.elements[k];
        if (el) el.value = c[k] ?? '';
      });
      // Tampilkan gambar lama jika ada
      if (c.foto) {
        fotoPreview.src = c.foto;
        previewWrap.style.display = 'block';
      }
    }
  } else {
    form.elements.avatar.value = '👤';
  }

  overlay.classList.add('show');
  document.body.classList.add('no-scroll');
  setTimeout(() => form.elements.nama.focus(), 50);
}

function closeModal() {
  overlay.classList.remove('show');
  document.body.classList.remove('no-scroll');
  editingId = null;
}

// PROSES SUBMIT FORM (Termasuk Upload ke Catbox)
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Ambil data dari form
  const data = Object.fromEntries(new FormData(form).entries());
  data.nama = (data.nama || '').trim();
  if (!data.nama) return;

  // Cek apakah user memilih gambar baru
  const file = fileInput.files[0];
  let finalFotoUrl = editingId ? getChar(editingId)?.foto : null; // Default foto lama (jika edit)

  if (file) {
    try {
      // Ubah tombol jadi loading
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Mengunggah foto...';
      
      // Upload ke Catbox
      const url = await uploadKeCatbox(file);
      finalFotoUrl = url;
      
      // Kembalikan tombol
      submitBtn.textContent = '💾 Simpan Entri';
      submitBtn.disabled = false;
    } catch (error) {
      alert('Gagal mengunggah foto: ' + error.message + '\nCoba matikan Wi-Fi dan gunakan kuota, atau nyalakan VPN.');
      submitBtn.textContent = '💾 Simpan Entri';
      submitBtn.disabled = false;
      return; // Hentikan proses simpan jika upload gagal
    }
  }

  // Masukkan URL foto ke data
  data.foto = finalFotoUrl || '';

  // Simpan ke state & localStorage
  if (editingId) {
    const idx = characters.findIndex(c => c.id === editingId);
    if (idx > -1) characters[idx] = { ...characters[idx], ...data };
    currentId = editingId;
  } else {
    const baru = { id: uid(), ...data, dibuat: Date.now() };
    characters.unshift(baru);
    currentId = baru.id;
  }

  save();
  closeModal();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function hapusKarakter(id) {
  const c = getChar(id);
  if (!c) return;
  if (!confirm(`Hapus entri "${c.nama}"? Tindakan ini tidak bisa dibatalkan.`)) return;
  characters = characters.filter(x => x.id !== id);
  if (currentId === id) currentId = null;
  save();
  render();
}

/* =========================================================
   EVENT LISTENER
   ========================================================= */
document.getElementById('btnAdd').addEventListener('click', () => openModal());
document.getElementById('brandBtn').addEventListener('click', () => {
  currentId = null;
  query = '';
  document.getElementById('search').value = '';
  render();
  window.scrollTo({ top: 0 });
});

document.getElementById('navHome').addEventListener('click', () => {
  currentId = null;
  render();
  tutupSidebar();
});
document.getElementById('navAdd').addEventListener('click', () => {
  openModal();
  tutupSidebar();
});

charListEl.addEventListener('click', e => {
  const el = e.target.closest('[data-open]');
  if (el) {
    currentId = el.dataset.open;
    render();
    tutupSidebar();
    window.scrollTo({ top: 0 });
  }
});

mainEl.addEventListener('click', e => {
  const editBtn = e.target.closest('[data-edit]');
  if (editBtn) { openModal(editBtn.dataset.edit); return; }

  const delBtn = e.target.closest('[data-del]');
  if (delBtn) { hapusKarakter(delBtn.dataset.del); return; }

  const tocLink = e.target.closest('.toc a');
  if (tocLink) {
    e.preventDefault();
    const target = document.querySelector(tocLink.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const card = e.target.closest('[data-open]');
  if (card) {
    currentId = card.dataset.open;
    render();
    window.scrollTo({ top: 0 });
    return;
  }

  if (e.target.closest('#homeAdd')) openModal();
});

document.getElementById('search').addEventListener('input', e => {
  query = e.target.value.toLowerCase().trim();
  render();
});

document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && overlay.classList.contains('show')) closeModal();
});

const sidebar = document.getElementById('sidebar');
document.getElementById('menuBtn').addEventListener('click', e => {
  e.stopPropagation();
  sidebar.classList.toggle('open');
});
function tutupSidebar() { sidebar.classList.remove('open'); }
document.addEventListener('click', e => {
  if (window.innerWidth <= 900 &&
      sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      !e.target.closest('#menuBtn')) {
    tutupSidebar();
  }
});

/* =========================================================
   ANTI-COPY PROTECTION (F12, CTRL+U, KLIK KANAN)
   ========================================================= */
document.addEventListener('contextmenu', function(e) {
  // Abaikan klik kanan di dalam input file/text agar tidak mengganggu
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  e.preventDefault(); 
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'F12' || e.keyCode === 123) {
    e.preventDefault();
    return false;
  }
  if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
    e.preventDefault();
    return false;
  }
  if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
    e.preventDefault();
    return false;
  }
});

/* =========================================================
   MULAI APLIKASI
   ========================================================= */
characters = load();
render();