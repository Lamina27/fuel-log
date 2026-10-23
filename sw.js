/* Fuel Log offline: service worker.
   - Halaman (index.html): jaringan dulu (maks 4 dtk) supaya versi baru langsung terpakai saat online;
     tanpa sinyal pakai salinan tersimpan.
   - Ikon & manifest: simpanan dulu.
   - Google Fonts: dipakai dari simpanan bila ada, diperbarui di belakang layar. Tanpa font, memakai font sistem.
   Catatan pengguna TIDAK disimpan di sini — ada di localStorage browser. */
const VERSION = 'fab40d03e1';
const APP = 'fuel-log-app-' + VERSION;
const FONTS = 'fuel-log-fonts';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(APP).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('fuel-log-app-') && k !== APP).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    ev.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    ev.respondWith((async () => {
      const c = await caches.open(APP);
      try {
        const r = await timeout(fetch(req, { cache: 'no-store' }), 4000);
        if (r && r.ok) c.put('./index.html', r.clone());
        return r;
      } catch (e) {
        return (await c.match('./index.html')) || (await c.match('./')) || Response.error();
      }
    })());
    return;
  }
  ev.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r && r.ok) caches.open(APP).then(c => c.put(req, r.clone()));
    return r;
  })));
});
