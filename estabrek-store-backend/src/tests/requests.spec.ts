import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";
import { env } from "../config/env.js";
import { REQUESTS_DEFAULTS } from "../modules/requests/requests.settings.js";
import { RAZAN_DEFAULTS } from "../modules/razan/razan.settings.js";
import { cloudinaryPhotos, purgeOldPhotos, setPhotoStorage, type PhotoStorage } from "../modules/requests/requests.service.js";

const stored = new Map<string, Buffer>();
const memory: PhotoStorage = {
  ready: () => true,
  put: async (data) => {
    const location = `req/${stored.size + 1}`;
    stored.set(location, data);
    return { location };
  },
  remove: async (l) => void stored.delete(l),
  link: async (l) => `https://photos.test/${l}?sig=1`,
};

const storefrontUrl = env.STOREFRONT_URL;
let png: Buffer;

async function settings(patch: Record<string, unknown>) {
  await request(app).put("/v1/admin/requests-settings").send({ ...REQUESTS_DEFAULTS, ...patch }).expect(200);
}

beforeEach(async () => {
  stored.clear();
  setPhotoStorage(memory);
  (env as any).STOREFRONT_URL = storefrontUrl;
  await prisma.customerRequest.deleteMany();
  await request(app).put("/v1/admin/requests-settings").send(REQUESTS_DEFAULTS).expect(200);
  await resetDb();
  await prisma.category.create({ data: { id: "creqcat0001", name: "عبايات", slug: "abayas-r" } });
  await prisma.size.create({ data: { id: "creqsize001", name: "M" } });
  await prisma.product.create({
    data: {
      id: "creqprod001", title: "عباية كريب", slug: "crepe-abaya-r", isActive: true, categoryId: "creqcat0001",
      items: { create: [{ colorName: "أسود", skuBase: "AB-R", variants: { create: [{ id: "creqvar0001", sku: "AB-R-M", price: new Prisma.Decimal(200), stock: 0, size: { connect: { id: "creqsize001" } } }] } }] },
    },
  });
  png ??= await sharp({ create: { width: 40, height: 30, channels: 3, background: "#7a2346" } }).jpeg().withMetadata({ exif: { IFD0: { Make: "PhoneCo" } } }).toBuffer();
});
afterAll(() => {
  setPhotoStorage(cloudinaryPhotos);
  (env as any).STOREFRONT_URL = storefrontUrl;
});

const ask = (fields: Record<string, string>, photos = 0) => {
  const r = request(app).post("/v1/requests");
  for (const [k, v] of Object.entries(fields)) r.field(k, v);
  for (let i = 0; i < photos; i++) r.attach("photos", png, { filename: `p${i}.jpg`, contentType: "image/jpeg" });
  return r;
};
const base = { name: "سارة أحمد", phone: "0599123456" };

describe("«اطلبي قطعتكِ»", () => {
  test("off until the owner turns it on; only the kinds she allows; photos are cleaned and capped", async () => {
    expect((await ask({ ...base, kind: "SIZE", wantedSize: "XL" }).expect(404)).body.error).toBe("FEATURE_OFF");
    await settings({ enabled: true, maxPhotos: 2, kinds: { size: true, color: false, newPiece: true } });

    const made = await ask({ ...base, kind: "SIZE", wantedSize: "XL", productId: "creqprod001", variantId: "creqvar0001", email: "Sara@Example.com", details: "بدي نفس العباية بمقاس أكبر" }, 3).expect(201);
    const row = await prisma.customerRequest.findUnique({ where: { id: made.body.id } });
    expect(row).toMatchObject({ kind: "SIZE", status: "NEW", wantedSize: "XL", productId: "creqprod001", variantId: "creqvar0001", email: "sara@example.com" });
    expect((row!.photos as any[]).length).toBe(2);
    // Re-encoded to webp, no camera data left.
    const first = stored.get((row!.photos as any[])[0].location)!;
    const meta = await sharp(first).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();

    expect((await ask({ ...base, kind: "COLOR", wantedColor: "زيتي" }).expect(400)).body.error).toBe("KIND_OFF");
    await ask({ ...base, phone: "12" , kind: "NEW_PIECE" }).expect(400);
    // A product that doesn't exist is just ignored.
    const loose = await ask({ ...base, phone: "0599000111", kind: "NEW_PIECE", productId: "nope", details: "حجاب شيفون زيتي" }).expect(201);
    expect((await prisma.customerRequest.findUnique({ where: { id: loose.body.id } }))!.productId).toBeNull();
  });

  test("a few requests per phone a day", async () => {
    await settings({ enabled: true, perPhoneDay: 2 });
    await ask({ ...base, kind: "NEW_PIECE" }).expect(201);
    await ask({ ...base, phone: "+972599123456", kind: "NEW_PIECE" }).expect(201);
    expect((await ask({ ...base, kind: "NEW_PIECE" }).expect(429)).body.error).toBe("TOO_MANY_REQUESTS");
  });

  test("«بدي حدا يحكيني» needs Razan's guided ordering on, and takes no photos", async () => {
    expect((await ask({ ...base, kind: "CALLBACK" }).expect(404)).body.error).toBe("FEATURE_OFF");
    await request(app).put("/v1/admin/razan").send({ ...RAZAN_DEFAULTS, helpOrder: { ...RAZAN_DEFAULTS.helpOrder, enabled: true } }).expect(200);
    const r = await ask({ ...base, kind: "CALLBACK", productId: "creqprod001", source: "RAZAN_HELP" }, 2).expect(201);
    const row = await prisma.customerRequest.findUnique({ where: { id: r.body.id } });
    expect(row).toMatchObject({ kind: "CALLBACK", source: "RAZAN_HELP" });
    expect(row!.photos).toEqual([]);
    await request(app).put("/v1/admin/razan").send(RAZAN_DEFAULTS).expect(200);
  });
});

describe("The admin inbox", () => {
  test("list, open with photo links, work on it, link the piece and tell her", async () => {
    await settings({ enabled: true });
    const a = await ask({ ...base, kind: "SIZE", wantedSize: "XL", productId: "creqprod001", email: "sara@example.com" }, 1).expect(201);
    await ask({ ...base, phone: "0599222333", kind: "SIZE", wantedSize: "XL" }).expect(201);
    await ask({ ...base, phone: "0599222444", kind: "NEW_PIECE", wantedColor: "زيتي" }).expect(201);

    const list = await request(app).get("/v1/admin/requests?status=OPEN").expect(200);
    expect(list.body.total).toBe(3);
    expect(list.body.requests[2]).toMatchObject({ kind: "SIZE", photoCount: 1, product: { title: "عباية كريب" } });
    expect((await request(app).get("/v1/admin/requests?q=0599222444").expect(200)).body.total).toBe(1);

    const one = await request(app).get(`/v1/admin/requests/${a.body.id}`).expect(200);
    expect(one.body.photos[0].url).toMatch(/^https:\/\/photos\.test\//);

    const sum = await request(app).get("/v1/admin/requests/summary").expect(200);
    expect(sum.body.sizes).toEqual([{ value: "XL", count: 2 }]);
    expect(sum.body.colors).toEqual([{ value: "زيتي", count: 1 }]);
    expect(sum.body.products).toEqual([expect.objectContaining({ title: "عباية كريب", count: 1 })]);

    await request(app).patch(`/v1/admin/requests/${a.body.id}`).send({ status: "SEARCHING", adminNote: "سألت المورّد" }).expect(200);
    expect((await request(app).post(`/v1/admin/requests/${a.body.id}/notify`).expect(409)).body.error).toBe("NO_PRODUCT");
    await request(app).patch(`/v1/admin/requests/${a.body.id}`).send({ linkedProductId: "nope" }).expect(400);
    await request(app).patch(`/v1/admin/requests/${a.body.id}`).send({ linkedProductId: "creqprod001" }).expect(200);
    (env as any).STOREFRONT_URL = "https://shop.test";
    const told = await request(app).post(`/v1/admin/requests/${a.body.id}/notify`).expect(200);
    expect(told.body.whatsappText).toContain("عباية كريب");
    expect(told.body.whatsappText).toContain("https://shop.test/p/crepe-abaya-r");
    const after = await prisma.customerRequest.findUnique({ where: { id: a.body.id } });
    expect(after).toMatchObject({ status: "FOUND", adminNote: "سألت المورّد" });
    expect(after!.notifiedAt).not.toBeNull();

    await request(app).delete(`/v1/admin/requests/${a.body.id}`).expect(200);
    expect(stored.size).toBe(0);
  });

  test("old photos are deleted after the owner's days; the request stays", async () => {
    await settings({ enabled: true, photoDays: 30 });
    const r = await ask({ ...base, kind: "NEW_PIECE" }, 2).expect(201);
    await prisma.customerRequest.update({ where: { id: r.body.id }, data: { createdAt: new Date(Date.now() - 31 * 24 * 3600_000) } });
    expect(await purgeOldPhotos()).toEqual({ requests: 1, photos: 2 });
    const row = await prisma.customerRequest.findUnique({ where: { id: r.body.id } });
    expect(row!.photos).toEqual([]);
    expect(row!.photosDeletedAt).not.toBeNull();
    expect(stored.size).toBe(0);
  });

  test("the features page switches it", async () => {
    const f = (await request(app).get("/v1/admin/features").expect(200)).body.groups.flatMap((g: any) => g.features).find((x: any) => x.key === "requests");
    expect(f).toMatchObject({ enabled: false, link: "/admin/requests" });
    await request(app).patch("/v1/admin/features/requests").send({ enabled: true }).expect(200);
    expect((await request(app).get("/v1/admin/requests-settings").expect(200)).body.settings.enabled).toBe(true);
  });
});
