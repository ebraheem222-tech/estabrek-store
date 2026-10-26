// Plain texts and small helpers for the stock forecast (توقّع المخزون). Pure (tested).
import type { ForecastProduct, ForecastSettings, StockStatus } from "../../api/insights.api";
import { tr } from "@/lib/words";

export const STATUS_TEXT: Record<StockStatus, { label: string; variant: "danger" | "warning" | "success" | "default" }> = {
  soldOut: { label: tr("خلص وعليه طلب", "Out, still wanted"), variant: "danger" },
  soon: { label: tr("بيخلص قريب", "Running out soon"), variant: "danger" },
  watch: { label: tr("انتباه", "Watch"), variant: "warning" },
  ok: { label: tr("كافي", "Enough"), variant: "success" },
  noSales: { label: tr("ما انباع", "No sales"), variant: "default" },
  empty: { label: tr("خلص", "Out"), variant: "default" },
};

export const SETTINGS_TEXT: Record<keyof ForecastSettings, { label: string; unit: string; help: string }> = {
  leadDays: { label: tr("التوصيل من المورّد", "Supplier delivery"), unit: tr("يوم", "days"), help: tr("من وقت الطلب لحتى توصل البضاعة على الرف.", "From ordering until the goods are on the shelf.") },
  coverDays: { label: tr("الطلبية بتكفي", "An order lasts"), unit: tr("يوم", "days"), help: tr("قديش لازم تكفي الطلبية الجديدة بعد ما توصل.", "How long the new order should last once it arrives.") },
  windowDays: { label: tr("السرعة من آخر", "Pace from the last"), unit: tr("يوم", "days"), help: tr("الطلبات اللي منها بتنحسب السرعة (مع آخر أسبوع).", "The orders the pace is worked out from (with the last week).") },
  unseenDays: { label: tr("«ما حدا شافه» بعد", "“Nobody saw it” after"), unit: tr("يوم", "days"), help: tr("منتج على الرف هالمدة بلا ولا مشاهدة ولا بيعة.", "A product on the shelf this long with no views and no sales.") },
};

/** 0 → "خلص", 1 → "يوم", 2 → "يومين", 4 → "4 أيام", 15 → "15 يوم". */
export function daysText(d: number | null): string {
  if (d == null) return "—";
  if (d <= 0) return tr("خلص", "out");
  if (d < 1) return tr("أقل من يوم", "less than a day");
  const n = Math.round(d);
  if (n === 1) return tr("يوم", "1 day");
  if (n === 2) return tr("يومين", "2 days");
  return tr(n <= 10 ? `${n} أيام` : `${n} يوم`, "{0} days", [n]);
}

/** 2 → "2 قطعة باليوم", 0.2 → "قطعة كل 5 أيام", 0 → "ما انباع". */
export function paceText(pace: number): string {
  if (pace <= 0) return tr("ما انباع", "No sales");
  if (pace >= 1) {
    const n = pace.toLocaleString("en", { maximumFractionDigits: 1 });
    return tr(`${n} قطعة باليوم`, "{0} a day", [n]);
  }
  return tr(`قطعة كل ${daysText(1 / pace)}`, "1 every {0}", [daysText(1 / pace)]);
}

/** The product's line: "M أسود بيخلص بعد حوالي 4 أيام على هالسرعة". */
export function forecastSentence(p: Pick<ForecastProduct, "status" | "daysLeft" | "firstOutDays" | "variants">): string {
  if (p.status === "noSales") return tr("ما انباع منه شي بهالمدة.", "Nothing of it sold in this time.");
  if (p.status === "empty") return tr("خلص، وما في طلب عليه.", "Out, and nobody is asking for it.");
  const first = p.variants
    .filter((v) => v.status === p.status)
    .sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity))[0];
  const which = first && p.variants.length > 1 ? `${first.size}${first.color && first.color !== "Default" ? ` ${first.color}` : ""}` : null;
  if (p.status === "soldOut") return which ? tr(`${which} خلص والناس عم تطلبه.`, "{0} is out and people are asking for it.", [which]) : tr("خلص والناس عم تطلبه.", "Out and people are asking for it.");
  const days = p.firstOutDays ?? p.daysLeft;
  const soon = days != null && days < 1;
  const when = soon ? tr("خلال يوم", "within a day") : tr(`بعد حوالي ${daysText(days)}`, "in about {0}", [daysText(days)]);
  return which
    ? tr(`${which} بيخلص ${when} على هالسرعة.`, "{0} runs out {1} at this pace.", [which, when])
    : tr(`بيخلص ${when} على هالسرعة.`, "Runs out {0} at this pace.", [when]);
}

export function lastViewedText(iso: string | null, now = Date.now()): string {
  if (!iso) return tr("ولا مشاهدة من ما بلّش العدّ", "No views since counting began");
  const days = Math.max(0, Math.floor((now - Date.parse(iso)) / 86400_000));
  return days === 0 ? tr("آخر مشاهدة اليوم", "Last seen today") : tr(`آخر مشاهدة قبل ${daysText(days)}`, "Last seen {0} ago", [daysText(days)]);
}

export type ForecastFilter = "urgent" | "reorder" | "all";

export function filterProducts(products: ForecastProduct[], f: ForecastFilter): ForecastProduct[] {
  if (f === "urgent") return products.filter((p) => p.status === "soldOut" || p.status === "soon" || p.status === "watch");
  if (f === "reorder") return products.filter((p) => p.reorder > 0);
  return products;
}

/** The reorder list for the supplier (CSV rows). */
export function reorderRows(products: ForecastProduct[], s: ForecastSettings) {
  const head = [
    "SKU", tr("المنتج", "Product"), tr("اللون", "Colour"), tr("المقاس", "Size"), tr("الموجود", "In stock"), tr("انباع آخر 7 أيام", "Sold last 7 days"),
    tr(`انباع آخر ${s.windowDays} يوم`, "Sold last {0} days", [s.windowDays]), tr("باليوم", "Per day"), tr("بيخلص بعد (يوم)", "Runs out in (days)"), tr("اطلب", "Order"),
  ];
  const rows = products.flatMap((p) =>
    p.variants.filter((v) => v.reorder > 0).map((v) => [v.sku, p.title, v.color, v.size, v.available, v.sold7, v.soldWindow, v.pace, v.daysLeft ?? "", v.reorder]),
  );
  return { head, rows };
}
