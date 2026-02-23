// Initial Sample Data
const initialData = [
    {
        id: 1,
        title: "Duck Race Game",
        url: "../duck-race/index.html",
        category: "game",
        desc: "アヒルたちの白熱したレース！誰が一番早いか予想してコインを増やそう。レトロなCRT風エフェクトが特徴です。",
        image: "https://images.unsplash.com/photo-1541675154750-0444c7d51e8e?auto=format&fit=crop&w=400&q=80"
    },
    {
        id: 2,
        title: "Retro Pomodoro",
        url: "../PomoTimer/index.html",
        category: "tool",
        desc: "シンプルかつ高機能なポモドーロタイマー。集中時間をカスタマイズして効率的に作業を進めましょう。",
        image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80"
    },
    {
        id: 3,
        title: "Itachi Art Collection",
        url: "https://twitter.com/hashtag/いたちくらふと",
        category: "art",
        desc: "SNSで公開しているいたちキャラクターのアートワーク集です。最新の投稿はこちらからチェック！",
        image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=400&q=80"
    },
    {
        id: 4,
        title: "Creative Tools v1",
        url: "#",
        category: "tool",
        desc: "開発を便利にする小道具たちの詰め合わせ。現在制作中の最新バージョンです。",
        image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80"
    }
];

// State
let links = JSON.parse(localStorage.getItem('itachi_links')) || initialData;
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

// ── Image Preview Helper ─────────────────────────────────
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
const MAX_W = 400;
const JPEG_Q = 0.75;

function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // リサイズ比率を計算
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

async function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const base64 = await compressImage(file);
    imageUrlInput.value = base64;
    setImagePreview(base64);
}

// ── Drop Zone Events ─────────────────────────────────────
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

// ── File Input ───────────────────────────────────────────
imageFileInput.addEventListener('change', async () => {
    const file = imageFileInput.files[0];
    await handleImageFile(file);
    imageFileInput.value = '';
});

// ── URL Input (real-time preview) ────────────────────────
imageUrlInput.addEventListener('input', () => {
    const val = imageUrlInput.value.trim();
    setImagePreview(val || null);
});

// ── Clear Image ──────────────────────────────────────────
clearImageBtn.addEventListener('click', () => {
    imageUrlInput.value = '';
    setImagePreview(null);
});

// ── Render ──────────────────────────────────────────────
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
            </div>
        `;
        card.onclick = (e) => {
            if (e.target.closest('.admin-actions')) return;
            window.open(link.url, '_blank');
        };
        linksGrid.appendChild(card);
    });
}

// ── Save ────────────────────────────────────────────────
function saveLinks() {
    localStorage.setItem('itachi_links', JSON.stringify(links));
}

// ── Delete ──────────────────────────────────────────────
function deleteLink(id) {
    if (confirm('このリンクを削除してもよろしいですか？')) {
        links = links.filter(l => l.id !== id);
        saveLinks();
        renderLinks();
    }
}

// ── Open Edit Form ──────────────────────────────────────
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
    setImagePreview(link.image || null);

    formTitle.textContent = '✏️ リンクを編集';
    postSubmit.textContent = '更新する';
    cancelEdit.classList.remove('hidden');

    adminModal.style.display = 'flex';
}

// ── Reset Form ──────────────────────────────────────────
function resetForm() {
    editingId = null;
    editIdField.value = '';
    document.getElementById('post-title').value = '';
    document.getElementById('post-url').value = '';
    document.getElementById('post-desc').value = '';
    imageUrlInput.value = '';
    setImagePreview(null);
    document.getElementById('post-category').value = 'game';

    formTitle.textContent = '新しいリンクを投稿';
    postSubmit.textContent = '投稿する';
    cancelEdit.classList.add('hidden');
}

// ── Filters ─────────────────────────────────────────────
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderLinks(btn.dataset.category);
    });
});

// ── Modal open/close ─────────────────────────────────────
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

// ── Password visibility toggle ───────────────────────────
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

// ── Login ───────────────────────────────────────────────
loginSubmit.onclick = () => {
    const pass = document.getElementById('admin-password').value;
    if (pass === 'shizuokashishimizukukanbara') {
        isAdmin = true;
        loginForm.classList.add('hidden');
        postForm.classList.remove('hidden');
        // Show admin badge on button
        adminLoginBtn.innerHTML = '<i class="fas fa-user-shield" style="color:var(--secondary)"></i>';
        renderLinks();
    } else {
        alert('パスワードが違います。');
        document.getElementById('admin-password').value = '';
    }
};

// ── Post / Update ────────────────────────────────────────
postSubmit.onclick = () => {
    const title = document.getElementById('post-title').value.trim();
    const url = document.getElementById('post-url').value.trim();
    const category = document.getElementById('post-category').value;
    const desc = document.getElementById('post-desc').value.trim();
    const image = document.getElementById('post-image').value.trim();

    if (!title || !url) {
        alert('タイトルとURLは必須です。');
        return;
    }

    if (editingId !== null) {
        // UPDATE existing
        links = links.map(l => l.id === editingId ? { ...l, title, url, category, desc, image } : l);
    } else {
        // CREATE new
        links.unshift({ id: Date.now(), title, url, category, desc, image });
    }

    saveLinks();
    renderLinks();
    resetForm();
    adminModal.style.display = 'none';
};

// ── Cancel Edit ──────────────────────────────────────────
cancelEdit.onclick = () => {
    resetForm();
};

// ── Initial Render ───────────────────────────────────────
renderLinks();
