// The words of «المشروع كملف» (ProjectPage.tsx): each kind of thing, what bringing a file in does to it, and the
// server's reasons said in the admin's language. Every string is "ar|en|he" for say().
import { say } from "../../studio/say";
import { adminLang } from "../../lib/lang";
import type { DiffAction, DiffKind, Impact, ProjectSize, SnapshotReason } from "../../api/project.api";

export const KINDS: DiffKind[] = ["table", "function", "page", "role", "group", "feature"];

export const KIND_GROUP: Record<DiffKind, string> = {
  table: "الجداول|Tables|טבלאות",
  function: "الـ Functions|Functions|פונקציות",
  page: "الصفحات|Pages|עמודים",
  role: "أدوار الزباين|Shoppers' roles|תפקידי לקוחות",
  group: "المجموعات|Groups|קבוצות",
  feature: "الميزات|Features|פיצ'רים",
};
export const SIZE_NAME: Record<keyof ProjectSize, string> = {
  tables: "جداول|tables|טבלאות",
  functions: "functions|functions|פונקציות",
  pages: "صفحات|pages|עמודים",
  roles: "أدوار|roles|תפקידים",
  groups: "مجموعات|groups|קבוצות",
  features: "ميزات|features|פיצ'רים",
};

export const ACTION_NAME: Record<DiffAction, string> = {
  add: "جديد|New|חדש",
  change: "بيتغيّر|Changes|משתנה",
  same: "متل ما هو|The same|ללא שינוי",
  only: "بس هون|Only here|רק כאן",
  clash: "عنوانه محجوز|Its address is taken|הכתובת תפוסה",
};
export const ACTION_TONE: Record<DiffAction, string> = {
  add: "bg-emerald-400/15 text-emerald-200",
  change: "bg-sky-400/15 text-sky-200",
  same: "bg-white/10 text-white/70",
  only: "bg-amber-400/15 text-amber-200",
  clash: "bg-red-400/15 text-red-200",
};

/** What changes in a thing (backend projectFile.ts diffProject `parts`). */
export const PART_NAME: Record<string, string> = {
  name: "الاسم|name|שם",
  slug: "العنوان|address|כתובת",
  fields: "الحقول|fields|שדות",
  api: "الـ API|API|API",
  itemPage: "صفحة السطر|row page|עמוד השורה",
  note: "الملاحظة|note|הערה",
  enabled: "التشغيل|on/off|הפעלה",
  draft: "المسودة|draft|טיוטה",
  live: "المنشور|published steps|השלבים שפורסמו",
  tests: "الاختبارات|tests|בדיקות",
  triggers: "شو بيشغّلها|what starts it|מה מפעיל אותה",
  status: "النشر|published or not|פרסום",
  design: "التصميم|design|עיצוב",
  seo: "SEO|SEO|SEO",
  kind: "النوع|kind|סוג",
  items: "أشياؤها|its things|הדברים שלה",
  template: "القالب|template|תבנית",
};
/** A piece kept in its own direction, so "2 functions" beside Arabic words reads as written. */
export const iso = (s: string) => `${String.fromCodePoint(0x2068)}${s}${String.fromCodePoint(0x2069)}`;
/** What a project holds, in a line. */
export const sizeText = (s: ProjectSize) => (Object.keys(SIZE_NAME) as Array<keyof ProjectSize>).map((k) => iso(`${s[k]} ${say(SIZE_NAME[k])}`)).join(" · ");
/** A list joined in the admin's language (Arabic has its own comma). */
export const listText = (words: string[]) => words.join(adminLang() === "ar" ? "، " : ", ");
export const partsText = (parts: string[] = []) => listText(parts.map((p) => say(PART_NAME[p] ?? `${p}|${p}|${p}`)));

export const REASON_NAME: Record<SnapshotReason, string> = {
  saved: "حفظتها إنت|Saved by you|נשמר על ידך",
  before: "قبل ما إجا ملف|Before a file came in|לפני שנכנס קובץ",
  back: "قبل الرجوع لنسخة|Before going back|לפני חזרה לגרסה",
};

/** What a field change does to the table's rows, in a line. */
export function impactText(i: Impact): string {
  const n = (v: number) => String(v);
  if (i.change === "removed") return say(`الحقل «${i.field}» بيروح: ${n(i.hidden)} قيمة بتنخبّى بالسطور (ما بتنمحى)|The field “${i.field}” goes: ${n(i.hidden)} values are hidden in the rows (not deleted)|השדה «${i.field}» יוסר: ${n(i.hidden)} ערכים יוסתרו בשורות (לא יימחקו)`);
  if (i.change === "retyped") return say(`الحقل «${i.field}» بيتغيّر نوعه: ${n(i.converted)} بتتحوّل، ${n(i.lost)} ما بتزبط وبتنحط على جنب|The field “${i.field}” changes kind: ${n(i.converted)} convert, ${n(i.lost)} don't fit and are set aside|סוג השדה «${i.field}» משתנה: ${n(i.converted)} יומרו, ${n(i.lost)} לא מתאימים ויישמרו בצד`);
  if (i.change === "added") return say(`الحقل «${i.field}» جديد، و${n(i.lost)} قيمة قديمة باسمه بتنحط على جنب|The field “${i.field}” is new; ${n(i.lost)} old values under its name are set aside|השדה «${i.field}» חדש; ${n(i.lost)} ערכים ישנים בשמו יישמרו בצד`);
  return say(`قواعد الحقل «${i.field}» بتتغيّر: ${n(i.failing + i.missing + i.doubles)} قيمة ما بتمشي معها|The rules of “${i.field}” change: ${n(i.failing + i.missing + i.doubles)} values don't pass them|הכללים של «${i.field}» משתנים: ${n(i.failing + i.missing + i.doubles)} ערכים לא עוברים אותם`);
}

/** The server's reasons (English), said in the admin's language where they are known. */
const REASONS: Array<[RegExp, (m: RegExpExecArray) => string]> = [
  [/^"(.+)": "(.+)" is held by "(.+)" here$/, (m) => `«${m[1]}»: العنوان «${m[2]}» محجوز هون لـ«${m[3]}». غيّر عنوان التاني، أو علّمه يروح.|“${m[1]}”: the address “${m[2]}” is held here by “${m[3]}”. Rename that one, or tick it to go.|«${m[1]}»: הכתובת «${m[2]}» תפוסה כאן על ידי «${m[3]}». שנו את השם שלו, או סמנו אותו להסרה.`],
  [/^"(.+)" links "(.+)": it can't go while it does$/, (m) => `«${m[1]}» مربوط بـ«${m[2]}»: ما بيقدر يروح وهو مربوط.|“${m[1]}” links “${m[2]}”: it can't go while it does.|«${m[1]}» מקושר ל«${m[2]}»: הוא לא יכול להיות מוסר כל עוד הוא מקושר.`],
  [/^"(.+)" calls it: it can't go while it does$/, (m) => `«${m[1]}» بتناديها: ما بتقدر تروح.|“${m[1]}” calls it: it can't go while it does.|«${m[1]}» קוראת לה: היא לא יכולה להיות מוסרת.`],
  [/^A relation links a table that won't be there$/, () => "حقل ربط بيربط جدول مش رح يكون موجود.|A relation links a table that won't be there.|שדה קישור מקשר לטבלה שלא תהיה קיימת."],
  [/^A rollup reads a table that won't be there$/, () => "حقل مجموع بيقرأ من جدول مش رح يكون موجود.|A rollup reads a table that won't be there.|שדה סיכום קורא מטבלה שלא תהיה קיימת."],
  [/^The published steps use a table that won't be there$/, () => "الخطوات المنشورة بتستعمل جدول مش رح يكون موجود.|The published steps use a table that won't be there.|השלבים שפורסמו משתמשים בטבלה שלא תהיה קיימת."],
  [/^The published steps call a function that won't be there$/, () => "الخطوات المنشورة بتنادي function مش رح تكون موجودة.|The published steps call a function that won't be there.|השלבים שפורסמו קוראים לפונקציה שלא תהיה קיימת."],
  [/^It waits for a table that won't be there$/, () => "بتستنى جدول مش رح يكون موجود.|It waits for a table that won't be there.|היא מחכה לטבלה שלא תהיה קיימת."],
  [/^This file isn't a project file$/, () => "هاد الملف مش ملف مشروع.|This file isn't a project file.|הקובץ הזה אינו קובץ פרויקט."],
  [/^This is a feature template: install it from my features$/, () => "هاد قالب ميزة: ثبّته من «ميزاتي».|This is a feature template: install it from “My features”.|זו תבנית פיצ'ר: התקינו אותה מ«הפיצ'רים שלי»."],
  [/^This file was written by a newer version: update the store first$/, () => "هاد الملف من نسخة أجدد: حدّث المتجر أول.|This file was written by a newer version: update the store first.|הקובץ נכתב בגרסה חדשה יותר: עדכנו קודם את החנות."],
  [/^A project file is up to (\d+) MB$/, (m) => `ملف المشروع لحد ${m[1]} ميغا.|A project file is up to ${m[1]} MB.|קובץ פרויקט הוא עד ${m[1]} MB.`],
];
export function reasonText(message: string): string {
  for (const [re, words] of REASONS) {
    const m = re.exec(message);
    if (m) return say(words(m));
  }
  return message;
}

export const bytesText = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);
