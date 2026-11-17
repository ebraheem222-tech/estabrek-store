// الـ Functions: the pages' words, apart from the pages so they can be tested. Written in the
// three languages side by side ("عربي|English|עברית").
import type { Cmp, Cond, FnInput, FnLite, FnTable, FnTrigger, Outside, Step, StepKind, TraceLine, TriggerKind, Val } from "../../api/functions.api";
import { fromVal, tableName } from "./fnDraft";

export type Lang = "ar" | "en" | "he";
export const part = (words: string, lang: Lang) => {
  const [ar, en, he] = words.split("|");
  return { ar, en: en ?? ar, he: he ?? en ?? ar }[lang];
};
const fill = (words: string, lang: Lang, things: Record<string, string | number>) => part(words, lang).replace(/\{(\w+)\}/g, (_m, k: string) => String(things[k] ?? ""));

export const GROUP_NAME: Record<"data" | "control" | "out" | "outside" | "code", string> = {
  data: "جداولك|Your tables|הטבלאות שלך",
  control: "التحكّم|Control|בקרה",
  out: "رسايل وتنبيهات|Messages|הודעות",
  outside: "برّا المتجر|Outside the store|מחוץ לחנות",
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
  http: "اتصال بموقع|Call a site|קריאה לאתר",
  ready: "ابعت باتصال جاهز|Send through a connection|שליחה דרך חיבור מוכן",
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

/** The kinds of answer a function may promise. */
export const GIVE_TYPE: Record<string, string> = {
  text: "نص|Text|טקסט",
  number: "رقم|Number|מספר",
  bool: "نعم / لا|Yes / no|כן / לא",
  list: "قائمة|A list|רשימה",
  thing: "شي بحقول|A thing with fields|דבר עם שדות",
  any: "أي شي|Anything|כל דבר",
};
/** A kind as the server words it in a line ("a number"), in the admin's language. */
const KIND_SAID: Record<string, string> = {
  anything: "أي شي|anything|כל דבר",
  text: "نص|text|טקסט",
  "a number": "رقم|a number|מספר",
  "yes/no": "نعم/لا|yes/no|כן/לא",
  "a list": "قائمة|a list|רשימה",
  "a thing": "شي بحقول|a thing|דבר עם שדות",
  nothing: "ولا شي|nothing|כלום",
};
const kindSaid = (kind: string, lang: Lang) => (KIND_SAID[kind] ? part(KIND_SAID[kind], lang) : kind);
/** How an answer differs from what its function promises (backend lib/fnGives.ts `answerProblem`), in the admin's language. */
export function shapeText(message: string, lang: Lang): string {
  const item = /^Item (\d+) of the list: (.*)$/.exec(message);
  const where = item ? `${fill("العنصر {n} بالقائمة: |Item {n} of the list: |פריט {n} ברשימה: ", lang, { n: item[1] })}` : "";
  const rest = item ? item[2] : message;
  let m = /^It promises (.+) and gave back (.+)$/.exec(rest);
  if (m) return fill("وعدت بـ {want} ورجّعت {got}|It promises {want} and gave back {got}|היא מבטיחה {want} והחזירה {got}", lang, { want: kindSaid(m[1], lang), got: kindSaid(m[2], lang) });
  m = /^"(.+)" is promised and isn't there$/.exec(rest);
  if (m) return `${where}${fill("الحقل «{f}» موعود ومش موجود|“{f}” is promised and isn't there|השדה «{f}» הובטח ואיננו", lang, { f: m[1] })}`;
  m = /^"(.+)" is promised to be (.+) and is (.+)$/.exec(rest);
  if (m) return `${where}${fill("الحقل «{f}» موعود {want} وطلع {got}|“{f}” is promised to be {want} and is {got}|השדה «{f}» הובטח כ{want} והוא {got}", lang, { f: m[1], want: kindSaid(m[2], lang), got: kindSaid(m[3], lang) })}`;
  m = /^Item (\d+) of the list is promised to be a thing and is (.+)$/.exec(message);
  if (m) return fill("العنصر {n} بالقائمة موعود شي بحقول وطلع {got}|Item {n} of the list is promised to be a thing and is {got}|פריט {n} ברשימה הובטח כדבר עם שדות והוא {got}", lang, { n: m[1], got: kindSaid(m[2], lang) });
  return message;
}

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
export function stepLine(s: Step, ctx: { tables: FnTable[]; fns: FnLite[]; outside?: Outside }, lang: Lang): string {
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
    case "http": {
      // The site and the way in, without what is asked after "?" (a key may sit there).
      const where = s.url.replace(/^https:\/\//i, "").split("?")[0];
      return `${s.method} ${short(where && where !== s.url ? where : s.url, 60)}${kept(s.as)}`;
    }
    case "ready": {
      const c = ctx.outside?.ready?.find((x) => x.id === s.via);
      // What it says (a message), or the row it adds, or the cells it reads.
      const said = short(s.give?.text ?? s.give?.cells?.split("\n").filter((l) => l.trim()).join(" · ") ?? s.give?.range ?? Object.values(s.give ?? {})[0] ?? "", 50);
      return `${c ? c.name : part("اتصال؟|connection?|חיבור?", lang)}${said === "—" ? "" : ` · ${said}`}${kept(s.as)}`;
    }
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
  [/^The address is empty$/, "العنوان فاضي|The address is empty|הכתובת ריקה"],
  [/^The address starts with https:\/\/$/, "العنوان لازم يبلّش بـ https://|The address starts with https://|הכתובת מתחילה ב-https://"],
  [/^"(.+)" isn't among the allowed sites$/, "«{1}» مش من المواقع المسموحة (بتنضاف من «الاتصالات والأسرار»)|“{1}” isn't among the allowed sites (it is added in “Connections & secrets”)|«{1}» לא נמצא בין האתרים המותרים (מוסיפים אותו ב«חיבורים וסודות»)"],
  [/^No secret called "(.+)"$/, "ما في سر اسمه «{1}»|No secret called “{1}”|אין סוד בשם «{1}»"],
  [/^The secret "(.+)" isn't for "(.+)"$/, "السر «{1}» مش لـ «{2}» (مواقعه بتتغيّر من «الاتصالات والأسرار»)|The secret “{1}” isn't for “{2}” (its sites are changed in “Connections & secrets”)|הסוד «{1}» לא מיועד ל«{2}» (משנים את האתרים שלו ב«חיבורים וסודות»)"],
  [/^"(.+)" isn't a secret's name$/, "«{1}» مش اسم سر|“{1}” isn't a secret's name|«{1}» אינו שם של סוד"],
  [/^A secret is only named in a step that calls a site$/, "السر بينكتب اسمه بس بخطوة «اتصال بموقع»|A secret is only named in a “call a site” step|סוד נקרא בשמו רק בשלב «קריאה לאתר»"],
  [/^Pick a connection$/, "اختار اتصال|Pick a connection|יש לבחור חיבור"],
  [/^This connection isn't there any more$/, "هالاتصال ما عاد موجود|This connection isn't there any more|החיבור הזה כבר לא קיים"],
  [/^"(.+)" can't do this$/, "«{1}» ما بيعمل هالشي|“{1}” can't do this|«{1}» לא יכול לעשות את זה"],
  [/^The chat is empty$/, "لأي محادثة؟ (الاتصال ما إله محادثة معتادة)|To which chat? (the connection has no usual one)|לאיזה צ׳אט? (לחיבור אין צ׳אט רגיל)"],
  [/^The code is empty$/, "الكود فاضي|The code is empty|הקוד ריק"],
  [/^The code can't be read: (.+) \(line (\d+)\)$/, "الكود فيه غلطة كتابة: {1} (السطر {2})|The code has a mistake in its writing: {1} (line {2})|יש טעות בכתיבת הקוד: {1} (שורה {2})"],
  [/^The code can't be read: (.+)$/, "الكود فيه غلطة كتابة: {1}|The code has a mistake in its writing: {1}|יש טעות בכתיבת הקוד: {1}"],
  [/^Pick a function$/, "اختار function|Pick a function|יש לבחור פונקציה"],
  [/^A function can't call itself$/, "الـ function ما بتنادي حالها|A function can't call itself|פונקציה לא יכולה לקרוא לעצמה"],
  [/^This function isn't there any more$/, "هالـ function ما عادت موجودة|This function isn't there any more|הפונקציה הזאת כבר לא קיימת"],
  [/^"(.+)" isn't published yet$/, "«{1}» مش منشورة لسا|“{1}” isn't published yet|«{1}» עדיין לא פורסמה"],
  [/^"(.+)" needs "(.+)"$/, "«{1}» بدها «{2}»|“{1}” needs “{2}”|«{1}» צריכה את «{2}»"],
  [/^"(.+)" takes no "(.+)"$/, "«{1}» ما بتاخد «{2}»|“{1}” takes no “{2}”|«{1}» לא מקבלת «{2}»"],
  // An input's rules (backend lib/fnInputs.ts inputRuleProblems).
  [/^"(.+)": the least is more than the most$/, "المدخل «{1}»: «أقل شي» أكبر من «أكتر شي»|Input “{1}”: the least is more than the most|הקלט «{1}»: המינימום גדול מהמקסימום"],
  [/^"(.+)": the least and the most are for a number, words or a list$/, "المدخل «{1}»: «أقل شي» و«أكتر شي» بس لرقم أو كلام أو قائمة|Input “{1}”: the least and the most are for a number, words or a list|הקלט «{1}»: מינימום ומקסימום רק למספר, מילים או רשימה"],
  [/^"(.+)": how many is a whole number, 0 or more$/, "المدخل «{1}»: العدد رقم صحيح، صفر أو أكتر|Input “{1}”: how many is a whole number, 0 or more|הקלט «{1}»: הכמות היא מספר שלם, 0 או יותר"],
  [/^"(.+)": choices and a format are for words$/, "المدخل «{1}»: الخيارات والشكل بس للكلام|Input “{1}”: choices and a format are for words|הקלט «{1}»: אפשרויות ותבנית רק למילים"],
  [/^"(.+)": a choice can't be empty$/, "المدخل «{1}»: في خيار فاضي|Input “{1}”: a choice can't be empty|הקלט «{1}»: אפשרות לא יכולה להיות ריקה"],
  [/^"(.+)": a choice is there twice$/, "المدخل «{1}»: في خيار مكرر|Input “{1}”: a choice is there twice|הקלט «{1}»: אפשרות מופיעה פעמיים"],
  [/^"(.+)": choices or a format, not both$/, "المدخل «{1}»: يا خيارات يا شكل، مش التنين|Input “{1}”: choices or a format, not both|הקלט «{1}»: אפשרויות או תבנית, לא שתיהן"],
];

/** What an input's format is, in words. */
export const INPUT_FORMAT_NAME: Record<string, string> = {
  email: "إيميل|An email|אימייל",
  phone: "رقم تلفون|A phone number|מספר טלפון",
  url: "عنوان موقع (https://…)|A web address (https://…)|כתובת אתר (https://…)",
  date: "يوم (YYYY-MM-DD)|A day (YYYY-MM-DD)|יום (YYYY-MM-DD)",
};
const FORMAT_SAID: Record<string, string> = { "an email": "email", "a phone number": "phone", "a web address (https://…)": "url", "a day (YYYY-MM-DD)": "date" };
/** Why what was handed isn't right (backend lib/fnInputs.ts readInputs), as a run's failure or an address's 400 says it. */
const INPUT_SAID: Array<[RegExp, string | ((m: RegExpExecArray, lang: Lang) => string)]> = [
  [/^It needs "(.+)"$/, "ناقص «{1}»|“{1}” is needed|חסר «{1}»"],
  [/^"(.+)" has to be a number$/, "«{1}» لازم يكون رقم|“{1}” has to be a number|«{1}» חייב להיות מספר"],
  [/^"(.+)" has to be a list$/, "«{1}» لازم يكون قائمة|“{1}” has to be a list|«{1}» חייב להיות רשימה"],
  [/^"(.+)" is at least (.+)$/, "«{1}» أقل شي {2}|“{1}” is at least {2}|«{1}» לפחות {2}"],
  [/^"(.+)" is at most (.+)$/, "«{1}» أكتر شي {2}|“{1}” is at most {2}|«{1}» לכל היותר {2}"],
  [/^"(.+)" has at least (\d+) letters$/, "«{1}» أقل شي {2} حرف|“{1}” has at least {2} letters|«{1}» לפחות {2} תווים"],
  [/^"(.+)" has at most (\d+) letters$/, "«{1}» أكتر شي {2} حرف|“{1}” has at most {2} letters|«{1}» לכל היותר {2} תווים"],
  [/^"(.+)" has at least (\d+) things$/, "«{1}» فيها أقل شي {2}|“{1}” has at least {2} things|«{1}» מכילה לפחות {2}"],
  [/^"(.+)" has at most (\d+) things$/, "«{1}» فيها أكتر شي {2}|“{1}” has at most {2} things|«{1}» מכילה לכל היותר {2}"],
  [/^"(.+)" is one of: (.+)$/, "«{1}» واحد من: {2}|“{1}” is one of: {2}|«{1}» אחד מ: {2}"],
  [/^"(.+)" has to be (.+)$/, (m, lang) => fill("«{name}» لازم يكون: {what}|“{name}” has to be {what}|«{name}» חייב להיות: {what}", lang, { name: m[1], what: FORMAT_SAID[m[2]] ? part(INPUT_FORMAT_NAME[FORMAT_SAID[m[2]]], lang) : m[2] })],
];
/** An input that isn't right, in the admin's language (one it doesn't know stays as the server said it). */
export function inputSaid(message: string, lang: Lang): string | null {
  for (const [pattern, words] of INPUT_SAID) {
    const m = pattern.exec(message);
    if (m) return typeof words === "function" ? words(m, lang) : part(words, lang).replace(/\{(\d)\}/g, (_x, n: string) => m[Number(n)] ?? "");
  }
  return null;
}
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
  answered: "{0} جاوب {1}|{0} answered {1}|{0} ענה {1}",
  wouldCall: "كان رح يتصل: {0}|Would call {0}|הייתה נעשית קריאה: {0}",
  used: "انبعت عبر {0}|Sent through {0}|נשלח דרך {0}",
  wouldUse: "كان رح ينبعت عبر {0}|Would send through {0}|היה נשלח דרך {0}",
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
  // A ready connection's "no", with the service's own words for why (the owner's name for it first: it is theirs to read).
  [/^(.+?) "(.+)" answered (\d+): (.+)$/, "«{2}» ({1}) جاوب {3}: {4}|{1} “{2}” answered {3}: {4}|«{2}» ({1}) ענה {3}: {4}"],
  [/^(.+?) "(.+)" answered (\d+)$/, "«{2}» ({1}) جاوب {3}|{1} “{2}” answered {3}|«{2}» ({1}) ענה {3}"],
  // A kind that trades its key for a token (Google), refused at the trade.
  [/^(.+) refused the key: (.+)$/, "{1} رفض المفتاح: {2}|{1} refused the key: {2}|{1} דחה את המפתח: {2}"],
  [/^(.+) refused the key \((\d+)\)$/, "{1} رفض المفتاح ({2})|{1} refused the key ({2})|{1} דחה את המפתח ({2})"],
  [/^The key of "(.+)" can't be read/, "مفتاح «{1}» ما بينقرأ (تغيّر مفتاح السيرفر؟): حطّه من جديد|The key of “{1}” can't be read (was the server's key changed?): give it again|לא ניתן לקרוא את המפתח של «{1}» (מפתח השרת השתנה?): הזן אותו שוב"],
  [/^The spreadsheet is empty$/, "ما في شيت: حطّه بالخطوة أو كشيت معتاد بالاتصال|No spreadsheet: give one in the step, or as the connection's usual one|אין גיליון: ציין אחד בשלב, או כגיליון הרגיל של החיבור"],
  [/^The tab is empty$/, "ما في ورقة: حطّها بالخطوة أو كورقة معتادة بالاتصال|No tab: give one in the step, or as the connection's usual one|אין לשונית: ציין אחת בשלב, או כלשונית הרגילה של החיבור"],
  [/^The row is empty$/, "ما في خانات للسطر|The row has no cells|אין תאים בשורה"],
  // A generic API (another system): its step writes a path and what it sends.
  [/^The path is empty$/, "ما في مسار (متل /orders)|There is no path (like /orders)|אין נתיב (כמו /orders)"],
  [/^The path comes after the base address/, "المسار بيجي بعد العنوان الأساسي: /orders، مش عنوان كامل|The path comes after the base address: /orders, not a whole address|הנתיב בא אחרי הכתובת הבסיסית: /orders, לא כתובת שלמה"],
  [/^Each line of what is sent is name: value$/, "كل سطر باللي بينبعت: اسم: قيمة|Each line of what is sent is name: value|כל שורה במה שנשלח היא שם: ערך"],
  [/^What is sent isn't JSON/, "اللي بينبعت مش JSON (الاسم بين علامات تنصيص: \"{{input.total}}\")، أو اكتب كل سطر اسم: قيمة|What is sent isn't JSON (a name in it goes in quotes: \"{{input.total}}\"), or write a line a field, name: value|מה שנשלח אינו JSON (שם בתוכו במירכאות: \"{{input.total}}\"), או כתוב שורה לכל שדה, שם: ערך"],
  [/^"(.+)" has no address$/, "«{1}» ما إله عنوان: حطّه بالاتصال|“{1}” has no address: give it one in the connection|ל«{1}» אין כתובת: הוסף אותה בחיבור"],
  [/^(.+) answered (\d+)$/, "{1} جاوب {2}|{1} answered {2}|{1} ענה {2}"],
  [/^This connection isn't there any more$/, "هالاتصال ما عاد موجود|This connection isn't there any more|החיבור הזה כבר לא קיים"],
  [/^The chat is empty$/, "ما في محادثة ينبعتلها|There is no chat to send it to|אין צ׳אט לשלוח אליו"],
  [/^The text is empty$/, "النص فاضي|The text is empty|הטקסט ריק"],
  [/^A secret is only named in a step that calls a site$/, "السر بينكتب اسمه بس بخطوة «اتصال بموقع»|A secret is only named in a “call a site” step|סוד נקרא בשמו רק בשלב «קריאה לאתר»"],
  [/^"(.+)" isn't among the allowed sites$/, "«{1}» مش من المواقع المسموحة|“{1}” isn't among the allowed sites|«{1}» לא נמצא בין האתרים המותרים"],
  [/^The secret "(.+)" isn't for "(.+)"$/, "السر «{1}» مش لـ «{2}»|The secret “{1}” isn't for “{2}”|הסוד «{1}» לא מיועד ל«{2}»"],
  [/^No secret called "(.+)"$/, "ما في سر اسمه «{1}»|No secret called “{1}”|אין סוד בשם «{1}»"],
  [/^"(.+)" didn't answer in time$/, "«{1}» ما جاوب بالوقت|“{1}” didn't answer in time|«{1}» לא ענה בזמן"],
  [/^"(.+)" points inside the network: it isn't called$/, "«{1}» عنوانه جوّا الشبكة: ما بينتصل فيه|“{1}” points inside the network: it isn't called|«{1}» מפנה לתוך הרשת: לא קוראים לו"],
  [/^No site is found at "(.+)"$/, "ما في موقع بهالاسم: «{1}»|No site is found at “{1}”|לא נמצא אתר בשם «{1}»"],
  [/^"(.+)" couldn't be reached$/, "ما قدرنا نوصل لـ «{1}»|“{1}” couldn't be reached|לא ניתן היה להגיע אל «{1}»"],
  [/^A site is called by its name$/, "الموقع بينتصل فيه باسمه، مش بأرقام|A site is called by its name, not in numbers|לאתר קוראים בשמו, לא במספרים"],
  [/^A run calls sites up to (\d+) times$/, "التشغيل بيتصل بمواقع {1} مرات بالكتير|A run calls sites up to {1} times|הרצה קוראת לאתרים עד {1} פעמים"],
  [/^The code's machine (?:stopped|didn't start.*)$/, "قفص الكود وقف. جرّب كمان مرة|The code's cage stopped. Try again|הכלוב של הקוד נעצר. נסו שוב"],
];
/** Why a run stopped: the cage's own reasons in the admin's language, anything else as it was said. */
export function failText(error: string, lang: Lang): string {
  for (const [pattern, words] of CAGE_SAID) {
    const m = pattern.exec(error);
    if (m) return part(words, lang).replace(/\{(\d)\}/g, (_x, n: string) => m[Number(n)] ?? "");
  }
  // What it was handed (its inputs and their rules).
  return inputSaid(error, lang) ?? error;
}

/** Why one of a function's tests didn't pass. */
const TEST_WHY: Record<string, string> = {
  stopped: "وقفت، والمتوقّع إنها تمشي للآخر|It stopped, and was expected to go through|היא נעצרה, והציפייה הייתה שתעבור עד הסוף",
  wentThrough: "مشيت للآخر، والمتوقّع إنها توقف|It went through, and was expected to stop|היא עברה עד הסוף, והציפייה הייתה שתיעצר",
  value: "رجّعت جواب غير المتوقّع:|It gave back another answer than expected:|היא החזירה תשובה אחרת מהצפויה:",
  reason: "وقفت، بس لسبب غير المتوقّع|It stopped, but for another reason than expected|היא נעצרה, אבל מסיבה אחרת מהצפויה",
  time: "ما لحقت دورها: الاختبارات أخدت وقتها كله|It never got its turn: the tests used up their time|היא לא הגיעה לתורה: הבדיקות ניצלו את כל הזמן שלהן",
  shape: "مشيت، بس جوابها مش متل ما بتوعد:|It went through, but its answer isn't what it promises:|היא עברה, אבל התשובה אינה מה שהיא מבטיחה:",
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
  route: "عنوان من عندك (method ومسار)|An address of your own (a method and a path)|כתובת משלך (method ונתיב)",
};
/** What a good answer of an own address is sent with. */
export const ROUTE_STATUS_NAME: Record<number, string> = {
  200: "200 · الجواب|200 · the answer|200 · התשובה",
  201: "201 · انعمل جديد|201 · made|201 · נוצר",
  202: "202 · انقبل|202 · taken in|202 · התקבל",
  204: "204 · بلا جواب|204 · nothing|204 · ללא תוכן",
};
/** Why an own address wasn't kept (backend lib/fnTriggers.ts routePath, and two addresses alike), in the admin's language. */
const ROUTE_REFUSED: Array<[RegExp, string]> = [
  [/^The address needs a path, like orders\/:id$/, "العنوان بدّه مسار، متل orders/:id|The address needs a path, like orders/:id|לכתובת צריך נתיב, כמו orders/:id"],
  [/^A path is up to (\d+) letters$/, "المسار أكتر شي {1} حرف|A path is up to {1} letters|נתיב הוא עד {1} תווים"],
  [/^A path has up to (\d+) parts$/, "المسار أكتر شي {1} أجزاء|A path has up to {1} parts|לנתיב עד {1} חלקים"],
  [/^A path has no empty part \(\/\/\)$/, "المسار ما فيه جزء فاضي (//)|A path has no empty part (//)|לנתיב אין חלק ריק (//)"],
  [/^A path starts with a word, like orders\/:id$/, "المسار بيبلّش بكلمة، متل orders/:id|A path starts with a word, like orders/:id|נתיב מתחיל במילה, כמו orders/:id"],
  [/^":(.+)" is in the path twice$/, "«:{1}» موجود بالمسار مرتين|“:{1}” is in the path twice|«:{1}» מופיע בנתיב פעמיים"],
  [/^"(.+)" isn't a part of a path: .*$/, "«{1}» ما بينفع بالمسار: أحرف صغيرة، أرقام، . _ - أو ‎:اسم|“{1}” can't be in a path: small letters, digits, . _ - or :name|«{1}» לא יכול להיות בנתיב: אותיות קטנות, ספרות, . _ - או ‎:שם"],
  [/^Another address has this method and path$/, "في عنوان تاني بنفس الـ method والمسار|Another address has this method and path|לכתובת אחרת יש את אותם method ונתיב"],
];
export function routeRefusal(message: string, lang: Lang): string {
  for (const [pattern, words] of ROUTE_REFUSED) {
    const m = pattern.exec(message);
    if (m) return part(words, lang).replace(/\{(\d)\}/g, (_x, n: string) => m[Number(n)] ?? "");
  }
  return message;
}
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
  if (t.kind === "route") return `${String(c.method)} /${String(c.path)} · ${part(CALL_WHO_NAME[String(c.who) as keyof typeof CALL_WHO_NAME] ?? String(c.who), lang)}`;
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
  if (trigger.startsWith("route.")) return fill("عنوانك ({method})|Your address ({method})|הכתובת שלך ({method})", lang, { method: trigger.slice(6) });
  if (trigger.startsWith("row.")) return fill("سطر {what}|A row {what}|שורה {what}", lang, { what: part(ROW_EVENT_NAME[trigger.slice(4) as keyof typeof ROW_EVENT_NAME] ?? trigger.slice(4), lang) });
  if (trigger.startsWith("event.")) return part(EVENT_NAME[trigger.slice(6)] ?? trigger.slice(6), lang);
  return trigger;
}
