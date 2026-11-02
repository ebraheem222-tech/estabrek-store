/**
 * The page editor's shared styles (backend lib/siteStyles.ts, shop pageTree/css.ts): every
 * heading of a level and the body text take their text style, each button kind its button
 * style, and an element can take a named style (props.styleId). The editor changes a draft
 * the frame shows; publishing puts it on every page. A style is edited like an element: as
 * a node whose look is the style's, with the same panels (states and screens included).
 */
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import type { SiteStyle, SiteStyleKind } from "../api/siteStyles.api";
import { tr } from "../lib/words";

export const AUTO: Record<SiteStyleKind, string[]> = {
  text: ["h1", "h2", "h3", "h4", "h5", "h6", "body"],
  button: ["solid", "outline", "link"],
  box: [],
};
const AUTO_LABEL: Record<string, () => string> = {
  h1: () => tr("عنوان 1 (الأكبر)", "Heading 1 (biggest)"),
  h2: () => tr("عنوان 2", "Heading 2"),
  h3: () => tr("عنوان 3", "Heading 3"),
  h4: () => tr("عنوان 4", "Heading 4"),
  h5: () => tr("عنوان 5", "Heading 5"),
  h6: () => tr("عنوان 6 (الأصغر)", "Heading 6 (smallest)"),
  body: () => tr("النص العادي", "Body text"),
  solid: () => tr("زر معبّى", "Solid button"),
  outline: () => tr("زر بإطار", "Outline button"),
  link: () => tr("زر رابط", "Link button"),
};
export const KIND_LABEL: Record<SiteStyleKind, () => string> = {
  text: () => tr("ستايلات الكلام", "Text styles"),
  button: () => tr("ستايلات الأزرار", "Button styles"),
  box: () => tr("ستايلات الصناديق", "Box styles"),
};
export const isAuto = (s: { id: string; kind: SiteStyleKind }) => AUTO[s.kind].includes(s.id);
export const styleLabel = (s: { id: string; kind: SiteStyleKind; name?: string }) => (isAuto(s) ? AUTO_LABEL[s.id]() : s.name || s.id);

/** Each kind's styles as the list shows them: the ones taken by themselves (saved or not yet), then the named ones. */
export function listOf(styles: SiteStyle[], kind: SiteStyleKind): SiteStyle[] {
  const own = styles.filter((s) => s.kind === kind);
  const auto = AUTO[kind].map((id) => own.find((s) => s.id === id) ?? { id, kind, style: {} });
  return [...auto, ...own.filter((s) => !AUTO[kind].includes(s.id))];
}
export const styleOf = (styles: SiteStyle[], id: string): SiteStyle | null => {
  const saved = styles.find((s) => s.id === id);
  if (saved) return saved;
  const kind = (Object.keys(AUTO) as SiteStyleKind[]).find((k) => AUTO[k].includes(id));
  return kind ? { id, kind, style: {} } : null;
};

/** The node type a style draws as (the panels choose what to show by it). */
export const nodeTypeOf = (s: { id: string; kind: SiteStyleKind }) => (s.kind === "button" ? "button" : s.kind === "box" ? "section" : /^h[1-6]$/.test(s.id) ? "heading" : "text");
const PREFIX = "site:";
/** A style as a node the style panels can edit. */
export const styleNode = (s: SiteStyle): PageTreeNode => ({ id: `${PREFIX}${s.id}`, type: nodeTypeOf(s), props: {}, style: s.style });

/** The panels' changes to a style's node, as the new list of styles (an empty style that's taken by itself goes). */
export function withOps(styles: SiteStyle[], id: string, ops: PageDraftOp[]): SiteStyle[] {
  const s = styleOf(styles, id);
  if (!s) return styles;
  const style = { ...s.style } as Record<string, Record<string, unknown>>;
  for (const o of ops) {
    if (o.op !== "setStyle" || o.nodeId !== `${PREFIX}${id}`) continue;
    if (o.style && Object.keys(o.style).length) style[o.screen] = o.style;
    else delete style[o.screen];
  }
  const next: SiteStyle = { ...s, style };
  const empty = !Object.keys(style).length;
  const rest = styles.filter((x) => x.id !== id);
  if (empty && isAuto(s)) return rest;
  const at = styles.findIndex((x) => x.id === id);
  if (at < 0) return [...styles, next];
  return styles.map((x) => (x.id === id ? next : x));
}

/** A new named style's id: from its name when it's in English letters, else style-N. */
export function newStyleId(name: string, styles: SiteStyle[]): string {
  const taken = new Set([...styles.map((s) => s.id), ...Object.values(AUTO).flat()]);
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/^[^a-z]+/, "").slice(0, 24);
  const stem = base || "style";
  if (base && !taken.has(base)) return base;
  for (let i = 1; ; i++) if (!taken.has(`${stem}-${i}`)) return `${stem}-${i}`;
}

/** The kind of named style an element can take. */
export const kindFor = (type: string): SiteStyleKind => (type === "heading" || type === "text" ? "text" : type === "button" ? "button" : "box");
/** The style an element takes by itself (a heading its level's, the body text, a button its kind's), if any. */
export function autoFor(node: PageTreeNode): string | null {
  const p = node.props ?? {};
  if (node.type === "heading") return `h${Math.min(6, Math.max(1, Number(p.level) || 2))}`;
  if (node.type === "text") return "body";
  if (node.type === "button") return ["solid", "outline", "link"].includes(String(p.variant)) ? String(p.variant) : "solid";
  return null;
}
