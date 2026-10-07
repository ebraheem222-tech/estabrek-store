import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { AppError } from "../../utils/httpError.js";
import { describeFeatures, featureByKey } from "../features/features.registry.js";
import { adminIdOf, changedKeys, getOrCreateSettings, keepRevision, triggerSettingsRevalidate } from "./settings.controller.js";

/** /v1/admin/features — every store switch in one place (settings:read / settings:write). */
const r = Router();

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ groups: describeFeatures(await getOrCreateSettings()) });
  }),
);

r.patch(
  "/:key",
  validate({ body: z.object({ enabled: z.boolean() }) }),
  asyncHandler(async (req, res) => {
    const f = featureByKey(String(req.params.key));
    if (!f) throw new AppError(404, "NOT_FOUND", "Unknown feature");
    const s = await getOrCreateSettings();
    const on = req.body.enabled === true;
    if (on) {
      const missing = (f.needs?.(s) ?? []).filter((n) => n.required && !n.ok);
      if (missing.length) throw new AppError(400, "NEEDS_SETUP", missing.map((n) => n.label).join("، "), { needs: missing });
    }
    if (f.get(s) !== on) {
      const data = f.set(s, on) as Record<string, unknown>;
      const current = s as unknown as Record<string, unknown>;
      await keepRevision(current, changedKeys(current, data), await adminIdOf(req), `${on ? "تشغيل" : "إطفاء"}: ${f.title}`);
      await prisma.siteSettings.update({ where: { id: s.id }, data });
      triggerSettingsRevalidate();
    }
    const fresh = await getOrCreateSettings();
    const all = describeFeatures(fresh).flatMap((g) => g.features);
    res.json(all.find((x) => x.key === f.key));
  }),
);

export default r;
