import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";
import { lineKey } from "../modules/catalog/catalog.service.js";

// A bag line's own details (plan 3.6b): what the shopper wrote or chose (a gift card's name and message, a
// configurator's parts), priced like any line, kept apart from another line of the same piece, saved on the order.
const CARD = "cvargift100"; // a gift card of 100

async function seed() {
  await prisma.orderRequestItem.deleteMany();
  await resetDb();
  await prisma.category.create({ data: { id: "ccatgift001", name: "Gifts", slug: "gifts" } });
  await prisma.size.create({ data: { id: "csizegift01", name: "100" } });
  await prisma.product.create({
    data: {
      id: "cprodgift01", title: "Gift card", slug: "gift-card", isActive: true, categoryId: "ccatgift001",
      items: { create: [{ colorName: "Card", skuBase: "GIFT", variants: { create: [{ id: CARD, sku: "GIFT-100", price: new Prisma.Decimal(100), stock: 50, size: { connect: { id: "csizegift01" } } }] } }] },
    },
  });
}
beforeEach(seed);

const sara = [{ label: "To", value: "Sara" }, { label: "Message", value: "Happy birthday!" }];
const huda = [{ label: "To", value: "Huda" }];

describe("a line's own details", () => {
  test("two gift cards of one amount for two people are two lines, priced and saved with their words", async () => {
    const quote = await request(app).post("/v1/catalog/cart-quote").send({ items: [{ variantId: CARD, quantity: 1, details: sara }, { variantId: CARD, quantity: 1, details: huda }] }).expect(200);
    expect(quote.body.lines).toHaveLength(2);
    expect(quote.body.lines.map((l: { details: unknown }) => l.details)).toEqual([sara, huda]);
    expect(Number(quote.body.subtotal)).toBe(200);

    const res = await request(app).post("/v1/catalog/order-requests")
      .send({ items: [{ variantId: CARD, quantity: 1, details: sara }, { variantId: CARD, quantity: 1, details: huda }, { variantId: CARD, quantity: 2, details: sara }], customerName: "Lina", phone: "0599123456" })
      .expect(201);
    const lines = await prisma.orderRequestItem.findMany({ where: { orderRequestId: res.body.id }, orderBy: { createdAt: "asc" } });
    // Sara's twice adds up; Huda's stays its own.
    expect(lines.map((l) => [l.quantity, l.details])).toEqual([[3, sara], [1, huda]]);
  });

  test("a line with no details is as before; empty ones are dropped; too many or too long is refused", async () => {
    const plain = await request(app).post("/v1/catalog/order-requests").send({ items: [{ variantId: CARD, quantity: 1 }], customerName: "Lina", phone: "0599123456" }).expect(201);
    const [line] = await prisma.orderRequestItem.findMany({ where: { orderRequestId: plain.body.id } });
    expect(line.details).toBeNull();

    const blanks = await request(app).post("/v1/catalog/cart-quote").send({ items: [{ variantId: CARD, quantity: 1, details: [{ label: "To", value: "  " }, { label: "", value: "x" }] }] }).expect(200);
    expect(blanks.body.lines[0].details ?? null).toBeNull();

    await request(app).post("/v1/catalog/cart-quote").send({ items: [{ variantId: CARD, quantity: 1, details: Array.from({ length: 7 }, (_, i) => ({ label: `L${i}`, value: "v" })) }] }).expect(400);
    await request(app).post("/v1/catalog/cart-quote").send({ items: [{ variantId: CARD, quantity: 1, details: [{ label: "To", value: "x".repeat(301) }] }] }).expect(400);
  });

  test("a line's key is its piece, or its piece and its details (the shop tells lines apart the same way)", () => {
    expect(lineKey(CARD)).toBe(CARD);
    expect(lineKey(CARD, [])).toBe(CARD);
    expect(lineKey(CARD, huda)).toBe(`${CARD}|To=Huda`);
    expect(lineKey(CARD, sara)).not.toBe(lineKey(CARD, huda));
  });
});
