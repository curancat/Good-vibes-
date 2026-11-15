/* =====================================================================
   GOOD VIBES 🌊 — O Refúgio · v2.0
   Lógica do aplicativo (ES Module)
   ===================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser, updatePassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, setDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, increment, where, runTransaction, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
    { id: 'settings', label: 'Ajustes', icon: '⚙️', tile: 'tile-settings' },
];
const DOCK_IDS = ['feed', 'chat', 'notifications', 'profile'];

function appIconHTML(appDef) {
    const badge = appDef.badge ? `<span class="app-badge" data-badge="${appDef.badge}"></span>` : '';
    return `<button class="app-icon" data-open-app="${appDef.id}" aria-label="Abrir ${escapeHtml(appDef.label)}">
        <span class="app-icon-tile ${appDef.tile}">${badge}${appDef.icon}</span>
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
        artifacts: d.artifacts && typeof d.artifacts === 'object' ? { ...d.artifacts } : {}
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
    ['shop-gold', 'inv-gold', 'construction-gold', 'work-gold'].forEach((id) => { const el = document.getElementById(id); if (el) el.textContent = gold; });
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
        ['cosmeticos', 'itens'].forEach((name) => { const pane = document.getElementById(`shop-pane-${name}`); if (pane) pane.hidden = name !== target; });
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
        initEconomy().then(claimGifts);
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
const APP_VERSION = '4.4.0';
const appVersionEl = $('#app-version');
if (appVersionEl) appVersionEl.textContent = `Good Vibes 🌊 · O Refúgio · v${APP_VERSION}`;
let swRegistration = null;
let userRequestedUpdate = false;

/* Exibe a "barrinha" de nova versão */
function showUpdateBanner(notes) {
    const banner = $('#update-banner');
    if (!banner) return;
    $('#update-banner-notes').textContent = notes || 'Melhorias e correções esperando por você.';
    banner.hidden = false;
    vibrate([10, 40, 10]);
}
function hideUpdateBanner() {
    const banner = $('#update-banner');
    if (banner) banner.hidden = true;
    try { sessionStorage.setItem('gv_update_dismissed', '1'); } catch { /* ignora */ }
}
const updateDismissed = () => { try { return sessionStorage.getItem('gv_update_dismissed') === '1'; } catch { return false; } };

/* Aplica a atualização quando o usuário toca em "Atualizar" */
async function applyUpdate() {
    const btn = $('#update-banner-btn');
    if (btn) { btn.textContent = '⏳ Atualizando…'; btn.disabled = true; }
    userRequestedUpdate = true;
    try { sessionStorage.removeItem('gv_update_dismissed'); } catch { /* ignora */ }

    // Caminho ideal: existe um Service Worker novo esperando → ativa e recarrega
    if (swRegistration?.waiting) {
        swRegistration.waiting.postMessage('SKIP_WAITING');
        return; // o handler de controllerchange recarrega a página
    }
    // Fallback: não há SW esperando (ex.: versão nova ainda não baixada) →
    // apaga o cache do app shell e recarrega pegando tudo da rede
    try {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.includes('good-vibes')).map((k) => caches.delete(k)));
    } catch { /* sem cache API */ }
    window.location.reload();
}

/* Confirma a versão remota via version.json (independente do SW) */
async function checkVersionFile() {
    if (typeof fetch !== 'function') return;
    try {
        const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.version && data.version !== APP_VERSION && !updateDismissed()) {
            showUpdateBanner(data?.notes);
        }
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

            // Já existe versão nova baixando/esperando?
            if (swRegistration.waiting && navigator.serviceWorker.controller && !updateDismissed()) showUpdateBanner();
            swRegistration.addEventListener('updatefound', () => {
                const newWorker = swRegistration.installing;
                if (!newWorker) return;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller && !updateDismissed()) {
                        showUpdateBanner('Versão baixada! Toque em Atualizar para aplicar.');
                    }
                });
            });

            // Verifica se há deploy novo a cada 1 minuto…
            setInterval(() => swRegistration.update().catch(() => {}), 60 * 1000);
            // …e sempre que o usuário volta para o app
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) swRegistration.update().catch(() => {});
            });
        } catch (err) {
            console.warn('SW não registrado:', err);
        }
        // Checagem independente do SW (garante o aviso mesmo sem ele)
        checkVersionFile();
        setInterval(checkVersionFile, 5 * 60 * 1000);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVersionFile(); });
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
