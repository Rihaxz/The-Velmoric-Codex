/* =========================================================
   STATE & WATERMARK
   ========================================================= */
let characters = [];
let currentId  = null;
let editingId  = null;
let query      = '';
let isAdmin    = false;
let currentView = 'home'; // 'home', 'article', atau 'admin'

// Watermark Tersembunyi
const WATERMARK = "\u200B\u200C\u200B\u200C\u200C\u200B\u200B\u200C\u200B\u200C\u200C\u200C"; 
function tambahWatermark(teks) { return teks ? teks + WATERMARK : teks; }

/* =========================================================
   DATABASE FIREBASE (CRUD)
   ========================================================= */
async function muatDataDariFirebase() {
  if (!window.firebaseReady) return;
  const { collection, getDocs } = window.firebaseFuncs;
  try {
    const querySnapshot = await getDocs(collection(window.firebaseDB, "karakter"));
    characters = [];
    querySnapshot.forEach((doc) => {
      characters.push({ id: doc.id, ...doc.data() });
    });
    render(); 
  } catch (error) {
    console.error("Gagal memuat data:", error);
  }
}

async function simpanDataKeFirebase(data) {
  const { collection, addDoc } = window.firebaseFuncs;
  try {
    await addDoc(collection(window.firebaseDB, "karakter"), data);
    muatDataDariFirebase();
  } catch (error) {
    alert("Gagal menyimpan data. Pastikan Anda sudah login.");
  }
}

async function updateDataDiFirebase(id, data) {
  const { doc, updateDoc } = window.firebaseFuncs;
  try {
    await updateDoc(doc(window.firebaseDB, "karakter", id), data);
    muatDataDariFirebase();
  } catch (error) {
    console.error("Gagal update:", error);
  }
}

async function hapusDataDariFirebase(id) {
  const { doc, deleteDoc } = window.firebaseFuncs;
  try {
    await deleteDoc(doc(window.firebaseDB, "karakter", id));
    muatDataDariFirebase();
  } catch (error) {
    console.error("Gagal hapus:", error);
  }
}

/* =========================================================
   UPLOAD GAMBAR KE PICRD
   ========================================================= */
async function uploadKePicrd(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('https://picrd.com/api/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) throw new Error('Gagal mengunggah gambar');
  const data = await response.json();
  return data.image_url;
}

/* =========================================================
   UTILITAS & RENDER UTAMA
   ========================================================= */
function getChar(id) { return characters.find(c => c.id === id); }

function filterList(arr) {
  if (!query) return arr;
  const keys = ['nama','gelar','ras','gender','usia','asal','afiliasi','status','kelas','deskripsi','kepribadian','latar','kemampuan','kelemahan'];
  return arr.filter(c => keys.some(k => String(c[k] || '').toLowerCase().includes(query)));
}

const mainEl     = document.getElementById('main');
const charListEl = document.getElementById('charList');

function renderAvatar(c) {
  if (c.foto) return `<img src="${esc(c.foto)}" alt="${esc(c.nama)}" loading="lazy">`;
  return esc(c.avatar || '👤');
}

function render() {
  if (currentId && !getChar(currentId)) currentId = null;
  
  // Tampilkan/Sembunyikan menu berdasarkan status login
  const adminElements = ['btnAdd', 'navAdd', 'navAdmin'];
  adminElements.forEach(id => {
    document.getElementById(id).style.display = isAdmin ? (id === 'btnAdd' ? 'inline-flex' : 'flex') : 'none';
  });

  renderSidebar();

  // Tentukan view yang akan dirender
  if (currentView === 'admin' && isAdmin) {
    renderAdminDashboard();
  } else if (currentId && currentView === 'article') {
    renderChar(getChar(currentId));
  } else {
    currentView = 'home';
    renderHome();
  }
}

function renderSidebar() {
  const items = filterList(characters);
  charListEl.innerHTML = items.length
    ? items.map(c => `
        <div class="side-link ${c.id === currentId && currentView === 'article' ? 'active' : ''}" data-open="${c.id}">
          <span class="side-emoji">${renderAvatar(c)}</span>
          <span class="side-name">${esc(c.nama)}</span>
        </div>`).join('')
    : `<div class="side-empty">Codex kosong</div>`;
}

/* =========================================================
   VIEW: HALAMAN UTAMA
   ========================================================= */
function renderHome() {
  const list = filterList(characters);
  mainEl.innerHTML = `
    <div class="home-hero">
      <h1>The Velmoric Codex</h1>
      <p>Arsip hidup tentang benua, ras, karakter, dan segala yang ada di antaranya.</p>
      ${isAdmin ? `<button class="btn btn-primary" id="homeAdd">＋ Tambah Entri Baru</button>` : ``}
    </div>
    <div class="section-head">
      <h2>Daftar Entri</h2>
      <span class="count">${list.length} entri</span>
    </div>
    ${list.length
      ? `<div class="card-grid">${list.map(cardHTML).join('')}</div>`
      : `<div class="empty-state">Codex ini masih kosong.</div>`}
  `;
}

function cardHTML(c) {
  return `<article class="card" data-open="${c.id}">
    <div class="card-avatar">${renderAvatar(c)}</div>
    <div class="card-body">
      <h3>${esc(c.nama)}</h3>
      <div class="card-meta">${esc(c.ras || 'Ras belum diisi')}</div>
      <p>${esc(potong(c.deskripsi || 'Belum ada deskripsi.', 100))}</p>
    </div>
  </article>`;
}

/* =========================================================
   VIEW: PANEL ADMIN (BARU)
   ========================================================= */
function renderAdminDashboard() {
  // Hitung statistik
  const totalChar = characters.length;
  const totalFoto = characters.filter(c => c.foto).length;
  const totalRas = new Set(characters.map(c => c.ras).filter(Boolean)).size;

  mainEl.innerHTML = `
    <h1 class="page-title">Panel Admin</h1>
    <div class="page-sub">Selamat datang, Administrator. Kelola isi Codex dari sini.</div>

    <!-- Kartu Statistik -->
    <div class="card-grid" style="margin-bottom: 30px;">
      <div class="card" style="cursor:default; border-left: 3px solid var(--accent-gold);">
        <div class="card-body">
          <div class="card-meta">Total Entri Karakter</div>
          <h3 style="font-size: 28px; margin:0;">${totalChar}</h3>
        </div>
      </div>
      <div class="card" style="cursor:default; border-left: 3px solid var(--accent-brown);">
        <div class="card-body">
          <div class="card-meta">Entri dengan Foto</div>
          <h3 style="font-size: 28px; margin:0;">${totalFoto}</h3>
        </div>
      </div>
      <div class="card" style="cursor:default; border-left: 3px solid #5a8f7b;">
        <div class="card-body">
          <div class="card-meta">Ras / Spesies Unik</div>
          <h3 style="font-size: 28px; margin:0;">${totalRas}</h3>
        </div>
      </div>
    </div>

    <div class="section-head">
      <h2>Kelola Entri</h2>
      <button class="btn btn-primary btn-sm" id="adminAddBtn" style="margin-left:auto;">+ Tambah Baru</button>
    </div>

    <!-- Tabel Kelola Karakter -->
    <div style="background: var(--bg-darker); border: 1px solid var(--border-color); border-radius: 4px; overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="background: var(--bg-dark); border-bottom: 1px solid var(--border-color);">
            <th style="padding: 12px; font-family: 'Cinzel';">Nama</th>
            <th style="padding: 12px; font-family: 'Cinzel';">Ras</th>
            <th style="padding: 12px; font-family: 'Cinzel';">Status</th>
            <th style="padding: 12px; font-family: 'Cinzel'; text-align:right;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${characters.length ? characters.map(c => `
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 12px; display:flex; align-items:center; gap:10px;">
                <div style="width:30px; height:30px; border-radius:4px; overflow:hidden; display:flex; align-items:center; justify-content:center; background:var(--bg-dark);">
                  ${renderAvatar(c)}
                </div>
                <strong>${esc(c.nama)}</strong>
              </td>
              <td style="padding: 12px; color: var(--text-muted);">${esc(c.ras || '-')}</td>
              <td style="padding: 12px; color: var(--accent-gold);">${esc(c.status || '-')}</td>
              <td style="padding: 12px; text-align:right;">
                <button class="btn btn-sm btn-outline" data-edit="${c.id}">✏️</button>
                <button class="btn btn-sm btn-danger" data-del="${c.id}">🗑️</button>
              </td>
            </tr>
          `).join('') : `<tr><td colspan="4" style="padding:20px; text-align:center;">Belum ada data.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

/* =========================================================
   VIEW: ARTIKEL KARAKTER
   ========================================================= */
function renderChar(c) {
  const infoRows = [
    ['Gelar', c.gelar], ['Ras / Spesies', c.ras], ['Jenis Kelamin', c.gender],
    ['Usia', c.usia], ['Tinggi', c.tinggi], ['Berat', c.berat], ['Asal / Dunia', c.asal],
    ['Afiliasi', c.afiliasi], ['Elemen / Kelas', c.kelas], ['Status', c.status]
  ].filter(([, v]) => v && String(v).trim());

  const sections = [
    ['Deskripsi', c.deskripsi], ['Kepribadian', c.kepribadian], ['Latar Belakang', c.latar],
    ['Kemampuan', c.kemampuan], ['Kelemahan', c.kelemahan]
  ].map(([title, val]) => [title, tambahWatermark(val)]);

  const bodyHTML = sections.map(([title, val]) => {
    const isi = (val && String(val).trim())
      ? String(val).trim().split(/\n+/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('')
      : `<p class="empty">Belum ada informasi.</p>`;
    return `<section class="sec" id="sec-${slug(title)}"><h2>${title}</h2>${isi}</section>`;
  }).join('');

  const tocHTML = `<div class="toc"><div class="toc-title">Daftar isi</div><ol>${sections.map(([t]) => `<li><a href="#sec-${slug(t)}">${t}</a></li>`).join('')}</ol></div>`;

  mainEl.innerHTML = `
    <div class="page-tabs">
      <span class="tab active">Artikel</span>
      <span class="tab">Pembicaraan</span>
      ${isAdmin ? `
      <div class="tab-actions">
        <button class="btn btn-sm btn-outline" data-edit="${c.id}">✏️ Edit</button>
        <button class="btn btn-sm btn-danger" data-del="${c.id}">🗑️ Hapus</button>
      </div>` : ''}
    </div>

    <h1 class="page-title">${esc(c.nama)}</h1>
    <div class="page-sub">Dari The Velmoric Codex, ensiklopedia bebas</div>

    <div class="article-grid">
      <div class="article-main">${tocHTML}${bodyHTML}</div>
      <aside class="infobox">
        <div class="infobox-title">${esc(c.nama)}</div>
        <div class="infobox-img">${renderAvatar(c)}</div>
        ${infoRows.length ? `<table class="infobox-table">${infoRows.map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')}</table>` : ''}
      </aside>
    </div>
  `;
}

/* =========================================================
   MODAL & FORM KARAKTER
   ========================================================= */
const overlay = document.getElementById('overlay');
const form = document.getElementById('charForm');
const modalTtl = document.getElementById('modalTitle');
const fileInput = document.getElementById('fotoFile');
const previewWrap = document.getElementById('previewWrap');
const fotoPreview = document.getElementById('fotoPreview');
const submitBtn = document.getElementById('submitBtn');

fileInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) { fotoPreview.src = e.target.result; previewWrap.style.display = 'block'; };
    reader.readAsDataURL(file);
  } else {
    previewWrap.style.display = 'none'; fotoPreview.src = '';
  }
});

function openModal(id) {
  if (!isAdmin) return;
  editingId = id || null;
  form.reset();
  previewWrap.style.display = 'none';
  fotoPreview.src = '';
  modalTtl.textContent = id ? 'Edit Entri' : 'Tambah Entri Baru';

  if (id) {
    const c = getChar(id);
    if (c) {
      Object.keys(c).forEach(k => { const el = form.elements[k]; if (el) el.value = c[k] ?? ''; });
      if (c.foto) { fotoPreview.src = c.foto; previewWrap.style.display = 'block'; }
    }
  } else {
    form.elements.avatar.value = '👤';
  }

  overlay.classList.add('show');
  document.body.classList.add('no-scroll');
  setTimeout(() => form.elements.nama.focus(), 50);
}

function closeModal() { overlay.classList.remove('show'); document.body.classList.remove('no-scroll'); editingId = null; }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isAdmin) return;
  
  const data = Object.fromEntries(new FormData(form).entries());
  data.nama = (data.nama || '').trim();
  if (!data.nama) return;

  const file = fileInput.files[0];
  let finalFotoUrl = editingId ? getChar(editingId)?.foto : null;

  if (file) {
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Mengunggah...';
      const url = await uploadKePicrd(file);
      finalFotoUrl = url;
      submitBtn.textContent = '💾 Simpan';
      submitBtn.disabled = false;
    } catch (error) {
      alert('Gagal upload foto: ' + error.message);
      submitBtn.textContent = '💾 Simpan';
      submitBtn.disabled = false;
      return;
    }
  }

  data.foto = finalFotoUrl || '';
  closeModal();

  if (editingId) {
    await updateDataDiFirebase(editingId, data);
  } else {
    await simpanDataKeFirebase({ ...data, dibuat: Date.now() });
  }
});

function hapusKarakter(id) {
  if (!isAdmin) return;
  const c = getChar(id);
  if (!c) return;
  if (!confirm(`Hapus entri "${c.nama}"? Tindakan ini tidak bisa dibatalkan.`)) return;
  hapusDataDariFirebase(id);
  if(currentId === id) { currentId = null; currentView = 'admin'; }
}

/* =========================================================
   LOGIN & AUTHENTICATION
   ========================================================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');

document.getElementById('btnLogin').addEventListener('click', () => loginOverlay.classList.add('show'));
document.getElementById('closeLogin').addEventListener('click', () => loginOverlay.classList.remove('show'));

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPassword').value;
  const errTxt = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  
  btn.disabled = true; btn.textContent = '⏳ Memeriksa...'; errTxt.textContent = '';

  try {
    const { signInWithEmailAndPassword } = window.firebaseFuncs;
    await signInWithEmailAndPassword(window.firebaseAuth, email, pass);
    loginOverlay.classList.remove('show');
    loginForm.reset();
  } catch (error) {
    errTxt.textContent = "Login gagal: Email atau password salah.";
  } finally {
    btn.disabled = false; btn.textContent = 'Masuk';
  }
});

document.getElementById('btnLogout').addEventListener('click', async () => {
  const { signOut } = window.firebaseFuncs;
  await signOut(window.firebaseAuth);
  currentView = 'home';
  currentId = null;
  render();
});

/* =========================================================
   EVENT LISTENER UI
   ========================================================= */
document.getElementById('brandBtn').addEventListener('click', () => { currentId = null; currentView = 'home'; query = ''; document.getElementById('search').value = ''; render(); window.scrollTo({ top: 0 }); });
document.getElementById('navHome').addEventListener('click', () => { currentView = 'home'; currentId = null; render(); tutupSidebar(); window.scrollTo({ top: 0 }); });
document.getElementById('navAdmin').addEventListener('click', () => { currentView = 'admin'; currentId = null; render(); tutupSidebar(); window.scrollTo({ top: 0 }); });
document.getElementById('navAdd').addEventListener('click', () => { openModal(); tutupSidebar(); });
document.getElementById('btnAdd').addEventListener('click', () => openModal());
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

charListEl.addEventListener('click', e => {
  const el = e.target.closest('[data-open]');
  if (el) { currentId = el.dataset.open; currentView = 'article'; render(); tutupSidebar(); window.scrollTo({ top: 0 }); }
});

mainEl.addEventListener('click', e => {
  if (e.target.closest('[data-edit]')) { openModal(e.target.closest('[data-edit]').dataset.edit); return; }
  if (e.target.closest('[data-del]')) { hapusKarakter(e.target.closest('[data-del]').dataset.del); return; }
  if (e.target.closest('.toc a')) {
    e.preventDefault();
    const target = document.querySelector(e.target.closest('.toc a').getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (e.target.closest('[data-open]')) { currentId = e.target.closest('[data-open]').dataset.open; currentView = 'article'; render(); window.scrollTo({ top: 0 }); return; }
  
  // Tombol di dalam halaman Home / Admin
  if (e.target.closest('#homeAdd') || e.target.closest('#adminAddBtn')) openModal();
});

document.getElementById('search').addEventListener('input', e => { query = e.target.value.toLowerCase().trim(); render(); });

const sidebar = document.getElementById('sidebar');
document.getElementById('menuBtn').addEventListener('click', e => { e.stopPropagation(); sidebar.classList.toggle('open'); });
function tutupSidebar() { sidebar.classList.remove('open'); }
document.addEventListener('click', e => {
  if (window.innerWidth <= 900 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !e.target.closest('#menuBtn')) tutupSidebar();
});

/* =========================================================
   ANTI-COPY & INISIALISASI AUTH
   ========================================================= */
document.addEventListener('contextmenu', e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; e.preventDefault(); });
document.addEventListener('keydown', e => {
  if (e.key === 'F12' || e.keyCode === 123) e.preventDefault();
  if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) e.preventDefault();
  if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) e.preventDefault();
});

window.addEventListener('load', () => {
  setTimeout(() => {
    if (window.firebaseReady) {
      const { onAuthStateChanged } = window.firebaseFuncs;
      
      onAuthStateChanged(window.firebaseAuth, (user) => {
        if (user) {
          isAdmin = true;
          document.getElementById('btnLogout').style.display = 'inline-flex';
          document.getElementById('btnLogin').style.display = 'none';
        } else {
          isAdmin = false;
          document.getElementById('btnLogin').style.display = 'inline-flex';
          document.getElementById('btnLogout').style.display = 'none';
          currentView = 'home'; // Balik ke home jika logout
        }
        render();
      });

      muatDataDariFirebase();
    }
  }, 800);
});