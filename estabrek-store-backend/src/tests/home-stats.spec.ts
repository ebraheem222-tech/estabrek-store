import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";
import { flushHomeStats, noteHomeStats, resetHomeStatsForTests, suggestOrder } from "../lib/homeStats.js";
import { checkValues, resetAbForTests } from "../lib/experiments.js";

// The home page's sections in numbers (lib/homeStats.ts), the order they suggest, and trying that order as an
// A/B test whose B, kept, reorders the published home.

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/604.1";
const who = (ip: string) => ({ ip, userAgent: UA });

beforeEach(async () => {
  resetHomeStatsForTests();
  resetAbForTests();
  await prisma.homeSectionDay.deleteMany();
  await prisma.experiment.deleteMany();
  await resetDb();
  await prisma.page.deleteMany({ where: { slug: "/" } });
  await prisma.page.create({
    data: {
      name: "Home", slug: "/", status: "PUBLISHED",
      sections: {
        create: [
          { id: "chome00hero", type: "HERO", order: 0, data: { title: "أناقة تشبهكِ" } },
          { id: "chome00grid", type: "FEATURED_PRODUCTS", order: 1, data: { title: "وصل حديثاً" } },
          { id: "chome00faqs", type: "FAQ", order: 2, data: { title: "أسئلة" } },
          { id: "chome00cats", type: "FEATURED_CATEGORIES", order: 3, data: {} },
        ],
      },
    },
  });
});

/** `n` visits see a section; `taps` of them tap in it, `bags` add to the bag after. */
function visits(section: string, n: number, taps: number, bags: number) {
  for (let i = 0; i < n; i++) {
    const v = who(`10.1.${section.length}.${i}`);
    const e: Array<{ s: string; k: "seen" | "tap" | "bag" }> = [{ s: section, k: "seen" }];
    if (i < taps) e.push({ s: section, k: "tap" });
    if (i < bags) e.push({ s: section, k: "bag" });
    noteHomeStats(e, v);
  }
}

describe("the home page's sections in numbers", () => {
  test("counted once per visitor, bots left out, saved by day; the route takes only section keys", async () => {
    noteHomeStats([{ s: "s:chome00grid", k: "seen" }, { s: "s:chome00grid", k: "seen" }, { s: "s:chome00grid", k: "tap" }], who("10.0.0.1"));
    noteHomeStats([{ s: "s:chome00grid", k: "seen" }], { ip: "10.0.0.2", userAgent: "Googlebot/2.1 (+http://www.google.com/bot.html)" });
    noteHomeStats([{ s: "b:seasons", k: "seen" }], who("10.0.0.3"));
    await flushHomeStats();
    const rows = await prisma.homeSectionDay.findMany({ orderBy: { section: "asc" } });
    expect(rows.map((r) => [r.section, r.seen, r.taps, r.bags])).toEqual([["b:seasons", 1, 0, 0], ["s:chome00grid", 1, 1, 0]]);

    await request(app).post("/v1/storefront/home-stats").set("Content-Type", "text/plain").send(JSON.stringify({ e: [{ s: "s:chome00faqs", k: "tap" }] })).expect(204);
    await request(app).post("/v1/storefront/home-stats").set("Content-Type", "text/plain").send(JSON.stringify({ e: [{ s: "<script>", k: "tap" }] })).expect(400);
    await request(app).post("/v1/storefront/home-stats").set("Content-Type", "text/plain").send("{nope").expect(400);
  });

  test("the suggested order: the opening stays first, sections with enough visits ranked in their places", () => {
    const n = (seen: number, taps: number, bags = 0) => ({ seen, taps, bags });
    const current = ["s:hero", "s:a", "s:b", "s:c", "s:d"];
    // b and d do best; c has too few visits and keeps its place.
    const totals = new Map([["s:hero", n(500, 400)], ["s:a", n(100, 5)], ["s:b", n(100, 20, 4)], ["s:c", n(5, 5)], ["s:d", n(100, 30)]]);
    expect(suggestOrder(current, totals)).toEqual(["s:hero", "s:b", "s:d", "s:c", "s:a"]);
    // Already best, or not enough to say: nothing to suggest.
    expect(suggestOrder(["s:hero", "s:b", "s:d", "s:a"], totals)).toBeNull();
    expect(suggestOrder(current, new Map([["s:a", n(100, 5)]]))).toBeNull();
  });

  test("the admin's numbers: each section named, its rates, and the order to try", async () => {
    visits("s:chome00grid", 40, 4, 0);
    visits("s:chome00faqs", 40, 2, 0);
    visits("s:chome00cats", 40, 16, 2);
    visits("b:seasons", 30, 3, 0);
    const out = (await request(app).get("/v1/admin/experiments/home-sections?days=30").expect(200)).body;
    expect(out.current).toEqual(["s:chome00hero", "s:chome00grid", "s:chome00faqs", "s:chome00cats"]);
    expect(out.suggested).toEqual(["s:chome00hero", "s:chome00cats", "s:chome00grid", "s:chome00faqs"]);
    const cats = out.sections.find((s: { key: string }) => s.key === "s:chome00cats");
    expect(cats).toMatchObject({ label: "الأقسام", seen: 40, taps: 16, bags: 2, tapRate: 0.4, enough: true, onPage: true });
    expect(out.sections.find((s: { key: string }) => s.key === "s:chome00grid").label).toBe("منتجات مختارة · وصل حديثاً");
    expect(out.sections.find((s: { key: string }) => s.key === "b:seasons")).toMatchObject({ label: "المواسم", onPage: false, seen: 30 });
  });

  test("trying the order: A is the page as published, B the order; keeping B reorders the published home", async () => {
    expect(checkValues("homeOrder", null, "published", ["s:chome00hero", "s:chome00cats"])).toEqual({ a: "published", b: ["s:chome00hero", "s:chome00cats"] });
    expect(checkValues("homeOrder", null, "published", ["s:x", "s:x"])).toBe("BAD_VALUE");
    expect(checkValues("homeOrder", null, "other", ["s:a", "s:b"])).toBe("BAD_VALUE");

    const b = ["s:chome00hero", "s:chome00cats", "s:chome00grid", "s:chome00faqs"];
    const created = (await request(app).post("/v1/admin/experiments").send({ name: "ترتيب الرئيسية", kind: "homeOrder", a: "published", b }).expect(201)).body.experiment;
    await request(app).post(`/v1/admin/experiments/${created.id}/start`).expect(200);
    // The shop gets it with the public settings.
    const site = (await request(app).get("/v1/storefront/settings").expect(200)).body.site;
    expect(site.experiments).toEqual([expect.objectContaining({ id: created.id, kind: "homeOrder", a: "published", b })]);

    await request(app).post(`/v1/admin/experiments/${created.id}/keep`).send({ winner: "B" }).expect(200);
    const home = await prisma.page.findUnique({ where: { slug: "/" }, select: { sections: { orderBy: { order: "asc" }, select: { id: true } } } });
    expect(home!.sections.map((s) => s.id)).toEqual(["chome00hero", "chome00cats", "chome00grid", "chome00faqs"]);
  });
});
