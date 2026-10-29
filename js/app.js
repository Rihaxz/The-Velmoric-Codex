/* =========================================================
   STATE & WATERMARK
   ========================================================= */
let characters = [];
let currentId  = null;
let editingId  = null;
let query      = '';
let isAdmin    = false;
let currentView = 'home'; 
let globalSettings = { theme: 'dark', musicUrl: '' };

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
    querySnapshot.forEach((doc) => { characters.push({ id: doc.id, ...doc.data() }); });
    render(); 
  } catch (error) { console.error("Gagal memuat karakter:", error); }
}

async function simpanDataKeFirebase(data) {
  const { collection, addDoc } = window.firebaseFuncs;
  try { await addDoc(collection(window.firebaseDB, "karakter"), data); muatDataDariFirebase(); } 
  catch (error) { alert("Gagal menyimpan data."); }
}

async function updateDataDiFirebase(id, data) {
  const { doc, updateDoc } = window.firebaseFuncs;
  try { await updateDoc(doc(window.firebaseDB, "karakter", id), data); muatDataDariFirebase(); } 
  catch (error) { console.error("Gagal update:", error); }
}

async function hapusDataDariFirebase(id) {
  const { doc, deleteDoc } = window.firebaseFuncs;
  try { await deleteDoc(doc(window.firebaseDB, "karakter", id)); muatDataDariFirebase(); } 
  catch (error) { console.error("Gagal hapus:", error); }
}

/* =========================================================
   PENGATURAN GLOBAL (FIREBASE)
   ========================================================= */
async function muatPengaturanGlobal() {
  if (!window.firebaseReady) return;
  const { doc, getDoc } = window.firebaseFuncs;
  try {
    const docRef = doc(window.firebaseDB, "pengaturan", "global");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      globalSettings = docSnap.data();
      applyGlobalSettings();
    }
  } catch (error) { console.error("Gagal memuat pengaturan global:", error); }
}

function applyGlobalSettings() {
  document.body.classList.toggle('light-mode', globalSettings.theme === 'light');
  const toggleTheme = document.getElementById('toggleTheme');
  if(toggleTheme) toggleTheme.checked = (globalSettings.theme === 'light');

  const bgMusic = document.getElementById('bgMusic');
  if (globalSettings.musicUrl) {
    bgMusic.src = globalSettings.musicUrl;
    const inputMusik = document.getElementById('inputMusicUrl');
    if(inputMusik) inputMusik.value = globalSettings.musicUrl;

    // Browser memblokir autoplay. Putar saat user klik pertama kali.
    const playOnInteraction = () => {
      bgMusic.play().then(() => {
        document.getElementById('btnMusic').textContent = '⏸️';
        document.removeEventListener('click', playOnInteraction);
      }).catch(e => console.log("Autoplay diblokir."));
    };
    document.addEventListener('click', playOnInteraction, { once: true });
  }
}

async function simpanPengaturanGlobal(theme, musicUrl, apiKey) {
  const { doc, setDoc } = window.firebaseFuncs;
  try {
    await setDoc(doc(window.firebaseDB, "pengaturan", "global"), {
      theme: theme,
      musicUrl: musicUrl
    });
    localStorage.setItem('openai_key', apiKey); // API Key tetap lokal
    alert("Pengaturan Global berhasil disimpan!");
    document.getElementById('adminSettingsModal').classList.remove('show');
  } catch (error) { alert("Gagal menyimpan pengaturan. Pastikan Anda sudah login."); }
}

/* =========================================================
   UTILITAS & RENDER UTAMA
   ========================================================= */
function getChar(id) { return characters.find(c => c.id === id); }

function filterList(arr) {
  if (!query) return arr;
  const keys = ['nama','gelar','ras','kategori','gender','usia','asal','afiliasi','status','kelas','deskripsi','kepribadian','latar','kemampuan','kelemahan'];
  return arr.filter(c => keys.some(k => String(c[k] || '').toLowerCase().includes(query)));
}

const mainEl = document.getElementById('main');
const charListEl = document.getElementById('charList');

function renderAvatar(c) {
  if (c.foto) return `<img src="${esc(c.foto)}" alt="${esc(c.nama)}" loading="lazy">`;
  return esc(c.avatar || '👤');
}

function render() {
  if (currentId && !getChar(currentId)) currentId = null;
  
  const adminElements = ['btnAdd', 'navAdmin'];
  adminElements.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = isAdmin ? (id === 'btnAdd' ? 'inline-flex' : 'flex') : 'none';
  });
  
  document.getElementById('btnLogin').style.display = isAdmin ? 'none' : 'inline-flex';
  document.getElementById('btnLogout').style.display = isAdmin ? 'inline-flex' : 'none';

  renderSidebar();

  if (currentView === 'admin' && isAdmin) renderAdminDashboard();
  else if (currentId && currentView === 'article') renderChar(getChar(currentId));
  else { currentView = 'home'; renderHome(); }
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
      <div style="font-size:11px; color:var(--accent-gold); text-transform:uppercase; letter-spacing:1px;">${esc(c.kategori || 'Karakter')}</div>
      <h3>${esc(c.nama)}</h3>
      <div class="card-meta">${esc(c.ras || 'Ras belum diisi')}</div>
      <p>${esc(potong(c.deskripsi || 'Belum ada deskripsi.', 80))}</p>
    </div>
  </article>`;
}

function renderAdminDashboard() {
  const totalFoto = characters.filter(c => c.foto).length;
  mainEl.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 20px;">
      <div>
        <h1 class="page-title" style="border:none; margin:0;">Panel Admin</h1>
        <div class="page-sub" style="margin:0;">Selamat datang, Administrator.</div>
      </div>
      <button class="btn btn-outline" id="openSettingsBtn">⚙️ Pengaturan Web</button>
    </div>

    <div class="card-grid" style="margin-bottom: 30px;">
      <div class="card" style="cursor:default; border-left: 3px solid var(--accent-gold);"><div class="card-body"><div class="card-meta">Total Entri</div><h3 style="font-size:28px; margin:0;">${characters.length}</h3></div></div>
      <div class="card" style="cursor:default; border-left: 3px solid var(--accent-brown);"><div class="card-body"><div class="card-meta">Entri dengan Foto</div><h3 style="font-size:28px; margin:0;">${totalFoto}</h3></div></div>
    </div>

    <div class="section-head">
      <h2>Kelola Entri</h2>
      <button class="btn btn-primary btn-sm" id="adminAddBtn" style="margin-left:auto;">+ Tambah Baru</button>
    </div>

    <div style="background: var(--bg-darker); border: 1px solid var(--border-color); border-radius: 4px; overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead><tr style="background: var(--bg-dark); border-bottom: 1px solid var(--border-color);">
          <th style="padding: 12px; font-family: 'Cinzel';">Nama</th>
          <th style="padding: 12px; font-family: 'Cinzel';">Kategori</th>
          <th style="padding: 12px; font-family: 'Cinzel'; text-align:right;">Aksi</th>
        </tr></thead>
        <tbody>
          ${characters.length ? characters.map(c => `
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 12px; display:flex; align-items:center; gap:10px;">
                <div style="width:30px; height:30px; border-radius:4px; overflow:hidden; display:flex; align-items:center; justify-content:center; background:var(--bg-dark);">${renderAvatar(c)}</div>
                <strong>${esc(c.nama)}</strong>
              </td>
              <td style="padding: 12px; color: var(--text-muted);">${esc(c.kategori || '-')}</td>
              <td style="padding: 12px; text-align:right;">
                <button class="btn btn-sm btn-outline" data-edit="${c.id}">✏️</button>
                <button class="btn btn-sm btn-danger" data-del="${c.id}">🗑️</button>
              </td>
            </tr>`).join('') : `<tr><td colspan="3" style="padding:20px; text-align:center;">Belum ada data.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderChar(c) {
  const infoRows = [
    ['Kategori', c.kategori], ['Gelar', c.gelar], ['Ras / Spesies', c.ras], ['Jenis Kelamin', c.gender],
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
      ${isAdmin ? `<div class="tab-actions">
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
   FORM & DRAFT OTOMATIS
   ========================================================= */
const overlay = document.getElementById('overlay');
const form = document.getElementById('charForm');
const fotoUrlInput = document.getElementById('fotoUrlInput');
const previewWrap = document.getElementById('previewWrap');
const fotoPreview = document.getElementById('fotoPreview');

form.addEventListener('input', () => {
  if (!editingId) {
    const draft = Object.fromEntries(new FormData(form).entries());
    localStorage.setItem('velmoric_draft', JSON.stringify(draft));
  }
});

function openModal(id) {
  if (!isAdmin) return;
  editingId = id || null;
  form.reset();
  
  if (id) {
    const c = getChar(id);
    if (c) {
      Object.keys(c).forEach(k => { const el = form.elements[k]; if (el) el.value = c[k] ?? ''; });
      if (c.foto) { fotoPreview.src = c.foto; previewWrap.style.display = 'block'; } else { previewWrap.style.display = 'none'; }
    }
  } else {
    form.elements.avatar.value = '👤';
    const savedDraft = localStorage.getItem('velmoric_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        Object.keys(draft).forEach(k => { const el = form.elements[k]; if (el) el.value = draft[k]; });
        if (draft.foto) { fotoPreview.src = draft.foto; previewWrap.style.display = 'block'; }
      } catch(e) {}
    } else { previewWrap.style.display = 'none'; }
  }

  overlay.classList.add('show');
  document.body.classList.add('no-scroll');
  setTimeout(() => form.elements.nama.focus(), 50);
}

function closeModal() { overlay.classList.remove('show'); document.body.classList.remove('no-scroll'); editingId = null; }

if(fotoUrlInput) {
  fotoUrlInput.addEventListener('input', function() {
    const url = this.value.trim();
    if (url) { fotoPreview.src = url; previewWrap.style.display = 'block'; fotoPreview.onerror = () => previewWrap.style.display = 'none'; } 
    else { previewWrap.style.display = 'none'; fotoPreview.src = ''; }
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isAdmin) return;
  const data = Object.fromEntries(new FormData(form).entries());
  data.nama = (data.nama || '').trim();
  if (!data.nama) return;
  
  closeModal();
  localStorage.removeItem('velmoric_draft');

  if (editingId) await updateDataDiFirebase(editingId, data);
  else await simpanDataKeFirebase({ ...data, dibuat: Date.now() });
});

function hapusKarakter(id) {
  if (!isAdmin || !confirm("Hapus entri ini?")) return;
  hapusDataDariFirebase(id);
  if(currentId === id) { currentId = null; currentView = 'admin'; }
}

/* =========================================================
   CHAT AI (OPENAI DENGAN KONTEKS LORE)
   ========================================================= */
const aiChatModal = document.getElementById('aiChatModal');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');

async function kirimPesanAI() {
  const pesan = chatInput.value.trim();
  const apiKey = localStorage.getItem('openai_key');
  
  if (!pesan) return;
  if (!apiKey) { alert("Harap isi OpenAI API Key di menu Pengaturan Admin!"); return; }

  chatMessages.innerHTML += `<div class="chat-bubble chat-user">${esc(pesan)}</div>`;
  chatInput.value = '';
  chatMessages.scrollTop = chatMessages.scrollHeight;

  const loadingId = 'loading-' + Date.now();
  chatMessages.innerHTML += `<div class="chat-bubble chat-ai" id="${loadingId}">⏳ *Membaca arsip Velmor...*</div>`;
  chatMessages.scrollTop = chatMessages.scrollHeight;

  let contextLore = "Berikut adalah data karakter dan entri yang ada di dalam website The Velmoric Codex saat ini:\n";
  if (characters.length === 0) {
    contextLore += "(Belum ada karakter di database).";
  } else {
    characters.forEach(c => {
      contextLore += `- Nama: ${c.nama} | Kategori: ${c.kategori || 'Karakter'} | Ras: ${c.ras || '-'} | Deskripsi: ${c.deskripsi || '-'} | Latar: ${c.latar || '-'}\n`;
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: `Kamu adalah Arsitek Velmor, asisten AI dari The Velmoric Codex. Tugasmu adalah membantu user memahami lore, memberikan saran cerita, atau menjawab pertanyaan seputar dunia Velmor. Gunakan data berikut sebagai referensi utamamu:\n\n${contextLore}\n\nJawablah dengan gaya bahasa fantasi yang bijaksana, imajinatif, dan ringkas.` 
          },
          { role: 'user', content: pesan }
        ],
        max_tokens: 400
      })
    });

    const data = await response.json();
    document.getElementById(loadingId).remove();

    if (data.error) {
      chatMessages.innerHTML += `<div class="chat-bubble chat-ai" style="color:#ff6b6b;">Error: ${esc(data.error.message)}</div>`;
    } else {
      const balasan = data.choices[0].message.content;
      chatMessages.innerHTML += `<div class="chat-bubble chat-ai">${esc(balasan)}</div>`;
    }
  } catch (error) {
    document.getElementById(loadingId).remove();
    chatMessages.innerHTML += `<div class="chat-bubble chat-ai" style="color:#ff6b6b;">Gagal terhubung ke OpenAI.</div>`;
  }
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.getElementById('sendChat').addEventListener('click', kirimPesanAI);
chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') kirimPesanAI(); });

/* =========================================================
   LOGIN & EVENT LISTENER UI
   ========================================================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');
const settingsModal = document.getElementById('adminSettingsModal');
const bgMusic = document.getElementById('bgMusic');

document.getElementById('btnSaveSettings').addEventListener('click', () => {
  const theme = document.getElementById('toggleTheme').checked ? 'light' : 'dark';
  const musicUrl = document.getElementById('inputMusicUrl').value.trim();
  const apiKey = document.getElementById('inputApiKey').value.trim();
  simpanPengaturanGlobal(theme, musicUrl, apiKey);
});

function loadLocalSettingsToForm() {
  const apiKey = localStorage.getItem('openai_key');
  if (apiKey) document.getElementById('inputApiKey').value = apiKey;
}

document.getElementById('btnLogin').addEventListener('click', () => loginOverlay.classList.add('show'));
document.getElementById('closeLogin').addEventListener('click', () => loginOverlay.classList.remove('show'));
document.getElementById('closeSettings').addEventListener('click', () => settingsModal.classList.remove('show'));
document.getElementById('closeChatAI').addEventListener('click', () => aiChatModal.classList.remove('show'));
document.getElementById('btnChatAI').addEventListener('click', () => aiChatModal.classList.add('show'));

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPassword').value;
  const errTxt = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  
  btn.disabled = true; btn.textContent = '⏳...'; errTxt.textContent = '';

  try {
    const { signInWithEmailAndPassword } = window.firebaseFuncs;
    await signInWithEmailAndPassword(window.firebaseAuth, email, pass);
    loginOverlay.classList.remove('show');
    loginForm.reset();
    loadLocalSettingsToForm();
  } catch (error) {
    errTxt.textContent = "Login gagal: " + error.message;
  } finally { btn.disabled = false; btn.textContent = 'Masuk'; }
});

document.getElementById('btnLogout').addEventListener('click', async () => {
  await window.firebaseFuncs.signOut(window.firebaseAuth);
  currentView = 'home'; currentId = null; render();
});

document.getElementById('btnMusic').addEventListener('click', () => {
  if (bgMusic.paused) { bgMusic.play(); document.getElementById('btnMusic').textContent = '⏸️'; } 
  else { bgMusic.pause(); document.getElementById('btnMusic').textContent = '🎵'; }
});

document.getElementById('btnExport').addEventListener('click', () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(characters));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `velmoric_backup_${Date.now()}.json`);
  dlAnchor.click();
});

document.getElementById('btnImport').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        if (confirm(`Impor ${imported.length} entri? Data akan ditambahkan ke database.`)) {
          for (let item of imported) { delete item.id; await simpanDataKeFirebase(item); }
          alert("Impor selesai!");
        }
      }
    } catch (err) { alert("File JSON tidak valid."); }
  };
  reader.readAsText(file);
});

document.getElementById('brandBtn').addEventListener('click', () => { currentId = null; currentView = 'home'; query = ''; document.getElementById('search').value = ''; render(); window.scrollTo({ top: 0 }); });
document.getElementById('navHome').addEventListener('click', () => { currentView = 'home'; currentId = null; render(); tutupSidebar(); window.scrollTo({ top: 0 }); });
document.getElementById('navAdmin').addEventListener('click', () => { currentView = 'admin'; currentId = null; render(); tutupSidebar(); window.scrollTo({ top: 0 }); });
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
  if (e.target.closest('#openSettingsBtn')) { settingsModal.classList.add('show'); return; }
  if (e.target.closest('.toc a')) {
    e.preventDefault();
    const target = document.querySelector(e.target.closest('.toc a').getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (e.target.closest('[data-open]')) { currentId = e.target.closest('[data-open]').dataset.open; currentView = 'article'; render(); window.scrollTo({ top: 0 }); return; }
  if (e.target.closest('#homeAdd') || e.target.closest('#adminAddBtn')) openModal();
});

document.getElementById('search').addEventListener('input', e => { query = e.target.value.toLowerCase().trim(); render(); });

const sidebar = document.getElementById('sidebar');
document.getElementById('menuBtn').addEventListener('click', e => { e.stopPropagation(); sidebar.classList.toggle('open'); });
function tutupSidebar() { sidebar.classList.remove('open'); }
document.addEventListener('click', e => {
  if (window.innerWidth <= 900 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !e.target.closest('#menuBtn')) tutupSidebar();
});

document.addEventListener('contextmenu', e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; e.preventDefault(); });
document.addEventListener('keydown', e => {
  if (e.key === 'F12' || e.keyCode === 123) e.preventDefault();
  if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) e.preventDefault();
  if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) e.preventDefault();
});

/* =========================================================
   INISIALISASI
   ========================================================= */
render();

window.addEventListener('load', () => {
  setTimeout(() => {
    if (window.firebaseReady && window.firebaseFuncs) {
      window.firebaseFuncs.onAuthStateChanged(window.firebaseAuth, (user) => {
        isAdmin = !!user;
        if (!isAdmin) currentView = 'home'; 
        if (isAdmin) loadLocalSettingsToForm();
        render();
      });
      muatDataDariFirebase();
      muatPengaturanGlobal(); 
    }
  }, 1000);
});