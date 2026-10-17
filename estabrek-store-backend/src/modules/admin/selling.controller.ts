import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { prisma } from "../../lib/prisma.js";
import { hasPermission } from "../../middleware/access.js";
import { triggerJob } from "../../lib/jobs.js";
import { RULE_DEFAULTS, RULE_LIMITS, RULE_NAMES, mergeRuleSettings } from "../../lib/saleRules.js";
import { readSellingSettings } from "./insights.service.js";
import { approveSuggestions, recentPriceActions, saleSuggestions, skipSuggestion, undoPriceAction } from "./selling.service.js";
import { CAMPAIGN_MAX_DAYS, checkCampaign, endCampaign, previewCampaign, runCampaigns, type CampaignInput } from "./campaigns.service.js";

/**
 * /v1/admin/selling — البيع الذكي: sale rules (they suggest, the owner approves,
 * every change can be undone) and seasons (a theme and prices from a start to an
 * end). discounts:read / discounts:write (admin.routes.ts); a season that
 * switches the theme also needs settings:write.
 */
const r = Router();
const adminOf = (req: any): string | null => (req.user?.bypass ? null : req.access?.adminId ?? null);

/* ---------------- Rules and suggestions ---------------- */

r.get(
  "/suggestions",
  asyncHandler(async (_req, res) => {
    res.json({ ...(await saleSuggestions()), defaults: RULE_DEFAULTS, limits: RULE_LIMITS });
  }),
);

const pct = z.number().int().min(RULE_LIMITS.percent.min).max(RULE_LIMITS.percent.max);
const days = z.number().int().min(RULE_LIMITS.saleDays.min).max(RULE_LIMITS.saleDays.max);
const RulesPatch = z
  .object({
    unseen: z.object({ on: z.boolean(), percent: pct, saleDays: days }).partial().strict().optional(),
    lookedNotBought: z.object({ on: z.boolean(), percent: pct, saleDays: days }).partial().strict().optional(),
    hotLowStock: z.object({ on: z.boolean(), maxLeft: z.number().int().min(RULE_LIMITS.maxLeft.min).max(RULE_LIMITS.maxLeft.max) }).partial().strict().optional(),
  })
  .strict();

r.patch(
  "/rules",
  asyncHandler(async (req, res) => {
    const patch = RulesPatch.parse(req.body ?? {});
    const { data } = await readSellingSettings();
    const cur = mergeRuleSettings(data.rules);
    const next = {
      unseen: { ...cur.unseen, ...(patch.unseen ?? {}) },
      lookedNotBought: { ...cur.lookedNotBought, ...(patch.lookedNotBought ?? {}) },
      hotLowStock: { ...cur.hotLowStock, ...(patch.hotLowStock ?? {}) },
    };
    await prisma.sellingSettings.upsert({
      where: { id: "default" },
      create: { id: "default", data: { ...data, rules: next }, updatedById: adminOf(req) },
      update: { data: { ...data, rules: next }, updatedById: adminOf(req) },
    });
    res.json({ rules: next });
  }),
);

const Rule = z.enum(RULE_NAMES as [string, ...string[]]) as z.ZodType<(typeof RULE_NAMES)[number]>;
const ApproveBody = z
  .object({ items: z.array(z.object({ rule: Rule, productId: z.string().min(1).max(64), percent: pct.optional(), saleDays: days.optional() }).strict()).min(1).max(50) })
  .strict();

/** The owner's yes to one or more suggestions. */
r.post(
  "/suggestions/approve",
  asyncHandler(async (req, res) => {
    const body = ApproveBody.parse(req.body ?? {});
    res.json({ results: await approveSuggestions(body.items, adminOf(req)) });
  }),
);

const SkipBody = z.object({ rule: Rule, productId: z.string().min(1).max(64), days: z.number().int().min(1).max(365).default(30) }).strict();

r.post(
  "/suggestions/skip",
  asyncHandler(async (req, res) => {
    const b = SkipBody.parse(req.body ?? {});
    res.json(await skipSuggestion(b.rule, b.productId, b.days));
  }),
);

/* ---------------- Price changes (undo) ---------------- */

r.get(
  "/actions",
  asyncHandler(async (req, res) => {
    const take = Math.min(200, Math.max(1, Number(req.query.take) || 50));
    res.json({ actions: await recentPriceActions(take) });
  }),
);

r.post(
  "/actions/:id/undo",
  asyncHandler(async (req, res) => {
    res.json(await undoPriceAction(String(req.params.id)));
  }),
);

/* ---------------- Seasons ---------------- */

const CampaignBody = z
  .object({
    name: z.string().trim().min(1).max(80),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    themePresetId: z.string().regex(/^[a-zA-Z0-9_-]{2,60}$/).nullable().default(null),
    percentOff: z.number().int().min(RULE_LIMITS.percent.min).max(RULE_LIMITS.percent.max).nullable().default(null),
    categoryIds: z.array(z.string().min(1).max(64)).max(200).default([]),
    productIds: z.array(z.string().min(1).max(64)).max(500).default([]),
  })
  .strict();

function needThemeRight(req: any, input: { themePresetId: string | null }) {
  if (input.themePresetId && !hasPermission(req, "settings:write")) throw new AppError(403, "PERMISSION_DENIED", "Changing the theme needs settings:write", { required: ["settings:write"] });
}

r.get(
  "/campaigns",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.campaign.findMany({ orderBy: [{ startsAt: "desc" }], take: 100 });
    res.json({ campaigns: rows, maxDays: CAMPAIGN_MAX_DAYS, now: Date.now() });
  }),
);

r.post(
  "/campaigns/preview",
  asyncHandler(async (req, res) => {
    const b = CampaignBody.pick({ percentOff: true, categoryIds: true, productIds: true }).parse(req.body ?? {});
    res.json(await previewCampaign(b));
  }),
);

r.post(
  "/campaigns",
  asyncHandler(async (req, res) => {
    const input = CampaignBody.parse(req.body ?? {}) as CampaignInput;
    needThemeRight(req, input);
    await checkCampaign(input);
    const c = await prisma.campaign.create({ data: { ...input, createdById: adminOf(req) } });
    // A season that starts now starts now, not on the next minute.
    if (c.startsAt.getTime() <= Date.now() && !triggerJob("campaigns")) await runCampaigns();
    res.status(201).json({ campaign: await prisma.campaign.findUnique({ where: { id: c.id } }) });
  }),
);

r.patch(
  "/campaigns/:id",
  asyncHandler(async (req, res) => {
    const c = await prisma.campaign.findUnique({ where: { id: String(req.params.id) } });
    if (!c) throw new AppError(404, "CAMPAIGN_NOT_FOUND");
    if (c.status !== "scheduled") throw new AppError(409, "CAMPAIGN_NOT_EDITABLE", "Only a season that hasn't started can change");
    const input = CampaignBody.parse(req.body ?? {}) as CampaignInput;
    needThemeRight(req, input);
    await checkCampaign(input, Date.now(), c.id);
    await prisma.campaign.update({ where: { id: c.id }, data: input });
    if (input.startsAt.getTime() <= Date.now() && !triggerJob("campaigns")) await runCampaigns();
    res.json({ campaign: await prisma.campaign.findUnique({ where: { id: c.id } }) });
  }),
);

/** Ends a running season now (its theme and prices go back), or cancels one that hasn't started. */
r.post(
  "/campaigns/:id/end",
  asyncHandler(async (req, res) => {
    const c = await prisma.campaign.findUnique({ where: { id: String(req.params.id) } });
    if (!c) throw new AppError(404, "CAMPAIGN_NOT_FOUND");
    if (c.status !== "scheduled" && c.status !== "running") throw new AppError(409, "CAMPAIGN_ALREADY_OVER");
    if (c.themePresetId && c.status === "running") needThemeRight(req, c);
    res.json({ campaign: await endCampaign(c, "canceled") });
  }),
);

export default r;
