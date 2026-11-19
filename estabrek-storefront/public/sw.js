/*
 * The shop as an app (admin → الإعدادات → التطبيق; src/lib/pwa.ts). Registered by components/AppShell.tsx only while
 * the owner has the app switched on (and taken away when they switch it off).
 *
 * - Pages: fresh from the network first, so prices and stock are never old. A page the shopper saw is kept (not their
 *   own pages: account, bag, checkout, orders…); with no internet it opens from what was kept, else the store's
 *   "no internet" page (/<lang>/offline, kept when the worker starts, with its styles).
 * - The shop's own files: Next's built files (their names change with their content) from what was kept first; the
 *   pictures and fonts kept and refreshed behind. Never the API, never another site.
 *
 * - Notifications (header.app.push; part two): each one the API sends (encrypted for this phone, backend lib/push.ts)
 *   is shown with the app's icon and the store's small mark, in its own language and direction; a tap opens its page
 *   in the shop (a window already open goes there) and is counted. A subscription the browser renews by itself is
 *   handed to the API again.
 *
 * Its address says its version and the store's languages, main first (/sw.js?v=…&langs=ar,en): a new version is a
 * new worker, and it clears what older ones kept for the offline page. "dev=1": a developer's shop, whose built files
 * change without changing their names, so those always come from the network. "api": the API's address (with
 * notifications on).
 */
const params = new URL(self.location.href).searchParams;
const VERSION = (params.get("v") || "0").replace(/[^a-z0-9]/gi, "").slice(0, 24) || "0";
const LANGS = (params.get("langs") || "ar").split(",").filter((l) => l === "ar" || l === "en" || l === "he");
if (!LANGS.length) LANGS.push("ar");
const DEV = params.get("dev") === "1";
const API = /^https?:\/\/[^\s"'<>]+$/.test(params.get("api") || "") ? params.get("api").replace(/\/+$/, "") : "";

const SHELL = `shell-${VERSION}`;
const PAGES = "pages-v1";
const ASSETS = "assets-v1";
const MAX_PAGES = 40;
const MAX_ASSETS = 300;

/** The shopper's own pages and the editor's frames: never kept. */
const PRIVATE = /^\/(?:(?:ar|en|he)\/)?(?:account|cart|checkout|pay|order|track|wishlist|request|stock-alert|studio-frame|design-frame|offline)(?:\/|$)/;
/** The shop's own pictures, fonts and drawings. */
const MEDIA = /^\/(?:fonts|templates|editorial|particles|lottie|vendor|draco)\//;

const offlineUrl = (lang) => `/${lang}/offline`;
const langOf = (path) => {
  const first = path.split("/")[1];
  return LANGS.includes(first) ? first : LANGS[0];
};

/** The styles a page links to (so the offline page looks like the shop). */
function stylesOf(html) {
  const out = new Set();
  for (const tag of html.match(/<link\b[^>]*>/g) || []) {
    if (!/\brel=["']?stylesheet/.test(tag)) continue;
    const href = /\bhref=["']([^"']+)["']/.exec(tag);
    if (href && href[1].startsWith("/") && !href[1].startsWith("//")) out.add(href[1].replace(/&amp;/g, "&"));
  }
  return [...out];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // The app's own card (its icon, for notifications shown with no internet).
      await cache.add("/manifest.webmanifest").catch(() => {});
      for (const lang of LANGS) {
        try {
          const res = await fetch(offlineUrl(lang), { cache: "reload", credentials: "same-origin" });
          if (!res.ok || res.redirected) continue;
          const html = await res.clone().text();
          await cache.put(offlineUrl(lang), res);
          await Promise.all(stylesOf(html).map((href) => cache.add(href).catch(() => {})));
        } catch {
          /* no internet while starting: the next start keeps it */
        }
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith("shell-") && key !== SHELL) await caches.delete(key);
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {});
      await self.clients.claim();
    })(),
  );
});

/** Keeps a cache to its last `max` entries (the oldest go first). */
async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i += 1) await cache.delete(keys[i]);
}
const keepable = (res) => res && res.ok && res.status === 200 && res.type === "basic";

async function page(event) {
  const req = event.request;
  const url = new URL(req.url);
  const keep = !PRIVATE.test(url.pathname);
  try {
    const res = (await event.preloadResponse) || (await fetch(req));
    if (keep && keepable(res) && (res.headers.get("content-type") || "").includes("text/html")) {
      const copy = res.clone();
      event.waitUntil(caches.open(PAGES).then(async (cache) => {
        await cache.put(req, copy);
        await trim(cache, MAX_PAGES);
      }));
    }
    return res;
  } catch {
    const kept = keep ? await caches.match(req, { cacheName: PAGES, ignoreVary: true }) : undefined;
    if (kept) return kept;
    const offline = (await caches.match(offlineUrl(langOf(url.pathname)), { cacheName: SHELL })) || (await caches.match(offlineUrl(LANGS[0]), { cacheName: SHELL }));
    return offline || new Response("<!doctype html><meta charset=utf-8><title>Offline</title><h1>Offline</h1>", { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

async function cacheFirst(req) {
  const kept = await caches.match(req);
  if (kept) return kept;
  const res = await fetch(req);
  if (keepable(res)) {
    const cache = await caches.open(ASSETS);
    await cache.put(req, res.clone());
    trim(cache, MAX_ASSETS);
  }
  return res;
}

async function freshBehind(event) {
  const req = event.request;
  const kept = await caches.match(req);
  const fresh = fetch(req)
    .then(async (res) => {
      if (keepable(res)) {
        const cache = await caches.open(ASSETS);
        await cache.put(req, res.clone());
        trim(cache, MAX_ASSETS);
      }
      return res;
    })
    .catch(() => undefined);
  if (kept) {
    event.waitUntil(fresh);
    return kept;
  }
  return (await fresh) || new Response("", { status: 504 });
}

/** The network, or what was kept when there is none (a developer's built files, the offline page's styles). */
async function networkFirst(req) {
  try {
    return await fetch(req);
  } catch {
    return (await caches.match(req)) || new Response("", { status: 504 });
  }
}

/* ---------------- Notifications ---------------- */

/** The app's icon (its card's first) and the store's small mark beside a notification. */
async function iconsOf() {
  try {
    const res = (await caches.match("/manifest.webmanifest", { cacheName: SHELL })) || (await fetch("/manifest.webmanifest"));
    const icon = ((await res.json()).icons || []).find((i) => i.purpose === "any" && i.sizes === "192x192");
    if (!icon || typeof icon.src !== "string" || !icon.src.startsWith("/")) return {};
    return { icon: icon.src, badge: icon.src.replace(/size=\d+/, "size=96").replace(/purpose=\w+/, "purpose=badge") };
  } catch {
    return {};
  }
}
/** A place in this shop: never another site. */
const shopPlace = (url) => {
  try {
    const u = new URL(typeof url === "string" && url ? url : "/", self.location.origin);
    return u.origin === self.location.origin ? u.href : self.location.origin + "/";
  } catch {
    return self.location.origin + "/";
  }
};
const text = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "" };
  }
  const title = text(data.title, 120);
  if (!title) return;
  event.waitUntil(
    (async () => {
      const { icon, badge } = await iconsOf();
      await self.registration.showNotification(title, {
        body: text(data.body, 400),
        icon,
        badge,
        ...(typeof data.image === "string" && data.image.startsWith("https://") ? { image: data.image } : {}),
        tag: text(data.tag, 60) || undefined,
        lang: LANGS.includes(data.lang) ? data.lang : LANGS[0],
        dir: data.dir === "ltr" || data.dir === "rtl" ? data.dir : "auto",
        data: { url: shopPlace(data.url), id: /^m-[a-z0-9]+$/.test(data.tag || "") ? data.tag.slice(2) : null },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { url, id } = event.notification.data || {};
  const place = shopPlace(url);
  event.waitUntil(
    (async () => {
      if (API && id) fetch(`${API}/push/opened`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }), keepalive: true }).catch(() => {});
      const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const mine = open.find((c) => new URL(c.url).origin === self.location.origin);
      if (mine) {
        await mine.focus().catch(() => {});
        if (mine.url !== place && "navigate" in mine) await mine.navigate(place).catch(() => {});
        return;
      }
      await self.clients.openWindow(place);
    })(),
  );
});

/** The browser renewed the phone's subscription by itself: the API is given the new one (and forgets the old). */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      if (!API) return;
      const old = event.oldSubscription;
      let next = event.newSubscription;
      const key = old && old.options && old.options.applicationServerKey;
      if (!next && key) next = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }).catch(() => null);
      const post = (path, body) => fetch(`${API}/push/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
      if (next) {
        const j = next.toJSON();
        await post("subscribe", { endpoint: j.endpoint, keys: j.keys, lang: LANGS[0] });
      }
      if (old && (!next || old.endpoint !== next.endpoint)) await post("unsubscribe", { endpoint: old.endpoint });
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js" || url.pathname === "/manifest.webmanifest") return;
  if (req.mode === "navigate") return event.respondWith(page(event));
  if (url.pathname.startsWith("/_next/static/")) return event.respondWith(DEV ? networkFirst(req) : cacheFirst(req));
  if (MEDIA.test(url.pathname) || url.pathname.startsWith("/_next/image")) return event.respondWith(freshBehind(event));
});
