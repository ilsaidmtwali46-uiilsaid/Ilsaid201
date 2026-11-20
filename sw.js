const CACHE = 'grocery-v8-20261120'; // تم رفع الإصدار لإجبار التحديث
const CORE = [
  './', 'index.html', 'style.css', 'manifest.json',
  'icon-192.png', 'icon-512.png',
  'globals.js', 'db.js', 'license.js', 'setup.js', 'parties.js',
  'suppliers.js', 'customers.js', 'purchases.js', 'inventory.js',
  'stocktake.js', 'daily.js', 'gallery.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(CORE.map(f => c.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // Network-First للـ JS/CSS/HTML لضمان عدم تعليق الكاش القديم
  const isAsset = /\.(js|css|html)$/i.test(url.pathname) || url.pathname === '/' || url.pathname.endsWith('/');
  if (isAsset){
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then(hit => hit || caches.match('index.html')))
    );
    return;
  }

  // Cache-First للصور والأيقونات
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('index.html')))
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
