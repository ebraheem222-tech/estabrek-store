/**
 * A whole site's panel (wave 1.2 of docs/sites-300-plan.ar.md): its own pages in the admin's menu, under the site's
 * name, made of the panel parts its file declares (admin studio/templates/sites): numbers counted from its tables,
 * a queue of rows waiting for a decision (a button sets a field: "confirmed", "replied"), a saved table, its
 * settings, and quick actions that change a setting ("close online booking").
 *
 * A part names its site's tables by their keys in the file (`@table:bookings`); installed, they are the ids the
 * feature keeps (Installed.ids.table). Each part is shown only to a member who may read what it reads (a table's
 * rows: pages:read or that one table; the settings: features:read), and its buttons only to one who may change it.
 */
import { z } from "zod";
import { prisma } from "./prisma.js";
import { SETTING_KEY } from "./pageTree.js";
import { parseGridQuery, queryRows, type GridFilter } from "./dataQuery.js";
import { declsOf, valuesOf, type SettingDecl, type Values } from "./siteSettings.js";
import type { Field } from "./collectionTree.js";

export const PANEL_LIMITS = { pages: 8, parts: 12, numbers: 8, conds: 6, columns: 8, decisions: 4, actions: 8, rows: 50 } as const;
export const PANEL_ICONS = ["today", "lists", "settings"] as const;

const Label = z.object({ ar: z.string().trim().max(200).optional(), en: z.string().trim().max(200).optional(), he: z.string().trim().max(200).optional() }).strict();
const Key = z.string().regex(SETTING_KEY, "A key is a small letter, then letters and digits");
const TABLE_REF = /^@table:([A-Za-z0-9][A-Za-z0-9_-]{0,40})$/;
const TableRef = z.string().regex(TABLE_REF, "A table of the site, as @table:<its key>");
/** A field of the table by its id, or one of the row's own columns ($createdAt, $status…). */
const FIELD = /^(\$[a-zA-Z]{2,20}|[A-Za-z][A-Za-z0-9_]{0,39})$/;
const FieldId = z.string().regex(FIELD, "A field's id");
const Scalar = z.union([z.string().max(200), z.number().finite(), z.boolean()]);
const Cond = z.object({ field: FieldId, op: z.enum(["is", "isNot", "empty", "notEmpty"]), value: Scalar.optional() }).strict();
const Conds = z.array(Cond).max(PANEL_LIMITS.conds);

const NumberItem = z.object({ key: Key, label: Label, table: TableRef, where: Conds.optional(), window: z.enum(["today", "week", "month"]).optional(), compare: z.boolean().optional() }).strict();
const Decision = z.object({ key: Key, label: Label, set: z.record(FieldId, Scalar).refine((s) => Object.keys(s).length > 0 && Object.keys(s).length <= 4, "It sets one field or a few"), tone: z.enum(["good", "bad"]).optional() }).strict();
const Action = z.object({ key: Key, label: Label, note: Label.optional(), setting: Key, value: Scalar }).strict();
const Rows = z.number().int().min(1).max(PANEL_LIMITS.rows).optional();

export const PanelPartSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("numbers"), key: Key, items: z.array(NumberItem).min(1).max(PANEL_LIMITS.numbers) }).strict(),
  z.object({ kind: z.literal("queue"), key: Key, title: Label, table: TableRef, where: Conds, show: z.array(FieldId).min(1).max(PANEL_LIMITS.columns), decisions: z.array(Decision).min(1).max(PANEL_LIMITS.decisions), empty: Label.optional(), limit: Rows }).strict(),
  z.object({ kind: z.literal("view"), key: Key, title: Label, table: TableRef, where: Conds.optional(), columns: z.array(FieldId).min(1).max(PANEL_LIMITS.columns), sort: z.object({ field: FieldId, dir: z.enum(["asc", "desc"]) }).strict().optional(), limit: Rows }).strict(),
  z.object({ kind: z.literal("settings"), key: Key, title: Label.optional(), keys: z.array(Key).min(1).max(40) }).strict(),
  z.object({ kind: z.literal("actions"), key: Key, title: Label.optional(), items: z.array(Action).min(1).max(PANEL_LIMITS.actions) }).strict(),
]);
export type PanelPart = z.infer<typeof PanelPartSchema>;
const PanelPage = z.object({ key: Key, name: Label, icon: z.enum(PANEL_ICONS), parts: z.array(PanelPartSchema).min(1).max(PANEL_LIMITS.parts) }).strict();
export type PanelPage = z.infer<typeof PanelPage>;

/** A site's panel as its file declares it: its pages, each of a key no other has, each part of a key no other on its page has. */
export const PanelSchema = z
  .array(PanelPage)
  .max(PANEL_LIMITS.pages)
  .superRefine((pages, ctx) => {
    const keys = pages.map((p) => p.key);
    keys.forEach((k, i) => {
      if (keys.indexOf(k) !== i) ctx.addIssue({ code: "custom", path: [i, "key"], message: `Two panel pages have the key "${k}"` });
    });
    pages.forEach((p, i) => {
      const parts = p.parts.map((x) => x.key);
      parts.forEach((k, j) => {
        if (parts.indexOf(k) !== j) ctx.addIssue({ code: "custom", path: [i, "parts", j, "key"], message: `Two parts of "${p.key}" have the key "${k}"` });
      });
    });
  });
export type Panel = z.infer<typeof PanelSchema>;

export const tableKeyOf = (ref: string) => TABLE_REF.exec(ref)?.[1] ?? null;
const own = (f: string) => !f.startsWith("$");

/** What a part reads: its tables (by their keys in the file) and the fields of each. */
function readsOf(part: PanelPart): Array<{ table: string; fields: string[] }> {
  const fieldsOf = (conds?: Array<{ field: string }>) => (conds ?? []).map((c) => c.field);
  switch (part.kind) {
    case "numbers":
      return part.items.map((i) => ({ table: i.table, fields: fieldsOf(i.where) }));
    case "queue":
      return [{ table: part.table, fields: [...fieldsOf(part.where), ...part.show, ...part.decisions.flatMap((d) => Object.keys(d.set))] }];
    case "view":
      return [{ table: part.table, fields: [...fieldsOf(part.where), ...part.columns, ...(part.sort ? [part.sort.field] : [])] }];
    default:
      return [];
  }
}

/**
 * Where a site's panel talks about what its file doesn't hold: a table that isn't one of its tables, a field its
 * table hasn't, a setting it doesn't declare. (Said when the file is read: an install never brings a panel that
 * can't be drawn.)
 */
export function panelProblems(panel: Panel, tables: Array<{ key: string; fields: unknown[] }>, settings: string[]): Array<{ at: string; message: string }> {
  const out: Array<{ at: string; message: string }> = [];
  const byKey = new Map(tables.map((t) => [t.key, new Set(t.fields.map((f) => (f && typeof f === "object" ? String((f as { id?: unknown }).id) : "")))]));
  panel.forEach((page, i) =>
    page.parts.forEach((part, j) => {
      const at = `panel.${i}.parts.${j}`;
      for (const read of readsOf(part)) {
        const key = tableKeyOf(read.table) ?? "";
        const fields = byKey.get(key);
        if (!fields) out.push({ at, message: `"${part.key}" reads "${key}", which isn't one of the site's tables` });
        else for (const f of read.fields.filter(own)) if (!fields.has(f)) out.push({ at, message: `"${part.key}": the table "${key}" has no field "${f}"` });
      }
      const keys = part.kind === "settings" ? part.keys : part.kind === "actions" ? part.items.map((a) => a.setting) : [];
      for (const k of keys) if (!settings.includes(k)) out.push({ at, message: `"${part.key}" names "${k}", which isn't one of the site's settings` });
    }),
  );
  return out;
}

/* ---------------- The panels here ---------------- */

/** A site installed here with a panel: its file's panel, its tables' ids by key, its settings. */
export type SitePanel = { featureId: string; name: string; enabled: boolean; panel: Panel; tables: Record<string, string>; decls: SettingDecl[]; values: Values };

/** Every site installed here with a panel, in the order they were installed. Only the parts of each file it needs are read. */
export async function sitePanels(featureId?: string): Promise<SitePanel[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string; name: string; enabled: boolean; panel: unknown; tables: unknown; decls: unknown; settings: unknown }>>`
    SELECT "id", "name", "enabled", "template"->'file'->'panel' AS "panel", "template"->'ids'->'table' AS "tables", "template"->'file'->'settings' AS "decls", "settings"
    FROM "Feature" WHERE jsonb_typeof("template"->'file'->'panel') = 'array' ORDER BY "createdAt" ASC, "id" ASC`;
  const out: SitePanel[] = [];
  for (const r of rows) {
    if (featureId && r.id !== featureId) continue;
    const panel = PanelSchema.safeParse(r.panel);
    if (!panel.success || !panel.data.length) continue;
    const tables = r.tables && typeof r.tables === "object" ? (Object.fromEntries(Object.entries(r.tables as Record<string, unknown>).filter(([, v]) => typeof v === "string")) as Record<string, string>) : {};
    const decls = declsOf(r.decls);
    out.push({ featureId: r.id, name: r.name, enabled: r.enabled, panel: panel.data, tables, decls, values: valuesOf(decls, r.settings) });
  }
  return out;
}

/** What a member may do here: read a table's rows, change them; read the site's settings, change them. */
export type PanelRights = { readTable: (id: string) => boolean; writeTable: (id: string) => boolean; readSettings: boolean; writeSettings: boolean };

/** The table ids a part reads, here (null: one of them isn't here any more). */
function idsOf(site: SitePanel, part: PanelPart): string[] | null {
  const ids = readsOf(part).map((r) => site.tables[tableKeyOf(r.table) ?? ""]);
  return ids.some((id) => !id) ? null : ids;
}
/** Whether a member sees a part at all (numbers: when they may read one of its tables). */
export function partShown(site: SitePanel, part: PanelPart, may: PanelRights): boolean {
  if (part.kind === "settings") return may.readSettings;
  if (part.kind === "actions") return may.writeSettings;
  if (part.kind === "numbers") return part.items.some((i) => {
    const id = site.tables[tableKeyOf(i.table) ?? ""];
    return !!id && may.readTable(id);
  });
  const ids = idsOf(site, part);
  return !!ids && ids.every(may.readTable);
}
/** A site's pages this member sees (a page with no part they may see isn't one of them). */
export const pagesShown = (site: SitePanel, may: PanelRights) => site.panel.filter((p) => p.parts.some((part) => partShown(site, part, may)));

/* ---------------- A page's parts with what they show ---------------- */

type Lang = "ar" | "en" | "he";
type TableHere = { id: string; slug: string; name: unknown; fields: Field[] };
const DAY = 86_400_000;
const ymd = (at: number) => new Date(at).toISOString().slice(0, 10);
const WINDOW_DAYS = { today: 1, week: 7, month: 30 } as const;
/** The row's own columns a part may show. */
const SYSTEM: Record<string, { type: string; name: Record<Lang, string> }> = {
  $createdAt: { type: "$date", name: { ar: "وصل", en: "Came in", he: "התקבל" } },
  $updatedAt: { type: "$date", name: { ar: "آخر تغيير", en: "Last change", he: "שינוי אחרון" } },
  $status: { type: "$status", name: { ar: "النشر", en: "Published", he: "פרסום" } },
};

const filtersOf = (conds: Array<{ field: string; op: string; value?: unknown }> = []): GridFilter[] => conds.map((c) => ({ field: c.field, op: c.op as GridFilter["op"], ...(c.value !== undefined ? { value: c.value } : {}) }));
/** A window's filter on when rows came in: the last `days` days (today included), or as many before them. */
function windowFilter(days: number, now: number, before = false): GridFilter {
  if (!before) return { field: "$createdAt", op: "gte", value: ymd(now - (days - 1) * DAY) };
  return { field: "$createdAt", op: "between", value: ymd(now - (2 * days - 1) * DAY), value2: ymd(now - days * DAY) };
}

/** The columns a part shows: each field's name, kind and options (a choice's), from the table as it is now. */
type Column = { id: string; type: string; name: unknown; options?: unknown[]; currency?: unknown };
function columnsOf(table: TableHere, ids: string[]): Column[] {
  return ids.flatMap((id): Column[] => {
    if (SYSTEM[id]) return [{ id, type: SYSTEM[id].type, name: SYSTEM[id].name }];
    const f = table.fields.find((x) => x.id === id) as (Field & { name?: unknown; options?: unknown; currency?: unknown }) | undefined;
    return f ? [{ id, type: f.type, name: f.name ?? null, ...(Array.isArray(f.options) ? { options: f.options } : {}), ...(f.currency ? { currency: f.currency } : {}) }] : [];
  });
}
/** A row as a part shows it: the asked cells only. */
function cellsOf(row: { id: string; data: Record<string, unknown>; status: string; createdAt: Date; updatedAt: Date }, ids: string[]) {
  const sys: Record<string, unknown> = { $createdAt: row.createdAt.toISOString(), $updatedAt: row.updatedAt.toISOString(), $status: row.status };
  return { id: row.id, cells: Object.fromEntries(ids.map((id) => [id, id in sys ? sys[id] : (row.data?.[id] ?? null)])) };
}

async function tablesHere(ids: string[]): Promise<Map<string, TableHere>> {
  const found = await prisma.collection.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, slug: true, name: true, fields: true } });
  return new Map(found.map((t) => [t.id, { id: t.id, slug: t.slug, name: t.name, fields: (Array.isArray(t.fields) ? t.fields : []) as Field[] }]));
}

/** How many rows of a table match, or null when it can't be asked (a field that changed since the site was installed). */
async function count(table: TableHere, filters: GridFilter[]): Promise<number | null> {
  try {
    return (await queryRows(prisma, table, parseGridQuery({ pageSize: 1, filters }))).total;
  } catch {
    return null;
  }
}

/** One page of a site's panel as this member sees it, each part with what it shows now. */
export async function pageView(site: SitePanel, page: PanelPage, may: PanelRights, opts: { lang: Lang; now?: number }) {
  const now = opts.now ?? Date.now();
  const parts = page.parts.filter((p) => partShown(site, p, may));
  const ids = parts.flatMap((p) => (p.kind === "numbers" ? p.items.map((i) => site.tables[tableKeyOf(i.table) ?? ""]) : idsOf(site, p) ?? [])).filter((x): x is string => !!x);
  const tables = await tablesHere(ids);
  const tableOf = (ref: string) => tables.get(site.tables[tableKeyOf(ref) ?? ""] ?? "") ?? null;
  const tableView = (t: TableHere) => ({ id: t.id, slug: t.slug, name: t.name });

  const out: unknown[] = [];
  for (const part of parts) {
    if (part.kind === "numbers") {
      const items = [];
      for (const i of part.items) {
        const t = tableOf(i.table);
        if (!t || !may.readTable(t.id)) continue;
        const days = i.window ? WINDOW_DAYS[i.window] : 0;
        const base = filtersOf(i.where);
        const value = await count(t, days ? [...base, windowFilter(days, now)] : base);
        const before = days && i.compare ? await count(t, [...base, windowFilter(days, now, true)]) : undefined;
        items.push({ key: i.key, label: i.label, value, ...(i.window ? { window: i.window } : {}), ...(before !== undefined ? { before } : {}), table: tableView(t) });
      }
      out.push({ kind: "numbers", key: part.key, items });
    } else if (part.kind === "queue" || part.kind === "view") {
      const t = tableOf(part.table)!;
      const shown = part.kind === "queue" ? part.show : part.columns;
      const sort = part.kind === "queue" ? [{ field: "$createdAt", dir: "asc" as const }] : part.sort ? [part.sort] : [];
      let rows: Array<{ id: string; cells: Record<string, unknown> }> = [];
      let total = 0;
      let problem: string | null = null;
      try {
        const got = await queryRows(prisma, t, parseGridQuery({ pageSize: part.limit ?? (part.kind === "queue" ? 10 : 20), filters: filtersOf(part.where), sort, lang: opts.lang }));
        rows = got.rows.map((r) => cellsOf(r, shown));
        total = got.total;
      } catch (e) {
        problem = e instanceof Error ? e.message : "It can't be read";
      }
      const common = { key: part.key, title: part.title, table: tableView(t), columns: columnsOf(t, shown), rows, total, ...(problem ? { problem } : {}) };
      out.push(part.kind === "queue" ? { kind: "queue", ...common, decisions: part.decisions.map((d) => ({ key: d.key, label: d.label, ...(d.tone ? { tone: d.tone } : {}) })), canDecide: may.writeTable(t.id), empty: part.empty ?? null } : { kind: "view", ...common });
    } else if (part.kind === "settings") {
      const decls = part.keys.map((k) => site.decls.find((d) => d.key === k)).filter((d): d is SettingDecl => !!d);
      out.push({ kind: "settings", key: part.key, title: part.title ?? null, declared: decls, values: Object.fromEntries(decls.map((d) => [d.key, site.values[d.key]])), canWrite: may.writeSettings });
    } else {
      // A quick action is shown with whether it would change anything now ("close booking" while it is closed: done).
      out.push({ kind: "actions", key: part.key, title: part.title ?? null, items: part.items.map((a) => ({ key: a.key, label: a.label, note: a.note ?? null, setting: a.setting, value: a.value, done: site.values[a.setting] === a.value })) });
    }
  }
  return { featureId: site.featureId, name: site.name, enabled: site.enabled, page: { key: page.key, name: page.name, icon: page.icon }, pages: pagesShown(site, may).map((p) => ({ key: p.key, name: p.name, icon: p.icon })), parts: out };
}
