import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";
import { AI_DEFAULTS } from "../modules/ai/ai.settings.js";
import { forgetAiServer, setAiProvider } from "../modules/ai/ai.client.js";
import { aiPublicLimits } from "../modules/ai/ai.guard.js";
import { setOwnModelTransportForTests, setPictureLoaderForTests, type OwnTransport } from "../modules/ai/ownModel.js";
import { searchIndexSettled } from "../lib/productTextEmbeddings.js";
import sharp from "sharp";
import { open } from "../lib/secretBox.js";

// The store's own model server instead of OpenAI: no OPENAI_API_KEY here and no stand-in provider,
// so every answer below came through the own server's path (a stand-in for the network).

const asked: Array<{ url: string; auth?: string; body: { model: string; messages: Array<{ role: string; content: unknown }> } }> = [];
let answer: (body: { messages: Array<{ role: string; content: unknown }> }) => string = () => "{}";
const standIn: OwnTransport = async (req) => {
  const body = JSON.parse(req.body);
  asked.push({ url: req.url.href, auth: req.headers.authorization, body });
  return { status: 200, text: JSON.stringify({ choices: [{ message: { role: "assistant", content: answer(body) } }] }) };
};

const setAi = (patch: Record<string, unknown>) => request(app).put("/v1/admin/ai").send({ ...AI_DEFAULTS, ...patch });
const setServer = (body: Record<string, unknown>) => request(app).put("/v1/admin/ai/server").send(body);
const clearServer = async () => {
  const s = await prisma.siteSettings.findFirst();
  if (!s) return;
  const header = { ...((s.header ?? {}) as Record<string, unknown>) };
  delete header.aiServer;
  await prisma.siteSettings.update({ where: { id: s.id }, data: { header: header as Prisma.InputJsonValue } });
  forgetAiServer();
};

beforeEach(async () => {
  asked.length = 0;
  answer = () => "{}";
  aiPublicLimits.perIpHour = 1000;
  setAiProvider(null);
  setOwnModelTransportForTests(standIn);
  await clearServer();
  await prisma.aiUsage.deleteMany();
  await prisma.chatbotConversation.deleteMany();
  await setAi({}).expect(200);
  await resetDb();
});
afterAll(async () => {
  setOwnModelTransportForTests(null);
  setPictureLoaderForTests(null);
  await clearServer();
  await prisma.chatbotConversation.deleteMany();
});

describe("the store's own model server", () => {
  test("saved from the admin: the key sealed and never shown; then the word features can be switched on, the picture ones can't", async () => {
    // No model at all: nothing can be switched on.
    expect((await request(app).get("/v1/admin/ai").expect(200)).body).toMatchObject({ keyReady: false, openaiReady: false, server: { kind: "openai" }, ready: { shopAgent: false, orderFlags: true } });
    expect((await setAi({ shopAgent: true }).expect(400)).body.error).toBe("AI_KEY_MISSING");

    // A half-written or unusable server is refused before anything is saved.
    expect((await setServer({ kind: "own", url: "http://127.0.0.1:11434", model: "" }).expect(400)).body.error).toBe("AI_SERVER_INCOMPLETE");
    expect((await setServer({ kind: "own", url: "ftp://models.example.com", model: "allam" }).expect(400)).body.error).toBe("AI_SERVER_ADDRESS");

    const saved = (await setServer({ kind: "own", url: "http://127.0.0.1:11434", model: "allam-7b", key: "sk-local-only" }).expect(200)).body;
    expect(saved.server).toEqual({ kind: "own", url: "http://127.0.0.1:11434", model: "allam-7b", vision: false, visionModel: "", embedModel: "", hasKey: true });
    const kept = ((await prisma.siteSettings.findFirst())!.header as Record<string, { key: string }>).aiServer.key;
    expect(kept).not.toContain("sk-local-only");
    expect(open(kept)).toBe("sk-local-only");

    const ai = (await request(app).get("/v1/admin/ai").expect(200)).body;
    expect(ai).toMatchObject({ keyReady: true, openaiReady: false, visionReady: false, editReady: false, server: { kind: "own", model: "allam-7b", hasKey: true } });
    expect(JSON.stringify(ai)).not.toContain("sk-local-only");
    expect(ai.ready).toMatchObject({ shopAgent: true, socialPosts: true, seoDoctor: true, translate: true, pageWriter: true, productWriter: false, photoStudio: false });
    await setAi({ shopAgent: true, socialPosts: true }).expect(200);
    expect((await setAi({ shopAgent: true, socialPosts: true, photoStudio: true }).expect(400)).body.details.features).toEqual(["photoStudio"]);

    // The key left out stays; null takes it away. A model that reads pictures opens the product writer.
    expect((await setServer({ kind: "own", url: "http://127.0.0.1:11434", model: "qwen2.5-vl", vision: true }).expect(200)).body.server).toMatchObject({ hasKey: true, vision: true });
    expect((await request(app).get("/v1/admin/ai").expect(200)).body.ready).toMatchObject({ productWriter: true, photoStudio: false });
    expect((await setServer({ kind: "own", url: "http://127.0.0.1:11434", model: "qwen2.5-vl", vision: true, key: null }).expect(200)).body.server.hasKey).toBe(false);

    // Back to OpenAI (no key here): the words can't be written again.
    await setServer({ kind: "openai", url: "", model: "" }).expect(200);
    expect((await request(app).get("/v1/admin/ai").expect(200)).body).toMatchObject({ keyReady: false, ready: { shopAgent: false } });
  });

  test("try it: one small question to the server as written, the answer and the time; or what went wrong", async () => {
    answer = () => 'أكيد: {"reply":"أهلين فيكِ بمتجرنا 🌸"}';
    const ok = (await request(app).post("/v1/admin/ai/server/try").send({ kind: "own", url: "http://127.0.0.1:11434/v1", model: "allam-7b", key: "sk-try" }).expect(200)).body;
    expect(ok).toMatchObject({ ok: true, reply: "أهلين فيكِ بمتجرنا 🌸" });
    expect(typeof ok.ms).toBe("number");
    expect(asked[0]).toMatchObject({ url: "http://127.0.0.1:11434/v1/chat/completions", auth: "Bearer sk-try", body: { model: "allam-7b" } });
    // Nothing was saved by trying.
    expect((await request(app).get("/v1/admin/ai").expect(200)).body.server.kind).toBe("openai");

    setOwnModelTransportForTests(async () => ({ status: 404, text: '{"error":"model \\"nope\\" not found, try pulling it first"}' }));
    expect((await request(app).post("/v1/admin/ai/server/try").send({ kind: "own", url: "http://127.0.0.1:11434", model: "nope" }).expect(200)).body).toEqual({ ok: false, error: 'The model server doesn\'t have the model "nope"' });
  });

  test("the shop's assistant answers through it; pictures it can't read are refused with a reason", async () => {
    await setServer({ kind: "own", url: "http://127.0.0.1:11434", model: "allam-7b" }).expect(200);
    await setAi({ shopAgent: true, pageWriter: true }).expect(200);
    answer = (body) => {
      const sys = String(body.messages[0].content);
      return sys.includes("Use ONLY the facts below") ? 'بالتأكيد! {"answer":"أهلين! كيف بقدر أساعدك؟","answered":true,"suggestions":["شو الجديد؟"]}' : "{}";
    };
    const r = (await request(app).post("/v1/storefront/chatbot/message").send({ sessionId: "own-1", locale: "ar", message: "مرحبا" }).expect(200)).body;
    expect(r).toMatchObject({ mode: "agent", reply: "أهلين! كيف بقدر أساعدك؟", suggestions: ["شو الجديد؟"] });
    expect(asked.at(-1)!.auth).toBeUndefined();
    expect((await request(app).get("/v1/admin/ai").expect(200)).body.usage30.shopAgent).toBe(1);

    // A picture's description needs a model that reads pictures: this one doesn't, and there's no OpenAI key.
    const alt = await request(app).post("/v1/admin/ai-pages/alt").send({ imageUrl: "https://img.example.com/a.jpg", lang: "ar" }).expect(409);
    expect(alt.body.error).toBe("AI_NO_VISION");

    // The server failing is said, and the chat falls back to the owner's answers.
    setOwnModelTransportForTests(async () => {
      throw Object.assign(new Error("refused"), { code: "ECONNREFUSED" });
    });
    const down = (await request(app).post("/v1/storefront/chatbot/message").send({ sessionId: "own-2", locale: "ar", message: "مرحبا" }).expect(200)).body;
    expect(down.mode).not.toBe("agent");
    expect(down.reply).toBeTruthy();
  });
});

describe("phase 1: a model for each job on the same server", () => {
  /** Words by the "words" model, pictures by the pictures model, and search numbers by meaning: wedding/evening → one corner, daily → another. */
  const vectorOf = (t: string) => (/عرس|سهرة|مطرز/.test(t) ? [1, 0, 0] : /يومي/.test(t) ? [0, 1, 0] : [0, 0, 1]);
  const jobs: Array<{ path: string; model: string }> = [];
  const allJobs: OwnTransport = async (req) => {
    const body = JSON.parse(req.body);
    jobs.push({ path: req.url.pathname, model: body.model });
    if (req.url.pathname.endsWith("/embeddings")) return { status: 200, text: JSON.stringify({ data: (body.input as string[]).map((t, index) => ({ index, embedding: vectorOf(t) })) }) };
    const sys = String(body.messages[0].content);
    const answerText = sys.includes("describe a picture") || sys.includes("alt text") || sys.includes("image")
      ? '{"alt":"عباية سوداء على شماعة"}'
      : sys.includes("e-commerce support assistant")
        ? '{"answer":"التوصيل من يومين لأربع أيام","shouldHandoff":false,"confidence":0.9}'
        : sys.includes("SEO copywriter")
          ? '{"seoTitle":"عبايات استبرق للمناسبات","seoDescription":"تشكيلة عبايات للسهرات والعرس."}'
          : "{}";
    return { status: 200, text: JSON.stringify({ choices: [{ message: { role: "assistant", content: answerText } }] }) };
  };

  const product = (id: string, title: string) =>
    prisma.product.create({ data: { id, title, slug: `own-${id}`, isActive: true, category: { connect: { id: "ownmcat0001" } } } });

  test("pictures go to the pictures model; search runs on the search model, only on numbers it made; the old tools and the plain chat ask the same server", async () => {
    jobs.length = 0;
    setOwnModelTransportForTests(allJobs);
    const png = await sharp({ create: { width: 40, height: 40, channels: 3, background: "#111111" } }).png().toBuffer();
    setPictureLoaderForTests(async () => ({ buffer: png, mime: "image/png" }));
    await setServer({ kind: "own", url: "http://127.0.0.1:11434", model: "qwen3:8b", visionModel: "qwen3-vl:4b", embedModel: "bge-m3" }).expect(200);
    const ai = (await request(app).get("/v1/admin/ai").expect(200)).body;
    expect(ai).toMatchObject({ visionReady: true, embedReady: true, ready: { productWriter: true, photoStudio: false }, server: { visionModel: "qwen3-vl:4b", embedModel: "bge-m3" } });

    // A picture's description: the pictures model, the picture inside the request.
    await setAi({ pageWriter: true }).expect(200);
    await request(app).post("/v1/admin/ai-pages/alt").send({ imageUrl: "https://img.example.com/a.jpg", lang: "ar" }).expect(200);
    expect(jobs.at(-1)).toEqual({ path: "/v1/chat/completions", model: "qwen3-vl:4b" });

    // Search by meaning: nothing is ready until the products are made again with the search model.
    await prisma.category.create({ data: { id: "ownmcat0001", name: "عبايات", slug: "own-abayas" } });
    await product("ownmprod001", "عباية سهرة مطرزة");
    await product("ownmprod002", "عباية يومية قطن");
    expect((await request(app).get("/v1/admin/ai/search-index").expect(200)).body).toMatchObject({ model: "own:bge-m3", total: 2, indexed: 0, run: { running: false } });
    await request(app).post("/v1/admin/ai/search-index").expect(202);
    await searchIndexSettled();
    expect((await request(app).get("/v1/admin/ai/search-index").expect(200)).body).toMatchObject({ indexed: 2, run: { running: false, done: 2, failed: 0, lastError: null } });
    expect(jobs.filter((j) => j.path === "/v1/embeddings").every((j) => j.model === "bge-m3")).toBe(true);
    // No word of the question is in either title: found by meaning only.
    const found = (await request(app).get("/v1/catalog/products").query({ q: "بدي إشي للعرس", page: 1, pageSize: 12 }).expect(200)).body;
    expect(found.items.map((p: { id: string }) => p.id)).toEqual(["ownmprod001"]);

    // Another search model: its numbers aren't the old ones, so nothing counts as ready.
    await setServer({ kind: "own", url: "http://127.0.0.1:11434", model: "qwen3:8b", visionModel: "qwen3-vl:4b", embedModel: "nomic-embed-text" }).expect(200);
    expect((await request(app).get("/v1/admin/ai/search-index").expect(200)).body).toMatchObject({ model: "own:nomic-embed-text", indexed: 0 });

    // The page editor's old SEO tool and the plain chat (smart assistant off) ask the words model.
    const seo = (await request(app).post("/v1/admin/pages/ai/improve-seo").send({ pageName: "العبايات", pageSlug: "/abayas", locale: "ar" }).expect(200)).body;
    expect(seo).toMatchObject({ source: "openai", seoTitle: "عبايات استبرق للمناسبات" });
    expect(jobs.at(-1)).toEqual({ path: "/v1/chat/completions", model: "qwen3:8b" });
    const chat = (await request(app).post("/v1/storefront/chatbot/message").send({ sessionId: "own-old-1", locale: "ar", message: "قديش بياخد الشحن لعندي؟" }).expect(200)).body;
    expect(chat).toMatchObject({ mode: "openai", reply: "التوصيل من يومين لأربع أيام" });
    expect((await request(app).get("/v1/admin/ai").expect(200)).body.usage30).toMatchObject({ search: expect.any(Number), pagesTools: 1, oldChat: 1 });
  });
});
