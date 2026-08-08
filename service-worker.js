const CACHE_NAME = "riverwatch-v1.0-pwa-cab041";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/data.js",
  "./js/marketEngine.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/riverwatch-192.png",
  "./icons/riverwatch-512.png",
  "./icons/riverwatch-maskable-512.png",
  "./icons/riverwatch-icon.svg",
  "./icons/koru-mark.svg",
  "./icons/voyage-health.svg",
  "./icons/river-health.svg",
  "./icons/boat-health.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response && response.status === 200 && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
