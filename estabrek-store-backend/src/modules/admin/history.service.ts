/**
 * One history for everything (admin → السجل): "what changed yesterday", and
 * back with one click. It reads the histories each part already keeps:
 *   settings  SettingsRevision            the settings as they were before a save
 *   speed     PerformanceSettingsRevision  السرعة والكاش, motion, uploads, lanes, jobs
 *   security  SecurityPolicyRevision       the security rules
 *   pages     PageRevision                 a page and its sections
 *   products  ProductRevision              a product, its colours, photos and sizes
 *   stock     InventoryAdjustment          one stock change (undone by the opposite one)
 *   prices    PriceAction                  a discount from البيع الذكي
 *   schedule  ScheduledChange              a change from الجدول الزمني
 * A version ("before") goes back to how things were before that change (the
 * state now is kept first, so going back can be undone too); an action ("undo")
 * undoes that one change. Each needs the right of its part.
 */
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/httpError.js";
import { hasPermission } from "../../middleware/access.js";
import { kickStockAlerts } from "../stockAlerts/stockAlerts.service.js";
import { restoreSettingsRevision } from "./settings.controller.js";
import { restoreSecurityRevision } from "./system.controller.js";
import { restorePerformanceRevision } from "./cache.controller.js";
import { restorePageRevision, triggerCmsRevalidate } from "./pages.controller.js";
import { restoreProductRevision } from "./productRevisions.js";
import { undoPriceAction } from "./selling.service.js";
import { undoNow } from "./schedule.service.js";

export const AREAS = ["settings", "speed", "security", "pages", "products", "stock", "prices", "schedule"] as const;
export type Area = (typeof AREAS)[number];

const READ: Record<Area, string> = {
  settings: "settings:read",
  speed: "system:read",
  security: "system:read",
  pages: "pages:read",
  products: "catalog:read",
  stock: "inventory:read",
  prices: "discounts:read",
  schedule: "system:read",
};
const WRITE: Record<Area, string> = {
  settings: "settings:write",
  speed: "system:write",
  security: "system:write",
  pages: "pages:write",
  products: "catalog:write",
  stock: "inventory:write",
  prices: "discounts:write",
  schedule: "system:write",
};

export type Entry = {
  area: Area;
  id: string;
  at: string;
  who: string | null;
  /** The thing: a product's title, a page's name, a size's SKU… (null for settings parts). */
  title: string | null;
  /** What changed: setting names, a reason, a kind. */
  what: string[];
  detail: Record<string, unknown> | null;
  /** "before": back to before this change; "undo": undo this change; null: can't from here. */
  restore: "before" | "undo" | null;
  /** Undone already (an action), or put back since. */
  done: boolean;
  link: string | null;
};

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Stock changes an order made: they follow the order (accepting, returning), not السجل. */
const ORDER_REASON = /^ORDER_(ACCEPT|RESTORE)/;

export async function listHistory(req: any, opts: { from: Date; to: Date; area?: Area | null; take: number }) {
  const areas = (opts.area ? [opts.area] : [...AREAS]).filter((a) => hasPermission(req, READ[a]));
  const at = { gte: opts.from, lte: opts.to };
  const take = opts.take;
  const want = (a: Area) => areas.includes(a);
  const [settings, speed, security, pages, products, stock, prices, schedule] = await Promise.all([
    want("settings") ? prisma.settingsRevision.findMany({ where: { createdAt: at }, orderBy: { createdAt: "desc" }, take, select: { id: true, createdAt: true, changed: true, note: true, adminUserId: true } }) : [],
    want("speed") ? prisma.performanceSettingsRevision.findMany({ where: { createdAt: at }, orderBy: { createdAt: "desc" }, take, select: { id: true, createdAt: true, changed: true, adminUserId: true } }) : [],
    want("security") ? prisma.securityPolicyRevision.findMany({ where: { createdAt: at }, orderBy: { createdAt: "desc" }, take, select: { id: true, createdAt: true, changed: true, adminUserId: true } }) : [],
    want("pages") ? prisma.pageRevision.findMany({ where: { createdAt: at }, orderBy: { createdAt: "desc" }, take, select: { id: true, createdAt: true, pageId: true, name: true, slug: true, reason: true, createdBy: true } }) : [],
    want("products") ? prisma.productRevision.findMany({ where: { createdAt: at }, orderBy: { createdAt: "desc" }, take, select: { id: true, createdAt: true, productId: true, title: true, reason: true, adminUserId: true } }) : [],
    want("stock")
      ? prisma.inventoryAdjustment.findMany({
          where: { createdAt: at },
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, createdAt: true, delta: true, beforeStock: true, afterStock: true, reason: true, adminUserId: true, variant: { select: { sku: true, item: { select: { productId: true, product: { select: { title: true } } } } } } },
        })
      : [],
    want("prices") ? prisma.priceAction.findMany({ where: { createdAt: at }, orderBy: { createdAt: "desc" }, take, select: { id: true, createdAt: true, kind: true, rule: true, campaignId: true, productId: true, title: true, status: true, adminUserId: true, changes: true } }) : [],
    want("schedule")
      ? prisma.scheduledChange.findMany({ where: { appliedAt: at }, orderBy: { appliedAt: "desc" }, take, select: { id: true, appliedAt: true, kind: true, title: true, status: true, createdById: true } })
      : [],
  ]);

  // Who: one look-up for everyone.
  const ids = new Set<string>();
  for (const r of [...settings, ...speed, ...security, ...products, ...stock, ...prices]) if (r.adminUserId) ids.add(r.adminUserId);
  for (const r of schedule) if (r.createdById) ids.add(r.createdById);
  const admins = ids.size ? await prisma.adminUser.findMany({ where: { id: { in: [...ids] } }, select: { id: true, name: true, email: true } }) : [];
  const nameOf = (id: string | null | undefined) => {
    const a = id ? admins.find((x) => x.id === id) : null;
    return a ? a.name || a.email : null;
  };
  // Stock changes undone already (the undo says which).
  const undone = new Set<string>();
  if (stock.length) {
    const undos = await prisma.inventoryAdjustment.findMany({ where: { OR: stock.map((s) => ({ reason: { contains: `undo:${s.id}` } })) }, select: { reason: true } });
    for (const u of undos) {
      const m = /undo:(\w+)/.exec(u.reason ?? "");
      if (m) undone.add(m[1]);
    }
  }

  const out: Entry[] = [
    ...settings.map((r) => ({ area: "settings" as const, id: r.id, at: r.createdAt.toISOString(), who: nameOf(r.adminUserId), title: null, what: strings(r.changed), detail: r.note ? { note: r.note } : null, restore: "before" as const, done: false, link: "/admin/settings" })),
    ...speed.map((r) => ({ area: "speed" as const, id: r.id, at: r.createdAt.toISOString(), who: nameOf(r.adminUserId), title: null, what: r.changed, detail: null, restore: "before" as const, done: false, link: "/admin/system/cache" })),
    ...security.map((r) => ({ area: "security" as const, id: r.id, at: r.createdAt.toISOString(), who: nameOf(r.adminUserId), title: null, what: r.changed, detail: null, restore: "before" as const, done: false, link: "/admin/system/security" })),
    ...pages.map((r) => ({ area: "pages" as const, id: r.id, at: r.createdAt.toISOString(), who: r.createdBy ?? null, title: r.name, what: r.reason ? [r.reason] : [], detail: { pageId: r.pageId, slug: r.slug }, restore: "before" as const, done: false, link: `/admin/pages/${r.pageId}` })),
    ...products.map((r) => ({ area: "products" as const, id: r.id, at: r.createdAt.toISOString(), who: nameOf(r.adminUserId), title: r.title, what: [r.reason], detail: { productId: r.productId }, restore: "before" as const, done: false, link: `/admin/catalog/products/${r.productId}` })),
    ...stock.map((r) => ({
      area: "stock" as const,
      id: r.id,
      at: r.createdAt.toISOString(),
      who: nameOf(r.adminUserId),
      title: `${r.variant.item.product.title} · ${r.variant.sku}`,
      what: r.reason ? [r.reason] : [],
      detail: { delta: r.delta, before: r.beforeStock, after: r.afterStock },
      restore: ORDER_REASON.test(r.reason ?? "") ? null : ("undo" as const),
      done: undone.has(r.id),
      link: `/admin/catalog/products/${r.variant.item.productId}`,
    })),
    ...prices.map((r) => ({
      area: "prices" as const,
      id: r.id,
      at: r.createdAt.toISOString(),
      who: nameOf(r.adminUserId),
      title: r.title,
      what: [r.kind, ...(r.rule ? [r.rule] : [])],
      detail: { sizes: Array.isArray(r.changes) ? r.changes.length : 0, season: !!r.campaignId },
      // A season's prices go back with the season.
      restore: r.campaignId ? null : ("undo" as const),
      done: r.status !== "applied",
      link: `/admin/discounts/smart#history`,
    })),
    ...schedule.map((r) => ({
      area: "schedule" as const,
      id: r.id,
      at: (r.appliedAt ?? new Date()).toISOString(),
      who: nameOf(r.createdById),
      title: r.title,
      what: [r.kind],
      detail: { status: r.status },
      restore: r.kind === "cachePurge" ? null : ("undo" as const),
      done: r.status === "undone",
      link: "/admin/system/schedule",
    })),
  ];
  out.sort((a, b) => b.at.localeCompare(a.at));
  return { entries: out.slice(0, take), areas, from: opts.from.toISOString(), to: opts.to.toISOString(), canRestore: Object.fromEntries(areas.map((a) => [a, hasPermission(req, WRITE[a])])) };
}

/** Undoes one stock change with the opposite one (never below zero), kept as a change of its own. */
export async function undoStockChange(id: string, adminSub?: string | null) {
  const out = await prisma.$transaction(async (tx) => {
    const a = await tx.inventoryAdjustment.findUnique({ where: { id }, select: { id: true, delta: true, reason: true, variantId: true, variant: { select: { stock: true } } } });
    if (!a) throw new AppError(404, "STOCK_CHANGE_NOT_FOUND");
    if (ORDER_REASON.test(a.reason ?? "")) throw new AppError(409, "STOCK_CHANGE_FROM_ORDER", "Change the order instead");
    const twice = await tx.inventoryAdjustment.findFirst({ where: { reason: { contains: `undo:${id}` } }, select: { id: true } });
    if (twice) throw new AppError(409, "STOCK_CHANGE_UNDONE", "Undone already");
    const before = a.variant.stock;
    const after = Math.max(0, before - a.delta);
    const admin = adminSub ? await tx.adminUser.findUnique({ where: { id: String(adminSub) }, select: { id: true } }) : null;
    await tx.productVariant.update({ where: { id: a.variantId }, data: { stock: after } });
    await tx.inventoryAdjustment.create({ data: { variantId: a.variantId, delta: after - before, beforeStock: before, afterStock: after, reason: `رجوع تعديل (undo:${id})`, adminUserId: admin?.id ?? null } });
    return { before, after, short: after !== before - a.delta };
  });
  kickStockAlerts();
  return out;
}

/** The one button: back to before that change, or undo it. */
export async function restoreEntry(req: any, area: Area, id: string) {
  if (!hasPermission(req, WRITE[area])) throw new AppError(403, "PERMISSION_DENIED", `Needs ${WRITE[area]}`, { required: [WRITE[area]] });
  const sub = req.user?.sub ?? null;
  if (area === "settings") {
    const out = await restoreSettingsRevision(req, id);
    if (!out) throw new AppError(404, "REVISION_NOT_FOUND");
    return { ok: true, note: null };
  }
  if (area === "speed") return (await restorePerformanceRevision(req, id), { ok: true, note: null });
  if (area === "security") return (await restoreSecurityRevision(req, id), { ok: true, note: null });
  if (area === "pages") {
    const rev = await prisma.pageRevision.findUnique({ where: { id }, select: { pageId: true, slug: true } });
    if (!rev) throw new AppError(404, "REVISION_NOT_FOUND");
    await restorePageRevision(rev.pageId, id, "Restore from history", req.user);
    triggerCmsRevalidate([rev.slug]);
    return { ok: true, note: null };
  }
  if (area === "products") {
    const r = await restoreProductRevision(id, sub);
    return { ok: true, note: r.note };
  }
  if (area === "stock") {
    const r = await undoStockChange(id, sub);
    return { ok: true, note: r.short ? "المخزون ما بينزل تحت الصفر: رجع قد ما بيقدر." : null };
  }
  if (area === "prices") {
    const r = await undoPriceAction(id);
    return { ok: true, note: r.changedSince ? `${r.changedSince} مقاس تغيّر من بعدها، فضل متل ما هو.` : null };
  }
  const c = await prisma.scheduledChange.findUnique({ where: { id } });
  if (!c) throw new AppError(404, "SCHEDULED_CHANGE_NOT_FOUND");
  if (c.status !== "applied" && !(c.status === "done" && c.kind !== "cachePurge")) throw new AppError(409, "SCHEDULED_CHANGE_NOT_APPLIED");
  const out = await undoNow(c);
  return { ok: out.status !== "failed", note: out.note };
}
