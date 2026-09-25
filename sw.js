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

const BUILD = {"version":"0d9aab3590bf","files":{"index.html":"23cda0c670855ab8","sentences.html":"65994f3ada6690b3","review.html":"009e02a9f6124599","manifest.webmanifest":"bc99ff0931472e82","src/app.js":"76b530da57b7bd49","src/auto-capture.js":"f7514c2523d0729b","src/confidence.js":"021c442670b3f11f","src/demo.js":"64cd68bad71bb7d1","src/device.js":"08cea7a4d78dae0a","src/encoder.js":"16b1dd2008679ed2","src/features.js":"0f321df9730d3ad0","src/figure.js":"3abcef4a60a17311","src/grammar-words.js":"7e6e7c12f214c7f5","src/grammar.js":"609acc43dcd2c404","src/hand-topology.js":"942f509ef48aa1b2","src/holistic.js":"b49755abd68b2b8b","src/interpret.js":"5391910ecc06f4e8","src/keypoints.js":"7ae889af3130a65e","src/letters.js":"5f89cae06fad432c","src/motion-letters.js":"a167c3f19645da2d","src/personal.js":"9345b270d90feb80","src/reference.js":"f468130c8cedc8a4","src/replay-data.js":"bb838a523d24697d","src/segment.js":"74996262d641cc8f","src/sentence-practice.js":"0dc5ad66f25ad0a4","src/sentence-view.js":"8d119e036a4240b1","src/sentence.css":"4e79a59c353c8860","src/styles.css":"42115db0475184bf","src/vision.js":"c50781f7ec54847b","src/watch.js":"a77267c62e3022a1","assets/art/board.html":"1fd6c861b1e73b37","assets/art/icons.svg":"6cae42f0a45dcfbd","assets/art/koppies.svg":"0d7a1c072c79b702","assets/art/paper.css":"2aadd7084eeb3b7d","assets/art/protea-king.svg":"d9209e43e84ffe5b","assets/art/protea-pincushion.svg":"ab63f3b714f37c25","assets/art/sprig.svg":"298ebf3bd00133e0","assets/art/table-mountain.svg":"7abf9daab0c66864","assets/brand/card.png":"3c5f1b27fd1971a5","assets/brand/card.svg":"602b1455020314cd","assets/brand/icon-180.png":"abb1455d83581875","assets/brand/icon-192.png":"edadbfa201c41691","assets/brand/icon-512.png":"f4f423f5bd8b6716","assets/brand/icon.svg":"8fde0b5a1faecf9c","assets/hands/A.svg":"8fc549e9f38f300c","assets/hands/B.svg":"b54847c64e4d6443","assets/hands/C.svg":"3ed113adb4694a09","assets/hands/D.svg":"6e6d6c9b0383735b","assets/hands/E.svg":"382cfba9849498c4","assets/hands/F.svg":"62c41c3644d0b555","assets/hands/G.svg":"0ae914172158269c","assets/hands/H.svg":"910520d6f3c59840","assets/hands/hands.json":"240b7745e6a821e2","assets/hands/I.svg":"5bd6935189619136","assets/hands/ink/A.svg":"df77a46b65be7b30","assets/hands/ink/B.svg":"1928679e1e6102c5","assets/hands/ink/C.svg":"e05518370f8991ce","assets/hands/ink/D.svg":"a358599455780211","assets/hands/ink/E.svg":"91d5145ea3165856","assets/hands/ink/F.svg":"383aeaffb5034e10","assets/hands/ink/G.svg":"774a86c92016cbcc","assets/hands/ink/H.svg":"b1a7e3a846ee978f","assets/hands/ink/I.svg":"25a63e2db25d27c7","assets/hands/ink/J.svg":"c6c37f6415df2db3","assets/hands/ink/K.svg":"f40e06157be259bc","assets/hands/ink/L.svg":"f6e0d45862daf323","assets/hands/ink/M.svg":"159c07a224de2bdc","assets/hands/ink/N.svg":"2cc8dc1a83bb25dc","assets/hands/ink/O.svg":"ff60ec989541e66d","assets/hands/ink/P.svg":"4bf0727b39e9136c","assets/hands/ink/Q.svg":"79c904ac9e4b2c52","assets/hands/ink/R.svg":"5178e02e4d574e15","assets/hands/ink/S.svg":"0c1e233defb8c6bc","assets/hands/ink/T.svg":"01c2a336747e3fb2","assets/hands/ink/U.svg":"8f3b24db55d71be4","assets/hands/ink/V.svg":"1e1ce277c0b84e7d","assets/hands/ink/W.svg":"ae82dffe77ac0096","assets/hands/ink/X.svg":"e5fe4310deab7df0","assets/hands/ink/Y.svg":"2fc4c2b63d353158","assets/hands/ink/Z.svg":"cfbcf50f7b8fd584","assets/hands/K.svg":"13dc93a78f2b4f9a","assets/hands/L.svg":"d6ec178140caf8b3","assets/hands/M.svg":"b9a4d63eb7698af5","assets/hands/N.svg":"192a4e122f83bb0d","assets/hands/O.svg":"9e3090ade8e57c4b","assets/hands/P.svg":"7a8484259dc0a371","assets/hands/Q.svg":"fbc728b05085a0ad","assets/hands/R.svg":"404486e01ac80a56","assets/hands/S.svg":"a61dab55b6cc746f","assets/hands/sheet.html":"a9896fbc2d66ffc0","assets/hands/T.svg":"e64dab84843a2b08","assets/hands/U.svg":"aa50d581f4d5135d","assets/hands/V.svg":"dd500592213c0780","assets/hands/W.svg":"07754734741423af","assets/hands/X.svg":"aedac7d22baf3b1d","assets/hands/Y.svg":"2b804345c1a3963a","data/signs.json":"1fbed3f4f46044d9","data/signs.bin":"31dac7dd8617a7b1","data/signclip.bin":"493701928fc6da1a","data/signclip-mirror.bin":"a02c4b994ff3bd1f","data/signclip-asl3.bin":"ce4023f39ab26006","data/signclip-asl3-mirror.bin":"09c0c7798cb78182","data/replay.json":"66dbed89df5d5d11","data/replay/000.bin":"74c27528d61025ae","data/replay/001.bin":"3caae3331a0b93d5","data/replay/002.bin":"9218bd30d7d66464","data/replay/003.bin":"cdf14dfc07dfe2c5","data/replay/004.bin":"012af520f38eea2d","data/replay/005.bin":"a610137f3a13374d","data/replay/006.bin":"f5cc748139e58d2f","data/letter-model.json":"3c740a1b040a6815","data/lessons.json":"458a8544a143c51b","data/clip-review.json":"02f1673310b7311c","data/clip-audit.json":"62415179fc6432ae","models/onnx/wlasl_slgcn.onnx":"93d27fbe17fd6944","models/onnx/lsa64_slgcn.onnx":"8a0dc5930ee81032","models/onnx/gsl_slgcn.onnx":"205b5f5f48c62812","models/onnx/signclip.onnx":"2e69e8f0aa9933e7","models/onnx/signclip-asl3.onnx":"9c30d3e2d53a5ab0"}};

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
    // Keep HTML and code on the same deployed version. The browser still checks
    // sw.js for updates on navigation; the new worker fills a new SHELL before
    // it activates, and the next navigation uses that complete build.
    else event.respondWith(shellFirst(request, request.mode === 'navigate'));
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

async function shellFirst(request, navigate) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(request, { ignoreSearch: navigate });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.status === 200) cache.put(request, response.clone()).catch(() => {});
  return response;
}

async function cacheFirst(request, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone()).catch(() => {});
  return response;
}
