import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { VisualControls, publicVisualControls } from "../../lib/visualControls.js";
import { requirePermission } from "../../middleware/access.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { getOrCreateSettings, triggerSettingsRevalidate } from "./settings.controller.js";
const r = Router();
r.get("/", requirePermission("settings:read"), asyncHandler(async (_req, res) => {
  res.json(publicVisualControls((await getOrCreateSettings()).visualControls));
}));
r.put("/", requirePermission("settings:write"), validate({ body: VisualControls }), asyncHandler(async (req, res) => {
  const site = await getOrCreateSettings();
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "SiteSettings" WHERE id = ${site.id} FOR UPDATE`;
    const current = await tx.siteSettings.findUnique({ where: { id: site.id } });
    if (!current || publicVisualControls(current.visualControls).revision !== req.body.revision) return null;
    const next = { ...req.body, revision: req.body.revision + 1 };
    await tx.siteSettings.update({ where: { id: site.id }, data: { visualControls: next } });
    return next;
  });
  if (!result) return res.status(409).json({ error: "VISUAL_CONTROLS_CONFLICT", message: "Settings changed. Reload before saving." });
  triggerSettingsRevalidate(); res.json(result);
}));
export default r;
