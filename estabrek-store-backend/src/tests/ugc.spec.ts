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

  test("a review's writer is never taken from the request; the page sees approved reviews only, and first names only", async () => {
    const lina = await prisma.user.create({ data: { name: "Lina Haddad", email: "lina-review@example.com", phone: "0599000000" } });
    // Someone sends another shopper's id with a review: it is stored without one (the writer comes from the session).
    const sent = await request(app)
      .post("/v1/catalog/products/p1/reviews")
      .send({ rating: 4, body: "Lovely fabric, true to size.", userId: lina.id })
      .expect(201);
    expect(sent.body.status).toBe("PENDING");
    expect((await prisma.review.findUnique({ where: { id: sent.body.id } }))?.userId).toBeNull();

    // One of Lina's own approved, one pending.
    await prisma.review.create({ data: { productId: "p1", userId: lina.id, rating: 5, body: "Beautiful, I wear it every week.", status: "APPROVED" } });
    await prisma.review.create({ data: { productId: "p1", rating: 1, body: "Spam spam spam spam", status: "PENDING" } });

    const list = (await request(app).get("/v1/ugc/products/p1/reviews").expect(200)).body as Array<Record<string, unknown>>;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ rating: 5, author: "Lina", body: "Beautiful, I wear it every week." });
    expect(JSON.stringify(list)).not.toContain("lina-review@example.com");
    expect(JSON.stringify(list)).not.toContain("0599000000");
    expect(list[0]).not.toHaveProperty("user");

    // The product itself carries the summary, not the reviews (none pending, none rejected).
    const product = (await request(app).get("/v1/catalog/products/p1").expect(200)).body;
    expect(product.rating).toEqual({ count: 1, average: 5 });
    expect(product).not.toHaveProperty("reviews");
    expect(JSON.stringify(product)).not.toContain("Spam spam");
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
