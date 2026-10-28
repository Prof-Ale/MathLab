/* MathLab: service worker.
   Guarda o aplicativo no aparelho para funcionar sem internet.
   - index.html: tenta a rede primeiro (2,5 s) e cai no cache. Assim, publicar um index.html novo
     chega sozinho na próxima visita com internet, sem mexer neste arquivo.
   - Ícones e manifesto: cache primeiro.
   - GeoGebra (3D) e ADA ficam fora do cache: precisam de internet e o app já avisa.
   Mude VERSAO só quando alterar ESTE arquivo ou a lista SHELL. Isso mostra o aviso "nova versão". */
const VERSAO = 'mathlab-2026-10-28-1';
const CRITICOS = ['./', 'index.html', 'manifest.webmanifest'];
const EXTRAS = ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'arena.html', 'arena.js'];
// Arena: arquivos que também tentam a rede primeiro, para atualizar sem mexer neste arquivo.
const REDE_PRIMEIRO = ['arena.js', 'arena.html'];
const IMAGENS_EXTERNAS = ['lh3.googleusercontent.com', 'api.dicebear.com'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSAO);
    await c.addAll(CRITICOS);                         // sem isto não há offline: falha a instalação
    await Promise.all(EXTRAS.map(u => c.add(u).catch(() => {})));  // ícones: se faltar um, segue
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('mathlab-') && k !== VERSAO) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'pular') self.skipWaiting(); });

function comTimeout(req, ms) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), ms);
    fetch(req).then(r => { clearTimeout(t); res(r); }, err => { clearTimeout(t); rej(err); });
  });
}

function chaveDe(url) {
  const f = new URL(url).pathname.split('/').pop();
  return REDE_PRIMEIRO.includes(f) ? f : 'index.html';
}

async function navegar(req) {
  const c = await caches.open(VERSAO);
  const chave = chaveDe(req.url);
  try {
    const r = await comTimeout(req, 2500);
    if (r && r.ok && r.type === 'basic') c.put(chave, r.clone());
    return r;
  } catch (_) {
    return (await c.match(chave)) || (await c.match('index.html')) || (await c.match('./')) || Response.error();
  }
}

async function redePrimeiro(req) {
  const c = await caches.open(VERSAO);
  const chave = chaveDe(req.url);
  try {
    const r = await comTimeout(req, 2500);
    if (r && r.ok && r.type === 'basic') c.put(chave, r.clone());
    return r;
  } catch (_) {
    return (await c.match(chave)) || Response.error();
  }
}

async function cachePrimeiro(req) {
  const c = await caches.open(VERSAO);
  const hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r && r.ok && r.type === 'basic') c.put(req, r.clone());
  return r;
}

async function imagemExterna(req) {
  const c = await caches.open(VERSAO);
  const hit = await c.match(req);
  const rede = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await rede) || Response.error();
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') e.respondWith(navegar(req));
    else if (REDE_PRIMEIRO.includes(url.pathname.split('/').pop())) e.respondWith(redePrimeiro(req));
    else e.respondWith(cachePrimeiro(req).catch(() => Response.error()));
    return;
  }
  if (req.destination === 'image' && IMAGENS_EXTERNAS.includes(url.hostname)) e.respondWith(imagemExterna(req));
});
