/**
 * A whole site's settings (wave 1 of docs/sites-300-plan.ar.md): the switches, numbers and words its
 * blueprint declares (admin studio/templates/sites: "online booking is open", "the opening hours",
 * "email me too"), kept with the feature it installed as and changed by its owner (admin → ميزاتي →
 * the site → إعدادات الموقع). They are read
 *   - by its functions: "{{settings.notifyOn}}" in any step, private ones too (functions.service.ts);
 *   - by its pages on the shop: an element's words taken from a setting (props.fromSetting) and an
 *     element shown only while a switch is on, or a choice is one (props.showIf). Only a public
 *     setting reaches the shop: a private one (a commission, an address to tell) stays on the server.
 *
 * The declarations come with the template file (Template.settings), so an upgrade brings new ones; the
 * values are the owner's (Feature.settings). A value that no longer fits its declaration (its kind
 * changed, a choice went) gives way to the declaration's default, and a feature with no declarations
 * (one built by hand) has no settings.
 */
import { z } from "zod";
import { prisma } from "./prisma.js";
import { SETTING_KEY } from "./pageTree.js";

export { SETTING_KEY };
export const SETTING_KINDS = ["toggle", "number", "text", "words", "choice", "color"] as const;
export type SettingKind = (typeof SETTING_KINDS)[number];
export const SETTINGS_LIMITS = { settings: 40, text: 500, options: 20, number: 1_000_000_000 } as const;

const LANGS = ["ar", "en", "he"] as const;
type Lang = (typeof LANGS)[number];
const Label = z.object({ ar: z.string().trim().max(300).optional(), en: z.string().trim().max(300).optional(), he: z.string().trim().max(300).optional() }).strict();
const OPTION_ID = /^[a-z0-9][a-z0-9-]{0,30}$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;

/** One setting as a site's file declares it. */
export const SettingDeclSchema = z
  .object({
    key: z.string().regex(SETTING_KEY, "A setting's key is a small letter, then letters and digits"),
    kind: z.enum(SETTING_KINDS),
    label: Label,
    note: Label.optional(),
    /** Its section on the owner's form (a module's name: "الحجز"). */
    group: Label.optional(),
    /** Read by the shop's pages too (else it stays on the server). */
    public: z.boolean().optional(),
    default: z.unknown().optional(),
    /** A number's. */
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    whole: z.boolean().optional(),
    unit: Label.optional(),
    /** Words or a text of a few lines. */
    long: z.boolean().optional(),
    /** A choice's. */
    options: z.array(z.object({ id: z.string().regex(OPTION_ID, "An option's id is small letters, digits and -"), name: Label }).strict()).min(2).max(SETTINGS_LIMITS.options).optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.kind === "choice" && !d.options) ctx.addIssue({ code: "custom", path: ["options"], message: "A choice has its options" });
    if (d.kind !== "choice" && d.options) ctx.addIssue({ code: "custom", path: ["options"], message: "Only a choice has options" });
    if (d.options && new Set(d.options.map((o) => o.id)).size !== d.options.length) ctx.addIssue({ code: "custom", path: ["options"], message: "Two options have the same id" });
    if (d.kind !== "number" && (d.min !== undefined || d.max !== undefined || d.whole !== undefined || d.unit)) ctx.addIssue({ code: "custom", path: ["kind"], message: "Only a number has a smallest, a largest, a unit" });
    if (d.min !== undefined && d.max !== undefined && d.min > d.max) ctx.addIssue({ code: "custom", path: ["max"], message: "The largest is below the smallest" });
    if (!Object.values(d.label).some((v) => v)) ctx.addIssue({ code: "custom", path: ["label"], message: "A setting has a name" });
    if (d.default !== undefined && !fits(d as SettingDecl, d.default)) ctx.addIssue({ code: "custom", path: ["default"], message: `Not a ${d.kind}'s value` });
  });
export type SettingDecl = Omit<z.infer<typeof SettingDeclSchema>, "default"> & { default?: unknown };
export type Values = Record<string, unknown>;

/** A site's declarations: no two of one key, and so many at most (the template file's `settings`). */
export const SettingDeclsSchema = z
  .array(SettingDeclSchema)
  .max(SETTINGS_LIMITS.settings)
  .superRefine((list, ctx) => {
    const keys = list.map((d) => d.key);
    keys.forEach((k, i) => {
      if (keys.indexOf(k) !== i) ctx.addIssue({ code: "custom", path: [i, "key"], message: `Two settings have the key "${k}"` });
    });
  });

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const wordsOk = (v: unknown, max: number) => isObj(v) && Object.keys(v).every((k) => (LANGS as readonly string[]).includes(k)) && Object.values(v).every((x) => typeof x === "string" && x.length <= max);

/** Whether a value is one this setting can hold. */
export function fits(d: SettingDecl, v: unknown): boolean {
  switch (d.kind) {
    case "toggle":
      return typeof v === "boolean";
    case "number":
      return typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= SETTINGS_LIMITS.number && (d.min === undefined || v >= d.min) && (d.max === undefined || v <= d.max) && (!d.whole || Number.isInteger(v));
    case "text":
      return typeof v === "string" && v.length <= SETTINGS_LIMITS.text;
    case "words":
      return wordsOk(v, SETTINGS_LIMITS.text);
    case "choice":
      return typeof v === "string" && !!d.options?.some((o) => o.id === v);
    case "color":
      return typeof v === "string" && COLOR.test(v);
  }
}

/** What a setting holds when its file says nothing (or something that doesn't fit). */
function blankOf(d: SettingDecl): unknown {
  switch (d.kind) {
    case "toggle":
      return false;
    case "number":
      return d.min !== undefined && d.min > 0 ? d.min : d.max !== undefined && d.max < 0 ? d.max : 0;
    case "text":
      return "";
    case "words":
      return {};
    case "choice":
      return d.options?.[0]?.id ?? "";
    case "color":
      return "#000000";
  }
}
export const defaultOf = (d: SettingDecl): unknown => (d.default !== undefined && fits(d, d.default) ? d.default : blankOf(d));

/** A value as the owner sent it, made tidy (words trimmed, empty languages dropped). */
function tidy(d: SettingDecl, v: unknown): unknown {
  if (d.kind === "text" && typeof v === "string") return v.trim();
  if (d.kind === "color" && typeof v === "string") return v.trim().toLowerCase();
  if (d.kind === "words" && isObj(v)) return Object.fromEntries(Object.entries(v).flatMap(([k, x]) => (typeof x === "string" && x.trim() ? [[k, x.trim()]] : [])));
  return v;
}

/** Every declared setting's value: the owner's where it still fits, else its default. A value of nothing declared isn't kept. */
export function valuesOf(decls: SettingDecl[], saved: unknown): Values {
  const own = isObj(saved) ? saved : {};
  return Object.fromEntries(decls.map((d) => [d.key, Object.prototype.hasOwnProperty.call(own, d.key) && fits(d, own[d.key]) ? own[d.key] : defaultOf(d)]));
}

export type SettingProblem = { key: string; message: string };
/** The owner's changes over what is kept now: every value checked against its setting, all said at once. */
export function readValues(decls: SettingDecl[], saved: unknown, asked: unknown): { ok: true; values: Values } | { ok: false; problems: SettingProblem[] } {
  if (!isObj(asked)) return { ok: false, problems: [{ key: "", message: "The settings come as { key: value }" }] };
  const byKey = new Map(decls.map((d) => [d.key, d]));
  const problems: SettingProblem[] = [];
  const values = valuesOf(decls, saved);
  for (const [key, raw] of Object.entries(asked)) {
    const d = byKey.get(key);
    if (!d) {
      problems.push({ key, message: "This site has no such setting" });
      continue;
    }
    const v = tidy(d, raw);
    if (!fits(d, v)) problems.push({ key, message: problemOf(d) });
    else values[key] = v;
  }
  return problems.length ? { ok: false, problems } : { ok: true, values };
}
function problemOf(d: SettingDecl): string {
  if (d.kind === "number") return `A number${d.whole ? " without fractions" : ""}${d.min !== undefined ? `, at least ${d.min}` : ""}${d.max !== undefined ? `, at most ${d.max}` : ""}`;
  if (d.kind === "toggle") return "On or off";
  if (d.kind === "choice") return `One of: ${d.options?.map((o) => o.id).join(", ")}`;
  if (d.kind === "color") return "A colour like #1f6feb";
  return `Words of ${SETTINGS_LIMITS.text} letters at most`;
}

/** Only what the shop may read. */
export function publicValues(decls: SettingDecl[], values: Values): Values {
  return Object.fromEntries(decls.filter((d) => d.public).map((d) => [d.key, values[d.key]]));
}

/** The values as a function's steps read them: words in the function's own language (else another). */
export function valuesIn(values: Values, decls: SettingDecl[], lang: Lang): Values {
  const kinds = new Map(decls.map((d) => [d.key, d.kind]));
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, kinds.get(k) === "words" && isObj(v) ? wordIn(v, lang) : v]));
}
const wordIn = (v: Record<string, unknown>, lang: Lang) => String(v[lang] ?? v.ar ?? v.en ?? v.he ?? "");

/* ---------------- Which feature's settings (read every few seconds) ---------------- */

export type SiteSettings = { featureId: string; decls: SettingDecl[]; values: Values };
type Index = { at: number; features: Map<string, SiteSettings>; items: Map<string, string> };
let cache: Index | null = null;
const TTL_MS = 10_000;

/** After a feature's settings, its things or its file changed (an install, an upgrade, a removal). */
export function forgetSiteSettings() {
  cache = null;
}

/** The declarations in a feature's file, as kept (only the ones that still read). */
export function declsOf(raw: unknown): SettingDecl[] {
  const read = SettingDeclsSchema.safeParse(raw);
  if (read.success) return read.data as SettingDecl[];
  return Array.isArray(raw) ? raw.flatMap((d) => { const one = SettingDeclSchema.safeParse(d); return one.success ? [one.data as SettingDecl] : []; }) : [];
}

async function index(now = Date.now()): Promise<Index> {
  if (cache && now - cache.at < TTL_MS) return cache;
  // Only the declarations out of each file (the whole file is big: its pages and rows).
  const rows = await prisma.$queryRaw<Array<{ id: string; decls: unknown; settings: unknown }>>`SELECT "id", "template"->'file'->'settings' AS "decls", "settings" FROM "Feature" WHERE jsonb_typeof("template"->'file'->'settings') = 'array'`;
  const features = new Map<string, SiteSettings>();
  for (const r of rows) {
    const decls = declsOf(r.decls);
    if (decls.length) features.set(r.id, { featureId: r.id, decls, values: valuesOf(decls, r.settings) });
  }
  const items = features.size ? await prisma.featureItem.findMany({ where: { featureId: { in: [...features.keys()] } }, select: { kind: true, refId: true, featureId: true } }) : [];
  cache = { at: now, features, items: new Map(items.map((i) => [`${i.kind}:${i.refId}`, i.featureId])) };
  return cache;
}

/** A feature's settings, or null when it declares none. */
export async function settingsOfFeature(featureId: string): Promise<SiteSettings | null> {
  return (await index()).features.get(featureId) ?? null;
}
/** The settings of the feature a table, a function or a page is in (null: none, or it declares none). */
export async function settingsFor(kind: "table" | "function" | "page", refId: string): Promise<SiteSettings | null> {
  const at = await index();
  const featureId = at.items.get(`${kind}:${refId}`);
  return featureId ? at.features.get(featureId) ?? null : null;
}

/* ---------------- A page on the shop ---------------- */

type Node = { id?: string; type?: string; props?: Record<string, unknown>; children?: Node[] };
const SHOWN_PROPS = ["text", "label"] as const;

/** Whether an element shows with these values: the setting it names is `is` (true when it says nothing). A setting the shop can't read hides it. */
function shows(showIf: unknown, values: Values): boolean {
  if (!isObj(showIf) || typeof showIf.setting !== "string") return true;
  if (!Object.prototype.hasOwnProperty.call(values, showIf.setting)) return false;
  const want = showIf.is === undefined ? true : showIf.is;
  return values[showIf.setting] === want;
}
/** A setting's value as an element's words in the three languages (null: it can't be words). */
function asWords(v: unknown): Record<string, string> | null {
  if (typeof v === "string") return v ? { ar: v, en: v, he: v } : null;
  if (typeof v === "number") return { ar: String(v), en: String(v), he: String(v) };
  if (isObj(v)) {
    const out = Object.fromEntries(Object.entries(v).filter(([k, x]) => (LANGS as readonly string[]).includes(k) && typeof x === "string" && x)) as Record<string, string>;
    return Object.keys(out).length ? out : null;
  }
  return null;
}

/**
 * A page as the shop draws it with its site's public settings: an element shown only while a setting
 * is one value is left out otherwise (with what is inside it), and an element's words taken from a
 * setting are the setting's now (where it has some). The two marks are the server's: the shop never
 * sees them.
 */
export function withSettings<T>(tree: T, values: Values): T {
  const walk = (n: Node): Node | null => {
    if (!isObj(n)) return n;
    const props = isObj(n.props) ? n.props : null;
    if (props && n.type !== "page" && !shows(props.showIf, values)) return null;
    let next: Node = n;
    if (props && (props.showIf !== undefined || props.fromSetting !== undefined)) {
      const { showIf: _s, fromSetting, ...rest } = props;
      if (isObj(fromSetting)) {
        for (const prop of SHOWN_PROPS) {
          const key = fromSetting[prop];
          const words = typeof key === "string" && Object.prototype.hasOwnProperty.call(values, key) ? asWords(values[key]) : null;
          if (words) rest[prop] = words;
        }
      }
      next = { ...n, props: rest };
    }
    if (Array.isArray(n.children)) next = { ...next, children: n.children.map(walk).filter((c): c is Node => c !== null) };
    return next;
  };
  if (!isObj(tree) || !isObj((tree as { root?: unknown }).root)) return tree;
  const root = walk((tree as unknown as { root: Node }).root);
  return { ...(tree as object), root } as T;
}

/** The marks taken off a page in no site that has settings (its elements show as they are). */
function strip<T>(tree: T): T {
  const walk = (n: Node): Node => {
    if (!isObj(n)) return n;
    const props = isObj(n.props) ? n.props : null;
    let next: Node = n;
    if (props && (props.showIf !== undefined || props.fromSetting !== undefined)) {
      const { showIf: _s, fromSetting: _f, ...rest } = props;
      next = { ...n, props: rest };
    }
    return Array.isArray(n.children) ? { ...next, children: n.children.map(walk) } : next;
  };
  if (!isObj(tree) || !isObj((tree as { root?: unknown }).root)) return tree;
  return { ...(tree as object), root: walk((tree as unknown as { root: Node }).root) } as T;
}

/** A page's tree as the shop gets it: with its site's public settings, or with the marks taken off when it is in no site that has any. */
export async function shopTree<T>(tree: T, of: { kind: "page" | "table"; id: string }): Promise<T> {
  const s = await settingsFor(of.kind, of.id);
  return s ? withSettings(tree, publicValues(s.decls, s.values)) : strip(tree);
}
