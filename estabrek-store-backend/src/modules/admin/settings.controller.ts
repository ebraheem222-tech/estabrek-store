import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import { UpdateSettingsBody, LinkNavsBody } from "./settings.schemas.js";
import { revalidateStorefront } from "../../lib/storefrontRevalidate.js";
import { cacheDel } from "../../lib/cache.js";

const r = Router();

async function getOrCreateSettings() {
  let s = await prisma.siteSettings.findFirst();
  if (!s) s = await prisma.siteSettings.create({ data: {} });
  return s;
}

function triggerSettingsRevalidate() {
  void (async () => {
    await cacheDel("settings:public");
    await revalidateStorefront({
      tags: ["cms", "cms:settings", "cms:bootstrap"],
    });
  })();
}

// GET /v1/admin/settings
r.get("/", asyncHandler(async (_req, res) => {
  const s = await getOrCreateSettings();
  res.json(s);
}));

// PATCH /v1/admin/settings
r.patch("/", validate({ body: UpdateSettingsBody }), asyncHandler(async (req, res) => {
  const s = await getOrCreateSettings();

  // Extra guard: if admin enables announcement bar, ensure it has text (either in the request or already saved)
  if (req.body?.announcementIsActive === true) {
    const nextText = (req.body.announcementText ?? s.announcementText)?.toString().trim();
    if (!nextText) {
      return res.status(400).json({ error: "VALIDATION_ERROR", field: "announcementText", message: "announcementText is required when announcementIsActive=true" });
    }
  }


  // Extra guard: if admin enables newsletter, ensure it has a title or text
  if (req.body?.newsletterIsActive === true) {
    const nextTitle = (req.body.newsletterTitle ?? (s as any).newsletterTitle)?.toString().trim();
    const nextText = (req.body.newsletterText ?? (s as any).newsletterText)?.toString().trim();
    if (!nextTitle && !nextText) {
      return res.status(400).json({ error: "VALIDATION_ERROR", field: "newsletterTitle", message: "newsletterTitle or newsletterText is required when newsletterIsActive=true" });
    }
  }

  const updated = await prisma.siteSettings.update({
    where: { id: s.id },
    data: req.body,
  });
  triggerSettingsRevalidate();
  res.json(updated);
}));

// POST /v1/admin/settings/link-navs
r.post("/link-navs", validate({ body: LinkNavsBody }), asyncHandler(async (req, res) => {
  const s = await getOrCreateSettings();

  // Extra guard: if admin enables newsletter, ensure it has a title or text
  if (req.body?.newsletterIsActive === true) {
    const nextTitle = (req.body.newsletterTitle ?? (s as any).newsletterTitle)?.toString().trim();
    const nextText = (req.body.newsletterText ?? (s as any).newsletterText)?.toString().trim();
    if (!nextTitle && !nextText) {
      return res.status(400).json({ error: "VALIDATION_ERROR", field: "newsletterTitle", message: "newsletterTitle or newsletterText is required when newsletterIsActive=true" });
    }
  }

  const updated = await prisma.siteSettings.update({
    where: { id: s.id },
    data: {
      primaryNavId: req.body.primaryNavId ?? null,
      footerNavId: req.body.footerNavId ?? null,
    },
  });
  triggerSettingsRevalidate();
  res.json(updated);
}));

export default r;
