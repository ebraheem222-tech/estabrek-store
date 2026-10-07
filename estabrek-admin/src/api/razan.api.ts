// Admin → رزان: the storefront guide's settings, preview link and report.
import { api } from "./http";

export type RazanText = { ar: string; en: string };
export type RazanSeason = "ramadan" | "eid" | "summer" | "winter";
export type RazanOutfit = "abaya" | "dress" | "coat" | "khimar" | "tunic" | "eid";

export type RazanSettings = {
  enabled: boolean;
  greeting: boolean;
  reactions: boolean;
  idleHabits: boolean;
  maxBubbles: number;
  quietPaths: string[];
  phone: "full" | "quiet" | "hidden";
  texts: { welcome: RazanText; greetingChat: RazanText; greetingOffline: RazanText };
  seasonal: { mode: "auto" | "off" | RazanSeason; outfit: boolean; lines: Record<RazanSeason, RazanText> };
  outfits: { default: RazanOutfit; rules: Array<{ match: string; outfit: RazanOutfit; pearls: boolean }> };
  history: { enabled: boolean; ttlHours: number; offer: boolean };
  helpOrder: { enabled: boolean; idleSeconds: number; snoozeDays: number };
  styleQuiz: { enabled: boolean; results: number; variety: "low" | "medium" | "high" };
};

export type RazanReport = {
  totals: Record<string, { d7: number; d30: number }>;
  byDay: Record<string, Record<string, number>>;
  helpOrders: { d7: number; d30: number };
  /** «رزان بتختارلك»: anonymous answer totals (last 30 days), most chosen first. */
  quiz?: Partial<Record<"occasion" | "season" | "color" | "look" | "budget", Array<{ value: string; count: number }>>>;
};

export async function getRazan() {
  return (await api.get("/admin/razan")).data as { razan: RazanSettings; defaults: RazanSettings; chatbotEnabled: boolean; storefrontUrl: string | null };
}
export async function saveRazan(s: RazanSettings) {
  return (await api.put("/admin/razan", s)).data as { razan: RazanSettings };
}
export async function previewRazan(s: RazanSettings) {
  return (await api.post("/admin/razan/preview", s)).data as { id: string; expiresAt: string };
}
export async function razanReport() {
  return (await api.get("/admin/razan/report")).data as RazanReport;
}
