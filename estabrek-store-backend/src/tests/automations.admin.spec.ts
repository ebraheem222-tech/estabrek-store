import { describe, test, expect, beforeEach, afterAll, beforeAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import { handleEvent, resetAutomationsForTests, runAutomations, startAutomations } from "../modules/admin/automations.service.js";
import { setAutomationHandler } from "../lib/automations.js";

// Automations (admin → التلقائيات) with the database. Requests without a token
// run as the test owner. The seeded size: SKU-BLUE-M, 10 left.

async function clean() {
  await prisma.automationState.deleteMany();
  await prisma.automationRun.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.adminNotification.deleteMany();
  await prisma.outboxMessage.deleteMany();
  await prisma.siteSettings.deleteMany();
  await resetDb();
}

const rule = (body: Record<string, unknown>) => request(app).post("/v1/admin/automations").send({ name: "تنبيه", ...body });
const stock = (n: number) => prisma.productVariant.update({ where: { id: "cvariant01" }, data: { stock: n } });
const bells = () => prisma.adminNotification.count();

beforeAll(() => startAutomations());
beforeEach(async () => {
  await clean();
  resetAutomationsForTests();
  await seedCatalog();
  await prisma.siteSettings.create({ data: { ordersEmail: "owner@shop.test", whatsappNumber: "+970599000000" } });
});
afterAll(async () => {
  setAutomationHandler(null);
  await clean();
});

describe("Automations", () => {
  test("a new order → a notification in the admin, with its words", async () => {
    await rule({ trigger: "order.created", action: "notify", config: { text: "طلب {{orderId}} من {{customerName}}: {{total}} ₪" } }).expect(201);
    await handleEvent("order.created", { orderId: "ORD-7", customerName: "سارة", total: 240, link: "/admin/orders/ORD-7" }, "order:ORD-7");
    const n = await prisma.adminNotification.findFirstOrThrow();
    expect(n).toMatchObject({ title: "تنبيه", body: "طلب ORD-7 من سارة: 240 ₪", link: "/admin/orders/ORD-7", readAt: null });
    const list = await request(app).get("/v1/admin/notifications").expect(200);
    expect(list.body.unread).toBe(1);
    await request(app).post("/v1/admin/notifications/read").send({}).expect(200);
    expect((await request(app).get("/v1/admin/notifications").expect(200)).body.unread).toBe(0);
  });

  test("a real order from the shop reaches the rule", async () => {
    await rule({ trigger: "order.created", action: "notify" }).expect(201);
    await request(app)
      .post("/v1/catalog/order-requests")
      .send({ items: [{ variantId: "cvariant01", quantity: 1 }], customerName: "ليلى", phone: "0599111222" })
      .expect((r) => expect([200, 201]).toContain(r.status));
    await expect.poll(bells, { timeout: 5000 }).toBe(1);
    expect((await prisma.adminNotification.findFirstOrThrow()).body).toContain("ليلى");
  });

  test("“stock below 3 → email”: once while it's low, again after it went back up", async () => {
    await rule({ trigger: "stock.low", conditions: { threshold: 3 }, action: "email" }).expect(201);
    await runAutomations();
    expect(await prisma.outboxMessage.count()).toBe(0);
    await stock(2);
    await runAutomations();
    await runAutomations();
    const msgs = await prisma.outboxMessage.findMany();
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ channel: "EMAIL", to: "owner@shop.test", template: "OWNER_ALERT" });
    expect((msgs[0].payloadJson as any).text).toContain("باقي 2");
    await stock(9);
    await runAutomations();
    await stock(1);
    await runAutomations();
    expect(await prisma.outboxMessage.count()).toBe(2);
  });

  test("a minimum total, a cooldown, and a rule switched off", async () => {
    const r = await rule({ trigger: "order.created", action: "notify", conditions: { minTotal: 200 }, cooldownMinutes: 60 }).expect(201);
    await handleEvent("order.created", { orderId: "A", total: 150 }, "order:A");
    await handleEvent("order.created", { orderId: "B", total: 300 }, "order:all");
    await handleEvent("order.created", { orderId: "C", total: 300 }, "order:all"); // same thing within the hour
    expect(await bells()).toBe(1);
    await request(app).patch(`/v1/admin/automations/${r.body.rule.id}`).send({ name: "تنبيه", trigger: "order.created", action: "notify", enabled: false }).expect(200);
    await handleEvent("order.created", { orderId: "D", total: 300 }, "order:D");
    expect(await bells()).toBe(1);
  });

  test("try it; WhatsApp through the outbox; what's refused", async () => {
    const r = await rule({ trigger: "video.ready", action: "whatsapp" }).expect(201);
    const t = await request(app).post(`/v1/admin/automations/${r.body.rule.id}/test`).expect(200);
    expect(t.body).toMatchObject({ ok: true, detail: expect.stringContaining("+970599000000") });
    expect((await prisma.outboxMessage.findFirstOrThrow()).channel).toBe("WHATSAPP");
    expect((await prisma.automationRun.findFirstOrThrow()).detail).toContain("تجربة");
    await rule({ trigger: "order.created", action: "pinProduct" }).expect(400);
    await rule({ trigger: "order.created", action: "email", config: { to: "not-an-email" } }).expect(400);
    await rule({ trigger: "stock.low", conditions: { threshold: -2 }, action: "notify" }).expect(400);
    const page = await request(app).get("/v1/admin/automations").expect(200);
    expect(page.body.channels.whatsapp).toBe(false);
    expect(page.body.triggers["stock.low"].words).toContain("stock");
  });
});
