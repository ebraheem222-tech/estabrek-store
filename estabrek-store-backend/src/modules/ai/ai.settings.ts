/**
 * AI features (admin → الذكاء الاصطناعي), kept in SiteSettings.header.ai.
 * Every one is off by default and can only be turned on once OPENAI_API_KEY
 * is set on the server (order flags are plain rules and need no key).
 */
import { z } from "zod";

export const AI_FEATURES = [
  "productWriter",
  "smartSearch",
  "shopTheLook",
  "sizeAdvice",
  "reviewSummary",
  "adminAsk",
  "replySuggest",
  "photoStudio",
  "orderFlags",
] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

/** Features that work without the key (plain rules). */
export const NO_KEY_NEEDED: ReadonlySet<AiFeature> = new Set(["orderFlags"]);

export const AiSchema = z.object({
  productWriter: z.boolean().default(false),
  smartSearch: z.boolean().default(false),
  shopTheLook: z.boolean().default(false),
  sizeAdvice: z.boolean().default(false),
  reviewSummary: z.boolean().default(false),
  adminAsk: z.boolean().default(false),
  replySuggest: z.boolean().default(false),
  photoStudio: z.boolean().default(false),
  orderFlags: z.boolean().default(false),
  /** Most AI calls a day from shoppers (search, size, look…): a ceiling on the bill. */
  dailyLimit: z.number().int().min(10).max(20000).default(500),
});

export type AiSettings = z.infer<typeof AiSchema>;
export const AI_DEFAULTS: AiSettings = AiSchema.parse({});

export function aiOf(header: unknown): AiSettings {
  const raw = header && typeof header === "object" ? (header as Record<string, unknown>).ai : undefined;
  const ok = AiSchema.safeParse(raw ?? {});
  if (ok.success) return ok.data;
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(AiSchema.shape) as Array<keyof typeof AiSchema.shape>) {
    const one = AiSchema.shape[k].safeParse(r[k]);
    if (one.success) out[k] = one.data;
  }
  return AiSchema.parse(out);
}
