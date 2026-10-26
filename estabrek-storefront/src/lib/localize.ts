/**
 * The store's own content in the page's language. Products, categories and product
 * types carry `translations` ({ en?: {...}, he?: {...} }, admin → each one's page);
 * their ordinary fields are the store's main language. A missing translation keeps
 * the ordinary text. Done once where the data arrives (src/lib/api.ts and the
 * shop's own fetches), so every part of the page shows the same words.
 */
import type { Lang } from "./i18n";
import type { CatalogCategory, CatalogItem, CatalogProduct, CatalogProductType, CatalogProductsList, CatalogSpec } from "./catalog";
import { tr } from "./words";

type Words = Record<string, string>;
type FieldWords = { label?: string; unit?: string; help?: string; options?: Words };
type ProductWords = { title?: string; description?: string; seoTitle?: string; seoDescription?: string; attributes?: Words; colors?: Words };
type TypeWords = { name?: string; colorLabel?: string; sizeLabel?: string; fields?: Record<string, FieldWords> };

function wordsOf<T>(x: { translations?: unknown } | null | undefined, lang: Lang): T | undefined {
  const all = x?.translations;
  if (!all || typeof all !== "object") return undefined;
  const one = (all as Record<string, unknown>)[lang];
  return one && typeof one === "object" ? (one as T) : undefined;
}
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);

export function localizeCategory<T extends CatalogCategory>(c: T, lang: Lang): T;
export function localizeCategory<T extends CatalogCategory>(c: T | null | undefined, lang: Lang): T | null | undefined;
export function localizeCategory<T extends CatalogCategory>(c: T | null | undefined, lang: Lang) {
  if (!c) return c;
  const w = wordsOf<{ name?: string }>(c, lang);
  return {
    ...c,
    name: text(w?.name) ?? c.name,
    ...(Array.isArray(c.children) ? { children: c.children.map((x) => localizeCategory(x, lang)) } : {}),
  };
}

export const localizeCategories = <T extends CatalogCategory>(list: T[] | null | undefined, lang: Lang): T[] =>
  (list ?? []).map((c) => localizeCategory(c, lang));

export function localizeType(t: CatalogProductType | null | undefined, lang: Lang): CatalogProductType | null | undefined {
  if (!t) return t;
  const w = wordsOf<TypeWords>(t, lang);
  if (!w) return t;
  return {
    ...t,
    name: text(w.name) ?? t.name,
    colorLabel: text(w.colorLabel) ?? t.colorLabel,
    sizeLabel: text(w.sizeLabel) ?? t.sizeLabel,
    fields: t.fields?.map((f) => {
      const fw = w.fields?.[f.key];
      return fw ? { ...f, label: text(fw.label) ?? f.label, unit: text(fw.unit) ?? f.unit, optionLabels: fw.options } : f;
    }),
  };
}

/** A details row in the page's language: the type's label, the choice's own words, Yes/No. */
function localizeSpec(s: CatalogSpec, type: CatalogProductType | null | undefined, product: ProductWords | undefined, lang: Lang): CatalogSpec {
  const fw = wordsOf<TypeWords>(type, lang)?.fields?.[s.key];
  const label = text(fw?.label) ?? s.label;
  const raw = s.raw;
  let value = s.value;
  if (s.kind === "boolean" && typeof raw === "boolean") value = raw ? tr(lang, "نعم", "Yes") : tr(lang, "لا", "No");
  else if ((s.kind === "select" || s.kind === "multiselect") && raw != null) {
    const list = (Array.isArray(raw) ? raw : [raw]).map(String);
    value = list.map((v) => text(fw?.options?.[v]) ?? v).join(lang === "ar" ? "، " : ", ");
  } else if (s.kind === "number" && raw != null) {
    const unit = text(fw?.unit) ?? type?.fields?.find((f) => f.key === s.key)?.unit;
    value = `${raw}${unit ? ` ${unit}` : ""}`;
  } else value = text(product?.attributes?.[s.key]) ?? value;
  return { ...s, label, value };
}

/** A colour's name in the page's language (the item keeps colorName: choices and the cart are keyed by it). */
const localizeItem = (it: CatalogItem, colors: Words | undefined): CatalogItem => {
  const name = it.colorName ? text(colors?.[it.colorName]) : undefined;
  return name ? { ...it, colorLabel: name } : it;
};

export function localizeProduct<T extends CatalogProduct>(p: T, lang: Lang): T;
export function localizeProduct<T extends CatalogProduct>(p: T | null | undefined, lang: Lang): T | null | undefined;
export function localizeProduct<T extends CatalogProduct>(p: T | null | undefined, lang: Lang) {
  if (!p) return p;
  const w = wordsOf<ProductWords>(p, lang);
  const hasType = Boolean(wordsOf(p.type, lang));
  if (!w && !hasType && !wordsOf(p.category, lang) && lang === "ar") return p;
  return {
    ...p,
    title: text(w?.title) ?? p.title,
    description: text(w?.description) ?? p.description,
    seoTitle: text(w?.seoTitle) ?? p.seoTitle,
    seoDescription: text(w?.seoDescription) ?? p.seoDescription,
    category: localizeCategory(p.category, lang),
    type: localizeType(p.type, lang),
    specs: p.specs?.map((s) => localizeSpec(s, p.type, w, lang)),
    items: p.items?.map((it) => localizeItem(it, w?.colors)),
  };
}

export const localizeProducts = <T extends CatalogProduct>(list: T[] | null | undefined, lang: Lang): T[] =>
  (list ?? []).map((p) => localizeProduct(p, lang));

export function localizeList(out: CatalogProductsList, lang: Lang): CatalogProductsList {
  return { ...out, items: localizeProducts(out.items, lang) };
}

/** A shop filter (product-type field) in the page's language; values stay as they are (they're in the address). */
export type FacetField = { key: string; label: string; kind: string; options: Array<{ value: string; count: number; label?: string }>; translations?: Record<string, FieldWords> };
export function localizeFacets<T extends FacetField>(fields: T[], lang: Lang): T[] {
  return fields.map((f) => {
    const w = f.translations?.[lang];
    const yesNo = f.kind === "boolean";
    return {
      ...f,
      label: text(w?.label) ?? f.label,
      options: f.options.map((o) => ({
        ...o,
        label: yesNo ? (o.value === "true" ? tr(lang, "نعم", "Yes") : tr(lang, "لا", "No")) : text(w?.options?.[o.value]) ?? o.label,
      })),
    };
  });
}

/** A bag line from the price quote: its title and colour in the page's language (orders keep the store's own). */
export function localizeCartLine<T extends { productTitle?: string; colorName?: string | null; productTranslations?: unknown }>(l: T, lang: Lang): T & { colorLabel?: string } {
  const w = wordsOf<ProductWords>({ translations: l.productTranslations }, lang);
  if (!w) return l;
  const color = l.colorName ? text(w.colors?.[l.colorName]) : undefined;
  return { ...l, productTitle: text(w.title) ?? l.productTitle, ...(color ? { colorLabel: color } : {}) };
}

/** The type's colour/size label as the owner translated it for this language, else nothing (the page's own word then). */
export function translatedTypeLabel(t: CatalogProductType | null | undefined, lang: Lang, which: "colorLabel" | "sizeLabel"): string | undefined {
  return text(wordsOf<TypeWords>(t, lang)?.[which]);
}
