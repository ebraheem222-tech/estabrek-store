// ميزاتي: the pages' words and small sums, apart from the pages so they can be tested. Written
// in the three languages side by side ("عربي|English|עברית").
import type { Feature, FeatureKind, FeatureLite, TableAccess, Who } from "../../api/myFeatures.api";

export type Lang = "ar" | "en" | "he";
const part = (words: string, lang: Lang) => {
  const [ar, en, he] = words.split("|");
  return { ar, en: en ?? ar, he: he ?? en ?? ar }[lang];
};

/** How many of a thing, in Arabic's own counts. */
const arabic = (n: number, one: string, two: string, few: string) => (n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${one}`);
export function countText(kind: FeatureKind, n: number, lang: Lang): string {
  if (lang === "ar") return kind === "table" ? arabic(n, "جدول", "جدولين", "جداول") : kind === "function" ? (n === 1 ? "function" : `${n} functions`) : arabic(n, "صفحة", "صفحتين", "صفحات");
  const en = { table: ["table", "tables"], function: ["function", "functions"], page: ["page", "pages"] }[kind];
  const he = { table: ["טבלה אחת", "טבלאות"], function: ["פונקציה אחת", "פונקציות"], page: ["עמוד אחד", "עמודים"] }[kind];
  return lang === "en" ? `${n} ${en[n === 1 ? 0 : 1]}` : n === 1 ? he[0] : `${n} ${he[1]}`;
}

/** What a feature holds, in a line; an empty one says so. */
export function countsLine(counts: FeatureLite["counts"], lang: Lang): string {
  const parts = (["table", "function", "page"] as const).filter((k) => counts[k] > 0).map((k) => countText(k, counts[k], lang));
  return parts.length ? parts.join(" · ") : part("فاضية لسا|Nothing in it yet|עדיין ריקה", lang);
}

/** The three things a feature is made of, in the order it is built, and which it already has. */
export const STEPS = [
  { kind: "table", title: "الجداول|Tables|טבלאות", what: "وين بتنحفظ بياناتها|where its data is kept|איפה הנתונים שלה נשמרים" },
  { kind: "function", title: "المنطق|Logic|לוגיקה", what: "شو بيصير، بخطوات بدون كود|what happens, in steps with no code|מה קורה, בשלבים בלי קוד" },
  { kind: "page", title: "الصفحات|Pages|עמודים", what: "وين بيشوفها الزبون بالمتجر|where the shopper sees it in the shop|איפה הלקוח רואה אותה בחנות" },
] as const;
export function stepsDone(f: Pick<Feature, "tables" | "functions" | "pages">): Record<FeatureKind, boolean> {
  return { table: f.tables.length > 0, function: f.functions.length > 0, page: f.pages.length > 0 };
}

const ACT: Record<keyof TableAccess, string> = { read: "قراءة|read|קריאה", create: "إضافة|add|הוספה", update: "تعديل|change|שינוי", delete: "حذف|delete|מחיקה" };
const WHO: Record<Exclude<Who, "off">, string> = { key: "بمفتاح|with a key|עם מפתח", customer: "الزبون (سطوره)|the shopper (their own rows)|הלקוח (השורות שלו)", public: "أي حدا|anyone|כל אחד" };
/** Who reaches a table through its API, in a line. */
export function apiLine(access: TableAccess, lang: Lang): string {
  const open = (Object.keys(ACT) as Array<keyof TableAccess>).filter((a) => access[a] !== "off");
  if (!open.length) return part("الـ API مسكّر|API closed|ה-API סגור", lang);
  return `API: ${open.map((a) => `${part(ACT[a], lang)} ${part(WHO[access[a] as Exclude<Who, "off">], lang)}`).join(part("، |, |, ", lang))}`;
}

export function rowsText(n: number, lang: Lang): string {
  if (lang === "ar") return n === 0 ? "ما فيه سطور" : arabic(n, "سطر", "سطرين", "سطور");
  return lang === "en" ? (n === 1 ? "1 row" : `${n.toLocaleString("en")} rows`) : n === 1 ? "שורה אחת" : `${n.toLocaleString("en")} שורות`;
}
export function fieldsText(n: number, lang: Lang): string {
  if (lang === "ar") return arabic(n, "حقل", "حقلين", "حقول");
  return lang === "en" ? (n === 1 ? "1 field" : `${n} fields`) : n === 1 ? "שדה אחד" : `${n} שדות`;
}
export function triggersText(n: number, lang: Lang): string {
  if (!n) return part("ما في شي بيشغّلها لحالها|nothing starts it by itself|שום דבר לא מפעיל אותה מעצמו", lang);
  if (lang === "ar") return arabic(n, "مشغّل", "مشغّلين", "مشغّلات");
  return lang === "en" ? (n === 1 ? "1 trigger" : `${n} triggers`) : n === 1 ? "מפעיל אחד" : `${n} מפעילים`;
}

export const PAGE_STATUS: Record<"DRAFT" | "PUBLISHED" | "ARCHIVED", string> = { DRAFT: "مسودة|Draft|טיוטה", PUBLISHED: "منشورة|Published|פורסם", ARCHIVED: "مؤرشفة|Archived|בארכיון" };

/** A table's address from its name, where the name has Latin letters ("Friend requests" → "friend-requests"); else nothing: the owner types one. */
export function slugFrom(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
export const SLUG = /^[a-z0-9][a-z0-9-]{0,40}$/;

/** What a switched-off feature means, said once. */
export const OFF_TEXT =
  "الميزة موقّفة: الـ functions تبعتها ما بتشتغل لحالها (ولا من زر بالمتجر)، وAPI جداولها بيجاوب كأنه مسكّر، وصفحاتها مخبّاة عن المتجر (الزائر بيشوف «الصفحة مش موجودة»، وإنت بتضل تفتحها بالمحرر). ولا شي بينحذف: شغّلها وبيرجع كل شي متل ما كان.|The feature is switched off: its functions aren't started by anything (a shop button included), its tables' API answers as closed, and its pages are hidden from the shop (a visitor gets “page not found”; you still open them in the editor). Nothing is deleted: switch it on and everything is back as it was.|התכונה כבויה: הפונקציות שלה לא מופעלות (גם לא מכפתור בחנות), ה-API של הטבלאות שלה עונה כסגור, והעמודים שלה מוסתרים מהחנות (מבקר מקבל «העמוד לא נמצא»; בעורך הם עדיין נפתחים). שום דבר לא נמחק: מפעילים והכול חוזר כמו שהיה.";
