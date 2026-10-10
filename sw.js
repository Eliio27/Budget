"use strict";
// Bei JEDEM Deploy erhöhen, sonst bekommen installierte Apps das Update nicht.
const CACHE_VERSION = "v1";
const CACHE = "budget-" + CACHE_VERSION;
const PREFIX = "budget-";

// Alle Pfade relativ zu sw.js → funktioniert auch in einem Unterordner (GitHub Pages).
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png"
];
const INDEX_URL = new URL("./index.html", self.registration.scope).href;
const NAV_TIMEOUT_MS = 4000;

self.addEventListener("install", event => {
  // Kein skipWaiting hier: die neue Version wartet, bis der Nutzer "neu laden" tippt.
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(ASSETS.map(url => new Request(url, { cache: "reload" })))
    )
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(networkFirstPage(req));
  } else {
    event.respondWith(cacheFirst(req));
  }
});

// HTML: Netz zuerst (damit Updates ankommen), bei Offline/Timeout aus dem Cache.
async function networkFirstPage(req) {
  const cache = await caches.open(CACHE);
  const cached = () =>
    cache.match(req, { ignoreSearch: true })
      .then(r => r || cache.match(INDEX_URL))
      .then(r => r || cache.match("./"));

  const network = fetch(req).then(res => {
    if (res && res.ok && res.type === "basic") cache.put(INDEX_URL, res.clone());
    return res;
  });
  network.catch(() => {}); // Fehler wird unten behandelt

  // Hängendes Netz ("Lie-Fi") nicht ewig abwarten, wenn eine Cache-Kopie existiert.
  const timeout = new Promise(resolve => setTimeout(resolve, NAV_TIMEOUT_MS));
  try {
    const res = await Promise.race([network, timeout.then(() => undefined)]);
    if (res) return res;
    return (await cached()) || (await network);
  } catch (e) {
    const r = await cached();
    if (r) return r;
    return new Response(
      "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
      "<body style='background:#171009;color:#f3ece0;font-family:system-ui,sans-serif;text-align:center;padding:60px 20px'>" +
      "Offline – die App wurde auf diesem Gerät noch nicht geladen.<br>Bitte einmal mit Internet öffnen.</body>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

// App-Dateien: Cache zuerst, sonst Netz (und für später ablegen).
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
    return res;
  } catch (e) {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}
