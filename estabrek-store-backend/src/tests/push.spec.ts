import crypto from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signCustomerToken } from "../config/security.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetHits } from "../lib/hitLimit.js";
import { open } from "../lib/secretBox.js";
import { PUSH_LIMITS, forgetPushKeys, sendQueuedPushes } from "../lib/push.js";

// Notifications on shoppers' phones (the shop as an app, part two), with the database: nothing is
// taken or sent while the owner hasn't switched them on; a phone that says yes is kept (tied to the
// shopper signed in on it); the admin sends to everyone, the signed-in ones or one customer; the
// job "push" sends each phone its own language, encrypted for it alone, drops the phones the push
// service forgot and, after a few refusals, the ones that keep failing. An order's news goes to its
// shopper's phones; a function's "push" step does the same from the steps. The push services are
// played here (fetch): nothing leaves this computer. Requests to /v1/admin without a token run as
// the test owner.

const PREFIX = "push-spec-";
type Obj = Record<string, any>;
type Phone = { endpoint: string; p256dh: string; auth: string; ecdh: crypto.ECDH; secret: Buffer };

let originalHeader: unknown = null;
let siteId = "";
let saraId = "";
let sara = "";
let n = 0;

/** A browser's own keys, as PushManager.subscribe gives them. */
function phone(): Phone {
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  const secret = crypto.randomBytes(16);
  return { endpoint: `https://fcm.googleapis.com/fcm/send/${PREFIX}${++n}`, p256dh: ecdh.getPublicKey().toString("base64url"), auth: secret.toString("base64url"), ecdh, secret };
}

/** What the phone reads: the message opened with its own private key (RFC 8291). */
function readAsPhone(p: Phone, message: Buffer): Obj {
  const salt = message.subarray(0, 16);
  const asPublic = message.subarray(21, 21 + message[20]);
  const shared = p.ecdh.computeSecret(asPublic);
  const ikm = Buffer.from(crypto.hkdfSync("sha256", shared, p.secret, Buffer.concat([Buffer.from("WebPush: info\0"), p.ecdh.getPublicKey(), asPublic]), 32));
  const cek = Buffer.from(crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const body = message.subarray(21 + message[20]);
  const d = crypto.createDecipheriv("aes-128-gcm", cek, nonce);
  d.setAuthTag(body.subarray(body.length - 16));
  const plain = Buffer.concat([d.update(body.subarray(0, body.length - 16)), d.final()]);
  return JSON.parse(plain.subarray(0, plain.length - 1).toString("utf8"));
}

/** The push services, played: what each endpoint was sent, and what it answers (201 unless told). */
const inbox = new Map<string, Buffer[]>();
const answers = new Map<string, number>();
function playPushServices() {
  const real = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (!u.startsWith("https://fcm.googleapis.com/")) return real(url, init);
    inbox.set(u, [...(inbox.get(u) ?? []), Buffer.from(init!.body as Uint8Array)]);
    return new Response(null, { status: answers.get(u) ?? 201 });
  });
}
const lastTo = (p: Phone) => {
  const got = inbox.get(p.endpoint) ?? [];
  return got.length ? readAsPhone(p, got[got.length - 1]) : null;
};

async function setPush(push: Obj | null, app: Obj = { enabled: true }) {
  const header = { ...((originalHeader as Obj) ?? {}), app: push ? { ...app, push } : app };
  await prisma.siteSettings.update({ where: { id: siteId }, data: { header } });
}
const subscribe = (p: Phone, opts: { lang?: string; token?: string; ua?: string } = {}) => {
  const req = request(app).post("/v1/push/subscribe").set("User-Agent", opts.ua ?? "Mozilla/5.0 (Linux; Android 14) Chrome/130");
  if (opts.token) req.set("Authorization", `Bearer ${opts.token}`);
  return req.send({ endpoint: p.endpoint, keys: { p256dh: p.p256dh, auth: p.auth }, lang: opts.lang ?? "ar" });
};

async function clean() {
  await prisma.pushSubscription.deleteMany({});
  await prisma.pushMessage.deleteMany({});
  await prisma.orderRequest.deleteMany({ where: { customerName: { startsWith: PREFIX } } });
  await prisma.productVariant.deleteMany({ where: { sku: { startsWith: PREFIX } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.size.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@push-spec.test" } } });
  inbox.clear();
  answers.clear();
  forgetHits();
}

beforeAll(async () => {
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  siteId = s.id;
  originalHeader = s.header;
  await prisma.siteSettings.update({ where: { id: siteId }, data: { customerAccountsEnabled: true, siteName: "Rose Shop" } });
  forgetFeatures();
  await clean();
  const u = await prisma.user.create({ data: { email: "sara@push-spec.test", name: "Sara" } });
  saraId = u.id;
  sara = signCustomerToken(u.id);
});
afterAll(async () => {
  await clean();
  await prisma.siteSettings.update({ where: { id: siteId }, data: { header: (originalHeader ?? Prisma.JsonNull) as Prisma.InputJsonValue, customerAccountsEnabled: false } });
  forgetFeatures();
});
// Each test starts with no phones and nothing sent.
beforeEach(async () => {
  await prisma.pushSubscription.deleteMany({});
  await prisma.pushMessage.deleteMany({});
  inbox.clear();
  answers.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("Switched off", () => {
  test("no key and no subscribing while the app or its notifications are off; saying no always works", async () => {
    await setPush(null, {});
    expect((await request(app).get("/v1/push/key").expect(404)).body.error).toBe("PUSH_OFF");
    expect((await subscribe(phone()).expect(404)).body.error).toBe("PUSH_OFF");
    // The app on, its notifications not: still off.
    await setPush({ enabled: false });
    await request(app).get("/v1/push/key").expect(404);
    // Notifications on, the app off: off.
    await setPush({ enabled: true }, { enabled: false });
    await request(app).get("/v1/push/key").expect(404);
    expect((await request(app).post("/v1/push/unsubscribe").send({ endpoint: "https://fcm.googleapis.com/fcm/send/none" }).expect(200)).body).toEqual({ ok: true, removed: false });
    expect(await prisma.pushSubscription.count()).toBe(0);
    // The admin can't send either.
    expect((await request(app).post("/v1/admin/push").send({ title: "x", audience: "all" }).expect(409)).body.error).toBe("PUSH_OFF");
  });
});

describe("Switched on", () => {
  test("the shop's key pair is made once and kept, its private half sealed", async () => {
    await setPush({ enabled: true });
    forgetPushKeys();
    const a = (await request(app).get("/v1/push/key").expect(200)).body.key as string;
    forgetPushKeys();
    const b = (await request(app).get("/v1/push/key").expect(200)).body.key as string;
    expect(a).toBe(b);
    const point = Buffer.from(a, "base64url");
    expect(point).toHaveLength(65);
    expect(point[0]).toBe(4);
    const row = await prisma.pushKeys.findUniqueOrThrow({ where: { id: "main" } });
    const priv = open(row.sealed);
    expect(Buffer.from(priv, "base64url")).toHaveLength(32);
    expect(row.sealed).not.toContain(priv);
    // The private half answers to the public one.
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(priv, "base64url"));
    expect(ecdh.getPublicKey().toString("base64url")).toBe(a);
  });

  test("a key that can't be opened any more (the server's key changed) is made again, and the phones of the old one go", async () => {
    await setPush({ enabled: true });
    forgetPushKeys();
    const old = (await request(app).get("/v1/push/key").expect(200)).body.key as string;
    await subscribe(phone()).expect(201);
    // Sealed under another server's key: this server can't open it.
    await prisma.pushKeys.update({ where: { id: "main" }, data: { sealed: "v1.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.AAAA" } });
    forgetPushKeys();
    const fresh = (await request(app).get("/v1/push/key").expect(200)).body.key as string;
    expect(fresh).not.toBe(old);
    expect(Buffer.from(fresh, "base64url")).toHaveLength(65);
    expect(await prisma.pushSubscription.count()).toBe(0);
    // And it opens from now on.
    forgetPushKeys();
    expect((await request(app).get("/v1/push/key").expect(200)).body.key).toBe(fresh);
  });

  test("a phone is taken from a push service with a browser's keys only; a visit renews it; signing in and out ties and unties it", async () => {
    await setPush({ enabled: true });
    const p = phone();
    expect((await subscribe({ ...p, endpoint: "https://evil.test/fcm/send/x" }).expect(400)).body.error).toBe("PUSH_ENDPOINT");
    expect((await subscribe({ ...p, endpoint: "http://fcm.googleapis.com/fcm/send/x" }).expect(400)).body.error).toBe("PUSH_ENDPOINT");
    expect((await subscribe({ ...p, p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 9)]).toString("base64url") }).expect(400)).body.error).toBe("PUSH_KEYS");
    expect((await subscribe(p).expect(201)).body).toEqual({ ok: true, signedIn: false });
    let row = await prisma.pushSubscription.findUniqueOrThrow({ where: { endpoint: p.endpoint } });
    expect(row).toMatchObject({ userId: null, lang: "ar", device: "android", failures: 0 });
    expect((await subscribe(p, { token: sara, lang: "en", ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Safari/604.1" }).expect(201)).body.signedIn).toBe(true);
    row = await prisma.pushSubscription.findUniqueOrThrow({ where: { endpoint: p.endpoint } });
    expect(row).toMatchObject({ userId: saraId, lang: "en", device: "iphone" });
    // Signed out on it: her own news stops coming there.
    await subscribe(p, { lang: "en" }).expect(201);
    expect((await prisma.pushSubscription.findUniqueOrThrow({ where: { endpoint: p.endpoint } })).userId).toBeNull();
    expect(await prisma.pushSubscription.count({ where: { endpoint: p.endpoint } })).toBe(1);
    expect((await request(app).post("/v1/push/unsubscribe").send({ endpoint: p.endpoint }).expect(200)).body.removed).toBe(true);
    expect(await prisma.pushSubscription.count()).toBe(0);
  });

  test("the admin sends to everyone: each phone gets it in its own language, encrypted for it alone; a forgotten phone is dropped", async () => {
    await setPush({ enabled: true });
    playPushServices();
    const ar = phone();
    const en = phone();
    const gone = phone();
    await subscribe(ar).expect(201);
    await subscribe(en, { lang: "en", token: sara }).expect(201);
    await subscribe(gone, { lang: "he" }).expect(201);
    answers.set(gone.endpoint, 410);

    const look = (await request(app).get("/v1/admin/push").expect(200)).body;
    expect(look).toMatchObject({ on: true, ask: "banner", orders: true, phones: { all: 3, customers: 1, byDevice: { android: 3 } }, messages: [], limits: { title: PUSH_LIMITS.title } });
    expect((await request(app).get("/v1/admin/push/count?audience=all").expect(200)).body.phones).toBe(3);
    expect((await request(app).get("/v1/admin/push/count?audience=customers").expect(200)).body.phones).toBe(1);

    expect((await request(app).post("/v1/admin/push").send({ title: "x", audience: "all", url: "https://evil.test/" }).expect(400)).body.error).toBe("PUSH_URL");
    expect((await request(app).post("/v1/admin/push").send({ title: "x", audience: "all", image: "javascript:alert(1)" }).expect(400)).body.error).toBe("PUSH_IMAGE");
    expect((await request(app).post("/v1/admin/push").send({ title: "", audience: "all" }).expect(400)).body.error).toBe("VALIDATION_ERROR");
    const sent = (
      await request(app)
        .post("/v1/admin/push")
        .send({ title: "  خصم ٢٠٪ اليوم  ", body: "على كل الفساتين", url: "/ar/shop", image: "https://res.cloudinary.com/demo/image/upload/sale.jpg", words: { en: { title: "20% off today", body: "On every dress" } }, audience: "all" })
        .expect(201)
    ).body.message;
    expect(sent).toMatchObject({ status: "QUEUED", total: 3 });

    expect(await sendQueuedPushes()).toEqual({ sent: 2, failed: 0, gone: 1, messages: 1 });
    expect(lastTo(ar)).toEqual({ title: "خصم ٢٠٪ اليوم", body: "على كل الفساتين", url: "/ar/shop", image: "https://res.cloudinary.com/demo/image/upload/sale.jpg", tag: `m-${sent.id}`, lang: "ar", dir: "rtl" });
    expect(lastTo(en)).toMatchObject({ title: "20% off today", body: "On every dress", lang: "en", dir: "ltr" });
    // Hebrew had no words of its own: the main ones (and it was gone anyway).
    expect(lastTo(gone)).toMatchObject({ title: "خصم ٢٠٪ اليوم", lang: "he" });
    // Each message is its own: two phones' copies share nothing readable.
    expect(inbox.get(ar.endpoint)![0].equals(inbox.get(en.endpoint)![0])).toBe(false);
    expect(await prisma.pushSubscription.count({ where: { endpoint: gone.endpoint } })).toBe(0);
    const done = await prisma.pushMessage.findUniqueOrThrow({ where: { id: sent.id } });
    expect(done).toMatchObject({ status: "DONE", sent: 2, gone: 1, failed: 0, from: "admin" });
    expect(done.finishedAt).not.toBeNull();
    // Nothing queued: a run does nothing.
    expect(await sendQueuedPushes()).toEqual({ sent: 0, failed: 0, gone: 0, messages: 0 });
    // Taps are counted, never more than were sent.
    for (const counted of [true, true, false]) expect((await request(app).post("/v1/push/opened").send({ id: sent.id }).expect(200)).body.counted).toBe(counted);
    expect((await request(app).post("/v1/push/opened").send({ id: "not-an-id!" }).expect(400)).body.error).toBeDefined();
    const history = (await request(app).get("/v1/admin/push").expect(200)).body.messages;
    expect(history[0]).toMatchObject({ id: sent.id, title: "خصم ٢٠٪ اليوم", status: "DONE", total: 3, sent: 2, gone: 1, opened: 2, audience: "all" });
  });

  test("to one customer: only their phones; somebody without an account is refused", async () => {
    await setPush({ enabled: true });
    playPushServices();
    const hers = phone();
    const other = phone();
    await subscribe(hers, { token: sara, lang: "en" }).expect(201);
    await subscribe(other).expect(201);
    expect((await request(app).get("/v1/admin/push/count?audience=customer&email=SARA@push-spec.test").expect(200)).body).toMatchObject({ phones: 1, customer: { id: saraId, email: "sara@push-spec.test" } });
    expect((await request(app).get("/v1/admin/push/count?audience=customer&email=nobody@push-spec.test").expect(404)).body.error).toBe("PUSH_NO_CUSTOMER");
    expect((await request(app).post("/v1/admin/push").send({ title: "x", audience: "customer" }).expect(400)).body.error).toBe("PUSH_WHO");
    await request(app).post("/v1/admin/push").send({ title: "Your size is back", audience: "customer", email: "sara@push-spec.test" }).expect(201);
    await sendQueuedPushes();
    expect(lastTo(hers)).toMatchObject({ title: "Your size is back", url: "/" });
    expect(lastTo(other)).toBeNull();
  });

  test("a phone the push service keeps refusing goes after a few tries; a busy one is kept", async () => {
    await setPush({ enabled: true });
    playPushServices();
    const refused = phone();
    const busy = phone();
    await subscribe(refused).expect(201);
    await subscribe(busy).expect(201);
    answers.set(refused.endpoint, 403);
    answers.set(busy.endpoint, 503);
    for (let i = 1; i <= PUSH_LIMITS.failures; i++) {
      await request(app).post("/v1/admin/push").send({ title: `try ${i}`, audience: "all" }).expect(201);
      expect((await sendQueuedPushes()).failed).toBe(2);
      const left = await prisma.pushSubscription.findUnique({ where: { endpoint: refused.endpoint } });
      if (i < PUSH_LIMITS.failures) expect(left?.failures).toBe(i);
      else expect(left).toBeNull();
    }
    expect(await prisma.pushSubscription.findUnique({ where: { endpoint: busy.endpoint } })).toMatchObject({ failures: 0 });
    // A good answer starts its count over.
    answers.delete(busy.endpoint);
    await request(app).post("/v1/admin/push").send({ title: "fine", audience: "all" }).expect(201);
    expect((await sendQueuedPushes()).sent).toBe(1);
    expect((await prisma.pushSubscription.findUniqueOrThrow({ where: { endpoint: busy.endpoint } })).lastSentAt).not.toBeNull();
  });

  test("switched off with a notification waiting: it waits, and goes once they are on again", async () => {
    await setPush({ enabled: true });
    playPushServices();
    const p = phone();
    await subscribe(p).expect(201);
    await request(app).post("/v1/admin/push").send({ title: "later", audience: "all" }).expect(201);
    await setPush({ enabled: false });
    expect((await sendQueuedPushes()).messages).toBe(0);
    expect(lastTo(p)).toBeNull();
    await setPush({ enabled: true });
    expect((await sendQueuedPushes()).sent).toBe(1);
    expect(lastTo(p)?.title).toBe("later");
  });
});

describe("An order's news", () => {
  let variantId = "";
  beforeAll(async () => {
    const size = await prisma.size.create({ data: { name: `${PREFIX}M`, order: 99 } });
    const category = await prisma.category.create({ data: { name: "Push", slug: `${PREFIX}cat` } });
    const product = await prisma.product.create({
      data: { title: "Push Dress", slug: `${PREFIX}dress`, isActive: true, categoryId: category.id, items: { create: [{ colorName: "Rose", colorHex: "#a43b64", skuBase: `${PREFIX}ROSE`, variants: { create: [{ sku: `${PREFIX}ROSE-M`, price: new Prisma.Decimal(100), stock: 50, size: { connect: { id: size.id } } }] } }] } },
      include: { items: { include: { variants: true } } },
    });
    variantId = product.items[0].variants[0].id;
  });
  const order = (userId: string | null, locale: "ar" | "en" | "he" = "en") => prisma.orderRequest.create({ data: { variantId, quantity: 1, customerName: `${PREFIX}Sara`, phone: "0500000000", status: "NEW", userId, locale } });
  const orderNews = async () => {
    // Told without waiting: give it a moment.
    for (let i = 0; i < 40; i++) {
      const m = await prisma.pushMessage.findMany({ where: { from: "order" }, orderBy: { createdAt: "asc" } });
      if (m.length) return m;
      await new Promise((r) => setTimeout(r, 50));
    }
    return [];
  };

  test("its shopper's phones hear it in their own language when the owner moves it; the same state twice is said once", async () => {
    await setPush({ enabled: true });
    await prisma.pushMessage.deleteMany({});
    playPushServices();
    const en = phone();
    const he = phone();
    const stranger = phone();
    await subscribe(en, { token: sara, lang: "en" }).expect(201);
    await subscribe(he, { token: sara, lang: "he" }).expect(201);
    await subscribe(stranger).expect(201);
    const o = await order(saraId, "ar");
    await request(app).patch(`/v1/admin/orders/${o.id}/status`).send({ toStatus: "ACCEPTED" }).expect(200);
    const news = await orderNews();
    expect(news).toHaveLength(1);
    expect(news[0]).toMatchObject({ audience: "customer", userId: saraId, title: "تأكّد الطلب ✓", url: "/account", total: 2 });
    await sendQueuedPushes();
    expect(lastTo(en)).toMatchObject({ title: "Your order is confirmed ✓", body: `Rose Shop · #${o.id.slice(-8)}`, url: "/account", lang: "en" });
    expect(lastTo(he)).toMatchObject({ title: "ההזמנה אושרה ✓", lang: "he" });
    expect(lastTo(stranger)).toBeNull();
    // The same state again: nothing new.
    await request(app).patch(`/v1/admin/orders/${o.id}/status`).send({ toStatus: "ACCEPTED" }).expect(200);
    await new Promise((r) => setTimeout(r, 300));
    expect(await prisma.pushMessage.count({ where: { from: "order" } })).toBe(1);
    // A state the shopper doesn't wait for (contacted): nothing.
    const o2 = await order(saraId);
    await request(app).patch(`/v1/admin/orders/${o2.id}/status`).send({ toStatus: "CONTACTED" }).expect(200);
    await new Promise((r) => setTimeout(r, 300));
    expect(await prisma.pushMessage.count({ where: { from: "order" } })).toBe(1);
  });

  test("nothing for a guest's order, nor when the owner said no to order news", async () => {
    await setPush({ enabled: true });
    await prisma.pushMessage.deleteMany({});
    await subscribe(phone(), { token: sara }).expect(201);
    const guest = await order(null);
    await request(app).patch(`/v1/admin/orders/${guest.id}/status`).send({ toStatus: "ACCEPTED" }).expect(200);
    await setPush({ enabled: true, orders: false });
    const hers = await order(saraId);
    await request(app).patch(`/v1/admin/orders/${hers.id}/status`).send({ toStatus: "ACCEPTED" }).expect(200);
    await new Promise((r) => setTimeout(r, 400));
    expect(await prisma.pushMessage.count()).toBe(0);
    expect((await request(app).get("/v1/admin/push").expect(200)).body.orders).toBe(false);
  });
});

describe("A function's push step", () => {
  const at = "/v1/admin/functions";
  async function fn(name: string, def: Obj) {
    const made = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body;
    const saved = (await request(app).put(`${at}/${made.id}`).send({ draft: { inputs: [], do: [], ...def } }).expect(200)).body;
    return { id: made.id as string, problems: saved.problems as Array<{ at: string; message: string }> };
  }
  const run = async (id: string, input: Obj, dry = false) => (await request(app).post(`${at}/${id}/run`).send({ input, dry, which: dry ? "draft" : "live" }).expect(200)).body as Obj;

  test("checked when saved: a title, the customer when it is for one, a place in the shop", async () => {
    const { problems } = await fn("checks", { do: [{ act: "push", who: "customer", title: "" }, { act: "push", who: "all", title: "x", link: "https://evil.test" }] });
    expect(problems).toEqual([
      { at: "do.0", message: "The title is empty" },
      { at: "do.0", message: "The customer is empty" },
      { at: "do.1", message: "A place in the shop starts with / (/shop)" },
    ]);
  });

  test("dry, it says how many phones; for real it is queued and sent; an unknown customer stops the run", async () => {
    await setPush({ enabled: true });
    await prisma.pushMessage.deleteMany({});
    playPushServices();
    const hers = phone();
    await subscribe(hers, { token: sara, lang: "en" }).expect(201);
    await subscribe(phone()).expect(201);
    const { id, problems } = await fn("tell", {
      inputs: [{ name: "email", type: "text" }],
      do: [{ act: "push", who: "customer", to: "{{input.email}}", title: "Hi {{input.email}}", text: "Your parcel left", link: "/account" }],
    });
    expect(problems).toEqual([]);
    await request(app).post(`${at}/${id}/publish`).expect(200);
    const dry = await run(id, { email: "sara@push-spec.test" }, true);
    expect(dry.ok).toBe(true);
    expect(dry.trace[0].note).toBe("Would send a notification to the customer (1 phone)");
    expect(await prisma.pushMessage.count()).toBe(0);
    const real = await run(id, { email: "sara@push-spec.test" });
    expect(real.ok).toBe(true);
    expect(real.trace[0].note).toBe("Sent a notification to the customer (1 phone)");
    const m = await prisma.pushMessage.findFirstOrThrow({ where: { from: "function" } });
    expect(m).toMatchObject({ audience: "customer", userId: saraId, title: "Hi sara@push-spec.test", body: "Your parcel left", url: "/account", total: 1 });
    await sendQueuedPushes();
    expect(lastTo(hers)).toMatchObject({ title: "Hi sara@push-spec.test", body: "Your parcel left" });
    const nobody = await run(id, { email: "nobody@push-spec.test" });
    expect(nobody.ok).toBe(false);
    expect(nobody.error).toBe('No customer "nobody@push-spec.test"');

    const all = await fn("everyone", { do: [{ act: "push", who: "all", title: "Sale!" }] });
    await request(app).post(`${at}/${all.id}/publish`).expect(200);
    expect((await run(all.id, {})).trace[0].note).toBe("Sent a notification to everyone (2 phones)");
    // Switched off: the step fails, saying why.
    await setPush({ enabled: false });
    const off = await run(all.id, {});
    expect(off.ok).toBe(false);
    expect(off.error).toBe("Notifications are switched off (Settings → the app)");
  });
});
