/* Probe 6 (task 19): Arena ⚔️ — tela de vitória, Forja (pips + dica de efeito + preview)
   e deck/árvore na UI. Roda com o mesmo stub de Firestore do probe5. */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(`${root}/index.html`, 'utf8');
let js = readFileSync(`${root}/js/app.js`, 'utf8');

const CARDS = [
  { id: 'c1', ownerId: 'tester', name: 'Lâmina do Ribeirão', emoji: '🗡️', artUrl: '', category: 'dano', cost: 3, power: 3, flavor: 'Corte seco.', createdAt: { toMillis: () => 60 } },
  { id: 'c2', ownerId: 'tester', name: 'Seta de Fogo', emoji: '', artUrl: '', category: 'dano_fogo', cost: 2, power: 2, flavor: '', createdAt: { toMillis: () => 50 } },
  { id: 'c3', ownerId: 'tester', name: 'Chuva de Água', emoji: '', artUrl: '', category: 'dano_agua', cost: 4, power: 4, flavor: '', createdAt: { toMillis: () => 40 } },
  { id: 'c4', ownerId: 'tester', name: 'Muralha', emoji: '', artUrl: '', category: 'defesa', cost: 1, power: 2, flavor: '', createdAt: { toMillis: () => 30 } },
  { id: 'c5', ownerId: 'tester', name: 'Dragão da Chapada', emoji: '', artUrl: '', category: 'invocacao', cost: 5, power: 5, flavor: '', createdAt: { toMillis: () => 20 } },
  { id: 'c6', ownerId: 'tester', name: 'Erva do Pântano', emoji: '', artUrl: '', category: 'cura', cost: 2, power: 1, flavor: '', createdAt: { toMillis: () => 10 } },
];
const ECO_DATA = {
  gold: 500, inv: {}, buildings: {}, cosmetics: [], creditScore: 50,
  stamina: 100, staminaAt: Date.now(), gatherCd: {}, jobCd: {},
  arenaDeck: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'], arenaTree: {}
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
const addDoc = async () => ({ id: 'nova' });
const CARD_DOCS = [{ id: 'c1', data: () => ({"id": "c1", "ownerId": "tester", "name": "Lâmina do Ribeirão", "emoji": "🗡️", "artUrl": "", "category": "dano", "cost": 3, "power": 3, "flavor": "Corte seco."}), ref: { id: 'c1' } },{ id: 'c2', data: () => ({"id": "c2", "ownerId": "tester", "name": "Seta de Fogo", "emoji": "", "artUrl": "", "category": "dano_fogo", "cost": 2, "power": 2, "flavor": ""}), ref: { id: 'c2' } },{ id: 'c3', data: () => ({"id": "c3", "ownerId": "tester", "name": "Chuva de Água", "emoji": "", "artUrl": "", "category": "dano_agua", "cost": 4, "power": 4, "flavor": ""}), ref: { id: 'c3' } },{ id: 'c4', data: () => ({"id": "c4", "ownerId": "tester", "name": "Muralha", "emoji": "", "artUrl": "", "category": "defesa", "cost": 1, "power": 2, "flavor": ""}), ref: { id: 'c4' } },{ id: 'c5', data: () => ({"id": "c5", "ownerId": "tester", "name": "Dragão da Chapada", "emoji": "", "artUrl": "", "category": "invocacao", "cost": 5, "power": 5, "flavor": ""}), ref: { id: 'c5' } },{ id: 'c6', data: () => ({"id": "c6", "ownerId": "tester", "name": "Erva do Pântano", "emoji": "", "artUrl": "", "category": "cura", "cost": 2, "power": 1, "flavor": ""}), ref: { id: 'c6' } }];
const getDocs = async () => ({ empty: false, docs: CARD_DOCS, forEach(fn) { CARD_DOCS.forEach(fn); }, size: CARD_DOCS.length });
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
const runTransaction = async (db, fn) => fn({ get: async () => ({ data: () => null }), set: () => {}, update: () => {} });
const limit = (n) => n;
const deleteDoc = async () => {};`);

const dom = new JSDOM(html, { url: 'https://good-vibes.example/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
const errors = [];
window.addEventListener('error', (e) => errors.push(e.message));
window.CryptoJS = { AES: { encrypt: (t) => `enc(${t})`, decrypt: () => ({ toString: () => 'texto decifrado' }) }, enc: { Utf8: 'utf8' } };
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = () => {};
Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', { get() { return 100; } });
window.eval(readFileSync(`${root}/js/economy-data.js`, 'utf8'));
window.eval(js);
console.log('✓ app.js executou sem lançar exceção');

await new Promise((r) => setTimeout(r, 300));
const $ = (s) => window.document.querySelector(s);
const $$ = (s) => [...window.document.querySelectorAll(s)];

window.eval('globalThis.__authCb && globalThis.__authCb({ uid: "tester", email: "t@t.com", metadata: { creationTime: new Date().toISOString() } })');
await new Promise((r) => setTimeout(r, 400));
window.openApp('arena');
await new Promise((r) => setTimeout(r, 200));

// ---------- 1) Tela de vitória (3 estados) ----------
const baseMatch = {
  playerA: 'tester', playerAName: 'Você', playerAAvatar: '',
  playerB: 'foe', playerBName: 'Rival da Ilha', playerBAvatar: '',
  turn: 'B', turnNumber: 12,
  hpA: 24, hpB: 0,
  shieldA: { phys: 1, mag: 2 }, shieldB: { phys: 0, mag: 3 },
  fieldA: [{ kind: 'summon', uid: 'tk1', name: 'Lobo', power: 3, turnsLeft: 2 }],
  fieldB: [],
  handA: [{ id: 'h1', name: 'Carta Sem Emoji', category: 'dano', cost: 1, power: 2, flavor: '' }],
  handB: [{}, {}, {}],
  deckA: [{ id: 'd1' }], deckB: [{}, {}],
  stakeA: { gold: 100, cosmetics: ['cos1'] }, stakeB: { gold: 200, cosmetics: ['cos2'] },
  potGold: 300,
  log: ['início']
};
window.renderArenaMatch({ ...baseMatch, status: 'finished', winner: 'tester' });
assert.equal($('#arena-finish').hidden, false, 'overlay visível quando a partida acaba');
assert.ok($('#arena-finish').classList.contains('am-finish--win'), 'classe --win aplicada');
assert.equal($('#am-finish-title').textContent, 'Você venceu!', 'título de vitória');
assert.equal($('#am-finish-icon-use').getAttribute('href'), '#arena-trophy', 'ícone de troféu');
assert.equal($$('#am-finish-pot .am-finish-pot-row').length, 3, 'pote com 3 linhas (eu, rival, total)');
assert.ok($('#am-finish-pot .am-finish-pot-row.is-total b').textContent.includes('300'), 'pote total mostra 300 gold');
assert.equal($('#am-settle-btn').hidden, false, 'botão "Receber pote" aparece pra quem venceu');
assert.equal($('#am-settle-btn').disabled, false, 'botão habilitado');
assert.ok($$('#arena-hand .card-face .cf-emblem').length >= 1, 'cartas da mão sem arte usam o emblema SVG da categoria');
assert.equal($('#am-turn-tag').hidden, true, 'tag "SUA VEZ" some fora do seu turno');
assert.equal($('#am-turn-tag-opp').hidden, true, 'tag do rival some com o jogo encerrado');
console.log('✓ vitória: overlay, ícone troféu, pote detalhado e botão de resgate ok');

window.renderArenaMatch({ ...baseMatch, status: 'finished', winner: 'foe' });
assert.ok($('#arena-finish').classList.contains('am-finish--lose'), 'classe --lose aplicada');
assert.equal($('#am-finish-title').textContent, 'Você perdeu…', 'título de derrota');
assert.equal($('#am-finish-icon-use').getAttribute('href'), '#arena-x-circle', 'ícone de derrota');
assert.equal($('#am-settle-btn').hidden, true, 'quem perdeu não vê "Receber pote"');
console.log('✓ derrota: overlay correto e pote fora do alcance');

window.renderArenaMatch({ ...baseMatch, status: 'cancelled', winner: '' });
assert.ok($('#arena-finish').classList.contains('am-finish--cancel'), 'classe --cancel aplicada');
assert.equal($('#am-finish-title').textContent, 'Desafio cancelado', 'título de cancelamento');
assert.equal($('#am-finish-icon-use').getAttribute('href'), '#arena-flag', 'ícone de bandeira');
assert.equal($('#am-finish-pot').innerHTML, '', 'pote some quando o desafio é cancelado');
assert.equal($('#am-settle-btn').hidden, true, 'cancelado não mostra resgate');
console.log('✓ cancelamento: overlay neutro sem pote');

window.renderArenaMatch({ ...baseMatch, status: 'settled', winner: 'tester' });
assert.equal($('#am-finish-title').textContent, 'Você venceu!', 'título mantido após resgate');
assert.ok($('#am-finish-sub').textContent.includes('resgatado'), 'subtítulo confirma o resgate');
assert.equal($('#am-settle-btn').hidden, true, 'após resgate o botão some');
console.log('✓ settled: tela reflete o pote já resgatado');

// ---------- 2) Forja: pips, dica de efeito, preview e contador ----------
const createTab = $('[data-arena-tab="create"]');
createTab.click();
await new Promise((r) => setTimeout(r, 80));
$('#ac-name').value = 'Muro de Fulano';
$('#ac-category').value = 'defesa';
$('#ac-category').dispatchEvent(new window.Event('change', { bubbles: true }));
$$('#ac-power-row .arena-pip[data-value="4"]')[0].click();
await new Promise((r) => setTimeout(r, 80));
assert.ok($('#ac-effect-hint-text').textContent.includes('escudo físico'), `dica de defesa (veio: ${$('#ac-effect-hint-text').textContent})`);
assert.ok($('#ac-effect-hint-text').textContent.includes('14'), 'poder 4 → +14 de escudo (round(4*3)+2)');
const previewFace = $('#ac-preview');
assert.equal(previewFace.tagName, 'DIV', 'preview renderizado');
assert.ok(previewFace.classList.contains('tint-defesa'), 'preview usa a cor da categoria');
assert.ok(previewFace.querySelector('.cf-power').textContent === '4', 'poder 4 no preview');
assert.equal($('#ac-flavor-count').textContent, '0/120', 'contador começa zerado');
$('#ac-flavor').value = 'Aqui ninguém passa.';
$('#ac-flavor').dispatchEvent(new window.Event('input', { bubbles: true }));
await new Promise((r) => setTimeout(r, 200));
assert.equal($('#ac-flavor-count').textContent, '19/120', 'contador acompanha a digitação');
console.log('✓ Forja: pips, dica de efeito, preview tingido e contador ok');

// Duelo: trocar para a aba atualiza o check do deck
$('[data-arena-tab="battle"]').click();
await new Promise((r) => setTimeout(r, 200));
assert.ok($('#arena-deck-check').classList.contains('ok'), `duelo: deck de 17 pts marcado como pronto (veio: ${$('#arena-deck-check').className})`);
assert.ok($('#arena-deck-check').innerHTML.includes('Deck pronto!'), 'check de deck mostra a mensagem de sucesso');
console.log('✓ Duelo: check de deck pronto ok');

// ---------- 3) Painel do deck: linhas novas com custo em hex ----------
window.openApp('arena');
await new Promise((r) => setTimeout(r, 80));
$('[data-arena-tab="deck"]').click();
await new Promise((r) => setTimeout(r, 80));
assert.equal($('#arena-deck-points').textContent, '17', 'orb mostra 17');
assert.equal($('#arena-deck-count').textContent, '6 cartas', 'contador de cartas do deck');
assert.equal($$('#arena-deck-list .arena-deck-row').length, 6, '6 linhas no deck');
assert.ok($$('#arena-deck-list .arena-deck-row .arena-deck-cost svg').length === 6, 'cada linha tem o hex de custo');
assert.ok($$('#arena-deck-list .arena-deck-thumb svg').length >= 5, 'artes sem imagem usam o emblema da categoria');
assert.equal($$('#arena-tree .arena-tree-row').length, 10, 'árvore com 10 ramos renderizados');
assert.ok($$('#arena-tree .tree-badge svg').length === 10, 'cada ramo tem o emblema SVG');
console.log('✓ deck: orb, medidor, linhas com hex e árvore com emblemas ok');

assert.deepEqual(errors, [], 'nenhum erro de JS no window durante o probe');
console.log('\n🎉 PROBE 6 PASSOU — vitória, Forja e deck/árvore funcionando');
process.exit(0);
