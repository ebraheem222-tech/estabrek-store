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

/** A fake model: answers by what it was asked, remembers the prompts and the edited photos' words. */
const seen: AiPrompt[] = [];
const edits: string[] = [];
let answer: (p: AiPrompt) => unknown = () => ({});
const fake = {
  json: async <T,>(p: AiPrompt) => {
    seen.push(p);
    return { ok: true as const, data: answer(p) as T };
  },
  editImage: async (_img: Buffer, prompt: string) => {
    edits.push(prompt);
    return { ok: true as const, png: await sharp({ create: { width: 8, height: 8, channels: 3, background: "#ffffff" } }).png().toBuffer() };
  },
};

const setAi = (patch: Record<string, unknown>) => request(app).put("/v1/admin/ai").send({ ...AI_DEFAULTS, ...patch });
const chat = (body: Record<string, unknown>) => request(app).post("/v1/storefront/chatbot/message").send({ sessionId: "s-one", locale: "ar", ...body });
const setStorefront = async (storefront: Record<string, unknown>) => {
  const s = await prisma.siteSettings.findFirst();
  const header = (s?.header ?? {}) as Record<string, unknown>;
  await prisma.siteSettings.update({ where: { id: s!.id }, data: { header: { ...header, storefront: { ...((header.storefront as object) ?? {}), ...storefront } } as Prisma.InputJsonValue } });
};

beforeEach(async () => {
  seen.length = 0;
  edits.length = 0;
  answer = () => ({});
  aiPublicLimits.perIpHour = 1000;
  setAiProvider(null);
  await prisma.aiCache.deleteMany();
  await prisma.aiUsage.deleteMany();
  await prisma.chatbotConversation.deleteMany();
  await prisma.chatbotEntry.deleteMany();
  await setAi({}).expect(200);
  await prisma.siteSettings.updateMany({ data: { siteName: "استبرق ستور", contactPhone: null, contactEmail: null } });
  await setStorefront({ whatsappEnabled: false, whatsappNumber: "", assistantPersona: "" });
  await resetDb();
  await prisma.category.create({ data: { id: "cagcat00001", name: "عبايات", slug: "ag-abayas" } });
  for (const [id, name, order] of [["cagsizem001", "AG-M", 1], ["cagsizel001", "AG-L", 2]] as const) await prisma.size.create({ data: { id, name, order } });
  const mk = (id: string, title: string, color: string, stock: Record<string, number>, price: number, extra: Partial<Prisma.ProductCreateInput> = {}) =>
    prisma.product.create({
      data: {
        id, title, slug: `ag-${id}`, isActive: true, category: { connect: { id: "cagcat00001" } }, deliveryMinDays: 2, deliveryMaxDays: 4, ...extra,
        items: { create: [{ colorName: color, skuBase: id, images: { create: [{ id: `${id}im1`, url: `https://img.test/${id}.jpg`, isPrimary: true, view: "front" }, { id: `${id}im2`, url: `https://img.test/${id}-2.jpg`, alt: "موجود" }] }, variants: { create: Object.entries(stock).map(([s, n]) => ({ sku: `${id}-${s}`, price: new Prisma.Decimal(price), stock: n, size: { connect: { id: s } } })) } }] },
      },
    });
  await mk("cagabaya001", "عباية كريب سوداء", "أسود", { cagsizem001: 5, cagsizel001: 0 }, 250, { description: "عباية واسعة" });
  await mk("cagabaya002", "عباية مخمل خمري", "خمري", { cagsizem001: 3 }, 320, { seoTitle: "عباية مخمل خمري للسهرات والمناسبات", seoDescription: "عباية مخمل بلون خمري غني، قصة واسعة مريحة، مثالية للسهرات والمناسبات والعزايم بالشتاء." });
});
afterAll(async () => {
  setAiProvider(null);
  await prisma.chatbotConversation.deleteMany();
  await prisma.chatbotEntry.deleteMany();
});

describe("the smart shop assistant", () => {
  test("off: the owner's answers reply as before, and no model is asked", async () => {
    setAiProvider(fake);
    await prisma.chatbotEntry.create({ data: { title: "مدة التوصيل", answer: "التوصيل من يومين لأربع أيام", tags: ["توصيل"] } });
    const r = (await chat({ message: "كم مدة التوصيل؟" }).expect(200)).body;
    expect(r).toMatchObject({ ok: true, reply: "التوصيل من يومين لأربع أيام", mode: "kb", suggestions: [], handoff: null });
    expect(seen).toHaveLength(0);
  });

  test("on: it knows the piece on screen, shows only real pieces, remembers the talk and counts as a shopper's call", async () => {
    setAiProvider(fake);
    await setAi({ shopAgent: true }).expect(200);
    await prisma.chatbotEntry.create({ data: { title: "الإرجاع", answer: "بترجعي القطعة خلال 14 يوم", tags: ["ارجاع"] } });
    answer = () => ({ answer: "مقاس AG-L خلص بالأسود، بس في AG-M. وهاي كمان بتعجبك:", productIds: ["cagabaya002", "made-up-id", "cagabaya001"], suggestions: ["كم سعرها؟", "بتوصل لجنين؟"], answered: true });
    const first = (await chat({ message: "في مقاس AG-L؟", pageUrl: "https://shop.test/ar/p/ag-cagabaya001" }).expect(200)).body;
    expect(first.mode).toBe("agent");
    expect(first.reply).toContain("مقاس AG-L خلص");
    expect(first.products.map((p: { id: string }) => p.id)).toEqual(["cagabaya002", "cagabaya001"]);
    expect(first.products[1]).toMatchObject({ slug: "ag-cagabaya001", title: "عباية كريب سوداء", imageUrl: "https://img.test/cagabaya001.jpg", minPrice: 250 });
    expect(first.suggestions).toEqual(["كم سعرها؟", "بتوصل لجنين؟"]);
    expect(first.handoff).toBeNull();
    const p = seen.at(-1)!;
    expect(p.user).toContain("The piece on the shopper's screen now:\n- id=cagabaya001 | عباية كريب سوداء | 250 ILS");
    expect(p.user).toContain("sizes in stock: AG-M | sold out: AG-L");
    expect(p.user).toContain("delivery: 2–4 أيام");
    expect(p.user).toContain("الإرجاع — بترجعي القطعة خلال 14 يوم");
    expect(p.system).toContain("استبرق ستور");

    // The second question carries the talk so far.
    answer = () => ({ answer: "سعرها 250 شيكل", productIds: [], suggestions: [], answered: true });
    await chat({ conversationId: first.conversationId, message: "كم سعرها؟", pageUrl: "https://shop.test/ar/p/ag-cagabaya001" }).expect(200);
    expect(seen.at(-1)!.user).toContain("Shopper: في مقاس AG-L؟\nYou: مقاس AG-L خلص");
    const convo = await prisma.chatbotConversation.findUnique({ where: { id: first.conversationId } });
    expect((convo!.messages as unknown[]).length).toBe(4);
    expect((await request(app).get("/v1/admin/ai").expect(200)).body.usage30.shopAgent).toBe(2);

    // Another device's id never reads or adds to this talk: a new one starts.
    const other = (await chat({ sessionId: "s-two", conversationId: first.conversationId, message: "مرحبا" }).expect(200)).body;
    expect(other.conversationId).not.toBe(first.conversationId);
    expect(seen.at(-1)!.user).not.toContain("The talk so far");
  });

  test("what it can't answer: handed over to WhatsApp with the question, and listed for the owner", async () => {
    setAiProvider(fake);
    await setAi({ shopAgent: true }).expect(200);
    await setStorefront({ whatsappEnabled: true, whatsappNumber: "+970 599 123 456" });
    answer = () => ({ answer: "ما عندي معلومة عن التغليف، فريق المتجر بيساعدك.", answered: false });
    const r = (await chat({ message: "بتغلفوا هدايا؟" }).expect(200)).body;
    expect(r.handoff).toBe(`https://wa.me/970599123456?text=${encodeURIComponent("مرحبا! سألت مساعد المتجر: «بتغلفوا هدايا؟»")}`);
    await chat({ sessionId: "s-two", message: "بتغلفوا هدايا؟" }).expect(200);
    const misses = (await request(app).get("/v1/admin/chatbot/misses").expect(200)).body.items;
    expect(misses).toHaveLength(1);
    expect(misses[0]).toMatchObject({ question: "بتغلفوا هدايا؟", count: 2, covered: false });
    // Once the owner writes the answer, it shows as answered.
    await request(app).post("/v1/admin/chatbot/entries").send({ title: "بتغلفوا هدايا؟", answer: "إي، تغليف هدايا مجاني" }).expect(200);
    expect((await request(app).get("/v1/admin/chatbot/misses").expect(200)).body.items[0].covered).toBe(true);
  });

  test("the personality speaks only when it is the owner's pick; resting for today means the owner's answers, no model", async () => {
    setAiProvider(fake);
    await setAi({ shopAgent: true, dailyLimit: 10 }).expect(200);
    answer = () => ({ answer: "أهلين!", answered: true });
    const layla = { id: "layla", name: "ليلى", role: "مستشارة الأناقة", tone: "playful" };
    await chat({ message: "مرحبا", persona: layla }).expect(200);
    expect(seen.at(-1)!.system).not.toContain("ليلى");
    await setStorefront({ assistantPersona: "layla" });
    await chat({ message: "مرحبا", persona: layla }).expect(200);
    expect(seen.at(-1)!.system).toContain("You are ليلى, مستشارة الأناقة");

    // The day's ceiling for shoppers: the assistant rests, the owner's answers still reply.
    await prisma.aiUsage.updateMany({ data: { count: 10 } });
    await prisma.chatbotEntry.create({ data: { title: "ساعات الدوام", answer: "منفتح من 10 الصبح لـ 10 بالليل" } });
    const calls = seen.length;
    const r = (await chat({ message: "شو ساعات الدوام؟" }).expect(200)).body;
    expect(r.mode).toBe("kb");
    expect(r.reply).toBe("منفتح من 10 الصبح لـ 10 بالليل");
    expect(seen.length).toBe(calls);
  });
});

describe("social posts", () => {
  test("off until switched on; posts for a piece held to each platform; a week from the shop's pieces", async () => {
    const post = (body: Record<string, unknown>) => request(app).post("/v1/admin/ai-marketing/social").send(body);
    expect((await post({ productIds: ["cagabaya001"], platforms: ["instagram"] }).expect(404)).body.error).toBe("FEATURE_OFF");
    setAiProvider(fake);
    await setAi({ socialPosts: true }).expect(200);
    expect((await request(app).get("/v1/admin/ai-marketing/status").expect(200)).body).toMatchObject({ socialPosts: true, seoDoctor: false });
    expect((await post({ platforms: ["instagram"] }).expect(400)).body.error).toBe("NOTHING_TO_POST");
    expect((await post({ productIds: ["cagabaya001"], platforms: ["myspace"] }).expect(400)).body.error).toBeTruthy();

    answer = () => ({
      posts: [
        { platform: "instagram", caption: "الأسود ما بيغلط أبداً ✨", hashtags: ["عبايات", "موضة_محتشمة"], cta: "الرابط بالبايو", idea: "العباية على شمّاعة بضو الشباك" },
        { platform: "x", caption: "عباية كريب سوداء بـ250 شيكل بس، واسعة ومريحة لكل يوم", hashtags: ["عبايات", "a", "b", "c"], cta: "اطلبيها" },
        { platform: "tiktok", caption: "not asked for" },
      ],
    });
    const r = (await post({ productIds: ["cagabaya001"], platforms: ["instagram", "x"], tone: "offer", offer: "خصم لحد الجمعة" }).expect(200)).body;
    expect(r.posts.map((p: { platform: string }) => p.platform)).toEqual(["instagram", "x"]);
    expect(r.posts[0].text).toBe("الأسود ما بيغلط أبداً ✨\n\nالرابط بالبايو\n\n#عبايات #موضة_محتشمة");
    expect(r.posts[1].hashtags).toEqual(["#عبايات"]);
    expect(seen.at(-1)!.user).toContain("id=cagabaya001 | عباية كريب سوداء | 250 ILS");
    expect(seen.at(-1)!.user).toContain("«خصم لحد الجمعة»");

    answer = () => ({ days: [{ day: 1, time: "20:00", platform: "instagram", productId: "cagabaya002", idea: "لون الشتاء", caption: "خمري الشتاء وصل 🍷", hashtags: ["شتاء"] }] });
    const w = (await request(app).post("/v1/admin/ai-marketing/week").send({ platforms: ["instagram"], tone: "friendly" }).expect(200)).body;
    expect(w.days).toHaveLength(1);
    expect(w.days[0]).toMatchObject({ day: 1, time: "20:00", productId: "cagabaya002", product: { title: "عباية مخمل خمري", slug: "ag-cagabaya002" } });
  });
});

describe("the search-engine doctor", () => {
  test("the scan needs no model; drafts and pictures' descriptions; saving keeps a revision and touches only the piece's own pictures", async () => {
    const scan = (await request(app).get("/v1/admin/ai-marketing/seo").expect(200)).body;
    expect(scan.total).toBe(2);
    const weak = scan.products.find((p: { id: string }) => p.id === "cagabaya001");
    expect(weak.issues).toEqual(["noTitle", "noDescription", "thinText", "noAlt"]);
    expect(weak.missingAlts).toBe(1);
    expect(scan.products.find((p: { id: string }) => p.id === "cagabaya002").issues).toEqual(["thinText", "noAlt"]);

    // Switch off: only the pictures' descriptions, made from the facts.
    const plain = (await request(app).post("/v1/admin/ai-marketing/seo/cagabaya001/draft").expect(200)).body;
    expect(plain).toEqual({ productId: "cagabaya001", seoTitle: null, seoDescription: null, alts: [{ id: "cagabaya001im1", alt: "عباية كريب سوداء — أسود — من الأمام" }] });
    expect(seen).toHaveLength(0);

    setAiProvider(fake);
    await setAi({ seoDoctor: true }).expect(200);
    answer = () => ({ seoTitle: "عباية كريب سوداء واسعة ومريحة", seoDescription: "عباية كريب سوداء بقصة واسعة ومريحة، خفيفة وعملية لكل يوم وللمناسبات. اطلبيها هلأ مع توصيل لباب البيت." });
    const draft = (await request(app).post("/v1/admin/ai-marketing/seo/cagabaya001/draft").expect(200)).body;
    expect(draft.seoTitle).toBe("عباية كريب سوداء واسعة ومريحة");
    expect(seen.at(-1)!.user).toContain("«عباية مخمل خمري للسهرات والمناسبات»"); // the others' titles, to differ from

    const saved = (await request(app).post("/v1/admin/ai-marketing/seo/cagabaya001/apply").send({ seoTitle: draft.seoTitle, seoDescription: draft.seoDescription, alts: [...draft.alts, { id: "cagabaya002im1", alt: "not this piece's picture" }] }).expect(200)).body;
    expect(saved).toEqual({ ok: true, alts: 1 });
    const p = await prisma.product.findUnique({ where: { id: "cagabaya001" }, select: { seoTitle: true, items: { select: { images: { select: { id: true, alt: true } } } } } });
    expect(p!.seoTitle).toBe("عباية كريب سوداء واسعة ومريحة");
    expect(p!.items[0].images.find((i) => i.id === "cagabaya001im1")!.alt).toBe("عباية كريب سوداء — أسود — من الأمام");
    expect((await prisma.productItemImage.findUnique({ where: { id: "cagabaya002im1" } }))!.alt).toBeNull();
    expect(await prisma.productRevision.count({ where: { productId: "cagabaya001", reason: "seo" } })).toBe(1);
    await prisma.productRevision.deleteMany({ where: { productId: { in: ["cagabaya001", "cagabaya002"] } } });
  });
});

describe("photo studio scenes", () => {
  test("a ready scene or the owner's own words, keeping the product as it is", async () => {
    setAiProvider(fake);
    setStudioFetch(async () => sharp({ create: { width: 20, height: 30, channels: 3, background: "#888" } }).jpeg().toBuffer());
    setStudioUpload(async () => "https://res.test/studio.png");
    const { photoStudio } = await import("../modules/ai/ai.service.js");
    await photoStudio("https://img.test/a.jpg", "marble", { cloudinaryReady: true });
    expect(edits.at(-1)).toContain("white marble surface");
    expect(edits.at(-1)).toContain("Keep the product exactly as it is");
    await photoStudio("https://img.test/a.jpg", "custom", { cloudinaryReady: true, scene: "على رف خشب بمقهى دافي <script>" });
    expect(edits.at(-1)).toContain("Place the product in this scene: على رف خشب بمقهى دافي script.");
    await expect(photoStudio("https://img.test/a.jpg", "custom", { cloudinaryReady: true, scene: " " })).rejects.toMatchObject({ code: "NO_SCENE" });
    // The route takes the new scenes and refuses others.
    await setAi({ photoStudio: true }).expect(200);
    expect((await request(app).post("/v1/admin/ai-catalog/photo-studio").send({ imageUrl: "https://img.test/a.jpg", style: "moon" }).expect(400)).body.error).toBeTruthy();
  });
});
