/* Service worker: lets the Sahel app open instantly and work offline */
const CACHE = 'sahel-app-v1';
const CORE = [
  "home.html",
  "booking.html",
  "games.html",
  "profile.html",
  "manifest.webmanifest",
  "../assets/css/base.css",
  "../assets/js/dc-lite.js",
  "../assets/js/morphdom.min.js",
  "../assets/fonts/vazirmatn-var.woff2",
  "../assets/icons/icon-192.png",
  "../assets/icons/icon-512.png",
  "../assets/img/fac-beach.webp",
  "../assets/img/fac-cafe.webp",
  "../assets/img/fac-lockers.webp",
  "../assets/img/fac-lounge.webp",
  "../assets/img/fac-yoga.webp",
  "../assets/img/sup-aerial-solo.webp",
  "../assets/img/sup-board-closeup.webp",
  "../assets/img/sup-group-aerial.webp",
  "../assets/img/sup-kid-lesson.webp",
  "../assets/img/sup-sunset-group.webp",
  "../assets/img/ten-clay-aerial.webp",
  "../assets/img/ten-coach.webp",
  "../assets/img/ten-racket-blue.webp",
  "../assets/img/woman-above.webp"
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
