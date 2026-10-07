import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";
import { AI_DEFAULTS } from "../modules/ai/ai.settings.js";
import { setAiProvider, type AiPrompt } from "../modules/ai/ai.client.js";
import { aiPublicLimits } from "../modules/ai/ai.guard.js";
import { setStudioFetch, setStudioUpload } from "../modules/ai/ai.service.js";
import { clearStyleCache } from "../modules/razan/styleQuiz.service.js";

/** A fake model: answers by feature, remembers the prompts. */
const seen: AiPrompt[] = [];
let answer: (p: AiPrompt) => unknown = () => ({});
const fake = {
  json: async <T,>(p: AiPrompt) => {
    seen.push(p);
    return { ok: true as const, data: answer(p) as T };
  },
  editImage: async () => ({ ok: true as const, png: await sharp({ create: { width: 8, height: 8, channels: 3, background: "#ffffff" } }).png().toBuffer() }),
};

const setAi = (patch: Record<string, unknown>) => request(app).put("/v1/admin/ai").send({ ...AI_DEFAULTS, ...patch });

beforeEach(async () => {
  seen.length = 0;
  answer = () => ({});
  aiPublicLimits.perIpHour = 1000;
  setAiProvider(null);
  await prisma.aiCache.deleteMany();
  await prisma.aiUsage.deleteMany();
  await setAi({}).expect(200);
  await resetDb();
  clearStyleCache();
  await prisma.category.createMany({ data: [{ id: "caicat00001", name: "عبايات", slug: "ai-abayas" }, { id: "caicat00002", name: "حجابات", slug: "ai-hijabs" }] });
  for (const [id, name, order] of [["caisizem001", "M", 1], ["caisizel001", "L", 2], ["caisizeone1", "مقاس واحد", 3]] as const) await prisma.size.create({ data: { id, name, order } });
  const mk = (id: string, title: string, cat: string, color: string, hex: string, sizes: string[], price: number) =>
    prisma.product.create({
      data: {
        id, title, slug: `ai-${id}`, isActive: true, categoryId: cat,
        items: { create: [{ colorName: color, colorHex: hex, skuBase: id, images: { create: [{ id: `${id}img`, url: `https://img.test/${id}.jpg`, isPrimary: true }] }, variants: { create: sizes.map((s) => ({ sku: `${id}-${s}`, price: new Prisma.Decimal(price), stock: 20, size: { connect: { id: s } } })) } }] },
      },
    });
  await mk("caiabaya001", "عباية كريب سوداء", "caicat00001", "أسود", "#1c1c1e", ["caisizem001", "caisizel001"], 250);
  await mk("caihijab001", "حجاب شيفون خمري", "caicat00002", "خمري", "#6b2446", ["caisizeone1"], 60);
  await mk("caihijab002", "حجاب قطن بيج", "caicat00002", "بيج", "#d8c3a5", ["caisizeone1"], 45);
  await mk("caihijab003", "حجاب جيرسيه كحلي", "caicat00002", "كحلي", "#1f2a4a", ["caisizeone1"], 50);
});
afterAll(() => setAiProvider(null));

describe("AI features", () => {
  test("off without the key: can't be switched on; everything says FEATURE_OFF", async () => {
    expect((await setAi({ smartSearch: true }).expect(400)).body.error).toBe("AI_KEY_MISSING");
    expect((await request(app).get("/v1/admin/ai").expect(200)).body).toMatchObject({ keyReady: false, settings: { smartSearch: false } });
    expect((await request(app).post("/v1/ai/search").send({ q: "فستان سهرة" }).expect(404)).body.error).toBe("FEATURE_OFF");
    // Same from the features page.
    expect((await request(app).patch("/v1/admin/features/ai-smartSearch").send({ enabled: true }).expect(400)).body.error).toBe("NEEDS_SETUP");
    // Order flags are plain rules: they need no key.
    await setAi({ orderFlags: true }).expect(200);
    await request(app).patch("/v1/admin/features/ai-orderFlags").send({ enabled: false }).expect(200);
    expect((await request(app).get("/v1/admin/ai").expect(200)).body.settings.orderFlags).toBe(false);
  });

  test("product writer: fills the page from photos, keeps only the type's real options", async () => {
    setAiProvider(fake);
    await setAi({ productWriter: true }).expect(200);
    answer = () => ({
      title: "عباية كريب سوداء بأكمام واسعة",
      description: "عباية أنيقة.\n• قماش كريب",
      seoTitle: "عباية كريب سوداء",
      seoDescription: "عباية كريب سوداء واسعة ومريحة",
      colors: ["أسود"],
      attributes: { fabric: "كريب", occasion: ["يومي", "حفلة على القمر"], length: "140", invented: "x" },
    });
    const out = (await request(app).post("/v1/admin/ai-catalog/product-writer").send({
      images: ["https://img.test/a.jpg"],
      fields: [{ key: "fabric", label: "القماش", kind: "select", options: ["كريب", "شيفون"] }, { key: "occasion", label: "المناسبة", kind: "multiselect", options: ["يومي", "سهرة"] }, { key: "length", label: "الطول", kind: "number" }],
    }).expect(200)).body;
    expect(out).toMatchObject({ title: "عباية كريب سوداء بأكمام واسعة", colors: ["أسود"] });
    expect(out.attributes).toEqual({ fabric: "كريب", occasion: ["يومي"], length: 140 });
    expect(seen[0].images).toEqual(["https://img.test/a.jpg"]);
    const usage = (await request(app).get("/v1/admin/ai").expect(200)).body.usage30;
    expect(usage.productWriter).toBe(1);
  });

  test("search in her words → real filters only, and the same sentence isn't paid for twice", async () => {
    setAiProvider(fake);
    await setAi({ smartSearch: true }).expect(200);
    answer = () => ({ keywords: "عباية", categoryId: "caicat00001", colors: ["أسود", "بنفسجي فضائي"], sizes: ["L", "XXXL"], maxPrice: 300, summary: "عباية سوداء لحد ₪300" });
    const a = (await request(app).post("/v1/ai/search").send({ q: "بدي عباية سودا مقاس L لحد 300" }).expect(200)).body;
    expect(a).toEqual({ q: "عباية", categoryId: "caicat00001", colors: ["أسود"], sizeIds: ["caisizel001"], minPrice: null, maxPrice: 300, summary: "عباية سوداء لحد ₪300" });
    await request(app).post("/v1/ai/search").send({ q: "بدي عباية سودا مقاس L لحد 300" }).expect(200);
    expect(seen).toHaveLength(1);
  });

  test("complete the look: picks only from the shop's other pieces, with reasons", async () => {
    setAiProvider(fake);
    await setAi({ shopTheLook: true }).expect(200);
    answer = (p) => {
      expect(p.user).toContain("caihijab001");
      expect(p.user).not.toContain("caiabaya001 |");
      return { picks: [{ id: "caihijab002", reason: "البيج بيلبق مع الأسود" }, { id: "nope", reason: "x" }, { id: "caihijab001", reason: "لمسة لون" }] };
    };
    const out = (await request(app).get("/v1/ai/look/caiabaya001").expect(200)).body;
    expect(out.products.map((p: any) => p.id)).toEqual(["caihijab002", "caihijab001"]);
    expect(out.products[0]).toMatchObject({ slug: "ai-caihijab002", reason: "البيج بيلبق مع الأسود", price: 45 });
  });

  test("size advice: one of the piece's sizes or nothing; one-size pieces aren't asked", async () => {
    setAiProvider(fake);
    await setAi({ sizeAdvice: true }).expect(200);
    answer = () => ({ size: "l", confidence: "medium", why: "العباية واسعة، L أريح." });
    const out = (await request(app).post("/v1/ai/size").send({ productId: "caiabaya001", height: 165, weight: 70, fit: "loose" }).expect(200)).body;
    expect(out).toEqual({ size: "L", inStock: true, confidence: "medium", why: "العباية واسعة، L أريح." });
    expect((await request(app).post("/v1/ai/size").send({ productId: "caihijab001", height: 165, weight: 70 }).expect(409)).body.error).toBe("ONE_SIZE");
    answer = () => ({ size: "XXL", confidence: "high", why: "" });
    expect((await request(app).post("/v1/ai/size").send({ productId: "caiabaya001", height: 165, weight: 70 }).expect(502)).body.error).toBe("AI_FAILED");
    await request(app).post("/v1/ai/size").send({ productId: "caiabaya001", height: 20, weight: 70 }).expect(400);
  });

  test("review summary: from 3 approved reviews, saved until a review changes", async () => {
    setAiProvider(fake);
    await setAi({ reviewSummary: true }).expect(200);
    expect((await request(app).get("/v1/ai/reviews/caiabaya001").expect(200)).body).toEqual({ summary: null, count: 0 });
    for (const [rating, body] of [[5, "قماش رائع"], [4, "مقاسها مزبوط"], [3, "التوصيل تأخر شوي"]] as const) await prisma.review.create({ data: { productId: "caiabaya001", rating, body, status: "APPROVED" } });
    answer = () => ({ ar: "القماش حلو والمقاس مزبوط.", en: "Nice fabric, true to size.", pros: ["قماش حلو"], cons: ["التوصيل تأخر"] });
    const a = (await request(app).get("/v1/ai/reviews/caiabaya001").expect(200)).body;
    expect(a).toMatchObject({ count: 3, average: 4, summary: { en: "Nice fabric, true to size.", cons: ["التوصيل تأخر"] } });
    await request(app).get("/v1/ai/reviews/caiabaya001").expect(200);
    expect(seen).toHaveLength(1);
  });

  test("the owner asks in plain words: the answer is built from the shop's own numbers", async () => {
    setAiProvider(fake);
    await setAi({ adminAsk: true }).expect(200);
    await request(app).post("/v1/catalog/order-requests").send({ items: [{ variantId: (await prisma.productVariant.findFirst({ where: { sku: "caiabaya001-caisizel001" } }))!.id, quantity: 2 }], customerName: "سارة", phone: "0599123456", city: "رام الله" }).expect(201);
    answer = (p) => {
      const data = JSON.parse(p.user.split("Data:\n")[1].split("\n\nQuestion")[0]);
      expect(data.topProducts30Days[0]).toMatchObject({ title: "عباية كريب سوداء", quantity: 2 });
      expect(data.sales.last30Days.orders).toBe(1);
      return { answer: "أكثر قطعة: عباية كريب سوداء (2).", figures: [{ label: "قطع", value: 2 }] };
    };
    const out = (await request(app).post("/v1/admin/ai-ask").send({ question: "شو أكثر قطعة بعنا هالشهر؟" }).expect(200)).body;
    expect(out.figures).toEqual([{ label: "قطع", value: 2 }]);
  });

  test("WhatsApp reply ideas and order flags on an order", async () => {
    setAiProvider(fake);
    await setAi({ replySuggest: true, orderFlags: true }).expect(200);
    const v = (await prisma.productVariant.findFirst({ where: { sku: "caiabaya001-caisizem001" } }))!.id;
    const make = (phone: string, qty = 1, name = "سارة أحمد") => request(app).post("/v1/catalog/order-requests").send({ items: [{ variantId: v, quantity: qty }], customerName: name, phone, city: "رام الله" }).expect(201);
    const calm = (await make("0599123456")).body.id;
    expect((await request(app).get(`/v1/admin/ai-orders/flags/${calm}`).expect(200)).body).toMatchObject({ level: "ok", score: 0, reasons: [] });
    await make("0599777000");
    await make("+970599777000");
    const odd = (await make("0599777000", 2, "aa1")).body.id;
    const f = (await request(app).get(`/v1/admin/ai-orders/flags/${odd}`).expect(200)).body;
    expect(f.reasons).toEqual(expect.arrayContaining(["3 طلبات من نفس الرقم خلال يوم", "الاسم غريب (قصير أو فيه أرقام)"]));
    expect(f.level).not.toBe("ok");

    answer = (p) => {
      expect(p.user).toContain("Her first name: سارة");
      expect(p.user).toContain("بدي أغيّر المقاس");
      return { replies: [{ label: "تغيير المقاس", text: "أهلاً سارة 🌸 أكيد، أي مقاس بدك؟" }, { label: "", text: "  " }] };
    };
    const r = (await request(app).post("/v1/admin/ai-orders/reply").send({ orderId: calm, message: "بدي أغيّر المقاس" }).expect(200)).body;
    expect(r.replies).toEqual([{ label: "تغيير المقاس", text: "أهلاً سارة 🌸 أكيد، أي مقاس بدك؟" }]);
  });

  test("photo studio: a new photo for the product page (only with Cloudinary)", async () => {
    setAiProvider(fake);
    setStudioFetch(async () => sharp({ create: { width: 20, height: 30, channels: 3, background: "#888" } }).jpeg().toBuffer());
    setStudioUpload(async () => "https://res.test/studio.png");
    await setAi({ photoStudio: true }).expect(200);
    expect((await request(app).get("/v1/admin/ai-catalog/status").expect(200)).body).toEqual({ productWriter: false, photoStudio: false }); // no Cloudinary here
    const res = await request(app).post("/v1/admin/ai-catalog/photo-studio").send({ imageUrl: "https://img.test/caiabaya001.jpg", style: "white" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("CLOUDINARY_NOT_CONFIGURED");
    const { photoStudio } = await import("../modules/ai/ai.service.js");
    expect(await photoStudio("https://img.test/caiabaya001.jpg", "white", { cloudinaryReady: true })).toEqual({ url: "https://res.test/studio.png" });
    setStudioFetch(async () => Buffer.from("not an image"));
    await expect(photoStudio("https://img.test/x.jpg", "white", { cloudinaryReady: true })).rejects.toMatchObject({ code: "BAD_IMAGE" });
  });

  test("shoppers can't run up the bill: the owner's daily ceiling", async () => {
    setAiProvider(fake);
    await setAi({ smartSearch: true, dailyLimit: 10 }).expect(200);
    answer = () => ({ keywords: "x" });
    for (let i = 0; i < 10; i++) await request(app).post("/v1/ai/search").send({ q: `سؤال ${i}` }).expect(200);
    expect((await request(app).post("/v1/ai/search").send({ q: "سؤال 11" }).expect(429)).body.error).toBe("AI_BUSY");
  });
});
