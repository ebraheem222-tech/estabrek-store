/**
 * Notifications on shoppers' phones (the shop as an app, part two; admin → الإعدادات → التطبيق, and
 * admin → الإشعارات to send one). lib/webPush.ts does the standards; this keeps the rest:
 *  - the shop's own key pair, made the first time it is needed, its private half sealed;
 *  - the phones and browsers that said yes (one each, by the address the browser gave), tied to the
 *    shopper while they are signed in on it;
 *  - each notification: queued here (from the admin, or a function's "push" step) and sent by the
 *    background job "push", a batch at a time, in order, so a restart goes on where it was. The push
 *    service's "gone" drops the phone at once; a phone that keeps failing goes after a few tries.
 * An order's own news goes the same way (pushOrderUpdate): confirmed, on its way, canceled, refunded,
 * to the phones of the shopper who placed it, in each phone's language, unless the owner said no.
 * While the owner hasn't switched notifications on (the app, and its notifications) nothing is taken
 * and nothing is sent.
 */
import type { PushMessage, PushSubscription } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "./prisma.js";
import { open, seal } from "./secretBox.js";
import { makePushKeys, pushEndpointOk, pushKeysOk, sendPush, type PushKeyPair, type PushResult } from "./webPush.js";
import { triggerJob } from "./jobs.js";

export const PUSH_LANGS = ["ar", "en", "he"] as const;
export type PushLang = (typeof PUSH_LANGS)[number];
export const PUSH_AUDIENCES = ["all", "customers", "customer"] as const;
export type PushAudience = (typeof PUSH_AUDIENCES)[number];
export const PUSH_ASKS = ["banner", "account"] as const;
export type PushAsk = (typeof PUSH_ASKS)[number];

export const PUSH_LIMITS = {
  title: 80,
  body: 240,
  url: 300,
  image: 500,
  /** Sends at once, and in one run of the job (the rest go on in the next). */
  together: 10,
  perRun: 1000,
  /** A phone the push service refused this many times in a row is dropped. */
  failures: 5,
  /** Notifications kept in the history. */
  kept: 200,
} as const;

/* ---------------- Switched on? ---------------- */

/**
 * The owner's settings (header.app.push), as the shop reads them too: on only with the app on.
 * `orders`: an order's news goes to its shopper's phones (on unless the owner said no).
 */
export function pushOf(header: unknown): { on: boolean; ask: PushAsk; orders: boolean } {
  const app = (header as { app?: { enabled?: unknown; push?: { enabled?: unknown; ask?: unknown; orders?: unknown } } } | null)?.app;
  const ask = (PUSH_ASKS as readonly string[]).includes(String(app?.push?.ask)) ? (app!.push!.ask as PushAsk) : "banner";
  return { on: app?.enabled === true && app?.push?.enabled === true, ask, orders: app?.push?.orders !== false };
}

export async function pushSettings() {
  const s = await prisma.siteSettings.findFirst({ select: { header: true } }).catch(() => null);
  return pushOf(s?.header ?? null);
}

/* ---------------- The shop's key pair ---------------- */

let keysCache: PushKeyPair | null = null;

/**
 * Made once and kept; two servers starting at once agree on the first one written. A private half that can't be
 * opened any more (the server's own key changed: CODES_ENCRYPTION_KEY, or JWT_SECRET without it) is replaced by a new
 * pair: the phones that said yes to the old one can never be reached with the new one, so they go, and each says yes
 * to the new key by itself on its next visit (lib/pushClient.ts in the shop; no question is asked again).
 */
export async function pushKeys(): Promise<PushKeyPair> {
  if (keysCache) return keysCache;
  let row = await prisma.pushKeys.findUnique({ where: { id: "main" } });
  if (!row) {
    const made = makePushKeys();
    row = await prisma.pushKeys
      .create({ data: { id: "main", publicKey: made.publicKey, sealed: seal(made.privateKey) } })
      .catch(async () => prisma.pushKeys.findUniqueOrThrow({ where: { id: "main" } }));
  }
  let privateKey: string;
  try {
    privateKey = open(row.sealed);
  } catch {
    const made = makePushKeys();
    // Only the server that replaces it drops the old phones (another may have just done it).
    const won = await prisma.pushKeys.updateMany({ where: { id: "main", sealed: row.sealed }, data: { publicKey: made.publicKey, sealed: seal(made.privateKey), createdAt: new Date() } });
    if (won.count) {
      await prisma.pushSubscription.deleteMany({});
      console.warn("[push] the shop's key couldn't be opened (the server's key changed): a new one was made and the old phones dropped");
      keysCache = made;
      return made;
    }
    row = await prisma.pushKeys.findUniqueOrThrow({ where: { id: "main" } });
    privateKey = open(row.sealed);
  }
  keysCache = { publicKey: row.publicKey, privateKey };
  return keysCache;
}

/** For the tests: the next call reads the keys again. */
export const forgetPushKeys = () => {
  keysCache = null;
};

/** How the push services can reach the shop (RFC 8292's "sub"): its email, else its address. */
async function subject() {
  const s = await prisma.siteSettings.findFirst({ select: { ordersEmail: true, contactEmail: true } }).catch(() => null);
  const email = (s?.contactEmail || s?.ordersEmail || "").trim();
  if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return `mailto:${email}`;
  if (env.STOREFRONT_URL?.startsWith("https://")) return env.STOREFRONT_URL.replace(/\/+$/, "");
  return "mailto:shop@example.com";
}

/* ---------------- The phones that said yes ---------------- */

export type SubscriptionInput = { endpoint: string; p256dh: string; auth: string; lang?: string; device?: string | null };

/** "android" | "iphone" | "desktop", from the browser's own name (for the counts only). */
export function deviceOf(userAgent: string | undefined | null): string {
  const ua = userAgent ?? "";
  if (/iPhone|iPad|iPod/.test(ua)) return "iphone";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

/**
 * A phone said yes (or said it again: a visit renews it). `userId` is who is signed in on it now:
 * none means none (signed out on a shared phone, their own notifications stop coming there).
 * Throws "PUSH_ENDPOINT" / "PUSH_KEYS" for what isn't a browser's.
 */
export async function savePushSubscription(input: SubscriptionInput, userId: string | null) {
  if (!pushEndpointOk(input.endpoint)) throw new Error("PUSH_ENDPOINT");
  if (!pushKeysOk(input.p256dh, input.auth)) throw new Error("PUSH_KEYS");
  const lang = (PUSH_LANGS as readonly string[]).includes(String(input.lang)) ? String(input.lang) : "ar";
  const data = { p256dh: input.p256dh, auth: input.auth, lang, device: input.device ?? null, userId, seenAt: new Date() };
  return prisma.pushSubscription.upsert({ where: { endpoint: input.endpoint }, create: { endpoint: input.endpoint, ...data }, update: { ...data, failures: 0 } });
}

export async function dropPushSubscription(endpoint: string) {
  const r = await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return r.count > 0;
}

/** A shopper tapped it (the worker says so): counted, never past how many it was sent to. */
export async function pushOpened(id: string) {
  const n = await prisma.$executeRaw`UPDATE "PushMessage" SET "opened" = "opened" + 1 WHERE "id" = ${id} AND "opened" < "sent"`;
  return n > 0;
}

/* ---------------- A notification ---------------- */

export type PushInput = {
  title: string;
  body?: string | null;
  url?: string | null;
  image?: string | null;
  /** The same in the store's other languages. */
  words?: Partial<Record<PushLang, { title?: string; body?: string }>> | null;
  audience: PushAudience;
  userId?: string | null;
  from?: "admin" | "function" | "order";
  fnId?: string | null;
  createdById?: string | null;
};

/** A place in the shop ("/ar/shop", "/p/dress?c=red"): never another site. Null when there is none. */
export function shopPath(url: string | null | undefined): string | null {
  const u = (url ?? "").trim();
  if (!u) return null;
  if (!u.startsWith("/") || u.startsWith("//") || /[\s\\]/.test(u)) throw new Error("PUSH_URL");
  return u.slice(0, PUSH_LIMITS.url);
}

function pictureOf(url: string | null | undefined): string | null {
  const u = (url ?? "").trim();
  if (!u) return null;
  if (!/^https:\/\/[^\s"'<>]+$/.test(u) || u.length > PUSH_LIMITS.image) throw new Error("PUSH_IMAGE");
  return u;
}

const clip = (s: string | null | undefined, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

const whereOf = (audience: string, userId: string | null) =>
  audience === "customer" ? { userId: userId ?? "-" } : audience === "customers" ? { userId: { not: null } } : {};

/** Who would get it now. */
export async function pushAudienceCount(audience: PushAudience, userId: string | null = null) {
  return prisma.pushSubscription.count({ where: whereOf(audience, userId) });
}

/**
 * Queued, and the job "push" woken to send it. Throws "PUSH_OFF" while the owner hasn't switched
 * notifications on, "PUSH_TITLE" with no title, "PUSH_URL" / "PUSH_IMAGE" for an address that isn't one.
 */
export async function queuePush(input: PushInput): Promise<PushMessage> {
  if (!(await pushSettings()).on) throw new Error("PUSH_OFF");
  const title = clip(input.title, PUSH_LIMITS.title);
  if (!title) throw new Error("PUSH_TITLE");
  const url = shopPath(input.url);
  const image = pictureOf(input.image);
  const words: Record<string, { title: string; body: string }> = {};
  for (const lang of PUSH_LANGS) {
    const w = input.words?.[lang];
    const t = clip(w?.title, PUSH_LIMITS.title);
    if (t) words[lang] = { title: t, body: clip(w?.body, PUSH_LIMITS.body) };
  }
  const userId = input.audience === "customer" ? (input.userId ?? null) : null;
  if (input.audience === "customer" && !userId) throw new Error("PUSH_WHO");
  const msg = await prisma.pushMessage.create({
    data: {
      title,
      body: clip(input.body, PUSH_LIMITS.body) || null,
      url,
      image,
      words: Object.keys(words).length ? words : undefined,
      audience: input.audience,
      userId,
      from: input.from ?? "admin",
      fnId: input.fnId ?? null,
      createdById: input.createdById ?? null,
      total: await pushAudienceCount(input.audience, userId),
    },
  });
  triggerJob("push");
  return msg;
}

/** What a phone is handed (the worker, public/sw.js, shows it): in its own language when the message has it. */
export function pushPayload(msg: Pick<PushMessage, "id" | "title" | "body" | "url" | "image" | "words">, lang: string) {
  const w = (msg.words as Record<string, { title?: string; body?: string }> | null)?.[lang];
  const title = w?.title || msg.title;
  const body = w?.title ? w.body || "" : msg.body || "";
  return {
    title,
    body,
    url: msg.url || "/",
    ...(msg.image ? { image: msg.image } : {}),
    tag: `m-${msg.id}`,
    lang,
    dir: lang === "en" ? "ltr" : "rtl",
  };
}

async function inTurn<T, R>(items: T[], together: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(together, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await work(items[i]);
      }
    }),
  );
  return out;
}

/**
 * The job "push": sends what is queued, oldest first, up to PUSH_LIMITS.perRun phones a run (it wakes
 * itself for the rest). Switched off meanwhile: what is queued waits.
 */
export async function sendQueuedPushes(): Promise<{ sent: number; failed: number; gone: number; messages: number }> {
  const counts = { sent: 0, failed: 0, gone: 0, messages: 0 };
  if (!(await pushSettings()).on) return counts;
  const queued = await prisma.pushMessage.findMany({ where: { status: { in: ["QUEUED", "SENDING"] } }, orderBy: { createdAt: "asc" }, take: 20 });
  if (!queued.length) return counts;
  const keys = await pushKeys();
  const sub = await subject();
  let budget: number = PUSH_LIMITS.perRun;
  for (const msg of queued) {
    let cursor = msg.cursor;
    counts.messages += 1;
    while (budget > 0) {
      const phones: PushSubscription[] = await prisma.pushSubscription.findMany({
        where: { ...whereOf(msg.audience, msg.userId), ...(cursor ? { id: { gt: cursor } } : {}) },
        orderBy: { id: "asc" },
        take: Math.min(100, budget),
      });
      if (!phones.length) {
        await prisma.pushMessage.update({ where: { id: msg.id }, data: { status: "DONE", finishedAt: new Date(), cursor } });
        break;
      }
      budget -= phones.length;
      const results: PushResult[] = await inTurn(phones, PUSH_LIMITS.together, async (p) => (await sendPush(p, pushPayload(msg, p.lang), keys, sub)).result);
      const by = (r: PushResult) => phones.filter((_, i) => results[i] === r).map((p) => p.id);
      const sent = by("sent");
      const gone = by("gone");
      const failed = [...by("failed"), ...by("retry")];
      if (sent.length) await prisma.pushSubscription.updateMany({ where: { id: { in: sent } }, data: { lastSentAt: new Date(), failures: 0 } });
      if (gone.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
      if (by("failed").length) {
        await prisma.pushSubscription.updateMany({ where: { id: { in: by("failed") } }, data: { failures: { increment: 1 } } });
        await prisma.pushSubscription.deleteMany({ where: { id: { in: by("failed") }, failures: { gte: PUSH_LIMITS.failures } } });
      }
      cursor = phones[phones.length - 1].id;
      await prisma.pushMessage.update({ where: { id: msg.id }, data: { status: "SENDING", cursor, sent: { increment: sent.length }, failed: { increment: failed.length }, gone: { increment: gone.length } } });
      counts.sent += sent.length;
      counts.failed += failed.length;
      counts.gone += gone.length;
    }
    if (budget <= 0) break;
  }
  if (budget <= 0) triggerJob("push", 1000);
  // The history keeps the latest ones.
  const old = await prisma.pushMessage.findMany({ where: { status: "DONE" }, orderBy: { createdAt: "desc" }, skip: PUSH_LIMITS.kept, select: { id: true } });
  if (old.length) await prisma.pushMessage.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  return counts;
}

/* ---------------- An order's news ---------------- */

/** What an order's shopper is told, by its new state: the states a shopper waits for. */
export const ORDER_NEWS: Partial<Record<string, Record<PushLang, string>>> = {
  ACCEPTED: { ar: "تأكّد الطلب ✓", en: "Your order is confirmed ✓", he: "ההזמנה אושרה ✓" },
  SHIPPED: { ar: "الطلب بالطريق إلك", en: "Your order is on its way", he: "ההזמנה בדרך אליך" },
  CANCELED: { ar: "انلغى الطلب", en: "Your order was canceled", he: "ההזמנה בוטלה" },
  REJECTED: { ar: "ما قدرنا نكمّل الطلب", en: "We couldn't complete your order", he: "לא הצלחנו להשלים את ההזמנה" },
  REFUNDED: { ar: "رجع ثمن الطلب", en: "Your order was refunded", he: "ההזמנה זוכתה" },
};

/**
 * An order's state changed (the admin, a payment): its shopper's phones are told, when the order is a
 * signed-in shopper's, the state is one they wait for, and the owner hasn't said no. Never throws: an
 * order is never held up by a phone. Null when nothing was sent.
 */
export async function pushOrderUpdate(orderId: string, status: string): Promise<PushMessage | null> {
  try {
    const news = ORDER_NEWS[status];
    if (!news) return null;
    const settings = await pushSettings();
    if (!settings.on || !settings.orders) return null;
    const order = await prisma.orderRequest.findUnique({ where: { id: orderId }, select: { id: true, userId: true, locale: true } });
    if (!order?.userId || !(await pushAudienceCount("customer", order.userId))) return null;
    const site = await prisma.siteSettings.findFirst({ select: { siteName: true } }).catch(() => null);
    const number = `#${order.id.slice(-8)}`;
    const body = [site?.siteName?.trim(), number].filter(Boolean).join(" · ");
    const words = Object.fromEntries(PUSH_LANGS.map((l) => [l, { title: news[l], body }]));
    const lang = (PUSH_LANGS as readonly string[]).includes(String(order.locale)) ? (String(order.locale) as PushLang) : "ar";
    // A plain address opens in the phone's own language (the shop's middleware).
    return await queuePush({ title: news[lang], body, url: "/account", words, audience: "customer", userId: order.userId, from: "order" });
  } catch {
    return null;
  }
}

/** For the admin: who said yes, on what, and the latest notifications. */
export async function pushOverview() {
  const [settings, all, customers, devices, messages] = await Promise.all([
    pushSettings(),
    prisma.pushSubscription.count(),
    prisma.pushSubscription.count({ where: { userId: { not: null } } }),
    prisma.pushSubscription.groupBy({ by: ["device"], _count: { _all: true } }),
    prisma.pushMessage.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  return {
    on: settings.on,
    ask: settings.ask,
    orders: settings.orders,
    phones: { all, customers, byDevice: Object.fromEntries(devices.map((d) => [d.device ?? "desktop", d._count._all])) },
    messages: messages.map((m) => ({
      id: m.id,
      title: m.title,
      body: m.body,
      url: m.url,
      image: m.image,
      words: m.words,
      audience: m.audience,
      from: m.from,
      fnId: m.fnId,
      status: m.status,
      total: m.total,
      sent: m.sent,
      failed: m.failed,
      gone: m.gone,
      opened: m.opened,
      createdAt: m.createdAt,
      finishedAt: m.finishedAt,
    })),
  };
}
