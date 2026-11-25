/**
 * The gift card's and the configurator's settings (plan 3.6b): which product they sell (found by its name, kept by
 * its address), and for the configurator the owner's extra parts: a name and its options (a colour, or a picture
 * laid over the product's), each part a choice the shopper makes and that goes with the line to the bag.
 */
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import * as CatalogAPI from "../api/catalog.api";
import type { Lang } from "../lib/lang";
import { Choice } from "./StudioTreePanels";
import { MediaLibraryModal } from "../components/media/MediaLibraryModal";
import { say } from "./say";

type Item = Record<string, unknown>;
type Words = Partial<Record<Lang, string>>;
type Part = { name: Words; options: Array<{ name: Words; color?: string; src?: string }> };
const btn = "rounded-lg bg-white/6 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-40";
const input = "w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white placeholder:text-white/30";
const HEX = /^#[0-9a-f]{6}$/i;
const wordIn = (w: unknown, lang: Lang) => (w && typeof w === "object" ? String((w as Words)[lang] ?? "") : "");
const withWord = (w: unknown, lang: Lang, v: string): Words => {
  const out = { ...(w && typeof w === "object" ? (w as Words) : {}) };
  if (v.trim()) out[lang] = v.slice(0, 40);
  else delete out[lang];
  return out;
};

/** The product it sells, found by its name and kept by its address (the shop fetches it by that). */
function ProductSlugPick({ value, busy, onPick, hint }: { value: string; busy: boolean; onPick: (slug: string | undefined) => void; hint: string }) {
  const [text, setText] = useState("");
  const products = useQuery({ queryKey: ["products-pick"], queryFn: () => CatalogAPI.listProducts("all"), staleTime: 60_000 });
  const chosen = (products.data ?? []).find((x) => x.slug === value);
  const list = useMemo(() => {
    const q = text.trim().toLowerCase();
    return (products.data ?? []).filter((x) => !q || x.title.toLowerCase().includes(q)).slice(0, 20);
  }, [products.data, text]);
  return (
    <div className="space-y-1" data-testid="build-product">
      <div className="text-[11px] text-white/55">{say("المنتج|The product|המוצר")}</div>
      {chosen ? <div className="flex items-center justify-between gap-2 text-xs text-white/85"><span className="truncate">{chosen.title}</span><button type="button" className={btn} disabled={busy} onClick={() => onPick(undefined)}>{say("شيليه|Remove|הסרה")}</button></div>
        : <p className="text-[11px] text-amber-200/80">{value ? say("هالمنتج مش موجود هلأ. اختاري غيره.|This product isn't there now. Pick another.|המוצר הזה לא קיים עכשיו. בחרו אחר.") : hint}</p>}
      <input className={input} value={text} onChange={(e) => setText(e.target.value)} placeholder={say("دوّري على منتج|Find a product|חיפוש מוצר")} data-testid="build-product-find" />
      <ul className="max-h-32 space-y-0.5 overflow-y-auto">
        {list.map((x) => (
          <li key={x.id}>
            <button type="button" disabled={busy} aria-pressed={x.slug === value} onClick={() => onPick(x.slug)} data-slug={x.slug}
              className={`w-full truncate rounded-lg px-2 py-1 text-start text-[11px] ${x.slug === value ? "bg-accent-500/25 text-white" : "text-white/75 hover:bg-white/5"} disabled:opacity-40`}>
              {x.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The configurator's parts: each a name and up to 8 options (a colour or a picture), up to 4 parts. */
function PartsEditor({ parts, lang, busy, onSave }: { parts: Part[]; lang: Lang; busy: boolean; onSave: (parts: Part[]) => void }) {
  const [picking, setPicking] = useState<{ part: number; option: number } | null>(null);
  const setPart = (i: number, next: Part) => onSave(parts.map((p, j) => (j === i ? next : p)));
  return (
    <div className="space-y-2" data-testid="build-parts">
      <div className="text-[11px] text-white/55">{say("قطع بتختارها الزبونة (اختياري)|Parts she chooses (optional)|חלקים שהיא בוחרת (רשות)")}</div>
      {parts.map((part, i) => (
        <div key={i} className="space-y-1.5 rounded-lg border border-white/8 p-2">
          <div className="flex gap-1">
            <input key={`${i}:${wordIn(part.name, lang)}`} className={input} defaultValue={wordIn(part.name, lang)} placeholder={say("اسم القطعة (مثلاً: الشريطة)|The part's name (e.g. The ribbon)|שם החלק (למשל: הסרט)")} disabled={busy}
              onBlur={(e) => { if (e.target.value !== wordIn(part.name, lang)) setPart(i, { ...part, name: withWord(part.name, lang, e.target.value) }); }} data-testid="build-part-name" />
            <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => onSave(parts.filter((_, j) => j !== i))} aria-label={say("شيلي القطعة|Remove the part|הסרת החלק")}>×</button>
          </div>
          {part.options.map((o, j) => (
            <div key={j} className="flex items-center gap-1">
              <input key={`${i}.${j}:${wordIn(o.name, lang)}`} className={input} defaultValue={wordIn(o.name, lang)} placeholder={say("اسم الخيار|The option's name|שם האפשרות")} disabled={busy}
                onBlur={(e) => { if (e.target.value !== wordIn(o.name, lang)) setPart(i, { ...part, options: part.options.map((x, k) => (k === j ? { ...x, name: withWord(x.name, lang, e.target.value) } : x)) }); }} data-testid="build-option-name" />
              <input type="color" className="h-6 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent" value={o.color && HEX.test(o.color) ? o.color : "#cccccc"} disabled={busy} aria-label={say("لونه|Its colour|הצבע שלו")}
                onChange={(e) => setPart(i, { ...part, options: part.options.map((x, k) => (k === j ? { ...x, color: e.target.value, src: undefined } : x)) })} />
              <button type="button" className={btn} disabled={busy} onClick={() => setPicking({ part: i, option: j })} title={say("صورة بتنحط فوق صورة المنتج (PNG شفافة)|A picture laid over the product's (a see-through PNG)|תמונה מעל תמונת המוצר (PNG שקוף)")}>
                {o.src ? <img src={o.src} alt="" className="h-4 w-4 rounded object-cover" /> : "🖼"}
              </button>
              <button type="button" className={`${btn} text-red-300`} disabled={busy || part.options.length <= 1} onClick={() => setPart(i, { ...part, options: part.options.filter((_, k) => k !== j) })} aria-label={say("شيلي الخيار|Remove the option|הסרת האפשרות")}>×</button>
            </div>
          ))}
          {part.options.length < 8 ? <button type="button" className={btn} disabled={busy} onClick={() => setPart(i, { ...part, options: [...part.options, { name: {}, color: "#cccccc" }] })} data-testid="build-option-add">{say("+ خيار|+ An option|+ אפשרות")}</button> : null}
        </div>
      ))}
      {parts.length < 4 ? (
        <button type="button" className={btn} disabled={busy} data-testid="build-part-add"
          onClick={() => onSave([...parts, { name: { [lang]: say("قطعة|Part|חלק") }, options: [{ name: { [lang]: say("أول خيار|First option|אפשרות ראשונה") }, color: "#cccccc" }] }])}>
          {say("+ قطعة|+ A part|+ חלק")}
        </button>
      ) : null}
      {picking ? (
        <MediaLibraryModal
          open onClose={() => setPicking(null)} title={say("صورة الخيار|The option's picture|תמונת האפשרות")}
          onSelect={(url: string) => { const { part, option } = picking; setPicking(null); setPart(part, { ...parts[part], options: parts[part].options.map((x, k) => (k === option ? { ...x, src: url, color: undefined } : x)) }); }}
        />
      ) : null}
    </div>
  );
}

const WEEK: Array<[number, () => string]> = [
  [0, () => say("أحد|Sun|א׳")], [1, () => say("اثنين|Mon|ב׳")], [2, () => say("ثلاثاء|Tue|ג׳")], [3, () => say("أربعاء|Wed|ד׳")],
  [4, () => say("خميس|Thu|ה׳")], [5, () => say("جمعة|Fri|ו׳")], [6, () => say("سبت|Sat|ש׳")],
];
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The booking calendar's days, hours, every so many minutes, days ahead and days off. */
function BookingSettings({ p, busy, set }: { p: Item; busy: boolean; set: (label: string, patch: Item) => void }) {
  const days = (Array.isArray(p.days) ? p.days : [0, 1, 2, 3, 4]) as number[];
  const closed = (Array.isArray(p.closed) ? p.closed : []) as string[];
  const [off, setOff] = useState("");
  const from = typeof p.from === "string" ? p.from : "10:00";
  const to = typeof p.to === "string" ? p.to : "18:00";
  return (
    <div className="space-y-2" data-testid="booking-settings">
      <div className="text-[11px] text-white/55">{say("أيام الشغل|Open days|ימי עבודה")}</div>
      <div className="flex flex-wrap gap-1" role="group">
        {WEEK.map(([d, name]) => {
          const on = days.includes(d);
          return (
            <button key={d} type="button" aria-pressed={on} disabled={busy || (on && days.length === 1)} data-day={d}
              className={`rounded-lg px-2 py-1 text-xs ${on ? "bg-accent-500/30 text-white" : "bg-white/6 text-white/70 hover:bg-white/10"} disabled:opacity-40`}
              onClick={() => set(say("أيام الشغل|Open days|ימי עבודה"), { days: WEEK.map(([x]) => x).filter((x) => (x === d ? !on : days.includes(x))) })}>
              {name()}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-xs text-white/70">
        <label className="flex items-center gap-1">{say("من|From|מ־")}
          <input type="time" className={input} value={from} disabled={busy} data-testid="booking-from" onChange={(e) => { const v = e.target.value; if (HM.test(v) && v < to) set(say("الساعات|Hours|שעות"), { from: v }); }} />
        </label>
        <label className="flex items-center gap-1">{say("لـ|To|עד")}
          <input type="time" className={input} value={to} disabled={busy} data-testid="booking-to" onChange={(e) => { const v = e.target.value; if (HM.test(v) && v > from) set(say("الساعات|Hours|שעות"), { to: v }); }} />
        </label>
      </div>
      <Choice label={say("كل موعد|Each time takes|כל תור")} value={String(p.every ?? 60)} busy={busy} testId="booking-every"
        options={[["15", say("ربع ساعة|15 minutes|רבע שעה")], ["30", say("نص ساعة|30 minutes|חצי שעה")], ["45", say("45 دقيقة|45 minutes|45 דקות")], ["60", say("ساعة|An hour|שעה")], ["90", say("ساعة ونص|90 minutes|שעה וחצי")], ["120", say("ساعتين|2 hours|שעתיים")]]}
        onPick={(v) => set(say("المدة|Length|משך"), { every: Number(v) })} />
      <Choice label={say("قديش لقدّام|How far ahead|כמה קדימה")} value={String(p.ahead ?? 30)} busy={busy} testId="booking-ahead"
        options={[["7", say("أسبوع|A week|שבוע")], ["14", say("أسبوعين|2 weeks|שבועיים")], ["30", say("شهر|A month|חודש")], ["60", say("شهرين|2 months|חודשיים")], ["90", say("3 شهور|3 months|3 חודשים")]]}
        onPick={(v) => set(say("قديش لقدّام|How far ahead|כמה קדימה"), { ahead: Number(v) })} />
      <div className="text-[11px] text-white/55">{say("أيام عطلة|Days off|ימי חופש")}</div>
      <div className="flex flex-wrap gap-1">
        {closed.map((d) => (
          <span key={d} className="flex items-center gap-1 rounded-lg bg-white/6 px-2 py-0.5 text-xs" dir="ltr">
            {d}<button type="button" className="text-red-300" disabled={busy} aria-label={say("شيلي هاليوم|Remove this day|הסרת היום")} onClick={() => set(say("أيام عطلة|Days off|ימי חופש"), { closed: closed.filter((x) => x !== d).length ? closed.filter((x) => x !== d) : undefined })}>×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input type="date" className={input} value={off} disabled={busy} onChange={(e) => setOff(e.target.value)} data-testid="booking-off" />
        <button type="button" className={btn} disabled={busy || !DAY.test(off) || closed.includes(off) || closed.length >= 60} data-testid="booking-off-add"
          onClick={() => { set(say("أيام عطلة|Days off|ימי חופש"), { closed: [...closed, off].sort() }); setOff(""); }}>{say("زيدي|Add|הוספה")}</button>
      </div>
    </div>
  );
}

export function ShopBuildPanel({ kind, p, lang, busy, set, words }: {
  kind: "giftCard" | "configurator" | "bookingCalendar"; p: Item; lang: Lang; busy: boolean; set: (label: string, patch: Item) => void;
  words: (key: string, label: string, multiline?: boolean) => ReactNode;
}) {
  const product = typeof p.product === "string" ? p.product : "";
  return (
    <>
      {words("title", say("العنوان (اختياري)|Title (optional)|כותרת (רשות)"))}
      {words("text", say("الكلام (اختياري)|Words (optional)|מילים (רשות)"), true)}
      <ProductSlugPick
        value={product} busy={busy} onPick={(slug) => set(say("المنتج|The product|המוצר"), { product: slug })}
        hint={kind === "giftCard"
          ? say("اختاري منتج «بطاقة هدية»: مقاساته هي القيم (50، 100، 200…).|Pick a “gift card” product: its sizes are the amounts (50, 100, 200…).|בחרו מוצר „כרטיס מתנה”: המידות שלו הן הסכומים (50, 100, 200…).")
          : kind === "bookingCalendar" ? say("اختاري منتج الخدمة (جلسة، قياس…): سعره سعر الموعد، ومقاساته (إذا في) أنواع الموعد.|Pick the service product (a session, a fitting…): its price is the booking's, its sizes (if any) the kinds.|בחרו את מוצר השירות (טיפול, מדידה…): המחיר שלו הוא של התור, והמידות (אם יש) סוגי התור.")
          : say("اختاري المنتج اللي بتصمّمه الزبونة: ألوانه ومقاساته بتطلع لحالها.|Pick the product she designs: its colours and sizes show by themselves.|בחרו את המוצר שהיא מעצבת: הצבעים והמידות שלו מופיעים לבד.")}
      />
      {kind === "giftCard" ? (
        <Choice label={say("شكل البطاقة|The card's look|מראה הכרטיס")} value={String(p.look ?? "rose")} busy={busy} testId="build-look"
          options={[["rose", say("وردي|Rose|ורוד")], ["night", say("ليلي|Night|לילה")], ["gold", say("دهبي|Gold|זהב")], ["brand", say("لون المتجر|The store's colour|צבע החנות")]]}
          onPick={(v) => set(say("الشكل|The look|המראה"), { look: v })} />
      ) : kind === "bookingCalendar" ? (
        <BookingSettings p={p} busy={busy} set={set} />
      ) : (
        <PartsEditor parts={(Array.isArray(p.parts) ? p.parts : []) as Part[]} lang={lang} busy={busy} onSave={(parts) => set(say("القطع|The parts|החלקים"), { parts: parts.length ? parts : undefined })} />
      )}
      {words("button", say("كلام الزر (فاضي = أضيفي للحقيبة)|Button words (empty = Add to bag)|מילות הכפתור (ריק = הוספה לסל)"))}
      <p className="text-[10px] leading-4 text-white/35">{kind === "bookingCalendar"
        ? say("المواعيد المحجوزة بطلبات مفتوحة بتنقفل لحالها، والطلب اللي بيوصل على موعد محجوز بينرفض. موعد واحد لكل وقت.|Times held by open orders close by themselves, and an order for a booked time is refused. One booking per time.|מועדים שתפוסים בהזמנות פתוחות נסגרים לבד, והזמנה למועד תפוס נדחית. תור אחד לכל שעה.")
        : kind === "giftCard"
        ? say("الزبونة بتكتب لمين ومن مين ورسالة، وبتشوف البطاقة وهي بتكتب. كلامها بيوصلك بالطلب.|She writes who it's for, from whom and a message, and sees the card as she writes. Her words reach you with the order.|היא כותבת למי, ממי והודעה, ורואה את הכרטיס תוך כדי. המילים שלה מגיעות אליכם עם ההזמנה.")
        : say("اختيارات القطع بتوصلك بالطلب، والسعر سعر المنتج.|Her choices of parts reach you with the order; the price is the product's.|הבחירות שלה בחלקים מגיעות אליכם עם ההזמנה; המחיר הוא של המוצר.")}</p>
    </>
  );
}
