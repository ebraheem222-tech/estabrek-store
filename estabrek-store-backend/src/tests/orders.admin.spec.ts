import { describe, test, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { resetDb, seedCatalog, seedOrders } from "./helpers/db.js";

beforeAll(async () => {
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

  test("update status writes history", async () => {
    const res = await request(app)
      .patch("/v1/admin/orders/or1/status")
      .send({ toStatus: "CONTACTED" })
      .expect(200);

    expect(res.body).toMatchObject({ id: "or1", status: "CONTACTED" });
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
});
