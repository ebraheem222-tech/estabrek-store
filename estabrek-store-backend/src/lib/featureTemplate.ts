/**
 * A feature template (stage 4, T; admin → ميزاتي): one feature (its tables, its functions with what
 * starts them, its pages) written as one file with a version, to be put into another store. It is
 * installed as a draft, upgraded without losing the owner's own changes, and removed without a trace.
 * The database work is lib/featureInstall.ts; here is the file itself, pure.
 *
 * The file never holds a store's ids. Where a step, a relation, a row trigger or a page's list names
 * one of the file's own tables it writes "@table:<key>"; a step calling one of its functions writes
 * "@fn:<key>". Words that are addresses (a table's, a function's call address, a page's) are written as
 * they are: installing gives each one that is taken a free one (tickets → tickets-2) and writes the
 * new word wherever the file's own pages use it.
 *
 * What can't travel is left out on export and said (`notes`): a relation, a step or a list that
 * names something outside the feature, a ready connection (the other store connects its own), old
 * sections, saved blocks and components. The secrets and sites its functions name travel as names
 * only (`needs`): the other store keeps its own.
 */
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { AppError } from "../utils/httpError.js";
import { CollectionBody, COLLECTION_SLUG, LIMITS as TABLE_LIMITS, RESERVED_SLUGS } from "./collections.js";
import { CALL_SLUG, TRIGGER_KINDS, TRIGGER_LIMITS, configOf, routePath, routeSlug, type RouteConfig, type TriggerKind } from "./fnTriggers.js";
import { FnDefSchema, type FnDef } from "./fnDef.js";
import { TestsSchema } from "./fnTests.js";
import { SECRET_NAME, codeSecrets, hostIn, secretsIn } from "./fnSites.js";
import { SettingsSchema } from "./dataApi.js";
import { checkTree, type PageTree } from "./pageTree.js";
import { storeTarget } from "./storeLinks.js";
import { isStorePage } from "./featureGate.js";

export const TEMPLATE_FORMAT = "estabrek.feature" as const;
export const TEMPLATE_FORMAT_VERSION = 1 as const;
/** A file's size, and what one feature can hold (60 things in all: myFeatures FEATURE_LIMITS.items). */
export const TEMPLATE_LIMITS = { tables: 20, functions: 30, pages: 10, bytes: 1_500_000, needs: 20, notes: 60 } as const;

/** A thing's name inside the file: how its steps, lists and upgrades find it. */
export const TEMPLATE_KEY = /^[A-Za-z0-9][A-Za-z0-9_-]{0,40}$/;
/** A version: three numbers, 1.0.0. */
export const TEMPLATE_VERSION = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
/** A page's address in a template: words of small letters, digits and -, under the shop. */
export const TEMPLATE_PAGE_SLUG = /^\/[a-z0-9][a-z0-9-]{0,60}(\/[a-z0-9][a-z0-9-]{0,60}){0,3}$/;

const TABLE_REF = "@table:";
const FN_REF = "@fn:";
export const tableRef = (key: string) => `${TABLE_REF}${key}`;
export const fnRef = (key: string) => `${FN_REF}${key}`;
/** The key a reference names ("@table:tickets" → "tickets"), or null when it isn't one of this kind. */
export function refKey(value: unknown, kind: "table" | "fn"): string | null {
  const head = kind === "table" ? TABLE_REF : FN_REF;
  return typeof value === "string" && value.startsWith(head) ? value.slice(head.length) : null;
}

/* ---------------- The file ---------------- */

const Words = z.string().trim().max(300);
export const LocalSchema = z.object({ ar: Words.optional(), en: Words.optional(), he: Words.optional() }).strict();
export type Local = z.infer<typeof LocalSchema>;
const Key = z.string().regex(TEMPLATE_KEY, "A key is letters, digits, - and _");

const TemplateTable = z
  .object({
    key: Key,
    slug: z.string().regex(COLLECTION_SLUG, "A table's address is small letters, digits and -"),
    name: LocalSchema,
    // Checked as a table's fields are, once the file's references are put in.
    fields: z.array(z.unknown()).min(1).max(TABLE_LIMITS.fields),
    /** Who reaches it through the automatic API (lib/dataApi.ts), and its private fields. */
    api: z.unknown().optional(),
    /** Its rows' own page (a page tree), when it has one. */
    itemPage: z.unknown().optional(),
  })
  .strict();
const TemplateTrigger = z
  .object({
    kind: z.enum(TRIGGER_KINDS),
    config: z.unknown().optional(),
    /** A call's address (the owner's word). A webhook's is made new where it is installed. */
    slug: z.string().trim().toLowerCase().max(60).optional(),
    enabled: z.boolean().optional(),
  })
  .strict();
const TemplateFn = z
  .object({
    key: Key,
    name: z.string().trim().min(1).max(80),
    note: z.string().trim().max(300).optional(),
    /** Its steps (lib/fnDef.ts), with the file's references in them. */
    def: z.unknown(),
    tests: z.unknown().optional(),
    triggers: z.array(TemplateTrigger).max(TRIGGER_LIMITS.perFunction).optional(),
  })
  .strict();
const TemplatePage = z
  .object({
    key: Key,
    name: z.string().trim().min(1).max(120),
    slug: z.string().regex(TEMPLATE_PAGE_SLUG, "A page's address is like /my-tickets"),
    /** The page as the new editor keeps it (lib/pageTree.ts), with the file's references in it. */
    tree: z.unknown(),
    seo: z.object({ title: z.string().trim().max(120).optional(), description: z.string().trim().max(300).optional() }).strict().optional(),
  })
  .strict();

export const TemplateSchema = z
  .object({
    format: z.literal(TEMPLATE_FORMAT),
    formatVersion: z.literal(TEMPLATE_FORMAT_VERSION),
    key: Key,
    version: z.string().regex(TEMPLATE_VERSION, "A version is three numbers, like 1.0.0"),
    name: LocalSchema,
    note: LocalSchema.optional(),
    tables: z.array(TemplateTable).max(TEMPLATE_LIMITS.tables).default([]),
    functions: z.array(TemplateFn).max(TEMPLATE_LIMITS.functions).default([]),
    pages: z.array(TemplatePage).max(TEMPLATE_LIMITS.pages).default([]),
    /** What its functions name and the other store keeps for itself: secrets by name, sites by host. */
    needs: z.object({ secrets: z.array(z.string().regex(SECRET_NAME)).max(TEMPLATE_LIMITS.needs).default([]), sites: z.array(z.string().max(253)).max(TEMPLATE_LIMITS.needs).default([]) }).strict().optional(),
    exportedAt: z.string().max(40).optional(),
  })
  .strict()
  .superRefine((t, ctx) => {
    if (!Object.values(t.name).some((v) => v && v.trim())) ctx.addIssue({ code: "custom", path: ["name"], message: "A template has a name" });
    if (!t.tables.length && !t.functions.length && !t.pages.length) ctx.addIssue({ code: "custom", path: ["tables"], message: "A template holds something" });
    for (const [list, what] of [[t.tables, "tables"], [t.functions, "functions"], [t.pages, "pages"]] as const) {
      const keys = list.map((x) => x.key);
      keys.forEach((k, i) => {
        if (keys.indexOf(k) !== i) ctx.addIssue({ code: "custom", path: [what, i, "key"], message: `Two ${what} have the key "${k}"` });
      });
    }
    t.pages.forEach((p, i) => {
      if (isStorePage(p.slug)) ctx.addIssue({ code: "custom", path: ["pages", i, "slug"], message: "The home, the shop and the cart are the store's own pages" });
      else if (RESERVED_SLUGS.has(p.slug.split("/")[1] ?? "")) ctx.addIssue({ code: "custom", path: ["pages", i, "slug"], message: "The shop already uses this address" });
    });
  });
export type Template = z.infer<typeof TemplateSchema>;
export type TemplateTableIn = Template["tables"][number];
export type TemplateFnIn = Template["functions"][number];
export type TemplatePageIn = Template["pages"][number];

/** Read a file: the template, or where it is wrong (as "tables.0.slug"). */
export function readTemplate(raw: unknown): { ok: true; template: Template } | { ok: false; problems: Problem[] } {
  let size = Infinity;
  try {
    size = JSON.stringify(raw)?.length ?? Infinity;
  } catch {
    /* not JSON at all */
  }
  if (size > TEMPLATE_LIMITS.bytes) return { ok: false, problems: [{ at: "", message: `A template file is up to ${Math.round(TEMPLATE_LIMITS.bytes / 1_000_000)} MB` }] };
  const kind = raw && typeof raw === "object" ? (raw as { format?: unknown; formatVersion?: unknown }) : {};
  if (kind.format !== TEMPLATE_FORMAT) return { ok: false, problems: [{ at: "format", message: "This file isn't a feature template" }] };
  if (typeof kind.formatVersion === "number" && kind.formatVersion > TEMPLATE_FORMAT_VERSION) return { ok: false, problems: [{ at: "formatVersion", message: "This template was made by a newer version: update the store first" }] };
  const parsed = TemplateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, problems: parsed.error.issues.slice(0, 20).map((i) => ({ at: i.path.map(String).join("."), message: i.message })) };
  return { ok: true, template: parsed.data };
}

/** Which version is newer: below 0 when `a` is older than `b`, 0 when they are the same. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

/* ---------------- Walking what refers to what ---------------- */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const TABLE_ACTS = new Set(["find", "get", "add", "change", "delete"]);

/** Every step of a function's definition, with where it is ("do.2", "do.2.else.0"), however deep. */
export function eachStep(def: unknown, visit: (step: Obj, at: string) => void) {
  const list = (steps: unknown, at: string) => {
    if (!Array.isArray(steps)) return;
    steps.forEach((s, k) => {
      if (!isObj(s)) return;
      visit(s, `${at}.${k}`);
      if (s.act === "if") {
        list(s.do, `${at}.${k}.do`);
        list(s.else, `${at}.${k}.else`);
      } else if (s.act === "each") list(s.do, `${at}.${k}.do`);
    });
  };
  if (!isObj(def)) return;
  list(def.do, "do");
  list(def.else, "else");
  list(def.fail, "fail");
}

/** Every element of a page tree (its own children, and the inside of a list's card). */
export function eachNode(tree: unknown, visit: (node: Obj) => void) {
  const walk = (n: unknown, depth: number) => {
    if (!isObj(n) || depth > 40) return;
    visit(n);
    if (Array.isArray(n.children)) for (const c of n.children) walk(c, depth + 1);
  };
  if (isObj(tree)) walk(tree.root, 0);
}

/** Every thing inside a value, however deep (a page's recipes and forms hide in its elements' props). */
function eachObject(value: unknown, visit: (o: Obj) => void, depth = 0) {
  if (depth > 60) return;
  if (Array.isArray(value)) for (const v of value) eachObject(v, visit, depth + 1);
  else if (isObj(value)) {
    visit(value);
    for (const v of Object.values(value)) eachObject(v, visit, depth + 1);
  }
}

/** Takes out of a tree the elements `drop` says no to (with what is inside them). */
function pruned(tree: unknown, drop: (node: Obj) => boolean): unknown {
  const walk = (n: unknown): unknown => {
    if (!isObj(n)) return n;
    if (!Array.isArray(n.children)) return n;
    return { ...n, children: n.children.filter((c) => !(isObj(c) && drop(c))).map(walk) };
  };
  return isObj(tree) ? { ...tree, root: walk(tree.root) } : tree;
}

/**
 * The words a template's pages use as addresses, given new ones where installing had to: a form or a
 * button running a function by its call address, a form adding a row to a table by its address, and a
 * link to one of the template's own pages.
 */
export function renameWords(tree: unknown, words: { calls: Map<string, string>; tables: Map<string, string>; pages: Map<string, string> }): unknown {
  const copy = structuredClone(tree);
  eachObject(copy, (o) => {
    if (o.act === "fn" && typeof o.fn === "string" && words.calls.has(o.fn)) o.fn = words.calls.get(o.fn);
    if (o.to === "fn" && typeof o.fn === "string" && words.calls.has(o.fn)) o.fn = words.calls.get(o.fn);
    if (o.to === "table" && typeof o.table === "string" && words.tables.has(o.table)) o.table = words.tables.get(o.table);
    if (typeof o.href === "string" && words.pages.has(o.href)) o.href = words.pages.get(o.href);
  });
  return copy;
}

/* ---------------- Export: a feature as a file ---------------- */

/** What couldn't go into the file, said to the owner in their language by `what` (admin featuresText.ts). */
export type Note =
  | { what: "relationOut"; table: string; field: string }
  | { what: "stepTableOut" | "stepFnOut" | "readyOut"; fn: string; at: string }
  | { what: "triggerTableOut" | "webhookNew"; fn: string }
  | { what: "listOut" | "oldSections" | "blockOut" | "componentOut" | "oldPage"; page: string };

export type ExportTable = { id: string; slug: string; name: unknown; fields: unknown; api: unknown; itemPage?: PageTree | null };
export type ExportFn = { id: string; name: string; note: string | null; draft: unknown; tests: unknown; triggers: Array<{ kind: string; config: unknown; slug: string | null; enabled: boolean }> };
export type ExportPage = { id: string; name: string; slug: string; tree: PageTree | null; seoTitle?: string | null; seoDescription?: string | null };

const localOf = (v: unknown): Local => {
  const o = isObj(v) ? v : {};
  const out: Local = {};
  for (const l of ["ar", "en", "he"] as const) if (typeof o[l] === "string" && (o[l] as string).trim()) out[l] = (o[l] as string).trim().slice(0, 300);
  return out;
};

/**
 * A feature as a template file. `keyOf` gives each thing its key in the file (the template's own key
 * for a thing that came from one, so an upgrade finds it again; else its id here).
 */
export function toTemplate(input: { key: string; version: string; name: Local; note?: Local; tables: ExportTable[]; fns: ExportFn[]; pages: ExportPage[]; keyOf: (kind: "table" | "function" | "page", id: string) => string; now?: Date }): { template: Template; notes: Note[] } {
  const notes: Note[] = [];
  const note = (n: Note) => void (notes.length < TEMPLATE_LIMITS.notes && notes.push(n));
  const tableKey = new Map(input.tables.map((t) => [t.id, input.keyOf("table", t.id)]));
  const fnKey = new Map(input.fns.map((f) => [f.id, input.keyOf("function", f.id)]));
  const tableName = (t: ExportTable) => localOf(t.name).ar || localOf(t.name).en || localOf(t.name).he || t.slug;
  const swapTables = (tree: unknown, page: string) => {
    let out = pruned(tree, (n) => {
      if (n.type === "legacy") return note({ what: "oldSections", page }), true;
      if (n.type === "block") return note({ what: "blockOut", page }), true;
      if (n.type === "component") return note({ what: "componentOut", page }), true;
      if (n.type === "collectionList" && !tableKey.has(String((n.props as Obj | undefined)?.collectionId ?? ""))) return note({ what: "listOut", page }), true;
      return false;
    });
    out = structuredClone(out);
    eachNode(out, (n) => {
      if (n.type === "collectionList" && isObj(n.props)) n.props.collectionId = tableRef(tableKey.get(String(n.props.collectionId))!);
    });
    return out;
  };

  const tables = input.tables.map((t) => {
    const fields = (Array.isArray(t.fields) ? t.fields : []).filter((f) => {
      if (!isObj(f) || f.type !== "relation") return true;
      if (storeTarget(f.to) || tableKey.has(String(f.to))) return true;
      note({ what: "relationOut", table: tableName(t), field: String(f.id) });
      return false;
    });
    return {
      key: tableKey.get(t.id)!,
      slug: t.slug,
      name: localOf(t.name),
      fields: fields.map((f) => (isObj(f) && f.type === "relation" && tableKey.has(String(f.to)) ? { ...f, to: tableRef(tableKey.get(String(f.to))!) } : f)),
      ...(t.api ? { api: t.api } : {}),
      ...(t.itemPage ? { itemPage: swapTables(t.itemPage, tableName(t)) } : {}),
    };
  });

  const needs = { secrets: new Set<string>(), sites: new Set<string>() };
  const functions = input.fns.map((f) => {
    const def = structuredClone(f.draft ?? { inputs: [], do: [] });
    eachStep(def, (s, at) => {
      if (TABLE_ACTS.has(String(s.act)) && typeof s.table === "string" && s.table) {
        if (tableKey.has(s.table)) s.table = tableRef(tableKey.get(s.table)!);
        else (note({ what: "stepTableOut", fn: f.name, at }), (s.table = ""));
      }
      if (s.act === "call" && typeof s.fn === "string" && s.fn) {
        if (fnKey.has(s.fn)) s.fn = fnRef(fnKey.get(s.fn)!);
        else (note({ what: "stepFnOut", fn: f.name, at }), (s.fn = ""));
      }
      if (s.act === "ready" && typeof s.via === "string" && s.via) (note({ what: "readyOut", fn: f.name, at }), (s.via = ""));
    });
    needsOf([def], needs);
    type TriggerOut = { kind: TriggerKind; config: unknown; slug?: string; enabled: boolean };
    const triggers = f.triggers.flatMap((t): TriggerOut[] => {
      if (t.kind === "row") {
        const config = isObj(t.config) ? t.config : {};
        if (!tableKey.has(String(config.table))) return note({ what: "triggerTableOut", fn: f.name }), [];
        return [{ kind: "row", config: { ...config, table: tableRef(tableKey.get(String(config.table))!) }, enabled: t.enabled }];
      }
      if (t.kind === "webhook") note({ what: "webhookNew", fn: f.name });
      return [{ kind: t.kind as TriggerKind, config: t.config ?? {}, ...(t.kind === "call" && t.slug ? { slug: t.slug } : {}), enabled: t.enabled }];
    });
    const tests = TestsSchema.safeParse(f.tests);
    return { key: fnKey.get(f.id)!, name: f.name, ...(f.note ? { note: f.note } : {}), def, ...(tests.success && tests.data.length ? { tests: tests.data } : {}), ...(triggers.length ? { triggers } : {}) };
  });

  const pages = input.pages.flatMap((p) => {
    if (!p.tree || !TEMPLATE_PAGE_SLUG.test(p.slug)) return note({ what: "oldPage", page: p.name }), [];
    const seo = { ...(p.seoTitle ? { title: p.seoTitle.slice(0, 120) } : {}), ...(p.seoDescription ? { description: p.seoDescription.slice(0, 300) } : {}) };
    return [{ key: input.keyOf("page", p.id), name: p.name.slice(0, 120), slug: p.slug, tree: swapTables(p.tree, p.name), ...(Object.keys(seo).length ? { seo } : {}) }];
  });

  const template = TemplateSchema.parse({
    format: TEMPLATE_FORMAT,
    formatVersion: TEMPLATE_FORMAT_VERSION,
    key: input.key,
    version: input.version,
    name: input.name,
    ...(input.note && Object.keys(input.note).length ? { note: input.note } : {}),
    tables,
    functions,
    pages,
    needs: { secrets: [...needs.secrets].slice(0, TEMPLATE_LIMITS.needs), sites: [...needs.sites].slice(0, TEMPLATE_LIMITS.needs) },
    exportedAt: (input.now ?? new Date()).toISOString(),
  });
  return { template, notes };
}

/** The secrets (by name) and the sites (by host) the functions' steps name: what another store keeps for itself. */
export function needsOf(defs: unknown[], into = { secrets: new Set<string>(), sites: new Set<string>() }) {
  for (const def of defs)
    eachStep(def, (s) => {
      if (s.act === "http") {
        for (const name of secretsIn([s.url, s.headers, s.body])) into.secrets.add(name);
        const host = typeof s.url === "string" ? hostIn(s.url) : null;
        if (host) into.sites.add(host);
      }
      if (s.act === "code" && typeof s.code === "string") {
        for (const name of codeSecrets(s.code)) into.secrets.add(name);
        for (const m of s.code.matchAll(/https:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) into.sites.add(m[1].toLowerCase());
      }
    });
  return into;
}

/** A template's key from a feature's name, where the name has Latin letters; else one from its id. */
export function keyFrom(name: string, id: string): string {
  const k = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return TEMPLATE_KEY.test(k) && k.length >= 3 ? k : `feature-${id.slice(-8)}`;
}

/* ---------------- Install: the file made into this store's things ---------------- */

export type Problem = { at: string; message: string };
/** What is taken in this store already: the addresses a template's things must not have. */
export type Taken = { tables: Set<string>; pages: Set<string>; calls: Set<string>; routes: Set<string> };
/** The template's things as they will be made here: with their new ids, their addresses, and what was renamed. */
export type Plan = {
  tables: Array<{ key: string; id: string; slug: string; was?: string; name: Local; fields: unknown[]; api: unknown; itemPage: PageTree | null }>;
  fns: Array<{ key: string; id: string; name: string; note: string | null; def: FnDef; tests: unknown[]; triggers: Array<{ kind: TriggerKind; config: Record<string, unknown>; slug: string | null; was?: string; enabled: boolean }> }>;
  pages: Array<{ key: string; id: string; name: string; slug: string; was?: string; tree: PageTree; seoTitle: string | null; seoDescription: string | null }>;
};

/** An id like the database's own (small letters and digits: a table's id is also in a role's permission). */
export const newId = () => `c${randomBytes(12).toString("hex")}`;

/** A free address: the word itself, else the word with -2, -3… */
export function freeWord(word: string, taken: Set<string>, fits: (w: string) => boolean): string {
  if (!taken.has(word)) return word;
  for (let n = 2; n < 1000; n += 1) {
    const next = word.endsWith("/") ? `${word}${n}` : `${word}-${n}`;
    if (fits(next) && !taken.has(next)) return next;
  }
  return `${word}-${randomBytes(3).toString("hex")}`;
}
/** A page's free address: its last word gets the number (/my-tickets → /my-tickets-2). */
const freePage = (slug: string, taken: Set<string>) => freeWord(slug, taken, (w) => TEMPLATE_PAGE_SLUG.test(w));

/**
 * The template's things made ready for this store, checked as each would be when made by hand: the
 * tables' fields, the functions' steps (as a draft is: unfinished steps are fine), their tests and
 * what starts them, the pages' trees. `problems` empty = it can be installed.
 */
export function planInstall(t: Template, taken: Taken, ids: () => string = newId): { plan: Plan; problems: Problem[] } {
  const problems: Problem[] = [];
  const problem = (at: string, message: string) => void (problems.length < 40 && problems.push({ at, message }));
  const tableIds = new Map(t.tables.map((x) => [x.key, ids()]));
  const fnIds = new Map(t.functions.map((x) => [x.key, ids()]));
  const used = { tables: new Set(taken.tables), pages: new Set(taken.pages), calls: new Set(taken.calls), routes: new Set(taken.routes) };
  const words = { calls: new Map<string, string>(), tables: new Map<string, string>(), pages: new Map<string, string>() };
  const issuesAt = (at: string, issues: Array<{ path: PropertyKey[]; message: string }>) => issues.slice(0, 5).forEach((i) => problem([at, ...i.path.map(String)].filter(Boolean).join("."), i.message));

  // Addresses first: the pages are written with the new ones.
  const tableSlugs = t.tables.map((x) => {
    const slug = freeWord(x.slug, used.tables, (w) => COLLECTION_SLUG.test(w) && !RESERVED_SLUGS.has(w));
    used.tables.add(slug);
    if (slug !== x.slug) words.tables.set(x.slug, slug);
    return slug;
  });
  const pageSlugs = t.pages.map((p) => {
    const slug = freePage(p.slug, used.pages);
    used.pages.add(slug);
    if (slug !== p.slug) words.pages.set(p.slug, slug);
    return slug;
  });
  const callSlugs = t.functions.map((f) =>
    (f.triggers ?? []).map((tr) => {
      if (tr.kind !== "call" || !tr.slug) return null;
      const slug = freeWord(tr.slug, used.calls, (w) => CALL_SLUG.test(w));
      used.calls.add(slug);
      if (slug !== tr.slug) words.calls.set(tr.slug, slug);
      return slug;
    }),
  );

  /** The file's references made into this store's ids; a reference to nothing in the file is a problem. */
  const tableIdOf = (v: unknown, at: string): string => {
    const key = refKey(v, "table");
    if (key === null) return typeof v === "string" ? v : "";
    const id = tableIds.get(key);
    if (!id) problem(at, `No table "${key}" in this template`);
    return id ?? "";
  };
  const treeOf = (raw: unknown, at: string): PageTree | null => {
    const tree = structuredClone(raw);
    eachNode(tree, (n) => {
      if (n.type === "collectionList" && isObj(n.props)) n.props.collectionId = tableIdOf(n.props.collectionId, `${at}.tree`);
    });
    const checked = checkTree(renameWords(tree, words));
    if (!checked.ok) {
      checked.issues.slice(0, 5).forEach((i) => problem(`${at}.tree${i.path ? `.${i.path}` : ""}`, i.message));
      return null;
    }
    return checked.tree;
  };

  const plan: Plan = { tables: [], fns: [], pages: [] };
  t.tables.forEach((x, i) => {
    const at = `tables.${i}`;
    const fields = x.fields.map((f, k) => (isObj(f) && f.type === "relation" ? { ...f, to: storeTarget(f.to) ? f.to : tableIdOf(f.to, `${at}.fields.${k}.to`) } : f));
    // A relation's other end is one of the file's own tables, or one of the store's.
    fields.forEach((f, k) => {
      if (isObj(f) && f.type === "relation" && !storeTarget(f.to) && ![...tableIds.values()].includes(String(f.to))) problem(`${at}.fields.${k}.to`, "A relation links one of the template's tables, or one of the store's");
    });
    const body = CollectionBody.safeParse({ slug: tableSlugs[i], name: x.name, fields });
    if (!body.success) issuesAt(at, body.error.issues);
    const api = x.api === undefined ? null : SettingsSchema.safeParse(x.api);
    if (api && !api.success) issuesAt(`${at}.api`, api.error.issues);
    const itemPage = x.itemPage === undefined ? null : treeOf(x.itemPage, `${at}.itemPage`);
    plan.tables.push({ key: x.key, id: tableIds.get(x.key)!, slug: tableSlugs[i], ...(tableSlugs[i] !== x.slug ? { was: x.slug } : {}), name: x.name, fields: body.success ? (body.data.fields as unknown[]) : fields, api: api?.success ? api.data : null, itemPage });
  });

  t.functions.forEach((f, i) => {
    const at = `functions.${i}`;
    const def = structuredClone(f.def);
    eachStep(def, (s, stepAt) => {
      if (TABLE_ACTS.has(String(s.act))) s.table = tableIdOf(s.table, `${at}.def.${stepAt}.table`);
      if (s.act === "call") {
        const key = refKey(s.fn, "fn");
        if (key !== null) {
          if (!fnIds.has(key)) problem(`${at}.def.${stepAt}.fn`, `No function "${key}" in this template`);
          s.fn = fnIds.get(key) ?? "";
        } else if (typeof s.fn === "string" && s.fn) s.fn = ""; // Another store's function: picked again here.
      }
      // A ready connection is the other store's own: picked again here.
      if (s.act === "ready") s.via = "";
    });
    const parsed = FnDefSchema.safeParse(def);
    if (!parsed.success) issuesAt(`${at}.def`, parsed.error.issues);
    const tests = f.tests === undefined ? null : TestsSchema.safeParse(f.tests);
    if (tests && !tests.success) issuesAt(`${at}.tests`, tests.error.issues);
    const triggers: Plan["fns"][number]["triggers"] = [];
    (f.triggers ?? []).forEach((tr, k) => {
      const tat = `${at}.triggers.${k}`;
      try {
        const raw = tr.kind === "row" && isObj(tr.config) ? { ...tr.config, table: tableIdOf(tr.config.table, `${tat}.config.table`) } : tr.config;
        const config = configOf(tr.kind, raw);
        let slug: string | null = null;
        let was: string | undefined;
        if (tr.kind === "call") {
          slug = callSlugs[i][k];
          if (!slug) return problem(`${tat}.slug`, "A call has an address of small letters, digits and -");
          if (slug !== tr.slug) was = tr.slug;
        } else if (tr.kind === "route") {
          slug = routeSlug(String((config as RouteConfig).method), routePath((config as RouteConfig).path));
          if (used.routes.has(slug)) return problem(`${tat}.config.path`, "Another address here has this method and path");
          used.routes.add(slug);
        }
        triggers.push({ kind: tr.kind, config, slug, ...(was ? { was } : {}), enabled: tr.enabled !== false });
      } catch (e) {
        problem(`${tat}.config`, e instanceof AppError ? e.message : "Bad trigger");
      }
    });
    plan.fns.push({ key: f.key, id: fnIds.get(f.key)!, name: f.name, note: f.note ?? null, def: (parsed.success ? parsed.data : { inputs: [], do: [] }) as FnDef, tests: tests?.success ? tests.data : [], triggers });
  });

  t.pages.forEach((p, i) => {
    const tree = treeOf(p.tree, `pages.${i}`);
    if (tree) plan.pages.push({ key: p.key, id: ids(), name: p.name, slug: pageSlugs[i], ...(pageSlugs[i] !== p.slug ? { was: p.slug } : {}), tree, seoTitle: p.seo?.title ?? null, seoDescription: p.seo?.description ?? null });
  });
  return { plan, problems };
}

/** The template's name in a language (the others when it has none in it). */
export function nameIn(name: Local, lang: "ar" | "en" | "he"): string {
  return (name[lang] || name.ar || name.en || name.he || "").trim();
}
