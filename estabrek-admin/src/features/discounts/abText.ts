// Plain-Arabic texts and small helpers for A/B tests (تجارب A/B). Pure (tested).
import type { Comparison, Experiment, ExperimentKind, ExperimentStatus } from "../../api/experiments.api";
import type { StorefrontMotion } from "../../api/cache.api";
import { MOTION_TEXT, PRELOAD_TEXT } from "../system/cacheText";
import { daysText } from "../inventory/forecastText";

export const STATUS_TEXT: Record<ExperimentStatus, { label: string; variant: "default" | "success" | "info" }> = {
  draft: { label: "مسودة", variant: "default" },
  running: { label: "شغّالة", variant: "success" },
  stopped: { label: "توقّفت", variant: "info" },
};

export type FieldInput =
  | { type: "choice"; options: Array<string | number> }
  | { type: "bool" }
  | { type: "number"; min: number; max: number; unit: string };

/** How each motion setting a test may change is typed in. */
export const FIELD_INPUT: Record<string, FieldInput> = {
  maxFps: { type: "choice", options: [30, 45, 60, 90, 120] },
  adaptive: { type: "bool" },
  phoneGlass: { type: "bool" },
  prebuild3d: { type: "bool" },
  keyframeSnap: { type: "bool" },
  videoPreload: { type: "choice", options: ["auto", "metadata", "none"] },
  desktopDpr: { type: "number", min: 100, max: 200, unit: "%" },
  phoneDpr: { type: "number", min: 100, max: 200, unit: "%" },
  lazyPercent: { type: "number", min: 25, max: 400, unit: "%" },
  maxStepMs: { type: "number", min: 50, max: 500, unit: "ms" },
};

export const HERO_TEXT: Record<string, string> = { film: "فيلم الوشاح", photo: "الصورة" };

export function whatText(kind: ExperimentKind, field: string | null): string {
  return kind === "heroOpening" ? "افتتاحية الرئيسية" : MOTION_TEXT[field ?? ""] ?? field ?? "";
}

export function valueText(kind: ExperimentKind, field: string | null, v: unknown): string {
  if (kind === "heroOpening") return HERO_TEXT[String(v)] ?? String(v);
  const input = FIELD_INPUT[field ?? ""];
  if (input?.type === "bool") return v ? "شغّال" : "مطفي";
  if (field === "videoPreload") return PRELOAD_TEXT[v as StorefrontMotion["videoPreload"]] ?? String(v);
  if (field === "maxFps") return `${v} إطار/ث`;
  if (input?.type === "number") return `${v}${input.unit === "%" ? "%" : ` ${input.unit}`}`;
  return String(v);
}

/** A and B to start from: A is the shop's value now, B a sensible other one. */
export function startValues(kind: ExperimentKind, field: string | null, current: Partial<StorefrontMotion> | null): { a: unknown; b: unknown } {
  if (kind === "heroOpening") return { a: "film", b: "photo" };
  const input = FIELD_INPUT[field ?? ""];
  const now = current?.[field as keyof StorefrontMotion];
  if (!input) return { a: now ?? null, b: now ?? null };
  if (input.type === "bool") {
    const a = typeof now === "boolean" ? now : false;
    return { a, b: !a };
  }
  if (input.type === "choice") {
    const a = input.options.includes(now as never) ? now : input.options[input.options.length - 1];
    const others = input.options.filter((o) => o !== a);
    // Frames a second: the next step down; otherwise the first other choice.
    const b = field === "maxFps" ? others.filter((o) => Number(o) < Number(a)).pop() ?? others[0] : others[0];
    return { a, b };
  }
  const a = typeof now === "number" ? now : input.min;
  const step = field === "maxStepMs" ? 100 : field === "lazyPercent" ? 50 : 30;
  const b = a + step <= input.max ? a + step : a - step;
  return { a, b };
}

export const rateText = (r: number) => `${(r * 100).toLocaleString("en", { maximumFractionDigits: 1, minimumFractionDigits: r > 0 && r < 0.1 ? 1 : 0 })}%`;
export const splitText = (split: number) => `${100 - split}% A · ${split}% B`;

const MEASURE: Record<"bags" | "orders", string> = { bags: "بتجيب إضافات للسلة", orders: "بتجيب طلبات" };

/** The test's answer for one measure, in a sentence. */
export function verdictText(c: Comparison, measure: "bags" | "orders"): string {
  // Never "100% sure": a test can't be.
  const sure = `متأكدين ${Math.min(99, Math.round(c.confidence * 100))}%`;
  if (c.verdict === "early") return "لسا بكير: بدها زيارات وطلبات أكثر ليبين الفرق.";
  if (c.verdict === "same") {
    const more = c.moreVisits ? ` بدها تقريباً ${c.moreVisits.toLocaleString("en")} زيارة كمان لكل جهة.` : "";
    return `ما في فرق واضح لهلّق (${sure}).${more}`;
  }
  const [win, lose] = c.verdict === "B" ? [c.rateB, c.rateA] : [c.rateA, c.rateB];
  const lift = lose > 0 ? Math.round(((win - lose) / lose) * 100) : null;
  return `${c.verdict} ${MEASURE[measure]} أكثر${lift != null ? ` بـ ${lift}%` : ""} (${sure}).`;
}

/** "صرلها 5 أيام" / "اشتغلت 12 يوم". */
export function runningForText(e: Pick<Experiment, "status" | "startedAt" | "stoppedAt">, now = Date.now()): string | null {
  if (!e.startedAt) return null;
  const end = e.stoppedAt ? Date.parse(e.stoppedAt) : now;
  const days = Math.max(0, (end - Date.parse(e.startedAt)) / 86400_000);
  const d = days < 1 ? "أقل من يوم" : daysText(Math.floor(days));
  return e.status === "running" ? `صرلها ${d}` : `اشتغلت ${d}`;
}
