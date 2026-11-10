/* Leburić rokovi: čuva aplikaciju u telefonu da radi i bez interneta.
   Samu stranicu prvo traži sa interneta (do 3 sekunde), da nova verzija stigne odmah;
   ako nema signala ili je spor, otvara sačuvanu. */
const CACHE = 'leburic-v2';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;

  if (r.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then(c => {
      const izKesa = () => c.match(r, {ignoreSearch: true}).then(h => h || c.match('index.html'));
      const net = fetch(r.url, {cache: 'no-store'})
        .then(res => { if (res && res.ok) { c.put(r.url, res.clone()); return res; } return null; })
        .catch(() => null);
      e.waitUntil(net);
      const cekaj = new Promise(ok => setTimeout(() => ok(null), 3000));
      return Promise.race([net, cekaj]).then(res => res || izKesa()).then(res => res || net);
    }));
    return;
  }

  e.respondWith(caches.open(CACHE).then(c => c.match(r, {ignoreSearch: true}).then(hit => {
    const net = fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
    if (hit) { e.waitUntil(net); return hit; }
    return net;
  })));
});
