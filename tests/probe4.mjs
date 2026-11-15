/* Probe 4 (task 16): craft 3x3, minigame de coleta, vitrine de itens, perfil de usuário. */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import assert from 'assert';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(`${root}/index.html`, 'utf8');
let js = readFileSync(`${root}/js/app.js`, 'utf8');

const ECO_DATA = {
  gold: 500,
  inv: { madeira_carvalho: 5, minerio_ferro: 3, minerio_cobre: 6, minerio_estanho: 3, areia: 3, carvao_vegetal: 2, barra_cobre: 4 },
  buildings: {}, cosmetics: [], creditScore: 50,
  stamina: 100, staminaAt: Date.now(), gatherCd: {}, jobCd: {}
};

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
const getDoc = async () => ({ exists: () => true, data: () => (${JSON.stringify(ECO_DATA)}) });
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

const dom = new JSDOM(html, { url: 'https://good-vibes.example/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
window.CryptoJS = { AES: { encrypt: (t) => `enc(${t})`, decrypt: () => ({ toString: () => 'texto decifrado' }) }, enc: { Utf8: 'utf8' } };
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = () => {};
Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', { get() { return 100; } });

const errors = [];
window.addEventListener('error', (e) => errors.push(e.message));

window.eval(readFileSync('js/economy-data.js', 'utf8'));
window.eval(js);
console.log('✓ app.js executou sem lançar exceção');

await new Promise((r) => setTimeout(r, 300));
const $ = (s) => window.document.querySelector(s);
const $$ = (s) => [...window.document.querySelectorAll(s)];

// Login simulado (mesmo fluxo do smoke)
window.eval('globalThis.__authCb && globalThis.__authCb({ uid: "tester", email: "t@t.com", metadata: { creationTime: new Date().toISOString() } })');
await new Promise((r) => setTimeout(r, 400));

// ---------- 1) Craft 3x3: matcher cobre todas as 36 receitas ----------
const ECO = window.GV_ECO;
let ok = 0, fail = 0;
for (const r of ECO.RECIPES) {
  const rows = r.shape.length, cols = Math.max(...r.shape.map((x) => x.length));
  for (let dy = 0; dy <= 3 - rows; dy++) {
    for (let dx = 0; dx <= 3 - cols; dx++) {
      const grid = new Array(9).fill(null);
      for (let ry = 0; ry < rows; ry++) for (let cx = 0; cx < cols; cx++) {
        const ch = r.shape[ry][cx];
        if (ch !== '.') grid[(dy + ry) * 3 + (dx + cx)] = r.key[ch];
      }
      const m = window.matchCraftRecipe(grid);
      if (m && m.id === r.id) ok++;
      else { fail++; console.error(`  ✗ ${r.id} @+${dx},+${dy} → ${m ? m.id : 'null'}`); }
    }
  }
}
console.log(`✓ matcher 3x3: ${ok} combinações receita×deslocamento reconhecidas, ${fail} falhas`);
assert.equal(fail, 0, 'toda receita deve ser reconhecida em toda posição válida');

// Padrão errado não reconhece
assert.equal(window.matchCraftRecipe(['madeira_carvalho', null, null, 'madeira_carvalho', null, null, 'madeira_carvalho', null, null]), null, 'coluna vertical de carvalho não é receita');
console.log('✓ padrão vertical inválido retorna null');

// ---------- 2) Mesa de Trabalho: grade renderiza, tap-to-place e craft real ----------
$('#app-grid [data-open-app="refinery"]').click();
await new Promise((r) => setTimeout(r, 120));
assert.equal($$('#craft-grid .craft-cell').length, 9, 'grade 3x3 renderizada');
assert.ok($('#craft-tray').innerHTML.includes('madeira_carvalho') || $('#craft-tray').innerHTML.includes('Madeira'), 'bandeja lista materiais do baú');
console.log('✓ mesa de trabalho abre com grade 3x3 e bandeja do baú');

window.placeCraftMaterial('madeira_carvalho', 0);
window.placeCraftMaterial('madeira_carvalho', 1);
await new Promise((r) => setTimeout(r, 60));
assert.equal($('#craft-do-btn').disabled, false, 'receita de prancha habilita o botão craftar');
console.log('✓ 2× madeira_carvalho horizontal → receita detectada, botão habilitado');

$('#craft-do-btn').click();
await new Promise((r) => setTimeout(r, 150));
assert.ok($('#toast-container').innerHTML.includes('raftado'), 'craft exibe toast de sucesso');
assert.equal($$('#craft-grid .craft-cell.filled').length, 0, 'grade limpa após craftar');
console.log('✓ craft executado: baú atualizado, grade limpa, toast exibido');

window.placeCraftMaterial('minerio_ferro', 0);
window.placeCraftMaterial('minerio_ferro', 1);
window.placeCraftMaterial('minerio_ferro', 2);
window.placeCraftMaterial('minerio_ferro', 3);
window.placeCraftMaterial('minerio_ferro', 4);
window.placeCraftMaterial('minerio_ferro', 5);
window.placeCraftMaterial('minerio_ferro', 6); // 7 ferros — só tem 3: não pode
await new Promise((r) => setTimeout(r, 60));
assert.equal($$('#craft-grid .craft-cell.filled').length, 3, 'só 3 minérios no baú — limite respeitado');
window.clearCraftGrid();
console.log('✓ limite de estoque na grade respeitado');

// ---------- 2.5) Artefato 🧿: craft do Amuleto de Cobre ativa renda passiva ----------
window.placeCraftMaterial('barra_cobre', 0);
window.placeCraftMaterial('barra_cobre', 1);
await new Promise((r) => setTimeout(r, 60));
assert.equal($('#craft-do-btn').disabled, false, 'amuleto de cobre detectado');
$('#craft-do-btn').click();
await new Promise((r) => setTimeout(r, 200));
assert.ok($('#toast-container').innerHTML.includes('Amuleto de Cobre'), 'toast de artefato ativado');
await new Promise((r) => setTimeout(r, 100));
assert.ok(($('#construction-income')?.textContent || '').startsWith('2 gold/min'), `renda passiva inclui o amuleto (+2/min), veio: ${$('#construction-income')?.textContent}`);
console.log('✓ artefato craftado: Amuleto de Cobre ativado, renda passiva agora 2 gold/min');

// ---------- 3) Coleta: minigame abre, 3 rodadas encerram e gastam energia ----------
$('#app-grid [data-open-app="work"]')?.click(); // pode não existir no grid — trabalho está no dock? tenta abrir via openApp
window.openApp('work');
await new Promise((r) => setTimeout(r, 120));
const gatherBtns = $$('#gather-list .gather-btn');
assert.equal(gatherBtns.length, 6, 'seis locais de coleta renderizados');
assert.equal($('#stamina-count').textContent, '100', 'energia inicia em 100');
gatherBtns[0].click(); // Floresta
await new Promise((r) => setTimeout(r, 80));
assert.ok($('#gather-game-modal').classList.contains('active'), 'minigame abre');
for (let i = 0; i < 42; i++) $('#mash-btn').click();
assert.equal($('#mash-taps').textContent, '42', 'contador de toques funciona');
await new Promise((r) => setTimeout(r, 5400)); // espera o cronômetro de 5s fechar
assert.equal($('#gather-done-btn').hidden, false, 'após o tempo, botão de concluir aparece');
assert.equal($('#stamina-count').textContent, '80', 'coleta custou 20 de energia');
$('#gather-done-btn').click();
await new Promise((r) => setTimeout(r, 80));
console.log('✓ coleta: mash de 5s completo, 20⚡ deduzidos, local em descanso');

// ---------- 4) Loja: sem aba Comprar, aba Itens presente ----------
window.openApp('shop');
await new Promise((r) => setTimeout(r, 120));
assert.ok(!$('#shop-pane-comprar'), 'aba Comprar materiais removida do DOM');
assert.ok($('#shop-pane-itens'), 'aba Itens presente');
assert.ok($('#shop-items-list'), 'vitrine de itens presente');
assert.deepEqual($$('.eco-tab[data-shop-tab]').map((b) => b.dataset.shopTab), ['cosmeticos', 'cartas', 'itens'], 'abas: Cosméticos, Cartas e Itens');
assert.ok($('#shop-pane-cartas'), 'aba Cartas (molduras) presente');
assert.ok($('#card-cosmetic-grid'), 'grade de molduras de carta presente');
assert.ok((window.GV_ECO?.CARD_COSMETICS || []).length >= 10, 'cosméticos de carta à venda carregados');
console.log('✓ Loja: compra de materiais removida; cosméticos separados dos itens');

// ---------- 5) Perfil de outro usuário ----------
const htmlPost = window.postCardHTML({ id: 'p1', data: () => ({ userId: 'u_outro', authorName: 'Ana 🌊', text: 'olá mundo', timestamp: { toMillis: () => Date.now() }, likes: 2, dislikes: 0 }) });
assert.ok(htmlPost.includes('data-open-user="u_outro"'), 'post tem gatilho de perfil');
assert.ok(htmlPost.includes('post-author-btn'), 'autor é botão de perfil');
const htmlChat = window.chatBubbleHTML({ userId: 'u_outro', authorName: 'Ana 🌊', text: 'enc(oi)', timestamp: null });
assert.ok(htmlChat.includes('data-open-user="u_outro"'), 'chat tem gatilho de perfil');
console.log('✓ feed e chat expõem [data-open-user]');

await window.openUserProfile('u_outro');
await new Promise((r) => setTimeout(r, 150));
assert.ok($('#user-profile-modal').classList.contains('active'), 'modal de perfil abre');
assert.equal($('#user-profile-name').textContent, 'Usuário', 'sem doc de perfil, cai no padrão (getDoc stub exists:true mas data vazia?)');
assert.ok($('#user-profile-posts').innerHTML.includes('nada'), 'sem posts, estado vazio');
console.log('✓ perfil de outro usuário abre em modal com lista vazia');

if (errors.length) { console.error('Erros de página:', errors); process.exit(1); }
console.log('\n🎉 PROBE 4 PASSOU — craft, coleta, loja e perfil funcionando');
process.exit(0);
