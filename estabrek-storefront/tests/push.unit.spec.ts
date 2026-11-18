import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { APP_DEFAULTS, appOf, pushOn, workerHref } from "../src/lib/pwa";
import { keyBytes } from "../src/lib/pushClient";

// Notifications (the shop as an app, part two), the pure side and the worker itself: the owner's settings as the
// shop reads them, the worker's address with the API's, the shop's key as the browser takes it, and public/sw.js
// run in a sandbox: what a notification shows, where a tap goes (never another site), and a subscription the browser
// renewed by itself handed to the API.

const SW = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../public/sw.js"), "utf8");

type Fired = { waitUntil: (p: Promise<unknown>) => void };
function worker(query = "?v=1&langs=ar,en&api=http%3A%2F%2Fapi.test%2Fv1") {
  const on: Record<string, (e: Fired & Record<string, unknown>) => void> = {};
  const shown: Array<Record<string, unknown>> = [];
  const opened: string[] = [];
  const posted: Array<{ url: string; body: unknown }> = [];
  const windows: Array<{ url: string; focus: () => Promise<void>; navigate: (u: string) => Promise<void>; went?: string; focused?: boolean }> = [];
  const resubscribed: unknown[] = [];
  const manifest = { icons: [{ src: "/api/app-icon?size=512&purpose=any&c=a43b64&v=x", sizes: "512x512", purpose: "any" }, { src: "/api/app-icon?size=192&purpose=any&c=a43b64&v=x", sizes: "192x192", purpose: "any" }] };
  const self = {
    location: new URL(`https://shop.test/sw.js${query}`),
    addEventListener: (type: string, f: (e: Fired & Record<string, unknown>) => void) => {
      on[type] = f;
    },
    registration: {
      showNotification: async (title: string, opts: Record<string, unknown>) => {
        shown.push({ title, ...opts });
      },
      pushManager: {
        subscribe: async (opts: unknown) => {
          resubscribed.push(opts);
          return { endpoint: "https://fcm.googleapis.com/fcm/send/renewed", toJSON: () => ({ endpoint: "https://fcm.googleapis.com/fcm/send/renewed", keys: { p256dh: "P", auth: "A" } }) };
        },
      },
    },
    clients: {
      matchAll: async () => windows,
      openWindow: async (u: string) => {
        opened.push(u);
      },
      claim: async () => {},
    },
    skipWaiting: async () => {},
  };
  const caches = {
    match: async (key: string) => (key === "/manifest.webmanifest" ? new Response(JSON.stringify(manifest)) : undefined),
    open: async () => ({ add: async () => {}, put: async () => {}, keys: async () => [] }),
    keys: async () => [],
  };
  const fetch = async (url: string, init?: RequestInit) => {
    posted.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response("{}");
  };
  vm.runInContext(SW, vm.createContext({ self, caches, fetch, URL, Response, console, setTimeout }));
  const fire = async (type: string, event: Record<string, unknown>) => {
    const waits: Promise<unknown>[] = [];
    on[type]({ ...event, waitUntil: (p) => waits.push(p) });
    await Promise.all(waits);
  };
  const push = (data: unknown) => fire("push", { data: { json: () => data, text: () => String(data) } });
  return { fire, push, shown, opened, posted, windows, resubscribed };
}

test("the owner's settings: notifications only ever with the app, asked by a card unless the owner said the account page", () => {
  expect(APP_DEFAULTS.push).toEqual({ enabled: false, ask: "banner", orders: true });
  expect(pushOn(appOf({ app: { enabled: true, push: { enabled: true } } }))).toBe(true);
  expect(pushOn(appOf({ app: { enabled: false, push: { enabled: true } } }))).toBe(false);
  expect(pushOn(appOf({ app: { enabled: true, push: { enabled: "yes" } } }))).toBe(false);
  expect(appOf({ app: { push: { enabled: true, ask: "account", orders: false } } }).push).toEqual({ enabled: true, ask: "account", orders: false });
  expect(appOf({ app: { push: { ask: "popup" } } }).push.ask).toBe("banner");
});

test("the worker's address carries the API's only when it is one", () => {
  const header = { languages: { enabled: ["ar", "en"], default: "ar" } };
  expect(workerHref("v1", header, false, "https://api.example.com/v1/")).toBe("/sw.js?v=v1&langs=ar,en&api=https%3A%2F%2Fapi.example.com%2Fv1");
  expect(workerHref("v1", header, false, null)).toBe("/sw.js?v=v1&langs=ar,en");
  expect(workerHref("v1", header, false, "javascript:alert(1)")).toBe("/sw.js?v=v1&langs=ar,en");
});

test("the shop's key, as the browser takes it", () => {
  const bytes = keyBytes("BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8");
  expect(bytes).toHaveLength(65);
  expect(bytes[0]).toBe(4);
  expect(Buffer.from(bytes).toString("base64url")).toBe("BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8");
});

test("a notification: the app's icon, the store's small mark, its own language and direction, its picture", async () => {
  const w = worker();
  await w.push({ title: "20% off today", body: "On every dress", url: "/en/shop", image: "https://res.cloudinary.com/demo/sale.jpg", tag: "m-cmabc123def", lang: "en", dir: "ltr" });
  expect(w.shown).toEqual([
    {
      title: "20% off today",
      body: "On every dress",
      icon: "/api/app-icon?size=192&purpose=any&c=a43b64&v=x",
      badge: "/api/app-icon?size=96&purpose=badge&c=a43b64&v=x",
      image: "https://res.cloudinary.com/demo/sale.jpg",
      tag: "m-cmabc123def",
      lang: "en",
      dir: "ltr",
      data: { url: "https://shop.test/en/shop", id: "cmabc123def" },
    },
  ]);
  // Another site's address opens the shop's home; a picture that isn't https is left out; a language the store
  // doesn't speak is its main one.
  await w.push({ title: "x", url: "https://evil.test/steal", image: "javascript:alert(1)", lang: "fr", dir: "sideways" });
  expect(w.shown[1]).toMatchObject({ title: "x", lang: "ar", dir: "auto", data: { url: "https://shop.test/", id: null } });
  expect(w.shown[1]).not.toHaveProperty("image");
  // No title: nothing shown.
  await w.push({ body: "only words" });
  expect(w.shown).toHaveLength(2);
});

test("a tap: its page opens (in a window already open when there is one) and it is counted", async () => {
  const w = worker();
  let closed = false;
  await w.fire("notificationclick", { notification: { close: () => (closed = true), data: { url: "https://shop.test/ar/account", id: "cmabc123def" } } });
  expect(closed).toBe(true);
  expect(w.opened).toEqual(["https://shop.test/ar/account"]);
  expect(w.posted).toEqual([{ url: "http://api.test/v1/push/opened", body: { id: "cmabc123def" } }]);
  const tab = { url: "https://shop.test/ar", focused: false, went: "", focus: async () => void (tab.focused = true), navigate: async (u: string) => void (tab.went = u) };
  w.windows.push(tab);
  await w.fire("notificationclick", { notification: { close: () => {}, data: { url: "https://evil.test/x", id: null } } });
  expect(tab).toMatchObject({ focused: true, went: "https://shop.test/" });
  expect(w.opened).toHaveLength(1);
  // Without the API's address (notifications off when it started): opened, not counted.
  const quiet = worker("?v=1&langs=ar");
  await quiet.fire("notificationclick", { notification: { close: () => {}, data: { url: "https://shop.test/ar", id: "cmabc123def" } } });
  expect(quiet.opened).toEqual(["https://shop.test/ar"]);
  expect(quiet.posted).toEqual([]);
});

test("the browser renewed the subscription by itself: the API gets the new one and forgets the old", async () => {
  const w = worker();
  await w.fire("pushsubscriptionchange", { oldSubscription: { endpoint: "https://fcm.googleapis.com/fcm/send/old", options: { applicationServerKey: new Uint8Array([4, 1, 2]) } }, newSubscription: null });
  expect(w.resubscribed).toHaveLength(1);
  expect(w.posted).toEqual([
    { url: "http://api.test/v1/push/subscribe", body: { endpoint: "https://fcm.googleapis.com/fcm/send/renewed", keys: { p256dh: "P", auth: "A" }, lang: "ar" } },
    { url: "http://api.test/v1/push/unsubscribe", body: { endpoint: "https://fcm.googleapis.com/fcm/send/old" } },
  ]);
});
