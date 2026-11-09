import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { tr } from "../lib/words";
import { NumberField } from "./StudioTreePanels";
import { say } from "./say";
import { useEffect, useState } from "react";
import type { Lang } from "../lib/lang";
import { defaultPartWords, SHOP_WORD_FIELDS, type ShopWordField } from "../../../shared/partWords";

/** What each of the shop element's own words is (in the editor's language). */
const SHOP_WORD_NAMES: Record<ShopWordField, string> = {
  searchLabel: "البحث|Search|חיפוש", categoriesLabel: "عنوان التصنيفات|Categories title|כותרת הקטגוריות", allLabel: "كل التصنيفات|All categories|כל הקטגוריות",
  inStockLabel: "المتوفر فقط|In stock only|רק במלאי", sortLabel: "الترتيب|Sort by|מיון", priceLabel: "نطاق السعر|Price range|טווח מחירים",
  coloursLabel: "الألوان|Colours|צבעים", sizesLabel: "المقاسات|Sizes|מידות", filtersLabel: "الفلاتر|Filters|סינון",
  clearLabel: "مسح الكل|Clear all|ניקוי הכול", countLabel: "كلمة العدد (12 …)|The count word (12 …)|מילת הספירה (12 …)", moreLabel: "تحميل المزيد|Load more|טעינת עוד",
};

/** One of the shop's words in the language being edited: its own, or empty for the built-in one (shown faded). */
function ShopWord({ field, value, lang, busy, onSave }: { field: ShopWordField; value: unknown; lang: Lang; busy: boolean; onSave: (next: Record<string, string> | undefined) => void }) {
  const words = (value && typeof value === "object" ? value : {}) as Record<string, string>;
  const [text, setText] = useState(words[lang] ?? "");
  useEffect(() => setText(words[lang] ?? ""), [lang, words[lang]]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => {
    const v = text.trim().slice(0, 40);
    if (v === (words[lang] ?? "")) return;
    const next = { ...words };
    if (v) next[lang] = v;
    else delete next[lang];
    onSave(Object.keys(next).length ? next : undefined);
  };
  return <label className="block text-[11px] text-white/60">{say(SHOP_WORD_NAMES[field])}
    <input type="text" value={text} maxLength={40} disabled={busy} placeholder={defaultPartWords("shop", field)?.[lang] ?? ""} onChange={(e) => setText(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className="mt-0.5 w-full rounded-lg border border-white/15 bg-surface-925 px-2 py-1 text-xs text-white placeholder:text-white/30" data-shop-word={field} />
  </label>;
}

export const COMMERCE_TYPES = new Set(["shop", "cartItems", "cartSummary", "cartCheckout"]);
export function CommercePanel({ node, busy, onOps, lang = "ar" }: { node: PageTreeNode; busy: boolean; onOps: (label: string, ops: PageDraftOp[]) => void; lang?: Lang }) {
  const set = (patch: Record<string, unknown>) => onOps(tr("عرض التجارة", "Commerce display"), [{ op: "setProps", nodeId: node.id, props: { ...node.props, ...patch } }]);
  return <fieldset disabled={busy} className="space-y-3 rounded-xl border border-white/10 p-3" data-testid="studio-commerce">
    <p className="text-xs text-white/65">{node.type === "shop" ? tr("عرض منتجات فعلي مع الفلترة والترتيب. المعاينة داخل المحرّر تستخدم منتجات تجريبية.", "Live catalog with filters and sorting. The editor uses sample products.") : tr("هذا الجزء بشارك باقي أجزاء السلة بنفس الكمية والسعر والخصم. المعاينة تجريبية وإرسال الطلب متوقف فيها.", "This part shares quantity, prices and discounts with the other cart parts. Preview data is synthetic and purchases are disabled.")}</p>
    {node.type === "shop" ? <>
      <NumberField label={tr("أعمدة المنتجات", "Product columns")} value={Number(node.props.columns) || 3} min={2} max={6} onSave={columns => set({ columns: columns ?? 3 })} testId="commerce-columns" />
      <NumberField label={tr("أعمدة الهاتف", "Mobile columns")} value={Number(node.props.mobileColumns) || 2} min={1} max={2} onSave={mobileColumns => set({ mobileColumns: mobileColumns ?? 2 })} testId="commerce-mobile-columns" />
      <label className="flex justify-between text-xs">{tr("إظهار الفلاتر", "Show filters")}<input type="checkbox" checked={node.props.showFilters !== false} disabled={busy} onChange={event => set({ showFilters: event.target.checked })} data-testid="commerce-filters" /></label>
      <label className="flex justify-between text-xs">{tr("إظهار البحث", "Show search")}<input type="checkbox" checked={node.props.showSearch !== false} disabled={busy} onChange={event => set({ showSearch: event.target.checked })} data-testid="commerce-search" /></label>
      <NumberField label={say("المسافة بين الكروت|Space between the cards|רווח בין הכרטיסים")} suffix="px" value={typeof node.props.gap === "number" ? node.props.gap : 20} min={0} max={64} onSave={gap => set({ gap: gap ?? undefined })} testId="commerce-gap" />
      <label className="block text-xs">{say("مكان الفلاتر|Where the filters sit|מיקום המסננים")}<select className="mt-1 w-full rounded-lg border border-white/15 bg-surface-925 px-2 py-1.5 text-xs" value={node.props.filtersSide === "end" ? "end" : "start"} disabled={busy || node.props.showFilters === false} onChange={event => set({ filtersSide: event.target.value === "end" ? "end" : undefined })} data-testid="commerce-filters-side"><option value="start">{say("بالبداية|At the start|בהתחלה")}</option><option value="end">{say("بالآخر|At the end|בסוף")}</option></select></label>
      <label className="flex justify-between text-xs">{say("الفلاتر بتضل ظاهرة مع النزول|Filters stay in view while scrolling|המסננים נשארים בתצוגה בגלילה")}<input type="checkbox" checked={node.props.stickyFilters === true} disabled={busy || node.props.showFilters === false} onChange={event => set({ stickyFilters: event.target.checked || undefined })} data-testid="commerce-sticky-filters" /></label>
      <details className="rounded-lg border border-white/10 p-2" data-testid="commerce-words">
        <summary className="cursor-pointer text-xs text-white/75">{say("كلمات المتجر|The shop's words|המילים של החנות")}</summary>
        <p className="mt-1 text-[10px] leading-4 text-white/40">{say("فاضي = كلمة المتجر العادية. بتقدر كمان تعمل دبل كليك على الكلمة بالمعاينة وتكتبها بمكانها.|Empty = the shop's usual word. You can also double-click a word in the preview and write it in place.|ריק = המילה הרגילה של החנות. אפשר גם ללחוץ פעמיים על מילה בתצוגה ולכתוב במקום.")}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {SHOP_WORD_FIELDS.map((f) => <ShopWord key={f} field={f} value={node.props[f]} lang={lang} busy={busy} onSave={(next) => set({ [f]: next })} />)}
        </div>
      </details>
      <p className="text-[11px] leading-5 text-white/45">{say("شكل الكروت وحركتها (تبديل الصورة، الدخول، الزر…) من «تصميم بطاقة المنتج» تحت.|The cards' look and motion (second picture, entrance, button…) are in “Product card design” below.|מראה הכרטיסים והתנועה שלהם נמצאים ב״עיצוב כרטיס מוצר״ למטה.")}</p>
    </> : <p className="text-xs text-amber-100/70">{tr("صفحة السلة بتحتاج: منتجات السلة، ملخص الطلب وإتمام الطلب. خليهم ظاهرين على كل أحجام الشاشات قبل النشر.", "The cart page needs cart items, order summary and checkout, visible at every screen size before publishing.")}</p>}
  </fieldset>;
}
