const CACHE_NAME = "riverwatch-v1.1-pwa-mobile-header-config-20260823";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/data.js",
  "./js/marketEngine.js",
  "./js/mobile-header-config.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/riverwatch-192.png",
  "./icons/riverwatch-512.png",
  "./icons/riverwatch-maskable-512.png",
  "./icons/riverwatch-icon.svg",
  "./icons/koru-mark.svg",
  "./icons/intro-sailing-scene.png",
  "./icons/header-seagulls.png",
  "icons/header-compass.png",
  "icons/intro-seagulls.png",
  "icons/intro-wave-front.png",
  "icons/intro-boat-koru.png",
  "icons/intro-wave-rear.png",
  "./icons/header-rear-wave.png",
  "./icons/header-boat.png",
  "./icons/header-front-wave.png",
  "./icons/voyage-health.svg",
  "./icons/river-health.svg",
  "./icons/boat-health.svg",
  "./assets/scene-header/rear-waves/Rear_Wave_Common.png",
  "./assets/scene-header/boats/Boat_tailwind_1254_1254_Cyan.png",
  "./assets/scene-header/boats/Boat_calm_1254_1254_Cyan.png",
  "./assets/scene-header/boats/Boat_headwind_1254_1254_Cyan.png",
  "./assets/scene-header/boats/Boat_rough_1254_1254_Cyan.png",
  "./assets/scene-header/boats/Boat_storm_1254_1254_Cyan.png",
  "./assets/scene-header/front-waves/Front_Wave_Tailwind.png",
  "./assets/scene-header/front-waves/Front_Wave_Calm.png",
  "./assets/scene-header/front-waves/Front_Wave_Headwind.png",
  "./assets/scene-header/front-waves/Front_Wave_Rough.png",
  "./assets/scene-header/front-waves/Front_Wave_Storm.png",
  "./assets/scene-header/trends/Trend_DarkCloud.png",
  "./assets/scene-header/trends/Trend_Rain.png",
  "./assets/scene-header/trends/Trend_Lightning.png",
  "./assets/scene-header/trends/Trend_Cloud.png",
  "./assets/scene-header/trends/Trend_Birds.png"
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
