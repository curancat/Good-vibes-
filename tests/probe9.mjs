/* Probe 9 (v4.9.0): Arena 2.0 — Evolução por traço.
   Cobre: relíquias na Loja, modal Evolução (caminho único por carta, T1/T2),
   motor por traço (perfuração, combustão, enxame, transbordar, muralha/monólito,
   benção residência), Residências no campo, resquícios e teto de campo. */
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
for (const id of ['arena-relic-grid', 'arena-card-tree-modal', 'ctm-branches', 'ctm-relics', 'am-status-opponent', 'am-status-me', 'am-front-count-me', 'am-back-count-me', 'am-board-opponent', 'am-structures-opponent']) {
  assert.ok(html.includes(`id="${id}"`), `index.html tem #${id}`);
}
assert.ok(html.includes('Evolução da carta'), 'modal renomeado para Evolução da carta');
assert.ok(jsFile.includes('ARENA_EVO_T1'), 'custos de evolução presentes');
assert.ok(jsFile.includes('detonateFinal'), 'Corrupção Necrótica implementada');
assert.ok(!jsFile.includes('ARENA_UPG_MAX'), 'árvore genérica antiga removida');
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
  { id: 'c10', ownerId: 'tester', name: 'Benção da Chapada', emoji: '💚', artUrl: '', category: 'cura', cost: 2, power: 2, flavor: '', createdAt: { toMillis: () => 10 } },
  { id: 'c12', ownerId: 'tester', name: 'Abraço da Terra', emoji: '🪨', artUrl: '', category: 'dano_terra', cost: 3, power: 2, flavor: '', createdAt: { toMillis: () => 5 } },
];
const ECO_DATA = {
  gold: 5000, inv: {}, buildings: {}, cosmetics: [], creditScore: 50,
  stamina: 100, staminaAt: Date.now(), gatherCd: {}, jobCd: {},
  arenaDeck: ['c1', 'c4', 'c7', 'c8', 'c5', 'c9', 'c10', 'c12'], arenaTree: {},
  arenaEvo: { c1: { branch: 'estocada', t1: true, t2: true } },
  arenaRelics: [], arenaRelicEquips: {}
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
window.confirm = () => true; // compromisso de caminho de evolução confirmado
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
$('[data-arena-tab="battle"]').click();
await new Promise((r) => setTimeout(r, 200));
window.eval('renderCardCosmeticShop()');
await new Promise((r) => setTimeout(r, 150));
assert.equal($$('#arena-relic-grid .cosmetic-card').length, 4, 'Loja mostra 4 relíquias');
console.log('✓ Loja: relíquias renderizadas');

// ---------- 2) Modal Evolução: carta com caminho selado (c1 Estocada T2) ----------
$('[data-arena-tab="cards"]').click();
await new Promise((r) => setTimeout(r, 250));
$('[data-arena-card-upgrade="c1"]').click();
await new Promise((r) => setTimeout(r, 250));
assert.ok($('#arena-card-tree-modal').classList.contains('active'), 'modal abriu');
assert.ok($('#ctm-face').innerHTML.includes('Lâmina'), 'carta no modal');
assert.ok($('#ctm-gold').textContent.includes('5.000'), `gold exibido (veio: ${$('#ctm-gold').textContent})`);
const sum1 = $('#ctm-summary').textContent;
assert.ok(sum1.includes('Estocada') && sum1.includes('2/2'), `resumo mostra caminho e patamar (veio: ${sum1})`);
const buyButtons = $$('#ctm-branches .ctm-buy');
assert.equal(buyButtons.length, 6, '3 caminhos × 2 patamares');
const lockedBtns = $$('#ctm-branches .evo-branch.is-locked');
assert.equal(lockedBtns.length, 2, 'dois caminhos selados (Amputar e Execução)');
console.log('✓ modal: evolução mostra caminho selado, patamar 2/2');

// ---------- 3) Relíquia: comprar e equipar (Escama de Aço) ----------
window.eval('buyArenaRelic("relic_escama")');
await new Promise((r) => setTimeout(r, 200));
assert.ok($('#ctm-gold').textContent.replace(/\D/g, '') === '4400', `modal mostra 4.400 gold (veio: ${$('#ctm-gold').textContent})`);
window.eval('toggleArenaRelicEquip("c1", "relic_escama")');
await new Promise((r) => setTimeout(r, 200));
assert.ok($('#ctm-relics .ctm-relic.equipped'), 'relíquia marcada como equipada no modal');
console.log('✓ relíquia comprada e equipada na carta');

// ---------- 4) Evoluir carta nova (c8 Vendaval T1 por 500) ----------
$('[data-arena-card-upgrade="c8"]').click();
await new Promise((r) => setTimeout(r, 250));
const vendavalBtn = $$('#ctm-branches [data-arena-evo="vendaval"][data-tier="1"]')[0];
assert.ok(vendavalBtn && !vendavalBtn.disabled, 'Vendaval T1 disponível');
vendavalBtn.click();
await new Promise((r) => setTimeout(r, 250));
assert.equal($('#ctm-gold').textContent.replace(/\D/g, ''), '3900', `gold debitado (veio: ${$('#ctm-gold').textContent})`);
const sum8 = $('#ctm-summary').textContent;
assert.ok(sum8.includes('Vendaval') && sum8.includes('1/2'), `resumo atualizou (veio: ${sum8})`);
const stillLocked = $$('#ctm-branches .evo-branch.is-locked');
assert.equal(stillLocked.length, 2, 'os outros 2 caminhos ficaram selados');
console.log('✓ evoluir: traçar caminho Vendaval T1 funciona e sela os demais');

// ---------- 5) Motor: Físico Estocada T2 (perfura escudo + fere criaturas) ----------
const mkSnap = (id) => CARDS.find((c) => c.id === id);
const baseMatch = () => ({
  playerA: 'tester', playerAName: 'Você', playerAAvatar: '',
  playerB: 'foe', playerBName: 'Rival', playerBAvatar: '',
  starter: 'A', status: 'active', turn: 'A', turnNumber: 1,
  hpA: 60, hpB: 60, shieldA: { phys: 0, mag: 0 }, shieldB: { phys: 0, mag: 0 },
  deckA: [], handA: [], deckB: [], handB: [],
  fieldA: [], fieldB: [],
  treeA: {}, catCountA: {}, treeB: {}, catCountB: {},
  stakeA: { gold: 0, cosmetics: [] }, stakeB: { gold: 0, cosmetics: [] },
  potGold: 0, winner: '', log: [],
  upgA: {}, relicsA: {}, upgB: {}, relicsB: {}
});
window.__MATCH = {
  ...baseMatch(),
  handA: [mkSnap('c1')],
  shieldB: { phys: 99, mag: 0 },
  fieldB: [{ kind: 'summon', uid: 'foe1', name: 'T-Rex', category: 'invocacao', power: 3, hp: 6, turnsLeft: 3 }],
  upgA: { c1: { branch: 'estocada', t1: true, t2: true } }, relicsA: { c1: 'relic_escama' }
};
window.__UPDATED.length = 0;
window.openArenaMatch('m1');
await window.playArenaCard('c1');
const hit = window.__UPDATED[window.__UPDATED.length - 1].data;
// eff = 3; base = round(9)+2 = 11; pierce → hpB = 60-11 = 49; criatura hp 6-4 = 2
// perfuração ignora o escudo; e o Sangramento (2/turno) já tica no turno do rival: 60-11-2 = 47
assert.equal(hit.hpB, 47, `perfuração: vida direto (veio ${hit.hpB})`);
assert.equal(hit.dotB?.dmg, 2, 'sangramento aplicado no rival');
assert.equal(hit.dotB?.turns, 1, 'sangramento gastou 1 turno no início do turno do rival');
assert.equal(hit.shieldB.phys, 99, 'escudo físico intacto');
const foeRex = (hit.fieldB || []).find((u) => u.uid === 'foe1');
assert.ok(foeRex && foeRex.hp === 2, `Lâmina Arrancadora feriu criatura 6→2 (veio ${JSON.stringify(foeRex)})`);
assert.equal(hit.shieldA.phys, 0, 'Escama de Aço: +4, mas a criatura do rival absorveu (6 → 4 no escudo, 2 na vida)');
assert.equal(hit.hpA, 58, 'o Golpe do T-Rex do rival: 2 de vida perfuraram após o escudo');
assert.equal(hit.turn, 'B', 'vez do rival depois da jogada');
const resquicio = (hit.fieldA || []).find((u) => u.kind === 'resquicio');
assert.ok(resquicio, 'rajada física deixou um resquício visível no campo');
assert.equal(resquicio.turnsLeft, 2, 'resquício dura 2 turnos');
console.log('✓ motor: Estocada T2 fura escudo, fere criaturas e deixa resquício');

// ---------- 6) Residência: Monólito (dano de terra) fica no campo e dobra muralha ----------
window.__MATCH = {
  ...baseMatch(),
  handA: [mkSnap('c12')],
  upgA: { c12: { branch: 'monolito', t1: true, t2: true } }
};
window.__UPDATED.length = 0;
window.openArenaMatch('m6');
await window.playArenaCard('c12');
const terra = window.__UPDATED[window.__UPDATED.length - 1].data;
const res = (terra.fieldA || []).find((u) => u.kind === 'residence' && u.trait === 'dano_terra');
assert.ok(res, 'residência de terra no campo do jogador');
assert.equal(res.aura, 4, 'Aura Sísmica: +4 de dano em golpes de terra');
assert.equal(terra.shieldA.phys, 4, 'Núcleo de Granito: muralha +2 → 4');
assert.equal(terra.hpB, 52, `terra atingiu a vida (veio ${terra.hpB})`);
console.log('✓ motor: Terra com Monólito deposita residência e parede física');

// ---------- 7) Benção: Purificação (cura total + limpeza) vira residência ----------
window.__MATCH = {
  ...baseMatch(),
  hpA: 30,
  dotA: { dmg: 3, turns: 2, type: 'bleed' },
  handA: [mkSnap('c10')],
  upgA: { c10: { branch: 'purificacao', t1: true, t2: true } }
};
window.__UPDATED.length = 0;
window.openArenaMatch('m7');
await window.playArenaCard('c10');
const heal = window.__UPDATED[window.__UPDATED.length - 1].data;
assert.equal(heal.hpA, 60, `Santidade: cura TOTAL (veio ${heal.hpA})`);
assert.equal(heal.dotA, null, 'Limpeza removeu o sangramento');
assert.ok((heal.fieldA || []).some((u) => u.kind === 'residence' && u.trait === 'cura'), 'residência de cura no campo');
console.log('✓ motor: Bênção Purificação zera ferida e deixa aura');

// ---------- 8) Dano de Ar: Vendaval T2 (dobra contra alvo já atordoado) ----------
window.__MATCH = {
  ...baseMatch(),
  handA: [mkSnap('c8')],
  deckB: [mkSnap('c2')],
  skipDrawB: { turns: 1 },
  upgA: { c8: { branch: 'vendaval', t1: true, t2: true } }
};
window.__UPDATED.length = 0;
window.openArenaMatch('m8');
await window.playArenaCard('c8');
const wind = window.__UPDATED[window.__UPDATED.length - 1].data;
// eff=1; base = round(3)+2 = 5; ×2 (ímpto) = 10 → hpB = 50
assert.equal(wind.hpB, 50, `Ímpeto: dano dobrado contra atordoado (veio ${wind.hpB})`);
assert.equal(wind.skipDrawB?.turns, 1, 'Turbilhão: 2 turnos aplicados; o turno do rival decai 2→1 (sem comprar neste turno)');
assert.equal(wind.deckB.length, 1, 'rival atordoado não comprou');
console.log('✓ motor: Vendaval T2 pune alvo atordoado e impede compra');

// ---------- 9) Dano de Água: Maré Baixa T1+T2 (fissura + transbordar) ----------
window.__MATCH = {
  ...baseMatch(),
  handA: [mkSnap('c3')],
  shieldB: { phys: 0, mag: 0 },
  fieldB: [{ kind: 'summon', uid: 'foe2', name: 'Cascudo', category: 'invocacao', power: 1, hp: 4, turnsLeft: 3 }],
  upgA: { c3: { branch: 'marebaxa', t1: true, t2: true } }
};
window.__UPDATED.length = 0;
window.openArenaMatch('m9');
await window.playArenaCard('c3');
const water = window.__UPDATED[window.__UPDATED.length - 1].data;
// eff=4; base = round(12)+2 = 14; fissura 7 pierce → hpB: 60-7(dealMag 7)-7(fissura) = 46
assert.equal(water.hpB, 46, `Fissura ignora metade do dano (veio ${water.hpB})`);
assert.ok(!(water.fieldB || []).some((u) => u.uid === 'foe2'), 'Transbordar destruiu a criatura de 4 de vida');
console.log('✓ motor: Maré Baixa fendeu e afogou a frente inimiga');

// ---------- 10) Defesa: Bastião Fortaleza T1+T2 (espinhos duradouros refletem mágico) ----------
window.__MATCH = {
  ...baseMatch(),
  handA: [mkSnap('c4')],
  upgA: { c4: { branch: 'fortaleza', t1: true, t2: true } }
};
window.__UPDATED.length = 0;
window.openArenaMatch('m10');
await window.playArenaCard('c4');
const wall = window.__UPDATED[window.__UPDATED.length - 1].data;
assert.equal(wall.shieldA.phys, 8, `escudo físico (veio ${wall.shieldA.phys})`); // base=round(2*3)+2=8, eff=2
assert.equal(wall.thornsA?.turns, 3, 'Espinhos Duradouros: 3 turnos');
assert.equal(wall.thornsA?.reflectiveMagic, true, 'Espinhos Totais: refletem dano mágico');
assert.ok((wall.fieldA || []).some((u) => u.kind === 'residence' && u.trait === 'defesa'), 'residência de espinhos no campo');
console.log('✓ motor: Bastião Fortaleza T1+T2 erguido');

// ---------- 11) Engine direto: resquício decai no início do turno do dono ----------
window.__MATCH = {
  ...baseMatch(),
  turn: 'A',
  handA: [], fieldA: [
    { kind: 'resquicio', uid: 'rq1', name: 'Lâmina do Ribeirão', trait: 'dano', turnsLeft: 2 },
    { kind: 'summon', uid: 's1', name: 'Dragão', power: 2, hp: 6, turnsLeft: 3 }
  ],
  fieldB: []
};
const eng = window.eval('arenaStartOfTurnPatch(window.__MATCH, "A")');
const resquicionext = eng.patch.fieldA.find((u) => u.kind === 'resquicio');
assert.ok(resquicionext && resquicionext.turnsLeft === 1, `resquício 2→1 (veio ${resquicionext && resquicionext.turnsLeft})`);
const drag = eng.patch.fieldA.find((u) => u.uid === 's1');
assert.ok(drag && drag.turnsLeft === 2, 'criatura consumiu 1 de 3 turnos');
console.log('✓ engine: resquícios e criaturas decaem no início do turno');

// ---------- 12) Teto de campo: frente cheia rejeita invocação ----------
window.__MATCH = {
  ...baseMatch(),
  handA: [mkSnap('c5')],
  fieldA: [
    { kind: 'summon', uid: 's1', name: 'A', category: 'invocacao', power: 1, hp: 3, turnsLeft: 3 },
    { kind: 'summon', uid: 's2', name: 'B', category: 'invocacao', power: 1, hp: 3, turnsLeft: 3 },
    { kind: 'summon', uid: 's3', name: 'C', category: 'invocacao', power: 1, hp: 3, turnsLeft: 3 }
  ],
  catCountA: { invocacao: 3 }
};
const before12 = window.__UPDATED.length;
window.openArenaMatch('m12');
await window.playArenaCard('c5');
assert.equal(window.__UPDATED.length, before12, 'nenhuma jogada gravada com a frente cheia');
assert.ok(($('#toast-container')?.textContent || '').includes('Frente cheia'), `toast de teto apareceu (veio: ${$('#toast-container')?.textContent})`);
console.log('✓ motor: teto da frente impede a 4ª criatura');

assert.deepEqual(errors, [], 'nenhum erro de JS no window durante o probe');
console.log('\n🎉 PROBE 9 PASSOU — Arena 2.0: evolução por traço, residências e resquícios funcionando');
process.exit(0);
