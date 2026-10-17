import { describe, test, expect, beforeAll, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { RumBodySchema, bucketOf, experience, noteRum, pendingRumForTests, percentile, rating, resetRumForTests } from "../lib/rum.js";

// Real shoppers' speed (تجربة الزباين): buckets, percentiles, ratings, and the
// route the shop sends to. No database.

const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36";
const agg = (metric: Parameters<typeof bucketOf>[0], values: number[]) => {
  const buckets = new Array(16).fill(0);
  for (const v of values) buckets[bucketOf(metric, v)] += 1;
  return { count: values.length, sum: values.reduce((s, x) => s + x, 0), buckets };
};

beforeEach(() => resetRumForTests());

describe("Numbers", () => {
  test("each value falls in its bucket", () => {
    expect(bucketOf("lcp", 90)).toBe(0);
    expect(bucketOf("lcp", 2400)).toBe(9); // ≤ 2500
    expect(bucketOf("lcp", 99_000)).toBe(15); // the open last bucket
    expect(bucketOf("scrollFps", 58)).toBe(8); // ≤ 60
    expect(bucketOf("cls", 0.08)).toBe(3); // ≤ 0.1
  });

  test("percentiles from the buckets, between the bucket's edges", () => {
    const lcp = agg("lcp", [...Array(75).fill(1200), ...Array(25).fill(4500)]);
    const p75 = percentile("lcp", lcp, 0.75)!;
    expect(p75).toBeGreaterThan(1000);
    expect(p75).toBeLessThanOrEqual(1500);
    expect(percentile("lcp", { count: 0, sum: 0, buckets: [] }, 0.75)).toBeNull();
  });

  test("the 75% experience: p75 for times, p25 for frames a second", () => {
    const fps = agg("scrollFps", [...Array(30).fill(28), ...Array(70).fill(58)]);
    // A quarter of the visits scrolled under ~30 fps: that's what 75% of visits beat.
    expect(experience("scrollFps", fps)!).toBeLessThanOrEqual(30);
    const lcp = agg("lcp", Array(100).fill(1900));
    expect(experience("lcp", lcp)!).toBeLessThanOrEqual(2000);
  });

  test("ratings follow Google's limits for the load numbers and ours for frames", () => {
    expect(rating("lcp", 2400)).toBe("good");
    expect(rating("lcp", 3000)).toBe("okay");
    expect(rating("lcp", 4100)).toBe("poor");
    expect(rating("inp", 180)).toBe("good");
    expect(rating("cls", 0.3)).toBe("poor");
    expect(rating("scrollFps", 58)).toBe("good");
    expect(rating("scrollFps", 41)).toBe("okay");
    expect(rating("scrollFps", 24)).toBe("poor");
    expect(rating("slowFrames", 20)).toBe("poor");
    expect(rating("lcp", null)).toBeNull();
  });
});

describe("Collecting", () => {
  const record = { page: "shop" as const, device: "phone" as const, os: "android" as const, m: { lcp: 2100, scrollFps: 52, slowFrames: 6 } };

  test("reports add up per day, page, device, system and measure", () => {
    noteRum([record, { ...record, m: { lcp: 3900 } }], { userAgent: UA }, Date.UTC(2026, 9, 17, 10));
    const p = pendingRumForTests();
    const lcp = p.get("2026-10-17|shop|phone|android|lcp")!;
    expect(lcp.count).toBe(2);
    expect(lcp.sum).toBe(6000);
    expect(p.get("2026-10-17|shop|phone|android|scrollFps")!.count).toBe(1);
  });

  test("bots don't count", () => {
    expect(noteRum([record], { userAgent: "Googlebot/2.1" })).toBe(0);
    expect(pendingRumForTests().size).toBe(0);
  });

  test("only known pages, devices and measures, within range", () => {
    expect(RumBodySchema.safeParse({ r: [record] }).success).toBe(true);
    expect(RumBodySchema.safeParse({ r: [{ ...record, page: "/p/secret-path" }] }).success).toBe(false);
    expect(RumBodySchema.safeParse({ r: [{ ...record, m: { lcp: -5 } }] }).success).toBe(false);
    expect(RumBodySchema.safeParse({ r: [{ ...record, m: { url: 1 } }] }).success).toBe(false);
    expect(RumBodySchema.safeParse({ r: [{ ...record, ua: UA }] }).success).toBe(true); // unknown fields are dropped…
    expect(RumBodySchema.parse({ r: [{ ...record, ua: UA }] }).r[0]).not.toHaveProperty("ua"); // …not kept
    expect(RumBodySchema.safeParse({ r: Array(6).fill(record) }).success).toBe(false);
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

  test("takes a beacon and counts it; junk is refused", async () => {
    await request(app)
      .post("/v1/storefront/rum")
      .set("Content-Type", "text/plain")
      .set("User-Agent", UA)
      .send(JSON.stringify({ r: [{ page: "home", device: "desktop", os: "windows", m: { lcp: 1500, inp: 80, cls: 0.02 } }] }))
      .expect(204);
    expect([...pendingRumForTests().keys()].some((k) => k.endsWith("|home|desktop|windows|inp"))).toBe(true);
    await request(app).post("/v1/storefront/rum").set("Content-Type", "text/plain").send("{nope").expect(400);
    await request(app).post("/v1/storefront/rum").send({ r: [] }).expect(400);
  });
});
