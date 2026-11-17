/* =====================================================================
   GOOD VIBES 🌊 — O Refúgio · v2.0
   Lógica do aplicativo (ES Module)
   ===================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser, updatePassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, setDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, increment, where, runTransaction, limit, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

/* ================= FIREBASE ================= */
const firebaseConfig = {
    apiKey: "AIzaSyBXrIshTVFOD30XPKku_Trk6VKbXv_7Gkg",
    authDomain: "good-vibes-8a13d.firebaseapp.com",
    databaseURL: "https://good-vibes-8a13d-default-rtdb.firebaseio.com",
    projectId: "good-vibes-8a13d",
    messagingSenderId: "310185051492",
    appId: "1:310185051492:web:c47435ce7842af9386e671",
    measurementId: "G-215VPTXGN8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ================= CHAVES DE API PÚBLICAS ================= */
const GIPHY_API_KEY = "5Eir9BLVUppJQLNQTNH9K2KHzcblnVJl";
const IMGBB_API_KEY = "1fd4d8fc1d8b3f9bb172de4e42dabe37";
const CLOUDINARY_CLOUD = "ddeahu7n2";
const CLOUDINARY_PRESET = "vqa17svu";
const SECRET_KEY = "B9-0.12p´-09p3en3rjec9";

/* ================= HELPERS ================= */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const escapeHtml = (str = '') => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Aceita apenas URLs http/https; caso contrário retorna null. */
const sanitizeUrl = (url = '') => {
    try {
        const raw = String(url).trim();
        if (!raw) return null;
        const u = new URL(raw, window.location.href);
        return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null;
    } catch { return null; }
};

const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'agora mesmo';
    if (min === 1) return 'há 1 min';
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h === 1) return 'há 1 hora';
    if (h < 24) return `há ${h} horas`;
    const d = Math.floor(h / 24);
    return d === 1 ? 'ontem' : `há ${d} dias`;
};

const toastTime = (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const vibrate = (pattern) => { try { navigator.vibrate?.(pattern); } catch { /* sem suporte */ } };

const clipboardCopy = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
        try {
            const ta = document.createElement('textarea');
            ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
            document.body.appendChild(ta); ta.focus(); ta.select();
            const ok = document.execCommand('copy');
            ta.remove(); return ok;
        } catch { return false; }
    }
};

/** Mensagem amigável para "Missing or insufficient permissions" do Firestore */
const firestorePermissionMsg = (err) => {
    const msg = String(err?.message || err?.code || '');
    if (/permission|PERMISSION_DENIED|insufficient/i.test(msg)) {
        return '🚫 O Firebase recusou o acesso (regras de segurança do Firestore). O administrador precisa publicar as regras do arquivo firestore.rules no Console → Firestore → Regras.';
    }
    return msg || 'Erro desconhecido do Firestore.';
};

const debounce = (fn, wait = 250) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
};

/* Criptografia simétrica (ofuscação cliente-a-cliente — não substitui E2E real) */
const encrypt = (text) => { try { return CryptoJS.AES.encrypt(text, SECRET_KEY).toString(); } catch { return text; } };
const decrypt = (cipherText) => {
    try {
        const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
        const out = bytes.toString(CryptoJS.enc.Utf8);
        return out || '🔒 Mensagem protegida.';
    } catch { return '🔒 Mensagem protegida.'; }
};

/* ================= TOASTS ================= */
const TOAST_ICONS = { success: '✅', error: '⚠️', info: '🌊', warn: '⚠️', like: '💜' };
function showToast(message, type = 'info', duration = 3600) {
    const container = $('#toast-container');
    if (!container) return;
    while (container.children.length >= 3) container.firstElementChild.remove();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || '🌊'}</span><span class="toast-text">${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('leaving');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
}

/* ================= MODAL DE CONFIRMAÇÃO ================= */
let confirmResolver = null;
function gvConfirm({ emoji = '⚠️', title = 'Tem certeza?', message = '', okLabel = 'Confirmar' } = {}) {
    $('#confirm-emoji').textContent = emoji;
    $('#confirm-title').textContent = title;
    $('#confirm-message').textContent = message;
    $('#confirm-ok-btn').textContent = okLabel;
    openModal('confirm-modal');
    return new Promise((resolve) => { confirmResolver = resolve; });
}
function resolveConfirm(value) {
    closeModal('confirm-modal');
    if (confirmResolver) { confirmResolver(value); confirmResolver = null; }
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) { modal.classList.add('active'); vibrate(6); }
}
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

/* ================= BADGES (contador nos ícones) ================= */
let badges = { feed: 0, chat: 0, notifications: 0 };
try { badges = { ...badges, ...(JSON.parse(localStorage.getItem('gv_badges') || '{}')) }; } catch { /* ignora */ }

function saveBadges() { try { localStorage.setItem('gv_badges', JSON.stringify(badges)); } catch { /* ignora */ } }

function renderBadges() {
    $$('[data-badge]').forEach((el) => {
        const key = el.dataset.badge;
        const count = badges[key] || 0;
        el.classList.toggle('show', count > 0);
        el.textContent = count > 99 ? '99+' : String(count);
    });
}
function setBadge(key, count) { badges[key] = Math.max(0, count); saveBadges(); renderBadges(); }
function bumpBadge(key, delta = 1) { setBadge(key, (badges[key] || 0) + delta); }

/* ================= SISTEMA DE NOTIFICAÇÕES ================= */
const NOTIF_ICONS = { post: '📝', chat: '💬', comment: '💭', system: '🔔' };
let notificationsHistory = [];
try { notificationsHistory = JSON.parse(localStorage.getItem('gv_notifications') || '[]'); } catch { notificationsHistory = []; }
let notifFilter = 'all';

function saveNotifHistory() {
    try { localStorage.setItem('gv_notifications', JSON.stringify(notificationsHistory.slice(0, 100))); } catch { /* cheio */ }
}

const sysNotifEnabled = () => {
    try { return localStorage.getItem('gv_sys_notif') !== '0'; } catch { return true; }
};
const soundEnabled = () => {
    try { return localStorage.getItem('gv_sound_notif') !== '0'; } catch { return true; }
};

/* Chime suave via WebAudio */
let audioCtx = null;
function playChime() {
    if (!soundEnabled()) return;
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const notes = [659.25, 987.77]; // E5 → B5
        notes.forEach((freq, i) => {
            const t = audioCtx.currentTime + i * 0.14;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(t); osc.stop(t + 0.55);
        });
    } catch { /* sem áudio */ }
}

function sendSystemNotification(title, body, tag = 'good-vibes') {
    if (!('Notification' in window)) return;
    if (!sysNotifEnabled() || Notification.permission !== 'granted') return;
    if (!document.hidden) return; // só quando o usuário está fora do app
    try { new Notification(title, { body, icon: 'icons/icon-192.png', tag, renotify: true }); } catch { /* iOS antigo */ }
}

/**
 * Ponto único de entrada para qualquer notificação do app.
 * - Salva no histórico (localStorage, até 100 itens)
 * - Atualiza os badges dos ícones (Feed/Chat/Avisos)
 * - Mostra toast in-app, chime e (se permitido e fora do app) notificação do sistema
 */
function pushNotification({ type = 'system', title, body, section = 'notifications', action = null }) {
    const notif = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type, title, body, section, action,
        time: Date.now(),
        read: false
    };
    notificationsHistory.unshift(notif);
    if (notificationsHistory.length > 100) notificationsHistory.pop();
    saveNotifHistory();

    bumpBadge('notifications', 1);
    if (section === 'feed') bumpBadge('feed', 1);
    if (section === 'chat') bumpBadge('chat', 1);

    playChime();
    showToast(`${title} — ${body}`, 'info', 4200);
    sendSystemNotification(title, body, section);
    renderNotificationsList();
}

const markAllNotificationsRead = () => {
    notificationsHistory.forEach((n) => { n.read = true; });
    saveNotifHistory();
    setBadge('notifications', 0);
    renderNotificationsList();
};

const clearAllNotifications = () => {
    notificationsHistory = [];
    saveNotifHistory();
    setBadge('notifications', 0);
    renderNotificationsList();
};

const unreadCount = () => notificationsHistory.filter((n) => !n.read).length;

function notifGroupLabel(ts) {
    const d = new Date(ts); const now = new Date();
    const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const dayDiff = Math.round((startOf(now) - startOf(d)) / 86400000);
    if (dayDiff <= 0) return 'Hoje';
    if (dayDiff === 1) return 'Ontem';
    return 'Anteriores';
}

function renderNotificationsList() {
    const list = $('#notifications-list');
    if (!list) return;

    const items = notificationsHistory.filter((n) => notifFilter === 'all' || !n.read);
    list.innerHTML = '';

    if (items.length === 0) {
        list.innerHTML = `<div class="notif-empty"><span>${notifFilter === 'unread' ? '🎉' : '🔕'}</span><strong>${notifFilter === 'unread' ? 'Nenhuma não lida!' : 'Nenhuma notificação por enquanto.'}</strong><p>Quando algo acontecer por aqui, aparece nesta lista.</p></div>`;
        return;
    }

    const groups = {};
    items.forEach((n) => { (groups[notifGroupLabel(n.time)] ||= []).push(n); });

    for (const group of ['Hoje', 'Ontem', 'Anteriores']) {
        if (!groups[group]?.length) continue;
        const heading = document.createElement('div');
        heading.className = 'contacts-heading';
        heading.textContent = group;
        list.appendChild(heading);

        for (const n of groups[group]) {
            const el = document.createElement('div');
            el.className = `notif-item ${n.read ? 'read' : ''}`;
            el.setAttribute('role', 'button');
            el.tabIndex = 0;
            el.innerHTML = `
                <div class="notif-icon">${NOTIF_ICONS[n.type] || '🔔'}</div>
                <div class="notif-body">
                    <div class="notif-top">
                        <span class="notif-title">${escapeHtml(n.title)}</span>
                        <span class="notif-time">${timeAgo(n.time)}</span>
                    </div>
                    <div class="notif-text">${escapeHtml(n.body)}</div>
                </div>
                ${n.read ? '' : '<span class="notif-unread-dot" aria-label="Não lida"></span>'}`;
            const activate = () => {
                const item = notificationsHistory.find((x) => x.id === n.id);
                if (item) { item.read = true; saveNotifHistory(); }
                renderNotificationsList();
                // Aviso de PV → abre o Chat e entra na conversa direto
                if (n.action?.kind === 'dm' && n.action.uid) {
                    openApp('chat');
                    setTimeout(() => window.startPrivateChat(n.action.uid, n.action.name || 'Amigo'), 250);
                    return;
                }
                if (n.section && document.getElementById(`app-${n.section}`)) openApp(n.section);
            };
            el.addEventListener('click', activate);
            el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
            list.appendChild(el);
        }
    }
}

/* ================= LINKS + PRÉ-VISUALIZAÇÕES ================= */
function buildRichContent(rawText) {
    const text = String(rawText || '');
    // 1) Extrai enquetes do texto ORIGINAL e as remove do texto exibido
    const polls = [];
    const withoutPolls = text.replace(/\(option:(\w+)\{([^}]+)\}\)/g, (m, id, label) => { polls.push({ id, label: label.trim() }); return ''; });
    // 2) Escapa tudo (anti-XSS) e então transforma URLs em links
    const escaped = escapeHtml(withoutPolls);
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    const links = escaped.match(urlRegex) || [];

    let html = escaped;
    let previews = '';

    for (const link of links) {
        const safeLink = link.replace(/"/g, '&quot;');
        html = html.replace(link, `<a href="${safeLink}" target="_blank" rel="noopener noreferrer nofollow">[Link]</a>`);

        const yt = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (yt) {
            previews += `<div style="margin-top:10px;border-radius:14px;overflow:hidden;border:1px solid var(--border-color);background:#000"><iframe width="100%" height="200" src="https://www.youtube.com/embed/${encodeURIComponent(yt[1])}" title="Vídeo do YouTube" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
            continue;
        }
        const unescaped = link.replace(/&amp;/g, '&');
        if (/\.(jpeg|jpg|gif|png|webp|avif)(\?.*)?$/i.test(unescaped) || unescaped.includes('giphy.com/media') || unescaped.includes('images.unsplash.com') || unescaped.includes('i.ibb.co')) {
            previews += `<img src="${safeLink}" alt="Pré-visualização" loading="lazy" style="max-width:100%;max-height:280px;margin-top:8px;border-radius:12px;object-fit:contain;display:block">`;
            continue;
        }
        if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(unescaped) || unescaped.includes('res.cloudinary.com')) {
            previews += `<video controls src="${safeLink}" preload="metadata" style="max-width:100%;margin-top:8px;border-radius:12px;display:block"></video>`;
            continue;
        }
        previews += `<div style="margin-top:8px;padding:10px 12px;background:var(--chip-bg);border-radius:12px;border-left:3px solid var(--primary-color)"><div style="font-size:9.5px;opacity:.65;text-transform:uppercase;font-weight:800;letter-spacing:.06em">Site externo</div><div style="font-size:12px;word-break:break-all;color:var(--primary-color)">${escapeHtml(unescaped.slice(0, 70))}</div></div>`;
    }
    return { html, previews, polls };
}

const renderPollBlock = (polls, postId, enquete = {}, voted = false) => {
    if (!polls.length) return '';
    const buttons = polls.map(({ id, label }) => {
        const votes = Number(enquete?.[`votos_${id}`] || 0);
        return `<button class="caixa-voto${voted ? ' voted' : ''}" data-vote-post="${escapeHtml(postId)}" data-vote-option="${escapeHtml(id)}" ${voted ? 'disabled' : ''}><span>${escapeHtml(label)}</span><span class="voto-count">${votes}</span></button>`;
    }).join('');
    return `<div class="enquete-block">${buttons}</div>`;
};

/* ================= ESTADO GLOBAL ================= */
let currentUser = null;
let currentUserProfile = {};
let currentPostIdForComment = null;
let currentPostAuthorForComment = null;
let currentChatRoom = 'global';
let chatUnsubscribe = null;
let commentsUnsubscribe = null;
let inboxUnsubscribe = null;
let dmUnsubscribe = null;
let dmInitialLoad = true;
let feedInitialLoad = true;
/* Cache dos posts visíveis no feed — usado pela "Energia da casa" (ver seção abaixo) */
let feedPostsCache = [];
let inboxInitialLoad = true;
const revealedPosts = new Set();

/* ================= RELÓGIO / SAUDAÇÃO / QUOTES ================= */
const QUOTES = [
    'espalhe boas vibrações ✨',
    'seja a energia que você quer ver no mundo 🌊',
    'gratidão muda o clima de qualquer lugar 💜',
    'hoje é um ótimo dia para ser gentil 🤝',
    'pequenas atitudes, grandes ondas 🌊',
    'respire fundo — tudo vai dar certo 🍃',
    'você é mais luz do que tempestade ☀️',
    'faça alguém sorrir hoje 😄',
    'boas vibes são contagiosas 🦠',
    'o universo conspira a favor de quem transborda 🌈',
    'mantenha o coração leve e a mente aberta 🎈',
    'gente boa atrai gente boa 💫'
];

function greetingForHour(h) {
    if (h >= 5 && h < 12) return { text: 'Bom dia', emoji: '☀️' };
    if (h >= 12 && h < 18) return { text: 'Boa tarde', emoji: '🌤️' };
    return { text: 'Boa noite', emoji: '🌙' };
}

function tickClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateLong = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const dateLongCap = dateLong.charAt(0).toUpperCase() + dateLong.slice(1);

    const sb = $('#sb-time'); if (sb) sb.textContent = timeStr;
    const hwTime = $('#hw-time'); if (hwTime) hwTime.textContent = timeStr;
    const hwDate = $('#hw-date'); if (hwDate) hwDate.textContent = dateLongCap;
    const lockTime = $('#lock-time'); if (lockTime) lockTime.textContent = timeStr;
    const lockDate = $('#lock-date'); if (lockDate) lockDate.textContent = dateLongCap;

    const { text, emoji } = greetingForHour(now.getHours());
    const gt = $('#hw-greeting-text'); if (gt) gt.textContent = text;
    const ge = $('#hw-greeting-emoji'); if (ge) ge.textContent = emoji;

    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const quote = QUOTES[dayOfYear % QUOTES.length];
    const hwQuote = $('#hw-quote'); if (hwQuote) hwQuote.textContent = quote;
    const lockQuote = $('#lock-quote'); if (lockQuote) lockQuote.textContent = quote;
}

/* ================= HOME: GRADE DE APPS ================= */
const APPS = [
    { id: 'feed', label: 'Feed', icon: '🌊', tile: 'tile-feed', badge: 'feed' },
    { id: 'chat', label: 'Chat', icon: '💬', tile: 'tile-chat', badge: 'chat' },
    { id: 'notifications', label: 'Avisos', icon: '🔔', tile: 'tile-notifications', badge: 'notifications' },
    { id: 'media', label: 'Mídia', icon: '🖼️', tile: 'tile-media' },
    { id: 'people', label: 'Pessoas', icon: '🔍', tile: 'tile-people' },
    { id: 'profile', label: 'Perfil', icon: '👤', tile: 'tile-profile' },
    { id: 'rules', label: 'Regras', icon: '📜', tile: 'tile-rules' },
    { id: 'bank', label: 'Banco', icon: '🏦', tile: 'tile-bank' },
    { id: 'shop', label: 'Loja', icon: '🪙', tile: 'tile-shop' },
    { id: 'inventory', label: 'Inventário', icon: '🎒', tile: 'tile-inventory' },
    { id: 'refinery', label: 'Mesa de Trabalho', icon: '🛠️', tile: 'tile-refinery' },
    { id: 'construction', label: 'Obras', icon: '🏗️', tile: 'tile-construction' },
    { id: 'work', label: 'Trabalho', icon: '💼', tile: 'tile-work' },
    { id: 'market', label: 'Mercado', icon: '🛒', tile: 'tile-market' },
    { id: 'arena', label: 'Arena', icon: '', iconSvg: 'arena-swords', tile: 'tile-arena' },
    { id: 'settings', label: 'Ajustes', icon: '⚙️', tile: 'tile-settings' },
];
const DOCK_IDS = ['feed', 'chat', 'notifications', 'profile'];

function appIconHTML(appDef) {
    const badge = appDef.badge ? `<span class="app-badge" data-badge="${appDef.badge}"></span>` : '';
    const glyph = appDef.iconSvg
        ? `<svg class="app-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><use href="#${appDef.iconSvg}"></use></svg>`
        : appDef.icon;
    return `<button class="app-icon" data-open-app="${appDef.id}" aria-label="Abrir ${escapeHtml(appDef.label)}">
        <span class="app-icon-tile ${appDef.tile}">${badge}${glyph}</span>
        <span class="app-icon-label">${escapeHtml(appDef.label)}</span>
    </button>`;
}

function renderHomeIcons() {
    const grid = $('#app-grid');
    const dock = $('#dock');
    if (grid) grid.innerHTML = APPS.map(appIconHTML).join('');
    if (dock) dock.innerHTML = DOCK_IDS.map((id) => appIconHTML(APPS.find((a) => a.id === id))).join('');
    renderBadges();
}

/* ================= NAVEGAÇÃO (abrir/fechar apps) ================= */
function closeAllAppWindows() {
    $$('.app-window.active').forEach((w) => w.classList.remove('active', 'closing'));
}

function openApp(appId, pushHistory = true) {
    const target = document.getElementById(`app-${appId}`);
    if (!target) return;

    const replacing = Boolean($('.app-window.active'));
    closeAllAppWindows();
    // Força reflow para reiniciar a animação de abertura
    void target.offsetWidth;
    target.classList.add('active');
    vibrate(10);

    if (pushHistory) {
        try {
            if (replacing) history.replaceState({ app: appId }, '');
            else history.pushState({ app: appId }, '');
        } catch { /* file:// */ }
    }

    // Cada app, ao abrir, zera seu badge
    if (appId === 'feed') setBadge('feed', 0);
    if (appId === 'chat') { setBadge('chat', 0); window.lastReadChatTimestamp = Date.now(); try { localStorage.setItem('gv_last_chat_read', String(window.lastReadChatTimestamp)); } catch { /* ignora */ } }
    if (appId === 'notifications') { setBadge('notifications', 0); renderNotificationsList(); }

    if (['shop', 'inventory', 'refinery', 'construction', 'work', 'market'].includes(appId)) refreshEconomyUI();
    if (appId === 'shop') { void fetchMarket().then(renderShopItems); }
    if (appId === 'arena') { refreshArenaUI(); startArenaPolling(); }
    if (appId === 'market') refreshMarket();
    if (appId === 'work') renderBoard();
    if (appId === 'bank') refreshBank();
    const body = target.querySelector('.app-body');
    if (body) body.scrollTop = 0;
}

function closeApp(fromHistory = false) {
    const active = $('.app-window.active');
    if (!active) return;
    active.classList.add('closing');
    setTimeout(() => { active.classList.remove('active', 'closing'); }, 240);
    vibrate(6);
    if (!fromHistory) { try { history.back(); } catch { /* ignora */ } }
}

window.addEventListener('popstate', () => {
    // Voltar do Android/navegador fecha o app aberto; na raiz, sai do app
    if ($('.app-window.active')) closeApp(true);
});

window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openModalEl = $('.modal.active');
    if (openModalEl) { openModalEl.classList.remove('active'); return; }
    closeApp();
});

/* Clique em backdrop de modal fecha */
$$('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
});
$$('[data-close-modal]').forEach((btn) => btn.addEventListener('click', () => closeModal(btn.dataset.closeModal)));
$('#confirm-cancel-btn')?.addEventListener('click', () => resolveConfirm(false));
$('#confirm-ok-btn')?.addEventListener('click', () => resolveConfirm(true));

/* Delegação global para abrir/fechar apps */
document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-app]');
    if (opener) { openApp(opener.dataset.openApp); return; }
    const closer = e.target.closest('[data-close-app]');
    if (closer) { closeApp(); }
});

/* ================= TELA DE BLOQUEIO ================= */
let unlocked = false;
function unlock() {
    if (unlocked) return;
    unlocked = true;
    $('#lockscreen')?.classList.add('unlocking');
    vibrate([12, 40, 12]);
    showUnlockedScreen();
}
function showUnlockedScreen() {
    if (currentUser) {
        $('#auth-screen')?.classList.remove('active');
        $('#home-screen')?.classList.add('active');
    } else {
        $('#home-screen')?.classList.remove('active');
        $('#auth-screen')?.classList.add('active');
    }
}
function relock() {
    unlocked = false;
    $('#home-screen')?.classList.remove('active');
    $('#auth-screen')?.classList.remove('active');
    closeAllAppWindows();
    $('#lockscreen')?.classList.remove('unlocking');
}

$('#unlock-btn')?.addEventListener('click', unlock);
$('#flashlight-btn')?.addEventListener('click', () => {
    const overlay = $('#flashlight-overlay');
    const btn = $('#flashlight-btn');
    overlay?.classList.toggle('active');
    btn?.classList.toggle('active');
    vibrate(8);
});
$('#lock-camera-btn')?.addEventListener('click', () => {
    unlock();
    setTimeout(() => { if (currentUser) openApp('media'); }, 350);
});

/* Deslizar para cima desbloqueia (touch) */
(() => {
    const lock = $('#lockscreen');
    if (!lock) return;
    let startY = null;
    lock.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    lock.addEventListener('touchmove', (e) => {
        if (startY === null) return;
        const delta = e.touches[0].clientY - startY;
        if (delta < 0) lock.style.transform = `translateY(${Math.max(delta, -140)}px)`;
    }, { passive: true });
    lock.addEventListener('touchend', (e) => {
        if (startY === null) return;
        const delta = e.changedTouches[0].clientY - startY;
        lock.style.transform = '';
        if (delta < -60) unlock();
        startY = null;
    });
})();

/* ================= AUTENTICAÇÃO ================= */
const friendlyAuthError = (err) => {
    const code = err?.code || '';
    const map = {
        'auth/invalid-email': 'E-mail inválido. Confere o endereço?',
        'auth/user-not-found': 'Não encontramos esse e-mail.',
        'auth/wrong-password': 'Senha incorreta. Tente de novo.',
        'auth/invalid-credential': 'E-mail ou senha incorretos.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
        'auth/network-request-failed': 'Sem conexão com a internet.',
        'auth/user-disabled': 'Essa conta foi desativada.',
        'auth/email-already-in-use': 'Esse e-mail já tem conta. Faça login!',
        'auth/weak-password': 'Senha muito fraca — use pelo menos 6 caracteres.',
        'auth/operation-not-allowed': 'Cadastro por e-mail/senha desativado no Firebase.',
        'auth/invalid-password': 'Senha inválida.',
    };
    return map[code] || `Erro ao entrar: ${err?.message || 'desconhecido'}`;
};

/* ---------- Abas Entrar / Criar conta ---------- */
let authMode = 'login';
function setAuthMode(mode) {
    authMode = mode === 'signup' ? 'signup' : 'login';
    const form = $('#auth-form');
    const signup = authMode === 'signup';

    form.dataset.mode = authMode;
    $('#tab-login')?.classList.toggle('active', !signup);
    $('#tab-signup')?.classList.toggle('active', signup);
    $('#tab-login')?.setAttribute('aria-selected', String(!signup));
    $('#tab-signup')?.setAttribute('aria-selected', String(signup));

    $('#login-btn .btn-label').textContent = signup ? 'Criar conta 🌊' : 'Entrar';
    $('#password').setAttribute('autocomplete', signup ? 'new-password' : 'current-password');
    $('#password').placeholder = signup ? 'Crie uma senha (mín. 6 caracteres)' : 'Sua senha';
    $('#auth-tagline').textContent = signup ? 'venha espalhar boas vibrações 🌊' : 'eu te conheço? 🌊';
    $('#auth-note').textContent = signup
        ? 'Ao criar sua conta você aceita as 📜 Regras e Diretrizes do Refúgio.'
        : 'Bem-vindo de volta ao Refúgio 🌊';
    $('#auth-error').textContent = '';
    if (signup) $('#auth-name')?.focus();
}
$('#tab-login')?.addEventListener('click', () => setAuthMode('login'));
$('#tab-signup')?.addEventListener('click', () => setAuthMode('signup'));

$('#auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#email').value.trim();
    const password = $('#password').value;
    const errorEl = $('#auth-error');
    const btn = $('#login-btn');
    errorEl.textContent = '';

    if (!email || !password) { errorEl.textContent = 'Preencha e-mail e senha.'; return; }

    const card = $('.auth-card');
    const fail = (msg) => {
        errorEl.textContent = msg;
        card?.classList.remove('shake'); void card?.offsetWidth; card?.classList.add('shake');
        vibrate([30, 60, 30]);
    };

    btn.classList.add('loading');
    try {
        if (authMode === 'signup') {
            const name = $('#auth-name').value.trim();
            if (name.length < 2) { btn.classList.remove('loading'); fail('Diga seu nome — pode ser um apelido! 🙂'); return; }
            if (password.length < 6) { btn.classList.remove('loading'); fail('A senha precisa de pelo menos 6 caracteres.'); return; }

            const cred = await createUserWithEmailAndPassword(auth, email, password);
            try {
                await setDoc(doc(db, 'users', cred.user.uid), {
                    name,
                    blurNsfw: true,
                    createdAt: serverTimestamp()
                }, { merge: true });
                currentUserProfile = { name, blurNsfw: true };
            } catch (profileErr) {
                console.warn('Conta criada, mas o perfil não salvou:', profileErr?.message);
            }
            showToast('Conta criada! Bem-vindo ao Refúgio! 🎉', 'success', 5000);
            await loadUserProfile();
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            showToast('Bem-vindo de volta! 🌊', 'success');
        }
    } catch (err) {
        fail(friendlyAuthError(err));
    } finally {
        btn.classList.remove('loading');
    }
});

$('#toggle-pass')?.addEventListener('click', () => {
    const input = $('#password');
    input.type = input.type === 'password' ? 'text' : 'password';
});

$('#forgot-pass-btn')?.addEventListener('click', async () => {
    const email = $('#email').value.trim();
    const errorEl = $('#auth-error');
    if (!email) { errorEl.textContent = 'Digite seu e-mail acima para recuperar a senha.'; return; }
    try {
        await sendPasswordResetEmail(auth, email);
        errorEl.textContent = '';
        showToast('Link de recuperação enviado! Confira seu e-mail 📬', 'success', 5000);
    } catch (err) {
        errorEl.textContent = friendlyAuthError(err);
    }
});

$('#logout-btn')?.addEventListener('click', async () => {
    const ok = await gvConfirm({ emoji: '👋', title: 'Sair da conta?', message: 'Você precisará entrar novamente para voltar ao Refúgio.', okLabel: 'Sair' });
    if (ok) { await signOut(auth); showToast('Até logo! 🌊', 'info'); }
});

$('#delete-account-btn')?.addEventListener('click', async () => {
    const ok = await gvConfirm({ emoji: '🗑️', title: 'Deletar sua conta?', message: 'Isso apaga seu acesso definitivamente. Posts e mensagens antigos permanecem no refúgio. NÃO pode ser desfeito.', okLabel: 'Deletar tudo' });
    if (!ok) return;
    try {
        await deleteUser(auth.currentUser);
        showToast('Conta deletada. Sentiremos sua falta! 💜', 'info', 5000);
    } catch (err) {
        if (err?.code === 'auth/requires-recent-login') showToast('Por segurança, entre de novo antes de deletar.', 'error', 5000);
        else showToast('Erro ao deletar: ' + (err?.message || 'desconhecido'), 'error');
    }
});

$('#change-pass-btn')?.addEventListener('click', async () => {
    const user = auth.currentUser;
    const input = $('#new-password-input');
    const btn = $('#change-pass-btn');
    const newPassword = input.value;
    if (!newPassword || newPassword.length < 6) { showToast('A senha deve ter pelo menos 6 caracteres.', 'warn'); return; }
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = '⏳ Atualizando…';
    try {
        await updatePassword(user, newPassword);
        input.value = '';
        showToast('Senha alterada com sucesso! 🔐', 'success');
    } catch (err) {
        if (err?.code === 'auth/requires-recent-login') showToast('Sessão antiga: saia e entre de novo antes de trocar a senha.', 'error', 5000);
        else showToast('Erro ao trocar senha: ' + (err?.message || 'desconhecido'), 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }
});

/* ================= PERFIL ================= */
async function loadUserProfile() {
    if (!currentUser) return;
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        currentUserProfile = userDoc.exists() ? userDoc.data() : {};
    } catch (err) {
        console.error('Erro ao carregar perfil:', err);
        currentUserProfile = {};
    }

    const p = currentUserProfile;
    $('#setting-blur-nsfw').checked = p.blurNsfw !== false;
    $('#set-name').value = p.name || '';
    $('#set-pix').value = p.pixKey || '';
    $('#set-avatar-url').value = p.avatarUrl || '';

    const name = p.name || 'Usuário';
    $('#my-name-display').textContent = name;
    $('#hw-name').textContent = name;

    renderAvatar($('#my-avatar-display'), p.avatarUrl, name);

    // Stats do perfil
    try {
        const created = currentUser.metadata?.creationTime ? new Date(currentUser.metadata.creationTime).getFullYear() : new Date().getFullYear();
        $('#stat-member').textContent = created;
    } catch { $('#stat-member').textContent = '—'; }
    try {
        const postsSnap = await getDocs(query(collection(db, 'posts'), where('userId', '==', currentUser.uid)));
        $('#stat-posts').textContent = postsSnap.size;
    } catch { $('#stat-posts').textContent = '–'; }

    // Sincroniza toggles de notificação
    const sysToggle = $('#setting-browser-notif');
    const soundToggle = $('#setting-sound-notif');
    if (sysToggle) sysToggle.checked = sysNotifEnabled() && ('Notification' in window ? Notification.permission === 'granted' : true);
    if (soundToggle) soundToggle.checked = soundEnabled();
}

function renderAvatar(container, url, name) {
    if (!container) return;
    const safe = sanitizeUrl(url || '');
    const initials = escapeHtml((name || 'GV').trim().substring(0, 2).toUpperCase() || 'GV');
    container.dataset.raw = `<span class="avatar-initials" aria-hidden="true">${initials}</span>` +
        (safe ? `<img src="${escapeHtml(safe)}" alt="Foto de ${escapeHtml(name || 'perfil')}" onerror="this.remove()">` : '');
    applyAvatarCosmetics(container);
}
/* Moldura/Aura no avatar: wrapper circular com o gradiente do tema (mesmo efeito do feed) */
function applyAvatarCosmetics(container) {
    if (!container) return;
    const raw = container.dataset.raw || container.innerHTML || '';
    const moldura = equippedCosmetic('moldura');
    const aura = equippedCosmetic('aura');
    container.classList.toggle('cos-framed', !!(moldura || aura));
    container.innerHTML = (moldura || aura) ? cosAvatarHTML(moldura, aura, raw) : raw;
}

$('#save-profile-btn')?.addEventListener('click', async () => {
    if (!currentUser) return;
    const btn = $('#save-profile-btn');
    btn.classList.add('loading');
    const payload = {
        name: $('#set-name').value.trim(),
        pixKey: $('#set-pix').value.trim(),
        avatarUrl: $('#set-avatar-url').value.trim(),
        blurNsfw: $('#setting-blur-nsfw').checked
    };
    try {
        await setDoc(doc(db, 'users', currentUser.uid), payload, { merge: true });
        showToast('Perfil atualizado! ✨', 'success');
        await loadUserProfile();
    } catch (err) {
        showToast('Erro ao salvar: ' + (err?.message || 'desconhecido'), 'error');
    } finally {
        btn.classList.remove('loading');
    }
});

/* ================= UPLOAD (ImgBB) ================= */
async function uploadToImgbb(file) {
    if (!file) throw new Error('Nenhum arquivo selecionado.');
    if (!file.type.startsWith('image/')) throw new Error('Apenas imagens são suportadas aqui. Para vídeos, use a Central de Mídia.');
    if (file.size > 32 * 1024 * 1024) throw new Error('Imagem muito grande (máx. 32 MB).');

    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
    const result = await response.json();
    if (result?.success && result?.data?.url) return result.data.url;
    throw new Error(result?.error?.message || 'Falha no servidor de imagens.');
}

const isVideoUrl = (url) => /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url) || url.includes('res.cloudinary.com');

/** Mostra/oculta a prévia do anexo no compositor de post (imagem OU vídeo) */
function showPostMediaPreview(url) {
    const preview = $('#post-media-preview');
    const img = $('#post-media-preview-img');
    const video = $('#post-media-preview-video');
    if (!preview || !img || !video) return;
    const safe = sanitizeUrl(url);
    if (!safe) { preview.hidden = true; return; }
    if (isVideoUrl(safe)) {
        video.src = safe;
        video.hidden = false;
        img.hidden = true;
        img.removeAttribute('src');
    } else {
        img.src = safe;
        img.hidden = false;
        video.hidden = true;
        video.removeAttribute('src');
        video.load?.();
    }
    preview.hidden = false;
}
function hidePostMediaPreview() {
    const preview = $('#post-media-preview');
    if (preview) preview.hidden = true;
    const img = $('#post-media-preview-img');
    if (img) { img.removeAttribute('src'); img.hidden = false; }
    const video = $('#post-media-preview-video');
    if (video) { video.removeAttribute('src'); video.hidden = true; video.load?.(); }
}

/** Fluxo principal pedido: escolher foto da galeria → link colado DIRETO no input do post */
async function attachGalleryFileToPost(file) {
    const urlInput = $('#post-media-url');
    const btn = $('#gallery-post-btn');
    if (!file || !urlInput) return;

    btn?.classList.add('loading');
    showToast('Enviando foto para a nuvem… ☁️', 'info', 2500);
    try {
        const url = await uploadToImgbb(file);
        urlInput.value = url;
        showPostMediaPreview(url);
        vibrate([10, 40, 10]);
        showToast('Prontinho! O link da foto foi colado no post. 📷', 'success');
    } catch (err) {
        showToast(err?.message || 'Não foi possível enviar a foto.', 'error', 4500);
    } finally {
        btn?.classList.remove('loading');
    }
}

async function attachVideoFileToPost(file) {
    const urlInput = $('#post-media-url');
    const btn = $('#video-post-btn');
    if (!file || !urlInput) return;
    if (file.size > 100 * 1024 * 1024) { showToast('Vídeo muito grande (máx. 100 MB). Tente um trecho mais curto 🙂', 'warn'); return; }

    btn?.classList.add('loading');
    showToast('Enviando vídeo para a nuvem… pode demorar um pouquinho ☁️', 'info', 4000);
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (!data?.secure_url) throw new Error(data?.error?.message || 'Falha no upload do vídeo');
        urlInput.value = data.secure_url;
        showPostMediaPreview(data.secure_url);
        vibrate([10, 40, 10]);
        showToast('Prontinho! O link do vídeo foi colado no post. 🎬', 'success');
    } catch (err) {
        console.error(err);
        showToast(err?.message || 'Não foi possível enviar o vídeo.', 'error', 4500);
    } finally {
        btn?.classList.remove('loading');
    }
}

$('#video-post-btn')?.addEventListener('click', () => $('#file-gallery-post-video')?.click());
$('#file-gallery-post-video')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    attachVideoFileToPost(file);
    e.target.value = ''; // permite reenviar o mesmo arquivo
});

$('#gallery-post-btn')?.addEventListener('click', () => $('#file-gallery-post')?.click());
$('#file-gallery-post')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    attachGalleryFileToPost(file);
    e.target.value = ''; // permite reenviar o mesmo arquivo
});
$('#post-media-preview-remove')?.addEventListener('click', () => {
    $('#post-media-url').value = '';
    hidePostMediaPreview();
});
/* Prévia automática quando o usuário cola um link manualmente */
$('#post-media-url')?.addEventListener('input', debounce((e) => {
    const safe = sanitizeUrl(e.target.value);
    if (safe) showPostMediaPreview(safe); else hidePostMediaPreview();
}, 450));

/* Contador de caracteres */
const postText = $('#post-text');
const charCounter = $('#post-char-counter');
postText?.addEventListener('input', () => {
    const len = postText.value.length;
    if (charCounter) {
        charCounter.textContent = `${len}/500`;
        charCounter.classList.toggle('limit', len >= 470);
    }
});

/* ================= FEED ================= */
function renderFeedSkeleton() {
    const feed = $('#feed-container');
    if (!feed) return;
    feed.innerHTML = Array(3).fill(`
        <div class="skeleton" aria-hidden="true">
            <div style="display:flex;gap:11px;align-items:center"><div class="skeleton-line skeleton-avatar"></div><div style="flex:1"><div class="skeleton-line w40"></div><div class="skeleton-line w70"></div></div></div>
            <div class="skeleton-line w100"></div><div class="skeleton-line w90"></div>
        </div>`).join('');
}

function postCardHTML(docSnap) {
    const data = docSnap.data();
    const postId = docSnap.id;
    const { html, previews, polls } = buildRichContent(data.text || '');
    const isNsfw = data.isNsfw === true;
    const userWantsBlur = currentUserProfile.blurNsfw !== false;
    const revealed = revealedPosts.has(postId);

    let mediaHtml = '';
    const mediaUrl = sanitizeUrl(data.mediaUrl || '');
    if (mediaUrl) {
        if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(mediaUrl) || mediaUrl.includes('res.cloudinary.com')) {
            mediaHtml = `<video controls playsinline preload="metadata" src="${escapeHtml(mediaUrl)}"></video>`;
        } else {
            mediaHtml = `<img src="${escapeHtml(mediaUrl)}" alt="Mídia do post" loading="lazy" onerror="this.style.display='none'">`;
        }
    }

    const shouldBlur = isNsfw && userWantsBlur && !revealed;
    const nsfwBadge = isNsfw ? '<span class="nsfw-badge">🔞 SENSÍVEL</span>' : '';
    const blurClass = shouldBlur ? 'nsfw-blur' : '';
    const warning = shouldBlur ? '<div class="nsfw-warning"><span>🔞 Conteúdo Sensível</span><small>Toque para revelar</small></div>' : '';

    const cosMap = cosmicMapOf(data);
    const cosEfx = cosMap.fundo || cosMap.efeito || cosMap.selo || null;
    const avatarUrl = sanitizeUrl(data.authorAvatar || '');
    const initials = escapeHtml((data.authorName || 'GV').trim().substring(0, 2).toUpperCase() || 'GV');
    const cosFramed = !!(cosMap.moldura || cosMap.aura);
    const avatarHtml = cosFramed
        ? cosAvatarHTML(cosMap.moldura, cosMap.aura, `<span class="avatar-initials" aria-hidden="true">${initials}</span>` + (avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="" onerror="this.remove()">` : ''))
        : `<span class="avatar-initials" aria-hidden="true">${initials}</span>` + (avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="" onerror="this.remove()">` : '');
    const authorNameHTML = nameHtmlFor(data.authorName || 'Usuário', cosMap.nome);
    const articleStyle = cosEfx ? ` style="--f1:${cosEfx.c1};--f2:${cosEfx.c2};--c1:${cosEfx.c1};--c2:${cosEfx.c2}"` : '';
    const articleClasses = ['post'];
    if (cosMap.fundo) articleClasses.push('post-fundo');
    if (cosMap.efeito) articleClasses.push('fx', `fx-${cosMap.efeito.fx || 'shimmer'}`);
    const sealHtml = cosMap.selo ? `<span class="post-seal" style="--c1:${cosMap.selo.c1};--c2:${cosMap.selo.c2}" title="${escapeHtml(cosMap.selo.name || 'Selo do Refúgio')}">${escapeHtml(cosMap.selo.emoji || '🏷️')}</span>` : '';
    const myReaction = myEquippedCat('reacao');
    const myReactionCount = myReaction ? Number(data.reactions?.[myReaction.emoji] || 0) : 0;

    const ts = data.timestamp?.toMillis ? data.timestamp.toMillis() : null;
    const voted = sessionStorage.getItem(`gv_vote_${postId}`) === '1';

    return `
    <article class="${articleClasses.join(' ')}" data-post-id="${escapeHtml(postId)}" data-author-id="${escapeHtml(data.userId || '')}" data-author-name="${escapeHtml(data.authorName || 'Usuário')}"${articleStyle}>
        <div class="post-header">
            <button class="post-author-btn" data-open-user="${escapeHtml(data.userId || '')}" aria-label="Ver o perfil de ${escapeHtml(data.authorName || 'usuário')}">
                <span class="post-avatar${cosFramed ? ' cos-framed' : ''}">${avatarHtml}</span>
                <span class="post-author-wrap">
                    <span class="post-author">${authorNameHTML} ${renderAuthorFlair(cosMap.emblema)}${renderAuthorFlair(cosMap.titulo)} ${nsfwBadge}</span>
                    ${sealHtml}
                    <span class="post-time">${ts ? timeAgo(ts) : 'agora mesmo'}</span>
                </span>
            </button>
        </div>
        <div class="nsfw-container${shouldBlur ? ' clickable' : ''}" data-nsfw-toggle="${shouldBlur ? '1' : '0'}">
            ${warning}
            <div class="post-blur-wrap ${blurClass}">
                ${html.trim() ? `<div class="post-content">${html}</div>` : ''}
                <div class="post-media">${previews}${mediaHtml}</div>
                ${renderPollBlock(polls, postId, data.enquete, voted)}
            </div>
        </div>
        <div class="post-actions">
            <button class="action-btn like-btn" data-action="like" aria-label="Curtir">👍 <span class="like-count">${data.likes || 0}</span></button>
            <button class="action-btn dislike" data-action="dislike" aria-label="Descurtir">👎 <span class="dislike-count">${data.dislikes || 0}</span></button>
            <button class="action-btn super-like" data-action="superlike" aria-label="Super Like via PIX">💸 Super Like</button>
            <button class="action-btn" data-action="comment" aria-label="Comentar">💬 Comentar</button>
            <button class="action-btn" data-action="share" aria-label="Compartilhar">↗️ Enviar</button>
            ${myReaction ? `<button class="action-btn reaction-btn" data-action="react" data-emoji="${escapeHtml(myReaction.emoji)}" aria-label="Reagir com ${escapeHtml(myReaction.name)}" title="${escapeHtml(myReaction.name)}">${myReaction.emoji} <span class="reaction-count">${myReactionCount}</span></button>` : ''}
        </div>
    </article>`;
}

function loadFeed() {
    renderFeedSkeleton();
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
    onSnapshot(q, (snapshot) => {
        // Notifica SOMENTE posts que chegam DEPOIS da carga inicial
        snapshot.docChanges().forEach((change) => {
            if (change.type !== 'added' || !currentUser) return;
            const data = change.doc.data();
            const isMine = data.userId === currentUser.uid;
            if (feedInitialLoad || isMine || !data.timestamp) return;
            pushNotification({
                type: 'post',
                title: 'Novo post no refúgio',
                body: `${data.authorName || 'Alguém'} publicou algo novo 🌊`,
                section: 'feed'
            });
        });
        feedInitialLoad = false;
        feedPostsCache = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        const feed = $('#feed-container');
        if (!feed) return;
        if (snapshot.empty) {
            feed.innerHTML = `<div class="empty-state"><span class="empty-emoji">🌊</span><strong>Nada por aqui ainda…</strong><p>Seja a primeira pessoa a espalhar boas vibrações!</p></div>`;
            return;
        }
        feed.innerHTML = snapshot.docs.map(postCardHTML).join('');
    }, (err) => {
        console.error('Erro no feed:', err);
        const feed = $('#feed-container');
        if (feed) feed.innerHTML = `<div class="empty-state"><span class="empty-emoji">😕</span><strong>Não consegui carregar o feed.</strong><p>${escapeHtml(firestorePermissionMsg(err))}</p></div>`;
        showToast(firestorePermissionMsg(err), 'error', 6000);
    });
}

$('#post-btn')?.addEventListener('click', async () => {
    if (!currentUser) { showToast('Entre para publicar!', 'warn'); return; }
    const text = $('#post-text').value;
    const mediaUrl = $('#post-media-url').value.trim();
    const isNsfw = $('#post-nsfw').checked;

    if (!text.trim() && !mediaUrl) { showToast('Escreva algo ou anexe uma mídia! 🙂', 'warn'); return; }
    if (mediaUrl && !sanitizeUrl(mediaUrl)) { showToast('Esse link de mídia parece inválido.', 'warn'); return; }

    const btn = $('#post-btn');
    btn.classList.add('loading');
    try {
        // Cria o mapa de votos da enquete (uma vez, no servidor)
        const polls = [...text.matchAll(/\(option:(\w+)\{([^}]+)\}\)/g)];
        const enquete = polls.length
            ? Object.fromEntries(polls.map((m) => [`votos_${m[1]}`, 0]))
            : null;

        const docData = {
            userId: currentUser.uid,
            authorName: currentUserProfile.name || 'Usuário',
            authorAvatar: currentUserProfile.avatarUrl || '',
            authorCosmetics: equippedCosmeticsSummary(),
            authorCosmetic: cosWritePrimary(),
            text: text.trim(),
            isNsfw,
            mediaUrl: mediaUrl || '',
            timestamp: serverTimestamp(),
            likes: 0,
            dislikes: 0
        };
        if (enquete) docData.enquete = enquete;

        await addDoc(collection(db, 'posts'), docData);
        $('#post-text').value = '';
        $('#post-media-url').value = '';
        $('#post-nsfw').checked = false;
        hidePostMediaPreview();
        charCounter && (charCounter.textContent = '0/500');
        vibrate([10, 30, 10]);
        showToast('Post publicado! Boas vibrações enviadas 🌊', 'success');
    } catch (err) {
        showToast('Erro ao publicar: ' + (err?.message || 'desconhecido'), 'error');
    } finally {
        btn.classList.remove('loading');
    }
});

/* Ações de post via delegação (like / dislike / superlike / share / nsfw / enquete / comentário) */
const feedActionClickHandler = async (e) => {
    const actionBtn = e.target.closest('[data-action]');
    const voteBtn = e.target.closest('[data-vote-post]');
    const nsfwToggle = e.target.closest('[data-nsfw-toggle="1"]');

    if (nsfwToggle) {
        const post = nsfwToggle.closest('.post');
        if (post) revealedPosts.add(post.dataset.postId);
        nsfwToggle.querySelector('.post-blur-wrap')?.classList.remove('nsfw-blur');
        nsfwToggle.querySelector('.nsfw-warning')?.remove();
        nsfwToggle.classList.remove('clickable');
        nsfwToggle.setAttribute('data-nsfw-toggle', '0');
        return;
    }

    if (voteBtn) {
        const postId = voteBtn.dataset.votePost;
        const optId = voteBtn.dataset.voteOption;
        if (sessionStorage.getItem(`gv_vote_${postId}`) === '1') { showToast('Você já votou nesta enquete!', 'warn'); return; }
        try {
            await updateDoc(doc(db, 'posts', postId), { [`enquete.votos_${optId}`]: increment(1) });
            sessionStorage.setItem(`gv_vote_${postId}`, '1');
            vibrate(10);
            showToast('Voto computado! 🗳️', 'success');
        } catch (err) {
            showToast('Erro ao votar: ' + (err?.message || ''), 'error');
        }
        return;
    }

    if (!actionBtn) return;
    const post = actionBtn.closest('.post');
    const postId = post?.dataset.postId;
    const action = actionBtn.dataset.action;
    if (!postId) return;

    if (action === 'react') {
        const emoji = actionBtn.dataset.emoji;
        if (!emoji) return;
        try {
            await setDoc(doc(db, 'posts', postId), { reactions: { [emoji]: increment(1) } }, { merge: true });
            const counter = actionBtn.querySelector('.reaction-count');
            if (counter) counter.textContent = Number(counter.textContent || 0) + 1;
            vibrate(8);
            actionBtn.classList.add('reacted');
        } catch (err) {
            showToast('Não consegui reagir: ' + (err?.message || ''), 'error');
        }
        return;
    }

    if (action === 'like' || action === 'dislike') {
        const field = action === 'like' ? 'likes' : 'dislikes';
        try {
            await updateDoc(doc(db, 'posts', postId), { [field]: increment(1) });
            const counter = actionBtn.querySelector(action === 'like' ? '.like-count' : '.dislike-count');
            if (counter) counter.textContent = Number(counter.textContent || 0) + 1;
            vibrate(12);
            if (action === 'like') {
                const burst = document.createElement('span');
                burst.className = 'like-burst';
                burst.textContent = '+1 💜';
                actionBtn.appendChild(burst);
                setTimeout(() => burst.remove(), 850);
            }
        } catch (err) { showToast('Erro ao reagir: ' + (err?.message || ''), 'error'); }
    }

    if (action === 'superlike') openPixModal(post.dataset.authorId);
    if (action === 'comment') openComments(postId, post.dataset.authorId);
    if (action === 'share') {
        const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
        if (navigator.share) { try { await navigator.share({ title: 'Good Vibes 🌊', url }); } catch { /* cancelado */ } }
        else { const ok = await clipboardCopy(url); showToast(ok ? 'Link copiado! Cole onde quiser 📋' : 'Não consegui copiar o link.', ok ? 'success' : 'error'); }
    }
};
['#feed-container', '#user-profile-posts'].forEach((sel) => { document.querySelector(sel)?.addEventListener('click', feedActionClickHandler); });

/* ================= COMENTÁRIOS ================= */
window.openComments = (postId, authorId) => {
    currentPostIdForComment = postId;
    currentPostAuthorForComment = authorId || null;
    openModal('comments-modal');

    const list = $('#comments-list');
    list.innerHTML = '<p class="muted">Carregando comentários…</p>';

    if (commentsUnsubscribe) commentsUnsubscribe();
    const q = query(collection(db, `posts/${postId}/comments`), orderBy('timestamp', 'asc'));
    commentsUnsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            list.innerHTML = '<p class="muted">Nenhum comentário ainda. Inicie o debate! 💬</p>';
            return;
        }
        list.innerHTML = snapshot.docs.map((d) => {
            const data = d.data();
            const cosMap = cosmicMapOf(data);
            return `<div class="comment-item"><button class="comment-author-btn" data-open-user="${escapeHtml(data.userId || '')}"><strong>${nameHtmlFor(data.authorName || 'Usuário', cosMap.nome)}</strong>${renderAuthorFlair(cosMap.emblema)}${renderAuthorFlair(cosMap.titulo)}</button>${escapeHtml(data.text || '')}</div>`;
        }).join('');
        list.scrollTop = list.scrollHeight;
    }, (err) => {
        console.error('Erro nos comentários:', err);
        list.innerHTML = '<p class="muted">Não consegui carregar os comentários.</p>';
    });
};

const openComments = window.openComments;

$('#submit-comment-btn')?.addEventListener('click', async () => {
    const input = $('#new-comment');
    const text = input.value.trim();
    if (!text || !currentPostIdForComment || !currentUser) return;

    const btn = $('#submit-comment-btn');
    btn.disabled = true;
    try {
        await addDoc(collection(db, `posts/${currentPostIdForComment}/comments`), {
            userId: currentUser.uid,
            authorName: currentUserProfile.name || 'Usuário',
            authorAvatar: currentUserProfile.avatarUrl || '',
            authorCosmetics: equippedCosmeticsSummary(),
            authorCosmetic: cosWritePrimary(),
            text,
            timestamp: serverTimestamp()
        });
        // Notifica o autor do post (via coleção "inbox"), se não for você mesmo
        if (currentPostAuthorForComment && currentPostAuthorForComment !== currentUser.uid) {
            try {
                await addDoc(collection(db, 'inbox'), {
                    to: currentPostAuthorForComment,
                    type: 'comment',
                    from: currentUserProfile.name || 'Alguém',
                    fromId: currentUser.uid,
                    text: text.slice(0, 140),
                    postId: currentPostIdForComment,
                    timestamp: serverTimestamp()
                });
            } catch (inboxErr) { console.warn('Inbox indisponível:', inboxErr?.message); }
        }
        input.value = '';
        vibrate(8);
    } catch (err) {
        showToast('Erro ao comentar: ' + (err?.message || ''), 'error');
    } finally {
        btn.disabled = false;
    }
});
$('#new-comment')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('#submit-comment-btn')?.click(); }
});

/* ================= SUPER LIKE (PIX) ================= */
window.openPixModal = async (authorId) => {
    openModal('pix-modal');
    const display = $('#pix-key-display');
    display.textContent = 'Buscando chave PIX…';
    try {
        const userDoc = await getDoc(doc(db, 'users', authorId));
        const pix = userDoc.exists() ? userDoc.data().pixKey : null;
        display.textContent = pix ? pix : 'Este criador ainda não cadastrou uma chave PIX. 🙈';
    } catch {
        display.textContent = 'Erro ao carregar a chave PIX.';
    }
};
const openPixModal = window.openPixModal;

$('#copy-pix-btn')?.addEventListener('click', async () => {
    const ok = await clipboardCopy($('#pix-key-display').textContent.trim());
    showToast(ok ? 'Chave PIX copiada! 💸' : 'Não consegui copiar — copie manualmente.', ok ? 'success' : 'warn');
});

/* ================= CHAT ================= */
window.lastReadChatTimestamp = parseInt(localStorage.getItem('gv_last_chat_read') || '0', 10) || Date.now();
try { localStorage.setItem('gv_last_chat_read', String(window.lastReadChatTimestamp)); } catch { /* ignora */ }

function chatBubbleHTML(data) {
    const isMe = data.userId === currentUser?.uid;
    const decrypted = decrypt(data.text || '');
    const { html, previews } = buildRichContent(decrypted);
    const ts = data.timestamp?.toMillis ? data.timestamp.toMillis() : null;
    return `<div class="chat-bubble ${isMe ? 'me' : 'them'}">
        ${isMe ? '' : `<button class="chat-bubble-name" data-open-user="${escapeHtml(data.userId || '')}">${(c => `${nameHtmlFor(data.authorName || 'Usuário', c.nome)} ${renderAuthorFlair(c.emblema)}${renderAuthorFlair(c.titulo)}`)(cosmicMapOf(data))}</button>`}
        <div>${html}</div>${previews}
        ${ts ? `<div class="chat-time">${toastTime(ts)}</div>` : ''}
    </div>`;
}

function renderPrivateContacts(chatBox) {
    chatBox.innerHTML = '<p class="chat-placeholder">Carregando contatos…</p>';
    $('#chat-input-area').style.display = 'none';

    getDocs(collection(db, 'users')).then((snap) => {
        let html = '<div class="contacts-heading">Escolha com quem conversar</div>';
        let found = 0;
        snap.forEach((d) => {
            if (d.id === currentUser.uid) return;
            const data = d.data();
            const name = data.name || 'Usuário';
            const avatar = sanitizeUrl(data.avatarUrl || '');
            const initials = escapeHtml(name.slice(0, 2).toUpperCase() || 'U');
            const avatarHtml = `<span class="contact-avatar"><span class="avatar-initials" aria-hidden="true">${initials}</span>${avatar ? `<img src="${escapeHtml(avatar)}" alt="" onerror="this.remove()">` : ''}</span>`;
            html += `<div class="contact-item"><button class="contact-item-main" data-dm-uid="${escapeHtml(d.id)}" data-dm-name="${escapeHtml(name)}">${avatarHtml}<strong>${escapeHtml(name)}</strong></button><button class="contact-profile-btn" data-open-user="${escapeHtml(d.id)}" aria-label="Ver perfil de ${escapeHtml(name)}" title="Ver perfil">👤</button></div>`;
            found++;
        });
        if (!found) html += '<p class="muted">Nenhum outro membro por aqui ainda.</p>';
        chatBox.innerHTML = html;
    }).catch(() => {
        chatBox.innerHTML = '<p class="muted">Erro ao carregar contatos.</p>';
    });
}

window.openChat = (type) => {
    currentChatRoom = type;
    window.lastReadChatTimestamp = Date.now();
    try { localStorage.setItem('gv_last_chat_read', String(window.lastReadChatTimestamp)); } catch { /* ignora */ }
    setBadge('chat', 0);

    $$('.chat-tab').forEach((t) => t.classList.remove('active'));
    $(`#tab-${type}`)?.classList.add('active');

    const chatBox = $('#chat-messages');
    if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }

    if (type === 'private') { renderPrivateContacts(chatBox); return; }

    $('#chat-input-area').style.display = 'flex';
    chatBox.innerHTML = '<p class="chat-placeholder">Conectando ao canal…</p>';

    const q = query(collection(db, `chats_${type}`), orderBy('timestamp', 'asc'));
    chatUnsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type !== 'added' || !currentUser) return;
            const data = change.doc.data();
            const msgTime = data.timestamp?.toMillis?.() || Date.now();
            const isMine = data.userId === currentUser.uid;
            const viewingThisRoom = $('#app-chat')?.classList.contains('active') && currentChatRoom === type;
            if (isMine || msgTime <= window.lastReadChatTimestamp || viewingThisRoom) return;
            pushNotification({
                type: 'chat',
                title: type === 'global' ? '💬 Chat Global' : '💬 Chat de Grupos',
                body: `${data.authorName || 'Alguém'}: ${decrypt(data.text || '').slice(0, 80)}`,
                section: 'chat'
            });
        });

        const nearBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 140;
        chatBox.innerHTML = snapshot.empty
            ? '<p class="chat-placeholder">Nenhuma mensagem ainda. Quebre o silêncio! 😄</p>'
            : snapshot.docs.map((d) => chatBubbleHTML(d.data())).join('');
        if (nearBottom) chatBox.scrollTop = chatBox.scrollHeight;
    }, (err) => {
        console.error('Erro no chat:', err);
        chatBox.innerHTML = `<p class="muted">${escapeHtml(firestorePermissionMsg(err))}</p>`;
        showToast('Sem permissão no chat (Firestore).', 'error', 6000);
    });
};

window.startPrivateChat = (otherUid, otherName) => {
    currentChatRoom = 'dm_' + [currentUser.uid, otherUid].sort().join('_');
    $('#chat-input-area').style.display = 'flex';
    $$('.chat-tab').forEach((t) => t.classList.remove('active'));

    const chatBox = $('#chat-messages');
    chatBox.innerHTML = '<p class="chat-placeholder">Abrindo conversa segura…</p>';

    if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
    const q = query(collection(db, currentChatRoom), orderBy('timestamp', 'asc'));
    chatUnsubscribe = onSnapshot(q, (snapshot) => {
        const nearBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 140;
        const backBtn = `<button class="dm-back-btn" id="dm-back-btn">⬅️ Voltar aos contatos</button><p class="dm-secure-note">🔒 Conversa criptografada com <strong>${escapeHtml(otherName)}</strong></p>`;
        const bubbles = snapshot.empty
            ? '<p class="chat-placeholder">Diga olá! 👋</p>'
            : snapshot.docs.map((d) => chatBubbleHTML(d.data())).join('');
        chatBox.innerHTML = backBtn + bubbles;
        $('#dm-back-btn')?.addEventListener('click', () => window.openChat('private'));
        if (nearBottom) chatBox.scrollTop = chatBox.scrollHeight;
    }, (err) => {
        console.error('Erro na DM:', err);
        chatBox.innerHTML = '<p class="muted">Não consegui abrir a conversa.</p>';
    });
};

/* Clique em contato (delegação — sem nomes em atributos inline) */
$('#chat-messages')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-dm-uid]');
    if (btn) window.startPrivateChat(btn.dataset.dmUid, btn.dataset.dmName);
});

/** Atualiza o índice dms/{room} com o resumo da última mensagem (alimenta as notificações de PV) */
async function recordDmActivity(roomHash, encryptedText, senderName) {
    const rest = roomHash.replace(/^dm_/, '');
    const members = rest.split('_').slice(0, 2);
    if (members.length !== 2) return;
    await setDoc(doc(db, 'dms', roomHash), {
        members,
        lastText: encryptedText,
        lastSenderId: currentUser.uid,
        lastSenderName: senderName,
        updatedAt: serverTimestamp()
    }, { merge: true });
}

async function sendChatMessageText(messageText) {
    const text = messageText.trim();
    if (!text || !currentUser) return false;
    const collectionName = currentChatRoom.startsWith('dm_') ? currentChatRoom : `chats_${currentChatRoom}`;
    const encrypted = encrypt(text);
    await addDoc(collection(db, collectionName), {
        userId: currentUser.uid,
        authorName: currentUserProfile.name || 'Usuário',
        authorAvatar: currentUserProfile.avatarUrl || '',
        authorCosmetics: equippedCosmeticsSummary(),
        authorCosmetic: cosWritePrimary(),
        text: encrypted,
        timestamp: serverTimestamp()
    });
    if (collectionName.startsWith('dm_')) {
        try {
            await recordDmActivity(collectionName, encrypted, currentUserProfile.name || 'Usuário');
        } catch (err) {
            console.warn('Não consegui atualizar o índice de PVs (verifique as regras do Firestore):', err?.message);
        }
    }
    return true;
}

$('#chat-send-btn')?.addEventListener('click', async () => {
    const input = $('#chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    vibrate(6);
    try { await sendChatMessageText(text); }
    catch (err) { console.error('Erro ao enviar:', err); showToast('Não consegui enviar. Tente de novo.', 'error'); input.value = text; }
});
$('#chat-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chat-send-btn')?.click(); }
});

/* Foto da galeria direto no chat: vira mensagem com link do upload */
$('#gallery-chat-btn')?.addEventListener('click', () => $('#file-gallery-chat')?.click());
$('#file-gallery-chat')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    showToast('Enviando foto… ☁️', 'info', 2500);
    try {
        const url = await uploadToImgbb(file);
        await sendChatMessageText(url);
        showToast('Foto enviada! 📷', 'success');
    } catch (err) { showToast(err?.message || 'Falha ao enviar a foto.', 'error'); }
});

/* ================= INBOX (notificações de comentário) ================= */
function startInboxListener() {
    if (!currentUser || inboxUnsubscribe) return;
    const q = query(collection(db, 'inbox'), where('to', '==', currentUser.uid));
    inboxUnsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type !== 'added') return;
            const data = change.doc.data();
            if (inboxInitialLoad) return; // não re-notifica o histórico antigo
            pushNotification({
                type: 'comment',
                title: '💬 Novo comentário',
                body: `${data.from || 'Alguém'}: ${String(data.text || '').slice(0, 90)}`,
                section: 'feed'
            });
        });
        inboxInitialLoad = false;
    }, (err) => console.warn('Inbox offline/sem permissão:', err?.message));
}

/* ================= PVs: NOTIFICAR MENSAGENS PRIVADAS ================= */
function startDmInboxListener() {
    if (!currentUser || dmUnsubscribe) return;
    const q = query(collection(db, 'dms'), where('members', 'array-contains', currentUser.uid));
    dmUnsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type !== 'modified' && change.type !== 'added') return;
            const data = change.doc.data();
            const roomHash = change.doc.id;
            const updated = data.updatedAt?.toMillis?.() || Date.now();
            const isMine = data.lastSenderId === currentUser.uid;
            // Não avisa se a pessoa está com ESTA conversa aberta agora
            const viewingThisRoom = $('#app-chat')?.classList.contains('active') && currentChatRoom === roomHash;
            if (dmInitialLoad || isMine || updated <= window.lastReadChatTimestamp || viewingThisRoom) return;

            const otherUid = (data.members || []).find((m) => m !== currentUser.uid) || '';
            const name = data.lastSenderName || 'Alguém';
            pushNotification({
                type: 'chat',
                title: '💬 Mensagem no PV',
                body: `${name}: ${decrypt(data.lastText || '').slice(0, 90)}`,
                section: 'chat',
                action: { kind: 'dm', uid: otherUid, name }
            });
        });
        dmInitialLoad = false;
    }, (err) => console.warn('PVs indisponíveis (verifique as regras do Firestore):', err?.message));
}

/* ================= MÍDIA (GIPHY / IMGBB / CLOUDINARY) ================= */
$('#media-search-btn')?.addEventListener('click', fetchMediaFromWeb);
$('#media-search-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchMediaFromWeb(); });

async function fetchMediaFromWeb() {
    const term = $('#media-search-input').value.trim();
    const resultsDiv = $('#media-results');
    if (!term) { resultsDiv.innerHTML = '<p class="media-status">Digite algo para buscar.</p>'; return; }

    resultsDiv.innerHTML = '<p class="media-status">Buscando na internet… 🔍</p>';
    try {
        const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(term)}&limit=30&rating=g&lang=pt`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (!json?.data?.length) { resultsDiv.innerHTML = '<p class="media-status">Nada encontrado. Tente outro termo! 🙈</p>'; return; }
        resultsDiv.innerHTML = '';
        json.data.forEach((gif) => {
            const imgUrl = gif?.images?.fixed_height?.url;
            if (!imgUrl) return;
            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = gif?.title || 'GIF';
            img.loading = 'lazy';
            img.className = 'image-item';
            img.title = 'Toque para copiar o link';
            img.addEventListener('click', async () => {
                const ok = await clipboardCopy(imgUrl);
                showToast(ok ? 'Link copiado! Cole no post, no chat… 📋' : 'Não consegui copiar o link.', ok ? 'success' : 'error');
                vibrate(8);
            });
            resultsDiv.appendChild(img);
        });
    } catch (err) {
        console.error('Erro na busca:', err);
        resultsDiv.innerHTML = '<p class="media-status">Erro de conexão com o Giphy. Tente de novo em instantes.</p>';
    }
}

/* A foto da galeria vira link e O LINK É COLADO DIRETO no input do post */
$('#imgbb-upload-label')?.addEventListener('click', () => $('#imgbb-upload')?.click());
$('#imgbb-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const status = $('#upload-status');
    if (status) { status.hidden = false; status.textContent = 'Convertendo sua foto em link…'; }
    try {
        const url = await uploadToImgbb(file);
        $('#post-media-url').value = url;
        showPostMediaPreview(url);
        if (status) { status.textContent = '✅ Link gerado e colado no post!'; }
        showToast('Link da foto colado no input do post! 📷', 'success');
        vibrate([10, 40, 10]);
        setTimeout(() => { if (status) status.hidden = true; }, 2600);
    } catch (err) {
        if (status) status.hidden = true;
        showToast(err?.message || 'Servidor de conversão indisponível.', 'error', 4500);
    }
});

/* Central de Mídia (vídeos via Cloudinary) */
$('#tool-btn')?.addEventListener('click', () => $('#media-tool-input')?.click());
$('#media-tool-input')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { showToast('Arquivo muito grande (máx. 100 MB).', 'warn'); return; }

    const btn = $('#tool-btn');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = '⏳ Enviando para a nuvem…';
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (!data?.secure_url) throw new Error(data?.error?.message || 'Falha no upload');

        $('#tool-link-display').textContent = data.secure_url;
        $('#tool-result-container').hidden = false;
        btn.textContent = '✅ Link gerado!';
        showToast('Mídia convertida em link! 🎬', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erro ao converter mídia: ' + (err?.message || 'tente de novo'), 'error');
        btn.textContent = '📁 Selecionar Arquivo';
    } finally {
        btn.disabled = false;
        setTimeout(() => { btn.innerHTML = '📁 Selecionar Outro Arquivo'; }, 1600);
    }
});
$('#copy-tool-link-btn')?.addEventListener('click', async () => {
    const ok = await clipboardCopy($('#tool-link-display').textContent.trim());
    showToast(ok ? 'Link copiado! 📋' : 'Não consegui copiar.', ok ? 'success' : 'error');
});

/* ================= PESSOAS ================= */
$('#search-btn')?.addEventListener('click', performSearch);
$('#search-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') performSearch(); });

async function performSearch() {
    const term = $('#search-input').value.trim().toLowerCase();
    const resultsDiv = $('#search-results');
    if (!term) { resultsDiv.innerHTML = '<p class="muted">Digite algo para buscar.</p>'; return; }

    resultsDiv.innerHTML = '<p class="muted">Buscando… 🔍</p>';
    try {
        const snap = await getDocs(collection(db, 'users'));
        let html = '';
        let found = 0;
        snap.forEach((d) => {
            const data = d.data();
            const name = data.name || '';
            if (!name.toLowerCase().includes(term)) return;
            found++;
            const avatar = sanitizeUrl(data.avatarUrl || '');
            const initials = escapeHtml(name.slice(0, 2).toUpperCase() || 'U');
            const avatarHtml = `<span class="contact-avatar"><span class="avatar-initials" aria-hidden="true">${initials}</span>${avatar ? `<img src="${escapeHtml(avatar)}" alt="" onerror="this.remove()">` : ''}</span>`;
            html += `<div class="person-item">${avatarHtml}<span class="person-name">${escapeHtml(name)}</span><button class="person-msg-btn" data-dm-uid="${escapeHtml(d.id)}" data-dm-name="${escapeHtml(name)}">✉️ Mensagem</button></div>`;
        });
        resultsDiv.innerHTML = found ? html : '<p class="muted">Ninguém encontrado com esse nome. 🙈</p>';
    } catch (err) {
        resultsDiv.innerHTML = `<p class="muted">Erro na busca: ${escapeHtml(err?.message || 'desconhecido')}</p>`;
    }
}

/* "✉️ Mensagem" direto da busca: abre o Chat privado com a pessoa */
$('#search-results')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-dm-uid]');
    if (!btn) return;
    openApp('chat');
    setTimeout(() => window.startPrivateChat(btn.dataset.dmUid, btn.dataset.dmName), 200);
});

/* ================= AVATAR VIA GALERIA ================= */
async function attachGalleryFileToAvatar(file) {
    if (!file) return;
    showToast('Enviando sua foto… ☁️', 'info', 2500);
    try {
        const url = await uploadToImgbb(file);
        const urlInput = $('#set-avatar-url');
        if (urlInput) urlInput.value = url;
        renderAvatar($('#my-avatar-display'), url, currentUserProfile.name || 'Usuário');
        if (currentUser) {
            try { await setDoc(doc(db, 'users', currentUser.uid), { avatarUrl: url }, { merge: true }); currentUserProfile.avatarUrl = url; } catch { /* salva depois pelo botão */ }
        }
        showToast('Foto de perfil atualizada! 📸', 'success');
    } catch (err) { showToast(err?.message || 'Falha ao enviar a foto.', 'error'); }
}
$('#profile-gallery-btn')?.addEventListener('click', () => $('#file-gallery-avatar')?.click());
$('#set-avatar-gallery-btn')?.addEventListener('click', () => $('#file-gallery-avatar')?.click());
$('#file-gallery-avatar')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    attachGalleryFileToAvatar(file);
});

/* ================= AJUSTES: tema, cor, notificações ================= */
$('#dark-mode-toggle')?.addEventListener('change', (e) => {
    const theme = e.target.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('gv_theme', theme); } catch { /* ignora */ }
    $('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1020' : '#e9ebf6');
    if (currentUser) setDoc(doc(db, 'users', currentUser.uid), { theme }, { merge: true }).catch(() => {});
});

const savedColorInit = (() => { try { return localStorage.getItem('gv_primary_color'); } catch { return null; } })();
if (savedColorInit) { const picker = $('#site-color'); if (picker) picker.value = savedColorInit; }

$('#site-color')?.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--primary-color', e.target.value);
});
$('#site-color')?.addEventListener('change', (e) => {
    try { localStorage.setItem('gv_primary_color', e.target.value); } catch { /* ignora */ }
    if (currentUser) setDoc(doc(db, 'users', currentUser.uid), { primaryColor: e.target.value }, { merge: true }).catch(() => {});
    showToast('Cor principal atualizada! 🎨', 'success');
});

$('#setting-browser-notif')?.addEventListener('change', async (e) => {
    const toggle = e.target;
    if (!('Notification' in window)) { showToast('Este aparelho não suporta notificações do sistema.', 'warn'); toggle.checked = false; return; }
    if (toggle.checked) {
        let permission = Notification.permission;
        if (permission === 'default') permission = await Notification.requestPermission();
        if (permission === 'granted') { try { localStorage.setItem('gv_sys_notif', '1'); } catch { /* ignora */ } showToast('Notificações do sistema ativadas! 🔔', 'success'); }
        else { toggle.checked = false; try { localStorage.setItem('gv_sys_notif', '0'); } catch { /* ignora */ } showToast('Permissão negada. Libere nas configurações do navegador.', 'warn', 5000); }
    } else {
        try { localStorage.setItem('gv_sys_notif', '0'); } catch { /* ignora */ }
        showToast('Notificações do sistema desativadas.', 'info');
    }
});

$('#setting-sound-notif')?.addEventListener('change', (e) => {
    try { localStorage.setItem('gv_sound_notif', e.target.checked ? '1' : '0'); } catch { /* ignora */ }
    if (e.target.checked) playChime();
});

/* ================= AJUSTES: notificações (lista/filtros/limpar) ================= */
$('#notif-markall-btn')?.addEventListener('click', () => { markAllNotificationsRead(); showToast('Tudo marcado como lido ✓', 'success'); });
$('#notif-clear-btn')?.addEventListener('click', async () => {
    const ok = await gvConfirm({ emoji: '🧹', title: 'Limpar histórico?', message: 'Todas as notificações serão apagadas deste aparelho.', okLabel: 'Limpar tudo' });
    if (ok) { clearAllNotifications(); showToast('Histórico de notificações limpo.', 'info'); }
});
$$('.notif-filter').forEach((btn) => btn.addEventListener('click', () => {
    notifFilter = btn.dataset.filter;
    $$('.notif-filter').forEach((b) => b.classList.toggle('active', b === btn));
    renderNotificationsList();
}));
$('#notif-permission-btn')?.addEventListener('click', async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    try { localStorage.setItem('gv_sys_notif', permission === 'granted' ? '1' : '0'); } catch { /* ignora */ }
    updateNotifPermissionButton();
    if (permission === 'granted') showToast('Notificações do sistema ativadas! 🔔', 'success');
});
function updateNotifPermissionButton() {
    const btn = $('#notif-permission-btn');
    if (!btn) return;
    const supported = 'Notification' in window;
    btn.hidden = !supported || Notification.permission !== 'default';
}

/* ================= INSTALAR APP (PWA) ================= */
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const card = $('#install-card');
    if (card) card.hidden = false;
});
$('#install-app-btn')?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    $('#install-card').hidden = true;
    if (outcome === 'accepted') showToast('Good Vibes instalado! Procure o ícone na sua tela inicial 📲', 'success', 5000);
});
window.addEventListener('appinstalled', () => {
    $('#install-card').hidden = true;
    showToast('Aplicativo instalado com sucesso! 🎉', 'success');
});

/* ================= ECONOMIA 🪙 (Loja, Inventário, Refinaria, Construção, Trabalho, Presentes) ================= */
/* Dados em window.GV_ECO (js/economy-data.js). Estado persistido em users/{uid}.
   ⚠️ A economia é autoritativa no cliente (sem servidor): dá pra trapacear
   pelo Console — vale como diversão, não como dinheiro de verdade. */
const ECO = window.GV_ECO;
const STARTER_GOLD = 250;
const COLLECT_CAP_MINUTES = 12 * 60; // renda acumula no máximo 12h
const STAMINA_MAX = 100;
const STAMINA_REGEN_MS = 20 * 1000;   // +1 energia a cada 20s
const GATHER_STAMINA_COST = 20;       // energia por visita de coleta

let economyState = null;      // { gold, inv, buildings, cosmetics, equipped, lastCollectAt, jobCd, gatherCd }
let economyTicker = null;
let shopPage = 1;             // paginação dos cosméticos (60 por página)
const COSMETICS_PAGE_SIZE = 60;
const giftState = { mode: 'gold' };

const ecoUserRef = () => doc(db, 'users', currentUser.uid);
const fmtGold = (n) => `${Math.floor(Number(n) || 0).toLocaleString('pt-BR')} gold`;
const matQty = (id) => (economyState?.inv?.[id] || 0);
const artifactQty = (id) => (economyState?.artifacts?.[id] || 0);
const outputInfo = (id) => ECO?.MATERIAL_BY_ID?.[id] || ECO?.ARTIFACT_BY_ID?.[id] || ECO?.ARENA_RELIC_BY_ID?.[id] || { id, name: id, emoji: '📦' };
const ARENA_CORE_IDS = { 1: 'core_evo', 2: 'core_primus' };
const isArtifact = (id) => !!(ECO?.ARTIFACT_BY_ID?.[id]);

function normalizeEconomy(d = {}) {
    return {
        gold: typeof d.gold === 'number' ? d.gold : STARTER_GOLD,
        inv: d.inv && typeof d.inv === 'object' ? { ...d.inv } : {},
        buildings: d.buildings && typeof d.buildings === 'object' ? { ...d.buildings } : {},
        cosmetics: Array.isArray(d.cosmetics) ? [...d.cosmetics] : [],
        equipped: typeof d.equippedCosmetic === 'string' ? d.equippedCosmetic : null,
        equippedMap: d.equippedCosmetics && typeof d.equippedCosmetics === 'object' ? { ...d.equippedCosmetics } : {},
        lastCollectAt: typeof d.lastCollectAt === 'number' ? d.lastCollectAt : Date.now(),
        jobCd: d.jobCd && typeof d.jobCd === 'object' ? { ...d.jobCd } : {},
        gatherCd: d.gatherCd && typeof d.gatherCd === 'object' ? { ...d.gatherCd } : {},
        creditScore: typeof d.creditScore === 'number' ? d.creditScore : 50,
        stamina: typeof d.stamina === 'number' ? Math.max(0, Math.min(STAMINA_MAX, d.stamina)) : STAMINA_MAX,
        staminaAt: typeof d.staminaAt === 'number' ? d.staminaAt : Date.now(),
        artifacts: d.artifacts && typeof d.artifacts === 'object' ? { ...d.artifacts } : {},
        arenaTree: d.arenaTree && typeof d.arenaTree === 'object' ? { ...d.arenaTree } : {},
        cardFrame: typeof d.cardFrame === 'string' ? d.cardFrame : '',
        arenaDeck: Array.isArray(d.arenaDeck) ? d.arenaDeck.filter((x) => typeof x === 'string') : [],
        arenaUpgrades: d.arenaUpgrades && typeof d.arenaUpgrades === 'object' ? { ...d.arenaUpgrades } : {},
        arenaEvo: d.arenaEvo && typeof d.arenaEvo === 'object' ? { ...d.arenaEvo } : {},
        arenaRelics: Array.isArray(d.arenaRelics) ? d.arenaRelics.filter((x) => typeof x === 'string') : [],
        arenaRelicEquips: d.arenaRelicEquips && typeof d.arenaRelicEquips === 'object' ? { ...d.arenaRelicEquips } : {}
    };
}

/* Energia: regenera com o tempo (+1 a cada 20s). Atualiza só em memória;
   persiste no próximo saveEconomy — Simples e suficiente. */
function regenStamina() {
    if (!economyState) return STAMINA_MAX;
    const now = Date.now();
    const elapsed = Math.max(0, now - (economyState.staminaAt || now));
    const gain = Math.floor(elapsed / STAMINA_REGEN_MS);
    if (gain > 0) {
        economyState.stamina = Math.min(STAMINA_MAX, (economyState.stamina || 0) + gain);
        economyState.staminaAt = (economyState.staminaAt || now) + gain * STAMINA_REGEN_MS;
        if (economyState.stamina >= STAMINA_MAX) economyState.staminaAt = now;
    }
    return economyState.stamina;
}

async function initEconomy() {
    if (!currentUser) return;
    try {
        const snap = await getDoc(ecoUserRef());
        const data = snap.exists() ? snap.data() : {};
        const patch = {};
        if (typeof data.gold !== 'number') patch.gold = STARTER_GOLD;
        if (!data.inv || typeof data.inv !== 'object') patch.inv = {};
        if (!data.buildings || typeof data.buildings !== 'object') patch.buildings = {};
        if (typeof data.lastCollectAt !== 'number') patch.lastCollectAt = Date.now();
        if (!Array.isArray(data.cosmetics)) patch.cosmetics = [];
        if (!data.jobCd || typeof data.jobCd !== 'object') patch.jobCd = {};
        if (!data.gatherCd || typeof data.gatherCd !== 'object') patch.gatherCd = {};
        if (typeof data.creditScore !== 'number') patch.creditScore = 50;
        if (typeof data.stamina !== 'number') patch.stamina = STAMINA_MAX;
        if (typeof data.staminaAt !== 'number') patch.staminaAt = Date.now();
        if (!data.artifacts || typeof data.artifacts !== 'object') patch.artifacts = {};
        if (!data.arenaTree || typeof data.arenaTree !== 'object') patch.arenaTree = {};
        if (typeof data.cardFrame !== 'string') patch.cardFrame = '';
        if (!Array.isArray(data.arenaDeck)) patch.arenaDeck = [];
        if (!data.equippedCosmetics || typeof data.equippedCosmetics !== 'object') {
            // Migração: converte o slot único antigo em slots por categoria
            const migrated = {};
            const legacyId = typeof data.equippedCosmetic === 'string' ? data.equippedCosmetic : null;
            const legacyCos = legacyId && window.GV_ECO?.COSMETIC_BY_ID?.[legacyId];
            if (legacyCos) migrated[legacyCos.cat] = legacyCos.id;
            patch.equippedCosmetics = migrated;
        }
        if (Object.keys(patch).length) await setDoc(ecoUserRef(), patch, { merge: true });
        economyState = normalizeEconomy({ ...data, ...patch });
    } catch (err) {
        console.warn('Economia indisponível (verifique as regras do Firestore):', err?.message);
        economyState = normalizeEconomy({});
    }
    refreshEconomyUI();
    startEconomyTicker();
}

async function saveEconomy(patch) {
    if (!currentUser || !economyState) return;
    economyState = { ...economyState, ...patch };
    try {
        await setDoc(ecoUserRef(), patch, { merge: true });
    } catch (err) {
        console.warn('Falha ao salvar a economia:', err?.message);
        showToast('Não consegui salvar sua economia. Verifique as regras do Firestore.', 'error');
    }
    refreshEconomyUI();
}

/* ---------- util: cosméticos equipados (um slot por categoria) ---------- */
const EQUIP_SLOT_ORDER = ['moldura', 'aura', 'nome', 'titulo', 'emblema', 'fundo', 'efeito', 'capa', 'selo', 'reacao'];
function equippedMapIds() { return economyState?.equippedMap || {}; }
function equippedCosmetics() {
    const out = {};
    if (!ECO) return out;
    const map = equippedMapIds();
    for (const cat of EQUIP_SLOT_ORDER) {
        const id = map[cat];
        const c = id ? ECO.COSMETIC_BY_ID[id] : null;
        if (c) out[cat] = c;
    }
    return out;
}
function equippedCosmetic(cat) {
    if (cat) return equippedCosmetics()[cat] || null;
    const all = equippedCosmetics();
    return EQUIP_SLOT_ORDER.map((k) => all[k]).find(Boolean) || null;
}
const cosSummary = (c) => ({ id: c.id, cat: c.cat, emoji: c.emoji, name: c.name, theme: c.theme, themeName: c.themeName, fx: c.fx, c1: c.c1, c2: c.c2, gem: c.gem, rarity: c.rarity });
const cosWritePrimary = () => { const p = equippedCosmetic(); return p ? cosSummary(p) : null; };
function equippedCosmeticsSummary() {
    const all = equippedCosmetics();
    const out = {};
    for (const [cat, c] of Object.entries(all)) out[cat] = cosSummary(c);
    return Object.keys(out).length ? out : null;
}
/* Mapa de cosméticos de um doc (post/comentário/chat), com fallback p/ formato antigo */
function cosmicMapOf(data) {
    if (data?.authorCosmetics && typeof data.authorCosmetics === 'object') return data.authorCosmetics;
    const legacy = data?.authorCosmetic;
    if (legacy?.cat) return { [legacy.cat]: legacy };
    return {};
}
/* Reação equipada (cosmético de reação ativo) */
function myEquippedCat(cat) {
    return equippedCosmetic(cat);
}
/* Flair no nome do autor (título / emblema) */
function renderAuthorFlair(c) {
    if (!c) return '';
    const name = escapeHtml(c.name || 'Cosmético');
    if (c.cat === 'titulo') {
        const themeTxt = escapeHtml(c.themeName || c.theme || 'Refúgio');
        return `<span class="author-title" style="--c1:${c.c1 || '#fbbf24'};--c2:${c.c2 || '#f59e0b'}" title="${name}">${c.emoji || ''} ${themeTxt} do Refúgio</span>`;
    }
    if (c.cat === 'emblema') {
        return `<span class="author-emblem" style="--c1:${c.c1 || '#fbbf24'};--c2:${c.c2 || '#f59e0b'}" title="${name}">${c.emoji || '🏅'}</span>`;
    }
    return '';
}
const nameHtmlFor = (name, c) => (c?.cat === 'nome'
    ? `<span class="author-name-grad" style="background-image:linear-gradient(135deg, ${c.c1 || '#fbbf24'}, ${c.c2 || '#f59e0b'})">${escapeHtml(name)}</span>`
    : escapeHtml(name));
/* Avatar com moldura/aura: um único círculo autocontido (sem :has, sem herdar cascata) */
const cosAvatarHTML = (moldura, aura, innerHTML) => {
    if (!moldura && !aura) return innerHTML;
    const src = moldura || aura;
    const classes = ['cos-avatar'];
    if (moldura) classes.push('cos-moldura');
    if (aura) classes.push('cos-aura');
    return `<span class="${classes.join(' ')}" style="--c1:${src.c1};--c2:${src.c2}"><span class="cos-avatar-inner">${innerHTML}</span></span>`;
};
const innerAvatarHTML = (url, name) => {
    const safe = sanitizeUrl(url || '');
    const initials = escapeHtml((name || 'GV').trim().substring(0, 2).toUpperCase() || 'GV');
    return `<span class="avatar-initials" aria-hidden="true">${initials}</span>` + (safe ? `<img src="${escapeHtml(safe)}" alt="" onerror="this.remove()">` : '');
};
function authorCosmeticChip(cosmetic) {
    if (!cosmetic?.emoji) return '';
    if (cosmetic.cat === 'emblema' || cosmetic.cat === 'titulo') return renderAuthorFlair(cosmetic);
    // Posts antigos (chip simples) continuam legíveis
    if (!cosmetic.cat) {
        const title = escapeHtml(cosmetic.name || 'Cosmético');
        return `<span class="author-cosmetic" title="${title}">${escapeHtml(cosmetic.emoji)} ${title}</span>`;
    }
    return '';
}

/* ---------- renda passiva ---------- */
function incomeRate() {
    if (!economyState || !ECO) return 0;
    const fromBuildings = ECO.BUILDINGS.reduce((sum, b) => sum + (economyState.buildings[b.id] || 0) * b.rate, 0);
    const fromArtifacts = ECO.ARTIFACTS.reduce((sum, a) => sum + (economyState.artifacts?.[a.id] || 0) * a.passive, 0);
    return fromBuildings + fromArtifacts;
}
function pendingGain() {
    if (!economyState) return 0;
    const minutes = Math.min((Date.now() - (economyState.lastCollectAt || Date.now())) / 60000, COLLECT_CAP_MINUTES);
    return Math.max(0, Math.floor(incomeRate() * minutes));
}

/* ---------- RENDERERS ---------- */
function renderEcoBalances() {
    if (!ECO) return;
    const gold = fmtGold(economyState?.gold);
    ['shop-gold', 'inv-gold', 'construction-gold', 'work-gold', 'arena-gold'].forEach((id) => { const el = document.getElementById(id); if (el) el.textContent = gold; });
    const rate = document.getElementById('shop-rate');
    if (rate) rate.textContent = incomeRate() ? `+${incomeRate()} gold/min de renda` : 'Construa para ter renda passiva';
}

function cosmeticCardHTML(c, owned) {
    const isEquipped = economyState?.equippedMap?.[c.cat] === c.id;
    let btn;
    if (isEquipped) btn = '<button class="cosmetic-buy equipped" disabled>⭐ Equipado</button>';
    else if (owned) btn = `<button class="cosmetic-buy owned" data-equip-cosmetic="${c.id}">✅ No seu baú</button>`;
    else btn = `<button class="cosmetic-buy" data-buy-cosmetic="${c.id}">🪙 ${c.price.toLocaleString('pt-BR')}</button>`;
    return `<div class="cosmetic-card" title="${escapeHtml(c.name)} — ${escapeHtml(c.rarityName)}">
        <span class="cosmetic-emoji">${c.catEmoji}${c.emoji}</span>
        <span class="cosmetic-name">${escapeHtml(c.name)}</span>
        <span class="rarity-chip rarity-${c.rarity}">${c.gem} ${escapeHtml(c.rarityName)}</span>
        <span class="cosmetic-effect">${escapeHtml(c.effect || '')}</span>
        ${owned ? '' : `<span class="cosmetic-price">🪙 ${c.price.toLocaleString('pt-BR')}</span>`}
        ${btn}
    </div>`;
}

function filteredCosmetics() {
    const q = ($('#shop-search')?.value || '').trim().toLowerCase();
    const cat = $('#shop-cat')?.value || '';
    const rar = $('#shop-rarity')?.value || '';
    return ECO.COSMETICS.filter((c) =>
        (!cat || c.cat === cat) && (!rar || c.rarity === rar) && (!q || c.name.toLowerCase().includes(q))
    );
}

function renderCosmeticShop() {
    const grid = $('#cosmetic-grid');
    if (!grid || !ECO) return;
    const ownedSet = new Set(economyState?.cosmetics || []);
    const filtered = filteredCosmetics();
    const shown = filtered.slice(0, shopPage * COSMETICS_PAGE_SIZE);
    const countEl = $('#shop-cosmetic-count');
    if (countEl) countEl.textContent = `${filtered.length.toLocaleString('pt-BR')} cosméticos · você possui ${ownedSet.size.toLocaleString('pt-BR')}`;
    grid.innerHTML = shown.map((c) => cosmeticCardHTML(c, ownedSet.has(c.id))).join('') || '<p class="inv-empty">Nada por aqui… tente outra busca 🔍</p>';
    const more = $('#shop-load-more');
    if (more) {
        more.hidden = shown.length >= filtered.length;
        more.textContent = `Carregar mais (${(filtered.length - shown.length).toLocaleString('pt-BR')} restantes)`;
    }
}

function renderInventory() {
    if (!ECO) return;
    const gold = fmtGold(economyState?.gold);
    const invGold = $('#inv-gold'); if (invGold) invGold.textContent = gold;
    const equippedAll = equippedCosmetics();
    const eq = $('#equipped-card');
    if (eq) {
        const entries = Object.values(equippedAll);
        eq.innerHTML = entries.length
            ? entries.map((c) => {
                const catMeta = ECO.COSMETIC_CATEGORIES.find((k) => k.id === c.cat);
                return `<button class="eq-slot" data-equip-cosmetic="${escapeHtml(c.id)}" title="Tocar para remover o slot de ${escapeHtml(catMeta?.word || c.cat)}"><span class="eco-equipped-emoji">${c.catEmoji}${c.emoji}</span><span class="eco-equipped-info"><small>${escapeHtml(catMeta?.word || c.cat)} · <i>${escapeHtml(c.rarityName)}</i></small><strong>${escapeHtml(c.name)}</strong><small class="eco-effect-line"><span class="eco-swatch" style="background:linear-gradient(135deg, ${c.c1}, ${c.c2})"></span>${escapeHtml(c.effect || '')}</small></span><span class="eq-remove">✕</span></button>`;
            }).join('')
            : `<span class="eco-equipped-emoji">🫥</span><span class="eco-equipped-info"><small>Nenhum cosmético equipado</small><strong>Toque nos cosméticos do seu baú para equipar — cada um muda seu visual pra valer ✨</strong></span>`;
    }

    const grid = $('#inventory-grid');
    const ownedEntries = ECO.ALL_MATERIALS.filter((m) => matQty(m.id) > 0);
    if (grid) {
        grid.innerHTML = ownedEntries.length
            ? ownedEntries.map((m) => `<div class="inv-cell" title="${escapeHtml(m.name)}"><span class="inv-emoji">${m.emoji}</span><span class="inv-name">${escapeHtml(m.name)}</span><span class="inv-qty">×${matQty(m.id)}</span></div>`).join('')
            : '<p class="inv-empty">Nada no baú ainda. Visite o Trabalho 💼 pra começar a juntar!</p>';
        const count = $('#inv-mat-count'); if (count) count.textContent = `${ownedEntries.length}/${ECO.ALL_MATERIALS.length} tipos`;
    }

    const ownedBox = $('#owned-cosmetics');
    if (ownedBox) {
        const ownedSet = new Set(economyState?.cosmetics || []);
        const ownedItems = ECO.COSMETICS.filter((c) => ownedSet.has(c.id));
        ownedBox.innerHTML = ownedItems.length
            ? ownedItems.map((c) => cosmeticCardHTML(c, true)).join('')
            : '<p class="inv-empty">Você ainda não tem cosméticos. A Loja 🪙 te espera — tem 1.000 opções!</p>';
        const count = $('#inv-cos-count'); if (count) count.textContent = `${ownedItems.length}/1.000`;
    }
}

/* ============ MESA DE TRABALHO 🛠️ (craft 3x3 com formato, estilo Minecraft) ============ */
let craftGrid = Array(9).fill(null);   // ids de materiais posicionados (reserva lógica, não sai do baú até craftar)
let craftSelected = null;              // material escolhido por toque (fluxo tap-to-place)

const craftGridReservations = () => {
    const used = {};
    for (const id of craftGrid) if (id) used[id] = (used[id] || 0) + 1;
    return used;
};

function matchCraftRecipe(grid) {
    if (!ECO) return null;
    for (const r of ECO.RECIPES) {
        if (!r.shape || !r.key) continue;
        const rows = r.shape.length, cols = Math.max(...r.shape.map((row) => row.length));
        for (let dy = 0; dy <= 3 - rows; dy++) {
            for (let dx = 0; dx <= 3 - cols; dx++) {
                const expected = new Array(9).fill(null);
                for (let ry = 0; ry < rows; ry++) {
                    for (let cx = 0; cx < cols; cx++) {
                        const ch = r.shape[ry][cx] || '.';
                        if (ch !== '.') expected[(dy + ry) * 3 + (dx + cx)] = r.key[ch] || null;
                    }
                }
                let ok = true;
                for (let i = 0; i < 9; i++) { if ((grid[i] || null) !== expected[i]) { ok = false; break; } }
                if (ok) return r;
            }
        }
    }
    return null;
}

function renderCraftArea() {
    const tray = $('#craft-tray');
    const gridEl = $('#craft-grid');
    if (!ECO || !economyState || !gridEl) return;

    // Grade 3x3
    const used = craftGridReservations();
    gridEl.innerHTML = craftGrid.map((id, i) => {
        if (!id) return `<button class="craft-cell" data-craft-cell="${i}" aria-label="Célula ${i + 1} vazia"></button>`;
        const m = ECO.MATERIAL_BY_ID[id];
        return `<button class="craft-cell filled" data-craft-cell="${i}" aria-label="Célula ${i + 1}: ${escapeHtml(m?.name || id)} — toque para devolver">${m?.emoji || '📦'}</button>`;
    }).join('');

    // Bandeja com o que o jogador tem (menos o que está na grade)
    const owned = ECO.ALL_MATERIALS
        .map((m) => ({ m, qty: (economyState.inv[m.id] || 0) - (used[m.id] || 0) }))
        .filter((x) => x.qty > 0);
    if (tray) {
        tray.innerHTML = owned.length
            ? owned.map(({ m, qty }) => `<button class="craft-tray-item${craftSelected === m.id ? ' selected' : ''}" data-craft-mat="${escapeHtml(m.id)}" aria-pressed="${craftSelected === m.id}" aria-label="${escapeHtml(m.name)}, ${qty} no baú"><span class="tray-emoji">${m.emoji}</span><span class="tray-qty">×${qty}</span><span class="tray-name">${escapeHtml(m.name)}</span></button>`).join('')
            : '<p class="craft-tray-empty">Baú vazio por aqui — trabalhe 💼 e colete 🌿 pra conseguir materiais!</p>';
    }

    // Resultado
    // Segredos da Arena ⚔️ (relíquias e núcleos forjáveis na bancada)
    const secrets = $('#arena-craft-secrets');
    if (secrets && ECO?.ARENA_RELICS) {
        const ownedRelics = new Set(economyState.arenaRelics || []);
        const invNow = economyState.inv || {};
        const items = [
            ...ECO.ARENA_RELICS.map((r) => ({ emoji: r.emoji, name: r.name, hint: r.hint, status: ownedRelics.has(r.id) ? `<span class="artifact-passive">✓ Forjada</span>` : '<span class="artifact-passive">🔒 ???</span>', owned: ownedRelics.has(r.id) })),
            ...(ECO.ARENA_MATERIALS || []).map((m) => ({ emoji: m.emoji, name: m.name, hint: m.hint, status: (Number(invNow[m.id]) || 0) > 0 ? `<span class="artifact-passive">×${invNow[m.id]} no Baú</span>` : '<span class="artifact-passive">🔒 ???</span>', owned: (Number(invNow[m.id]) || 0) > 0 }))
        ];
        secrets.innerHTML = items.map((a) => a.owned
            ? `<div class="artifact-card"><span class="artifact-emoji">${a.emoji}</span><span class="artifact-info"><span class="artifact-name">${escapeHtml(a.name)}</span><span class="artifact-hint">${escapeHtml(a.hint)}</span></span>${a.status}</div>`
            : `<div class="artifact-card locked"><span class="artifact-emoji">🕳️</span><span class="artifact-info"><span class="artifact-name">???</span><span class="artifact-hint">${escapeHtml(a.hint)}</span></span>${a.status}</div>`
        ).join('');
    }

    const match = matchCraftRecipe(craftGrid);
    const resultEl = $('#craft-result');
    const resultName = $('#craft-result-name');
    const craftBtn = $('#craft-do-btn');
    if (resultEl && resultName && craftBtn) {
        if (match) {
            const out = outputInfo(match.out);
            const artifact = ECO.ARTIFACT_BY_ID?.[match.out];
            resultEl.innerHTML = `${out?.emoji || '📦'}${match.qty > 1 ? `<span class="cell-qty">×${match.qty}</span>` : ''}`;
            resultEl.classList.add('ready');
            resultName.textContent = artifact ? `${out?.name} · +${artifact.passive} gold/min 🧿` : `${out?.name || match.out} (×${match.qty})`;
            craftBtn.disabled = false;
        } else {
            resultEl.innerHTML = '<span class="craft-result-empty">?</span>';
            resultEl.classList.remove('ready');
            resultName.textContent = craftGrid.some(Boolean) ? 'formato sem receita…' : 'sem receita';
            craftBtn.disabled = true;
        }
    }
}

function placeCraftMaterial(id, cellIndex) {
    if (!ECO || !economyState) return;
    if (!ECO.MATERIAL_BY_ID[id]) return;
    const cell = Number(cellIndex);
    if (!(cell >= 0 && cell < 9)) return;
    const used = craftGridReservations();
    const already = craftGrid[cell] === id;
    const reserved = (used[id] || 0) - (already ? 1 : 0);
    const available = (economyState.inv[id] || 0) - reserved;
    if (available < 1) { showToast('Você não tem esse material sobrando 👀', 'warn'); return; }
    craftGrid[cell] = id;
    renderCraftArea();
}

function clearCraftGrid() {
    craftGrid = Array(9).fill(null);
    craftSelected = null;
    renderCraftArea();
}

async function craftNow() {
    if (!ECO || !economyState) return;
    const match = matchCraftRecipe(craftGrid);
    if (!match) { showToast('Esse formato não bate com nenhuma receita 🤔', 'warn'); return; }
    const relicOut = ECO.ARENA_RELIC_BY_ID?.[match.out];
    if (relicOut && (economyState.arenaRelics || []).includes(relicOut.id)) {
        showToast(`Você já tem a ${relicOut.name} ${relicOut.emoji} — essa forja não dá nada novo.`, 'info');
        return;
    }
    const inv = { ...economyState.inv };
    for (const id of craftGrid) {
        if (!id) continue;
        inv[id] = (inv[id] || 0) - 1;
        if (inv[id] <= 0) delete inv[id];
    }
    const artifact = ECO.ARTIFACT_BY_ID?.[match.out];
    craftGrid = Array(9).fill(null);
    craftSelected = null;
    if (relicOut) {
        const arenaRelics = [...(economyState.arenaRelics || []), relicOut.id];
        addLedger('craft', `Relíquia forjada: ${relicOut.name}`, 0);
        await saveEconomy({ inv, arenaRelics });
        renderArenaRelicShop();
        if (arenaCardTreeOpenId) renderCardTreeModal();
        vibrate([12, 60, 12, 60, 18]);
        showToast(`⚒️ ${relicOut.emoji} ${relicOut.name} forjada na bancada! Equipe na Árvore da carta.`, 'success', 4500);
        return;
    }
    if (artifact) {
        const artifacts = { ...(economyState.artifacts || {}) };
        artifacts[artifact.id] = (artifacts[artifact.id] || 0) + 1;
        addLedger('craft', `Artefato ativado: ${artifact.name} (+${artifact.passive} gold/min)`, 0);
        await saveEconomy({ inv, artifacts });
        vibrate([12, 60, 12, 60, 18]);
        showToast(`🧿 ${artifact.emoji} ${artifact.name} ativado! +${artifact.passive} gold/min para sempre`, 'success', 4500);
        return;
    }
    inv[match.out] = (inv[match.out] || 0) + match.qty;
    addLedger('craft', `Craft: ${outputInfo(match.out)?.name || match.out} ×${match.qty}`, 0);
    await saveEconomy({ inv });
    vibrate([12, 40, 12, 40, 18]);
    const out = outputInfo(match.out);
    showToast(`⚒️ ${out?.emoji || ''} ${out?.name || match.out} ×${match.qty} craftado!`, 'success');
}

/* Drag & drop por pointer events (funciona no celular) + fallback de toque */
let craftDrag = null;       // { id, startX, startY, ghost, moved }
function craftPointerDown(e) {
    const item = e.target.closest?.('[data-craft-mat]');
    if (!item) return;
    const id = item.dataset.craftMat;
    craftDrag = { id, startX: e.clientX, startY: e.clientY, ghost: null, moved: false };
    const move = (ev) => {
        if (!craftDrag) return;
        const dx = ev.clientX - craftDrag.startX, dy = ev.clientY - craftDrag.startY;
        if (!craftDrag.moved && Math.hypot(dx, dy) > 9) {
            craftDrag.moved = true;
            const ghost = document.createElement('div');
            ghost.className = 'craft-ghost';
            ghost.textContent = ECO?.MATERIAL_BY_ID?.[id]?.emoji || '📦';
            document.body.appendChild(ghost);
            craftDrag.ghost = ghost;
        }
        if (craftDrag.ghost) {
            craftDrag.ghost.style.left = `${ev.clientX}px`;
            craftDrag.ghost.style.top = `${ev.clientY}px`;
            const under = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('[data-craft-cell]');
            document.querySelectorAll('.craft-cell.drop-target').forEach((c) => c.classList.toggle('drop-target', c === under));
        }
    };
    const up = (ev) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (!craftDrag) return;
        const wasDrag = craftDrag.moved;
        craftDrag.ghost?.remove();
        document.querySelectorAll('.craft-cell.drop-target').forEach((c) => c.classList.remove('drop-target'));
        const id = craftDrag.id;
        craftDrag = null;
        if (!wasDrag) {
            // Toque simples: alterna a seleção para tap-to-place
            craftSelected = craftSelected === id ? null : id;
            renderCraftArea();
            return;
        }
        const cellEl = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('[data-craft-cell]');
        if (cellEl) placeCraftMaterial(id, Number(cellEl.dataset.craftCell));
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
}

function craftCellClick(e) {
    const cell = e.target.closest?.('[data-craft-cell]');
    if (!cell) return;
    const i = Number(cell.dataset.craftCell);
    if (craftSelected) { placeCraftMaterial(craftSelected, i); return; }
    if (craftGrid[i]) { craftGrid[i] = null; renderCraftArea(); }
}

function renderConstruction() {
    const list = $('#construction-list');
    if (!list || !economyState || !ECO) return;
    const income = $('#construction-income');
    if (income) income.textContent = `${incomeRate()} gold/min · acumulado: ${fmtGold(pendingGain())}`;
    const collectBtn = $('#collect-btn');
    if (collectBtn) collectBtn.disabled = pendingGain() <= 0;
    list.innerHTML = ECO.BUILDINGS.map((b) => {
        const owned = economyState.buildings[b.id] || 0;
        const costChips = Object.entries(b.costMats).map(([id, qty]) => {
            const m = ECO.MATERIAL_BY_ID[id];
            const have = matQty(id);
            const ok = have >= qty;
            return `<span class="mat-chip ${ok ? 'mat-ok' : 'mat-missing'}">${m?.emoji || ''} ${have}/${qty}</span>`;
        }).join('');
        const canBuild = economyState.gold >= b.costGold && Object.entries(b.costMats).every(([id, qty]) => matQty(id) >= qty);
        return `<div class="building-card"><span class="building-emoji">${b.emoji}</span><span class="building-info"><span class="building-name">${escapeHtml(b.name)}${owned ? ` <span class="building-owned">×${owned}</span>` : ''}</span><span class="building-desc">${escapeHtml(b.desc)}</span><span class="building-cost"><span class="mat-chip ${economyState.gold >= b.costGold ? 'mat-ok' : 'mat-missing'}">🪙 ${b.costGold.toLocaleString('pt-BR')}</span>${costChips}</span></span><button class="building-build" data-build="${b.id}" ${canBuild ? '' : 'disabled'}>Construir</button></div>`;
    }).join('');

    // Artefatos 🧿 — renda pequena e para sempre, conquistados por descoberta
    const artifactList = $('#artifact-list');
    if (artifactList) {
        const arts = economyState.artifacts || {};
        artifactList.innerHTML = ECO.ARTIFACTS.map((a) => {
            const owned = arts[a.id] || 0;
            if (!owned) {
                return `<div class="artifact-card locked"><span class="artifact-emoji">🕳️</span><span class="artifact-info"><span class="artifact-name">??? </span><span class="artifact-hint">${escapeHtml(a.hint)}</span></span><span class="artifact-passive">+${a.passive}/min</span></div>`;
            }
            return `<div class="artifact-card">${owned > 1 ? `<span class="artifact-owned">×${owned}</span>` : ''}<span class="artifact-emoji">${a.emoji}</span><span class="artifact-info"><span class="artifact-name">${escapeHtml(a.name)}</span><span class="artifact-hint">${escapeHtml(a.desc)}</span></span><span class="artifact-passive">+${a.passive * owned}/min</span></div>`;
        }).join('');
    }
}

function formatCountdown(ms) {
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m > 0 ? `⏳ ${m}:${String(s).padStart(2, '0')}` : `⏳ 0:${String(s).padStart(2, '0')}`;
}

function renderWork() {
    const jobList = $('#job-list');
    if (jobList && economyState && ECO) {
        const now = Date.now();
        jobList.innerHTML = ECO.JOBS.map((j) => {
            const readyAt = Number(economyState.jobCd[j.id] || 0);
            const remaining = Math.max(0, readyAt - now);
            const bonusTxt = j.bonus ? ` · bônus: ${ECO.MATERIAL_BY_ID[j.bonus.id]?.emoji || ''} ${ECO.MATERIAL_BY_ID[j.bonus.id]?.name || ''} ${Math.round(j.bonus.chance * 100)}%` : '';
            return `<div class="job-card"><span class="job-emoji">${j.emoji}</span><span class="job-info"><span class="job-name">${escapeHtml(j.name)}</span><span class="job-pay">🪙 ${j.goldMin}–${j.goldMax}${bonusTxt}</span><span class="job-desc">${escapeHtml(j.desc)} · recarrega em ${j.cdMinutes}min</span></span><button class="job-btn" data-job="${j.id}" ${remaining > 0 ? 'disabled' : ''}>${remaining > 0 ? formatCountdown(remaining) : 'Trabalhar 💪'}</button></div>`;
        }).join('');
    }
    const stamina = regenStamina();
    const countEl = $('#stamina-count'); if (countEl) countEl.textContent = String(Math.floor(stamina));
    const fillEl = $('#stamina-fill'); if (fillEl) fillEl.style.width = `${(stamina / STAMINA_MAX) * 100}%`;
    const gatherList = $('#gather-list');
    if (gatherList && economyState && ECO) {
        const now = Date.now();
        gatherList.innerHTML = ECO.GATHER_LOCATIONS.map((loc) => {
            const readyAt = Number(economyState.gatherCd[loc.id] || 0);
            const remaining = Math.max(0, readyAt - now);
            const cdMin = Math.round((loc.cdSeconds || 120) / 60);
            const dropsTxt = loc.drops.slice(0, 4).map(([id]) => ECO.MATERIAL_BY_ID[id]?.emoji || '').join(' ') + '…';
            const power = Number(loc.power) || 1;
            const difficulty = power >= 0.95 ? '🟢 fácil' : power >= 0.8 ? '🟡 médio' : '🔴 difícil';
            const noStamina = stamina < GATHER_STAMINA_COST;
            const disabled = remaining > 0 || noStamina;
            const label = remaining > 0 ? formatCountdown(remaining) : (noStamina ? '⚡ sem energia' : 'Coletar ⛏️');
            return `<div class="gather-card"><span class="gather-emoji">${loc.emoji}</span><span class="gather-info"><span class="gather-name">${escapeHtml(loc.name)}</span><span class="gather-desc">${dropsTxt} ${cdMin}min de descanso</span><span class="gather-meta">⚡ ${GATHER_STAMINA_COST} por visita · dificuldade ${difficulty}</span></span><button class="gather-btn" data-gather="${loc.id}" ${disabled ? 'disabled' : ''}>${label}</button></div>`;
        }).join('');
    }
}

function renderProfileCosmetics() {
    const capaSlot = equippedCosmetic('capa');
    const fundo = equippedCosmetic('fundo');
    // Capa do perfil (cosmético de capa, ou o fundo como reserva)
    const cover = $('#profile-cover');
    if (cover) {
        const capa = capaSlot || fundo || null;
        if (capa) {
            cover.hidden = false;
            cover.style.background = `linear-gradient(120deg, ${capa.c1}, ${capa.c2})`;
            cover.innerHTML = `<span class="profile-cover-emoji">${capa.emoji}</span><span class="profile-cover-theme">${escapeHtml(capa.themeName || '')} · ${escapeHtml(capa.rarityName || '')}</span>`;
        } else {
            cover.hidden = true;
            cover.removeAttribute('style');
            cover.innerHTML = '';
        }
    }
    // Fundo do tema tinge o card do perfil
    const pCard = document.querySelector('#app-profile .profile-card');
    if (pCard) {
        if (fundo) {
            pCard.classList.add('profile-fundo');
            pCard.style.setProperty('--f1', fundo.c1);
            pCard.style.setProperty('--f2', fundo.c2);
        } else {
            pCard.classList.remove('profile-fundo');
            pCard.style.removeProperty('--f1');
            pCard.style.removeProperty('--f2');
        }
    }
    // Moldura/Aura no próprio avatar do perfil (mesmo wrapper do feed)
    applyAvatarCosmetics($('#my-avatar-display'));
}

function refreshEconomyUI() {
    if (!economyState || !ECO) return;
    renderEcoBalances();
    renderProfileCosmetics();
    renderCosmeticShop();
    renderCardCosmeticShop();
    renderInventory();
    renderCraftArea();
    renderConstruction();
    renderWork();
}

function startEconomyTicker() {
    stopEconomyTicker();
    economyTicker = setInterval(() => {
        if (!currentUser || !economyState) return;
        renderEcoBalances();
        const income = $('#construction-income');
        if (income) income.textContent = `${incomeRate()} gold/min · acumulado: ${fmtGold(pendingGain())}`;
        const collectBtn = $('#collect-btn');
        if (collectBtn) collectBtn.disabled = pendingGain() <= 0;
        renderWork();
    }, 1000);
}
function stopEconomyTicker() { if (economyTicker) { clearInterval(economyTicker); economyTicker = null; } }

/* ---------- AÇÕES ---------- */
async function buyCosmetic(id) {
    const c = ECO.COSMETIC_BY_ID[id];
    if (!c || !economyState) return;
    if (economyState.cosmetics.includes(id)) { showToast('Você já tem esse cosmético ✨', 'info'); return; }
    if (economyState.gold < c.price) { showToast(`Falta gold! São ${fmtGold(c.price)} 🪙`, 'warn'); return; }
    addLedger('compra', `Cosmético: ${c.name}`, -c.price);
    await saveEconomy({ gold: economyState.gold - c.price, cosmetics: [...economyState.cosmetics, id] });
    vibrate([12, 40, 12]);
    showToast(`${c.emoji} ${c.name} virou seu! ✨`, 'success', 3500);
}
async function equipCosmetic(id) {
    if (!economyState || !ECO) return;
    const c = ECO.COSMETIC_BY_ID[id];
    if (!c || !economyState.cosmetics.includes(id)) return;
    const map = { ...equippedMapIds() };
    if (map[c.cat] === id) delete map[c.cat];
    else map[c.cat] = id;
    economyState = { ...economyState, equippedMap: map };
    await saveEconomy({ equippedCosmetics: map });
    const catMeta = ECO.COSMETIC_CATEGORIES.find((k) => k.id === c.cat);
    const slot = catMeta?.word?.toLowerCase() || c.cat;
    showToast(map[c.cat] ? `${c.emoji} Equipado em “${slot}”! Vai aparecer no feed ⭐` : `Cosmético guardado de volta.`, 'info');
}
async function buildStructure(id) {
    const b = ECO.BUILDINGS.find((x) => x.id === id);
    if (!b || !economyState) return;
    if (economyState.gold < b.costGold) { showToast('Gold insuficiente 🪙', 'warn'); return; }
    const ok = Object.entries(b.costMats).every(([mid, qty]) => matQty(mid) >= qty);
    if (!ok) { showToast('Faltam materiais para construir 👀', 'warn'); return; }
    const inv = { ...economyState.inv };
    for (const [mid, qty] of Object.entries(b.costMats)) {
        inv[mid] = (inv[mid] || 0) - qty;
        if (inv[mid] <= 0) delete inv[mid];
    }
    const buildings = { ...economyState.buildings, [id]: (economyState.buildings[id] || 0) + 1 };
    addLedger('obra', `Construção: ${b.name}`, -b.costGold);
    await saveEconomy({ gold: economyState.gold - b.costGold, inv, buildings });
    vibrate([12, 40, 12, 40, 12]);
    showToast(`🏗️ ${b.name} construída! +${b.rate} gold/min`, 'success', 4000);
}
async function collectIncome() {
    if (!economyState) return;
    const gross = pendingGain();
    if (gross <= 0) { showToast('Nada para coletar ainda — deixa a renda trabalhar 🏦', 'info'); return; }
    const gain = await collectGain(gross, 'Renda das construções');
    addLedger('renda', 'Renda das construções', gain);
    await saveEconomy({ gold: economyState.gold + gain, lastCollectAt: Date.now() });
    vibrate([10, 30, 10]);
    showToast(`🏦 +${fmtGold(gain)} de renda!`, 'success', 3500);
}
async function doJob(id) {
    const job = ECO.JOBS.find((j) => j.id === id);
    if (!job || !economyState) return;
    if ((economyState.jobCd[id] || 0) > Date.now()) return;
    const payGross = Math.floor(job.goldMin + Math.random() * (job.goldMax - job.goldMin + 1));
    const pay = await collectGain(payGross, job.name);
    addLedger('trabalho', `Trabalho: ${job.name}`, pay);
    const jobCd = { ...economyState.jobCd, [id]: Date.now() + job.cdMinutes * 60000 };
    const patch = { gold: economyState.gold + pay, jobCd };
    let bonusTxt = '';
    if (job.bonus && Math.random() < job.bonus.chance) {
        const inv = { ...economyState.inv };
        inv[job.bonus.id] = (inv[job.bonus.id] || 0) + job.bonus.qty;
        patch.inv = inv;
        bonusTxt = ` + ${ECO.MATERIAL_BY_ID[job.bonus.id]?.emoji || ''}×${job.bonus.qty}`;
    }
    await saveEconomy(patch);
    vibrate([10, 30, 10]);
    showToast(`💼 ${job.name}: +${fmtGold(pay)}${bonusTxt}`, 'success', 3500);
}
/* ============ MINIGAME DE COLETA ⛏️ (toque rápido / força de braço) ============ */
const MASH_DURATION_MS = 5000;
const MASH_TIERS = [55, 35, 18];   // 3, 2, 1 materiais (antes do power do local)
const mashGame = { loc: null, taps: 0, started: false, endsAt: 0, raf: 0, over: false };

const gatherWeightRoll = (loc) => {
    const totalWeight = loc.drops.reduce((sum, d) => sum + d[1], 0);
    let roll = Math.random() * totalWeight;
    for (const [mid, weight] of loc.drops) { roll -= weight; if (roll <= 0) return mid; }
    return loc.drops[0][0];
};
const mashEffective = () => mashGame.taps * (Number(mashGame.loc?.power) || 1);

function mashRender() {
    const eff = mashEffective();
    const tapsEl = $('#mash-taps'); if (tapsEl) tapsEl.textContent = String(mashGame.taps);
    const fill = $('#mash-fill'); if (fill) fill.style.width = `${Math.min(100, (eff / MASH_TIERS[0]) * 100)}%`;
}

function mashTick() {
    if (!mashGame.loc || mashGame.over) return;
    const left = Math.max(0, mashGame.endsAt - Date.now());
    const timer = $('#mash-timer'); if (timer) timer.textContent = `${(left / 1000).toFixed(1)}s`;
    if (left <= 0) { void finishMashGame(); return; }
    mashGame.raf = requestAnimationFrame(mashTick);
}

function startGatherGame(id) {
    const loc = ECO?.GATHER_LOCATIONS.find((l) => l.id === id);
    if (!loc || !economyState) return;
    const readyAt = Number(economyState.gatherCd[id] || 0);
    if (readyAt > Date.now()) { showToast('Esse local ainda está descansando 😌', 'info'); return; }
    const stamina = regenStamina();
    if (stamina < GATHER_STAMINA_COST) { showToast(`Energia insuficiente ⚡ — recarrega com o tempo (faltam ~${Math.ceil((GATHER_STAMINA_COST - stamina) * STAMINA_REGEN_MS / 60000)}min)`, 'warn'); return; }
    mashGame.loc = loc;
    mashGame.taps = 0;
    mashGame.started = false;
    mashGame.over = false;
    cancelAnimationFrame(mashGame.raf);
    const setText = (sel, txt) => { const el = $(sel); if (el) el.textContent = txt; };
    setText('#gather-game-emoji', loc.emoji);
    setText('#gather-game-title', loc.name);
    setText('#gather-game-sub', `Toque no botão o MÁXIMO que puder em ${MASH_DURATION_MS / 1000} segundos!`);
    setText('#mash-btn-emoji', loc.emoji);
    setText('#mash-timer', `${(MASH_DURATION_MS / 1000).toFixed(1)}s`);
    setText('#mash-taps', '0');
    const fill = $('#mash-fill'); if (fill) fill.style.width = '0%';
    const feedback = $('#gather-feedback'); if (feedback) { feedback.textContent = 'Toque para começar! 💪'; feedback.className = 'gather-feedback'; }
    const mashBtn = $('#mash-btn'); if (mashBtn) { mashBtn.hidden = false; mashBtn.disabled = false; }
    $('#gather-done-btn').hidden = true;
    openModal('gather-game-modal');
}

function mashTap() {
    if (!mashGame.loc || mashGame.over) return;
    if (!mashGame.started) {
        mashGame.started = true;
        mashGame.endsAt = Date.now() + MASH_DURATION_MS;
        const feedback = $('#gather-feedback'); if (feedback) { feedback.textContent = ''; feedback.className = 'gather-feedback'; }
        cancelAnimationFrame(mashGame.raf);
        mashGame.raf = requestAnimationFrame(mashTick);
    }
    mashGame.taps += 1;
    vibrate(4);
    mashRender();
}

async function finishMashGame() {
    if (mashGame.over) return;
    mashGame.over = true;
    cancelAnimationFrame(mashGame.raf);
    const loc = mashGame.loc;
    if (!loc || !economyState) return;
    const eff = mashEffective();
    const rolls = eff >= MASH_TIERS[0] ? 3 : eff >= MASH_TIERS[1] ? 2 : eff >= MASH_TIERS[2] ? 1 : 0;
    const picks = {};
    for (let i = 0; i < rolls; i++) {
        const mid = gatherWeightRoll(loc);
        picks[mid] = (picks[mid] || 0) + 1;
    }
    const inv = { ...economyState.inv };
    const summary = Object.entries(picks).map(([mid, qty]) => {
        inv[mid] = (inv[mid] || 0) + qty;
        const m = ECO.MATERIAL_BY_ID[mid];
        return `${m?.emoji || ''}${qty} ${m?.name || mid}`;
    }).join('  ');
    const staminaNow = regenStamina();
    const gatherCd = { ...economyState.gatherCd, [loc.id]: Date.now() + (loc.cdSeconds || 120) * 1000 };
    await saveEconomy({ inv, gatherCd, stamina: Math.max(0, staminaNow - GATHER_STAMINA_COST), staminaAt: Date.now() });
    const timer = $('#mash-timer'); if (timer) timer.textContent = '0.0s';
    const feedback = $('#gather-feedback');
    $('#gather-game-sub').textContent = summary ? `Você coletou: ${summary}` : 'Dessa vez não veio nada. Da próxima sai! 😤';
    if (feedback) { feedback.textContent = summary ? `Coleta concluída com ${mashGame.taps} toques! 🎒` : `Só ${mashGame.taps} toques… o braço tremeu? 🍃`; feedback.className = `gather-feedback ${summary ? 'good' : 'miss'}`; }
    const mashBtn = $('#mash-btn'); if (mashBtn) mashBtn.hidden = true;
    $('#gather-done-btn').hidden = false;
}

function closeGatherGame(cancelled) {
    cancelAnimationFrame(mashGame.raf);
    if (cancelled && mashGame.loc && !mashGame.over) showToast('Coleta cancelada — energia intacta ⚡', 'info');
    mashGame.loc = null;
    mashGame.over = false;
    closeModal('gather-game-modal');
    renderWork();
}

/* ---------- PRESENTES 🎁 ---------- */
function openGiftModal() {
    if (!currentUser) return;
    populateGiftMaterialOptions();
    const goldInput = $('#gift-gold-amount'); if (goldInput) goldInput.value = '';
    const qtyInput = $('#gift-material-qty'); if (qtyInput) qtyInput.value = '1';
    const search = $('#gift-search'); if (search) search.value = '';
    const results = $('#gift-results'); if (results) results.innerHTML = '<p class="muted">Digite o nome da pessoa…</p>';
    openModal('gift-modal');
}
function populateGiftMaterialOptions() {
    const select = $('#gift-material-select');
    if (!select || !ECO) return;
    const owned = ECO.ALL_MATERIALS.filter((m) => matQty(m.id) > 0);
    select.innerHTML = owned.length
        ? owned.map((m) => `<option value="${m.id}">${m.emoji} ${escapeHtml(m.name)} (×${matQty(m.id)})</option>`).join('')
        : '<option value="">Baú vazio — nada para presentear</option>';
}
async function searchGiftRecipients(term) {
    const box = $('#gift-results');
    if (!box) return;
    const q = term.trim().toLowerCase();
    if (q.length < 2) { box.innerHTML = '<p class="muted">Digite ao menos 2 letras…</p>'; return; }
    box.innerHTML = '<p class="muted">Buscando…</p>';
    try {
        const snap = await getDocs(collection(db, 'users'));
        const matches = [];
        snap.forEach((d) => {
            const data = d.data() || {};
            const name = String(data.name || '');
            if (d.id !== currentUser.uid && name.toLowerCase().includes(q)) matches.push({ uid: d.id, name });
        });
        box.innerHTML = matches.slice(0, 8).map((p) => `<div class="gift-person"><span class="gift-person-name">${escapeHtml(p.name)}</span><button class="chip-btn accent" data-send-gift="${escapeHtml(p.uid)}" data-name="${escapeHtml(p.name)}">Enviar 🎁</button></div>`).join('') || '<p class="muted">Ninguém com esse nome 🙈</p>';
    } catch (err) {
        box.innerHTML = `<p class="muted">Erro na busca: ${escapeHtml(firestorePermissionMsg(err))}</p>`;
    }
}
async function sendGift(toUid, toName) {
    if (!currentUser || !economyState) return;
    const mode = giftState.mode;
    try {
        await runTransaction(db, async (tx) => {
            const ref = ecoUserRef();
            const snap = await tx.get(ref);
            const d = snap.data() || {};
            const base = { from: currentUser.uid, fromName: currentUserProfile.name || 'Alguém', to: toUid, status: 'pending', createdAt: serverTimestamp() };
            if (mode === 'gold') {
                const amount = Math.floor(Number($('#gift-gold-amount')?.value || 0));
                if (!Number.isFinite(amount) || amount < 1) throw new Error('Informe uma quantidade de gold válida.');
                const gold = typeof d.gold === 'number' ? d.gold : 0;
                if (gold < amount) throw new Error(`Você só tem ${fmtGold(gold)} 🪙`);
                tx.set(ref, { gold: gold - amount }, { merge: true });
                tx.set(doc(collection(db, 'gifts')), { ...base, gold: amount });
            } else {
                const sel = $('#gift-material-select');
                const materialId = sel?.value || '';
                const qty = Math.floor(Number($('#gift-material-qty')?.value || 0));
                const have = d.inv && typeof d.inv === 'object' ? (d.inv[materialId] || 0) : 0;
                if (!materialId) throw new Error('Escolha um material (ou seu baú está vazio).');
                if (!Number.isFinite(qty) || qty < 1) throw new Error('Quantidade inválida.');
                if (have < qty) throw new Error(`Você só tem ${have}× esse material.`);
                const inv = { ...(d.inv || {}) };
                inv[materialId] = have - qty;
                if (inv[materialId] <= 0) delete inv[materialId];
                tx.set(ref, { inv }, { merge: true });
                tx.set(doc(collection(db, 'gifts')), { ...base, materialId, materialQty: qty });
            }
        });
        const fresh = await getDoc(ecoUserRef());
        economyState = normalizeEconomy(fresh.data() || {});
        if (giftState.mode === 'gold') {
            const amount = Math.floor(Number($('#gift-gold-amount')?.value || 0));
            addLedger('transferencia', `Transferência para ${toName}`, -amount);
        } else {
            addLedger('presente', `Presente de material para ${toName}`, 0);
        }
        refreshEconomyUI();
        closeModal('gift-modal');
        vibrate([12, 40, 12]);
        showToast(`🎁 Presente enviado para ${toName}!`, 'success', 4000);
    } catch (err) {
        showToast(err?.message || 'Não consegui enviar o presente.', 'error', 4500);
    }
}

/* Resgata presentes pendentes (chamado no login) */
async function claimGifts() {
    if (!currentUser) return;
    try {
        const q = query(collection(db, 'gifts'), where('to', '==', currentUser.uid), where('status', '==', 'pending'), limit(20));
        const snap = await getDocs(q);
        if (snap.empty) return;
        const received = [];
        for (const giftSnap of snap.docs) {
            try {
                await runTransaction(db, async (tx) => {
                    const gSnap = await tx.get(giftSnap.ref);
                    const g = gSnap.data();
                    if (!g || g.status !== 'pending') return;
                    const ref = ecoUserRef();
                    const u = (await tx.get(ref)).data() || {};
                    const patch = {};
                    const gold = Number(g.gold || 0);
                    if (gold > 0) {
                        patch.gold = (typeof u.gold === 'number' ? u.gold : 0) + gold;
                        received.push(g.type === 'job'
                            ? `💼 ${fmtGold(gold)} de freela — ${g.fromName || 'alguém'}`
                            : g.type === 'market'
                                ? `🤝 ${fmtGold(gold)} de venda no Mercado — ${g.fromName || 'alguém'}`
                                : `🪙 ${fmtGold(gold)} de ${g.fromName || 'alguém'}`);
                        addLedger(g.type === 'job' ? 'freela' : g.type === 'market' ? 'mercado' : 'presente',
                            g.type === 'job' ? `Freela pago por ${g.fromName || 'alguém'}`
                                : g.type === 'market' ? `Venda no Mercado para ${g.fromName || 'alguém'}`
                                    : `Presente de ${g.fromName || 'alguém'}`, gold);
                    } else if (g.materialId) {
                        const inv = { ...(u.inv || {}) };
                        const qty = Number(g.materialQty || 1);
                        inv[g.materialId] = (inv[g.materialId] || 0) + qty;
                        patch.inv = inv;
                        const m = ECO.MATERIAL_BY_ID[g.materialId];
                        received.push(`${m?.emoji || ''} ${qty}× ${m?.name || g.materialId} de ${g.fromName || 'alguém'}`);
                    }
                    tx.set(ref, patch, { merge: true });
                    tx.set(giftSnap.ref, { status: 'claimed', claimedAt: serverTimestamp() }, { merge: true });
                });
            } catch (err) {
                console.warn('Não consegui resgatar um presente:', err?.message);
            }
        }
        if (received.length) {
            const fresh = await getDoc(ecoUserRef());
            economyState = normalizeEconomy(fresh.data() || {});
            refreshEconomyUI();
            showToast(`🎁 Presente${received.length > 1 ? 's' : ''} recebido${received.length > 1 ? 's' : ''}: ${received.join(' · ')}`, 'success', 6000);
            vibrate([10, 40, 10, 40, 10]);
        }
    } catch (err) {
        console.warn('Presentes indisponíveis (regras do Firestore?):', err?.message);
    }
}

/* ---------- wiring dos botões ---------- */
document.addEventListener('click', async (e) => {
    const t = e.target;

    const shopTab = t.closest?.('[data-shop-tab]');
    if (shopTab) {
        document.querySelectorAll('[data-shop-tab]').forEach((b) => b.classList.toggle('active', b === shopTab));
        const target = shopTab.dataset.shopTab;
        ['cosmeticos', 'cartas', 'itens'].forEach((name) => { const pane = document.getElementById(`shop-pane-${name}`); if (pane) pane.hidden = name !== target; });
        return;
    }
    const workTab = t.closest?.('[data-work-tab]');
    if (workTab) {
        document.querySelectorAll('[data-work-tab]').forEach((b) => b.classList.toggle('active', b === workTab));
        ['board', 'gather'].forEach((name) => { const pane = document.getElementById(`work-pane-${name}`); if (pane) pane.hidden = name !== workTab.dataset.workTab; });
        return;
    }
    const giftTab = t.closest?.('[data-gift-tab]');
    if (giftTab) {
        giftState.mode = giftTab.dataset.giftTab;
        document.querySelectorAll('[data-gift-tab]').forEach((b) => b.classList.toggle('active', b === giftTab));
        const gp = $('#gift-pane-gold'), mp = $('#gift-pane-material');
        if (gp) gp.hidden = giftState.mode !== 'gold';
        if (mp) mp.hidden = giftState.mode !== 'material';
        return;
    }
    const giftQuick = t.closest?.('[data-gift-quick]');
    if (giftQuick) { const input = $('#gift-gold-amount'); if (input) input.value = giftQuick.dataset.giftQuick; return; }
    const sendGiftBtn = t.closest?.('[data-send-gift]');
    if (sendGiftBtn) { await sendGift(sendGiftBtn.dataset.sendGift, sendGiftBtn.dataset.name || 'amigo(a)'); return; }

    const buyCosmeticBtn = t.closest?.('[data-buy-cosmetic]');
    if (buyCosmeticBtn) { await buyCosmetic(buyCosmeticBtn.dataset.buyCosmetic); return; }
    const equipBtn = t.closest?.('[data-equip-cosmetic]');
    if (equipBtn) { await equipCosmetic(equipBtn.dataset.equipCosmetic); return; }
    const build = t.closest?.('[data-build]');
    if (build) { await buildStructure(build.dataset.build); return; }
    const job = t.closest?.('[data-job]');
    if (job) { await doJob(job.dataset.job); return; }
    const gather = t.closest?.('[data-gather]');
    if (gather) { startGatherGame(gather.dataset.gather); return; }
});

$('#shop-load-more')?.addEventListener('click', () => { shopPage += 1; renderCosmeticShop(); });
$('#shop-search')?.addEventListener('input', debounce(() => { shopPage = 1; renderCosmeticShop(); }, 200));
$('#shop-cat')?.addEventListener('change', () => { shopPage = 1; renderCosmeticShop(); });
$('#shop-rarity')?.addEventListener('change', () => { shopPage = 1; renderCosmeticShop(); });
$('#collect-btn')?.addEventListener('click', collectIncome);
$('#gift-open-btn')?.addEventListener('click', openGiftModal);
$('#gift-search')?.addEventListener('input', debounce((e) => searchGiftRecipients(e.target.value), 350));

/* Popula os filtros de categoria/raridade da Loja uma única vez */
(() => {
    const catSel = $('#shop-cat');
    if (catSel && ECO?.COSMETIC_CATEGORIES) {
        catSel.innerHTML = '<option value="">Todas as categorias</option>' + ECO.COSMETIC_CATEGORIES.map((c) => `<option value="${c.id}">${c.emoji} ${escapeHtml(c.word)}s</option>`).join('');
    }
    const rarSel = $('#shop-rarity');
    if (rarSel && ECO?.RARITIES) {
        rarSel.innerHTML = '<option value="">Todas as raridades</option>' + ECO.RARITIES.map((r) => `<option value="${r.id}">${r.gem} ${escapeHtml(r.name)}</option>`).join('');
    }
})();

/* ================= BANCO DO REFÚGIO 🏦 + QUADRO DE FREELAS 📜 + LEDGER ================= */
/* Posse do gold: cada movimento vira entrada no extrato (users/{uid}/ledger)
   e é guardado pelo Banco do Refúgio, que também empresta e pune devedores.
   ⚠️ Sem servidor, o Firestore não deixa um cliente escrever no documento de
   outro — por isso presentes/freelas/transferências são resgatados quando a
   pessoa abre o app (coleção `gifts`). Trapaça pelo Console continua possível. */

let activeLoan = null;        // empréstimo ativo do usuário (cache)
let boardFilter = 'open';     // 'open' | 'mine' | 'all'
let boardDocs = [];           // última carga do quadro

/* ---------- Extrato (ledger) ---------- */
async function addLedger(type, label, delta) {
    if (!currentUser) return;
    try {
        await addDoc(collection(db, `users/${currentUser.uid}/ledger`), {
            type, label: String(label || '').slice(0, 120), delta: Math.round(delta || 0), at: serverTimestamp()
        });
    } catch (err) {
        console.warn('Extrato indisponível:', err?.message);
    }
}

/* ---------- Empréstimo: matemática única e transparente ---------- */
const LOAN_INTEREST = 0.06;          // 6% na liberação
const LOAN_LATE_DAILY = 0.08;        // 8% ao dia de mora
const LOAN_OVERDUE_SURCHARGE = 1.5;  // +50% após 30 dias
const LOAN_DUE_DAYS = 7;
const LOAN_SHAME_DAYS = 14;          // Caderneta dos Devedores a partir de 14 dias
const GARNISH_PCT = 0.7;             // penhora de 70% dos ganhos até quitar
const GARNISH_TOTAL_DAYS = 60;       // 60+ dias: penhora de 100%
const creditLimitFor = (score) => Math.floor((Math.max(0, Math.min(100, score ?? 50)) / 100) * 3000);
const scoreLabel = (s) => s >= 80 ? '🟢 Excelente pagador' : s >= 55 ? '🔵 Em dia com a vida' : s >= 30 ? '🟡 Atenção: pendências' : '🔴 Nome sujo no banco';

function loanTerms(loan) {
    const base = Math.max(0, (loan?.totalDue || 0) - (loan?.repaid || 0));
    const lateDays = loan?.dueAt && Date.now() > loan.dueAt ? Math.min(90, Math.floor((Date.now() - loan.dueAt) / 86400000)) : 0;
    let mult = 1 + LOAN_LATE_DAILY * lateDays;
    if (lateDays >= 30) mult *= LOAN_OVERDUE_SURCHARGE;
    return { base, lateDays, debt: Math.ceil(base * mult) };
}

async function getActiveLoan() {
    const q = query(collection(db, 'loans'), where('userId', '==', currentUser.uid), where('status', '==', 'active'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
}

/* Penhora sobre qualquer ganho (trabalho, renda, freelas…). 70% normal; 100% após 60 dias de atraso */
async function collectGain(goldDelta, sourceLabel) {
    if (!currentUser || !economyState || goldDelta <= 0) return goldDelta;
    try {
        if (!activeLoan) activeLoan = await getActiveLoan();
        if (activeLoan && Date.now() > (activeLoan.dueAt || 0)) {
            const pct = loanTerms(activeLoan).lateDays >= GARNISH_TOTAL_DAYS ? 1 : GARNISH_PCT;
            const garnish = Math.floor(goldDelta * pct);
            if (garnish > 0) {
                const lref = doc(db, 'loans', activeLoan.id);
                await runTransaction(db, async (tx) => {
                    const lsnap = await tx.get(lref);
                    const l = lsnap.data();
                    if (!l || l.status !== 'active') return;
                    tx.set(lref, { repaid: (l.repaid || 0) + garnish }, { merge: true });
                });
                activeLoan = { ...activeLoan, repaid: (activeLoan.repaid || 0) + garnish };
                addLedger('penhora', `Penhora — ${sourceLabel}`, -garnish);
                showToast(`🏦 Penhora: ${Math.round(pct * 100)}% (${fmtGold(garnish)}) foi para o banco do refúgio`, 'warn', 5000);
                return goldDelta - garnish;
            }
        }
    } catch (err) {
        console.warn('Penhora indisponível (regras do Firestore?):', err?.message);
    }
    return goldDelta;
}

/* ---------- BANCO: render + ações ---------- */
function renderBankLoanCard() {
    const active = $('#bank-loan-active');
    const form = $('#bank-loan-form');
    if (!active || !form) return;
    const score = economyState?.creditScore ?? 50;
    const limitEl = $('#bank-credit-limit');
    if (limitEl) limitEl.textContent = fmtGold(creditLimitFor(score));
    if (activeLoan) {
        const { debt, lateDays } = loanTerms(activeLoan);
        const due = new Date(activeLoan.dueAt);
        active.hidden = false;
        form.hidden = true;
        active.innerHTML = `<div class="bank-loan-active-row"><span>💰 Pegou</span><strong>${fmtGold(activeLoan.principal)}</strong></div>
            <div class="bank-loan-active-row"><span>🧾 Dívida agora</span><strong>${fmtGold(debt)}</strong></div>
            <div class="bank-loan-active-row"><span>📅 Venceu</span><strong>${due.toLocaleDateString('pt-BR')}${lateDays ? ` · ${lateDays} dia(s) de atraso · +8%/dia${lateDays >= 30 ? ' · +50% surcharge' : ''}` : ''}</strong></div>
            <div class="bank-loan-active-row"><span>⚠️ Punição</span><strong>${lateDays > 0 ? (lateDays >= GARNISH_TOTAL_DAYS ? 'Penhora TOTAL (100%) dos seus ganhos' : 'Penhora de 70% dos seus ganhos') : 'Ainda não há mora — pague no prazo!'}</strong></div>
            <div class="gift-amount-row" style="margin-top:8px">
                <input type="number" id="loan-repay-amount" min="1" inputmode="numeric" placeholder="Quanto quer pagar agora?" aria-label="Valor para abater">
                <button class="primary-btn compact" id="loan-repay-btn"><span class="btn-label">Abater</span></button>
            </div>
            <button class="primary-btn wide" id="loan-repay-all-btn" style="margin-top:6px"><span class="btn-label">Quitar dívida (${fmtGold(debt)}) 🔥</span></button>`;
    } else {
        active.hidden = true;
        form.hidden = false;
    }
}

async function renderBankLedger() {
    const box = $('#bank-ledger');
    if (!box || !currentUser) return;
    try {
        const q = query(collection(db, `users/${currentUser.uid}/ledger`), orderBy('at', 'desc'), limit(15));
        const snap = await getDocs(q);
        const countEl = $('#bank-ledger-count');
        if (countEl) countEl.textContent = snap.size ? `${snap.size} últimos` : '';
        box.innerHTML = snap.empty
            ? '<p class="inv-empty">Seu extrato nasce vazio — cada gold que entrar ou sair aparece aqui.</p>'
            : snap.docs.map((d) => {
                const e = d.data();
                const delta = Number(e.delta) || 0;
                const cls = delta >= 0 ? 'ledger-in' : 'ledger-out';
                const sign = delta >= 0 ? '+' : '';
                const amountTxt = delta === 0 ? '🎁' : `${sign}${fmtGold(Math.abs(delta))}`;
                return `<div class="ledger-row"><span>${escapeHtml(e.label || e.type || 'Movimento')}</span><span class="ledger-delta ${cls}">${amountTxt}</span></div>`;
            }).join('');
    } catch (err) {
        box.innerHTML = `<p class="inv-empty">Extrato indisponível: ${escapeHtml(firestorePermissionMsg(err))}</p>`;
    }
}

async function renderShameList() {
    const box = $('#shame-list');
    if (!box || !currentUser) return;
    try {
        const q = query(collection(db, 'loans'), where('publicShame', '==', true), limit(20));
        const snap = await getDocs(q);
        box.innerHTML = snap.empty
            ? '<p class="inv-empty">Nenhum nome na caderneta por enquanto. 😇</p>'
            : snap.docs.map((d) => {
                const l = d.data();
                const { debt, lateDays } = loanTerms(l);
                return `<div class="shame-row"><span>🔴 <strong>${escapeHtml(l.userName || 'Alguém')}</strong> · ${lateDays} dia(s) de atraso</span><span class="shame-amount">${fmtGold(debt)}</span></div>`;
            }).join('');
    } catch (err) {
        box.innerHTML = `<p class="inv-empty">Caderneta indisponível: ${escapeHtml(firestorePermissionMsg(err))}</p>`;
    }
}

async function refreshBank(loadRemote = true) {
    if (!currentUser || !economyState) return;
    const goldEl = $('#bank-gold');
    if (goldEl) goldEl.textContent = fmtGold(economyState.gold);
    const score = economyState.creditScore ?? 50;
    const scoreEl = $('#bank-score');
    if (scoreEl) {
        scoreEl.textContent = `Score: ${score} · ${scoreLabel(score)}`;
        scoreEl.className = 'bank-score' + (score >= 80 ? ' great' : score < 30 ? ' bad' : '');
    }
    if (loadRemote) {
        try { activeLoan = await getActiveLoan(); } catch { activeLoan = null; }
        if (activeLoan && loanTerms(activeLoan).lateDays >= LOAN_SHAME_DAYS && !activeLoan.publicShame) {
            activeLoan.publicShame = true;
            try { await setDoc(doc(db, 'loans', activeLoan.id), { publicShame: true }, { merge: true }); } catch (err) { console.warn('Não consegui marcar a Caderneta:', err?.message); }
        }
    }
    renderBankLoanCard();
    renderBankLedger();
    renderShameList();
}

async function takeLoan(amount) {
    if (!currentUser || !economyState) return;
    const score = economyState.creditScore ?? 50;
    const limit = creditLimitFor(score);
    const value = Math.floor(Number(amount) || 0);
    if (value < 50) { showToast('O mínimo é 50 gold 📄', 'warn'); return; }
    if (value > limit) { showToast(`Seu limite é ${fmtGold(limit)} (score ${score}) 📈`, 'warn'); return; }
    try {
        activeLoan = await getActiveLoan();
        if (activeLoan) { showToast('Você já tem um empréstimo ativo. Quite antes de pegar outro 😅', 'warn'); return; }
        const totalDue = Math.ceil(value * (1 + LOAN_INTEREST));
        await runTransaction(db, async (tx) => {
            const ref = ecoUserRef();
            const d = (await tx.get(ref)).data() || {};
            const gold = typeof d.gold === 'number' ? d.gold : 0;
            tx.set(ref, { gold: gold + value }, { merge: true });
            tx.set(doc(collection(db, 'loans')), {
                userId: currentUser.uid,
                userName: currentUserProfile.name || 'Alguém',
                principal: value,
                totalDue,
                repaid: 0,
                dueAt: Date.now() + LOAN_DUE_DAYS * 86400000,
                createdAt: serverTimestamp(),
                status: 'active',
                publicShame: false
            });
        });
        const fresh = await getDoc(ecoUserRef());
        economyState = normalizeEconomy(fresh.data() || {});
        addLedger('emprestimo', 'Empréstimo liberado no banco', value);
        refreshEconomyUI();
        await refreshBank();
        showToast(`📄 Saíram ${fmtGold(value)} pra você. Devolva com 6% até ${new Date(Date.now() + LOAN_DUE_DAYS * 86400000).toLocaleDateString('pt-BR')} 🤝`, 'success', 5000);
    } catch (err) {
        showToast(err?.message || 'O banco negou o crédito.', 'error', 4500);
    }
}

async function repayLoan(payAmount) {
    if (!currentUser || !economyState) return;
    try {
        if (!activeLoan) activeLoan = await getActiveLoan();
        if (!activeLoan) { showToast('Você não tem empréstimo ativo 😇', 'info'); return; }
        const { debt, lateDays } = loanTerms(activeLoan);
        const pay = Math.min(debt, Math.max(1, Math.floor(Number(payAmount) || 0)));
        const wasLate = lateDays > 0;
        await runTransaction(db, async (tx) => {
            const ref = ecoUserRef();
            const d = (await tx.get(ref)).data() || {};
            const gold = typeof d.gold === 'number' ? d.gold : 0;
            if (gold < pay) throw new Error(`Você só tem ${fmtGold(gold)} 🪙`);
            const lref = doc(db, 'loans', activeLoan.id);
            const lsnap = await tx.get(lref);
            const l = lsnap.data();
            if (!l || l.status !== 'active') throw new Error('Esse empréstimo já foi quitado.');
            const newRepaid = (l.repaid || 0) + pay;
            const settled = (l.totalDue || 0) - newRepaid <= 0;
            tx.set(ref, { gold: gold - pay, creditScore: adjustScore(d.creditScore ?? 50, settled, wasLate, lateDays) }, { merge: true });
            tx.set(lref, { repaid: newRepaid, ...(settled ? { status: 'paid', paidAt: serverTimestamp() } : {}) }, { merge: true });
        });
        const fresh = await getDoc(ecoUserRef());
        economyState = normalizeEconomy(fresh.data() || {});
        addLedger('emprestimo', wasLate ? 'Empréstimo pago (com mora)' : 'Empréstimo pago em dia', -pay);
        activeLoan = await getActiveLoan();
        refreshEconomyUI();
        await refreshBank(false);
        showToast(wasLate ? `📄 Pago ${fmtGold(pay)}. O banco registrou o atraso no seu score (${lateDays >= GARNISH_TOTAL_DAYS ? '−30' : '−18'}) 😤` : `📄 Empréstimo pago em dia! +12 no score 👏`, 'success', 4500);
    } catch (err) {
        showToast(err?.message || 'Não consegui pagar agora.', 'error', 4500);
    }
}
const adjustScore = (score, settled, wasLate, lateDays = 0) => {
    if (!settled) return score;
    return wasLate ? Math.max(0, score - (lateDays >= GARNISH_TOTAL_DAYS ? 30 : 18)) : Math.min(100, score + 12);
};

/* ---------- QUADRO DE FREELAS 📜 (trabalho definido pelos usuários) ---------- */
const FREELA_MIN = 10, FREELA_MAX = 10000, FREELA_REVIEW_DAYS = 7;

function freelaCardHTML(j) {
    const me = currentUser?.uid;
    const isMine = j.poster === me;
    const iAmWorker = j.workerId === me;
    const reward = Number(j.reward) || 0;
    const status = j.status || 'open';
    const reviewAt = j.reviewAt?.toMillis ? j.reviewAt.toMillis() : Number(j.reviewAt) || 0;
    const reviewElapsedDays = reviewAt ? Math.floor((Date.now() - reviewAt) / 86400000) : 0;
    const canSelfRelease = iAmWorker && status === 'review' && reviewElapsedDays >= FREELA_REVIEW_DAYS;

    let actions = '';
    if (status === 'open') {
        actions = isMine
            ? `<button class="board-cancel" data-freela-cancel="${j.id}">Tirar do ar (reembolsa ${fmtGold(reward)})</button>`
            : `<button class="board-accept" data-freela-accept="${j.id}">Aceitar 💪</button>`;
    } else if (status === 'accepted') {
        if (isMine) actions = `<button class="board-cancel" data-freela-cancel="${j.id}">Tirar do ar (reembolsa ${fmtGold(reward)})</button>`;
        if (iAmWorker) actions = `<button class="board-done" data-freela-done="${j.id}">Concluí! ✓</button> <button class="board-cancel" data-freela-desist="${j.id}">Desistir</button>`;
    } else if (status === 'review') {
        if (isMine) actions = `<button class="board-pay" data-freela-pay="${j.id}">Pagar ${fmtGold(reward)} 💰</button>`;
        else if (iAmWorker) actions = canSelfRelease
            ? `<button class="board-pay" data-freela-pay="${j.id}">Liberar pagamento (7+ dias sem resposta) 💰</button>`
            : `<span class="board-status review">Aguardando aprovação do autor… (auto-libera em 7 dias)</span>`;
    }
    const statusTxt = { open: '🟢 Aberto', accepted: '🔵 Em andamento', review: '🟡 Aguardando pagamento', paid: '✅ Pago', cancelled: '⛔ Reembolsado' }[status] || status;
    return `<div class="board-card">
        <div class="board-head"><span class="board-title">${escapeHtml(j.title || 'Freela')}</span><span class="board-status">${statusTxt}</span><span class="board-reward">🪙 ${reward.toLocaleString('pt-BR')}</span></div>
        ${j.desc ? `<p class="board-desc">${escapeHtml(j.desc)}</p>` : ''}
        <span class="board-poster">Por ${escapeHtml(j.posterName || 'Alguém')}${status !== 'open' && j.workerName ? ` · Aceito por ${escapeHtml(j.workerName)}` : ''}</span>
        <div class="board-actions">${actions}</div>
    </div>`;
}

async function renderBoard() {
    const box = $('#board-list');
    if (!box || !currentUser) return;
    try {
        const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'), limit(30));
        const snap = await getDocs(q);
        boardDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
        box.innerHTML = `<p class="inv-empty">Quadro indisponível: ${escapeHtml(firestorePermissionMsg(err))}</p>`;
        return;
    }
    const me = currentUser.uid;
    let items = boardDocs;
    if (boardFilter === 'open') items = boardDocs.filter((j) => j.status === 'open');
    else if (boardFilter === 'mine') items = boardDocs.filter((j) => j.poster === me || j.workerId === me);
    box.innerHTML = items.length
        ? items.map(freelaCardHTML).join('')
        : `<p class="inv-empty">${boardFilter === 'mine' ? 'Você ainda não publicou nem aceitou freelas.' : 'Nenhum freela aberto agora. Publique o primeiro! 📜'}</p>`;
}

async function publishFreela() {
    if (!currentUser || !economyState) return;
    const titleEl = $('#board-title');
    const descEl = $('#board-desc');
    const rewardEl = $('#board-reward');
    const title = (titleEl?.value || '').trim();
    const desc = (descEl?.value || '').trim();
    const reward = Math.floor(Number(rewardEl?.value || 0));
    if (title.length < 5) { showToast('Título muito curto (mín. 5 letras) ✍️', 'warn'); return; }
    if (!Number.isFinite(reward) || reward < FREELA_MIN || reward > FREELA_MAX) { showToast(`Recompensa entre ${FREELA_MIN} e ${FREELA_MAX} gold`, 'warn'); return; }
    if (economyState.gold < reward) { showToast('Gold insuficiente para o escrow 🪙', 'warn'); return; }
    try {
        await runTransaction(db, async (tx) => {
            const ref = ecoUserRef();
            const d = (await tx.get(ref)).data() || {};
            const gold = typeof d.gold === 'number' ? d.gold : 0;
            if (gold < reward) throw new Error('Gold insuficiente no momento.');
            tx.set(ref, { gold: gold - reward }, { merge: true });
            tx.set(doc(collection(db, 'jobs')), {
                poster: currentUser.uid,
                posterName: currentUserProfile.name || 'Alguém',
                title: title.slice(0, 80),
                desc: desc.slice(0, 280),
                reward,
                status: 'open',
                workerId: null,
                workerName: null,
                reviewAt: null,
                createdAt: serverTimestamp()
            });
        });
        const fresh = await getDoc(ecoUserRef());
        economyState = normalizeEconomy(fresh.data() || {});
        addLedger('freela', `Freela publicado: ${title}`, -reward);
        titleEl.value = ''; descEl.value = ''; rewardEl.value = '';
        refreshEconomyUI();
        await renderBoard();
        showToast(`📜 Freela publicado! ${fmtGold(reward)} travados no escrow 🔒`, 'success', 4500);
    } catch (err) {
        showToast(err?.message || 'Não consegui publicar.', 'error', 4500);
    }
}

async function acceptFreela(id) {
    try {
        await runTransaction(db, async (tx) => {
            const ref = doc(db, 'jobs', id);
            const d = (await tx.get(ref)).data();
            if (!d) throw new Error('Freela não encontrado.');
            if (d.status !== 'open') throw new Error('Alguém já aceitou esse freela!');
            if (d.poster === currentUser.uid) throw new Error('Você não pode aceitar o próprio freela 😅');
            tx.set(ref, { status: 'accepted', workerId: currentUser.uid, workerName: currentUserProfile.name || 'Alguém', acceptedAt: serverTimestamp() }, { merge: true });
        });
        await renderBoard();
        showToast('💪 Freela aceito! Faça o serviço e marque como concluído.', 'success', 4000);
    } catch (err) {
        showToast(err?.message || 'Não consegui aceitar.', 'error', 4000);
    }
}

async function desistFreela(id) {
    try {
        await runTransaction(db, async (tx) => {
            const ref = doc(db, 'jobs', id);
            const d = (await tx.get(ref)).data();
            if (!d || d.workerId !== currentUser.uid || d.status !== 'accepted') throw new Error('Você não é o responsável por esse freela.');
            tx.set(ref, { status: 'open', workerId: null, workerName: null, acceptedAt: null }, { merge: true });
        });
        await renderBoard();
        showToast('Freela devolvido para o quadro.', 'info');
    } catch (err) {
        showToast(err?.message || 'Não consegui desistir.', 'error');
    }
}

async function completeFreela(id) {
    try {
        await runTransaction(db, async (tx) => {
            const ref = doc(db, 'jobs', id);
            const d = (await tx.get(ref)).data();
            if (!d || d.workerId !== currentUser.uid || d.status !== 'accepted') throw new Error('Esse freela não está com você.');
            tx.set(ref, { status: 'review', reviewAt: serverTimestamp() }, { merge: true });
        });
        await renderBoard();
        showToast('✅ Marcado como concluído! O autor tem 7 dias pra te pagar (ou libera direto).', 'success', 5000);
    } catch (err) {
        showToast(err?.message || 'Não consegui marcar.', 'error');
    }
}

async function cancelFreela(id) {
    try {
        let refunded = 0;
        await runTransaction(db, async (tx) => {
            const ref = doc(db, 'jobs', id);
            const d = (await tx.get(ref)).data();
            if (!d || d.poster !== currentUser.uid) throw new Error('Só o autor pode tirar do ar.');
            if (d.status === 'paid' || d.status === 'cancelled') throw new Error('Freela já encerrado.');
            const uref = ecoUserRef();
            const u = (await tx.get(uref)).data() || {};
            const gold = typeof u.gold === 'number' ? u.gold : 0;
            refunded = Number(d.reward) || 0;
            tx.set(uref, { gold: gold + refunded }, { merge: true });
            tx.set(ref, { status: 'cancelled', cancelledAt: serverTimestamp() }, { merge: true });
        });
        const fresh = await getDoc(ecoUserRef());
        economyState = normalizeEconomy(fresh.data() || {});
        addLedger('freela', 'Freela reembolsado ao autor', refunded);
        refreshEconomyUI();
        await renderBoard();
        showToast(`Freela tirado do ar. ${fmtGold(refunded)} voltaram pra você 🔄`, 'success');
    } catch (err) {
        showToast(err?.message || 'Não consegui tirar do ar.', 'error');
    }
}

/* Paga o freela (pelo autor a qualquer momento, ou pelo trabalhador após 7 dias) */
async function payFreela(id) {
    try {
        let jobData = null;
        await runTransaction(db, async (tx) => {
            const ref = doc(db, 'jobs', id);
            const d = (await tx.get(ref)).data();
            if (!d) throw new Error('Freela não encontrado.');
            if (d.status !== 'review') throw new Error('Freela não está aguardando pagamento.');
            const isPoster = d.poster === currentUser.uid;
            const reviewAt = d.reviewAt?.toMillis ? d.reviewAt.toMillis() : Number(d.reviewAt) || 0;
            const elapsedDays = reviewAt ? (Date.now() - reviewAt) / 86400000 : 0;
            const workerCanRelease = d.workerId === currentUser.uid && elapsedDays >= FREELA_REVIEW_DAYS;
            if (!isPoster && !workerCanRelease) throw new Error('Só o autor paga — ou o trabalhador após 7 dias sem resposta.');
            if (!d.workerId) throw new Error('Freela sem trabalhador definido.');
            tx.set(doc(collection(db, 'gifts')), {
                from: d.poster,
                fromName: d.posterName || 'Alguém',
                to: d.workerId,
                gold: Number(d.reward) || 0,
                type: 'job',
                jobId: id,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            tx.set(ref, { status: 'paid', paidAt: serverTimestamp() }, { merge: true });
            jobData = d;
        });
        addLedger('freela', `Freela pago: ${jobData?.title || ''}`, jobData && jobData.poster === currentUser.uid ? -(Number(jobData.reward) || 0) : 0);
        await renderBoard();
        showToast(jobData?.workerId === currentUser.uid
            ? '💰 Pagamento liberado! Entra no seu saldo assim que resgatar.'
            : '💰 Pagamento enviado! O trabalhador recebe ao abrir o app.', 'success', 4500);
    } catch (err) {
        showToast(err?.message || 'Não consegui liberar o pagamento.', 'error', 4500);
    }
}

/* ---------- MERCADO 🛒 (venda entre jogadores — o sistema NÃO compra) ---------- */
let marketListings = [];

async function fetchMarket() {
    try {
        // Sem orderBy + where combinados (evita índice composto): ordena no cliente
        const snap = await getDocs(query(collection(db, 'market'), limit(60)));
        marketListings = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((l) => l.status === 'open')
            .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    } catch (err) {
        console.warn('Mercado indisponível (regras do Firestore?):', err?.message);
        marketListings = [];
    }
}
const marketItemOf = (itemId) => ECO?.ALL_MATERIALS.find((m) => m.id === itemId) || { id: itemId, name: itemId, emoji: '📦', price: 0 };

function marketCardHTML(l) {
    const m = marketItemOf(l.itemId);
    const mine = l.seller === currentUser?.uid;
    const qty = Number(l.qty) || 1;
    const total = Number(l.price) || 0;
    const each = Number(l.priceEach) || Math.floor(total / Math.max(1, qty));
    const canAfford = (economyState?.gold || 0) >= total;
    const buyBtn = mine
        ? `<button class="chip-btn danger" data-market-cancel="${l.id}">Retirar</button>`
        : `<button class="primary-btn compact" data-market-buy="${l.id}" ${canAfford ? '' : 'disabled'}>Comprar</button>`;
    return `<div class="market-card">
        <span class="market-emoji">${m.emoji}</span>
        <span class="market-info">
            <span class="market-name">${qty}× ${escapeHtml(m.name)}</span>
            <span class="market-meta">🪙 ${each.toLocaleString('pt-BR')}/un · ${mine ? 'seu anúncio' : `por ${escapeHtml(l.sellerName || 'alguém')}`}</span>
            <span class="market-price">Total: ${fmtGold(total)}</span>
        </span>
        ${buyBtn}
    </div>`;
}

function updateMarketTotal() {
    const qty = Math.floor(Number($('#market-qty')?.value) || 0);
    const each = Math.floor(Number($('#market-price')?.value) || 0);
    const total = $('#market-total');
    if (total) total.textContent = fmtGold(qty * each);
}

function renderMarket() {
    renderShopItems();
    const gold = $('#market-gold');
    if (gold) gold.textContent = fmtGold(economyState?.gold || 0);
    const sel = $('#market-item-select');
    if (sel && ECO) {
        const owned = ECO.ALL_MATERIALS.filter((m) => matQty(m.id) > 0);
        const cur = sel.value;
        sel.innerHTML = owned.length
            ? owned.map((m) => `<option value="${m.id}">${m.emoji} ${escapeHtml(m.name)} (tenho ${matQty(m.id)})</option>`).join('')
            : '<option value="">Nada no baú pra vender — trabalhe e colete primeiro 🎒</option>';
        if (cur && owned.some((m) => m.id === cur)) sel.value = cur;
    }
    updateMarketTotal();
    const list = $('#market-list');
    const count = $('#market-count');
    if (list) {
        const others = marketListings.filter((l) => l.seller !== currentUser?.uid);
        list.innerHTML = others.length
            ? others.map(marketCardHTML).join('')
            : '<p class="inv-empty">Nada à venda por enquanto. Pode ser o primeiro a anunciar 📢</p>';
        if (count) count.textContent = `${others.length} anúncio(s)`;
    }
    const mineBox = $('#my-listings');
    if (mineBox) {
        const mine = marketListings.filter((l) => l.seller === currentUser?.uid);
        mineBox.innerHTML = mine.length
            ? mine.map(marketCardHTML).join('')
            : '<p class="inv-empty">Seus anúncios ficam aqui até alguém comprar.</p>';
    }
}

async function refreshMarket() {
    if (!currentUser) return;
    await fetchMarket();
    renderMarket();
}

async function publishMarketListing() {
    if (!currentUser || !economyState || !ECO) return;
    const id = $('#market-item-select')?.value;
    const item = id ? ECO.MATERIAL_BY_ID[id] : null;
    const qty = Math.floor(Number($('#market-qty')?.value) || 0);
    const priceEach = Math.floor(Number($('#market-price')?.value) || 0);
    if (!item) { showToast('Escolha um item pra anunciar 🎒', 'warn'); return; }
    if (qty < 1) { showToast('Quantidade mínima: 1', 'warn'); return; }
    if (priceEach < 1) { showToast('Preço mínimo: 1 gold por unidade 🪙', 'warn'); return; }
    const have = matQty(id);
    if (qty > have) { showToast(`Você só tem ${have}× ${item.name} 👀`, 'warn'); return; }
    const total = qty * priceEach;
    // Escrow: os itens saem do baú e ficam travados no anúncio até vender ou expirar
    const inv = { ...economyState.inv };
    inv[id] = have - qty;
    if (inv[id] <= 0) delete inv[id];
    try {
        await runTransaction(db, async (tx) => {
            const ref = ecoUserRef();
            const u = (await tx.get(ref)).data() || {};
            const invNow = { ...(u.inv || {}) };
            const haveNow = invNow[id] || 0;
            if (haveNow < qty) throw new Error(`O baú mudou — você só tem ${haveNow}× ${item.name}`);
            invNow[id] = haveNow - qty;
            if (invNow[id] <= 0) delete invNow[id];
            tx.set(ref, { inv: invNow }, { merge: true });
            tx.set(doc(collection(db, 'market')), {
                seller: currentUser.uid,
                sellerName: currentUserProfile.name || 'Alguém',
                itemId: id, qty, priceEach, price: total,
                status: 'open', createdAt: serverTimestamp()
            });
        });
        economyState = { ...economyState, inv };
        await saveEconomy({ inv });
        addLedger('mercado', `Anunciou ${qty}× ${item.name} por ${fmtGold(total)}`, 0);
        const qtyEl = $('#market-qty'), priceEl = $('#market-price');
        if (qtyEl) qtyEl.value = '';
        if (priceEl) priceEl.value = '';
        await refreshMarket();
        vibrate(10);
        showToast(`📢 ${qty}× ${item.name} no Mercado por ${fmtGold(total)}!`, 'success');
    } catch (err) {
        showToast(err?.message || 'Não consegui anunciar.', 'error', 4500);
    }
}

async function buyMarketListing(id) {
    if (!currentUser || !economyState || !ECO) return;
    const l = marketListings.find((x) => x.id === id);
    if (!l) { showToast('Anúncio não encontrado — atualizando…', 'info'); await refreshMarket(); return; }
    if (l.seller === currentUser.uid) { showToast('Esse anúncio é seu 😄', 'info'); return; }
    const qty = Number(l.qty) || 1;
    const total = Number(l.price) || 0;
    const m = marketItemOf(l.itemId);
    try {
        await runTransaction(db, async (tx) => {
            const mref = doc(db, 'market', id);
            const ms = await tx.get(mref);
            const md = ms.data();
            if (!md || md.status !== 'open') throw new Error('Esse anúncio já foi vendido ou retirado.');
            if (md.seller === currentUser.uid) throw new Error('Esse anúncio é seu 😄');
            const buyerRef = ecoUserRef();
            const u = (await tx.get(buyerRef)).data() || {};
            const gold = typeof u.gold === 'number' ? u.gold : 0;
            if (gold < total) throw new Error(`Faltam ${fmtGold(total - gold)} 🪙`);
            const inv = { ...(u.inv || {}) };
            inv[md.itemId] = (inv[md.itemId] || 0) + (Number(md.qty) || 1);
            tx.set(buyerRef, { gold: gold - total, inv }, { merge: true });
            tx.set(mref, { status: 'sold', buyerId: currentUser.uid, buyerName: currentUserProfile.name || 'Alguém', soldAt: serverTimestamp() }, { merge: true });
            // Pagamento pro vendedor via presente (ele resgata ao abrir o app)
            tx.set(doc(collection(db, 'gifts')), {
                from: currentUser.uid,
                fromName: currentUserProfile.name || 'Alguém',
                to: md.seller,
                status: 'pending',
                createdAt: serverTimestamp(),
                gold: total,
                type: 'market',
                marketId: id
            });
        });
        const fresh = await getDoc(ecoUserRef());
        economyState = normalizeEconomy(fresh.data() || {});
        addLedger('mercado', `Compra: ${qty}× ${m.name} de ${l.sellerName || 'alguém'}`, -total);
        refreshEconomyUI();
        await refreshMarket();
        vibrate([12, 30, 12]);
        showToast(`🤝 ${qty}× ${m.name} é seu! O gold foi pro vendedor.`, 'success', 4000);
    } catch (err) {
        showToast(err?.message || 'Não consegui comprar.', 'error', 4500);
        await refreshMarket();
    }
}

async function cancelMarketListing(id) {
    if (!currentUser || !economyState) return;
    try {
        let refunded = null;
        await runTransaction(db, async (tx) => {
            const mref = doc(db, 'market', id);
            const ms = await tx.get(mref);
            const md = ms.data();
            if (!md || md.status !== 'open') throw new Error('Esse anúncio já não está aberto.');
            if (md.seller !== currentUser.uid) throw new Error('Só quem anunciou pode retirar.');
            const uref = ecoUserRef();
            const u = (await tx.get(uref)).data() || {};
            const inv = { ...(u.inv || {}) };
            inv[md.itemId] = (inv[md.itemId] || 0) + (Number(md.qty) || 1);
            tx.set(uref, { inv }, { merge: true });
            tx.set(mref, { status: 'cancelled', cancelledAt: serverTimestamp() }, { merge: true });
            refunded = { itemId: md.itemId, qty: Number(md.qty) || 1 };
        });
        const fresh = await getDoc(ecoUserRef());
        economyState = normalizeEconomy(fresh.data() || {});
        const m = refunded ? marketItemOf(refunded.itemId) : null;
        addLedger('mercado', `Retirou do mercado: ${refunded?.qty || 0}× ${m?.name || ''}`, 0);
        refreshEconomyUI();
        await refreshMarket();
        showToast('Anúncio retirado — os itens voltaram pro seu baú 🎒', 'info');
    } catch (err) {
        showToast(err?.message || 'Não consegui retirar.', 'error', 4500);
    }
}

/* ---------- wiring ---------- */
document.addEventListener('click', async (e) => {
    const t = e.target;
    const openUser = t.closest?.('[data-open-user]');
    if (openUser) { e.preventDefault(); void openUserProfile(openUser.dataset.openUser); return; }
    const marketBuy = t.closest?.('[data-market-buy]');
    if (marketBuy) { await buyMarketListing(marketBuy.dataset.marketBuy); return; }
    const marketCancel = t.closest?.('[data-market-cancel]');
    if (marketCancel) { await cancelMarketListing(marketCancel.dataset.marketCancel); return; }
    const boardFilterBtn = t.closest?.('[data-board-filter]');
    if (boardFilterBtn) {
        boardFilter = boardFilterBtn.dataset.boardFilter;
        document.querySelectorAll('[data-board-filter]').forEach((b) => b.classList.toggle('accent', b === boardFilterBtn));
        await renderBoard();
        return;
    }
    const accept = t.closest?.('[data-freela-accept]');
    if (accept) { await acceptFreela(accept.dataset.freelaAccept); return; }
    const desist = t.closest?.('[data-freela-desist]');
    if (desist) { await desistFreela(desist.dataset.freelaDesist); return; }
    const done = t.closest?.('[data-freela-done]');
    if (done) { await completeFreela(done.dataset.freelaDone); return; }
    const cancel = t.closest?.('[data-freela-cancel]');
    if (cancel) { await cancelFreela(cancel.dataset.freelaCancel); return; }
    const pay = t.closest?.('[data-freela-pay]');
    if (pay) { await payFreela(pay.dataset.freelaPay); return; }
    const loanAmountBtn = t.closest?.('[data-loan-amount]');
    if (loanAmountBtn) { const input = $('#loan-amount'); if (input) input.value = loanAmountBtn.dataset.loanAmount; return; }
    if (t.closest?.('#loan-max-btn')) { const input = $('#loan-amount'); if (input) input.value = String(creditLimitFor(economyState?.creditScore ?? 50)); return; }
    if (t.closest?.('#loan-take-btn')) { await takeLoan($('#loan-amount')?.value); return; }
    if (t.closest?.('#loan-repay-btn')) { await repayLoan($('#loan-repay-amount')?.value); return; }
    if (t.closest?.('#loan-repay-all-btn')) { await repayLoan(Number.MAX_SAFE_INTEGER); return; }
});

$('#board-publish-btn')?.addEventListener('click', publishFreela);
$('#market-publish-btn')?.addEventListener('click', publishMarketListing);
$('#market-qty')?.addEventListener('input', updateMarketTotal);
$('#market-price')?.addEventListener('input', updateMarketTotal);
$('#bank-transfer-btn')?.addEventListener('click', () => {
    giftState.mode = 'gold';
    document.querySelectorAll('[data-gift-tab]').forEach((b) => b.classList.toggle('active', b.dataset.giftTab === 'gold'));
    const gp = $('#gift-pane-gold'), mp = $('#gift-pane-material');
    if (gp) gp.hidden = false;
    if (mp) mp.hidden = true;
    openGiftModal();
});

/* ================= ENERGIA DA CASA (engajamento ambiental) ================= */
// A cada 3 minutos com o app aberto, a casa distribui uma energia:
// curte um post recente de outra pessoa (80% das vezes) ou descurtida (20%).
// Não é uma pessoa tocando — é o app respirando (ver regras no app).
// Nunca impulsiona: post próprio, post com 🔞 ou posts com mais de 7 dias.
const AMBIENT_INTERVAL_MS = 3 * 60 * 1000;
const AMBIENT_DISLIKE_RATE = 0.2;   // fração de descurtidas (0.2 = 20%)
const AMBIENT_MAX_AGE_MS = 7 * 24 * 3600 * 1000;
let ambientTimer = null;
let ambientUsed = new Set();        // posts já impulsionados nesta sessão

function ambientCandidates() {
    const me = currentUser?.uid;
    if (!me) return [];
    const now = Date.now();
    return (feedPostsCache || []).filter((p) => {
        if (!p || !p.id) return false;
        if (p.userId === me) return false;
        if (p.isNsfw) return false;
        const ts = p.timestamp?.toMillis ? p.timestamp.toMillis() : Number(p.timestamp) || 0;
        if (ts && now - ts > AMBIENT_MAX_AGE_MS) return false;
        return true;
    });
}

async function ambientPulse() {
    if (document.hidden || !currentUser) return;
    const candidates = ambientCandidates();
    if (!candidates.length) return;
    const fresh = candidates.filter((p) => !ambientUsed.has(p.id));
    const pool = fresh.length ? fresh : candidates;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const dislike = Math.random() < AMBIENT_DISLIKE_RATE;
    ambientUsed.add(pick.id);
    if (ambientUsed.size > 300) ambientUsed = new Set([...ambientUsed].slice(-150));
    try {
        await updateDoc(doc(db, 'posts', pick.id), dislike ? { dislikes: increment(1) } : { likes: increment(1) });
        console.log(`🌊 Energia da casa: ${dislike ? '👎' : '👍'} no post ${pick.id}`);
    } catch (err) {
        console.warn('🌊 Energia da casa não pôde ser entregue:', err?.message);
    }
}

function startAmbientVibes() {
    stopAmbientVibes();
    ambientTimer = setInterval(ambientPulse, AMBIENT_INTERVAL_MS);
}
function stopAmbientVibes() {
    if (ambientTimer) { clearInterval(ambientTimer); ambientTimer = null; }
    ambientUsed = new Set();
}

/* ================= ARENA ⚔️ (cartas, deck, árvore e PvP ao vivo) ================= */
/* Cartas criadas pelos jogadores vivem em `cards`; as partidas ao vivo em
   `arena_matches`. ⚠️ Sem servidor: um cliente alterado pode forçar resultado
   (vale como aposta entre amigos, não como cassino). O pote — gold e cosméticos
   — fica CUSTODIADO na partida desde o início: quem perder confirma o prejuízo
   na hora, e quem vencer resgata tudo (gold + cosméticos) numa liquidação só,
   automática ao abrir o app (claimArenaSettlements). */

let arenaCards = [];
let arenaMatchUnsub = null;
let arenaOpenMatchId = null;
let arenaOpenMatchCache = null;
let arenaBetMode = null;                 // { type: 'create' } | { type: 'accept', matchId }
let arenaBetSelected = new Set();        // ids de cosméticos na aposta
let arenaDraft = { artUrl: '', cost: 3, power: 3, effect: '' };
let arenaSaveBusy = false;
let arenaHandDrag = null;
let arenaSelectedHand = null;
let arenaPollTimer = null;
/* Partidas ativas que já vimos nesta sessão — o auto-abrir só puxa
   TRANSIÇÕES (desafio aceito agora), nunca puxa de volta quem saiu */
const arenaKnownActive = new Set();
let arenaKnownActiveInit = false;
/* Convites que já avisamos nesta sessão (não notificar 2x) */
let arenaInvitesSeenInit = false;
const arenaInviteSeen = new Set();

const ARENA_DECK_MIN = 5;               // mínimo de cartas pra formar deck
const ARENA_DECK_MAX_POINTS = 30;       // 30 pontos por deck
const ARENA_TREE_MAX = 30;              // 30 pontos pra espalhar na árvore
const ARENA_HP = 60;
const ARENA_SHIELD_MAX = 40;
const ARENA_TOKEN_TURNS = 3;
const ARENA_CARD_LIMIT = 30;            // teto de cartas criadas por jogador
const ARENA_ART_MAX = 500;              // teto de URL de arte
const ARENA_FRONT_MAX = 3;              // criaturas na frente
const ARENA_BACK_MAX = 4;               // retaguarda: estruturas + residências
const ARENA_EVO_T1 = 500;               // custo do Ponto de Evolução I
const ARENA_EVO_T2 = 1200;              // custo do Ponto de Evolução II
const ARENA_RESQ_TURNS = 2;             // resquício (carta jogada de efeito rápido) fica 2 turnos no campo
/* Cada carta evolui pelo PRÓPRIO TRAÇO — 3 caminhos, 2 evoluções cada.
   Cada nó MUDA a mecânica do efeito (não é % — é outra jogada). */
const ARENA_EVO = {
    dano: {
        word: 'Lâmina', icon: 'arena-sword', style: 'rajada',
        aura: 'golpe físico direto + Sangramento (2/turno, 2 turnos)',
        branches: [
            { key: 'amputar', name: 'Amputar', tagline: 'a ferida como arma',
              t1: { name: 'Cortar Fundo', desc: 'O Sangramento dura +1 turno (3 no total).' },
              t2: { name: 'Corrupção Necrótica', desc: 'A ferida final causa dano DOBRADO antes de fechar (o Sangramento detona).' } },
            { key: 'estocada', name: 'Estocada', tagline: 'precisão fatal',
              t1: { name: 'Golpe Penetrante', desc: 'O golpe ATRAVESSA o escudo físico, indo direto na vida.' },
              t2: { name: 'Lâmina Arrancadora', desc: 'O golpe também causa 4 de dano em CADA criatura inimiga (pode destruí-las).' } },
            { key: 'execucao', name: 'Execução', tagline: 'caçador de feridos',
              t1: { name: 'Sentença', desc: 'Alvo com 25% de vida ou menos leva +60% de dano no golpe.' },
              t2: { name: 'Misericórdia Letal', desc: 'Contra alvos com 50% de vida ou menos, o Sangramento causa o dobro.' } }
        ]
    },
    dano_fogo: {
        word: 'Ignição', icon: 'arena-flame', style: 'rajada',
        aura: 'dano mágico de fogo + Queimadura (2/turno, 2 turnos)',
        branches: [
            { key: 'incendio', name: 'Incêndio', tagline: 'queima de espalhar',
              t1: { name: 'Propagação', desc: 'Todas as criaturas inimigas sofrem 4 de dano de fogo imediatamente.' },
              t2: { name: 'Brasa Eterna', desc: 'Suas Queimaduras NÃO expiram enquanto você tiver uma Estrutura em campo.' } },
            { key: 'tormento', name: 'Tormento', tagline: 'o fogo abastece',
              t1: { name: 'Roubo de Chamas', desc: 'Você se cura 50% do dano que a jogada causou.' },
              t2: { name: 'Marca de Cinza', desc: 'Cada turno que o alvo queimar, +2 de dano mágico fixo (empilha até +6).' } },
            { key: 'labareda', name: 'Labareda', tagline: 'timing é tudo',
              t1: { name: 'Explosão Inicial', desc: 'Seu dano de fogo atravessa o escudo mágico (vai direto na vida).' },
              t2: { name: 'Combustão', desc: 'Se o alvo estiver com 0 de escudos, o dano desta jogada é DOBRADO.' } }
        ]
    },
    dano_agua: {
        word: 'Maré', icon: 'arena-droplet', style: 'rajada',
        aura: 'erosão (rói escudo mágico) + dano de água',
        branches: [
            { key: 'diluvio', name: 'Dilúvio', tagline: 'desmontar muralhas',
              t1: { name: 'Erosão Total', desc: 'Erosão também rói 3 de escudo FÍSICO.' },
              t2: { name: 'Absorver a Corrente', desc: 'Você ganha escudo mágico igual ao total que você corroeu.' } },
            { key: 'sedada', name: 'Sedada', tagline: 'afogar o ritmo',
              t1: { name: 'Encharcar', desc: 'O dano de água também ATORDOA (rival não compra no próximo turno).' },
              t2: { name: 'Ressaca', desc: 'Se o rival está atordoado, este golpe causa +50% de dano.' } },
            { key: 'marebaxa', name: 'Maré Baixa', tagline: 'água que contorna',
              t1: { name: 'Fissura', desc: 'Metade do dano desta jogada ignora o escudo mágico.' },
              t2: { name: 'Transbordar', desc: 'Se o alvo ficar com 0 escudos, o golpe atinge também TODAS as criaturas inimigas (5).' } }
        ]
    },
    dano_ar: {
        word: 'Tempestade', icon: 'arena-wind', style: 'rajada',
        aura: 'ignora escudos indo direto na vida + atordoa (sem compra)',
        branches: [
            { key: 'vendaval', name: 'Vendaval', tagline: 'nenhum respiro',
              t1: { name: 'Turbilhão', desc: 'O atordoamento dura +1 turno (2 turnos sem comprar).' },
              t2: { name: 'Ímpeto', desc: 'Se o alvo JÁ estava atordoado, este golpe é DOBRADO.' } },
            { key: 'laminas', name: 'Lâminas ao Vento', tagline: 'vento que desarma',
              t1: { name: 'Fio Cortante', desc: '+1 de dano por carta na MÃO DO RIVAL (informação pública).' },
              t2: { name: 'Desarmar', desc: 'O golpe ARRANCA 1 carta aleatória da mão do rival.' } },
            { key: 'arcort', name: 'Ar Cortante', tagline: 'sem perigo de escudo',
              t1: { name: 'Esquiva', desc: 'Você ganha Esquiva: o próximo dano físico contra você cai a 50%.' },
              t2: { name: 'Faseamento', desc: 'Sua Esquiva anula 100% do dano físico (não apenas 50%).' } }
        ]
    },
    dano_terra: {
        word: 'Terremoto', icon: 'arena-mountain', style: 'residencia',
        aura: 'dano de terra + você GANHA muralha física ao jogar; a residência fica no campo (+2 dano em golpes de terra)',
        branches: [
            { key: 'monolito', name: 'Monólito', tagline: 'erga o que não cai',
              t1: { name: 'Núcleo de Granito', desc: 'A residência é inabalável: sua muralha ganha +2 de escudo físico extra.' },
              t2: { name: 'Aura Sísmica', desc: 'A residência dá +4 de dano mágico aos seus golpes de terra (antes eram +2).' } },
            { key: 'abundancia', name: 'Abundância', tagline: 'a terra provê',
              t1: { name: 'Pele de Pedra', desc: 'A muralha física desta jogada é DOBRADA.' },
              t2: { name: 'Raízes Profundas', desc: 'Enquanto o Monólito estiver no seu campo, você cura 2 no início do seu turno.' } },
            { key: 'demolicao', name: 'Demolição', tagline: 'quebradeira total',
              t1: { name: 'Cataclisma', desc: 'O golpe também atinge TODAS as criaturas inimigas com 5 de dano.' },
              t2: { name: 'Linha de Trincamento', desc: 'Golpes de terra causam o DOBRO contra criaturas e estruturas.' } }
        ]
    },
    cura: {
        word: 'Bênção', icon: 'arena-heart', style: 'residencia',
        aura: 'restaura vida (o excedente vira escudo) · a residência fica no campo (+2 vida/turno)',
        branches: [
            { key: 'renovacao', name: 'Renovação', tagline: 'vida que retorna',
              t1: { name: 'Vitalidade', desc: '+4 de cura por criatura SUA em campo.' },
              t2: { name: 'Segundo Fôlego', desc: 'O excedente se transforma em escudo MÁGICO no dobro da taxa.' } },
            { key: 'espelho', name: 'Espelho', tagline: 'cura que se protege',
              t1: { name: 'Refletir Energia', desc: 'O excedente vira escudo FÍSICO também (metade de cada).' },
              t2: { name: 'Couraça Vital', desc: 'Em vez de escudo, o excedente vira Barreira de 30%.' } },
            { key: 'purificacao', name: 'Purificação', tagline: 'expulsar a sujeira',
              t1: { name: 'Limpeza', desc: 'A cura também remove Sangramento e Queimadura DE VOCÊ.' },
              t2: { name: 'Santidade', desc: 'A cura desta jogada é TOTAL (você volta ao máximo sempre).' } }
        ]
    },
    defesa: {
        word: 'Bastião', icon: 'arena-shield', style: 'residencia',
        aura: 'escudo físico + Espinhos (4, 2 turnos) · a residência fica no campo (+1 escudo físico/turno)',
        branches: [
            { key: 'fortaleza', name: 'Fortaleza', tagline: 'uma parede de espinhos',
              t1: { name: 'Espinhos Duradouros', desc: 'Espinhos duram +1 turno (3 no total).' },
              t2: { name: 'Espinhos Totais', desc: 'Espinhos refletem também dano MÁGICO sofrido pelo Bastião.' } },
            { key: 'contraataque', name: 'Contra-ataque', tagline: 'cada pancada dói nos dois',
              t1: { name: 'Riposta', desc: 'Ao refletir dano com Espinhos, você COMPRA 1 carta.' },
              t2: { name: 'Mártir de Ferro', desc: 'Cada golpe que seus Espinhos devolvem te cura 4.' } },
            { key: 'muralha', name: 'Muralha de Aço', tagline: 'nada passa',
              t1: { name: 'Baluarte', desc: 'Você é IMUNE a dano físico neste turno.' },
              t2: { name: 'Muro Perfeito', desc: 'Espinhos causam 50% a mais de dano e ignoram Barreiras.' } }
        ]
    },
    defesa_magica: {
        word: 'Véu', icon: 'arena-shield-mag', style: 'residencia',
        aura: 'escudo mágico + Barreira (−25% dano mágico, 2 cargas) · a residência fica no campo (+1 escudo mágico/turno)',
        branches: [
            { key: 'prisao', name: 'Prisão', tagline: 'a barreira manda',
              t1: { name: 'Barreira Total', desc: 'A PRIMEIRA carga da Barreira absorve 100% do dano.' },
              t2: { name: 'Santuário', desc: 'Você NÃO pode ser atordoado enquanto tiver Barreira.' } },
            { key: 'reflexao', name: 'Reflexão', tagline: 'devolva o que veio',
              t1: { name: 'Transubstanciação', desc: '50% do dano mágico ABSORVIDO pela Barreira é DEVOLVIDO ao lançador.' },
              t2: { name: 'Descarga', desc: 'Se sua Barreira zerar as cargas, o rival sofre Queimadura 4/turno (2 turnos).' } },
            { key: 'santuario', name: 'Santuário', tagline: 'fortaleza interior',
              t1: { name: 'Afinidade Etérea', desc: 'No início do seu turno, +2 de escudo mágico EXTRA.' },
              t2: { name: 'Ápice', desc: 'Enquanto você tiver Barreira, você cura 3 no início do seu turno.' } }
        ]
    },
    invocacao: {
        word: 'Invocação', icon: 'arena-moon', style: 'summon',
        aura: 'criatura na frente golpeando pelo dobro do poder por 3 turnos',
        branches: [
            { key: 'ferocidade', name: 'Ferocidade', tagline: 'sangue frio, garras quentes',
              t1: { name: 'Carga Imediata', desc: 'A criatura ataca IMEDIATAMENTE ao ser invocada (50% da força).' },
              t2: { name: 'Fúria Primordial', desc: 'O golpe da criatura ignora o escudo físico.' } },
            { key: 'horda', name: 'Horda', tagline: 'um exército de um só gesto',
              t1: { name: 'Enxame', desc: 'Invoca 2 criaturas MENORES (poder 2, 2 turnos) em vez de uma.' },
              t2: { name: 'Vínculo Vital', desc: 'A criatura te cura 2 a cada golpe que ela dá.' } },
            { key: 'retorno', name: 'Retorno', tagline: 'a morte é só um intervalo',
              t1: { name: 'Persistência', desc: 'A criatura dura +2 turnos.' },
              t2: { name: 'Último Suspiro', desc: 'Quando a criatura expira, ela EXPLODE: 6 direto na vida do rival.' } }
        ]
    },
    estrutura: {
        word: 'Estrutura', icon: 'arena-tower', style: 'estrutura',
        aura: 'dano imediato + dano mágico por turno + cura 1/turno · fica na retaguarda',
        branches: [
            { key: 'industrial', name: 'Poder Industrial', tagline: 'a máquina que nutre',
              t1: { name: 'Sobrecarga', desc: 'A estrutura cura você +3 por turno (em vez de 1).' },
              t2: { name: 'Núcleo de Gênese', desc: 'A estrutura cura também 2 de escudo MÁGICO por turno.' } },
            { key: 'artilharia', name: 'Artilharia', tagline: 'canhão de longo alcance',
              t1: { name: 'Bombardeio', desc: 'A estrutura atinge também as CRIATURAS inimigas com 3.' },
              t2: { name: 'Mina Terrestre', desc: 'A estrutura IGNORA o escudo mágico da retaguarda… atravessa tudo.' } },
            { key: 'fortaleza', name: 'Bastião Industrial', tagline: 'para o desespero',
              t1: { name: 'Último Recurso', desc: 'Com 20 de vida ou menos, a estrutura causa o DOBRO.' },
              t2: { name: 'Baluarte Vivo', desc: 'Enquanto você tiver a estrutura, seu escudo físico +4.' } }
        ]
    }
};
const ARENA_EVO_ORDER = ['dano', 'dano_fogo', 'dano_agua', 'dano_ar', 'dano_terra', 'cura', 'defesa', 'defesa_magica', 'invocacao', 'estrutura'];
const arenaEvoOf = (cardId) => ({ branch: '', t1: false, t2: false, ...(economyState?.arenaEvo?.[cardId] || {}) });
const arenaEvoPathCost = (tierIdx) => (tierIdx === 1 ? ARENA_EVO_T1 : ARENA_EVO_T2);
const arenaRelicOwned = (relicId) => (economyState?.arenaRelics || []).includes(relicId);
const arenaRelicEquippedOn = (cardId) => economyState?.arenaRelicEquips?.[cardId] || '';

/* Glifo vetorial (SVG) por categoria — sem emojis na Arena */
const ARENA_CATEGORY_GLYPHS = { dano: 'arena-sword', dano_fogo: 'arena-flame', dano_agua: 'arena-droplet', dano_ar: 'arena-wind', dano_terra: 'arena-mountain', cura: 'arena-heart', defesa: 'arena-shield', defesa_magica: 'arena-shield-mag', invocacao: 'arena-moon', estrutura: 'arena-tower' };
const arenaCatGlyphId = (catId) => ARENA_CATEGORY_GLYPHS[catId] || 'arena-swords';
const arenaCatIconSVG = (catId, size = 16) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><use href="#${arenaCatGlyphId(catId)}"></use></svg>`;
const arenaHexIconSVG = (size = 12) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><use href="#arena-hex"></use></svg>`;

/* ============ ARENA 2.0 — Traços de efeito (10 por categoria · 100 no total) ============
   Cada carta forjada escolhe UM traço. O traço define a mecânica; a Evolução (patamares)
   muda a mecânica de novo por cima. Traço ausente (cartas antigas) = traço 1 da categoria. */
const ARENA_EFFECTS = {
    dano: [
        { id: 'golpe_sombrio', name: 'Golpe Sombrio', desc: (b) => `Causa ${b} de dano físico + Sangramento 2/turno (2 turnos, ignora escudos) e deixa um Resquício no campo.`, mech: { bleed: { dmg: 2, turns: 2 } } },
        { id: 'lamina_sangrenta', name: 'Lâmina Sangrenta', desc: (b) => `Causa ${b} de dano físico + Sangramento 4/turno (2 turnos, ignora escudos) e deixa um Resquício.`, mech: { bleed: { dmg: 4, turns: 2 } } },
        { id: 'estocada_perfurante', name: 'Estocada Perfurante', desc: (b) => `Causa ${b} de dano físico e ATRAVESSA o escudo físico, indo direto na vida + Sangramento.`, mech: { piercePhys: true, bleed: { dmg: 2, turns: 2 } } },
        { id: 'danca_lascas', name: 'Dança das Lascas', desc: (b) => `Dois golpes de ${Math.max(1, Math.round(b * 0.6))} cada (total ${Math.max(1, Math.round(b * 0.6)) * 2}) + Sangramento.`, mech: { hits: 2, hitPct: 0.6, bleed: { dmg: 2, turns: 2 } } },
        { id: 'sentenca', name: 'Sentença do Pai', desc: (b) => `Causa ${b} de dano físico; contra alvo com 25% de vida ou menos, +60% (${Math.round(b * 1.6)}) + Sangramento.`, mech: { doubleIfLowHp: 0.6, bleed: { dmg: 2, turns: 2 } } },
        { id: 'laceracao', name: 'Laceração Cruel', desc: (b) => `Causa ${b} de dano físico; o Sangramento causa o DOBRO contra alvo com 50% de vida ou menos.`, mech: { bleed: { dmg: 2, turns: 2, vsWounded: true } } },
        { id: 'fonte_carmesim', name: 'Fonte Carmesim', desc: (b) => `Causa ${b} de dano físico e VOCÊ SE CURA 50% do que causou + Sangramento.`, mech: { healOnDmgPct: 0.5, bleed: { dmg: 2, turns: 2 } } },
        { id: 'aniquilar', name: 'Aniquilar', desc: (b) => `Causa ${Math.round(b * 0.6)} de dano físico (−40%) que IGNORA Espinhos e Esquiva do alvo. Sem Sangramento.`, mech: { dmgMult: 0.6, ignoreThorns: true, ignoreDodge: true, bleed: false } },
        { id: 'furia_tropeiro', name: 'Fúria do Tropeiro', desc: (b) => `Causa ${b} de dano físico + 2 por criatura SUA em campo + Sangramento.`, mech: { perAllySummon: 2, bleed: { dmg: 2, turns: 2 } } },
        { id: 'ferida_aberta', name: 'Ferida Aberta', desc: (b) => `Causa ${b} de dano físico + Sangramento 2/turno por 3 turnos; a cada turno que o alvo sangrar, VOCÊ compra 1.`, mech: { bleed: { dmg: 2, turns: 3, draw: true } } }
    ],
    dano_fogo: [
        { id: 'labareda_sol', name: 'Labareda de Sol', desc: (b) => `Causa ${b} de dano de fogo + Queimadura 2/turno (2 turnos) e deixa um Resquício.`, mech: { burn: { dmg: 2, turns: 2 } } },
        { id: 'propagacao', name: 'Propagação', desc: (b) => `Causa ${b} de fogo + Queimadura e ALCANÇA TODAS as criaturas inimigas com 4 de dano.`, mech: { dmgAllCreatures: 4, burn: { dmg: 2, turns: 2 } } },
        { id: 'roubo_chamas', name: 'Roubo de Chamas', desc: (b) => `Causa ${b} de dano de fogo e VOCÊ SE CURA 50% do que causou + Queimadura.`, mech: { healOnDmgPct: 0.5, burn: { dmg: 2, turns: 2 } } },
        { id: 'combustao', name: 'Combustão', desc: (b) => `Causa ${b} de fogo + Queimadura; contra alvo SEM NENHUM escudo, o dano é DOBRADO (${b * 2}).`, mech: { doubleIfNoShields: 1, burn: { dmg: 2, turns: 2 } } },
        { id: 'brasa_eterna', name: 'Brasa Eterna', desc: (b) => `Causa ${b} de fogo; a Queimadura NÃO EXPIRA enquanto você tiver uma Estrutura em campo.`, mech: { burn: { dmg: 2, turns: 2, eternal: true } } },
        { id: 'marca_cinza', name: 'Marca de Cinza', desc: (b) => `Causa ${b} de fogo; cada turno que o alvo queimar, a Queimadura ganha +2 (até +6).`, mech: { burn: { dmg: 2, turns: 2, mark: 0 } } },
        { id: 'chama_perfurante', name: 'Chama Perfurante', desc: (b) => `Causa ${b} de fogo ATRAVESSANDO o escudo mágico (Barreira ainda funciona) + Queimadura.`, mech: { pierceMag: true, burn: { dmg: 2, turns: 2 } } },
        { id: 'inferno_crescente', name: 'Inferno Crescente', desc: (b) => `Causa ${b} de fogo; contra alvo JÁ EM CHAMAS, +60% (${Math.round(b * 1.6)}) + Queimadura.`, mech: { burningMult: 0.6, burn: { dmg: 2, turns: 2 } } },
        { id: 'chama_purificadora', name: 'Chama Purificadora', desc: (b) => `Causa ${b} de fogo + Queimadura e REMOVE a sua ferida (Sangramento e Queimadura de você).`, mech: { clearWound: true, burn: { dmg: 2, turns: 2 } } },
        { id: 'chama_vingativa', name: 'Chama Vingativa', desc: (b) => `Causa ${b} de fogo + Queimadura; se VOCÊ estiver ferido, +60% (${Math.round(b * 1.6)}).`, mech: { wrathMult: 0.6, burn: { dmg: 2, turns: 2 } } }
    ],
    dano_agua: [
        { id: 'mare_mansa', name: 'Maré Mansa', desc: (b) => `Rói 3 de escudo mágico e causa ${b} de água + deixa um Resquício.`, mech: { erodeMag: 3 } },
        { id: 'erosao_total', name: 'Erosão Total', desc: (b) => `Rói 3 de escudo mágico E 3 de escudo físico; causa ${b} de água.`, mech: { erodeMag: 3, erodePhys: 3 } },
        { id: 'corrente_absorvente', name: 'Corrente Absorvente', desc: (b) => `Rói 3 de escudo mágico (+${b} de água) e você GANHA escudo mágico igual ao total corroído.`, mech: { erodeMag: 3, absorbEroded: true } },
        { id: 'encharcar', name: 'Encharcar', desc: (b) => `Rói 3 de escudo mágico, causa ${b} de água e o alvo FICA ATORDOADO (não compra no próximo turno).`, mech: { erodeMag: 3, stun: 1 } },
        { id: 'ressaca', name: 'Ressaca', desc: (b) => `Rói 3 de escudo mágico, causa ${b} de água; contra alvo JÁ ATORDOADO, +50% (${Math.round(b * 1.5)}).`, mech: { erodeMag: 3, doubleIfStunned: 0.5 } },
        { id: 'fissura', name: 'Fissura', desc: (b) => `Rói 3 de escudo mágico, causa ${b} de água; metade do dano IGNORA o escudo mágico.`, mech: { erodeMag: 3, pierceHalf: true } },
        { id: 'transbordar', name: 'Transbordar', desc: (b) => `Rói 3 de escudo mágico e causa ${b} de água; com escudos do alvo ZERADOS, também atinge TODAS as criaturas inimigas (5).`, mech: { erodeMag: 3, allIfNoShieldsCreatures: 5 } },
        { id: 'maremoto', name: 'Maremoto', desc: (b) => `Rói 3 de escudo mágico e causa ${b} de água +20% por criatura SUA em campo.`, mech: { erodeMag: 3, summonDmgPct: 0.2 } },
        { id: 'abraco_sal', name: 'Abraço de Sal', desc: (b) => `Rói 3 de escudo mágico, causa ${b} de água e você ganha 6 de escudo mágico.`, mech: { erodeMag: 3, shieldMagFlat: 6 } },
        { id: 'correnteza_profunda', name: 'Correnteza Profunda', desc: (b) => `Rói 6 (o DOBRO) de escudo mágico e causa ${b} de água.`, mech: { erodeMag: 6 } }
    ],
    dano_ar: [
        { id: 'rajada_sertaneja', name: 'Rajada Sertaneja', desc: (b) => `Causa ${b} DIRETO na vida (ignora escudos) + atordoa (rival não compra no próximo turno) + Resquício.`, mech: { stun: 1 } },
        { id: 'turbilhao', name: 'Turbilhão', desc: (b) => `Causa ${b} direto na vida + atordoa por 2 TURNOS (o rival não compra duas vezes).`, mech: { stun: 2 } },
        { id: 'impeto', name: 'Ímpeto', desc: (b) => `Causa ${b} direto na vida + atordoa; contra alvo JÁ ATORDOADO, o golpe é DOBRADO (${b * 2}).`, mech: { stun: 1, doubleIfStunned: 1 } },
        { id: 'fio_cortante', name: 'Fio Cortante', desc: (b) => `Causa ${b} direto na vida + 1 por carta na MÃO DO RIVAL + atordoa.`, mech: { stun: 1, perHandFoe: 1 } },
        { id: 'desarmar', name: 'Desarmar', desc: (b) => `Causa ${b} direto na vida + ATORDOA e ARRANCA 1 carta aleatória da mão do rival.`, mech: { stun: 1, discardFoeRandom: true } },
        { id: 'corte_esquiva', name: 'Corte Esquivado', desc: (b) => `Causa ${b} direto na vida + atordoa e VOCÊ GANHA Esquiva (−50% no próximo dano físico recebido).`, mech: { stun: 1, dodge: 0.5 } },
        { id: 'faseamento', name: 'Faseamento', desc: (b) => `Causa ${b} direto na vida + atordoa e VOCÊ FICA INTANGÍVEL (Esquiva anula 100% do próximo dano físico).`, mech: { stun: 1, dodge: 1 } },
        { id: 'relampeio', name: 'Relampeio', desc: (b) => `Causa ${Math.round(b * 1.8)} direto na vida (+80%!) mas NÃO atordoa.`, mech: { stun: 0, dmgMult: 1.8 } },
        { id: 'vendaval_ascendente', name: 'Vendaval Ascendente', desc: (b) => `Causa ${b} direto na vida e VOCÊ COMPRA 2 cartas.`, mech: { stun: 0, drawOnPlay: 2 } },
        { id: 'olho_tormento', name: 'Olho do Tormento', desc: (b) => `Causa ${b} direto na vida + atordoa e VOCÊ SE CURA 4.`, mech: { stun: 1, healFlat: 4 } }
    ],
    dano_terra: [
        { id: 'monolito', name: 'Monólito', desc: (b) => `Causa ${b} de dano de terra + 2 de muralha física; a residência FICA NO CAMPO (+2 dano em golpes de terra).`, mech: {} },
        { id: 'nucleo_granito', name: 'Núcleo de Granito', desc: (b) => `Causa ${b} de terra + 4 de muralha; a residência FICA NO CAMPO (+2).`, mech: { wallBonus: 2 } },
        { id: 'pele_pedra', name: 'Pele de Pedra', desc: (b) => `Causa ${b} de terra + muralha física DOBRADA (4); a residência FICA NO CAMPO.`, mech: { wallDouble: true } },
        { id: 'raizes_profundas', name: 'Raízes Profundas', desc: (b) => `Causa ${b} de terra + 2 de muralha; a residência FICA NO CAMPO e você CURA 2 no início de cada turno.`, mech: { rootsHeal: true } },
        { id: 'cataclisma', name: 'Cataclisma', desc: (b) => `Causa ${b} de terra + atinge TODAS as criaturas inimigas com 5 de dano + residência no campo.`, mech: { dmgAllCreatures: 5 } },
        { id: 'trincamento', name: 'Linha de Trincamento', desc: (b) => `Causa ${b} de terra; o golpe causa o DOBRO contra criaturas e estruturas + residência no campo.`, mech: { trincamento: true } },
        { id: 'aura_sismica', name: 'Aura Sísmica', desc: (b) => `Causa ${b} de terra + 2 de muralha; a residência é AMPLIFICADA (+4 de dano em golpes de terra).`, mech: { residenceAura: 4 } },
        { id: 'terremoto_maior', name: 'Terremoto Maior', desc: (b) => `Causa ${Math.round(b * 1.3)} de terra (+30%!) + 2 de muralha; a residência FICA NO CAMPO.`, mech: { dmgMult: 1.3 } },
        { id: 'abraco_terra', name: 'Abraço da Terra', desc: (b) => `Causa ${b} de terra + 2 de muralha e VOCÊ SE CURA 5; a residência FICA NO CAMPO.`, mech: { healFlat: 5 } },
        { id: 'montanha_inabalavel', name: 'Montanha Inabalável', desc: (b) => `Causa ${b} de terra + 5 de muralha (3+2) e +3 de escudo físico EXTRA; a residência FICA NO CAMPO.`, mech: { wallBonus: 3, shieldPhysFlat: 3 } }
    ],
    cura: [
        { id: 'bencao_sertao', name: 'Benção do Sertão', desc: (b) => `Restaura ${b} de vida (excedente vira 50% escudo mágico); a residência FICA NO CAMPO (+2 vida/turno).`, mech: {} },
        { id: 'vitalidade', name: 'Vitalidade', desc: (b) => `Restaura ${b} de vida + 4 por criatura SUA em campo; a residência FICA NO CAMPO.`, mech: { healPerSummon: 4 } },
        { id: 'segundo_folego', name: 'Segundo Fôlego', desc: (b) => `Restaura ${b} de vida; o EXCEDENTE vira escudo mágico na taxa de 100%; a residência FICA NO CAMPO.`, mech: { overflowAll: true } },
        { id: 'refletir_energia', name: 'Refletir Energia', desc: (b) => `Restaura ${b} de vida; o excedente vira METADE escudo físico e METADE mágico; a residência FICA NO CAMPO.`, mech: { overflowSplit: true } },
        { id: 'couraca_vital', name: 'Couraça Vital', desc: (b) => `Restaura ${b} de vida; o excedente vira uma BARREIRA de 30%; a residência FICA NO CAMPO.`, mech: { overflowBarrier: 0.3 } },
        { id: 'limpeza', name: 'Limpeza', desc: (b) => `Restaura ${b} de vida e ESTANCA a sua ferida (remove Sangramento e Queimadura); a residência FICA NO CAMPO.`, mech: { clearWound: true } },
        { id: 'santidade', name: 'Santidade', desc: (b) => `Restaura TODA a vida (você volta ao máximo sempre); a residência FICA NO CAMPO.`, mech: { fullHeal: true } },
        { id: 'oracao_aco', name: 'Oração de Aço', desc: (b) => `Restaura ${Math.round(b / 2)} de vida (metade), mas você ganha 6 de escudo físico; a residência FICA NO CAMPO.`, mech: { healMult: 0.5, shieldPhysFlat: 6 } },
        { id: 'milagre_menor', name: 'Milagre Menor', desc: (b) => `Restaura ${b} de vida — DOBRADA se você estiver com 30% de vida ou menos; a residência FICA NO CAMPO.`, mech: { lowHpDouble: true } },
        { id: 'oracao_constante', name: 'Oração Constante', desc: (b) => `Restaura ${b} de vida + 3 de escudo físico E 3 de escudo mágico; a residência FICA NO CAMPO.`, mech: { healPhys: 3, healMag: 3 } }
    ],
    defesa: [
        { id: 'bastiao_sertao', name: 'Bastião do Sertão', desc: (b) => `+${b} de escudo físico + Espinhos 4 (2 turnos); a residência FICA NO CAMPO (+1 escudo/turno).`, mech: {} },
        { id: 'espinhos_duraveis', name: 'Espinhos Duradouros', desc: (b) => `+${b} de escudo físico + Espinhos 4 que duram 3 TURNOS; a residência FICA NO CAMPO.`, mech: { thornsTurns: 3 } },
        { id: 'espinhos_totais', name: 'Espinhos Totais', desc: (b) => `+${b} de escudo físico + Espinhos que refletem também dano MÁGICO; a residência FICA NO CAMPO.`, mech: { thornsReflectiveMagic: true } },
        { id: 'riposta', name: 'Riposta', desc: (b) => `+${b} de escudo físico + Espinhos; ao refletir, você COMPRA 1 carta; a residência FICA NO CAMPO.`, mech: { thornsRiposte: true } },
        { id: 'martir_ferro', name: 'Mártir de Ferro', desc: (b) => `+${b} de escudo físico + Espinhos; cada reflexão te CURA 4; a residência FICA NO CAMPO.`, mech: { thornsMartyr: true } },
        { id: 'baluarte', name: 'Baluarte', desc: (b) => `+${b} de escudo físico + Espinhos e você fica IMUNE a dano físico até o seu próximo turno; a residência FICA NO CAMPO.`, mech: { dodge: 1 } },
        { id: 'muro_perfeito', name: 'Muro Perfeito', desc: (b) => `+${b} de escudo físico + Espinhos que causam 50% a MAIS e perfuram Barreiras; a residência FICA NO CAMPO.`, mech: { thornsDirect: true } },
        { id: 'muralha_cinzas', name: 'Muralha de Cinzas', desc: (b) => `+${b + 4} de escudo físico (o base SOMA 4) + Espinhos; a residência FICA NO CAMPO.`, mech: { shieldPhysFlat: 4 } },
        { id: 'fortaleza_viva', name: 'Fortaleza Viva', desc: (b) => `+${b} de escudo físico + Espinhos; as pedras te CURAM 4; a residência FICA NO CAMPO.`, mech: { healFlat: 4 } },
        { id: 'defesa_disciplinar', name: 'Defesa Disciplinada', desc: (b) => `+${b} de escudo físico + Espinhos; o rival PERDE 2 de escudo físico; a residência FICA NO CAMPO.`, mech: { shaveFoePhys: 2 } }
    ],
    defesa_magica: [
        { id: 'veu_orvalho', name: 'Véu de Orvalho', desc: (b) => `+${b} de escudo mágico + Barreira (−25%, 2 cargas); a residência FICA NO CAMPO (+1 escudo mágico/turno).`, mech: {} },
        { id: 'barreira_total', name: 'Barreira Total', desc: (b) => `+${b} de escudo mágico + Barreira cuja PRIMEIRA carga absorve 100%; a residência FICA NO CAMPO.`, mech: { wardFirstFull: true } },
        { id: 'santuario', name: 'Santuário', desc: (b) => `+${b} de escudo mágico + Barreira; enquanto você tiver Barreira, NÃO PODE SER ATORDOADO; a residência FICA NO CAMPO.`, mech: { wardNoStun: true } },
        { id: 'transubstanciacao', name: 'Transubstanciação', desc: (b) => `+${b} de escudo mágico + Barreira; 50% do dano ABSORVIDO é DEVOLVIDO a quem lançou; a residência FICA NO CAMPO.`, mech: { wardReflectBack: true } },
        { id: 'descarga', name: 'Descarga', desc: (b) => `+${b} de escudo mágico + Barreira; se a sua Barreira for ZERADA, o rival estoura em chamas (Queimadura 4); a residência FICA NO CAMPO.`, mech: { wardOnBreak: true } },
        { id: 'afinidade_eterea', name: 'Afinidade Etérea', desc: (b) => `+${b} de escudo mágico + Barreira; no início do turno você ganha +2 de escudo mágico por Véu no campo; a residência FICA NO CAMPO.`, mech: { afinidade: true } },
        { id: 'apice', name: 'Ápice', desc: (b) => `+${b} de escudo mágico + Barreira; enquanto você tiver Barreira, cura 3 no início do turno; a residência FICA NO CAMPO.`, mech: { apice: true } },
        { id: 'veu_profundo', name: 'Véu Profundo', desc: (b) => `+${b} de escudo mágico + Barreira REFORÇADA (−40%, 2 cargas); a residência FICA NO CAMPO.`, mech: { wardPct: 0.4 } },
        { id: 'muralha_astral', name: 'Muralha Astral', desc: (b) => `+${b} de escudo mágico + Barreira com 3 CARGAS (−25% cada); a residência FICA NO CAMPO.`, mech: { wardCharges: 3 } },
        { id: 'veu_espelho', name: 'Véu Espelhado', desc: (b) => `+${b + 3} de escudo mágico (base SOMA 3) + Barreira; a residência FICA NO CAMPO.`, mech: { shieldMagFlat: 3 } }
    ],
    invocacao: [
        { id: 'invocar_alvorada', name: 'Invocar Alvorada', desc: (b, p) => `Invoca uma criatura (poder ${p}, 3 turnos, ${2 + p} de vida) que golpeia ~${p * 2}/turno no início dos seus turnos.`, mech: {} },
        { id: 'carga_imediata', name: 'Carga Imediata', desc: (b, p) => `Invoca a criatura E ela ataca AGORA, com metade da força (${p}).`, mech: { immediateAtkPct: 0.5 } },
        { id: 'furia_primordial', name: 'Fúria Primordial', desc: (b, p) => `Invoca uma criatura cujo golpe IGNORA o escudo físico.`, mech: { fury: true } },
        { id: 'enxame', name: 'Enxame', desc: () => `Invoca 2 criaturas MENORES (poder 2, 2 turnos) em vez de uma. Requer 2 espaços na frente.`, mech: { summonCount: 2, summonPower: 2, summonTurns: 2 } },
        { id: 'vinculo_vital', name: 'Vínculo Vital', desc: (b, p) => `Invoca uma criatura; toda vez que ela golpear, você cura 2.`, mech: { healMe: true } },
        { id: 'persistencia', name: 'Persistência', desc: (b, p) => `Invoca uma criatura que dura 5 TURNOS (+2).`, mech: { persistTurns: 2 } },
        { id: 'ultimo_suspiro', name: 'Último Suspiro', desc: (b, p) => `Invoca uma criatura; ao expirar, ela EXPLODE: 6 direto na vida do rival.`, mech: { deathburst: 6 } },
        { id: 'invocacao_tatica', name: 'Invocação Tática', desc: (b, p) => `Invoca uma criatura com +2 de PODER (poder ${p + 2}).`, mech: { powBonus: 2 } },
        { id: 'pacto_sombra', name: 'Pacto de Sombra', desc: (b, p) => `Você PERDE 3 de vida e invoca uma criatura cujo golpe causa o DOBRO (${p * 4}).`, mech: { shadowPactHp: 3, strikeMult: 2 } },
        { id: 'pacto_reforco', name: 'Pacto de Reforço', desc: (b, p) => `Invoca sua criatura E um reforço menor (poder 2, 2 turnos). Requer 2 espaços na frente.`, mech: { extraSmallSummon: true } }
    ],
    estrutura: [
        { id: 'torre_vigia', name: 'Torre Vigia', desc: (b, p) => `Imediato ${Math.max(1, Math.round(p * 2) + 1)} + tick ${Math.max(1, Math.round(p))}/turno e cura 1/turno; 8 de vida; fica na retaguarda (máx. 4).`, mech: {} },
        { id: 'sobrecarga', name: 'Sobrecarga', desc: (b, p) => `Imediato ${Math.max(1, Math.round(p * 2) + 1)} + tick ${Math.max(1, Math.round(p))}/turno e CURA +3 por turno (em vez de 1); 8 de vida.`, mech: { genHeal: 3 } },
        { id: 'nucleo_genese', name: 'Núcleo de Gênese', desc: (b, p) => `Imediato ${Math.max(1, Math.round(p * 2) + 1)} + tick ${Math.max(1, Math.round(p))}/turno, cura 1 e a torre GERA 2 de escudo mágico por turno; 8 de vida.`, mech: { genMag: 2 } },
        { id: 'bombardeio', name: 'Bombardeio', desc: (b, p) => `Imediato ${Math.max(1, Math.round(p * 2) + 1)} + tick ${Math.max(1, Math.round(p))}/turno; a cada turno, atinge 3 de TODAS as criaturas inimigas; 8 de vida.`, mech: { bombardCreatures: 3 } },
        { id: 'mina_terrestre', name: 'Mina Terrestre', desc: (b, p) => `Imediato ${Math.max(1, Math.round(p * 2) + 1)} + tick ${Math.max(1, Math.round(p))}/turno ATRAVESSANDO o escudo mágico; cura 1; 8 de vida.`, mech: { pierceMagTick: true } },
        { id: 'ultimo_recurso', name: 'Último Recurso', desc: (b, p) => `Imediato ${Math.max(1, Math.round(p * 2) + 1)} + tick ${Math.max(1, Math.round(p))}/turno: DOBRADO enquanto você tiver 20 de vida ou menos; 8 de vida.`, mech: { desperationDouble: true } },
        { id: 'baluarte_vivo', name: 'Baluarte Vivo', desc: (b, p) => `Imediato ${Math.max(1, Math.round(p * 2) + 1)} + tick ${Math.max(1, Math.round(p))}/turno; enquanto a torre existir, seu escudo físico +4 por turno; 8 de vida.`, mech: { bulwark: 4 } },
        { id: 'torre_devastadora', name: 'Torre Devastadora', desc: (b, p) => `Imediato ${Math.round((Math.max(1, Math.round(p * 2) + 1)) * 1.5)} (+50%!) + tick ${Math.max(1, Math.round(p))}/turno; cura 1; 8 de vida.`, mech: { structImmediateMult: 1.5 } },
        { id: 'fortaleza_montanha', name: 'Fortaleza da Montanha', desc: (b, p) => `Imediato ${Math.max(1, Math.round(p * 2) + 1)} + tick ${Math.max(1, Math.round(p))}/turno; a torre tem 14 DE VIDA (o dobro); cura 1.`, mech: { structHpBonus: 6 } },
        { id: 'torre_vampirica', name: 'Torre Vampírica', desc: (b, p) => `Imediato ${Math.max(1, Math.round(p * 2) + 1)} + tick ${Math.max(1, Math.round(p))}/turno; cada tick TE CURA 3; 8 de vida.`, mech: { tickHeal: 3 } }
    ]
};
const ARENA_EFFECT_ORDER = Object.keys(ARENA_EFFECTS);
const arenaEffectSpec = (card) => {
    const list = ARENA_EFFECTS[card?.category];
    if (!list) return null;
    if (card?.effect) { const found = list.find((e) => e.id === card.effect); if (found) return found; }
    return list[0];
};
const arenaEffectDesc = (category, effectId, power) => {
    const list = ARENA_EFFECTS[category];
    if (!list) return '';
    const e = (effectId ? list.find((x) => x.id === effectId) : null) || list[0];
    const p = Math.max(1, Number(power) || 1);
    const base = Math.max(1, Math.round(p * 3) + 2);
    return e.desc(base, p);
};
const arenaTraitName = (category, effectId) => {
    const list = ARENA_EFFECTS[category];
    if (!list) return '';
    return (list.find((x) => x.id === effectId) || list[0]).name;
};

const arenaDeckIds = () => (economyState?.arenaDeck || []).filter((id) => typeof id === 'string');
const arenaTreePts = () => Object.values(economyState?.arenaTree || {}).reduce((a, b) => a + (Number(b) || 0), 0);
const arenaCardsById = () => Object.fromEntries(arenaCards.map((c) => [c.id, c]));

/* Moldura equipada (cosmético de carta) — vale pra TODAS as suas cartas */
function myCardFrame() {
    if (!ECO) return null;
    const id = economyState?.cardFrame;
    if (!id) return null;
    if (!(economyState?.cosmetics || []).includes(id)) return null; // apostado/perdido — não possui mais
    return ECO.CARD_COSMETIC_BY_ID?.[id] || null;
}
function cardFaceHTML(card, { mini = false, extraClass = '', attrs = '', frameOverride = null } = {}) {
    const cat = ECO?.CARD_CATEGORY_BY_ID?.[card.category];
    const frame = frameOverride || myCardFrame();
    const style = frame ? `--f1:${escapeHtml(frame.c1)};--f2:${escapeHtml(frame.c2)}` : '';
    const tintClass = card.category ? `tint-${card.category}` : '';
    const art = sanitizeUrl(card.artUrl || '');
    // Arte: imagem enviada > emblema SVG da categoria (emojis só em cartas antigas)
    const artHtml = art
        ? `<img src="${escapeHtml(art)}" alt="" loading="lazy" onerror="this.remove()">`
        : (card.emoji
            ? `<span class="cf-legacy-emoji">${escapeHtml(card.emoji)}</span>`
            : `<svg class="cf-emblem" viewBox="0 0 24 24" aria-hidden="true"><use href="#${arenaCatGlyphId(card.category)}"></use></svg>`);
    const flavor = card.flavor ? escapeHtml(card.flavor) : '&nbsp;';
    const traitName = card.effect ? arenaTraitName(card.category, card.effect) : '';
    return `<div class="card-face${mini ? ' card-face--mini' : ''} ${tintClass} ${extraClass}" style="${style}" ${attrs}>
        <div class="cf-name">${escapeHtml(card.name || 'Sem nome')}</div>
        <div class="cf-art ${tintClass}">${artHtml}</div>
        ${traitName ? `<div class="cf-effect">${escapeHtml(traitName)}</div>` : ''}
        <div class="cf-flavor">${flavor}</div>
        <div class="cf-bottom">
            <span class="cf-gem cf-cost" title="Custo no deck">${Number(card.cost) || 1}</span>
            <span class="cf-cat">${arenaCatIconSVG(card.category, 12)}${escapeHtml(cat?.word || card.category || '')}</span>
            <span class="cf-gem cf-power" title="Poder do efeito">${Number(card.power) || 1}</span>
        </div>
    </div>`;
}
function arenaCardThumbHTML(c) {
    const tintClass = c.category ? `tint-${c.category}` : '';
    const art = sanitizeUrl(c.artUrl || '');
    const inner = art
        ? `<img src="${escapeHtml(art)}" alt="" loading="lazy" onerror="this.remove()">`
        : (c.emoji
            ? `<span class="arena-legacy-emoji">${escapeHtml(c.emoji)}</span>`
            : `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${arenaCatGlyphId(c.category)}"></use></svg>`);
    return `<span class="arena-deck-thumb ${tintClass}">${inner}</span>`;
}

/* ---------- Deck: estatísticas e validação ---------- */
function arenaDeckStats(ids = arenaDeckIds()) {
    const byId = arenaCardsById();
    let points = 0;
    const counts = {};
    const cards = [];
    for (const id of ids) {
        const c = byId[id];
        if (!c) continue;
        points += Number(c.cost) || 0;
        counts[c.category] = (counts[c.category] || 0) + 1;
        cards.push(c);
    }
    return { points, counts, cards, size: cards.length };
}
function arenaTreeBonusFor(catId, counts = arenaDeckStats().counts, tree = economyState?.arenaTree || {}) {
    const pts = Math.max(0, Number(tree[catId]) || 0);
    const affinity = Number(counts[catId]) || 0;
    const mult = 1 + pts * 0.06 + affinity * 0.02;
    return { pts, affinity, mult, pct: Math.round((mult - 1) * 100) };
}
function validateArenaDeck() {
    const stats = arenaDeckStats();
    if (stats.size < ARENA_DECK_MIN) {
        const missing = arenaDeckIds().length - stats.size;
        const reason = missing > 0
            ? `${missing} carta(s) do seu deck não carregaram — confira se as regras do Firestore foram publicadas`
            : `monte um deck com pelo menos ${ARENA_DECK_MIN} cartas (hoje: ${stats.size})`;
        return { ok: false, reason, ...stats };
    }
    if (stats.points > ARENA_DECK_MAX_POINTS) return { ok: false, reason: `deck com ${stats.points} pts — o limite é ${ARENA_DECK_MAX_POINTS}`, ...stats };
    return { ok: true, ...stats };
}
function arenaTreePointsUsed() { return arenaTreePts(); }

/* ---------- Cartas: CRUD ---------- */
async function loadArenaCards() {
    if (!currentUser) return;
    try {
        const snap = await getDocs(query(collection(db, 'cards'), where('ownerId', '==', currentUser.uid)));
        arenaCards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        arenaCards.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    } catch (err) {
        console.warn('Não consegui carregar suas cartas (rules publicadas?):', err?.message);
        arenaCards = [];
    }
    renderArenaCardsUI();
}
function renderArenaCardsUI() {
    renderArenaDeckPane();
    renderArenaCardsGrid();
    updateArenaDeckCheck();
}
function renderArenaCardsGrid() {
    const grid = $('#arena-cards-grid');
    const countEl = $('#arena-cards-count');
    if (!grid) return;
    if (countEl) countEl.textContent = `${arenaCards.length}/${ARENA_CARD_LIMIT}`;
    const deckSet = new Set(arenaDeckIds());
    grid.innerHTML = arenaCards.length
        ? arenaCards.map((c) => { const evo = arenaEvoOf(c.id); const evoTier = (evo.t1 ? 1 : 0) + (evo.t2 ? 1 : 0); const evoWord = ARENA_EVO[c.category]?.word || 'Evolução'; return `<div class="card-in-grid">
            ${cardFaceHTML(c, { mini: true })}
            <div class="card-in-grid-actions">
                <button class="card-deck-toggle${deckSet.has(c.id) ? ' indk' : ''}" data-arena-deck-toggle="${escapeHtml(c.id)}">${deckSet.has(c.id) ? '✓ No deck' : '+ Deck'}</button>
                <button class="card-upgrade" data-arena-card-upgrade="${escapeHtml(c.id)}" title="Evolução ${escapeHtml(evoWord)}: escolha o caminho e evolua a carta">✦${evoTier > 0 ? `<span class="up-count">${evoTier}</span>` : ''}</button>
                <button class="card-delete" data-arena-card-delete="${escapeHtml(c.id)}" aria-label="Apagar carta" title="Apagar carta"><svg viewBox="0 0 24 24"><use href="#arena-trash"></use></svg></button>
            </div>
        </div>`; }).join('')
        : `<div class="arena-empty">
            <svg viewBox="0 0 24 24"><use href="#arena-cards"></use></svg>
            <b>Nenhuma carta ainda</b>
            <span>Forje sua primeira carta na aba Forja.</span>
            <button class="arena-btn arena-btn-primary arena-btn-sm" data-arena-tab="create" type="button"><svg viewBox="0 0 24 24"><use href="#arena-sparkles"></use></svg>Forjar carta</button>
        </div>`;
}
const arenaNormalizeName = (value = '') => String(value).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
const arenaCollapseSpaces = (value = '') => String(value).replace(/\s+/g, ' ').trim();
async function saveArenaCard() {
    if (!currentUser || arenaSaveBusy) return;
    if (arenaCards.length >= ARENA_CARD_LIMIT) { showToast(`Teto de ${ARENA_CARD_LIMIT} cartas — apague uma pra criar outra.`, 'warn'); return; }
    const name = arenaCollapseSpaces($('#ac-name')?.value || '');
    const flavor = arenaCollapseSpaces($('#ac-flavor')?.value || '').slice(0, 120);
    const rawUrl = ($('#ac-art-url')?.value || '').trim();
    const artUrl = rawUrl ? sanitizeUrl(rawUrl).slice(0, ARENA_ART_MAX) : '';
    const category = $('#ac-category')?.value || 'dano';
    const cost = Math.min(5, Math.max(1, Number(arenaDraft.cost) || 3));
    const power = Math.min(5, Math.max(1, Number(arenaDraft.power) || 3));
    const effect = forgeEffectId(category);
    if (name.length < 3) { showToast('Dê um nome com pelo menos 3 letras.', 'warn'); return; }
    if (rawUrl && !artUrl) { showToast('Esse link de imagem não é válido (use http/https).', 'warn'); return; }
    if (!ECO?.CARD_CATEGORY_BY_ID?.[category]) { showToast('Categoria inválida.', 'error'); return; }
    const dupe = arenaCards.find((c) => arenaNormalizeName(c.name) === arenaNormalizeName(name));
    if (dupe) { showToast(`Você já tem “${dupe.name}”. Escolha outro nome ou apague-a.`, 'warn'); return; }
    const btn = $('#ac-save-btn');
    const label = btn?.querySelector('.btn-label');
    arenaSaveBusy = true;
    if (btn) btn.disabled = true;
    if (label) label.textContent = 'Forjando…';
    try {
        await addDoc(collection(db, 'cards'), {
            ownerId: currentUser.uid,
            ownerName: currentUserProfile.name || 'Usuário',
            ownerAvatar: currentUserProfile.avatarUrl || '',
            name, flavor,
            emoji: '',
            artUrl: artUrl || '',
            category, cost, power, effect,
            createdAt: serverTimestamp()
        });
        showToast(`“${name}” forjada! Boa sorte na Arena.`, 'success', 3500);
        vibrate([12, 40, 12]);
        if ($('#ac-name')) $('#ac-name').value = '';
        if ($('#ac-flavor')) $('#ac-flavor').value = '';
        if ($('#ac-art-url')) $('#ac-art-url').value = '';
        arenaDraft.artUrl = '';
        arenaDraft.cost = 3;
        arenaDraft.power = 3;
        arenaDraft.effect = '';
        arenaSyncPips();
        renderArenaEffectGrid();
        const counter = $('#ac-flavor-count');
        if (counter) counter.textContent = '0/120';
        const clearBtn = $('#ac-art-clear');
        if (clearBtn) clearBtn.hidden = true;
        renderArenaCreatePreview();
        await loadArenaCards();
        setArenaTab('cards');
    } catch (err) {
        console.warn('Falha ao criar carta:', err?.message);
        showToast('Não consegui salvar a carta. Verifique se as rules da Arena foram publicadas.', 'error', 5000);
    } finally {
        arenaSaveBusy = false;
        if (btn) btn.disabled = false;
        if (label) label.textContent = 'Forjar carta';
    }
}
async function deleteArenaCard(id) {
    const card = arenaCards.find((c) => c.id === id);
    const ok = await gvConfirm({ emoji: '🗑️', title: 'Apagar carta?', message: card ? `“${card.name}” será apagada para sempre.` : 'A carta será apagada.', okLabel: 'Apagar' });
    if (!ok) return;
    try {
        await deleteDoc(doc(db, 'cards', id));
    } catch (err) {
        console.warn(err);
        showToast('Não consegui apagar a carta.', 'error'); return;
    }
    const deck = arenaDeckIds().filter((x) => x !== id);
    await saveEconomy({ arenaDeck: deck });
    showToast('Carta apagada.', 'info');
    await loadArenaCards();
}

/* ---------- Deck ---------- */
async function toggleArenaCardInDeck(id) {
    const deck = arenaDeckIds();
    const idx = deck.indexOf(id);
    if (idx >= 0) {
        await saveEconomy({ arenaDeck: deck.filter((x) => x !== id) });
        renderArenaCardsUI();
        return;
    }
    const card = arenaCards.find((c) => c.id === id);
    if (!card) return;
    const stats = arenaDeckStats(deck);
    if (stats.points + (Number(card.cost) || 0) > ARENA_DECK_MAX_POINTS) {
        showToast(`Deck cheio! “${card.name}” custa ${card.cost} pts (${stats.points}/${ARENA_DECK_MAX_POINTS})`, 'warn');
        return;
    }
    await saveEconomy({ arenaDeck: [...deck, id] });
    vibrate(8);
    renderArenaCardsUI();
}
function renderArenaDeckPane() {
    const stats = arenaDeckStats();
    const pts = $('#arena-deck-points');
    if (pts) pts.textContent = String(stats.points);
    const count = $('#arena-deck-count');
    if (count) count.textContent = `${stats.size} carta${stats.size === 1 ? '' : 's'}`;
    const size = $('#arena-deck-size');
    if (size) size.textContent = stats.size ? `${stats.points}/${ARENA_DECK_MAX_POINTS} pts · ${stats.size}` : 'vazio';
    const deckMeter = $('#arena-deck-meter');
    if (deckMeter) deckMeter.style.width = `${Math.min(100, (stats.points / ARENA_DECK_MAX_POINTS) * 100)}%`;
    const list = $('#arena-deck-list');
    if (list) {
        list.innerHTML = stats.cards.length
            ? stats.cards.map((c) => `<button class="arena-deck-row" data-arena-deck-toggle="${escapeHtml(c.id)}" title="Tocar para tirar do deck" aria-label="Remover ${escapeHtml(c.name)} do deck">
                ${arenaCardThumbHTML(c)}
                <span class="arena-deck-info"><span class="arena-deck-name">${escapeHtml(c.name)}</span><span class="arena-deck-meta tint-${escapeHtml(c.category)}">${arenaCatIconSVG(c.category, 12)}<span>${escapeHtml(ECO?.CARD_CATEGORY_BY_ID?.[c.category]?.word || c.category || '')}</span></span></span>
                <span class="arena-deck-cost" title="Custo em pontos do deck">${arenaHexIconSVG()}${Number(c.cost) || 1}</span>
                <span class="arena-deck-remove" aria-hidden="true"><svg viewBox="0 0 24 24"><use href="#arena-minus"></use></svg></span>
            </button>`).join('')
            : `<div class="arena-deck-empty">
                <svg viewBox="0 0 24 24"><use href="#arena-layers"></use></svg>
                <b>Deck vazio</b>
                <span>Monte até ${ARENA_DECK_MAX_POINTS} pontos de cartas na aba Cartas.</span>
                <button class="arena-btn arena-btn-ghost arena-btn-sm" data-arena-tab="cards" type="button"><svg viewBox="0 0 24 24"><use href="#arena-cards"></use></svg>Ver minhas cartas</button>
            </div>`;
    }
    renderArenaTree();
}
function renderArenaTree() {
    const wrap = $('#arena-tree');
    const totalEl = $('#arena-tree-points');
    if (!wrap || !ECO) return;
    const tree = economyState?.arenaTree || {};
    const used = arenaTreePointsUsed();
    if (totalEl) totalEl.textContent = String(used);
    const treeMeter = $('#arena-tree-meter');
    if (treeMeter) treeMeter.style.width = `${Math.min(100, (used / ARENA_TREE_MAX) * 100)}%`;
    const stats = arenaDeckStats();
    wrap.innerHTML = ECO.CARD_CATEGORIES.map((cat) => {
        const bonus = arenaTreeBonusFor(cat.id, stats.counts, tree);
        const pts = bonus.pts;
        const tint = `tint-${cat.id}`;
        return `<div class="arena-tree-row ${tint}${pts > 0 ? ' has-points' : ''}">
            <span class="tree-badge">${arenaCatIconSVG(cat.id, 19)}</span>
            <span class="tree-info">
                <span class="tree-name">${escapeHtml(cat.word)}</span>
                <span class="tree-bonus"><b>+${bonus.pct}%</b> · árvore ${pts} pt${pts === 1 ? '' : 's'} + ${bonus.affinity} carta${bonus.affinity === 1 ? '' : 's'} no deck</span>
            </span>
            <span class="tree-controls">
                <button class="tree-btn" data-arena-tree="${cat.id}" data-delta="-1" ${pts <= 0 ? 'disabled' : ''} aria-label="Tirar 1 ponto de ${escapeHtml(cat.word)}"><svg viewBox="0 0 24 24"><use href="#arena-minus"></use></svg></button>
                <span class="tree-pts">${pts}</span>
                <button class="tree-btn" data-arena-tree="${cat.id}" data-delta="1" ${used >= ARENA_TREE_MAX ? 'disabled' : ''} aria-label="Pôr 1 ponto em ${escapeHtml(cat.word)}"><svg viewBox="0 0 24 24"><use href="#arena-plus"></use></svg></button>
            </span>
        </div>`;
    }).join('');
}
async function adjustArenaTree(catId, delta) {
    if (!economyState) return;
    const tree = { ...(economyState.arenaTree || {}) };
    const cur = Math.max(0, Number(tree[catId]) || 0);
    if (delta > 0 && arenaTreePointsUsed() >= ARENA_TREE_MAX) { showToast(`Árvore cheia! São ${ARENA_TREE_MAX} pontos no total 🌳`, 'warn'); return; }
    const next = Math.max(0, Math.min(ARENA_TREE_MAX, cur + delta));
    if (next === 0) delete tree[catId]; else tree[catId] = next;
    await saveEconomy({ arenaTree: tree });
    renderArenaCardsUI();
}

/* ---------- Loja: cosméticos de carta (molduras) ---------- */
function renderCardCosmeticShop() {
    const grid = $('#card-cosmetic-grid');
    if (!grid || !ECO?.CARD_COSMETICS) return;
    const owned = new Set(economyState?.cosmetics || []);
    const equipped = economyState?.cardFrame || '';
    grid.innerHTML = ECO.CARD_COSMETICS.map((c) => {
        const isOwned = owned.has(c.id);
        const isEquipped = equipped === c.id;
        let btn;
        if (isEquipped) btn = '<button class="cosmetic-buy equipped" disabled>⭐ Em uso</button>';
        else if (isOwned) btn = `<button class="cosmetic-buy owned" data-equip-card-frame="${escapeHtml(c.id)}">🃏 Usar nas cartas</button>`;
        else btn = `<button class="cosmetic-buy" data-buy-card-frame="${escapeHtml(c.id)}">🪙 ${c.price.toLocaleString('pt-BR')}</button>`;
        return `<div class="cosmetic-card" title="${escapeHtml(c.name)} — ${escapeHtml(c.rarityName)}">
            <span class="cosmetic-emoji" style="background:linear-gradient(160deg, ${escapeHtml(c.c1)}, ${escapeHtml(c.c2)});border-radius:14px;display:flex;align-items:center;justify-content:center;width:64px;height:88px;box-shadow:inset 0 0 0 3px rgba(255,255,255,.18), 0 4px 12px rgba(0,0,0,.4);font-size:30px">🃏</span>
            <span class="cosmetic-name">${escapeHtml(c.name)}</span>
            <span class="rarity-chip rarity-${escapeHtml(c.rarity)}">${escapeHtml(c.rarityName)}</span>
            <span class="cosmetic-effect">${escapeHtml(c.desc || '')}</span>
            ${isOwned ? '' : `<span class="cosmetic-price">🪙 ${c.price.toLocaleString('pt-BR')}</span>`}
            ${btn}
        </div>`;
    }).join('');
    renderArenaRelicShop();
}
async function buyCardFrame(id) {
    const c = ECO?.CARD_COSMETIC_BY_ID?.[id];
    if (!c || !economyState) return;
    if (economyState.cosmetics.includes(id)) { showToast('Você já tem essa moldura ✨', 'info'); return; }
    if (economyState.gold < c.price) { showToast(`Falta gold! São ${fmtGold(c.price)} 🪙`, 'warn'); return; }
    addLedger('compra', `Moldura de carta: ${c.name}`, -c.price);
    await saveEconomy({ gold: economyState.gold - c.price, cosmetics: [...economyState.cosmetics, id] });
    vibrate([12, 40, 12]);
    showToast(`🃏 ${c.name} é sua! Equipe pra mudar todas as cartas.`, 'success', 3500);
}
async function equipCardFrame(id) {
    if (!economyState || !ECO?.CARD_COSMETIC_BY_ID?.[id]) return;
    if (!economyState.cosmetics.includes(id)) { showToast('Compre a moldura antes 🪙', 'warn'); return; }
    const next = economyState.cardFrame === id ? '' : id;
    await saveEconomy({ cardFrame: next });
    const c = ECO.CARD_COSMETIC_BY_ID[id];
    showToast(next ? `🃏 Moldura “${c.name}” aplicada em todas as suas cartas!` : 'Moldura guardada de volta.', 'info');
}

/* ---------- Loja: relíquias da Arena (equipam por carta) ---------- */
function renderArenaRelicShop() {
    const grid = $('#arena-relic-grid');
    if (!grid) return;
    if (!ECO?.ARENA_RELICS) { grid.innerHTML = ''; return; }
    const owned = new Set(economyState?.arenaRelics || []);
    grid.innerHTML = ECO.ARENA_RELICS.map((r) => {
        const has = owned.has(r.id);
        return `<div class="cosmetic-card" title="${escapeHtml(r.name)} — ${escapeHtml(r.desc)}">
            <span class="cosmetic-emoji relic-emoji" style="background:radial-gradient(circle at 42% 38%, ${escapeHtml(r.tint)}66, transparent 72%),linear-gradient(160deg,#1e1b4b,#0f172a);border:1px solid ${escapeHtml(r.tint)}55;border-radius:14px;display:flex;align-items:center;justify-content:center;width:64px;height:64px;font-size:32px">${r.emoji}</span>
            <span class="cosmetic-name">${escapeHtml(r.name)}</span>
            <span class="cosmetic-effect">${escapeHtml(r.desc)}</span>
            ${has ? '<span class="cosmetic-price" style="color:#6ee7b7">✓ Sua</span>' : `<span class="cosmetic-price">🪙 ${r.price.toLocaleString('pt-BR')}</span>`}
            ${has
                ? '<button class="cosmetic-buy equipped" disabled>Equipe na Árvore da carta ✦</button>'
                : `<button class="cosmetic-buy" data-buy-arena-relic="${escapeHtml(r.id)}">Comprar 🪙 ${r.price.toLocaleString('pt-BR')}</button>`}
        </div>`;
    }).join('');
}
async function buyArenaRelic(id) {
    const r = ECO?.ARENA_RELIC_BY_ID?.[id];
    if (!r || !economyState) return;
    if (economyState.arenaRelics.includes(id)) { showToast('Você já tem essa relíquia', 'info'); return; }
    if (economyState.gold < r.price) { showToast(`Falta gold! São ${fmtGold(r.price)} 🪙`, 'warn'); return; }
    addLedger('compra', `Relíquia da Arena: ${r.name}`, -r.price);
    await saveEconomy({ gold: economyState.gold - r.price, arenaRelics: [...economyState.arenaRelics, id] });
    vibrate([12, 40, 12]);
    showToast(`${r.emoji} ${r.name} é sua! Equipe na Árvore da carta.`, 'success', 3500);
    renderArenaRelicShop();
    if (arenaCardTreeOpenId) renderCardTreeModal(); // atualiza o gold do modal aberto
}

/* ---------- Evolução da carta (1 caminho por carta, escolhe-se e evolui em 2 patamares) ---------- */
let arenaCardTreeOpenId = null;
const ARENA_EVO_ORDER_SET = new Set(ARENA_EVO_ORDER);
function arenaEvoPathCostFor(tier) { return tier === 1 ? ARENA_EVO_T1 : ARENA_EVO_T2; }
function openCardTreeModal(cardId) {
    arenaCardTreeOpenId = cardId;
    renderCardTreeModal();
    openModal('arena-card-tree-modal');
}
function renderCardTreeModal() {
    const cardId = arenaCardTreeOpenId;
    if (!cardId || !economyState) return;
    const card = (arenaCards || []).find((c) => c.id === cardId);
    if (!card) return;
    const evo = arenaEvoOf(cardId);
    const profile = ARENA_EVO[card.category];
    const relicId = arenaRelicEquippedOn(cardId);
    const setHtml = (sel, html) => { const el = $(sel); if (el) el.innerHTML = html; };
    setHtml('#ctm-face', cardFaceHTML(card, { mini: true }));
    const goldEl = $('#ctm-gold'); if (goldEl) goldEl.textContent = Math.floor(Number(economyState.gold) || 0).toLocaleString('pt-BR');
    const chosen = profile?.branches.find((b) => b.key === evo.branch);
    const tier = (evo.t1 ? 1 : 0) + (evo.t2 ? 1 : 0);
    const relicBit = relicId && ECO?.ARENA_RELIC_BY_ID?.[relicId] ? ` · ${ECO.ARENA_RELIC_BY_ID[relicId].emoji} ${escapeHtml(ECO.ARENA_RELIC_BY_ID[relicId].name)}` : '';
    const invNow = economyState.inv || {};
    const coresT1 = Number(invNow.core_evo) || 0, coresT2 = Number(invNow.core_primus) || 0;
    setHtml('#ctm-cores', `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-sparkles"></use></svg><b>${coresT1}</b> Núcleo · <b>${coresT2}</b> Primordial <span class="ctm-cores-hint">do Baú — forjados na Mesa 🛠️</span>`);
    setHtml('#ctm-summary', `Traço <b>${escapeHtml(profile?.word || card.category)}</b> · Caminho <b>${chosen ? escapeHtml(chosen.name) : 'não traçado'}</b> · Patamar <b>${tier}/2</b>${relicBit}`);
    if (!profile) { setHtml('#ctm-branches', '<p class="muted">Categoria sem evolução definida.</p>'); }
    else {
        const sealed = !!evo.branch;
        setHtml('#ctm-branches', `<div class="evo-head"><span class="evo-style evo-style--${escapeHtml(profile.style)}">${escapeHtml({rajada: 'Estilo Rajada', residencia: 'Estilo Residência', summon: 'Estilo Invocação', estrutura: 'Estilo Estrutura'}[profile.style] || profile.style)}</span><span class="evo-aura">${escapeHtml(profile.aura)}</span></div>`
            + profile.branches.map((b) => {
                const isChosen = evo.branch === b.key;
                const lockedOut = sealed && !isChosen;
                const t1Owned = isChosen && evo.t1;
                const t2Owned = isChosen && evo.t2;
                const t1Cost = ARENA_EVO_T1, t2Cost = ARENA_EVO_T2;
                const gold = Number(economyState.gold) || 0;
                const canT1 = coresT1 >= 1 || gold >= t1Cost;
                const canT2 = coresT2 >= 1 || gold >= t2Cost;
                const t1Pay = coresT1 >= 1 ? '✦ 1 Núcleo' : `🪙 ${t1Cost.toLocaleString('pt-BR')}`;
                const t2Pay = coresT2 >= 1 ? '✦✦ 1 Primordial' : `🪙 ${t2Cost.toLocaleString('pt-BR')}`;
                const t1Disabled = lockedOut || t1Owned || !canT1;
                const t2Disabled = lockedOut || !t1Owned || t2Owned || !canT2;
                const status = lockedOut ? '🔒 selado' : isChosen ? (t2Owned ? '✔ completo' : t1Owned ? 'T1 ✔' : 'traçado') : 'disponível';
                return `<div class="ctm-branch evo-branch${isChosen ? ' is-chosen' : ''}${lockedOut ? ' is-locked' : ''}">
            <div class="ctm-branch-head">
                <span class="ctm-branch-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${escapeHtml(profile.icon)}"></use></svg></span>
                <span class="ctm-branch-title"><b>${escapeHtml(b.name)} <small style="opacity:.6">${escapeHtml(status)}</small></b><span>${escapeHtml(b.tagline)}</span></span>
            </div>
            <div class="evo-tiers">
                <div class="evo-tier${t1Owned ? ' owned' : ''}">
                    <span class="evo-tier-tag">T1 · Patamar 1</span>
                    <b>${escapeHtml(b.t1.name)}</b>
                    <p>${escapeHtml(b.t1.desc)}</p>
                    <button class="ctm-buy${t1Owned ? ' maxed' : ''}" data-arena-evo="${escapeHtml(b.key)}" data-card-id="${escapeHtml(cardId)}" data-tier="1" ${t1Disabled ? 'disabled' : ''}>${t1Owned ? 'Aprendido ✓' : lockedOut ? 'Caminho selado' : evo.branch === '' ? `Traçar caminho — ${t1Pay}` : `Evoluir — ${t1Pay}`}</button>
                </div>
                <div class="evo-tier${t2Owned ? ' owned' : ''}${!t1Owned && !lockedOut ? ' needs-t1' : ''}">
                    <span class="evo-tier-tag">T2 · Patamar 2</span>
                    <b>${escapeHtml(b.t2.name)}</b>
                    <p>${escapeHtml(b.t2.desc)}</p>
                    <button class="ctm-buy${t2Owned ? ' maxed' : ''}" data-arena-evo="${escapeHtml(b.key)}" data-card-id="${escapeHtml(cardId)}" data-tier="2" ${t2Disabled ? 'disabled' : ''}>${t2Owned ? 'Dominado ✓' : lockedOut ? 'Caminho selado' : !t1Owned ? 'Requer T1' : `Evoluir — ${t2Pay}`}</button>
                </div>
            </div>
        </div>`;
            }).join(''));
    }
    const relics = ECO?.ARENA_RELICS || [];
    setHtml('#ctm-relics', relics.map((r) => {
        const owned = (economyState.arenaRelics || []).includes(r.id);
        const equipped = arenaRelicEquippedOn(cardId) === r.id;
        const cls = equipped ? 'ctm-relic equipped' : owned ? 'ctm-relic owned' : 'ctm-relic';
        const action = equipped ? 'EQUIPADA ✓' : owned ? 'EQUIPAR' : `🔒 🪙 ${r.price.toLocaleString('pt-BR')}`;
        return `<button class="${cls}" data-equip-arena-relic="${escapeHtml(r.id)}" data-card-id="${escapeHtml(cardId)}" aria-pressed="${equipped ? 'true' : 'false'}" title="${escapeHtml(r.desc)}">
            <span class="ctm-relic-emoji">${r.emoji}</span>
            <span class="ctm-relic-name">${escapeHtml(r.name)}</span>
            <span class="ctm-relic-desc">${escapeHtml(r.desc)}</span>
            <span class="ctm-relic-action">${action}</span>
        </button>`;
    }).join(''));
}
async function buyArenaEvolution(cardId, branch, tier) {
    if (!economyState) return;
    const card = (arenaCards || []).find((c) => c.id === cardId);
    if (!card) return;
    const profile = ARENA_EVO[card.category];
    const branchDef = profile?.branches.find((b) => b.key === branch);
    if (!branchDef) return;
    const evo = arenaEvoOf(cardId);
    if (evo.branch && evo.branch !== branch) { showToast('O caminho desta carta já foi selado.', 'warn'); return; }
    const t = Number(tier) || 1;
    if (t === 1 && evo.t1) { showToast('Patamar 1 já aprendido.', 'info'); return; }
    if (t === 2 && !evo.t1) { showToast('Aprenda o Patamar 1 primeiro.', 'warn'); return; }
    if (t === 2 && evo.t2) { showToast('Esta carta já dominou o Patamar 2.', 'info'); return; }
    const cost = t === 1 ? ARENA_EVO_T1 : ARENA_EVO_T2;
    const coreId = ARENA_CORE_IDS[t];
    const inv = { ...(economyState.inv || {}) };
    const hasCore = (Number(inv[coreId]) || 0) >= 1;
    if (!hasCore && Number(economyState.gold) < cost) {
        const coreName = t === 1 ? 'Núcleo de Evolução' : 'Núcleo Primordial';
        showToast(`Falta recurso — ${fmtGold(cost)} 🪙 ou 1 ${coreName} (forjado na Mesa de Trabalho)`, 'warn', 4500);
        return;
    }
    if (!evo.branch) {
        const ok = window.confirm(`Traçar o caminho ${branchDef.name} é PERMANENTE para “${card.name}”.\n\nVocê não poderá trocar de caminho depois. Confirmar?`);
        if (!ok) return;
    }
    const next = { branch, t1: true, t2: t === 2 ? true : !!evo.t2 };
    if (hasCore) {
        inv[coreId] = (Number(inv[coreId]) || 0) - 1;
        if (inv[coreId] <= 0) delete inv[coreId];
        const coreName = t === 1 ? 'Núcleo de Evolução' : 'Núcleo Primordial';
        addLedger('craft', `Evolução ${profile.word} · ${branchDef.name} T${t} — ${card.name} (via ${coreName})`, 0);
        await saveEconomy({ inv, arenaEvo: { ...(economyState.arenaEvo || {}), [cardId]: next } });
    } else {
        addLedger('compra', `Evolução ${profile.word} · ${branchDef.name} T${t} — ${card.name}`, -cost);
        await saveEconomy({ gold: economyState.gold - cost, arenaEvo: { ...(economyState.arenaEvo || {}), [cardId]: next } });
    }
    vibrate([12, 25, 12]);
    showToast(t === 1 ? `${branchDef.t1.name} aprendido! ✦` : `${branchDef.t2.name} dominado! ✦✦`, 'success', 2200);
    renderCardTreeModal();
    renderArenaCardsGrid();
}
async function toggleArenaRelicEquip(cardId, relicId) {
    if (!(economyState?.arenaRelics || []).includes(relicId)) { showToast('Compre a relíquia primeiro na Loja 🪙', 'warn'); return; }
    const equips = { ...(economyState.arenaRelicEquips || {}) };
    if (equips[cardId] === relicId) delete equips[cardId]; else equips[cardId] = relicId;
    await saveEconomy({ arenaRelicEquips: equips });
    const r = ECO?.ARENA_RELIC_BY_ID?.[relicId];
    showToast(equips[cardId] ? `${r?.emoji || '✦'} ${r?.name || 'Relíquia'} equipada nesta carta!` : 'Relíquia guardada.', 'success', 2200);
    renderCardTreeModal();
}

/* ---------- Criação de carta: preview ao vivo ---------- */
/* Traço de efeito: 10 sabores por categoria — cada carta forja o seu próprio.
   A descrição é SEMPRE derivada do mech (uma fonte da verdade). */
const forgeEffectId = (category) => {
    const list = ARENA_EFFECTS[category] || [];
    if (arenaDraft.effect && list.some((e) => e.id === arenaDraft.effect)) return arenaDraft.effect;
    return list[0]?.id || '';
};
function renderArenaEffectGrid() {
    const grid = $('#ac-effect-grid');
    if (!grid) return;
    const category = $('#ac-category')?.value || 'dano';
    const list = ARENA_EFFECTS[category] || [];
    const active = forgeEffectId(category);
    arenaDraft.effect = active;
    grid.innerHTML = list.map((e, i) => {
        const on = e.id === active;
        const tip = escapeHtml(arenaEffectDesc(category, e.id, arenaDraft.power));
        return `<button type="button" class="effect-chip${on ? ' is-active' : ''}" role="radio" aria-checked="${on ? 'true' : 'false'}" data-effect="${escapeHtml(e.id)}" title="${tip}"><span class="effect-chip-num">${i + 1}</span><span class="effect-chip-name">${escapeHtml(e.name)}</span></button>`;
    }).join('');
}
function arenaSyncPips() {
    document.querySelectorAll('.arena-pip[data-pip]').forEach((btn) => {
        const group = btn.dataset.pip;
        const value = Number(btn.dataset.value);
        const current = group === 'cost' ? arenaDraft.cost : arenaDraft.power;
        const active = value === current;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}
function arenaSyncCreateFormUI() {
    arenaSyncPips();
    document.querySelectorAll('#ac-effect-grid .effect-chip').forEach((btn) => {
        const on = btn.dataset.effect === arenaDraft.effect;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    const flavor = $('#ac-flavor');
    const counter = $('#ac-flavor-count');
    if (counter) counter.textContent = `${(flavor?.value || '').length}/120`;
    const catNow = $('#ac-category')?.value || 'dano';
    const hint = $('#ac-effect-hint-text');
    if (hint) hint.textContent = arenaEffectDesc(catNow, forgeEffectId(catNow), arenaDraft.power);
    const clearBtn = $('#ac-art-clear');
    if (clearBtn) clearBtn.hidden = !($('#ac-art-url')?.value || arenaDraft.artUrl);
}
function renderArenaCreatePreview() {
    const box = $('#ac-preview');
    if (!box) return;
    arenaSyncCreateFormUI();
    const catSel = $('#ac-category');
    const category = catSel?.value || 'dano';
    const draft = {
        name: ($('#ac-name')?.value || '').trim() || 'Sua carta',
        artUrl: sanitizeUrl(($('#ac-art-url')?.value || '').trim()) || arenaDraft.artUrl || '',
        category,
        cost: arenaDraft.cost,
        power: arenaDraft.power,
        flavor: ($('#ac-flavor')?.value || '').trim(),
        effect: forgeEffectId(category)
    };
    box.outerHTML = cardFaceHTML(draft, { attrs: 'id="ac-preview"' });
}
function fillArenaCategorySelect() {
    const sel = $('#ac-category');
    if (!sel || !ECO?.CARD_CATEGORIES) return;
    sel.innerHTML = ECO.CARD_CATEGORIES.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.word)} — ${escapeHtml(c.desc)}</option>`).join('');
    renderArenaEffectGrid();
}


/* ---------- BATALHA ⚔️ (partida ao vivo no Firestore) ---------- */
const arenaOtherSide = (side) => (side === 'A' ? 'B' : 'A');
const arenaSideField = (side, field) => `${field}${side}`;
const arenaMySideIn = (m) => (m?.playerA === currentUser?.uid ? 'A' : m?.playerB === currentUser?.uid ? 'B' : null);

function arenaShuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function arenaCardSnapshot(c) {
    return { id: c.id, name: c.name || 'Sem nome', emoji: c.emoji || '🃏', artUrl: c.artUrl || '', category: c.category, cost: Number(c.cost) || 1, power: Number(c.power) || 1, flavor: c.flavor || '', effect: c.effect || '' };
}
function arenaDeckSnapshot() {
    const byId = arenaCardsById();
    return arenaDeckIds().map((id) => byId[id]).filter(Boolean).map(arenaCardSnapshot);
}
function arenaCatCounts(cards) {
    const counts = {};
    for (const c of cards) counts[c.category] = (counts[c.category] || 0) + 1;
    return counts;
}
/* Congele a árvore de cada carta + relíquias equipadas DENTRO do doc da partida
   (o cálculo dos efeitos roda no cliente de quem joga a jogada). */
function arenaUpgradeSnapshot(cards) {
    const out = {};
    for (const c of cards) {
        const u = arenaEvoOf(c.id);
        out[c.id] = { branch: u.branch || '', t1: !!u.t1, t2: !!u.t2 };
    }
    return out;
}
function arenaRelicSnapshot(cards) {
    const out = {};
    for (const c of cards) { const r = arenaRelicEquippedOn(c.id); if (r) out[c.id] = r; }
    return out;
}
/* Leitura no documento da partida — quem age calcula com o que está aqui */
const arenaUpgInMatch = (m, side, cardId) => (m?.[`upg${side}`] || {})[cardId] || { branch: '', t1: false, t2: false };
const arenaRelicInMatch = (m, side, cardId) => (m?.[`relics${side}`] || {})[cardId] || '';
/* Multiplicadores finais de uma jogada: Refúgio (+6%/ponto de árvore) · Afinidade (+2%/carta do ramo) · Orbe de Poder (+20%) */
function arenaCombatMult(m, side, card) {
    const upg = arenaUpgInMatch(m, side, card.id);
    const ref = (Number(m?.[`tree${side}`]?.[card.category]) || 0) * 0.06;
    const aff = (Number(m?.[`catCount${side}`]?.[card.category]) || 0) * 0.02;
    const relic = arenaRelicInMatch(m, side, card.id);
    const pow = (1 + (relic === 'relic_orbe' ? 0.20 : 0));
    return { mult: 1 + ref + aff, pow, evo: upg, eco: 0, relic };
}
function arenaMultOf(match, side, catId) {
    const tree = match?.[`tree${side}`] || {};
    const counts = match?.[`catCount${side}`] || {};
    return 1 + (Number(tree[catId]) || 0) * 0.06 + (Number(counts[catId]) || 0) * 0.02;
}
const arenaAbsorb = (shield, dmg) => {
    const absorbed = Math.min(Math.max(0, shield), dmg);
    return { shieldLeft: Math.max(0, shield - absorbed), rest: dmg - absorbed };
};
const arenaEffectBase = (power) => Math.round(power * 3) + 2;

function arenaMatchCardName(m, side) {
    return side === 'A' ? (m.playerAName || 'Jogador A') : (m.playerBName || 'Jogador B');
}
function arenaLogPush(m, entries) {
    const log = [...(m.log || []), ...entries].slice(-8);
    return log;
}

/* Aplica os efeitos de início de turno do lado `side` sobre o match (cópia rasa já feita pelo chamador).
   Retorna novas arrays de field/hand/deck + hp dos DOIS lados + logs. */
function arenaStartOfTurnPatch(m, side) {
    const foe = arenaOtherSide(side);
    const hpFoeKey = arenaSideField(foe, 'hp');
    const hpMeKey = arenaSideField(side, 'hp');
    const fieldKey = arenaSideField(side, 'field');
    const handKey = arenaSideField(side, 'hand');
    const deckKey = arenaSideField(side, 'deck');
    const shieldFoeKey = arenaSideField(foe, 'shield');
    const shieldMeKey = arenaSideField(side, 'shield');
    const log = [];
    let hpFoe = Number(m[hpFoeKey]) || ARENA_HP;
    let hpMe = Number(m[hpMeKey]) || ARENA_HP;
    const shieldFoe = { ...(m[shieldFoeKey] || { phys: 0, mag: 0 }) };
    const shieldMe = { ...(m[shieldMeKey] || { phys: 0, mag: 0 }) };
    const meName = arenaMatchCardName(m, side);
    const foeNameHere = arenaMatchCardName(m, foe);
    const foeHandKeyS = arenaSideField(foe, 'hand');
    const foeDeckKeyS = arenaSideField(foe, 'deck');
    const extraPatch = {}; // patches condicionais (descarte reembaralhado / ferida aberta)
    let foeFieldWork = null; // cópia mutável do campo inimigo (dano de criaturas-combate e bombardeio)
    const foeFieldKeyX = arenaSideField(foe, 'field');
    const hasResidence = (trait) => (m[fieldKey] || []).some((u) => u.kind === 'residence' && u.trait === trait);
    const residenceCount = (trait) => (m[fieldKey] || []).filter((u) => u.kind === 'residence' && u.trait === trait).length;

    // 1) Dano ao longo do tempo // sem changelog: Sangramento real não dispara Espinhos (é ferida, não golpe)
    const dotKey = arenaSideField(side, 'dot');
    const dot = m[dotKey];
    let dotNext = dot && (Number(dot.turns) || 0) > 0 ? { ...dot } : null;
    const hasStructure = (m[fieldKey] || []).some((u) => u.kind === 'structure');
    if (dotNext) {
        let dmg = Math.max(1, Number(dotNext.dmg) || 0);
        if (dotNext.type === 'burn') dmg += Math.min(6, Number(dotNext.mark) || 0);
        if (dotNext.vsWounded && hpMe / ARENA_HP <= 0.5) dmg *= 2;
        const left = (Number(dotNext.turns) || 0) - 1;
        if (dotNext.detonateFinal && left === 0) dmg *= 2;
        hpMe -= dmg;
        const label = dotNext.type === 'burn' ? 'queimadura' : 'sangramento';
        log.push(`${dotNext.type === 'burn' ? '🔥' : '🩸'} ${meName} sofreu ${dmg} de ${label} (${left} turno${left === 1 ? '' : 's'} restante)`);
        if (dotNext.type === 'burn' && dotNext.mark !== undefined) dotNext = { ...dotNext, mark: Math.min(6, (Number(dotNext.mark) || 0) + 2) };
        if (dotNext.detonateFinal && left === 0) log.push(`💀 Corrupção Necrótica: a ferida detonou por ${dmg}`);
        if (dotNext.draw && left > 0) {
            let fDeck = [...(m[foeDeckKeyS] || [])];
            const fHand = [...(m[foeHandKeyS] || [])];
            if (fDeck.length && fHand.length < 5) { fHand.push(fDeck[0]); fDeck = fDeck.slice(1); extraPatch[foeDeckKeyS] = fDeck; extraPatch[foeHandKeyS] = fHand; log.push(`🃏 Ferida Aberta: ${foeNameHere} comprou 1 carta`); }
        }
        if (left > 0) dotNext = { ...dotNext, turns: left };
        else if (dotNext.type === 'burn' && dotNext.eternal && hasStructure) { dotNext = { ...dotNext, turns: 2 }; log.push('🔥 Brasa Eterna: a queimadura se renova (estrutura em campo)'); }
        else dotNext = null;
    }

    const thornsKey = arenaSideField(side, 'thorns');
    const thorns = m[thornsKey];
    let thornsNext = thorns && (Number(thorns.turns) || 0) > 0 ? { ...thorns, turns: (Number(thorns.turns) || 0) - 1 } : null;
    if (thorns && thornsNext && thornsNext.turns === 0) { thornsNext = null; log.push(`🛡️ Os Espinhos de ${meName} se apagaram`); }

    // Esquiva (Ar Cortante t1): decai no início do seu turno
    const dodgeKey = arenaSideField(side, 'dodge');
    const dodge = Number(m[dodgeKey]) ? m[dodgeKey] : null;

    let foeCreatureHit = 0;
    const field = [];
    for (const unit of m[fieldKey] || []) {
        const u = { ...unit };
        if (u.kind === 'summon') {
            const mult = arenaMultOf(m, side, 'invocacao');
            const dmg = Math.max(1, Math.round((Number(u.power) || 1) * 2 * mult * Math.max(1, Number(u.strikeMult) || 1)));
            const foeThorns = m[arenaSideField(foe, 'thorns')];
            if (foeFieldWork === null) foeFieldWork = [...(m[foeFieldKeyX] || [])];
            const targetIdx = foeFieldWork.findIndex((fu) => fu.kind === 'summon');
            if (targetIdx >= 0) {
                // Combate entre criaturas (o rival revida!)
                const t = { ...foeFieldWork[targetIdx] };
                const back = Math.max(1, Math.round((Number(t.power) || 1) * 2 * arenaMultOf(m, foe, 'invocacao') * Math.max(1, Number(t.strikeMult) || 1)));
                t.hp = (Number(t.hp) || (2 + (Number(t.power) || 1))) - dmg;
                u.hp = (Number(u.hp) || (2 + (Number(u.power) || 1))) - back;
                log.push(`⚔️ ${u.emoji || '🗿'} ${u.name} golpeou ${t.name} por ${dmg} (revide de ${back})`);
                if (u.healMe) { hpMe = Math.min(ARENA_HP, hpMe + 2); log.push('💚 Vínculo Vital: +2 de vida'); }
                if (t.hp <= 0) { foeFieldWork.splice(targetIdx, 1); log.push(`💥 ${t.name} foi destruída no confronto!`); }
                else foeFieldWork[targetIdx] = t;
                if (u.hp <= 0) { log.push(`💥 ${u.name} foi destruída no confronto!`); continue; }
            } else if (u.fury) { hpFoe -= dmg; log.push(`${u.emoji || '🗿'} ${meName}: ${u.name} atravessou o escudo físico por ${dmg}`); }
            else {
                const { shieldLeft, rest } = arenaAbsorb(shieldFoe.phys, dmg);
                shieldFoe.phys = shieldLeft;
                hpFoe -= rest;
                log.push(`${u.emoji || '🗿'} ${meName}: ${u.name} golpeou por ${dmg} (${rest} na vida)`);
            }
            if (u.healMe && targetIdx < 0) { hpMe = Math.min(ARENA_HP, hpMe + 2); log.push('💚 Vínculo Vital: +2 de vida'); }
            if (foeThorns && (Number(foeThorns.turns) || 0) > 0 && dmg > 0 && !u.fury && targetIdx < 0) {
                const back = Math.max(1, Number(foeThorns.amount) || 0);
                hpMe -= back;
                log.push(`🛡️ Os Espinhos de ${foeNameHere} devolvem ${back} em ${meName}`);
            }
            u.turnsLeft = (Number(u.turnsLeft) || ARENA_TOKEN_TURNS) - 1;
            if (u.turnsLeft > 0) field.push(u);
            else {
                if (u.deathburst) { hpFoe -= 6; log.push(`💥 ${u.name} explode: 6 direto na vida de ${foeNameHere}`); }
                log.push(`⏳ ${u.name} se desfez`);
            }
        } else if (u.kind === 'structure') {
            const hpBet = Number(m[hpMeKey]) || ARENA_HP;
            const lowHp = hpBet <= 20 && u.desperation;
            const dmg = Math.max(1, Math.round((Number(u.tick) || 1) * (lowHp ? 2 : 1)));
            if (u.pierceMag) { hpFoe -= dmg; log.push(`🏗️ ${meName}: ${u.name} atravessou o escudo mágico por ${dmg}`); }
            else {
                const { shieldLeft, rest } = arenaAbsorb(shieldFoe.mag, dmg);
                shieldFoe.mag = shieldLeft;
                hpFoe -= rest;
                log.push(`🏗️ ${meName}: ${u.name} causou ${dmg} de dano`);
            }
            const heal = Math.max(0, Number(u.heal) || 0);
            if (heal > 0) hpMe = Math.min(ARENA_HP, hpMe + heal);
            if (Number(u.tickHeal) > 0) hpMe = Math.min(ARENA_HP, hpMe + Number(u.tickHeal));
            if (u.genMagic) shieldMe.mag = Math.min(ARENA_SHIELD_MAX, shieldMe.mag + 2);
            if (u.bombard) foeCreatureHit = (foeCreatureHit || 0) + 3;
            field.push(u);
        } else if (u.kind === 'resquicio') {
            const left = (Number(u.turnsLeft) || 0) - 1;
            if (left > 0) field.push({ ...u, turnsLeft: left });
            else log.push(`🌫️ ${u.name} se dissipou`);
        } else {
            field.push(u); // residências permanecem
        }
    }

    // 3a) Bombardeio acumulado: acerta criaturas inimigas (usa o working copy, se já existe)
    if (foeCreatureHit > 0) {
        if (foeFieldWork === null) foeFieldWork = [...(m[foeFieldKeyX] || [])];
        const bombed = [];
        for (const fu of foeFieldWork) {
            if (fu.kind === 'summon') {
                const hpLeft = (Number(fu.hp) || (2 + (Number(fu.power) || 1))) - foeCreatureHit;
                if (hpLeft <= 0) { log.push(`💥 Bombardeio destruiu ${fu.name}!`); continue; }
                bombed.push({ ...fu, hp: hpLeft });
            } else bombed.push({ ...fu });
        }
        foeFieldWork = bombed;
    }

    // 3) Auras das residências e estruturas (side começa o turno com elas)
    const bless = residenceCount('cura');
    if (bless > 0) { hpMe = Math.min(ARENA_HP, hpMe + 2 * bless); log.push(`💚 Bênção: +${2 * bless} de vida (aura)`); }
    const bastion = residenceCount('defesa');
    if (bastion > 0) { shieldMe.phys = Math.min(ARENA_SHIELD_MAX, shieldMe.phys + bastion); }
    const veilUnits = (m[fieldKey] || []).filter((u) => u.kind === 'residence' && u.trait === 'defesa_magica');
    const veil = veilUnits.length;
    if (veil > 0) { shieldMe.mag = Math.min(ARENA_SHIELD_MAX, shieldMe.mag + veil); }
    const afinity = veilUnits.filter((u) => u.afinidade).length;
    if (afinity > 0) { shieldMe.mag = Math.min(ARENA_SHIELD_MAX, shieldMe.mag + 2 * afinity); log.push(`✨ Afinidade Etérea: +${2 * afinity} de escudo mágico`); }
    const wardSelf = m[arenaSideField(side, 'ward')];
    if (wardSelf && Number(wardSelf.charges) > 0 && wardSelf.apice) { hpMe = Math.min(ARENA_HP, hpMe + 3); log.push('✨ Ápice: +3 de vida (você tem Barreira)'); }
    const bulwarkCount = (m[fieldKey] || []).filter((u) => u.kind === 'structure' && u.bulwark).length;
    if (bulwarkCount > 0) { shieldMe.phys = Math.min(ARENA_SHIELD_MAX, shieldMe.phys + 4 * bulwarkCount); log.push(`🧱 Baluarte Vivo: +${4 * bulwarkCount} de escudo físico`); }
    const roots = residenceCount('dano_terra') > 0;
    if (roots && (m[fieldKey] || []).some((u) => u.kind === 'residence' && u.trait === 'dano_terra' && u.roots)) { hpMe = Math.min(ARENA_HP, hpMe + 2); }

    // 4) Compra — atordoamento
    const skipKey = arenaSideField(side, 'skipDraw');
    const skipObj = m[skipKey];
    let skipTurns = typeof skipObj === 'object' && skipObj ? Number(skipObj.turns) || 0 : Number(skipObj) || 0;
    const hand = [...(m[handKey] || [])];
    let deck = [...(m[deckKey] || [])];
    if (skipTurns > 0) {
        skipTurns -= 1;
        log.push(`🌪️ ${meName} foi atordoado e não comprou carta (${skipTurns} turno${skipTurns === 1 ? '' : 's'} restante)`);
    } else {
        if (deck.length === 0) {
            const discKey = arenaSideField(side, 'discard');
            const disc = [...(m[discKey] || [])];
            if (disc.length > 0) {
                for (let i = disc.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = disc[i]; disc[i] = disc[j]; disc[j] = tmp; }
                deck = disc;
                extraPatch[discKey] = [];
                log.push('🔀 O monte acabou — o descarte foi reembaralhado');
            }
        }
        while (hand.length < 5 && deck.length) {
            hand.push(deck[0]);
            deck = deck.slice(1);
        }
    }

    const patch = {
        [hpMeKey]: hpMe,
        [shieldMeKey]: shieldMe,
        [fieldKey]: field,
        [handKey]: hand,
        [deckKey]: deck,
        [shieldFoeKey]: shieldFoe,
        [hpFoeKey]: hpFoe,
        [dotKey]: dotNext && (Number(dotNext.turns) || 0) > 0 ? dotNext : null,
        [thornsKey]: thornsNext,
        [skipKey]: skipTurns > 0 ? { turns: skipTurns } : null,
        [dodgeKey]: null,
        ...extraPatch
    };
    if (foeFieldWork !== null) patch[foeFieldKeyX] = foeFieldWork;
    return { patch, log, hpFoe, hpMe, foe };
}

function arenaFinishPatch(m, winnerUid, logEntries) {
    return {
        status: 'finished',
        winner: winnerUid,
        finishedAt: serverTimestamp(),
        log: arenaLogPush(m, logEntries)
    };
}

/* Joga uma carta da mão (transação) */
async function playArenaCard(cardId) {
    if (!currentUser || !arenaOpenMatchId) return;
    const matchId = arenaOpenMatchId;
    try {
        await runTransaction(db, async (tx) => {
            const mRef = doc(db, 'arena_matches', matchId);
            const snap = await tx.get(mRef);
            const m = snap.data();
            if (!m || m.status !== 'active') throw new Error('A partida não está ativa.');
            const side = arenaMySideIn(m);
            if (!side) throw new Error('Você não faz parte desta partida.');
            if (m.turn !== side) throw new Error('Ainda não é seu turno.');
            const foe = arenaOtherSide(side);
            const handKey = arenaSideField(side, 'hand');
            const hand = [...(m[handKey] || [])];
            const idx = hand.findIndex((c) => c.id === cardId);
            if (idx < 0) throw new Error('Carta não está na sua mão.');
            const card = hand[idx];
            const cat = ECO?.CARD_CATEGORY_BY_ID?.[card.category];
            if (!cat) throw new Error('Categoria desconhecida.');
            const { mult, pow, evo, relic } = arenaCombatMult(m, side, card);
            const eff = Number(card.power) * mult * pow;
            const meName = arenaMatchCardName(m, side);
            const foeName = arenaMatchCardName(m, foe);
            const evoBranch = evo.branch || '';
            const evoT1 = !!evo.t1;
            const evoT2 = !!evo.t2;
            const hasB = (b) => evoBranch === b;
            const upg = (b, t) => hasB(b) && (t === 1 ? evoT1 : evoT2);
            const SPEC = arenaEffectSpec(card)?.mech || {};
            const myDotNow = m[arenaSideField(side, 'dot')];
            // EVO por cima do traço (sem multiplicar duas vezes): Vendaval T2 e Ressaca T2 usam o mesmo gatilho
            const EFF = { ...SPEC };
            if (upg('vendaval', 2)) EFF.doubleIfStunned = Math.max(Number(EFF.doubleIfStunned) || 0, 1);
            if (upg('sedada', 2)) EFF.doubleIfStunned = Math.max(Number(EFF.doubleIfStunned) || 0, 0.5);
            const patch = {};
            const log = [];
            let hpMe = Number(m[arenaSideField(side, 'hp')]) || ARENA_HP;
            let hpFoe = Number(m[arenaSideField(foe, 'hp')]) || ARENA_HP;
            const shieldMe = { ...(m[arenaSideField(side, 'shield')] || { phys: 0, mag: 0 }) };
            const shieldFoe = { ...(m[arenaSideField(foe, 'shield')] || { phys: 0, mag: 0 }) };
            const wardFoe = { ...(m[arenaSideField(foe, 'ward')] || { pct: 0, charges: 0 }) };
            const dotFoeBase = m[arenaSideField(foe, 'dot')] || null;
            let dotFoeNext = dotFoeBase && Number(dotFoeBase.turns) > 0 ? { ...dotFoeBase } : null;
            const skipFoeBase = m[arenaSideField(foe, 'skipDraw')];
            let skipFoeNext = typeof skipFoeBase === 'object' && skipFoeBase ? { ...skipFoeBase } : (Number(skipFoeBase) ? { turns: Number(skipFoeBase) } : null);
            const foeHandKey = arenaSideField(foe, 'hand');
            const foeHandCount = (m[foeHandKey] || []).length;
            const myHandCount = hand.length;
            const fieldKey = arenaSideField(side, 'field');
            const field = [...(m[fieldKey] || [])];
            const summons = field.filter((u) => u.kind === 'summon').length;
            const backline = field.filter((u) => u.kind === 'structure' || u.kind === 'residence').length;
            const sideDeckKey = arenaSideField(side, 'deck');
            let sideDeck = [...(m[sideDeckKey] || [])];
            const drawForMe = (n = 1) => {
                let drew = 0;
                while (drew < n && hand.length < 5) {
                    if (sideDeck.length === 0) {
                        const dKey = arenaSideField(side, 'discard');
                        const disc = [...(m[dKey] || [])];
                        if (disc.length === 0) break;
                        for (let i = disc.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = disc[i]; disc[i] = disc[j]; disc[j] = tmp; }
                        sideDeck = disc;
                        patch[dKey] = [];
                        log.push('🔀 O monte acabou — o descarte foi reembaralhado');
                    }
                    hand.push(sideDeck[0]); sideDeck = sideDeck.slice(1); drew += 1;
                }
                if (drew > 0) patch[sideDeckKey] = sideDeck;
                return drew;
            };
            const foeFieldKey = arenaSideField(foe, 'field');
            const curFoeField = () => patch[foeFieldKey] || m[foeFieldKey] || [];
            const dmgCreatures = (dmg, { doubleIfTrincamento = false } = {}) => {
                if (!(dmg > 0) && !doubleIfTrincamento) return 0;
                const mul = doubleIfTrincamento ? 2 : 1;
                const foeField = [];
                let hit = 0;
                for (const fu of curFoeField()) {
                    if (fu.kind === 'summon') {
                        const hpLeft = (Number(fu.hp) || (2 + (Number(fu.power) || 1))) - dmg * mul;
                        hit += 1;
                        if (hpLeft <= 0) { log.push(`💥 ${meName} destruiu ${fu.name}!`); continue; }
                        foeField.push({ ...fu, hp: hpLeft });
                    } else foeField.push({ ...fu });
                }
                patch[foeFieldKey] = foeField;
                return hit;
            };
            const dmgStructures = (dmg, mul = 1) => {
                const foeField = [...curFoeField()];
                const out = [];
                for (const fu of foeField) {
                    if (fu.kind === 'structure') {
                        const hpLeft = (Number(fu.hp) || 8) - dmg * mul;
                        if (hpLeft <= 0) { log.push(`💥 ${meName} DESTRUIU a estrutura ${fu.name}!`); continue; }
                        out.push({ ...fu, hp: hpLeft });
                    } else out.push({ ...fu });
                }
                patch[foeFieldKey] = out;
            };
            const terraResidenceAura = () => field.filter((u) => u.kind === 'residence' && u.trait === 'dano_terra').reduce((acc, u) => acc + (Number(u.aura) || 2), 0);
            const stunnedNow = !!(skipFoeNext && Number(skipFoeNext.turns) > 0);
            const foeWardNoStun = wardFoe.charges > 0 && !!wardFoe.noStun;

            /* Escudos/condições de ambos os lados */
            const reflectFoeThorns = (dmg, src) => {
                const foeThorns = m[arenaSideField(foe, 'thorns')];
                if (!(foeThorns && Number(foeThorns.turns) > 0) || dmg <= 0) return;
                if (src === 'mag' && !foeThorns.reflectiveMagic) return;
                let back = Math.max(1, Number(foeThorns.amount) || 0);
                if (foeThorns.direct) back = Math.floor(back * 1.5);
                hpMe -= back;
                log.push(`🛡️ Os Espinhos de ${foeName} devolvem ${back} em ${meName}`);
                if (foeThorns.riposte) { const drew = drawForMe(1); if (drew) log.push('🃏 Riposta: você compra 1 carta'); }
                if (foeThorns.martyr) { hpMe = Math.min(ARENA_HP, hpMe + 4); log.push('🩸 Mártir de Ferro: +4 de vida'); }
            };
            const dealPhys = (dmg, { pierce = false, ignoreThorns = false, ignoreDodge = false } = {}) => {
                const foeDodge = m[arenaSideField(foe, 'dodge')];
                if (!ignoreDodge && foeDodge && Number(foeDodge.pct) > 0) {
                    const pct = Math.min(1, Number(foeDodge.pct));
                    const reduced = Math.round(dmg * (1 - pct));
                    log.push(`💨 Esquiva de ${foeName}: ${dmg} → ${reduced}`);
                    dmg = reduced;
                }
                if (pierce) { hpFoe -= dmg; log.push(`🏹 Golpe atravessou o escudo físico (${dmg} direto na vida)`); }
                else {
                    const { shieldLeft, rest } = arenaAbsorb(shieldFoe.phys, dmg);
                    shieldFoe.phys = shieldLeft; hpFoe -= rest;
                }
                if (!ignoreThorns) reflectFoeThorns(dmg, 'phys');
                return dmg;
            };
            const dealMag = (dmg, { ignoreBarrier = false, ignoreShield = false } = {}) => {
                let amount = dmg;
                if (!ignoreBarrier && wardFoe.charges > 0) {
                    const firstFull = wardFoe.firstFull && Number(wardFoe.charges) === 2 ? 1 : (Number(wardFoe.pct) || 0);
                    amount = Math.max(0, Math.round(dmg * (1 - firstFull)));
                    const absorbed = dmg - amount;
                    if (wardFoe.reflectBack && absorbed > 0) { hpMe -= Math.round(absorbed * 0.5); log.push(`🔮 Transubstanciação: ${Math.round(absorbed * 0.5)} de dano devolvido a ${meName}`); }
                    wardFoe.charges = Math.max(0, (Number(wardFoe.charges) || 0) - 1);
                    if (wardFoe.charges === 0 && wardFoe.onBreak) { patch[arenaSideField(side, 'dot')] = { dmg: 4, turns: 2, type: 'burn' }; log.push(`💥 Descarga: a Barreira de ${foeName} estourou — Queimadura 4 em ${meName}`); }
                    log.push(`🔮 Barreira de ${foeName} absorveu parte do dano mágico (${dmg} → ${amount})`);
                }
                if (ignoreShield) { hpFoe -= amount; reflectFoeThorns(amount, 'mag'); return amount; }
                const { shieldLeft, rest } = arenaAbsorb(shieldFoe.mag, amount);
                shieldFoe.mag = shieldLeft; hpFoe -= rest;
                reflectFoeThorns(amount, 'mag');
                return rest;
            };
            const addDotFoe = (dmg, type, extra) => {
                let turns = 2;
                if (type === 'bleed' && hasB('amputar') && evoT1) turns += 1;
                if (!dotFoeNext || (Number(dotFoeNext.dmg) || 0) <= dmg) dotFoeNext = { dmg, turns, type, ...(extra || {}) };
                else dotFoeNext = { ...dotFoeNext, turns: Math.max(turns, Number(dotFoeNext.turns) || 0), ...(extra || {}) };
            };
            const addThornsMe = (amount, { reflectiveMagic = false, direct = false, riposte = false, martyr = false, turns = 2 } = {}) => {
                const bestTurns = (hasB('fortaleza') && evoT1 ? 3 : turns);
                patch[arenaSideField(side, 'thorns')] = { amount, turns: bestTurns, reflectiveMagic, direct, riposte, martyr };
            };
            const addWardMe = (pct) => {
                const payload = { pct, charges: 2 };
                if (hasB('prisao') && evoT1) payload.firstFull = true;
                if (hasB('reflexao') && evoT1) payload.reflectBack = true;
                if (hasB('reflexao') && evoT2) payload.onBreak = true;
                if (hasB('prisao') && evoT2) payload.noStun = true;
                if (hasB('santuario') && evoT2) payload.apice = true;
                patch[arenaSideField(side, 'ward')] = payload;
            };
            const mainAmountOf = () => Math.max(1, Math.round(eff * 3) + 2);
            const healSelf = (n) => { hpMe = Math.min(ARENA_HP, hpMe + n); return n; };
            const relicNote = () => { if (relic === 'relic_escama') { shieldMe.phys = Math.min(ARENA_SHIELD_MAX, shieldMe.phys + 4); log.push(`🛡️ Escama de Aço: +4 de escudo físico para ${meName}`); } if (relic === 'relic_sifao') { const h = healSelf(Math.max(1, Math.round(mainAmountOf() * 0.25))); log.push(`🩸 Sifão de Sangue: ${meName} se cura ${h}`); } };
            const relicEcho = (primaryFn, primary) => { if (relic === 'relic_eco') { const echo = Math.max(1, Math.round(primary * 0.4)); primaryFn(echo); log.push(`🐚 Eco Arcano: efeito disparou de novo (${echo})`); } };
            const spawnResquicio = () => {
                field.push({ kind: 'resquicio', uid: `rq_${Date.now()}_${Math.floor(Math.random() * 1e6)}`, name: card.name, emoji: card.emoji || '🌫️', trait: card.category, turnsLeft: ARENA_RESQ_TURNS });
            };
            const spawnResidence = (trait, extra) => {
                field.push({ kind: 'residence', uid: `res_${Date.now()}_${Math.floor(Math.random() * 1e6)}`, name: card.name, emoji: card.emoji || '✨', trait, turnsLeft: 999, ...(extra || {}) });
            };
            const tryStunFoe = (turns) => {
                if (foeWardNoStun) { log.push(`🛕 Santuário de ${foeName}: o atordoamento foi anulado`); return; }
                skipFoeNext = { turns: Math.max(Number(skipFoeNext?.turns) || 0, turns) };
            };
            const tryResidence = (trait, extra) => {
                if (backline >= ARENA_BACK_MAX) throw new Error(`Retaguarda cheia (máx. ${ARENA_BACK_MAX}).`);
                spawnResidence(trait, extra);
            };

            const dmgBase = Math.max(1, Math.round(eff * 3) + 2);
            const applyCondMults = (dmg) => {
                if (EFF.doubleIfLowHp && hpFoe / ARENA_HP <= (EFF.lowHpThresh ?? 0.25)) dmg *= (1 + EFF.doubleIfLowHp);
                if (EFF.doubleIfStunned && stunnedNow) dmg *= (1 + EFF.doubleIfStunned);
                if (EFF.doubleIfNoShields && shieldFoe.phys <= 0 && shieldFoe.mag <= 0) dmg *= (1 + (EFF.doubleIfNoShields ?? 1));
                if (EFF.burningMult && dotFoeNext && dotFoeNext.type === 'burn') dmg *= (1 + EFF.burningMult);
                if (EFF.wrathMult && myDotNow && (Number(myDotNow.turns) || 0) > 0) dmg *= (1 + EFF.wrathMult);
                if (EFF.perHandFoe) dmg += EFF.perHandFoe * foeHandCount;
                if (EFF.perHandMe) dmg += EFF.perHandMe * Math.max(0, myHandCount - 1);
                if (EFF.perAllySummon) dmg += EFF.perAllySummon * summons;
                if (EFF.summonDmgPct) dmg *= (1 + EFF.summonDmgPct * summons);
                return dmg;
            };
            switch (cat.kind) {
                case 'physical': {
                    const pierce = SPEC.piercePhys || upg('estocada', 1);
                    const strikeOnce = (pct) => {
                        let dmg = Math.max(1, Math.round(dmgBase * (SPEC.dmgMult || 1) * pct));
                        if (upg('execucao', 1) && hpFoe / ARENA_HP <= 0.25) dmg = Math.round(dmg * 1.6);
                        dmg = Math.round(applyCondMults(dmg));
                        dealPhys(dmg, { pierce, ignoreThorns: SPEC.ignoreThorns, ignoreDodge: SPEC.ignoreDodge });
                        return dmg;
                    };
                    const hits = SPEC.hits === 2 ? [SPEC.hitPct || 0.6, SPEC.hitPct || 0.6] : [1];
                    const dealt = hits.map((pct) => strikeOnce(pct));
                    const total = dealt.reduce((a, b) => a + b, 0);
                    if (upg('estocada', 2)) dmgCreatures(4);
                    if (SPEC.healOnDmgPct) healSelf(Math.round(total * SPEC.healOnDmgPct));
                    const bleedExtra = {};
                    if (upg('execucao', 2)) bleedExtra.vsWounded = true;
                    if (upg('amputar', 2)) bleedExtra.detonateFinal = true;
                    const bleedSpec = SPEC.bleed === false ? null : (SPEC.bleed || { dmg: 2, turns: 2 });
                    if (bleedSpec) addDotFoe(bleedSpec.dmg, 'bleed', { ...bleedSpec, ...bleedExtra });
                    spawnResquicio();
                    log.push(`🗡️ ${meName} usou ${card.name}: ${hits.length > 1 ? `${dealt.join(' + ')} = ` : ''}${total} de dano físico${pierce ? ' (atravessou o escudo)' : ''}${bleedSpec ? ' + Sangramento' : ''}`);
                    relicEcho(dealPhys, total);
                    break;
                }
                case 'magic': {
                    if (card.category === 'dano_fogo') {
                        const ignoreShield = SPEC.pierceMag || upg('labareda', 1);
                        let dmg = Math.max(1, Math.round(dmgBase * (SPEC.dmgMult || 1)));
                        if (upg('labareda', 2) && shieldFoe.mag <= 0 && shieldFoe.phys <= 0) dmg *= 2;
                        dmg = Math.round(applyCondMults(dmg));
                        dealMag(dmg, { ignoreShield });
                        const burnSpec = SPEC.burn === false ? null : (SPEC.burn || { dmg: 2, turns: 2 });
                        const burnExtra = { ...(burnSpec || {}) };
                        if (upg('incendio', 2)) burnExtra.eternal = true;
                        if (upg('tormento', 2)) burnExtra.mark = 0;
                        if (burnSpec) addDotFoe(burnSpec.dmg ?? 2, 'burn', burnExtra);
                        if (upg('incendio', 1)) dmgCreatures(4);
                        if (SPEC.healOnDmgPct) healSelf(Math.round(dmg * SPEC.healOnDmgPct));
                        if (upg('tormento', 1)) healSelf(Math.round(dmg * 0.5));
                        spawnResquicio();
                        log.push(`🔥 ${meName} usou ${card.name}: ${dmg} de dano de fogo${ignoreShield ? ' (atravessou o escudo)' : ''}${burnSpec ? ' + Queimadura' : ''}`);
                        relicEcho(dealMag, dmg);
                    } else if (card.category === 'dano_agua') {
                        const erodeMag = SPEC.erodeMag ?? 3, erodePhys = SPEC.erodePhys || (upg('diluvio', 1) ? 3 : 0);
                        const beforeMag = shieldFoe.mag, beforePhys = shieldFoe.phys;
                        shieldFoe.mag = Math.max(0, shieldFoe.mag - erodeMag);
                        if (erodePhys) shieldFoe.phys = Math.max(0, shieldFoe.phys - erodePhys);
                        const corroded = (beforeMag - shieldFoe.mag) + (beforePhys - shieldFoe.phys);
                        if ((SPEC.absorbEroded || upg('diluvio', 2)) && corroded > 0) { shieldMe.mag = Math.min(ARENA_SHIELD_MAX, shieldMe.mag + corroded); log.push(`🌊 Absorver a Corrente: +${corroded} de escudo mágico`); }
                        if (SPEC.stun) tryStunFoe(SPEC.stun);
                        else if (upg('sedada', 1)) tryStunFoe(1);
                        let dmg = Math.max(1, Math.round(dmgBase * (SPEC.dmgMult || 1)));
                        dmg = Math.round(applyCondMults(dmg));
                        const halfPierce = (SPEC.pierceHalf || upg('marebaxa', 1)) ? Math.round(dmg / 2) : 0;
                        const rest = dealMag(dmg - halfPierce);
                        if (halfPierce) { hpFoe -= halfPierce; log.push(`🌊 Fissura: ${halfPierce} ignorou o escudo mágico`); }
                        if ((upg('marebaxa', 2) || SPEC.allIfNoShieldsCreatures) && shieldFoe.mag <= 0 && shieldFoe.phys <= 0) dmgCreatures(SPEC.allIfNoShieldsCreatures || 5);
                        spawnResquicio();
                        log.push(`💧 ${meName} usou ${card.name}: Erosão ${erodeMag} no escudo mágico${erodePhys ? ` + ${erodePhys} no físico` : ''} + ${dmg} de água`);
                        relicEcho(dealMag, dmg - halfPierce);
                    } else if (card.category === 'dano_ar') {
                        let amount = Math.max(1, Math.round(dmgBase * (SPEC.dmgMult || 1)));
                        if (upg('laminas', 1)) amount += foeHandCount;
                        amount = applyCondMults(amount);
                        amount = Math.max(1, Math.round(amount));
                        hpFoe -= amount;
                        let stunTurns = SPEC.stun !== undefined ? SPEC.stun : (upg('vendaval', 1) ? 2 : 1);
                        if (upg('vendaval', 1)) stunTurns = Math.max(stunTurns, 2);
                        if (stunTurns > 0) tryStunFoe(stunTurns);
                        const dodgePct = SPEC.dodge !== undefined ? SPEC.dodge : ((upg('arcort', 1) || upg('arcort', 2)) ? (upg('arcort', 2) ? 1 : 0.5) : null);
                        if (dodgePct !== null) patch[arenaSideField(side, 'dodge')] = { pct: dodgePct };
                        if (SPEC.discardFoeRandom || upg('laminas', 2)) {
                            const foeHand = [...(m[foeHandKey] || [])];
                            if (foeHand.length) { const dropIdx = Math.floor(Math.random() * foeHand.length); const dropped = foeHand.splice(dropIdx, 1)[0]; patch[foeHandKey] = foeHand; log.push(`🌪️ Desarmar arrancou “${dropped?.name || 'uma carta'}” da mão de ${foeName}`); }
                        }
                        spawnResquicio();
                        log.push(`🌪️ ${meName} usou ${card.name}: ${amount} direto na vida${stunnedNow ? ' (o rival estava atordoado!)' : ''}`);
                        relicEcho((n) => { hpFoe -= n; }, amount);
                    } else if (card.category === 'dano_terra') {
                        const auraBonus = terraResidenceAura();
                        const trincamento = SPEC.trincamento || upg('demolicao', 2);
                        let dmg = Math.max(1, Math.round(dmgBase * (SPEC.dmgMult || 1))) + auraBonus;
                        dmg = Math.round(applyCondMults(dmg));
                        const rest = dealMag(dmg);
                        if (upg('demolicao', 1)) dmgCreatures(5);
                        if (trincamento) { dmgCreatures(dmg, { doubleIfTrincamento: true }); dmgStructures(dmg, 2); }
                        let wall = 2 + (upg('monolito', 1) ? 2 : 0) + (SPEC.wallBonus || 0);
                        if (upg('abundancia', 1) || SPEC.wallDouble) wall *= 2;
                        shieldMe.phys = Math.min(ARENA_SHIELD_MAX, shieldMe.phys + wall);
                        tryResidence('dano_terra', { roots: upg('abundancia', 2) || SPEC.rootsHeal, aura: SPEC.residenceAura || (upg('monolito', 2) ? 4 : 2) });
                        log.push(`🪨 ${meName} usou ${card.name}: ${dmg} de dano de terra (${rest} na vida) + ${wall} de muralha${auraBonus ? ` (aura +${auraBonus})` : ''}`);
                        relicEcho(dealMag, dmg);
                    } else {
                        const rest = dealMag(dmgBase);
                        log.push(`${cat.emoji} ${meName} usou ${card.name}: ${dmgBase} de dano mágico (${rest} na vida)`);
                        relicEcho(dealMag, dmgBase);
                    }
                    break;
                }
                case 'heal': {
                    let heal = dmgBase;
                    if (EFF.healMult) heal = Math.max(1, Math.round(heal * EFF.healMult));
                    if (upg('purificacao', 2) || EFF.fullHeal) heal = ARENA_HP;
                    if (upg('renovacao', 1)) heal += 4 * summons;
                    if (EFF.healPerSummon) heal += EFF.healPerSummon * summons;
                    if (EFF.lowHpDouble && hpMe / ARENA_HP <= 0.3) heal *= 2;
                    const before = hpMe;
                    hpMe = Math.min(ARENA_HP, hpMe + heal);
                    const overflow = Math.max(0, before + heal - ARENA_HP);
                    if (overflow > 0) {
                        if (upg('espelho', 2) || EFF.overflowBarrier) { addWardMe(upg('espelho', 2) ? 0.30 : (EFF.overflowBarrier || 0.30)); log.push('🔮 Couraça Vital: o excedente virou Barreira de 30%'); }
                        else {
                            const rate = (upg('renovacao', 2) || EFF.overflowAll) ? 1 : 0.5;
                            const toShield = Math.round(overflow * rate);
                            if (upg('espelho', 1) || EFF.overflowSplit) {
                                const half = Math.round(toShield / 2);
                                shieldMe.phys = Math.min(ARENA_SHIELD_MAX, shieldMe.phys + half);
                                shieldMe.mag = Math.min(ARENA_SHIELD_MAX, shieldMe.mag + (toShield - half));
                                log.push(`✂️ Sobrecura dividida: ${half} físico e ${toShield - half} mágico`);
                            } else {
                                shieldMe.mag = Math.min(ARENA_SHIELD_MAX, shieldMe.mag + toShield);
                                if (toShield > 0) log.push(`🔮 Sobrecura: ${toShield} virou escudo mágico`);
                            }
                        }
                    }
                    if (upg('purificacao', 1) || EFF.clearWound) { patch[arenaSideField(side, 'dot')] = null; log.push('✨ Limpeza: sua ferida foi estancada'); }
                    tryResidence('cura');
                    log.push(`💚 ${meName} usou ${card.name}: +${Math.min(heal, ARENA_HP - before)} de vida e deixou sua bênção no campo`);
                    relicEcho((n) => { hpMe = Math.min(ARENA_HP, hpMe + n); }, heal);
                    break;
                }
                case 'shield': {
                    const add = dmgBase + (EFF.shieldPhysFlat || 0);
                    shieldMe.phys = Math.min(ARENA_SHIELD_MAX, shieldMe.phys + add);
                    addThornsMe(4, {
                        reflectiveMagic: (hasB('fortaleza') && evoT2) || EFF.thornsReflectiveMagic,
                        direct: (hasB('muralha') && evoT2) || EFF.thornsDirect,
                        riposte: (hasB('contraataque') && evoT1) || EFF.thornsRiposte,
                        martyr: (hasB('contraataque') && evoT2) || EFF.thornsMartyr,
                        turns: (hasB('fortaleza') && evoT1) || EFF.thornsTurns ? 3 : 2
                    });
                    if (upg('muralha', 1) || EFF.dodge === 1) patch[arenaSideField(side, 'dodge')] = { pct: 1 };
                    tryResidence('defesa');
                    log.push(`🛡️ ${meName} ergueu ${card.name}: +${add} de escudo físico + Espinhos`);
                    relicEcho((n) => { shieldMe.phys = Math.min(ARENA_SHIELD_MAX, shieldMe.phys + n); }, add);
                    break;
                }
                case 'shieldmagic': {
                    const add = dmgBase + (EFF.shieldMagFlat || 0);
                    shieldMe.mag = Math.min(ARENA_SHIELD_MAX, shieldMe.mag + add);
                    const wardPct = EFF.wardPct ?? 0.25;
                    const wardCharges = EFF.wardCharges ?? 2;
                    const wardPayload = { pct: wardPct, charges: wardCharges };
                    if ((hasB('prisao') && evoT1) || EFF.wardFirstFull) wardPayload.firstFull = true;
                    if ((hasB('reflexao') && evoT1) || EFF.wardReflectBack) wardPayload.reflectBack = true;
                    if ((hasB('reflexao') && evoT2) || EFF.wardOnBreak) wardPayload.onBreak = true;
                    if ((hasB('prisao') && evoT2) || EFF.wardNoStun) wardPayload.noStun = true;
                    if ((hasB('santuario') && evoT2) || EFF.apice) wardPayload.apice = true;
                    patch[arenaSideField(side, 'ward')] = wardPayload;
                    tryResidence('defesa_magica', { afinidade: (upg('santuario', 1) || EFF.afinidade) ? true : false });
                    log.push(`🔮 ${meName} ergueu ${card.name}: +${add} de escudo mágico + Barreira`);
                    relicEcho((n) => { shieldMe.mag = Math.min(ARENA_SHIELD_MAX, shieldMe.mag + n); }, add);
                    break;
                }
                case 'summon': {
                    const basePower = Math.max(1, Number(card.power) || 1) + (EFF.powBonus || 0);
                    if (EFF.shadowPactHp) { hpMe -= EFF.shadowPactHp; log.push(`🌑 Pacto de Sombra: você sacrifica ${EFF.shadowPactHp} de vida`); }
                    const extraTurns = (upg('retorno', 1) ? 2 : 0) + (EFF.persistTurns || 0);
                    const specCount = EFF.summonCount || ((hasB('horda') && evoT1) ? 2 : 1);
                    const specPower = EFF.summonPower ?? (hasB('horda') && evoT1 ? 2 : basePower);
                    const specTurns = (EFF.summonTurns || (hasB('horda') && evoT1 ? 2 : ARENA_TOKEN_TURNS)) + extraTurns;
                    const needSlots = EFF.extraSmallSummon ? 2 : specCount;
                    if (summons + needSlots > ARENA_FRONT_MAX) throw new Error(`Frente cheia: ${needSlots >= 2 ? 'esta invocação precisa de 2 espaços' : `máx. ${ARENA_FRONT_MAX} criaturas`}.`);
                    const spawnOne = (suffix, name, power, turns, hp) => field.push({ kind: 'summon', uid: `tk_${Date.now()}_${suffix}_${Math.floor(Math.random() * 1e6)}`, name, emoji: card.emoji || '🗿', category: card.category, power, hp, fury: (upg('ferocidade', 2) || EFF.fury) ? true : false, healMe: (upg('horda', 2) || EFF.healMe) ? true : false, deathburst: (upg('retorno', 2) || EFF.deathburst) ? true : false, strikeMult: EFF.strikeMult || 1, turnsLeft: turns });
                    if (EFF.extraSmallSummon) {
                        spawnOne(0, `${card.name} (reforço)`, 2, 2, 4);
                        spawnOne(1, card.name, basePower, ARENA_TOKEN_TURNS + extraTurns, 2 + basePower);
                        log.push(`🗿 ${meName} invocou ${card.name} + um reforço!`);
                    } else if (specCount >= 2) {
                        for (let i = 0; i < specCount; i++) spawnOne(i, specPower === 2 && specTurns === 2 ? `${card.name} (enxame)` : card.name, specPower, specTurns, 2 + specPower);
                        log.push(`🗿 ${meName} invocou ${specCount}× ${card.name}!`);
                    } else {
                        spawnOne(0, card.name, basePower, ARENA_TOKEN_TURNS + extraTurns, 2 + basePower);
                        log.push(`🗿 ${meName} invocou ${card.name}!`);
                    }
                    if (upg('ferocidade', 1) || EFF.immediateAtkPct) {
                        const pct = EFF.immediateAtkPct ?? 0.5;
                        const hasteDmg = Math.max(1, Math.round(basePower * mult * 2 * pct));
                        dealPhys(hasteDmg, { pierce: upg('ferocidade', 2) || EFF.fury });
                        log.push(`⚡ Carga Imediata: golpe de ${hasteDmg} na hora`);
                    }
                    relicEcho(() => { const u2 = field[field.length - 1]; if (u2 && u2.kind === 'summon') u2.turnsLeft += 1; }, 1);
                    break;
                }
                case 'structure': {
                    if (backline >= ARENA_BACK_MAX) throw new Error(`Retaguarda cheia (máx. ${ARENA_BACK_MAX}).`);
                    const desperation = upg('fortaleza', 1) || EFF.desperationDouble;
                    const lowHp = desperation && hpMe <= 20;
                    const immMult = (EFF.structImmediateMult || 1) * (lowHp ? 2 : 1);
                    const dmg = Math.max(1, Math.round((Math.round(eff * 2) + 1) * immMult));
                    const rest = dealMag(dmg, { ignoreShield: upg('artilharia', 2) || EFF.pierceMagTick });
                    const tick = Math.max(1, Math.round(eff)) * (lowHp ? 2 : 1);
                    const heal = (upg('industrial', 1) || EFF.genHeal) ? 3 : 1;
                    const tickHeal = EFF.tickHeal ? EFF.tickHeal : 0;
                    field.push({ kind: 'structure', uid: `st_${Date.now()}_${Math.floor(Math.random() * 1e6)}`, name: card.name, emoji: '🏗️', category: card.category, tick, heal, hp: 8 + (EFF.structHpBonus || 0), desperation, pierceMag: upg('artilharia', 2) || EFF.pierceMagTick, genMagic: (upg('industrial', 2) || EFF.genMag) ? true : false, bulwark: (upg('fortaleza', 2) || EFF.bulwark) ? (EFF.bulwark || 4) : 0, bombard: (upg('artilharia', 1) || EFF.bombardCreatures) ? 3 : 0, tickHeal, immediate: dmg });
                    if (upg('artilharia', 1) || EFF.bombardCreatures) dmgCreatures(EFF.bombardCreatures || 3);
                    log.push(`🏗️ ${meName} ergueu ${card.name}: ${dmg} imediato + ${tick}/turno e cura ${heal}/turno`);
                    relicEcho(dealMag, dmg);
                    break;
                }
                default:
                    throw new Error('Efeito desconhecido.');
            }
            relicNote();
            // Extras genéricos do traço (fora dos ramos principais)
            if (EFF.healFlat) healSelf(EFF.healFlat);
            if (EFF.healPhys) shieldMe.phys = Math.min(ARENA_SHIELD_MAX, shieldMe.phys + EFF.healPhys);
            if (EFF.healMag) shieldMe.mag = Math.min(ARENA_SHIELD_MAX, shieldMe.mag + EFF.healMag);
            if (EFF.shieldPhysFlat && cat.kind !== 'shield') shieldMe.phys = Math.min(ARENA_SHIELD_MAX, shieldMe.phys + EFF.shieldPhysFlat);
            if (EFF.shieldMagFlat && cat.kind !== 'shieldmagic') shieldMe.mag = Math.min(ARENA_SHIELD_MAX, shieldMe.mag + EFF.shieldMagFlat);
            if (EFF.dodge && cat.kind !== 'shield' && cat.kind !== 'magic') patch[arenaSideField(side, 'dodge')] = { pct: EFF.dodge };
            if (EFF.drawOnPlay) drawForMe(EFF.drawOnPlay);
            if (EFF.dmgAllCreatures) dmgCreatures(EFF.dmgAllCreatures);
            if (EFF.clearWound && cat.kind !== 'heal') { patch[arenaSideField(side, 'dot')] = null; log.push('✨ Limpeza: sua ferida foi estancada'); }
            if (EFF.shaveFoePhys) { const before = shieldFoe.phys; shieldFoe.phys = Math.max(0, shieldFoe.phys - EFF.shaveFoePhys); if (before > shieldFoe.phys) log.push(`🛡️ o rival perdeu ${before - shieldFoe.phys} de escudo físico`); }

            // Statuses: merge do documento original + alterações desta jogada
            patch[arenaSideField(foe, 'dot')] = dotFoeNext;
            patch[arenaSideField(foe, 'skipDraw')] = skipFoeNext && Number(skipFoeNext.turns) > 0 ? skipFoeNext : null;
            if (patch[arenaSideField(side, 'ward')] === undefined) {
                const oldWard = m[arenaSideField(side, 'ward')];
                patch[arenaSideField(side, 'ward')] = oldWard && (Number(oldWard.charges) || 0) > 0 ? oldWard : null;
            }
            patch[arenaSideField(foe, 'ward')] = (Number(wardFoe.charges) || 0) > 0 ? wardFoe : null;
            if (patch[arenaSideField(side, 'dot')] === undefined) {
                const oldDot = m[arenaSideField(side, 'dot')];
                patch[arenaSideField(side, 'dot')] = oldDot && (Number(oldDot.turns) || 0) > 0 ? oldDot : null;
            }

            // Remove da mão, descarta a carta jogada e passa a vez
            const discardKey = arenaSideField(side, 'discard');
            patch[discardKey] = [...(m[arenaSideField(side, 'discard')] || []), { id: card.id, name: card.name, category: card.category, cost: card.cost, power: card.power, effect: card.effect || '' }].slice(-60);
            hand.splice(idx, 1);
            patch[arenaSideField(side, 'hp')] = hpMe;
            patch[arenaSideField(side, 'shield')] = shieldMe;
            patch[arenaSideField(foe, 'hp')] = hpFoe;
            patch[arenaSideField(foe, 'shield')] = shieldFoe;
            patch[fieldKey] = field;
            patch[handKey] = hand;

            const winner = side === 'A' ? m.playerA : m.playerB;
            if (hpFoe <= 0) {
                Object.assign(patch, arenaFinishPatch(m, winner, [...log, `🏆 ${foeName} caiu! ${meName} venceu!`]));
            } else if (hpMe <= 0) {
                Object.assign(patch, arenaFinishPatch(m, foe === 'A' ? m.playerA : m.playerB, [...log, `🏆 Os espinhos de ${foeName} derrubaram ${meName}!`]));
            } else {
                const mAfter = { ...m, ...patch };
                const start = arenaStartOfTurnPatch(mAfter, foe);
                Object.assign(patch, start.patch);
                log.push(...start.log);
                patch.turn = foe;
                patch.turnNumber = (Number(m.turnNumber) || 1) + 1;
                const meDead = (start.hpFoe ?? patch[arenaSideField(side, 'hp')]) <= 0;
                const selfDead = (start.hpMe ?? patch[arenaSideField(foe, 'hp')]) <= 0;
                if (meDead) {
                    Object.assign(patch, arenaFinishPatch(m, foe === 'A' ? m.playerA : m.playerB, [...log, `🏆 Os gatilhos de ${foeName} derrubaram ${meName}!`]));
                } else if (selfDead) {
                    Object.assign(patch, arenaFinishPatch(m, winner, [...log, `🏆 ${foeName} sucumbiu aos próprios gatilhos!`]));
                } else {
                    patch.status = 'active';
                    patch.log = arenaLogPush(m, log);
                }
            }
            tx.update(mRef, patch);
        });
        vibrate(15);
        arenaSelectedHand = null;
    } catch (err) {
        console.warn('playArenaCard:', err);
        showToast(err?.message || 'Não consegui jogar a carta.', 'warn');
    }
}

async function passArenaTurn() {
    if (!currentUser || !arenaOpenMatchId) return;
    const matchId = arenaOpenMatchId;
    try {
        await runTransaction(db, async (tx) => {
            const mRef = doc(db, 'arena_matches', matchId);
            const snap = await tx.get(mRef);
            const m = snap.data();
            if (!m || m.status !== 'active') throw new Error('A partida não está ativa.');
            const side = arenaMySideIn(m);
            if (!side) throw new Error('Você não faz parte desta partida.');
            if (m.turn !== side) throw new Error('Ainda não é seu turno.');
            const foe = arenaOtherSide(side);
            const meName = arenaMatchCardName(m, side);
            const foeName = arenaMatchCardName(m, foe);
            const log = [`⏭️ ${meName} passou o turno`];
            const patch = {};
            const mAfter = { ...m };
            const start = arenaStartOfTurnPatch(mAfter, foe);
            Object.assign(patch, start.patch);
            log.push(...start.log);
            patch.turn = foe;
            patch.turnNumber = (Number(m.turnNumber) || 1) + 1;
            const meDead = (start.hpFoe ?? patch[arenaSideField(side, 'hp')]) <= 0;
            const selfDead = (start.hpMe ?? patch[arenaSideField(foe, 'hp')]) <= 0;
            if (meDead) {
                Object.assign(patch, arenaFinishPatch(m, foe === 'A' ? m.playerA : m.playerB, [...log, `🏆 Os gatilhos de ${foeName} derrubaram ${meName}!`]));
            } else if (selfDead) {
                Object.assign(patch, arenaFinishPatch(m, side === 'A' ? m.playerA : m.playerB, [...log, `🏆 ${foeName} sucumbiu aos próprios gatilhos!`]));
            } else {
                patch.status = 'active';
                patch.log = arenaLogPush(m, log);
            }
            tx.update(mRef, patch);
        });
        arenaSelectedHand = null;
    } catch (err) {
        showToast(err?.message || 'Não consegui passar o turno.', 'warn');
    }
}

/* Desistir (= derrota) */
async function forfeitArenaMatch() {
    if (!currentUser || !arenaOpenMatchId) return;
    const ok = await gvConfirm({ emoji: '🏳️', title: 'Desistir da partida?', message: 'O oponente leva o pote inteiro.', okLabel: 'Desistir' });
    if (!ok) return;
    const matchId = arenaOpenMatchId;
    try {
        await runTransaction(db, async (tx) => {
            const mRef = doc(db, 'arena_matches', matchId);
            const snap = await tx.get(mRef);
            const m = snap.data();
            if (!m || m.status !== 'active') throw new Error('A partida não está ativa.');
            const side = arenaMySideIn(m);
            if (!side) throw new Error('Você não faz parte desta partida.');
            const winner = side === 'A' ? m.playerB : m.playerA;
            const loserName = arenaMatchCardName(m, side);
            tx.update(mRef, arenaFinishPatch(m, winner, [`🏳️ ${loserName} desistiu`]));
        });
    } catch (err) {
        showToast(err?.message || 'Não consegui desistir.', 'warn');
    }
}

/* ---------- POTE: escrow e liquidação ---------- */
async function reloadEconomyFromServer() {
    if (!currentUser) return;
    try {
        const fresh = await getDoc(ecoUserRef());
        economyState = normalizeEconomy(fresh.data() || {});
        refreshEconomyUI();
    } catch (err) { console.warn('reload econ:', err?.message); }
}

/* Busca as minhas partidas (como A ou como B). O Firestore exige que a query
   implique a regra de leitura — por isso NUNCA consultamos por 'winner':
   as regras não conseguem provar que winner == eu implica que eu seja A ou B,
   e a query inteira é recusada (Missing or insufficient permissions). */
async function fetchMyArenaMatchDocs(limitA = 25, limitB = 25) {
    if (!currentUser) return [];
    const [a, b] = await Promise.all([
        getDocs(query(collection(db, 'arena_matches'), where('playerA', '==', currentUser.uid), limit(limitA))),
        getDocs(query(collection(db, 'arena_matches'), where('playerB', '==', currentUser.uid), limit(limitB)))
    ]);
    return [...a.docs, ...b.docs].map((d) => ({ id: d.id, ...d.data() }));
}

/* Convite RECUSADO pelo convidado: a aposta do anfitrião ficou em escrow e
   quem pode devolvê-la é o próprio anfitrião — feito aqui, uma única vez. */
async function claimDeclinedArenaRefunds(mine = null, { silent = true } = {}) {
    if (!currentUser) return 0;
    const docs = mine ?? await fetchMyArenaMatchDocs(25, 25).catch(() => []);
    const declined = docs.filter((m) => m.status === 'cancelled' && m.declinedBy && !(m.stakeA && m.stakeA.refunded));
    let refunded = 0;
    for (const m of declined) {
        const matchRef = doc(db, 'arena_matches', m.id);
        try {
            await runTransaction(db, async (tx) => {
                const snap = await tx.get(matchRef);
                const data = snap.data();
                if (!data || data.status !== 'cancelled' || !data.declinedBy) return;
                if (data.stakeA?.refunded) return;
                const stakeGold = Number(data.stakeA?.gold) || 0;
                const stakeCos = Array.isArray(data.stakeA?.cosmetics) ? data.stakeA.cosmetics : [];
                const uRef = ecoUserRef();
                const u = (await tx.get(uRef)).data() || {};
                const cos = Array.isArray(u.cosmetics) ? u.cosmetics : [];
                tx.set(uRef, { gold: (typeof u.gold === 'number' ? u.gold : 0) + stakeGold, cosmetics: [...cos, ...stakeCos] }, { merge: true });
                tx.update(matchRef, { stakeA: { ...(data.stakeA || { gold: stakeGold, cosmetics: stakeCos }), refunded: true } });
            });
            refunded++;
            addLedger('arena', 'Aposta de convite devolvida', Number(m.stakeA?.gold) || 0);
        } catch (err) { console.warn('devolver aposta do convite:', err?.message); }
    }
    if (refunded > 0) {
        await reloadEconomyFromServer();
        if (!silent) showToast('Aposta do convite recusado devolvida!', 'success');
    }
    return refunded;
}

/* Liquida UMA partida encerrada em favor do vencedor. Idempotente. */
async function settleArenaMatchDoc(matchRef, m) {
    if (!m || m.status !== 'finished' || m.winner !== currentUser?.uid) return { gold: 0, cos: 0 };
    let credited = { gold: 0, cos: 0 };
    await runTransaction(db, async (tx) => {
        const snap = await tx.get(matchRef);
        const data = snap.data();
        if (!data || data.status !== 'finished' || data.winner !== currentUser.uid) return;
        const uRef = ecoUserRef();
        const u = (await tx.get(uRef)).data() || {};
        const stakeAGold = Number(data.stakeA?.gold) || 0;
        const stakeBGold = Number(data.stakeB?.gold) || 0;
        const cosA = Array.isArray(data.stakeA?.cosmetics) ? data.stakeA.cosmetics.filter((x) => typeof x === 'string') : [];
        const cosB = Array.isArray(data.stakeB?.cosmetics) ? data.stakeB.cosmetics.filter((x) => typeof x === 'string') : [];
        const owned = Array.isArray(u.cosmetics) ? u.cosmetics : [];
        const patch = {
            gold: (typeof u.gold === 'number' ? u.gold : 0) + stakeAGold + stakeBGold,
            cosmetics: [...owned, ...cosA, ...cosB]
        };
        tx.set(uRef, patch, { merge: true });
        tx.update(matchRef, { status: 'settled', settledAt: serverTimestamp() });
        credited = { gold: stakeAGold + stakeBGold, cos: cosA.length + cosB.length };
    });
    return credited;
}

async function claimArenaSettlements({ silent = false } = {}) {
    if (!currentUser) return 0;
    let totalGold = 0, totalCos = 0, count = 0;
    try {
        const mine = await fetchMyArenaMatchDocs(25, 25);
        for (const m of mine) {
            if (m.status !== 'finished' || m.winner !== currentUser.uid) continue;
            const got = await settleArenaMatchDoc(doc(db, 'arena_matches', m.id), m);
            if (got.gold || got.cos) { totalGold += got.gold; totalCos += got.cos; count++; }
        }
        // Devolve a aposta de convites recusados (o convidado não pode tocar no seu doc)
        await claimDeclinedArenaRefunds(mine, { silent: true });
    } catch (err) {
        console.warn('Resgate de potes indisponível:', err?.message);
        if (!silent) showToast(firestorePermissionMsg(err), 'error', 6000);
    }
    if (count > 0) {
        addLedger('arena', 'Pote de batalha na Arena', totalGold);
        await reloadEconomyFromServer();
        if (!silent) showToast(`🏆 Pote${count > 1 ? 's' : ''} resgatado${count > 1 ? 's' : ''}: +${fmtGold(totalGold)}${totalCos ? ` e ${totalCos} cosmético(s)` : ''}!`, 'success', 5000);
    }
    return count;
}

function arenaStakeText(stake) {
    const gold = Number(stake?.gold) || 0;
    const cos = (stake?.cosmetics || []).length;
    const parts = [];
    if (gold > 0) parts.push(`${fmtGold(gold)}`);
    if (cos > 0) parts.push(`${cos} cosmético${cos > 1 ? 's' : ''}`);
    return parts.length ? parts.join(' + ') : 'nada (amistosa)';
}

/* Criar desafio: aposta do desafiador (gold + cosméticos) sai da carteira */
async function createArenaChallengeFromBet(stakeGold, stakeCos) {
    const check = validateArenaDeck();
    if (!check.ok) { showToast(`Monte seu deck primeiro — ${check.reason}`, 'warn', 4500); return false; }
    const uid = currentUser.uid;
    const myName = currentUserProfile.name || 'Usuário';
    const myAvatar = currentUserProfile.avatarUrl || '';
    const shuffled = arenaShuffle(arenaDeckSnapshot());
    const handA = shuffled.slice(0, 5);
    const restA = shuffled.slice(5);
    const stats = arenaDeckStats();
    try {
        await runTransaction(db, async (tx) => {
            const uRef = ecoUserRef();
            const u = (await tx.get(uRef)).data() || {};
            const gold = typeof u.gold === 'number' ? u.gold : 0;
            if (gold < stakeGold) throw new Error('OURO_INSUFICIENTE');
            const cos = Array.isArray(u.cosmetics) ? u.cosmetics : [];
            for (const id of stakeCos) if (!cos.includes(id)) throw new Error('COSMETICO_AUSENTE');
            tx.set(uRef, { gold: gold - stakeGold, cosmetics: cos.filter((c) => !stakeCos.includes(c)) }, { merge: true });
            const matchRef = doc(collection(db, 'arena_matches'));
            tx.set(matchRef, {
                playerA: uid, playerAName: myName, playerAAvatar: myAvatar,
                playerB: '', playerBName: '', playerBAvatar: '',
                starter: 'A', status: 'waiting', turn: 'A', turnNumber: 1,
                hpA: ARENA_HP, hpB: ARENA_HP,
                shieldA: { phys: 0, mag: 0 }, shieldB: { phys: 0, mag: 0 },
                deckA: restA, handA, deckB: [], handB: [],
                discardA: [], discardB: [],
                fieldA: [], fieldB: [],
                treeA: { ...(economyState?.arenaTree || {}) }, catCountA: arenaCatCounts(arenaDeckSnapshot()),
                treeB: {}, catCountB: {},
                stakeA: { gold: stakeGold, cosmetics: stakeCos },
                stakeB: { gold: 0, cosmetics: [] },
                potGold: stakeGold,
                winner: '',
                upgA: arenaUpgradeSnapshot(shuffled), relicsA: arenaRelicSnapshot(shuffled),
                upgB: {}, relicsB: {},
                log: [`⚔️ ${myName} abriu um desafio — pote: ${arenaStakeText({ gold: stakeGold, cosmetics: stakeCos })}`],
                createdAt: serverTimestamp()
            });
        });
        addLedger('arena', 'Aposta em desafio da Arena', -stakeGold);
        vibrate([12, 40, 12]);
        showToast('Desafio criado! Agora é só esperar alguém aceitar ⚔️', 'success', 4000);
        await reloadEconomyFromServer();
        refreshArenaBattlePane();
        return true;
    } catch (err) {
        console.warn('createChallenge:', err);
        showToast(err?.message === 'OURO_INSUFICIENTE' ? 'Gold insuficiente pra essa aposta 🪙' : err?.message === 'COSMETICO_AUSENTE' ? 'Esse cosmético não está mais no seu baú.' : 'Não consegui criar o desafio. Rules publicadas?', 'error', 4500);
        return false;
    }
}

/* Convite direto: desafiador escolhe o nick; só o convidado vê (fica 'invited',
   fora do mural). A aposta do anfitrião fica em escrow até a resposta —
   se for aceito, vira partida; se for recusado, devolvemos via claim. */
async function createArenaInviteFromBet(stakeGold, stakeCos, target) {
    const check = validateArenaDeck();
    if (!check.ok) { showToast(`Monte seu deck primeiro — ${check.reason}`, 'warn', 4500); return false; }
    if (!target || !target.uid) { showToast('Não achei esse jogador.', 'warn'); return false; }
    const uid = currentUser.uid;
    const myName = currentUserProfile.name || 'Usuário';
    const myAvatar = currentUserProfile.avatarUrl || '';
    const shuffled = arenaShuffle(arenaDeckSnapshot());
    const handA = shuffled.slice(0, 5);
    const restA = shuffled.slice(5);
    const stats = arenaDeckStats();
    try {
        await runTransaction(db, async (tx) => {
            const uRef = ecoUserRef();
            const u = (await tx.get(uRef)).data() || {};
            const gold = typeof u.gold === 'number' ? u.gold : 0;
            if (gold < stakeGold) throw new Error('OURO_INSUFICIENTE');
            const cos = Array.isArray(u.cosmetics) ? u.cosmetics : [];
            for (const id of stakeCos) if (!cos.includes(id)) throw new Error('COSMETICO_AUSENTE');
            tx.set(uRef, { gold: gold - stakeGold, cosmetics: cos.filter((c) => !stakeCos.includes(c)) }, { merge: true });
            const matchRef = doc(collection(db, 'arena_matches'));
            tx.set(matchRef, {
                playerA: uid, playerAName: myName, playerAAvatar: myAvatar,
                playerB: '', playerBName: '', playerBAvatar: '',
                invitedTo: target.uid, invitedToName: target.name || 'Jogador', invitedToAvatar: target.avatarUrl || '',
                starter: 'A', status: 'invited', turn: 'A', turnNumber: 1,
                hpA: ARENA_HP, hpB: ARENA_HP,
                shieldA: { phys: 0, mag: 0 }, shieldB: { phys: 0, mag: 0 },
                deckA: restA, handA, deckB: [], handB: [],
                discardA: [], discardB: [],
                fieldA: [], fieldB: [],
                treeA: { ...(economyState?.arenaTree || {}) }, catCountA: arenaCatCounts(arenaDeckSnapshot()),
                treeB: {}, catCountB: {},
                stakeA: { gold: stakeGold, cosmetics: stakeCos },
                stakeB: { gold: 0, cosmetics: [] },
                potGold: stakeGold,
                winner: '',
                upgA: arenaUpgradeSnapshot(shuffled), relicsA: arenaRelicSnapshot(shuffled),
                upgB: {}, relicsB: {},
                log: [`⚔️ ${myName} convidou ${target.name || 'um jogador'} pra um duelo — pote: ${arenaStakeText({ gold: stakeGold, cosmetics: stakeCos })}`],
                createdAt: serverTimestamp()
            });
        });
        addLedger('arena', 'Aposta em convite da Arena', -stakeGold);
        vibrate([12, 40, 12]);
        showToast(`Convite enviado para ${target.name || 'o jogador'}! ⚔️`, 'success', 4000);
        await reloadEconomyFromServer();
        refreshArenaBattlePane();
        return true;
    } catch (err) {
        console.warn('createInvite:', err);
        showToast(err?.message === 'OURO_INSUFICIENTE' ? 'Gold insuficiente pra essa aposta 🪙' : err?.message === 'COSMETICO_AUSENTE' ? 'Esse cosmético não está mais no seu baú.' : 'Não consegui enviar o convite. Rules publicadas?', 'error', 4500);
        return false;
    }
}

/* Aceitar convite/desafio: mesma transação, mas exige ser o convidado (ou qualquer um, se for desafio público) */
async function acceptArenaChallengeFromBet(matchId, stakeGold, stakeCos) {
    const check = validateArenaDeck();
    if (!check.ok) { showToast(`Monte seu deck primeiro — ${check.reason}`, 'warn', 4500); return false; }
    const uid = currentUser.uid;
    const myName = currentUserProfile.name || 'Usuário';
    const myAvatar = currentUserProfile.avatarUrl || '';
    const shuffled = arenaShuffle(arenaDeckSnapshot());
    const handB = shuffled.slice(0, 5);
    const restB = shuffled.slice(5);
    const catCountB = arenaCatCounts(arenaDeckSnapshot());
    const treeB = { ...(economyState?.arenaTree || {}) };
    try {
        await runTransaction(db, async (tx) => {
            const mRef = doc(db, 'arena_matches', matchId);
            const mSnap = await tx.get(mRef);
            const m = mSnap.data();
            const isInvite = m?.status === 'invited';
            if (!m || (m.status !== 'waiting' && !(isInvite && m.invitedTo === uid))) throw new Error('JOGO_ACABOU');
            if (m.playerA === uid) throw new Error('PROPRIO');
            const uRef = ecoUserRef();
            const u = (await tx.get(uRef)).data() || {};
            const gold = typeof u.gold === 'number' ? u.gold : 0;
            if (gold < stakeGold) throw new Error('OURO_INSUFICIENTE');
            const cos = Array.isArray(u.cosmetics) ? u.cosmetics : [];
            for (const id of stakeCos) if (!cos.includes(id)) throw new Error('COSMETICO_AUSENTE');
            tx.set(uRef, { gold: gold - stakeGold, cosmetics: cos.filter((c) => !stakeCos.includes(c)) }, { merge: true });
            tx.update(mRef, {
                status: 'active',
                playerB: uid, playerBName: myName, playerBAvatar: myAvatar,
                stakeB: { gold: stakeGold, cosmetics: stakeCos },
                potGold: (Number(m.stakeA?.gold) || 0) + stakeGold,
                turn: 'A', turnNumber: 1,
                deckB: restB, handB,
                treeB, catCountB,
                upgB: arenaUpgradeSnapshot(shuffled), relicsB: arenaRelicSnapshot(shuffled),
                acceptedAt: serverTimestamp(),
                log: [...(m.log || []), `🤝 ${myName} aceitou! ${arenaMatchCardName(m, 'A')} começa. Boa batalha!`].slice(-8)
            });
        });
        addLedger('arena', 'Aposta em desafio da Arena', -stakeGold);
        vibrate([12, 40, 12]);
        await reloadEconomyFromServer();
        openArenaMatch(matchId);
        return true;
    } catch (err) {
        console.warn('acceptChallenge:', err);
        const msg = err?.message === 'JOGO_ACABOU' ? 'Esse desafio já foi aceito ou cancelado 😅'
            : err?.message === 'PROPRIO' ? 'Você não pode aceitar o próprio desafio.'
            : err?.message === 'OURO_INSUFICIENTE' ? 'Gold insuficiente pra essa aposta 🪙'
            : err?.message === 'COSMETICO_AUSENTE' ? 'Esse cosmético não está mais no seu baú.'
            : 'Não consegui aceitar. Rules publicadas?';
        showToast(msg, 'warn', 4500);
        refreshArenaBattlePane();
        return false;
    }
}

/* Convidado RECUSA: não mexe na aposta do anfitrião (quem devolve é o cliente dele) */
async function declineArenaInvite(matchId) {
    if (!currentUser) return;
    const ok = await gvConfirm({ emoji: '🚫', title: 'Recusar o convite?', message: 'O desafiante recebe a aposta dele de volta.', okLabel: 'Recusar' });
    if (!ok) return;
    try {
        await runTransaction(db, async (tx) => {
            const mRef = doc(db, 'arena_matches', matchId);
            const mSnap = await tx.get(mRef);
            const m = mSnap.data();
            if (!m || m.status !== 'invited' || m.invitedTo !== currentUser.uid) throw new Error('INVALIDA');
            tx.update(mRef, { status: 'cancelled', declinedAt: serverTimestamp(), declinedBy: currentUser.uid });
        });
        showToast('Convite recusado.', 'info');
        refreshArenaBattlePane();
    } catch (err) {
        console.warn('declineInvite:', err);
        showToast('Não consegui recusar esse convite.', 'warn');
    }
}

/* Busca usuário pelo nick (exato, case-insensitive) — mesmo padrão das buscas do app */
async function findUserByNick(nick) {
    const q = String(nick || '').trim().toLowerCase();
    if (!q) return null;
    const snap = await getDocs(collection(db, 'users'));
    let found = null;
    snap.forEach((d) => {
        if (found) return;
        const data = d.data() || {};
        const name = String(data.name || '');
        if (name.trim().toLowerCase() === q) found = { uid: d.id, name, avatarUrl: data.avatarUrl || '' };
    });
    return found;
}

/* Linha de convite recebido (avatar + aposta + aceitar/recusar) */
function arenaInviteRowHTML(m) {
    const avatar = sanitizeUrl(m.playerAAvatar || '');
    const avatarHtml = avatar
        ? `<img src="${escapeHtml(avatar)}" alt="" loading="lazy" onerror="this.remove()">`
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-swords"></use></svg>';
    return `<div class="arena-challenge is-invite">
        <span class="arena-challenge-avatar">${avatarHtml}</span>
        <span class="arena-challenge-info"><strong>${escapeHtml(m.playerAName || 'Alguém')} te convidou</strong>
            <span class="arena-pot"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-coin"></use></svg>Pote: ${escapeHtml(arenaStakeText(m.stakeA))}</span></span>
        <button class="arena-btn arena-btn-ghost arena-btn-sm" data-arena-decline="${escapeHtml(m.id)}">Recusar</button>
        <button class="arena-btn arena-btn-primary arena-btn-sm" data-arena-accept="${escapeHtml(m.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-swords"></use></svg>Aceitar</button>
    </div>`;
}

async function cancelArenaChallenge(matchId) {
    if (!currentUser) return;
    try {
        await runTransaction(db, async (tx) => {
            const mRef = doc(db, 'arena_matches', matchId);
            const mSnap = await tx.get(mRef);
            const m = mSnap.data();
            if (!m || (m.status !== 'waiting' && m.status !== 'invited') || m.playerA !== currentUser.uid) throw new Error('INVALIDA');
            const uRef = ecoUserRef();
            const u = (await tx.get(uRef)).data() || {};
            const cos = Array.isArray(u.cosmetics) ? u.cosmetics : [];
            const stakeCos = Array.isArray(m.stakeA?.cosmetics) ? m.stakeA.cosmetics : [];
            tx.set(uRef, {
                gold: (typeof u.gold === 'number' ? u.gold : 0) + (Number(m.stakeA?.gold) || 0),
                cosmetics: [...cos, ...stakeCos]
            }, { merge: true });
            tx.update(mRef, { status: 'cancelled', cancelledAt: serverTimestamp() });
        });
        showToast('Desafio cancelado — aposta devolvida ↩️', 'info');
        await reloadEconomyFromServer();
        refreshArenaBattlePane();
    } catch (err) {
        showToast('Não consegui cancelar esse desafio.', 'warn');
    }
}

/* ---------- ARENA: telas ---------- */
const ARENA_TABS = ['deck', 'cards', 'create', 'battle'];
function setArenaTab(name) {
    document.querySelectorAll('[data-arena-tab]').forEach((b) => b.classList.toggle('active', b.dataset.arenaTab === name));
    ARENA_TABS.forEach((t) => { const pane = $(`#arena-pane-${t}`); if (pane) pane.hidden = t !== name; });
    if (name === 'battle') void refreshArenaBattlePane();
    if (name === 'create') { fillArenaCategorySelect(); renderArenaCreatePreview(); }
}

function updateArenaDeckCheck() {
    const el = $('#arena-deck-check');
    if (!el) return;
    const v = validateArenaDeck();
    el.classList.toggle('ok', v.ok);
    el.classList.toggle('bad', !v.ok);
    el.innerHTML = v.ok
        ? `<svg viewBox="0 0 24 24" class="arena-check-ico" aria-hidden="true"><use href="#arena-check-circle"></use></svg><span><strong>Deck pronto!</strong> ${v.size} cartas · ${v.points}/${ARENA_DECK_MAX_POINTS} pts</span>`
        : `<svg viewBox="0 0 24 24" class="arena-check-ico" aria-hidden="true"><use href="#arena-alert"></use></svg><span>${escapeHtml(v.reason)}</span>`;
}

function arenaChallengeRowHTML(m, isMine) {
    const invited = m.status === 'invited';
    const avatar = sanitizeUrl(invited ? (m.invitedToAvatar || '') : (m.playerAAvatar || ''));
    const avatarHtml = avatar
        ? `<img src="${escapeHtml(avatar)}" alt="" loading="lazy" onerror="this.remove()">`
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-swords"></use></svg>';
    const title = invited ? `Convite para ${m.invitedToName || 'jogador'}` : (m.playerAName || 'Alguém');
    return `<div class="arena-challenge${invited ? ' is-invite' : ''}">
        <span class="arena-challenge-avatar">${avatarHtml}</span>
        <span class="arena-challenge-info"><strong>${escapeHtml(title)}${invited ? '<small class="arena-invite-tag">convite direto</small>' : ''}</strong>
            <span class="arena-pot"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-coin"></use></svg>${invited ? 'Aguardando resposta…' : `Pote: ${escapeHtml(arenaStakeText(m.stakeA))}`}</span></span>
        ${isMine
            ? `<button class="arena-btn arena-btn-ghost arena-btn-sm" data-arena-cancel="${escapeHtml(m.id)}">Cancelar</button>`
            : `<button class="arena-btn arena-btn-primary arena-btn-sm arena-accept-btn" data-arena-accept="${escapeHtml(m.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-swords"></use></svg>Aceitar</button>`}
    </div>`;
}
function arenaHistoryRowHTML(m) {
    const me = currentUser?.uid;
    const iAmA = m.playerA === me;
    const oppName = (iAmA ? m.playerBName : m.playerAName) || 'Rival';
    const won = m.winner === me;
    const potText = arenaStakeText({ gold: Number(m.potGold) || 0, cosmetics: [...(m.stakeA?.cosmetics || []), ...(m.stakeB?.cosmetics || [])] });
    const date = m.finishedAt?.toDate?.() || m.createdAt?.toDate?.() || null;
    const dateText = date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
    return `<div class="arena-history-row">
        <span class="arena-result ${won ? 'win' : 'lose'}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${won ? 'arena-trophy' : 'arena-x-circle'}"></use></svg></span>
        <span class="arena-history-info">${won ? 'Vitória' : 'Derrota'} contra <strong>${escapeHtml(oppName)}</strong>${dateText ? `<small>${dateText}</small>` : ''}</span>
        <span class="arena-pot">${won ? `+${escapeHtml(potText)}` : ''}</span>
    </div>`;
}

async function refreshArenaBattlePane() {
    if (!currentUser) return;
    updateArenaDeckCheck();
    // Minhas partidas (uma busca só — usada pelo banner, pelo histórico e pelo auto-abrir)
    let mine = [];
    try {
        mine = await fetchMyArenaMatchDocs(25, 25);
    } catch (err) { console.warn('minhas partidas:', err?.message); }

    // Auto-abrir: meu desafio/convite acabou de ser aceito → entra na sala sozinho
    const activeMine = mine.filter((m) => m.status === 'active');
    if (!arenaKnownActiveInit) {
        // Na primeira carga da sessão, partidas já ativas não puxam ninguém pra dentro
        activeMine.forEach((m) => arenaKnownActive.add(m.id));
        arenaKnownActiveInit = true;
    }
    const freshActive = activeMine.find((m) => !arenaKnownActive.has(m.id));
    activeMine.forEach((m) => arenaKnownActive.add(m.id));
    const arenaVisible = document.getElementById('app-arena')?.classList.contains('active');
    if (freshActive && !arenaOpenMatchId && arenaVisible) {
        showToast('⚔️ Seu desafio foi aceito! Entrando na sala…', 'success', 3000);
        openArenaMatch(freshActive.id);
        return;
    }

    // Convites recusados com aposta retida → devolve automaticamente (uma vez)
    void claimDeclinedArenaRefunds(mine, { silent: true });

    // Potes pendentes de resgate
    const pending = mine.filter((m) => m.status === 'finished' && m.winner === currentUser.uid);
    const banner = $('#arena-settle-banner');
    if (banner) {
        banner.innerHTML = pending.length
            ? `<div class="arena-settle"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-coin"></use></svg><span class="arena-settle-text">Você tem <strong>${pending.length}</strong> pote${pending.length > 1 ? 's' : ''} de batalha pra resgatar!</span><button class="arena-btn arena-btn-primary arena-btn-sm" id="arena-claim-pots-btn">Resgatar</button></div>`
            : '';
    }
    // Botão "partida em andamento" — voltar pra sala quando quiser
    const resumeBtn = $('#arena-resume-match-btn');
    const resumable = mine.find((m) => m.status === 'active');
    if (resumeBtn) {
        resumeBtn.hidden = !resumable;
        if (resumable) resumeBtn.dataset.matchId = resumable.id;
    }

    // Convites diretos recebidos (discreto, acima do mural)
    try {
        const iSnap = await getDocs(query(collection(db, 'arena_matches'), where('invitedTo', '==', currentUser.uid), limit(10)));
        const invites = iSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((m) => m.status === 'invited');
        const head = $('#arena-invites-head');
        const list = $('#arena-invite-list');
        if (head) head.hidden = invites.length === 0;
        if (list) {
            if (arenaInvitesSeenInit) {
                for (const m of invites) {
                    if (!arenaInviteSeen.has(m.id)) showToast(`⚔️ ${m.playerAName || 'Alguém'} te convidou para um duelo!`, 'info', 4500);
                }
            }
            arenaInvitesSeenInit = true;
            arenaInviteSeen.clear();
            invites.forEach((m) => arenaInviteSeen.add(m.id));
            list.innerHTML = invites.map(arenaInviteRowHTML).join('');
        }
    } catch (err) { console.warn('convites:', err?.message); }

    // Desafios abertos + meus desafios esperando
    try {
        const snap = await getDocs(query(collection(db, 'arena_matches'), where('status', '==', 'waiting'), limit(20)));
        const uid = currentUser.uid;
        const waiting = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const open = waiting.filter((m) => m.playerA !== uid)
            .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        const myPending = mine.filter((m) => (m.status === 'waiting' || m.status === 'invited') && m.playerA === uid)
            .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        const countEl = $('#arena-open-count');
        if (countEl) countEl.textContent = open.length ? `${open.length} aberto${open.length > 1 ? 's' : ''}` : '';
        const list = $('#arena-challenge-list');
        if (list) {
            const html = myPending.map((m) => arenaChallengeRowHTML(m, true)).join('')
                + open.map((m) => arenaChallengeRowHTML(m, false)).join('');
            list.innerHTML = html || '<p class="muted">Nenhum desafio aberto agora. Crie o primeiro! ⚔️</p>';
        }
    } catch (err) {
        console.warn('desafios abertos:', err?.message);
        const list = $('#arena-challenge-list');
        if (list) list.innerHTML = '<p class="muted">Não consegui carregar os desafios (rules da Arena publicadas?).</p>';
    }
    // Histórico recente (a partir da busca compartilhada)
    try {
        const hist = mine
            .filter((m) => m.status === 'finished' || m.status === 'settled')
            .sort((x, y) => (y.finishedAt?.toMillis?.() || y.createdAt?.toMillis?.() || 0) - (x.finishedAt?.toMillis?.() || x.createdAt?.toMillis?.() || 0))
            .slice(0, 10);
        const box = $('#arena-history-list');
        if (box) box.innerHTML = hist.length ? hist.map(arenaHistoryRowHTML).join('') : '<p class="muted">Nenhuma batalha ainda. O primeiro sangue é seu! ⚔️</p>';
    } catch (err) { console.warn('histórico:', err?.message); }
}

/* ---------- Tela de batalha ---------- */
function openArenaMatch(matchId) {
    arenaOpenMatchId = matchId;
    const hub = $('#arena-hub'); if (hub) hub.hidden = true;
    const matchEl = $('#arena-match'); if (matchEl) matchEl.hidden = false;
    arenaSelectedHand = null;
    if (arenaMatchUnsub) { try { arenaMatchUnsub(); } catch { /* ignora */ } }
    arenaMatchUnsub = onSnapshot(doc(db, 'arena_matches', matchId), (snap) => {
        const data = snap.data();
        if (!data) { showToast('Partida não encontrada 👀', 'warn'); leaveArenaMatch(); return; }
        arenaOpenMatchCache = { id: matchId, ...data };
        renderArenaMatch(arenaOpenMatchCache);
    }, (err) => {
        console.warn('onSnapshot match:', err?.message);
        showToast('Não consegui ouvir a partida. Verifique as rules.', 'warn');
    });
}
function leaveArenaMatch() {
    if (arenaOpenMatchId) arenaKnownActive.add(arenaOpenMatchId); // não puxa de volta quem saiu
    arenaOpenMatchId = null;
    arenaOpenMatchCache = null;
    arenaSelectedHand = null;
    if (arenaMatchUnsub) { try { arenaMatchUnsub(); } catch { /* ignora */ } arenaMatchUnsub = null; }
    const hub = $('#arena-hub'); if (hub) hub.hidden = false;
    const matchEl = $('#arena-match'); if (matchEl) matchEl.hidden = true;
    const finish = $('#arena-finish'); if (finish) finish.hidden = true;
    refreshArenaUI();
}
function arenaTokenHTML(u, m, side) {
    const shortName = String(u.name || '').slice(0, 16);
    const title = escapeHtml(u.name || '');
    if (u.kind === 'residence') {
        const aura = { cura: '+2 vida/turno', defesa: '+1 escudo fís./turno', defesa_magica: '+1 escudo mág./turno', dano_terra: `+${Number(u.aura) || 2} dano em golpes de terra` }[u.trait] || 'residência';
        return `<span class="am-token am-token--residence" title="${title} — residência: ${aura}. Fica no campo."><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-tree"></use></svg><small>${escapeHtml(shortName)}</small><b>${aura}</b></span>`;
    }
    if (u.kind === 'resquicio') {
        return `<span class="am-token am-token--resquicio" title="${title} — resquício do efeito (${Number(u.turnsLeft) || 1} turno${Number(u.turnsLeft) === 1 ? '' : 's'} restante)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-wind"></use></svg><small>${escapeHtml(shortName)}</small><b>resquício · ${Number(u.turnsLeft) || 1}t</b></span>`;
    }
    if (u.kind === 'structure') {
        const healBit = Number(u.heal) > 0 ? ` · cura ${Number(u.heal)}` : '';
        return `<span class="am-struct" title="${title} — tick de dano mágico por turno e cura do dono (HP ${Number(u.hp) || 8})"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-tower"></use></svg>${escapeHtml(shortName)} · ${Number(u.tick) || 1}/turno${healBit} · ${Number(u.hp) || 8}❤</span>`;
    }
    const golpe = m && side ? Math.max(1, Math.round((Number(u.power) || 1) * 2 * arenaMultOf(m, side, 'invocacao'))) : Math.max(1, (Number(u.power) || 1) * 2);
    const furyBit = u.fury ? ' · atravessa escudo' : '';
    const hpBit = Number(u.hp) ? ` · ${Number(u.hp)}❤` : '';
    return `<span class="am-token" title="${title} — golpe ${golpe}/turno${furyBit}${hpBit}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-moon"></use></svg><small>${escapeHtml(shortName)}</small><b>golpe ${golpe} · ${Number(u.turnsLeft) || 0} turnos${hpBit}</b></span>`;
}
/* Linha de efeitos ativos de um lado (sangramento, espinhos, barreira, atordoado) */
function arenaStatusChipsHTML(m, side) {
    const chips = [];
    const dot = m[`dot${side}`];
    if (dot && (Number(dot.turns) || 0) > 0) {
        const isBurn = dot.type === 'burn';
        const markBit = Number(dot.mark) > 0 ? ` (+${Number(dot.mark)} marca)` : '';
        chips.push(`<span class="am-status-chip ${isBurn ? 'am-status-burn' : 'am-status-bleed'}">${isBurn ? '🔥 Queimadura' : '🩸 Sangramento'} ${Number(dot.dmg) || 0}×${Number(dot.turns)}${markBit}</span>`);
    }
    const th = m[`thorns${side}`];
    if (th && (Number(th.turns) || 0) > 0) chips.push(`<span class="am-status-chip am-status-thorns">🛡️ Espinhos ${Number(th.amount) || 0}×${Number(th.turns)}</span>`);
    const w = m[`ward${side}`];
    if (w && (Number(w.charges) || 0) > 0) chips.push(`<span class="am-status-chip am-status-ward">🔮 Barreira ${Math.round((Number(w.pct) || 0) * 100)}%×${Number(w.charges)}</span>`);
    const skipChip = m[`skipDraw${side}`];
    const skipTurnsChip = typeof skipChip === 'object' && skipChip ? Number(skipChip.turns) || 0 : Number(skipChip) || 0;
    if (skipTurnsChip > 0) chips.push(`<span class="am-status-chip am-status-stun">🌪️ Atordoado (${skipTurnsChip}t, não compra)</span>`);
    return chips.join('');
}

function renderArenaMatch(m) {
    const me = arenaMySideIn(m) || 'A';
    const foe = arenaOtherSide(me);
    const myUid = currentUser?.uid;
    const oppName = arenaMatchCardName(m, foe);
    const oppAvatarEl = $('#am-opponent-avatar');
    const oppAvatar = foe === 'A' ? m.playerAAvatar : m.playerBAvatar;
    if (oppAvatarEl) {
        if (oppAvatar) { oppAvatarEl.src = oppAvatar; oppAvatarEl.style.visibility = 'visible'; }
        else oppAvatarEl.style.visibility = 'hidden';
    }
    const setText = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };
    setText('#am-opponent-name', oppName);
    const oppHp = Math.max(0, Number(m[`hp${foe}`]) || 0);
    const myHp = Math.max(0, Number(m[`hp${me}`]) || 0);
    const oppShield = m[`shield${foe}`] || { phys: 0, mag: 0 };
    const myShield = m[`shield${me}`] || { phys: 0, mag: 0 };
    const oppHpEl = $('#am-opponent-hp'); if (oppHpEl) oppHpEl.style.width = `${(oppHp / ARENA_HP) * 100}%`;
    const myHpEl = $('#am-me-hp'); if (myHpEl) myHpEl.style.width = `${(myHp / ARENA_HP) * 100}%`;
    setText('#am-opponent-hpnum', String(oppHp));
    setText('#am-me-hpnum', String(myHp));
    const oppHandCount = (m[`hand${foe}`] || []).length;
    const oppDeckCount = (m[`deck${foe}`] || []).length;
    setText('#am-opponent-shield-phys', String(oppShield.phys || 0));
    setText('#am-opponent-shield-mag', String(oppShield.mag || 0));
    setText('#am-opponent-hand', String(oppHandCount));
    setText('#am-opponent-deck', String(oppDeckCount));
    setText('#am-me-shield-phys', String(myShield.phys || 0));
    setText('#am-me-shield-mag', String(myShield.mag || 0));
    setText('#am-me-turn', String(Number(m.turnNumber) || 1));
    const statusOpp = $('#am-status-opponent'); if (statusOpp) statusOpp.innerHTML = arenaStatusChipsHTML(m, foe);
    const statusMe = $('#am-status-me'); if (statusMe) statusMe.innerHTML = arenaStatusChipsHTML(m, me);
    const oppFieldUnits = m[`field${foe}`] || [];
    const myFieldUnits = m[`field${me}`] || [];
    const oppSummons = oppFieldUnits.filter((u) => u.kind === 'summon').length;
    const mySummons = myFieldUnits.filter((u) => u.kind === 'summon').length;
    const backOf = (units) => units.filter((u) => u.kind === 'structure' || u.kind === 'residence').length;
    const oppStructures = backOf(oppFieldUnits);
    const myStructures = backOf(myFieldUnits);
    setText('#am-front-count-opponent', `${oppSummons}/${ARENA_FRONT_MAX}`);
    setText('#am-front-count-me', `${mySummons}/${ARENA_FRONT_MAX}`);
    setText('#am-back-count-opponent', `${oppStructures}/${ARENA_BACK_MAX}`);
    setText('#am-back-count-me', `${myStructures}/${ARENA_BACK_MAX}`);

    // Turno
    const active = m.status === 'active';
    const myTurn = active && m.turn === me;
    const turnTag = $('#am-turn-tag');
    if (turnTag) turnTag.hidden = !myTurn;
    const turnTagOpp = $('#am-turn-tag-opp');
    if (turnTagOpp) turnTagOpp.hidden = !(active && !myTurn);
    const hint = $('#am-table-hint');
    if (hint) hint.textContent = active ? (myTurn ? 'solte a carta aqui pra jogar' : `aguardando ${oppName}…`) : '';

    // Pilhas (monte de compra + descarte)
    const myDiscPile = m[`discard${me}`] || [];
    const foeDiscPile = m[`discard${foe}`] || [];
    setText('#am-pile-deck-me', String((m[`deck${me}`] || []).length));
    setText('#am-pile-deck-foe', String((m[`deck${foe}`] || []).length));
    setText('#am-pile-discard-me', String(myDiscPile.length));
    setText('#am-pile-discard-foe', String(foeDiscPile.length));
    setText('#am-pile-discard-me-top', myDiscPile.length ? `descarte · ${myDiscPile[myDiscPile.length - 1].name || ''}` : 'descarte');
    setText('#am-pile-discard-foe-top', foeDiscPile.length ? `descarte · ${foeDiscPile[foeDiscPile.length - 1].name || ''}` : 'descarte');

    // Campos (criaturas) e estruturas
    const oppFieldEl = $('#am-board-opponent');
    if (oppFieldEl) oppFieldEl.innerHTML = oppFieldUnits.filter(u => u.kind === 'summon').map((u) => arenaTokenHTML(u, m, foe)).join('');
    const myFieldEl = $('#am-board-me');
    if (myFieldEl) myFieldEl.innerHTML = myFieldUnits.filter(u => u.kind === 'summon').map((u) => arenaTokenHTML(u, m, me)).join('');
    const backKinds = (u) => u.kind === 'structure' || u.kind === 'residence' || u.kind === 'resquicio';
    const oppStructEl = $('#am-structures-opponent');
    if (oppStructEl) oppStructEl.innerHTML = oppFieldUnits.filter(backKinds).map((u) => arenaTokenHTML(u, m, foe)).join('');
    const myStructEl = $('#am-structures-me');
    if (myStructEl) myStructEl.innerHTML = myFieldUnits.filter(backKinds).map((u) => arenaTokenHTML(u, m, me)).join('');

    // Log
    const logEl = $('#arena-log');
    if (logEl) logEl.innerHTML = (m.log || []).slice(-4).map((l) => `<div>${escapeHtml(l)}</div>`).join('');

    // Mão
    const handEl = $('#arena-hand');
    if (handEl) {
        handEl.innerHTML = (m[`hand${me}`] || []).map((c) => {
            let playable = m.status === 'active' && m.turn === me;
            let why = '';
            if (playable && c.category === 'invocacao' && mySummons >= ARENA_FRONT_MAX) { playable = false; why = 'Frente cheia (máx. 3 criaturas)'; }
            if (playable && (c.category === 'estrutura' || c.category === 'dano_terra' || c.category === 'cura' || c.category === 'defesa' || c.category === 'defesa_magica') && myStructures >= ARENA_BACK_MAX) { playable = false; why = `Retaguarda cheia (máx. ${ARENA_BACK_MAX})`; }
            const selected = arenaSelectedHand === c.id;
            const title = why ? ` title="${escapeHtml(why)}"` : '';
            return cardFaceHTML(c, { extraClass: `${playable ? '' : 'disabled'}${selected ? ' selected' : ''}`, attrs: `data-arena-hand-card="${escapeHtml(c.id)}" role="button" tabindex="0"${title}` });
        }).join('') || '<p class="muted" style="padding:14px">Mão vazia — passe o turno e compre mais 🂠</p>';
    }

    // Botões de ação
    const passBtn = $('#arena-pass-btn'); if (passBtn) passBtn.disabled = !myTurn;
    const forfeitBtn = $('#arena-forfeit-btn'); if (forfeitBtn) forfeitBtn.disabled = m.status !== 'active';

    // Fim de jogo
    const finishEl = $('#arena-finish');
    if (finishEl) {
        const over = m.status === 'finished' || m.status === 'settled' || m.status === 'cancelled';
        finishEl.hidden = !over;
        if (over) {
            const won = m.winner === myUid;
            const cancelled = m.status === 'cancelled';
            const settled = m.status === 'settled';
            finishEl.classList.toggle('am-finish--win', won && !cancelled);
            finishEl.classList.toggle('am-finish--lose', !won && !cancelled);
            finishEl.classList.toggle('am-finish--cancel', cancelled);
            const iconUse = $('#am-finish-icon-use');
            if (iconUse) iconUse.setAttribute('href', cancelled ? '#arena-flag' : won ? '#arena-trophy' : '#arena-x-circle');
            const myStake = me === 'A' ? m.stakeA : m.stakeB;
            const foeStake = me === 'A' ? m.stakeB : m.stakeA;
            const allCos = [...(m.stakeA?.cosmetics || []), ...(m.stakeB?.cosmetics || [])];
            const potGold = Number(m.potGold) || 0;
            const hasStake = potGold > 0 || allCos.length > 0;
            setText('#am-finish-title', cancelled ? 'Desafio cancelado' : won ? 'Você venceu!' : 'Você perdeu…');
            const subEl = $('#am-finish-sub');
            if (subEl) {
                if (cancelled) subEl.textContent = 'O desafio foi cancelado antes de começar. Nada foi apostado.';
                else if (settled) subEl.textContent = won ? 'Pote resgatado e guardado no seu bolso. GG!' : 'O pote foi para as mãos do rival. GG!';
                else if (won) subEl.textContent = hasStake ? 'Bom trabalho — o pote inteiro é seu.' : 'Vitória suada. Continue forjando seu deck!';
                else subEl.textContent = hasStake ? 'O rival leva o pote dessa vez. Revanche vinga!' : 'Derrota apertada. A próxima é sua!';
            }
            const potBox = $('#am-finish-pot');
            if (potBox) {
                if (hasStake && !cancelled) {
                    const coin = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-coin"></use></svg>';
                    const rows = [];
                    rows.push(`<div class="am-finish-pot-row"><span>${coin}Sua aposta</span><b>${escapeHtml(arenaStakeText(myStake))}</b></div>`);
                    rows.push(`<div class="am-finish-pot-row"><span>${coin}Rival apostou</span><b>${escapeHtml(arenaStakeText(foeStake))}</b></div>`);
                    rows.push(`<div class="am-finish-pot-row is-total"><span>${coin}Pote total</span><b>${escapeHtml(arenaStakeText({ gold: potGold, cosmetics: allCos }))}</b></div>`);
                    potBox.innerHTML = rows.join('');
                } else {
                    potBox.innerHTML = ''; // aposta vazia (amistosa ou cancelada) → some via CSS :empty
                }
            }
            const settleBtn = $('#am-settle-btn');
            if (settleBtn) {
                const canClaim = won && m.status === 'finished';
                settleBtn.hidden = !canClaim;
                settleBtn.disabled = !canClaim;
                const label = settleBtn.querySelector('.btn-label');
                if (label) label.textContent = 'Receber pote';
            }
        }
    }
}

/* Drag & drop (Pointer Events — funciona com toque) */
function arenaHandPointerDown(e) {
    const cardEl = e.target.closest?.('[data-arena-hand-card]');
    if (!cardEl || cardEl.classList.contains('disabled')) return;
    const m = arenaOpenMatchCache;
    if (!m) return;
    const me = arenaMySideIn(m);
    if (m.status !== 'active' || m.turn !== me) { showToast('Ainda não é seu turno ⏳', 'info'); return; }
    const cardId = cardEl.dataset.arenaHandCard;
    arenaHandDrag = { cardId, startX: e.clientX, startY: e.clientY, ghost: null, dragging: false };
    document.addEventListener('pointermove', arenaHandPointerMove);
    document.addEventListener('pointerup', arenaHandPointerUp, { once: true });
    document.addEventListener('pointercancel', arenaHandPointerCancel, { once: true });
}
function arenaHandPointerMove(e) {
    const d = arenaHandDrag;
    if (!d) return;
    const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
    if (!d.dragging && Math.hypot(dx, dy) > 12) {
        // Toque deslizando na HORIZONTAL = folhear a mão (scroll nativo);
        // arrastar na VERTICAL = levar a carta até a mesa.
        if (e.pointerType === 'touch' && Math.abs(dx) > Math.abs(dy)) {
            document.removeEventListener('pointermove', arenaHandPointerMove);
            arenaHandDrag = null;
            return;
        }
        d.dragging = true;
        const ghost = document.createElement('div');
        ghost.className = 'arena-ghost';
        ghost.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-swords"></use></svg>';
        document.body.appendChild(ghost);
        d.ghost = ghost;
    }
    if (d.dragging && d.ghost) {
        d.ghost.style.left = `${e.clientX}px`;
        d.ghost.style.top = `${e.clientY}px`;
        const table = $('#arena-table');
        if (table) {
            const r = table.getBoundingClientRect();
            const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
            table.classList.toggle('drop-target', over);
        }
    }
}
function arenaHandPointerUp(e) {
    document.removeEventListener('pointermove', arenaHandPointerMove);
    const d = arenaHandDrag;
    arenaHandDrag = null;
    const table = $('#arena-table');
    if (table) table.classList.remove('drop-target');
    if (!d) return;
    if (d.dragging) {
        if (d.ghost) d.ghost.remove();
        if (table) {
            const r = table.getBoundingClientRect();
            const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
            if (over) { playArenaCard(d.cardId); return; }
        }
    } else {
        // Toque simples: seleciona (toque de novo na mesa pra jogar)
        arenaSelectedHand = arenaSelectedHand === d.cardId ? null : d.cardId;
        if (arenaOpenMatchCache) renderArenaMatch(arenaOpenMatchCache);
    }
}
function arenaHandPointerCancel() {
    document.removeEventListener('pointermove', arenaHandPointerMove);
    const d = arenaHandDrag;
    arenaHandDrag = null;
    if (d?.ghost) d.ghost.remove();
    const table = $('#arena-table');
    if (table) table.classList.remove('drop-target');
}
function arenaTableTap() {
    if (!arenaSelectedHand) return;
    const id = arenaSelectedHand;
    arenaSelectedHand = null;
    playArenaCard(id);
}

function refreshArenaUI() {
    renderEcoBalances();
    fillArenaCategorySelect();
    renderArenaCreatePreview();
    renderCardCosmeticShop();
    loadArenaCards().catch((err) => console.warn('loadArenaCards:', err));
    void refreshArenaBattlePane();
}
function startArenaPolling() {
    if (arenaPollTimer) return;
    arenaPollTimer = setInterval(() => {
        const win = document.getElementById('app-arena');
        if (!win?.classList.contains('active')) return;
        if (arenaOpenMatchId) return; // onSnapshot cobre a partida ao vivo
        void refreshArenaBattlePane();
    }, 6000);
}

/* ---------- ARENA: wiring ---------- */
function openArenaBetModal(mode) {
    arenaBetMode = mode;
    arenaBetSelected = new Set();
    const title = $('#arena-bet-title');
    const sub = $('#arena-bet-sub');
    if (title) title.textContent = mode?.type === 'accept' ? '⚔️ Aceitar desafio' : mode?.type === 'invite' ? `⚔️ Convite para ${mode?.inviteeName || 'jogador'}` : '⚔️ Criar desafio';
    if (sub) sub.textContent = mode?.type === 'accept'
        ? 'Empate o pote ou supere: coloque sua parte e leve tudo se vencer.'
        : mode?.type === 'invite'
            ? 'Defina a aposta do convite. Só ' + (mode?.inviteeName || 'o convidado') + ' vê — se aceitar, o pote vira dele ao vencer.'
            : 'Defina sua aposta. Quem vencer leva o pote inteiro.';
    const input = $('#arena-bet-gold');
    if (input) input.value = '';
    renderArenaBetCosmetics();
    openModal('arena-bet-modal');
}
function renderArenaBetCosmetics() {
    const box = $('#arena-bet-cosmetics');
    if (!box || !ECO) return;
    const equippedIds = new Set(Object.values(economyState?.equippedMap || {}));
    if (economyState?.cardFrame) equippedIds.add(economyState.cardFrame); // moldura em uso fica de fora
    const ownedIds = (economyState?.cosmetics || []);
    const items = ownedIds
        .filter((id) => !equippedIds.has(id)) // equipados ficam de fora da aposta
        .map((id) => ECO.COSMETIC_BY_ID?.[id] || ECO.CARD_COSMETIC_BY_ID?.[id])
        .filter(Boolean);
    box.innerHTML = items.length
        ? items.map((c) => `<label class="arena-bet-cosm"><input type="checkbox" value="${escapeHtml(c.id)}" ${arenaBetSelected.has(c.id) ? 'checked' : ''}><span>${escapeHtml(c.emoji || '✨')} ${escapeHtml(c.name)} <small class="muted">· ${escapeHtml(c.rarityName || '')}</small></span></label>`).join('')
        : '<p class="muted">Nenhum cosmético disponível pra apostar (os equipados ficam de fora). Pode apostar só gold!</p>';
}
async function confirmArenaBet() {
    const goldInput = $('#arena-bet-gold');
    const stakeGold = Math.max(0, Math.floor(Number(goldInput?.value) || 0));
    const owned = new Set(economyState?.cosmetics || []);
    const stakeCos = [...arenaBetSelected].filter((id) => owned.has(id));
    if (!economyState) return;
    if (stakeGold > (economyState.gold || 0)) { showToast('Gold insuficiente pra essa aposta 🪙', 'warn'); return; }
    const btn = $('#arena-bet-confirm');
    if (btn) btn.disabled = true;
    let ok = false;
    if (arenaBetMode?.type === 'accept') ok = await acceptArenaChallengeFromBet(arenaBetMode.matchId, stakeGold, stakeCos);
    else if (arenaBetMode?.type === 'invite') ok = await createArenaInviteFromBet(stakeGold, stakeCos, { uid: arenaBetMode.inviteeId, name: arenaBetMode.inviteeName, avatarUrl: arenaBetMode.inviteeAvatar || '' });
    else ok = await createArenaChallengeFromBet(stakeGold, stakeCos);
    if (btn) btn.disabled = false;
    if (ok) closeModal('arena-bet-modal');
}

/* Troca de abas e cliques dinâmicos da Arena (delegação) */
document.addEventListener('click', async (e) => {
    const t = e.target;

    const arenaTab = t.closest?.('[data-arena-tab]');
    if (arenaTab) { setArenaTab(arenaTab.dataset.arenaTab); return; }

    const deckToggle = t.closest?.('[data-arena-deck-toggle]');
    if (deckToggle) { await toggleArenaCardInDeck(deckToggle.dataset.arenaDeckToggle); return; }

    const cardDelete = t.closest?.('[data-arena-card-delete]');
    if (cardDelete) { await deleteArenaCard(cardDelete.dataset.arenaCardDelete); return; }

    const treeBtn = t.closest?.('[data-arena-tree]');
    if (treeBtn) { await adjustArenaTree(treeBtn.dataset.arenaTree, Number(treeBtn.dataset.delta) || 0); return; }

    const effectChip = t.closest?.('#ac-effect-grid .effect-chip');
    if (effectChip) {
        arenaDraft.effect = effectChip.dataset.effect || '';
        renderArenaEffectGrid();
        renderArenaCreatePreview();
        return;
    }

    const pip = t.closest?.('.arena-pip[data-pip]');
    if (pip) {
        const value = Math.min(5, Math.max(1, Number(pip.dataset.value) || 3));
        if (pip.dataset.pip === 'cost') arenaDraft.cost = value;
        else if (pip.dataset.pip === 'power') arenaDraft.power = value;
        renderArenaCreatePreview();
        return;
    }

    const ctmWorkbench = t.closest?.('#ctm-workbench-btn');
    if (ctmWorkbench) { closeModal('arena-card-tree-modal'); openApp('refinery'); return; }

    const acceptBtn = t.closest?.('[data-arena-accept]');
    if (acceptBtn) { openArenaBetModal({ type: 'accept', matchId: acceptBtn.dataset.arenaAccept }); return; }

    const declineBtn = t.closest?.('[data-arena-decline]');
    if (declineBtn) { await declineArenaInvite(declineBtn.dataset.arenaDecline); return; }

    const cancelBtn = t.closest?.('[data-arena-cancel]');
    if (cancelBtn) { await cancelArenaChallenge(cancelBtn.dataset.arenaCancel); return; }

    const buyFrame = t.closest?.('[data-buy-card-frame]');
    if (buyFrame) { await buyCardFrame(buyFrame.dataset.buyCardFrame); renderCardCosmeticShop(); return; }

    const equipFrame = t.closest?.('[data-equip-card-frame]');
    if (equipFrame) { await equipCardFrame(equipFrame.dataset.equipCardFrame); renderCardCosmeticShop(); return; }

    const claimPots = t.closest?.('#arena-claim-pots-btn');
    if (claimPots) { await claimArenaSettlements(); refreshArenaBattlePane(); return; }

    const cardUpgrade = t.closest?.('[data-arena-card-upgrade]');
    if (cardUpgrade) { openCardTreeModal(cardUpgrade.dataset.arenaCardUpgrade); return; }

    const upgBtn = t.closest?.('[data-arena-evo]');
    if (upgBtn) { await buyArenaEvolution(upgBtn.dataset.cardId, upgBtn.dataset.arenaEvo, upgBtn.dataset.tier); return; }

    const buyRelic = t.closest?.('[data-buy-arena-relic]');
    if (buyRelic) { await buyArenaRelic(buyRelic.dataset.buyArenaRelic); return; }

    const equipRelic = t.closest?.('[data-equip-arena-relic]');
    if (equipRelic) { await toggleArenaRelicEquip(equipRelic.dataset.cardId, equipRelic.dataset.equipArenaRelic); return; }
});

/* Criar carta: preview ao vivo + upload de arte */
['ac-name', 'ac-flavor', 'ac-art-url'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', debounce(renderArenaCreatePreview, 120));
});
document.getElementById('ac-category')?.addEventListener('change', () => { renderArenaEffectGrid(); renderArenaCreatePreview(); });
$('#ac-form')?.addEventListener('submit', (e) => { e.preventDefault(); void saveArenaCard(); });
$('#ac-art-clear')?.addEventListener('click', () => {
    const input = $('#ac-art-url');
    if (input) input.value = '';
    arenaDraft.artUrl = '';
    renderArenaCreatePreview();
    $('#ac-name')?.focus();
});
$('#ac-art-upload')?.addEventListener('click', () => $('#file-gallery-card')?.click());
$('#file-gallery-card')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    showToast('Enviando a arte… ☁️', 'info', 2500);
    try {
        const url = await uploadToImgbb(file);
        const input = $('#ac-art-url');
        if (input) input.value = url;
        arenaDraft.artUrl = url;
        renderArenaCreatePreview();
        showToast('Arte pronta! Só salvar a carta.', 'success');
    } catch (err) { showToast(err?.message || 'Falha ao enviar a imagem.', 'error'); }
});
$('#ac-save-btn')?.addEventListener('click', saveArenaCard);

/* Batalha: botões e modal de aposta */
$('#arena-create-challenge-btn')?.addEventListener('click', () => {
    const v = validateArenaDeck();
    if (!v.ok) { showToast(`Monte seu deck primeiro — ${v.reason}`, 'warn', 4500); return; }
    openArenaBetModal({ type: 'create' });
});
$('#arena-invite-btn')?.addEventListener('click', async () => {
    const input = $('#arena-invite-nick');
    const nick = (input?.value || '').trim();
    if (!nick) { showToast('Digite o nick de quem você quer desafiar.', 'warn'); return; }
    const v = validateArenaDeck();
    if (!v.ok) { showToast(`Monte seu deck primeiro — ${v.reason}`, 'warn', 4500); return; }
    const btn = $('#arena-invite-btn');
    if (btn) btn.disabled = true;
    try {
        const target = await findUserByNick(nick);
        if (!target) { showToast(`Ninguém com o nick “${nick}” 🙈`, 'warn'); return; }
        if (target.uid === currentUser.uid) { showToast('Você não pode convidar a si mesmo.', 'warn'); return; }
        openArenaBetModal({ type: 'invite', inviteeId: target.uid, inviteeName: target.name, inviteeAvatar: target.avatarUrl || '' });
        if (input) input.value = '';
    } catch (err) {
        showToast(firestorePermissionMsg(err), 'error', 5000);
    } finally {
        if (btn) btn.disabled = false;
    }
});
$('#arena-resume-match-btn')?.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.matchId;
    if (id) openArenaMatch(id);
});
$('#arena-bet-confirm')?.addEventListener('click', confirmArenaBet);
$('#arena-bet-cosmetics')?.addEventListener('change', (e) => {
    const input = e.target.closest?.('input[type="checkbox"]');
    if (!input) return;
    if (input.checked) arenaBetSelected.add(input.value);
    else arenaBetSelected.delete(input.value);
});
$('#arena-pass-btn')?.addEventListener('click', passArenaTurn);
$('#arena-forfeit-btn')?.addEventListener('click', forfeitArenaMatch);
$('#am-leave-btn')?.addEventListener('click', leaveArenaMatch);
$('#am-settle-btn')?.addEventListener('click', async () => {
    if (!arenaOpenMatchId) return;
    const btn = $('#am-settle-btn');
    const label = btn?.querySelector('.btn-label');
    if (btn) btn.disabled = true;
    if (label) label.textContent = 'Resgatando…';
    try {
        await claimArenaSettlements();
    } catch (err) {
        console.warn('resgate de pote:', err?.message);
    }
    const cache = arenaOpenMatchCache;
    if (cache && cache.status === 'finished' && cache.winner === currentUser?.uid) {
        // Ainda não resgatou (rules pendentes, por exemplo) — deixa tentar de novo
        if (btn) btn.disabled = false;
        if (label) label.textContent = 'Tentar de novo';
        showToast('Não consegui resgatar agora. Tente de novo em instantes.', 'warn');
        return;
    }
    if (label) label.textContent = 'Pote resgatado!';
    // O onSnapshot troca a tela para o estado "settled" (some com o botão)
    if (arenaOpenMatchCache) renderArenaMatch(arenaOpenMatchCache);
});
const arenaHandEl = $('#arena-hand');
if (arenaHandEl) {
    arenaHandEl.addEventListener('pointerdown', arenaHandPointerDown);
    arenaHandEl.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && arenaHandEl.scrollWidth > arenaHandEl.clientWidth) {
            e.preventDefault();
            arenaHandEl.scrollLeft += e.deltaY;
        }
    }, { passive: false });
}
$('#arena-table')?.addEventListener('click', arenaTableTap);

/* ================= ESTADO DE AUTENTICAÇÃO ================= */
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadUserProfile();
        loadFeed();
        window.openChat('global'); // mantém o canal ouvindo para os badges
        startInboxListener();
        startDmInboxListener();
        startAmbientVibes();
        initEconomy().then(claimGifts).then(() => claimArenaSettlements());
        if (unlocked) showUnlockedScreen();
    } else {
        currentUser = null;
        currentUserProfile = {};
        feedInitialLoad = true;
        inboxInitialLoad = true;
        dmInitialLoad = true;
        if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
        if (commentsUnsubscribe) { commentsUnsubscribe(); commentsUnsubscribe = null; }
        if (inboxUnsubscribe) { inboxUnsubscribe(); inboxUnsubscribe = null; }
        if (dmUnsubscribe) { dmUnsubscribe(); dmUnsubscribe = null; }
        stopAmbientVibes();
        feedPostsCache = [];
        stopEconomyTicker();
        economyState = null;
        relock();
    }
});

/* ================= INICIALIZAÇÃO ================= */
renderHomeIcons();
renderNotificationsList();
updateNotifPermissionButton();
tickClock();
setInterval(tickClock, 1000);

/* Tema salvo → toggle sincronizado */
(() => {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const toggle = $('#dark-mode-toggle');
    if (toggle) toggle.checked = theme === 'dark';
})();

/* ================= ATUALIZAÇÃO DO APP (NOVA VERSÃO) ================= */
// ATENÇÃO: subir junto com version.json/sw.js em CADA release — se ficar pra
// trás, o app acha que há atualização pra sempre e o aviso não some.
const APP_VERSION = '5.1.0';
const appVersionEl = $('#app-version');
if (appVersionEl) appVersionEl.textContent = `Good Vibes 🌊 · O Refúgio · v${APP_VERSION}`;
let swRegistration = null;
let userRequestedUpdate = false;
/* Versão remota vista por último nesta sessão (preenchida por checkVersionFile) —
   assim o aviso do SW e o do version.json são tratados como o MESMO aviso. */
let pendingRemoteVersion = null;

const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignora */ } };

/* O usuário já dispensou o aviso desta versão? (persiste entre sessões) */
const isUpdateDismissed = (version) => {
    if (!version) return false;
    return lsGet('gv_update_dismissed_for') === version;
};

/* Exibe a "barrinha" de nova versão */
let lastNotifiedVersion = null;
function showUpdateBanner(notes, version) {
    const banner = $('#update-banner');
    if (!banner) return;
    lastNotifiedVersion = version ?? pendingRemoteVersion ?? null;
    $('#update-banner-notes').textContent = notes || 'Melhorias e correções esperando por você.';
    const alreadyVisible = !banner.hidden;
    banner.hidden = false;
    if (!alreadyVisible) vibrate([10, 40, 10]);
}
function hideUpdateBanner() {
    const banner = $('#update-banner');
    if (banner) banner.hidden = true;
    // Dispensa SÓ esta versão — um deploy novo volta a avisar (e uma versão
    // que o usuário já viu/dispensou não fica martelando pra sempre)
    const v = lastNotifiedVersion ?? pendingRemoteVersion;
    if (v) lsSet('gv_update_dismissed_for', v);
}

/* Aplica a atualização quando o usuário toca em "Atualizar" */
async function applyUpdate() {
    const btn = $('#update-banner-btn');
    if (btn) { btn.textContent = '⏳ Atualizando…'; btn.disabled = true; }
    userRequestedUpdate = true;
    try { localStorage.removeItem('gv_update_dismissed_for'); } catch { /* ignora */ }
    try { sessionStorage.removeItem('gv_update_dismissed'); } catch { /* ignora */ }

    // Garante que o botão nunca fica preso em "Atualizando…":
    // se nada mudar em 4s, recarrega mesmo assim (a navegação é network-first)
    const safety = setTimeout(() => window.location.reload(), 4000);

    // Caminho ideal: existe um Service Worker novo esperando → ativa e recarrega
    if (swRegistration?.waiting) {
        swRegistration.waiting.postMessage('SKIP_WAITING');
        return; // o handler de controllerchange recarrega a página
    }
    // Sem SW esperando: pede pro browser baixar a versão nova e,
    // em paralelo, limpa o cache do app shell e recarrega da rede
    try { await swRegistration?.update(); } catch { /* ignora */ }
    try {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.includes('good-vibes')).map((k) => caches.delete(k)));
    } catch { /* sem cache API */ }
    clearTimeout(safety);
    window.location.reload();
}

/* Confirma a versão remota via version.json (independente do SW) */
async function checkVersionFile() {
    if (typeof fetch !== 'function') return;
    try {
        const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const remote = data?.version;
        if (!remote) return;
        if (remote === APP_VERSION) {
            // App atualizado: limpa a dispensa antiga pra um deploy futuro avisar normalmente
            if (lsGet('gv_update_dismissed_for')) lsSet('gv_update_dismissed_for', '');
            pendingRemoteVersion = null;
            lastNotifiedVersion = null;
            const banner = $('#update-banner');
            if (banner) banner.hidden = true; // aviso antigo perdeu o sentido: você já está na versão nova
            return;
        }
        pendingRemoteVersion = remote;
        if (isUpdateDismissed(remote)) return;
        showUpdateBanner(data?.notes, remote);
    } catch { /* offline: sem avisos */ }
}

$('#update-banner-btn')?.addEventListener('click', applyUpdate);
$('#update-banner-close')?.addEventListener('click', hideUpdateBanner);

/* Service Worker (PWA offline) + detecção de nova versão */
if ('serviceWorker' in navigator) {
    // Só recarrega automaticamente se o usuário PEDIU a atualização
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (userRequestedUpdate) window.location.reload();
    });

    window.addEventListener('load', async () => {
        try {
            swRegistration = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });

            // Confirma a versão remota primeiro — ela alimenta o aviso do SW
            await checkVersionFile();

            // Já existe versão nova baixando/esperando? (mesmo aviso, mesma dispensa)
            if (swRegistration.waiting && navigator.serviceWorker.controller && !isUpdateDismissed(pendingRemoteVersion)) {
                showUpdateBanner('Versão baixada! Toque em Atualizar para aplicar.', pendingRemoteVersion);
            }
            swRegistration.addEventListener('updatefound', () => {
                const newWorker = swRegistration.installing;
                if (!newWorker) return;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller && !isUpdateDismissed(pendingRemoteVersion)) {
                        showUpdateBanner('Versão baixada! Toque em Atualizar para aplicar.', pendingRemoteVersion);
                    }
                });
            });

            // Verifica se há deploy novo a cada 2 minutos…
            setInterval(() => swRegistration.update().catch(() => {}), 2 * 60 * 1000);
            // …e sempre que o usuário volta para o app
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    swRegistration.update().catch(() => {});
                    void checkVersionFile();
                }
            });
        } catch (err) {
            console.warn('SW não registrado:', err);
            checkVersionFile(); // garante o aviso mesmo sem o SW
        }
        setInterval(checkVersionFile, 5 * 60 * 1000);
    });
} else {
    checkVersionFile();
    setInterval(checkVersionFile, 5 * 60 * 1000);
}

/* ============ VITRINE DE ITENS NA LOJA 🎒 (mercado dos jogadores) ============ */
function renderShopItems() {
    const list = $('#shop-items-list');
    if (!list) return;
    const others = marketListings.filter((l) => l.seller !== currentUser?.uid);
    list.innerHTML = others.length
        ? others.map(marketCardHTML).join('')
        : '<p class="inv-empty">Ninguém vendendo nada agora… Seja a primeira pessoa a anunciar no Mercado 🛒</p>';
}
$('#shop-items-refresh')?.addEventListener('click', async () => {
    await fetchMarket();
    renderShopItems();
    showToast('Vitrine atualizada 🔄', 'info');
});

/* ============ PERFIL DE OUTRO USUÁRIO 👤 (posts dele, estilo TikTok) ============ */
const upmState = { uid: null, name: '', posts: [], shown: 10, pageSize: 10 };

async function openUserProfile(uid) {
    if (!uid) return;
    if (uid === currentUser?.uid) { openApp('profile'); return; }
    upmState.uid = uid;
    upmState.name = 'Usuário';
    upmState.posts = [];
    upmState.shown = upmState.pageSize;

    const cover = $('#user-profile-cover');
    if (cover) cover.setAttribute('style', 'background:linear-gradient(135deg,#f43f5e,#8b5cf6,#06b6d4)');
    const nameEl = $('#user-profile-name'); if (nameEl) nameEl.textContent = 'Carregando…';
    const flair = $('#user-profile-flair'); if (flair) flair.innerHTML = '';
    const stats = $('#user-profile-stats'); if (stats) stats.textContent = '';
    const avatarEl = $('#user-profile-avatar'); if (avatarEl) avatarEl.innerHTML = '<span class="avatar-initials">…</span>';
    const ofEl = $('#user-profile-posts-of'); if (ofEl) ofEl.textContent = '…';
    const box = $('#user-profile-posts'); if (box) box.innerHTML = '<p class="muted">Carregando posts…</p>';
    const more = $('#user-profile-load-more'); if (more) more.hidden = true;
    openModal('user-profile-modal');

    let u = {};
    let postDocs = [];
    try {
        const [userSnap, postsSnap] = await Promise.allSettled([
            getDoc(doc(db, 'users', uid)),
            getDocs(query(collection(db, 'posts'), where('userId', '==', uid)))
        ]);
        if (userSnap.status === 'fulfilled' && userSnap.value?.exists()) u = userSnap.value.data();
        if (postsSnap.status === 'fulfilled') {
            postDocs = postsSnap.value.docs
                .slice()
                .sort((a, b) => (b.data().timestamp?.toMillis?.() || 0) - (a.data().timestamp?.toMillis?.() || 0));
        }
    } catch (err) {
        console.warn('Não consegui carregar o perfil:', err?.message);
    }
    upmState.posts = postDocs;

    const latest = postDocs[0];
    const latestData = latest?.data() || {};
    const cosMap = latest ? cosmicMapOf(latestData) : {};
    const name = (typeof u.name === 'string' && u.name.trim()) ? u.name.trim() : (latestData.authorName || 'Usuário');
    upmState.name = name;

    if (cover) {
        if (cosMap.fundo) cover.setAttribute('style', `background:linear-gradient(135deg, ${cosMap.fundo.c1}, ${cosMap.fundo.c2})`);
    }
    const initials = escapeHtml(name.trim().substring(0, 2).toUpperCase() || 'GV');
    const avatarUrl = sanitizeUrl(u.avatarUrl || latestData.authorAvatar || '');
    const raw = `<span class="avatar-initials" aria-hidden="true">${initials}</span>`
        + (avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="" onerror="this.remove()">` : '');
    const cosFramed = !!(cosMap.moldura || cosMap.aura);
    if (avatarEl) avatarEl.innerHTML = cosFramed ? cosAvatarHTML(cosMap.moldura, cosMap.aura, raw) : raw;
    if (nameEl) nameEl.innerHTML = nameHtmlFor(name, cosMap.nome);
    if (flair) flair.innerHTML = [renderAuthorFlair(cosMap.emblema), renderAuthorFlair(cosMap.titulo)].filter(Boolean).join(' ');
    if (stats) stats.textContent = `${postDocs.length} post${postDocs.length === 1 ? '' : 's'} no Refúgio`;
    if (ofEl) ofEl.textContent = name.split(' ')[0];
    renderUserProfilePosts();
}

function renderUserProfilePosts() {
    const box = $('#user-profile-posts');
    if (!box) return;
    const { posts } = upmState;
    const more = $('#user-profile-load-more');
    if (!posts.length) {
        box.innerHTML = '<p class="muted">Ainda não publicou nada por aqui 🌊</p>';
        if (more) more.hidden = true;
        return;
    }
    const visible = posts.slice(0, upmState.shown);
    box.innerHTML = visible.map(postCardHTML).join('');
    if (more) more.hidden = visible.length >= posts.length;
}

$('#user-profile-load-more')?.addEventListener('click', () => {
    upmState.shown += upmState.pageSize;
    renderUserProfilePosts();
});
$('#user-profile-dm-btn')?.addEventListener('click', () => {
    if (!upmState.uid) return;
    const { uid, name } = upmState;
    closeModal('user-profile-modal');
    openApp('chat');
    window.startPrivateChat(uid, name || 'Usuário');
});

/* ============ WIRING: CRAFT 🛠️ + COLETA ⛏️ ============ */
$('#craft-tray')?.addEventListener('pointerdown', craftPointerDown);
$('#craft-grid')?.addEventListener('click', craftCellClick);
$('#craft-do-btn')?.addEventListener('click', () => { void craftNow(); });
$('#craft-clear-btn')?.addEventListener('click', clearCraftGrid);
$('#mash-btn')?.addEventListener('click', mashTap);
$('#gather-done-btn')?.addEventListener('click', () => closeGatherGame(false));
$('#gather-quit-btn')?.addEventListener('click', () => closeGatherGame(true));
