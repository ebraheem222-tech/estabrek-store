import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";

// Sale rules and seasons (admin → البيع الذكي) with the database. Requests
// without a token run as the test owner. The seeded size: SKU-BLUE-M, ₪50, 10 left.

const DAY = 86400_000;
const variant = () => prisma.productVariant.findUniqueOrThrow({ where: { id: "cvariant01" } });

async function clean() {
  await prisma.priceAction.deleteMany();
  await prisma.saleSuggestionSkip.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.sellingSettings.deleteMany();
  await prisma.settingsRevision.deleteMany();
  await prisma.siteSettings.deleteMany();
  await resetDb();
}

beforeEach(async () => {
  await clean();
  await seedCatalog();
  // On the shelf for 40 days, nobody looked: the "unseen" rule suggests 10% off.
  await prisma.product.update({ where: { id: "p1" }, data: { createdAt: new Date(Date.now() - 40 * DAY) } });
});
afterAll(clean);

describe("Sale rules", () => {
  test("a suggestion, the owner's yes, and undo", async () => {
    const list = await request(app).get("/v1/admin/selling/suggestions").expect(200);
    expect(list.body.suggestions).toEqual([expect.objectContaining({ rule: "unseen", productId: "p1", why: expect.objectContaining({ price: 50, newPrice: 45 }) })]);

    const yes = await request(app).post("/v1/admin/selling/suggestions/approve").send({ items: [{ rule: "unseen", productId: "p1" }] }).expect(200);
    expect(yes.body.results[0]).toMatchObject({ ok: true, changed: 1 });
    const v = await variant();
    expect(Number(v.salePrice)).toBe(45);
    expect(Number(v.originalPrice)).toBe(50);
    expect(v.saleEndsAt!.getTime() - Date.now()).toBeGreaterThan(13 * DAY);
    // Not suggested again while it's on.
    expect((await request(app).get("/v1/admin/selling/suggestions").expect(200)).body.suggestions).toEqual([]);

    const undo = await request(app).post(`/v1/admin/selling/actions/${yes.body.results[0].actionId}/undo`).expect(200);
    expect(undo.body).toEqual({ restored: 1, changedSince: 0 });
    const back = await variant();
    expect(back.salePrice).toBeNull();
    expect(back.saleEndsAt).toBeNull();
    await request(app).post(`/v1/admin/selling/actions/${yes.body.results[0].actionId}/undo`).expect(409);
  });

  test("a size changed since stays as the owner left it", async () => {
    const yes = await request(app).post("/v1/admin/selling/suggestions/approve").send({ items: [{ rule: "unseen", productId: "p1", percent: 20 }] }).expect(200);
    expect(Number((await variant()).salePrice)).toBe(40);
    await prisma.productVariant.update({ where: { id: "cvariant01" }, data: { salePrice: 35 } });
    const undo = await request(app).post(`/v1/admin/selling/actions/${yes.body.results[0].actionId}/undo`).expect(200);
    expect(undo.body).toEqual({ restored: 0, changedSince: 1 });
    expect(Number((await variant()).salePrice)).toBe(35);
  });

  test("“only 2 left and popular → end its discount” takes the price back", async () => {
    await prisma.productVariant.update({ where: { id: "cvariant01" }, data: { originalPrice: 50, salePrice: 40, saleStartsAt: new Date(Date.now() - DAY), saleEndsAt: new Date(Date.now() + 5 * DAY) } });
    const yes = await request(app).post("/v1/admin/selling/suggestions/approve").send({ items: [{ rule: "hotLowStock", productId: "p1" }] }).expect(200);
    expect(yes.body.results[0]).toMatchObject({ ok: true, changed: 1 });
    const v = await variant();
    expect(Number(v.price)).toBe(50);
    expect(v.salePrice).toBeNull();
  });

  test("“no” hides a suggestion for a while; rules can be switched off", async () => {
    await request(app).post("/v1/admin/selling/suggestions/skip").send({ rule: "unseen", productId: "p1", days: 30 }).expect(200);
    expect((await request(app).get("/v1/admin/selling/suggestions").expect(200)).body.suggestions).toEqual([]);
    await prisma.saleSuggestionSkip.deleteMany();
    await request(app).patch("/v1/admin/selling/rules").send({ unseen: { on: false } }).expect(200);
    expect((await request(app).get("/v1/admin/selling/suggestions").expect(200)).body.suggestions).toEqual([]);
    await request(app).patch("/v1/admin/selling/rules").send({ unseen: { percent: 95 } }).expect(400);
  });
});

describe("Seasons", () => {
  const season = (over: Record<string, unknown> = {}) => ({
    name: "رمضان",
    startsAt: new Date(Date.now() - 60_000).toISOString(),
    endsAt: new Date(Date.now() + 2 * DAY).toISOString(),
    themePresetId: "luxury_gold",
    percentOff: 20,
    categoryIds: ["c2"],
    ...over,
  });

  test("starts with its theme and prices, and ending it puts both back", async () => {
    await prisma.siteSettings.create({ data: { header: { theme: { presetId: "estabrak_soft_gold", mode: "dark" } } } });
    const made = await request(app).post("/v1/admin/selling/campaigns").send(season()).expect(201);
    expect(made.body.campaign).toMatchObject({ status: "running", themeBefore: "estabrak_soft_gold" });
    expect(((await prisma.siteSettings.findFirstOrThrow()).header as any).theme).toEqual({ presetId: "luxury_gold", mode: "dark" });
    const v = await variant();
    expect(Number(v.salePrice)).toBe(40);
    expect(v.saleEndsAt!.toISOString()).toBe(new Date(made.body.campaign.endsAt).toISOString());

    const ended = await request(app).post(`/v1/admin/selling/campaigns/${made.body.campaign.id}/end`).expect(200);
    expect(ended.body.campaign).toMatchObject({ status: "canceled", log: expect.objectContaining({ end: expect.objectContaining({ restored: 1, themeBack: true, early: true }) }) });
    expect(((await prisma.siteSettings.findFirstOrThrow()).header as any).theme.presetId).toBe("estabrak_soft_gold");
    expect((await variant()).salePrice).toBeNull();
    // Both changes are in the settings history.
    expect((await prisma.settingsRevision.findMany()).map((r) => r.note).sort()).toEqual(["بداية «رمضان»", "نهاية «رمضان»"]);
  });

  test("a theme the owner chose during the season stays at its end", async () => {
    await prisma.siteSettings.create({ data: { header: { theme: { presetId: "estabrak_soft_gold" } } } });
    const made = await request(app).post("/v1/admin/selling/campaigns").send(season({ percentOff: null })).expect(201);
    const s = await prisma.siteSettings.findFirstOrThrow();
    await prisma.siteSettings.update({ where: { id: s.id }, data: { header: { theme: { presetId: "ocean_mist" } } } });
    await request(app).post(`/v1/admin/selling/campaigns/${made.body.campaign.id}/end`).expect(200);
    expect(((await prisma.siteSettings.findFirstOrThrow()).header as any).theme.presetId).toBe("ocean_mist");
  });

  test("checks: two themes at once, nothing to do, already over; editing only before the start", async () => {
    const later = { startsAt: new Date(Date.now() + 5 * DAY).toISOString(), endsAt: new Date(Date.now() + 9 * DAY).toISOString() };
    const a = await request(app).post("/v1/admin/selling/campaigns").send(season(later)).expect(201);
    expect(a.body.campaign.status).toBe("scheduled");
    await request(app).post("/v1/admin/selling/campaigns").send(season({ ...later, name: "عيد" })).expect(409);
    await request(app).post("/v1/admin/selling/campaigns").send(season({ themePresetId: null, percentOff: null })).expect(400);
    await request(app).post("/v1/admin/selling/campaigns").send(season({ endsAt: new Date(Date.now() - DAY).toISOString(), startsAt: new Date(Date.now() - 2 * DAY).toISOString() })).expect(400);
    await request(app).patch(`/v1/admin/selling/campaigns/${a.body.campaign.id}`).send(season({ ...later, percentOff: 30 })).expect(200);
    const preview = await request(app).post("/v1/admin/selling/campaigns/preview").send({ percentOff: 30, categoryIds: ["c1"] }).expect(200);
    // c2 is inside c1: its product counts.
    expect(preview.body).toEqual({ products: 1, sizes: 1, onSaleAlready: 0 });
  });
});
