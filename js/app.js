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
const outputInfo = (id) => ECO?.MATERIAL_BY_ID?.[id] || ECO?.ARTIFACT_BY_ID?.[id] || { id, name: id, emoji: '📦' };
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
        arenaDeck: Array.isArray(d.arenaDeck) ? d.arenaDeck.filter((x) => typeof x === 'string') : []
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
    const inv = { ...economyState.inv };
    for (const id of craftGrid) {
        if (!id) continue;
        inv[id] = (inv[id] || 0) - 1;
        if (inv[id] <= 0) delete inv[id];
    }
    const artifact = ECO.ARTIFACT_BY_ID?.[match.out];
    craftGrid = Array(9).fill(null);
    craftSelected = null;
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
let arenaDraft = { artUrl: '', cost: 3, power: 3 };
let arenaSaveBusy = false;
let arenaHandDrag = null;
let arenaSelectedHand = null;
let arenaPollTimer = null;

const ARENA_DECK_MIN = 5;               // mínimo de cartas pra formar deck
const ARENA_DECK_MAX_POINTS = 30;       // 30 pontos por deck
const ARENA_TREE_MAX = 30;              // 30 pontos pra espalhar na árvore
const ARENA_HP = 60;
const ARENA_SHIELD_MAX = 40;
const ARENA_TOKEN_TURNS = 3;
const ARENA_CARD_LIMIT = 30;            // teto de cartas criadas por jogador
const ARENA_ART_MAX = 500;              // teto de URL de arte

/* Glifo vetorial (SVG) por categoria — sem emojis na Arena */
const ARENA_CATEGORY_GLYPHS = { dano: 'arena-sword', dano_fogo: 'arena-flame', dano_agua: 'arena-droplet', dano_ar: 'arena-wind', dano_terra: 'arena-mountain', cura: 'arena-heart', defesa: 'arena-shield', defesa_magica: 'arena-shield-mag', invocacao: 'arena-moon', estrutura: 'arena-tower' };
const arenaCatGlyphId = (catId) => ARENA_CATEGORY_GLYPHS[catId] || 'arena-swords';
const arenaCatIconSVG = (catId, size = 16) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><use href="#${arenaCatGlyphId(catId)}"></use></svg>`;
const arenaHexIconSVG = (size = 12) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><use href="#arena-hex"></use></svg>`;

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
    return `<div class="card-face${mini ? ' card-face--mini' : ''} ${tintClass} ${extraClass}" style="${style}" ${attrs}>
        <div class="cf-name">${escapeHtml(card.name || 'Sem nome')}</div>
        <div class="cf-art ${tintClass}">${artHtml}</div>
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
        ? arenaCards.map((c) => `<div class="card-in-grid">
            ${cardFaceHTML(c, { mini: true })}
            <div class="card-in-grid-actions">
                <button class="card-deck-toggle${deckSet.has(c.id) ? ' indk' : ''}" data-arena-deck-toggle="${escapeHtml(c.id)}">${deckSet.has(c.id) ? '✓ No deck' : '+ Deck'}</button>
                <button class="card-delete" data-arena-card-delete="${escapeHtml(c.id)}" aria-label="Apagar carta" title="Apagar carta"><svg viewBox="0 0 24 24"><use href="#arena-trash"></use></svg></button>
            </div>
        </div>`).join('')
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
            category, cost, power,
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
        arenaSyncPips();
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

/* ---------- Criação de carta: preview ao vivo ---------- */
function arenaEffectHintText(category, power) {
    const eff = Math.max(1, Number(power) || 1);
    const cat = ECO?.CARD_CATEGORY_BY_ID?.[category];
    const kind = cat?.kind;
    const base = Math.max(1, Math.round(eff * 3) + 2);
    const structureDmg = Math.max(1, Math.round(eff * 2) + 1);
    const structureTick = Math.max(1, Math.round(eff));
    switch (kind) {
        case 'physical': return `Causa ${base} de dano físico — o escudo físico do rival absorve primeiro.`;
        case 'magic': return `Causa ${base} de dano mágico — o escudo mágico do rival absorve primeiro.`;
        case 'heal': return `Restaura ${base} de vida (até o máximo de ${ARENA_HP}).`;
        case 'shield': return `Concede ${base} de escudo físico (até o teto de ${ARENA_SHIELD_MAX}).`;
        case 'shieldmagic': return `Concede ${base} de escudo mágico (até o teto de ${ARENA_SHIELD_MAX}).`;
        case 'summon': return `Invoca uma criatura de poder ${eff} na sua mesa, atacando por ${ARENA_TOKEN_TURNS} turnos.`;
        case 'structure': return `Causa ${structureDmg} imediato e ${structureTick} de dano no início de cada turno.`;
        default: return '';
    }
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
    const flavor = $('#ac-flavor');
    const counter = $('#ac-flavor-count');
    if (counter) counter.textContent = `${(flavor?.value || '').length}/120`;
    const hint = $('#ac-effect-hint-text');
    if (hint) hint.textContent = arenaEffectHintText($('#ac-category')?.value || 'dano', arenaDraft.power);
    const clearBtn = $('#ac-art-clear');
    if (clearBtn) clearBtn.hidden = !($('#ac-art-url')?.value || arenaDraft.artUrl);
}
function renderArenaCreatePreview() {
    const box = $('#ac-preview');
    if (!box) return;
    arenaSyncCreateFormUI();
    const catSel = $('#ac-category');
    const draft = {
        name: ($('#ac-name')?.value || '').trim() || 'Sua carta',
        artUrl: sanitizeUrl(($('#ac-art-url')?.value || '').trim()) || arenaDraft.artUrl || '',
        category: catSel?.value || 'dano',
        cost: arenaDraft.cost,
        power: arenaDraft.power,
        flavor: ($('#ac-flavor')?.value || '').trim()
    };
    box.outerHTML = cardFaceHTML(draft, { attrs: 'id="ac-preview"' });
}
function fillArenaCategorySelect() {
    const sel = $('#ac-category');
    if (!sel || !ECO?.CARD_CATEGORIES) return;
    sel.innerHTML = ECO.CARD_CATEGORIES.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.word)} — ${escapeHtml(c.desc)}</option>`).join('');
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
    return { id: c.id, name: c.name || 'Sem nome', emoji: c.emoji || '🃏', artUrl: c.artUrl || '', category: c.category, cost: Number(c.cost) || 1, power: Number(c.power) || 1, flavor: c.flavor || '' };
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
   Retorna novas arrays de field/hand/deck + hp do oponente + logs. */
function arenaStartOfTurnPatch(m, side) {
    const foe = arenaOtherSide(side);
    const hpFoeKey = arenaSideField(foe, 'hp');
    const fieldKey = arenaSideField(side, 'field');
    const handKey = arenaSideField(side, 'hand');
    const deckKey = arenaSideField(side, 'deck');
    const shieldFoeKey = arenaSideField(foe, 'shield');
    const log = [];
    let hpFoe = Number(m[hpFoeKey]) || ARENA_HP;
    const shieldFoe = { ...(m[shieldFoeKey] || { phys: 0, mag: 0 }) };
    const meName = arenaMatchCardName(m, side);

    const field = [];
    for (const unit of m[fieldKey] || []) {
        const u = { ...unit };
        if (u.kind === 'summon') {
            const mult = arenaMultOf(m, side, 'invocacao');
            const dmg = Math.max(1, Math.round((Number(u.power) || 1) * 2 * mult));
            const { shieldLeft, rest } = arenaAbsorb(shieldFoe.phys, dmg);
            shieldFoe.phys = shieldLeft;
            hpFoe -= rest;
            log.push(`${u.emoji || '🗿'} ${meName}: ${u.name} golpeou por ${dmg} (${rest} na vida)`);
            u.turnsLeft = (Number(u.turnsLeft) || ARENA_TOKEN_TURNS) - 1;
            if (u.turnsLeft > 0) field.push(u);
            else log.push(`⏳ ${u.name} se desfez`);
        } else if (u.kind === 'structure') {
            const dmg = Math.max(1, Number(u.tick) || 1);
            const { shieldLeft, rest } = arenaAbsorb(shieldFoe.mag, dmg);
            shieldFoe.mag = shieldLeft;
            hpFoe -= rest;
            log.push(`🏗️ ${meName}: ${u.name} causou ${dmg} de dano`);
            field.push(u);
        } else {
            field.push(u);
        }
    }

    // Compra: repõe a mão até 5 (máx 7)
    let hand = [...(m[handKey] || [])];
    let deck = [...(m[deckKey] || [])];
    while (hand.length < 5 && deck.length) {
        hand.push(deck[0]);
        deck = deck.slice(1);
    }

    const patch = {
        [fieldKey]: field,
        [handKey]: hand,
        [deckKey]: deck,
        [shieldFoeKey]: shieldFoe,
        [hpFoeKey]: hpFoe
    };
    return { patch, log, hpFoe, foe };
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
            const mult = arenaMultOf(m, side, card.category);
            const eff = Number(card.power) * mult;
            const meName = arenaMatchCardName(m, side);
            const foeName = arenaMatchCardName(m, foe);

            const patch = {};
            const log = [];
            let hpMe = Number(m[arenaSideField(side, 'hp')]) || ARENA_HP;
            let hpFoe = Number(m[arenaSideField(foe, 'hp')]) || ARENA_HP;
            const shieldMe = { ...(m[arenaSideField(side, 'shield')] || { phys: 0, mag: 0 }) };
            const shieldFoe = { ...m[arenaSideField(foe, 'shield')] || { phys: 0, mag: 0 } };
            const fieldKey = arenaSideField(side, 'field');
            const field = [...(m[fieldKey] || [])];

            const dealPhys = (dmg) => {
                const { shieldLeft, rest } = arenaAbsorb(shieldFoe.phys, dmg);
                shieldFoe.phys = shieldLeft; hpFoe -= rest;
                return rest;
            };
            const dealMag = (dmg) => {
                const { shieldLeft, rest } = arenaAbsorb(shieldFoe.mag, dmg);
                shieldFoe.mag = shieldLeft; hpFoe -= rest;
                return rest;
            };

            switch (cat.kind) {
                case 'physical': {
                    const dmg = Math.max(1, Math.round(eff * 3) + 2);
                    const rest = dealPhys(dmg);
                    log.push(`🗡️ ${meName} usou ${card.name}: ${dmg} de dano (${rest} na vida de ${foeName})`);
                    break;
                }
                case 'magic': {
                    const dmg = Math.max(1, Math.round(eff * 3) + 2);
                    const rest = dealMag(dmg);
                    log.push(`${cat.emoji} ${meName} usou ${card.name}: ${dmg} de dano mágico (${rest} na vida)`);
                    break;
                }
                case 'heal': {
                    const heal = Math.max(1, Math.round(eff * 3) + 2);
                    hpMe = Math.min(ARENA_HP, hpMe + heal);
                    log.push(`💚 ${meName} usou ${card.name}: +${heal} de vida`);
                    break;
                }
                case 'shield': {
                    const add = Math.max(1, Math.round(eff * 3) + 2);
                    shieldMe.phys = Math.min(ARENA_SHIELD_MAX, shieldMe.phys + add);
                    log.push(`🛡️ ${meName} ergueu ${card.name}: +${add} de escudo físico`);
                    break;
                }
                case 'shieldmagic': {
                    const add = Math.max(1, Math.round(eff * 3) + 2);
                    shieldMe.mag = Math.min(ARENA_SHIELD_MAX, shieldMe.mag + add);
                    log.push(`🔮 ${meName} ergueu ${card.name}: +${add} de escudo mágico`);
                    break;
                }
                case 'summon': {
                    field.push({ kind: 'summon', uid: `tk_${Date.now()}_${Math.floor(Math.random() * 1e6)}`, name: card.name, emoji: card.emoji || '🗿', category: card.category, power: Number(card.power) || 1, turnsLeft: ARENA_TOKEN_TURNS });
                    log.push(`🗿 ${meName} invocou ${card.name}! (ataca nos próximos ${ARENA_TOKEN_TURNS} turnos)`);
                    break;
                }
                case 'structure': {
                    const dmg = Math.max(1, Math.round(eff * 2) + 1);
                    const tick = Math.max(1, Math.round(eff));
                    const rest = dealMag(dmg);
                    field.push({ kind: 'structure', uid: `st_${Date.now()}_${Math.floor(Math.random() * 1e6)}`, name: card.name, emoji: '🏗️', category: card.category, tick });
                    log.push(`🏗️ ${meName} ergueu ${card.name}: ${dmg} de dano imediato e ${tick}/turno`);
                    break;
                }
                default:
                    throw new Error('Efeito desconhecido.');
            }

            // Remove da mão e passa a vez; o turno do adversário começa com os gatilhos dele
            hand.splice(idx, 1);
            patch[arenaSideField(side, 'hp')] = hpMe;
            patch[arenaSideField(side, 'shield')] = shieldMe;
            patch[arenaSideField(foe, 'hp')] = hpFoe;
            patch[arenaSideField(foe, 'shield')] = shieldFoe;
            patch[fieldKey] = field;
            patch[handKey] = hand;

            if (hpFoe <= 0) {
                Object.assign(patch, arenaFinishPatch(m, side === 'A' ? m.playerA : m.playerB, [...log, `🏆 ${foeName} caiu! ${meName} venceu!`]));
            } else {
                // Passa a vez e aplica o início do turno do adversário:
                // as criaturas/estruturas DELE batem em VOCÊ, e ele compra.
                // (start.hpFoe devolve a vida de QUEM recebeu a vez... não:
                //  devolve a vida do oponente de quem está começando, ou seja,
                //  a SUA vida — por isso a derrota aqui é sua.)
                const mAfter = { ...m, ...patch };
                const start = arenaStartOfTurnPatch(mAfter, foe);
                Object.assign(patch, start.patch);
                log.push(...start.log);
                patch.turn = foe;
                patch.turnNumber = (Number(m.turnNumber) || 1) + 1;
                if (start.hpFoe <= 0) {
                    Object.assign(patch, arenaFinishPatch(m, foe === 'A' ? m.playerA : m.playerB, [...log, `🏆 Os gatilhos de ${foeName} derrubaram ${meName}!`]));
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

/* Passar o turno */
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
            if (start.hpFoe <= 0) {
                Object.assign(patch, arenaFinishPatch(m, foe === 'A' ? m.playerA : m.playerB, [...log, `🏆 Os gatilhos de ${foeName} derrubaram ${meName}!`]));
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
        const snap = await getDocs(query(collection(db, 'arena_matches'), where('winner', '==', currentUser.uid), limit(25)));
        for (const d of snap.docs) {
            const m = d.data();
            if (m.status !== 'finished') continue;
            const got = await settleArenaMatchDoc(d.ref, m);
            if (got.gold || got.cos) { totalGold += got.gold; totalCos += got.cos; count++; }
        }
    } catch (err) { console.warn('Resgate de potes indisponível:', err?.message); }
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
                fieldA: [], fieldB: [],
                treeA: { ...(economyState?.arenaTree || {}) }, catCountA: arenaCatCounts(arenaDeckSnapshot()),
                treeB: {}, catCountB: {},
                stakeA: { gold: stakeGold, cosmetics: stakeCos },
                stakeB: { gold: 0, cosmetics: [] },
                potGold: stakeGold,
                winner: '',
                log: [`⚔️ ${myName} abriu um desafio — pote: ${arenaStakeText({ gold: stakeGold, cosmetics: stakeCos })}`],
                createdAt: serverTimestamp()
            });
        });
        addLedger('arena', 'Aposta em desafio da Arena', -stakeGold);
        vibrate([12, 40, 12]);
        showToast('Desafio criado! Agora é só esperar alguém aceitar ⚔️', 'success', 4000);
        await reloadEconomyFromServer();
        renderArenaBattlePane();
        return true;
    } catch (err) {
        console.warn('createChallenge:', err);
        showToast(err?.message === 'OURO_INSUFICIENTE' ? 'Gold insuficiente pra essa aposta 🪙' : err?.message === 'COSMETICO_AUSENTE' ? 'Esse cosmético não está mais no seu baú.' : 'Não consegui criar o desafio. Rules publicadas?', 'error', 4500);
        return false;
    }
}

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
            if (!m || m.status !== 'waiting') throw new Error('JOGO_ACABOU');
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
        renderArenaBattlePane();
        return false;
    }
}

async function cancelArenaChallenge(matchId) {
    if (!currentUser) return;
    try {
        await runTransaction(db, async (tx) => {
            const mRef = doc(db, 'arena_matches', matchId);
            const mSnap = await tx.get(mRef);
            const m = mSnap.data();
            if (!m || m.status !== 'waiting' || m.playerA !== currentUser.uid) throw new Error('INVALIDA');
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
        renderArenaBattlePane();
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
    const avatar = sanitizeUrl(m.playerAAvatar || '');
    const avatarHtml = avatar
        ? `<img src="${escapeHtml(avatar)}" alt="" loading="lazy" onerror="this.remove()">`
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-swords"></use></svg>';
    return `<div class="arena-challenge">
        <span class="arena-challenge-avatar">${avatarHtml}</span>
        <span class="arena-challenge-info"><strong>${escapeHtml(m.playerAName || 'Alguém')}</strong>
            <span class="arena-pot"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-coin"></use></svg>Pote: ${escapeHtml(arenaStakeText(m.stakeA))}</span></span>
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
    // Potes pendentes de resgate
    try {
        const snap = await getDocs(query(collection(db, 'arena_matches'), where('winner', '==', currentUser.uid), limit(15)));
        const pending = snap.docs.filter((d) => d.data().status === 'finished');
        const banner = $('#arena-settle-banner');
        if (banner) {
            banner.innerHTML = pending.length
                ? `<div class="arena-settle"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-coin"></use></svg><span class="arena-settle-text">Você tem <strong>${pending.length}</strong> pote${pending.length > 1 ? 's' : ''} de batalha pra resgatar!</span><button class="arena-btn arena-btn-primary arena-btn-sm" id="arena-claim-pots-btn">Resgatar</button></div>`
                : '';
        }
    } catch (err) { console.warn('banner de potes:', err?.message); }
    // Desafios abertos + meus desafios esperando
    try {
        const snap = await getDocs(query(collection(db, 'arena_matches'), where('status', '==', 'waiting'), limit(20)));
        const mine = currentUser.uid;
        const waiting = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const myWaiting = waiting.filter((m) => m.playerA === mine);
        const open = waiting.filter((m) => m.playerA !== mine)
            .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        const countEl = $('#arena-open-count');
        if (countEl) countEl.textContent = open.length ? `${open.length} aberto${open.length > 1 ? 's' : ''}` : '';
        const list = $('#arena-challenge-list');
        if (list) {
            const html = myWaiting.map((m) => arenaChallengeRowHTML(m, true)).join('')
                + open.map((m) => arenaChallengeRowHTML(m, false)).join('');
            list.innerHTML = html || '<p class="muted">Nenhum desafio aberto agora. Crie o primeiro! ⚔️</p>';
        }
    } catch (err) {
        console.warn('desafios abertos:', err?.message);
        const list = $('#arena-challenge-list');
        if (list) list.innerHTML = '<p class="muted">Não consegui carregar os desafios (rules da Arena publicadas?).</p>';
    }
    // Histórico recente (duas queries simples, mescladas no cliente)
    try {
        const [a, b] = await Promise.all([
            getDocs(query(collection(db, 'arena_matches'), where('playerA', '==', currentUser.uid), limit(10))),
            getDocs(query(collection(db, 'arena_matches'), where('playerB', '==', currentUser.uid), limit(10)))
        ]);
        const hist = [...a.docs, ...b.docs].map((d) => ({ id: d.id, ...d.data() }))
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
    arenaOpenMatchId = null;
    arenaOpenMatchCache = null;
    arenaSelectedHand = null;
    if (arenaMatchUnsub) { try { arenaMatchUnsub(); } catch { /* ignora */ } arenaMatchUnsub = null; }
    const hub = $('#arena-hub'); if (hub) hub.hidden = false;
    const matchEl = $('#arena-match'); if (matchEl) matchEl.hidden = true;
    const finish = $('#arena-finish'); if (finish) finish.hidden = true;
    refreshArenaUI();
}
function arenaTokenHTML(u) {
    if (u.kind === 'structure') {
        return `<span class="am-struct" title="${escapeHtml(u.name || 'Estrutura')}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-tower"></use></svg>${escapeHtml(u.name || 'Estrutura')} · ${Number(u.tick) || 1}/turno</span>`;
    }
    const shortName = String(u.name || 'Criatura').slice(0, 14);
    const legacy = u.emoji ? `<span class="am-token-emoji">${escapeHtml(u.emoji)}</span>` : '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#arena-mountain"></use></svg>';
    return `<span class="am-token" title="${escapeHtml(u.name || 'Criatura')}">${legacy}<small>${escapeHtml(shortName)}</small><b>${Number(u.power) || 1} poder · ${Number(u.turnsLeft) || 0} turnos</b></span>`;
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

    // Turno
    const active = m.status === 'active';
    const myTurn = active && m.turn === me;
    const turnTag = $('#am-turn-tag');
    if (turnTag) turnTag.hidden = !myTurn;
    const turnTagOpp = $('#am-turn-tag-opp');
    if (turnTagOpp) turnTagOpp.hidden = !(active && !myTurn);
    const hint = $('#am-table-hint');
    if (hint) hint.textContent = active ? (myTurn ? 'solte a carta aqui pra jogar' : `aguardando ${oppName}…`) : '';

    // Campos (criaturas) e estruturas
    const oppFieldEl = $('#am-board-opponent');
    if (oppFieldEl) oppFieldEl.innerHTML = (m[`field${foe}`] || []).filter(u => u.kind === 'summon').map(arenaTokenHTML).join('');
    const myFieldEl = $('#am-board-me');
    if (myFieldEl) myFieldEl.innerHTML = (m[`field${me}`] || []).filter(u => u.kind === 'summon').map(arenaTokenHTML).join('');
    const oppStructEl = $('#am-structures-opponent');
    if (oppStructEl) oppStructEl.innerHTML = (m[`field${foe}`] || []).filter(u => u.kind === 'structure').map(arenaTokenHTML).join('');
    const myStructEl = $('#am-structures-me');
    if (myStructEl) myStructEl.innerHTML = (m[`field${me}`] || []).filter(u => u.kind === 'structure').map(arenaTokenHTML).join('');

    // Log
    const logEl = $('#arena-log');
    if (logEl) logEl.innerHTML = (m.log || []).slice(-4).map((l) => `<div>${escapeHtml(l)}</div>`).join('');

    // Mão
    const handEl = $('#arena-hand');
    if (handEl) {
        handEl.innerHTML = (m[`hand${me}`] || []).map((c) => {
            const playable = m.status === 'active' && m.turn === me;
            const selected = arenaSelectedHand === c.id;
            return cardFaceHTML(c, { extraClass: `${playable ? '' : 'disabled'}${selected ? ' selected' : ''}`, attrs: `data-arena-hand-card="${escapeHtml(c.id)}" role="button" tabindex="0"` });
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
    if (title) title.textContent = mode?.type === 'accept' ? '⚔️ Aceitar desafio' : '⚔️ Criar desafio';
    if (sub) sub.textContent = mode?.type === 'accept'
        ? 'Empate o pote ou supere: coloque sua parte e leve tudo se vencer.'
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

    const pip = t.closest?.('.arena-pip[data-pip]');
    if (pip) {
        const value = Math.min(5, Math.max(1, Number(pip.dataset.value) || 3));
        if (pip.dataset.pip === 'cost') arenaDraft.cost = value;
        else if (pip.dataset.pip === 'power') arenaDraft.power = value;
        renderArenaCreatePreview();
        return;
    }

    const acceptBtn = t.closest?.('[data-arena-accept]');
    if (acceptBtn) { openArenaBetModal({ type: 'accept', matchId: acceptBtn.dataset.arenaAccept }); return; }

    const cancelBtn = t.closest?.('[data-arena-cancel]');
    if (cancelBtn) { await cancelArenaChallenge(cancelBtn.dataset.arenaCancel); return; }

    const buyFrame = t.closest?.('[data-buy-card-frame]');
    if (buyFrame) { await buyCardFrame(buyFrame.dataset.buyCardFrame); renderCardCosmeticShop(); return; }

    const equipFrame = t.closest?.('[data-equip-card-frame]');
    if (equipFrame) { await equipCardFrame(equipFrame.dataset.equipCardFrame); renderCardCosmeticShop(); return; }

    const claimPots = t.closest?.('#arena-claim-pots-btn');
    if (claimPots) { await claimArenaSettlements(); renderArenaBattlePane(); return; }
});

/* Criar carta: preview ao vivo + upload de arte */
['ac-name', 'ac-flavor', 'ac-art-url'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', debounce(renderArenaCreatePreview, 120));
});
document.getElementById('ac-category')?.addEventListener('change', renderArenaCreatePreview);
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
$('#arena-hand')?.addEventListener('pointerdown', arenaHandPointerDown);
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
const APP_VERSION = '4.6.1';
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
