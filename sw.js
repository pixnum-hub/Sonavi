// Sonavi service worker — caches the app shell so the UI (and the
// offline eSpeak NG engine) still loads without a network connection.
// Cloud engines (Indic Parler / MMS) still need internet at speak-time.
const CACHE_NAME = "sonavi-cache-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/favicon.ico"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; })
        .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Cache-first for same-origin app-shell files; network-first (no caching)
// for cross-origin requests like the free TTS model APIs and CDN scripts,
// since that audio/content shouldn't be served stale.
self.addEventListener("fetch", function(event){
  var req = event.request;
  if(req.method !== "GET" || new URL(req.url).origin !== self.location.origin){
    return; // let the browser handle it normally
  }
  event.respondWith(
    caches.match(req).then(function(cached){
      return cached || fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        return res;
      }).catch(function(){ return cached; });
    })
  );
});
