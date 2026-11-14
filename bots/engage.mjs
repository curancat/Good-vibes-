/* Motor de decisão dos robôs da casa — funções puras (testáveis offline).
   Determinístico: a mesma (postId, botId) sempre gera a mesma decisão,
   então o mesmo run nunca curte/comenta duas vezes a mesma coisa. */
export function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < String(str).length; i++) {
        h ^= String(str).charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const MAX_POST_AGE_MS = 7 * 24 * 60 * 60 * 1000; // só posts dos últimos 7 dias

export function botEligible(post, now = Date.now()) {
    if (!post || !post.id) return false;
    if (post.isNsfw) return false;                      // bots nunca interagem com sensível
    const ts = post.timestamp?.toMillis ? post.timestamp.toMillis() : Number(post.timestamp) || now;
    if (now - ts > MAX_POST_AGE_MS) return false;        // post velho demais
    if (post.userId && String(post.userId).startsWith('bot:')) return false; // não interagir com bots
    return true;
}

export function pickPhrase(bot, rng) {
    const list = Array.isArray(bot.phrases) && bot.phrases.length ? bot.phrases : ['✨'];
    return list[Math.floor(rng() * list.length)];
}

export function shareText(post, siteUrl) {
    const url = `${siteUrl.replace(/\/?$/, '/')}?post=${post.id}`;
    const variations = [
        `ó lá o que o(a) ${post.authorName || 'alguém'} postou 🌊 ${url}`,
        `esse post merece mais atenção: ${url} 👀`,
        `olha isso aqui e me diz que não merece um like 💜 ${url}`,
        `passando pra deixar esse post visível: ${url} ☀️`
    ];
    const rng = mulberry32(hashString('share:' + post.id));
    return variations[Math.floor(rng() * variations.length)];
}

/**
 * Planeja o engajamento de TODOS os bots nos posts fornecidos, respeitando:
 *  - estado anterior (não repete like/comentário/share por bot e por post)
 *  - limites por execução (evita spam)
 * Retorna { planned: [{type, bot, post, text?}], nextState }
 */
export function planEngagement({ posts, bots, state = {}, now = Date.now(), limits = {} }) {
    const maxLikes = limits.maxLikes ?? 12;
    const maxComments = limits.maxComments ?? 5;
    const maxShares = limits.maxShares ?? 2;

    const nextState = JSON.parse(JSON.stringify(state || {}));
    const planned = [];
    let likes = 0, comments = 0, shares = 0;

    for (const post of posts) {
        if (!botEligible(post, now)) continue;
        nextState[post.id] ||= {};
        const s = nextState[post.id];

        for (const bot of bots) {
            const rng = mulberry32(hashString(`${post.id}:${bot.id}`));

            // LIKE
            s.liked ||= {};
            if (likes < maxLikes && !s.liked[bot.id] && rng() < bot.likeRate) {
                planned.push({ type: 'like', bot, post });
                s.liked[bot.id] = true;
                likes++;
            }

            // COMENTÁRIO (sempre aprovação gentil, nunca PIX/sensível)
            s.commented ||= {};
            if (comments < maxComments && !s.commented[bot.id] && bot.phrases?.length && rng() < bot.commentRate) {
                planned.push({ type: 'comment', bot, post, text: pickPhrase(bot, rng) });
                s.commented[bot.id] = true;
                comments++;
            }
        }

        // SHARE: no máximo 1 por post, no canal global
        if (shares < maxShares && !s.shared && botEligible(post, now)) {
            const sharer = bots[Math.floor(mulberry32(hashString('sharer:' + post.id))() * bots.length)];
            const rng = mulberry32(hashString(`share:${post.id}:${sharer.id}`));
            if (rng() < sharer.shareRate) {
                planned.push({ type: 'share', bot: sharer, post, text: shareText(post, process.env.SITE_URL || 'https://curancat.github.io/Good-vibes-/') });
                s.shared = true;
                shares++;
            }
        }
    }

    // Manutenção: mantém o estado pequeno (últimos 300 posts)
    const ids = Object.keys(nextState);
    if (ids.length > 300) {
        for (const id of ids.slice(0, ids.length - 300)) delete nextState[id];
    }

    return { planned, nextState };
}
