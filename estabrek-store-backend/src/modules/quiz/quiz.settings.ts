/**
 * «سؤال وجواب» settings (admin → سؤال وجواب), kept in SiteSettings.header.quiz.
 * A few visitors get a chance to answer questions (easy → hard) and win a
 * one-time coupon for their phone. Off by default.
 */
import { z } from "zod";

export const QuizSchema = z.object({
  enabled: z.boolean().default(false),
  /** counter: visitors 1, 3, 7, 15… (each next one base× further); chance: a draw whose odds shrink after each win. */
  mode: z.enum(["counter", "chance"]).default("counter"),
  /** 2 = 1, 3, 7, 15, 31…; 3 = 1, 4, 13, 40… (and in chance mode the odds divide by it after each win). */
  base: z.number().int().min(2).max(5).default(2),
  /** The counter starts from zero again every this many days. */
  resetDays: z.number().int().min(1).max(60).default(7),
  /** Most coupons given in one period. */
  maxPerPeriod: z.number().int().min(1).max(200).default(5),
  /** The coupon: % off, valid for this many hours, one use, her phone only. */
  percent: z.number().int().min(1).max(50).default(10),
  hours: z.number().int().min(6).max(336).default(48),
  /** Questions per go (all must be right). */
  questions: z.number().int().min(3).max(10).default(5),
  /** Chance mode: the first chance in a period, in % (then divided by base after each win). */
  startChance: z.number().int().min(1).max(100).default(20),
});

export type QuizSettings = z.infer<typeof QuizSchema>;
export const QUIZ_DEFAULTS: QuizSettings = QuizSchema.parse({});

export function quizOf(header: unknown): QuizSettings {
  const raw = header && typeof header === "object" ? (header as Record<string, unknown>).quiz : undefined;
  const ok = QuizSchema.safeParse(raw ?? {});
  if (ok.success) return ok.data;
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(QuizSchema.shape) as Array<keyof typeof QuizSchema.shape>) {
    const one = QuizSchema.shape[k].safeParse(r[k]);
    if (one.success) out[k] = one.data;
  }
  return QuizSchema.parse(out);
}

/** The visitor numbers that get a chance in counter mode: 1, then base·p + 1 (2 → 1, 3, 7, 15, 31…). */
export function chancePositions(base: number, upTo: number): number[] {
  const out: number[] = [];
  for (let p = 1; p <= upTo; p = base * p + 1) out.push(p);
  return out;
}

export function isChancePosition(seq: number, base: number) {
  for (let p = 1; p <= seq; p = base * p + 1) if (p === seq) return true;
  return false;
}

export function nextChancePosition(after: number, base: number) {
  let p = 1;
  while (p <= after) p = base * p + 1;
  return p;
}

/** The period a moment falls in (Israel days, periods start on a Sunday) and its first/last day. */
export function periodOf(resetDays: number, now = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const day = Math.floor(Date.parse(`${ymd}T00:00:00Z`) / 864e5);
  const SUNDAY = 3; // 1970-01-04 was a Sunday
  const n = Math.floor((day - SUNDAY) / resetDays);
  const start = new Date((SUNDAY + n * resetDays) * 864e5);
  const end = new Date((SUNDAY + (n + 1) * resetDays) * 864e5 - 1);
  return { key: `${resetDays}d-${n}`, start, end };
}
