import { randomBytes } from "node:crypto";
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import { UpdateSettingsBody, LinkNavsBody } from "./settings.schemas.js";
import { revalidateStorefront } from "../../lib/storefrontRevalidate.js";
import { cacheDel } from "../../lib/cache.js";
import { forgetFeatures } from "../../lib/features.js";
import { hasPermission } from "../../middleware/access.js";

const r = Router();

export async function getOrCreateSettings() {
  let s = await prisma.siteSettings.findFirst();
  if (!s) s = await prisma.siteSettings.create({ data: {} });
  return s;
}

export function triggerSettingsRevalidate() {
  forgetFeatures();
  void (async () => {
    await cacheDel("settings:public");
    await revalidateStorefront({
      tags: ["cms", "cms:settings", "cms:bootstrap"],
    });
  })();
}

/* ---------------- Payment keys: only for members with payments:write ---------------- */

/** Stripe / PayPal fields. Members without payments:write can't see the secrets or change any of them. */
const PAYMENT_KEYS = [
  "stripeEnabled",
  "stripePublicKey",
  "stripeSecretKey",
  "stripeWebhookSecret",
  "paypalEnabled",
  "paypalClientId",
  "paypalClientSecret",
  "paypalWebhookId",
] as const;

function canEditPayments(req: any) {
  return hasPermission(req, "payments:write");
}

/** Settings as a member may see them: secrets blanked unless they hold payments:write. */
function visibleSettings(req: any, s: Record<string, unknown>) {
  if (canEditPayments(req)) return { ...s, paymentsLocked: false };
  const out: Record<string, unknown> = { ...s, paymentsLocked: true };
  for (const k of ["stripeSecretKey", "stripeWebhookSecret", "paypalClientSecret"]) out[k] = null;
  return out;
}

/** Drops payment fields from a change made by a member without payments:write. */
function withoutPayments(req: any, body: Record<string, unknown>) {
  if (canEditPayments(req)) return body;
  const out = { ...body };
  for (const k of PAYMENT_KEYS) delete out[k];
  return out;
}

// GET /v1/admin/settings
r.get("/", asyncHandler(async (req, res) => {
  const s = await getOrCreateSettings();
  res.json(visibleSettings(req, s as unknown as Record<string, unknown>));
}));

/* ---------------- History: every save keeps the settings as they were ---------------- */

/** Never copied into the history (and never restored from it). */
const SECRET_KEYS = ["stripeSecretKey", "stripeWebhookSecret", "paypalClientSecret"] as const;
/** Not part of a snapshot: identity and timestamps. */
const META_KEYS = ["id", "createdAt", "updatedAt"] as const;
const KEEP_REVISIONS = 60;

function snapshotOf(s: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if ((SECRET_KEYS as readonly string[]).includes(k) || (META_KEYS as readonly string[]).includes(k)) continue;
    out[k] = v;
  }
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Which settings a save changes: top-level keys, and one level into header/footer ("header.marketing"). */
export function changedKeys(before: Record<string, unknown>, next: Record<string, unknown>) {
  const out: string[] = [];
  for (const [k, v] of Object.entries(next)) {
    if (v === undefined || same(before[k], v)) continue;
    if ((k === "header" || k === "footer") && before[k] && v && typeof v === "object" && typeof before[k] === "object") {
      const a = before[k] as Record<string, unknown>, b = v as Record<string, unknown>;
      const inner = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((x) => !same(a[x], b[x]));
      out.push(...(inner.length ? inner.map((x) => `${k}.${x}`) : [k]));
    } else out.push(k);
  }
  return out;
}

export async function adminIdOf(req: any) {
  const sub = req.user?.sub;
  if (!sub) return null;
  const u = await prisma.adminUser.findUnique({ where: { id: String(sub) }, select: { id: true } }).catch(() => null);
  return u?.id ?? null;
}

export async function keepRevision(s: Record<string, unknown>, changed: string[], adminUserId: string | null, note?: string) {
  await prisma.settingsRevision.create({
    data: { data: snapshotOf(s) as any, changed: changed as any, note: note ?? null, adminUserId },
  });
  // Only the most recent ones are kept.
  const old = await prisma.settingsRevision.findMany({ orderBy: { createdAt: "desc" }, skip: KEEP_REVISIONS, select: { id: true } });
  if (old.length) await prisma.settingsRevision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
}

// GET /v1/admin/settings/revisions — newest first
r.get("/revisions", asyncHandler(async (req, res) => {
  const take = Math.min(100, Math.max(1, Number(req.query.take) || 30));
  const rows = await prisma.settingsRevision.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, createdAt: true, changed: true, note: true, adminUser: { select: { email: true, name: true } } },
  });
  res.json({ rows });
}));

// GET /v1/admin/settings/revisions/:id — the settings as they were
r.get("/revisions/:id", asyncHandler(async (req, res) => {
  const rev = await prisma.settingsRevision.findUnique({ where: { id: req.params.id } });
  if (!rev) return res.status(404).json({ error: "NOT_FOUND", message: "This version no longer exists" });
  res.json(rev);
}));

// POST /v1/admin/settings/revisions/:id/restore — go back to that version (the current one is kept first)
r.post("/revisions/:id/restore", asyncHandler(async (req, res) => {
  const rev = await prisma.settingsRevision.findUnique({ where: { id: req.params.id } });
  if (!rev) return res.status(404).json({ error: "NOT_FOUND", message: "This version no longer exists" });
  const s = await getOrCreateSettings();
  const data = snapshotOf((rev.data ?? {}) as Record<string, unknown>);
  // Only real settings columns go back (a column removed since then is skipped).
  const current = s as unknown as Record<string, unknown>;
  const restore = withoutPayments(req, Object.fromEntries(Object.entries(data).filter(([k]) => k in current)));
  const changed = changedKeys(current, restore);
  const adminUserId = await adminIdOf(req);
  await keepRevision(current, changed, adminUserId, "قبل الاسترجاع");
  const updated = await prisma.siteSettings.update({ where: { id: s.id }, data: restore as any });
  triggerSettingsRevalidate();
  res.json({ settings: visibleSettings(req, updated as unknown as Record<string, unknown>), changed });
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

  const body = withoutPayments(req, req.body ?? {});
  // Maintenance needs a preview key for the owner's link (made once, then kept).
  if (body.maintenanceMode === true && !s.maintenanceKey) body.maintenanceKey = randomBytes(12).toString("base64url");
  const changed = changedKeys(s as unknown as Record<string, unknown>, body);
  if (changed.length) await keepRevision(s as unknown as Record<string, unknown>, changed, await adminIdOf(req));
  const updated = await prisma.siteSettings.update({
    where: { id: s.id },
    data: body,
  });
  triggerSettingsRevalidate();
  res.json(visibleSettings(req, updated as unknown as Record<string, unknown>));
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
  res.json(visibleSettings(req, updated as unknown as Record<string, unknown>));
}));

export default r;
