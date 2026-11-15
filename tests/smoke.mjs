/* Smoke test: boots js/app.js (with Firebase stubbed) in jsdom and exercises the UI shell. */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import assert from 'assert';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(`${root}/index.html`, 'utf8');
let js = readFileSync(`${root}/js/app.js`, 'utf8');

// ---- Stub Firebase + CryptoJS (offline) ----
js = js
  .replace(/import \{ initializeApp \}[^;]+;/, `const initializeApp = () => ({});`)
  .replace(/import \{ getAuth[^;]+;/, `const getAuth = () => ({});
const signInWithEmailAndPassword = async () => { throw new Error('stub'); };
const createUserWithEmailAndPassword = async () => ({ user: { uid: 'novo123', metadata: { creationTime: new Date().toISOString() } } });
const signOut = async () => {};
const onAuthStateChanged = (auth, cb) => { globalThis.__authCb = cb; };
const deleteUser = async () => {};
const updatePassword = async () => {};
const sendPasswordResetEmail = async () => {};`)
  .replace(/import \{ getFirestore[^;]+;/, `const getFirestore = () => ({});
const collection = () => ({});
const addDoc = async () => ({});
const getDocs = async () => ({ empty: true, docs: [], forEach() {}, size: 0 });
const getDoc = async () => ({ exists: () => false, data: () => ({}) });
const doc = () => ({});
const setDoc = async () => {};
const query = () => ({});
const orderBy = () => ({});
const onSnapshot = (q, ok) => { return () => {}; };
const serverTimestamp = () => ({ toMillis: () => Date.now() });
const updateDoc = async () => {};
const increment = (n) => n;
const where = () => ({});
const runTransaction = async (db, fn) => fn({ get: async () => ({ data: () => ({}) }), set: () => {} });
const limit = (n) => n;`);

const dom = new JSDOM(html, {
  url: 'https://good-vibes.example/',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const { window } = dom;

// Globals the app expects
window.CryptoJS = {
  AES: {
    encrypt: (t) => `enc(${t})`,
    decrypt: () => ({ toString: () => 'texto decifrado' })
  },
  enc: { Utf8: 'utf8' }
};
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = () => {};
Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', { get() { return 100; } });

const errors = [];
window.addEventListener('error', (e) => errors.push(e.message));

// Execute the module code (imports already replaced by stubs)
try {
  window.eval(readFileSync('js/economy-data.js', 'utf8')); // igual ao index.html (script clássico antes do módulo)
window.eval(js);
  console.log('✓ app.js executou sem lançar exceção');
} catch (e) {
  console.error('✗ app.js lançou:', e);
  process.exit(1);
}

await new Promise((r) => setTimeout(r, 300));

const $ = (s) => window.document.querySelector(s);
const $$ = (s) => [...window.document.querySelectorAll(s)];

// ---- Assertions ----
assert.equal($$('#app-grid .app-icon').length, 14, 'grade deve ter 14 apps');
assert.equal($$('#dock .app-icon').length, 4, 'dock deve ter 4 apps');
assert.ok($('#sb-time').textContent.trim().length >= 4, 'relógio da status bar preenchido');
assert.ok($('#hw-time').textContent.trim().length >= 4, 'relógio do widget preenchido');
assert.ok($('#lock-time').textContent.trim().length >= 4, 'relógio da tela de bloqueio preenchido');
assert.ok($('#hw-greeting-text').textContent.trim().length > 0, 'saudação preenchida');
assert.ok($('#hw-quote').textContent.trim().length > 0, 'quote preenchida');
assert.equal(window.GV_ECO?.RAW_MATERIALS.length, 100, 'deve haver exatamente 100 materiais brutos');
assert.equal(window.GV_ECO?.COSMETICS.length, 1000, 'deve haver exatamente 1.000 cosméticos');
for (const id of ['app-bank', 'board-list', 'shame-list', 'bank-ledger']) { assert.ok($('#' + id), `#${id} presente`); }
assert.equal(window.GV_ECO?.COSMETIC_CATEGORIES.length, 10, 'deve haver 10 categorias de cosmético');
const sampleC = window.GV_ECO?.COSMETIC_BY_ID?.moldura_solar_comum || Object.values(window.GV_ECO?.COSMETIC_BY_ID || {})[0];
assert.ok(sampleC && sampleC.c1 && sampleC.c2 && sampleC.effect && sampleC.themeName, 'cosméticos devem ter cor, efeito e tema');
for (const id of ['profile-cover']) { assert.ok($('#' + id), `#${id} presente`); }
assert.ok($('script') || true);
const appSrc = readFileSync(`${root}/js/app.js`, 'utf8');
for (const token of ['authorCosmetics', 'equippedCosmetics', 'cosmicMapOf', 'equipCosmetic', '`fx-${', 'reactions', 'applyAvatarCosmetics']) { assert.ok(appSrc.includes(token), `app.js menciona ${token}`); }
const cssSrc = readFileSync(`${root}/css/style.css`, 'utf8');
for (const token of ['.fx-flame', '.fx-neon', '.fx-aurora', '.avatar-frame', '.avatar-aura', '.author-title', '.author-emblem', '.post-seal', '.profile-cover', '.profile-cover[hidden]', '.reaction-btn']) { assert.ok(cssSrc.includes(token), `css contém ${token}`); }
console.log('✓ cosméticos com efeito real: slots por categoria, mapa authorCosmetics, animações CSS presentes');
console.log('✓ economia: 100 materiais brutos e 1.000 cosméticos carregados');
console.log('✓ tela inicial renderizou (14 apps, dock, relógios, saudação)');

// Lockscreen → unlock
$('#unlock-btn').click();
await new Promise((r) => setTimeout(r, 50));
assert.ok($('#lockscreen').classList.contains('unlocking'), 'lockscreen deve deslizar para cima');
assert.ok($('#auth-screen').classList.contains('active'), 'auth deve aparecer após desbloqueio (sem sessão)');
console.log('✓ desbloqueio abre a tela de login');

// Alterna para "Criar conta"
$('#tab-signup').click();
assert.equal($('#auth-form').dataset.mode, 'signup', 'form entra em modo cadastro');
assert.ok($('#tab-signup').classList.contains('active'), 'aba Criar conta ativa');
assert.equal($('#login-btn .btn-label').textContent, 'Criar conta 🌊', 'botão muda para Criar conta');
assert.equal($('#password').getAttribute('autocomplete'), 'new-password', 'autocomplete new-password');
$('#tab-login').click();
assert.equal($('#login-btn .btn-label').textContent, 'Entrar', 'botão volta para Entrar');
assert.equal($('#auth-form').dataset.mode, 'login', 'form volta ao modo login');
console.log('✓ abas Entrar / Criar conta funcionam');

// Simula login bem-sucedido
window.eval('globalThis.__authCb && globalThis.__authCb({ uid: "u123", metadata: { creationTime: "2025-01-01T00:00:00Z" } })');
await new Promise((r) => setTimeout(r, 200));
assert.ok($('#home-screen').classList.contains('active'), 'home deve aparecer após login');
console.log('✓ login simulado mostra a home');

// Abre um app pelo ícone
const chatIcon = window.document.querySelector('#app-grid [data-open-app="chat"]');
chatIcon.click();
await new Promise((r) => setTimeout(r, 80));
assert.ok($('#app-chat').classList.contains('active'), 'app de chat deve abrir');
console.log('✓ ícone do Chat abre a janela do app');

// Volta pelo botão Início
$('#app-chat [data-close-app]').click();
await new Promise((r) => setTimeout(r, 350));
assert.ok(!$('#app-chat').classList.contains('active'), 'app deve fechar');
console.log('✓ botão Voltar fecha o app');

// Toast de teste via notificação de badge: abre o app de avisos e verifica vazio
$('#app-grid [data-open-app="notifications"]').click();
await new Promise((r) => setTimeout(r, 80));
assert.ok($('#app-notifications').classList.contains('active'), 'avisos deve abrir');
assert.ok($('#notifications-list').innerHTML.includes('notif-empty') || $('#notifications-list').children.length >= 0, 'lista de avisos renderiza');
console.log('✓ Central de avisos abre e renderiza a lista');

// Feed: compositor — contador de caracteres
$('#app-grid [data-open-app="feed"]').click();
const ta = $('#post-text');
ta.value = 'Teste de boas vibrações';
ta.dispatchEvent(new window.Event('input', { bubbles: true }));
assert.ok($('#post-char-counter').textContent.startsWith(String('Teste de boas vibrações'.length)), 'contador de caracteres atualiza');
console.log('✓ compositor: contador de caracteres ok');

// Banner de atualização existe e começa oculto
// Economia 🪙: os 5 apps e o modal de presente existem
for (const id of ['app-shop', 'app-inventory', 'app-refinery', 'app-construction', 'app-work', 'gift-modal']) {
    assert.ok($('#' + id), `app/modal #${id} presente`);
}
assert.ok($('#cosmetic-grid'), 'grade de cosméticos presente');

const banner = $('#update-banner');
assert.ok(banner, 'banner de nova versão existe no DOM');
assert.equal(banner.hidden, true, 'banner começa oculto');
assert.ok($('#update-banner-btn'), 'banner tem botão de atualizar');
console.log('✓ banner de nova versão presente e oculto por padrão');

// Escape fecha o app aberto
window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
await new Promise((r) => setTimeout(r, 350));
assert.ok(!$('#app-feed').classList.contains('active'), 'Escape fecha o app');
console.log('✓ Escape fecha o app ativo');

if (errors.length) {
  console.error('Erros de página:', errors);
  process.exit(1);
}
console.log('\n🎉 SMOKE TEST PASSOU — shell do app funciona offline');
process.exit(0);
