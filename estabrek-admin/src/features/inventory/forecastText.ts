// Plain-Arabic texts and small helpers for the stock forecast (توقّع المخزون). Pure (tested).
import type { ForecastProduct, ForecastSettings, StockStatus } from "../../api/insights.api";

export const STATUS_TEXT: Record<StockStatus, { label: string; variant: "danger" | "warning" | "success" | "default" }> = {
  soldOut: { label: "خلص وعليه طلب", variant: "danger" },
  soon: { label: "بيخلص قريب", variant: "danger" },
  watch: { label: "انتبه", variant: "warning" },
  ok: { label: "كافي", variant: "success" },
  noSales: { label: "ما انباع", variant: "default" },
  empty: { label: "خلص", variant: "default" },
};

export const SETTINGS_TEXT: Record<keyof ForecastSettings, { label: string; unit: string; help: string }> = {
  leadDays: { label: "التوصيل من المورّد", unit: "يوم", help: "من ما تطلب لحتى توصل البضاعة على الرف." },
  coverDays: { label: "الطلبية بتكفي", unit: "يوم", help: "قديش بدك الطلبية الجديدة تكفي بعد ما توصل." },
  windowDays: { label: "السرعة من آخر", unit: "يوم", help: "الطلبات اللي منها بتنحسب السرعة (مع آخر أسبوع)." },
  unseenDays: { label: "«ما حدا شافه» بعد", unit: "يوم", help: "منتج على الرف هالمدة بلا ولا مشاهدة ولا بيعة." },
};

/** 0 → "خلص", 1 → "يوم", 2 → "يومين", 4 → "4 أيام", 15 → "15 يوم". */
export function daysText(d: number | null): string {
  if (d == null) return "—";
  if (d <= 0) return "خلص";
  if (d < 1) return "أقل من يوم";
  const n = Math.round(d);
  if (n === 1) return "يوم";
  if (n === 2) return "يومين";
  return n <= 10 ? `${n} أيام` : `${n} يوم`;
}

/** 2 → "2 قطعة باليوم", 0.2 → "قطعة كل 5 أيام", 0 → "ما انباع". */
export function paceText(pace: number): string {
  if (pace <= 0) return "ما انباع";
  if (pace >= 1) return `${pace.toLocaleString("en", { maximumFractionDigits: 1 })} قطعة باليوم`;
  return `قطعة كل ${daysText(1 / pace)}`;
}

/** The product's line: "M أسود بيخلص بعد حوالي 4 أيام على هالسرعة". */
export function forecastSentence(p: Pick<ForecastProduct, "status" | "daysLeft" | "firstOutDays" | "variants">): string {
  if (p.status === "noSales") return "ما انباع منه شي بهالمدة.";
  if (p.status === "empty") return "خلص، وما في طلب عليه.";
  const first = p.variants
    .filter((v) => v.status === p.status)
    .sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity))[0];
  const which = first && p.variants.length > 1 ? `${first.size}${first.color && first.color !== "Default" ? ` ${first.color}` : ""}` : null;
  if (p.status === "soldOut") return which ? `${which} خلص والناس عم تطلبه.` : "خلص والناس عم تطلبه.";
  const days = p.firstOutDays ?? p.daysLeft;
  const when = days != null && days < 1 ? "خلال يوم" : `بعد حوالي ${daysText(days)}`;
  return `${which ? `${which} ` : ""}بيخلص ${when} على هالسرعة.`;
}

export function lastViewedText(iso: string | null, now = Date.now()): string {
  if (!iso) return "ولا مشاهدة من ما بلّش العدّ";
  const days = Math.max(0, Math.floor((now - Date.parse(iso)) / 86400_000));
  return days === 0 ? "آخر مشاهدة اليوم" : `آخر مشاهدة قبل ${daysText(days)}`;
}

export type ForecastFilter = "urgent" | "reorder" | "all";

export function filterProducts(products: ForecastProduct[], f: ForecastFilter): ForecastProduct[] {
  if (f === "urgent") return products.filter((p) => p.status === "soldOut" || p.status === "soon" || p.status === "watch");
  if (f === "reorder") return products.filter((p) => p.reorder > 0);
  return products;
}

/** The reorder list for the supplier (CSV rows). */
export function reorderRows(products: ForecastProduct[], s: ForecastSettings) {
  const head = ["SKU", "المنتج", "اللون", "المقاس", "الموجود", "انباع آخر 7 أيام", `انباع آخر ${s.windowDays} يوم`, "باليوم", "بيخلص بعد (يوم)", "اطلب"];
  const rows = products.flatMap((p) =>
    p.variants.filter((v) => v.reorder > 0).map((v) => [v.sku, p.title, v.color, v.size, v.available, v.sold7, v.soldWindow, v.pace, v.daysLeft ?? "", v.reorder]),
  );
  return { head, rows };
}
