import { describe, test, expect, beforeEach, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import { env } from "../config/env.js";
import { applyPolicy, envDefaults, mergePolicy } from "../lib/securityPolicy.js";
import { forgetFeatures } from "../lib/features.js";
import { sweepStockAlerts, PER_IP_PER_HOUR } from "../modules/stockAlerts/stockAlerts.service.js";
import { maskEmail } from "../modules/admin/stockAlerts.controller.js";

/** The admin switch (المخزون → تنبيهات التوفّر). */
async function setAlerts(on: boolean) {
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data: { stockAlertsEnabled: on } });
  forgetFeatures();
}
const soldOut = () => prisma.productVariant.update({ where: { id: "cvariant01" }, data: { stock: 0 } });
const restock = (n = 2) => prisma.productVariant.update({ where: { id: "cvariant01" }, data: { stock: n } });
const ask = (email: string, variantId = "cvariant01") => request(app).post("/v1/stock-alerts").send({ email, variantId });

const saved = { key: env.RESEND_API_KEY, from: env.EMAIL_FROM, url: env.STOREFRONT_URL };
/** Pretend Resend is set up; returns the emails "sent". */
function fakeResend(status = 200) {
  (env as any).RESEND_API_KEY = "re_test_123";
  (env as any).EMAIL_FROM = "استبرق <hello@estabrek.test>";
  (env as any).STOREFRONT_URL = "https://shop.estabrek.test";
  const sent: any[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: any) => {
      sent.push({ ...JSON.parse(init.body), idempotencyKey: init.headers["Idempotency-Key"] });
      return new Response(JSON.stringify(status < 400 ? { id: `em_${sent.length}` } : { message: "nope" }), { status });
    }),
  );
  return sent;
}

beforeAll(async () => {
  const relaxed = mergePolicy({ rateLimit: { auth: 500 } });
  await prisma.securityPolicy.upsert({ where: { id: "default" }, create: { id: "default", data: relaxed as any }, update: { data: relaxed as any } });
  applyPolicy(relaxed);
});
afterAll(async () => {
  await prisma.securityPolicy.deleteMany();
  applyPolicy(envDefaults());
  await setAlerts(false);
});
beforeEach(async () => {
  await prisma.stockAlert.deleteMany();
  await resetDb();
  await seedCatalog();
  await setAlerts(true);
});
afterEach(() => {
  vi.unstubAllGlobals();
  Object.assign(env, { RESEND_API_KEY: saved.key, EMAIL_FROM: saved.from, STOREFRONT_URL: saved.url });
});

describe("Leaving an email on a sold-out size", () => {
  test("off by default: no sign-ups, and the storefront is told so", async () => {
    await setAlerts(false);
    await soldOut();
    expect((await ask("sara@shop.test").expect(404)).body.error).toBe("FEATURE_OFF");
    expect((await request(app).get("/v1/settings").expect(200)).body.site.stockAlertsEnabled).toBe(false);
  });

  test("only for sold-out sizes; asking twice keeps one alert", async () => {
    expect((await ask("sara@shop.test").expect(409)).body.error).toBe("IN_STOCK");
    await soldOut();
    await ask(" Sara@Shop.test ").expect(201);
    await ask("sara@shop.test").expect(201);
    expect(await prisma.stockAlert.count()).toBe(1);
    await ask("x@shop.test", "cnotavariant").expect(404);
    await request(app).post("/v1/stock-alerts").send({ email: "not-an-email", variantId: "cvariant01" }).expect(400);
  });

  test("one visitor can't flood it", async () => {
    await soldOut();
    for (let i = 0; i < PER_IP_PER_HOUR; i++) await ask(`s${i}@shop.test`).expect(201);
    expect((await ask("one-more@shop.test").expect(429)).body.error).toBe("TOO_MANY_ALERTS");
  });
});

describe("The email when it's back", () => {
  test("nothing goes out (and nothing is lost) until email is set up", async () => {
    await soldOut();
    await ask("sara@shop.test").expect(201);
    await restock();
    expect(await sweepStockAlerts()).toMatchObject({ sent: 0 });
    expect((await prisma.stockAlert.findFirst())!.status).toBe("WAITING");
  });

  test("back in stock → one email with the piece and a stop link; never twice", async () => {
    const sent = fakeResend();
    await soldOut();
    await ask("sara@shop.test").expect(201);
    expect((await sweepStockAlerts()).sent).toBe(0); // still sold out
    await restock();
    expect(await sweepStockAlerts()).toMatchObject({ checked: 1, sent: 1 });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(["sara@shop.test"]);
    expect(sent[0].subject).toContain("Blue Shirt");
    expect(sent[0].html).toContain("https://shop.estabrek.test/p/blue-shirt");
    expect(sent[0].html).toContain("https://example.com/blue.jpg");
    expect(sent[0].html).toMatch(/\/stock-alert\/stop\?t=/);
    expect(sent[0].idempotencyKey).toMatch(/^stock-alert-/);
    const a = (await prisma.stockAlert.findFirst())!;
    expect(a.status).toBe("SENT");
    expect(a.notifiedAt).not.toBeNull();
    expect((await sweepStockAlerts()).sent).toBe(0);
    expect(sent).toHaveLength(1);
  });

  test("a hidden piece doesn't send; a failed send is retried, then given up", async () => {
    const sent = fakeResend(500);
    await soldOut();
    await ask("sara@shop.test").expect(201);
    await restock();
    await prisma.product.update({ where: { id: "p1" }, data: { isActive: false } });
    expect((await sweepStockAlerts()).checked).toBe(0);
    await prisma.product.update({ where: { id: "p1" }, data: { isActive: true } });
    for (let i = 0; i < 3; i++) await sweepStockAlerts();
    expect(sent).toHaveLength(3);
    const a = (await prisma.stockAlert.findFirst())!;
    expect(a).toMatchObject({ status: "FAILED", attempts: 3 });
  });

  test("the stop link stops it (or all of hers)", async () => {
    await soldOut();
    await ask("sara@shop.test").expect(201);
    const token = (await prisma.stockAlert.findFirst())!.token;
    const out = await request(app).post("/v1/stock-alerts/stop").send({ token }).expect(200);
    expect(out.body).toMatchObject({ stopped: 1, productTitle: "Blue Shirt" });
    expect((await prisma.stockAlert.findFirst())!.status).toBe("CANCELLED");
    // Asking again starts a new wait with a new link.
    await ask("sara@shop.test").expect(201);
    const again = (await prisma.stockAlert.findFirst())!;
    expect(again.status).toBe("WAITING");
    expect(again.token).not.toBe(token);
    await request(app).post("/v1/stock-alerts/stop").send({ token: again.token, all: true }).expect(200);
    await request(app).post("/v1/stock-alerts/stop").send({ token: "x".repeat(32) }).expect(404);
  });
});

describe("In the admin", () => {
  test("who waits for what, cancel one, send now; switch from settings", async () => {
    await soldOut();
    await ask("sara@shop.test").expect(201);
    await ask("lina@shop.test").expect(201);
    const view = await request(app).get("/v1/admin/stock-alerts").expect(200);
    expect(view.body).toMatchObject({ enabled: true, totals: { waiting: 2 } });
    expect(view.body.pieces).toEqual([expect.objectContaining({ variantId: "cvariant01", productTitle: "Blue Shirt", colorName: "Blue", sizeName: "M", waiting: 2, stock: 0 })]);
    expect(view.body.recent.map((r: any) => r.email).sort()).toEqual(["lina@shop.test", "sara@shop.test"]);

    await request(app).delete(`/v1/admin/stock-alerts/${view.body.recent[0].id}`).expect(200);
    await request(app).delete(`/v1/admin/stock-alerts/${view.body.recent[0].id}`).expect(404);

    const sent = fakeResend();
    await restock();
    expect((await request(app).post("/v1/admin/stock-alerts/send-now").expect(200)).body.sent).toBe(1);
    expect(sent).toHaveLength(1);

    await request(app).patch("/v1/admin/settings").send({ stockAlertsEnabled: false }).expect(200);
    expect((await request(app).get("/v1/admin/stock-alerts").expect(200)).body.enabled).toBe(false);
    await soldOut();
    await ask("new@shop.test").expect(404);
  });

  test("emails are hidden from members who can't see customers", () => {
    expect(maskEmail("sara@gmail.com")).toBe("s•••@gmail.com");
    expect(maskEmail("broken")).toBe("•••");
  });
});
