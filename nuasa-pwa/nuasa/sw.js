/* NUASA Library service worker. Bump VERSION to force clients to refresh cached files. */
const VERSION = "v3";
const SHELL = "nuasa-shell-" + VERSION;
const ASSETS = "nuasa-assets-" + VERSION;
const PRECACHE = ["/", "/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("nuasa-") && k !== SHELL && k !== ASSETS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;

  // Pages: network first so students always get the latest site, cached copy when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put("/", copy));
        return res;
      }).catch(() => caches.match("/").then(r => r || caches.match("/offline.html")))
    );
    return;
  }

  // Google Fonts and same-origin static files: stale-while-revalidate.
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  const isStatic = url.origin === location.origin && /\.(png|jpe?g|svg|webp|ico|css|js|woff2?|webmanifest)$/i.test(url.pathname);
  if (isFont || isStatic) {
    e.respondWith(
      caches.open(ASSETS).then(cache =>
        cache.match(req).then(hit => {
          const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") cache.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
  }
  // Everything else (Supabase, payments, uploads, embeds) always goes straight to the network.
});
