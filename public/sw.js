/* --- sw.js --- */
const CACHE_NAME = 'balconista-v4';
const ASSETS = [
  '/logo-tecvancel.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalação do Service Worker — assume controle imediato, sem esperar
// as abas antigas fecharem (evita ficar preso numa versão velha do app).
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      caches.keys().then((keyList) =>
        Promise.all(keyList.map((key) => (key !== CACHE_NAME ? caches.delete(key) : undefined)))
      ),
      self.clients.claim(),
    ])
  );
});

// Network-first: nunca serve HTML/JS/CSS antigo do cache enquanto o
// usuário está online — só cai pro cache se a rede falhar (offline de
// verdade). Cache-first aqui já causou tela quebrada depois de deploy
// (index.html velho pedindo um chunk .js que não existe mais).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
