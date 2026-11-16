/* Probe 9 (v4.8.0): Arena Estratégica — árvore por carta, relíquias e novos efeitos.
   Cobre: relíquias na Loja, modal Árvore da carta (Força/Sintonia/Eco + relíquia),
   motor de efeitos (sangramento, barreira, furacão atordoa, teto de campo). */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(`${root}/index.html`, 'utf8');
const jsFile = readFileSync(`${root}/js/app.js`, 'utf8');
const rules = readFileSync(`${root}/firestore.rules`, 'utf8');

// ---------- 0) Estático ----------
assert.ok(rules.includes("'upgB', 'relicsB'"), 'regra accept libera upgB/relicsB');
for (const id of ['arena-relic-grid', 'arena-card-tree-modal', 'ctm-branches', 'ctm-relics', 'am-status-opponent', 'am-status-me', 'am-front-count-me']) {
  assert.ok(html.includes(`id="${id}"`), `index.html tem #${id}`);
}
assert.ok(jsFile.includes('ARENA_UPG_COSTS'), 'custos da árvore da carta');
console.log('✓ estático: html, regras e motor presentes');

const CARDS = [
  { id: 'c1', ownerId: 'tester', name: 'Lâmina do Ribeirão', emoji: '🗡️', artUrl: '', category: 'dano', cost: 3, power: 3, flavor: '', createdAt: { toMillis: () => 60 } },
  { id: 'c2', ownerId: 'tester', name: 'Seta de Fogo', emoji: '🔥', artUrl: '', category: 'dano_fogo', cost: 2, power: 2, flavor: '', createdAt: { toMillis: () => 50 } },
  { id: 'c3', ownerId: 'tester', name: 'Chuva de Água', emoji: '💧', artUrl: '', category: 'dano_agua', cost: 4, power: 4, flavor: '', createdAt: { toMillis: () => 40 } },
  { id: 'c4', ownerId: 'tester', name: 'Muralha', emoji: '🛡️', artUrl: '', category: 'defesa', cost: 1, power: 2, flavor: '', createdAt: { toMillis: () => 30 } },
  { id: 'c7', ownerId: 'tester', name: 'Véu de Orvalho', emoji: '🔮', artUrl: '', category: 'defesa_magica', cost: 1, power: 2, flavor: '', createdAt: { toMillis: () => 25 } },
  { id: 'c8', ownerId: 'tester', name: 'Rajada do Sertão', emoji: '🌪️', artUrl: '', category: 'dano_ar', cost: 1, power: 1, flavor: '', createdAt: { toMillis: () => 22 } },
  { id: 'c5', ownerId: 'tester', name: 'Dragão da Chapada', emoji: '🐲', artUrl: '', category: 'invocacao', cost: 5, power: 5, flavor: '', createdAt: { toMillis: () => 20 } },
  { id: 'c9', ownerId: 'tester', name: 'Vazio Tormenta', emoji: '🌑', artUrl: '', category: 'estrutura', cost: 4, power: 3, flavor: '', createdAt: { toMillis: () => 15 } },
];
const ECO_DATA = {
  gold: 5000, inv: {}, buildings: {}, cosmetics: [], creditScore: 50,
  stamina: 100, staminaAt: Date.now(), gatherCd: {}, jobCd: {},
  arenaDeck: ['c1', 'c4', 'c7', 'c8', 'c5', 'c9'], arenaTree: {},
  arenaUpgrades: { c1: { f: 3, s: 0, e: 0 } }, arenaRelics: [], arenaRelicEquips: {}
};
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
const collection = () => ({});
const addDoc = async () => ({ id: 'nova' });
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
window.__ECO = ECO_DATA;
window.__WRITTEN = written;
window.__UPDATED = updated;
window.__MATCH = {};
window.eval(readFileSync(`${root}/js/economy-data.js`, 'utf8'));
window.eval(js);
console.log('✓ app.js executou sem lançar exceção');
await new Promise((r) => setTimeout(r, 300));
const $ = (s) => window.document.querySelector(s);
const $$ = (s) => [...window.document.querySelectorAll(s)];
window.eval('globalThis.__authCb && globalThis.__authCb({ uid: "tester", email: "t@t.com", metadata: { creationTime: new Date().toISOString() } })');
await new Promise((r) => setTimeout(r, 400));
window.openApp('arena');

// ---------- 1) Loja: relíquias ----------
$('[data-arena-tab="battle"]').click(); // streak: força renderCardCosmeticShop? não — vai direto pra aba
await new Promise((r) => setTimeout(r, 200));
window.eval('renderCardCosmeticShop()');
await new Promise((r) => setTimeout(r, 150));
assert.equal($$('#arena-relic-grid .cosmetic-card').length, 4, 'Loja mostra 4 relíquias');
console.log('✓ Loja: relíquias renderizadas');

// ---------- 2) Modal Árvore da carta ----------
$('[data-arena-tab="cards"]').click();
await new Promise((r) => setTimeout(r, 250));
const gridBtn = $(`[data-arena-card-upgrade="c1"]`);
assert.ok(gridBtn, 'grid tem botão de aprimorar');
gridBtn.click();
await new Promise((r) => setTimeout(r, 200));
assert.ok($('#arena-card-tree-modal').classList.contains('active'), 'modal abriu');
assert.ok($('#ctm-face').innerHTML.includes('Lâmina'), 'carta no modal');
assert.ok($('#ctm-gold').textContent.includes('5.000'), `gold exibido (veio: ${$('#ctm-gold').textContent})`);
const firstBuy = $$('#ctm-branches .ctm-buy')[0];
assert.ok(firstBuy.disabled, 'ramo Força já está no máximo (f=3)');
assert.ok(firstBuy.classList.contains('maxed'), 'botão máximo estilizado');
const synBtn = $$('#ctm-branches .ctm-buy')[1];
assert.ok(synBtn.textContent.includes('400'), 'primeiro ponto de Sintonia custa 400');
const sum = $('#ctm-summary').textContent;
assert.ok(sum.includes('+36%'), `resumo mostra +36% (veio: ${sum})`); // f=3 → 1.36
console.log('✓ modal: árvore da carta abre com resumo correto');
// 2b) investir Sintonia até o máximo
const synBuy = $$('#ctm-branches .ctm-buy')[1];
synBuy.click();
await new Promise((r) => setTimeout(r, 200));
assert.equal($('#ctm-gold').textContent.replace(/\D/g, ''), '4600', `modal mostra 4.600 gold (veio: ${$('#ctm-gold').textContent})`);
assert.ok($('#ctm-summary').textContent.includes('+10%'), `resumo atualiza Sintonia (+10%) — veio: ${$('#ctm-summary').textContent}`);
console.log('✓ investir ponto em Sintonia funciona e debita gold');

// ---------- 3) Relíquia: comprar e equipar ----------
// comprar relic_escama (600) diretamente na Loja
window.eval('buyArenaRelic("relic_escama")');
await new Promise((r) => setTimeout(r, 200));
assert.ok($('#arena-relic-grid').innerHTML.includes('✓ Sua'), 'Loja marca relíquia como sua');
assert.ok($('#ctm-gold').textContent.replace(/\D/g, '') === '4000', `modal mostra 4.000 gold (veio: ${$('#ctm-gold').textContent})`);
// equipar via modal na carta c1
window.eval('toggleArenaRelicEquip("c1", "relic_escama")');
await new Promise((r) => setTimeout(r, 200));
const equippedChip = $('#ctm-relics .ctm-relic.equipped');
assert.ok(equippedChip, 'relíquia marcada como equipada no modal');
assert.ok($('#ctm-summary').textContent.includes('Escama de Aço'), `resumo cita a relíquia (veio: ${$('#ctm-summary').textContent})`);
console.log('✓ relíquia comprada e equipada na carta');

// ---------- 4) Motor: efeito Físico com Força 3 (+36%) ----------
const mkSnap = (id) => CARDS.find((c) => c.id === id);
window.__MATCH = {
  playerA: 'tester', playerAName: 'Você', playerAAvatar: '',
  playerB: 'foe', playerBName: 'Rival', playerBAvatar: '',
  starter: 'A', status: 'active', turn: 'A', turnNumber: 1,
  hpA: 60, hpB: 60, shieldA: { phys: 0, mag: 0 }, shieldB: { phys: 0, mag: 0 },
  deckA: [mkSnap('c2')], handA: [mkSnap('c1')], deckB: [], handB: [],
  fieldA: [], fieldB: [],
  treeA: {}, catCountA: { dano: 1 }, treeB: {}, catCountB: {},
  stakeA: { gold: 0, cosmetics: [] }, stakeB: { gold: 0, cosmetics: [] },
  potGold: 0, winner: '', log: [],
  upgA: { c1: { f: 3, s: 0, e: 0 } }, relicsA: { c1: 'relic_escama' }, upgB: {}, relicsB: {}
};
window.__UPDATED.length = 0;
window.openArenaMatch('m1');
await window.playArenaCard('c1');
const play = window.__UPDATED[window.__UPDATED.length - 1].data;
// eff = 3 * (1.02 ref/count) * (1 + .36 forca) = 4.1616 ; base = round(4.1616*3)+2 = 14
assert.equal(play.hpB, 44, `hpB após o golpe físico + Sangramento (esperado 44 — 14 de dano + 2 de DoT no turno do rival; veio ${play.hpB})`);
assert.equal(play.dotB?.dmg, 2, 'sangramento 2/turno');
assert.equal(play.dotB?.turns, 1, 'sangramento gastou 1 turno no tick do rival');
assert.equal(play.shieldA?.phys, 4, 'Escama de Aço deu +4 escudo físico ao lançador');
assert.equal(play.turn, 'B', 'vez do rival depois da jogada');
console.log('✓ motor: Físico com Força 3 + Escama de Aço + Sangramento tickando');

// ---------- 5) Defesa Física: escudo + espinhos ----------
window.__MATCH = {
  playerA: 'tester', playerAName: 'Você', playerAAvatar: '', playerB: 'foe', playerBName: 'Rival', playerBAvatar: '',
  starter: 'A', status: 'active', turn: 'A', turnNumber: 1,
  hpA: 60, hpB: 60, shieldA: { phys: 0, mag: 0 }, shieldB: { phys: 0, mag: 0 },
  deckA: [], handA: [mkSnap('c4')], deckB: [], handB: [],
  fieldA: [], fieldB: [], treeA: {}, catCountA: { defesa: 1 }, treeB: {}, catCountB: {},
  stakeA: { gold: 0, cosmetics: [] }, stakeB: { gold: 0, cosmetics: [] }, potGold: 0, winner: '', log: [],
  upgA: { c4: { f: 0, s: 0, e: 2 } }, relicsA: {}, upgB: {}, relicsB: {}
};
window.__UPDATED.length = 0;
window.openArenaMatch('m2');
await window.playArenaCard('c4');
const wall = window.__UPDATED[window.__UPDATED.length - 1].data;
assert.equal(wall.shieldA.phys, 8, `escudo físico 6+2 por… (veio ${wall.shieldA.phys})`); // eff=2*1.02=2.04; base=round(6.12)+2=8
assert.equal(wall.thornsA?.amount, 8, `espinhos com Eco 2 = 4+2*2 (veio ${wall.thornsA?.amount})`);
assert.equal(wall.thornsA?.turns, 2, 'espinhos duram 2 turnos');
console.log('✓ motor: Defesa Física com Eco dá escudo + espinhos');

// ---------- 6) Defesa Mágica: barreira (absorve 25%) ----------
window.__MATCH = {
  playerA: 'tester', playerAName: 'Você', playerAAvatar: '', playerB: 'foe', playerBName: 'Rival', playerBAvatar: '',
  starter: 'A', status: 'active', turn: 'A', turnNumber: 1,
  hpA: 60, hpB: 60, shieldA: { phys: 0, mag: 0 }, shieldB: { phys: 0, mag: 0 },
  deckA: [], handA: [mkSnap('c7')], deckB: [], handB: [],
  fieldA: [], fieldB: [], treeA: {}, catCountA: { defesa_magica: 1 }, treeB: {}, catCountB: {},
  stakeA: { gold: 0, cosmetics: [] }, stakeB: { gold: 0, cosmetics: [] }, potGold: 0, winner: '', log: [],
  upgA: { c7: { f: 0, s: 0, e: 0 } }, relicsA: {}, upgB: {}, relicsB: {}
};
window.__UPDATED.length = 0;
window.openArenaMatch('m3');
await window.playArenaCard('c7');
const veil = window.__UPDATED[window.__UPDATED.length - 1].data;
assert.equal(veil.shieldA.mag, 8, `escudo mágico (veio ${veil.shieldA.mag})`);
assert.equal(veil.wardA?.pct, 0.25, 'barreira 25%');
assert.equal(veil.wardA?.charges, 2, 'barreira 2 cargas');
console.log('✓ motor: Defesa Mágica concede escudo + barreira');

// ---------- 7) Dano de Ar: dano direto ignora escudos + atordoa ----------
window.__MATCH = {
  playerA: 'tester', playerAName: 'Você', playerAAvatar: '', playerB: 'foe', playerBName: 'Rival', playerBAvatar: '',
  starter: 'A', status: 'active', turn: 'A', turnNumber: 1,
  hpA: 60, hpB: 60, shieldA: { phys: 0, mag: 0 }, shieldB: { phys: 99, mag: 99 },
  deckA: [], handA: [mkSnap('c8')], deckB: [mkSnap('c2')], handB: [], // rival tem deck: se atordoado, não compra
  fieldA: [], fieldB: [], treeA: {}, catCountA: { dano_ar: 1 }, treeB: {}, catCountB: {},
  stakeA: { gold: 0, cosmetics: [] }, stakeB: { gold: 0, cosmetics: [] }, potGold: 0, winner: '', log: [],
  upgA: {}, relicsA: {}, upgB: {}, relicsB: {}
};
window.__UPDATED.length = 0;
window.openArenaMatch('m4');
await window.playArenaCard('c8');
const wind = window.__UPDATED[window.__UPDATED.length - 1].data;
assert.equal(wind.hpB, 55, `ar ignora escudos: 60-5=55 (veio ${wind.hpB})`);
assert.equal(wind.shieldB.phys, 99, 'escudo físico intacto (ignorado pelo ar)');
assert.equal(wind.handB.length, 0, 'rival atordoado não comprou (deck vazio na start? tinha 1 carta)');
assert.equal(wind.deckB.length, 1, 'a carta do rival continua no deck dele');
console.log('✓ motor: Dano de Ar ignora escudos e atordoa (sem compra)');

// ---------- 8) Teto de campo: frente cheia rejeita invocação ----------
window.__MATCH = {
  playerA: 'tester', playerAName: 'Você', playerAAvatar: '', playerB: 'foe', playerBName: 'Rival', playerBAvatar: '',
  starter: 'A', status: 'active', turn: 'A', turnNumber: 1,
  hpA: 60, hpB: 60, shieldA: { phys: 0, mag: 0 }, shieldB: { phys: 0, mag: 0 },
  deckA: [], handA: [mkSnap('c5')], deckB: [], handB: [],
  fieldA: [
    { kind: 'summon', uid: 's1', name: 'A', category: 'invocacao', power: 1, turnsLeft: 3 },
    { kind: 'summon', uid: 's2', name: 'B', category: 'invocacao', power: 1, turnsLeft: 3 },
    { kind: 'summon', uid: 's3', name: 'C', category: 'invocacao', power: 1, turnsLeft: 3 }
  ], fieldB: [], treeA: {}, catCountA: { invocacao: 3 }, treeB: {}, catCountB: {},
  stakeA: { gold: 0, cosmetics: [] }, stakeB: { gold: 0, cosmetics: [] }, potGold: 0, winner: '', log: [],
  upgA: {}, relicsA: {}, upgB: {}, relicsB: {}
};
const before8 = window.__UPDATED.length;
window.openArenaMatch('m5');
await window.playArenaCard('c5');
assert.equal(window.__UPDATED.length, before8, 'nenhuma jogada gravada com a frente cheia');
assert.ok(($('#toast-container')?.textContent || '').includes('Frente cheia'), `toast de teto apareceu (veio: ${$('#toast-container')?.textContent})`);
console.log('✓ motor: teto da frente impede a 4ª criatura');

assert.deepEqual(errors, [], 'nenhum erro de JS no window durante o probe');
console.log('\n🎉 PROBE 9 PASSOU — árvore por carta, relíquias e novos efeitos funcionando');
process.exit(0);
