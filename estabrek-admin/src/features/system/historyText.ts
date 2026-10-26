// Plain-Arabic texts and small helpers for السجل (one history for everything). Pure (tested).
import type { HistoryArea, HistoryEntry } from "../../api/history.api";
import { describeField } from "./cacheText";
import { KIND_TEXT } from "./scheduleText";
import { ltr } from "./automationText";
import { loc } from "@/lib/lang";

export const AREA_TEXT: Record<HistoryArea, string> = {
  settings: "الإعدادات",
  speed: "السرعة والكاش",
  security: "الأمان",
  pages: "الصفحات",
  products: "المنتجات",
  stock: "المخزون",
  prices: "الأسعار",
  schedule: "الجدول الزمني",
};

const SETTINGS_TEXT: Array<[RegExp, string]> = [
  [/^siteName$/, "اسم المتجر"],
  [/^header\.theme$/, "الثيم"],
  [/^header\./, "الهيدر والشكل"],
  [/^footer/, "الفوتر"],
  [/^announcement/, "شريط الإعلان"],
  [/^maintenance/, "الصيانة"],
  [/^newsletter/, "النشرة"],
  [/^(checkoutMode|ordersEmail|whatsappNumber)$/, "طريقة الطلب"],
  [/^(stripe|paypal)/, "الدفع"],
  [/^(contactEmail|contactPhone)$/, "التواصل"],
  [/^(logoUrl|faviconUrl)$/, "الشعار"],
  [/^(scriptsHead|scriptsBody|customCss)$/, "أكواد مخصصة"],
  [/^(customerAccountsEnabled|stockAlertsEnabled|backupsEnabled)$/, "الميزات"],
];

const PRODUCT_REASON: Record<string, string> = {
  edit: "تعديل",
  price: "تعديل سعر مقاس",
  active: "إظهار أو إخفاء",
  delete: "حذف",
  restore: "استرجاع نسخة",
};

const unique = (xs: string[]) => [...new Set(xs)];

/** Setting names → a short Arabic list ("الثيم، شريط الإعلان"). */
function settingsWhat(keys: string[]) {
  return unique(keys.map((k) => SETTINGS_TEXT.find(([re]) => re.test(k))?.[1] ?? k)).join("، ");
}

function pageReason(r: string) {
  if (r === "Update page") return "تعديل الصفحة";
  if (r === "Delete page") return "حذف الصفحة";
  if (r === "Restore from history" || r === "Restore revision") return "استرجاع نسخة";
  const m = /^(Add|Delete|Move|Update) section (\w+)/.exec(r);
  if (m) return `${{ Add: "إضافة", Delete: "حذف", Move: "ترتيب", Update: "تعديل" }[m[1] as "Add"]} قسم (${m[2]})`;
  return r;
}

function stockReason(r: string | undefined) {
  if (!r) return "";
  if (/^ORDER_ACCEPT/.test(r)) return "طلب انقبل";
  if (/^ORDER_RESTORE/.test(r)) return "طلب رجع للمخزون";
  if (/undo:/.test(r)) return "رجوع تعديل";
  if (/Product full edit/.test(r)) return r.includes("new size") ? "مقاس جديد" : "من محرّر المنتج";
  if (/^Size removed/.test(r)) return "مقاس انشال (عليه طلبات)";
  return r;
}

/** What the change was, in one line. */
export function entrySentence(e: HistoryEntry): string {
  if (e.area === "settings") {
    const what = settingsWhat(e.what);
    const note = typeof e.detail?.note === "string" ? e.detail.note : null;
    return [what || "الإعدادات", note].filter(Boolean).join(" · ");
  }
  if (e.area === "speed") return unique(e.what.map((k) => describeField(k))).slice(0, 4).join("، ") + (e.what.length > 4 ? ` و${e.what.length - 4} كمان` : "") || "السرعة والكاش";
  if (e.area === "security") return e.what.length ? `قواعد الأمان: ${e.what.slice(0, 4).join("، ")}` : "قواعد الأمان";
  if (e.area === "pages") return e.what.length ? pageReason(e.what[0]) : "تعديل";
  if (e.area === "products") return PRODUCT_REASON[e.what[0]] ?? e.what[0] ?? "تعديل";
  if (e.area === "stock") {
    const d = Number(e.detail?.delta ?? 0);
    const r = stockReason(e.what[0]);
    // The sign stays in front of the number inside the Arabic line.
    return `${ltr(d > 0 ? `+${d}` : String(d))} (من ${e.detail?.before} لـ ${e.detail?.after})${r ? ` · ${r}` : ""}`;
  }
  if (e.area === "prices") {
    const [kind] = e.what;
    const sizes = Number(e.detail?.sizes ?? 0);
    const what = kind === "endDiscount" ? "وقف خصم" : kind === "campaign" ? "خصم موسم" : "خصم";
    return `${what} على ${sizes === 1 ? "مقاس واحد" : `${sizes} مقاسات`}`;
  }
  return KIND_TEXT[e.what[0] as keyof typeof KIND_TEXT]?.label ?? e.what[0] ?? "";
}

/** The button's words, or null when it can't go back from here. */
export function restoreLabel(e: Pick<HistoryEntry, "restore" | "done">): string | null {
  if (!e.restore || e.done) return null;
  return e.restore === "before" ? "رجّع لقبلها" : "تراجع عنها";
}

/** Why there's no button. */
export function noRestoreText(e: Pick<HistoryEntry, "area" | "restore" | "done">): string | null {
  if (e.done) return e.area === "stock" ? "انرجعت" : "رجعت";
  if (e.restore) return null;
  if (e.area === "stock") return "من طلب: بترجع من الطلب نفسه";
  if (e.area === "prices") return "من موسم: بترجع لما يخلص الموسم";
  if (e.area === "schedule") return "تفريغ كاش: ما في شي يرجع";
  return null;
}

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** "اليوم" / "مبارح" / "الخميس 15 تشرين الأول", newest day first. */
export function groupByDay(entries: HistoryEntry[], now = Date.now()) {
  const today = dayKey(new Date(now).toISOString());
  const yesterday = dayKey(new Date(now - 86400_000).toISOString());
  const groups: Array<{ key: string; label: string; entries: HistoryEntry[] }> = [];
  for (const e of entries) {
    const k = dayKey(e.at);
    let g = groups.find((x) => x.key === k);
    if (!g) {
      const label = k === today ? "اليوم" : k === yesterday ? "مبارح" : new Date(e.at).toLocaleDateString(loc("ar"), { weekday: "long", day: "numeric", month: "long" });
      g = { key: k, label, entries: [] };
      groups.push(g);
    }
    g.entries.push(e);
  }
  return groups;
}

/** The day range of a choice: today, yesterday, the last 7 or 30 days. */
export function rangeOf(choice: "today" | "yesterday" | "week" | "month", now = Date.now()): { from: string; to: string } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const day = 86400_000;
  if (choice === "today") return { from: start.toISOString(), to: new Date(now).toISOString() };
  if (choice === "yesterday") return { from: new Date(start.getTime() - day).toISOString(), to: new Date(start.getTime() - 1).toISOString() };
  return { from: new Date(start.getTime() - (choice === "week" ? 6 : 29) * day).toISOString(), to: new Date(now).toISOString() };
}
