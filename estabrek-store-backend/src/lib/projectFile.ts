/**
 * The whole project as one file (stage 3, item 2; admin → النظام → المشروع كملف): every table (its fields,
 * its API access, its rows' own page; never its rows), every function (its draft, what is published, its
 * tests and what starts it), the pages the new editor draws, the shoppers' roles and groups, and the
 * owner's features. Secrets, sites and ready connections are named only (`needs`): each copy keeps its own.
 *
 * Unlike a feature template (lib/featureTemplate.ts), the file keeps each thing's id. A copy made from it
 * has the same ids, so the next file finds each thing again: a test copy's changes brought to the live
 * one, or the project taken back to how it was on a day. Its addresses (a table's, a page's, a call's, a
 * group's name) are its own too: where something else here holds one of them, the file's thing can't
 * come in ("clash") until that other thing is renamed or removed.
 *
 * This file is pure: reading a file, writing one from what the store holds, and telling, piece by piece,
 * what bringing it in would do. The database work is lib/projectSync.ts.
 */
import { z } from "zod";
import { TRIGGER_KINDS, TRIGGER_LIMITS } from "./fnTriggers.js";
import { LIMITS as TABLE_LIMITS } from "./collections.js";
import { ROLE_KEY, ROLE_LIMITS } from "./shopperRoles.js";
import { FEATURE_KINDS } from "./featureGate.js";
import { needsOf } from "./featureTemplate.js";
import { stable } from "./featurePrints.js";

export const PROJECT_FORMAT = "estabrek.project" as const;
export const PROJECT_FORMAT_VERSION = 1 as const;
/** A file's size and what it holds; how many saved copies of the project are kept. */
export const PROJECT_LIMITS = { bytes: 12_000_000, tables: 300, functions: 500, pages: 300, roles: ROLE_LIMITS.roles, groups: ROLE_LIMITS.groups, features: 100, needs: 200, snapshots: 20, problems: 40 } as const;
/** The shop's own pages with checks of their own when published (the shop and the cart): never in the file. */
export const OWN_SHOP_PAGES = ["/shop", "/cart"] as const;
/** The pages in the file: the shop's pages, saved blocks and main components, as the new editor draws them. */
export const PROJECT_PAGE_KINDS = ["page", "block", "component"] as const;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

/* ---------------- The file ---------------- */

const Id = z.string().regex(/^[A-Za-z0-9_-]{4,64}$/, "An id is letters, digits, - and _");
const Note = z.string().trim().max(300);

const ProjectTable = z
  .object({
    id: Id,
    slug: z.string().trim().max(60),
    name: z.unknown(),
    // Checked as a table's fields are when it is brought in.
    fields: z.array(z.unknown()).min(1).max(TABLE_LIMITS.fields),
    api: z.unknown().optional(),
    /** Its rows' own page (a page tree), when it has one. */
    itemPage: z.unknown().optional(),
  })
  .strict();
const ProjectTrigger = z
  .object({
    id: Id,
    kind: z.enum(TRIGGER_KINDS),
    config: z.unknown().optional(),
    /** A call's address, or an own address's method and path. A webhook's (long and random: knowing it is the permission) is never in the file. */
    slug: z.string().trim().max(200).optional(),
    enabled: z.boolean(),
  })
  .strict();
const ProjectFn = z
  .object({
    id: Id,
    name: z.string().trim().min(1).max(80),
    note: Note.optional(),
    enabled: z.boolean(),
    draft: z.unknown(),
    /** What is published (runs), when it is. */
    live: z.unknown().optional(),
    tests: z.unknown().optional(),
    triggers: z.array(ProjectTrigger).max(TRIGGER_LIMITS.perFunction).default([]),
  })
  .strict();
const ProjectPage = z
  .object({
    id: Id,
    /** A page of the shop, a saved block pages show, or a main component (its copies live in pages). */
    kind: z.enum(PROJECT_PAGE_KINDS),
    name: z.string().trim().min(1).max(120),
    // As a page's address is anywhere in the admin (pages.schemas.ts).
    slug: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .refine((v) => v.startsWith("/") && !/\s/.test(v) && !v.includes("//"), "A page's address starts with / and has no spaces"),
    status: z.enum(["PUBLISHED", "DRAFT"]),
    /** What the shop shows (lib/pageTree.ts). */
    tree: z.unknown(),
    /** The editor's unpublished changes, when it has some. */
    draft: z.unknown().optional(),
    seo: z.object({ title: z.string().max(120).optional(), description: z.string().max(300).optional(), noIndex: z.boolean().optional() }).strict().optional(),
  })
  .strict();
const ProjectRole = z.object({ key: z.string().regex(ROLE_KEY, "A role's key: small letters, digits, - and _"), name: z.unknown(), note: Note.optional() }).strict();
const ProjectGroup = z.object({ id: Id, name: z.string().trim().min(1).max(ROLE_LIMITS.name), note: Note.optional() }).strict();
const ProjectFeature = z
  .object({
    id: Id,
    name: z.string().trim().min(1).max(80),
    note: Note.optional(),
    enabled: z.boolean(),
    items: z.array(z.object({ kind: z.enum(FEATURE_KINDS), id: Id }).strict()).max(60).default([]),
    /** The template it was installed from (lib/featureInstall.ts Installed), so it can still be upgraded. */
    template: z.unknown().optional(),
    /** A whole site's settings as its owner set them (lib/siteSettings.ts; checked against its file when read). */
    settings: z.record(z.string().max(40), z.unknown()).optional(),
    /** A whole site's panel as its owner arranged it (lib/sitePanel.ts; checked when the panel is drawn). */
    panelLayout: z.unknown().optional(),
  })
  .strict();
const ProjectNeeds = z
  .object({
    secrets: z.array(z.string().max(80)).max(PROJECT_LIMITS.needs).default([]),
    sites: z.array(z.string().max(253)).max(PROJECT_LIMITS.needs).default([]),
    /** Ready connections its functions' steps pick (by id): each copy connects its own. */
    connections: z.array(z.object({ id: Id, name: z.string().max(80), kind: z.string().max(30) }).strict()).max(PROJECT_LIMITS.needs).default([]),
  })
  .strict();

export const ProjectSchema = z
  .object({
    format: z.literal(PROJECT_FORMAT),
    formatVersion: z.literal(PROJECT_FORMAT_VERSION),
    /** The store it was written from (to tell files apart). */
    name: z.string().max(120).optional(),
    exportedAt: z.string().max(40).optional(),
    tables: z.array(ProjectTable).max(PROJECT_LIMITS.tables).default([]),
    functions: z.array(ProjectFn).max(PROJECT_LIMITS.functions).default([]),
    pages: z.array(ProjectPage).max(PROJECT_LIMITS.pages).default([]),
    roles: z.array(ProjectRole).max(PROJECT_LIMITS.roles).default([]),
    groups: z.array(ProjectGroup).max(PROJECT_LIMITS.groups).default([]),
    features: z.array(ProjectFeature).max(PROJECT_LIMITS.features).default([]),
    needs: ProjectNeeds.optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    const once = <T>(list: T[], word: (x: T) => string, path: (i: number) => (string | number)[], message: (w: string) => string) => {
      const seen = new Set<string>();
      list.forEach((x, i) => {
        const w = word(x);
        if (seen.has(w)) ctx.addIssue({ code: "custom", path: path(i), message: message(w) });
        seen.add(w);
      });
    };
    once(p.tables, (t) => t.id, (i) => ["tables", i, "id"], (w) => `Two tables have the id "${w}"`);
    once(p.tables, (t) => t.slug, (i) => ["tables", i, "slug"], (w) => `Two tables have the address "${w}"`);
    once(p.functions, (f) => f.id, (i) => ["functions", i, "id"], (w) => `Two functions have the id "${w}"`);
    once(p.pages, (x) => x.id, (i) => ["pages", i, "id"], (w) => `Two pages have the id "${w}"`);
    once(p.pages, (x) => x.slug, (i) => ["pages", i, "slug"], (w) => `Two pages have the address "${w}"`);
    once(p.roles, (r) => r.key, (i) => ["roles", i, "key"], (w) => `Two roles have the key "${w}"`);
    once(p.groups, (g) => g.id, (i) => ["groups", i, "id"], (w) => `Two groups have the id "${w}"`);
    once(p.groups, (g) => g.name, (i) => ["groups", i, "name"], (w) => `Two groups have the name "${w}"`);
    once(p.features, (f) => f.id, (i) => ["features", i, "id"], (w) => `Two features have the id "${w}"`);
    const triggers = p.functions.flatMap((f, i) => f.triggers.map((t, k) => ({ t, at: ["functions", i, "triggers", k] as (string | number)[] })));
    once(triggers, (x) => x.t.id, (i) => [...triggers[i].at, "id"], (w) => `Two triggers have the id "${w}"`);
    const addressed = triggers.filter((x) => x.t.slug && (x.t.kind === "call" || x.t.kind === "route"));
    once(addressed, (x) => x.t.slug!, (i) => [...addressed[i].at, "slug"], (w) => `Two triggers have the address "${w}"`);
    // A thing is in one feature at most.
    const items = p.features.flatMap((f, i) => f.items.map((it, k) => ({ it, at: ["features", i, "items", k] as (string | number)[] })));
    once(items, (x) => `${x.it.kind}:${x.it.id}`, (i) => items[i].at, () => "A thing is in one feature at most");
    p.pages.forEach((x, i) => {
      if ((OWN_SHOP_PAGES as readonly string[]).includes(x.slug)) ctx.addIssue({ code: "custom", path: ["pages", i, "slug"], message: "The shop and the cart aren't brought in from a file" });
    });
  });
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectTableIn = Project["tables"][number];
export type ProjectFnIn = Project["functions"][number];
export type ProjectPageIn = Project["pages"][number];
export type Problem = { at: string; message: string };

/** Read a file: the project, or where it is wrong (as "tables.0.slug"). */
export function readProject(raw: unknown): { ok: true; project: Project } | { ok: false; problems: Problem[] } {
  let size = Infinity;
  try {
    size = JSON.stringify(raw)?.length ?? Infinity;
  } catch {
    /* not JSON at all */
  }
  if (size > PROJECT_LIMITS.bytes) return { ok: false, problems: [{ at: "", message: `A project file is up to ${Math.round(PROJECT_LIMITS.bytes / 1_000_000)} MB` }] };
  const kind = isObj(raw) ? raw : {};
  if (kind.format === "estabrek.feature") return { ok: false, problems: [{ at: "format", message: "This is a feature template: install it from my features" }] };
  if (kind.format !== PROJECT_FORMAT) return { ok: false, problems: [{ at: "format", message: "This file isn't a project file" }] };
  if (typeof kind.formatVersion === "number" && kind.formatVersion > PROJECT_FORMAT_VERSION) return { ok: false, problems: [{ at: "formatVersion", message: "This file was written by a newer version: update the store first" }] };
  const parsed = ProjectSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, problems: parsed.error.issues.slice(0, 20).map((i) => ({ at: i.path.map(String).join("."), message: i.message })) };
  return { ok: true, project: parsed.data };
}

/* ---------------- Writing one from what the store holds ---------------- */

export type HereTable = { id: string; slug: string; name: unknown; fields: unknown; api: unknown; itemPage: unknown | null };
export type HereFn = { id: string; name: string; note: string | null; enabled: boolean; draft: unknown; live: unknown; tests: unknown; triggers: Array<{ id: string; kind: string; config: unknown; slug: string | null; enabled: boolean }> };
export type HerePage = { id: string; kind: string; name: string; slug: string; status: string; tree: unknown; draft: unknown | null; seoTitle: string | null; seoDescription: string | null; noIndex: boolean };
export type HereConnection = { id: string; name: string; kind: string };
export type Here = {
  name?: string;
  tables: HereTable[];
  fns: HereFn[];
  pages: HerePage[];
  roles: Array<{ key: string; name: unknown; note: string | null }>;
  groups: Array<{ id: string; name: string; note: string | null }>;
  features: Array<{ id: string; name: string; note: string | null; enabled: boolean; items: Array<{ kind: string; refId: string }>; template: unknown }>;
  connections: HereConnection[];
};

const ADDRESSED = new Set(["call", "route"]);
const json = <T>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));
const testsOf = (v: unknown) => (Array.isArray(v) && v.length ? json(v) : undefined);
/** The ready connections a definition's steps pick (by id). */
export function connectionsIn(def: unknown, into = new Set<string>()): Set<string> {
  const walk = (steps: unknown) => {
    if (!Array.isArray(steps)) return;
    for (const s of steps) {
      if (!isObj(s)) continue;
      if (s.act === "ready" && typeof s.via === "string" && s.via) into.add(s.via);
      walk(s.do);
      walk(s.else);
    }
  };
  if (isObj(def)) for (const key of ["do", "else", "fail"]) walk(def[key]);
  return into;
}

/** The store's project as a file (things in the order they were made). */
export function toProject(here: Here, now = new Date()): Project {
  const defs = here.fns.flatMap((f) => [f.draft, f.live].filter(Boolean));
  const needs = needsOf(defs);
  const picked = new Set<string>();
  for (const d of defs) connectionsIn(d, picked);
  const file = {
    format: PROJECT_FORMAT,
    formatVersion: PROJECT_FORMAT_VERSION,
    ...(here.name ? { name: here.name.slice(0, 120) } : {}),
    exportedAt: now.toISOString(),
    tables: here.tables.map((t) => ({ id: t.id, slug: t.slug, name: json(t.name ?? {}), fields: json(Array.isArray(t.fields) ? t.fields : []), ...(t.api ? { api: json(t.api) } : {}), ...(t.itemPage ? { itemPage: json(t.itemPage) } : {}) })),
    functions: here.fns.map((f) => ({
      id: f.id,
      name: f.name,
      ...(f.note ? { note: f.note } : {}),
      enabled: f.enabled,
      draft: json(f.draft ?? { inputs: [], do: [] }),
      ...(f.live ? { live: json(f.live) } : {}),
      ...(testsOf(f.tests) ? { tests: testsOf(f.tests) } : {}),
      triggers: f.triggers.map((t) => ({ id: t.id, kind: t.kind, config: json(t.config ?? {}), ...(ADDRESSED.has(t.kind) && t.slug ? { slug: t.slug } : {}), enabled: t.enabled })),
    })),
    pages: here.pages.map((p) => {
      const seo = { ...(p.seoTitle ? { title: p.seoTitle.slice(0, 120) } : {}), ...(p.seoDescription ? { description: p.seoDescription.slice(0, 300) } : {}), ...(p.noIndex ? { noIndex: true } : {}) };
      return { id: p.id, kind: p.kind, name: p.name.slice(0, 120), slug: p.slug, status: p.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT", tree: json(p.tree), ...(p.draft ? { draft: json(p.draft) } : {}), ...(Object.keys(seo).length ? { seo } : {}) };
    }),
    roles: here.roles.map((r) => ({ key: r.key, name: json(r.name ?? {}), ...(r.note ? { note: r.note } : {}) })),
    groups: here.groups.map((g) => ({ id: g.id, name: g.name, ...(g.note ? { note: g.note } : {}) })),
    features: here.features.map((f) => ({ id: f.id, name: f.name, ...(f.note ? { note: f.note } : {}), enabled: f.enabled, items: f.items.map((i) => ({ kind: i.kind, id: i.refId })), ...(f.template ? { template: json(f.template) } : {}) })),
    needs: {
      secrets: [...needs.secrets].slice(0, PROJECT_LIMITS.needs),
      sites: [...needs.sites].slice(0, PROJECT_LIMITS.needs),
      connections: here.connections.filter((c) => picked.has(c.id)).map((c) => ({ id: c.id, name: c.name, kind: c.kind })).slice(0, PROJECT_LIMITS.needs),
    },
  };
  return ProjectSchema.parse(file);
}

/* ---------------- What bringing a file in would do ---------------- */

export const DIFF_KINDS = ["table", "function", "page", "role", "group", "feature"] as const;
export type DiffKind = (typeof DIFF_KINDS)[number];
/**
 *   add     in the file, not here: made
 *   change  in both, not the same: made like the file (`parts` say what)
 *   same    in both, the same: nothing happens
 *   only    here, not in the file: stays, unless the owner ticks it to go
 *   clash   in the file, but something else here holds its address: it can't come in
 */
export const DIFF_ACTIONS = ["add", "change", "same", "only", "clash"] as const;
export type DiffAction = (typeof DIFF_ACTIONS)[number];
export type DiffItem = {
  /** "table:<id>", "function:<id>"… what the owner names to tick it. */
  ref: string;
  kind: DiffKind;
  id: string;
  name: string;
  action: DiffAction;
  /** What changes: a table's "name", "slug", "fields", "api", "itemPage"; a function's "name", "note", "enabled", "draft", "live", "tests", "triggers"… */
  parts?: string[];
  /** A table's fields, by name: made, gone, changed. */
  fields?: { added: string[]; removed: string[]; changed: string[] };
  /** What holds its address here. */
  clash?: { what: "slug" | "address" | "name"; word: string; by: string };
};

type Lang = "ar" | "en" | "he";
const nameIn = (v: unknown, lang: Lang, fallback: string) => {
  const o = isObj(v) ? v : {};
  for (const l of [lang, "ar", "en", "he"]) if (typeof o[l] === "string" && (o[l] as string).trim()) return (o[l] as string).trim();
  return fallback;
};
const same = (a: unknown, b: unknown) => stable(a ?? null) === stable(b ?? null);
const partsOf = (a: Obj, b: Obj, keys: string[]) => keys.filter((k) => !same(a[k], b[k]));
const byId = <T extends { id: string }>(list: T[]) => [...list].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));

/**
 * Piece by piece, what bringing `file` into a store holding `here` would do (both as files: the store's
 * own written by toProject, so the same thing reads the same).
 */
export function diffProject(file: Project, here: Project, lang: Lang = "ar"): DiffItem[] {
  const out: DiffItem[] = [];
  const push = (x: Omit<DiffItem, "ref">) => out.push({ ref: `${x.kind}:${x.id}`, ...x });
  type Holder = { id: string; by: string };
  /** Who holds an address here, by the word. */
  const holders = <T>(list: T[], word: (x: T) => string | null | undefined, id: (x: T) => string, by: (x: T) => string) => {
    const m = new Map<string, Holder>();
    for (const x of list) {
      const w = word(x);
      if (w) m.set(w, { id: id(x), by: by(x) });
    }
    return m;
  };
  const clashOf = (m: Map<string, Holder>, word: string | undefined, id: string) => {
    const h = word ? m.get(word) : undefined;
    return h && h.id !== id ? h : null;
  };

  /* Tables. */
  const tablesHere = new Map(here.tables.map((t) => [t.id, t]));
  const tableSlugs = holders(here.tables, (t) => t.slug, (t) => t.id, (t) => nameIn(t.name, lang, t.slug));
  const fieldName = (f: Obj) => nameIn(f.name, lang, String(f.id));
  for (const t of file.tables) {
    const name = nameIn(t.name, lang, t.slug);
    const h = tablesHere.get(t.id);
    const holder = clashOf(tableSlugs, t.slug, t.id);
    if (holder) {
      push({ kind: "table", id: t.id, name, action: "clash", clash: { what: "slug", word: t.slug, by: holder.by } });
      continue;
    }
    if (!h) {
      push({ kind: "table", id: t.id, name, action: "add" });
      continue;
    }
    const parts = partsOf(t as Obj, h as Obj, ["name", "slug", "fields", "api", "itemPage"]);
    if (!parts.length) {
      push({ kind: "table", id: t.id, name, action: "same" });
      continue;
    }
    const before = h.fields.filter(isObj);
    const after = t.fields.filter(isObj);
    const fields = parts.includes("fields")
      ? {
          added: after.filter((f) => !before.some((b) => b.id === f.id)).map(fieldName),
          removed: before.filter((b) => !after.some((f) => f.id === b.id)).map(fieldName),
          changed: after.filter((f) => before.some((b) => b.id === f.id && !same(b, f))).map(fieldName),
        }
      : undefined;
    push({ kind: "table", id: t.id, name, action: "change", parts, ...(fields ? { fields } : {}) });
  }
  for (const h of here.tables) if (!file.tables.some((t) => t.id === h.id)) push({ kind: "table", id: h.id, name: nameIn(h.name, lang, h.slug), action: "only" });

  /* Functions: an address of theirs (a call's, an own address's) another trigger holds is a clash. */
  const fnsHere = new Map(here.functions.map((f) => [f.id, f]));
  const fnOf = new Map(here.functions.flatMap((f) => f.triggers.map((t) => [t.id, f.name] as const)));
  const addresses = holders(
    here.functions.flatMap((f) => f.triggers),
    (t) => t.slug,
    (t) => t.id,
    (t) => fnOf.get(t.id) ?? "",
  );
  for (const f of file.functions) {
    const held = f.triggers.map((t) => ({ t, h: clashOf(addresses, t.slug, t.id) })).find((x) => x.h);
    if (held) {
      push({ kind: "function", id: f.id, name: f.name, action: "clash", clash: { what: "address", word: held.t.slug!, by: held.h!.by } });
      continue;
    }
    const h = fnsHere.get(f.id);
    if (!h) {
      push({ kind: "function", id: f.id, name: f.name, action: "add" });
      continue;
    }
    // A webhook's address isn't in the file: the one here stays, so it isn't a change. Which triggers, not their order.
    const parts = partsOf({ ...f, tests: f.tests ?? [], triggers: byId(f.triggers) } as Obj, { ...h, tests: h.tests ?? [], triggers: byId(h.triggers) } as Obj, ["name", "note", "enabled", "draft", "live", "tests", "triggers"]);
    push({ kind: "function", id: f.id, name: f.name, action: parts.length ? "change" : "same", ...(parts.length ? { parts } : {}) });
  }
  for (const h of here.functions) if (!file.functions.some((f) => f.id === h.id)) push({ kind: "function", id: h.id, name: h.name, action: "only" });

  /* Pages. */
  const pagesHere = new Map(here.pages.map((p) => [p.id, p]));
  const pageSlugs = holders(here.pages, (p) => p.slug, (p) => p.id, (p) => p.name);
  for (const p of file.pages) {
    const holder = clashOf(pageSlugs, p.slug, p.id);
    if (holder) {
      push({ kind: "page", id: p.id, name: p.name, action: "clash", clash: { what: "slug", word: p.slug, by: holder.by } });
      continue;
    }
    const h = pagesHere.get(p.id);
    if (!h) {
      push({ kind: "page", id: p.id, name: p.name, action: "add" });
      continue;
    }
    const parts = partsOf(p as Obj, h as Obj, ["name", "slug", "status", "tree", "draft", "seo", "kind"]).map((k) => (k === "tree" ? "design" : k));
    push({ kind: "page", id: p.id, name: p.name, action: parts.length ? "change" : "same", ...(parts.length ? { parts } : {}) });
  }
  for (const h of here.pages) if (!file.pages.some((p) => p.id === h.id)) push({ kind: "page", id: h.id, name: h.name, action: "only" });

  /* Roles (a role's key is its id), groups (a name is theirs alone), features. */
  const rolesHere = new Map(here.roles.map((r) => [r.key, r]));
  for (const r of file.roles) {
    const h = rolesHere.get(r.key);
    const name = nameIn(r.name, lang, r.key);
    const parts = h ? partsOf(r as Obj, h as Obj, ["name", "note"]) : [];
    push({ kind: "role", id: r.key, name, action: !h ? "add" : parts.length ? "change" : "same", ...(parts.length ? { parts } : {}) });
  }
  for (const h of here.roles) if (!file.roles.some((r) => r.key === h.key)) push({ kind: "role", id: h.key, name: nameIn(h.name, lang, h.key), action: "only" });

  const groupsHere = new Map(here.groups.map((g) => [g.id, g]));
  const groupNames = holders(here.groups, (g) => g.name, (g) => g.id, (g) => g.name);
  for (const g of file.groups) {
    const holder = clashOf(groupNames, g.name, g.id);
    if (holder) {
      push({ kind: "group", id: g.id, name: g.name, action: "clash", clash: { what: "name", word: g.name, by: holder.by } });
      continue;
    }
    const h = groupsHere.get(g.id);
    const parts = h ? partsOf(g as Obj, h as Obj, ["name", "note"]) : [];
    push({ kind: "group", id: g.id, name: g.name, action: !h ? "add" : parts.length ? "change" : "same", ...(parts.length ? { parts } : {}) });
  }
  for (const h of here.groups) if (!file.groups.some((g) => g.id === h.id)) push({ kind: "group", id: h.id, name: h.name, action: "only" });

  const featuresHere = new Map(here.features.map((f) => [f.id, f]));
  for (const f of file.features) {
    const h = featuresHere.get(f.id);
    // Which things are its, not their order.
    const parts = h ? partsOf({ ...f, items: byId(f.items.map((i) => ({ ...i, id: `${i.kind}:${i.id}` }))) } as Obj, { ...h, items: byId(h.items.map((i) => ({ ...i, id: `${i.kind}:${i.id}` }))) } as Obj, ["name", "note", "enabled", "items", "template"]) : [];
    push({ kind: "feature", id: f.id, name: f.name, action: !h ? "add" : parts.length ? "change" : "same", ...(parts.length ? { parts } : {}) });
  }
  for (const h of here.features) if (!file.features.some((f) => f.id === h.id)) push({ kind: "feature", id: h.id, name: h.name, action: "only" });

  return out;
}

/** How many pieces do each thing, for the page's summary. */
export const countsOf = (items: DiffItem[]) => Object.fromEntries(DIFF_ACTIONS.map((a) => [a, items.filter((i) => i.action === a).length])) as Record<DiffAction, number>;

/** What a project holds, kind by kind. */
export const sizeOfProject = (p: Project) => ({ tables: p.tables.length, functions: p.functions.length, pages: p.pages.length, roles: p.roles.length, groups: p.groups.length, features: p.features.length });
