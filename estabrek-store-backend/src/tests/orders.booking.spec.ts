import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";

// The booking calendar (plan 3.6c): a booked time is a line's detail "YYYY-MM-DD HH:MM"; one order holds each time of
// a product until it is turned down, cancelled or refunded.
const SESSION = "cvarsess001";
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const at = (offset: number, hm: string) => `${day(offset)} ${hm}`;

async function seed() {
  await prisma.orderRequestItem.deleteMany();
  await resetDb();
  await prisma.category.create({ data: { id: "ccatsess001", name: "Services", slug: "services" } });
  await prisma.size.create({ data: { id: "csizesess01", name: "60 min" } });
  await prisma.product.create({
    data: {
      id: "cprodsess01", title: "Fitting", slug: "fitting", isActive: true, categoryId: "ccatsess001",
      items: { create: [{ colorName: "Session", skuBase: "FIT", variants: { create: [{ id: SESSION, sku: "FIT-60", price: new Prisma.Decimal(50), stock: 999, size: { connect: { id: "csizesess01" } } }] } }] },
    },
  });
}
beforeEach(seed);

const book = (when: string, extra: Record<string, unknown> = {}) =>
  request(app).post("/v1/catalog/order-requests").send({ items: [{ variantId: SESSION, quantity: 1, details: [{ label: "When", value: when }] }], customerName: "Sara", phone: "0599123456", ...extra });
const taken = (from: string, to: string) => request(app).get(`/v1/catalog/booking-slots?product=fitting&from=${from}&to=${to}`);

describe("booked times", () => {
  test("a time once ordered is listed (only the time) and refused to the next order; another time is free", async () => {
    await book(at(2, "10:00")).expect(201);
    const list = await taken(day(0), day(30)).expect(200);
    expect(list.body).toEqual({ taken: [at(2, "10:00")] });
    const again = await book(at(2, "10:00")).expect(409);
    expect(again.body.error).toBe("SLOT_TAKEN");
    expect(again.body.details).toMatchObject({ slot: at(2, "10:00"), productTitle: "Fitting" });
    await book(at(2, "11:00")).expect(201);
  });

  test("an order turned down frees its time; a day gone is refused; one order can't hold a time twice", async () => {
    const first = await book(at(3, "12:00")).expect(201);
    await prisma.orderRequest.update({ where: { id: first.body.id }, data: { status: "REJECTED" } });
    expect((await taken(day(0), day(30))).body.taken).toEqual([]);
    await book(at(3, "12:00")).expect(201);

    const past = await book(at(-3, "12:00")).expect(400);
    expect(past.body.error).toBe("SLOT_PAST");

    const twice = await request(app).post("/v1/catalog/order-requests").send({
      items: [{ variantId: SESSION, quantity: 1, details: [{ label: "When", value: at(4, "09:00") }] }, { variantId: SESSION, quantity: 1, details: [{ label: "When", value: at(4, "09:00") }, { label: "Note", value: "x" }] }],
      customerName: "Sara", phone: "0599123456",
    }).expect(409);
    expect(twice.body.error).toBe("SLOT_TAKEN");
  });

  test("the list asks for real days, at most four months, of a product that is there", async () => {
    await taken(day(0), day(200)).expect(400);
    await taken(day(5), day(1)).expect(400);
    await request(app).get(`/v1/catalog/booking-slots?product=nope&from=${day(0)}&to=${day(10)}`).expect(404);
    await request(app).get(`/v1/catalog/booking-slots?product=fitting&from=tomorrow&to=${day(10)}`).expect(400);
  });
});
