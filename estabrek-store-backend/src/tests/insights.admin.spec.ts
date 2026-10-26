import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";

// Stock forecast (admin → توقّع المخزون) with the database. Requests without a
// token run as the test owner.

const DAY = 86400_000;

async function clean() {
  await prisma.sellingSettings.deleteMany();
  await resetDb();
}

/** An accepted order (its stock already taken, so it holds nothing) `daysAgo` days ago. */
async function sold(qty: number, daysAgo: number) {
  await prisma.orderRequest.create({
    data: {
      variantId: "cvariant01",
      quantity: qty,
      customerName: "Test",
      phone: "0590000000",
      status: "ACCEPTED",
      stockCommitted: true,
      createdAt: new Date(Date.now() - daysAgo * DAY),
      items: { create: [{ variantId: "cvariant01", quantity: qty, unitPrice: new Prisma.Decimal(50), lineSubtotal: new Prisma.Decimal(50 * qty), productId: "p1", productTitle: "Blue Shirt" }] },
    },
  });
}

beforeEach(async () => {
  await clean();
  await seedCatalog();
  // A second product on the shelf for 40 days that nobody looked at.
  await prisma.product.create({
    data: {
      id: "p2",
      slug: "old-scarf",
      title: "Old Scarf",
      isActive: true,
      categoryId: "c2",
      createdAt: new Date(Date.now() - 40 * DAY),
      items: { create: [{ id: "i2", colorName: "Grey", skuBase: "", variants: { create: [{ id: "cvariant02", sku: "SKU-GREY-M", price: new Prisma.Decimal(80), stock: 5, size: { connect: { id: "s1" } } }] } }] },
    },
  });
});
afterAll(clean);

describe("Stock forecast", () => {
  test("pace, days left, reorder; and what nobody looked at", async () => {
    // 14 pieces this week (2 a day), none before: pace ½·2 + ½·(14/28) = 1.25 a day; 10 left → 8 days.
    for (let d = 0; d < 7; d++) await sold(2, d + 0.2);
    const out = await request(app).get("/v1/admin/insights/stock").expect(200);
    const p1 = out.body.products.find((p: any) => p.productId === "p1");
    expect(p1.variants[0]).toMatchObject({ sku: "SKU-BLUE-M", stock: 10, available: 10, sold7: 14, soldWindow: 14, pace: 1.3, daysLeft: 8, status: "watch" });
    // Lead 7 + cover 30 at 1.25 a day = 47, minus 10.
    expect(p1.variants[0].reorder).toBe(37);
    expect(out.body.unseen).toEqual([expect.objectContaining({ productId: "p2", stock: 5, stockValue: 400, lastViewedAt: null })]);
    expect(out.body.summary).toMatchObject({ unseen: 1, unseenValue: 400, reorderPieces: 37 });
    expect(out.body.defaults).toMatchObject({ leadDays: 7 });
  });

  test("a longer delivery time makes it urgent; the numbers are saved", async () => {
    for (let d = 0; d < 7; d++) await sold(2, d + 0.2);
    await request(app).patch("/v1/admin/insights/stock/settings").send({ leadDays: 14 }).expect(200);
    await request(app).patch("/v1/admin/insights/stock/settings").send({ leadDays: 400 }).expect(400);
    const out = await request(app).get("/v1/admin/insights/stock").expect(200);
    expect(out.body.settings.leadDays).toBe(14);
    expect(out.body.products.find((p: any) => p.productId === "p1").status).toBe("soon");
  });

  test("rejected and canceled orders don't count as sold", async () => {
    await sold(3, 1);
    await prisma.orderRequest.updateMany({ data: { status: "REJECTED" } });
    const out = await request(app).get("/v1/admin/insights/stock").expect(200);
    expect(out.body.products.find((p: any) => p.productId === "p1").variants[0]).toMatchObject({ sold7: 0, status: "noSales" });
  });
});
