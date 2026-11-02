/**
 * The page editor's site styles (lib/siteStyles.ts), kept in the settings header:
 *
 * GET    /admin/site-styles          — { styles (what the shop shows), draft (unpublished, or null) }
 * PUT    /admin/site-styles/draft    { styles } — the editor's changes; the editor's preview shows them, the shop doesn't
 * DELETE /admin/site-styles/draft    — drop the changes
 * POST   /admin/site-styles/publish  — the changes go live on every page (a settings revision is kept first)
 *
 * A draft save touches nothing the shop reads, so it neither keeps a revision nor clears the shop's cache.
 */
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { checkSiteStyles, storedSiteStyles } from "../../lib/siteStyles.js";
import { hasPermission } from "../../middleware/access.js";
import { adminIdOf, getOrCreateSettings, keepRevision, triggerSettingsRevalidate } from "./settings.controller.js";

const r = Router();

const headerOf = (s: { header: unknown }) => (s.header && typeof s.header === "object" && !Array.isArray(s.header) ? { ...(s.header as Record<string, unknown>) } : {});
const both = (header: Record<string, unknown>) => ({ styles: storedSiteStyles(header.siteStyles) ?? [], draft: storedSiteStyles(header.siteStylesDraft) });

r.get("/", asyncHandler(async (_req, res) => {
  const s = await getOrCreateSettings();
  res.json(both(headerOf(s)));
}));

r.put("/draft", asyncHandler(async (req, res) => {
  const checked = checkSiteStyles((req.body as any)?.styles);
  if (!checked.ok) return res.status(400).json({ error: "STYLES_INVALID", issues: checked.issues });
  const s = await getOrCreateSettings();
  const header = { ...headerOf(s), siteStylesDraft: checked.styles };
  await prisma.siteSettings.update({ where: { id: s.id }, data: { header: header as any } });
  res.json(both(header));
}));

r.delete("/draft", asyncHandler(async (_req, res) => {
  const s = await getOrCreateSettings();
  const header = headerOf(s);
  delete header.siteStylesDraft;
  await prisma.siteSettings.update({ where: { id: s.id }, data: { header: header as any } });
  res.json(both(header));
}));

// Every page changes at once, so it takes the right to publish pages.
r.post("/publish", asyncHandler(async (req, res) => {
  if (!req.access?.owner && !hasPermission(req, "pages:publish")) return res.status(403).json({ error: "PERMISSION_DENIED", required: ["pages:publish"] });
  const s = await getOrCreateSettings();
  const header = headerOf(s);
  const draft = storedSiteStyles(header.siteStylesDraft);
  if (!draft) return res.status(400).json({ error: "NO_DRAFT" });
  await keepRevision(s as unknown as Record<string, unknown>, ["header.siteStyles"], await adminIdOf(req), "Site styles published");
  header.siteStyles = draft;
  delete header.siteStylesDraft;
  await prisma.siteSettings.update({ where: { id: s.id }, data: { header: header as any } });
  triggerSettingsRevalidate();
  res.json(both(header));
}));

export default r;
