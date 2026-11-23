/**
 * A whole site's panel (wave 1 of docs/sites-300-plan.ar.md): its own pages in the admin's menu, under the site's
 * name, made of the panel parts its file declares (admin studio/templates/sites):
 *   numbers   rows counted, in a window of days, next to the window before
 *   queue     rows waiting for a decision; a button sets the row's fields ("confirmed", "replied"); with `votes`,
 *             each member of the staff says yes or no once (lib/siteVotes.ts), and a button "after the votes"
 *             (accept) waits for as many yes as one of the site's settings says
 *   view      a saved table: columns, order
 *   settings  the site's settings form
 *   actions   quick actions that set a setting ("close online booking")
 *   chart     rows a day over the last days, split by a choice's options
 *   kanban    rows in columns by a choice's options, moved from one to another
 *   calendar  rows on a month by a date, moved to another day
 *   people    everything about one person (by phone or email) across the site's tables
 *   report    rows in a period counted by a choice's options, and the period's rows as a file
 *   map       rows with an address, each on a map
 *   scanner   a code read by the camera (or typed) finds a row, and buttons decide it
 *   game      a game server site's status now and its last 24 hours (lib/gameSites.ts), asked again in one tap
 *
 * A part names its site's tables by their keys in the file (`@table:bookings`); installed, they are the ids the
 * feature keeps (Installed.ids.table). Each part is shown only to a member who may read what it reads (a table's
 * rows: pages:read or that one table; the settings: features:read), and its buttons only to one who may change it.
 */
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { SETTING_KEY } from "./pageTree.js";
import { gridWhere, parseGridQuery, queryRows, type GridFilter, type GridRow } from "./dataQuery.js";
import { csvCell } from "./dataRows.js";
import { declsOf, valuesOf, type SettingDecl, type Values } from "./siteSettings.js";
import type { Field } from "./collectionTree.js";
import { gameView } from "./gameSites.js";
import { votesOn, type VoteView } from "./siteVotes.js";

export const PANEL_LIMITS = { pages: 8, parts: 12, numbers: 8, conds: 6, columns: 8, decisions: 4, actions: 8, rows: 50, people: 4, days: 90, month: 200, exportRows: 5000 } as const;
export const PANEL_ICONS = ["today", "lists", "settings", "calendar", "people", "chart"] as const;

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
const Columns = z.array(FieldId).min(1).max(PANEL_LIMITS.columns);

const NumberItem = z.object({ key: Key, label: Label, table: TableRef, where: Conds.optional(), window: z.enum(["today", "week", "month"]).optional(), compare: z.boolean().optional() }).strict();
// `afterVotes`: in a queue that counts votes, the button waits for enough yes (an application accepted).
const Decision = z.object({ key: Key, label: Label, set: z.record(FieldId, Scalar).refine((s) => Object.keys(s).length > 0 && Object.keys(s).length <= 4, "It sets one field or a few"), tone: z.enum(["good", "bad"]).optional(), afterVotes: z.boolean().optional() }).strict();
/** A queue whose rows the staff vote on; `need`: the site's number setting saying how many yes a button "after the votes" waits for. */
const Votes = z.object({ need: Key.optional() }).strict();
const Decisions = z.array(Decision).min(1).max(PANEL_LIMITS.decisions);
const Action = z.object({ key: Key, label: Label, note: Label.optional(), setting: Key, value: Scalar }).strict();
const Rows = z.number().int().min(1).max(PANEL_LIMITS.rows).optional();

export const PanelPartSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("numbers"), key: Key, items: z.array(NumberItem).min(1).max(PANEL_LIMITS.numbers) }).strict(),
  z.object({ kind: z.literal("queue"), key: Key, title: Label, table: TableRef, where: Conds, show: Columns, decisions: Decisions, empty: Label.optional(), limit: Rows, votes: Votes.optional() }).strict(),
  z.object({ kind: z.literal("view"), key: Key, title: Label, table: TableRef, where: Conds.optional(), columns: Columns, sort: z.object({ field: FieldId, dir: z.enum(["asc", "desc"]) }).strict().optional(), limit: Rows }).strict(),
  z.object({ kind: z.literal("settings"), key: Key, title: Label.optional(), keys: z.array(Key).min(1).max(40) }).strict(),
  z.object({ kind: z.literal("actions"), key: Key, title: Label.optional(), items: z.array(Action).min(1).max(PANEL_LIMITS.actions) }).strict(),
  z.object({ kind: z.literal("chart"), key: Key, title: Label, table: TableRef, where: Conds.optional(), days: z.number().int().min(7).max(PANEL_LIMITS.days).optional(), split: FieldId.optional() }).strict(),
  z.object({ kind: z.literal("kanban"), key: Key, title: Label, table: TableRef, where: Conds.optional(), field: FieldId, show: Columns, limit: Rows }).strict(),
  z.object({ kind: z.literal("calendar"), key: Key, title: Label, table: TableRef, where: Conds.optional(), date: FieldId, show: Columns, color: FieldId.optional() }).strict(),
  z.object({ kind: z.literal("people"), key: Key, title: Label, by: FieldId, name: FieldId.optional(), tables: z.array(z.object({ table: TableRef, title: Label, show: Columns }).strict()).min(1).max(PANEL_LIMITS.people) }).strict(),
  z.object({ kind: z.literal("report"), key: Key, title: Label, table: TableRef, where: Conds.optional(), by: FieldId, columns: Columns }).strict(),
  z.object({ kind: z.literal("map"), key: Key, title: Label, table: TableRef, where: Conds.optional(), label: FieldId, address: FieldId, show: z.array(FieldId).max(PANEL_LIMITS.columns).optional() }).strict(),
  z.object({ kind: z.literal("scanner"), key: Key, title: Label, table: TableRef, match: FieldId, show: Columns, decisions: Decisions }).strict(),
  z.object({ kind: z.literal("game"), key: Key, title: Label }).strict(),
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
type Kind = "select" | "date";

/** What a part reads: its tables (by their keys in the file), the fields of each, and the fields that must be of a kind. */
function readsOf(part: PanelPart): Array<{ table: string; fields: string[]; kinds?: Array<[string, Kind]> }> {
  const fieldsOf = (conds?: Array<{ field: string }>) => (conds ?? []).map((c) => c.field);
  switch (part.kind) {
    case "numbers":
      return part.items.map((i) => ({ table: i.table, fields: fieldsOf(i.where) }));
    case "queue":
      return [{ table: part.table, fields: [...fieldsOf(part.where), ...part.show, ...part.decisions.flatMap((d) => Object.keys(d.set))] }];
    case "view":
      return [{ table: part.table, fields: [...fieldsOf(part.where), ...part.columns, ...(part.sort ? [part.sort.field] : [])] }];
    case "chart":
      return [{ table: part.table, fields: [...fieldsOf(part.where), ...(part.split ? [part.split] : [])], kinds: part.split ? [[part.split, "select"]] : [] }];
    case "kanban":
      return [{ table: part.table, fields: [...fieldsOf(part.where), part.field, ...part.show], kinds: [[part.field, "select"]] }];
    case "calendar":
      return [{ table: part.table, fields: [...fieldsOf(part.where), part.date, ...part.show, ...(part.color ? [part.color] : [])], kinds: [[part.date, "date"], ...(part.color ? ([[part.color, "select"]] as Array<[string, Kind]>) : [])] }];
    case "people":
      return part.tables.map((t) => ({ table: t.table, fields: [part.by, ...(part.name ? [part.name] : []), ...t.show] }));
    case "report":
      return [{ table: part.table, fields: [...fieldsOf(part.where), part.by, ...part.columns], kinds: [[part.by, "select"]] }];
    case "map":
      return [{ table: part.table, fields: [...fieldsOf(part.where), part.label, part.address, ...(part.show ?? [])] }];
    case "scanner":
      return [{ table: part.table, fields: [part.match, ...part.show, ...part.decisions.flatMap((d) => Object.keys(d.set))] }];
    default:
      return [];
  }
}
const isKind = (type: string | undefined, kind: Kind, id: string) => (kind === "select" ? type === "select" : id === "$createdAt" || id === "$updatedAt" || type === "date" || type === "datetime");

/**
 * Where a site's panel talks about what its file doesn't hold: a table that isn't one of its tables, a field its
 * table hasn't (or not of the kind the part needs: a choice for columns, a date for a calendar), a setting it doesn't
 * declare. (Said when the file is read: an install never brings a panel that can't be drawn.)
 */
export function panelProblems(panel: Panel, tables: Array<{ key: string; fields: unknown[] }>, settings: string[]): Array<{ at: string; message: string }> {
  const out: Array<{ at: string; message: string }> = [];
  const byKey = new Map(tables.map((t) => [t.key, new Map(t.fields.map((f) => (f && typeof f === "object" ? [String((f as { id?: unknown }).id), String((f as { type?: unknown }).type)] : ["", ""])))]));
  panel.forEach((page, i) =>
    page.parts.forEach((part, j) => {
      const at = `panel.${i}.parts.${j}`;
      for (const read of readsOf(part)) {
        const key = tableKeyOf(read.table) ?? "";
        const fields = byKey.get(key);
        if (!fields) {
          out.push({ at, message: `"${part.key}" reads "${key}", which isn't one of the site's tables` });
          continue;
        }
        for (const f of read.fields.filter(own)) if (!fields.has(f)) out.push({ at, message: `"${part.key}": the table "${key}" has no field "${f}"` });
        for (const [f, kind] of read.kinds ?? []) if ((!own(f) || fields.has(f)) && !isKind(fields.get(f), kind, f)) out.push({ at, message: `"${part.key}": "${f}" isn't ${kind === "select" ? "a choice" : "a date"}` });
      }
      const keys = part.kind === "settings" ? part.keys : part.kind === "actions" ? part.items.map((a) => a.setting) : part.kind === "queue" && part.votes?.need ? [part.votes.need] : [];
      for (const k of keys) if (!settings.includes(k)) out.push({ at, message: `"${part.key}" names "${k}", which isn't one of the site's settings` });
      if ((part.kind === "queue" || part.kind === "scanner") && !(part.kind === "queue" && part.votes) && part.decisions.some((d) => d.afterVotes)) out.push({ at, message: `"${part.key}": a button waits for votes in a queue that counts them` });
    }),
  );
  return out;
}

/* ---------------- The panels here ---------------- */

/** A site installed here with a panel: its file's panel, its tables' ids by key, its settings. */
/**
 * A whole site's panel as its owner arranged it (Feature.panelLayout), by page: the parts' order (the keys it
 * names come first, in its order; the file's parts it doesn't name keep theirs after them, so an upgrade's new parts
 * show), the parts it hides, and parts of the owner's own (a number, a saved table, a chart… over the site's tables;
 * their keys start with "my"). The file's own panel is never changed.
 */
export const OWN_PART = /^my[a-z0-9]{1,20}$/;
const PageLayout = z
  .object({ order: z.array(Key).max(60).optional(), hidden: z.array(Key).max(60).optional(), own: z.array(PanelPartSchema).max(PANEL_LIMITS.parts).optional() })
  .strict();
export const PanelLayoutSchema = z.object({ pages: z.record(Key, PageLayout) }).strict();
export type PanelLayout = z.infer<typeof PanelLayoutSchema>;
export type PageLayout = z.infer<typeof PageLayout>;
/** A part as its page is arranged: the owner's own or the file's, hidden or shown. */
export type Arranged = { part: PanelPart; own: boolean; hidden: boolean };

/** Every part of a page as the owner arranged it, in their order, each said hidden or not. */
export function arranged(page: PanelPage, layout: PageLayout | undefined): Arranged[] {
  const own = (layout?.own ?? []).filter((p) => OWN_PART.test(p.key) && !page.parts.some((f) => f.key === p.key));
  const all = [...page.parts.map((part) => ({ part, own: false })), ...own.map((part) => ({ part, own: true }))];
  const order = layout?.order ?? [];
  const hidden = new Set(layout?.hidden ?? []);
  const at = (key: string, i: number) => (order.includes(key) ? order.indexOf(key) : order.length + i);
  return all.map((x, i) => ({ ...x, hidden: hidden.has(x.part.key), i })).sort((a, b) => at(a.part.key, a.i) - at(b.part.key, b.i)).map(({ part, own, hidden }) => ({ part, own, hidden }));
}

export type SitePanel = {
  featureId: string;
  name: string;
  enabled: boolean;
  /** Its pages as arranged: the parts shown, in the owner's order. */
  panel: Array<Omit<PanelPage, "parts"> & { parts: PanelPart[] }>;
  /** Every part of each page as arranged, hidden ones too (for whoever arranges it). */
  arrange: Record<string, Arranged[]>;
  layout: PanelLayout | null;
  tables: Record<string, string>;
  decls: SettingDecl[];
  values: Values;
};

/** Every site installed here with a panel, in the order they were installed. Only the parts of each file it needs are read. */
export async function sitePanels(featureId?: string): Promise<SitePanel[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string; name: string; enabled: boolean; panel: unknown; tables: unknown; decls: unknown; settings: unknown; layout: unknown }>>`
    SELECT "id", "name", "enabled", "template"->'file'->'panel' AS "panel", "template"->'ids'->'table' AS "tables", "template"->'file'->'settings' AS "decls", "settings", "panelLayout" AS "layout"
    FROM "Feature" WHERE jsonb_typeof("template"->'file'->'panel') = 'array' ORDER BY "createdAt" ASC, "id" ASC`;
  const out: SitePanel[] = [];
  for (const r of rows) {
    if (featureId && r.id !== featureId) continue;
    const panel = PanelSchema.safeParse(r.panel);
    if (!panel.success || !panel.data.length) continue;
    const tables = r.tables && typeof r.tables === "object" ? (Object.fromEntries(Object.entries(r.tables as Record<string, unknown>).filter(([, v]) => typeof v === "string")) as Record<string, string>) : {};
    const decls = declsOf(r.decls);
    // An arrangement that no longer reads (a part's shape changed) is set aside: the file's panel as it is.
    const read = PanelLayoutSchema.safeParse(r.layout);
    const layout = read.success ? read.data : null;
    const arrange = Object.fromEntries(panel.data.map((p) => [p.key, arranged(p, layout?.pages[p.key])]));
    const shown = panel.data.map((p) => ({ ...p, parts: arrange[p.key].filter((x) => !x.hidden).map((x) => x.part) }));
    out.push({ featureId: r.id, name: r.name, enabled: r.enabled, panel: shown, arrange, layout, tables, decls, values: valuesOf(decls, r.settings) });
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
/** The id here of a part's own (first) table. */
export const tableIdOf = (site: SitePanel, ref: string) => site.tables[tableKeyOf(ref) ?? ""] ?? null;
/** Whether a member sees a part at all (numbers: when they may read one of its tables; a person's page: one of its tables). */
export function partShown(site: SitePanel, part: PanelPart, may: PanelRights): boolean {
  if (part.kind === "settings") return may.readSettings;
  if (part.kind === "actions") return may.writeSettings;
  // A game server's status is the server's own news, not a table's rows: every member who opens the panel.
  if (part.kind === "game") return true;
  if (part.kind === "numbers" || part.kind === "people") {
    const refs = part.kind === "numbers" ? part.items.map((i) => i.table) : part.tables.map((t) => t.table);
    return refs.some((ref) => {
      const id = tableIdOf(site, ref);
      return !!id && may.readTable(id);
    });
  }
  const ids = idsOf(site, part);
  return !!ids && ids.every(may.readTable);
}
/** A site's pages this member sees (a page with no part they may see isn't one of them). */
/** A site's pages this member sees (a page with no part they may see isn't one of them; whoever arranges it still sees a page whose parts are all hidden). */
export const pagesShown = (site: SitePanel, may: PanelRights) => site.panel.filter((p) => p.parts.some((part) => partShown(site, part, may)) || (may.writeSettings && (site.arrange[p.key] ?? []).length > 0));

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
  // The shopper who added the row (through the shop: an application, a report): their name, email, Discord and Steam.
  $by: { type: "$person", name: { ar: "مين", en: "Who", he: "מי" } },
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
/** A choice field's options, in its own order. */
const optionsOf = (table: TableHere, id: string) => ((table.fields.find((x) => x.id === id) as { options?: Array<{ id: string; name?: unknown }> } | undefined)?.options ?? []).map((o) => ({ id: o.id, name: o.name ?? null }));
/** A row as a part shows it: the asked cells only (who added it by their id, until `withPeople` names them). */
function cellsOf(row: Pick<GridRow, "id" | "data" | "status" | "createdAt" | "updatedAt" | "ownerId">, ids: string[]) {
  const sys: Record<string, unknown> = { $createdAt: new Date(row.createdAt).toISOString(), $updatedAt: new Date(row.updatedAt).toISOString(), $status: row.status, $by: row.ownerId ?? null };
  return { id: row.id, cells: Object.fromEntries(ids.map((id) => [id, id in sys ? sys[id] : (row.data?.[id] ?? null)])) };
}
type Cells = ReturnType<typeof cellsOf>;
/** Who added a row, as the panel shows them (to the store's own members): their name, email, and game accounts. */
export type Person = { name: string; email: string; discordId: string | null; steamId: string | null };
/** The rows' "who" cells, from the shoppers' ids to the shoppers (one question for all of them). */
async function withPeople(rows: Cells[]): Promise<void> {
  const ids = [...new Set(rows.map((r) => r.cells.$by).filter((v): v is string => typeof v === "string" && !!v))];
  if (!ids.length) return;
  const found = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true, discordId: true, steamId: true } });
  const byId = new Map(found.map((u) => [u.id, { name: u.name, email: u.email, discordId: u.discordId, steamId: u.steamId } satisfies Person]));
  for (const r of rows) if ("$by" in r.cells) r.cells.$by = typeof r.cells.$by === "string" ? (byId.get(r.cells.$by) ?? null) : null;
}

export async function tablesHere(ids: string[]): Promise<Map<string, TableHere>> {
  const found = await prisma.collection.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, slug: true, name: true, fields: true } });
  return new Map(found.map((t) => [t.id, { id: t.id, slug: t.slug, name: t.name, fields: (Array.isArray(t.fields) ? t.fields : []) as Field[] }]));
}

/** Rows of a table as the grid asks them (null: they can't be asked, a field changed since the site was installed). */
async function rowsOf(table: TableHere, q: Record<string, unknown>, only?: Prisma.Sql): Promise<{ rows: GridRow[]; total: number } | null> {
  try {
    return await queryRows(prisma, table, parseGridQuery(q), only);
  } catch {
    return null;
  }
}
async function count(table: TableHere, filters: GridFilter[]): Promise<number | null> {
  return (await rowsOf(table, { pageSize: 1, filters }))?.total ?? null;
}
/** How many rows match, by a day and/or a choice's option (one database question). */
async function grouped(table: TableHere, filters: GridFilter[], by: { day?: boolean; field?: string }): Promise<Array<{ day: string | null; part: string | null; n: number }> | null> {
  try {
    const where = gridWhere(table.id, table.fields, parseGridQuery({ filters }));
    const day = by.day ? Prisma.sql`to_char(i."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')` : Prisma.sql`NULL`;
    const part = by.field ? Prisma.sql`i."data"->>${by.field}` : Prisma.sql`NULL`;
    return await prisma.$queryRaw<Array<{ day: string | null; part: string | null; n: number }>>(Prisma.sql`SELECT ${day} AS "day", ${part} AS "part", count(*)::int AS "n" FROM "CollectionItem" i WHERE ${where} GROUP BY 1, 2`);
  } catch {
    return null;
  }
}

/** A report's periods: this week, this month, the month before, the last 90 days. */
export const PERIODS = ["week", "month", "lastMonth", "quarter"] as const;
export type Period = (typeof PERIODS)[number];
export function periodRange(period: Period, now: number): { from: string; to: string } {
  const d = new Date(now);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  if (period === "month") return { from: ymd(Date.UTC(y, m, 1)), to: ymd(now) };
  if (period === "lastMonth") return { from: ymd(Date.UTC(y, m - 1, 1)), to: ymd(Date.UTC(y, m, 0)) };
  return { from: ymd(now - ((period === "week" ? 7 : 90) - 1) * DAY), to: ymd(now) };
}
const periodFilter = (r: { from: string; to: string }): GridFilter => ({ field: "$createdAt", op: "between", value: r.from, value2: r.to });
/** A calendar's month ("2026-11"): its first and last day. */
export function monthRange(month: string | undefined, now: number): { month: string; from: string; to: string } {
  const ok = month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : ymd(now).slice(0, 7);
  const [y, m] = ok.split("-").map(Number);
  return { month: ok, from: ymd(Date.UTC(y, m - 1, 1)), to: ymd(Date.UTC(y, m, 0)) };
}

/** `member`: who is looking (their own vote on a row is said). */
export type ViewOpts = { lang: Lang; now?: number; month?: string; period?: string; member?: string | null };

/** One page of a site's panel as this member sees it, each part with what it shows now. */
export async function pageView(site: SitePanel, page: SitePanel["panel"][number], may: PanelRights, opts: ViewOpts) {
  const now = opts.now ?? Date.now();
  const parts = page.parts.filter((p) => partShown(site, p, may));
  const ids = parts.flatMap((p) => readsOf(p).map((r) => site.tables[tableKeyOf(r.table) ?? ""])).filter((x): x is string => !!x);
  const tables = await tablesHere(ids);
  const tableOf = (ref: string) => tables.get(tableIdOf(site, ref) ?? "") ?? null;
  const tableView = (t: TableHere) => ({ id: t.id, slug: t.slug, name: t.name });
  const period: Period = (PERIODS as readonly string[]).includes(opts.period ?? "") ? (opts.period as Period) : "month";

  const out: unknown[] = [];
  // Every row shown on the page, so who added each is named at the end in one question.
  const seen: Cells[] = [];
  const shape = (rows: GridRow[] | undefined, ids: string[]) => {
    const cells = (rows ?? []).map((r) => cellsOf(r, ids));
    seen.push(...cells);
    return cells;
  };
  for (const part of parts) {
    const t = "table" in part ? tableOf(part.table) : null;
    if (part.kind === "numbers") {
      const items = [];
      for (const i of part.items) {
        const it = tableOf(i.table);
        if (!it || !may.readTable(it.id)) continue;
        const days = i.window ? WINDOW_DAYS[i.window] : 0;
        const base = filtersOf(i.where);
        const value = await count(it, days ? [...base, windowFilter(days, now)] : base);
        const before = days && i.compare ? await count(it, [...base, windowFilter(days, now, true)]) : undefined;
        items.push({ key: i.key, label: i.label, value, ...(i.window ? { window: i.window } : {}), ...(before !== undefined ? { before } : {}), table: tableView(it) });
      }
      out.push({ kind: "numbers", key: part.key, items });
    } else if ((part.kind === "queue" || part.kind === "view") && t) {
      const shown = part.kind === "queue" ? part.show : part.columns;
      const sort = part.kind === "queue" ? [{ field: "$createdAt", dir: "asc" as const }] : part.sort ? [part.sort] : [];
      const got = await rowsOf(t, { pageSize: part.limit ?? (part.kind === "queue" ? 10 : 20), filters: filtersOf(part.where), sort, lang: opts.lang });
      const common = { key: part.key, title: part.title, table: tableView(t), columns: columnsOf(t, shown), rows: shape(got?.rows, shown) as Array<Cells & { votes?: VoteView }>, total: got?.total ?? 0, ...(got ? {} : { problem: "It can't be read" }) };
      if (part.kind === "queue" && part.votes) {
        const votes = await votesOn(common.rows.map((r) => r.id), opts.member ?? null);
        for (const r of common.rows) r.votes = votes.get(r.id);
      }
      out.push(part.kind === "queue" ? { kind: "queue", ...common, decisions: part.decisions.map((d) => ({ key: d.key, label: d.label, ...(d.tone ? { tone: d.tone } : {}), ...(d.afterVotes && part.votes ? { afterVotes: true } : {}) })), canDecide: may.writeTable(t.id), empty: part.empty ?? null, ...(part.votes ? { votes: { need: needOf(site, part) } } : {}) } : { kind: "view", ...common });
    } else if (part.kind === "settings") {
      const decls = part.keys.map((k) => site.decls.find((d) => d.key === k)).filter((d): d is SettingDecl => !!d);
      out.push({ kind: "settings", key: part.key, title: part.title ?? null, declared: decls, values: Object.fromEntries(decls.map((d) => [d.key, site.values[d.key]])), canWrite: may.writeSettings });
    } else if (part.kind === "actions") {
      // A quick action is shown with whether it would change anything now ("close booking" while it is closed: done).
      out.push({ kind: "actions", key: part.key, title: part.title ?? null, items: part.items.map((a) => ({ key: a.key, label: a.label, note: a.note ?? null, setting: a.setting, value: a.value, done: site.values[a.setting] === a.value })) });
    } else if (part.kind === "chart" && t) {
      const days = part.days ?? 30;
      const counts = await grouped(t, [...filtersOf(part.where), windowFilter(days, now)], { day: true, field: part.split });
      const series = Array.from({ length: days }, (_, k) => ymd(now - (days - 1 - k) * DAY)).map((day) => {
        const hits = (counts ?? []).filter((c) => c.day === day);
        return { day, total: hits.reduce((s, c) => s + c.n, 0), ...(part.split ? { parts: Object.fromEntries(hits.map((c) => [c.part ?? "", c.n])) } : {}) };
      });
      out.push({ kind: "chart", key: part.key, title: part.title, table: tableView(t), days: series, ...(part.split ? { options: optionsOf(t, part.split) } : {}), ...(counts ? {} : { problem: "It can't be read" }) });
    } else if (part.kind === "kanban" && t) {
      const columns = [];
      for (const o of optionsOf(t, part.field)) {
        const got = await rowsOf(t, { pageSize: part.limit ?? 20, filters: [...filtersOf(part.where), { field: part.field, op: "is", value: o.id }], sort: [{ field: "$createdAt", dir: "desc" }], lang: opts.lang });
        columns.push({ id: o.id, name: o.name, rows: shape(got?.rows, part.show), total: got?.total ?? 0 });
      }
      out.push({ kind: "kanban", key: part.key, title: part.title, table: tableView(t), field: part.field, columns, show: columnsOf(t, part.show), canMove: may.writeTable(t.id) });
    } else if (part.kind === "calendar" && t) {
      const range = monthRange(opts.month, now);
      const shown = [...new Set([part.date, ...part.show, ...(part.color ? [part.color] : [])])];
      const got = await rowsOf(t, { pageSize: PANEL_LIMITS.month, filters: [...filtersOf(part.where), { field: part.date, op: "between", value: range.from, value2: range.to }], sort: [{ field: part.date, dir: "asc" }], lang: opts.lang });
      out.push({ kind: "calendar", key: part.key, title: part.title, table: tableView(t), month: range.month, date: part.date, ...(part.color ? { color: part.color, options: optionsOf(t, part.color) } : {}), show: columnsOf(t, part.show), rows: shape(got?.rows, shown), total: got?.total ?? 0, canMove: may.writeTable(t.id) && own(part.date) });
    } else if (part.kind === "people") {
      out.push({ kind: "people", key: part.key, title: part.title, by: part.by });
    } else if (part.kind === "report" && t) {
      const range = periodRange(period, now);
      const counts = await grouped(t, [...filtersOf(part.where), periodFilter(range)], { field: part.by });
      const options = optionsOf(t, part.by);
      const groups = [...options.map((o) => ({ id: o.id, name: o.name, n: counts?.find((c) => c.part === o.id)?.n ?? 0 })), { id: "", name: null, n: (counts ?? []).filter((c) => !options.some((o) => o.id === c.part)).reduce((s, c) => s + c.n, 0) }].filter((g) => g.id || g.n);
      out.push({ kind: "report", key: part.key, title: part.title, table: tableView(t), period, from: range.from, to: range.to, groups, total: groups.reduce((s, g) => s + g.n, 0), ...(counts ? {} : { problem: "It can't be read" }) });
    } else if (part.kind === "map" && t) {
      const shown = [part.label, part.address, ...(part.show ?? [])];
      const got = await rowsOf(t, { pageSize: PANEL_LIMITS.rows, filters: [...filtersOf(part.where), { field: part.address, op: "notEmpty" }], lang: opts.lang });
      out.push({ kind: "map", key: part.key, title: part.title, table: tableView(t), label: part.label, address: part.address, columns: columnsOf(t, shown), rows: shape(got?.rows, shown) });
    } else if (part.kind === "game") {
      out.push({ kind: "game", key: part.key, title: part.title, status: await gameView(site.featureId), canCheck: may.writeSettings });
    } else if (part.kind === "scanner" && t) {
      out.push({ kind: "scanner", key: part.key, title: part.title, table: tableView(t), columns: columnsOf(t, part.show), decisions: part.decisions.map((d) => ({ key: d.key, label: d.label, ...(d.tone ? { tone: d.tone } : {}) })), canDecide: may.writeTable(t.id) });
    }
  }
  await withPeople(seen);
  return {
    featureId: site.featureId,
    name: site.name,
    enabled: site.enabled,
    page: { key: page.key, name: page.name, icon: page.icon },
    pages: pagesShown(site, may).map((p) => ({ key: p.key, name: p.name, icon: p.icon })),
    parts: out,
    // Whoever may change the site's settings arranges its panel: every part of the page, and the site's tables to build their own from.
    ...(may.writeSettings ? { arrange: await arrangeView(site, page.key) } : {}),
  };
}

/** How many yes a queue's buttons "after the votes" wait for: its site's setting (a whole number, 0 or more), else one. */
export function needOf(site: SitePanel, part: Extract<PanelPart, { kind: "queue" }>): number {
  const v = part.votes?.need ? site.values[part.votes.need] : undefined;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), 50) : 1;
}

/** A part's name on the owner's list: its title, else its first number's, else none (the admin names it by its kind). */
const labelOf = (part: PanelPart) => ("title" in part && part.title ? part.title : part.kind === "numbers" ? part.items[0]?.label ?? null : null);

/** What arranging a page needs: its parts (hidden ones too) and the site's tables with their fields, to build a part from. */
async function arrangeView(site: SitePanel, pageKey: string) {
  const found = await tablesHere(Object.values(site.tables));
  const tables = Object.entries(site.tables).flatMap(([key, id]) => {
    const t = found.get(id);
    return t ? [{ key, ref: `@table:${key}`, slug: t.slug, name: t.name, fields: t.fields.filter((f) => f.type !== "relation").map((f) => ({ id: f.id, type: f.type, name: (f as { name?: unknown }).name ?? null, ...(Array.isArray((f as { options?: unknown }).options) ? { options: (f as { options: unknown[] }).options } : {}) })) }] : [];
  });
  return { parts: (site.arrange[pageKey] ?? []).map((x) => ({ key: x.part.key, kind: x.part.kind, label: labelOf(x.part), hidden: x.hidden, own: x.own, ...(x.own ? { part: x.part } : {}) })), tables };
}

/** The owner's arrangement of one page, checked: the keys it orders and hides are the page's, its own parts read the site's tables, fields and settings. */
export async function saveLayout(site: SitePanel, pageKey: string, asked: unknown): Promise<{ ok: true } | { ok: false; problems: Array<{ at: string; message: string }> }> {
  const read = PageLayout.safeParse(asked);
  if (!read.success) return { ok: false, problems: read.error.issues.map((i) => ({ at: i.path.join("."), message: i.message })) };
  const next = read.data;
  const fileParts = (site.arrange[pageKey] ?? []).filter((x) => !x.own).map((x) => x.part.key);
  const own = next.own ?? [];
  const problems: Array<{ at: string; message: string }> = [];
  own.forEach((p, i) => {
    if (!OWN_PART.test(p.key)) problems.push({ at: `own.${i}.key`, message: `An own part's key is "my" and small letters or digits` });
    if (fileParts.includes(p.key) || own.findIndex((x) => x.key === p.key) !== i) problems.push({ at: `own.${i}.key`, message: `Two parts have the key "${p.key}"` });
    // Only parts that read the site's tables: the settings and the quick actions are the file's.
    if (p.kind === "settings" || p.kind === "actions") problems.push({ at: `own.${i}.kind`, message: `A "${p.kind}" part is the site's own` });
  });
  const keys = new Set([...fileParts, ...own.map((p) => p.key)]);
  for (const k of [...(next.order ?? []), ...(next.hidden ?? [])]) if (!keys.has(k)) problems.push({ at: "order", message: `This page has no part "${k}"` });
  if (own.length) {
    const found = await tablesHere(Object.values(site.tables));
    const tables = Object.entries(site.tables).map(([key, id]) => ({ key, fields: found.get(id)?.fields ?? [] }));
    for (const p of panelProblems([{ key: pageKey, name: {}, icon: "today", parts: own }], tables, site.decls.map((d) => d.key))) problems.push({ at: p.at.replace(/^panel\.0\.parts/, "own"), message: p.message });
  }
  if (problems.length) return { ok: false, problems };
  const layout: PanelLayout = { pages: { ...(site.layout?.pages ?? {}), [pageKey]: { ...(next.order?.length ? { order: next.order } : {}), ...(next.hidden?.length ? { hidden: next.hidden } : {}), ...(own.length ? { own } : {}) } } };
  await prisma.feature.update({ where: { id: site.featureId }, data: { panelLayout: layout as Prisma.InputJsonValue } });
  return { ok: true };
}

/* ---------------- A part's own questions ---------------- */

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const wordsOf = (v: unknown, lang: Lang): string => {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    return String(o[lang] ?? o.ar ?? o.en ?? o.he ?? "");
  }
  return v === null || v === undefined ? "" : String(v);
};

/**
 * A person's page: the rows of the part's tables whose person field (a phone, an email) or name holds `q`, grouped
 * by the person (a phone by its digits, else by its words), the newest first. Only the tables this member may read.
 */
export async function peopleSearch(site: SitePanel, part: Extract<PanelPart, { kind: "people" }>, may: PanelRights, q: string, lang: Lang) {
  const asked = q.trim().slice(0, 60);
  if (asked.length < 2) return { people: [] };
  const allowed = part.tables.map((x) => ({ ...x, id: tableIdOf(site, x.table) })).filter((x): x is typeof x & { id: string } => !!x.id && may.readTable(x.id));
  const tables = await tablesHere(allowed.map((x) => x.id));
  const people = new Map<string, { key: string; by: string; name: string; last: string; tables: Array<{ table: unknown; title: unknown; columns: Column[]; rows: Array<{ id: string; cells: Record<string, unknown> }> }> }>();
  for (const x of allowed) {
    const t = tables.get(x.id);
    if (!t) continue;
    // A number (4 digits or more) is looked for in the person field's digits, however it was written ("050-123-4567");
    // else in their name or the field's words.
    const wanted = digits(asked);
    const byDigits = wanted.length >= 4 ? Prisma.sql`regexp_replace(coalesce(i."data"->>${part.by}, ''), '[^0-9]', '', 'g') LIKE ${`%${wanted}%`}` : undefined;
    const filters: GridFilter[] = byDigits ? [] : [{ field: part.by, op: "contains", value: asked }, ...(part.name ? [{ field: part.name, op: "contains" as const, value: asked }] : [])];
    const got = await rowsOf(t, { pageSize: PANEL_LIMITS.rows, filters, match: "any", sort: [{ field: "$createdAt", dir: "desc" }], lang }, byDigits);
    const shown = [...new Set([...x.show])];
    for (const row of got?.rows ?? []) {
      const by = wordsOf(row.data?.[part.by], lang).trim();
      const key = digits(by).length >= 6 ? digits(by) : by.toLowerCase();
      if (!key) continue;
      const at = new Date(row.createdAt).toISOString();
      const person = people.get(key) ?? { key, by, name: "", last: at, tables: [] };
      if (!person.name && part.name) person.name = wordsOf(row.data?.[part.name], lang).trim();
      if (at > person.last) person.last = at;
      let group = person.tables.find((g) => (g.table as { id: string }).id === t.id);
      if (!group) person.tables.push((group = { table: { id: t.id, slug: t.slug, name: t.name }, title: x.title, columns: columnsOf(t, shown), rows: [] }));
      group.rows.push(cellsOf(row, shown));
      people.set(key, person);
    }
  }
  const found = [...people.values()].sort((a, b) => b.last.localeCompare(a.last)).slice(0, 20);
  await withPeople(found.flatMap((p) => p.tables.flatMap((g) => g.rows as Cells[])));
  return { people: found };
}

/** A scanner's code: the row of its table whose field (or address) is the code, as the part shows it. */
export async function findByCode(site: SitePanel, part: Extract<PanelPart, { kind: "scanner" }>, code: string) {
  const t = (await tablesHere([tableIdOf(site, part.table) ?? ""])).get(tableIdOf(site, part.table) ?? "");
  const asked = code.trim().slice(0, 200);
  if (!t || !asked) return null;
  // A code may be the row's address in a link (…/tickets/ab12): its last part.
  const value = part.match === "$slug" ? (asked.split("/").filter(Boolean).pop() ?? asked).toLowerCase() : asked;
  const got = await rowsOf(t, { pageSize: 1, filters: [{ field: part.match, op: "is", value }] });
  const row = got?.rows[0];
  if (!row) return null;
  const cells = cellsOf(row, part.show);
  await withPeople([cells]);
  return cells;
}

/** A report's period as a file: its rows, the part's columns in words, a spreadsheet's way (a header, then a line a row). */
export async function reportCsv(site: SitePanel, part: Extract<PanelPart, { kind: "report" }>, period: string | undefined, lang: Lang, now = Date.now()): Promise<{ name: string; body: string }> {
  const t = (await tablesHere([tableIdOf(site, part.table) ?? ""])).get(tableIdOf(site, part.table) ?? "");
  if (!t) return { name: "report.csv", body: "" };
  const p: Period = (PERIODS as readonly string[]).includes(period ?? "") ? (period as Period) : "month";
  const range = periodRange(p, now);
  const columns = columnsOf(t, part.columns);
  const text = (c: Column, v: unknown) => {
    if (v === null || v === undefined) return "";
    if (c.type === "select") return wordsOf((c.options as Array<{ id: string; name?: unknown }> | undefined)?.find((o) => o.id === v)?.name, lang) || String(v);
    if (c.type === "$person" && typeof v === "object") return [(v as Person).name, (v as Person).email].filter(Boolean).join(" ");
    return wordsOf(v, lang);
  };
  const lines = [columns.map((c) => csvCell(wordsOf(c.name, lang) || c.id, true)).join(",")];
  for (let page = 1; lines.length <= PANEL_LIMITS.exportRows; page++) {
    const got = await rowsOf(t, { page, pageSize: 200, filters: [...filtersOf(part.where), periodFilter(range)], sort: [{ field: "$createdAt", dir: "asc" }], lang });
    const rows = (got?.rows ?? []).map((row) => cellsOf(row, part.columns));
    await withPeople(rows);
    for (const row of rows) lines.push(columns.map((c) => csvCell(text(c, row.cells[c.id]), true)).join(","));
    if (!got || got.rows.length < 200) break;
  }
  return { name: `${t.slug}-${range.from}-${range.to}.csv`, body: `${String.fromCodePoint(0xfeff)}${lines.join("\r\n")}\r\n` };
}
