// Plain-Arabic texts and small helpers for البيع الذكي (sale rules and seasons). Pure (tested).
import type { Campaign, CampaignStatus, PriceAction, RuleName, SaleAction, Suggestion } from "../../api/selling.api";
import { formatCurrencyILS } from "../../lib/format";
import { daysText } from "../inventory/forecastText";

const money = (n: unknown) => formatCurrencyILS(Number(n ?? 0));
const num = (n: unknown) => Number(n ?? 0).toLocaleString("en");

export const RULE_TEXT: Record<RuleName, { label: string; what: string }> = {
  unseen: { label: "ما حدا شافه", what: "منتج على الرف من مدة، ما حدا فتح صفحته ولا اشترى منه: اقتراح خصم." },
  lookedNotBought: { label: "بيتفرجوا وما بيشتروا", what: "انفتح كثير بس ما انباع: اقتراح خصم أصغر." },
  hotLowStock: { label: "مطلوب وقرب يخلص", what: "عليه خصم، الناس عم تطلبه كثير، وباقي منه قطع قليلة: اقتراح توقيف الخصم." },
};

/** Why it's suggested, from its numbers. */
export function suggestionSentence(s: Pick<Suggestion, "rule" | "why">): string {
  const w = s.why;
  if (s.rule === "unseen") return `ما حدا شافه من ${daysText(Number(w.days))} (${num(w.stock)} قطعة، ${money(w.stockValue)}).`;
  if (s.rule === "lookedNotBought") return `${num(w.views)} مشاهدة و${num(w.bags)} للسلة بآخر ${daysText(Number(w.days))}، وولا بيعة.`;
  return `مطلوب كثير (${num(w.views7)} مشاهدة و${num(w.bags7)} للسلة هالأسبوع) وباقي ${num(w.left)} بس.`;
}

/** What approving does: "خصم 10% لمدة 14 يوم: ₪50 ← ₪45". */
export function actionText(a: SaleAction, why: Suggestion["why"] = {}): string {
  if (a.kind === "endDiscount") return "وقّف الخصم: بيرجع لسعره العادي.";
  const prices = why.price != null && why.newPrice != null ? `: ${money(why.price)} ← ${money(why.newPrice)}` : "";
  return `خصم ${a.percent}% لمدة ${daysText(a.saleDays)}${prices}`;
}

export const ACTION_KIND_TEXT: Record<PriceAction["kind"], string> = { discount: "خصم", endDiscount: "وقف خصم", campaign: "موسم" };
export const ACTION_STATUS_TEXT: Record<PriceAction["status"], string> = { applied: "مطبّق", undone: "انرجع", ended: "خلص الموسم" };

/** "₪50 ← ₪45 · 3 مقاسات" for the history list. */
export function priceActionText(a: Pick<PriceAction, "changes">): string {
  const c = a.changes[0];
  if (!c) return "";
  const shown = (f: { price: number; salePrice: number | null; saleStartsAt: string | null }) => (f.salePrice != null && f.salePrice > 0 ? f.salePrice : f.price);
  const sizes = a.changes.length === 1 ? "مقاس واحد" : a.changes.length === 2 ? "مقاسين" : `${a.changes.length} مقاسات`;
  return `${money(shown(c.before))} ← ${money(shown(c.after))} · ${sizes}`;
}

export const CAMPAIGN_STATUS_TEXT: Record<CampaignStatus, { label: string; variant: "info" | "success" | "default" | "warning" }> = {
  scheduled: { label: "مجدول", variant: "info" },
  running: { label: "شغّال هلّق", variant: "success" },
  ended: { label: "خلص", variant: "default" },
  canceled: { label: "توقّف", variant: "warning" },
};

const day = (iso: string) => new Date(iso).toLocaleDateString("ar", { day: "numeric", month: "long" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });

/** "10 آذار، 00:00 ← 9 نيسان، 23:59". */
export function campaignWhen(c: Pick<Campaign, "startsAt" | "endsAt">): string {
  return `${day(c.startsAt)}، ${time(c.startsAt)} ← ${day(c.endsAt)}، ${time(c.endsAt)}`;
}

/** "الثيم: Luxury Paper · خصم 20% على حجاب، عبايات". */
export function campaignWhat(c: Pick<Campaign, "themePresetId" | "percentOff" | "categoryIds" | "productIds">, themeName: (id: string) => string, categoryName: (id: string) => string): string {
  const parts: string[] = [];
  if (c.themePresetId) parts.push(`الثيم: ${themeName(c.themePresetId)}`);
  if (c.percentOff) {
    const scope = !c.categoryIds.length && !c.productIds.length ? "كل المنتجات" : [...c.categoryIds.map(categoryName), ...(c.productIds.length ? [`${c.productIds.length} منتج`] : [])].join("، ");
    parts.push(`خصم ${c.percentOff}% على ${scope}`);
  }
  return parts.join(" · ");
}

/** What happened at its start and end. */
export function campaignLogText(c: Pick<Campaign, "log" | "percentOff">): string | null {
  const l = c.log;
  if (!l) return null;
  if (l.missed) return "السيرفر كان مطفي طول الموسم: ما تغيّر شي.";
  const out: string[] = [];
  if (l.start && c.percentOff) out.push(`نزل الخصم على ${num(l.start.sizes)} مقاس${l.start.leftAlone ? ` (${num(l.start.leftAlone)} عليهم خصم تاني، تركناهم)` : ""}`);
  if (l.end) {
    if (c.percentOff) out.push(`رجع السعر لـ ${num(l.end.restored)}${l.end.changedSince ? ` (${num(l.end.changedSince)} تغيّروا بالنص، تركناهم)` : ""}`);
    if (l.start?.theme) out.push(l.end.themeBack ? "رجع الثيم" : "الثيم ضل متل ما غيّرته");
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
  if (!d.name.trim()) out.push("اكتب اسم للموسم.");
  const s = Date.parse(d.startsAt);
  const e = Date.parse(d.endsAt);
  if (!Number.isFinite(s) || !Number.isFinite(e)) out.push("اختار البداية والنهاية.");
  else {
    if (e <= s) out.push("النهاية لازم تكون بعد البداية.");
    if (e <= now) out.push("النهاية مرقت.");
    if (e - s > maxDays * 86400_000) out.push(`الموسم أطول من ${maxDays} يوم.`);
  }
  if (!d.themePresetId && !d.percentOff) out.push("اختار ثيم أو خصم (أو الاثنين).");
  if (d.percentOff != null && (!Number.isInteger(d.percentOff) || d.percentOff < 1 || d.percentOff > 70)) out.push("الخصم من 1 لـ 70%.");
  return out;
}
