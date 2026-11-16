/* Probe 8 (task 21): Arena ⚔️ — convites diretos por nick + correções de regras.
   Confere: (1) sem query proibida por 'winner'; (2) UI de convite no HTML;
   (3) criar convite débita escrow e grava invitedTo; (4) convite recebido renderiza e aceita/recusa;
   (5) convite recusado devolve a aposta do anfitrião. */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(`${root}/index.html`, 'utf8');
const jsFile = readFileSync(`${root}/js/app.js`, 'utf8');
const rules = readFileSync(`${root}/firestore.rules`, 'utf8');

// ---------- 0) Checagens estáticas ----------
assert.ok(!jsFile.includes("where('winner'"), 'nenhuma query por winner no cliente (proibido pelas regras)');
assert.ok(jsFile.includes('fetchMyArenaMatchDocs'), 'helper compartilhado de "minhas partidas" existe');
for (const id of ['arena-invite-nick', 'arena-invite-btn', 'arena-resume-match-btn', 'arena-invites-head', 'arena-invite-list']) {
  assert.ok(html.includes(`id="${id}"`), `index.html tem #${id}`);
}
assert.ok(rules.includes("resource.data.invitedTo == request.auth.uid"), 'regras permitem read do convite pro convidado');
assert.ok(rules.includes('declineIsValid'), 'regras têm declineIsValid');
assert.ok(rules.includes('markRefundedIsValid'), 'regras têm markRefundedIsValid');
console.log('✓ estático: HTML, regras e ausência de query por winner ok');

const CARDS = [
  { id: 'c1', ownerId: 'tester', name: 'Lâmina do Ribeirão', emoji: '🗡️', artUrl: '', category: 'dano', cost: 3, power: 3, flavor: 'Corte seco.', createdAt: { toMillis: () => 60 } },
  { id: 'c2', ownerId: 'tester', name: 'Seta de Fogo', emoji: '🔥', artUrl: '', category: 'dano_fogo', cost: 2, power: 2, flavor: '', createdAt: { toMillis: () => 50 } },
  { id: 'c3', ownerId: 'tester', name: 'Chuva de Água', emoji: '💧', artUrl: '', category: 'dano_agua', cost: 4, power: 4, flavor: '', createdAt: { toMillis: () => 40 } },
  { id: 'c4', ownerId: 'tester', name: 'Muralha', emoji: '🛡️', artUrl: '', category: 'defesa', cost: 1, power: 2, flavor: '', createdAt: { toMillis: () => 30 } },
  { id: 'c5', ownerId: 'tester', name: 'Dragão da Chapada', emoji: '🐲', artUrl: '', category: 'invocacao', cost: 5, power: 5, flavor: '', createdAt: { toMillis: () => 20 } },
  { id: 'c6', ownerId: 'tester', name: 'Erva do Pântano', emoji: '💚', artUrl: '', category: 'cura', cost: 2, power: 1, flavor: '', createdAt: { toMillis: () => 10 } },
];
// Estado compartilhado com o código avaliado dentro do JSDOM (precisa viver em window)
const USERS = [
  { id: 'tester', data: () => ({ name: 'Tester Chefe', avatarUrl: '' }) },
  { id: 'rival-uid', data: () => ({ name: 'Rival da Ilha', avatarUrl: '' }) },
];
const ECO_DATA = {
  gold: 500, inv: {}, buildings: {}, cosmetics: ['cos9'], creditScore: 50,
  stamina: 100, staminaAt: Date.now(), gatherCd: {}, jobCd: {},
  arenaDeck: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'], arenaTree: {}
};
const written = [];
const updated = [];
let MATCH_DOCS = [];

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
const collection = (db, name) => ({ __collection: name });
const addDoc = async () => ({ id: 'nova' });
const CARDS_DATA = ${JSON.stringify(CARDS)};
const CARD_DOCS = CARDS_DATA.map(c => ({ id: c.id, data: () => ({ ...c }), ref: { id: c.id } }));
const where = (field, op, value) => ({ __where: [field, op, value] });
const limit = (n) => ({ __limit: n });
const orderBy = () => ({});
const query = (col, ...rest) => ({ ...col, __wheres: rest.filter(r => r.__where).map(r => r.__where) });
const matchesWhere = (data, w) => { const [f, op, v] = w; if (op !== '==') return true; return data?.[f] === v; };
const getDocs = async (q) => {
  const col = q?.__collection;
  const docs = col === 'cards' ? CARD_DOCS
    : col === 'users' ? window.__USERS
    : (window.__MATCH_DOCS.map(m => ({ id: m.id, data: () => ({ ...m }), ref: { id: m.id } })));
  let out = docs;
  if (q?.__wheres) {
    for (const w of q.__wheres) out = out.filter(d => matchesWhere(d.data ? d.data() : d, w));
  }
  return { empty: out.length === 0, docs: out, forEach(fn) { out.forEach(fn); }, size: out.length };
};
const getDoc = async () => ({ exists: () => true, data: () => window.__ECO });
const doc = (db, name, id) => ({ __doc: id ?? 'auto-id' });
const setDoc = async () => {};
const onSnapshot = (q, ok) => { return () => {}; };
const serverTimestamp = () => ({ toMillis: () => Date.now() });
const updateDoc = async () => {};
const increment = (n) => n;
const deleteDoc = async () => {};
const runTransaction = async (db, fn) => {
  const tx = {
    get: async (ref) => {
      // ref {__doc}: match refere a um MATCH_DOCS; senão devolve a carteira
      const id = ref?.__doc;
      const m = window.__MATCH_DOCS.find((x) => x.id === id);
      if (m) return { data: () => ({ ...m }), exists: () => true };
      window.__ECO.gold = window.__ECO.gold ?? 500;
      return { data: () => ({ gold: window.__ECO.gold, cosmetics: [...window.__ECO.cosmetics], inv: {} }), exists: () => true };
    },
    set: (ref, data, opts) => { window.__WRITTEN.push({ ref, data, opts }); if (data && typeof data.gold === 'number' && window.__ECO) window.__ECO.gold = data.gold; },
    update: (ref, data) => { window.__UPDATED.push({ ref, data }); }
  };
  return fn(tx);
};`);

const dom = new JSDOM(html, { url: 'https://good-vibes.example/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
const errors = [];
window.addEventListener('error', (e) => errors.push(e.message));
window.CryptoJS = { AES: { encrypt: (t) => `enc(${t})`, decrypt: () => ({ toString: () => 'texto decifrado' }) }, enc: { Utf8: 'utf8' } };
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = () => {};
Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', { get() { return 100; } });
window.__USERS = USERS;
window.__ECO = ECO_DATA;
window.__MATCH_DOCS = MATCH_DOCS;
window.__WRITTEN = written;
window.__UPDATED = updated;
window.eval(readFileSync(`${root}/js/economy-data.js`, 'utf8'));
window.eval(js);
console.log('✓ app.js executou sem lançar exceção');
await new Promise((r) => setTimeout(r, 300));
const $ = (s) => window.document.querySelector(s);
const $$ = (s) => [...window.document.querySelectorAll(s)];
window.eval('globalThis.__authCb && globalThis.__authCb({ uid: "tester", email: "t@t.com", metadata: { creationTime: new Date().toISOString() } })');
await new Promise((r) => setTimeout(r, 400));
window.openApp('arena');
$('[data-arena-tab="battle"]').click();
await new Promise((r) => setTimeout(r, 250));

// ---------- 1) lobby inicial só com os CTAs ----------
assert.equal($('#arena-resume-match-btn').hidden, true, 'sem partida ativa: botão retornar escondido');
assert.equal($('#arena-invites-head').hidden, true, 'sem convites: cabeçalho escondido');
console.log('✓ lobby: estado inicial limpo');

// ---------- 2) convite por nick: abre modal já no modo "invite" ----------
$('#arena-invite-nick').value = 'rival da ilha';
$('#arena-invite-btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 400));
assert.ok(!$('#arena-bet-modal').classList.contains('hidden'), 'modal de aposta abriu');
assert.ok(($('#arena-bet-title').textContent || '').includes('Convite para Rival da Ilha'), `título do modal é convite (veio: ${$('#arena-bet-title').textContent})`);
console.log('✓ convite: nick encontrado e modal abriu em modo convite');

// ---------- 3) confirmar: transação debita escrow e grava invitedTo ----------
$('#arena-bet-gold').value = '50';
$('#arena-bet-confirm').click();
await new Promise((r) => setTimeout(r, 300));
const matchWrite = written.find((w) => w.data && w.data.status === 'invited');
assert.ok(matchWrite, 'documento invited criado');
assert.equal(matchWrite.data.invitedTo, 'rival-uid', 'invitedTo aponta pro convidado');
assert.equal(matchWrite.data.playerA, 'tester', 'criador é playerA');
assert.equal(matchWrite.data.status, 'invited', 'status invited');
assert.equal(matchWrite.data.stakeA.gold, 50, 'pote com 50 gold');
assert.equal(ECO_DATA.gold, 450, `escrow de 50 debitado da carteira (restou ${ECO_DATA.gold})`);
console.log('✓ convite: escrow debitado e documento invited gravado');

// ---------- 4) após criar, convite aparece em "meus pendentes" ----------
window.__MATCH_DOCS.push({ ...matchWrite.data, id: 'm-convite', createdAt: { toMillis: () => Date.now() } });
await window.refreshArenaBattlePane();
await new Promise((r) => setTimeout(r, 150));
const listHtml = $('#arena-challenge-list').innerHTML;
assert.ok(listHtml.includes('Convite para Rival da Ilha'), 'meu convite pendente aparece no mural como convite');
assert.ok(listHtml.includes('Aguardando resposta'), 'mostra estado de espera');
console.log('✓ convite enviado: aparece em "meus desafios" como pendente');

// ---------- 5) convite RECEBIDO: renderiza, aceita, recusa ----------
window.__MATCH_DOCS.push({ id: 'm-recebido', playerA: 'host-u', playerAName: 'Dona Ana', playerB: '', invitedTo: 'tester', status: 'invited', stakeA: { gold: 25, cosmetics: [] }, createdAt: { toMillis: () => Date.now() }, log: ['convite'] });
await window.refreshArenaBattlePane();
await new Promise((r) => setTimeout(r, 150));
assert.equal($('#arena-invites-head').hidden, false, 'cabeçalho de convites visível');
assert.ok($('#arena-invite-list').innerHTML.includes('Dona Ana te convidou'), 'linha de convite renderizada');
console.log('✓ convite recebido: lista e cabeçalho renderizados');

// aceitar → transação marca 'active' e playerB = tester
await window.acceptArenaChallengeFromBet('m-recebido', 10, []);
const acc = updated.find((u) => u.data?.status === 'active');
assert.ok(acc, 'aceitou: update com status active');
assert.equal(acc.data.playerB, 'tester', 'aceitante virou playerB');
assert.equal(acc.data.potGold, 35, 'pote = stakeA(25) + minha parte(10)');
console.log('✓ aceitar: partida vira active com playerB correto');

// recusar → transação marca 'cancelled'
window.gvConfirm = async () => true;
await window.declineArenaInvite('m-recebido');
const rej = updated.find((u) => u.data?.status === 'cancelled');
assert.ok(rej, 'recusa: update com status cancelled');
assert.equal(rej.data.declinedBy, 'tester', 'declinedBy registrado');
console.log('✓ recusar: convite cancelado com declinedBy');

// ---------- 6) anfitrião resgata a aposta retida de convite recusado ----------
window.__MATCH_DOCS.length = 0;
window.__MATCH_DOCS.push({ id: 'm-recusado', playerA: 'tester', playerAName: 'Tester Chefe', playerB: '', invitedTo: 'rival-uid', status: 'cancelled', declinedBy: 'rival-uid', stakeA: { gold: 75, cosmetics: ['cos9'] }, log: ['x'] });
const goldBefore = ECO_DATA.gold;
const refunded = await window.claimDeclinedArenaRefunds([{ ...window.__MATCH_DOCS[0] }], { silent: true });
assert.equal(refunded, 1, 'um convite recusado resgatado');
const refundSet = written.find((w) => w.data?.cosmetics?.includes('cos9') && w.data.gold === goldBefore + 75);
assert.ok(refundSet, `carteira creditada de volta com 75 gold (esperado ${goldBefore + 75}, recebido ${refundSet?.data?.gold})`);
const refundMark = updated.find((u) => u.data?.stakeA?.refunded === true);
assert.ok(refundMark, 'documento marcado como refunded');
console.log('✓ recusado: aposta do anfitrião devolvida uma única vez');

assert.deepEqual(errors, [], 'nenhum erro de JS no window durante o probe');
console.log('\n🎉 PROBE 8 PASSOU — convites diretos por nick funcionando');
process.exit(0);
