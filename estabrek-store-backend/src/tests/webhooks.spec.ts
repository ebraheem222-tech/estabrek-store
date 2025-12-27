import { describe, test, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { resetDb, seedCatalog } from "./helpers/db.js";

const TOKEN = process.env.WEBHOOK_TOKEN || "test_token";

beforeAll(async () => {
  await resetDb();
  await seedCatalog();
});

describe("Webhooks", () => {
  test("echo: validates token and echoes event", async () => {
    const raw = { id: "evt_1", type: "echo", payload: { hello: "world" } };

    const res = await request(app)
      .post("/v1/webhooks/wire")
      .set("x-webhook-token", TOKEN)
      .set("content-type", "application/json")
      .send(raw)
      .expect(200);

    expect(res.body).toMatchObject({ ok: true, eventId: "evt_1" });
  });

  test("order-request: creates order request", async () => {
    const raw = {
      id: "evt_or_1",
      type: "order_request",
      payload: {
        variantId: "cvariant01", // must match seedCatalog
        quantity: 2,
        customerName: "Jane",
        phone: "123456789",
      },
    };

    const res = await request(app)
      .post("/v1/webhooks/order-request")
      .set("x-webhook-token", TOKEN)
      .set("content-type", "application/json")
      .send(raw)
      .expect(200);

    expect(res.body).toEqual({ ok: true, id: expect.any(String) });
  });
});
