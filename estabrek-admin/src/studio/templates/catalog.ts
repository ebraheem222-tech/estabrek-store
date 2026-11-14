/**
 * The templates the gallery lists and builds: sections (a recipe in a skin) and whole
 * pages, built for the store's kind, language and motion; and the file a template, a
 * section or a page goes out to and comes back from (export / import).
 */
import { ctxOf, type BuildOptions, type Ids, type N, type Skin } from "./build";
import { PAGES, PAGE_KINDS, PAGE_KIND_NAMES, type PageKind } from "./pages";
import { CAT_NAMES, RECIPES, SECTION_CATS, type SectionCat } from "./sections";
import { w, type Campaign, type Family, type W } from "./words";

export type Template = {
  id: string;
  kind: "section" | "page";
  /** Its category (a section's) or kind of page. */
  group: SectionCat | PageKind;
  name: W;
  skin?: Skin;
  /** A home made for one kind of store. */
  fam?: Family;
  campaign?: Campaign;
  /** It goes over the page (a popup), not between sections. */
  popup?: boolean;
};

export const SKIN_NAMES: Record<Skin, W> = {
  plain: w("فاتح", "Light", "בהיר"),
  soft: w("ناعم", "Soft", "רך"),
  surface: w("سطح", "Surface", "משטח"),
  bold: w("بلون المتجر", "In the store's colour", "בצבע החנות"),
  // The theme's text colour as the ground: dark in a light theme, light in a dark one.
  dark: w("ألوان معكوسة", "Inverted", "צבעים הפוכים"),
  campaign: w("بألوان المناسبة", "In the occasion's colours", "בצבעי האירוע"),
};
export { CAT_NAMES, PAGE_KINDS, PAGE_KIND_NAMES, SECTION_CATS };

const SECTION_BY_KEY = new Map(RECIPES.map((r) => [r.key, r]));
const PAGE_BY_KEY = new Map(PAGES.map((p) => [p.key, p]));

export const SECTION_TEMPLATES: Template[] = RECIPES.flatMap((r) =>
  r.skins.map((skin): Template => ({ id: `s:${r.key}:${skin}`, kind: "section", group: r.cat, name: r.name, skin, ...(r.campaign ? { campaign: r.campaign } : {}), ...(r.cat === "popup" ? { popup: true } : {}) })),
);
export const PAGE_TEMPLATES: Template[] = PAGES.map((p): Template => ({ id: `p:${p.key}`, kind: "page", group: p.kind, name: p.name, ...(p.fam ? { fam: p.fam } : {}), ...(p.campaign ? { campaign: p.campaign } : {}) }));
export const templateById = (id: string) => SECTION_TEMPLATES.find((t) => t.id === id) ?? PAGE_TEMPLATES.find((t) => t.id === id) ?? null;

/** A template's sections (or its popup), built for the store; null for an unknown one. */
export function buildTemplate(id: string, o: BuildOptions): N[] | null {
  const [kind, key, skin] = id.split(":");
  if (kind === "s") {
    const r = SECTION_BY_KEY.get(key);
    if (!r || !r.skins.includes(skin as Skin)) return null;
    return [r.build(ctxOf({ ...o, skin: skin as Skin, ...(r.campaign ? { paint: r.campaign.colors } : {}) }))];
  }
  if (kind === "p") {
    const p = PAGE_BY_KEY.get(key);
    return p ? p.build(ctxOf({ ...o, fam: p.fam ?? o.fam })) : null;
  }
  return null;
}

/** Does a template's name (in any language), its group's or its skin's match the words looked for? */
export function matches(t: Template, q: string): boolean {
  const words = q.trim().toLowerCase();
  if (!words) return true;
  const group = t.kind === "section" ? CAT_NAMES[t.group as SectionCat] : PAGE_KIND_NAMES[t.group as PageKind];
  const hay = [t.name, group, ...(t.skin ? [SKIN_NAMES[t.skin]] : [])].flatMap((x) => [x.ar, x.en, x.he]).join(" ").toLowerCase();
  return words.split(/\s+/).every((part) => hay.includes(part));
}

/* ------------------------------------------------------------------- files */

export const FILE_KIND = "estabrek-template";
const LIMITS = { sections: 20, nodes: 2000, depth: 12 };
export type TemplateFile = { kind: typeof FILE_KIND; version: 1; name: string; sections: N[] };

/** A template, a section or a page as a file of its own. */
export function toFile(name: string, sections: N[]): string {
  const file: TemplateFile = { kind: FILE_KIND, version: 1, name: name.trim().slice(0, 80), sections };
  return JSON.stringify(file, null, 2);
}

export type ReadFile = { ok: true; name: string; sections: N[] } | { ok: false; why: "json" | "kind" | "empty" | "shape" | "big" };
const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
/** A node's shape (the backend checks every value when it's added). */
function shaped(v: unknown, depth: number, count: { n: number }): boolean {
  if (!isObj(v) || depth > LIMITS.depth || ++count.n > LIMITS.nodes) return false;
  if (typeof v.id !== "string" || typeof v.type !== "string" || !isObj(v.props)) return false;
  if (v.style !== undefined && !isObj(v.style)) return false;
  if (v.motion !== undefined && !isObj(v.motion)) return false;
  if (v.children !== undefined && (!Array.isArray(v.children) || !v.children.every((c) => shaped(c, depth + 1, count)))) return false;
  return true;
}
/** A template file read back: sections (and popups) only, in their shape. */
export function readFile(text: string): ReadFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, why: "json" };
  }
  if (!isObj(raw) || raw.kind !== FILE_KIND) return { ok: false, why: "kind" };
  const list = raw.sections;
  if (!Array.isArray(list) || !list.length) return { ok: false, why: "empty" };
  if (list.length > LIMITS.sections) return { ok: false, why: "big" };
  const count = { n: 0 };
  if (!list.every((n) => shaped(n, 1, count) && (n.type === "section" || n.type === "popup"))) return { ok: false, why: count.n > LIMITS.nodes ? "big" : "shape" };
  return { ok: true, name: typeof raw.name === "string" ? raw.name.trim().slice(0, 80) : "", sections: list as N[] };
}

/** A copy with new ids all the way down (so it can go on a page next to itself). */
export function freshIds(node: N, ids: Ids): N {
  const copy: N = { ...structuredClone(node), id: ids(node.type.slice(0, 4)), ...(node.children ? { children: node.children.map((c) => freshIds(c, ids)) } : {}) };
  // A presentation names its panels by their ids: the names go with the panels to their new ids.
  if (node.type === "deck" && node.children && isObj(node.props.labels)) {
    const labels = node.props.labels;
    copy.props.labels = Object.fromEntries(node.children.flatMap((child, i) => (labels[child.id] !== undefined ? [[copy.children![i].id, structuredClone(labels[child.id])]] : [])));
  }
  return copy;
}
