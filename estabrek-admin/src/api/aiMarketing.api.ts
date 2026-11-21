// Selling outside the shop with AI: social posts, a week's plan, and the search-engine doctor
// (backend /v1/admin/ai-marketing, the catalog area; the AI switches socialPosts and seoDoctor).
import { api } from "./http";

export const PLATFORMS = ["instagram", "facebook", "tiktok", "whatsapp", "x"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const POST_TONES = ["friendly", "luxury", "playful", "offer", "informative"] as const;
export type PostTone = (typeof POST_TONES)[number];
export type ShopLang = "ar" | "en" | "he";

export type Post = { platform: Platform; caption: string; hashtags: string[]; cta: string; idea: string; text: string };
export type PlanDay = { day: number; time: string; platform: Platform; productId: string | null; idea: string; caption: string; hashtags: string[]; text: string; product: { id: string; title: string; slug: string; url: string | null } | null };

export type SeoIssue = "noTitle" | "titleLong" | "titleShort" | "noDescription" | "descLong" | "descShort" | "thinText" | "noAlt" | "sameTitle";
export type SeoReport = { id: string; title: string; slug: string; score: number; issues: SeoIssue[]; missingAlts: number; seoTitle: string | null; seoDescription: string | null };
export type SeoDraft = { productId: string; seoTitle: string | null; seoDescription: string | null; alts: Array<{ id: string; alt: string }> };

type PostOptions = { platforms: Platform[]; tone: PostTone; lang?: ShopLang; emojis?: boolean };

export async function marketingStatus() {
  return (await api.get("/admin/ai-marketing/status")).data as { socialPosts: boolean; seoDoctor: boolean; shopUrl: string | null };
}
export async function writePosts(body: PostOptions & { productIds?: string[]; offer?: string }) {
  return (await api.post("/admin/ai-marketing/social", body, { timeout: 120_000 })).data as { posts: Post[]; products: Array<{ id: string; title: string; slug: string; url: string | null }> };
}
export async function weekPlan(body: PostOptions) {
  return (await api.post("/admin/ai-marketing/week", body, { timeout: 150_000 })).data as { days: PlanDay[] };
}
export async function seoScan() {
  return (await api.get("/admin/ai-marketing/seo")).data as { average: number; total: number; counts: Partial<Record<SeoIssue, number>>; products: SeoReport[] };
}
export async function seoDraft(productId: string) {
  return (await api.post(`/admin/ai-marketing/seo/${encodeURIComponent(productId)}/draft`, {}, { timeout: 90_000 })).data as SeoDraft;
}
export async function seoApply(productId: string, body: { seoTitle?: string | null; seoDescription?: string | null; alts?: Array<{ id: string; alt: string }> }) {
  return (await api.post(`/admin/ai-marketing/seo/${encodeURIComponent(productId)}/apply`, body)).data as { ok: true; alts: number };
}
