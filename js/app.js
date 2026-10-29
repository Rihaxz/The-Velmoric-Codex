/* =========================================================
   STATE & WATERMARK
   ========================================================= */
let characters = [];
let currentId  = null;
let editingId  = null;
let query      = '';
let isAdmin    = false; // Status login

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
    mainEl.innerHTML = `<div class="empty-state" style="color:#ff6b6b;">Gagal memuat data dari server. Periksa koneksi atau aturan Firebase.</div>`;
  }
}

async function simpanDataKeFirebase(data) {
  const { collection, addDoc } = window.firebaseFuncs;
  try {
    await addDoc(collection(window.firebaseDB, "karakter"), data);
    muatDataDariFirebase();
  } catch (error) {
    console.error("Gagal menyimpan:", error);
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
  
  if (!response.ok) throw new Error('Gagal mengunggah gambar ke Picrd');
  
  const data = await response.json();
  return data.image_url; // Mengembalikan link gambar
}

/* =========================================================
   UTILITAS & RENDER
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
  renderSidebar();
  const c = currentId ? getChar(currentId) : null;
  
  // Sembunyikan tombol tambah & edit jika bukan admin
  document.getElementById('btnAdd').style.display = isAdmin ? 'inline-flex' : 'none';
  document.getElementById('navAdd').style.display = isAdmin ? 'flex' : 'none';

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
    : `<div class="side-empty">${query ? 'Tidak ditemukan' : 'Codex kosong'}</div>`;
}

function renderHome() {
  const list = filterList(characters);
  mainEl.innerHTML = `
    <div class="home-hero">
      <h1>The Velmoric Codex</h1>
      <p>Arsip hidup tentang benua, ras, karakter, dan segala yang ada di antaranya. Tambahkan entri, lengkapi detailnya, dan jelajahi semuanya di satu tempat.</p>
      ${isAdmin ? `<button class="btn btn-primary" id="homeAdd">＋ Tambah Entri Baru</button>` : `<span style="font-size:13px; color:var(--text-muted); font-style:italic;">Anda dalam mode Read-Only (Pengunjung)</span>`}
    </div>
    <div class="section-head">
      <h2>Daftar Entri</h2>
      <span class="count">${list.length} entri${query ? ' (hasil pencarian)' : ''}</span>
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
      <div class="card-meta">${esc(c.ras || 'Ras belum diisi')}${c.gelar ? ' · ' + esc(c.gelar) : ''}</div>
      <p>${esc(potong(c.deskripsi || 'Belum ada deskripsi.', 100))}</p>
    </div>
  </article>`;
}

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
      alert('Gagal upload foto: ' + error.message + '\nCoba gunakan gambar yang lebih kecil atau koneksi lain.');
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
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function hapusKarakter(id) {
  if (!isAdmin) return;
  const c = getChar(id);
  if (!c) return;
  if (!confirm(`Hapus entri "${c.nama}"? Tindakan ini tidak bisa dibatalkan.`)) return;
  hapusDataDariFirebase(id);
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
});

/* =========================================================
   EVENT LISTENER UI
   ========================================================= */
document.getElementById('brandBtn').addEventListener('click', () => { currentId = null; query = ''; document.getElementById('search').value = ''; render(); window.scrollTo({ top: 0 }); });
document.getElementById('navHome').addEventListener('click', () => { currentId = null; render(); tutupSidebar(); });
document.getElementById('navAdd').addEventListener('click', () => { openModal(); tutupSidebar(); });
document.getElementById('btnAdd').addEventListener('click', () => openModal());
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

charListEl.addEventListener('click', e => {
  const el = e.target.closest('[data-open]');
  if (el) { currentId = el.dataset.open; render(); tutupSidebar(); window.scrollTo({ top: 0 }); }
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
  if (e.target.closest('[data-open]')) { currentId = e.target.closest('[data-open]').dataset.open; render(); window.scrollTo({ top: 0 }); return; }
  if (e.target.closest('#homeAdd')) openModal();
});

document.getElementById('search').addEventListener('input', e => { query = e.target.value.toLowerCase().trim(); render(); });

const sidebar = document.getElementById('sidebar');
document.getElementById('menuBtn').addEventListener('click', e => { e.stopPropagation(); sidebar.classList.toggle('open'); });
function tutupSidebar() { sidebar.classList.remove('open'); }
document.addEventListener('click', e => {
  if (window.innerWidth <= 900 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !e.target.closest('#menuBtn')) tutupSidebar();
});

/* =========================================================
   ANTI-COPY PROTECTION
   ========================================================= */
document.addEventListener('contextmenu', e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; e.preventDefault(); });
document.addEventListener('keydown', e => {
  if (e.key === 'F12' || e.keyCode === 123) e.preventDefault();
  if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) e.preventDefault();
  if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) e.preventDefault();
});

/* =========================================================
   INISIALISASI & CEK AUTH STATUS
   ========================================================= */
window.addEventListener('load', () => {
  setTimeout(() => {
    if (window.firebaseReady) {
      const { onAuthStateChanged } = window.firebaseFuncs;
      
      onAuthStateChanged(window.firebaseAuth, (user) => {
        if (user) {
          // Jika login sukses
          isAdmin = true;
          document.getElementById('btnLogout').style.display = 'inline-flex';
          document.getElementById('btnLogin').style.display = 'none';
        } else {
          // Jika belum login / logout
          isAdmin = false;
          document.getElementById('btnLogin').style.display = 'inline-flex';
          document.getElementById('btnLogout').style.display = 'none';
        }
        render(); // Render ulang untuk nampilin/sembunyiin tombol
      });

      // Muat data karakter pertama kali
      muatDataDariFirebase();
    }
  }, 800); // Delay sedikit memastikan module firebase di HTML selesai loading
});