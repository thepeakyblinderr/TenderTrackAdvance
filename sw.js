// TenderTrack + EMDTrack Service Worker
// Sync: GitHub Gist (fetch API) — no Apps Script needed
const CACHE = 'tt-emd-v3';
const SHELL = [
  './tendertrack.html',
  './emd.html',
  './manifest.json',
  './emd-manifest.json',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;600&display=swap'
];

// Install — cache app shell
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){
      return cache.addAll(SHELL.map(function(url){
        return new Request(url, {cache: 'reload'});
      })).catch(function(){
        // Non-critical — fonts may fail in dev
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — cache-first for app shell, network-only for sync (script.google.com)
self.addEventListener('fetch', function(e){
  const url = e.request.url;

  // Always go network for Google Apps Script sync calls
  if(url.includes('script.google.com')){
    return; // let it fall through to network
  }

  // Cache-first for everything else (HTML, fonts, etc.)
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(response){
        // Cache successful GET responses for app shell files
        if(e.request.method === 'GET' && response.status === 200){
          const clone = response.clone();
          caches.open(CACHE).then(function(cache){
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function(){
        // Offline fallback — return cached index if navigating
        if(e.request.mode === 'navigate'){
          return caches.match('./tendertrack.html');
        }
      });
    })
  );
});
