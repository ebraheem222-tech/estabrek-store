/**
 * Admin AI:
 *   /v1/admin/ai          settings + key status + usage (settings area)
 *   /v1/admin/ai-catalog  product writer, photo studio (catalog area)
 *   /v1/admin/ai-orders   WhatsApp reply ideas, order flags (orders area)
 *   /v1/admin/ai-ask      questions about the shop in plain words (dashboard)
 *   /v1/admin/ai-pages    the page editor's words helper: options for an element's words, a picture's description
 */
import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { isCloudinaryEnabled } from "../../lib/cloudinary.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { AppError } from "../../utils/httpError.js";
import { AI_DEFAULTS, AI_FEATURES, AiSchema, aiOf } from "../ai/ai.settings.js";
import { aiImageEditReady, aiKeyReady, aiReadyFor, aiTextReady, aiUsage, aiVisionReady, forgetAiServer } from "../ai/ai.client.js";
import { AI_SERVER_KINDS, AiServerSchema, aiServerOf, aiServerView, ownJson, ownModelEndpoint, ownServerSet } from "../ai/ownModel.js";
import { seal } from "../../lib/secretBox.js";
import { needFeature } from "../ai/ai.guard.js";
import { STUDIO_SCENE_MAX, STUDIO_STYLES, askShop, orderFlags, pageWords, photoStudio, pictureAlt, replySuggestions, translateTexts, writeProduct } from "../ai/ai.service.js";
import { PAGE_WORD_ACTIONS, PAGE_WORD_KINDS } from "../ai/pageWords.js";
import { PLATFORMS, POST_TONES } from "../ai/socialPosts.js";
import { productUrl, seoApply, seoFix, seoScan, socialPosts, weekPlan } from "../ai/marketing.service.js";
import { CONTENT_LANGS } from "../../lib/translations.js";
import { adminIdOf, changedKeys, getOrCreateSettings, keepRevision, triggerSettingsRevalidate } from "./settings.controller.js";

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export const aiSettingsAdmin = Router();

aiSettingsAdmin.get(
  "/",
  asyncHandler(async (_req, res) => {
    const s = await getOrCreateSettings();
    const ready = Object.fromEntries(AI_FEATURES.map((f) => [f, aiReadyFor(f, s.header)]));
    res.json({
      settings: aiOf(s.header),
      defaults: AI_DEFAULTS,
      // A model for words is there (OpenAI's key or the own server); older admins read only this.
      keyReady: aiTextReady(s.header),
      openaiReady: aiKeyReady(),
      visionReady: aiVisionReady(s.header),
      editReady: aiImageEditReady(),
      ready,
      server: aiServerView(aiServerOf(s.header)),
      cloudinaryReady: isCloudinaryEnabled(),
      usage30: await aiUsage(30),
    });
  }),
);

aiSettingsAdmin.put(
  "/",
  validate({ body: AiSchema }),
  asyncHandler(async (req, res) => {
    const next = AiSchema.parse(req.body);
    const s = await getOrCreateSettings();
    const before = aiOf(s.header);
    // Can't switch on what has no model to ask (switching off is always fine).
    const blocked = AI_FEATURES.filter((f) => next[f] && !before[f] && !aiReadyFor(f, s.header));
    if (blocked.length) throw new AppError(400, "AI_KEY_MISSING", "Add OPENAI_API_KEY on the server or connect your own model server first", { features: blocked });
    const data = { header: { ...obj(s.header), ai: next } as Prisma.InputJsonValue };
    const current = s as unknown as Record<string, unknown>;
    const changed = changedKeys(current, data as Record<string, unknown>);
    if (changed.length) {
      await keepRevision(current, changed, await adminIdOf(req), "تعديل إعدادات الذكاء الاصطناعي");
      await prisma.siteSettings.update({ where: { id: s.id }, data });
      triggerSettingsRevalidate();
    }
    res.json({ settings: next });
  }),
);

/**
 * Where the AI runs: OpenAI (OPENAI_API_KEY on the server) or the store's own model server.
 *   PUT  /v1/admin/ai/server      {kind, url, model, vision, key?}  key: a string = new, null = none, left out = kept
 *   POST /v1/admin/ai/server/try  the same (what is left out comes from the saved one): one small question, the answer and how long it took
 */
const ServerBody = z.object({
  kind: z.enum(AI_SERVER_KINDS),
  url: z.string().trim().max(300).default(""),
  model: z.string().trim().max(120).default(""),
  vision: z.boolean().default(false),
  key: z.string().trim().max(4000).nullable().optional(),
});
type ServerIn = z.infer<typeof ServerBody>;

/** The server as it would be saved: the address read (the reason in words when it can't be used), the key sealed. */
function serverFrom(body: ServerIn, saved: ReturnType<typeof aiServerOf>) {
  if (body.kind === "own") {
    if (!body.url || !body.model) throw new AppError(400, "AI_SERVER_INCOMPLETE", "The address and the model's name are both needed");
    try {
      ownModelEndpoint(body.url);
    } catch (e) {
      throw new AppError(400, "AI_SERVER_ADDRESS", (e as Error).message);
    }
  }
  const key = body.key === undefined ? saved.key : body.key ? seal(body.key) : null;
  return AiServerSchema.parse({ kind: body.kind, url: body.url, model: body.model, vision: body.vision, key });
}

aiSettingsAdmin.put(
  "/server",
  validate({ body: ServerBody }),
  asyncHandler(async (req, res) => {
    const s = await getOrCreateSettings();
    const next = serverFrom(req.body, aiServerOf(s.header));
    const data = { header: { ...obj(s.header), aiServer: next } as Prisma.InputJsonValue };
    const current = s as unknown as Record<string, unknown>;
    const changed = changedKeys(current, data as Record<string, unknown>);
    if (changed.length) {
      await keepRevision(current, changed, await adminIdOf(req), "تعديل سيرفر الذكاء الاصطناعي");
      await prisma.siteSettings.update({ where: { id: s.id }, data });
    }
    forgetAiServer();
    res.json({ server: aiServerView(next) });
  }),
);

aiSettingsAdmin.post(
  "/server/try",
  validate({ body: ServerBody }),
  asyncHandler(async (req, res) => {
    const s = await getOrCreateSettings();
    const server = serverFrom(req.body, aiServerOf(s.header));
    if (!ownServerSet(server)) throw new AppError(400, "AI_SERVER_INCOMPLETE", "The address and the model's name are both needed");
    const r = await ownJson<{ reply?: unknown }>(
      server,
      { system: "You are a helpful assistant of an online shop.", user: 'Say hello to a shopper in one short Arabic sentence. JSON: {"reply": "..."}', maxTokens: 120 },
      { ms: 60_000 },
    );
    res.json(r.ok ? { ok: true, ms: r.ms, reply: String(r.data.reply ?? "").slice(0, 300) } : { ok: false, error: r.error });
  }),
);

export const aiCatalogAdmin = Router();

aiCatalogAdmin.post(
  "/product-writer",
  validate({
    body: z.object({
      images: z.array(z.string().url().max(1000)).min(1).max(4),
      title: z.string().max(200).optional(),
      category: z.string().max(100).optional(),
      type: z.string().max(100).optional(),
      notes: z.string().max(600).optional(),
      fields: z.array(z.object({ key: z.string().max(60), label: z.string().max(80), kind: z.string().max(30).optional(), options: z.array(z.string().max(80)).max(40).optional() })).max(20).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    await needFeature("productWriter");
    res.json(await writeProduct(req.body));
  }),
);

/** Draft translations of the shop's content; nothing is saved here (the owner checks, then saves). */
aiCatalogAdmin.post(
  "/translate",
  validate({
    body: z.object({
      to: z.enum(CONTENT_LANGS),
      from: z.enum(CONTENT_LANGS).optional(),
      context: z.string().max(200).optional(),
      texts: z
        .record(z.string().max(80), z.string().max(5000))
        .refine((t) => Object.keys(t).length <= 80 && Object.values(t).reduce((n, v) => n + v.length, 0) <= 20000, "Too much text at once"),
    }),
  }),
  asyncHandler(async (req, res) => {
    await needFeature("translate");
    res.json(await translateTexts(req.body));
  }),
);

aiCatalogAdmin.post(
  "/photo-studio",
  validate({ body: z.object({ imageUrl: z.string().url().max(1000), style: z.enum(STUDIO_STYLES).default("white"), scene: z.string().max(STUDIO_SCENE_MAX).optional(), title: z.string().max(200).optional() }) }),
  asyncHandler(async (req, res) => {
    await needFeature("photoStudio");
    // Only the shop's own photos (Cloudinary), not any address on the internet.
    if (!/^https:\/\/res\.cloudinary\.com\//.test(req.body.imageUrl) && process.env.NODE_ENV !== "test") throw new AppError(400, "BAD_IMAGE", "Only the shop's photos");
    res.status(201).json(await photoStudio(req.body.imageUrl, req.body.style, { title: req.body.title, scene: req.body.scene }));
  }),
);

/** What the product page may show (catalog editors may not read the settings). */
aiCatalogAdmin.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const s = await getOrCreateSettings();
    const ai = aiOf(s.header);
    res.json({
      productWriter: ai.productWriter && aiReadyFor("productWriter", s.header),
      photoStudio: ai.photoStudio && aiReadyFor("photoStudio", s.header) && isCloudinaryEnabled(),
      translate: ai.translate && aiReadyFor("translate", s.header),
    });
  }),
);

/** The page editor (pages area): words for an element and a picture's description. Nothing is saved by these. */
export const aiPagesAdmin = Router();

aiPagesAdmin.post(
  "/words",
  validate({
    body: z.object({
      action: z.enum(PAGE_WORD_ACTIONS),
      kind: z.enum(PAGE_WORD_KINDS),
      lang: z.enum(CONTENT_LANGS),
      to: z.enum(CONTENT_LANGS).optional(),
      text: z.string().max(4000).optional(),
      about: z.string().max(400).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    await needFeature("pageWriter");
    res.json(await pageWords(req.body));
  }),
);

aiPagesAdmin.post(
  "/alt",
  validate({ body: z.object({ imageUrl: z.string().url().max(1000).regex(/^https:\/\//, "An https address"), lang: z.enum(CONTENT_LANGS) }) }),
  asyncHandler(async (req, res) => {
    await needFeature("pageWriter");
    res.json(await pictureAlt(req.body));
  }),
);

/** What the editor may offer (page editors may not read the settings). */
aiPagesAdmin.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const s = await getOrCreateSettings();
    res.json({ pageWriter: aiOf(s.header).pageWriter && aiReadyFor("pageWriter", s.header) });
  }),
);

export const aiOrdersAdmin = Router();

aiOrdersAdmin.post(
  "/reply",
  validate({ body: z.object({ orderId: z.string().min(1).max(64), message: z.string().max(1000).optional() }) }),
  asyncHandler(async (req, res) => {
    await needFeature("replySuggest");
    res.json(await replySuggestions(req.body.orderId, req.body.message));
  }),
);

aiOrdersAdmin.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const header = (await getOrCreateSettings()).header;
    const ai = aiOf(header);
    res.json({ replySuggest: ai.replySuggest && aiReadyFor("replySuggest", header), orderFlags: ai.orderFlags });
  }),
);

aiOrdersAdmin.get(
  "/flags/:orderId",
  asyncHandler(async (req, res) => {
    await needFeature("orderFlags");
    res.json(await orderFlags(String(req.params.orderId)));
  }),
);

export const aiAskAdmin = Router();

aiAskAdmin.post(
  "/",
  validate({ body: z.object({ question: z.string().trim().min(3).max(300) }) }),
  asyncHandler(async (req, res) => {
    await needFeature("adminAsk");
    res.json(await askShop(req.body.question));
  }),
);

/**
 * Selling outside the shop (catalog area): social posts and a week's plan, and the search-engine doctor.
 *   GET  /v1/admin/ai-marketing/status        what may be offered
 *   POST /v1/admin/ai-marketing/social        posts for pieces or an offer
 *   POST /v1/admin/ai-marketing/week          seven days of posts
 *   GET  /v1/admin/ai-marketing/seo           every product's score and weak points (plain rules, no model)
 *   POST /v1/admin/ai-marketing/seo/:id/draft better words, drafted (nothing saved)
 *   POST /v1/admin/ai-marketing/seo/:id/apply saves what the owner kept (a revision first)
 */
export const aiMarketingAdmin = Router();

const PostOptions = {
  platforms: z.array(z.enum(PLATFORMS)).min(1).max(PLATFORMS.length).transform((l) => [...new Set(l)]),
  tone: z.enum(POST_TONES).default("friendly"),
  lang: z.enum(CONTENT_LANGS).optional(),
  emojis: z.boolean().optional(),
};

aiMarketingAdmin.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const header = (await getOrCreateSettings()).header;
    const ai = aiOf(header);
    res.json({ socialPosts: ai.socialPosts && aiReadyFor("socialPosts", header), seoDoctor: ai.seoDoctor && aiReadyFor("seoDoctor", header), shopUrl: productUrl("x") ? productUrl("x")!.replace(/\/p\/x$/, "") : null });
  }),
);

aiMarketingAdmin.post(
  "/social",
  validate({ body: z.object({ ...PostOptions, productIds: z.array(z.string().min(1).max(64)).max(3).optional(), offer: z.string().trim().max(300).optional() }) }),
  asyncHandler(async (req, res) => {
    await needFeature("socialPosts");
    res.json(await socialPosts(req.body));
  }),
);

aiMarketingAdmin.post(
  "/week",
  validate({ body: z.object(PostOptions) }),
  asyncHandler(async (req, res) => {
    await needFeature("socialPosts");
    res.json(await weekPlan(req.body));
  }),
);

aiMarketingAdmin.get(
  "/seo",
  asyncHandler(async (_req, res) => {
    res.json(await seoScan());
  }),
);

aiMarketingAdmin.post(
  "/seo/:id/draft",
  asyncHandler(async (req, res) => {
    // The pictures' descriptions need no model: with the switch off, only those.
    const header = (await getOrCreateSettings()).header;
    res.json(await seoFix(String(req.params.id), { model: aiOf(header).seoDoctor && aiReadyFor("seoDoctor", header) }));
  }),
);

aiMarketingAdmin.post(
  "/seo/:id/apply",
  validate({
    body: z.object({
      seoTitle: z.string().max(120).nullable().optional(),
      seoDescription: z.string().max(320).nullable().optional(),
      alts: z.array(z.object({ id: z.string().min(1).max(64), alt: z.string().max(200) })).max(60).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    res.json(await seoApply(String(req.params.id), req.body, req.user?.sub));
  }),
);
