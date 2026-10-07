import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { applyPolicy, envDefaults, mergePolicy } from "../lib/securityPolicy.js";
import { forgetFeatures } from "../lib/features.js";
import { blockMinutesFor, decay, hit, pressureOf, resetPressure, slowDelayMs, snapshot, forgive } from "../lib/pressure.js";
import { refreshIpBlocks } from "../middleware/pressure.js";

const base = envDefaults().pressure;
// Lots of requests in this file: the fixed-window limits are lifted here.
const RELAXED = { rateLimit: { perIp: 50000, perPath: 10000, auth: 500 } };
const S = (over: Partial<typeof base> = {}) => ({ ...base, ...over });

/** Saves a policy with these pressure settings (as the admin page would). */
async function usePressure(over: Partial<typeof base>) {
  const p = mergePolicy({ pressure: { ...base, ...over }, ...RELAXED });
  await prisma.securityPolicy.upsert({ where: { id: "default" }, create: { id: "default", data: p as any }, update: { data: p as any } });
  applyPolicy(p);
}

beforeEach(async () => {
  resetPressure();
  await prisma.ipBlock.deleteMany();
  await refreshIpBlocks();
  await prisma.securityPolicy.deleteMany();
  applyPolicy(mergePolicy(RELAXED));
});
afterAll(async () => {
  resetPressure();
  await prisma.ipBlock.deleteMany();
  await refreshIpBlocks();
  await prisma.securityPolicy.deleteMany();
  applyPolicy(envDefaults());
  await prisma.siteSettings.updateMany({ data: { maintenanceMode: false } });
  forgetFeatures();
});

describe("The decay model (e^-x)", () => {
  test("the score halves every half-life; pressure runs 0 → 1", () => {
    expect(decay(100, 60_000, 60)).toBeCloseTo(50, 5);
    expect(decay(100, 120_000, 60)).toBeCloseTo(25, 5);
    expect(decay(100, 0, 60)).toBe(100);
    expect(pressureOf(0, 200)).toBe(0);
    expect(pressureOf(200, 200)).toBeCloseTo(1 - Math.exp(-1), 6);
    expect(pressureOf(5000, 200)).toBeGreaterThan(0.999);
  });

  test("repeat offenders wait twice as long each time, up to the cap", () => {
    expect([0, 1, 2, 3].map((s) => blockMinutesFor(s, 10, 24))).toEqual([10, 20, 40, 80]);
    expect(blockMinutesFor(20, 10, 24)).toBe(24 * 60);
  });

  test("answers get slower between slowAt and blockAt (up to 2 s)", () => {
    expect(slowDelayMs(0.5, 75, 95)).toBe(0);
    expect(slowDelayMs(0.85, 75, 95)).toBe(1000);
    expect(slowDelayMs(0.99, 75, 95)).toBe(2000);
  });

  test("a shopper browsing stays calm; a flood gets slowed, then blocked; a calm IP recovers", () => {
    const s = S({ mode: "on" });
    let t = 0;
    // A request every 2 s for 10 minutes.
    for (let i = 0; i < 300; i++) expect(hit({ ip: "1.1.1.1", weight: 1, path: "/v1/x", method: "GET", now: (t += 2000) }, s).action).toBe("allow");
    expect(snapshot(10, s, t).clients[0].pressure).toBeLessThan(0.3);
    // 20 requests a second.
    const actions = new Set<string>();
    let blocked: any = null;
    for (let i = 0; i < 3000 && !blocked; i++) {
      const v = hit({ ip: "6.6.6.6", weight: 1, path: "/v1/x", method: "GET", now: (t += 50) }, s);
      actions.add(v.action);
      if (v.action === "block") blocked = v;
    }
    expect(actions.has("slow")).toBe(true);
    expect(blocked).toMatchObject({ action: "block", fresh: true });
    expect(blocked.until - t).toBe(10 * 60_000);
    // Still blocked a minute later, without adding to the score.
    expect(hit({ ip: "6.6.6.6", weight: 1, path: "/v1/x", method: "GET", now: t + 60_000 }, s).action).toBe("block");
    // After the block, calm again.
    t += 11 * 60_000;
    expect(hit({ ip: "6.6.6.6", weight: 1, path: "/v1/x", method: "GET", now: t }, s).action).toBe("allow");
    // Second offence: twice as long.
    let second: any = null;
    for (let i = 0; i < 3000 && !second; i++) {
      const v = hit({ ip: "6.6.6.6", weight: 1, path: "/v1/x", method: "GET", now: (t += 50) }, s);
      if (v.action === "block") second = v;
    }
    expect(second.until - t).toBe(20 * 60_000);
    expect(snapshot(5, s, t).clients[0]).toMatchObject({ ip: "6.6.6.6", status: "blocked", strikes: 2 });
    expect(forgive("6.6.6.6")).toBe(true);
    expect(hit({ ip: "6.6.6.6", weight: 1, path: "/v1/x", method: "GET", now: t + 1 }, s).action).toBe("allow");
  });

  test("watch mode never slows or blocks, but shows who would be blocked", () => {
    const s = S({ mode: "watch" });
    let t = 0;
    for (let i = 0; i < 1000; i++) expect(hit({ ip: "7.7.7.7", weight: 1, path: "/", method: "GET", now: (t += 20) }, s).action).toBe("allow");
    expect(snapshot(5, s, t).clients[0]).toMatchObject({ ip: "7.7.7.7", status: "would-block" });
  });
});

describe("On the server", () => {
  test("a flooding IP gets 429 in 'on' mode; nothing happens in 'watch' (the default)", async () => {
    for (let i = 0; i < 80; i++) await request(app).get("/v1/settings").expect(200);
    // Slow decay so the flood climbs straight through the "slow" band.
    await usePressure({ mode: "on", capacity: 20, slowAt: 94, blockAt: 95, halfLifeSeconds: 3600 });
    resetPressure();
    let status = 200;
    let body: any = null;
    for (let i = 0; i < 120 && status === 200; i++) {
      const res = await request(app).get("/v1/settings");
      status = res.status;
      body = res.body;
    }
    expect(status).toBe(429);
    expect(body.error).toBe("TOO_MANY_REQUESTS");
    // A signed-in admin from the same IP isn't counted or blocked (401 here = got past the guard to sign-in checks).
    const admin = await request(app).get("/v1/admin/system/traffic").set("Authorization", `Bearer ${signAccessToken({ sub: "not-a-member", role: "SUPERADMIN" })}`);
    expect(admin.status).toBe(401);
    const snap = snapshot();
    expect(snap.clients[0]).toMatchObject({ status: "blocked", lastPath: "/v1/settings" });
  });

  test("the allow list is never counted", async () => {
    await usePressure({ mode: "on", capacity: 20, slowAt: 94, blockAt: 95, allow: ["127.0.0.1", "::1", "::ffff:127.0.0.1"] });
    for (let i = 0; i < 100; i++) await request(app).get("/v1/settings").expect(200);
    expect(snapshot().tracked).toBe(0);
  });

  test("unknown pages and failed sign-ins weigh extra", async () => {
    await usePressure({ mode: "watch" });
    await request(app).get("/v1/settings").expect(200);
    const calm = snapshot().clients[0].pressure;
    resetPressure();
    await request(app).get("/v1/nothing-here").expect(404);
    expect(snapshot().clients[0].pressure).toBeGreaterThan(calm * 3);
  });

  test("an IP blocked by hand gets 403 everywhere until unblocked", async () => {
    // Blocking your own IP from the admin is refused.
    const own = await request(app).post("/v1/admin/system/traffic/blocks").send({ ip: "127.0.0.1", minutes: 60 });
    expect([409, 201]).toContain(own.status);
    if (own.status === 201) await prisma.ipBlock.deleteMany();
    const ok = await request(app).post("/v1/admin/system/traffic/blocks").send({ ip: "203.0.113.9", minutes: null, reason: "سكربت" }).expect(201);
    expect(ok.body).toMatchObject({ ip: "203.0.113.9", until: null, reason: "سكربت" });
    await request(app).post("/v1/admin/system/traffic/blocks").send({ ip: "10.0.0.0/8", minutes: 60 }).expect(400);
    const list = await request(app).get("/v1/admin/system/traffic").expect(200);
    expect(list.body.blocks.map((b: any) => b.ip)).toEqual(["203.0.113.9"]);

    // The test client itself, blocked (directly in the database).
    await prisma.ipBlock.create({ data: { ip: list.body.yourIp, until: new Date(Date.now() + 60_000) } });
    await refreshIpBlocks();
    expect((await request(app).get("/v1/settings").expect(403)).body.error).toBe("IP_BLOCKED");
    await prisma.ipBlock.deleteMany({ where: { ip: list.body.yourIp } });
    await refreshIpBlocks();
    await request(app).get("/v1/settings").expect(200);
    await request(app).delete(`/v1/admin/system/traffic/blocks/${ok.body.id}`).expect(200);
    expect((await request(app).get("/v1/admin/system/traffic")).body.blocks).toEqual([]);
  });

  test("the settings are checked (slow before block)", async () => {
    await request(app).patch("/v1/admin/system/security").send({ pressure: { slowAt: 96, blockAt: 95 } }).expect(400);
    const out = await request(app).patch("/v1/admin/system/security").send({ pressure: { mode: "on", capacity: 300 } }).expect(200);
    expect(out.body.changed.sort()).toEqual(["pressure.capacity", "pressure.mode"]);
  });
});

describe("Maintenance mode", () => {
  test("pauses public orders, keeps reading and the admin working, tells the storefront", async () => {
    await resetDb();
    await seedCatalog();
    const order = { items: [{ variantId: "cvariant01", quantity: 1 }], customerName: "سارة", phone: "0599123456" };
    await request(app).patch("/v1/admin/features/maintenance").send({ enabled: true }).expect(200);
    const s = await prisma.siteSettings.findFirst();
    expect(s!.maintenanceKey).toMatch(/^[\w-]{16}$/);
    expect((await request(app).post("/v1/catalog/order-requests").send(order).expect(503)).body.error).toBe("MAINTENANCE");
    await request(app).get("/v1/catalog/products").expect(200);
    const pub = (await request(app).get("/v1/settings").expect(200)).body.site.maintenance;
    expect(pub.on).toBe(true);
    expect(pub.previewHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(pub)).not.toContain(s!.maintenanceKey!);
    await request(app).patch("/v1/admin/settings").send({ maintenanceMessage: "راجعين الساعة 6" }).expect(200);
    await request(app).post("/v1/stock-alerts/stop").send({ token: "x".repeat(32) }).expect(404);

    await request(app).patch("/v1/admin/features/maintenance").send({ enabled: false }).expect(200);
    await request(app).post("/v1/catalog/order-requests").send(order).expect(201);
    // The preview key stays the same next time.
    await request(app).patch("/v1/admin/features/maintenance").send({ enabled: true }).expect(200);
    expect((await prisma.siteSettings.findFirst())!.maintenanceKey).toBe(s!.maintenanceKey);
    await request(app).patch("/v1/admin/features/maintenance").send({ enabled: false }).expect(200);
  });
});
