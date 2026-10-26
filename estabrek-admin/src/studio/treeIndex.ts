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
  cta: () => tr("الزر", "Button"),
  roseFilmLines: () => tr("سطور الفيلم", "Film lines"),
  roseFilmClosing: () => tr("السطر الأخير", "Closing line"),
};
/** The rose scenes' own parts (roseScenes.<scene>.<part>.<field>.<language>). */
const SCENE_PART: Record<string, () => string> = {
  winter: () => tr("الشتاء", "Winter"),
  spring: () => tr("الربيع", "Spring"),
  accessories: () => tr("الإكسسوارات", "Accessories"),
  kids: () => tr("الأطفال", "Kids"),
  incense: () => tr("المباخر", "Incense"),
};
export function fieldLabel(path: string): string {
  if (FIELD_LABEL[path]) return FIELD_LABEL[path]();
  const scene = /^roseScenes\.\w+\.(?:(\w+)\.)?(\w+)\.(?:ar|en|he)$/.exec(path);
  if (scene) {
    const name = FIELD_LABEL[scene[2]]?.() ?? scene[2];
    return scene[1] ? `${name} · ${SCENE_PART[scene[1]]?.() ?? scene[1]}` : name;
  }
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

/**
 * From the page to this node: [page, section, grid, …]. What isn't a tree node (a field, a
 * piece of an old section or scene) climbs through `up` (its measured parents, see shapesOf);
 * without it a field's parent is its section and a scene's the page.
 */
export function pathTo(index: TreeIndex, id: string | null, up?: ReadonlyMap<string, string | null>): string[] {
  const out: string[] = [];
  let at = id;
  while (at && out.length < 64) {
    out.unshift(at);
    if (index.nodes.has(at)) at = index.nodes.get(at)!.parentId;
    else if (up?.has(at)) at = up.get(at) ?? null;
    else if (at.startsWith("slot:")) at = index.bySection.get(at.split(":")[1]) ?? index.root;
    else if (at.startsWith("block:")) at = index.root;
    else at = null;
  }
  return out;
}

export const isRelated = (index: TreeIndex, up?: ReadonlyMap<string, string | null>) => (a: Shape, b: Shape) => pathTo(index, a.id, up).includes(b.id) || pathTo(index, b.id, up).includes(a.id);

/** Inside an old section or rose scene ("owner": "s:<section id>" or "b:<scene>"), see the shop's pageTree/StudioBridge. */
export type BridgeItem =
  /** `holder`: the box a freely placed element is placed in. */
  | { kind: "node"; id: string; rect: Box; holder?: Box }
  | { kind: "legacy"; sectionId: string; rect: Box }
  /** `owner` is missing from a shop that hasn't learnt it yet (then it's the field's section). */
  | { kind: "slot"; owner?: string; sectionId: string; block?: string; path: string; edit: SlotEdit; media?: "image" | "video"; link?: string; within?: string; rect: Box }
  | { kind: "part"; owner: string; name: string; n: number; count: number; within?: string; rect: Box }
  | { kind: "auto"; owner: string; n: number; tag: string; label?: string; within?: string; rect: Box }
  | { kind: "block"; block: string; rect: Box };

/** How a field is written: words in place (one line, or several), a list of lines in the panel, a picture or clip. */
export type SlotEdit = "text" | "lines" | "list" | "media";
/**
 * What a shape that isn't a tree node is: a field of an old section or scene (`sectionId`
 * holds its data, `owner` is where it shows, `link` its button's link field), a rose scene,
 * a marked piece (`n` of `count` alike in its owner) or anything else seen there.
 */
export type Extra =
  | { kind: "slot"; owner: string; sectionId: string; block?: string; path: string; edit: SlotEdit; media?: "image" | "video"; link?: string }
  | { kind: "block"; block: string }
  | { kind: "part"; owner: string; name: string; n: number; count: number }
  | { kind: "auto"; owner: string; n: number; tag: string; label?: string };
export const slotId = (sectionId: string, path: string) => `slot:${sectionId}:${path}`;
export const blockId = (index: TreeIndex, block: string) => (index.nodes.has(`rb-${block}`) ? `rb-${block}` : `block:${block}`);
/** A field's id: its section's, or its scene's. */
const fieldId = (owner: string, path: string) => (owner.startsWith("b:") ? `bslot:${owner.slice(2)}:${path}` : slotId(owner.slice(2), path));
export type BridgeLayout = { pageId: string; lang: string; dir: string; viewport: { w: number; h: number }; scroll: Pt; doc: { w: number; h: number }; items: BridgeItem[] };

/**
 * Every measured thing as a screen shape: tree nodes, old sections, the rose scenes, and
 * inside those the fields, marked pieces and anything else seen (each under the field or
 * piece around it, else its section or scene); the page itself is the frame's visible window.
 * `up` has the parent of every shape that isn't a tree node (for pathTo).
 */
export function shapesOf(index: TreeIndex, layout: BridgeLayout, pan: Pt, zoom: number): { shapes: Shape[]; extras: Map<string, Extra>; up: Map<string, string | null> } {
  const shapes: Shape[] = [{ id: index.root, depth: 0, parentId: null, box: { x: pan.x, y: pan.y, w: layout.viewport.w * zoom, h: layout.viewport.h * zoom } }];
  const extras = new Map<string, Extra>();
  const up = new Map<string, string | null>();
  const ownerId = (owner: string) => (owner.startsWith("b:") ? blockId(index, owner.slice(2)) : index.bySection.get(owner.slice(2)));
  const inner: Array<{ id: string; owner: string; within?: string; box: Box }> = [];
  const keyed = new Map<string, string>();
  for (const item of layout.items) {
    const box = toScreen(item.rect, layout.scroll, pan, zoom);
    if (item.kind === "slot" || item.kind === "part" || item.kind === "auto") {
      const owner = item.kind === "slot" ? item.owner ?? `s:${item.sectionId}` : item.owner;
      if (!ownerId(owner) || (owner.startsWith("s:") && !index.nodes.has(ownerId(owner)!))) continue;
      const id = item.kind === "slot" ? fieldId(owner, item.path) : item.kind === "part" ? `part:${owner}:${item.name}:${item.n}` : `auto:${owner}:${item.n}`;
      if (extras.has(id)) continue;
      extras.set(
        id,
        item.kind === "slot"
          ? { kind: "slot", owner, sectionId: item.sectionId, ...(item.block ? { block: item.block } : {}), path: item.path, edit: item.edit, media: item.media, ...(item.link ? { link: item.link } : {}) }
          : item.kind === "part"
            ? { kind: "part", owner, name: item.name, n: item.n, count: item.count }
            : { kind: "auto", owner, n: item.n, tag: item.tag, ...(item.label ? { label: item.label } : {}) },
      );
      keyed.set(`${owner}|${item.kind === "slot" ? `f:${item.path}` : item.kind === "part" ? `p:${item.name}:${item.n}` : `a:${item.n}`}`, id);
      inner.push({ id, owner, within: item.within, box });
      continue;
    }
    if (item.kind === "block") {
      const id = blockId(index, item.block);
      extras.set(id, { kind: "block", block: item.block });
      const placed = index.nodes.get(id);
      shapes.push({ id, depth: placed?.depth ?? 1, parentId: placed?.parentId ?? index.root, box });
      if (!placed) up.set(id, index.root);
      continue;
    }
    const id = item.kind === "node" ? item.id : index.bySection.get(item.sectionId);
    const at = id ? index.nodes.get(id) : undefined;
    if (!id || !at || id === index.root) continue;
    shapes.push({ id, depth: at.depth, parentId: at.parentId, box });
  }
  // Each one under the field or piece around it (when that one is measured too), else its owner.
  for (const it of inner) up.set(it.id, (it.within && keyed.get(`${it.owner}|${it.within}`)) || ownerId(it.owner)!);
  const depthOf = (id: string, seen = 0): number => {
    const n = index.nodes.get(id);
    if (n) return n.depth;
    const p = up.get(id);
    return p && seen < 32 ? depthOf(p, seen + 1) + 1 : 1;
  };
  for (const it of inner) shapes.push({ id: it.id, depth: depthOf(it.id), parentId: up.get(it.id) ?? null, box: it.box });
  return { shapes, extras, up };
}

/** What the shop calls a marked piece, as the owner knows it. */
const PART_LABEL: Record<string, () => string> = {
  card: () => tr("بطاقة منتج", "Product card"),
  "card-image": () => tr("صورة البطاقة", "Card picture"),
  "card-name": () => tr("اسم المنتج", "Product name"),
  "card-price": () => tr("السعر", "Price"),
  "card-category": () => tr("تصنيف البطاقة", "Card category"),
  "card-add": () => tr("زر الإضافة السريعة", "Quick add button"),
  category: () => tr("اسم التصنيف", "Category name"),
  mascot: () => tr("الشخصية", "Mascot"),
  scene: () => tr("المشهد ثلاثي الأبعاد", "3D scene"),
  meter: () => tr("مؤشر التقدّم", "Progress meter"),
  steps: () => tr("خطوات الفيلم", "Film steps"),
  cue: () => tr("دعوة للنزول", "Scroll cue"),
  film: () => tr("فيلم الافتتاح", "Opening film"),
  "closing-text": () => tr("نص الختام", "Closing text"),
  "faq-item": () => tr("سؤال وجواب", "Question and answer"),
  handle: () => tr("زر الحساب", "Account button"),
  tiles: () => tr("صور إنستغرام", "Instagram pictures"),
  tile: () => tr("صورة", "Picture"),
};
export const partLabel = (name: string) => PART_LABEL[name]?.() ?? name;

/** Anything else seen, by its kind. */
const TAG_LABEL: Record<string, () => string> = {
  img: () => tr("صورة", "Picture"),
  picture: () => tr("صورة", "Picture"),
  video: () => tr("فيديو", "Video"),
  svg: () => tr("رسمة", "Drawing"),
  canvas: () => tr("رسمة متحركة", "Animated drawing"),
  a: () => tr("رابط", "Link"),
  button: () => tr("زر", "Button"),
  p: () => tr("نص", "Text"),
  li: () => tr("عنصر قائمة", "List item"),
  blockquote: () => tr("اقتباس", "Quote"),
  figure: () => tr("صورة مع وصف", "Figure"),
};
export const tagLabel = (tag: string) => (/^h[1-6]$/.test(tag) ? tr("عنوان", "Heading") : TAG_LABEL[tag]?.() ?? tag);
