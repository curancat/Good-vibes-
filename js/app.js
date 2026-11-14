/* =====================================================================
   GOOD VIBES 🌊 — O Refúgio · v2.0
   Lógica do aplicativo (ES Module)
   ===================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser, updatePassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, setDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, increment, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
    container.innerHTML = `<span class="avatar-initials" aria-hidden="true">${initials}</span>` +
        (safe ? `<img src="${escapeHtml(safe)}" alt="Foto de ${escapeHtml(name || 'perfil')}" onerror="this.remove()">` : '');
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

    const avatarUrl = sanitizeUrl(data.authorAvatar || '');
    const initials = escapeHtml((data.authorName || 'GV').trim().substring(0, 2).toUpperCase() || 'GV');
    const avatarHtml = `<span class="avatar-initials" aria-hidden="true">${initials}</span>` + (avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="" onerror="this.remove()">` : '');

    const ts = data.timestamp?.toMillis ? data.timestamp.toMillis() : null;
    const voted = sessionStorage.getItem(`gv_vote_${postId}`) === '1';

    return `
    <article class="post" data-post-id="${escapeHtml(postId)}" data-author-id="${escapeHtml(data.userId || '')}" data-author-name="${escapeHtml(data.authorName || 'Usuário')}">
        <div class="post-header">
            <div class="post-avatar">${avatarHtml}</div>
            <div class="post-author-wrap">
                <div class="post-author">${escapeHtml(data.authorName || 'Usuário')} ${nsfwBadge}</div>
                <div class="post-time">${ts ? timeAgo(ts) : 'agora mesmo'}</div>
            </div>
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
$('#feed-container')?.addEventListener('click', async (e) => {
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
});

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
            return `<div class="comment-item"><strong>${escapeHtml(data.authorName || 'Usuário')}</strong>${escapeHtml(data.text || '')}</div>`;
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
        ${isMe ? '' : `<div class="chat-bubble-name">${escapeHtml(data.authorName || 'Usuário')}</div>`}
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
            html += `<button class="contact-item" data-dm-uid="${escapeHtml(d.id)}" data-dm-name="${escapeHtml(name)}">${avatarHtml}<strong>${escapeHtml(name)}</strong></button>`;
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

/* ================= ESTADO DE AUTENTICAÇÃO ================= */
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadUserProfile();
        loadFeed();
        window.openChat('global'); // mantém o canal ouvindo para os badges
        startInboxListener();
        startDmInboxListener();
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
const APP_VERSION = '2.5.0';
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
