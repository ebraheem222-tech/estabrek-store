/**
 * /v1/admin/razan — the «رزان» page: her settings (settings:read / settings:write),
 * a preview link to try them on the shop before saving, and the usage report.
 */
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { RAZAN_DEFAULTS, RazanSchema, razanOf } from "../razan/razan.settings.js";
import { makePreview, razanReport } from "../razan/razan.service.js";
import { adminIdOf, changedKeys, getOrCreateSettings, keepRevision, triggerSettingsRevalidate } from "./settings.controller.js";

const r = Router();
const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const s = await getOrCreateSettings();
    const header = obj(s.header);
    res.json({
      razan: razanOf(header),
      defaults: RAZAN_DEFAULTS,
      chatbotEnabled: obj(header.storefront).chatbotEnabled !== false,
      storefrontUrl: env.STOREFRONT_URL ?? null,
    });
  }),
);

r.put(
  "/",
  validate({ body: RazanSchema }),
  asyncHandler(async (req, res) => {
    const next = RazanSchema.parse(req.body);
    const s = await getOrCreateSettings();
    const header = obj(s.header);
    const data = { header: { ...header, razan: next } as Prisma.InputJsonValue };
    const current = s as unknown as Record<string, unknown>;
    const changed = changedKeys(current, data as Record<string, unknown>);
    if (changed.length) {
      await keepRevision(current, changed, await adminIdOf(req), "تعديل إعدادات رزان");
      await prisma.siteSettings.update({ where: { id: s.id }, data });
      triggerSettingsRevalidate();
    }
    res.json({ razan: next });
  }),
);

/** Try settings on the shop without saving: /?razan-preview=<id> (2 hours). */
r.post(
  "/preview",
  validate({ body: RazanSchema }),
  asyncHandler(async (req, res) => {
    res.json(makePreview(req.body));
  }),
);

r.get(
  "/report",
  asyncHandler(async (_req, res) => {
    res.json(await razanReport());
  }),
);

export default r;
