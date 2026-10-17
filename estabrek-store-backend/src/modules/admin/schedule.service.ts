/**
 * The timeline (admin → الجدول الزمني): changes set for a date and time, each
 * optionally going back by itself at another. Prices go through seasons
 * (campaigns.service.ts: they have their own ends); everything else is here:
 *   theme         the theme preset
 *   motion        one or more motion settings (السرعة والكاش → الحركة والتحميل)
 *   maintenance   maintenance mode on / off (and its message)
 *   announcement  the announcement bar on / off (and its text, link)
 *   section       a page section shown or hidden
 *   cachePurge    empty the cache (all, or one part); nothing to go back to
 * Going back only touches what still is as the change left it: something the
 * owner changed by hand meanwhile stays (the note says so).
 */
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/httpError.js";
import { purgeCache } from "../../lib/cache.js";
import { NAMESPACE_NAMES, type NamespaceName } from "../../lib/cacheConfig.js";
import { revalidateStorefront } from "../../lib/storefrontRevalidate.js";
import { readPerformance, savePerformance } from "../../lib/performanceSettings.js";
import { StorefrontMotionSchema, type StorefrontMotion } from "../../lib/storefrontMotion.js";
import { announcementNow, maintenanceNow, setAnnouncement, setMaintenance, setThemePreset, themePresetNow } from "./siteChanges.js";
import { capturePageRevision, triggerCmsRevalidate } from "./pages.controller.js";
import { STOREFRONT_TAGS } from "./cache.controller.js";

const DAY = 86400_000;
export const SCHEDULE_MAX_DAYS = 365;

export const KIND_NAMES = ["theme", "motion", "maintenance", "announcement", "section", "cachePurge"] as const;
export type ScheduleKind = (typeof KIND_NAMES)[number];

const MotionChanges = StorefrontMotionSchema.omit({ sections: true })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, "at least one setting");

export const PAYLOADS = {
  theme: z.object({ presetId: z.string().regex(/^[a-zA-Z0-9_-]{2,60}$/).nullable() }).strict(),
  motion: z.object({ changes: MotionChanges }).strict(),
  maintenance: z.object({ on: z.boolean(), message: z.string().trim().max(300).nullable().optional() }).strict(),
  announcement: z
    .object({ on: z.boolean(), text: z.string().trim().max(200).nullable().optional(), link: z.string().trim().max(300).nullable().optional() })
    .strict()
    .refine((v) => !v.on || v.text === undefined || !!v.text, "text needed when on"),
  section: z.object({ sectionId: z.string().min(1).max(64), visible: z.boolean() }).strict(),
  cachePurge: z.object({ namespace: z.enum(NAMESPACE_NAMES as [NamespaceName, ...NamespaceName[]]).nullable() }).strict(),
} as const;

export function parsePayload(kind: ScheduleKind, payload: unknown) {
  const ok = PAYLOADS[kind].safeParse(payload);
  if (!ok.success) throw new AppError(400, "BAD_SCHEDULE_PAYLOAD", ok.error.issues[0]?.message ?? "Bad payload", { issues: ok.error.issues.slice(0, 5) });
  return ok.data as Record<string, unknown>;
}

/** Times: in the future (a minute of slack), within a year, undo after the start; emptying the cache has no undo. */
export function checkTimes(kind: ScheduleKind, runAt: Date, undoAt: Date | null, now = Date.now()) {
  if (runAt.getTime() < now - 60_000) throw new AppError(400, "SCHEDULE_IN_THE_PAST");
  if (runAt.getTime() > now + SCHEDULE_MAX_DAYS * DAY) throw new AppError(400, "SCHEDULE_TOO_FAR");
  if (undoAt && kind === "cachePurge") throw new AppError(400, "SCHEDULE_NOTHING_TO_UNDO");
  if (undoAt && undoAt.getTime() <= runAt.getTime()) throw new AppError(400, "SCHEDULE_UNDO_BEFORE_START");
  if (undoAt && undoAt.getTime() > runAt.getTime() + SCHEDULE_MAX_DAYS * DAY) throw new AppError(400, "SCHEDULE_TOO_FAR");
}

type Line = { key: string; from: unknown; to: unknown; label?: string };

async function sectionOf(sectionId: string) {
  const s = await prisma.pageSection.findUnique({ where: { id: sectionId }, select: { id: true, type: true, data: true, isVisible: true, page: { select: { id: true, name: true, slug: true } } } });
  if (!s) throw new AppError(404, "SECTION_NOT_FOUND");
  const d = s.data && typeof s.data === "object" ? (s.data as Record<string, unknown>) : {};
  const title = typeof d.title === "string" && d.title.trim() ? d.title.trim().slice(0, 60) : s.type;
  return { ...s, label: `${s.page.name} · ${title}` };
}

/** What the change would do now: each thing from its value now to the new one. */
export async function previewChange(kind: ScheduleKind, payload: Record<string, unknown>): Promise<Line[]> {
  if (kind === "theme") return [{ key: "theme", from: await themePresetNow(), to: payload.presetId }];
  if (kind === "motion") {
    const { storefront } = await readPerformance();
    const changes = payload.changes as Partial<StorefrontMotion>;
    return Object.entries(changes).map(([k, v]) => ({ key: `storefront.${k}`, from: storefront[k as keyof StorefrontMotion], to: v }));
  }
  if (kind === "maintenance") {
    const m = await maintenanceNow();
    const out: Line[] = [{ key: "maintenance.on", from: m.on, to: payload.on }];
    if (payload.message !== undefined) out.push({ key: "maintenance.message", from: m.message, to: payload.message });
    return out;
  }
  if (kind === "announcement") {
    const a = await announcementNow();
    const out: Line[] = [{ key: "announcement.on", from: a.on, to: payload.on }];
    if (payload.text !== undefined) out.push({ key: "announcement.text", from: a.text, to: payload.text });
    if (payload.link !== undefined) out.push({ key: "announcement.link", from: a.link, to: payload.link });
    return out;
  }
  if (kind === "section") {
    const s = await sectionOf(String(payload.sectionId));
    return [{ key: "section.visible", from: s.isVisible, to: payload.visible, label: s.label }];
  }
  return [{ key: `cache.${payload.namespace ?? "all"}`, from: null, to: null }];
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

type Row = NonNullable<Awaited<ReturnType<typeof prisma.scheduledChange.findUnique>>>;

/** Does it; returns what it replaced. */
async function apply(c: Row): Promise<Record<string, unknown> | null> {
  const p = c.payload as Record<string, unknown>;
  const note = `مجدول: «${c.title}»`;
  if (c.kind === "theme") return { presetId: await setThemePreset((p.presetId as string | null) ?? null, note) };
  if (c.kind === "motion") {
    const { storefront } = await readPerformance();
    const changes = p.changes as Partial<StorefrontMotion>;
    const before = Object.fromEntries(Object.keys(changes).map((k) => [k, storefront[k as keyof StorefrontMotion]]));
    await savePerformance({}, { storefront: { ...storefront, ...changes } });
    return before;
  }
  if (c.kind === "maintenance") return await setMaintenance({ on: p.on as boolean, ...(p.message !== undefined ? { message: p.message as string | null } : {}) }, note);
  if (c.kind === "announcement")
    return await setAnnouncement({ on: p.on as boolean, ...(p.text !== undefined ? { text: p.text as string | null } : {}), ...(p.link !== undefined ? { link: p.link as string | null } : {}) }, note);
  if (c.kind === "section") {
    const s = await sectionOf(String(p.sectionId));
    if (s.isVisible !== p.visible) {
      await capturePageRevision(s.page.id, note);
      await prisma.pageSection.update({ where: { id: s.id }, data: { isVisible: p.visible as boolean } });
      triggerCmsRevalidate([s.page.slug]);
    }
    return { visible: s.isVisible };
  }
  const ns = (p.namespace as NamespaceName | null) ?? undefined;
  const cleared = purgeCache(ns);
  void revalidateStorefront({ tags: ns ? STOREFRONT_TAGS[ns] : ["cms", "catalog"] }).catch(() => undefined);
  return { cleared };
}

/** Puts back what it replaced, where nothing was changed by hand since. */
async function revert(c: Row): Promise<{ note: string | null }> {
  const p = c.payload as Record<string, unknown>;
  const b = (c.before ?? {}) as Record<string, unknown>;
  const note = `رجوع «${c.title}»`;
  const kept = "اتغيّر بالإيد من بعدها، فضل متل ما هو.";
  if (c.kind === "theme") {
    if ((await themePresetNow()) !== ((p.presetId as string | null) ?? null)) return { note: kept };
    await setThemePreset((b.presetId as string | null) ?? null, note);
    return { note: null };
  }
  if (c.kind === "motion") {
    const { storefront } = await readPerformance();
    const changes = p.changes as Record<string, unknown>;
    const back: Record<string, unknown> = {};
    const skipped: string[] = [];
    for (const [k, v] of Object.entries(changes)) {
      if (same(storefront[k as keyof StorefrontMotion], v)) back[k] = b[k];
      else skipped.push(k);
    }
    if (Object.keys(back).length) await savePerformance({}, { storefront: { ...storefront, ...back } as StorefrontMotion });
    return { note: skipped.length ? `${skipped.join("، ")}: ${kept}` : null };
  }
  if (c.kind === "maintenance") {
    const m = await maintenanceNow();
    if (m.on !== p.on || (p.message !== undefined && m.message !== p.message)) return { note: kept };
    await setMaintenance({ on: b.on as boolean, ...(p.message !== undefined ? { message: (b.message as string | null) ?? null } : {}) }, note);
    return { note: null };
  }
  if (c.kind === "announcement") {
    const a = await announcementNow();
    if (a.on !== p.on || (p.text !== undefined && a.text !== p.text) || (p.link !== undefined && a.link !== p.link)) return { note: kept };
    await setAnnouncement(
      {
        on: b.on as boolean,
        ...(p.text !== undefined ? { text: (b.text as string | null) ?? null } : {}),
        ...(p.link !== undefined ? { link: (b.link as string | null) ?? null } : {}),
      },
      note,
    );
    return { note: null };
  }
  if (c.kind === "section") {
    const s = await sectionOf(String(p.sectionId)).catch(() => null);
    if (!s) return { note: "القسم انحذف." };
    if (s.isVisible !== p.visible) return { note: kept };
    await capturePageRevision(s.page.id, note);
    await prisma.pageSection.update({ where: { id: s.id }, data: { isVisible: b.visible as boolean } });
    triggerCmsRevalidate([s.page.slug]);
    return { note: null };
  }
  return { note: null };
}

export async function applyNow(c: Row, now = Date.now()) {
  try {
    const before = await apply(c);
    return prisma.scheduledChange.update({
      where: { id: c.id },
      data: { status: c.undoAt ? "applied" : "done", appliedAt: new Date(now), before: (before ?? undefined) as object | undefined, note: null },
    });
  } catch (e) {
    return prisma.scheduledChange.update({ where: { id: c.id }, data: { status: "failed", note: (e instanceof Error ? e.message : String(e)).slice(0, 300) } });
  }
}

export async function undoNow(c: Row, now = Date.now()) {
  try {
    const r = await revert(c);
    return prisma.scheduledChange.update({ where: { id: c.id }, data: { status: "undone", undoneAt: new Date(now), note: r.note } });
  } catch (e) {
    return prisma.scheduledChange.update({ where: { id: c.id }, data: { status: "failed", note: (e instanceof Error ? e.message : String(e)).slice(0, 300) } });
  }
}

/** The background job: do what's due, put back what's over. */
export async function runScheduled(now = Date.now()) {
  const at = new Date(now);
  let applied = 0;
  let undone = 0;
  for (const c of await prisma.scheduledChange.findMany({ where: { status: "scheduled", runAt: { lte: at } }, orderBy: { runAt: "asc" } })) {
    // Its undo time passed too (the server was off): nothing to do.
    if (c.undoAt && c.undoAt <= at) {
      await prisma.scheduledChange.update({ where: { id: c.id }, data: { status: "canceled", note: "السيرفر كان مطفي طول المدة: ما انعمل شي." } });
      continue;
    }
    await applyNow(c, now);
    applied += 1;
  }
  for (const c of await prisma.scheduledChange.findMany({ where: { status: "applied", undoAt: { lte: at } }, orderBy: { undoAt: "asc" } })) {
    await undoNow(c, now);
    undone += 1;
  }
  return { applied, undone };
}
