/* Good Vibes 🌊 — Service Worker v4.8.0
   Estratégia:
   - App shell (mesma origem): network-first com fallback offline para o cache
   - Navegação: network-first (bypass do HTTP cache) com fallback offline
   - CDNs (firebase, crypto-js, fonts): stale-while-revalidate
   - Firestore/Giphy/APIs dinâmicas e version.json: SEMPRE rede (nunca cacheia)
   - Atualizações: o worker novo ESPERA a escolha do usuário (botão "Atualizar")
     em vez de assumir o controle silenciosamente
*/
const CACHE_VERSION = 'good-vibes-v4.8.0';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/economy-data.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png',
  './icons/favicon-32.png'
];

const CDN_HOSTS = [
  'cdnjs.cloudflare.com',
  'www.gstatic.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// Nunca cachear chamadas dinâmicas (dados do usuário) nem a checagem de versão
const NEVER_CACHE = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'api.giphy.com',
  'api.imgbb.com',
  'api.cloudinary.com'
];

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  // IMPORTANTE: buscar com cache:'no-store' — o GitHub Pages serve com
  // max-age=600 e cache.addAll() poderia "pré-cachear" assets antigos do
  // HTTP cache, fazendo o botão Atualizar parecer não funcionar.
  await Promise.all(SHELL_ASSETS.map(async (asset) => {
    const response = await fetch(asset, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Precache falhou para ${asset}: ${response.status}`);
    await cache.put(asset, response);
  }));
}

self.addEventListener('install', (event) => {
  // Sem skipWaiting automático: quando JÁ EXISTE uma versão rodando, o worker
  // novo fica "waiting" e o app avisa o usuário (botão Atualizar).
  // Na PRIMEIRA instalação não há controller ativo, então ele ativa na hora só.
  event.waitUntil(precacheShell());
});

// O app pede para ativar a versão nova (quando o usuário toca em "Atualizar")
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Dados dinâmicos: sempre rede
  if (NEVER_CACHE.some((host) => url.hostname.includes(host))) return;

  // version.json: SEMPRE rede (é assim que o app sabe que há atualização)
  if (url.pathname.endsWith('version.json')) return;

  // Navegação: network-first, fallback para o shell offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // CDNs conhecidos: stale-while-revalidate
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Mesma origem: network-first (o shell muda a cada release) com
  // fallback para o cache quando offline
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request, { cache: 'no-store' });
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        } catch {
          const cached = await caches.match(request);
          return cached || caches.match('./index.html');
        }
      })()
    );
  }
});
