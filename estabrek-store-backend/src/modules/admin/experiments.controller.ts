import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { prisma } from "../../lib/prisma.js";
import { hasPermission } from "../../middleware/access.js";
import { EXPERIMENT_KINDS, MOTION_TEST_FIELDS, abCounters, checkValues, experimentNumbers, flushAb, loadRunningTests, slotOf, type ExperimentKind } from "../../lib/experiments.js";
import { testResults } from "../../lib/abStats.js";
import { readPerformance, savePerformance } from "../../lib/performanceSettings.js";
import { triggerSettingsRevalidate } from "./settings.controller.js";
import { capturePageRevision, triggerCmsRevalidate } from "./pages.controller.js";
import { MIN_SEEN, homeSectionTotals, sectionScore, suggestOrder } from "../../lib/homeStats.js";

/**
 * /v1/admin/experiments — تجارب A/B: make a test (draft), start it, see the
 * numbers, stop it, keep the side that won. discounts:read / discounts:write
 * (admin.routes.ts). Keeping a motion setting also needs system:write (it's saved
 * in السرعة والكاش), keeping the home page's opening pages:write.
 */
const r = Router();
const adminOf = (req: any): string | null => (req.user?.bypass ? null : req.access?.adminId ?? null);

const Body = z
  .object({
    name: z.string().trim().min(1).max(80),
    kind: z.enum(EXPERIMENT_KINDS),
    field: z.enum(MOTION_TEST_FIELDS).nullable().default(null),
    a: z.unknown(),
    b: z.unknown(),
    split: z.number().int().min(10).max(90).default(50),
  })
  .strict();

function parse(body: unknown) {
  const b = Body.parse(body ?? {});
  const values = checkValues(b.kind, b.kind === "motion" ? b.field : null, b.a, b.b);
  if (typeof values === "string") throw new AppError(400, `EXPERIMENT_${values}`);
  return { name: b.name, kind: b.kind, field: b.kind === "motion" ? b.field : null, split: b.split, a: values.a as Prisma.InputJsonValue, b: values.b as Prisma.InputJsonValue };
}

/** The shop picks up a started or stopped test with its public settings. */
async function testsChanged() {
  await loadRunningTests();
  triggerSettingsRevalidate();
}

async function withNumbers<T extends { id: string }>(rows: T[]) {
  const nums = await experimentNumbers(rows.map((r) => r.id));
  return rows.map((row) => {
    const n = nums.get(row.id)!;
    return { ...row, results: testResults(n.A, n.B), days: n.days };
  });
}

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.experiment.findMany({ orderBy: [{ createdAt: "desc" }], take: 50 });
    const { storefront } = await readPerformance().catch(() => ({ storefront: null }));
    res.json({ experiments: await withNumbers(rows), motionFields: MOTION_TEST_FIELDS, currentMotion: storefront, collected: abCounters(), now: Date.now() });
  }),
);

r.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parse(req.body);
    const e = await prisma.experiment.create({ data: { ...data, createdById: adminOf(req) } });
    res.status(201).json({ experiment: e });
  }),
);

const load = async (id: string) => {
  const e = await prisma.experiment.findUnique({ where: { id } });
  if (!e) throw new AppError(404, "EXPERIMENT_NOT_FOUND");
  return e;
};

r.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const e = await load(String(req.params.id));
    if (e.status !== "draft") throw new AppError(409, "EXPERIMENT_NOT_EDITABLE", "Only a test that hasn't started can change");
    res.json({ experiment: await prisma.experiment.update({ where: { id: e.id }, data: parse(req.body) }) });
  }),
);

r.post(
  "/:id/start",
  asyncHandler(async (req, res) => {
    const e = await load(String(req.params.id));
    if (e.status !== "draft") throw new AppError(409, "EXPERIMENT_ALREADY_STARTED");
    const others = await prisma.experiment.findMany({ where: { status: "running" }, select: { id: true, name: true, kind: true, field: true } });
    const clash = others.find((o) => slotOf(o) === slotOf(e));
    if (clash) throw new AppError(409, "EXPERIMENT_SLOT_TAKEN", `${clash.name} tests the same thing`, { experimentId: clash.id, name: clash.name });
    const out = await prisma.experiment.update({ where: { id: e.id }, data: { status: "running", startedAt: new Date() } });
    await testsChanged();
    res.json({ experiment: out });
  }),
);

r.post(
  "/:id/stop",
  asyncHandler(async (req, res) => {
    const e = await load(String(req.params.id));
    if (e.status !== "running") throw new AppError(409, "EXPERIMENT_NOT_RUNNING");
    await flushAb().catch(() => undefined);
    const out = await prisma.experiment.update({ where: { id: e.id }, data: { status: "stopped", stoppedAt: new Date() } });
    await testsChanged();
    res.json({ experiment: out });
  }),
);

/** The scenes the rose home places by itself, by name (their keys are "b:<name>"). */
const SCENE_NAMES: Record<string, string> = {
  particles: "الحكاية (لوجو، حجاب، حقيبة)", seasons: "المواسم", stories: "العوالم", instagram: "إنستغرام", rooms: "الغرف", world: "الخريطة", fabric: "دراسة القماش",
};
const TYPE_NAMES: Record<string, string> = {
  HERO: "الافتتاحية", RICH_TEXT: "نص", CUSTOM_HTML: "كود خاص", GRID: "شبكة", FEATURES: "المميزات", STATS: "أرقام", TEAM: "الفريق",
  PRICING: "الأسعار", CONTACT: "التواصل", BANNER: "بانر", FEATURED_CATEGORIES: "الأقسام", COLLECTIONS_GRID: "المجموعات",
  BEST_SELLERS_SLIDER: "الأكثر مبيعاً", NEW_ARRIVALS_SLIDER: "وصل حديثاً", BRANDS_SLIDER: "الماركات", FEATURED_PRODUCTS: "منتجات مختارة",
  IMAGE_GALLERY: "معرض صور", FAQ: "أسئلة", TESTIMONIALS: "آراء الزبائن", CTA: "دعوة", CARDS: "بطاقات", VIDEO: "فيديو", NEWSLETTER: "النشرة",
};
const textOf = (v: unknown): string => (typeof v === "string" ? v : v && typeof v === "object" ? String((v as Record<string, unknown>).ar ?? (v as Record<string, unknown>).en ?? "") : "");

/**
 * GET /v1/admin/experiments/home-sections?days=30 — the home page's sections in numbers: each one's visits
 * that saw it, taps, bag adds and score, the order now and the order the numbers suggest (lib/homeStats.ts).
 */
r.get(
  "/home-sections",
  asyncHandler(async (req, res) => {
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
    const [totals, home] = await Promise.all([
      homeSectionTotals(days),
      prisma.page.findUnique({ where: { slug: "/" }, select: { sections: { where: { isVisible: true }, orderBy: { order: "asc" }, select: { id: true, type: true, data: true } } } }),
    ]);
    const sections = home?.sections ?? [];
    const current = sections.map((s) => `s:${s.id}`);
    const label = (key: string) => {
      if (key.startsWith("b:")) return SCENE_NAMES[key.slice(2)] ?? key.slice(2);
      const s = sections.find((x) => `s:${x.id}` === key);
      if (!s) return null; // removed from the page since
      const d = (s.data ?? {}) as Record<string, unknown>;
      const own = textOf(d.title) || textOf(d.heading) || textOf((d.node as Record<string, unknown> | undefined)?.name);
      return own ? `${TYPE_NAMES[s.type] ?? s.type} · ${own.slice(0, 60)}` : TYPE_NAMES[s.type] ?? s.type;
    };
    const keys = [...new Set([...current, ...totals.keys()])];
    const rows = keys
      .map((key) => {
        const n = totals.get(key) ?? { seen: 0, taps: 0, bags: 0 };
        return { key, label: label(key), onPage: current.includes(key), ...n, tapRate: n.seen ? n.taps / n.seen : 0, bagRate: n.seen ? n.bags / n.seen : 0, score: sectionScore(n), enough: n.seen >= MIN_SEEN };
      })
      .filter((row) => row.label !== null);
    res.json({ days, minSeen: MIN_SEEN, sections: rows, current, suggested: suggestOrder(current, totals) });
  }),
);

const KeepBody = z.object({ winner: z.enum(["A", "B"]) }).strict();

/** Keeps one side for everyone: the test stops and its value becomes the shop's setting. */
r.post(
  "/:id/keep",
  asyncHandler(async (req: any, res) => {
    const { winner } = KeepBody.parse(req.body ?? {});
    const e = await load(String(req.params.id));
    if (e.status === "draft") throw new AppError(409, "EXPERIMENT_NOT_STARTED");
    const value = winner === "B" ? e.b : e.a;
    const kind = e.kind as ExperimentKind;
    if (kind === "homeOrder") {
      // B kept: the published home takes the order (its sections in the places they held together).
      if (winner === "B") {
        if (!hasPermission(req, "pages:write")) throw new AppError(403, "PERMISSION_DENIED", "Changing the home page needs pages:write", { required: ["pages:write"] });
        const home = await prisma.page.findUnique({ where: { slug: "/" }, select: { id: true, sections: { orderBy: { order: "asc" }, select: { id: true, order: true } } } });
        const ids = (value as string[]).map((k) => k.slice(2));
        const listed = home?.sections.filter((s) => ids.includes(s.id)) ?? [];
        if (home && listed.length > 1) {
          await capturePageRevision(home.id, `تجربة A/B: «${e.name}»`, req.user);
          const places = listed.map((s) => s.order).sort((x, y) => x - y);
          const inOrder = ids.filter((id) => listed.some((s) => s.id === id));
          await prisma.$transaction(inOrder.map((id, i) => prisma.pageSection.update({ where: { id }, data: { order: places[i] } })));
          triggerCmsRevalidate(["/"]);
        }
      }
    } else if (kind === "motion") {
      if (!hasPermission(req, "system:write")) throw new AppError(403, "PERMISSION_DENIED", "Keeping a motion setting needs system:write", { required: ["system:write"] });
      const { storefront } = await readPerformance();
      await savePerformance(req, { storefront: { ...storefront, [e.field as string]: value } });
    } else {
      if (!hasPermission(req, "pages:write")) throw new AppError(403, "PERMISSION_DENIED", "Changing the home page needs pages:write", { required: ["pages:write"] });
      const home = await prisma.page.findUnique({ where: { slug: "/" }, select: { id: true, sections: { where: { type: "HERO" }, select: { id: true, data: true } } } });
      if (home?.sections.length) {
        await capturePageRevision(home.id, `تجربة A/B: «${e.name}»`, req.user);
        for (const s of home.sections) {
          const data = s.data && typeof s.data === "object" ? (s.data as Record<string, unknown>) : {};
          await prisma.pageSection.update({ where: { id: s.id }, data: { data: { ...data, roseHeroFilm: value === "film" } } });
        }
        triggerCmsRevalidate(["/"]);
      }
    }
    if (e.status === "running") await flushAb().catch(() => undefined);
    const out = await prisma.experiment.update({ where: { id: e.id }, data: { status: "stopped", stoppedAt: e.stoppedAt ?? new Date(), winner } });
    await testsChanged();
    res.json({ experiment: out });
  }),
);

r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const e = await load(String(req.params.id));
    if (e.status === "running") throw new AppError(409, "EXPERIMENT_RUNNING", "Stop it first");
    await prisma.experiment.delete({ where: { id: e.id } });
    res.json({ ok: true });
  }),
);

export default r;
