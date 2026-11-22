/**
 * The project as one file, in the database (stage 3, item 2; the file itself is lib/projectFile.ts):
 *
 *   write out  the store's whole project as a file
 *   preview    what bringing a file in would do, piece by piece, and what stands in the way; nothing is written
 *   bring in   the file made the project, in one go: what it has is made or made like it, what is only
 *              here stays unless the owner ticks it to go. The project as it was is kept first (a
 *              snapshot), so going back is one more bring-in, of that snapshot.
 *   snapshots  the project as it was, kept before each bring-in and when the owner saves one; the newest
 *              PROJECT_LIMITS.snapshots are kept
 *
 * A bring-in sets things as the file has them, published ones included: a function's published steps
 * become what runs (as a new version, so its versions page can go back too), a page's design is what the
 * shop shows (the page's own history keeps what it was). A table's fields change as they would from its
 * page: a change that would set values aside waits until the owner accepts it. Rows are never in a file,
 * and never touched, except a table the owner ticks to go (it goes with its rows).
 */
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";
import { SITE_ROW_ORDER } from "./siteRow.js";
import { AppError } from "../utils/httpError.js";
import { CollectionBody, TEMPLATE_KIND } from "./collections.js";
import type { Field } from "./collectionTree.js";
import { SettingsSchema } from "./dataApi.js";
import { FnDefSchema, type FnDef } from "./fnDef.js";
import { TestsSchema } from "./fnTests.js";
import { CALL_SLUG, configOf, forgetTriggers, newToken, nextRun, routePath, routeSlug, type RouteConfig, type ScheduleConfig, type TriggerKind } from "./fnTriggers.js";
import { VERSION_LIMITS } from "./fnVersions.js";
import { connectionNames } from "./fnHttp.js";
import { siteAllowed } from "./fnSites.js";
import { storeTarget } from "./storeLinks.js";
import { relationProblem } from "./links.js";
import { settleComputed } from "./computed.js";
import { applySchemaChange, needsAccept, previewSchemaChange, type Impact } from "./schemaChange.js";
import { PAGE_FORMAT, checkTree, storedTree, type PageTree } from "./pageTree.js";
import { draftFromPage, storedDraft } from "./pageDraft.js";
import { LocalSchema as RoleNameSchema } from "./shopperRoles.js";
import { forgetFeatureGate } from "./featureGate.js";
import { eachStep } from "./featureTemplate.js";
import { triggerCmsRevalidate } from "./cmsRevalidate.js";
import { stable } from "./featurePrints.js";
import { forgetShoppers } from "../middleware/apiCaller.js";
import { capturePageRevision } from "../modules/admin/pages.controller.js";
import { OWN_SHOP_PAGES, PROJECT_LIMITS, PROJECT_PAGE_KINDS, countsOf, diffProject, readProject, sizeOfProject, toProject, type DiffItem, type Here, type Problem, type Project } from "./projectFile.js";

type Lang = "ar" | "en" | "he";
type Tx = Prisma.TransactionClient;
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const TABLE_ACTS = new Set(["find", "get", "add", "change", "delete"]);
const asJson = (v: unknown) => v as Prisma.InputJsonValue;

/* ---------------- What the store holds ---------------- */

const byMade = [{ createdAt: "asc" as const }, { id: "asc" as const }];

/** The store's project as it is now, read for a file (lib/projectFile.ts toProject). */
export async function hereNow(): Promise<Here> {
  const [settings, tables, fns, pages, roles, groups, features, connections] = await Promise.all([
    prisma.siteSettings.findFirst({ orderBy: SITE_ROW_ORDER, select: { siteName: true } }),
    prisma.collection.findMany({ orderBy: byMade, select: { id: true, slug: true, name: true, fields: true, api: true, templateId: true } }),
    prisma.fn.findMany({ orderBy: byMade, include: { triggers: { orderBy: byMade } } }),
    prisma.page.findMany({ where: { kind: { in: [...PROJECT_PAGE_KINDS] }, format: PAGE_FORMAT.tree, slug: { notIn: [...OWN_SHOP_PAGES] } }, orderBy: byMade, select: { id: true, kind: true, name: true, slug: true, status: true, tree: true, draft: true, seoTitle: true, seoDescription: true, noIndex: true } }),
    prisma.shopperRole.findMany({ orderBy: [{ createdAt: "asc" }, { key: "asc" }] }),
    prisma.shopperGroup.findMany({ orderBy: byMade }),
    prisma.feature.findMany({ orderBy: byMade, include: { items: { orderBy: [{ createdAt: "asc" }, { refId: "asc" }] } } }),
    prisma.fnConnection.findMany({ select: { id: true, name: true, kind: true } }),
  ]);
  const itemPages = new Map(
    (await prisma.page.findMany({ where: { id: { in: tables.map((t) => t.templateId).filter((x): x is string => !!x) }, kind: TEMPLATE_KIND }, select: { id: true, tree: true } })).map((p) => [p.id, storedTree(p.tree)]),
  );
  return {
    name: settings?.siteName ?? undefined,
    tables: tables.map((t) => ({ id: t.id, slug: t.slug, name: t.name, fields: t.fields, api: t.api, itemPage: t.templateId ? (itemPages.get(t.templateId) ?? null) : null })),
    fns: fns.map((f) => ({ id: f.id, name: f.name, note: f.note, enabled: f.enabled, draft: f.draft, live: f.live, tests: f.tests, triggers: f.triggers.map((t) => ({ id: t.id, kind: t.kind, config: t.config, slug: t.slug, enabled: t.enabled })) })),
    // A page the new editor draws (one whose tree can't be read isn't one).
    pages: pages.flatMap((p) => {
      const tree = storedTree(p.tree);
      return tree ? [{ id: p.id, kind: p.kind, name: p.name, slug: p.slug, status: p.status, tree, draft: storedDraft(p.draft)?.tree ?? null, seoTitle: p.seoTitle, seoDescription: p.seoDescription, noIndex: p.noIndex }] : [];
    }),
    roles: roles.map((r) => ({ key: r.key, name: r.name, note: r.note })),
    groups: groups.map((g) => ({ id: g.id, name: g.name, note: g.note })),
    features: features.map((f) => ({ id: f.id, name: f.name, note: f.note, enabled: f.enabled, items: f.items.map((i) => ({ kind: i.kind, refId: i.refId })), template: f.template, ...(f.settings && typeof f.settings === "object" ? { settings: f.settings } : {}), ...(f.panelLayout && typeof f.panelLayout === "object" ? { panelLayout: f.panelLayout } : {}) })),
    connections,
  };
}

/** The store's whole project as a file. */
export async function exportProject(now = new Date()): Promise<Project> {
  return toProject(await hereNow(), now);
}

/* ---------------- Preview ---------------- */

type CheckedTable = { slug: string; name: Prisma.InputJsonValue; fields: Field[]; api: unknown | null; itemPage: PageTree | null };
type CheckedTrigger = { id: string; kind: TriggerKind; config: Record<string, unknown>; slug: string | null; enabled: boolean };
type CheckedFn = { draft: FnDef; live: FnDef | null; tests: unknown[]; triggers: CheckedTrigger[] };
type CheckedPage = { tree: PageTree; draft: PageTree | null };
/** A table's fields changing: as they are, as they will be, and what that does to its rows. */
type FieldChange = { before: Field[]; after: Field[]; impacts: Impact[] };
export type Waiting = { ref: string; name: string; impacts: Impact[] };

type Planned = {
  file: Project;
  here: Project;
  items: DiffItem[];
  /** The things only here that the owner ticked to go. */
  remove: Set<string>;
  problems: Problem[];
  /** Field changes that would set values aside and the owner hasn't accepted. */
  waits: Waiting[];
  fieldChanges: Map<string, FieldChange>;
  checked: { tables: Map<string, CheckedTable>; fns: Map<string, CheckedFn>; pages: Map<string, CheckedPage> };
};

export type PlanOpts = { remove?: string[]; accept?: string[]; lang?: Lang };

/** Without the things the owner ticked to go (so what they held is free for the file's). */
function without(p: Project, remove: ReadonlySet<string>): Project {
  return {
    ...p,
    tables: p.tables.filter((t) => !remove.has(`table:${t.id}`)),
    functions: p.functions.filter((f) => !remove.has(`function:${f.id}`)),
    pages: p.pages.filter((x) => !remove.has(`page:${x.id}`)),
    roles: p.roles.filter((r) => !remove.has(`role:${r.key}`)),
    groups: p.groups.filter((g) => !remove.has(`group:${g.id}`)),
    features: p.features.filter((f) => !remove.has(`feature:${f.id}`)),
  };
}

async function planned(raw: unknown, opts: PlanOpts): Promise<{ ok: false; problems: Problem[] } | ({ ok: true } & Planned)> {
  const read = readProject(raw);
  if (!read.ok) return { ok: false, problems: read.problems };
  const file = read.project;
  const lang = opts.lang ?? "ar";
  const here = await exportProject();
  // Only what is only here can be ticked to go; then the file is read against what stays.
  const whole = diffProject(file, here, lang);
  const only = new Set(whole.filter((i) => i.action === "only").map((i) => i.ref));
  const remove = new Set((opts.remove ?? []).filter((r) => only.has(r)));
  const accept = new Set(opts.accept ?? []);
  const kept = without(here, remove);
  const items = remove.size ? [...diffProject(file, kept, lang), ...whole.filter((i) => remove.has(i.ref))] : whole;
  const action = new Map(items.map((i) => [i.ref, i.action]));
  const doing = (ref: string) => action.get(ref) === "add" || action.get(ref) === "change";

  const problems: Problem[] = [];
  const problem = (at: string, message: string) => void (problems.length < PROJECT_LIMITS.problems && problems.push({ at, message }));
  const issuesAt = (at: string, issues: Array<{ path: PropertyKey[]; message: string }>) => issues.slice(0, 5).forEach((i) => problem([at, ...i.path.map(String)].filter(Boolean).join("."), i.message));
  for (const i of items) if (i.action === "clash" && i.clash) problem(i.ref, `"${i.name}": "${i.clash.word}" is held by "${i.clash.by}" here`);

  // What the project holds once the file is in: what stays here, and what the file makes.
  const added = (kind: string) => items.filter((i) => i.kind === kind && i.action === "add").map((i) => i.id);
  const finalTables = new Set([...kept.tables.map((t) => t.id), ...added("table")]);
  const finalFns = new Set([...kept.functions.map((f) => f.id), ...added("function")]);

  const checked: Planned["checked"] = { tables: new Map(), fns: new Map(), pages: new Map() };
  const fieldChanges = new Map<string, FieldChange>();
  const waits: Waiting[] = [];

  /* Tables: their fields checked as a table's page checks them; a link reaches a table that will be there. */
  for (const [i, t] of file.tables.entries()) {
    const ref = `table:${t.id}`;
    if (!doing(ref)) continue;
    const at = `tables.${i}`;
    const body = CollectionBody.safeParse({ slug: t.slug, name: t.name, fields: t.fields });
    if (!body.success) {
      issuesAt(at, body.error.issues);
      continue;
    }
    const fields = body.data.fields as unknown as Field[];
    fields.forEach((f, k) => {
      const x = f as unknown as Obj;
      if (x.type === "relation" && !storeTarget(x.to) && !finalTables.has(String(x.to))) problem(`${at}.fields.${k}.to`, "A relation links a table that won't be there");
      if (x.type === "rollup" && typeof x.from === "string" && x.from && !finalTables.has(x.from)) problem(`${at}.fields.${k}.from`, "A rollup reads a table that won't be there");
    });
    const api = t.api === undefined ? null : SettingsSchema.safeParse(t.api);
    if (api && !api.success) issuesAt(`${at}.api`, api.error.issues);
    let itemPage: PageTree | null = null;
    if (t.itemPage !== undefined) {
      const tree = checkTree(t.itemPage);
      if (tree.ok) itemPage = tree.tree;
      else tree.issues.slice(0, 3).forEach((is) => problem(`${at}.itemPage${is.path ? `.${is.path}` : ""}`, is.message));
    }
    checked.tables.set(t.id, { slug: body.data.slug, name: asJson(body.data.name), fields, api: api?.success ? api.data : null, itemPage });
    const before = here.tables.find((h) => h.id === t.id);
    if (before && action.get(ref) === "change") {
      const now = before.fields as unknown as Field[];
      const impacts = await previewSchemaChange(prisma, t.id, now, fields, lang);
      if (impacts.length) fieldChanges.set(t.id, { before: now, after: fields, impacts });
      const name = items.find((x) => x.ref === ref)?.name ?? t.slug;
      if (needsAccept(impacts) && !accept.has(ref)) waits.push({ ref, name, impacts });
    }
  }

  /* Functions: their steps and tests as the builder saves them; what is published names only what will be there. */
  for (const [i, f] of file.functions.entries()) {
    const ref = `function:${f.id}`;
    if (!doing(ref)) continue;
    const at = `functions.${i}`;
    const draft = FnDefSchema.safeParse(f.draft);
    if (!draft.success) issuesAt(`${at}.draft`, draft.error.issues);
    const live = f.live === undefined ? null : FnDefSchema.safeParse(f.live);
    if (live && !live.success) issuesAt(`${at}.live`, live.error.issues);
    if (live?.success)
      eachStep(live.data, (s, stepAt) => {
        if (TABLE_ACTS.has(String(s.act)) && typeof s.table === "string" && s.table && !finalTables.has(s.table)) problem(`${at}.live.${stepAt}.table`, "The published steps use a table that won't be there");
        if (s.act === "call" && typeof s.fn === "string" && s.fn && !finalFns.has(s.fn)) problem(`${at}.live.${stepAt}.fn`, "The published steps call a function that won't be there");
      });
    const tests = f.tests === undefined ? null : TestsSchema.safeParse(f.tests);
    if (tests && !tests.success) issuesAt(`${at}.tests`, tests.error.issues);
    const triggers: CheckedTrigger[] = [];
    f.triggers.forEach((tr, k) => {
      const tat = `${at}.triggers.${k}`;
      try {
        const config = configOf(tr.kind, tr.config);
        if (tr.kind === "row" && !finalTables.has(String(config.table))) return problem(`${tat}.config.table`, "It waits for a table that won't be there");
        let slug: string | null = null;
        if (tr.kind === "call") {
          if (!tr.slug || !CALL_SLUG.test(tr.slug)) return problem(`${tat}.slug`, "A call has an address of small letters, digits and -");
          slug = tr.slug;
        } else if (tr.kind === "route") slug = routeSlug(String((config as RouteConfig).method), routePath((config as RouteConfig).path));
        triggers.push({ id: tr.id, kind: tr.kind, config, slug, enabled: tr.enabled });
      } catch (e) {
        problem(`${tat}.config`, e instanceof AppError ? e.message : "Bad trigger");
      }
    });
    if (draft.success && (!live || live.success)) checked.fns.set(f.id, { draft: draft.data, live: live?.success ? live.data : null, tests: tests?.success ? tests.data : [], triggers });
  }

  /* Pages: drawn as the editor draws them. */
  for (const [i, p] of file.pages.entries()) {
    if (!doing(`page:${p.id}`)) continue;
    const tree = checkTree(p.tree);
    if (!tree.ok) {
      tree.issues.slice(0, 3).forEach((is) => problem(`pages.${i}.tree${is.path ? `.${is.path}` : ""}`, is.message));
      continue;
    }
    const draft = p.draft === undefined ? null : checkTree(p.draft);
    if (draft && !draft.ok) {
      draft.issues.slice(0, 3).forEach((is) => problem(`pages.${i}.draft${is.path ? `.${is.path}` : ""}`, is.message));
      continue;
    }
    checked.pages.set(p.id, { tree: tree.tree, draft: draft?.ok ? draft.tree : null });
  }

  file.roles.forEach((r, i) => {
    if (!doing(`role:${r.key}`)) return;
    const name = RoleNameSchema.safeParse(r.name ?? {});
    if (!name.success) issuesAt(`roles.${i}.name`, name.error.issues);
  });

  /* What goes mustn't leave what stays broken: a table another links, a function another calls. */
  const gone = (kind: string) => [...remove].filter((r) => r.startsWith(`${kind}:`)).map((r) => r.slice(kind.length + 1));
  const fieldsOfFinal = [...kept.tables.filter((t) => !file.tables.some((x) => x.id === t.id)).map((t) => ({ id: t.id, fields: t.fields })), ...file.tables.map((t) => ({ id: t.id, fields: t.fields }))];
  const tableName = (id: string) => items.find((x) => x.ref === `table:${id}`)?.name ?? id;
  for (const id of gone("table"))
    for (const t of fieldsOfFinal)
      if (t.fields.some((f) => isObj(f) && ((f.type === "relation" && f.to === id) || (f.type === "rollup" && f.from === id)))) problem(`table:${id}`, `"${tableName(t.id)}" links "${tableName(id)}": it can't go while it does`);
  const defsOfFinal = [...kept.functions.filter((f) => !file.functions.some((x) => x.id === f.id)), ...file.functions];
  for (const id of gone("function")) {
    const by = defsOfFinal.find((f) => f.id !== id && JSON.stringify([f.draft, f.live ?? null]).includes(`"fn":"${id}"`));
    if (by) problem(`function:${id}`, `"${by.name}" calls it: it can't go while it does`);
  }

  return { ok: true, file, here, items, remove, problems, waits, fieldChanges, checked };
}

/** What a bring-in would do, and what it needs; nothing is written. `suggested`: what going back to it would take away (all that is only here, but a table with rows). */
export async function previewProject(raw: unknown, opts: PlanOpts = {}) {
  const p = await planned(raw, opts);
  if (!p.ok) return { ok: false as const, problems: p.problems, items: [], waits: [] };
  const outside = await connectionNames();
  const kept = new Set(outside.secrets.map((s) => s.name));
  const connections = new Set((await prisma.fnConnection.findMany({ select: { id: true } })).map((c) => c.id));
  const onlyTables = p.items.filter((i) => i.kind === "table" && i.action === "only").map((i) => i.id);
  const rows = new Map(onlyTables.length ? (await prisma.collectionItem.groupBy({ by: ["collectionId"], where: { collectionId: { in: onlyTables } }, _count: { _all: true } })).map((g) => [g.collectionId, g._count._all]) : []);
  const items = p.items.map((i) => ({ ...i, ...(i.action === "only" ? { going: p.remove.has(i.ref), ...(i.kind === "table" ? { rows: rows.get(i.id) ?? 0 } : {}) } : {}), ...(p.fieldChanges.has(i.id) && i.kind === "table" ? { impacts: p.fieldChanges.get(i.id)!.impacts } : {}) }));
  return {
    ok: p.problems.length === 0 && p.waits.length === 0,
    project: { name: p.file.name ?? null, exportedAt: p.file.exportedAt ?? null, size: sizeOfProject(p.file) },
    items,
    counts: countsOf(p.items),
    waits: p.waits,
    problems: p.problems,
    needs: {
      secrets: (p.file.needs?.secrets ?? []).map((name) => ({ name, kept: kept.has(name) })),
      sites: (p.file.needs?.sites ?? []).map((host) => ({ host, allowed: siteAllowed(host, outside.sites) })),
      connections: (p.file.needs?.connections ?? []).map((c) => ({ ...c, here: connections.has(c.id) })),
    },
    suggested: items.filter((i) => i.action === "only" && !(i.kind === "table" && (rows.get(i.id) ?? 0) > 0)).map((i) => i.ref),
  };
}

/* ---------------- Bringing it in ---------------- */

const taken = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/** A page's unpublished changes, kept as the editor keeps them (on the page as it will be). */
function draftOf(page: { tree: PageTree; status: string; slug: string; sections: Array<{ id: string; type: string; data: unknown; isVisible: boolean; order: number; translations?: Array<{ locale: string; data: unknown }> }> }, draft: PageTree, rev: number) {
  const d = draftFromPage({ tree: page.tree, sections: page.sections, status: page.status as never, slug: page.slug } as never);
  return { ...d, tree: draft, rev };
}

async function write(p: Planned, opts: { lang: Lang; by: string | null }) {
  const { file, items, remove, checked, fieldChanges } = p;
  const action = new Map(items.map((i) => [i.ref, i.action]));
  const doing = (ref: string) => action.get(ref) === "add" || action.get(ref) === "change";
  const gone = (kind: string) => [...remove].filter((r) => r.startsWith(`${kind}:`)).map((r) => r.slice(kind.length + 1));
  const slugs: string[] = [];
  const counts = { made: 0, changed: 0, removed: remove.size };

  await prisma.$transaction(
    async (tx) => {
      /* What goes first: what it held is free for the file's things. */
      const fnIds = gone("function");
      if (fnIds.length) {
        const triggers = await tx.fnTrigger.findMany({ where: { fnId: { in: fnIds } }, select: { id: true } });
        if (triggers.length) await tx.fnCallKey.deleteMany({ where: { triggerId: { in: triggers.map((t) => t.id) } } });
        await tx.fn.deleteMany({ where: { id: { in: fnIds } } });
      }
      const pageIds = gone("page");
      if (pageIds.length) {
        slugs.push(...(await tx.page.findMany({ where: { id: { in: pageIds } }, select: { slug: true } })).map((x) => x.slug));
        await tx.page.deleteMany({ where: { id: { in: pageIds } } });
      }
      const tableIds = gone("table");
      if (tableIds.length) {
        const itemPages = (await tx.collection.findMany({ where: { id: { in: tableIds } }, select: { templateId: true } })).map((c) => c.templateId).filter((x): x is string => !!x);
        await tx.studioRevision.deleteMany({ where: { kind: "table", objectId: { in: tableIds } } });
        await tx.collection.deleteMany({ where: { id: { in: tableIds } } });
        if (itemPages.length) await tx.page.deleteMany({ where: { id: { in: itemPages }, kind: TEMPLATE_KIND } });
        const hooks = await tx.webhookEndpoint.findMany({ where: { tables: { hasSome: tableIds } }, select: { id: true, tables: true } });
        for (const h of hooks) await tx.webhookEndpoint.update({ where: { id: h.id }, data: { tables: h.tables.filter((t) => !tableIds.includes(t)) } });
      }
      const featureIds = gone("feature");
      if (featureIds.length) await tx.feature.deleteMany({ where: { id: { in: featureIds } } });
      for (const key of gone("role")) {
        await tx.$executeRaw`UPDATE "User" SET "roles" = array_remove("roles", ${key}) WHERE ${key} = ANY("roles")`;
        await tx.shopperRole.delete({ where: { key } });
      }
      for (const id of gone("group")) {
        await tx.$executeRaw`UPDATE "User" SET "groups" = array_remove("groups", ${id}) WHERE ${id} = ANY("groups")`;
        await tx.shopperGroup.delete({ where: { id } });
      }

      /* Roles and groups (a table's access and a function's door name them). */
      for (const r of file.roles) {
        if (!doing(`role:${r.key}`)) continue;
        const data = { name: asJson(r.name ?? {}), note: r.note ?? null };
        await tx.shopperRole.upsert({ where: { key: r.key }, create: { key: r.key, ...data }, update: data });
        counts[action.get(`role:${r.key}`) === "add" ? "made" : "changed"]++;
      }
      for (const g of file.groups) {
        if (!doing(`group:${g.id}`)) continue;
        const data = { name: g.name, note: g.note ?? null };
        await tx.shopperGroup.upsert({ where: { id: g.id }, create: { id: g.id, ...data }, update: data });
        counts[action.get(`group:${g.id}`) === "add" ? "made" : "changed"]++;
      }

      /* Tables: all of them made or renamed first, so each link reaches one that is there. */
      const settle: Array<{ id: string; key: string; fields: Field[] }> = [];
      for (const t of file.tables) {
        const ref = `table:${t.id}`;
        const c = checked.tables.get(t.id);
        if (!doing(ref) || !c) continue;
        const api = (c.api ?? Prisma.JsonNull) as Prisma.InputJsonValue;
        if (action.get(ref) === "add") {
          await tx.collection.create({ data: { id: t.id, slug: c.slug, name: c.name, fields: asJson(c.fields), api } });
          settle.push({ id: t.id, key: ref, fields: c.fields });
          counts.made++;
          continue;
        }
        const row = await tx.collection.findUniqueOrThrow({ where: { id: t.id }, select: { slug: true, name: true, fields: true } });
        await tx.collection.update({ where: { id: t.id }, data: { slug: c.slug, name: c.name, api } });
        const change = fieldChanges.get(t.id);
        if (change || stable(row.fields) !== stable(c.fields)) {
          // Kept as a version of the table, as any change of its fields is (the tables page brings it back).
          await applySchemaChange(tx, t.id, row.fields as unknown as Field[], c.fields, opts.lang);
          await tx.studioRevision.create({ data: { kind: "table", objectId: t.id, data: asJson({ slug: row.slug, name: row.name, fields: row.fields }), summary: asJson(change?.impacts ?? []), adminUserId: null } });
          settle.push({ id: t.id, key: ref, fields: c.fields });
        }
        counts.changed++;
      }
      for (const s of settle) {
        const unlinked = await relationProblem(tx, s.fields, s.id);
        if (unlinked) throw new AppError(400, "PROJECT_INVALID", unlinked.message, { problems: [{ at: `${s.key}.${unlinked.path}`, message: unlinked.message }] });
        const settled = await settleComputed(tx, s.fields, s.id);
        if ("problem" in settled) throw new AppError(400, "PROJECT_INVALID", settled.problem.message, { problems: [{ at: `${s.key}.${settled.problem.path}`, message: settled.problem.message }] });
        await tx.collection.update({ where: { id: s.id }, data: { fields: asJson(settled.fields) } });
      }
      // Their rows' own pages.
      for (const t of file.tables) {
        const c = checked.tables.get(t.id);
        if (!doing(`table:${t.id}`) || !c?.itemPage) continue;
        const row = await tx.collection.findUniqueOrThrow({ where: { id: t.id }, select: { templateId: true } });
        const page = row.templateId ? await tx.page.findFirst({ where: { id: row.templateId, kind: TEMPLATE_KIND }, select: { id: true } }) : null;
        if (page) await tx.page.update({ where: { id: page.id }, data: { tree: asJson(c.itemPage), format: PAGE_FORMAT.tree, draft: Prisma.DbNull } });
        else {
          const made = await tx.page.create({ data: { name: `${c.slug} — item page`, slug: `/__collection/${randomBytes(6).toString("hex")}`, status: "PUBLISHED", kind: TEMPLATE_KIND, format: PAGE_FORMAT.tree, tree: asJson(c.itemPage) }, select: { id: true } });
          await tx.collection.update({ where: { id: t.id }, data: { templateId: made.id } });
        }
      }

      /* Functions: what is published comes in as a new version of its own. */
      for (const f of file.functions) {
        const ref = `function:${f.id}`;
        const c = checked.fns.get(f.id);
        if (!doing(ref) || !c) continue;
        const data = { name: f.name, note: f.note ?? null, enabled: f.enabled, draft: asJson(c.draft), tests: asJson(c.tests) };
        const was = action.get(ref) === "add" ? null : await tx.fn.findUniqueOrThrow({ where: { id: f.id }, select: { live: true, triggers: { select: { id: true, kind: true, slug: true } } } });
        if (!was) await tx.fn.create({ data: { id: f.id, ...data, createdById: opts.by } });
        else await tx.fn.update({ where: { id: f.id }, data });
        counts[was ? "changed" : "made"]++;
        if (stable(was?.live ?? null) !== stable(c.live)) {
          if (c.live) {
            const last = await tx.fnVersion.findFirst({ where: { fnId: f.id }, orderBy: { n: "desc" }, select: { n: true } });
            const n = (last?.n ?? 0) + 1;
            await tx.fnVersion.create({ data: { fnId: f.id, n, def: asJson(c.live), from: "project", byEmail: opts.by } });
            await tx.fn.update({ where: { id: f.id }, data: { live: asJson(c.live), version: n, publishedAt: new Date() } });
            await tx.fnVersion.deleteMany({ where: { fnId: f.id, n: { lte: n - VERSION_LIMITS.kept } } });
          } else await tx.fn.update({ where: { id: f.id }, data: { live: Prisma.DbNull, version: null, publishedAt: null } });
        }
        // What starts it, trigger by trigger: a webhook keeps the address it has here.
        const before = new Map((was?.triggers ?? []).map((t) => [t.id, t]));
        const dropped = [...before.keys()].filter((id) => !c.triggers.some((t) => t.id === id));
        if (dropped.length) {
          await tx.fnCallKey.deleteMany({ where: { triggerId: { in: dropped } } });
          await tx.fnTrigger.deleteMany({ where: { id: { in: dropped } } });
        }
        for (const t of c.triggers) {
          const old = before.get(t.id);
          const slug = t.kind === "webhook" ? (old?.kind === "webhook" && old.slug ? old.slug : newToken()) : t.slug;
          const fields = { kind: t.kind, config: asJson(t.config), slug, enabled: t.enabled, nextAt: t.kind === "schedule" ? nextRun(t.config as ScheduleConfig, new Date()) : null };
          if (old) await tx.fnTrigger.update({ where: { id: t.id }, data: fields });
          else await tx.fnTrigger.create({ data: { id: t.id, fnId: f.id, ...fields } });
        }
      }

      /* Pages: what the shop shows, and the editor's unpublished changes. The page's own history keeps what it was. */
      for (const pg of file.pages) {
        const ref = `page:${pg.id}`;
        const c = checked.pages.get(pg.id);
        if (!doing(ref) || !c) continue;
        const data = { name: pg.name, slug: pg.slug, kind: pg.kind, status: pg.status, format: PAGE_FORMAT.tree, tree: asJson(c.tree), seoTitle: pg.seo?.title ?? null, seoDescription: pg.seo?.description ?? null, noIndex: pg.seo?.noIndex ?? false };
        if (action.get(ref) === "add") {
          const draft = c.draft ? draftOf({ tree: c.tree, status: pg.status, slug: pg.slug, sections: [] }, c.draft, 1) : null;
          await tx.page.create({ data: { id: pg.id, ...data, ...(draft ? { draft: asJson(draft) } : {}) } });
          counts.made++;
        } else {
          const row = await tx.page.findUniqueOrThrow({ where: { id: pg.id }, select: { slug: true, draft: true, sections: { select: { id: true, type: true, data: true, isVisible: true, order: true, translations: { select: { locale: true, data: true } } } } } });
          await capturePageRevision(pg.id, "From a project file", opts.by ? { email: opts.by } : undefined, tx, false);
          const rev = (storedDraft(row.draft)?.rev ?? 0) + 1;
          const draft = c.draft ? draftOf({ tree: c.tree, status: pg.status, slug: pg.slug, sections: row.sections }, c.draft, rev) : null;
          await tx.page.update({ where: { id: pg.id }, data: { ...data, draft: draft ? asJson(draft) : Prisma.DbNull } });
          if (row.slug !== pg.slug) slugs.push(row.slug);
          counts.changed++;
        }
        slugs.push(pg.slug);
      }

      /* Features: their name, their switch, and which things are theirs. */
      const exists = {
        table: new Set((await tx.collection.findMany({ select: { id: true } })).map((x) => x.id)),
        function: new Set((await tx.fn.findMany({ select: { id: true } })).map((x) => x.id)),
        page: new Set((await tx.page.findMany({ where: { kind: { in: [...PROJECT_PAGE_KINDS] } }, select: { id: true } })).map((x) => x.id)),
      };
      for (const f of file.features) {
        const ref = `feature:${f.id}`;
        if (!doing(ref)) continue;
        const data = { name: f.name, note: f.note ?? null, enabled: f.enabled, template: (f.template ?? Prisma.JsonNull) as Prisma.InputJsonValue, settings: (f.settings ?? Prisma.JsonNull) as Prisma.InputJsonValue, panelLayout: (f.panelLayout ?? Prisma.JsonNull) as Prisma.InputJsonValue };
        await tx.feature.upsert({ where: { id: f.id }, create: { id: f.id, ...data }, update: data });
        const things = f.items.filter((i) => exists[i.kind].has(i.id));
        await tx.featureItem.deleteMany({ where: { OR: [{ featureId: f.id }, ...things.map((i) => ({ kind: i.kind, refId: i.id }))] } });
        if (things.length) await tx.featureItem.createMany({ data: things.map((i) => ({ featureId: f.id, kind: i.kind, refId: i.id })) });
        counts[action.get(ref) === "add" ? "made" : "changed"]++;
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
  return { counts, slugs };
}

/** What a snapshot looks like in a list (never its file). */
const LINE = { id: true, label: true, reason: true, size: true, bytes: true, byEmail: true, createdAt: true } as const;
export const SNAPSHOT_REASONS = ["saved", "before", "back"] as const;
export type SnapshotReason = (typeof SNAPSHOT_REASONS)[number];

/** The project as it is now (or `file`), kept under a name; only the newest few are kept. */
export async function saveSnapshot(label: string, reason: SnapshotReason, by: string | null, file?: Project) {
  const project = file ?? (await exportProject());
  const bytes = Buffer.byteLength(JSON.stringify(project), "utf8");
  const row = await prisma.projectSnapshot.create({ data: { label: label.trim().slice(0, 120) || "—", reason, file: asJson(project), size: sizeOfProject(project), bytes, byEmail: by }, select: LINE });
  const old = await prisma.projectSnapshot.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: PROJECT_LIMITS.snapshots, select: { id: true } });
  if (old.length) await prisma.projectSnapshot.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  return row;
}
export const snapshotsList = () => prisma.projectSnapshot.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: PROJECT_LIMITS.snapshots, select: LINE });
export async function snapshotFile(id: string): Promise<{ file: unknown; label: string; createdAt: Date }> {
  const row = await prisma.projectSnapshot.findUnique({ where: { id }, select: { file: true, label: true, createdAt: true } });
  if (!row) throw new AppError(404, "SNAPSHOT_NOT_FOUND", "No such saved copy of the project");
  return row;
}

/**
 * The file brought in: the project as it is kept first (`label`, `reason`), then everything at once. A
 * file that changes nothing changes nothing, and keeps nothing.
 */
export async function applyProject(raw: unknown, opts: PlanOpts & { by?: string | null; label: string; reason: Exclude<SnapshotReason, "saved"> }) {
  const lang = opts.lang ?? "ar";
  const p = await planned(raw, opts);
  if (!p.ok) throw new AppError(400, "PROJECT_INVALID", p.problems[0]?.message ?? "This file can't be brought in", { problems: p.problems });
  if (p.problems.length) throw new AppError(400, "PROJECT_INVALID", p.problems[0].message, { problems: p.problems });
  if (p.waits.length) throw new AppError(409, "PROJECT_WAITS", "Some fields' changes would set values aside: accept them first", { waits: p.waits });
  const counts = countsOf(p.items);
  if (!counts.add && !counts.change && !p.remove.size) return { counts, snapshot: null, made: 0, changed: 0, removed: 0 };
  const snapshot = await saveSnapshot(opts.label, opts.reason, opts.by ?? null, p.here);
  try {
    const done = await write(p, { lang, by: opts.by ?? null });
    forgetFeatureGate();
    forgetTriggers();
    forgetShoppers();
    void triggerCmsRevalidate([...new Set(done.slugs)]).catch(() => {});
    return { counts, snapshot, ...done.counts };
  } catch (e) {
    // Nothing was written: the copy kept for it isn't one.
    await prisma.projectSnapshot.delete({ where: { id: snapshot.id } }).catch(() => undefined);
    if (taken(e)) throw new AppError(409, "PROJECT_TAKEN", "An address was taken in the meantime: look again and try again");
    throw e;
  }
}
