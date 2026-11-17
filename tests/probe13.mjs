/* Probe 13 (v5.2.0): Livro do Artesão — FUNCIONAL.
   Carrega o app inteiro (JSDOM), abre o app 📖, verifica as páginas trancadas,
   forja uma receita na grade e confirma que a página abriu com a grade 3x3. */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(`${root}/index.html`, 'utf8');
let js = readFileSync(`${root}/js/app.js`, 'utf8');

// Documento de economia stubado: jogador com ligas de aço e SEM nada forjado ainda
const store = { gold: 1000, inv: { liga_de_aco: 4, essencia_concentrada: 2, cristal_lapidado: 2 }, knownRecipes: [] }; // knownRecipes: [] = migração já rodada (pós-v5.2.0)
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
const getDoc = async () => ({ exists: () => true, data: () => JSON.parse(JSON.stringify(window.__store)) });
const doc = () => ({});
const setDoc = async (ref, patch) => { Object.assign(window.__store, patch); };
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
window.__store = store; // mesmo realm do app: as stubs getDoc/setDoc leem daqui
window.CryptoJS = { AES: { encrypt: (t) => `enc(${t})`, decrypt: () => ({ toString: () => 'texto' }) }, enc: { Utf8: 'utf8' } };
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = () => {};
Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', { get() { return 100; } });
window.fetch = async () => { throw new Error('offline'); };
window.addEventListener('error', () => {});
window.eval(readFileSync(`${root}/js/economy-data.js`, 'utf8'));
window.eval(js);

// Login simulado (o callback vive no realm do jsdom)
window.eval('globalThis.__authCb && globalThis.__authCb({ uid: "tester", email: "t@t.com", metadata: { creationTime: new Date().toISOString() } })');
await new Promise((r) => setTimeout(r, 600));

const $ = (s) => window.document.querySelector(s);
const $$ = (s) => [...window.document.querySelectorAll(s)];

// Abre o Livro do Artesão
const bookIcon = $$('#app-grid .app-icon').find((el) => el.getAttribute('aria-label') === 'Abrir Livro do Artesão');
assert.ok(bookIcon, 'ícone 📖 na grade inicial');
bookIcon.click();
await new Promise((r) => setTimeout(r, 50));
assert.ok($('#app-recipes').classList.contains('active'), 'livro abriu');

// Conta as páginas trancadas x abertas
const cards = $$('#recipes-book .recipe-card');
const lockedCount = $$('#recipes-book .recipe-card.locked').length;
assert.strictEqual(cards.length, 49, `49 páginas (veio: ${cards.length})`);
assert.strictEqual(lockedCount, 49, `nenhuma catalogada ainda (veio: ${lockedCount})`);
assert.ok($('#recipes-progress-text').textContent.includes('0 de 49'), 'progresso 0 de 49');
console.log('✓ abertura: 49 páginas trancadas, progresso 0/49');

// Seções presentes
for (const t of ['Relíquias da Arena', 'Núcleos de Evolução', 'Artefatos do Refúgio', 'Refinaria & Bancada']) {
  assert.ok($('#recipes-book').textContent.includes(t), `seção ${t}`);
}

// Forja a Escama de Aço na bancada: liga de aço ×2 em coluna
$('[data-open-app="refinery"]')?.click();
await new Promise((r) => setTimeout(r, 50));
// toca os materiais no Baú → na grade (fluxo real de tap-to-place)
window.eval('placeCraftMaterial("liga_de_aco", 2); placeCraftMaterial("liga_de_aco", 5);');
const craftBtn = $('#craft-do-btn');
assert.ok(!craftBtn.disabled, 'botão craftar habilitado para Liga de Aço ×2 em coluna');
craftBtn.click();
await new Promise((r) => setTimeout(r, 300));
assert.strictEqual(JSON.stringify([...store.knownRecipes]), JSON.stringify(['r_relic_escama']), `Escama de Aço catalogada (veio: ${JSON.stringify(store.knownRecipes)})`);
assert.strictEqual(JSON.stringify([...store.arenaRelics]), JSON.stringify(['relic_escama']), 'relíquia forjada foi para o baú de relíquias');
assert.ok(!store.inv.liga_de_aco || store.inv.liga_de_aco === 2, 'consumiu 2 ligas (veio: ' + store.inv.liga_de_aco + ')');
console.log('✓ forja: Escama de Aço consumiu as 2 ligas e catalogou a página');

// Volta ao livro: a página da Escama deve estar aberta
const recipesIcon = $$('#app-grid .app-icon').find((el) => el.getAttribute('aria-label') === 'Abrir Livro do Artesão');
recipesIcon.click();
await new Promise((r) => setTimeout(r, 50));
assert.ok($('#recipes-progress-text').textContent.includes('1 de 49'), `progresso 1 de 49 (veio: ${$('#recipes-progress-text').textContent})`);
const knownCards = $$('#recipes-book .recipe-card.known');
assert.strictEqual(knownCards.length, 1, `exatamente 1 página aberta (veio: ${knownCards.length})`);
assert.ok(knownCards[0].textContent.includes('Escama de Aço'), 'página aberta é a Escama de Aço');
assert.ok(knownCards[0].innerHTML.includes('recipe-grid-mini'), 'grade 3x3 desenhada na página aberta');
assert.ok(knownCards[0].innerHTML.includes('Liga de Aço'), 'ingredientes listados');
console.log('✓ livro: página da Escama abriu com grade e ingredientes');

// Migração única: economia antiga sem knownRecipes com material no baú → seed
// Exercita a função de produção seedKnownRecipesFromState via ECO real.
const seeded = window.eval(`(function(){
  return seedKnownRecipesFromState({ artifacts: {}, arenaRelics: [], inv: { prancha: 2 } });
})()`);
assert.strictEqual(JSON.stringify([...seeded].sort()), JSON.stringify(['r_prancha', 'r_prancha2']), `seed legado abre as páginas de Prancha (veio: ${JSON.stringify(seeded)})`);
const seededEmpty = window.eval(`seedKnownRecipesFromState({ artifacts: {}, arenaRelics: [], inv: {} })`);
assert.strictEqual(JSON.stringify([...seededEmpty]), JSON.stringify([]), 'baú vazio não cataloga nada');
console.log('✓ migração: baú legado com Prancha abre a página r_prancha');

console.log('\nPROBE 13 — PASS 📖 o livro funciona de verdade (abrir, forjar, catalogar)');

process.exit(0);
