import { describe, test, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import { applyPolicy, envDefaults, mergePolicy } from "../lib/securityPolicy.js";
import { forgetFeatures } from "../lib/features.js";
import { seal } from "../lib/secretBox.js";
import { MAILCHIMP_TASK, memberHash, queueAllMailchimp, sendMailchimpMember } from "../lib/mailchimp.js";

// Checkout terms, invoices in the shopper's account, and the newsletter's Mailchimp connection, on the database
// (lib/invoice.ts, lib/mailchimp.ts, the order and settings routes). Mailchimp itself is a stand-in: no network.
// A made-up key of Mailchimp's shape, put together from parts (not a real key; secret scanners match the whole).
const KEY = ["0123456789abcdef", "0123456789abcdef", "-us21"].join("");
const items = [{ variantId: "cvariant01", quantity: 1 }];
const order = (extra: Record<string, unknown> = {}) => request(app).post("/v1/catalog/order-requests").send({ items, customerName: "سارة", phone: "0599123456", ...extra });

async function settings(data: Record<string, unknown>) {
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data });
  forgetFeatures();
}
const fakeFetch = (status: number, body: unknown, calls: string[] = []) =>
  (async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }) as unknown as typeof fetch;

beforeAll(async () => {
  const relaxed = mergePolicy({ rateLimit: { auth: 500 } });
  await prisma.securityPolicy.upsert({ where: { id: "default" }, create: { id: "default", data: relaxed as any }, update: { data: relaxed as any } });
  applyPolicy(relaxed);
});
afterAll(async () => {
  await prisma.securityPolicy.deleteMany();
  applyPolicy(envDefaults());
  await settings({ checkoutTermsRequired: false, checkoutTermsUrl: null, customerAccountsEnabled: false, mailchimpEnabled: false, mailchimpApiKey: null, mailchimpListId: null, mailchimpError: null });
  await prisma.task.deleteMany({ where: { kind: MAILCHIMP_TASK } });
  await prisma.newsletterSubscriber.deleteMany({ where: { email: { endsWith: "@news.test" } } });
});
beforeEach(async () => {
  await prisma.customerOtp.deleteMany();
  await resetDb();
  await seedCatalog();
  await settings({ checkoutTermsRequired: false, mailchimpEnabled: false, mailchimpApiKey: null, mailchimpListId: null, mailchimpError: null });
  await prisma.task.deleteMany({ where: { kind: MAILCHIMP_TASK } });
  await prisma.newsletterSubscriber.deleteMany({ where: { email: { endsWith: "@news.test" } } });
});

describe("checkout terms", () => {
  test("asked for by the store: an order without the box ticked is refused; ticked, it's kept with its time", async () => {
    // Not asked for: as before, and no time kept.
    const free = (await order().expect(201)).body;
    expect((await prisma.orderRequest.findUnique({ where: { id: free.id } }))?.termsAcceptedAt).toBeNull();
    // The admin asks for it (settings), with a link and words of its own; the shop's public settings carry them.
    await request(app).patch("/v1/admin/settings").send({ checkoutTermsRequired: true, checkoutTermsUrl: "/policies", checkoutTermsText: { ar: "قرأت الشروط ووافقت" } }).expect(200);
    const pub = (await request(app).get("/v1/settings").expect(200)).body;
    expect(pub.site.checkoutTerms).toEqual({ required: true, url: "/policies", text: { ar: "قرأت الشروط ووافقت" } });
    expect((await order().expect(400)).body.error).toBe("TERMS_REQUIRED");
    expect((await order({ termsAccepted: false }).expect(400)).body.error).toBe("TERMS_REQUIRED");
    const ok = (await order({ termsAccepted: true }).expect(201)).body;
    expect((await prisma.orderRequest.findUnique({ where: { id: ok.id } }))?.termsAcceptedAt).toBeInstanceOf(Date);
    // A link that isn't the shop's page or an https one isn't taken; the words can be cleared.
    await request(app).patch("/v1/admin/settings").send({ checkoutTermsUrl: "javascript:alert(1)" }).expect(400);
    await request(app).patch("/v1/admin/settings").send({ checkoutTermsText: null }).expect(200);
    expect((await prisma.siteSettings.findFirst())?.checkoutTermsText).toBeNull();
  });
});

describe("invoices in the shopper's account", () => {
  test("her own order's invoice, in her language; never another's", async () => {
    await settings({ customerAccountsEnabled: true });
    const start = await request(app).post("/v1/customer/auth/start").send({ email: "sara@shop.test" }).expect(200);
    const sara = (await request(app).post("/v1/customer/auth/verify").send({ email: "sara@shop.test", code: start.body.devCode }).expect(200)).body;
    const mine = (await request(app).post("/v1/catalog/order-requests").set("Authorization", `Bearer ${sara.accessToken}`).send({ items, customerName: "سارة", phone: "0599123456", lang: "en" }).expect(201)).body;
    const guest = (await order().expect(201)).body;
    const got = (await request(app).get(`/v1/customer/me/orders/${mine.id}/invoice`).set("Authorization", `Bearer ${sara.accessToken}`).expect(200)).body;
    expect(got.html).toContain('<html lang="en" dir="ltr">');
    expect(got.html).toContain(`#${mine.id.slice(-8).toUpperCase()}`);
    expect((await request(app).get(`/v1/customer/me/orders/${mine.id}/invoice?lang=ar`).set("Authorization", `Bearer ${sara.accessToken}`).expect(200)).body.html).toContain('dir="rtl"');
    await request(app).get(`/v1/customer/me/orders/${guest.id}/invoice`).set("Authorization", `Bearer ${sara.accessToken}`).expect(404);
    await request(app).get(`/v1/customer/me/orders/${mine.id}/invoice`).expect(401);
    // The admin's printable invoice still answers, as a page.
    const admin = await request(app).get(`/v1/admin/orders/${guest.id}/invoice`).expect(200);
    expect(admin.headers["content-type"]).toMatch(/text\/html/);
    expect(admin.text).toContain("سارة");
  });
});

describe("the newsletter's Mailchimp connection", () => {
  test("the admin sees whether a key is saved, never the key; a key that isn't one, or switching on without an audience, is refused", async () => {
    await settings({ mailchimpApiKey: seal(KEY), mailchimpListId: "abc123" });
    const state = (await request(app).get("/v1/admin/newsletter/mailchimp").expect(200)).body;
    expect(state).toMatchObject({ enabled: false, keySet: true, keyCentre: "us21", listId: "abc123", subscribers: 0, inAudience: 0 });
    expect(JSON.stringify(state)).not.toContain(KEY);
    // The settings page never gets it either, nor its history.
    const page = (await request(app).get("/v1/admin/settings").expect(200)).body;
    expect(page.mailchimpApiKey).toBeUndefined();
    expect(page.mailchimpKeySet).toBe(true);
    await request(app).put("/v1/admin/newsletter/mailchimp").send({ apiKey: "nope" }).expect(400);
    expect((await request(app).put("/v1/admin/newsletter/mailchimp").send({ enabled: true, listId: null }).expect(400)).body.error).toBe("INCOMPLETE");
    // Switched off, a key can be taken away without asking Mailchimp.
    expect((await request(app).put("/v1/admin/newsletter/mailchimp").send({ apiKey: null }).expect(200)).body.keySet).toBe(false);
  });

  test("a new subscriber is queued when connected; sent, marked; one already in isn't sent again; one refused isn't retried", async () => {
    // Not connected: no task.
    await request(app).post("/v1/ugc/newsletter/subscribe").send({ email: "one@news.test" }).expect(201);
    expect(await prisma.task.count({ where: { kind: MAILCHIMP_TASK } })).toBe(0);
    await settings({ mailchimpEnabled: true, mailchimpApiKey: seal(KEY), mailchimpListId: "abc123" });
    await request(app).post("/v1/ugc/newsletter/subscribe").send({ email: "Two@News.test" }).expect(201);
    const task = await prisma.task.findFirst({ where: { kind: MAILCHIMP_TASK } });
    expect(task).toMatchObject({ key: "mailchimp:two@news.test", payload: { email: "two@news.test" } });
    // The task's work, with Mailchimp's stand-in.
    const calls: string[] = [];
    expect(await sendMailchimpMember({ email: "two@news.test" }, fakeFetch(200, { id: "m" }, calls))).toEqual({ sent: "two@news.test" });
    expect(calls).toEqual([`https://us21.api.mailchimp.com/3.0/lists/abc123/members/${memberHash("two@news.test")}`]);
    expect((await prisma.newsletterSubscriber.findUnique({ where: { email: "two@news.test" } }))?.mailchimpAt).toBeInstanceOf(Date);
    expect(await sendMailchimpMember({ email: "two@news.test" }, fakeFetch(200, {}))).toMatchObject({ skipped: "Already in the audience" });
    // An address Mailchimp refuses for itself: kept as the card's error, not tried again; Mailchimp away: tried again.
    expect(await sendMailchimpMember({ email: "one@news.test" }, fakeFetch(400, { title: "Invalid Resource", detail: "one@news.test looks fake or invalid" }))).toMatchObject({ refused: "one@news.test looks fake or invalid" });
    expect((await prisma.siteSettings.findFirst())?.mailchimpError).toContain("looks fake");
    await expect(sendMailchimpMember({ email: "one@news.test" }, fakeFetch(503, { title: "Service Unavailable" }))).rejects.toThrow(/Service Unavailable/);
    // The ones from before: only those not in the audience yet.
    expect(await queueAllMailchimp()).toBe(1);
    expect(await prisma.task.count({ where: { kind: MAILCHIMP_TASK, key: { startsWith: "mailchimp:one@news.test:" } } })).toBe(1);
    const sync = (await request(app).post("/v1/admin/newsletter/mailchimp/sync").expect(200)).body;
    expect(sync).toMatchObject({ queued: 1, subscribers: 2, inAudience: 1 });
  });
});
