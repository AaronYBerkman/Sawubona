// Sawubona's offline cache.
//
// Three kinds of file, three rules:
//
//   the app itself    pages, code, drawings and the small data files. Stored
//                     when the worker installs, so the app opens with no
//                     connection; fetched network-first, so an update is seen
//                     at once.
//   heavy files       the sign models (models/onnx) and reference data
//                     (data/*.bin, data/replay/*.bin): 10-87 MB each, stored the
//                     first time they are used and never fetched again until
//                     their content changes. Each is kept under its content
//                     hash from the build, so a new model replaces the old one.
//   pinned runtimes   onnxruntime-web and MediaPipe from their CDNs, MediaPipe's
//                     models and the fonts: versioned URLs, stored on first use.
//
// scripts/build-pages.mjs replaces BUILD below with every published file's
// hash. In development (npm start) the worker is not registered.

const BUILD = { version: 'dev', files: {} };

const SHELL = `sawubona-shell-${BUILD.version}`;
const HEAVY = 'sawubona-heavy';
const RUNTIME = 'sawubona-runtime';
const isHeavy = (path) => /\.(onnx|bin)$/.test(path);
const RUNTIME_HOSTS = ['cdn.jsdelivr.net', 'storage.googleapis.com', 'fonts.gstatic.com', 'fonts.googleapis.com'];

const scope = new URL(self.registration.scope);
const pathOf = (url) => (url.origin === scope.origin && url.pathname.startsWith(scope.pathname)
  ? decodeURIComponent(url.pathname.slice(scope.pathname.length)) || 'index.html'
  : null);
const heavyKey = (path) => new URL(`${encodeURI(path)}?v=${BUILD.files[path]}`, scope).href;

self.addEventListener('install', (event) => {
  const shell = Object.keys(BUILD.files).filter((f) => !isHeavy(f) && f !== 'sw.js');
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // past the ten-minute HTTP cache, so a fresh deploy is not stored stale
    await cache.addAll(['./', ...shell].map((f) => new Request(new URL(f, scope), { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('sawubona-shell-') && name !== SHELL) await caches.delete(name);
    }
    // heavy files whose content has changed, or that were removed
    const current = new Set(Object.keys(BUILD.files).filter(isHeavy).map(heavyKey));
    const heavy = await caches.open(HEAVY);
    for (const request of await heavy.keys()) if (!current.has(request.url)) await heavy.delete(request);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  const path = pathOf(url);
  if (path !== null) {
    if (isHeavy(path) && BUILD.files[path]) event.respondWith(heavyFile(request, path));
    else event.respondWith(networkFirst(request, request.mode === 'navigate'));
    return;
  }
  if (RUNTIME_HOSTS.includes(url.hostname)) event.respondWith(cacheFirst(request, RUNTIME));
});

async function heavyFile(request, path) {
  const cache = await caches.open(HEAVY);
  const key = heavyKey(path);
  const hit = await cache.match(key);
  if (hit) return hit;
  const response = await fetch(request, { cache: 'no-cache' });
  if (response.status === 200) await cache.put(key, response.clone()).catch(() => {});   // full storage: just don't keep it
  return response;
}

async function networkFirst(request, navigate) {
  const cache = await caches.open(SHELL);
  try {
    const response = await fetch(request);
    if (response.status === 200) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (err) {
    const hit = await cache.match(request, { ignoreSearch: navigate }) ?? (navigate ? await cache.match(new URL('./', scope).href) : null);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(request, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone()).catch(() => {});
  return response;
}
