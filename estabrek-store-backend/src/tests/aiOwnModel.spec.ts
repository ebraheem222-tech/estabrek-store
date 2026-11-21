import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";
import { AI_DEFAULTS } from "../modules/ai/ai.settings.js";
import { forgetAiServer, resetAiStatsForTests, setAiBudgetScaleForTests, setAiProvider } from "../modules/ai/ai.client.js";
import { evalSettled } from "../modules/ai/aiEval.js";
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
  setAiBudgetScaleForTests(1);
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
    expect(saved.server).toEqual({ kind: "own", url: "http://127.0.0.1:11434", model: "allam-7b", vision: false, visionModel: "", embedModel: "", compact: false, hasKey: true });
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

describe("phase 2: small models, kept honest", () => {
  beforeEach(() => setAiBudgetScaleForTests(1));
  const chatAnswer = '{"answer":"أهلين! شو بتدوّري عليه؟","answered":true}';
  // In stock (the assistant offers only pieces that can be bought).
  const product = (id: string, title: string) =>
    prisma.product.create({
      data: {
        id, title, slug: `ph2-${id}`, isActive: true, category: { connect: { id: "ph2cat00001" } },
        items: { create: [{ colorName: "أسود", skuBase: id, variants: { create: [{ sku: `${id}-m`, price: new Prisma.Decimal(100), stock: 3, size: { connect: { id: "ph2size0001" } } }] } }] },
      },
    });

  test("a shopper never waits past the time limit: the chat answers from the owner's answers, and the counters say so", async () => {
    resetAiStatsForTests();
    setAiBudgetScaleForTests(0.01); // the chat's 15 s become 150 ms (a call to the own server waits 1 s at the least)
    // A slow server: it answers after 1.5 s, past the limit (as the real call gives up at its time).
    setOwnModelTransportForTests(async (req) => {
      if (req.ms < 1500) {
        await new Promise((w) => setTimeout(w, req.ms));
        throw Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
      }
      return { status: 200, text: JSON.stringify({ choices: [{ message: { content: chatAnswer } }] }) };
    });
    await setServer({ kind: "own", url: "http://127.0.0.1:11434", model: "qwen3:8b" }).expect(200);
    await setAi({ shopAgent: true }).expect(200);
    await prisma.chatbotEntry.deleteMany();
    await prisma.chatbotEntry.create({ data: { title: "مدة التوصيل", answer: "التوصيل من يومين لأربع أيام", tags: ["توصيل"] } });
    const started = Date.now();
    const r = (await request(app).post("/v1/storefront/chatbot/message").send({ sessionId: "ph2-1", locale: "ar", message: "كم مدة التوصيل؟" }).expect(200)).body;
    expect(Date.now() - started).toBeLessThan(3000);
    expect(r).toMatchObject({ mode: "kb", reply: "التوصيل من يومين لأربع أيام" });
    const stats = (await request(app).get("/v1/admin/ai/stats").expect(200)).body;
    expect(stats.uses.find((u: { use: string }) => u.use === "shopAgent")).toMatchObject({ calls: 1, failed: 1, via: "own", lastError: "The model server didn't answer in time" });
    setAiBudgetScaleForTests(1);
    await prisma.chatbotEntry.deleteMany();
  });

  test("an answer that isn't JSON is asked once more with a reminder; a small model gets a shorter prompt", async () => {
    resetAiStatsForTests();
    let n = 0;
    setOwnModelTransportForTests(async (req) => {
      const body = JSON.parse(req.body);
      asked.push({ url: req.url.href, auth: req.headers.authorization, body });
      n++;
      return { status: 200, text: JSON.stringify({ choices: [{ message: { content: n % 2 === 1 ? "أهلين! كيف بقدر أساعدك؟" : chatAnswer } }] }) };
    });
    await setServer({ kind: "own", url: "http://127.0.0.1:11434", model: "qwen3:8b" }).expect(200);
    await setAi({ shopAgent: true }).expect(200);
    await prisma.category.create({ data: { id: "ph2cat00001", name: "عبايات", slug: "ph2-abayas" } });
    await prisma.size.create({ data: { id: "ph2size0001", name: "PH2-M", order: 1 } });
    for (let i = 1; i <= 9; i++) await product(`ph2prod00${i}`, `عباية رقم ${i}`);

    asked.length = 0;
    const r = (await request(app).post("/v1/storefront/chatbot/message").send({ sessionId: "ph2-2", locale: "ar", message: "بدي عباية" }).expect(200)).body;
    expect(r).toMatchObject({ mode: "agent", reply: "أهلين! شو بتدوّري عليه؟" });
    expect(asked).toHaveLength(2);
    const again = asked[1].body.messages;
    expect(again.at(-2)).toEqual({ role: "assistant", content: "أهلين! كيف بقدر أساعدك؟" });
    expect(String(again.at(-1)!.content)).toContain("JSON object only");
    const pieces = (b: { messages: Array<{ content: unknown }> }) => (String(b.messages[1].content).split("Pieces from the shop that may fit the question:")[1] ?? "").split("\n\n")[0].split("\n- ").length - 1;
    expect(pieces(asked[0].body)).toBe(9);

    // The same question to a server marked small: fewer pieces in the prompt.
    await setServer({ kind: "own", url: "http://127.0.0.1:11434", model: "qwen3:4b", compact: true }).expect(200);
    asked.length = 0;
    n = 1; // answers in JSON at once
    await request(app).post("/v1/storefront/chatbot/message").send({ sessionId: "ph2-3", locale: "ar", message: "بدي عباية" }).expect(200);
    expect(asked).toHaveLength(1);
    expect(pieces(asked[0].body)).toBe(5);
    expect((await request(app).get("/v1/admin/ai").expect(200)).body.server).toMatchObject({ model: "qwen3:4b", compact: true });
  });

  test("try the model: the owner's questions asked in the background, answers with times, marks, counted apart from shoppers", async () => {
    let i = 0;
    setOwnModelTransportForTests(async (req) => {
      const body = JSON.parse(req.body);
      const user = String(body.messages[1].content);
      i++;
      if (user.includes("«سؤال بيفشل»")) return { status: 500, text: "boom" };
      return { status: 200, text: JSON.stringify({ choices: [{ message: { content: `{"answer":"جواب رقم ${i}","answered":${user.includes("هدايا") ? "false" : "true"}}` } }] }) };
    });
    await prisma.aiCache.deleteMany({ where: { key: "ai-eval:v1" } });
    await setServer({ kind: "own", url: "http://127.0.0.1:11434", model: "qwen3:8b", compact: true }).expect(200);
    expect((await request(app).post("/v1/admin/ai/eval/run").expect(409)).body.error).toBe("EVAL_BUSY"); // no questions yet
    const saved = (await request(app).put("/v1/admin/ai/eval/questions").send({ questions: ["كم مدة التوصيل؟", "  كم   مدة التوصيل؟ ", "بتغلفوا هدايا؟", "", "سؤال بيفشل"] }).expect(200)).body;
    expect(saved.questions.map((q: { text: string }) => q.text)).toEqual(["كم مدة التوصيل؟", "بتغلفوا هدايا؟", "سؤال بيفشل"]);

    await request(app).post("/v1/admin/ai/eval/run").expect(202);
    await evalSettled();
    const state = (await request(app).get("/v1/admin/ai/eval").expect(200)).body;
    expect(state.running).toBe(false);
    const run = state.runs[0];
    expect(run).toMatchObject({ model: "qwen3:8b (small)", running: false, total: 3 });
    expect(run.answers.map((a: { ok: boolean; missed: boolean }) => [a.ok, a.missed])).toEqual([[true, false], [true, true], [false, true]]);
    expect(run.answers[2].error).toContain("500");
    expect(typeof run.answers[0].ms).toBe("number");

    // A question kept keeps its id; marks stay with the run.
    const qid = saved.questions[0].id;
    await request(app).patch(`/v1/admin/ai/eval/runs/${run.id}/answers/${qid}`).send({ mark: "good" }).expect(200);
    await request(app).patch(`/v1/admin/ai/eval/runs/${run.id}/answers/nope`).send({ mark: "bad" }).expect(404);
    const again = (await request(app).put("/v1/admin/ai/eval/questions").send({ questions: ["كم مدة التوصيل؟", "سؤال جديد"] }).expect(200)).body;
    expect(again.questions[0].id).toBe(qid);
    expect(again.runs[0].answers[0].mark).toBe("good");

    // Counted as the owner's tries, not as shoppers' calls.
    const usage = (await request(app).get("/v1/admin/ai").expect(200)).body.usage30;
    expect(usage.eval).toBe(3);
    expect(usage.shopAgent ?? 0).toBe(0);
    await request(app).delete(`/v1/admin/ai/eval/runs/${run.id}`).expect(200);
    expect((await request(app).get("/v1/admin/ai/eval").expect(200)).body.runs).toEqual([]);
  });
});
