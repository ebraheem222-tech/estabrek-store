/**
 * Admin AI:
 *   /v1/admin/ai          settings + key status + usage (settings area)
 *   /v1/admin/ai-catalog  product writer, photo studio (catalog area)
 *   /v1/admin/ai-orders   WhatsApp reply ideas, order flags (orders area)
 *   /v1/admin/ai-ask      questions about the shop in plain words (dashboard)
 */
import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { isCloudinaryEnabled } from "../../lib/cloudinary.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { AppError } from "../../utils/httpError.js";
import { AI_DEFAULTS, AI_FEATURES, AiSchema, NO_KEY_NEEDED, aiOf } from "../ai/ai.settings.js";
import { aiKeyReady, aiUsage } from "../ai/ai.client.js";
import { needFeature } from "../ai/ai.guard.js";
import { askShop, orderFlags, photoStudio, replySuggestions, writeProduct } from "../ai/ai.service.js";
import { adminIdOf, changedKeys, getOrCreateSettings, keepRevision, triggerSettingsRevalidate } from "./settings.controller.js";

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export const aiSettingsAdmin = Router();

aiSettingsAdmin.get(
  "/",
  asyncHandler(async (_req, res) => {
    const s = await getOrCreateSettings();
    res.json({ settings: aiOf(s.header), defaults: AI_DEFAULTS, keyReady: aiKeyReady(), cloudinaryReady: isCloudinaryEnabled(), usage30: await aiUsage(30) });
  }),
);

aiSettingsAdmin.put(
  "/",
  validate({ body: AiSchema }),
  asyncHandler(async (req, res) => {
    const next = AiSchema.parse(req.body);
    const s = await getOrCreateSettings();
    const before = aiOf(s.header);
    // Can't switch on what needs the key while it's missing (switching off is always fine).
    const blocked = AI_FEATURES.filter((f) => next[f] && !before[f] && !NO_KEY_NEEDED.has(f) && !aiKeyReady());
    if (blocked.length) throw new AppError(400, "AI_KEY_MISSING", "Add OPENAI_API_KEY on the server first", { features: blocked });
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

aiCatalogAdmin.post(
  "/photo-studio",
  validate({ body: z.object({ imageUrl: z.string().url().max(1000), style: z.enum(["white", "studio", "soft"]).default("white"), title: z.string().max(200).optional() }) }),
  asyncHandler(async (req, res) => {
    await needFeature("photoStudio");
    // Only the shop's own photos (Cloudinary), not any address on the internet.
    if (!/^https:\/\/res\.cloudinary\.com\//.test(req.body.imageUrl) && process.env.NODE_ENV !== "test") throw new AppError(400, "BAD_IMAGE", "Only the shop's photos");
    res.status(201).json(await photoStudio(req.body.imageUrl, req.body.style, { title: req.body.title }));
  }),
);

/** What the product page may show (catalog editors may not read the settings). */
aiCatalogAdmin.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const s = await getOrCreateSettings();
    const ai = aiOf(s.header);
    const key = aiKeyReady();
    res.json({ productWriter: ai.productWriter && key, photoStudio: ai.photoStudio && key && isCloudinaryEnabled() });
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
    const ai = aiOf((await getOrCreateSettings()).header);
    res.json({ replySuggest: ai.replySuggest && aiKeyReady(), orderFlags: ai.orderFlags });
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
