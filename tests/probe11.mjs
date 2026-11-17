/* Probe 11 (v5.1.0): Mesa de Trabalho da Arena — relíquias e núcleos forjáveis.
   Cobre: núcleos (core_evo/core_primus) no catálogo e como saídas exclusivas,
   forja de relíquias pela grade 3x3, dicas escondidas na Mesa (Segredos da Arena),
   e a Evolução pagando com Núcleo OU gold. */
import { readFileSync } from 'fs';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(`${root}/index.html`, 'utf8');
const js = readFileSync(`${root}/js/app.js`, 'utf8');
const css = readFileSync(`${root}/css/style.css`, 'utf8');

/* ---------- 1) Catálogo ---------- */
global.window = {};
eval(readFileSync(`${root}/js/economy-data.js`, 'utf8'));
const E = window.GV_ECO;
assert.ok(E.ARENA_MATERIALS && E.ARENA_MATERIALS.length === 2, 'ARENA_MATERIALS exporta 2 núcleos');
for (const id of ['core_evo', 'core_primus']) {
  assert.ok(E.MATERIAL_BY_ID[id], `${id} está no catálogo de materiais`);
  assert.ok(E.ALL_MATERIALS.some((m) => m.id === id), `${id} entra no Baú/inventário`);
  assert.ok(E.MATERIAL_BY_ID[id].hint, `${id} tem dica de formato`);
}
assert.ok(E.ARENA_RELICS.every((r) => r.hint), 'todas as 4 relíquias têm dica de formato');
console.log('✓ catálogo: núcleos e dicas de relíquia presentes');

/* ---------- 2) Receitas novas: existem e não são sombreadas ---------- */
const NEW = ['r_core_evo', 'r_core_primus', 'r_relic_escama', 'r_relic_orbe', 'r_relic_sifao', 'r_relic_eco'];
for (const id of NEW) assert.ok(E.RECIPES.find((r) => r.id === id), `receita ${id} existe`);

function matchCraftRecipe(grid) {
  for (const r of E.RECIPES) {
    if (!r.shape || !r.key) continue;
    const rows = r.shape.length, cols = Math.max(...r.shape.map((row) => row.length));
    for (let dy = 0; dy <= 3 - rows; dy++) {
      for (let dx = 0; dx <= 3 - cols; dx++) {
        const expected = new Array(9).fill(null);
        for (let ry = 0; ry < rows; ry++) {
          for (let cx = 0; cx < cols; cx++) {
            const ch = r.shape[ry][cx] || '.';
            if (ch !== '.') expected[(dy + ry) * 3 + (dx + cx)] = r.key[ch] || null;
          }
        }
        let ok = true;
        for (let i = 0; i < 9; i++) { if ((grid[i] || null) !== expected[i]) { ok = false; break; } }
        if (ok) return r;
      }
    }
  }
  return null;
}
for (const id of NEW) {
  const r = E.RECIPES.find((x) => x.id === id);
  const rows = r.shape.length, cols = Math.max(...r.shape.map((row) => row.length));
  for (let dy = 0; dy <= 3 - rows; dy++) for (let dx = 0; dx <= 3 - cols; dx++) {
    const grid = new Array(9).fill(null);
    for (let ry = 0; ry < rows; ry++) for (let cx = 0; cx < cols; cx++) grid[(dy + ry) * 3 + dx + cx] = r.key[r.shape[ry][cx]];
    assert.strictEqual(matchCraftRecipe(grid)?.id, id, `${id} casa em qualquer translação sem sombra`);
  }
}
console.log('✓ receitas novas: casam em qualquer posição da grade 3x3');

/* ---------- 3) Toda receita resolve para um output conhecido ---------- */
const RESOLVABLE = (id) => E.MATERIAL_BY_ID[id] || E.ARTIFACT_BY_ID[id] || E.ARENA_RELIC_BY_ID[id];
for (const r of E.RECIPES) assert.ok(RESOLVABLE(r.out), `receita ${r.id} resolve o output ${r.out}`);
assert.ok(E.ARENA_RELIC_BY_ID?.relic_escama, 'relíquias são outputs válidos de forja');
console.log(`✓ ${E.RECIPES.length} receitas resolvem para outputs conhecidos`);

/* ---------- 4) Forja de relíquia consome e não duplica ---------- */
const craftNow = js.match(/async function craftNow[\s\S]*?\n\}/);
assert.ok(craftNow, 'craftNow encontrado');
assert.ok(craftNow[0].includes('ARENA_RELIC_BY_ID'), 'craftNow trata relíquias forjáveis');
assert.ok(craftNow[0].includes('arenaRelics'), 'craftNow grava a relíquia na economia');
assert.ok(craftNow[0].includes('Você já tem a'), 'craftNow bloqueia forja duplicada');
console.log('✓ craftNow: forja de relíquia cobre consumo, save e anti-duplicata');

/* ---------- 5) Evolução: Núcleo ou gold ---------- */
const buyEvo = js.match(/async function buyArenaEvolution[\s\S]*?\n\}/);
assert.ok(buyEvo, 'buyArenaEvolution encontrado');
assert.ok(buyEvo[0].includes('ARENA_CORE_IDS'), 'compra de evolução considera o Núcleo');
assert.ok(buyEvo[0].includes('hasCore'), 'compra de evolução paga com o Núcleo quando há um');
assert.ok(js.includes('ARENA_CORE_IDS = { 1: \'core_evo\', 2: \'core_primus\' }'), 'mapa Núcleo por patamar');
console.log('✓ evolução: paga com Núcleo do Baú ou com gold');

/* ---------- 6) UI: modal e Mesa de Trabalho ---------- */
for (const id of ['ctm-cores', 'ctm-workbench-btn', 'arena-craft-secrets']) {
  assert.ok(html.includes(`id="${id}"`), `index.html tem #${id}`);
}
assert.ok(html.includes('Segredos da Arena'), 'Mesa de Trabalho lista os segredos');
assert.ok(css.includes('.card-tree-cores') && css.includes('.ctm-workbench-btn'), 'estilo da árvore e do atalho');
assert.ok(js.includes("$('#ctm-cores')") || js.includes('#ctm-cores'), 'renderCardTreeModal pinta o contador de núcleos');
assert.ok(js.includes('data-card-id') || js.includes('card-tree'), 'árvore da carta referenciada');
console.log('✓ UI: modal mostra núcleos, atalho pra Mesa e lista de segredos');

console.log('\nPROBE 11 — PASS ✦ forja de relíquias e núcleos de evolução');
