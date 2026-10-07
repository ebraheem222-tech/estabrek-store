import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";
import { RAZAN_DEFAULTS } from "../modules/razan/razan.settings.js";
import { clearStyleCache, hexToLab, nearestPalette } from "../modules/razan/styleQuiz.service.js";

/** A 16-number "photo vector" leaning towards one direction (similar looks share a direction). */
const vec = (dir: number, wobble = 0) => Array.from({ length: 16 }, (_, i) => (i === dir ? 1 : 0.05) + (i === (dir + 1) % 16 ? wobble : 0));

let n = 0;
async function piece(opts: { title: string; cat: string; color: string; hex: string; sizes: Array<[string, number]>; price: number; attrs?: Record<string, unknown>; photo?: number[] }) {
  n++;
  return prisma.product.create({
    data: {
      title: opts.title,
      slug: `sq-${n}`,
      isActive: true,
      categoryId: opts.cat,
      attributes: (opts.attrs ?? {}) as Prisma.InputJsonValue,
      items: {
        create: [{
          colorName: opts.color,
          colorHex: opts.hex,
          skuBase: `SQ${n}`,
          images: { create: [{ url: `https://img.test/${n}.jpg`, isPrimary: true, ...(opts.photo ? { embedding: opts.photo } : {}) }] },
          variants: { create: opts.sizes.map(([s, stock]) => ({ sku: `SQ${n}-${s}`, price: new Prisma.Decimal(opts.price), stock, size: { connect: { id: `sqsize${s}` } } })) },
        }],
      },
    },
  });
}

const quizOn = (patch: Record<string, unknown> = {}) =>
  request(app).put("/v1/admin/razan").send({ ...RAZAN_DEFAULTS, styleQuiz: { enabled: true, results: 4, variety: "medium", ...patch } }).expect(200);

beforeEach(async () => {
  clearStyleCache();
  await prisma.razanStat.deleteMany();
  await request(app).put("/v1/admin/razan").send(RAZAN_DEFAULTS).expect(200);
  await resetDb();
  await prisma.category.createMany({ data: [{ id: "sqcatabaya1", name: "عبايات", slug: "abayas-sq" }, { id: "sqcathijab1", name: "حجابات", slug: "hijabs-sq" }] });
  for (const [s, order] of [["S", 1], ["M", 2], ["L", 3], ["XL", 4]] as const) await prisma.size.create({ data: { id: `sqsize${s}`, name: s, order } });
  await prisma.size.create({ data: { id: "sqsizeOne", name: "مقاس واحد", order: 9 } });

  await piece({ title: "عباية سهرة مخمل خمري", cat: "sqcatabaya1", color: "خمري", hex: "#6b2446", sizes: [["M", 2], ["L", 1]], price: 380, attrs: { occasion: ["عرس", "سهرة"], fabric: "مخمل" }, photo: vec(0) });
  await piece({ title: "عباية كريب خمري للأعراس", cat: "sqcatabaya1", color: "عنابي", hex: "#70223f", sizes: [["L", 3]], price: 300, attrs: { occasion: ["عرس"] }, photo: vec(0, 0.1) });
  await piece({ title: "عباية يومية كتان بيج", cat: "sqcatabaya1", color: "بيج", hex: "#d6c1a1", sizes: [["M", 4], ["L", 4]], price: 190, attrs: { occasion: "يومي", fabric: "كتان" }, photo: vec(5) });
  await piece({ title: "عباية عرس كحلي", cat: "sqcatabaya1", color: "كحلي", hex: "#1f2a4a", sizes: [["S", 2]], price: 350, attrs: { occasion: ["عرس"] }, photo: vec(9) });
  await piece({ title: "حجاب شيفون خمري", cat: "sqcathijab1", color: "خمري", hex: "#6d2345", sizes: [["One", 10]], price: 60, attrs: { occasion: ["سهرة"] }, photo: vec(0, 0.3) });
  await piece({ title: "عباية خلصت", cat: "sqcatabaya1", color: "خمري", hex: "#6b2446", sizes: [["L", 0]], price: 200 });
});

describe("«رزان بتختارلك»", () => {
  test("off until the owner turns it on", async () => {
    expect((await request(app).get("/v1/razan/style/start").expect(404)).body.error).toBe("FEATURE_OFF");
    expect((await request(app).post("/v1/razan/style").send({}).expect(404)).body.error).toBe("FEATURE_OFF");
  });

  test("the quiz's choices come from what the shop has now", async () => {
    await quizOn();
    const s = (await request(app).get("/v1/razan/style/start").expect(200)).body;
    expect(s.occasions.map((o: any) => o.key)).toEqual(expect.arrayContaining(["daily", "evening", "wedding"]));
    expect(s.occasions.map((o: any) => o.key)).not.toContain("prayer");
    expect(s.colors.map((c: any) => c.key)).toEqual(expect.arrayContaining(["wine", "beige", "navy"]));
    expect(s.sizes).toEqual(["S", "M", "L"]); // in stock only, the owner's order, one-size left out
    expect(s.photos.length).toBe(5); // sold-out pieces aren't offered
    expect(s.total).toBe(5);
  });

  test("nearest pieces to her answers, her size only, with reasons — and not all the same", async () => {
    await quizOn();
    const res = (await request(app).post("/v1/razan/style").send({ occasion: "wedding", colors: ["wine"], size: "L", look: "full", budgetMax: 400 }).expect(200)).body;
    const titles = res.products.map((p: any) => p.title);
    expect(titles[0]).toMatch(/خمري/);
    expect(titles).not.toContain("عباية عرس كحلي"); // no L
    expect(titles).not.toContain("عباية خلصت");
    expect(res.products[0].reasons).toEqual(expect.arrayContaining(["بتنفع لـالأعراس"]));
    expect(res.products[0].reasons.join(" ")).toMatch(/لونها \((خمري|عنابي)\)/);
    expect(res.products.length).toBeLessThanOrEqual(4);
    // The one-size hijab fits any size.
    expect(titles).toContain("حجاب شيفون خمري");
  });

  test("photos she liked pull similar looks up; 👎 and «غيرهم» take pieces out", async () => {
    await quizOn({ results: 3 });
    const all = await prisma.product.findMany({ select: { id: true, title: true } });
    const id = (t: string) => all.find((p) => p.title === t)!.id;
    const liked = (await request(app).post("/v1/razan/style").send({ liked: [id("عباية يومية كتان بيج")] }).expect(200)).body;
    expect(liked.products[0].title).toBe("عباية يومية كتان بيج");
    expect(liked.products[0].reasons).toContain("شبه القطع اللي عجبتكِ");
    const less = (await request(app).post("/v1/razan/style").send({ colors: ["wine"], disliked: [id("عباية سهرة مخمل خمري")], exclude: [id("حجاب شيفون خمري")] }).expect(200)).body;
    expect(less.products.map((p: any) => p.title)).not.toEqual(expect.arrayContaining(["عباية سهرة مخمل خمري"]));
    expect(less.products.map((p: any) => p.title)).not.toContain("حجاب شيفون خمري");
  });

  test("nothing close: she's told (and can ask for it); the owner sees anonymous answer totals", async () => {
    await quizOn();
    const none = (await request(app).post("/v1/razan/style").send({ budgetMax: 20, final: true }).expect(200)).body;
    expect(none).toMatchObject({ noMatch: true, products: [] });
    await request(app).post("/v1/razan/style").send({ occasion: "wedding", season: "winter", colors: ["wine", "navy"], look: "full", budgetMax: 250, final: true }).expect(200);
    await request(app).post("/v1/razan/style").send({ occasion: "wedding", liked: [] }).expect(200); // refining isn't counted again
    const report = (await request(app).get("/v1/admin/razan/report").expect(200)).body;
    expect(report.totals["quiz:done"].d7).toBe(1);
    expect(report.totals["quiz:nomatch"].d7).toBe(1);
    expect(report.quiz.occasion).toEqual([{ value: "wedding", count: 1 }]);
    expect(report.quiz.color).toEqual(expect.arrayContaining([{ value: "wine", count: 1 }, { value: "navy", count: 1 }]));
    expect(report.quiz.budget).toEqual(expect.arrayContaining([{ value: "300", count: 1 }, { value: "150", count: 1 }]));
    expect(Object.keys(report.byDay[Object.keys(report.byDay)[0]]).some((k) => k.startsWith("quiz:o:"))).toBe(false);
  });

  test("colour maths: shop colours land on the right quiz colour", () => {
    expect(nearestPalette(hexToLab("#70223f")!).key).toBe("wine");
    expect(nearestPalette(hexToLab("#d6c1a1")!).key).toBe("beige");
    expect(nearestPalette(hexToLab("#000000")!).key).toBe("black");
    expect(hexToLab("nope")).toBeNull();
  });
});
