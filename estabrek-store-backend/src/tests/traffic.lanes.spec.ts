import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { LaneScheduler, applyTrafficConfig, laneOf, lanes, mergeTrafficConfig, trafficChanges, trafficDefaults, type LaneName, type TrafficConfig } from "../lib/traffic.js";
import { databasePool, monitorSnapshot, noteDbQuery, noteRequest, queryKey, resetMonitor, routeKeyOf, safePath } from "../lib/observability.js";
import { trafficLanes } from "../middleware/trafficLanes.js";
import { requestMetrics } from "../middleware/requestMetrics.js";
import { remember, resetCacheForTests, setBoundaryForTests } from "../lib/cache.js";
import { cacheKeyFor } from "../middleware/responseCache.js";

// Request lanes (priority, limits, fair turns, waiting) and the slow-request
// monitor. No database.

function cfg(over: (c: TrafficConfig) => void = () => undefined): TrafficConfig {
  const c = trafficDefaults();
  c.mode = "on";
  over(c);
  return c;
}

/** A scheduler with its own settings, and a way to start requests and see what ran. */
function harness(c: TrafficConfig) {
  let config = c;
  const s = new LaneScheduler(() => config);
  const started: string[] = [];
  const releases = new Map<string, () => void>();
  const events: string[] = [];
  const go = (id: string, lane: LaneName, ip = "1.1.1.1") =>
    s.admit(lane, ip, {
      start: (waited, release) => {
        started.push(id);
        releases.set(id, release);
      },
      timeout: () => events.push(`timeout:${id}`),
      reject: () => events.push(`reject:${id}`),
    });
  return { s, started, events, go, done: (id: string) => releases.get(id)!(), set: (next: TrafficConfig) => (config = next) };
}

describe("Which lane", () => {
  test("checkout and orders are critical, the admin is admin, AI and image search heavy, the rest normal", () => {
    expect(laneOf("POST", "/v1/catalog/order-requests", {})).toBe("critical");
    expect(laneOf("POST", "/v1/storefront/checkout/session", {})).toBe("critical");
    expect(laneOf("GET", "/v1/orders/abc", {})).toBe("critical");
    expect(laneOf("PATCH", "/v1/admin/catalog/products/p1", {})).toBe("admin");
    expect(laneOf("POST", "/v1/admin/ai-ask/x", {})).toBe("heavy");
    expect(laneOf("GET", "/v1/admin/ai", {})).toBe("admin"); // the AI settings page
    expect(laneOf("POST", "/v1/storefront/search/image", {})).toBe("heavy");
    expect(laneOf("GET", "/v1/catalog/products", { semantic: "1" })).toBe("heavy");
    expect(laneOf("GET", "/v1/catalog/products", {})).toBe("normal");
    expect(laneOf("GET", "/v1/catalog/order-requests-xyz", {})).toBe("normal"); // a path start, not any text
    expect(laneOf("GET", "/v1/catalog/order-requests", {})).toBe("normal"); // only POST is critical
  });

  test("the admin's rules come first; the longest match wins", () => {
    const rules = [
      { match: "/v1/catalog", lane: "heavy" as const },
      { match: "GET /v1/catalog/products", lane: "critical" as const },
    ];
    expect(laneOf("GET", "/v1/catalog/products/p1", {}, rules)).toBe("critical");
    expect(laneOf("GET", "/v1/catalog/categories", {}, rules)).toBe("heavy");
    expect(laneOf("POST", "/v1/admin/ai-ask", {}, [{ match: "/v1/admin/ai-ask", lane: "admin" }])).toBe("admin"); // beats the built-in heavy
  });
});

describe("The scheduler", () => {
  test("a full lane makes the next request wait; a finished one lets it go", () => {
    const h = harness(cfg((c) => (c.lanes.heavy.limit = 1)));
    h.go("a", "heavy");
    h.go("b", "heavy");
    expect(h.started).toEqual(["a"]);
    expect(h.s.snapshot().lanes.heavy).toMatchObject({ running: 1, waiting: 1 });
    h.done("a");
    expect(h.started).toEqual(["a", "b"]);
    expect(h.s.snapshot().lanes.heavy).toMatchObject({ running: 1, waiting: 0, queued: 1 });
  });

  test("other lanes don't wait for a busy lane", () => {
    const h = harness(cfg((c) => (c.lanes.heavy.limit = 1)));
    h.go("ai", "heavy");
    h.go("ai2", "heavy");
    h.go("order", "critical");
    h.go("browse", "normal");
    expect(h.started).toEqual(["ai", "order", "browse"]);
  });

  test("weighted round robin: critical (8) gets 8 turns for every 1 of heavy (1)", () => {
    const h = harness(
      cfg((c) => {
        c.globalLimit = 4;
        c.lanes.heavy.limit = 50;
        c.lanes.critical.limit = 50;
      }),
    );
    for (let i = 0; i < 4; i++) h.go(`busy${i}`, "normal");
    for (let i = 0; i < 9; i++) h.go(`c${i}`, "critical", `ip${i}`);
    for (let i = 0; i < 9; i++) h.go(`h${i}`, "heavy", `ip${i}`);
    const order: string[] = [];
    for (let i = 0; i < 9; i++) {
      const before = h.started.length;
      h.done(h.started[i]); // one place frees up at a time
      order.push(...h.started.slice(before));
    }
    expect(order.filter((x) => x.startsWith("c"))).toHaveLength(8);
    expect(order.filter((x) => x.startsWith("h"))).toHaveLength(1);
  });

  test("inside a lane, visitors take turns: one IP can't take every place", () => {
    const h = harness(cfg((c) => (c.lanes.normal.limit = 1)));
    h.go("first", "normal", "A");
    for (let i = 1; i <= 4; i++) h.go(`A${i}`, "normal", "A");
    h.go("B1", "normal", "B");
    h.done("first");
    h.done("A1");
    expect(h.started).toEqual(["first", "A1", "B1"]);
  });

  test("waiting too long or a full queue: busy", () => {
    vi.useFakeTimers();
    try {
      const h = harness(
        cfg((c) => {
          c.lanes.heavy = { limit: 1, queue: 1, waitMs: 500, weight: 1 };
        }),
      );
      h.go("a", "heavy");
      h.go("b", "heavy");
      h.go("c", "heavy"); // queue of 1 is full
      expect(h.events).toEqual(["reject:c"]);
      vi.advanceTimersByTime(501);
      expect(h.events).toEqual(["reject:c", "timeout:b"]);
      h.done("a");
      expect(h.started).toEqual(["a"]); // b gave up, nothing else to run
      expect(h.s.snapshot().lanes.heavy).toMatchObject({ timedOut: 1, rejected: 1, waiting: 0 });
    } finally {
      vi.useRealTimers();
    }
  });

  test("a visitor who leaves while waiting is forgotten", () => {
    const h = harness(cfg((c) => (c.lanes.heavy.limit = 1)));
    h.go("a", "heavy");
    const b = h.go("b", "heavy");
    b.cancel();
    h.done("a");
    expect(h.started).toEqual(["a"]);
    expect(h.s.snapshot().lanes.heavy.abandoned).toBe(1);
  });

  test("raising a limit lets waiting requests go at once", () => {
    const h = harness(cfg((c) => (c.lanes.heavy.limit = 1)));
    h.go("a", "heavy");
    h.go("b", "heavy");
    h.set(cfg((c) => (c.lanes.heavy.limit = 2)));
    h.s.dispatch();
    expect(h.started).toEqual(["a", "b"]);
  });

  test("watch: nothing waits, but what would have waited is counted; off: nothing at all", () => {
    const h = harness(
      cfg((c) => {
        c.mode = "watch";
        c.lanes.heavy.limit = 1;
      }),
    );
    h.go("a", "heavy");
    h.go("b", "heavy");
    expect(h.started).toEqual(["a", "b"]);
    expect(h.s.snapshot().lanes.heavy).toMatchObject({ running: 2, wouldQueue: 1, peak: 2 });
    const off = harness(cfg((c) => (c.mode = "off")));
    off.go("x", "heavy");
    expect(off.started).toEqual(["x"]);
    expect(off.s.snapshot().lanes.heavy.admitted).toBe(0);
  });
});

describe("Settings", () => {
  test("defaults watch first; broken values fall back; changes are named", () => {
    expect(trafficDefaults().mode).toBe("watch");
    const m = mergeTrafficConfig({ mode: "on", lanes: { heavy: { limit: 0 }, admin: { limit: 4 } }, routes: [{ match: "bad", lane: "heavy" }] });
    expect(m.mode).toBe("on");
    expect(m.lanes.heavy).toEqual(trafficDefaults().lanes.heavy);
    expect(m.lanes.admin.limit).toBe(4);
    expect(m.routes).toEqual([]);
    expect(trafficChanges(trafficDefaults(), m)).toEqual(["traffic.mode", "traffic.lanes.admin.limit"]);
  });
});

describe("The monitor", () => {
  beforeEach(() => resetMonitor());

  test("per route: average, p95, slowest, database share, waiting, errors", () => {
    for (let i = 0; i < 19; i++) noteRequest({ method: "GET", route: "GET /v1/x/:id", path: "/v1/x/1", status: 200, ms: 20, waitedMs: 0, dbMs: 10, dbCount: 2, cacheHit: false, lane: "normal" });
    noteRequest({ method: "GET", route: "GET /v1/x/:id", path: "/v1/x/2?token=secret", status: 500, ms: 2000, waitedMs: 300, dbMs: 1500, dbCount: 9, cacheHit: false, lane: "normal", error: "boom" }, 1000);
    const snap = monitorSnapshot();
    const row = snap.routes[0];
    expect(row).toMatchObject({ route: "GET /v1/x/:id", count: 20, maxMs: 2000, p95Ms: 25, errors: 1, lane: "normal" });
    expect(row.avgMs).toBeCloseTo(119, 0);
    expect(row.dbShare).toBeCloseTo((190 + 1500) / 2380, 2);
    expect(snap.slow).toHaveLength(1);
    expect(snap.slow[0]).toMatchObject({ path: "/v1/x/2", ms: 2000, waitedMs: 300, status: 500 });
    expect(snap.errors[0]).toMatchObject({ route: "GET /v1/x/:id", count: 1, lastMessage: "boom" });
    expect(snap.totals).toMatchObject({ requests: 20, errors: 1 });
  });

  test("queries with other values are one entry; transactions aren't queries", () => {
    noteDbQuery('SELECT "id" FROM "Product" WHERE "id" IN ($1,$2,$3)', 12);
    noteDbQuery('SELECT "id"   FROM "Product" WHERE "id" IN ($1)', 30);
    noteDbQuery("BEGIN", 1);
    const q = monitorSnapshot().queries;
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ sql: 'SELECT "id" FROM "Product" WHERE "id" IN (…)', count: 2, maxMs: 30, avgMs: 21 });
    expect(queryKey("a\n  b")).toBe("a b");
  });

  test("private links and ids are hidden from the examples", () => {
    expect(safePath("/v1/orders/tok-closed-1234567890abcdefghijk?x=1")).toBe("/v1/orders/…");
    expect(routeKeyOf("GET", null, "/v1/catalog/products/clx9abcdefghijklmn")).toBe("GET /v1/catalog/products/:id");
    expect(routeKeyOf("GET", "/v1/catalog/products/:id", "/whatever")).toBe("GET /v1/catalog/products/:id");
  });

  test("the database connections come from DATABASE_URL's connection_limit", () => {
    const saved = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://u:p@h:5432/db?connection_limit=7&pool_timeout=20";
    expect(databasePool()).toEqual({ limit: 7, fromUrl: true, timeoutSeconds: 20 });
    process.env.DATABASE_URL = saved;
  });
});

describe("Through HTTP", () => {
  let open: () => void = () => undefined;
  let gate: Promise<void> = Promise.resolve();
  const hold = () => (gate = new Promise((r) => (open = r)));

  const app = express();
  app.use(requestMetrics);
  app.use(trafficLanes);
  const storefront = express.Router();
  storefront.get("/search/image", async (_req, res) => {
    await gate;
    res.json({ ok: true });
  });
  storefront.post("/checkout/session", (_req, res) => res.json({ ok: "order" }));
  app.use("/v1/storefront", storefront);

  beforeEach(() => {
    resetMonitor();
    resetCacheForTests();
    setBoundaryForTests("catalog", Infinity);
    applyTrafficConfig(
      cfg((c) => {
        c.lanes.heavy = { limit: 1, queue: 5, waitMs: 300, weight: 1 };
      }),
    );
  });
  afterEach(() => {
    open();
    applyTrafficConfig(trafficDefaults());
  });

  test("a second heavy request waits; too long gets 503 busy; checkout isn't held up", async () => {
    hold();
    const first = request(app).get("/v1/storefront/search/image").then((r) => r);
    await vi.waitFor(() => expect(lanes.snapshot().lanes.heavy.running).toBe(1));
    const busy = await request(app).get("/v1/storefront/search/image");
    expect(busy.status).toBe(503);
    expect(busy.headers["retry-after"]).toBe("2");
    expect(busy.body).toMatchObject({ error: "BUSY", lane: "heavy" });
    const order = await request(app).post("/v1/storefront/checkout/session").send({});
    expect(order.status).toBe(200);
    open();
    expect((await first).status).toBe(200);
  });

  test("when busy, a copy the cache still holds is sent instead", async () => {
    hold();
    const first = request(app).get("/v1/storefront/search/image").then((r) => r);
    await vi.waitFor(() => expect(lanes.snapshot().lanes.heavy.running).toBe(1));
    remember("search", cacheKeyFor("/v1/storefront/search/image", "q=rose"), { body: '{"cached":true}', status: 200, text: '{"cached":true}', costMs: 5 });
    const out = await request(app).get("/v1/storefront/search/image?q=rose");
    expect(out.status).toBe(200);
    expect(out.headers["x-cache"]).toBe("STALE-BUSY");
    expect(out.body).toEqual({ cached: true });
    open();
    await first;
  });

  test("a request that waited, then ran: its wait shows in Server-Timing and in the monitor", async () => {
    hold();
    const first = request(app).get("/v1/storefront/search/image").then((r) => r);
    await vi.waitFor(() => expect(lanes.snapshot().lanes.heavy.running).toBe(1));
    const second = request(app).get("/v1/storefront/search/image").then((r) => r);
    await vi.waitFor(() => expect(lanes.snapshot().lanes.heavy.waiting).toBe(1));
    setTimeout(() => open(), 60);
    const [, b] = await Promise.all([first, second]);
    expect(b.status).toBe(200);
    expect(b.headers["server-timing"]).toMatch(/lane;desc="heavy";dur=\d/);
    const row = monitorSnapshot().routes.find((x) => x.route === "GET /v1/storefront/search/image");
    expect(row).toMatchObject({ count: 2, lane: "heavy" });
    expect(row!.avgWaitMs).toBeGreaterThan(0);
  });
});
