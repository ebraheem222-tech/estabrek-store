/**
 * What a site module is, and the pieces modules build with: the library's sections in a skin, lists
 * reading a table, headings, page titles, calling bands, table fields and the ready pictures.
 */
import { B, H, P, SEC, STACK, eyebrow, mo, say, withSkin, type Ctx, type N, type Skin } from "../../build";
import { RECIPES } from "../../sections";
import type { W } from "../../words";
import type { ModuleKey, SiteBlueprint, SiteModules, SiteSetting } from "../blueprint";

/* ---------------- The file a site becomes ---------------- */

/** A whole site as a feature template file (the backend's TemplateSchema). */
export type SiteFile = {
  format: "estabrek.feature";
  formatVersion: 1;
  key: string;
  version: string;
  name: W;
  note: W;
  tables: SiteTable[];
  functions: Array<{ key: string; name: string; note?: string; def: Record<string, unknown>; triggers: Array<{ kind: "row"; config: Record<string, unknown> }> }>;
  pages: Array<{ key: string; name: string; slug: string; tree: Tree; seo?: { title?: string; description?: string } }>;
  needs: { secrets: string[]; sites: string[] };
  /** What its owner can change (blueprint.ts SiteSetting); none: the key is left out. */
  settings?: SiteSetting[];
};
export type SiteTable = { key: string; slug: string; name: W; fields: Field[]; api?: Record<string, unknown>; itemPage?: Tree; rows?: Array<{ slug?: string; data: Record<string, unknown> }> };
export type Field = Record<string, unknown> & { id: string; type: string };
export type Tree = { version: 1; root: N };
export type Lang = "ar" | "en" | "he";

/* ---------------- What a module is ---------------- */

/** A site's pages' addresses by page key ("home", "offers", "book"…), in the order the site lists them. */
export type Slugs = { home: string } & Record<string, string>;
/**
 * A site while it is built: its blueprint, its modules' words, its pages' addresses, and the tables
 * its visitors write into (the modules' `inbox`, in the modules' order).
 */
export type Built = { bp: SiteBlueprint; use: SiteModules; slugs: Slugs; inbox: string[] };
export type Part = (c: Ctx) => N;

/** One of a site's pages: where it is, where it comes in the site's list, and its sections. */
export type SitePage = { key: string; slug: string; order: number; name: W; seo: W; parts: (b: Built) => Part[] };

/** A module: a whole piece of a site (its main list, its news, its bookings…) with what it brings. */
export type SiteModule = {
  key: ModuleKey;
  name: W;
  note: W;
  /** Other modules it can't work without (a booking with no options of its own picks from the main list). */
  needs?: (bp: SiteBlueprint) => ModuleKey[];
  /** Its pages. */
  pages?: (bp: SiteBlueprint) => SitePage[];
  /** Its tables (built after every page, in the modules' order). */
  tables?: (b: Built, c: Ctx) => SiteTable[];
  /** The tables its visitors write into: the owner hears of each new row. */
  inbox?: string[];
  functions?: (b: Built) => SiteFile["functions"];
  /** How many tables and ready rows it brings (the gallery's line, without building it). */
  counts?: (bp: SiteBlueprint) => { tables: number; rows: number };
  /** What its owner can change: read by its pages (`showIf`, `fromSetting`) and its functions ("{{settings.key}}"). */
  settings?: (bp: SiteBlueprint) => SiteSetting[];
};

/* ---------------- Building pieces ---------------- */

const BY_KEY = new Map(RECIPES.map((r) => [r.key, r]));
/** A library section in a skin. */
export const S = (key: string, skin: Skin): Part => (c) => {
  const r = BY_KEY.get(key);
  if (!r) throw new Error(`No section “${key}”`);
  return r.build(withSkin(c, skin));
};
/** A table's reference, where a list names it (installing makes it this store's id). */
export const T = (key: string) => `@table:${key}`;
/** An element whose props take a row's values (`{ text: "title" }`). */
export const bound = (n: N, bind: Record<string, string>): N => ({ ...n, props: { ...n.props, bind } });
export const still = { motion: false } as const;
/** An element shown on the shop only while one of the site's settings is `is` (a switch on, unless said). */
export const shownIf = (n: N, setting: string, is: boolean | string | number = true): N => ({ ...n, props: { ...n.props, showIf: is === true ? { setting } : { setting, is } } });
/** An element whose words on the shop are one of the site's settings (its text, a button's label). */
export const fromSetting = (n: N, take: { text?: string; label?: string }): N => ({ ...n, props: { ...n.props, fromSetting: take } });

/** A list of a table's rows drawn with the page (its card repeated once a row, in the owner's order). */
export function LIST(c: Ctx, table: string, card: N, o: { columns: number; limit?: number; where?: Array<{ field: string; op: string; value?: string }>; empty?: W }): N {
  return {
    id: c.ids("list"),
    type: "collectionList",
    props: { collectionId: T(table), sort: "order", limit: o.limit ?? 24, columns: o.columns, ...(o.where?.length ? { where: o.where } : {}), ...(o.empty ? { empty: say(c, o.empty) } : {}) },
    style: { base: { gap: 24, self: "stretch" } },
    motion: mo.group(c),
    children: [card],
  };
}
/** A section's heading: an eyebrow, a title, a line under it. */
export function head(c: Ctx, title: W, sub?: W, o: { eyebrow?: W; center?: boolean } = {}): N {
  const center = o.center ?? true;
  return STACK(c, [...(o.eyebrow ? [eyebrow(c, o.eyebrow)] : []), H(c, title, 2), ...(sub ? [P(c, sub, { style: { maxWidth: "620px" } })] : [])], { gap: 12, margin: [0, 0, 40, 0], ...(center ? { align: "center", textAlign: "center" } : {}) });
}
/** A page's own title at its top. */
export const pageHead = (title: W, sub: W, skin: Skin = "soft"): Part => (c) => {
  const k = withSkin(c, skin);
  return SEC(k, [STACK(k, [H(k, title, 1), P(k, sub, { style: { size: 19, maxWidth: "620px" } })], { align: "center", textAlign: "center", gap: 14 })], { name: title, pad: [96, 24, 72, 24] });
};
/** A band calling to one thing (booking, writing to us). */
export const callBand = (title: W, sub: W, button: W, href: string, skin: Skin = "bold"): Part => (c) => {
  const k = withSkin(c, skin);
  return SEC(k, [STACK(k, [H(k, title, 2), P(k, sub, { style: { maxWidth: "560px" } }), STACK(k, [B(k, button, href)], { direction: "row", justify: "center" })], { gap: 16, align: "center", textAlign: "center" })], { name: title, pad: [80, 24, 80, 24] });
};
/** A table's item page: one section on a page. */
export const tree = (node: N): Tree => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [node] } });

/* ---------------- Tables ---------------- */

type Obj = Record<string, unknown>;
export const f = {
  text: (id: string, name: W, more: Obj = {}): Field => ({ id, type: "text", name, ...more }),
  long: (id: string, name: W, more: Obj = {}): Field => ({ id, type: "longText", name, ...more }),
  image: (id: string, name: W): Field => ({ id, type: "image", name }),
  money: (id: string, name: W): Field => ({ id, type: "money", name, currency: "ILS" }),
  bool: (id: string, name: W): Field => ({ id, type: "boolean", name }),
  date: (id: string, name: W): Field => ({ id, type: "date", name }),
  phone: (id: string, name: W, more: Obj = {}): Field => ({ id, type: "phone", name, ...more }),
  email: (id: string, name: W): Field => ({ id, type: "email", name }),
  select: (id: string, name: W, options: Array<[string, W]>, more: Obj = {}): Field => ({ id, type: "select", name, options: options.map(([oid, oname]) => ({ id: oid, name: oname })), ...more }),
};
/** Ready pictures in turn: the site's kind's, else the plain ones. */
export const picOf = (bp: SiteBlueprint, n: number) => (bp.pics ? `/templates/${bp.pics}/product-${(n % 6) + 1}.svg` : `/templates/photo-${(n % 6) + 1}.svg`);
export const plainPic = (n: number) => `/templates/photo-${(n % 6) + 1}.svg`;
/** Visitors may add a row (a message, a booking); nobody reads them but the store's own members. */
export const WRITE_ONLY = { read: "off", create: "public", update: "off", delete: "off", private: [] as string[] };
