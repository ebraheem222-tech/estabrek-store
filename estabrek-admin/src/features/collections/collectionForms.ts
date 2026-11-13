/**
 * The Collections screen's pure parts (tested): an item's form values from its fields and back,
 * a slug from words, a new field, and a first card for a list of the collection.
 */
import type { Collection, CollectionField, FieldType, Local } from "../../api/collections.api";
import type { PageTreeNode } from "../../api/pages.api";

export type Lang = "ar" | "en" | "he";
export const LANGS: Lang[] = ["ar", "en", "he"];
export const WORD_TYPES: FieldType[] = ["text", "longText"];

/** An address word from any words (latin letters and digits; else a number from the time). */
export function slugOf(words: string): string {
  const s = words.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return s || `item-${Date.now().toString(36)}`;
}

/** A field id from its name (a word like coverImage); never one that's taken. */
export function fieldIdOf(name: string, taken: string[]): string {
  const words = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").trim().split(/\s+/).filter(Boolean);
  let base = words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join("").replace(/^[^a-z]+/, "").slice(0, 24) || "field";
  if (!/^[a-z]/.test(base)) base = `f${base}`;
  if (!taken.includes(base)) return base;
  for (let i = 2; ; i++) if (!taken.includes(`${base}${i}`)) return `${base}${i}`;
}

/** A new field of a kind (a choice kind with its first choice; a relation with the table it links, `to`). */
export const newField = (type: FieldType, name: Local, taken: string[], to?: string): CollectionField => ({ id: fieldIdOf(name.en ?? name.ar ?? name.he ?? type, taken), type, name, ...(type === "select" || type === "multiSelect" ? { options: [{ id: "one", name: { ...name } }] } : {}), ...(type === "relation" && to ? { to } : {}) });

/** The table a new relation links to begin with: another table when there is one, else this one. */
export const firstLinkable = (tables: Array<{ id: string }>, self: string): string => (tables.find((t) => t.id !== self) ?? tables[0])?.id ?? self;

/** What's sent for an item: empty words and values left out (the API checks the rest). */
export function itemDataOut(fields: CollectionField[], values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.id];
    if (WORD_TYPES.includes(f.type)) {
      const words: Local = {};
      for (const l of LANGS) { const w = (v as Local | undefined)?.[l]; if (typeof w === "string" && w.trim()) words[l] = w; }
      if (Object.keys(words).length) out[f.id] = words;
    } else if (f.type === "number" || f.type === "money") {
      const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
      if (Number.isFinite(n)) out[f.id] = n;
    } else if (f.type === "multiSelect") {
      if (Array.isArray(v) && v.length) out[f.id] = v;
    } else if (f.type === "relation") {
      // The linked rows by id (as read: rows; as picked: ids); none unlinks, so it's always sent.
      out[f.id] = Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : (x as { id?: string } | null)?.id)).filter((x): x is string => typeof x === "string" && x !== "") : [];
    } else if (f.type === "json" || f.type === "location") {
      // Whole values (the server checks their shape).
      if (v !== undefined && v !== null && v !== "") out[f.id] = v;
    } else if (f.type === "boolean") {
      if (typeof v === "boolean") out[f.id] = v;
    } else if (typeof v === "string" && v.trim()) out[f.id] = v.trim();
  }
  return out;
}

/** The first words field's value in a language (an item's title in lists). */
export function titleOf(fields: CollectionField[], data: Record<string, unknown>, lang: Lang): string {
  const f = fields.find((x) => x.type === "text");
  const v = f ? (data[f.id] as Local | undefined) : undefined;
  return v?.[lang] || v?.ar || v?.en || v?.he || "";
}

/**
 * A list of the collection on a page: a card with its picture, title and summary connected to its
 * fields, and a button to the item's page (lib/collectionTree.ts draws one per item).
 */
export function newCollectionList(c: { id: string; fields: CollectionField[] }, lang: Lang, ids: (p: string) => string): PageTreeNode {
  const image = c.fields.find((f) => f.type === "image");
  const title = c.fields.find((f) => f.type === "text");
  const summary = c.fields.find((f) => f.type === "longText");
  const words = { ar: "اقرأ أكتر", en: "Read more", he: "קרא עוד" };
  const kids: PageTreeNode[] = [];
  if (image) kids.push({ id: ids("img"), type: "image", props: { src: "/templates/photo-1.svg", bind: { src: image.id, href: "$url" } }, style: { base: { width: "100%", radius: 14, aspect: "4 / 3", fit: "cover" } } });
  if (title) kids.push({ id: ids("h"), type: "heading", props: { level: 3, text: title.name ?? { [lang]: "Title" }, bind: { text: title.id } } });
  if (summary) kids.push({ id: ids("t"), type: "text", props: { text: summary.name ?? { [lang]: "Summary" }, bind: { text: summary.id } }, style: { base: { color: "muted", lines: 3 } } });
  kids.push({ id: ids("b"), type: "button", props: { label: { [lang]: words[lang] }, href: "/", variant: "link", bind: { href: "$url" } } });
  const card: PageTreeNode = { id: ids("card"), type: "stack", name: "Card", props: {}, style: { base: { gap: 10 } }, children: kids };
  return { id: ids("list"), type: "collectionList", props: { collectionId: c.id, limit: 6, sort: "newest", columns: 3 }, children: [card] };
}

/**
 * The store's own page designs as collections their elements connect to (the shop fills them:
 * estabrek-storefront/src/pageTree/storeBind.ts): a product's values, and a category's.
 */
const n = (ar: string, en: string, he: string): Local => ({ ar, en, he });
export const PRODUCT_COLLECTION: Collection = { id: "$product", slug: "p", name: n("المنتج", "The product", "המוצר"), templateId: null, items: 0, published: 0, createdAt: "", updatedAt: "", fields: [
  { id: "title", type: "text", name: n("إسم المنتج", "Name", "שם") },
  { id: "description", type: "longText", name: n("الوصف", "Description", "תיאור") },
  { id: "price", type: "text", name: n("السعر", "Price", "מחיר") },
  { id: "category", type: "text", name: n("القسم", "Category", "קטגוריה") },
  { id: "image", type: "image", name: n("الصورة", "Picture", "תמונה") },
  { id: "image2", type: "image", name: n("الصورة التانية", "Second picture", "תמונה שנייה") },
  { id: "categoryUrl", type: "link", name: n("صفحة القسم", "Category page", "דף הקטגוריה") },
] };
export const CATEGORY_COLLECTION: Collection = { id: "$category", slug: "c", name: n("القسم", "The category", "הקטגוריה"), templateId: null, items: 0, published: 0, createdAt: "", updatedAt: "", fields: [
  { id: "title", type: "text", name: n("إسم القسم", "Name", "שם") },
  { id: "description", type: "longText", name: n("الوصف", "Description", "תיאור") },
  { id: "image", type: "image", name: n("الصورة", "Picture", "תמונה") },
] };

/** What an element's props can take from a collection, by the fields that fit each. */
export const BINDABLE: Record<string, string[]> = { heading: ["text"], text: ["text"], button: ["label", "href"], image: ["src", "alt", "href"], video: ["src"] };
const WORDS_LIKE: FieldType[] = ["text", "longText", "number", "date", "select", "email", "phone", "datetime", "money", "multiSelect", "location"];
export const PROP_FIELDS: Record<string, FieldType[]> = { text: WORDS_LIKE, label: WORDS_LIKE, alt: ["text", "longText"], src: ["image"], href: ["link", "email", "phone", "file", "location"] };
/** What some elements take beyond that: a video's source is a video field (or, as before, a picture field holding a video's address). */
const ELEMENT_FIELDS: Record<string, Record<string, FieldType[]>> = { video: { src: ["video", "image"] } };
/** The kinds of field an element's prop takes (the same list as the backend's lib/collectionTree.ts). */
export const fieldsFor = (element: string | undefined, prop: string): FieldType[] => (element && ELEMENT_FIELDS[element]?.[prop]) || PROP_FIELDS[prop] || [];
