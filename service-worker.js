/* Nepomuk-Liga — service worker
   Caches the static app shell so the app opens instantly (and even
   offline) on a phone home screen. Firebase/Firestore/Google Fonts
   requests are cross-origin and deliberately left untouched here so
   live sync is never served from a stale cache. */

var CACHE_NAME = 'nepomuk-liga-v2';
var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache){ return cache.addAll(APP_SHELL); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  var url = new URL(req.url);

  // Only handle same-origin GET requests (the app shell). Everything
  // else — Firestore, the Firebase SDK, Google Fonts — goes straight
  // to the network untouched, so live data is never stale.
  if (url.origin !== self.location.origin || req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(function(cached){
      var network = fetch(req).then(function(resp){
        if (resp && resp.status === 200) {
          var copy = resp.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        }
        return resp;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
