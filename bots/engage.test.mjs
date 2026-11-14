import { test } from 'node:test';
import assert from 'node:assert/strict';
import { botEligible, planEngagement, hashString, mulberry32, pickPhrase } from './engage.mjs';
import { PERSONAS } from './personas.mjs';

const NOW = 1_800_000_000_000;
const mkPost = (over = {}) => ({ id: 'post1', userId: 'humano1', authorName: 'Ana', text: 'oi gente', isNsfw: false, timestamp: { toMillis: () => NOW - 3600_000 }, ...over });

test('hashString é estável', () => {
    assert.equal(hashString('abc'), hashString('abc'));
    assert.notEqual(hashString('abc'), hashString('abd'));
});

test('mulberry32 é determinístico', () => {
    const a = mulberry32(42), b = mulberry32(42);
    assert.equal(a(), b());
});

test('botEligible rejeita NSFW e posts velhos', () => {
    assert.equal(botEligible(mkPost({ isNsfw: true }), NOW), false);
    assert.equal(botEligible(mkPost({ timestamp: { toMillis: () => NOW - 8 * 24 * 3600_000 } }), NOW), false);
    assert.equal(botEligible(mkPost(), NOW), true);
});

test('planEngagement gera likes e respeita dedup do estado', () => {
    const posts = [mkPost()];
    const { planned, nextState } = planEngagement({ posts, bots: PERSONAS, state: {}, now: NOW, limits: { maxLikes: 20, maxComments: 10, maxShares: 2 } });
    assert.ok(planned.some(p => p.type === 'like'), 'deve planejar likes');
    // Rodar de novo com o estado salvo: não pode repetir like do mesmo bot
    const again = planEngagement({ posts, bots: PERSONAS, state: nextState, now: NOW, limits: { maxLikes: 20, maxComments: 10, maxShares: 2 } });
    const againLikes = again.planned.filter(p => p.type === 'like').length;
    assert.equal(againLikes, 0, 'segundo run não repete likes');
});

test('planEngagement respeita limites por execução', () => {
    const posts = Array.from({ length: 20 }, (_, i) => mkPost({ id: 'p' + i }));
    const { planned } = planEngagement({ posts, bots: PERSONAS, state: {}, now: NOW, limits: { maxLikes: 3, maxComments: 2, maxShares: 1 } });
    assert.ok(planned.filter(p => p.type === 'like').length <= 3);
    assert.ok(planned.filter(p => p.type === 'comment').length <= 2);
    assert.ok(planned.filter(p => p.type === 'share').length <= 1);
});

test('comentários vêm das frases da persona e nunca pedem PIX', () => {
    for (const bot of PERSONAS) {
        const text = pickPhrase(bot, mulberry32(hashString(bot.id)));
        assert.ok(bot.phrases.includes(text));
        assert.ok(!/pix|super\s*like|doaç|contribu/i.test(text), 'bot não pede dinheiro');
    }
});

test('toda persona leva 🤖 no nome (transparência)', () => {
    for (const bot of PERSONAS) assert.ok(bot.name.includes('🤖'), `${bot.name} sem 🤖`);
});

test('bots nunca interagem com posts de bots', () => {
    assert.equal(botEligible(mkPost({ userId: 'bot:lia' }), NOW), false);
});
