const CACHE = 'bareclock-v20';
const DIRECTORY_CACHE = 'clock-citydata-2026-09-04';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './time.js', './appearance.js', './color-picker.js', './cities.js', './city-directory.js', './city-worker.js', './about/', './assets/world-map.svg', './about/about.css', './icon.svg', './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/apple-touch-icon.png', './manifest.webmanifest', './assets/fonts/la-belle-aurore-latin.woff2'];
const DIRECTORY_PATHS = new Set(['./data/cities.json.gz', './data/cities.json'].map(path => new URL(path, self.location).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => (((key.startsWith('quiet-clock-') || key.startsWith('bareclock-')) && key !== CACHE) || (key.startsWith('clock-citydata-') && key !== DIRECTORY_CACHE))).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  // Keep the HTML and modules from one release together. A new service worker
  // installs the next release atomically, activates, and claims open tabs.
  event.respondWith(caches.open(DIRECTORY_PATHS.has(event.request.url) ? DIRECTORY_CACHE : CACHE).then(async cache => {
    const path = new URL(event.request.url).pathname;
    const clockPage = path === new URL('./', self.location).pathname || path === new URL('./index.html', self.location).pathname;
    const cached = await cache.match(event.request.mode === 'navigate' && clockPage ? './index.html' : event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && DIRECTORY_PATHS.has(event.request.url)) {
      // Fetch the large directory only when the picker needs it. Keep that copy
      // for subsequent offline searches without delaying the clock's first load.
      await cache.put(event.request, response.clone()).catch(() => {});
    }
    return response;
  }));
});
