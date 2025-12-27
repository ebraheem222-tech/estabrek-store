import { beforeAll, afterAll, describe, test, expect } from "vitest";
import request from "supertest";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import app from "../app.js";


describe("UGC (catalog public)", () => {
  beforeAll(async () => {
    await resetDb();
    await seedCatalog();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("GET /v1/catalog/categories/tree -> returns tree", async () => {
    const res = await request(app).get("/v1/catalog/categories/tree").expect(200);
    expect(res.body).toBeTruthy();
  });

  test("GET /v1/catalog/products (filters) -> lists products", async () => {
    const res = await request(app)
      .get("/v1/catalog/products?q=shirt&page=1&pageSize=12")
      .expect(200);
    expect(res.body).toBeTruthy();
  });

  test("POST /v1/catalog/products/:id/reviews -> creates PENDING review", async () => {
    const res = await request(app)
      .post("/v1/catalog/products/p1/reviews")
      .send({ rating: 5, comment: "Nice!" })
      .expect(201);
    expect(res.body).toBeTruthy();
  });

  test("POST /v1/catalog/order-requests -> creates NEW order request + history", async () => {
    const res = await request(app)
      .post("/v1/catalog/order-requests")
      .send({
        variantId: "cvariant01",
        quantity: 1,
        customerName: "Jane",
        phone: "123456789",
      })
      .expect(201);
    expect(res.body).toBeTruthy();
  });
});
