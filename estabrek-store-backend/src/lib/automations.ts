/**
 * Automations, "when X, do Y" (admin → التلقائيات), the light part: what can
 * happen, what can be done, the messages, and the door the rest of the server
 * knocks on (emitAutomation). The rules themselves run in
 * modules/admin/automations.service.ts, which registers itself at start; before
 * that (tests, scripts) events are just dropped.
 */
import { z } from "zod";

export const TRIGGERS = ["order.created", "stock.low", "video.ready", "product.viral", "job.failing"] as const;
export type Trigger = (typeof TRIGGERS)[number];
export const ACTIONS = ["notify", "email", "whatsapp", "sms", "pinProduct"] as const;
export type Action = (typeof ACTIONS)[number];

/** What each trigger's rule may ask, checked when saved. */
export const CONDITIONS: Record<Trigger, z.ZodTypeAny> = {
  "order.created": z.object({ minTotal: z.number().min(0).max(1_000_000).optional() }).strict(),
  "stock.low": z.object({ threshold: z.number().int().min(0).max(1000) }).strict(),
  "video.ready": z.object({}).strict(),
  "product.viral": z.object({ minScore: z.number().min(1).max(100_000), factor: z.number().min(1.5).max(50) }).strict(),
  "job.failing": z.object({}).strict(),
};

export const CONDITION_DEFAULTS: Record<Trigger, Record<string, number>> = {
  "order.created": {},
  "stock.low": { threshold: 3 },
  "video.ready": {},
  "product.viral": { minScore: 20, factor: 3 },
  "job.failing": {},
};

/** The words a message can use ({{name}}), with an example each (for "try it"). */
export const SAMPLES: Record<Trigger, Record<string, string | number>> = {
  "order.created": { orderId: "ORD-1042", customerName: "سارة", phone: "0599123456", total: 240, items: 2, city: "رام الله", link: "/admin/orders" },
  "stock.low": { product: "حجاب شيفون", color: "أسود", size: "M", sku: "CH-BLK-M", stock: 2, threshold: 3, link: "/admin/inventory/low-stock" },
  "video.ready": { video: "فيلم الحملة", preset: "1080p", link: "/admin/media/videos" },
  "product.viral": { product: "فستان الورد", score: 64, before: 12, factor: 5.3, link: "/admin/system/cache#popular" },
  "job.failing": { job: "الرسايل", failures: 3, error: "SMTP timed out", link: "/admin/system/jobs" },
};

export const DEFAULT_TEXT: Record<Trigger, string> = {
  "order.created": "طلب جديد {{orderId}} من {{customerName}} ({{phone}}): {{total}} ₪، {{items}} قطعة. {{city}}",
  "stock.low": "المخزون قليل: {{product}} ({{color}} · {{size}}) باقي {{stock}}.",
  "video.ready": "الفيديو «{{video}}» جاهز ({{preset}}).",
  "product.viral": "«{{product}}» عم ينتشر: الشعبية صارت ×{{factor}} خلال ساعة.",
  "job.failing": "المهمة «{{job}}» فشلت {{failures}} مرات ورا بعض: {{error}}",
};

/** Doing it to a product only makes sense when the trigger is about one. */
export const PRODUCT_TRIGGERS: Trigger[] = ["product.viral"];

export const ConfigSchema = z
  .object({
    /** Email address or phone (empty = the shop's own, from the settings). */
    to: z.string().trim().max(200).optional(),
    subject: z.string().trim().max(150).optional(),
    text: z.string().trim().max(1000).optional(),
    /** pinProduct: for how long. */
    hours: z.number().int().min(1).max(24 * 30).optional(),
  })
  .strict();
export type ActionConfig = z.infer<typeof ConfigSchema>;

/** "طلب جديد {{orderId}}" → "طلب جديد ORD-1042"; unknown words stay empty. */
export function render(text: string, data: Record<string, unknown>): string {
  return text
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => {
      const v = data[k];
      return v == null ? "" : String(v);
    })
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** The rule's own condition for this event (the trigger already matched). */
export function conditionsMet(trigger: Trigger, conditions: Record<string, unknown>, data: Record<string, unknown>): boolean {
  if (trigger === "order.created") return conditions.minTotal == null || Number(data.total ?? 0) >= Number(conditions.minTotal);
  if (trigger === "stock.low") return Number(data.stock ?? Infinity) <= Number(conditions.threshold ?? 3);
  return true;
}

/* ---------------- The door ---------------- */

type Handler = (trigger: Trigger, data: Record<string, unknown>, subject: string) => Promise<unknown>;
let handler: Handler | null = null;

export function setAutomationHandler(h: Handler | null) {
  handler = h;
}

/** Something happened: the rules for it run in the background (never slowing or failing the caller). */
export function emitAutomation(trigger: Trigger, data: Record<string, unknown>, subject: string) {
  if (!handler) return;
  void Promise.resolve()
    .then(() => handler?.(trigger, data, subject))
    .catch((e) => console.error(`[automations] ${trigger} failed:`, e instanceof Error ? e.message : e));
}
