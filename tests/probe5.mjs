/* Probe 5 (task 18): Arena ⚔️ — shell do app, deck (30 pts + singleton), árvore,
   motor de batalha (efeitos, início de turno, compra), criação de cartas e molduras na Loja. */
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
  { id: 'c2', ownerId: 'tester', name: 'Seta de Fogo', emoji: '🔥', artUrl: '', category: 'dano_fogo', cost: 2, power: 2, flavor: '', createdAt: { toMillis: () => 50 } },
  { id: 'c3', ownerId: 'tester', name: 'Chuva de Água', emoji: '💧', artUrl: '', category: 'dano_agua', cost: 4, power: 4, flavor: '', createdAt: { toMillis: () => 40 } },
  { id: 'c4', ownerId: 'tester', name: 'Muralha', emoji: '🛡️', artUrl: '', category: 'defesa', cost: 1, power: 2, flavor: '', createdAt: { toMillis: () => 30 } },
  { id: 'c5', ownerId: 'tester', name: 'Dragão da Chapada', emoji: '🐲', artUrl: '', category: 'invocacao', cost: 5, power: 5, flavor: '', createdAt: { toMillis: () => 20 } },
  { id: 'c6', ownerId: 'tester', name: 'Erva do Pântano', emoji: '💚', artUrl: '', category: 'cura', cost: 2, power: 1, flavor: '', createdAt: { toMillis: () => 10 } },
];
const ECO_DATA = {
  gold: 500,
  inv: {},
  buildings: {}, cosmetics: [], creditScore: 50,
  stamina: 100, staminaAt: Date.now(), gatherCd: {}, jobCd: {},
  arenaDeck: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
  arenaTree: {}
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
const CARD_DOCS = [{ id: 'c1', data: () => ({"id": "c1", "ownerId": "tester", "name": "Lâmina do Ribeirão", "emoji": "🗡️", "artUrl": "", "category": "dano", "cost": 3, "power": 3, "flavor": "Corte seco."}), ref: { id: 'c1' } },{ id: 'c2', data: () => ({"id": "c2", "ownerId": "tester", "name": "Seta de Fogo", "emoji": "🔥", "artUrl": "", "category": "dano_fogo", "cost": 2, "power": 2, "flavor": ""}), ref: { id: 'c2' } },{ id: 'c3', data: () => ({"id": "c3", "ownerId": "tester", "name": "Chuva de Água", "emoji": "💧", "artUrl": "", "category": "dano_agua", "cost": 4, "power": 4, "flavor": ""}), ref: { id: 'c3' } },{ id: 'c4', data: () => ({"id": "c4", "ownerId": "tester", "name": "Muralha", "emoji": "🛡️", "artUrl": "", "category": "defesa", "cost": 1, "power": 2, "flavor": ""}), ref: { id: 'c4' } },{ id: 'c5', data: () => ({"id": "c5", "ownerId": "tester", "name": "Dragão da Chapada", "emoji": "🐲", "artUrl": "", "category": "invocacao", "cost": 5, "power": 5, "flavor": ""}), ref: { id: 'c5' } },{ id: 'c6', data: () => ({"id": "c6", "ownerId": "tester", "name": "Erva do Pântano", "emoji": "💚", "artUrl": "", "category": "cura", "cost": 2, "power": 1, "flavor": ""}), ref: { id: 'c6' } }];
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
const runTransaction = async (db, fn) => fn({ get: async () => ({ data: () => ({ status: 'finished', winner: 'tester', stakeA: { gold: 0, cosmetics: [] }, stakeB: { gold: 0, cosmetics: [] } }) }), set: () => {}, update: () => {} });
const limit = (n) => n;
const deleteDoc = async () => {};`);

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

// Login simulado
window.eval('globalThis.__authCb && globalThis.__authCb({ uid: "tester", email: "t@t.com", metadata: { creationTime: new Date().toISOString() } })');
await new Promise((r) => setTimeout(r, 400));

// ---------- 1) App Arena abre e renderiza ----------
window.openApp('arena');
await new Promise((r) => setTimeout(r, 200));
assert.ok($('#app-arena').classList.contains('active'), 'app Arena abre');
assert.ok($('#arena-hub'), 'hub da Arena presente');
assert.equal($$('[data-arena-tab]').length, 4, '4 abas (Deck, Minhas Cartas, Criar, Batalhar)');
assert.equal($$('#ac-category option').length, 10, 'seletor de categoria com 10 opções');
assert.equal($$('#ac-emoji-row .ac-emoji-pick').length, 24, 'seletor de emoji com 24 opções');
assert.equal($$('#arena-tree .arena-tree-row').length, 10, 'árvore com 10 ramos');
assert.equal($('#arena-deck-points').textContent, '17/30', `deck de 6 cartas soma 17 pts (veio ${$('#arena-deck-points').textContent})`);
assert.equal($$('#arena-cards-grid .card-in-grid').length, 6, '6 cartas no grid');
console.log('✓ Arena: app abre, abas, categorias, árvore e deck (17/30) renderizados');

// ---------- 2) Validação de deck ----------
const v = window.validateArenaDeck();
assert.equal(v.ok, true, 'deck válido com 6 cartas e 17 pts');
assert.equal(v.points, 17);
assert.equal(v.size, 6);
console.log('✓ validateArenaDeck: 6 cartas · 17 pts · ok');

// ---------- 3) Remover carta do deck pelo grid ----------
const toggleBtn = $$('#arena-cards-grid [data-arena-deck-toggle]').find((b) => b.dataset.arenaDeckToggle === 'c6');
assert.ok(toggleBtn, 'botão de deck da carta c6 presente');
toggleBtn.click();
await new Promise((r) => setTimeout(r, 150));
assert.equal($('#arena-deck-points').textContent, '15/30', 'remover c6 (2 pts) deixa 15/30');
console.log('✓ toggle de deck funciona e recomputa os pontos');

// ---------- 4) Árvore: adicionar 1 ponto ----------
$('#arena-deck-points'); // deck agora 15/30
const treePlus = $$('#arena-tree [data-arena-tree][data-delta="1"]')[0];
treePlus.click();
await new Promise((r) => setTimeout(r, 150));
assert.equal($('#arena-tree-points').textContent, '1/30', '1 ponto na árvore');
console.log('✓ árvore: ponto investido e total atualizado');

// ---------- 5) Motor de batalha ----------
// 5a) Múltiplo de árvore+afinidade
const mult = window.arenaMultOf({ treeA: { dano: 5 }, catCountA: { dano: 2 } }, 'A', 'dano');
assert.ok(Math.abs(mult - (1 + 0.06 * 5 + 0.02 * 2)) < 1e-9, `mult árvore+afinidade (veio ${mult})`);
// 5c) Início de turno: criatura e estrutura atacam, mão compra
const match = {
  hpA: 60, hpB: 60,
  shieldA: { phys: 2, mag: 0 },
  shieldB: { phys: 5, mag: 10 },
  fieldA: [
    { kind: 'summon', uid: 'tk1', name: 'Lobo', emoji: '🐺', power: 3, turnsLeft: 2 },
    { kind: 'structure', uid: 'st1', name: 'Torre', emoji: '🏗️', tick: 4 }
  ],
  handA: [{ id: 'h1', name: 'Carta', emoji: '🗡️', category: 'dano', cost: 1, power: 1, flavor: '' }],
  deckA: [{ id: 'd1', name: 'Comprada', emoji: '🔥', category: 'dano_fogo', cost: 1, power: 1, flavor: '' }],
  treeA: { invocacao: 2 },
  catCountA: { invocacao: 1 },
  log: []
};
const start = window.arenaStartOfTurnPatch(match, 'A');
// Lobo: round(3*2*1.14)=round(6.84)=7 de físico; escudo B tem 5 → sobram 5 absorvidos, 2 de vida → hpB=58
assert.equal(start.patch.hpB, 58, `criatura furou o escudo físico (hpB=${start.patch.hpB})`);
// Torre: 4 de mágico; escudo mágico B tem 10 → absorve tudo → hpB continua 58
assert.equal(start.patch.shieldB.mag, 6, `estrutura drenou o escudo mágico (mag=${start.patch.shieldB.mag})`);
assert.equal(start.patch.fieldA.filter((u) => u.kind === 'summon')[0].turnsLeft, 1, 'criatura perdeu 1 de duração');
assert.equal(start.patch.fieldA.filter((u) => u.kind === 'structure').length, 1, 'estrutura permanece');
assert.equal(start.patch.handA.length, 2, 'comprou até completar a mão (2/5, deck só tinha 1)');
assert.equal(start.patch.deckA.length, 0, 'deck esgotou após a compra');
assert.ok(start.log.length >= 2, 'log registra os ataques');
console.log('✓ motor: mult, absorção, início de turno (criatura + estrutura), compra e log');

// 5d) Cartão-face da carta
const face = window.cardFaceHTML({ name: 'Teste', emoji: '🐉', category: 'dano_fogo', cost: 2, power: 4, flavor: 'queima' });
assert.ok(face.includes('Dano de Fogo'), 'face mostra a categoria');
assert.ok(face.includes('cf-power') && face.includes('>4<'), 'face mostra o poder');
console.log('✓ cardFaceHTML: nome, arte emoji, categoria, custo e poder');

// ---------- 6) Criar carta via UI ----------
$('#ac-name').value = 'Dragão de Teste';
$('#ac-flavor').value = 'Nascido no sertão.';
$('#ac-category').value = 'invocacao';
$('#ac-cost').value = '5';
$('#ac-power').value = '5';
$('#ac-save-btn').click();
await new Promise((r) => setTimeout(r, 250));
assert.equal($('#ac-name').value, '', 'formulário de criação limpa após salvar');
console.log('✓ criação de carta salva sem erros');

// ---------- 7) Loja: molduras de carta (20 itens) + compra com 500 gold ----------
window.openApp('shop');
await new Promise((r) => setTimeout(r, 150));
assert.equal($$('#card-cosmetic-grid .cosmetic-card').length, 20, '20 molduras de carta à venda');
const buyBtn = $$('#card-cosmetic-grid [data-buy-card-frame]')[0];
assert.ok(buyBtn, 'botão de compra presente');
buyBtn.click();
await new Promise((r) => setTimeout(r, 200));
assert.ok($('#shop-gold').textContent.startsWith('0'), `gold zerou após comprar moldura de 500 (veio ${$('#shop-gold').textContent})`);
const equipBtn = $('#card-cosmetic-grid [data-equip-card-frame]');
assert.ok(equipBtn, 'moldura comprada agora pode ser equipada');
console.log('✓ Loja: aba Cartas vende molduras e compra/equipa funciona');

// ---------- 8) claimArenaSettlements não quebra com docs vazios ----------
const settlements = await window.claimArenaSettlements({ silent: true });
assert.equal(settlements, 0, 'nenhuma partida encerrada pra liquidar — retorna 0');
console.log('✓ liquidação automática no login roda sem potes pendentes');

assert.deepEqual(errors, [], 'nenhum erro de JS no window durante o probe');
console.log('\n🎉 PROBE 5 PASSOU — Arena (deck, árvore, motor e criações) funcionando');
process.exit(0);
