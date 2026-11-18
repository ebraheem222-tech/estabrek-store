// ميزاتي → templates (stage 4): the words for a template file going out (what couldn't go into it),
// coming in (where it is wrong, what it needs, what moved) and a feature leaving with everything in it.
// Written in the three languages side by side ("عربي|English|עברית"), apart from the pages so they
// can be tested.
import type { TemplateNote, TemplateProblem } from "../../api/myFeatures.api";
import type { Lang } from "./featuresText";

const part = (words: string, lang: Lang) => {
  const [ar, en, he] = words.split("|");
  return { ar, en: en ?? ar, he: he ?? en ?? ar }[lang];
};
const fill = (words: string, lang: Lang, values: Record<string, string | number>) => part(words, lang).replace(/\{(\w+)\}/g, (_m, k: string) => String(values[k] ?? ""));

/** Where a step is in a function, as its page numbers them: "do.2" → step 3, "do.1.else.0" → step 2 › else 1. */
export function stepPlace(at: string, lang: Lang): string {
  const bits = at.split(".");
  const out: string[] = [];
  for (let i = 0; i + 1 < bits.length; i += 2) {
    const n = Number(bits[i + 1]) + 1;
    if (bits[i] === "else") out.push(`${part("وإلا|else|אחרת", lang)} ${n}`);
    else if (bits[i] === "fail") out.push(`${part("إذا فشل|on failure|בכישלון", lang)} ${n}`);
    else out.push(String(n));
  }
  return `${part("الخطوة|step|שלב", lang)} ${out.join(" › ")}`;
}

const NOTE: Record<TemplateNote["what"], string> = {
  relationOut: "حقل «{field}» بجدول «{table}» بيربط جدول برّا الميزة: ما انحط بالملف.|The field “{field}” of “{table}” links a table outside the feature: it isn't in the file.|השדה «{field}» בטבלה «{table}» מקשר טבלה מחוץ לתכונה: הוא לא בקובץ.",
  stepTableOut: "«{fn}»، {at}: بتستعمل جدول برّا الميزة. بتنحط بدون جدول، وبتختاره بعد التثبيت.|“{fn}”, {at}: uses a table outside the feature. It goes without one, to be picked after installing.|«{fn}», {at}: משתמשת בטבלה מחוץ לתכונה. היא נכנסת בלי טבלה, ובוחרים אותה אחרי ההתקנה.",
  stepFnOut: "«{fn}»، {at}: بتنادي function برّا الميزة. بتنحط بدونها.|“{fn}”, {at}: calls a function outside the feature. It goes without it.|«{fn}», {at}: קוראת לפונקציה מחוץ לתכונה. היא נכנסת בלעדיה.",
  readyOut: "«{fn}»، {at}: بتبعت باتصال جاهز. المتجر التاني بيوصل اتصاله هو وبيختاره.|“{fn}”, {at}: sends through a ready connection. The other store connects its own and picks it.|«{fn}», {at}: שולחת דרך חיבור מוכן. החנות האחרת מחברת חיבור משלה ובוחרת אותו.",
  triggerTableOut: "«{fn}» بتشتغل على سطور جدول برّا الميزة: هالمشغّل ما انحط.|“{fn}” starts on rows of a table outside the feature: that trigger isn't in the file.|«{fn}» מופעלת משורות של טבלה מחוץ לתכונה: המפעיל הזה לא בקובץ.",
  webhookNew: "«{fn}» إلها webhook: بالمتجر التاني بيصير إلها عنوان جديد.|“{fn}” has a webhook: in the other store it gets a new address.|ל«{fn}» יש webhook: בחנות האחרת הוא מקבל כתובת חדשה.",
  listOut: "صفحة «{page}» فيها قائمة لجدول برّا الميزة: القائمة ما انحطت.|The page “{page}” lists a table outside the feature: that list isn't in the file.|בעמוד «{page}» יש רשימה של טבלה מחוץ לתכונה: הרשימה לא בקובץ.",
  oldSections: "صفحة «{page}» فيها أقسام من المحرر القديم: ما انحطوا.|The page “{page}” has sections of the old editor: they aren't in the file.|בעמוד «{page}» יש מקטעים מהעורך הישן: הם לא בקובץ.",
  blockOut: "صفحة «{page}» فيها بلوك محفوظ: ما انحط (البلوك مش للميزة).|The page “{page}” has a saved block: it isn't in the file (the block isn't the feature's).|בעמוד «{page}» יש בלוק שמור: הוא לא בקובץ (הבלוק לא של התכונה).",
  componentOut: "صفحة «{page}» فيها مكوّن: ما انحط (المكوّن مش للميزة).|The page “{page}” has a component: it isn't in the file (the component isn't the feature's).|בעמוד «{page}» יש רכיב: הוא לא בקובץ (הרכיב לא של התכונה).",
  oldPage: "صفحة «{page}» معمولة بالمحرر القديم: ما انحطت.|The page “{page}” was made with the old editor: it isn't in the file.|העמוד «{page}» נבנה בעורך הישן: הוא לא בקובץ.",
};
/** What couldn't go into an exported file, in a sentence. */
export function noteText(note: TemplateNote, lang: Lang): string {
  const values: Record<string, string> = { ...(note as Record<string, string>) };
  if ("at" in note) values.at = stepPlace(note.at, lang);
  return fill(NOTE[note.what], lang, values);
}

const PROBLEMS: Array<[RegExp, string]> = [
  [/^This file isn't a feature template$/, "هاد الملف مش قالب ميزة|This file isn't a feature template|הקובץ הזה אינו תבנית תכונה"],
  [/newer version/, "القالب معمول بنسخة أجدد من المتجر: لازم يتحدّث المتجر أول|The template was made by a newer version: the store has to be updated first|התבנית נבנתה בגרסה חדשה יותר: צריך לעדכן את החנות קודם"],
  [/^A version is three numbers/, "النسخة تلات أرقام، متل 1.0.0|A version is three numbers, like 1.0.0|גרסה היא שלושה מספרים, כמו 1.0.0"],
  [/^No table "(.+)" in this template$/, "ما في جدول «$1» بالقالب|No table “$1” in the template|אין טבלה «$1» בתבנית"],
  [/^No function "(.+)" in this template$/, "ما في function «$1» بالقالب|No function “$1” in the template|אין פונקציה «$1» בתבנית"],
  [/^Another address here has this method and path$/, "في عنوان تاني هون بنفس الطريقة والمسار|Another address here has this method and path|כתובת אחרת כאן כבר משתמשת בשיטה ובנתיב האלה"],
  [/^A template holds something$/, "القالب فاضي|The template is empty|התבנית ריקה"],
  [/^A template has a name$/, "القالب بدّه اسم|The template needs a name|לתבנית צריך שם"],
  [/^A template file is up to (\d+) MB$/, "ملف القالب لحد $1 ميغا|A template file is up to $1 MB|קובץ תבנית הוא עד $1 MB"],
  [/^A relation links one of the template's tables/, "الربط لازم يكون لجدول من القالب أو من المتجر|A relation links one of the template's tables, or one of the store's|קשר מקשר לאחת מטבלאות התבנית, או של החנות"],
];
/** Where a file is wrong, in the page's language (what the server says in its own words otherwise). */
export function problemText(p: TemplateProblem, lang: Lang): string {
  for (const [re, words] of PROBLEMS) {
    const m = p.message.match(re);
    if (m) return part(words, lang).replace(/\$(\d)/g, (_x, k: string) => m[Number(k)] ?? "");
    if (re.test(p.message)) return part(words, lang);
  }
  return p.message;
}

const TRIGGER: Record<string, string> = {
  row: "سطر بجدول|a table's row|שורה בטבלה",
  schedule: "على الوقت|on a schedule|לפי לוח זמנים",
  event: "حدث بالمتجر|a store event|אירוע בחנות",
  call: "نداء|a call|קריאה",
  webhook: "webhook|webhook|webhook",
  route: "عنوانك|your address|הכתובת שלך",
};
export const triggerKindText = (kind: string, lang: Lang) => part(TRIGGER[kind] ?? kind, lang);

/** A Latin word kept whole inside a sentence of another direction ("/my-tickets-2" doesn't turn into "my-tickets-2/"). */
const isolated = (w: string) => `${String.fromCodePoint(0x2068)}${w}${String.fromCodePoint(0x2069)}`;
/** "The address x was taken, so it is y". */
export const movedText = (was: string, now: string, lang: Lang) => fill("«{was}» مأخوذ هون، فصار «{now}»|“{was}” is taken here, so it is “{now}”|«{was}» תפוס כאן, אז הוא «{now}»", lang, { was: isolated(was), now: isolated(now) });

/** How many steps, counted the way each language counts. */
export function stepsText(n: number, lang: Lang): string {
  if (lang === "ar") return n === 1 ? "خطوة" : n === 2 ? "خطوتين" : n <= 10 ? `${n} خطوات` : `${n} خطوة`;
  if (lang === "he") return n === 1 ? "שלב אחד" : `${n} שלבים`;
  return n === 1 ? "1 step" : `${n} steps`;
}

/** The file's name when it is saved: its key and version. */
export const fileName = (key: string, version: string) => `${key}-${version}.feature.json`;

/** A file the owner picked, read as JSON (a leading byte-order mark is fine); null when it isn't JSON. */
export function readJson(text: string): unknown {
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

/** The next minor version, offered when a feature that came from a template goes out again. */
export const nextMinor = (v: string) => {
  const [a, b] = v.split(".").map(Number);
  return Number.isFinite(a) ? `${a}.${(Number.isFinite(b) ? b : 0) + 1}.0` : "1.0.0";
};
export const KEY = /^[A-Za-z0-9][A-Za-z0-9_-]{0,40}$/;
export const VERSION = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
