import { describe, test, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import { applyPolicy, envDefaults, mergePolicy } from "../lib/securityPolicy.js";
import { forgetFeatures } from "../lib/features.js";
import { TRACK_TRIES, orderSteps, resetTrackTriesForTests } from "../modules/catalog/orderTrack.service.js";

// Where her order is: each step and when, in her account, and «تابعي طلبكِ» without one (the order number and
// the phone it was placed with; never her name, phone or address).

async function setAccounts(on: boolean) {
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data: { customerAccountsEnabled: on } });
  forgetFeatures();
}
beforeAll(async () => {
  const relaxed = mergePolicy({ rateLimit: { auth: 500 } });
  await prisma.securityPolicy.upsert({ where: { id: "default" }, create: { id: "default", data: relaxed as any }, update: { data: relaxed as any } });
  applyPolicy(relaxed);
});
afterAll(async () => {
  await prisma.securityPolicy.deleteMany();
  applyPolicy(envDefaults());
  await setAccounts(false);
});
beforeEach(async () => {
  resetTrackTriesForTests();
  await prisma.customerOtp.deleteMany();
  await resetDb();
  await seedCatalog();
  await setAccounts(true);
});

const items = [{ variantId: "cvariant01", quantity: 2 }];
const place = async (auth?: string) => {
  const r = request(app).post("/v1/catalog/order-requests");
  if (auth) r.set("Authorization", `Bearer ${auth}`);
  const out = await r.send({ items, customerName: "سارة حداد", phone: "0599123456", city: "رام الله", address: "شارع الإرسال 12" }).expect(201);
  return out.body.id as string;
};
const move = (id: string, toStatus: string) => request(app).patch(`/v1/admin/orders/${id}/status`).send({ toStatus }).expect(200);

describe("where the order is", () => {
  test("the steps: placed first, then each status once, oldest first", () => {
    const at = (m: number) => new Date(Date.UTC(2026, 10, 1, 10, m));
    expect(orderSteps(at(0), [{ toStatus: "SHIPPED", at: at(30) }, { toStatus: "ACCEPTED", at: at(10) }, { toStatus: "ACCEPTED", at: at(20) }])).toEqual([
      { status: "NEW", at: at(0).toISOString() },
      { status: "ACCEPTED", at: at(10).toISOString() },
      { status: "SHIPPED", at: at(30).toISOString() },
    ]);
  });

  test("her account shows each order's steps", async () => {
    const start = await request(app).post("/v1/customer/auth/start").send({ email: "sara@shop.test" }).expect(200);
    const s = (await request(app).post("/v1/customer/auth/verify").send({ email: "sara@shop.test", code: start.body.devCode }).expect(200)).body;
    const id = await place(s.accessToken);
    await move(id, "ACCEPTED");
    await move(id, "SHIPPED");
    const mine = (await request(app).get("/v1/customer/me/orders").set("Authorization", `Bearer ${s.accessToken}`).expect(200)).body.orders;
    expect(mine[0].status).toBe("SHIPPED");
    expect(mine[0].steps.map((x: { status: string }) => x.status)).toEqual(["NEW", "ACCEPTED", "SHIPPED"]);
    expect(mine[0]).not.toHaveProperty("history");
  });

  test("without an account: the number (whole or its last 8) and the phone; nothing personal comes back", async () => {
    const id = await place();
    await move(id, "ACCEPTED");
    const last8 = id.slice(-8);
    for (const order of [id, last8, `#${last8.toUpperCase()}`]) {
      const out = (await request(app).post("/v1/catalog/order-requests/track").send({ order, phone: "+970 599 123 456" }).expect(200)).body;
      expect(out).toMatchObject({ order: last8, status: "ACCEPTED", city: "رام الله", total: expect.any(Number) });
      expect(out.steps.map((x: { status: string }) => x.status)).toEqual(["NEW", "ACCEPTED"]);
      expect(out.items[0]).toMatchObject({ productTitle: "Blue Shirt", quantity: 2 });
      expect(JSON.stringify(out)).not.toMatch(/سارة|0599123456|599123456|الإرسال/);
    }
    // A wrong phone and a wrong number look the same.
    expect((await request(app).post("/v1/catalog/order-requests/track").send({ order: last8, phone: "0599000000" }).expect(404)).body.error).toBe("ORDER_NOT_FOUND");
    expect((await request(app).post("/v1/catalog/order-requests/track").send({ order: "zzzzzzzz", phone: "0599123456" }).expect(404)).body.error).toBe("ORDER_NOT_FOUND");
    await request(app).post("/v1/catalog/order-requests/track").send({ order: "abc", phone: "0599123456" }).expect(400);
  });

  test("a few tries per address: numbers can't be guessed", async () => {
    const id = await place();
    for (let i = 0; i < TRACK_TRIES; i++) await request(app).post("/v1/catalog/order-requests/track").send({ order: `zzzzzz${String(i).padStart(2, "0")}`, phone: "0599123456" }).expect(404);
    expect((await request(app).post("/v1/catalog/order-requests/track").send({ order: id, phone: "0599123456" }).expect(429)).body.error).toBe("TOO_MANY_TRIES");
  });
});
