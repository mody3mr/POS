const CACHE_NAME = 'pos-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './app.js'
];

// الخطوة الأولى: تثبيت الملفات في الذاكرة المحلية
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('تم تخزين الملفات بنجاح للعمل أوفلاين');
        return cache.addAll(urlsToCache);
      })
  );
});

// الخطوة الثانية: استدعاء الملفات من الذاكرة لو مفيش إنترنت
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // لو الملف موجود في الذاكرة، هاته منها.. لو لأ، هاته من النت
        return response || fetch(event.request);
      })
  );
});
