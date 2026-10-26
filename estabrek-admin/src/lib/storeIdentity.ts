// The store's own identity (admin → الإعدادات → هوية المتجر), kept in
// SiteSettings.header.identity. The shop and the server read the same shape
// (estabrek-storefront/src/lib/storeIdentity.ts, estabrek-store-backend/src/modules/identity/identity.ts).

import { tr } from "@/lib/words";
import { adminLang } from "@/lib/lang";
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

export const INDUSTRY_LABEL: Record<Industry, string> = {
  fashion: tr("ملابس وأزياء", "Clothing & fashion"),
  shoes: tr("أحذية", "Shoes"),
  electronics: tr("إلكترونيات", "Electronics"),
  phones: tr("هواتف وإكسسوارات", "Phones & accessories"),
  gaming: tr("ألعاب وأجهزة ألعاب", "Games & consoles"),
  books: tr("كتب ومكتبة", "Books & stationery"),
  beauty: tr("تجميل وعطور", "Beauty & perfume"),
  jewelry: tr("مجوهرات وإكسسوارات", "Jewellery & accessories"),
  home: tr("بيت وأثاث", "Home & furniture"),
  kids: tr("أطفال وألعاب", "Kids & toys"),
  food: tr("أكل وحلويات", "Food & sweets"),
  digital: tr("منتجات رقمية", "Digital products"),
  marketplace: tr("سوق فيه بائعين كتير", "Marketplace with many sellers"),
  general: tr("متجر عام", "General store"),
  computers: tr("كمبيوترات ولابتوبات", "Computers & laptops"),
  sports: tr("رياضة ولياقة", "Sport & fitness"),
  art: tr("فن وأدوات رسم", "Art & art supplies"),
  pets: tr("حيوانات أليفة", "Pets"),
  flowers: tr("زهور ونباتات", "Flowers & plants"),
  music: tr("موسيقى وآلات", "Music & instruments"),
};

export const AUDIENCE_LABEL: Record<Audience, { title: string; hint: string }> = {
  women: { title: tr("نساء", "Women"), hint: tr("«أهلاً فيكِ»، «اكتشفي»", "Speaks to her (Arabic and Hebrew)") },
  men: { title: tr("رجال", "Men"), hint: tr("«أهلاً فيك»، «اكتشف»", "Speaks to him (Arabic and Hebrew)") },
  everyone: { title: tr("الكل", "Everyone"), hint: tr("كلام بيناسب الجميع", "Words that suit everyone") },
};

export const LANG_LABEL: Record<Lang, string> = { ar: "عربي", en: "English", he: "עברית" };

export type StoreIdentity = {
  name: Texts;
  shortName: Texts;
  tagline: Texts;
  about: Texts;
  industry: Industry;
  audience: Audience;
  legalName: string;
};

export const EMPTY_TEXTS: Texts = { ar: "", en: "", he: "" };

function texts(raw: unknown, max: number): Texts {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const one = (v: unknown) => (typeof v === "string" ? v.slice(0, max) : "");
  return { ar: one(r.ar), en: one(r.en), he: one(r.he) };
}

/** The saved identity as the form shows it (empty fields stay empty: the site name fills them in the shop). */
export function identityOf(header: unknown): StoreIdentity {
  const h = header && typeof header === "object" ? (header as Record<string, unknown>) : {};
  const r = (h.identity && typeof h.identity === "object" ? h.identity : {}) as Record<string, unknown>;
  return {
    name: texts(r.name, 60),
    shortName: texts(r.shortName, 30),
    tagline: texts(r.tagline, 80),
    about: texts(r.about, 400),
    industry: (INDUSTRIES as readonly string[]).includes(String(r.industry)) ? (r.industry as Industry) : "general",
    audience: (AUDIENCES as readonly string[]).includes(String(r.audience)) ? (r.audience as Audience) : "everyone",
    legalName: typeof r.legalName === "string" ? r.legalName.slice(0, 160) : "",
  };
}

/** Trimmed for saving. */
export function cleanIdentity(id: StoreIdentity): StoreIdentity {
  const t = (x: Texts): Texts => ({ ar: x.ar.trim(), en: x.en.trim(), he: x.he.trim() });
  return { ...id, name: t(id.name), shortName: t(id.shortName), tagline: t(id.tagline), about: t(id.about), legalName: id.legalName.trim() };
}

/** A text in the admin's language by default (each team member's own), else the others. */
export const pick = (t: Texts, lang: Lang = adminLang()) => t[lang] || t.ar || t.en || t.he || "";

/** The store's name as the shop shows it: the identity, else the site name. */
export function storeNameOf(site: { siteName?: string | null; header?: unknown } | null | undefined, lang: Lang = adminLang()): string {
  const own = pick(identityOf(site?.header).name, lang);
  const siteName = String(site?.siteName ?? "").trim();
  return own || (siteName && siteName !== "My Store" ? siteName : lang === "ar" ? "المتجر" : lang === "he" ? "החנות" : "Store");
}

/** The name in the shop's logo: the short name, else the store name. */
export function markOf(site: { siteName?: string | null; header?: unknown } | null | undefined, lang: Lang = adminLang()): string {
  return pick(identityOf(site?.header).shortName, lang) || storeNameOf(site, lang);
}

/** The shop's address without "https://" (Google previews). */
export function storeHost(base: string | null | undefined): string {
  try {
    return new URL(String(base ?? "")).host;
  } catch {
    return "";
  }
}

/** What's missing before saving. */
export function identityProblem(id: StoreIdentity): string | null {
  if (!pick(id.name)) return tr("اسم المتجر لازم ينكتب بلغة وحدة على الأقل", "The store's name is needed in at least one language");
  return null;
}
