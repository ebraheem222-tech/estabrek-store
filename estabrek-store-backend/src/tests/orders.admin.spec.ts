import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog, seedOrders } from "./helpers/db.js";

beforeEach(async () => {
  await resetDb();
  await seedCatalog();
  await seedOrders(); // ensures /v1/admin/orders/or1 exists
});

describe("Admin Orders", () => {
  test("list orders with pagination", async () => {
    const res = await request(app)
      .get("/v1/admin/orders?page=1&pageSize=20")
      .expect(200);

    expect(res.body).toMatchObject({ page: 1, pageSize: 20 });
    expect(res.body.data.find((o: any) => o.id === "or1")).toBeTruthy();
  });

  test("get order detail", async () => {
    const res = await request(app).get("/v1/admin/orders/or1").expect(200);
    expect(res.body.id).toBe("or1");
    expect(res.body.status).toBe("NEW");
  });

  test("accepting an order decrements stock and writes inventory adjustment", async () => {
    const res = await request(app)
      .patch("/v1/admin/orders/or1/status")
      .send({ toStatus: "ACCEPTED" })
      .expect(200);

    expect(res.body).toMatchObject({ id: "or1", status: "ACCEPTED", stockCommitted: true });

    const variant = await prisma.productVariant.findUnique({ where: { id: "cvariant01" }, select: { stock: true } });
    expect(variant?.stock).toBe(8);

    const adjustments = await prisma.inventoryAdjustment.findMany({
      where: { variantId: "cvariant01" },
      orderBy: { createdAt: "asc" },
    });
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0]).toMatchObject({
      delta: -2,
      beforeStock: 10,
      afterStock: 8,
    });
  });

  test("rejecting from NEW does not decrement stock", async () => {
    const res = await request(app)
      .patch("/v1/admin/orders/or1/status")
      .send({ toStatus: "REJECTED" })
      .expect(200);

    expect(res.body).toMatchObject({ id: "or1", status: "REJECTED", stockCommitted: false });

    const variant = await prisma.productVariant.findUnique({ where: { id: "cvariant01" }, select: { stock: true } });
    expect(variant?.stock).toBe(10);

    const adjustmentsCount = await prisma.inventoryAdjustment.count({ where: { variantId: "cvariant01" } });
    expect(adjustmentsCount).toBe(0);
  });

  test("refund after accepted restores stock", async () => {
    await request(app)
      .patch("/v1/admin/orders/or1/status")
      .send({ toStatus: "ACCEPTED" })
      .expect(200);

    const res = await request(app)
      .patch("/v1/admin/orders/or1/status")
      .send({ toStatus: "REFUNDED" })
      .expect(200);

    expect(res.body).toMatchObject({ id: "or1", status: "REFUNDED", stockCommitted: false });

    const variant = await prisma.productVariant.findUnique({ where: { id: "cvariant01" }, select: { stock: true } });
    expect(variant?.stock).toBe(10);

    const adjustments = await prisma.inventoryAdjustment.findMany({
      where: { variantId: "cvariant01" },
      orderBy: { createdAt: "asc" },
    });
    expect(adjustments).toHaveLength(2);
    expect(adjustments.map((x) => x.delta)).toEqual([-2, 2]);
  });

  test("rejecting after accepted restores stock", async () => {
    await request(app)
      .patch("/v1/admin/orders/or1/status")
      .send({ toStatus: "ACCEPTED" })
      .expect(200);

    const res = await request(app)
      .patch("/v1/admin/orders/or1/status")
      .send({ toStatus: "REJECTED" })
      .expect(200);

    expect(res.body).toMatchObject({ id: "or1", status: "REJECTED", stockCommitted: false });

    const variant = await prisma.productVariant.findUnique({ where: { id: "cvariant01" }, select: { stock: true } });
    expect(variant?.stock).toBe(10);

    const adjustments = await prisma.inventoryAdjustment.findMany({
      where: { variantId: "cvariant01" },
      orderBy: { createdAt: "asc" },
    });
    expect(adjustments.map((x) => x.delta)).toEqual([-2, 2]);
  });

  test("queue an outbox message", async () => {
    const res = await request(app)
      .post("/v1/admin/orders/or1/message")
      .send({
        channel: "EMAIL",
        to: "test@x.com",
        template: "order_update",
        payloadJson: { foo: "bar" },
      })
      .expect(201);

    expect(res.body.status).toBe("QUEUED");
  });

  test("search orders by phone in another format, name, and date range", async () => {
    const byPhone = await request(app).get("/v1/admin/orders?q=%2B972-23456789").expect(200);
    expect(byPhone.body.data.map((o: any) => o.id)).toContain("or1");
    const byName = await request(app).get("/v1/admin/orders?q=jan").expect(200);
    expect(byName.body.data.map((o: any) => o.id)).toContain("or1");
    const none = await request(app).get("/v1/admin/orders?q=nobody-here").expect(200);
    expect(none.body.total).toBe(0);
    const old = await request(app).get("/v1/admin/orders?to=2000-01-01").expect(200);
    expect(old.body.total).toBe(0);
  });

  test("summary returns status counts and newest NEW orders", async () => {
    const res = await request(app).get("/v1/admin/orders/summary").expect(200);
    expect(res.body.counts.NEW).toBe(1);
    expect(res.body.latestNew[0]).toMatchObject({ id: "or1", customerName: "Jane" });
  });

  test("record cash collected and delivery details with a timeline note", async () => {
    const res = await request(app)
      .patch("/v1/admin/orders/or1/details")
      .send({ city: "القدس", address: "شارع صلاح الدين", paymentStatus: "PAID", paymentProvider: "COD" })
      .expect(200);
    expect(res.body).toMatchObject({ city: "القدس", paymentStatus: "PAID", paymentProvider: "COD", status: "NEW" });
    const history = await prisma.orderRequestHistory.findMany({ where: { orderRequestId: "or1" } });
    expect(history.some((h) => (h.note ?? "").includes("استلام المبلغ"))).toBe(true);

    const undo = await request(app).patch("/v1/admin/orders/or1/details").send({ paymentStatus: "UNPAID" }).expect(200);
    expect(undo.body.paymentStatus).toBeNull();
  });

  test("status note is kept in the order history", async () => {
    await request(app).patch("/v1/admin/orders/or1/status").send({ toStatus: "CONTACTED", note: "اتصلنا بها" }).expect(200);
    const history = await prisma.orderRequestHistory.findMany({ where: { orderRequestId: "or1", toStatus: "CONTACTED" } });
    expect(history[0]?.note).toBe("اتصلنا بها");
  });
});
