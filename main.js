// ── API Endpoints ─────────────────────────────────────────
const API_LINKS = '/api/links';
const API_UPLOAD = '/api/upload';

// State
let links = [];
let isAdmin = false;
let editingId = null;
let currentFilter = 'all';

// DOM
const linksGrid = document.getElementById('links-grid');
const filterBtns = document.querySelectorAll('.filter-btn');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminModal = document.getElementById('admin-modal');
const closeModalBtn = document.querySelector('.close-modal');
const loginForm = document.getElementById('login-form');
const postForm = document.getElementById('post-form');
const loginSubmit = document.getElementById('login-submit');
const postSubmit = document.getElementById('post-submit');
const cancelEdit = document.getElementById('cancel-edit');
const formTitle = document.getElementById('form-title');
const editIdField = document.getElementById('edit-id');
const imagePreview = document.getElementById('image-preview');
const imagePreviewEmpty = document.getElementById('image-preview-empty');
const clearImageBtn = document.getElementById('clear-image');
const imageDropZone = document.getElementById('image-drop-zone');
const imageFileInput = document.getElementById('post-image-file');
const imageUrlInput = document.getElementById('post-image');
const lastUpdatedEl = document.getElementById('last-updated-date');

// ── Fetch links from Vercel KV ────────────────────────────
async function fetchLinks() {
    try {
        const res = await fetch(API_LINKS);
        const json = await res.json();
        links = json.links || [];
        updateLastUpdated();
        renderLinks();
    } catch (err) {
        console.warn('API unavailable, falling back to localStorage', err);
        // フォールバック: localStorageから読み込む
        links = JSON.parse(localStorage.getItem('itachi_links')) || [];
        renderLinks();
    }
}

// ── Save links to Vercel KV ───────────────────────────────
async function saveLinks() {
    try {
        await fetch(API_LINKS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ links })
        });
    } catch (err) {
        console.warn('API save failed, falling back to localStorage', err);
        localStorage.setItem('itachi_links', JSON.stringify(links));
    }
    updateLastUpdated();
}

// ── Upload image to Vercel Blob ───────────────────────────
async function uploadImageToBlob(base64, filename) {
    try {
        const res = await fetch(API_UPLOAD, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: filename || 'thumbnail.jpg', data: base64 })
        });
        if (!res.ok) throw new Error('Upload failed');
        const json = await res.json();
        return json.url; // Blob の公開 URL
    } catch (err) {
        console.warn('Blob upload failed, using base64 fallback', err);
        return base64; // フォールバック: base64のまま使用
    }
}

// ── Last Updated ──────────────────────────────────────────
function updateLastUpdated() {
    if (!lastUpdatedEl) return;
    // すべてのリンクから最新の updatedAt を探す
    const dates = links
        .map(l => l.updatedAt)
        .filter(Boolean)
        .map(d => new Date(d))
        .filter(d => !isNaN(d));

    if (dates.length === 0) {
        lastUpdatedEl.textContent = '情報なし';
        return;
    }
    const latest = new Date(Math.max(...dates));
    lastUpdatedEl.textContent = latest.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ── Image Preview Helper ──────────────────────────────────
function setImagePreview(src) {
    if (src) {
        imagePreview.src = src;
        imagePreview.classList.remove('hidden');
        imagePreviewEmpty.classList.add('hidden');
        clearImageBtn.classList.remove('hidden');
    } else {
        imagePreview.src = '';
        imagePreview.classList.add('hidden');
        imagePreviewEmpty.classList.remove('hidden');
        clearImageBtn.classList.add('hidden');
    }
}

// 最大幅 MAX_W px にリサイズ + JPEG圧縮して Base64 を返す
const MAX_W = 800;
const JPEG_Q = 0.80;

function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const scale = img.width > MAX_W ? MAX_W / img.width : 1;
                const w = Math.round(img.width * scale);
                const h = Math.round(img.height * scale);

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);

                const compressed = canvas.toDataURL('image/jpeg', JPEG_Q);
                resolve(compressed);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// 画像ファイルを圧縮してプレビュー表示（Blobアップロードは投稿時に行う）
async function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const base64 = await compressImage(file);

    // プレビュー用にURLにセット（後で投稿時にBlobへアップロード）
    imageUrlInput.value = base64;
    imageUrlInput.dataset.filename = file.name;
    imageUrlInput.dataset.pendingUpload = 'true';
    setImagePreview(base64);
}

// ── Drop Zone Events ──────────────────────────────────────
imageDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageDropZone.classList.add('drag-over');
});

imageDropZone.addEventListener('dragleave', () => {
    imageDropZone.classList.remove('drag-over');
});

imageDropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    imageDropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    await handleImageFile(file);
});

// ── File Input ────────────────────────────────────────────
imageFileInput.addEventListener('change', async () => {
    const file = imageFileInput.files[0];
    await handleImageFile(file);
    imageFileInput.value = '';
});

// ── URL Input (real-time preview) ─────────────────────────
imageUrlInput.addEventListener('input', () => {
    const val = imageUrlInput.value.trim();
    imageUrlInput.dataset.pendingUpload = 'false';
    setImagePreview(val || null);
});

// ── Clear Image ───────────────────────────────────────────
clearImageBtn.addEventListener('click', () => {
    imageUrlInput.value = '';
    imageUrlInput.dataset.pendingUpload = 'false';
    imageUrlInput.dataset.filename = '';
    setImagePreview(null);
});

// ── Render ─────────────────────────────────────────────────
function renderLinks(category = currentFilter) {
    currentFilter = category;
    linksGrid.innerHTML = '';
    const filtered = category === 'all' ? links : links.filter(l => l.category === category);

    if (filtered.length === 0) {
        linksGrid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;">まだ投稿がありません</p>';
        return;
    }

    filtered.forEach(link => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            ${isAdmin ? `
                <div class="admin-actions">
                    <button class="btn-small btn-edit" title="編集" onclick="openEditForm(${link.id})"><i class="fas fa-pen"></i></button>
                    <button class="btn-small btn-delete" title="削除" onclick="deleteLink(${link.id})"><i class="fas fa-trash"></i></button>
                </div>
            ` : ''}
            <img src="${link.image || 'https://via.placeholder.com/400x180?text=No+Image'}" alt="${link.title}" class="card-image">
            <div class="card-category">${link.category}</div>
            <h3 class="card-title">${link.title}</h3>
            <p class="card-desc">${link.desc}</p>
            <div class="card-footer">
                <span class="card-link-icon"><i class="fas fa-external-link-alt"></i></span>
                ${link.updatedAt ? `<span class="card-date">${formatDate(link.updatedAt)}</span>` : ''}
            </div>
        `;
        card.onclick = (e) => {
            if (e.target.closest('.admin-actions')) return;
            window.open(link.url, '_blank');
        };
        linksGrid.appendChild(card);
    });
}

function formatDate(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ── Delete ─────────────────────────────────────────────────
function deleteLink(id) {
    if (confirm('このリンクを削除してもよろしいですか？')) {
        links = links.filter(l => l.id !== id);
        saveLinks();
        renderLinks();
    }
}

// ── Open Edit Form ─────────────────────────────────────────
function openEditForm(id) {
    const link = links.find(l => l.id === id);
    if (!link) return;

    editingId = id;
    editIdField.value = id;
    document.getElementById('post-title').value = link.title;
    document.getElementById('post-url').value = link.url;
    document.getElementById('post-category').value = link.category;
    document.getElementById('post-desc').value = link.desc || '';
    imageUrlInput.value = link.image || '';
    imageUrlInput.dataset.pendingUpload = 'false';
    setImagePreview(link.image || null);

    formTitle.textContent = '✏️ リンクを編集';
    postSubmit.textContent = '更新する';
    cancelEdit.classList.remove('hidden');

    adminModal.style.display = 'flex';
}

// ── Reset Form ─────────────────────────────────────────────
function resetForm() {
    editingId = null;
    editIdField.value = '';
    document.getElementById('post-title').value = '';
    document.getElementById('post-url').value = '';
    document.getElementById('post-desc').value = '';
    imageUrlInput.value = '';
    imageUrlInput.dataset.pendingUpload = 'false';
    imageUrlInput.dataset.filename = '';
    setImagePreview(null);
    document.getElementById('post-category').value = 'game';

    formTitle.textContent = '新しいリンクを投稿';
    postSubmit.textContent = '投稿する';
    cancelEdit.classList.add('hidden');
}

// ── Filters ───────────────────────────────────────────────
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderLinks(btn.dataset.category);
    });
});

// ── Modal open/close ──────────────────────────────────────
adminLoginBtn.onclick = () => {
    if (isAdmin) {
        resetForm();
        loginForm.classList.add('hidden');
        postForm.classList.remove('hidden');
    }
    adminModal.style.display = 'flex';
};

closeModalBtn.onclick = () => {
    adminModal.style.display = 'none';
    resetForm();
};

window.onclick = (e) => {
    if (e.target === adminModal) {
        adminModal.style.display = 'none';
        resetForm();
    }
};

// ── Password visibility toggle ────────────────────────────
document.getElementById('toggle-password').onclick = () => {
    const input = document.getElementById('admin-password');
    const icon = document.querySelector('#toggle-password i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
};

// ── Login ─────────────────────────────────────────────────
loginSubmit.onclick = () => {
    const pass = document.getElementById('admin-password').value;
    if (pass === 'shizuokashishimizukukanbara') {
        isAdmin = true;
        loginForm.classList.add('hidden');
        postForm.classList.remove('hidden');
        adminLoginBtn.innerHTML = '<i class="fas fa-user-shield" style="color:var(--secondary)"></i>';
        renderLinks();
    } else {
        alert('パスワードが違います。');
        document.getElementById('admin-password').value = '';
    }
};

// ── Post / Update ─────────────────────────────────────────
postSubmit.onclick = async () => {
    const title = document.getElementById('post-title').value.trim();
    const url = document.getElementById('post-url').value.trim();
    const category = document.getElementById('post-category').value;
    const desc = document.getElementById('post-desc').value.trim();
    let image = imageUrlInput.value.trim();

    if (!title || !url) {
        alert('タイトルとURLは必須です。');
        return;
    }

    // ボタンを無効化してアップロード中を示す
    postSubmit.disabled = true;
    postSubmit.textContent = '処理中...';

    // Base64画像をVercel Blobにアップロード
    if (image && imageUrlInput.dataset.pendingUpload === 'true') {
        const filename = imageUrlInput.dataset.filename || 'thumbnail.jpg';
        image = await uploadImageToBlob(image, filename);
    }

    const now = new Date().toISOString();

    if (editingId !== null) {
        links = links.map(l =>
            l.id === editingId
                ? { ...l, title, url, category, desc, image, updatedAt: now }
                : l
        );
    } else {
        links.unshift({ id: Date.now(), title, url, category, desc, image, updatedAt: now });
    }

    await saveLinks();
    renderLinks();
    resetForm();
    adminModal.style.display = 'none';

    postSubmit.disabled = false;
    postSubmit.textContent = '投稿する';
};

// ── Cancel Edit ───────────────────────────────────────────
cancelEdit.onclick = () => {
    resetForm();
};

// ── Initial Load ──────────────────────────────────────────
fetchLinks();
