/**
 * The store's own identity: its name, line, what it sells and who it talks to.
 * Kept under SiteSettings.header.identity (public: the storefront reads it with
 * the other settings), so every shop built on the platform shows its own name and
 * never the platform's. The storefront and admin keep the same shape
 * (estabrek-storefront/src/lib/storeIdentity.ts, estabrek-admin/src/lib/storeIdentity.ts).
 */
import { z } from "zod";

export const LANGS = ["ar", "en", "he"] as const;
export type Lang = (typeof LANGS)[number];

/** What the store sells: picks sensible words and defaults (and later, its ready pages). */
export const INDUSTRIES = [
  "fashion", "shoes", "electronics", "phones", "gaming", "books", "beauty", "jewelry",
  "home", "kids", "food", "digital", "marketplace", "general",
] as const;
export type Industry = (typeof INDUSTRIES)[number];

/** Who the shop speaks to (Arabic and Hebrew say "you" differently to women and men). */
export const AUDIENCES = ["women", "men", "everyone"] as const;
export type Audience = (typeof AUDIENCES)[number];

const text = (max: number) =>
  z.object({ ar: z.string().trim().max(max).default(""), en: z.string().trim().max(max).default(""), he: z.string().trim().max(max).default("") })
    .default({ ar: "", en: "", he: "" });

export const IdentitySchema = z.object({
  /** Shown in the header, footer, page titles, emails and messages. */
  name: text(60),
  /** The short name in the logo and the big footer word (empty = the name). */
  shortName: text(30),
  /** The short line under the name. */
  tagline: text(80),
  /** A sentence or two about what the store sells (footer, AI writing, search engines). */
  about: text(400),
  industry: z.enum(INDUSTRIES).default("general"),
  audience: z.enum(AUDIENCES).default("everyone"),
  /** On invoices and legal pages. */
  legalName: z.string().trim().max(160).default(""),
});
export type StoreIdentity = z.infer<typeof IdentitySchema>;
export type Texts = StoreIdentity["name"];

/** The saved identity with defaults (a broken key falls back on its own). */
export function identityOf(site: { siteName?: string | null; header?: unknown } | null | undefined): StoreIdentity {
  const header = site?.header && typeof site.header === "object" ? (site.header as Record<string, unknown>) : {};
  const raw = header.identity && typeof header.identity === "object" ? (header.identity as Record<string, unknown>) : {};
  const out = IdentitySchema.parse({});
  for (const key of Object.keys(IdentitySchema.shape) as (keyof StoreIdentity)[]) {
    const one = IdentitySchema.shape[key].safeParse(raw[key]);
    if (one.success) (out as Record<string, unknown>)[key] = one.data;
  }
  // Before the owner fills it in, the store's name is its site name.
  const siteName = String(site?.siteName ?? "").trim();
  if (siteName && siteName !== "My Store") {
    for (const l of LANGS) if (!out.name[l]) out.name[l] = siteName;
  }
  return out;
}

/** One text in the wanted language, else the store's main language, else any. */
export function pick(t: Texts, lang: Lang = "ar"): string {
  return t[lang] || t.ar || t.en || t.he || "";
}

/** The store's name for messages and emails ("Store" only when nothing is set at all). */
export function storeName(site: { siteName?: string | null; header?: unknown } | null | undefined, lang: Lang = "ar"): string {
  return pick(identityOf(site).name, lang) || (lang === "ar" ? "المتجر" : lang === "he" ? "החנות" : "Store");
}

/** One word for what the store sells, per language (page and SEO drafts). */
export const INDUSTRY_WORD: Record<Industry, Texts> = {
  fashion: { ar: "ملابس", en: "clothing", he: "בגדים" },
  shoes: { ar: "أحذية", en: "shoes", he: "נעליים" },
  electronics: { ar: "إلكترونيات", en: "electronics", he: "אלקטרוניקה" },
  phones: { ar: "هواتف وإكسسوارات", en: "phones and accessories", he: "טלפונים ואביזרים" },
  gaming: { ar: "ألعاب", en: "gaming", he: "גיימינג" },
  books: { ar: "كتب", en: "books", he: "ספרים" },
  beauty: { ar: "تجميل وعطور", en: "beauty and perfume", he: "טיפוח ובשמים" },
  jewelry: { ar: "مجوهرات وإكسسوارات", en: "jewellery", he: "תכשיטים" },
  home: { ar: "أدوات منزلية وأثاث", en: "home and furniture", he: "בית ורהיטים" },
  kids: { ar: "أطفال وألعاب", en: "kids and toys", he: "ילדים וצעצועים" },
  food: { ar: "طعام", en: "food", he: "אוכל" },
  digital: { ar: "منتجات رقمية", en: "digital products", he: "מוצרים דיגיטליים" },
  marketplace: { ar: "كل شيء", en: "everything", he: "הכל" },
  general: { ar: "منتجات", en: "products", he: "מוצרים" },
};

const INDUSTRY_EN: Record<Industry, string> = {
  fashion: "a fashion and clothing shop",
  shoes: "a shoe shop",
  electronics: "an electronics shop",
  phones: "a mobile phones and accessories shop",
  gaming: "a gaming shop (games, consoles, accessories, digital codes)",
  books: "a bookshop",
  beauty: "a beauty and perfume shop",
  jewelry: "a jewellery and accessories shop",
  home: "a home and furniture shop",
  kids: "a kids and toys shop",
  food: "a food shop",
  digital: "a shop for digital products",
  marketplace: "an online marketplace with many sellers",
  general: "an online shop",
};

const AUDIENCE_EN: Record<Audience, string> = {
  women: "Address the shopper as a woman (feminine forms).",
  men: "Address the shopper as a man (masculine forms).",
  everyone: "Address shoppers in a way that suits everyone.",
};

/** A sentence about the store for AI prompts (English, the models follow it best). */
export function storeBrief(site: { siteName?: string | null; header?: unknown } | null | undefined): string {
  const id = identityOf(site);
  const name = pick(id.name, "en") || pick(id.name, "ar") || "the shop";
  const about = pick(id.about, "en") || pick(id.about, "ar");
  return `${name} is ${INDUSTRY_EN[id.industry]}${about ? ` (${about.replace(/\s+/g, " ").slice(0, 300)})` : ""}. ${AUDIENCE_EN[id.audience]}`;
}
