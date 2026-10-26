/**
 * Store content in the shop's other languages, kept next to the content as
 * `translations` ({ en?: {...}, he?: {...}, ar?: {...} }). The ordinary fields
 * hold the store's main language (admin → الإعدادات → لغات المتجر); a missing
 * translation shows the ordinary text. Written by the owner, or drafted by the
 * AI (admin → الذكاء الاصطناعي → ترجمة) and checked by the owner before saving.
 */
import { z } from "zod";

export const CONTENT_LANGS = ["ar", "en", "he"] as const;
export type ContentLang = (typeof CONTENT_LANGS)[number];

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);
/** { "the main language's text": "its translation" } (choices, values). */
const words = (max: number) =>
  z
    .record(z.string().max(120), z.string().trim().max(max))
    .optional()
    .transform((m) => {
      if (!m) return undefined;
      const out = Object.fromEntries(Object.entries(m).filter(([, v]) => v));
      return Object.keys(out).length ? out : undefined;
    });

/** Drops empty languages (and empty field groups), so "nothing translated" saves as {}. */
function tidy<T extends Record<string, unknown>>(v: Partial<Record<ContentLang, T | undefined>>) {
  const out: Partial<Record<ContentLang, T>> = {};
  for (const lang of CONTENT_LANGS) {
    const one = v[lang];
    if (!one) continue;
    const kept = Object.fromEntries(Object.entries(one).filter(([, x]) => x !== undefined && !(typeof x === "object" && x && !Object.keys(x).length)));
    if (Object.keys(kept).length) out[lang] = kept as T;
  }
  return out;
}
const byLang = <S extends z.ZodType<Record<string, unknown>>>(one: S) =>
  z
    .object({ ar: one.optional(), en: one.optional(), he: one.optional() })
    .transform((v) => tidy(v as Partial<Record<ContentLang, z.infer<S>>>));

export const ProductTranslation = z.object({
  title: text(160),
  description: text(5000),
  seoTitle: text(120),
  seoDescription: text(320),
  /** Written values of the type's text fields ({ fieldKey: text }); choices come from the type. */
  attributes: z
    .record(z.string().max(64), z.string().trim().max(200))
    .optional()
    .transform((m) => {
      if (!m) return undefined;
      const out = Object.fromEntries(Object.entries(m).filter(([, v]) => v));
      return Object.keys(out).length ? out : undefined;
    }),
  /** Colour names ({ "Berry": "توتي" }); the pieces keep their own names and codes. */
  colors: words(40),
});
export const ProductTranslations = byLang(ProductTranslation);

export const CategoryTranslation = z.object({ name: text(120) });
export const CategoryTranslations = byLang(CategoryTranslation);

const FieldTranslation = z
  .object({ label: text(60), unit: text(16), help: text(160), options: words(60) })
  .transform((f) => (Object.values(f).some((x) => x !== undefined) ? f : undefined));
export const TypeTranslation = z.object({
  name: text(60),
  colorLabel: text(30),
  sizeLabel: text(30),
  fields: z
    .record(z.string().max(32), FieldTranslation)
    .optional()
    .transform((m) => {
      if (!m) return undefined;
      const out = Object.fromEntries(Object.entries(m).filter(([, v]) => v));
      return Object.keys(out).length ? out : undefined;
    }),
});
export const TypeTranslations = byLang(TypeTranslation);

/** Saved translations, read safely: a broken value is the same as none. */
export function translationsOf<S extends z.ZodType>(schema: S, raw: unknown): z.infer<S> {
  const ok = schema.safeParse(raw ?? {});
  return ok.success ? ok.data : ({} as z.infer<S>);
}

/** The store's main language (admin → لغات المتجر): the one its ordinary fields are written in. */
export function mainLanguage(header: unknown): ContentLang {
  const h = header && typeof header === "object" ? (header as Record<string, unknown>) : {};
  const l = h.languages && typeof h.languages === "object" ? (h.languages as Record<string, unknown>).default : undefined;
  return CONTENT_LANGS.includes(l as ContentLang) ? (l as ContentLang) : "ar";
}
