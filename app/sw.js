/* Service worker: lets the Sahel app open instantly and work offline */
const CACHE = 'sahel-app-v3';
const CORE = [
  "home.html",
  "booking.html",
  "games.html",
  "profile.html",
  "manifest.webmanifest",
  "../assets/css/base.css?v=3",
  "../assets/js/dc-lite.js?v=3",
  "../assets/js/img-manifest.js?v=3",
  "../assets/js/app-install.js?v=3",
  "../assets/js/morphdom.min.js",
  "../assets/fonts/vazirmatn-var.woff2",
  "../assets/icons/icon-192.png",
  "../assets/icons/apple-touch-icon.png"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('home.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
