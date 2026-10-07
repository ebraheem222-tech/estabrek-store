// Plain-Arabic helpers for the traffic page (حماية الضغط). Pure (tested).
import type { PressureSettings, TrafficClient } from "../../api/system.api";

export const MODE_TEXT: Record<PressureSettings["mode"], { label: string; hint: string }> = {
  off: { label: "مطفية", hint: "ما في حساب ضغط. الحظر اليدوي وحدود الطلبات العادية بيضلّوا شغّالين." },
  watch: { label: "مراقبة بس", hint: "بنحسب الضغط وبنفرجيك مين كان رح ينبطّأ أو ينحظر، بدون ما نوقف حدا. منيح كبداية لتشوف الأرقام." },
  on: { label: "شغّالة", hint: "اللي بيضغط كتير بتبطأ عليه الردود، وإذا وصل لحد الحظر بينحظر مؤقتاً، والمدة بتتضاعف إذا رجع." },
};

export const STATUS_TEXT: Record<TrafficClient["status"], { label: string; variant: "success" | "warning" | "danger" | undefined }> = {
  ok: { label: "طبيعي", variant: undefined },
  slowed: { label: "بتبطّأ", variant: "warning" },
  blocked: { label: "محظور", variant: "danger" },
  "would-block": { label: "كان رح ينحظر", variant: "warning" },
};

/** τ from the half-life (s halves every half-life ⇔ e^(−t/τ) with τ = h / ln 2). */
export const tauOf = (halfLifeSeconds: number) => halfLifeSeconds / Math.LN2;

export const pressureOf = (score: number, capacity: number) => 1 - Math.exp(-Math.max(0, score) / capacity);

/** Pressure an IP settles at when it sends `perSecond` requests of weight `w` for a long time. */
export function steadyPressure(perSecond: number, w: number, s: Pick<PressureSettings, "halfLifeSeconds" | "capacity">) {
  return pressureOf(perSecond * w * tauOf(s.halfLifeSeconds), s.capacity);
}

/** Seconds until an IP sending `perSecond` requests of weight `w` gets blocked; null = never. */
export function secondsToBlock(perSecond: number, w: number, s: Pick<PressureSettings, "halfLifeSeconds" | "capacity" | "blockAt">) {
  const tau = tauOf(s.halfLifeSeconds);
  const target = -s.capacity * Math.log(1 - Math.min(0.9999, s.blockAt / 100));
  const ceiling = perSecond * w * tau;
  if (ceiling <= target) return null;
  return -tau * Math.log(1 - target / ceiling);
}

export function percent(p: number) {
  return `${Math.round(p * 100)}%`;
}

export function humanSeconds(sec: number | null) {
  if (sec == null) return "أبداً";
  if (sec < 1) return "أقل من ثانية";
  if (sec < 90) return `${Math.round(sec)} ثانية`;
  return `${Math.round(sec / 60)} دقيقة`;
}

/** "بعد 12 دقيقة" / "بعد 3 ساعات" until a time (ms), or "لحتى تفكّه" when there's no end. */
export function untilText(until: number | string | null, now = Date.now()) {
  if (until == null) return "لحتى تفكّه";
  const t = typeof until === "string" ? new Date(until).getTime() : until;
  const mins = Math.max(1, Math.round((t - now) / 60_000));
  if (mins < 60) return `${mins} دقيقة كمان`;
  const h = Math.round(mins / 60);
  if (h < 48) return h === 1 ? "ساعة كمان" : `${h} ساعات كمان`;
  return `${Math.round(h / 24)} أيام كمان`;
}

/** The storefront link that opens the site for the owner during maintenance. */
export function previewUrl(storefront: string, key: string) {
  return `${storefront.replace(/\/+$/, "")}/?preview=${encodeURIComponent(key)}`;
}
