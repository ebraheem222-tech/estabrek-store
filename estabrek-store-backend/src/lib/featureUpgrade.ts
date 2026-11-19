/**
 * Upgrading a feature made from a template (stage 4, T): a newer file of the same template comes in,
 * and the owner's own changes stay theirs.
 *
 * Three versions meet: the file it was installed from (`Installed.file`, the base), the file coming in,
 * and what is in the store now. For each piece (a table's name and access, each of its fields, a
 * function's steps and tests, what starts it, a page):
 *
 *   the template didn't change it              nothing happens
 *   the template changed it, the owner didn't   it takes the new version ("update")
 *   both changed it                             the owner's stays ("conflict"), unless they ask for the
 *                                               template's ("taken")
 *   new in the template                         it is made ("add")
 *   gone from the template                      it stays as it is ("dropped")
 *   the owner removed it here                   it isn't brought back ("gone")
 *   a field change that would set values aside  it isn't made ("waits"): that is the owner's call, on
 *                                               the table's page, where they see which values
 *
 * "The owner didn't change it" is read from the fingerprints install wrote (lib/featurePrints.ts). A
 * feature installed before they were kept has none: everything counts as the owner's, and only what
 * is new is made unless they ask. Functions take the new steps as their draft (what is published stays
 * until the owner publishes); a published page takes them as its unpublished changes.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { AppError } from "../utils/httpError.js";
import { compareVersions, nameIn, newId, planInstall, readTemplate, type Keep, type Plan, type Problem, type Template } from "./featureTemplate.js";
import { installedOf, makeFn, makePage, makeTables, makeTriggers, takenHere, type Installed } from "./featureInstall.js";
import { fnPrints, pagePrint, print, stable, tablePrints, triggersPrint, type Prints } from "./featurePrints.js";
import { applySchemaChange, needsAccept, previewSchemaChange, type Impact } from "./schemaChange.js";
import { settleComputed } from "./computed.js";
import { storedTree } from "./pageTree.js";
import { draftFromPage, storedDraft } from "./pageDraft.js";
import { forgetFeatureGate, type FeatureKind } from "./featureGate.js";
import { forgetTriggers } from "./fnTriggers.js";
import { triggerCmsRevalidate } from "./cmsRevalidate.js";
import type { Field } from "./collectionTree.js";

type Lang = "ar" | "en" | "he";
export const UPGRADE_ACTIONS = ["add", "update", "conflict", "taken", "dropped", "gone", "waits"] as const;
export type UpgradeAction = (typeof UPGRADE_ACTIONS)[number];
/** One piece of the upgrade. `id` names it when the owner asks for the template's version ("function:send", "field:tickets.status"). */
export type UpgradeItem = { id: string; kind: "table" | "field" | "function" | "triggers" | "page"; key: string; field?: string; name: string; action: UpgradeAction };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const fieldsOf = (v: unknown) => (Array.isArray(v) ? v : []).filter(isObj) as Array<Record<string, unknown> & { id: string }>;
const DOING: ReadonlySet<UpgradeAction> = new Set(["add", "update", "taken"]);

/** The feature, the file it came from, and its things as they are now (the ones still in it). */
async function stateOf(featureId: string) {
  const feature = await prisma.feature.findUnique({ where: { id: featureId }, include: { items: true } });
  if (!feature) throw new AppError(404, "FEATURE_NOT_FOUND", "No such feature");
  const installed = installedOf(feature.template);
  if (!installed) throw new AppError(409, "NOT_FROM_TEMPLATE", "This feature wasn't installed from a template");
  const inFeature = new Set(feature.items.map((i) => `${i.kind}:${i.refId}`));
  const idsOf = (kind: FeatureKind) => Object.values(installed.ids[kind] ?? {}).filter((id) => inFeature.has(`${kind}:${id}`));
  const [tables, fns, pages] = await Promise.all([
    prisma.collection.findMany({ where: { id: { in: idsOf("table") } } }),
    prisma.fn.findMany({ where: { id: { in: idsOf("function") } }, include: { triggers: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } } }),
    prisma.page.findMany({ where: { id: { in: idsOf("page") } }, include: { sections: { orderBy: { order: "asc" }, include: { translations: { select: { locale: true, data: true } } } } } }),
  ]);
  return { feature, installed, tables: new Map(tables.map((t) => [t.id, t])), fns: new Map(fns.map((f) => [f.id, f])), pages: new Map(pages.map((p) => [p.id, p])) };
}
type State = Awaited<ReturnType<typeof stateOf>>;
const pageTreeNow = (p: { draft: unknown; tree: unknown }) => storedDraft(p.draft)?.tree ?? storedTree(p.tree);

type Planned = {
  template: Template;
  installed: Installed;
  plan: Plan;
  keep: Keep;
  items: UpgradeItem[];
  problems: Problem[];
  /** Each table that changes: its fields as they will be, and what that does to its rows. */
  fields: Map<string, { before: Field[]; after: Field[]; impacts: Impact[] }>;
  state: State;
};

/** What upgrading to the file would do, piece by piece; nothing is written. `take`: the pieces the owner gives to the template. */
async function planUpgrade(featureId: string, raw: unknown, take: ReadonlySet<string>, lang: Lang): Promise<{ ok: false; problems: Problem[] } | ({ ok: true } & Planned)> {
  const state = await stateOf(featureId);
  const { installed } = state;
  const read = readTemplate(raw);
  if (!read.ok) return { ok: false, problems: read.problems };
  const t = read.template;
  if (t.key !== installed.key) throw new AppError(400, "TEMPLATE_OTHER", `This file is another template ("${t.key}"), not "${installed.key}"`);
  if (compareVersions(t.version, installed.version) <= 0) throw new AppError(409, "NOT_NEWER", `This feature is at ${installed.version} already; the file is ${t.version}`, { version: installed.version });
  const base = installed.file;
  const prints: Prints | null = installed.prints ?? null;

  // What is here already keeps its ids and addresses; the store's other addresses stay taken.
  const keep: Keep = { tables: {}, functions: {}, pages: {}, calls: installed.calls ?? {} };
  const taken = await takenHere();
  for (const [key, id] of Object.entries(installed.ids.table ?? {})) {
    const row = state.tables.get(id);
    if (!row) continue;
    keep.tables[key] = { id, slug: row.slug };
    taken.tables.delete(row.slug);
  }
  for (const [key, id] of Object.entries(installed.ids.function ?? {})) {
    const row = state.fns.get(id);
    if (!row) continue;
    keep.functions[key] = id;
    for (const tr of row.triggers) if (tr.slug) (tr.kind === "call" ? taken.calls : taken.routes).delete(tr.slug);
  }
  for (const [key, id] of Object.entries(installed.ids.page ?? {})) {
    const row = state.pages.get(id);
    if (!row) continue;
    keep.pages[key] = { id, slug: row.slug };
    taken.pages.delete(row.slug);
  }
  const { plan, problems } = planInstall(t, taken, newId, keep);

  const items: UpgradeItem[] = [];
  const decide = (id: string, mine: boolean): UpgradeAction => (mine ? (take.has(id) ? "taken" : "conflict") : "update");
  const fields = new Map<string, { before: Field[]; after: Field[]; impacts: Impact[] }>();

  /* Tables: their name and access, then field by field. */
  for (const x of t.tables) {
    const b = base.tables.find((y) => y.key === x.key);
    const name = nameIn(x.name, lang) || x.slug;
    if (!b) {
      items.push({ id: `table:${x.key}`, kind: "table", key: x.key, name, action: "add" });
      continue;
    }
    const row = keep.tables[x.key] ? state.tables.get(keep.tables[x.key].id) : null;
    if (!row) {
      if (stable(b) !== stable(x)) items.push({ id: `table:${x.key}`, kind: "table", key: x.key, name, action: "gone" });
      continue;
    }
    const p = prints?.table[x.key];
    if (stable({ name: b.name, api: b.api ?? null }) !== stable({ name: x.name, api: x.api ?? null })) {
      const mine = !p || print(row.name) !== p.name || print(row.api ?? null) !== p.api;
      items.push({ id: `table:${x.key}`, kind: "table", key: x.key, name, action: decide(`table:${x.key}`, mine) });
    }
    const now = fieldsOf(row.fields);
    const planned = fieldsOf(plan.tables.find((y) => y.key === x.key)?.fields);
    const changes: UpgradeItem[] = [];
    for (const f of fieldsOf(x.fields)) {
      const id = `field:${x.key}.${f.id}`;
      const fname = `${name} · ${nameIn((isObj(f.name) ? f.name : {}) as never, lang) || f.id}`;
      const bf = fieldsOf(b.fields).find((y) => y.id === f.id);
      const cf = now.find((y) => y.id === f.id);
      if (!bf) {
        changes.push({ id, kind: "field", key: x.key, field: f.id, name: fname, action: cf ? decide(id, true) : "add" });
        continue;
      }
      if (stable(bf) === stable(f)) continue;
      if (!cf) {
        changes.push({ id, kind: "field", key: x.key, field: f.id, name: fname, action: "gone" });
        continue;
      }
      changes.push({ id, kind: "field", key: x.key, field: f.id, name: fname, action: decide(id, !p || print(cf) !== p.fields[f.id]) });
    }
    for (const bf of fieldsOf(b.fields)) if (!fieldsOf(x.fields).some((f) => f.id === bf.id) && now.some((f) => f.id === bf.id)) changes.push({ id: `field:${x.key}.${bf.id}`, kind: "field", key: x.key, field: bf.id, name: `${name} · ${bf.id}`, action: "dropped" });
    // The fields as they will be: the owner's order, the template's new ones at the end. A change that
    // would set values aside waits for the owner (they make it from the table's page, seeing which values).
    const build = (list: UpgradeItem[]) => {
      const out = now.map((f) => {
        const c = list.find((i) => i.field === f.id && DOING.has(i.action));
        return c ? (planned.find((y) => y.id === f.id) ?? f) : f;
      });
      for (const c of list) if (c.action === "add") out.push(planned.find((y) => y.id === c.field)!);
      return out.filter(Boolean) as unknown as Field[];
    };
    for (const c of changes) {
      if (!DOING.has(c.action)) continue;
      const alone = await previewSchemaChange(prisma, row.id, now as unknown as Field[], build([c]), lang);
      if (needsAccept(alone)) c.action = "waits";
    }
    items.push(...changes);
    const after = build(changes);
    if (stable(after) !== stable(now)) fields.set(x.key, { before: now as unknown as Field[], after, impacts: await previewSchemaChange(prisma, row.id, now as unknown as Field[], after, lang) });
  }
  for (const b of base.tables) if (!t.tables.some((x) => x.key === b.key) && keep.tables[b.key]) items.push({ id: `table:${b.key}`, kind: "table", key: b.key, name: nameIn(b.name, lang) || b.slug, action: "dropped" });

  /* Functions: their steps and tests, and what starts them. */
  for (const x of t.functions) {
    const b = base.functions.find((y) => y.key === x.key);
    if (!b) {
      items.push({ id: `function:${x.key}`, kind: "function", key: x.key, name: x.name, action: "add" });
      continue;
    }
    const row = keep.functions[x.key] ? state.fns.get(keep.functions[x.key]) : null;
    if (!row) {
      if (stable(b) !== stable(x)) items.push({ id: `function:${x.key}`, kind: "function", key: x.key, name: x.name, action: "gone" });
      continue;
    }
    const p = prints?.function[x.key];
    if (stable({ def: b.def, tests: b.tests ?? [] }) !== stable({ def: x.def, tests: x.tests ?? [] })) {
      const mine = !p || print(row.draft) !== p.def || print(row.tests ?? []) !== p.tests;
      items.push({ id: `function:${x.key}`, kind: "function", key: x.key, name: row.name, action: decide(`function:${x.key}`, mine) });
    }
    if (stable(b.triggers ?? []) !== stable(x.triggers ?? [])) {
      const mine = !p || triggersPrint(row.triggers) !== p.triggers;
      items.push({ id: `triggers:${x.key}`, kind: "triggers", key: x.key, name: row.name, action: decide(`triggers:${x.key}`, mine) });
    }
  }
  for (const b of base.functions) if (!t.functions.some((x) => x.key === b.key) && keep.functions[b.key]) items.push({ id: `function:${b.key}`, kind: "function", key: b.key, name: state.fns.get(keep.functions[b.key])?.name ?? b.name, action: "dropped" });

  /* Pages. */
  for (const x of t.pages) {
    const b = base.pages.find((y) => y.key === x.key);
    if (!b) {
      items.push({ id: `page:${x.key}`, kind: "page", key: x.key, name: x.name, action: "add" });
      continue;
    }
    const row = keep.pages[x.key] ? state.pages.get(keep.pages[x.key].id) : null;
    if (!row) {
      if (stable(b) !== stable(x)) items.push({ id: `page:${x.key}`, kind: "page", key: x.key, name: x.name, action: "gone" });
      continue;
    }
    if (stable(b) !== stable(x)) {
      const p = prints?.page[x.key];
      items.push({ id: `page:${x.key}`, kind: "page", key: x.key, name: row.name, action: decide(`page:${x.key}`, !p || pagePrint(pageTreeNow(row)) !== p) });
    }
  }
  for (const b of base.pages) if (!t.pages.some((x) => x.key === b.key) && keep.pages[b.key]) items.push({ id: `page:${b.key}`, kind: "page", key: b.key, name: state.pages.get(keep.pages[b.key].id)?.name ?? b.name, action: "dropped" });

  return { ok: true, template: t, installed, plan, keep, items, problems, fields, state };
}

const countsOf = (items: UpgradeItem[]) => Object.fromEntries(UPGRADE_ACTIONS.map((a) => [a, items.filter((i) => i.action === a).length])) as Record<UpgradeAction, number>;

/** What upgrading to the file would do; nothing is written. */
export async function previewUpgrade(featureId: string, raw: unknown, take: string[] = [], lang: Lang = "ar") {
  const up = await planUpgrade(featureId, raw, new Set(take), lang);
  if (!up.ok) return { ok: false as const, problems: up.problems };
  return { ok: up.problems.length === 0, from: up.installed.version, to: up.template.version, key: up.template.key, name: up.template.name, items: up.items, counts: countsOf(up.items), problems: up.problems };
}

/** The upgrade made: everything at once. What the owner changed stays theirs unless named in `take`. */
export async function upgradeFeature(featureId: string, raw: unknown, opts: { take?: string[]; lang?: Lang; by?: string | null } = {}) {
  const lang = opts.lang ?? "ar";
  const up = await planUpgrade(featureId, raw, new Set(opts.take ?? []), lang);
  if (!up.ok || up.problems.length) throw new AppError(400, "TEMPLATE_INVALID", (up.ok ? up.problems : up.problems)[0]?.message ?? "This file can't be used", { problems: up.problems });
  const { plan, keep, items, installed, template, state } = up;
  const doing = (id: string) => items.some((i) => i.id === id && DOING.has(i.action));
  const prints: Prints = structuredClone(installed.prints ?? { table: {}, function: {}, page: {} });
  const ids = structuredClone(installed.ids);
  const added: Array<{ kind: FeatureKind; refId: string }> = [];
  const pagesTouched: string[] = [];

  await prisma.$transaction(
    async (tx) => {
      /* Tables. */
      const fresh = plan.tables.filter((x) => !keep.tables[x.key]);
      await makeTables(tx, fresh);
      for (const x of fresh) {
        ids.table[x.key] = x.id;
        prints.table[x.key] = tablePrints(x);
        added.push({ kind: "table", refId: x.id });
      }
      for (const x of plan.tables) {
        const kept = keep.tables[x.key];
        if (!kept) continue;
        const row = state.tables.get(kept.id)!;
        const p = (prints.table[x.key] ??= { name: "", api: "", fields: {} });
        if (doing(`table:${x.key}`)) {
          await tx.collection.update({ where: { id: kept.id }, data: { name: x.name as Prisma.InputJsonValue, api: (x.api ?? Prisma.JsonNull) as Prisma.InputJsonValue } });
          p.name = print(x.name);
          p.api = print(x.api ?? null);
        }
        const change = up.fields.get(x.key);
        if (change) {
          // Kept as a version of the table, as any change of its fields is (the tables page brings it back).
          await applySchemaChange(tx, kept.id, change.before, change.after, lang);
          await tx.studioRevision.create({ data: { kind: "table", objectId: kept.id, data: { slug: row.slug, name: row.name, fields: change.before } as unknown as Prisma.InputJsonValue, summary: change.impacts as unknown as Prisma.InputJsonValue, adminUserId: null } });
          // Its computed fields read what is there now, and are told what they give.
          const settled = await settleComputed(tx, change.after as unknown as Field[], kept.id);
          if ("problem" in settled) throw new AppError(400, "TEMPLATE_INVALID", settled.problem.message, { problems: [{ at: `tables.${x.key}.${settled.problem.path}`, message: settled.problem.message }] });
          await tx.collection.update({ where: { id: kept.id }, data: { fields: settled.fields as unknown as Prisma.InputJsonValue } });
          for (const f of change.after as unknown as Array<{ id: string }>) if (items.some((i) => i.id === `field:${x.key}.${f.id}` && DOING.has(i.action))) p.fields[f.id] = print(f);
        }
      }

      /* Functions. */
      for (const f of plan.fns) {
        const id = keep.functions[f.key];
        if (!id) {
          await makeFn(tx, f, opts.by ?? null);
          ids.function[f.key] = f.id;
          prints.function[f.key] = fnPrints({ def: f.def, tests: f.tests, triggers: f.triggers });
          added.push({ kind: "function", refId: f.id });
          continue;
        }
        const p = (prints.function[f.key] ??= { def: "", tests: "", triggers: "" });
        if (doing(`function:${f.key}`)) {
          // The new steps are its draft: what is published runs until the owner publishes them.
          await tx.fn.update({ where: { id }, data: { draft: f.def as unknown as Prisma.InputJsonValue, tests: f.tests as Prisma.InputJsonValue } });
          p.def = print(f.def);
          p.tests = print(f.tests);
        }
        if (doing(`triggers:${f.key}`)) {
          const was = state.fns.get(id)!.triggers;
          await tx.fnTrigger.deleteMany({ where: { fnId: id } });
          // A webhook keeps its address: the system that calls it isn't cut off.
          await makeTriggers(tx, id, f.triggers, was.filter((t) => t.kind === "webhook" && t.slug).map((t) => t.slug!));
          p.triggers = triggersPrint(f.triggers);
        }
      }

      /* Pages. */
      for (const pg of plan.pages) {
        const kept = keep.pages[pg.key];
        if (!kept) {
          await makePage(tx, pg);
          ids.page[pg.key] = pg.id;
          prints.page[pg.key] = pagePrint(pg.tree);
          added.push({ kind: "page", refId: pg.id });
          continue;
        }
        if (!doing(`page:${pg.key}`)) continue;
        const row = state.pages.get(kept.id)!;
        if (row.status === "DRAFT" && !row.draft) await tx.page.update({ where: { id: kept.id }, data: { tree: pg.tree as unknown as Prisma.InputJsonValue } });
        else {
          // A published page takes the new design as its unpublished changes.
          const draft = storedDraft(row.draft) ?? draftFromPage(row as never);
          await tx.page.update({ where: { id: kept.id }, data: { draft: { ...draft, tree: pg.tree, rev: draft.rev + 1, updatedAt: new Date().toISOString() } as unknown as Prisma.InputJsonValue } });
        }
        prints.page[pg.key] = pagePrint(pg.tree);
        pagesTouched.push(row.slug);
      }

      if (added.length) await tx.featureItem.createMany({ data: added.map((a) => ({ featureId, ...a })) });
      const next: Installed = { ...installed, version: template.version, from: installed.version, upgradedAt: new Date().toISOString(), file: template, ids, calls: { ...(installed.calls ?? {}), ...plan.calls }, prints };
      await tx.feature.update({ where: { id: featureId }, data: { template: next as unknown as Prisma.InputJsonValue } });
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
  forgetFeatureGate();
  forgetTriggers();
  void triggerCmsRevalidate(pagesTouched).catch(() => {});
  return { from: installed.version, to: template.version, items, counts: countsOf(items) };
}
