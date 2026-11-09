/**
 * The store's design variables (lib/designTokens.ts), kept in the settings header like the site styles:
 *
 * GET    /admin/design-tokens          — { tokens (what the shop shows), draft (unpublished, or null) }
 * PUT    /admin/design-tokens/draft    { tokens } — the editor's changes; its preview shows them, the shop doesn't
 * DELETE /admin/design-tokens/draft    — drop the changes
 * POST   /admin/design-tokens/publish  — the changes go live on every page (a settings revision is kept first)
 */
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { checkDesignTokens, EMPTY_TOKENS, storedDesignTokens } from "../../lib/designTokens.js";
import { hasPermission } from "../../middleware/access.js";
import { adminIdOf, getOrCreateSettings, keepRevision, triggerSettingsRevalidate } from "./settings.controller.js";

const r = Router();

const headerOf = (s: { header: unknown }) => (s.header && typeof s.header === "object" && !Array.isArray(s.header) ? { ...(s.header as Record<string, unknown>) } : {});
const both = (header: Record<string, unknown>) => ({ tokens: storedDesignTokens(header.designTokens) ?? EMPTY_TOKENS, draft: storedDesignTokens(header.designTokensDraft) });

r.get("/", asyncHandler(async (_req, res) => {
  const s = await getOrCreateSettings();
  res.json(both(headerOf(s)));
}));

r.put("/draft", asyncHandler(async (req, res) => {
  const checked = checkDesignTokens((req.body as any)?.tokens);
  if (!checked.ok) return res.status(400).json({ error: "TOKENS_INVALID", issues: checked.issues });
  const s = await getOrCreateSettings();
  const header = { ...headerOf(s), designTokensDraft: checked.tokens };
  await prisma.siteSettings.update({ where: { id: s.id }, data: { header: header as any } });
  res.json(both(header));
}));

r.delete("/draft", asyncHandler(async (_req, res) => {
  const s = await getOrCreateSettings();
  const header = headerOf(s);
  delete header.designTokensDraft;
  await prisma.siteSettings.update({ where: { id: s.id }, data: { header: header as any } });
  res.json(both(header));
}));

// Every page changes at once, so it takes the right to publish pages.
r.post("/publish", asyncHandler(async (req, res) => {
  if (!req.access?.owner && !hasPermission(req, "pages:publish")) return res.status(403).json({ error: "PERMISSION_DENIED", required: ["pages:publish"] });
  const s = await getOrCreateSettings();
  const header = headerOf(s);
  const draft = storedDesignTokens(header.designTokensDraft);
  if (!draft) return res.status(400).json({ error: "NO_DRAFT" });
  await keepRevision(s as unknown as Record<string, unknown>, ["header.designTokens"], await adminIdOf(req), "Design variables published");
  header.designTokens = draft;
  delete header.designTokensDraft;
  await prisma.siteSettings.update({ where: { id: s.id }, data: { header: header as any } });
  triggerSettingsRevalidate();
  res.json(both(header));
}));

export default r;
