/* Probe 12 (v5.2.0): Livro do Artesão — o app das receitas.
   Cobre: app na grade/índice, progresso, classificação das 49 receitas
   em 4 seções, regra de revelação (só o que foi forjado) e seed/migração. */
import { readFileSync } from 'fs';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(`${root}/index.html`, 'utf8');
const js = readFileSync(`${root}/js/app.js`, 'utf8');
const css = readFileSync(`${root}/css/style.css`, 'utf8');

/* ---------- 1) App registrado no índice e na grade ---------- */
for (const id of ['app-recipes', 'recipes-book', 'recipes-progress-fill', 'recipes-progress-text', 'recipes-go-bench']) {
  assert.ok(html.includes(`id="${id}"`), `index.html tem #${id}`);
}
assert.ok(html.includes('data-app="recipes"'), 'seção do app marcada');
assert.ok(html.includes('📖 Livro do Artesão'), 'título do app');
assert.ok(js.includes("id: 'recipes', label: 'Livro do Artesão', icon: '📖', tile: 'tile-recipes'"), 'APPS registra o ícone na home');
assert.ok(js.includes("if (appId === 'recipes') renderRecipeBook();"), 'abrir o app renderiza o livro');
assert.ok(css.includes('.tile-recipes'), 'tile do ícone estilizado');
assert.ok(css.includes('.recipe-grid-mini'), 'grade mini das páginas catalogadas');
console.log('✓ app: registrado na home, abre o livro e tem visual próprio');

/* ---------- 2) As 49 receitas cabem exatamente numa das 4 seções ---------- */
global.window = {};
eval(readFileSync(`${root}/js/economy-data.js`, 'utf8'));
const E = window.GV_ECO;
const CORES = ['core_evo', 'core_primus'];
const relics = E.RECIPES.filter((r) => E.ARENA_RELIC_BY_ID?.[r.out]);
const cores = E.RECIPES.filter((r) => CORES.includes(r.out));
const artifacts = E.RECIPES.filter((r) => E.ARTIFACT_BY_ID?.[r.out]);
const refinery = E.RECIPES.filter((r) => !E.ARENA_RELIC_BY_ID?.[r.out] && !CORES.includes(r.out) && !E.ARTIFACT_BY_ID?.[r.out]);
assert.deepStrictEqual([relics.length, cores.length, artifacts.length, refinery.length], [4, 2, 7, 36], '4 relíquias + 2 núcleos + 7 artefatos + 36 refinaria');
assert.strictEqual(relics.length + cores.length + artifacts.length + refinery.length, E.RECIPES.length, 'nenhuma receita fica de fora');
console.log('✓ seções: 4 relíquias · 2 núcleos · 7 artefatos · 36 refinaria = 49');

/* ---------- 3) Regra de revelação existe e craftNow registra descoberta ---------- */
assert.ok(js.includes('function knownRecipeSet()'), 'conjunto de receitas catalogadas');
assert.ok(js.includes('function seedKnownRecipesFromState('), 'seed de migração única');
assert.ok(js.includes('function withDiscovery('), 'patch de descoberta reutilizável');
assert.ok(js.includes('withDiscovery({ inv, arenaRelics }, match.id)'), 'forjar relíquia cataloga');
assert.ok(js.includes('withDiscovery({ inv, artifacts }, match.id)'), 'forjar artefato cataloga');
assert.ok(js.includes('withDiscovery({ inv }, match.id)'), 'forjar refinaria cataloga');
const knownCount = (js.match(/knownRecipes/g) || []).length;
assert.ok(knownCount >= 8, `knownRecipes referenciado em todo o fluxo (${knownCount}x)`);
console.log('✓ revelação: só quem forja abre a página');

/* ---------- 4) Migração única + persistência no documento do usuário ---------- */
assert.ok(js.includes("if (!Array.isArray(data.knownRecipes) && ECO?.RECIPES)"), 'seed roda só uma vez (campo ausente)');
assert.ok(js.includes('knownRecipes: seeded'), 'seed é persistido no users/{uid}');
assert.ok(js.includes("knownRecipes: Array.isArray(d.knownRecipes)"), 'normalizeEconomy carrega o campo');
console.log('✓ migração: única, persistida no Firestore, sem mudar regras');

/* ---------- 5) Livro renderiza 4 seções e barra de progresso ---------- */
assert.ok(js.includes('renderRecipeBook'), 'renderizador presente');
for (const section of ['Relíquias da Arena', 'Núcleos de Evolução', 'Artefatos do Refúgio', 'Refinaria & Bancada']) {
  assert.ok(js.includes(section), `seção "${section}" existe`);
}
assert.ok(js.includes("recipes-progress-fill"), 'barra de progresso ligada');
assert.ok(js.includes('🔒 não catalogada') && js.includes('✓ catalogada'), 'dois estados de página');
assert.ok(js.includes('recipeGridMiniHTML'), 'grade 3x3 mini desenhada na página aberta');
console.log('✓ render: 4 seções, progresso e estados de página');

console.log('\nPROBE 12 — PASS 📖 o livro das receitas forjáveis');
