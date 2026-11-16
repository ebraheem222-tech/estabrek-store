// الـ Functions: the pages' words, apart from the pages so they can be tested. Written in the
// three languages side by side ("عربي|English|עברית").
import type { Cmp, Cond, FnInput, FnLite, FnTable, FnTrigger, Step, StepKind, TraceLine, TriggerKind, Val } from "../../api/functions.api";
import { fromVal, tableName } from "./fnDraft";

export type Lang = "ar" | "en" | "he";
export const part = (words: string, lang: Lang) => {
  const [ar, en, he] = words.split("|");
  return { ar, en: en ?? ar, he: he ?? en ?? ar }[lang];
};
const fill = (words: string, lang: Lang, things: Record<string, string | number>) => part(words, lang).replace(/\{(\w+)\}/g, (_m, k: string) => String(things[k] ?? ""));

export const GROUP_NAME: Record<"data" | "control" | "out" | "code", string> = {
  data: "جداولك|Your tables|הטבלאות שלך",
  control: "التحكّم|Control|בקרה",
  out: "رسايل وتنبيهات|Messages|הודעות",
  code: "كود|Code|קוד",
};
/** What a new code step starts with: how it is handed things and gives one back. */
export const CODE_START: Record<Lang, string> = {
  ar: "// اللي بتعطيه للكود بتلاقيه بـ input (مثلاً input.rows).\n// رجّع الجواب بـ return. و log(...) بيكتب بنتيجة التجربة.\nreturn input;",
  en: "// What you hand the code is in input (say, input.rows).\n// Give the answer back with return. log(...) writes to the try-out's result.\nreturn input;",
  he: "// מה שנותנים לקוד נמצא ב-input (למשל input.rows).\n// מחזירים תשובה עם return. log(...) כותב בתוצאת הניסיון.\nreturn input;",
};
/** What a code step can and can't do, said under its box. */
export const codeNote = (cage: { ms: number; memoryMb: number } | undefined, lang: Lang) =>
  fill(
    "الكود بيشتغل بقفص عالسيرفر: بيشوف بس اللي بتعطيه إياه، وما بيوصل لجداول ولا إنترنت ولا رسايل (هدول شغل الخطوات). بالكتير {s} ثواني و{mb} ميغا، وبدون await.|The code runs in a cage on the server: it sees only what you hand it, and reaches no table, no network and no message (those are the steps' work). At most {s} seconds and {mb} MB, and no await.|הקוד רץ בכלוב בשרת: הוא רואה רק את מה שנותנים לו, ולא מגיע לטבלאות, לרשת או להודעות (אלה עבודת השלבים). לכל היותר {s} שניות ו-{mb} מ״ב, ובלי await.",
    lang,
    { s: (cage?.ms ?? 2000) / 1000, mb: cage?.memoryMb ?? 32 },
  );
export const ACT_NAME: Record<StepKind, string> = {
  find: "دوّر بجدول|Find rows|חיפוש שורות",
  get: "جيب سطر|Get a row|שליפת שורה",
  add: "أضف سطر|Add a row|הוספת שורה",
  change: "عدّل سطر|Change a row|שינוי שורה",
  delete: "احذف سطر|Delete a row|מחיקת שורה",
  if: "إذا…|If…|אם…",
  each: "لكل واحد بقائمة|For each in a list|לכל אחד ברשימה",
  set: "احفظ قيمة|Keep a value|שמירת ערך",
  call: "نادي function تانية|Call another function|קריאה לפונקציה אחרת",
  code: "كود JavaScript|JavaScript code|קוד JavaScript",
  stop: "وقّف وقول ليش|Stop, saying why|עצירה עם סיבה",
  return: "رجّع جواب|Give back an answer|החזרת תשובה",
  notify: "جرس بالأدمن|Ring the admin's bell|התראה בניהול",
  email: "إيميل|Email|אימייל",
  whatsapp: "واتساب|WhatsApp|וואטסאפ",
  sms: "SMS|SMS|SMS",
};
export const CMP_NAME: Record<Cmp, string> = {
  eq: "يساوي|equals|שווה ל",
  ne: "ما بيساوي|doesn't equal|לא שווה ל",
  gt: "أكبر من|is more than|גדול מ",
  gte: "أكبر أو يساوي|is at least|לפחות",
  lt: "أصغر من|is less than|קטן מ",
  lte: "أصغر أو يساوي|is at most|לכל היותר",
  contains: "فيه|contains|מכיל",
  notContains: "ما فيه|doesn't contain|לא מכיל",
  in: "واحد من|is one of|אחד מ",
  notIn: "مش واحد من|is none of|אינו אחד מ",
  empty: "فاضي|is empty|ריק",
  notEmpty: "مش فاضي|is not empty|לא ריק",
};
/** The comparisons that take nothing on the right. */
export const ALONE: Cmp[] = ["empty", "notEmpty"];
export const SET_OP: Record<"set" | "add" | "multiply" | "append", string> = {
  set: "خلّيها|becomes|הופך ל",
  add: "زيد عليها|add to it|הוספה",
  multiply: "اضربها بـ|multiply it by|הכפלה ב",
  append: "ضيف عالقائمة|add to the list|הוספה לרשימה",
};
export const INPUT_TYPE: Record<string, string> = {
  text: "نص|Text|טקסט",
  number: "رقم|Number|מספר",
  bool: "نعم / لا|Yes / no|כן / לא",
  list: "قائمة|List|רשימה",
  any: "أي شي|Anything|כל דבר",
};

/** A value in a line: its words, shortened; nothing as a dash. */
const short = (v: Val | undefined, max = 40) => {
  const s = fromVal(v);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s || "—";
};

/** A condition as a line: "{{order.total}} أكبر من 100". */
export function condLine(c: Cond, lang: Lang): string {
  return ALONE.includes(c.cmp) ? `${short(c.left)} ${part(CMP_NAME[c.cmp], lang)}` : `${short(c.left)} ${part(CMP_NAME[c.cmp], lang)} ${short(c.right)}`;
}
export function condsLine(conds: Cond[] | undefined, match: "all" | "any" | undefined, lang: Lang): string {
  if (!conds?.length) return part("ما في سؤال لسا|Nothing asked yet|עדיין לא נשאל דבר", lang);
  return conds.map((c) => condLine(c, lang)).join(match === "any" ? part(" أو | or | או ", lang) : part(" و | and | ו", lang));
}

/** A step in one line, for when it is closed. */
export function stepLine(s: Step, ctx: { tables: FnTable[]; fns: FnLite[] }, lang: Lang): string {
  const table = (id: string) => tableName(ctx.tables.find((t) => t.id === id), lang) || part("جدول؟|table?|טבלה?", lang);
  const kept = (as?: string) => (as ? ` ← ${as}` : "");
  switch (s.act) {
    case "find":
      return `${table(s.table)}${s.filters?.length ? ` · ${fill("{n} شرط|{n} conditions|{n} תנאים", lang, { n: s.filters.length })}` : ""}${kept(s.as)}`;
    case "get":
      return `${table(s.table)}: ${short(s.row)}${kept(s.as)}`;
    case "add":
      return `${table(s.table)}${kept(s.as)}`;
    case "change":
    case "delete":
      return `${table(s.table)}: ${short(s.row)}${s.act === "change" ? kept(s.as) : ""}`;
    case "set":
      return `${s.name} ${part(SET_OP[s.op ?? "set"], lang)} ${short(s.value)}`;
    case "if":
      return condsLine(s.if, s.match, lang);
    case "each":
      return `${short(s.list)} ← ${s.as ?? "item"}`;
    case "call":
      return `${ctx.fns.find((f) => f.id === s.fn)?.name ?? part("function؟|function?|פונקציה?", lang)}${kept(s.as)}`;
    case "code": {
      // Its first line that says something (not a remark).
      const first = s.code.split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("//")) ?? "";
      return `${short(first, 60)}${kept(s.as)}`;
    }
    case "stop":
      return short(s.message, 60);
    case "return":
      return short(s.value, 60);
    case "notify":
      return short(s.title, 60);
    case "email":
      return `${s.to?.trim() || part("إيميل المتجر|the shop's email|האימייל של החנות", lang)} · ${short(s.subject)}`;
    default:
      return `${s.to?.trim() || part("رقم المتجر|the shop's number|המספר של החנות", lang)} · ${short(s.text)}`;
  }
}

/* ---------------- Where, and what is wrong ---------------- */

/** A step's way in, as the owner reads it: "do.2.else.0" → "الخطوة 3 ← وإلا ← الخطوة 1". */
export function whereText(at: string, lang: Lang): string {
  const keys = at.replace(/\[(\d+)\]/g, "").split(".");
  const out: string[] = [];
  for (let k = 0; k < keys.length; k++) {
    const key = keys[k];
    const n = Number(keys[k + 1]);
    if (key === "inputs") out.push(part("المدخلات|The inputs|הקלטים", lang));
    else if (key === "if") {
      out.push(Number.isInteger(n) ? fill("الشرط {n}|Condition {n}|תנאי {n}", lang, { n: n + 1 }) : part("الشرط|The condition|התנאי", lang));
      k += 1;
    } else if (key === "do" || key === "else" || key === "fail") {
      // The function's own "do" needs no name; a way inside a step, or the other lists, does.
      if (key === "else") out.push(part("وإلا|Else|אחרת", lang));
      if (key === "fail") out.push(part("عند الفشل|On failure|בכישלון", lang));
      if (Number.isInteger(n)) {
        out.push(fill("الخطوة {n}|Step {n}|שלב {n}", lang, { n: n + 1 }));
        k += 1;
      }
    }
  }
  return out.join(" ← ");
}

const PROBLEMS: Array<[RegExp, string]> = [
  [/^Pick a table$/, "اختار جدول|Pick a table|יש לבחור טבלה"],
  [/^This table isn't there any more$/, "هالجدول ما عاد موجود|This table isn't there any more|הטבלה הזאת כבר לא קיימת"],
  [/^No (?:column|field) "(.+)" in this table$/, "ما في حقل «{1}» بهالجدول|No field “{1}” in this table|אין שדה «{1}» בטבלה הזאת"],
  [/^"(.+)" can't be asked "(.+)"$/, "الحقل «{1}» ما بينسأل هالسؤال|The field “{1}” can't be asked that|אי אפשר לשאול כך את השדה «{1}»"],
  [/^Nothing is kept under "(.+)" before this step$/, "ما في شي محفوظ باسم «{1}» قبل هالخطوة|Nothing is kept under “{1}” before this step|שום דבר לא נשמר בשם «{1}» לפני השלב הזה"],
  [/^No input called "(.+)"$/, "ما في مدخل اسمه «{1}»|No input called “{1}”|אין קלט בשם «{1}»"],
  [/^The caller has no "(.+)"$/, "المنادي ما إله «{1}» (إله: kind, id, name, email)|The caller has no “{1}” (it has: kind, id, name, email)|לקורא אין «{1}» (יש לו: kind, id, name, email)"],
  [/^"(\{\{.+\}\})" isn't a name$/, "«{1}» مش اسم|“{1}” isn't a name|«{1}» אינו שם"],
  [/^Compared with what\?$/, "مقارنة مع شو؟|Compared with what?|השוואה למה?"],
  [/^What is compared\?$/, "شو اللي بينقارن؟|What is compared?|מה מושווה?"],
  [/^A loop goes over one named list/, "الحلقة بتمشي على قائمة وحدة باسمها، متل {{rows}}|A loop goes over one named list, like {{rows}}|לולאה עוברת על רשימה אחת בשמה, כמו {{rows}}"],
  [/^Which row is empty$/, "أي سطر؟|Which row?|איזו שורה?"],
  [/^Nothing to change$/, "ما في شي يتعدّل|Nothing to change|אין מה לשנות"],
  [/^A question that asks nothing$/, "سؤال ما بيسأل شي|A question that asks nothing|שאלה שלא שואלת דבר"],
  [/^The subject is empty$/, "العنوان فاضي|The subject is empty|הנושא ריק"],
  [/^The text is empty$/, "النص فاضي|The text is empty|הטקסט ריק"],
  [/^The title is empty$/, "العنوان فاضي|The title is empty|הכותרת ריקה"],
  [/^The reason is empty$/, "السبب فاضي|The reason is empty|הסיבה ריקה"],
  [/^The code is empty$/, "الكود فاضي|The code is empty|הקוד ריק"],
  [/^The code can't be read: (.+) \(line (\d+)\)$/, "الكود فيه غلطة كتابة: {1} (السطر {2})|The code has a mistake in its writing: {1} (line {2})|יש טעות בכתיבת הקוד: {1} (שורה {2})"],
  [/^The code can't be read: (.+)$/, "الكود فيه غلطة كتابة: {1}|The code has a mistake in its writing: {1}|יש טעות בכתיבת הקוד: {1}"],
  [/^Pick a function$/, "اختار function|Pick a function|יש לבחור פונקציה"],
  [/^A function can't call itself$/, "الـ function ما بتنادي حالها|A function can't call itself|פונקציה לא יכולה לקרוא לעצמה"],
  [/^This function isn't there any more$/, "هالـ function ما عادت موجودة|This function isn't there any more|הפונקציה הזאת כבר לא קיימת"],
  [/^"(.+)" isn't published yet$/, "«{1}» مش منشورة لسا|“{1}” isn't published yet|«{1}» עדיין לא פורסמה"],
  [/^"(.+)" needs "(.+)"$/, "«{1}» بدها «{2}»|“{1}” needs “{2}”|«{1}» צריכה את «{2}»"],
  [/^"(.+)" takes no "(.+)"$/, "«{1}» ما بتاخد «{2}»|“{1}” takes no “{2}”|«{1}» לא מקבלת «{2}»"],
];
/** What stands in the way of publishing, in the admin's language (one it doesn't know stays as the server said it). */
export function problemText(message: string, lang: Lang): string {
  for (const [pattern, words] of PROBLEMS) {
    const m = pattern.exec(message);
    if (m) return part(words, lang).replace(/\{(\d)\}/g, (_x, n: string) => m[Number(n)] ?? "");
  }
  return message;
}

/* ---------------- A run, line by line ---------------- */

const KIND: Record<string, string> = { email: "إيميل|an email|אימייל", whatsapp: "واتساب|a WhatsApp|וואטסאפ", sms: "SMS|an SMS|SMS" };
const SAID: Record<string, string> = {
  found: "{0} سطر|{0} rows|{0} שורות",
  row: "السطر {0}|Row {0}|השורה {0}",
  noRow: "ما في سطر هيك|No such row|אין שורה כזאת",
  added: "انضاف {0} على {1}|Added {0} to {1}|{0} נוספה ל-{1}",
  wouldAdd: "كان رح ينضاف سطر على {0}|Would add a row to {0}|הייתה נוספת שורה ל-{0}",
  changed: "تعدّل {0} بـ {1}|Changed {0} in {1}|{0} שונתה ב-{1}",
  wouldChange: "كان رح يتعدّل {0} بـ {1}|Would change {0} in {1}|{0} הייתה משתנה ב-{1}",
  deleted: "راح {0} لسلة محذوفات {1}|Moved {0} to the trash of {1}|{0} הועברה לאשפה של {1}",
  wouldDelete: "كان رح يروح {0} لسلة محذوفات {1}|Would move {0} to the trash of {1}|{0} הייתה עוברת לאשפה של {1}",
  nothingToDelete: "ما في سطر هيك (ما في شي ينحذف)|No such row (nothing to delete)|אין שורה כזאת (אין מה למחוק)",
  set: "{0} = {1}|{0} = {1}|{0} = {1}",
  queued: "{0} صار بالدور لـ {1}|Queued {0} to {1}|{0} נכנס לתור אל {1}",
  wouldSend: "كان رح ينبعت {0} لـ {1}|Would send {0} to {1}|{0} היה נשלח אל {1}",
  rang: "رنّ الجرس: {0}|Rang the bell: {0}|הפעמון צלצל: {0}",
  wouldRing: "كان رح يرنّ الجرس: {0}|Would ring the bell: {0}|הפעמון היה מצלצל: {0}",
  called: "نادى {0}|Called {0}|קרא ל-{0}",
  ran: "الكود اشتغل ({0} ميلي ثانية)|Ran the code ({0} ms)|הקוד רץ ({0} מ״ש)",
  returned: "رجّع جوابه|Gave back its answer|החזיר את תשובתו",
  yes: "نعم|Yes|כן",
  no: "لا|No|לא",
  other: "لا: الطريق التاني|No: the other way|לא: הדרך האחרת",
  times: "{0} مرات|{0} times|{0} פעמים",
};
/** Why the cage stopped a code step, in the admin's language (what the code itself said stays as it said it). */
const CAGE_SAID: Array<[RegExp, string]> = [
  [/^The code ran longer than (\d+(?:\.\d+)?) seconds$/, "الكود أخد أكتر من {1} ثواني، فتوقّف|The code ran longer than {1} seconds and was stopped|הקוד רץ יותר מ-{1} שניות ונעצר"],
  [/^The code used more than (\d+) MB$/, "الكود أخد أكتر من {1} ميغا ذاكرة، فتوقّف|The code used more than {1} MB and was stopped|הקוד צרך יותר מ-{1} מ״ב ונעצר"],
  [/^Too much code is running right now: try again in a moment$/, "في كود كتير عم يشتغل هلأ: جرّب بعد شوي|Too much code is running right now: try again in a moment|רץ כרגע יותר מדי קוד: נסו שוב בעוד רגע"],
  [/^The code gave back a promise: it runs straight through, without await$/, "الكود رجّع promise: هو بيشتغل مرة وحدة للآخر، بدون await|The code gave back a promise: it runs straight through, without await|הקוד החזיר promise: הוא רץ ברצף, בלי await"],
  [/^The code gave back more than (\d+) KB$/, "الكود رجّع أكتر من {1} كيلوبايت|The code gave back more than {1} KB|הקוד החזיר יותר מ-{1} ק״ב"],
  [/^The code is handed more than (\d+) KB$/, "اللي بينعطى للكود أكتر من {1} كيلوبايت|The code is handed more than {1} KB|לקוד ניתנים יותר מ-{1} ק״ב"],
  [/^The code's machine (?:stopped|didn't start.*)$/, "قفص الكود وقف. جرّب كمان مرة|The code's cage stopped. Try again|הכלוב של הקוד נעצר. נסו שוב"],
];
/** Why a run stopped: the cage's own reasons in the admin's language, anything else as it was said. */
export function failText(error: string, lang: Lang): string {
  for (const [pattern, words] of CAGE_SAID) {
    const m = pattern.exec(error);
    if (m) return part(words, lang).replace(/\{(\d)\}/g, (_x, n: string) => m[Number(n)] ?? "");
  }
  return error;
}

/** Why one of a function's tests didn't pass. */
const TEST_WHY: Record<string, string> = {
  stopped: "وقفت، والمتوقّع إنها تمشي للآخر|It stopped, and was expected to go through|היא נעצרה, והציפייה הייתה שתעבור עד הסוף",
  wentThrough: "مشيت للآخر، والمتوقّع إنها توقف|It went through, and was expected to stop|היא עברה עד הסוף, והציפייה הייתה שתיעצר",
  value: "رجّعت جواب غير المتوقّع:|It gave back another answer than expected:|היא החזירה תשובה אחרת מהצפויה:",
  reason: "وقفت، بس لسبب غير المتوقّع|It stopped, but for another reason than expected|היא נעצרה, אבל מסיבה אחרת מהצפויה",
  time: "ما لحقت دورها: الاختبارات أخدت وقتها كله|It never got its turn: the tests used up their time|היא לא הגיעה לתורה: הבדיקות ניצלו את כל הזמן שלהן",
};
export const testWhyText = (why: string, lang: Lang): string => part(TEST_WHY[why] ?? why, lang);

/** What a step did (or, dry, would do), in the admin's language. */
export function lineText(line: Pick<TraceLine, "ok" | "say" | "note" | "error">, lang: Lang): string {
  if (!line.ok) return line.error ? failText(line.error, lang) : part("فشلت|Failed|נכשל", lang);
  const [code, ...things] = line.say ?? [];
  const words = code ? SAID[code] : undefined;
  if (!words) return line.note ?? "";
  // "3 of 20 rows": more rows matched than the step took.
  if (code === "found" && Number(things[1]) > Number(things[0])) return fill("{n} من {total} سطر|{n} of {total} rows|{n} מתוך {total} שורות", lang, { n: things[0], total: things[1] });
  const said = code === "queued" || code === "wouldSend" ? [part(KIND[String(things[0])] ?? String(things[0]), lang), things[1]] : things;
  return part(words, lang).replace(/\{(\d)\}/g, (_m, n: string) => String(said[Number(n)] ?? ""));
}

/** How a run ended, in a line. */
export function outcomeLine(out: { ok: boolean; dry: boolean; counts: { added: number; changed: number; deleted: number; sent: number }; ms: number }, lang: Lang): string {
  const c = out.counts;
  const did = [
    c.added ? fill("{n} انضاف|{n} added|{n} נוספו", lang, { n: c.added }) : "",
    c.changed ? fill("{n} تعدّل|{n} changed|{n} שונו", lang, { n: c.changed }) : "",
    c.deleted ? fill("{n} انحذف|{n} deleted|{n} נמחקו", lang, { n: c.deleted }) : "",
    c.sent ? fill("{n} رسالة|{n} messages|{n} הודעות", lang, { n: c.sent }) : "",
  ].filter(Boolean);
  const head = out.ok ? (out.dry ? part("كانت رح تمشي|It would have gone through|הייתה עוברת", lang) : part("مشيت|It went through|עברה", lang)) : out.dry ? part("كانت رح توقف|It would have stopped|הייתה נעצרת", lang) : part("وقفت|It stopped|נעצרה", lang);
  const tail = did.length ? did.join("، ") : out.dry ? part("وما كانت رح تغيّر شي|and would have changed nothing|ולא הייתה משנה דבר", lang) : part("وما غيّرت شي|and changed nothing|ולא שינתה דבר", lang);
  return `${head} · ${out.dry && did.length ? `${part("كان رح:|would have:|הייתה:", lang)} ${tail}` : tail} · ${out.ms} ms`;
}

/** A function's state, for its badge. */
export function stateOf(f: Pick<FnLite, "published" | "changed" | "enabled">): "off" | "draft" | "changed" | "live" {
  if (!f.published) return "draft";
  if (!f.enabled) return "off";
  return f.changed ? "changed" : "live";
}
export const STATE_NAME: Record<ReturnType<typeof stateOf>, string> = {
  draft: "مسودة، مش منشورة|Draft, not published|טיוטה, לא פורסמה",
  changed: "منشورة، وفي تعديلات مش منشورة|Published, with changes not published|פורסמה, עם שינויים שלא פורסמו",
  live: "منشورة|Published|פורסמה",
  off: "موقّفة|Switched off|כבויה",
};

/* ---------------- What starts it ---------------- */

export const TRIGGER_KIND_NAME: Record<TriggerKind, string> = {
  row: "سطر بجدول|A row of a table|שורה בטבלה",
  schedule: "على الوقت|On a schedule|לפי לוח זמנים",
  event: "حدث بالمتجر|Something in the store|אירוע בחנות",
  call: "نداء (زر بالمتجر أو برنامج)|A call (a shop button or a program)|קריאה (כפתור בחנות או תוכנה)",
  webhook: "Webhook من نظام تاني|A webhook from another system|Webhook ממערכת אחרת",
};
export const ROW_EVENT_NAME = { added: "انضاف|added|נוספה", changed: "تعدّل|changed|שונתה", deleted: "انحذف|deleted|נמחקה" } as const;
export const EVENT_NAME: Record<string, string> = {
  "order.created": "طلب جديد|A new order|הזמנה חדשה",
  "video.ready": "فيديو جاهز|A video is ready|וידאו מוכן",
  "job.failing": "مهمة بالخلفية عم تفشل|A background job keeps failing|משימת רקע נכשלת שוב ושוב",
  "deploy.failed": "النشر ما صار حي|A deploy didn't go live|פריסה לא עלתה לאוויר",
};
export const CALL_WHO_NAME = {
  customer: "زبون مسجّل دخوله|A signed-in shopper|לקוח מחובר",
  key: "برنامج معه مفتاح API|A program with an API key|תוכנה עם מפתח API",
  public: "أي حدا|Anyone|כל אחד",
} as const;

/** A trigger in a line: what it waits for. */
export function triggerLine(t: Pick<FnTrigger, "kind" | "config" | "slug">, tables: FnTable[], lang: Lang): string {
  const c = t.config;
  if (t.kind === "row") {
    const on = ((c.on as string[] | undefined) ?? []).map((e) => part(ROW_EVENT_NAME[e as keyof typeof ROW_EVENT_NAME] ?? e, lang));
    return `${tableName(tables.find((x) => x.id === c.table), lang) || part("جدول؟|table?|טבלה?", lang)}: ${on.join(part("، |, |, ", lang))}`;
  }
  if (t.kind === "schedule") return "at" in c ? fill("كل يوم الساعة {at}|Every day at {at}|כל יום בשעה {at}", lang, { at: String(c.at) }) : fill("كل {n} دقيقة|Every {n} minutes|כל {n} דקות", lang, { n: Number(c.everyMinutes) });
  if (t.kind === "event") return part(EVENT_NAME[String(c.event)] ?? String(c.event), lang);
  if (t.kind === "call") return part(CALL_WHO_NAME[String(c.who) as keyof typeof CALL_WHO_NAME] ?? String(c.who), lang);
  return "";
}

const moment = (iso: string, lang: Lang) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(lang === "ar" ? "ar" : lang === "he" ? "he-IL" : "en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};
/** How often it fired and when last; a schedule's next moment. */
export function firedText(t: Pick<FnTrigger, "fired" | "lastAt" | "nextAt" | "enabled">, lang: Lang): string {
  const out: string[] = [];
  if (t.fired) out.push(fill("اشتغل {n} مرة، آخرها {when}.|It fired {n} times, last on {when}.|הופעל {n} פעמים, לאחרונה ב-{when}.", lang, { n: t.fired.toLocaleString("en"), when: t.lastAt ? moment(t.lastAt, lang) : "" }));
  if (t.nextAt && t.enabled) out.push(fill("الجاية: {when}.|Next: {when}.|הבא: {when}.", lang, { when: moment(t.nextAt, lang) }));
  return out.join(" ");
}

/** What a trigger hands that the function has no input for yet. */
export function handsMissing(t: Pick<FnTrigger, "hands">, inputs: FnInput[]): string[] {
  return t.hands.filter((name) => !inputs.some((i) => i.name === name));
}

/** What started a run, as the run log says it ("row.added", "event.order.created", "call"…), in words. */
export function fnTriggerName(trigger: string, lang: Lang): string {
  if (trigger === "admin") return part("من الإدارة|From the admin|מהניהול", lang);
  if (trigger === "call") return part("نداء|A call|קריאה", lang);
  if (trigger === "schedule") return part("على الوقت|On schedule|לפי לוח זמנים", lang);
  if (trigger === "webhook") return "Webhook";
  if (trigger.startsWith("row.")) return fill("سطر {what}|A row {what}|שורה {what}", lang, { what: part(ROW_EVENT_NAME[trigger.slice(4) as keyof typeof ROW_EVENT_NAME] ?? trigger.slice(4), lang) });
  if (trigger.startsWith("event.")) return part(EVENT_NAME[trigger.slice(6)] ?? trigger.slice(6), lang);
  return trigger;
}
