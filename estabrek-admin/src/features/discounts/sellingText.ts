// Plain texts and small helpers for البيع الذكي (sale rules and seasons). Pure (tested).
import type { Campaign, CampaignStatus, PriceAction, RuleName, SaleAction, Suggestion } from "../../api/selling.api";
import { formatCurrency } from "../../lib/format";
import { daysText } from "../inventory/forecastText";
import { loc } from "@/lib/lang";
import { tr } from "@/lib/words";

const money = (n: unknown) => formatCurrency(Number(n ?? 0));
const num = (n: unknown) => Number(n ?? 0).toLocaleString("en");

export const RULE_TEXT: Record<RuleName, { label: string; what: string }> = {
  unseen: { label: tr("ما حدا شافه", "Nobody saw it"), what: tr("منتج على الرف من مدة، ما حدا فتح صفحته ولا اشترى منه: اقتراح خصم.", "A product on the shelf for a while that nobody opened or bought: suggests a discount.") },
  lookedNotBought: { label: tr("بيتفرجوا وما بيشتروا", "Looked but didn't buy"), what: tr("انفتح كثير بس ما انباع: اقتراح خصم أصغر.", "Opened a lot but not sold: suggests a smaller discount.") },
  hotLowStock: { label: tr("مطلوب وقرب يخلص", "Wanted and nearly gone"), what: tr("عليه خصم، الناس عم تطلبه كثير، وباقي منه قطع قليلة: اقتراح توقيف الخصم.", "On discount, much wanted, and only a few left: suggests stopping the discount.") },
};

/** Why it's suggested, from its numbers. */
export function suggestionSentence(s: Pick<Suggestion, "rule" | "why">): string {
  const w = s.why;
  if (s.rule === "unseen") return tr(`ما حدا شافه من ${daysText(Number(w.days))} (${num(w.stock)} قطعة، ${money(w.stockValue)}).`, "Nobody saw it for {0} ({1} pieces, {2}).", [daysText(Number(w.days)), num(w.stock), money(w.stockValue)]);
  if (s.rule === "lookedNotBought") return tr(`${num(w.views)} مشاهدة و${num(w.bags)} للسلة بآخر ${daysText(Number(w.days))}، وولا بيعة.`, "{0} views and {1} to the bag in the last {2}, and no sales.", [num(w.views), num(w.bags), daysText(Number(w.days))]);
  return tr(`مطلوب كثير (${num(w.views7)} مشاهدة و${num(w.bags7)} للسلة هالأسبوع) وباقي ${num(w.left)} بس.`, "Much wanted ({0} views and {1} to the bag this week) and only {2} left.", [num(w.views7), num(w.bags7), num(w.left)]);
}

/** What approving does: "خصم 10% لمدة 14 يوم: ₪50 ← ₪45". */
export function actionText(a: SaleAction, why: Suggestion["why"] = {}): string {
  if (a.kind === "endDiscount") return tr("توقيف الخصم: بيرجع لسعره العادي.", "Stop the discount: it goes back to its normal price.");
  const prices = why.price != null && why.newPrice != null ? `: ${money(why.price)} ${tr("←", "→")} ${money(why.newPrice)}` : "";
  return tr(`خصم ${a.percent}% لمدة ${daysText(a.saleDays)}${prices}`, "{0}% off for {1}{2}", [a.percent, daysText(a.saleDays), prices]);
}

export const ACTION_KIND_TEXT: Record<PriceAction["kind"], string> = { discount: tr("خصم", "Discount"), endDiscount: tr("وقف خصم", "Discount stopped"), campaign: tr("موسم", "Season") };
export const ACTION_STATUS_TEXT: Record<PriceAction["status"], string> = { applied: tr("مطبّق", "Applied"), undone: tr("انرجع", "Undone"), ended: tr("خلص الموسم", "Season over") };

/** "₪50 ← ₪45 · 3 مقاسات" for the history list. */
export function priceActionText(a: Pick<PriceAction, "changes">): string {
  const c = a.changes[0];
  if (!c) return "";
  const shown = (f: { price: number; salePrice: number | null; saleStartsAt: string | null }) => (f.salePrice != null && f.salePrice > 0 ? f.salePrice : f.price);
  const n = a.changes.length;
  const sizes = n === 1 ? tr("مقاس واحد", "1 size") : n === 2 ? tr("مقاسين", "2 sizes") : tr(`${n} مقاسات`, "{0} sizes", [n]);
  return `${money(shown(c.before))} ${tr("←", "→")} ${money(shown(c.after))} · ${sizes}`;
}

export const CAMPAIGN_STATUS_TEXT: Record<CampaignStatus, { label: string; variant: "info" | "success" | "default" | "warning" }> = {
  scheduled: { label: tr("مجدول", "Scheduled"), variant: "info" },
  running: { label: tr("شغّال هلّق", "Running now"), variant: "success" },
  ended: { label: tr("خلص", "Over"), variant: "default" },
  canceled: { label: tr("توقّف", "Stopped"), variant: "warning" },
};

const day = (iso: string) => new Date(iso).toLocaleDateString(loc("ar"), { day: "numeric", month: "long" });
const time = (iso: string) => new Date(iso).toLocaleTimeString(loc("ar"), { hour: "2-digit", minute: "2-digit" });

/** "10 آذار، 00:00 ← 9 نيسان، 23:59". */
export function campaignWhen(c: Pick<Campaign, "startsAt" | "endsAt">): string {
  const sep = tr("، ", ", ");
  return `${day(c.startsAt)}${sep}${time(c.startsAt)} ${tr("←", "→")} ${day(c.endsAt)}${sep}${time(c.endsAt)}`;
}

/** "الثيم: Luxury Paper · خصم 20% على حجاب، عبايات". */
export function campaignWhat(c: Pick<Campaign, "themePresetId" | "percentOff" | "categoryIds" | "productIds">, themeName: (id: string) => string, categoryName: (id: string) => string): string {
  const parts: string[] = [];
  if (c.themePresetId) parts.push(tr(`الثيم: ${themeName(c.themePresetId)}`, "Theme: {0}", [themeName(c.themePresetId)]));
  if (c.percentOff) {
    const scope = !c.categoryIds.length && !c.productIds.length
      ? tr("كل المنتجات", "all products")
      : [...c.categoryIds.map(categoryName), ...(c.productIds.length ? [tr(`${c.productIds.length} منتج`, "{0} products", [c.productIds.length])] : [])].join(tr("، ", ", "));
    parts.push(tr(`خصم ${c.percentOff}% على ${scope}`, "{0}% off {1}", [c.percentOff, scope]));
  }
  return parts.join(" · ");
}

/** What happened at its start and end. */
export function campaignLogText(c: Pick<Campaign, "log" | "percentOff">): string | null {
  const l = c.log;
  if (!l) return null;
  if (l.missed) return tr("السيرفر كان مطفي طول الموسم: ما تغيّر شي.", "The server was off the whole season: nothing changed.");
  const out: string[] = [];
  if (l.start && c.percentOff) {
    const left = l.start.leftAlone ? tr(` (${num(l.start.leftAlone)} عليهم خصم تاني، تركناهم)`, " ({0} had another discount, left alone)", [num(l.start.leftAlone)]) : "";
    out.push(tr(`نزل الخصم على ${num(l.start.sizes)} مقاس${left}`, "The discount went on {0} sizes{1}", [num(l.start.sizes), left]));
  }
  if (l.end) {
    if (c.percentOff) {
      const changed = l.end.changedSince ? tr(` (${num(l.end.changedSince)} تغيّروا بالنص، تركناهم)`, " ({0} changed in between, left alone)", [num(l.end.changedSince)]) : "";
      out.push(tr(`رجع السعر لـ ${num(l.end.restored)}${changed}`, "Prices restored for {0}{1}", [num(l.end.restored), changed]));
    }
    if (l.start?.theme) out.push(l.end.themeBack ? tr("رجع الثيم", "The theme came back") : tr("الثيم ضل متل ما غيّرته", "The theme stayed as changed"));
  }
  return out.join(" · ") || null;
}

/* ---------------- The season form ---------------- */

/** ISO → the value of an <input type="datetime-local"> (this computer's time). */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export type CampaignDraft = { name: string; startsAt: string; endsAt: string; themePresetId: string | null; percentOff: number | null; categoryIds: string[] };

/** What's wrong with the form, in words (empty = fine). */
export function campaignProblems(d: CampaignDraft, now = Date.now(), maxDays = 120): string[] {
  const out: string[] = [];
  if (!d.name.trim()) out.push(tr("لازم يكون للموسم اسم.", "Give the season a name."));
  const s = Date.parse(d.startsAt);
  const e = Date.parse(d.endsAt);
  if (!Number.isFinite(s) || !Number.isFinite(e)) out.push(tr("لازم تنحدد البداية والنهاية.", "Choose the start and the end."));
  else {
    if (e <= s) out.push(tr("النهاية لازم تكون بعد البداية.", "The end has to be after the start."));
    if (e <= now) out.push(tr("النهاية مرقت.", "The end has passed."));
    if (e - s > maxDays * 86400_000) out.push(tr(`الموسم أطول من ${maxDays} يوم.`, "The season is longer than {0} days.", [maxDays]));
  }
  if (!d.themePresetId && !d.percentOff) out.push(tr("لازم ينختار ثيم أو خصم (أو الاثنين).", "Choose a theme or a discount (or both)."));
  if (d.percentOff != null && (!Number.isInteger(d.percentOff) || d.percentOff < 1 || d.percentOff > 70)) out.push(tr("الخصم من 1 لـ 70%.", "The discount is from 1 to 70%."));
  return out;
}
