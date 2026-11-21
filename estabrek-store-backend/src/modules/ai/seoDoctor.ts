/**
 * «طبيب جوجل» (the AI switch seoDoctor): what is weak in each product's search-engine words, plain
 * rules with no model, and the prompt for better drafts the owner checks before saving. Pictures get
 * their description from the facts we have (name, colour, which side), never made up.
 */
import type { AiPrompt } from "./ai.client.js";
import type { ContentLang } from "../../lib/translations.js";

export const SEO_LIMITS = { titleMin: 20, titleMax: 60, descMin: 70, descMax: 160, textMin: 120 } as const;

export type SeoIssue = "noTitle" | "titleLong" | "titleShort" | "noDescription" | "descLong" | "descShort" | "thinText" | "noAlt" | "sameTitle";
/** How much each issue costs out of 100. */
export const SEO_WEIGHT: Record<SeoIssue, number> = { noTitle: 15, titleLong: 8, titleShort: 6, noDescription: 25, descLong: 8, descShort: 10, thinText: 15, noAlt: 12, sameTitle: 12 };

export type SeoProduct = {
  id: string;
  title: string;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  description: string | null;
  category?: string | null;
  colors: string[];
  images: Array<{ id: string; alt: string | null; color: string; view: string | null }>;
};

export type SeoReport = { id: string; title: string; slug: string; score: number; issues: SeoIssue[]; missingAlts: number; seoTitle: string | null; seoDescription: string | null };

const plain = (s: string | null | undefined) => String(s ?? "").replace(/\s+/g, " ").trim();

/** Each product's weak points (sameTitle is against the others in the list). */
export function seoReports(products: SeoProduct[]): SeoReport[] {
  const titles = new Map<string, number>();
  for (const p of products) {
    const t = plain(p.seoTitle || p.title).toLowerCase();
    if (t) titles.set(t, (titles.get(t) ?? 0) + 1);
  }
  return products.map((p) => {
    const issues: SeoIssue[] = [];
    const title = plain(p.seoTitle);
    const desc = plain(p.seoDescription);
    if (!title) issues.push("noTitle");
    else if (title.length > SEO_LIMITS.titleMax) issues.push("titleLong");
    else if (title.length < SEO_LIMITS.titleMin) issues.push("titleShort");
    if (!desc) issues.push("noDescription");
    else if (desc.length > SEO_LIMITS.descMax) issues.push("descLong");
    else if (desc.length < SEO_LIMITS.descMin) issues.push("descShort");
    if (plain(p.description).length < SEO_LIMITS.textMin) issues.push("thinText");
    const missingAlts = p.images.filter((i) => !plain(i.alt)).length;
    if (missingAlts) issues.push("noAlt");
    if ((titles.get(plain(p.seoTitle || p.title).toLowerCase()) ?? 0) > 1) issues.push("sameTitle");
    const score = Math.max(0, 100 - issues.reduce((n, i) => n + SEO_WEIGHT[i], 0));
    return { id: p.id, title: p.title, slug: p.slug, score, issues, missingAlts, seoTitle: p.seoTitle, seoDescription: p.seoDescription };
  });
}

const VIEW: Record<ContentLang, Record<string, string>> = {
  ar: { front: "من الأمام", back: "من الخلف", side: "من الجنب", detail: "تفصيل قريب" },
  en: { front: "front view", back: "back view", side: "side view", detail: "close-up detail" },
  he: { front: "מבט מלפנים", back: "מבט מאחור", side: "מבט מהצד", detail: "פרט מקרוב" },
};

/** A picture's description from what we know of it: the piece, its colour, its side; numbered when two would read the same. */
export function altsFor(p: SeoProduct, lang: ContentLang): Array<{ id: string; alt: string }> {
  const seen = new Map<string, number>();
  return p.images
    .filter((i) => !plain(i.alt))
    .map((i) => {
      const view = i.view ? VIEW[lang][i.view] ?? "" : "";
      const base = [plain(p.title), plain(i.color), view].filter(Boolean).join(" — ").slice(0, 140);
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      return { id: i.id, alt: n > 1 ? `${base} (${n})` : base };
    });
}

const LANG: Record<ContentLang, string> = { ar: "Modern Standard Arabic", en: "English", he: "Hebrew" };

export function seoFixPrompt(p: SeoProduct, lang: ContentLang, brief: string, others: string[]): AiPrompt {
  return {
    system: `You write search-engine titles and descriptions for an online shop's product pages. ${brief} Write in ${LANG[lang]}. Use only the facts given; never invent materials, sizes, prices or offers. The title says what the piece is with its most searched words (no shop name, no all-caps, no keyword stuffing). The description invites the click in one or two natural sentences. Reply with JSON only.`,
    user: `The piece: ${plain(p.title)}
Category: ${plain(p.category) || "?"}; colours: ${p.colors.join(", ") || "?"}
Its page's words: ${plain(p.description).slice(0, 900) || "(none)"}
Now: title «${plain(p.seoTitle) || "(none)"}», description «${plain(p.seoDescription) || "(none)"}»
Other products' titles (yours must differ from them): ${others.slice(0, 12).map((t) => `«${plain(t).slice(0, 60)}»`).join(", ") || "(none)"}
JSON: {"seoTitle": ${SEO_LIMITS.titleMin}-${SEO_LIMITS.titleMax} characters, "seoDescription": ${SEO_LIMITS.descMin + 50}-${SEO_LIMITS.descMax} characters}`,
    maxTokens: 400,
  };
}

/** The draft kept: within the limits, or dropped (the owner then keeps what there is). */
export function cleanSeoFix(raw: unknown): { seoTitle: string | null; seoDescription: string | null } {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const t = plain(String(o.seoTitle ?? "")).replace(/^["«']+|["»']+$/g, "");
  const d = plain(String(o.seoDescription ?? "")).replace(/^["«']+|["»']+$/g, "");
  const cut = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…");
  return {
    seoTitle: t.length >= 10 ? cut(t, SEO_LIMITS.titleMax + 10) : null,
    seoDescription: d.length >= 40 ? cut(d, SEO_LIMITS.descMax + 10) : null,
  };
}
