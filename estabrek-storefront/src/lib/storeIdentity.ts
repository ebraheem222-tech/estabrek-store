/**
 * The store's own identity (admin → هوية المتجر, header.identity): its name, the
 * short name in the logo, its line, what it sells and who it talks to. Every shop on
 * the platform shows its own name, never the platform's. Same shape as the backend
 * (estabrek-store-backend/src/modules/identity/identity.ts).
 */
export type Lang = "ar" | "en" | "he";
export type Texts = { ar: string; en: string; he: string };

export const INDUSTRIES = [
  "fashion", "shoes", "electronics", "phones", "gaming", "books", "beauty", "jewelry",
  "home", "kids", "food", "digital", "marketplace", "general",
  "computers", "sports", "art", "pets", "flowers", "music",
] as const;
export type Industry = (typeof INDUSTRIES)[number];
export const AUDIENCES = ["women", "men", "everyone"] as const;
export type Audience = (typeof AUDIENCES)[number];

export type StoreIdentity = {
  /** The store's name: titles, messages, emails. */
  name: Texts;
  /** The short name in the logo and the big footer word (empty = the name). */
  shortName: Texts;
  tagline: Texts;
  about: Texts;
  industry: Industry;
  audience: Audience;
  legalName: string;
  /** The store's currency (admin → الإعدادات), for prices that don't carry their own. */
  currency: string;
};

const EMPTY: Texts = { ar: "", en: "", he: "" };

function texts(raw: unknown, max: number): Texts {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const one = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  return { ar: one(r.ar), en: one(r.en), he: one(r.he) };
}

/** The saved identity with defaults; before the owner fills it in, the name is the site name. */
export function identityOf(site: { siteName?: string | null; header?: unknown; currencyCode?: string | null } | null | undefined): StoreIdentity {
  const header = site?.header && typeof site.header === "object" ? (site.header as Record<string, unknown>) : {};
  const r = (header.identity && typeof header.identity === "object" ? header.identity : {}) as Record<string, unknown>;
  const name = texts(r.name, 60);
  // Before the owner names the store, its site name is its name in every language.
  const siteName = String(site?.siteName ?? "").trim();
  if (siteName && siteName !== "My Store" && !name.ar && !name.en && !name.he) name.ar = name.en = name.he = siteName;
  return {
    name,
    shortName: texts(r.shortName, 30),
    tagline: texts(r.tagline, 80),
    about: texts(r.about, 400),
    industry: (INDUSTRIES as readonly string[]).includes(String(r.industry)) ? (r.industry as Industry) : "general",
    audience: (AUDIENCES as readonly string[]).includes(String(r.audience)) ? (r.audience as Audience) : "everyone",
    legalName: typeof r.legalName === "string" ? r.legalName.trim().slice(0, 160) : "",
    currency: /^[A-Z]{3}$/.test(String(site?.currencyCode ?? "")) ? String(site!.currencyCode) : "ILS",
  };
}

/** Which language to show when one is missing: a Hebrew reader gets the English name before the Arabic one. */
const ORDER: Record<Lang, Lang[]> = { ar: ["ar", "en", "he"], en: ["en", "ar", "he"], he: ["he", "en", "ar"] };

/** One text in the wanted language, else the closest one. */
export function pick(t: Texts | undefined, lang: Lang): string {
  const v = t ?? EMPTY;
  for (const l of ORDER[lang]) if (v[l]) return v[l];
  return "";
}

const FALLBACK: Texts = { ar: "المتجر", en: "Store", he: "החנות" };

/** The store's name ("Store" only when nothing is set at all). */
export const nameOf = (id: StoreIdentity, lang: Lang) => pick(id.name, lang) || FALLBACK[lang];
/** The name in the logo: the short name, else the name. */
export const markOf = (id: StoreIdentity, lang: Lang) => pick(id.shortName, lang) || nameOf(id, lang);
/**
 * The rose design's own words (hijabs, dresses, «أناقة تليق بكِ») suit a clothes shop
 * for women; any other store gets plain words built from its name, line and about.
 */
export const modestShop = (id: StoreIdentity) => id.industry === "fashion" && id.audience === "women";
