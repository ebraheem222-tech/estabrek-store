import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";
import { env } from "../config/env.js";
import {
  DIGITAL_STOCK,
  cloudinaryFiles,
  normalizeTicketCode,
  newTicketCode,
  releaseOrder,
  sendDeliveryEmail,
  setFileStorage,
  type FileStorage,
} from "../modules/fulfillment/fulfillment.service.js";

// Ids must look like cuids for the schemas.
const BOOK_V = "cvarbook001"; // stock 5 seats
const DIG_V = "cvardigi001"; // stock 0 (digital: never runs out)
const SHIP_V = "cvarship001"; // stock 3

const stored = new Map<string, Buffer>();
const memoryFiles: FileStorage = {
  ready: () => true,
  put: async (name, data) => {
    const location = `mem/${stored.size + 1}-${name}`;
    stored.set(location, data);
    return { location, bytes: data.length, format: /\.([a-z0-9]+)$/i.exec(name)?.[1] ?? null };
  },
  remove: async (location) => void stored.delete(location),
  link: async (location) => `https://files.test/${encodeURIComponent(location)}?sig=1`,
};

const storefrontUrl = env.STOREFRONT_URL;

async function seed() {
  await prisma.orderRequestItem.deleteMany();
  await resetDb();
  await prisma.productType.deleteMany({ where: { id: { in: ["ptype_book", "ptype_digi"] } } });
  await prisma.productType.createMany({
    data: [
      { id: "ptype_book", name: "ورشة", slug: "workshop-t", fulfillment: "BOOKING", sizeLabel: "المقعد", showColor: false, position: 50, updatedAt: new Date() },
      { id: "ptype_digi", name: "باترون", slug: "pattern-t", fulfillment: "SHIPPING", showColor: false, showSize: false, position: 51, updatedAt: new Date() },
    ],
  });
  await prisma.category.create({ data: { id: "ccatfulf001", name: "Extras", slug: "extras" } });
  await prisma.size.create({ data: { id: "csizefulf01", name: "default" } });
  const mk = (id: string, slug: string, typeId: string | null, variantId: string, stock: number, extra: Record<string, unknown> = {}) =>
    prisma.product.create({
      data: {
        id,
        title: slug,
        slug,
        isActive: true,
        categoryId: "ccatfulf001",
        typeId,
        ...extra,
        items: {
          create: [{ colorName: "Default", skuBase: slug.toUpperCase(), variants: { create: [{ id: variantId, sku: `${slug}-1`, price: new Prisma.Decimal(40), stock, size: { connect: { id: "csizefulf01" } } }] } }],
        },
      },
    });
  await mk("cprodbook01", "sewing-workshop", "ptype_book", BOOK_V, 5, {
    eventStartsAt: new Date(Date.now() + 7 * 24 * 3600_000),
    eventLocation: "سخنين، قاعة البلدية",
  });
  await mk("cproddigi01", "abaya-pattern", "ptype_digi", DIG_V, 0);
  await mk("cprodship01", "silk-hijab", null, SHIP_V, 3);
}

beforeEach(async () => {
  stored.clear();
  setFileStorage(memoryFiles);
  (env as any).STOREFRONT_URL = storefrontUrl;
  await seed();
});
afterAll(async () => {
  setFileStorage(cloudinaryFiles);
  (env as any).STOREFRONT_URL = storefrontUrl;
  await prisma.productType.deleteMany({ where: { id: { in: ["ptype_book", "ptype_digi"] } } });
});

const order = (items: Array<{ variantId: string; quantity: number }>, extra: Record<string, unknown> = {}) =>
  request(app).post("/v1/catalog/order-requests").send({ items, customerName: "سارة أحمد", phone: "0599123456", ...extra });
const setStatus = (id: string, toStatus: string) => request(app).patch(`/v1/admin/orders/${id}/status`).send({ toStatus });
const stock = async (id: string) => (await prisma.productVariant.findUnique({ where: { id } }))!.stock;

/** Turns the pattern type digital through the admin (as the owner would). */
async function makeDigital() {
  await request(app).patch("/v1/admin/catalog/product-types/ptype_digi").send({ fulfillment: "DIGITAL" }).expect(200);
}

describe("Codes", () => {
  test("ticket codes are easy to read and type", () => {
    const c = newTicketCode();
    expect(c).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(normalizeTicketCode(c.toLowerCase().replace("-", " "))).toBe(c);
    expect(normalizeTicketCode("abc")).toBeNull();
  });
});

describe("Digital products", () => {
  test("a type turned digital never runs out; its stock isn't taken on acceptance", async () => {
    expect(await stock(DIG_V)).toBe(0);
    await makeDigital();
    expect(await stock(DIG_V)).toBe(DIGITAL_STOCK);
    const t = (await request(app).get("/v1/admin/catalog/product-types").expect(200)).body.types.find((x: any) => x.id === "ptype_digi");
    expect(t.fulfillment).toBe("DIGITAL");
    const made = await request(app).post("/v1/admin/catalog/product-types").send({ name: "كورس أونلاين", fulfillment: "BOOKING" }).expect(201);
    expect(made.body.fulfillment).toBe("BOOKING");
    await request(app).delete(`/v1/admin/catalog/product-types/${made.body.id}`).expect(200);

    const quote = await request(app).post("/v1/catalog/cart-quote").send({ items: [{ variantId: DIG_V, quantity: 1 }, { variantId: SHIP_V, quantity: 1 }] }).expect(200);
    expect(quote.body.lines.map((l: any) => l.fulfillment)).toEqual(["DIGITAL", "SHIPPING"]);

    const o = await order([{ variantId: DIG_V, quantity: 1 }], { email: "Sara@Example.com" }).expect(201);
    await setStatus(o.body.id, "ACCEPTED").expect(200);
    expect(await stock(DIG_V)).toBe(DIGITAL_STOCK);
    expect((await prisma.orderRequest.findUnique({ where: { id: o.body.id } }))!.email).toBe("sara@example.com");
  });

  test("files: upload (Arabic name kept), outside link, blocked types, rename, delete", async () => {
    await makeDigital();
    const base = "/v1/admin/catalog/products/cproddigi01/files";
    const up = await request(app).post(base).attach("file", Buffer.from("%PDF-1.4 pattern"), { filename: "باترون عباية.pdf", contentType: "application/pdf" }).expect(201);
    expect(up.body).toMatchObject({ name: "باترون عباية.pdf", kind: "upload", format: "pdf", bytes: 16 });
    await request(app).post(base).attach("file", Buffer.from("MZ"), "setup.exe").expect(400);
    await request(app).post(`${base}/link`).send({ name: "فيديو الشرح", url: "http://drive.test/x" }).expect(400);
    const link = await request(app).post(`${base}/link`).send({ name: "فيديو الشرح", url: "https://drive.test/x" }).expect(201);
    await request(app).patch(`${base}/${up.body.id}`).send({ name: "الباترون (PDF)" }).expect(200);
    const list = await request(app).get(base).expect(200);
    expect(list.body.files.map((f: any) => [f.name, f.kind])).toEqual([["الباترون (PDF)", "upload"], ["فيديو الشرح", "link"]]);
    expect(list.body).toMatchObject({ storageReady: true, maxDownloads: env.DIGITAL_MAX_DOWNLOADS });
    await request(app).delete(`${base}/${link.body.id}`).expect(200);
    await request(app).delete(`${base}/${up.body.id}`).expect(200);
    expect(stored.size).toBe(0);
  });

  test("files open after acceptance, each one a limited number of times, and close when cancelled", async () => {
    await makeDigital();
    const base = "/v1/admin/catalog/products/cproddigi01/files";
    const f = (await request(app).post(base).attach("file", Buffer.from("x"), "pattern.pdf").expect(201)).body;
    const o = await order([{ variantId: DIG_V, quantity: 1 }, { variantId: SHIP_V, quantity: 1 }]).expect(201);

    let d = (await request(app).get(`/v1/admin/orders/${o.body.id}/delivery`).expect(200)).body;
    expect(d).toMatchObject({ needed: true, released: false, path: null, kinds: { digital: true, shipping: true, booking: false } });

    await setStatus(o.body.id, "ACCEPTED").expect(200);
    d = (await request(app).get(`/v1/admin/orders/${o.body.id}/delivery`).expect(200)).body;
    expect(d.released).toBe(true);
    expect(d.path).toMatch(/^\/order\/[A-Za-z0-9_-]{32}$/);
    const token = d.path.split("/").pop();

    const page = (await request(app).get(`/v1/orders/access/${token}`).expect(200)).body;
    expect(page).toMatchObject({ delivered: true, closed: false, firstName: "سارة" });
    expect(page.files).toEqual([expect.objectContaining({ id: f.id, name: "pattern.pdf", left: env.DIGITAL_MAX_DOWNLOADS })]);
    expect(page.items.map((i: any) => i.fulfillment)).toEqual(["DIGITAL", "SHIPPING"]);

    for (let i = 0; i < env.DIGITAL_MAX_DOWNLOADS; i++) {
      const dl = await request(app).post(`/v1/orders/access/${token}/files/${f.id}`).expect(200);
      expect(dl.body.url).toContain("https://files.test/");
    }
    expect((await request(app).post(`/v1/orders/access/${token}/files/${f.id}`).expect(429)).body.error).toBe("DOWNLOAD_LIMIT");
    // A file of another product isn't hers.
    const other = await prisma.productFile.create({ data: { productId: "cprodship01", name: "x", kind: "link", url: "https://x.test" } });
    await request(app).post(`/v1/orders/access/${token}/files/${other.id}`).expect(404);

    await setStatus(o.body.id, "CANCELED").expect(200);
    const closed = (await request(app).get(`/v1/orders/access/${token}`).expect(200)).body;
    expect(closed).toMatchObject({ closed: true, delivered: false, files: [] });
    expect((await request(app).post(`/v1/orders/access/${token}/files/${f.id}`).expect(410)).body.error).toBe("ORDER_CLOSED");
    await request(app).get("/v1/orders/access/not-a-real-token-1234567890").expect(404);
  });
});

describe("Bookings", () => {
  test("one ticket per seat on acceptance; the door checks each in once; cancelling stops them", async () => {
    const o = await order([{ variantId: BOOK_V, quantity: 2 }], { email: "sara@example.com" }).expect(201);
    await setStatus(o.body.id, "ACCEPTED").expect(200);
    expect(await stock(BOOK_V)).toBe(3); // seats are stock

    const d = (await request(app).get(`/v1/admin/orders/${o.body.id}/delivery`).expect(200)).body;
    expect(d.tickets).toHaveLength(2);
    expect(d.tickets[0]).toMatchObject({ title: "sewing-workshop", status: "VALID" });
    const token = d.path.split("/").pop();
    const page = (await request(app).get(`/v1/orders/access/${token}`).expect(200)).body;
    expect(page.tickets).toHaveLength(2);
    expect(page.tickets[0]).toMatchObject({ location: "سخنين، قاعة البلدية", holderName: "سارة أحمد", label: null });
    expect(page.tickets[0].when).toBeTruthy();

    // Accepting again (or shipping) doesn't make more tickets.
    await setStatus(o.body.id, "SHIPPED").expect(200);
    expect(await prisma.ticket.count({ where: { orderRequestId: o.body.id } })).toBe(2);

    const code: string = d.tickets[0].code;
    const found = await request(app).get(`/v1/admin/tickets/code/${code.toLowerCase().replace("-", "")}`).expect(200);
    expect(found.body).toMatchObject({ code, status: "VALID", product: { title: "sewing-workshop" } });
    await request(app).post(`/v1/admin/tickets/${found.body.id}/check-in`).expect(200);
    const again = await request(app).post(`/v1/admin/tickets/${found.body.id}/check-in`).expect(409);
    expect(again.body.error).toBe("ALREADY_USED");
    expect(again.body.details.ticket.checkedInAt).toBeTruthy();
    await request(app).post(`/v1/admin/tickets/${found.body.id}/undo`).expect(200);
    await request(app).post(`/v1/admin/tickets/${found.body.id}/check-in`).expect(200);
    await request(app).get("/v1/admin/tickets/code/ZZZZ-ZZZZ").expect(404);
    await request(app).get("/v1/admin/tickets/code/12").expect(400);

    const events = (await request(app).get("/v1/admin/tickets/events").expect(200)).body.events;
    expect(events.find((e: any) => e.id === "cprodbook01")).toMatchObject({ valid: 1, used: 1, cancelled: 0 });

    await setStatus(o.body.id, "CANCELED").expect(200);
    expect(await stock(BOOK_V)).toBe(5);
    const statuses = (await prisma.ticket.findMany({ where: { orderRequestId: o.body.id }, orderBy: { createdAt: "asc" } })).map((t) => t.status).sort();
    expect(statuses).toEqual(["CANCELLED", "USED"]); // the used one stays as history
    const c = await request(app).post(`/v1/admin/tickets/${d.tickets[1].id}/check-in`).expect(409);
    expect(c.body.error).toBe("TICKET_CANCELLED");
    expect((await request(app).get(`/v1/orders/access/${token}`).expect(200)).body.tickets).toEqual([]);

    // Accepted again: the same tickets come back (no new ones).
    await setStatus(o.body.id, "ACCEPTED").expect(200);
    expect(await prisma.ticket.count({ where: { orderRequestId: o.body.id } })).toBe(2);
    expect(await prisma.ticket.count({ where: { orderRequestId: o.body.id, status: "VALID" } })).toBe(1);
  });

  test("a booking whose time has passed can't be ordered", async () => {
    await prisma.product.update({ where: { id: "cprodbook01" }, data: { eventStartsAt: new Date(Date.now() - 3600_000) } });
    const res = await order([{ variantId: BOOK_V, quantity: 1 }]).expect(409);
    expect(res.body.error).toBe("EVENT_OVER");
    // A paid order is still recorded.
    const { submitOrderRequest } = await import("../modules/catalog/catalog.service.js");
    const paid = await submitOrderRequest({ items: [{ variantId: BOOK_V, quantity: 1 }], customerName: "Sara", phone: "0599123456", paymentStatus: "PAID" }, { skipStockCheck: true });
    expect(paid.id).toBeTruthy();
  });
});

describe("Handing over", () => {
  test("paid online: released at once; the email needs STOREFRONT_URL; the owner can resend, release by hand and make a new link", async () => {
    const o = await order([{ variantId: BOOK_V, quantity: 1 }], { email: "sara@example.com" }).expect(201);
    (env as any).STOREFRONT_URL = undefined;
    expect(await releaseOrder(o.body.id, "paid")).toMatchObject({ released: true, first: true });
    expect(await sendDeliveryEmail(o.body.id)).toMatchObject({ sent: false, why: "NO_STOREFRONT_URL" });
    const r1 = await request(app).post(`/v1/admin/orders/${o.body.id}/delivery/email`).send({}).expect(409);
    expect(r1.body.error).toBe("NO_STOREFRONT_URL");

    (env as any).STOREFRONT_URL = "https://shop.test";
    expect(await sendDeliveryEmail(o.body.id)).toMatchObject({ sent: true });
    expect(await sendDeliveryEmail(o.body.id)).toMatchObject({ sent: false, why: "ALREADY_SENT" });
    const r2 = await request(app).post(`/v1/admin/orders/${o.body.id}/delivery/email`).send({ email: "new@example.com" }).expect(200);
    expect(r2.body).toMatchObject({ email: "new@example.com", url: expect.stringMatching(/^https:\/\/shop\.test\/order\//) });

    const before = r2.body.path;
    const r3 = await request(app).post(`/v1/admin/orders/${o.body.id}/delivery/new-link`).expect(200);
    expect(r3.body.path).not.toBe(before);
    expect(r3.body.emailSentAt).toBeNull();
    await request(app).get(`/v1/orders/access/${before.split("/").pop()}`).expect(404);
    const history = await prisma.orderRequestHistory.findMany({ where: { orderRequestId: o.body.id } });
    expect(history.map((h) => h.note)).toEqual(expect.arrayContaining(["تم تسليم التذاكر للزبونة (بعد الدفع أونلاين)", "رابط جديد لصفحة الطلب (القديم وقف)"]));

    // Release by hand, before accepting.
    const o2 = await order([{ variantId: BOOK_V, quantity: 1 }]).expect(201);
    const rel = await request(app).post(`/v1/admin/orders/${o2.body.id}/delivery/release`).expect(200);
    expect(rel.body).toMatchObject({ released: true, email: null });
    expect(rel.body.tickets).toHaveLength(1);
  });

  test("an order with only shipped pieces has nothing to hand over", async () => {
    const o = await order([{ variantId: SHIP_V, quantity: 1 }]).expect(201);
    await setStatus(o.body.id, "ACCEPTED").expect(200);
    const d = (await request(app).get(`/v1/admin/orders/${o.body.id}/delivery`).expect(200)).body;
    expect(d).toMatchObject({ needed: false, released: false, path: null, tickets: [] });
    expect((await request(app).post(`/v1/admin/orders/${o.body.id}/delivery/release`).expect(409)).body.error).toBe("NOTHING_TO_DELIVER");
  });

  test("bookings: date and place are saved with the product and shown on its page", async () => {
    const starts = "2026-12-20T16:00:00.000Z";
    await request(app)
      .put("/v1/admin/catalog/products/cprodbook01/full")
      .send({ product: { eventStartsAt: starts, eventEndsAt: null, eventLocation: "  عكا  " } })
      .expect(200);
    const p = await request(app).get("/v1/catalog/products/slug/sewing-workshop").expect(200);
    expect(p.body).toMatchObject({ eventStartsAt: starts, eventEndsAt: null, eventLocation: "عكا", type: { fulfillment: "BOOKING", sizeLabel: "المقعد" } });
  });
});
