/* Probe 10 (v5.0.0): Arena 3.0 — Mesa de Guerra.
   Cobre: seletor de traço na Forja (10 por categoria, preview, salvar),
   pilhas de compra/descarte (doc + UI + rebaralhar), combate criatura→criatura,
   e o cortejo completo: TODOS os 100 traços de efeito jogados sem exceção. */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(`${root}/index.html`, 'utf8');
const jsFile = readFileSync(`${root}/js/app.js`, 'utf8');
const cssFile = readFileSync(`${root}/css/style.css`, 'utf8');

// ---------- 0) Estático ----------
for (const id of ['ac-effect-grid', 'am-pile-deck-me', 'am-pile-deck-foe', 'am-pile-discard-me', 'am-pile-discard-foe']) {
  assert.ok(html.includes(`id="${id}"`), `index.html tem #${id}`);
}
assert.ok(html.includes('class="am-tablewrap"'), 'index.html tem o envoltório da mesa');
assert.ok(html.includes('Cinzel'), 'fonte display Cinzel referenciada');
for (const sel of ['.effect-grid', '.effect-chip.is-active', '.am-cardback', '.cf-effect', '.am-tablewrap']) {
  assert.ok(cssFile.includes(sel), `style.css tem ${sel}`);
}
assert.ok(cssFile.includes('.am-hand .card-face { flex: 0 0 104px; scroll-snap-align: start; cursor: pointer; transition: transform .15s, box-shadow .15s; touch-action: pan-x; }'), 'mão permite pan horizontal por toque');
assert.ok(!cssFile.includes('.am-hand .card-face { touch-action: none'), 'touch-action:none removido da mão');
assert.ok(jsFile.includes('ARENA_EFFECTS'), 'tabela ARENA_EFFECTS presente');
const effCount = (jsFile.match(/\{ id: '/g) || []).length;
console.log(`✓ estático: html/css/js da Mesa de Guerra presentes`);
assert.ok((jsFile.match(/discardA: \[\], discardB: \[\],/g) || []).length === 2, 'doc da partida nasce com descarte vazio nos 2 fluxos de criação');
assert.ok(jsFile.includes('function arenaStartOfTurnPatch') && jsFile.includes('Combate entre criaturas'), 'combate entre criaturas implementado');

const CARDS = [
  { id: 'c1', ownerId: 'tester', name: 'Lâmina do Ribeirão', emoji: '🗡️', artUrl: '', category: 'dano', cost: 3, power: 3, flavor: '', effect: 'ferida_aberta', createdAt: { toMillis: () => 60 } },
  { id: 'c2', ownerId: 'tester', name: 'Seta de Fogo', emoji: '🔥', artUrl: '', category: 'dano_fogo', cost: 2, power: 2, flavor: '', effect: 'propagacao', createdAt: { toMillis: () => 50 } },
  { id: 'c3', ownerId: 'tester', name: 'Muralha', emoji: '🛡️', artUrl: '', category: 'defesa', cost: 1, power: 2, flavor: '', effect: 'muralha_cinzas', createdAt: { toMillis: () => 40 } },
  { id: 'c5', ownerId: 'tester', name: 'Dragão da Chapada', emoji: '🐲', artUrl: '', category: 'invocacao', cost: 5, power: 5, flavor: '', effect: 'enxame', createdAt: { toMillis: () => 20 } },
];
const ECO_DATA = {
  gold: 1000, inv: {}, buildings: {}, cosmetics: [], creditScore: 50,
  stamina: 100, staminaAt: Date.now(), gatherCd: {}, jobCd: {},
  arenaDeck: ['c1', 'c3', 'c5'], arenaTree: {}, arenaEvo: {},
  arenaRelics: [], arenaRelicEquips: {}
};
const addDocCalls = [];
const written = [];
const updated = [];

const js = jsFile
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
const collection = (db, name) => ({ __col: name });
const addDoc = async (colRef, data) => { window.__addDocCalls.push({ col: colRef?.__col, data }); return { id: 'nova' + window.__addDocCalls.length }; };
const CARDS_DATA = ${JSON.stringify(CARDS)};
const CARD_DOCS = CARDS_DATA.map(c => ({ id: c.id, data: () => ({ ...c }), ref: { id: c.id } }));
const getDocs = async () => ({ empty: false, docs: CARD_DOCS, forEach(fn) { CARD_DOCS.forEach(fn); }, size: CARD_DOCS.length });
const getDoc = async () => ({ exists: () => true, data: () => window.__ECO });
const doc = (db, name, id) => ({ __doc: id });
const setDoc = async () => {};
const query = () => ({});
const orderBy = () => ({});
const onSnapshot = (q, ok) => { return () => {}; };
const serverTimestamp = () => ({ toMillis: () => Date.now() });
const updateDoc = async () => {};
const increment = (n) => n;
const where = () => ({});
const runTransaction = async (db, fn) => {
  const tx = {
    get: async () => ({ data: () => ({ ...window.__MATCH }), exists: () => true }),
    set: (ref, data, opts) => { window.__WRITTEN.push({ ref, data, opts }); Object.assign(window.__ECO, data || {}); },
    update: (ref, data) => { window.__UPDATED.push({ ref, data }); Object.assign(window.__MATCH, data); }
  };
  return fn(tx);
};
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
window.confirm = () => true;
window.__ECO = ECO_DATA;
window.__WRITTEN = written;
window.__UPDATED = updated;
window.__MATCH = {};
window.__addDocCalls = addDocCalls;
window.eval(readFileSync(`${root}/js/economy-data.js`, 'utf8'));
window.eval(js);
console.log('✓ app.js executou sem lançar exceção');
await new Promise((r) => setTimeout(r, 300));
const $ = (s) => window.document.querySelector(s);
const $$ = (s) => [...window.document.querySelectorAll(s)];
window.eval('globalThis.__authCb && globalThis.__authCb({ uid: "tester", email: "t@t.com", metadata: { creationTime: new Date().toISOString() } })');
await new Promise((r) => setTimeout(r, 400));
window.openApp('arena');

// ---------- 1) Forja: 10 traços por categoria + seleção + preview ----------
$('[data-arena-tab="create"]').click();
await new Promise((r) => setTimeout(r, 250));
const cat = $('#ac-category');
assert.ok(cat && cat.options.length === 10, 'seletor tem 10 categorias');
const firstCat = cat.value;
let chips = $$('#ac-effect-grid .effect-chip');
assert.equal(chips.length, 10, `categoria ${firstCat} tem 10 traços`);
const second = chips[1];
const secondId = second.dataset.effect;
const secondName = second.querySelector('.effect-chip-name').textContent;
second.click();
await new Promise((r) => setTimeout(r, 150));
chips = $$('#ac-effect-grid .effect-chip');
assert.equal(chips.filter((c) => c.classList.contains('is-active')).length, 1, 'apenas 1 traço ativo');
assert.equal(chips.find((c) => c.classList.contains('is-active')).dataset.effect, secondId, 'traço clicado ficou ativo');
const previewTrait = $('#ac-preview .cf-effect');
assert.ok(previewTrait && previewTrait.textContent === secondName, `preview mostra a faixa “${secondName}” (veio: ${previewTrait?.textContent})`);
const hint = $('#ac-effect-hint-text').textContent;
assert.ok(hint.length > 20, 'dica do traço descreve a mecânica');
console.log('✓ Forja: grade de traços renderiza, seleciona e propaga pro preview');

// Troca de categoria → grade re-renderiza com os 10 da nova categoria
cat.value = 'dano_fogo';
cat.dispatchEvent(new window.Event('change'));
await new Promise((r) => setTimeout(r, 150));
chips = $$('#ac-effect-grid .effect-chip');
assert.equal(chips.length, 10, 'troca de categoria re-renderiza os traços');
assert.ok(chips.some((c) => c.dataset.effect === 'propagacao'), 'traços de fogo listados');
console.log('✓ Forja: trocar a categoria troca os 10 traços');

// ---------- 2) Salvar carta persiste o traço ----------
const nameInput = $('#ac-name');
nameInput.value = 'Carta Traço Sábia';
nameInput.dispatchEvent(new window.Event('input'));
cat.value = 'dano_ar';
cat.dispatchEvent(new window.Event('change'));
await new Promise((r) => setTimeout(r, 120));
$$('#ac-effect-grid .effect-chip')[3].click(); // fio_cortante
await new Promise((r) => setTimeout(r, 120));
$('#ac-save-btn').click();
await new Promise((r) => setTimeout(r, 350));
const saved = addDocCalls.find((c) => c.col === 'cards' && c.data?.name === 'Carta Traço Sábia');
assert.ok(saved, 'carta foi enviada pro Firestore');
assert.equal(saved.data.effect, 'fio_cortante', `traço salvo no doc (veio: ${saved.data.effect})`);
assert.equal(saved.data.category, 'dano_ar', 'categoria salva');
console.log('✓ Forja: carta salva com o traço escolhido');

// ---------- 3) Motor: Ferida Aberta sangra e faz o sangrado comprar... para quem aplicou ----------
const baseMatch = () => ({
  playerA: 'tester', playerAName: 'Você', playerAAvatar: '',
  playerB: 'foe', playerBName: 'Rival', playerBAvatar: '',
  starter: 'A', status: 'active', turn: 'A', turnNumber: 1,
  hpA: 60, hpB: 60, shieldA: { phys: 0, mag: 0 }, shieldB: { phys: 0, mag: 0 },
  deckA: [
    { id: 'a1', name: 'Reserva A1', emoji: '🃏', category: 'dano', cost: 1, power: 1, flavor: '', effect: '' },
    { id: 'a2', name: 'Reserva A2', emoji: '🃏', category: 'dano', cost: 1, power: 1, flavor: '', effect: '' },
  ], handA: [], deckB: [
    { id: 'd1', name: 'Carta X', emoji: '🃏', category: 'dano', cost: 1, power: 1, flavor: '', effect: '' },
    { id: 'd2', name: 'Carta Y', emoji: '🃏', category: 'dano', cost: 1, power: 1, flavor: '', effect: '' },
  ], handB: [],
  discardA: [], discardB: [],
  fieldA: [], fieldB: [],
  treeA: {}, catCountA: {}, treeB: {}, catCountB: {},
  stakeA: { gold: 0, cosmetics: [] }, stakeB: { gold: 0, cosmetics: [] },
  potGold: 0, winner: '', log: [],
  upgA: {}, relicsA: {}, upgB: {}, relicsB: {}
});
window.__MATCH = { ...baseMatch(), handA: [CARDS[0]] }; // Lâmina com Ferida Aberta
window.__UPDATED.length = 0;
window.openArenaMatch('m10a');
await window.playArenaCard('c1');
const sangrou = window.__UPDATED[window.__UPDATED.length - 1].data;
assert.equal(sangrou.dotB?.draw, true, 'Ferida Aberta: o sangramento marca draw');
assert.equal(sangrou.discardA?.length, 1, 'carta jogada foi pro descarte');
assert.equal(sangrou.discardA[0].effect, 'ferida_aberta', 'descarte guarda o traço');
console.log('✓ motor: carta jogada cai no descarte; Ferida Aberta marca a ferida');

// A própria jogada já processa o início do turno do rival (os gatilhos dele rodam);
// o tick de Ferida Aberta faz quem feriu comprar 1 carta.
assert.deepEqual((sangrou.handA || []).map((c) => c.id), ['a1'], 'Ferida Aberta: quem feriu comprou 1 no turno do rival');
assert.deepEqual((sangrou.deckA || []).map((c) => c.id), ['a2'], 'monte de A 2→1');
assert.equal((sangrou.handB || []).length, 2, 'B comprou as cartas normais do turno (mão 0→2)');
assert.equal(sangrou.dotB?.turns, 2, 'o sangramento gastou 1 turno (3→2)');
console.log('✓ engine: Ferida Aberta faz quem feriu comprar a cada turno');

// ---------- 4) Pilhas na UI ----------
window.__MATCH = {
  ...baseMatch(),
  deckA: [CARDS[0], CARDS[1], CARDS[2]],
  discardA: [ { id: 'x1', name: 'Lâmina Velha', category: 'dano', cost: 3, power: 3, effect: 'golpe_sombrio' } ],
  deckB: [CARDS[0]],
  discardB: [ { id: 'x2', name: 'Muralha Velha', category: 'defesa', cost: 1, power: 2, effect: 'bastiao_sertao' }, { id: 'x3', name: 'Fogo Velho', category: 'dano_fogo', cost: 2, power: 2, effect: 'labareda_sol' } ],
};
window.eval('renderArenaMatch(window.__MATCH)');
assert.equal($('#am-pile-deck-me').textContent, '3', 'monte de compra exibe 3');
assert.equal($('#am-pile-deck-foe').textContent, '1', 'monte do rival exibe 1');
assert.equal($('#am-pile-discard-me').textContent, '1', 'meu descarte exibe 1');
assert.equal($('#am-pile-discard-foe').textContent, '2', 'descarte do rival exibe 2');
assert.ok($('#am-pile-discard-me-top').textContent.includes('Lâmina Velha'), 'topo do descarte mostra a carta');
console.log('✓ UI: pilhas de monte e descarte renderizam contagem e topo');

// ---------- 5) Combate criatura→criatura (o rival revida!) ----------
window.__MATCH = {
  ...baseMatch(),
  turn: 'A',
  fieldA: [{ kind: 'summon', uid: 'sA', name: 'Dragão Aliado', category: 'invocacao', power: 1, hp: 8, turnsLeft: 3 }],
  fieldB: [{ kind: 'summon', uid: 'sB', name: 'T-Rex Rival', category: 'invocacao', power: 2, hp: 4, turnsLeft: 3 }],
};
const combat = window.eval('arenaStartOfTurnPatch')(window.__MATCH, 'A');
const sA = (combat.patch.fieldA || []).find((u) => u.uid === 'sA');
const sB = (combat.patch.fieldB || []).find((u) => u.uid === 'sB');
assert.ok(sA && sA.hp === 4, `Dragão Aliado levou o revide 8→4 (veio ${JSON.stringify(sA)})`);
assert.ok(sB && sB.hp === 2, `T-Rex Rival levou 2 (veio ${JSON.stringify(sB)})`);
assert.equal(combat.patch.hpB, 60, 'ninguém direto na vida — criatura bateu em criatura');
console.log('✓ engine: criaturas se atacam antes do rosto');

// ---------- 6) Monte vazio → descarte reembaralha ----------
window.__MATCH = { ...baseMatch(), turn: 'A', deckA: [], handA: [], discardA: [CARDS[0], CARDS[1], CARDS[2]] };
const refill = window.eval('arenaStartOfTurnPatch')(window.__MATCH, 'A');
assert.equal((refill.patch.handA || []).length, 3, 'monte vazio: comprou o descarte reembaralhado');
assert.deepEqual(refill.patch.discardA, [], 'descarte zerado após rebaralhar');
console.log('✓ engine: monte vazio reembaralha o descarte');

// ---------- 7) Cortejo: TODOS os 100 traços jogam sem exceção ----------
// ARENA_EFFECTS é const (não vaza pro window) — lê da fonte com eval local
let ALL = [];
{
  const m = jsFile.match(/const ARENA_EFFECTS = \{[\s\S]*?\n\};/);
  assert.ok(m, 'ARENA_EFFECTS localizado na fonte');
  const ARENA_EFFECTS = eval('(' + m[0].replace('const ARENA_EFFECTS =', '').replace(/;\s*$/, '') + ')');
  for (const [cat, list] of Object.entries(ARENA_EFFECTS)) for (const e of list) ALL.push([cat, e.id, e.name]);
}
assert.equal(ALL.length, 100, `100 traços catalogados (veio ${ALL.length})`);
let ok = 0;
const failures = [];
for (const [catId, effectId] of ALL) {
  try {
    const card = { id: `sweep_${effectId}`, name: `Teste ${effectId}`, emoji: '🃏', artUrl: '', category: catId, cost: 1, power: 3, flavor: '', effect: effectId };
    window.__MATCH = { ...baseMatch(), handA: [card], fieldA: [], fieldB: [{ kind: 'summon', uid: 'fb1', name: 'Alvo', category: 'invocacao', power: 2, hp: 8, turnsLeft: 3 }] };
    const before = window.__UPDATED.length;
    await window.playArenaCard(card.id);
    if (window.__UPDATED.length === before) throw new Error('jogada não foi gravada');
    const played = window.__UPDATED[window.__UPDATED.length - 1].data;
    assert.equal((played.discardA || []).length, 1, 'carta foi pro descarte');
    ok += 1;
  } catch (err) {
    failures.push(`${catId}/${effectId}: ${err?.message || err}`);
  }
}
assert.deepEqual(failures, [], `traços com falha:\n${failures.join('\n')}`);
console.log(`✓ motor: ${ok}/100 traços executados de ponta a ponta`);

assert.deepEqual(errors, [], 'nenhum erro de JS no window durante o probe');
console.log('\n🎉 PROBE 10 PASSOU — Forja com traços, pilhas de monte/descarte e 100 efeitos de ponta a ponta');
process.exit(0);
