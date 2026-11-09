/**
 * Collections (W3) as pure tree work (no imports: the editor's test page uses it too).
 *
 * - An element connects its props to an item's fields with `props.bind` ({ text: "title",
 *   src: "cover", href: "$url" }): on an item's page (the collection's template) and in each card
 *   of a list, the item's values take the place of the element's own (which stay as the design's
 *   sample). "$url" is the item's own page, "$slug" its address word.
 * - A `collectionList` holds one card (its first child); the shop gets a grid of that card once per
 *   item, the first keeping the card's own ids (so the editor selects and edits the card itself),
 *   the others renamed after it. With no items the card shows as designed in the editor, and the
 *   list's own "empty" words (or nothing) on the shop.
 */

type Local = Partial<Record<"ar" | "en" | "he", string>>;
type Node = { id: string; type: string; name?: string; props: Record<string, unknown>; style?: Record<string, Record<string, unknown> | undefined>; motion?: unknown; children?: Node[] };
type Tree = { version: number; root: Node };

export const FIELD_TYPES = ["text", "longText", "image", "number", "date", "link", "boolean", "select", "color"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];
export type Field = { id: string; type: FieldType; name?: Local; required?: boolean; options?: { id: string; name?: Local }[] };
export type CollectionLite = { id: string; slug: string; fields: Field[] };
export type ItemLite = { id: string; slug: string; data: Record<string, unknown>; publishedAt?: string | Date | null; createdAt?: string | Date | null; sort?: number };

/** The element props that take a field, and which fields each takes. */
export const BINDABLE: Record<string, string[]> = { heading: ["text"], text: ["text"], button: ["label", "href"], image: ["src", "alt", "href"], video: ["src"] };
const WORDS = new Set<FieldType>(["text", "longText", "number", "date", "select"]);
export const PROP_FIELDS: Record<string, readonly FieldType[]> = { text: [...WORDS], label: [...WORDS], alt: ["text", "longText"], src: ["image"], href: ["link"] };
export const BIND_REF = /^(\$url|\$slug|[a-z][a-zA-Z0-9]{0,30})$/;
const LANGS = ["ar", "en", "he"] as const;
const LOCALE: Record<(typeof LANGS)[number], string> = { ar: "ar", en: "en-GB", he: "he-IL" };

const each = (f: (lang: (typeof LANGS)[number]) => string | undefined): Local => {
  const out: Local = {};
  for (const l of LANGS) { const v = f(l); if (v) out[l] = v; }
  return out;
};

/** What a field gives one of an element's props (undefined: nothing, the element keeps its own). */
export function boundValue(prop: string, ref: string, item: ItemLite, collection: CollectionLite): unknown {
  if (ref === "$url") return prop === "href" ? `/${collection.slug}/${item.slug}` : undefined;
  if (ref === "$slug") return prop === "href" ? undefined : each(() => item.slug);
  const field = collection.fields.find((f) => f.id === ref);
  const v = item.data?.[ref];
  if (!field || v === undefined || v === null || v === "" || !(PROP_FIELDS[prop] ?? []).includes(field.type)) return undefined;
  switch (field.type) {
    case "text":
    case "longText": return v && typeof v === "object" ? v : undefined;
    case "number": return typeof v === "number" ? each((l) => v.toLocaleString(LOCALE[l])) : undefined;
    case "date": {
      const d = new Date(String(v));
      return Number.isNaN(d.getTime()) ? undefined : each((l) => d.toLocaleDateString(LOCALE[l], { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }));
    }
    case "select": { const o = field.options?.find((x) => x.id === v); return o?.name ? { ...o.name } : undefined; }
    case "image":
    case "link": return typeof v === "string" ? v : undefined;
    default: return undefined;
  }
}

/** One element (and what it holds) with its connected props filled from the item; `bind` itself goes. */
export function bindNode(node: Node, item: ItemLite | null, collection: CollectionLite | null): Node {
  const bind = node.props?.bind as Record<string, string> | undefined;
  let props = node.props;
  if (bind && typeof bind === "object") {
    const { bind: _bind, ...rest } = props;
    props = rest;
    if (item && collection) for (const [prop, ref] of Object.entries(bind)) {
      if (!(BINDABLE[node.type] ?? []).includes(prop) || !BIND_REF.test(ref)) continue;
      const v = boundValue(prop, ref, item, collection);
      if (v !== undefined) props = { ...props, [prop]: v };
    }
  }
  const children = node.children?.map((c) => (c.type === "collectionList" ? c : bindNode(c, item, collection)));
  return props === node.props && children === node.children ? node : { ...node, props, ...(children ? { children } : {}) };
}

/** A whole tree for one item's page (lists inside keep their own items). */
export const bindTree = <T extends Tree>(tree: T, item: ItemLite | null, collection: CollectionLite | null): T => ({ ...tree, root: bindNode(tree.root, item, collection) });

/** The collections a tree's lists show. */
export function listIdsOf(tree: Tree | null | undefined): string[] {
  const out = new Set<string>();
  const walk = (n: Node) => {
    if (n.type === "collectionList" && typeof n.props?.collectionId === "string") out.add(n.props.collectionId);
    n.children?.forEach(walk);
  };
  if (tree) walk(tree.root);
  return [...out];
}

/** How a list orders and how many it shows (the API reads the items this way). */
export function listQuery(props: Record<string, unknown>): { sort: "newest" | "oldest" | "order" | "title"; limit: number } {
  const sort = ["newest", "oldest", "order", "title"].includes(String(props.sort)) ? (props.sort as "newest") : "newest";
  const limit = typeof props.limit === "number" && Number.isInteger(props.limit) && props.limit >= 1 && props.limit <= 48 ? props.limit : 6;
  return { sort, limit };
}

const time = (v: unknown) => { const t = v ? new Date(String(v)).getTime() : NaN; return Number.isNaN(t) ? 0 : t; };
/** A list's items in its order: newest or oldest first, the merchant's own order, or by the first words field. */
export function sortItems(items: ItemLite[], sort: ReturnType<typeof listQuery>["sort"], collection: CollectionLite | null, lang: "ar" | "en" | "he" = "ar"): ItemLite[] {
  const out = [...items];
  const when = (i: ItemLite) => time(i.publishedAt) || time(i.createdAt);
  if (sort === "newest") out.sort((a, b) => when(b) - when(a));
  else if (sort === "oldest") out.sort((a, b) => when(a) - when(b));
  else if (sort === "order") out.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  else {
    const title = collection?.fields.find((f) => f.type === "text")?.id;
    const words = (i: ItemLite) => { const v = title ? (i.data?.[title] as Local | undefined) : undefined; return String(v?.[lang] ?? v?.ar ?? v?.en ?? i.slug); };
    out.sort((a, b) => words(a).localeCompare(words(b), lang));
  }
  return out;
}

const renamed = (node: Node, stem: string): Node => {
  let n = 0;
  const walk = (x: Node): Node => ({ ...structuredClone({ ...x, children: undefined }), id: `${stem}_${(n++).toString(36)}`, ...(x.children ? { children: x.children.map(walk) } : {}) });
  return walk(node);
};

/**
 * The tree with each list drawn as a grid of its card, once per item (in the list's order, its
 * limit already applied by whoever loaded them). `preview`: the editor's, where a list without
 * items still shows its card as designed.
 */
export function expandLists<T extends Tree>(tree: T, data: ReadonlyMap<string, { collection: CollectionLite; items: ItemLite[] }>, opts: { preview?: boolean } = {}): T {
  let changed = false;
  const walk = (n: Node): Node | null => {
    if (n.type === "collectionList") {
      changed = true;
      const card = n.children?.[0];
      const got = data.get(String(n.props.collectionId));
      const { sort, limit } = listQuery(n.props);
      const items = sortItems(got?.items ?? [], sort, got?.collection ?? null).slice(0, limit);
      const columns = typeof n.props.columns === "number" && n.props.columns >= 1 && n.props.columns <= 6 ? n.props.columns : 3;
      const style = { ...(n.style ?? {}), base: { columns, gap: 24, ...(n.style?.base ?? {}) }, tablet: { columns: Math.min(columns, 2), ...(n.style?.tablet ?? {}) }, mobile: { columns: 1, ...(n.style?.mobile ?? {}) } };
      let cards: Node[] = [];
      if (card && items.length && got) cards = items.map((item, i) => bindNode(i === 0 ? card : renamed(card, `${card.id.slice(0, 30)}_${i}`), item, got.collection));
      else if (card && opts.preview) cards = [bindNode(card, null, null)];
      else if (n.props.empty && typeof n.props.empty === "object") cards = [{ id: `${n.id.slice(0, 40)}_empty`, type: "text", props: { text: n.props.empty } }];
      const { collectionId: _c, limit: _l, sort: _s, columns: _col, empty: _e, layout: _lay, ...rest } = n.props;
      return { ...n, type: "grid", props: rest, style, children: cards };
    }
    if (!n.children?.length) return n;
    const kids = n.children.map(walk).filter((c): c is Node => c !== null);
    return { ...n, children: kids };
  };
  const root = walk(tree.root)!;
  return changed ? ({ ...tree, root } as T) : tree;
}

/** An item's page address split into its collection's and its own ("/blog/hello" → blog, hello). */
export function itemAddress(slug: string): { collection: string; item: string } | null {
  const m = /^\/([a-z0-9][a-z0-9-]{0,40})\/([a-z0-9][a-z0-9-]{0,80})\/?$/.exec(slug);
  return m ? { collection: m[1], item: m[2] } : null;
}
