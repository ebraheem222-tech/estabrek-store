// The store's content in its other languages ({ en?: {...}, he?: {...} } on each product,
// category and product type). The ordinary fields are the main language (الإعدادات →
// لغات المتجر); a box left empty shows the main language's text in the shop.
import type { Lang } from "./storeIdentity";
import { languagesOf } from "./storeLanguages";

export type Translations = Partial<Record<Lang, Record<string, unknown>>>;

/** One text to translate: where it lives in a language's object, and the original. */
export type TranslationRow = {
  path: string[];
  label: string;
  /** The text in the main language (what the shop shows when the box is empty). */
  base: string;
  multiline?: boolean;
  max: number;
  /** A small heading the row sits under («الألوان», a field's name). */
  group?: string;
};

/** The languages to translate into: the shop's others (the main one is the ordinary fields). */
export function translationLangs(header: unknown): { main: Lang; others: Lang[] } {
  const l = languagesOf(header);
  return { main: l.default, others: l.enabled.filter((x) => x !== l.default) };
}

export const rowId = (r: Pick<TranslationRow, "path">) => r.path.join("\u0000");

export function readPath(tr: Translations, lang: Lang, path: string[]): string {
  let node: unknown = tr[lang];
  for (const k of path) {
    if (!node || typeof node !== "object") return "";
    node = (node as Record<string, unknown>)[k];
  }
  return typeof node === "string" ? node : "";
}

export function writePath(tr: Translations, lang: Lang, path: string[], value: string): Translations {
  const root: Record<string, unknown> = structuredClone((tr[lang] as Record<string, unknown>) ?? {});
  let node = root;
  path.slice(0, -1).forEach((k) => {
    const next = node[k];
    node[k] = next && typeof next === "object" ? next : {};
    node = node[k] as Record<string, unknown>;
  });
  node[path[path.length - 1]] = value;
  return { ...tr, [lang]: root };
}

/** Without empty boxes and empty groups: what is saved ("nothing translated" = {}). */
export function tidyTranslations(tr: Translations | null | undefined): Translations {
  const clean = (v: unknown): unknown => {
    if (typeof v === "string") return v.trim() || undefined;
    if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
    const out = Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, clean(x)]).filter(([, x]) => x !== undefined));
    return Object.keys(out).length ? out : undefined;
  };
  return (clean(tr ?? {}) as Translations | undefined) ?? {};
}

/** Saved translations, read safely. */
export function translationsOf(raw: unknown): Translations {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Translations) : {};
}

export function countDone(tr: Translations, lang: Lang, rows: TranslationRow[]) {
  return rows.filter((r) => r.base.trim() && readPath(tr, lang, r.path).trim()).length;
}
