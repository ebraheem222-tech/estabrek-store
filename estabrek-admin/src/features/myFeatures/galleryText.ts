// ميزاتي → المعرض: the gallery's words and filters, apart from the page so they can be tested.
// Written in the three languages side by side ("عربي|English|עברית").
import type { GalleryItem, GalleryKind } from "../../api/myFeatures.api";
import { countText, type Lang } from "./featuresText";
import { triggerKindText } from "./templatesText";

const part = (words: string, lang: Lang) => {
  const [ar, en, he] = words.split("|");
  return { ar, en: en ?? ar, he: he ?? en ?? ar }[lang];
};

export const KIND_NAME: Record<GalleryKind, string> = {
  function: "function|Function|פונקציה",
  api: "API|API|API",
  feature: "ميزة كاملة|Whole feature|תכונה שלמה",
};
export const KIND_PLURAL: Record<GalleryKind, string> = {
  function: "functions|Functions|פונקציות",
  api: "APIs|APIs|APIs",
  feature: "ميزات كاملة|Whole features|תכונות שלמות",
};

/** An item's words in a language (the others when it has none in it). */
export const words = (w: Partial<Record<Lang, string>> | null | undefined, lang: Lang) => (w ? w[lang] || w.ar || w.en || w.he || "" : "");

/** Does the item hold what was searched for: in its name or note (any language), its key or its addresses. */
export function matches(item: GalleryItem, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const hay = [item.key, ...Object.values(item.name), ...Object.values(item.note ?? {}), ...item.routes].join(" ").toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
}

/** The gallery as filtered: by kind, category and words. */
export function filtered(items: GalleryItem[], f: { kind: GalleryKind | "all"; category: string; search: string }): GalleryItem[] {
  return items.filter((x) => (f.kind === "all" || x.kind === f.kind) && (!f.category || x.category === f.category) && matches(x, f.search));
}

/** What an item holds, in a line: "جدول · function · صفحة". */
export function holdsLine(counts: GalleryItem["counts"], lang: Lang): string {
  return (["table", "function", "page"] as const)
    .map((k) => [k, k === "table" ? counts.tables : k === "function" ? counts.functions : counts.pages] as const)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => countText(k, n, lang))
    .join(" · ");
}

/** What starts it, in a line: "بتشتغل على: طلب جديد، على الوقت". */
export function startsLine(item: GalleryItem, lang: Lang): string {
  if (!item.triggers.length) return part("بتشغّلها إنت من صفحتها|You run it from its page|מריצים אותה מהעמוד שלה", lang);
  const kinds = item.triggers.map((k) => (k === "event" ? part("طلب أو حدث بالمتجر|an order or a store event|הזמנה או אירוע בחנות", lang) : triggerKindText(k, lang)));
  return `${part("بتشتغل من|Started by|מופעלת על ידי", lang)}: ${[...new Set(kinds)].join(part("، |, |, ", lang))}`;
}

/** What it needs from the store after installing, in a line (empty when nothing). */
export function needsLine(needs: GalleryItem["needs"], lang: Lang): string {
  const out: string[] = [];
  if (needs.connections) out.push(part("اتصال جاهز (تلغرام، Slack، Sheets…)|a ready connection (Telegram, Slack, Sheets…)|חיבור מוכן (טלגרם, Slack, Sheets…)", lang));
  for (const s of needs.secrets) out.push(`${part("سر|secret|סוד", lang)} ${s}`);
  for (const h of needs.sites) out.push(`${part("موقع|site|אתר", lang)} ${h}`);
  return out.length ? `${part("بدها|Needs|צריכה", lang)}: ${out.join(part("، |, |, ", lang))}` : "";
}

/** A piece kept whole inside a line of another direction ("127 functions" stays in its order in Arabic). */
const isolated = (w: string) => `${String.fromCodePoint(0x2068)}${w}${String.fromCodePoint(0x2069)}`;
/** How many of each kind, in a line (Arabic counts past ten in the singular: «91 ميزة كاملة»). */
export function totalsLine(items: GalleryItem[], lang: Lang): string {
  const n = (k: GalleryKind) => items.filter((x) => x.kind === k).length;
  const name = (k: GalleryKind) => (lang === "ar" && k === "feature" && n(k) > 10 ? part(KIND_NAME[k], lang) : part(KIND_PLURAL[k], lang));
  return `${items.length} ${part("جاهز|ready|מוכנים", lang)}: ${(["function", "api", "feature"] as const).map((k) => isolated(`${n(k)} ${name(k)}`)).join(" · ")}`;
}
