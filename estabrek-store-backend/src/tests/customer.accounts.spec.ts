import { describe, test, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { applyPolicy, envDefaults, mergePolicy } from "../lib/securityPolicy.js";
import { forgetFeatures } from "../lib/features.js";

/** The admin switch (Settings → حسابات الزبائن). */
async function setAccounts(on: boolean) {
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data: { customerAccountsEnabled: on } });
  forgetFeatures();
}

// Plenty of sign-in requests in this file: lift the per-IP sign-in limit here.
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
  await prisma.customerOtp.deleteMany();
  await resetDb();
  await seedCatalog();
  await setAccounts(true);
});

async function signIn(email = "sara@shop.test") {
  const start = await request(app).post("/v1/customer/auth/start").send({ email }).expect(200);
  expect(start.body.devCode).toMatch(/^\d{6}$/);
  const out = await request(app).post("/v1/customer/auth/verify").send({ email, code: start.body.devCode }).expect(200);
  return out.body as { accessToken: string; refreshToken: string; user: { id: string; email: string }; isNew: boolean };
}

const bearer = (t: string) => `Bearer ${t}`;

describe("Signing in with an email code", () => {
  test("a wrong code is refused, the right one signs in (and creates the account once)", async () => {
    const start = await request(app).post("/v1/customer/auth/start").send({ email: " Sara@Shop.test " }).expect(200);
    await request(app).post("/v1/customer/auth/verify").send({ email: "sara@shop.test", code: start.body.devCode === "000000" ? "111111" : "000000" }).expect(401);
    const ok = await request(app).post("/v1/customer/auth/verify").send({ email: "sara@shop.test", code: start.body.devCode }).expect(200);
    expect(ok.body.isNew).toBe(true);
    expect(ok.body.user.email).toBe("sara@shop.test");
    // A used code doesn't work twice.
    await request(app).post("/v1/customer/auth/verify").send({ email: "sara@shop.test", code: start.body.devCode }).expect(401);
    const again = await signIn();
    expect(again.isNew).toBe(false);
    expect(await prisma.user.count()).toBe(1);
  });

  test("too many wrong codes, or too many codes asked for, are stopped", async () => {
    await request(app).post("/v1/customer/auth/start").send({ email: "x@shop.test" }).expect(200);
    for (let i = 0; i < 5; i++) await request(app).post("/v1/customer/auth/verify").send({ email: "x@shop.test", code: "999999" });
    const out = await request(app).post("/v1/customer/auth/verify").send({ email: "x@shop.test", code: "999999" });
    expect([401, 429]).toContain(out.status);
    expect(out.body.error).toBe("TOO_MANY_ATTEMPTS");
    for (let i = 0; i < 4; i++) await request(app).post("/v1/customer/auth/start").send({ email: "x@shop.test" }).expect(200);
    expect((await request(app).post("/v1/customer/auth/start").send({ email: "x@shop.test" }).expect(429)).body.error).toBe("TOO_MANY_CODES");
  });

  test("refresh rotates the token; signing out ends it", async () => {
    const s = await signIn();
    const r1 = await request(app).post("/v1/customer/auth/refresh").send({ refreshToken: s.refreshToken }).expect(200);
    await request(app).post("/v1/customer/auth/refresh").send({ refreshToken: s.refreshToken }).expect(401);
    await request(app).post("/v1/customer/auth/logout").send({ refreshToken: r1.body.refreshToken }).expect(200);
    await request(app).post("/v1/customer/auth/refresh").send({ refreshToken: r1.body.refreshToken }).expect(401);
  });

  test("shopper and admin tokens never open each other's side", async () => {
    const s = await signIn();
    await request(app).get("/v1/admin/orders").set("Authorization", bearer(s.accessToken)).expect(401);
    const admin = signAccessToken({ sub: "some-admin", role: "SUPERADMIN" });
    await request(app).get("/v1/customer/me").set("Authorization", bearer(admin)).expect(401);
    await request(app).get("/v1/customer/me").expect(401);
  });
});

describe("Her account", () => {
  test("profile", async () => {
    const s = await signIn();
    const out = await request(app)
      .patch("/v1/customer/me")
      .set("Authorization", bearer(s.accessToken))
      .send({ name: "سارة", phone: "0599123456", preferredSize: "M", favoriteColor: "#C76B8A", marketingOptIn: true })
      .expect(200);
    expect(out.body).toMatchObject({ name: "سارة", preferredSize: "M", favoriteColor: "#C76B8A", marketingOptIn: true });
    await request(app).patch("/v1/customer/me").set("Authorization", bearer(s.accessToken)).send({ email: "other@x.test" }).expect(400);
  });

  test("orders placed while signed in show in her account; guest orders don't", async () => {
    const s = await signIn();
    const items = [{ variantId: "cvariant01", quantity: 1 }];
    await request(app).post("/v1/catalog/order-requests").set("Authorization", bearer(s.accessToken)).send({ items, customerName: "سارة", phone: "0599123456" }).expect(201);
    await request(app).post("/v1/catalog/order-requests").send({ items, customerName: "ضيفة", phone: "0599000000" }).expect(201);
    const mine = await request(app).get("/v1/customer/me/orders").set("Authorization", bearer(s.accessToken)).expect(200);
    expect(mine.body.orders).toHaveLength(1);
    expect(mine.body.orders[0]).toMatchObject({ status: "NEW", total: 50 });
    expect(mine.body.orders[0].items[0]).toMatchObject({ productTitle: "Blue Shirt", quantity: 1, unitPrice: 50 });
  });

  test("favourites: the ones saved before signing in are kept, and stay in sync", async () => {
    const s = await signIn();
    const merged = await request(app)
      .post("/v1/customer/me/wishlist/merge")
      .set("Authorization", bearer(s.accessToken))
      .send({ productIds: ["p1", "not-a-product"] })
      .expect(200);
    expect(merged.body.items).toEqual([expect.objectContaining({ id: "p1", slug: "blue-shirt", price: 50, image: "https://example.com/blue.jpg" })]);
    await request(app).delete("/v1/customer/me/wishlist/p1").set("Authorization", bearer(s.accessToken)).expect(200);
    expect((await request(app).get("/v1/customer/me/wishlist").set("Authorization", bearer(s.accessToken))).body.items).toEqual([]);
    await request(app).put("/v1/customer/me/wishlist/p1").set("Authorization", bearer(s.accessToken)).expect(200);
    await request(app).put("/v1/customer/me/wishlist/p1").set("Authorization", bearer(s.accessToken)).expect(200);
    expect((await request(app).get("/v1/customer/me/wishlist").set("Authorization", bearer(s.accessToken))).body.items).toHaveLength(1);
  });

  test("addresses: the first is the default; one default at a time", async () => {
    const s = await signIn();
    const a = { fullName: "سارة", phone: "0599123456", city: "سخنين", address: "شارع الورد 5" };
    const first = await request(app).post("/v1/customer/me/addresses").set("Authorization", bearer(s.accessToken)).send(a).expect(201);
    expect(first.body.isDefault).toBe(true);
    const second = await request(app).post("/v1/customer/me/addresses").set("Authorization", bearer(s.accessToken)).send({ ...a, city: "عرابة", isDefault: true }).expect(201);
    const list = (await request(app).get("/v1/customer/me/addresses").set("Authorization", bearer(s.accessToken))).body.addresses;
    expect(list.filter((x: any) => x.isDefault).map((x: any) => x.id)).toEqual([second.body.id]);
    await request(app).delete(`/v1/customer/me/addresses/${second.body.id}`).set("Authorization", bearer(s.accessToken)).expect(200);
    const after = (await request(app).get("/v1/customer/me/addresses").set("Authorization", bearer(s.accessToken))).body.addresses;
    expect(after).toEqual([expect.objectContaining({ id: first.body.id, isDefault: true })]);
    // Someone else's address can't be touched.
    const other = await signIn("lina@shop.test");
    await request(app).delete(`/v1/customer/me/addresses/${first.body.id}`).set("Authorization", bearer(other.accessToken)).expect(404);
  });
});

describe("Customers in the admin", () => {
  test("search, details, and suspending signs her out everywhere", async () => {
    const s = await signIn();
    await request(app).post("/v1/catalog/order-requests").set("Authorization", bearer(s.accessToken)).send({ items: [{ variantId: "cvariant01", quantity: 1 }], customerName: "سارة", phone: "0599123456" }).expect(201);
    const list = await request(app).get("/v1/admin/customers?q=sara&take=30").expect(200);
    expect(list.body.rows).toEqual([expect.objectContaining({ email: "sara@shop.test", orders: 1 })]);
    const one = await request(app).get(`/v1/admin/customers/${s.user.id}`).expect(200);
    expect(one.body.orders).toHaveLength(1);
    expect(one.body.activeSessions).toBe(1);

    await request(app).patch(`/v1/admin/customers/${s.user.id}`).send({ status: "SUSPENDED" }).expect(200);
    expect((await request(app).post("/v1/customer/auth/refresh").send({ refreshToken: s.refreshToken })).status).toBe(401);
    expect((await request(app).get("/v1/customer/me").set("Authorization", bearer(s.accessToken))).body.error).toBe("ACCOUNT_SUSPENDED");
    // Signing in again isn't possible either.
    const start = await request(app).post("/v1/customer/auth/start").send({ email: "sara@shop.test" }).expect(200);
    expect((await request(app).post("/v1/customer/auth/verify").send({ email: "sara@shop.test", code: start.body.devCode }).expect(403)).body.error).toBe("ACCOUNT_SUSPENDED");
  });
});

describe("The admin switch (accounts are off until the owner turns them on)", () => {
  test("a new store is visitors only", async () => {
    await prisma.siteSettings.deleteMany();
    forgetFeatures();
    const out = await request(app).post("/v1/customer/auth/start").send({ email: "sara@shop.test" }).expect(404);
    expect(out.body.error).toBe("FEATURE_OFF");
    const pub = await request(app).get("/v1/settings").expect(200);
    expect(pub.body.site.customerAccountsEnabled).toBe(false);
  });

  test("off: every account call is refused, orders are guest orders, signing out still works; on again: it all comes back", async () => {
    const s = await signIn();
    const items = [{ variantId: "cvariant01", quantity: 1 }];

    await request(app).patch("/v1/admin/settings").send({ customerAccountsEnabled: false }).expect(200);
    expect((await request(app).get("/v1/customer/me").set("Authorization", bearer(s.accessToken)).expect(404)).body.error).toBe("FEATURE_OFF");
    await request(app).post("/v1/customer/auth/refresh").send({ refreshToken: s.refreshToken }).expect(404);
    // Buying still works, as a guest (the old token is ignored).
    await request(app).post("/v1/catalog/order-requests").set("Authorization", bearer(s.accessToken)).send({ items, customerName: "سارة", phone: "0599123456" }).expect(201);
    expect(await prisma.orderRequest.count({ where: { userId: { not: null } } })).toBe(0);
    await new Promise((r) => setTimeout(r, 20));
    expect((await request(app).get("/v1/settings").expect(200)).body.site.customerAccountsEnabled).toBe(false);

    await request(app).patch("/v1/admin/settings").send({ customerAccountsEnabled: true }).expect(200);
    expect((await request(app).get("/v1/customer/me").set("Authorization", bearer(s.accessToken)).expect(200)).body.email).toBe("sara@shop.test");
    expect((await request(app).get("/v1/admin/customers").expect(200)).body.accountsEnabled).toBe(true);
    // The switch is part of the settings history.
    const revs = await prisma.settingsRevision.findMany({ orderBy: { createdAt: "desc" }, take: 2 });
    expect(revs.map((r) => r.changed)).toEqual([["customerAccountsEnabled"], ["customerAccountsEnabled"]]);

    await request(app).patch("/v1/admin/settings").send({ customerAccountsEnabled: false }).expect(200);
    await request(app).post("/v1/customer/auth/logout").send({ refreshToken: s.refreshToken }).expect(200);
    await setAccounts(true);
    await request(app).post("/v1/customer/auth/refresh").send({ refreshToken: s.refreshToken }).expect(401);
  });
});
