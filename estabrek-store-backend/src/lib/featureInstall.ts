/**
 * Feature templates in the database (stage 4, T; the file itself is lib/featureTemplate.ts):
 *
 *   export   a feature as a template file, with what couldn't go into it
 *   preview  what installing a file would make here, and what stands in the way; nothing is written
 *   install  as a draft: every table, function (unpublished, so nothing starts it), trigger and page
 *            (a draft, not on the shop) made in one go, under a new feature that is switched off
 *   remove   a feature and everything it holds, its tables' rows kept or deleted, as the owner says
 *
 * A feature made by installing keeps the file it came from and which of its things is which
 * (`Feature.template`), so an upgrade can tell the owner's own changes from the template's.
 */
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";
import { AppError } from "../utils/httpError.js";
import { TEMPLATE_KIND } from "./collections.js";
import { accessOf } from "./dataApi.js";
import { connectionNames } from "./fnHttp.js";
import { siteAllowed } from "./fnSites.js";
import { sizeOf } from "./fnDef.js";
import { newToken, nextRun, forgetTriggers, type ScheduleConfig } from "./fnTriggers.js";
import { forgetFeatureGate, type FeatureKind } from "./featureGate.js";
import { relationProblem } from "./links.js";
import { settleComputed } from "./computed.js";
import { PAGE_FORMAT, storedTree } from "./pageTree.js";
import { storedDraft } from "./pageDraft.js";
import { triggerCmsRevalidate } from "./cmsRevalidate.js";
import type { Field } from "./collectionTree.js";
import { keyFrom, nameIn, planInstall, readTemplate, toTemplate, type Local, type Note, type Plan, type Template } from "./featureTemplate.js";
import { fnPrints, pagePrint, tablePrints, type Prints } from "./featurePrints.js";

type Lang = "ar" | "en" | "he";
type Ids = Record<FeatureKind, Record<string, string>>;
/** What a feature made by installing keeps: the file, and which of its things is which here. */
export type Installed = {
  key: string;
  version: string;
  name: Local;
  installedAt: string;
  /** Upgraded since: when, and from which version. */
  upgradedAt?: string;
  from?: string;
  file: Template;
  ids: Ids;
  /** Each call address the file wrote, and the one it was given here. */
  calls?: Record<string, string>;
  /** Fingerprints of what the template wrote (lib/featurePrints.ts): a thing that still has its own is untouched by the owner. Missing (installed before they were kept): everything counts as the owner's. */
  prints?: Prints;
};

/** A feature's template, when it was made by installing one (anything else: none). */
export function installedOf(raw: unknown): Installed | null {
  const t = raw as Installed | null;
  if (!t || typeof t !== "object" || typeof t.key !== "string" || typeof t.version !== "string" || !t.ids || !t.file) return null;
  return t;
}
/** What the feature's page says about where it came from. */
export const installedView = (raw: unknown) => {
  const t = installedOf(raw);
  return t ? { key: t.key, version: t.version, name: t.name, installedAt: t.installedAt, ...(t.upgradedAt ? { upgradedAt: t.upgradedAt, from: t.from ?? null } : {}) } : null;
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/* ---------------- Export ---------------- */

/** The next minor version: what an export of an installed feature offers (1.0.0 → 1.1.0). */
export const nextMinor = (v: string) => {
  const [a, b] = v.split(".").map(Number);
  return `${a}.${(b ?? 0) + 1}.0`;
};

/** A feature as a template file. `key` and `version`: the owner's, else the ones it came with (the version a step up), else new ones. */
export async function exportFeature(featureId: string, opts: { key?: string; version?: string; lang?: Lang } = {}): Promise<{ template: Template; notes: Note[] }> {
  const feature = await prisma.feature.findUnique({ where: { id: featureId }, include: { items: { orderBy: { createdAt: "asc" } } } });
  if (!feature) throw new AppError(404, "FEATURE_NOT_FOUND", "No such feature");
  const ids = (kind: FeatureKind) => feature.items.filter((i) => i.kind === kind).map((i) => i.refId);
  const order = (kind: FeatureKind) => new Map(ids(kind).map((id, k) => [id, k]));
  const sorted = <T extends { id: string }>(list: T[], kind: FeatureKind) => {
    const at = order(kind);
    return [...list].sort((a, b) => (at.get(a.id) ?? 0) - (at.get(b.id) ?? 0));
  };
  const [tables, fns, pages] = await Promise.all([
    prisma.collection.findMany({ where: { id: { in: ids("table") } }, select: { id: true, slug: true, name: true, fields: true, api: true, templateId: true } }),
    prisma.fn.findMany({ where: { id: { in: ids("function") } }, include: { triggers: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } } }),
    prisma.page.findMany({ where: { id: { in: ids("page") }, kind: "page" }, select: { id: true, name: true, slug: true, format: true, tree: true, draft: true, seoTitle: true, seoDescription: true } }),
  ]);
  const itemPages = new Map((await prisma.page.findMany({ where: { id: { in: tables.map((t) => t.templateId).filter((x): x is string => !!x) }, kind: TEMPLATE_KIND }, select: { id: true, tree: true, draft: true } })).map((p) => [p.id, storedDraft(p.draft)?.tree ?? storedTree(p.tree)]));
  // A page shown from its tree (the new editor), as the editor has it now (its draft when it has one).
  const treeOf = (p: (typeof pages)[number]) => storedDraft(p.draft)?.tree ?? (p.format === PAGE_FORMAT.tree ? storedTree(p.tree) : null);

  const came = installedOf(feature.template);
  const keys = new Map<string, string>();
  if (came) for (const kind of ["table", "function", "page"] as const) for (const [key, id] of Object.entries(came.ids[kind] ?? {})) keys.set(`${kind}:${id}`, key);
  const lang = opts.lang ?? "ar";
  const name: Local = came && nameIn(came.name, lang) === feature.name ? came.name : { [lang]: feature.name };
  return toTemplate({
    key: opts.key ?? came?.key ?? keyFrom(feature.name, feature.id),
    version: opts.version ?? (came ? nextMinor(came.version) : "1.0.0"),
    name,
    note: feature.note ? { [lang]: feature.note } : came?.file.note,
    tables: sorted(tables, "table").map((t) => ({ ...t, itemPage: t.templateId ? (itemPages.get(t.templateId) ?? null) : null })),
    fns: sorted(fns, "function").map((f) => ({ id: f.id, name: f.name, note: f.note, draft: f.draft, tests: f.tests, triggers: f.triggers.map((t) => ({ kind: t.kind, config: t.config, slug: t.slug, enabled: t.enabled })) })),
    pages: sorted(pages, "page").map((p) => ({ id: p.id, name: p.name, slug: p.slug, tree: treeOf(p), seoTitle: p.seoTitle, seoDescription: p.seoDescription })),
    keyOf: (kind, id) => keys.get(`${kind}:${id}`) ?? id,
  });
}

/* ---------------- Preview and install ---------------- */

export async function takenHere() {
  const [tables, pages, triggers] = await Promise.all([
    prisma.collection.findMany({ select: { slug: true } }),
    prisma.page.findMany({ select: { slug: true } }),
    prisma.fnTrigger.findMany({ where: { kind: { in: ["call", "route"] }, slug: { not: null } }, select: { kind: true, slug: true } }),
  ]);
  return {
    tables: new Set(tables.map((t) => t.slug)),
    pages: new Set(pages.map((p) => p.slug)),
    calls: new Set(triggers.filter((t) => t.kind === "call").map((t) => t.slug!)),
    routes: new Set(triggers.filter((t) => t.kind === "route").map((t) => t.slug!)),
  };
}

/** A file read and made ready for this store: the template, the plan, and what stands in the way. */
async function planned(raw: unknown) {
  const read = readTemplate(raw);
  if (!read.ok) return { template: null, plan: null, problems: read.problems };
  const { plan, problems } = planInstall(read.template, await takenHere());
  return { template: read.template, plan, problems };
}

/** What installing the file would make here, and what it needs; nothing is written. */
export async function previewInstall(raw: unknown) {
  const { template, plan, problems } = await planned(raw);
  if (!template || !plan) return { ok: false as const, problems };
  const [outside, same] = await Promise.all([connectionNames(), prisma.feature.findMany({ where: { template: { path: ["key"], equals: template.key } }, select: { id: true, name: true, template: true } })]);
  const kept = new Set(outside.secrets.map((s) => s.name));
  return {
    ok: problems.length === 0,
    template: { key: template.key, version: template.version, name: template.name, note: template.note ?? null },
    tables: plan.tables.map((t) => ({ key: t.key, name: t.name, slug: t.slug, was: t.was ?? null, fields: t.fields.length, api: accessOf(t.api), itemPage: !!t.itemPage, rows: t.rows.length })),
    functions: plan.fns.map((f) => ({ key: f.key, name: f.name, steps: sizeOf(f.def.do).steps + sizeOf(f.def.else).steps, triggers: f.triggers.map((t) => ({ kind: t.kind, slug: t.kind === "call" || t.kind === "route" ? t.slug : null, was: t.was ?? null })) })),
    pages: plan.pages.map((p) => ({ key: p.key, name: p.name, slug: p.slug, was: p.was ?? null })),
    // What the other store keeps for itself: which of them are here already.
    needs: {
      secrets: (template.needs?.secrets ?? []).map((name) => ({ name, kept: kept.has(name) })),
      sites: (template.needs?.sites ?? []).map((host) => ({ host, allowed: siteAllowed(host, outside.sites) })),
    },
    // The same template installed before: installing again makes a second copy, under new addresses.
    installed: same.map((f) => ({ id: f.id, name: f.name, version: installedOf(f.template)?.version ?? null })),
    problems,
  };
}

const taken = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

type Tx = Prisma.TransactionClient;

/** A template's tables made here (with their relations checked once all are there, and their rows' own page). */
export async function makeTables(tx: Tx, tables: Plan["tables"]) {
  const now = new Date();
  for (const t of tables) {
    await tx.collection.create({ data: { id: t.id, slug: t.slug, name: t.name as Prisma.InputJsonValue, fields: t.fields as Prisma.InputJsonValue, ...(t.api ? { api: t.api as Prisma.InputJsonValue } : {}) } });
    // Its ready rows, in the file's order (a list in "my order" shows them so).
    if (t.rows.length) await tx.collectionItem.createMany({ data: t.rows.map((r, k) => ({ collectionId: t.id, slug: r.slug, data: r.data as Prisma.InputJsonValue, status: r.status, sort: k, publishedAt: r.status === "PUBLISHED" ? now : null })) });
  }
  // Each relation links a table that is there now (the template's own, made just above, or the store's).
  for (const t of tables) {
    const unlinked = await relationProblem(tx, t.fields as Field[], t.id);
    if (unlinked) throw new AppError(400, "TEMPLATE_INVALID", unlinked.message, { problems: [{ at: `tables.${t.key}.${unlinked.path}`, message: unlinked.message }] });
    // Its computed fields read the template's own tables (all made now), and are told what they give.
    const settled = await settleComputed(tx, t.fields as Field[], t.id);
    if ("problem" in settled) throw new AppError(400, "TEMPLATE_INVALID", settled.problem.message, { problems: [{ at: `tables.${t.key}.${settled.problem.path}`, message: settled.problem.message }] });
    if (settled.fields !== (t.fields as Field[])) await tx.collection.update({ where: { id: t.id }, data: { fields: settled.fields as unknown as Prisma.InputJsonValue } });
    if (!t.itemPage) continue;
    const page = await tx.page.create({ data: { name: `${nameIn(t.name, "en") || t.slug} — item page`, slug: `/__collection/${randomBytes(6).toString("hex")}`, status: "PUBLISHED", kind: TEMPLATE_KIND, format: PAGE_FORMAT.tree, tree: t.itemPage as unknown as Prisma.InputJsonValue }, select: { id: true } });
    await tx.collection.update({ where: { id: t.id }, data: { templateId: page.id } });
  }
}
/**
 * What starts a function, made here. `tokens`: webhook addresses it had (an upgrade keeps them, in
 * order, so a system that calls one isn't cut off).
 */
export async function makeTriggers(tx: Tx, fnId: string, triggers: Plan["fns"][number]["triggers"], tokens: string[] = []) {
  const left = [...tokens];
  for (const t of triggers) {
    await tx.fnTrigger.create({
      data: { fnId, kind: t.kind, config: t.config as Prisma.InputJsonValue, enabled: t.enabled, slug: t.kind === "webhook" ? (left.shift() ?? newToken()) : t.slug, nextAt: t.kind === "schedule" ? nextRun(t.config as ScheduleConfig, new Date()) : null },
    });
  }
}
/** A template's function made here, as a draft: nothing starts a function that isn't published. */
export async function makeFn(tx: Tx, f: Plan["fns"][number], by: string | null) {
  await tx.fn.create({ data: { id: f.id, name: f.name, note: f.note, draft: f.def as unknown as Prisma.InputJsonValue, tests: f.tests as Prisma.InputJsonValue, createdById: by } });
  await makeTriggers(tx, f.id, f.triggers);
}
/** A template's page made here, as a draft page: not on the shop until it is published from the editor. */
export async function makePage(tx: Tx, p: Plan["pages"][number]) {
  await tx.page.create({ data: { id: p.id, name: p.name, slug: p.slug, status: "DRAFT", kind: "page", format: PAGE_FORMAT.tree, tree: p.tree as unknown as Prisma.InputJsonValue, seoTitle: p.seoTitle, seoDescription: p.seoDescription } });
}
/** The fingerprints of what the plan writes (lib/featurePrints.ts). */
export const printsOf = (plan: Pick<Plan, "tables" | "fns" | "pages">): Prints => ({
  table: Object.fromEntries(plan.tables.map((t) => [t.key, tablePrints(t)])),
  function: Object.fromEntries(plan.fns.map((f) => [f.key, fnPrints({ def: f.def, tests: f.tests, triggers: f.triggers })])),
  page: Object.fromEntries(plan.pages.map((p) => [p.key, pagePrint(p.tree)])),
});

/** Writes the plan: every thing at once, under a new feature that is switched off. */
async function write(plan: Plan, template: Template, opts: { lang: Lang; by: string | null }) {
  const name = (nameIn(template.name, opts.lang) || template.key).slice(0, 80);
  const note = template.note ? nameIn(template.note, opts.lang).slice(0, 300) || null : null;
  const ids: Ids = { table: Object.fromEntries(plan.tables.map((t) => [t.key, t.id])), function: Object.fromEntries(plan.fns.map((f) => [f.key, f.id])), page: Object.fromEntries(plan.pages.map((p) => [p.key, p.id])) };
  return prisma.$transaction(
    async (tx) => {
      await makeTables(tx, plan.tables);
      for (const f of plan.fns) await makeFn(tx, f, opts.by);
      for (const p of plan.pages) await makePage(tx, p);
      const installed: Installed = { key: template.key, version: template.version, name: template.name, installedAt: new Date().toISOString(), file: template, ids, calls: plan.calls, prints: printsOf(plan) };
      const feature = await tx.feature.create({ data: { name, note, enabled: false, template: installed as unknown as Prisma.InputJsonValue } });
      const items = [...plan.tables.map((t) => ({ kind: "table", refId: t.id })), ...plan.fns.map((f) => ({ kind: "function", refId: f.id })), ...plan.pages.map((p) => ({ kind: "page", refId: p.id }))];
      if (items.length) await tx.featureItem.createMany({ data: items.map((i) => ({ featureId: feature.id, ...i })) });
      return feature;
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
}

/** Installs a template file as a draft: its new feature (switched off), or 400 with what stands in the way. */
export async function installTemplate(raw: unknown, opts: { lang: Lang; by: string | null }) {
  const { template, plan, problems } = await planned(raw);
  if (!template || !plan || problems.length) throw new AppError(400, "TEMPLATE_INVALID", problems[0]?.message ?? "This template can't be installed", { problems });
  try {
    const feature = await write(plan, template, opts);
    forgetFeatureGate();
    forgetTriggers();
    void triggerCmsRevalidate([]).catch(() => {});
    return feature;
  } catch (e) {
    // Another member took one of the addresses in the meantime: asked again, it is given another.
    if (taken(e)) throw new AppError(409, "TEMPLATE_TAKEN", "An address was taken in the meantime: try again");
    throw e;
  }
}

/* ---------------- Removing a feature with what it holds ---------------- */

const named = (n: unknown, lang: Lang, fallback: string) => (isObj(n) ? nameIn(n as Local, lang) : "") || fallback;
const holds = (value: unknown, needles: string[]) => {
  const text = JSON.stringify(value ?? null);
  return needles.some((n) => text.includes(n));
};

/** What removing the feature would take away, what stops it, and what outside it uses its things. */
export async function removalOf(featureId: string, lang: Lang = "ar") {
  const feature = await prisma.feature.findUnique({ where: { id: featureId }, include: { items: { orderBy: { createdAt: "asc" } } } });
  if (!feature) throw new AppError(404, "FEATURE_NOT_FOUND", "No such feature");
  const ids = (kind: FeatureKind) => feature.items.filter((i) => i.kind === kind).map((i) => i.refId);
  // In the order they joined the feature.
  const inOrder = <T extends { id: string }>(list: T[], kind: FeatureKind) => {
    const at = new Map(ids(kind).map((id, k) => [id, k]));
    return [...list].sort((a, b) => (at.get(a.id) ?? 0) - (at.get(b.id) ?? 0));
  };
  const [tablesFound, fnsFound, pagesFound, otherTables, otherFns, otherPages] = await Promise.all([
    prisma.collection.findMany({ where: { id: { in: ids("table") } }, select: { id: true, slug: true, name: true, _count: { select: { items: true } } } }),
    prisma.fn.findMany({ where: { id: { in: ids("function") } }, select: { id: true, name: true, runs: true, triggers: { where: { kind: "call" }, select: { slug: true } } } }),
    prisma.page.findMany({ where: { id: { in: ids("page") } }, select: { id: true, name: true, slug: true, status: true } }),
    prisma.collection.findMany({ where: { id: { notIn: ids("table") } }, select: { id: true, name: true, slug: true, fields: true } }),
    prisma.fn.findMany({ where: { id: { notIn: ids("function") } }, select: { id: true, name: true, draft: true, live: true, triggers: { where: { kind: "row" }, select: { config: true } } } }),
    prisma.page.findMany({ where: { id: { notIn: ids("page") }, kind: { in: ["page", "block", TEMPLATE_KIND] } }, select: { id: true, name: true, tree: true, draft: true } }),
  ]);
  const [tables, fns, pages] = [inOrder(tablesFound, "table"), inOrder(fnsFound, "function"), inOrder(pagesFound, "page")];
  const tableIds = tables.map((t) => t.id);
  const tableName = new Map(tables.map((t) => [t.id, named(t.name, lang, t.slug)]));
  // Another table linking one of these: its rows can't go while it does.
  const linked = otherTables.flatMap((c) => (Array.isArray(c.fields) ? (c.fields as Field[]) : []).filter((f) => f.type === "relation" && tableIds.includes(String(f.to))).map((f) => ({ table: tableName.get(String(f.to)) ?? "", by: named(c.name, lang, c.slug), field: f.id })));
  // Another function calling one of these would break.
  const called = otherFns.flatMap((o) => fns.filter((f) => holds([o.draft, o.live], [`"fn":"${f.id}"`])).map((f) => ({ fn: f.name, by: o.name })));
  // What outside goes on naming them (it says so where it is, after).
  const usesTables = otherFns.filter((o) => holds([o.draft, o.live, o.triggers.map((t) => t.config)], tableIds.map((id) => `"table":"${id}"`))).map((o) => o.name);
  const words = [...tableIds.map((id) => `"collectionId":"${id}"`), ...tables.map((t) => `"table":"${t.slug}"`), ...fns.flatMap((f) => f.triggers.map((t) => `"fn":"${t.slug}"`))];
  const usesPages = otherPages.filter((p) => holds([p.tree, p.draft], words)).map((p) => p.name);
  return {
    tables: tables.map((t) => ({ id: t.id, name: named(t.name, lang, t.slug), slug: t.slug, rows: t._count.items })),
    functions: fns.map((f) => ({ id: f.id, name: f.name, runs: f.runs })),
    pages: pages.map((p) => ({ id: p.id, name: p.name, slug: p.slug, status: p.status })),
    blockers: { linked, called },
    uses: { functions: [...new Set(usesTables)], pages: [...new Set(usesPages)] },
  };
}

export const REMOVE_ROWS = ["keep", "delete"] as const;
export type RemoveRows = (typeof REMOVE_ROWS)[number];

/**
 * The feature and everything it holds: its functions (with what starts them and their versions), its
 * pages, and its tables, with their rows (`rows: "delete"`) or left where they are with their rows,
 * in no feature (`"keep"`). Refused while something outside would break.
 */
export async function removeFeature(featureId: string, rows: RemoveRows, lang: Lang = "ar") {
  const what = await removalOf(featureId, lang);
  if (what.blockers.called.length) throw new AppError(409, "FN_USED", "A function outside the feature calls one of its functions", { called: what.blockers.called });
  if (rows === "delete" && what.blockers.linked.length) throw new AppError(409, "TABLE_LINKED", "A table outside the feature links one of its tables", { linked: what.blockers.linked });
  const tableIds = rows === "delete" ? what.tables.map((t) => t.id) : [];
  const fnIds = what.functions.map((f) => f.id);
  const pageIds = what.pages.map((p) => p.id);
  const removedRows = rows === "delete" ? what.tables.reduce((n, t) => n + t.rows, 0) : 0;
  await prisma.$transaction(
    async (tx) => {
      const triggers = await tx.fnTrigger.findMany({ where: { fnId: { in: fnIds } }, select: { id: true } });
      if (triggers.length) await tx.fnCallKey.deleteMany({ where: { triggerId: { in: triggers.map((t) => t.id) } } });
      if (fnIds.length) await tx.fn.deleteMany({ where: { id: { in: fnIds } } });
      if (pageIds.length) await tx.page.deleteMany({ where: { id: { in: pageIds } } });
      if (tableIds.length) {
        const itemPages = (await tx.collection.findMany({ where: { id: { in: tableIds } }, select: { templateId: true } })).map((c) => c.templateId).filter((x): x is string => !!x);
        await tx.studioRevision.deleteMany({ where: { kind: "table", objectId: { in: tableIds } } });
        await tx.collection.deleteMany({ where: { id: { in: tableIds } } });
        if (itemPages.length) await tx.page.deleteMany({ where: { id: { in: itemPages }, kind: TEMPLATE_KIND } });
        // An outgoing webhook sent these tables' rows: it stops naming them.
        const hooks = await tx.webhookEndpoint.findMany({ where: { tables: { hasSome: tableIds } }, select: { id: true, tables: true } });
        for (const h of hooks) await tx.webhookEndpoint.update({ where: { id: h.id }, data: { tables: h.tables.filter((t) => !tableIds.includes(t)) } });
      }
      await tx.feature.delete({ where: { id: featureId } });
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
  forgetFeatureGate();
  forgetTriggers();
  void triggerCmsRevalidate(what.pages.map((p) => p.slug)).catch(() => {});
  return { tables: tableIds.length, keptTables: rows === "keep" ? what.tables.length : 0, functions: fnIds.length, pages: pageIds.length, rows: removedRows };
}
