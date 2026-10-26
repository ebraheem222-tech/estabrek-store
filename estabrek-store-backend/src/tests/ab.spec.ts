import { describe, test, expect, beforeEach, beforeAll } from "vitest";
import express from "express";
import request from "supertest";
import { compare, normalCdf, testResults } from "../lib/abStats.js";
import { checkValues, noteAb, pendingAbForTests, resetAbForTests, setRunningTestsForTests, slotOf } from "../lib/experiments.js";

// A/B tests (تجارب A/B): is B really different, counting once per visitor, and
// the route the shop sends to. No database.

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/604.1";
const who = (ip = "10.0.0.1") => ({ ip, userAgent: UA });
const hero = { id: "exp1", kind: "heroOpening" as const, field: null, a: "film", b: "photo", split: 50 };

beforeEach(() => {
  resetAbForTests();
  setRunningTestsForTests([hero]);
});

describe("Is the difference real?", () => {
  test("the normal curve", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
  });

  test("a clear winner: B adds to the bag more, sure enough", () => {
    const c = compare({ visits: 2000, conversions: 100 }, { visits: 2000, conversions: 150 });
    expect(c.rateA).toBe(0.05);
    expect(c.rateB).toBe(0.075);
    expect(c.lift).toBeCloseTo(0.5, 6);
    expect(c.confidence).toBeGreaterThan(0.99);
    expect(c.verdict).toBe("B");
  });

  test("a small difference on few visits: too early; on enough visits but not sure: no clear difference", () => {
    expect(compare({ visits: 60, conversions: 3 }, { visits: 60, conversions: 5 }).verdict).toBe("early");
    const same = compare({ visits: 1000, conversions: 50 }, { visits: 1000, conversions: 55 });
    expect(same.verdict).toBe("same");
    expect(same.confidence).toBeLessThan(0.95);
    expect(same.moreVisits).toBeGreaterThan(1000);
  });

  test("A can win too; nothing measured is no verdict and no crash", () => {
    expect(compare({ visits: 3000, conversions: 240 }, { visits: 3000, conversions: 150 }).verdict).toBe("A");
    expect(compare({ visits: 0, conversions: 0 }, { visits: 0, conversions: 0 })).toMatchObject({ rateA: 0, rateB: 0, lift: null, confidence: 0, verdict: "early", moreVisits: null });
  });

  test("both measures and revenue per visit", () => {
    const r = testResults({ visits: 200, bags: 20, orders: 4, revenue: 800 }, { visits: 200, bags: 30, orders: 6, revenue: 1500 });
    expect(r.bags.rateB).toBe(0.15);
    expect(r.orders.rateA).toBe(0.02);
    expect(r.revenuePerVisit).toEqual({ a: 4, b: 7.5 });
  });
});

describe("What can be tested", () => {
  test("the hero: film or photo, two different values", () => {
    expect(checkValues("heroOpening", null, "film", "photo")).toEqual({ a: "film", b: "photo" });
    expect(checkValues("heroOpening", null, "film", "film")).toBe("SAME_VALUES");
    expect(checkValues("heroOpening", null, "film", "video")).toBe("BAD_VALUE");
  });

  test("a motion setting, checked like the setting itself", () => {
    expect(checkValues("motion", "maxFps", 120, 90)).toEqual({ a: 120, b: 90 });
    expect(checkValues("motion", "maxFps", 120, 75)).toBe("BAD_VALUE");
    expect(checkValues("motion", "phoneGlass", false, true)).toEqual({ a: false, b: true });
    expect(checkValues("motion", "sections", {}, {})).toBe("BAD_FIELD");
    expect(slotOf({ kind: "motion", field: "maxFps" })).toBe("motion:maxFps");
    expect(slotOf({ kind: "heroOpening", field: null })).toBe("heroOpening");
  });
});

describe("Counting", () => {
  test("visits, bags and orders per side and day; an order's total adds up", () => {
    const now = Date.UTC(2026, 9, 17, 9);
    noteAb([{ x: "exp1", v: "A", k: "visit" }], who("1.1.1.1"), now);
    noteAb([{ x: "exp1", v: "B", k: "visit" }, { x: "exp1", v: "B", k: "bag" }, { x: "exp1", v: "B", k: "order", a: 240 }], who("2.2.2.2"), now);
    const p = pendingAbForTests();
    expect(p.get("exp1|2026-10-17|A")).toEqual({ visits: 1, bags: 0, orders: 0, revenue: 0 });
    expect(p.get("exp1|2026-10-17|B")).toEqual({ visits: 1, bags: 1, orders: 1, revenue: 240 });
  });

  test("the same visitor again within half an hour, bots, and tests that aren't running don't count", () => {
    const now = Date.now();
    expect(noteAb([{ x: "exp1", v: "A", k: "visit" }], who(), now)).toBe(1);
    expect(noteAb([{ x: "exp1", v: "A", k: "visit" }], who(), now + 60_000)).toBe(0);
    expect(noteAb([{ x: "exp1", v: "A", k: "visit" }], who(), now + 31 * 60_000)).toBe(1);
    expect(noteAb([{ x: "exp1", v: "A", k: "visit" }], { ip: "9.9.9.9", userAgent: "Googlebot/2.1" }, now)).toBe(0);
    expect(noteAb([{ x: "old", v: "A", k: "visit" }], who("3.3.3.3"), now)).toBe(0);
  });
});

describe("The route", () => {
  let app: express.Express;
  beforeAll(async () => {
    process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/none";
    process.env.JWT_SECRET ||= "test-secret-at-least-16";
    const storefront = (await import("../modules/storefront/storefront.routes.js")).default;
    app = express();
    app.use(express.json());
    app.use("/v1/storefront", storefront);
  }, 60_000);

  test("takes a simple text request; junk is refused", async () => {
    await request(app)
      .post("/v1/storefront/ab")
      .set("Content-Type", "text/plain")
      .set("User-Agent", UA)
      .send(JSON.stringify({ e: [{ x: "exp1", v: "B", k: "bag" }] }))
      .expect(204);
    expect([...pendingAbForTests().values()][0]).toMatchObject({ bags: 1 });
    await request(app).post("/v1/storefront/ab").set("Content-Type", "text/plain").send(JSON.stringify({ e: [{ x: "exp1", v: "C", k: "bag" }] })).expect(400);
    await request(app).post("/v1/storefront/ab").set("Content-Type", "text/plain").send("{nope").expect(400);
  });
});
