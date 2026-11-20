// نسخ الزباين's words (the page is features/system/CopiesPage.tsx; the plan comes from backend lib/press.ts). A word
// the page has none for is shown as the server says it, so a fact or a check added there still shows.
import { say } from "../../studio/say";

/** Each part of a copy, by the service that holds it. */
const STEP: Record<string, string> = {
  neon: "قاعدة البيانات (Neon)|The database (Neon)|מסד הנתונים (Neon)",
  railway: "السيرفر (Railway)|The server (Railway)|השרת (Railway)",
  vercel: "المتجر (Vercel)|The shop (Vercel)|החנות (Vercel)",
  cloudflare: "لوحة الإدارة (Cloudflare Pages)|The admin (Cloudflare Pages)|לוח הניהול (Cloudflare Pages)",
  owner: "صاحب المتجر الجديد|The new store's owner|הבעלים של החנות החדשה",
};
const FACT: Record<string, string> = {
  project: "المشروع|Project|פרויקט",
  region: "المنطقة|Region|אזור",
  postgres: "Postgres|Postgres|Postgres",
  service: "الخدمة|Service|שירות",
  from: "من|From|מתוך",
  folder: "المجلد|Folder|תיקייה",
  before: "قبل كل نشر|Before each deploy|לפני כל פריסה",
  address: "العنوان|Address|כתובת",
  framework: "النوع|Framework|מסגרת",
  build: "البناء|Build|בנייה",
  output: "الناتج|Output|פלט",
  setup: "بتفتح على الإعداد (حسابه، وبعدين متجره)|Opens on its setup (their account, then the store)|נפתח על ההגדרה (החשבון שלו, ואז החנות)",
};
/** Where a secret's value comes from (a shown value needs no words). */
const FROM: Record<string, string> = {
  made: "سر جديد بينعمل للنسخة، وما بينعرض لحدا|A new secret made for the copy, shown to no one|סוד חדש שנוצר לעותק, לא מוצג לאף אחד",
  shared: "سر جديد بين السيرفر والمتجر، وما بينعرض لحدا|A new secret shared by the server and the shop, shown to no one|סוד חדש משותף לשרת ולחנות, לא מוצג לאף אחד",
  neon: "من Neon لما تنعمل القاعدة (فيه كلمة سرها)، وما بينعرض لحدا|From Neon when the database is made (it holds its password), shown to no one|מ-Neon כשמסד הנתונים נוצר (יש בו את הסיסמה שלו), לא מוצג לאף אחד",
};
/** What each check asks. */
const CHECK: Record<string, string> = {
  "neon.reach": "Neon بيجاوب على الاتصال|Neon answers the connection|Neon עונה לחיבור",
  "neon.connection": "اتصال Neon|A Neon connection|חיבור Neon",
  "railway.connection": "اتصال Railway|A Railway connection|חיבור Railway",
  "railway.token": "توكن Railway بيقدر يعمل مشروع|Railway's token can make a project|הטוקן של Railway יכול ליצור פרויקט",
  "railway.repo": "Railway بيوصل للمستودع على GitHub|Railway reaches the repository on GitHub|Railway מגיע למאגר ב-GitHub",
  "railway.domain": "عنوان السيرفر فاضي|The server's address is free|הכתובת של השרת פנויה",
  "vercel.connection": "اتصال Vercel|A Vercel connection|חיבור Vercel",
  "vercel.name": "اسم المتجر فاضي بـ Vercel|The shop's name is free at Vercel|שם החנות פנוי ב-Vercel",
  "cloudflare.connection": "اتصال Cloudflare|A Cloudflare connection|חיבור Cloudflare",
  "cloudflare.account": "اتصال Cloudflare إله Account ID|The Cloudflare connection has an Account ID|לחיבור Cloudflare יש Account ID",
  "cloudflare.name": "اسم الإدارة فاضي بـ Cloudflare Pages|The admin's name is free at Cloudflare Pages|שם הניהול פנוי ב-Cloudflare Pages",
};
/** The server's reasons, in the admin's words ({1}…: what the reason names). */
const WHY: Array<[RegExp, string]> = [
  [/^No connection to it is picked$/, "ما في اتصال مختار: وصّله بـ «الاتصالات والأسرار»، أو اختار واحد إذا في أكتر من واحد|No connection is picked: connect one in Connections & secrets, or pick one if there are several|לא נבחר חיבור: חברו אחד ב«חיבורים וסודות», או בחרו אחד אם יש כמה"],
  [/^A project's token can't make a new project/, "توكن مشروع واحد ما بيقدر يعمل مشروع جديد: وصّل توكن حسابك أو توكن workspace|One project's token can't make a new project: connect your account's token or a workspace's|טוקן של פרויקט אחד לא יכול ליצור פרויקט חדש: חברו טוקן של החשבון שלכם או של workspace"],
  [/^Railway can't reach (.+) on GitHub$/, "Railway ما بيوصل لـ {1} على GitHub: بـ Railway افتح Account Settings ← GitHub واسمحله بالمستودع|Railway can't reach {1} on GitHub: in Railway, open Account Settings → GitHub and let it reach the repository|Railway לא מגיע ל-{1} ב-GitHub: ב-Railway פתחו Account Settings ← GitHub ואפשרו לו גישה למאגר"],
  [/^"(.+)" is taken by a project of yours$/, "«{1}» محجوز لمشروع عندك: اختار اسم تاني|“{1}” is taken by a project of yours: pick another name|«{1}» תפוס על ידי פרויקט שלכם: בחרו שם אחר"],
  [/^Domain is not available$/, "العنوان محجوز: اختار اسم تاني للسيرفر|The address is taken: pick another name for the server|הכתובת תפוסה: בחרו שם אחר לשרת"],
  [/^(.+)\.up\.railway\.app is taken$/, "{1}.up.railway.app محجوز: اختار اسم تاني للسيرفر|{1}.up.railway.app is taken: pick another name for the server|{1}.up.railway.app תפוס: בחרו שם אחר לשרת"],
  [/^The Cloudflare connection has no Account ID$/, "اتصال Cloudflare ما إله Account ID: حطّه بإعدادات الاتصال|The Cloudflare connection has no Account ID: give it one in the connection's settings|לחיבור Cloudflare אין Account ID: הוסיפו אותו בהגדרות החיבור"],
  [/^It answered (\d+)$/, "جاوب {1}|It answered {1}|הוא ענה {1}"],
];
/** A refused name or repository, by the server's code. */
const REFUSED: Record<string, string> = {
  "A name is at least 3 letters": "الاسم 3 حروف عالأقل|A name is at least 3 letters|שם הוא לפחות 3 אותיות",
  "A name is at most 30 letters": "الاسم 30 حرف عالأكتر|A name is at most 30 letters|שם הוא לכל היותר 30 אותיות",
  "A name starts with a letter": "الاسم بيبلّش بحرف|A name starts with a letter|שם מתחיל באות",
  "A name is small letters, digits and single dashes, with no dash at the end": "الاسم حروف إنجليزي صغيرة وأرقام وشَرطات مفردة، وما بيخلص بشَرطة|A name is small letters, digits and single dashes, with no dash at the end|שם הוא אותיות לועזיות קטנות, ספרות ומקפים בודדים, בלי מקף בסוף",
  REPO_INVALID: "المستودع بينكتب owner/name متل ما بيورجيه GitHub|The repository is owner/name, as GitHub shows it|המאגר נכתב owner/name, כפי ש-GitHub מציג אותו",
  BRANCH_INVALID: "الفرع اسم متل main|The branch is a name like main|הענף הוא שם כמו main",
};

const words = (table: Record<string, string>, key: string, or: string) => (table[key] ? say(table[key]) : or);
export const stepName = (id: string) => words(STEP, id, id);
export const factName = (id: string) => words(FACT, id, id);
export const fromText = (from: string) => words(FROM, from, from);
export const checkName = (id: string) => words(CHECK, id, id);
export function whyText(why: string | null): string {
  if (!why) return "";
  for (const [re, text] of WHY) {
    const m = re.exec(why);
    if (m) return say(text).replace(/\{(\d)\}/g, (_, i: string) => m[Number(i)] ?? "");
  }
  return why;
}
/** Why the server refused a plan, in the page's words: which name, and what it should be. */
export function refusedText(data: { error?: string; message?: string; details?: { at?: string } } | undefined): string | null {
  if (!data) return null;
  if (data.error === "NAME_INVALID" && data.message) {
    const which = data.details?.at === "server" ? say("اسم السيرفر:|The server's name:|שם השרת:") : say("اسم الموقع:|The site's name:|שם האתר:");
    return `${which} ${REFUSED[data.message] ? say(REFUSED[data.message]) : data.message}`;
  }
  if (data.error && REFUSED[data.error]) return say(REFUSED[data.error]);
  return null;
}
/** A name as it is typed, made one (the server does the same): what the addresses will be made of. */
export const tidyName = (typed: string) =>
  typed
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
