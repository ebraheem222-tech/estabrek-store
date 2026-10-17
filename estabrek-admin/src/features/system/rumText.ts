// Plain-Arabic labels and small helpers for real shoppers' speed (تجربة الزباين). Pure (tested).
import type { RumDevice, RumItem, RumMetric, RumOs, RumPage, RumRating, RumReport, RumValue } from "../../api/speed.api";
import { msText } from "./speedText";

export const RUM_METRIC_TEXT: Record<RumMetric, { label: string; note: string }> = {
  lcp: { label: "فتح الصفحة", note: "لحتى يبين أكبر شي بالصفحة (LCP)." },
  inp: { label: "الرد على الضغط", note: "من الضغطة لحتى الشاشة تتغيّر (INP)." },
  cls: { label: "قفزات الصفحة", note: "قديش الأشياء بتتحرّك من مكانها وهي عم تتحمّل (CLS)." },
  fcp: { label: "أول شي بيبين", note: "FCP." },
  ttfb: { label: "رد السيرفر", note: "لحتى يوصل أول جزء من الصفحة (TTFB)." },
  scrollFps: { label: "نعومة السكرول", note: "إطارات بالثانية وقت الزبون عم يسكرل." },
  slowFrames: { label: "إطارات متأخرة", note: "من الإطارات وقت السكرول." },
  sceneFps: { label: "نعومة الـ 3D", note: "إطارات الـ 3D بالثانية." },
};

/** The order of the cards and the table's columns. */
export const RUM_MAIN: RumMetric[] = ["lcp", "inp", "cls", "scrollFps", "slowFrames", "sceneFps"];
export const RUM_MORE: RumMetric[] = ["ttfb", "fcp"];

export const RUM_PAGE_TEXT: Record<RumPage, string> = {
  home: "الرئيسية",
  shop: "المتجر",
  product: "صفحة منتج",
  category: "تصنيف",
  search: "البحث",
  cart: "السلة",
  checkout: "الدفع",
  account: "الحساب",
  order: "تتبّع الطلب",
  page: "صفحات تانية",
  other: "غير ذلك",
};

export const RUM_DEVICE_TEXT: Record<RumDevice, string> = { phone: "تلفون", tablet: "تابلت", desktop: "كمبيوتر" };

export const RUM_OS_TEXT: Record<RumOs | "all", string> = {
  android: "Android",
  ios: "iPhone / iPad",
  windows: "Windows",
  mac: "Mac",
  linux: "Linux",
  other: "غيره",
  all: "كل الأنظمة",
};

export const RUM_RATING_TEXT: Record<RumRating, { label: string; variant: "success" | "warning" | "danger"; cell: string }> = {
  good: { label: "منيح", variant: "success", cell: "text-emerald-300" },
  okay: { label: "مقبول", variant: "warning", cell: "text-amber-300" },
  poor: { label: "ضعيف", variant: "danger", cell: "text-red-300" },
};

export const RUM_DAYS: Array<{ value: string; label: string }> = [
  { value: "1", label: "اليوم" },
  { value: "7", label: "أسبوع" },
  { value: "28", label: "4 أسابيع" },
  { value: "90", label: "3 شهور" },
];

/** Under this many visits a number is shown, but marked "few visits". */
export const RUM_FEW = 20;

export function rumValueText(metric: RumMetric, value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (metric === "cls") return value.toFixed(2);
  if (metric === "scrollFps" || metric === "sceneFps") return `${Math.round(value)} إطار/ث`;
  if (metric === "slowFrames") return `${value < 10 ? value.toFixed(1) : Math.round(value)}%`;
  return msText(value);
}

/** "≤ 2.5 ث منيح · فوق 4.0 ث ضعيف" for a card's tooltip. */
export function rumLimitsText(metric: RumMetric, t: RumReport["thresholds"][RumMetric] | undefined): string {
  if (!t) return "";
  const good = rumValueText(metric, t.good);
  const poor = rumValueText(metric, t.poor);
  return t.better === "lower" ? `لحد ${good} منيح · فوق ${poor} ضعيف` : `من ${good} وفوق منيح · تحت ${poor} ضعيف`;
}

export function rumRowName(item: Pick<RumItem, "page" | "device" | "os">): string {
  return [RUM_PAGE_TEXT[item.page] ?? item.page, RUM_DEVICE_TEXT[item.device] ?? item.device, item.os === "all" ? null : RUM_OS_TEXT[item.os] ?? item.os]
    .filter(Boolean)
    .join(" · ");
}

/** What usually helps, per measure (and where in the admin). */
export const RUM_HELP: Record<RumMetric, string> = {
  lcp: "الصفحة بتاخد وقت لتبين: صغّر الصور (السرعة والكاش ← الصور: الجودة والمقاس)، خلّي كاش المنتجات أطول، وشوف «رد السيرفر» تحت.",
  fcp: "أول شي بيبين متأخر: غالباً رد السيرفر بطيء (تبويب «السيرفر»)، أو في ملفات كبيرة بأول الصفحة.",
  ttfb: "السيرفر بطيء بالرد: شوف تبويب «السيرفر» (أبطأ الروابط والاستعلامات)، وتأكد إن الكاش شغّال.",
  inp: "الضغط بيتأخر: غالباً من الحركة والـ 3D على الأجهزة الضعيفة. خفّف «أعلى سرعة للـ 3D» أو خلّي «الوضع الخفيف» يشتغل على أجهزة أكثر (الحركة والتحميل).",
  cls: "الصفحة بتقفز وهي عم تتحمّل: غالباً صورة أو بانر من غير مقاس ثابت، أو خط بيتبدّل متأخر.",
  scrollFps: "السكرول مش ناعم: طفّي «تأثير الزجاج على التلفونات»، خفّف «دقة الـ 3D على التلفون»، أو طفّي حركة القسم الأثقل (الحركة والتحميل).",
  slowFrames: "في إطارات كثير متأخرة وقت السكرول: نفس حلول «نعومة السكرول»، وخلّي «تجهيز الـ 3D مسبقاً» شغّال.",
  sceneFps: "الـ 3D بطيء على هالأجهزة: خفّف «دقة الـ 3D»، وخلّي «تخفيف السرعة لحاله» شغّال (الحركة والتحميل).",
};

export type RumAdvice = { metric: RumMetric; rating: RumRating; text: string; where: string[] };

/**
 * One tip per measure that's weak (overall, or in a row with enough visits),
 * worst first, with the rows where it's weak (up to 4).
 */
export function rumAdvice(report: Pick<RumReport, "overall" | "items">): RumAdvice[] {
  const out: RumAdvice[] = [];
  for (const metric of [...RUM_MAIN, ...RUM_MORE]) {
    const overall = report.overall[metric]?.rating ?? null;
    const rows = report.items.filter((i) => (i.metrics[metric]?.count ?? 0) >= RUM_FEW && i.metrics[metric]?.rating === "poor");
    const rating: RumRating | null = overall === "poor" || rows.length ? "poor" : overall === "okay" ? "okay" : null;
    if (!rating) continue;
    out.push({ metric, rating, text: RUM_HELP[metric], where: rows.slice(0, 4).map(rumRowName) });
  }
  return out.sort((a, b) => (a.rating === b.rating ? 0 : a.rating === "poor" ? -1 : 1));
}

/**
 * An SVG path through the days that have a number (a day without visits is
 * skipped, the line goes on). Higher values go up; the newest day is on the left,
 * like the page's other charts.
 */
export function sparkPath(values: Array<number | null>, width: number, height: number): string {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (!nums.length) return "";
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  let d = "";
  values.forEach((v, i) => {
    if (v == null || !Number.isFinite(v)) return;
    const x = Math.round((width - i * step) * 10) / 10;
    const y = Math.round((height - 1 - ((v - min) / span) * (height - 2)) * 10) / 10;
    d += `${d ? "L" : "M"}${x} ${y}`;
  });
  return d;
}

/** The card's small line: "1,240 زيارة" or "12 زيارة (قليل)". */
export function rumCountText(v: RumValue | undefined): string {
  if (!v) return "ما في قياس";
  return `${v.count.toLocaleString("en")} زيارة${v.count < RUM_FEW ? " (قليل)" : ""}`;
}
