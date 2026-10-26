import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { hasPermission } from "../../middleware/access.js";
import { ACTIONS, CONDITIONS, CONDITION_DEFAULTS, ConfigSchema, DEFAULT_TEXT, PRODUCT_TRIGGERS, SAMPLES, TRIGGERS, type Trigger } from "../../lib/automations.js";
import { emailConfigured } from "../outbox/sender/email.js";
import { getOrCreateSettings } from "./settings.controller.js";
import { forgetRules, testRule } from "./automations.service.js";

/**
 * /v1/admin/automations — التلقائيات: "when X, do Y". settings:read / settings:write
 * (admin.routes.ts); pinning products in the cache also needs system:write.
 */
const r = Router();
const adminOf = (req: any): string | null => (req.user?.bypass ? null : req.access?.adminId ?? null);

const Body = z
  .object({
    name: z.string().trim().min(1).max(80),
    trigger: z.enum(TRIGGERS),
    conditions: z.record(z.string(), z.unknown()).default({}),
    action: z.enum(ACTIONS),
    config: ConfigSchema.default({}),
    enabled: z.boolean().default(true),
    cooldownMinutes: z.number().int().min(0).max(7 * 24 * 60).default(0),
  })
  .strict();

function parse(req: any) {
  const b = Body.parse(req.body ?? {});
  const cond = CONDITIONS[b.trigger].safeParse({ ...CONDITION_DEFAULTS[b.trigger], ...b.conditions });
  if (!cond.success) throw new AppError(400, "BAD_AUTOMATION_CONDITIONS", cond.error.issues[0]?.message);
  if (b.action === "pinProduct") {
    if (!PRODUCT_TRIGGERS.includes(b.trigger)) throw new AppError(400, "AUTOMATION_NOT_A_PRODUCT", "Pinning needs a trigger about a product");
    if (!hasPermission(req, "system:write")) throw new AppError(403, "PERMISSION_DENIED", "Pinning in the cache needs system:write", { required: ["system:write"] });
  }
  const to = b.config.to?.trim();
  if (to && b.action === "email" && !z.string().email().safeParse(to).success) throw new AppError(400, "BAD_AUTOMATION_EMAIL");
  if (to && (b.action === "whatsapp" || b.action === "sms") && !/^\+?[0-9 ()-]{6,20}$/.test(to)) throw new AppError(400, "BAD_AUTOMATION_PHONE");
  return { ...b, conditions: cond.data as object, config: b.config as object };
}

const twilioConfigured = () => Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && (env.TWILIO_FROM || env.SMS_FROM));

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [rules, runs, s] = await Promise.all([
      prisma.automationRule.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.automationRun.findMany({ orderBy: { at: "desc" }, take: 50 }),
      getOrCreateSettings(),
    ]);
    res.json({
      rules,
      runs,
      triggers: Object.fromEntries(TRIGGERS.map((t) => [t, { conditions: CONDITION_DEFAULTS[t], words: Object.keys(SAMPLES[t]).filter((k) => k !== "link"), text: DEFAULT_TEXT[t], product: PRODUCT_TRIGGERS.includes(t) }])),
      // What really sends: the WhatsApp sender isn't connected to a provider yet.
      channels: { email: emailConfigured(), sms: twilioConfigured(), whatsapp: false, outboxWorker: process.env.OUTBOX_WORKER === "true" },
      shop: { email: s.ordersEmail || s.contactEmail || null, whatsapp: s.whatsappNumber || s.contactPhone || null, phone: s.contactPhone || s.whatsappNumber || null },
    });
  }),
);

r.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parse(req);
    const rule = await prisma.automationRule.create({ data: { ...data, createdById: adminOf(req) } });
    forgetRules();
    res.status(201).json({ rule });
  }),
);

const load = async (id: string) => {
  const rule = await prisma.automationRule.findUnique({ where: { id } });
  if (!rule) throw new AppError(404, "AUTOMATION_NOT_FOUND");
  return rule;
};

r.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const rule = await load(String(req.params.id));
    const data = parse(req);
    const out = await prisma.automationRule.update({ where: { id: rule.id }, data });
    forgetRules();
    res.json({ rule: out });
  }),
);

r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const rule = await load(String(req.params.id));
    await prisma.automationState.deleteMany({ where: { ruleId: rule.id } });
    await prisma.automationRule.delete({ where: { id: rule.id } });
    forgetRules();
    res.json({ ok: true });
  }),
);

/** Does the rule's action now, with example words (marked as a test). */
r.post(
  "/:id/test",
  asyncHandler(async (req, res) => {
    const rule = await load(String(req.params.id));
    if (rule.action === "pinProduct") throw new AppError(400, "AUTOMATION_TEST_PIN", "Pinning isn't tried with an example product");
    res.json(await testRule(rule, SAMPLES[rule.trigger as Trigger] ?? {}));
  }),
);

export default r;

/* ---------------- The bell (/v1/admin/notifications) ---------------- */

export const notifications = Router();

notifications.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [rows, unread] = await Promise.all([prisma.adminNotification.findMany({ orderBy: { createdAt: "desc" }, take: 30 }), prisma.adminNotification.count({ where: { readAt: null } })]);
    res.json({ notifications: rows, unread });
  }),
);

notifications.post(
  "/read",
  asyncHandler(async (req, res) => {
    const ids = z.object({ ids: z.array(z.string().min(1).max(64)).max(100).optional() }).strict().parse(req.body ?? {}).ids;
    await prisma.adminNotification.updateMany({ where: { readAt: null, ...(ids ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
    res.json({ unread: await prisma.adminNotification.count({ where: { readAt: null } }) });
  }),
);
