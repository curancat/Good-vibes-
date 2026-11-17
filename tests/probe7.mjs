/* Probe 7 (v5.2.0): fluxo de ATUALIZAÇÃO do app — version.json manda no aviso.
   Reproduz o bug "notifica pra sempre": APP_VERSION desatualizado fazia o banner
   aparecer em toda carga, independente de hard reload ou resgate. */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import assert from 'assert';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(`${root}/index.html`, 'utf8');
let js = readFileSync(`${root}/js/app.js`, 'utf8');

const REMOTE = { version: '5.2.0', notes: 'notas de teste' }; // o que o "servidor" publica
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
const limit = (n) => n;
const deleteDoc = async () => {};`);

const dom = new JSDOM(html, { url: 'https://good-vibes.example/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
window.CryptoJS = { AES: { encrypt: (t) => `enc(${t})`, decrypt: () => ({ toString: () => 'texto' }) }, enc: { Utf8: 'utf8' } };
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = () => {};
Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', { get() { return 100; } });
// fetch stubado: version.json remoto controlável; o resto falha (offline)
window.fetch = async (url) => {
  if (String(url).includes('version.json')) return { ok: true, json: async () => ({ ...REMOTE }) };
  throw new Error('offline');
};

const errors = [];
window.addEventListener('error', (e) => errors.push(e.message));
window.eval(readFileSync(`${root}/js/economy-data.js`, 'utf8'));
window.eval(js);
console.log('✓ app.js executou sem lançar exceção');

await new Promise((r) => setTimeout(r, 400));
const $ = (s) => window.document.querySelector(s);

// 1) App na mesma versão do version.json → NUNCA mostra o banner
assert.equal($('#app-version').textContent.includes('5.2.0'), true, `#app-version mostra a versão atual (veio: ${$('#app-version').textContent})`);
assert.equal($('#update-banner').hidden, true, 'banner escondido quando app == remoto');
console.log('✓ app atualizado: nenhum aviso de nova versão');

// 2) Deploy novo (remoto avança) → avisa
REMOTE.version = '9.9.9';
REMOTE.notes = 'Deploy de teste';
await window.eval('checkVersionFile')();
assert.equal($('#update-banner').hidden, false, 'banner aparece quando remoto avança');
assert.ok($('#update-banner-notes').textContent.includes('Deploy de teste'), 'notas do deploy no banner');
console.log('✓ remoto novo: aviso exibido com as notas');

// 3) Usuário dispensa (✕) → não volta a avisar NESTA versão, mesmo relendo o remoto
$('#update-banner-close').click();
assert.equal($('#update-banner').hidden, true, 'dispensa esconde o banner');
await window.eval('checkVersionFile')();
await window.eval('checkVersionFile')();
assert.equal($('#update-banner').hidden, true, 'dispensa persiste entre checagens da mesma versão');
assert.equal(window.localStorage.getItem('gv_update_dismissed_for'), '9.9.9', 'dispensa gravada por versão');
console.log('✓ dispensa persiste entre sessões/checagens para a mesma versão');

// 4) Deploy AINDA MAIS NOVO → volta a avisar (deploy novo ≠ versão dispensada)
REMOTE.version = '9.9.10';
await window.eval('checkVersionFile')();
assert.equal($('#update-banner').hidden, false, 'versão nova diferente da dispensada avisa de novo');
console.log('✓ deploy posterior à dispensa volta a avisar');

// 5) App alcança o remoto → dispensa antiga é limpo (próximo deploy avisa normalmente)
REMOTE.version = '5.2.0';
await window.eval('checkVersionFile')();
assert.equal($('#update-banner').hidden, true, 'app atualizado esconde o banner');
assert.equal(window.localStorage.getItem('gv_update_dismissed_for'), '', 'dispensa antiga limpa quando app == remoto');
REMOTE.version = '9.9.10';
await window.eval('checkVersionFile')();
assert.equal($('#update-banner').hidden, false, 'deploy futuro após sincronizar avisa normalmente');
console.log('✓ app sincronizado limpa a dispensa — o próximo deploy avisa normal');

assert.deepEqual(errors, [], 'nenhum erro de JS no window durante o probe');
console.log('\n🎉 PROBE 7 PASSOU — fluxo de atualização não fica preso em loop de aviso');
process.exit(0);
