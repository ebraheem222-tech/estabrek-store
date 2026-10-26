/**
 * The page tree as the editor walks it: each node's parent, depth and children,
 * the old sections by their section id, a label for every node, and the shapes
 * the geometry picks from (the bridge's boxes put on the screen).
 */
import type { PageTree, PageTreeNode } from "../api/pages.api";
import { adminLang } from "../lib/lang";
import { tr } from "../lib/words";
import { toScreen, type Box, type Pt, type Shape } from "./geometry";

export type IndexedNode = { node: PageTreeNode; parentId: string | null; depth: number; children: string[] };
export type TreeIndex = { root: string; nodes: Map<string, IndexedNode>; bySection: Map<string, string> };

export function indexTree(tree: PageTree): TreeIndex {
  const nodes = new Map<string, IndexedNode>();
  const bySection = new Map<string, string>();
  const walk = (n: PageTreeNode, parentId: string | null, depth: number) => {
    nodes.set(n.id, { node: n, parentId, depth, children: (n.children ?? []).map((c) => c.id) });
    if (n.type === "legacy" && typeof n.props?.sectionId === "string") bySection.set(n.props.sectionId, n.id);
    (n.children ?? []).forEach((c) => walk(c, n.id, depth + 1));
  };
  walk(tree.root, null, 0);
  return { root: tree.root.id, nodes, bySection };
}

export const TYPE_LABEL: Record<string, () => string> = {
  page: () => tr("الصفحة", "Page"),
  section: () => tr("قسم", "Section"),
  grid: () => tr("شبكة", "Grid"),
  stack: () => tr("صف أو عمود", "Stack"),
  columns: () => tr("أعمدة", "Columns"),
  cell: () => tr("خلية", "Cell"),
  heading: () => tr("عنوان", "Heading"),
  text: () => tr("نص", "Text"),
  image: () => tr("صورة", "Image"),
  button: () => tr("زر", "Button"),
  video: () => tr("فيديو", "Video"),
  slider: () => tr("سلايدر", "Slider"),
  svg: () => tr("رسمة", "Drawing"),
  product360: () => tr("منتج 360°", "Product 360°"),
  spacer: () => tr("مسافة", "Spacer"),
  divider: () => tr("فاصل", "Divider"),
  icon: () => tr("أيقونة", "Icon"),
  products: () => tr("منتجات", "Products"),
  categories: () => tr("أقسام المتجر", "Store categories"),
  form: () => tr("نموذج", "Form"),
  roseBlock: () => tr("بلوك ورد", "Rose block"),
  legacy: () => tr("قسم", "Section"),
};
export const typeLabel = (type: string) => TYPE_LABEL[type]?.() ?? type;

/** The old sections' kinds, as the shop's owner knows them. */
const SECTION_LABEL: Record<string, () => string> = {
  HERO: () => tr("الافتتاح", "Opening"),
  RICH_TEXT: () => tr("نص", "Text"),
  FAQ: () => tr("أسئلة شائعة", "FAQ"),
  CTA: () => tr("دعوة للشراء", "Call to action"),
  TESTIMONIALS: () => tr("آراء الزبائن", "Customer reviews"),
  COLLECTIONS_GRID: () => tr("المجموعات", "Collections"),
  FEATURED_CATEGORIES: () => tr("التصنيفات المميزة", "Featured categories"),
  FEATURED_PRODUCTS: () => tr("منتجات مختارة", "Featured products"),
  NEW_ARRIVALS_SLIDER: () => tr("وصل حديثاً", "New arrivals"),
  BEST_SELLERS_SLIDER: () => tr("الأكثر مبيعاً", "Best sellers"),
  BRANDS_SLIDER: () => tr("شريط الصور", "Picture strip"),
  IMAGE_GALLERY: () => tr("معرض صور", "Gallery"),
  BANNER: () => tr("بانر", "Banner"),
  VIDEO: () => tr("فيديو", "Video"),
  NEWSLETTER: () => tr("النشرة البريدية", "Newsletter"),
  CONTACT: () => tr("تواصل", "Contact"),
};
export const sectionLabel = (type?: string) => (type ? SECTION_LABEL[type]?.() ?? type : "");

/** A field inside an old section, by its path (items.2.question = "Question 3"). */
const FIELD_LABEL: Record<string, () => string> = {
  eyebrow: () => tr("سطر فوق العنوان", "Line above the title"),
  roseKicker: () => tr("الكلمة الصغيرة", "Small word"),
  roseTitle: () => tr("العنوان الكبير", "Big title"),
  title: () => tr("العنوان", "Title"),
  subtitle: () => tr("الوصف", "Description"),
  text: () => tr("النص", "Text"),
  "primaryButton.label": () => tr("الزر الأول", "First button"),
  "secondaryButton.label": () => tr("الزر الثاني", "Second button"),
  "button.label": () => tr("الزر", "Button"),
  buttonLabel: () => tr("الزر", "Button"),
  roseNote: () => tr("ملاحظة", "Note"),
  roseScrollCue: () => tr("دعوة للنزول", "Scroll cue"),
  badge: () => tr("الشارة", "Badge"),
  roseBrandCaption: () => tr("تعليق العلامة", "Brand caption"),
  roseImageCaption: () => tr("تعليق الصورة", "Picture caption"),
  roseCategoryNavLabel: () => tr("عنوان التصنيفات", "Categories label"),
  roseImageUrl: () => tr("صورة الافتتاح", "Opening picture"),
  "roseVideo.url": () => tr("فيديو الافتتاح", "Opening clip"),
  imageUrl: () => tr("الصورة", "Picture"),
  label: () => tr("الاسم", "Name"),
  question: () => tr("سؤال", "Question"),
  answer: () => tr("جواب", "Answer"),
  quote: () => tr("رأي", "Review"),
  name: () => tr("الاسم", "Name"),
};
export function fieldLabel(path: string): string {
  if (FIELD_LABEL[path]) return FIELD_LABEL[path]();
  const m = /^(?:\w+)\.(\d+)\.(.+)$/.exec(path);
  if (m) return `${FIELD_LABEL[m[2]]?.() ?? m[2]} ${Number(m[1]) + 1}`;
  return FIELD_LABEL[path.split(".").pop() ?? ""]?.() ?? path;
}

const words = (t: unknown) => {
  if (typeof t === "string") return t;
  if (!t || typeof t !== "object") return "";
  const m = t as Record<string, string>;
  return m[adminLang()] || m.ar || m.en || m.he || "";
};

/** What a node is called in the layers list: its name, its words, or its kind. */
export function nodeName(n: PageTreeNode, sectionType?: string): string {
  if (n.name) return n.name;
  const p = (n.props ?? {}) as Record<string, unknown>;
  const said = words(p.text) || words(p.label) || words(p.title);
  if (said) return said.length > 40 ? `${said.slice(0, 40)}…` : said;
  if (n.type === "legacy") return sectionType ? sectionLabel(sectionType) : typeLabel("legacy");
  return typeLabel(n.type);
}

/** What a node is called, a cell by its place in its columns ("Cell 2"). */
export function nodeTitle(index: TreeIndex, id: string, sectionType?: string): string {
  const at = index.nodes.get(id);
  if (!at) return "";
  if (at.node.type === "cell" && at.parentId) return `${typeLabel("cell")} ${(index.nodes.get(at.parentId)?.children.indexOf(id) ?? 0) + 1}`;
  return nodeName(at.node, sectionType);
}

/** From the page to this node: [page, section, grid, …]; a field's parent is its section. */
export function pathTo(index: TreeIndex, id: string | null): string[] {
  const out: string[] = [];
  let at = id;
  while (at) {
    out.unshift(at);
    if (at.startsWith("slot:")) at = index.bySection.get(at.split(":")[1]) ?? index.root;
    else if (at.startsWith("block:")) at = index.root;
    else at = index.nodes.get(at)?.parentId ?? null;
  }
  return out;
}

export const isRelated = (index: TreeIndex) => (a: Shape, b: Shape) => pathTo(index, a.id).includes(b.id) || pathTo(index, b.id).includes(a.id);

export type BridgeItem =
  /** `holder`: the box a freely placed element is placed in. */
  | { kind: "node"; id: string; rect: Box; holder?: Box }
  | { kind: "legacy"; sectionId: string; rect: Box }
  | { kind: "slot"; sectionId: string; path: string; edit: "text" | "lines" | "media"; media?: "image" | "video"; rect: Box }
  | { kind: "block"; block: string; rect: Box };

/** What a shape that isn't a tree node is: a field inside an old section, or a rose scene. */
export type Extra = { kind: "slot"; sectionId: string; path: string; edit: "text" | "lines" | "media"; media?: "image" | "video" } | { kind: "block"; block: string };
export const slotId = (sectionId: string, path: string) => `slot:${sectionId}:${path}`;
export const blockId = (index: TreeIndex, block: string) => (index.nodes.has(`rb-${block}`) ? `rb-${block}` : `block:${block}`);
export type BridgeLayout = { pageId: string; lang: string; dir: string; viewport: { w: number; h: number }; scroll: Pt; doc: { w: number; h: number }; items: BridgeItem[] };

/**
 * Every measured thing as a screen shape: tree nodes, old sections, the fields
 * inside them (one level deeper than their section) and the rose scenes; the page
 * itself is the frame's visible window.
 */
export function shapesOf(index: TreeIndex, layout: BridgeLayout, pan: Pt, zoom: number): { shapes: Shape[]; extras: Map<string, Extra> } {
  const shapes: Shape[] = [{ id: index.root, depth: 0, parentId: null, box: { x: pan.x, y: pan.y, w: layout.viewport.w * zoom, h: layout.viewport.h * zoom } }];
  const extras = new Map<string, Extra>();
  for (const item of layout.items) {
    const box = toScreen(item.rect, layout.scroll, pan, zoom);
    if (item.kind === "slot") {
      const parentId = index.bySection.get(item.sectionId);
      const parent = parentId ? index.nodes.get(parentId) : undefined;
      if (!parentId || !parent) continue;
      const id = slotId(item.sectionId, item.path);
      extras.set(id, { kind: "slot", sectionId: item.sectionId, path: item.path, edit: item.edit, media: item.media });
      shapes.push({ id, depth: parent.depth + 1, parentId, box });
      continue;
    }
    if (item.kind === "block") {
      const id = blockId(index, item.block);
      extras.set(id, { kind: "block", block: item.block });
      shapes.push({ id, depth: 1, parentId: index.root, box });
      continue;
    }
    const id = item.kind === "node" ? item.id : index.bySection.get(item.sectionId);
    const at = id ? index.nodes.get(id) : undefined;
    if (!id || !at || id === index.root) continue;
    shapes.push({ id, depth: at.depth, parentId: at.parentId, box });
  }
  return { shapes, extras };
}
