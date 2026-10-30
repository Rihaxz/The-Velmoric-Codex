
/* =====================================================
   THE VELMORIC CODEX
   MAIN LOGIC
   Anonymous Reader + Verified Admin
===================================================== */

/* =====================================================
   AUTH CONFIGURATION
===================================================== */

const ADMIN_UID = "sjdoIiErGEMsYG7VVTazZ9xXWwh1";

/* =====================================================
   GLOBAL STATE
===================================================== */

let characters = [];
let currentId = null;
let editingId = null;
let query = "";

let isAdmin = false;
let isLoggedIn = false;
let isAnonymous = true;

let currentView = "home";

let globalSettings = {
    theme: "dark",
    musicUrls: []
};

let musicPlaylist = [];
let currentTrackIndex = 0;
let authStarted = false;

/* =====================================================
   DOM HELPERS
===================================================== */

const $ = id => document.getElementById(id);

const main = $("main");
const sidebar = $("sidebar");
const form = $("charForm");

const overlay = $("overlay");
const loginOverlay = $("loginOverlay");
const settingsModal = $("adminSettingsModal");

/* =====================================================
   STATUS MESSAGE
===================================================== */

function setStatus(message, error = false) {

    let element = $("appStatus");

    if (!element) {

        element = document.createElement("p");
        element.id = "appStatus";

        main.prepend(element);
    }

    element.textContent = message;

    element.className = error
        ? "error"
        : "status";
}

/* =====================================================
   CHARACTER HELPERS
===================================================== */

function getChar(id) {

    return characters.find(
        character => character.id === id
    );
}

function filtered() {

    const sorted = [...characters].sort((a, b) =>
        String(a.nama || "").localeCompare(
            String(b.nama || "")
        )
    );

    if (!query) return sorted;

    return sorted.filter(character => {

        return Object.values(character).some(value =>

            String(value ?? "")
                .toLowerCase()
                .includes(query)

        );

    });
}

/* =====================================================
   IMAGE HTML
===================================================== */

function avatarHTML(character) {

    if (character.foto) {

        return `
            <img
                src="${esc(character.foto)}"
                alt="${esc(character.nama)}"
                loading="lazy"
                onerror="this.style.display='none'"
            >
        `;
    }

    return esc(character.avatar || "👤");
}

/* =====================================================
   CHARACTER CARD
===================================================== */

function cardHTML(character) {

    return `
        <article
            class="card"
            data-open="${esc(character.id)}"
            tabindex="0"
        >

            <div class="avatar">
                ${avatarHTML(character)}
            </div>

            <div class="card-content">

                <h3>
                    ${esc(character.nama)}
                </h3>

                <small>
                    ${esc(character.kategori || "Karakter")}
                    ·
                    ${esc(character.gelar || character.ras || "")}
                </small>

                <p>
                    ${esc(character.deskripsi || "Belum ada deskripsi.")}
                </p>

                ${
                    isAdmin
                    ? `
                        <button
                            class="btn small-btn"
                            data-edit="${esc(character.id)}"
                        >
                            Edit
                        </button>

                        <button
                            class="btn danger small-btn"
                            data-del="${esc(character.id)}"
                        >
                            Hapus
                        </button>
                    `
                    : ""
                }

            </div>

        </article>
    `;
}

/* =====================================================
   SIDEBAR
===================================================== */

function renderSidebar() {

    const list = $("charList");

    if (!list) return;

    list.innerHTML = filtered().map(character => `

        <button
            class="side-link"
            data-open="${esc(character.id)}"
        >

            <span class="side-avatar">
                ${avatarHTML(character)}
            </span>

            ${esc(character.nama)}

        </button>

    `).join("") || `

        <p class="empty">
            Belum ada entri.
        </p>

    `;
}

/* =====================================================
   ARTICLE SECTION
===================================================== */

function sectionHTML(title, key) {

    const value = getChar(currentId)?.[key];

    return `

        <section
            class="section"
            id="${key}"
        >

            <h2>
                ${title}
            </h2>

            <p>
                ${
                    value
                    ? esc(value).replace(/\n/g, "<br>")
                    : "<i>Belum ada informasi.</i>"
                }
            </p>

        </section>

    `;
}

/* =====================================================
   HOME PAGE
===================================================== */

function renderHome() {

    const list = filtered();

    return `

        <section class="hero hero-illustrated">

            <div class="hero-copy">

                <p>
                    ARSIP DUNIA VELMOR
                </p>

                <h1>
                    The Velmoric Codex
                </h1>

                <p>
                    Ensiklopedia karakter, makhluk,
                    lokasi, artefak, dan sejarah dunia fantasi.
                </p>

                ${
                    isAdmin
                    ? `
                        <button
                            class="btn primary"
                            id="homeAdd"
                        >
                            Tambah Entri
                        </button>

                        <button
                            class="btn"
                            id="openSettingsBtn"
                        >
                            Pengaturan
                        </button>
                    `
                    : ""
                }

            </div>

            <div
                class="hero-art"
                role="img"
                aria-label="Ilustrasi fantasi dunia Velmor"
            ></div>

        </section>

        <section class="codex-intro">

            <div>

                <span class="eyebrow">
                    PENGETAHUAN YANG TERLUPAKAN
                </span>

                <h2>
                    Catatan dari dunia lain
                </h2>

                <p>
                    Jelajahi tokoh, kerajaan, makhluk,
                    relik, dan peristiwa yang membentuk
                    sejarah Velmor.
                </p>

            </div>

            <div class="intro-stat">

                <strong>
                    ${characters.length}
                </strong>

                <span>
                    ARSIP TERSIMPAN
                </span>

            </div>

        </section>

        <h2 class="archive-heading">

            ${query ? "Hasil Pencarian" : "Arsip Codex"}

            <small>
                ${list.length} entri
            </small>

        </h2>

        <div class="card-grid">

            ${
                list.map(cardHTML).join("")
                ||
                '<p class="empty">Tidak ada entri yang cocok.</p>'
            }

        </div>

    `;
}

/* =====================================================
   ARTICLE PAGE
===================================================== */

function renderArticle(character) {

    const fields = [

        ["Kategori", "kategori"],
        ["Gelar", "gelar"],
        ["Ras", "ras"],
        ["Jenis Kelamin", "gender"],
        ["Usia", "usia"],
        ["Tinggi", "tinggi"],
        ["Berat", "berat"],
        ["Asal", "asal"],
        ["Afiliasi", "afiliasi"],
        ["Kelas", "kelas"],
        ["Status", "status"]

    ];

    return `

        <button
            class="btn"
            id="backHome"
        >
            ← Kembali
        </button>

        <h1 class="page-title">
            ${esc(character.nama)}
        </h1>

        <p class="muted">
            ${esc(character.gelar || character.kategori || "Arsip Codex")}
        </p>

        <div class="article-grid">

            <article>

                <nav class="toc">

                    <b>Daftar Isi</b>

                    <ol>

                        <li><a href="#deskripsi">Deskripsi</a></li>
                        <li><a href="#kepribadian">Kepribadian</a></li>
                        <li><a href="#latar">Latar Belakang</a></li>
                        <li><a href="#kemampuan">Kemampuan</a></li>
                        <li><a href="#kelemahan">Kelemahan</a></li>

                    </ol>

                </nav>

                ${sectionHTML("Deskripsi", "deskripsi")}

                ${sectionHTML("Kepribadian", "kepribadian")}

                ${sectionHTML("Latar Belakang", "latar")}

                ${sectionHTML("Kemampuan", "kemampuan")}

                ${sectionHTML("Kelemahan", "kelemahan")}

            </article>

            <aside class="infobox">

                <h2>
                    ${esc(character.nama)}
                </h2>

                <div class="infobox-img">
                    ${avatarHTML(character)}
                </div>

                <table>

                    ${
                        fields
                        .filter(([, key]) => character[key])
                        .map(([label, key]) => `

                            <tr>

                                <th>
                                    ${label}
                                </th>

                                <td>
                                    ${esc(character[key])}
                                </td>

                            </tr>

                        `).join("")
                    }

                </table>

                ${
                    isAdmin
                    ? `
                        <button
                            class="btn"
                            data-edit="${esc(character.id)}"
                        >
                            Edit
                        </button>

                        <button
                            class="btn danger"
                            data-del="${esc(character.id)}"
                        >
                            Hapus
                        </button>
                    `
                    : ""
                }

            </aside>

        </div>

    `;
}

/* =====================================================
   ADMIN DASHBOARD
===================================================== */

function renderAdminPanel() {

    const list = filtered();

    return `

        <section class="hero">

            <p class="eyebrow">
                ADMINISTRATION
            </p>

            <h1>
                Codex Control Center
            </h1>

            <p>
                Kelola seluruh arsip dan konfigurasi
                The Velmoric Codex.
            </p>

            <div class="actions">

                <button
                    class="btn primary"
                    id="adminAddBtn"
                >
                    + Tambah Entri
                </button>

                <button
                    class="btn"
                    id="openSettingsBtn"
                >
                    Pengaturan Website
                </button>

                <button
                    class="btn"
                    id="exportPanel"
                >
                    Ekspor Database
                </button>

            </div>

        </section>

        <section class="codex-intro">

            <div>
                <h2>
                    Ringkasan Database
                </h2>

                <p>
                    Status administrator terverifikasi.
                </p>
            </div>

            <div class="intro-stat">

                <strong>
                    ${characters.length}
                </strong>

                <span>
                    TOTAL ENTRI
                </span>

            </div>

        </section>

        <h2 class="archive-heading">
            Manajemen Arsip
            <small>${list.length} entri</small>
        </h2>

        <div class="card-grid">

            ${
                list.map(cardHTML).join("")
                ||
                '<p class="empty">Belum ada arsip. Tambahkan entri pertama.</p>'
            }

        </div>

    `;
}

/* =====================================================
   MAIN RENDER
===================================================== */

function render() {

    if (currentId && !getChar(currentId)) {

        currentId = null;
        currentView = "home";

    }

    const btnLogin = $("btnLogin");
    const btnLogout = $("btnLogout");
    const btnAdd = $("btnAdd");

    if (btnLogin) {

        btnLogin.hidden = isAdmin;
        btnLogin.textContent = "Login Admin";

    }

    if (btnLogout) {

        btnLogout.hidden = !isLoggedIn || isAnonymous;

    }

    if (btnAdd) {

        btnAdd.hidden = !isAdmin;

    }

    $("navAdmin").hidden = !isAdmin;

    $("navHome").classList.toggle(
        "active",
        currentView !== "admin"
    );

    $("navAdmin").classList.toggle(
        "active",
        currentView === "admin"
    );

    renderSidebar();

    if (currentView === "article" && getChar(currentId)) {

        main.innerHTML = renderArticle(getChar(currentId));

        return;

    }

    if (currentView === "admin" && isAdmin) {

        main.innerHTML = renderAdminPanel();

        return;

    }

    currentView = "home";

    main.innerHTML = renderHome();

}

/* =====================================================
   MODAL HELPERS
===================================================== */

function show(element) {

    if (!element) return;

    element.classList.add("show");

    document.body.classList.add("no-scroll");

}

function hide(element) {

    if (!element) return;

    element.classList.remove("show");

    const anyOpen = [
        overlay,
        loginOverlay,
        settingsModal
    ].some(item => item?.classList.contains("show"));

    if (!anyOpen) {

        document.body.classList.remove("no-scroll");

    }

}

/* =====================================================
   OPEN CHARACTER FORM
===================================================== */

function openForm(id = null) {

    if (!isAdmin) return;

    editingId = id;

    form.reset();

    $("fotoPreview").hidden = true;

    const character = id
        ? getChar(id)
        : null;

    $("modalTitle").textContent = character
        ? "Edit Entri"
        : "Tambah Entri";

    if (character) {

        Object.keys(character).forEach(key => {

            if (form.elements[key]) {

                form.elements[key].value =
                    character[key] || "";

            }

        });

        if (character.foto) {

            $("fotoPreview").src = character.foto;
            $("fotoPreview").hidden = false;

        }

    }

    show(overlay);

}

/* =====================================================
   READ FORM
===================================================== */

function readForm() {

    const data = Object.fromEntries(
        new FormData(form)
    );

    Object.keys(data).forEach(key => {

        data[key] = String(data[key] || "").trim();

    });

    data.avatar ||= "👤";

    return data;

}

/* =====================================================
   FORM SUBMIT
===================================================== */

form.addEventListener("submit", async event => {

    event.preventDefault();

    if (!isAdmin) return;

    const button = $("submitBtn");

    if (button) button.disabled = true;

    try {

        const data = readForm();

        const success = editingId

            ? await updateDataDiFirebase(editingId, data)

            : await simpanDataKeFirebase(data);

        if (success) {

            hide(overlay);

            currentId = null;
            currentView = "home";

            render();

        }

    } finally {

        if (button) button.disabled = false;

    }

});

/* =====================================================
   IMAGE PREVIEW
===================================================== */

$("fotoUrlInput").addEventListener("input", event => {

    const url = event.target.value.trim();

    $("fotoPreview").src = url;

    $("fotoPreview").hidden = !url;

});

/* =====================================================
   DELETE CHARACTER
===================================================== */

async function removeEntry(id) {

    if (!isAdmin) return;

    const success = await hapusDataDariFirebase(id);

    if (success) {

        currentId = null;
        currentView = "home";

        render();

    }

}

/* =====================================================
   EXPORT DATABASE
===================================================== */

function exportData() {

    if (!isAdmin) return;

    const backup = {

        app: "The Velmoric Codex",

        version: 1,

        exportedAt: new Date().toISOString(),

        characters,

        settings: globalSettings

    };

    const blob = new Blob(

        [JSON.stringify(backup, null, 2)],

        { type: "application/json" }

    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
        "velmoric-codex-backup.json";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

}

/* =====================================================
   IMPORT DATABASE
===================================================== */

async function importData(file) {

    if (!isAdmin || !file) return;

    try {

        const parsed = JSON.parse(
            await file.text()
        );

        const items = Array.isArray(parsed)
            ? parsed
            : parsed.characters;

        if (!Array.isArray(items)) {

            throw new Error("Format JSON tidak valid.");

        }

        const validItems = items.filter(item =>
            item &&
            typeof item.nama === "string" &&
            item.nama.trim()
        );

        if (!validItems.length) {

            throw new Error("Tidak ada data karakter valid.");

        }

        const confirmed = confirm(
            `Impor ${validItems.length} entri ke Firebase? Data yang ada tidak akan dihapus.`
        );

        if (!confirmed) return;

        for (const item of validItems) {

            const data = { ...item };

            delete data.id;

            const success =
                await simpanDataKeFirebase(data);

            if (!success) {

                throw new Error(
                    "Sebagian data gagal disimpan."
                );

            }

        }

        if (parsed.settings) {

            await simpanPengaturanGlobal(

                parsed.settings.theme,

                parsed.settings.musicUrls || []

            );

        }

        await muatDataDariFirebase();

        alert("Impor selesai.");

    } catch (error) {

        console.error("Import error:", error);

        alert(
            "Impor gagal: " + error.message
        );

    } finally {

        $("btnImport").value = "";

    }

}

/* =====================================================
   LOGIN ADMIN MODAL
===================================================== */

$("btnLogin").onclick = () => {

    $("loginError").textContent = "";

    show(loginOverlay);

};

$("closeLogin").onclick = () => hide(loginOverlay);

/* =====================================================
   LOGIN ADMIN
===================================================== */

$("loginForm").addEventListener("submit", async event => {

    event.preventDefault();

    const button = event.submitter;

    if (button) button.disabled = true;

    $("loginError").textContent = "";

    try {

        const email = $("loginEmail").value.trim();

        const password = $("loginPassword").value;

        await window.firebaseFuncs.signInWithEmailAndPassword(

            window.firebaseAuth,

            email,

            password

        );

        $("loginPassword").value = "";

        hide(loginOverlay);

    } catch (error) {

        console.error("Login admin gagal:", error);

        $("loginError").textContent =
            "Login gagal. Periksa email dan password.";

    } finally {

        if (button) button.disabled = false;

    }

});

/* =====================================================
   LOGOUT ADMIN
===================================================== */

$("btnLogout").onclick = async () => {

    if (!isAdmin) return;

    try {

        await window.firebaseFuncs.signOut(
            window.firebaseAuth
        );

        currentId = null;
        currentView = "home";

    } catch (error) {

        console.error("Logout gagal:", error);

        alert("Gagal logout.");

    }

};

/* =====================================================
   MODAL BUTTONS
===================================================== */

$("closeModal").onclick = () => hide(overlay);

$("cancelBtn").onclick = () => hide(overlay);

$("closeSettings").onclick = () => hide(settingsModal);

/* =====================================================
   SEARCH
===================================================== */

$("search").addEventListener("input", event => {

    query = event.target.value
        .toLowerCase()
        .trim();

    render();

});

/* =====================================================
   NAVIGATION
===================================================== */

$("brandBtn").onclick = () => {

    currentView = "home";

    currentId = null;

    query = "";

    $("search").value = "";

    render();

};

$("navHome").onclick = () => {

    currentView = "home";

    currentId = null;

    render();

    sidebar.classList.remove("open");

};

$("navAdmin").onclick = () => {

    if (!isAdmin) return;

    currentView = "admin";

    currentId = null;

    render();

    sidebar.classList.remove("open");

};

$("menuBtn").onclick = () => {

    sidebar.classList.toggle("open");

};

$("btnAdd").onclick = () => {

    openForm();

};

/* =====================================================
   THEME PREVIEW
===================================================== */

$("toggleTheme").onchange = event => {

    document.body.classList.toggle(

        "light-mode",

        event.target.checked

    );

};

/* =====================================================
   SAVE GLOBAL SETTINGS
===================================================== */

$("btnSaveSettings").onclick = async () => {

    if (!isAdmin) return;

    const urls = $("inputMusicUrl").value

        .split(/\r?\n/)

        .map(url => url.trim())

        .filter(Boolean);

    await simpanPengaturanGlobal(

        $("toggleTheme").checked
            ? "light"
            : "dark",

        urls

    );

};

/* =====================================================
   BACKUP BUTTONS
===================================================== */

$("btnExport").onclick = exportData;

$("btnImport").onchange = event => {

    importData(event.target.files[0]);

};

/* =====================================================
   OPEN SETTINGS
===================================================== */

function openSettings() {

    if (!isAdmin) return;

    $("toggleTheme").checked =
        globalSettings.theme === "light";

    $("inputMusicUrl").value =
        (globalSettings.musicUrls || []).join("\n");

    show(settingsModal);

}

/* =====================================================
   GLOBAL CLICK HANDLER
===================================================== */

document.addEventListener("click", event => {

    const editButton =
        event.target.closest("[data-edit]");

    if (editButton) {

        event.stopPropagation();

        if (isAdmin) {

            openForm(editButton.dataset.edit);

        }

        return;

    }

    const deleteButton =
        event.target.closest("[data-del]");

    if (deleteButton) {

        event.stopPropagation();

        if (isAdmin) {

            removeEntry(deleteButton.dataset.del);

        }

        return;

    }

    const openButton =
        event.target.closest("[data-open]");

    if (openButton) {

        currentId = openButton.dataset.open;

        currentView = "article";

        render();

        window.scrollTo(0, 0);

        return;

    }

    if (
        event.target.closest("#homeAdd") ||
        event.target.closest("#adminAddBtn")
    ) {

        openForm();

        return;

    }

    if (event.target.closest("#openSettingsBtn")) {

        openSettings();

        return;

    }

    if (event.target.closest("#backHome")) {

        currentView = "home";

        currentId = null;

        render();

        return;

    }

    if (event.target.closest("#exportPanel")) {

        exportData();

        return;

    }

    const tocLink =
        event.target.closest(".toc a");

    if (tocLink) {

        event.preventDefault();

        document
            .querySelector(tocLink.getAttribute("href"))
            ?.scrollIntoView({
                behavior: "smooth"
            });

    }

});

/* =====================================================
   KEYBOARD HANDLER
===================================================== */

document.addEventListener("keydown", event => {

    if (event.key === "Escape") {

        [
            overlay,
            loginOverlay,
            settingsModal
        ].forEach(hide);

    }

    const card = event.target.closest(".card");

    if (
        card &&
        (event.key === "Enter" || event.key === " ")
    ) {

        event.preventDefault();

        currentId = card.dataset.open;

        currentView = "article";

        render();

    }

});

/* =====================================================
   CLOSE MODALS WHEN CLICKING OUTSIDE
===================================================== */

[
    overlay,
    loginOverlay,
    settingsModal

].forEach(element => {

    element.addEventListener("click", event => {

        if (event.target === element) {

            hide(element);

        }

    });

});

/* =====================================================
   ADMIN VERIFICATION
===================================================== */

async function periksaStatusAdmin(user) {

    if (!user) return false;

    if (user.isAnonymous) return false;

    if (user.uid !== ADMIN_UID) return false;

    try {

        const { doc, getDoc } =
            window.firebaseFuncs;

        const adminRef = doc(

            window.firebaseDB,

            "admins",

            user.uid

        );

        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists()) {

            return false;

        }

        return adminSnap.data().role === "admin";

    } catch (error) {

        console.error(
            "Pemeriksaan admin gagal:",
            error
        );

        return false;

    }

}

/* =====================================================
   FIREBASE AUTHENTICATION
===================================================== */

async function mulaiAplikasiFirebase() {

    if (authStarted) return;

    if (!window.firebaseReady) return;

    authStarted = true;

    const {
        onAuthStateChanged,
        signInAnonymously
    } = window.firebaseFuncs;

    onAuthStateChanged(

        window.firebaseAuth,

        async user => {

            isLoggedIn = Boolean(user);

            isAnonymous = user
                ? user.isAnonymous
                : true;

            isAdmin = false;

            if (!user) {

                render();

                try {

                    await signInAnonymously(
                        window.firebaseAuth
                    );

                } catch (error) {

                    console.error(
                        "Login anonim gagal:",
                        error
                    );

                    setStatus(
                        "Gagal masuk sebagai pembaca anonim. Periksa provider Anonymous di Firebase Authentication.",
                        true
                    );

                }

                return;

            }

            isAdmin = await periksaStatusAdmin(user);

            render();

            if (!user.isAnonymous && !isAdmin) {

                setStatus(
                    "Akun berhasil masuk, tetapi tidak memiliki hak administrator.",
                    true
                );

            }

            const dataOK =
                await muatDataDariFirebase();

            await muatPengaturanGlobal();

            if (dataOK) {

                const status = $("appStatus");

                if (status && !status.classList.contains("error")) {

                    status.remove();

                }

            }

        }

    );

}

/* =====================================================
   FIREBASE EVENTS
===================================================== */

window.addEventListener(
    "firebase-ready",
    mulaiAplikasiFirebase
);

window.addEventListener(
    "firebase-error",
    () => {

        setStatus(
            "Firebase gagal diinisialisasi. Periksa konfigurasi Firebase.",
            true
        );

    }
);

/* =====================================================
   INITIALIZATION
===================================================== */

render();

if (window.firebaseReady) {

    mulaiAplikasiFirebase();

}
