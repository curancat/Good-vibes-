/* ============================================================
   GOOD VIBES 🤖 — Robôs da casa
   Roda via GitHub Actions (cron) ou localmente.

   O que fazem: curtem, comentam e compartilham posts recentes
   para manter a casa animada. NUNCA pedem/recebem PIX, nunca
   interagem com conteúdo sensível (NSFW) e SEMPRE aparecem com 🤖.

   Setup (uma vez):
     1) gh secret set BOT_MASTER_KEY --body "uma-string-aleatoria-bem-grande"
     2) (opcional) gh variable set BOT_ENABLED --body "true"   # "false" pausa
     3) (opcional) gh variable set SITE_URL --body "https://seu-site.com/"
   ============================================================ */
import crypto from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, limit, getDocs, doc, setDoc, addDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { PERSONAS } from './personas.mjs';
import { planEngagement } from './engage.mjs';

const firebaseConfig = {
    apiKey: "AIzaSyBXrIshTVFOD30XPKku_Trk6VKbXv_7Gkg",
    authDomain: "good-vibes-8a13d.firebaseapp.com",
    databaseURL: "https://good-vibes-8a13d-default-rtdb.firebaseio.com",
    projectId: "good-vibes-8a13d",
    messagingSenderId: "310185051492",
    appId: "1:310185051492:web:c47435ce7842af9386e671"
};
/* Mesma chave usada pelo app para ler o chat — o share precisa ser cifrado como uma mensagem comum */
const SECRET_KEY = "B9-0.12p´-09p3en3rjec9";

const STATE_PATH = new URL('./bot-state.json', import.meta.url);
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
const MAX_LIKES = Number(process.env.MAX_LIKES || 12);
const MAX_COMMENTS = Number(process.env.MAX_COMMENTS || 5);
const MAX_SHARES = Number(process.env.MAX_SHARES || 2);
const SITE_URL = process.env.SITE_URL || 'https://curancat.github.io/Good-vibes-/';

if (process.env.BOT_ENABLED === 'false') {
    console.log('😴 Robôs pausados (BOT_ENABLED=false). Nada a fazer.');
    process.exit(0);
}
if (!process.env.BOT_MASTER_KEY) {
    console.error('❌ Falta o secret BOT_MASTER_KEY.');
    console.error('   Configure com:  gh secret set BOT_MASTER_KEY --body "uma-string-aleatoria-bem-grande"');
    process.exit(1);
}

const botPassword = (email) =>
    crypto.createHash('sha256').update(`${process.env.BOT_MASTER_KEY}:${email}`).digest('hex').slice(0, 28) + 'Gv!';

const loadState = () => {
    try { return existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, 'utf8')) : {}; }
    catch { return {}; }
};
const saveState = (state) => {
    if (!DRY_RUN) writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
};

async function botSession(persona, runId) {
    const email = `${persona.id}@bots.goodvibes.app`;
    const password = botPassword(email);
    const app = initializeApp(firebaseConfig, `${persona.id}-${runId}`);
    const auth = getAuth(app);
    let cred;
    try {
        cred = await createUserWithEmailAndPassword(auth, email, password);
        console.log(`🤖 Criado (primeira vez): ${persona.name} <${email}>`);
    } catch (err) {
        if (err.code !== 'auth/email-already-in-use') throw err;
        cred = await signInWithEmailAndPassword(auth, email, password);
    }
    const db = getFirestore(app);
    // Garante o perfil do bot (nome com 🤖 + flag isBot)
    try {
        await setDoc(doc(db, 'users', cred.user.uid), {
            name: persona.name,
            bio: persona.bio,
            isBot: true,
            blurNsfw: true
        }, { merge: true });
    } catch (err) {
        console.warn(`⚠️ Perfil de ${persona.name} não salvo:`, err?.message);
    }
    return { persona, app, db, uid: cred.user.uid };
}

async function main() {
    const runId = Date.now().toString(36);
    console.log(`🌊 Good Vibes Bots — run ${runId}${DRY_RUN ? ' (DRY RUN)' : ''}`);

    // 1) Sobe as sessões dos bots
    const sessions = [];
    for (const persona of PERSONAS) {
        try {
            sessions.push(await botSession(persona, runId));
        } catch (err) {
            console.error(`❌ ${persona.name} falhou:`, err?.message);
        }
    }
    if (!sessions.length) throw new Error('Nenhum bot conseguiu entrar.');

    // 2) Lê posts recentes (qualquer membro autenticado pode ler)
    const reader = sessions[0].db;
    const snap = await getDocs(query(collection(reader, 'posts'), orderBy('timestamp', 'desc'), limit(30)));
    const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log(`📰 ${posts.length} posts recentes encontrados.`);

    // 3) Planeja o engajamento
    const state = loadState();
    const { planned, nextState } = planEngagement({
        posts,
        bots: PERSONAS,
        state,
        now: Date.now(),
        limits: { maxLikes: MAX_LIKES, maxComments: MAX_COMMENTS, maxShares: MAX_SHARES }
    });
    console.log(`🎯 Planejado: ${planned.filter(p => p.type === 'like').length} likes, ${planned.filter(p => p.type === 'comment').length} comentários, ${planned.filter(p => p.type === 'share').length} shares`);

    if (DRY_RUN) {
        for (const action of planned) {
            console.log(`   [dry-run] ${action.bot.name} → ${action.type}${action.text ? ': "' + action.text + '"' : ''} (post ${action.post.id})`);
        }
        console.log('✅ Dry-run concluído. Nada foi escrito.');
        await Promise.all(sessions.map(s => deleteApp(s.app).catch(() => {})));
        return;
    }

    // 4) Executa
    const byId = Object.fromEntries(sessions.map(s => [s.persona.id, s]));
    for (const action of planned) {
        const session = byId[action.bot.id];
        if (!session) continue;
        try {
            if (action.type === 'like') {
                await updateDoc(doc(session.db, 'posts', action.post.id), { likes: increment(1) });
            } else if (action.type === 'comment') {
                await addDoc(collection(session.db, `posts/${action.post.id}/comments`), {
                    userId: session.uid,
                    authorName: action.bot.name,
                    authorAvatar: '',
                    text: action.text,
                    timestamp: serverTimestamp()
                });
            } else if (action.type === 'share') {
                await addDoc(collection(session.db, 'chats_global'), {
                    userId: session.uid,
                    authorName: action.bot.name,
                    authorAvatar: '',
                    text: CryptoJS.AES.encrypt(action.text, SECRET_KEY).toString(),
                    timestamp: serverTimestamp()
                });
            }
            console.log(`   ✓ ${action.bot.name} → ${action.type} (post ${action.post.id})`);
        } catch (err) {
            console.error(`   ✗ ${action.bot.name} → ${action.type} falhou:`, err?.message);
        }
    }

    saveState(nextState);
    await Promise.all(sessions.map(s => deleteApp(s.app).catch(() => {})));
    console.log('🌊 Run concluído. A casa está animada!');
}

main().catch((err) => {
    console.error('💥 Falha geral:', err);
    process.exit(1);
});
