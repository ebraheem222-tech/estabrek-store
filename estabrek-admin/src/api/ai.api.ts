// AI features (off until OPENAI_API_KEY is on the server; each has its own switch).
import { api } from "./http";

export const AI_FEATURE_KEYS = ["productWriter", "smartSearch", "shopTheLook", "sizeAdvice", "reviewSummary", "adminAsk", "replySuggest", "photoStudio", "orderFlags"] as const;
export type AiFeature = (typeof AI_FEATURE_KEYS)[number];
export type AiSettings = Record<AiFeature, boolean> & { dailyLimit: number };

export async function getAi() {
  return (await api.get("/admin/ai")).data as { settings: AiSettings; defaults: AiSettings; keyReady: boolean; cloudinaryReady: boolean; usage30: Partial<Record<AiFeature, number>> };
}
export async function saveAi(s: AiSettings) {
  return (await api.put("/admin/ai", s)).data as { settings: AiSettings };
}
export async function catalogAiStatus() {
  return (await api.get("/admin/ai-catalog/status")).data as { productWriter: boolean; photoStudio: boolean };
}
export type WriterField = { key: string; label: string; kind?: string; options?: string[] };
export type WriterResult = { title: string; description: string; seoTitle: string; seoDescription: string; colors: string[]; attributes: Record<string, unknown> };
export async function writeProduct(body: { images: string[]; title?: string; category?: string; type?: string; notes?: string; fields?: WriterField[] }) {
  return (await api.post("/admin/ai-catalog/product-writer", body, { timeout: 90_000 })).data as WriterResult;
}
export async function photoStudio(body: { imageUrl: string; style: "white" | "studio" | "soft"; title?: string }) {
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
