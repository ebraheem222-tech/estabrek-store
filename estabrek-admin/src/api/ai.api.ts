// AI features (off until OPENAI_API_KEY is on the server; each has its own switch).
import { api } from "./http";

export const AI_FEATURE_KEYS = ["productWriter", "smartSearch", "shopTheLook", "sizeAdvice", "reviewSummary", "adminAsk", "replySuggest", "photoStudio", "orderFlags", "translate", "pageWriter", "shopAgent", "socialPosts", "seoDoctor"] as const;
export type AiFeature = (typeof AI_FEATURE_KEYS)[number];
export type AiSettings = Record<AiFeature, boolean> & { dailyLimit: number };

/** Where the AI runs: OpenAI, or the store's own model server (its key is never sent here, only whether there is one). */
export type AiServerKind = "openai" | "own";
export type AiServerView = { kind: AiServerKind; url: string; model: string; vision: boolean; hasKey: boolean };
export type AiServerIn = { kind: AiServerKind; url: string; model: string; vision: boolean; key?: string | null };

export async function getAi() {
  return (await api.get("/admin/ai")).data as {
    settings: AiSettings;
    defaults: AiSettings;
    /** A model for words is there (OpenAI's key or the own server). */
    keyReady: boolean;
    /** Newer servers: OpenAI's key itself, pictures read, pictures made, each feature's readiness, the own server. */
    openaiReady?: boolean;
    visionReady?: boolean;
    editReady?: boolean;
    ready?: Partial<Record<AiFeature, boolean>>;
    server?: AiServerView;
    cloudinaryReady: boolean;
    usage30: Partial<Record<AiFeature, number>>;
  };
}
export async function saveAiServer(body: AiServerIn) {
  return (await api.put("/admin/ai/server", body)).data as { server: AiServerView };
}
/** One small question to the server as written (what is left out comes from the saved one); nothing is saved. */
export async function tryAiServer(body: AiServerIn) {
  return (await api.post("/admin/ai/server/try", body, { timeout: 75_000 })).data as { ok: true; ms: number; reply: string } | { ok: false; error: string };
}
export async function saveAi(s: AiSettings) {
  return (await api.put("/admin/ai", s)).data as { settings: AiSettings };
}
export async function catalogAiStatus() {
  return (await api.get("/admin/ai-catalog/status")).data as { productWriter: boolean; photoStudio: boolean; translate?: boolean };
}
export type WriterField = { key: string; label: string; kind?: string; options?: string[] };
export type WriterResult = { title: string; description: string; seoTitle: string; seoDescription: string; colors: string[]; attributes: Record<string, unknown> };
export async function writeProduct(body: { images: string[]; title?: string; category?: string; type?: string; notes?: string; fields?: WriterField[] }) {
  return (await api.post("/admin/ai-catalog/product-writer", body, { timeout: 90_000 })).data as WriterResult;
}
/** Draft translations of the store's texts (same keys back); nothing is saved by this. */
export async function translateTexts(body: { to: "ar" | "en" | "he"; from?: "ar" | "en" | "he"; context?: string; texts: Record<string, string> }) {
  return (await api.post("/admin/ai-catalog/translate", body, { timeout: 90_000 })).data as { texts: Record<string, string> };
}
export const STUDIO_STYLES = ["white", "studio", "soft", "marble", "wood", "linen", "nature", "luxury", "beach", "festive", "custom"] as const;
export type StudioStyle = (typeof STUDIO_STYLES)[number];
/** A new photo of the piece in a scene (custom: \`scene\` is the owner's own words). */
export async function photoStudio(body: { imageUrl: string; style: StudioStyle; scene?: string; title?: string }) {
  return (await api.post("/admin/ai-catalog/photo-studio", body, { timeout: 180_000 })).data as { url: string };
}
export async function ordersAiStatus() {
  return (await api.get("/admin/ai-orders/status")).data as { replySuggest: boolean; orderFlags: boolean };
}
export async function orderFlags(orderId: string) {
  return (await api.get(`/admin/ai-orders/flags/${encodeURIComponent(orderId)}`)).data as { level: "ok" | "check" | "risky"; score: number; reasons: string[]; paid: boolean };
}
export async function replyIdeas(orderId: string, message?: string) {
  return (await api.post("/admin/ai-orders/reply", { orderId, message: message || undefined }, { timeout: 60_000 })).data as { replies: Array<{ label: string; text: string }> };
}
export async function askShop(question: string) {
  return (await api.post("/admin/ai-ask", { question }, { timeout: 60_000 })).data as { answer: string; figures: Array<{ label: string; value: string | number }> };
}

/* The page editor's words helper (the store's "page writer" switch): nothing is saved by these. */
type ShopLang = "ar" | "en" | "he";
/** What the page editor may offer. */
export async function pagesAiStatus() {
  return (await api.get("/admin/ai-pages/status")).data as { pageWriter: boolean };
}
/** A few options for an element's words: new ones about something, or the ones there changed. */
export async function pageWords(body: { action: "write" | "improve" | "shorter" | "longer" | "translate"; kind: "heading" | "text" | "button"; lang: ShopLang; to?: ShopLang; text?: string; about?: string }) {
  return (await api.post("/admin/ai-pages/words", body, { timeout: 60_000 })).data as { options: string[] };
}
/** A picture's description, from the picture (an https address). */
export async function pictureAlt(body: { imageUrl: string; lang: ShopLang }) {
  return (await api.post("/admin/ai-pages/alt", body, { timeout: 60_000 })).data as { alt: string };
}
