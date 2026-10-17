import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { applyTrafficConfig, trafficConfig, trafficDefaults } from "../lib/traffic.js";
import { noteDbQuery, resetMonitor } from "../lib/observability.js";

// The speed monitor and request lanes page (admin → مراقبة السرعة والأولوية).
// Requests without a token run as the test owner.

async function clean() {
  await prisma.performanceSettingsRevision.deleteMany();
  await prisma.performanceSettings.deleteMany();
  applyTrafficConfig(trafficDefaults());
  resetMonitor();
}

beforeEach(clean);
afterAll(clean);

describe("Speed monitor and lanes", () => {
  test("starts watching, with the built-in rules and live numbers", async () => {
    await request(app).get("/v1/catalog/categories").expect(200);
    const out = await request(app).get("/v1/admin/system/speed").expect(200);
    expect(out.body.config).toEqual(trafficDefaults());
    expect(out.body.config.mode).toBe("watch");
    expect(out.body.builtInRoutes).toEqual(expect.arrayContaining([{ match: "POST /v1/catalog/order-requests", lane: "critical" }]));
    expect(Object.keys(out.body.lanes.lanes)).toEqual(["critical", "admin", "normal", "heavy"]);
    expect(out.body.monitor.routes.map((r: any) => r.route)).toContain("GET /v1/catalog/categories");
    expect(out.body.monitor.databasePool.limit).toBeGreaterThan(0);
  });

  test("changes are in force at once, checked, and in the shared history", async () => {
    const out = await request(app)
      .patch("/v1/admin/system/speed")
      .send({ mode: "on", lanes: { heavy: { limit: 2 } }, routes: [{ match: "GET /v1/catalog/attribute-facets", lane: "heavy" }] })
      .expect(200);
    expect(out.body.changed.sort()).toEqual(["traffic.lanes.heavy.limit", "traffic.mode", "traffic.routes"]);
    expect(trafficConfig()).toMatchObject({ mode: "on", lanes: { heavy: { limit: 2 } } });
    await request(app).patch("/v1/admin/system/speed").send({ lanes: { heavy: { limit: 0 } } }).expect(400);
    await request(app).patch("/v1/admin/system/speed").send({ routes: [{ match: "no slash", lane: "heavy" }] }).expect(400);
    await request(app).patch("/v1/admin/system/speed").send({ lanes: { vip: { limit: 2 } } }).expect(400);
    const history = await request(app).get("/v1/admin/system/cache").expect(200);
    expect(history.body.revisions[0].changed).toEqual(expect.arrayContaining(["traffic.mode"]));
    await request(app).post("/v1/admin/system/speed/reset").expect(200);
    expect(trafficConfig()).toEqual(trafficDefaults());
  });

  test("index suggestions read the database's own index list (and create nothing)", async () => {
    for (let i = 0; i < 25; i++) noteDbQuery(`SELECT "public"."Product"."id" FROM "public"."Product" WHERE "public"."Product"."id" = $1 LIMIT $2 OFFSET $3`, 30);
    const before = await prisma.$queryRaw<Array<{ n: number }>>`SELECT COUNT(*)::int AS n FROM pg_indexes WHERE schemaname = 'public'`;
    const out = await request(app).get("/v1/admin/system/speed/indexes").expect(200);
    // The primary key covers it: checked, nothing to add.
    expect(out.body.checked).toBeGreaterThanOrEqual(1);
    expect(out.body.suggestions).toEqual([]);
    const after = await prisma.$queryRaw<Array<{ n: number }>>`SELECT COUNT(*)::int AS n FROM pg_indexes WHERE schemaname = 'public'`;
    expect(after[0].n).toBe(before[0].n);
  });

  test("the numbers can start over", async () => {
    await request(app).get("/v1/catalog/categories").expect(200);
    const out = await request(app).post("/v1/admin/system/speed/reset-stats").expect(200);
    expect(out.body.monitor.routes.find((r: any) => r.route === "GET /v1/catalog/categories")).toBeUndefined();
  });
});
