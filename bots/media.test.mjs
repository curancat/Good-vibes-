import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapText, escapeDrawtext, drawtextFilters, buildVideoCommand, buildImageCommand } from './media.mjs';
import { pickQuote, QUOTES, PALETTES } from './quotes.mjs';

test('wrapText quebra em linhas de no máximo 26 chars sem perder palavras', () => {
    const text = 'respira fundo: hoje tem sol dentro de você ☀️';
    const lines = wrapText(text, 26);
    for (const line of lines) assert.ok(line.length <= 26, `linha longa demais: "${line}"`);
    assert.equal(lines.join(' '), text);
});

test('wrapText de string curta devolve uma linha só', () => {
    assert.deepEqual(wrapText('bom dia'), ['bom dia']);
});

test('escapeDrawtext protege : \\ \' %', () => {
    const out = escapeDrawtext("a:b'c\\d%e");
    assert.equal(out, "a\\:b\\'c\\\\d%%e");
});

test('drawtextFilters gera uma drawtext por linha + marca d\'água', () => {
    const filter = drawtextFilters({ lines: ['l1', 'l2', 'l3'], watermark: 'Good Vibes 🤖' });
    assert.equal((filter.match(/drawtext=/g) || []).length, 4);
});

test('comandos de imagem e vídeo incluem fallback de cor sólida', () => {
    const pick = pickQuote(0);
    const img = buildImageCommand(pick, 'wm', '/tmp/out.png');
    const vid = buildVideoCommand(pick, 'wm', '/tmp/out.mp4');
    assert.ok(img.primary.some(a => a.includes('gradients')));
    assert.ok(img.fallback.some(a => a.startsWith('color=')));
    assert.ok(vid.primary.some(a => a.includes('libx264')));
    assert.ok(vid.fallback.some(a => a.startsWith('color=')));
});

test('pickQuote é determinístico e rotaciona', () => {
    assert.equal(pickQuote(0).quote, QUOTES[0]);
    assert.equal(pickQuote(QUOTES.length).quote, QUOTES[0]); // wraparound
    assert.equal(pickQuote(1).quote, QUOTES[1]);
    assert.equal(pickQuote(-1).quote, QUOTES[QUOTES.length - 1]);
});

test('nenhuma citação pede PIX e todas as paletas são hex', () => {
    for (const q of QUOTES) assert.ok(!/pix|super\s*like/i.test(q));
    for (const p of PALETTES) {
        assert.match(p.c0, /^0x[0-9a-f]{6}$/i);
        assert.match(p.c1, /^0x[0-9a-f]{6}$/i);
    }
});
