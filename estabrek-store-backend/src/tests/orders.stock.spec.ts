import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";
import { submitOrderRequest } from "../modules/catalog/catalog.service.js";

// Ids must look like cuids for the schemas.
const V = "cvarstock01"; // stock 2
const W = "cvarstock02"; // stock 5

async function seed() {
  await prisma.orderRequestItem.deleteMany();
  await resetDb();
  await prisma.category.create({ data: { id: "ccatstock01", name: "Hijab", slug: "hijab" } });
  await prisma.size.create({ data: { id: "csizeone001", name: "One Size" } });
  await prisma.product.create({
    data: {
      id: "cprodstock1", title: "Silk Hijab", slug: "silk-hijab", isActive: true, categoryId: "ccatstock01",
      items: {
        create: [{
          colorName: "Beige", skuBase: "HIJ-BEI",
          variants: {
            create: [
              { id: V, sku: "HIJ-BEI-1", price: new Prisma.Decimal(60), stock: 2, size: { connect: { id: "csizeone001" } } },
            ],
          },
        }, {
          colorName: "Navy", skuBase: "HIJ-NAV",
          variants: { create: [{ id: W, sku: "HIJ-NAV-1", price: new Prisma.Decimal(60), stock: 5, size: { connect: { id: "csizeone001" } } }] },
        }],
      },
    },
  });
}

const order = (items: Array<{ variantId: string; quantity: number }>) =>
  request(app).post("/v1/catalog/order-requests").send({ items, customerName: "Sara", phone: "0599123456" });

beforeEach(seed);

describe("Orders can't take more than is left", () => {
  test("the last pieces go to the first order; the next one is told what's left", async () => {
    await order([{ variantId: V, quantity: 2 }]).expect(201);
    const res = await order([{ variantId: V, quantity: 1 }]).expect(409);
    expect(res.body.error).toBe("OUT_OF_STOCK");
    expect(res.body.details.lines).toEqual([
      expect.objectContaining({ variantId: V, sku: "HIJ-BEI-1", productTitle: "Silk Hijab", colorName: "Beige", requested: 1, available: 0 }),
    ]);
    // other colours are unaffected
    await order([{ variantId: W, quantity: 3 }]).expect(201);
  });

  test("the bag sees what is left (not the shelf count)", async () => {
    await order([{ variantId: V, quantity: 1 }]).expect(201);
    const res = await request(app).post("/v1/catalog/cart-quote").send({ items: [{ variantId: V, quantity: 2 }] }).expect(200);
    expect(res.body.lines[0].available).toBe(1);
    expect(res.body.lines[0]).not.toHaveProperty("stock");
  });

  test("the same size in two lines is counted together", async () => {
    const res = await order([{ variantId: V, quantity: 1 }, { variantId: V, quantity: 2 }]);
    // normalized into one line of 3, or two lines: either way more than 2 is refused
    expect(res.status).toBe(409);
  });

  test("two orders for the last pieces at the same moment: exactly one gets them", async () => {
    const results = await Promise.all([order([{ variantId: V, quantity: 2 }]), order([{ variantId: V, quantity: 2 }])]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  test("an accepted order took the stock already, so it isn't counted twice; a rejected one gives it back", async () => {
    const first = await order([{ variantId: V, quantity: 2 }]).expect(201);
    await request(app).patch(`/v1/admin/orders/${first.body.id}/status`).send({ toStatus: "ACCEPTED" }).expect(200);
    expect((await prisma.productVariant.findUnique({ where: { id: V } }))?.stock).toBe(0);
    await order([{ variantId: V, quantity: 1 }]).expect(409);
    await request(app).patch(`/v1/admin/orders/${first.body.id}/status`).send({ toStatus: "REJECTED" }).expect(200);
    await order([{ variantId: V, quantity: 2 }]).expect(201);
  });

  test("an order left untouched for more than 3 days stops holding pieces", async () => {
    const first = await order([{ variantId: V, quantity: 2 }]).expect(201);
    await prisma.orderRequest.update({ where: { id: first.body.id }, data: { createdAt: new Date(Date.now() - 4 * 24 * 3600_000) } });
    await order([{ variantId: V, quantity: 2 }]).expect(201);
  });

  test("a paid order (card/PayPal) is always recorded", async () => {
    await order([{ variantId: V, quantity: 2 }]).expect(201);
    const paid = await submitOrderRequest({ items: [{ variantId: V, quantity: 1 }], customerName: "Lina", phone: "0599000000", paymentStatus: "PAID" }, { skipStockCheck: true });
    expect(paid).toBeTruthy();
  });
});
