// نسخ الزباين's words (the page is features/system/CopiesPage.tsx; the plan comes from backend lib/press.ts). A word
// the page has none for is shown as the server says it, so a fact or a check added there still shows.
import { say } from "../../studio/say";
import { adminLang } from "../../lib/lang";
import { siteByKey } from "../../studio/templates/sites";
import { siteKindName } from "../setup/siteSetup";

/** Each part of a copy, by the service that holds it. */
const STEP: Record<string, string> = {
  neon: "قاعدة البيانات (Neon)|The database (Neon)|מסד הנתונים (Neon)",
  railway: "السيرفر (Railway)|The server (Railway)|השרת (Railway)",
  vercel: "المتجر (Vercel)|The shop (Vercel)|החנות (Vercel)",
  cloudflare: "لوحة الإدارة (Cloudflare Pages)|The admin (Cloudflare Pages)|לוח הניהול (Cloudflare Pages)",
  owner: "حساب صاحب المتجر الجديد|The new store owner's account|החשבון של הבעלים של החנות החדשה",
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
  account: "بينعمل على السيرفر أول ما يشتغل، بالإيميل وكلمة السر اللي بتكتبهم تحت|Made on the server as soon as it runs, with the email and password you type below|נוצר בשרת ברגע שהוא עולה, עם האימייל והסיסמה שתכתבו למטה",
  signin: "بيفوت من هون|Signs in here|נכנס מכאן",
  opens: "إعداده بيفتح على|Its setup opens on|ההגדרה שלו נפתחת על",
};
/** The site a copy's setup opens on, by its kind («مطعم»); a key this admin doesn't know, as it is. */
export function startSiteName(key: string): string {
  const bp = siteByKey(key);
  return bp ? siteKindName(bp, adminLang()) : key;
}

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
  "vercel.address": "عنوان المتجر مش لحدا تاني على Vercel|The shop's address is no one else's at Vercel|הכתובת של החנות לא של מישהו אחר ב-Vercel",
  "cloudflare.connection": "اتصال Cloudflare|A Cloudflare connection|חיבור Cloudflare",
  "cloudflare.account": "اتصال Cloudflare إله Account ID|The Cloudflare connection has an Account ID|לחיבור Cloudflare יש Account ID",
  "cloudflare.name": "اسم الإدارة فاضي بـ Cloudflare Pages|The admin's name is free at Cloudflare Pages|שם הניהול פנוי ב-Cloudflare Pages",
  "cloudflare.address": "عنوان الإدارة مش لحدا تاني على Cloudflare|The admin's address is no one else's at Cloudflare|הכתובת של הניהול לא של מישהו אחר ב-Cloudflare",
  "cloudflare.adopt": "الموقع اللي طلب موجود بحساب Cloudflare وعلى نفس العنوان|The site that asked is in the Cloudflare account, at the same address|האתר שביקש נמצא בחשבון Cloudflare, באותה כתובת",
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
  [/^(.+)\.vercel\.app is someone else's$/, "{1}.vercel.app لحدا تاني على Vercel: اختار اسم تاني للموقع|{1}.vercel.app is someone else's at Vercel: pick another name for the site|{1}.vercel.app שייך למישהו אחר ב-Vercel: בחרו שם אחר לאתר"],
  [/^(.+)\.pages\.dev is someone else's$/, "{1}.pages.dev لحدا تاني على Cloudflare: اختار اسم تاني للموقع|{1}.pages.dev is someone else's at Cloudflare: pick another name for the site|{1}.pages.dev שייך למישהו אחר ב-Cloudflare: בחרו שם אחר לאתר"],
  [/^No Pages project "(.+)" in this Cloudflare account$/, "ما في مشروع Pages اسمه «{1}» بحساب Cloudflare الموصول: تأكد إنو الموقع بنفس الحساب|No Pages project “{1}” in the connected Cloudflare account: make sure the site is in that account|אין פרויקט Pages בשם «{1}» בחשבון Cloudflare המחובר: ודאו שהאתר באותו חשבון"],
  [/^The Pages project "(.+)" isn't at (.+)$/, "مشروع Pages «{1}» مش على العنوان {2}: هاد مش الموقع اللي طلب|The Pages project “{1}” isn't at {2}: it isn't the site that asked|פרויקט ה-Pages «{1}» לא בכתובת {2}: זה לא האתר שביקש"],
  [/^The server didn't answer in time/, "السيرفر ما اشتغل بالوقت: يمكن أول نشر إله فشل، شوفه بـ Railway، وبعدين جرّب كمان مرة من هون|The server didn't come up in time: its first deploy may have failed, see it at Railway, then try again from here|השרת לא עלה בזמן: אולי הפריסה הראשונה שלו נכשלה, ראו אותה ב-Railway, ואז נסו שוב מכאן"],
  [/^The setup code isn't right$/, "السيرفر ما قبل كود الإعداد: جرّب كمان مرة من هون|The server didn't take the setup code: try again from here|השרת לא קיבל את קוד ההגדרה: נסו שוב מכאן"],
  [/^"(.+)" didn't answer in time$/, "«{1}» ما جاوب بالوقت: جرّب كمان مرة|“{1}” didn't answer in time: try again|«{1}» לא ענה בזמן: נסו שוב"],
  [/^The server stopped while doing it$/, "السيرفر وقف وهو بيعمل هالخطوة: جرّب كمان مرة من هون|The server stopped while doing this step: try again from here|השרת נעצר באמצע השלב הזה: נסו שוב מכאן"],
  [/^Something went wrong here$/, "صار خطأ بهالخطوة: جرّب كمان مرة، وإذا رجع، شوف سجل السيرفر|Something went wrong in this step: try again, and if it comes back, look at the server's log|משהו השתבש בשלב הזה: נסו שוב, ואם זה חוזר, הסתכלו ביומן של השרת"],
  [/^It answered (\d+)$/, "جاوب {1}|It answered {1}|הוא ענה {1}"],
];

/** Each step of making a copy (backend lib/pressMake.ts MAKE_STEPS). */
const MAKE: Record<string, string> = {
  "neon.project": "قاعدة البيانات بـ Neon|The database at Neon|מסד הנתונים ב-Neon",
  "railway.project": "مشروع السيرفر بـ Railway|The server's project at Railway|הפרויקט של השרת ב-Railway",
  "railway.service": "خدمة السيرفر: مجلده، وتجهيز القاعدة قبل كل نشر|The server's service: its folder, and the database brought up to date before each deploy|השירות של השרת: התיקייה שלו, ועדכון מסד הנתונים לפני כל פריסה",
  "railway.domain": "عنوان السيرفر|The server's address|הכתובת של השרת",
  "vercel.project": "مشروع المتجر بـ Vercel|The shop's project at Vercel|הפרויקט של החנות ב-Vercel",
  "cloudflare.project": "مشروع الإدارة بـ Cloudflare Pages|The admin's project at Cloudflare Pages|הפרויקט של הניהול ב-Cloudflare Pages",
  "vercel.deploy": "متغيرات المتجر وأول نشر إله|The shop's variables and its first deploy|המשתנים של החנות והפריסה הראשונה שלה",
  "cloudflare.deploy": "أول نشر للإدارة|The admin's first deploy|הפריסה הראשונה של הניהול",
  "railway.variables": "متغيرات السيرفر، مع عنوان قاعدته|The server's variables, with its database's address|המשתנים של השרת, עם הכתובת של מסד הנתונים שלו",
  "railway.deploy": "السيرفر مربوط بالمستودع، وأول نشر إله|The server linked to the repository, and its first deploy|השרת מחובר למאגר, והפריסה הראשונה שלו",
  "owner.account": "حساب صاحب المتجر على السيرفر (بيستنى أول نشر، كم دقيقة)|The owner's account on the server (it waits for the first deploy, a few minutes)|החשבון של הבעלים בשרת (מחכה לפריסה הראשונה, כמה דקות)",
  "railway.addresses": "السيرفر بيعرف عناوين المتجر والإدارة|The server told the shop's and the admin's addresses|השרת מקבל את הכתובות של החנות והניהול",
};
const STEP_STATE: Record<string, string> = {
  waiting: "لسا|Not yet|עוד לא",
  doing: "عم ينعمل…|Being made…|בתהליך…",
  done: "خلص|Done|בוצע",
  failed: "وقف هون|Stopped here|נעצר כאן",
};
const COPY_STATE: Record<string, string> = {
  making: "عم تنعمل|Being made|בתהליך יצירה",
  stopped: "وقفت|Stopped|נעצר",
  made: "انعملت|Made|נוצר",
};
export const makeStepName = (id: string) => words(MAKE, id, id);
export const stepStateName = (state: string) => words(STEP_STATE, state, state);
export const copyStateName = (state: string) => words(COPY_STATE, state, state);
/** Why the server didn't make a copy, in the page's words. */
export function makeRefusedText(data: { error?: string; message?: string } | undefined): string | null {
  if (!data?.error) return null;
  if (data.error === "COPY_EXISTS") return say("في نسخة بهالاسم معمولة أو عم تنعمل: كمّلها من فوق، أو اختار اسم تاني.|A copy with this name is made or being made: carry it on from above, or pick another name.|יש עותק בשם הזה שנוצר או בתהליך: המשיכו אותו מלמעלה, או בחרו שם אחר.");
  if (data.error === "COPY_NOT_READY") return say("خدمة من الخدمات قالت لأ هلأ: شوف الفحص من جديد تحت.|A service says no now: see the checks again below.|אחד השירותים אומר לא עכשיו: ראו את הבדיקות שוב למטה.");
  if (data.error === "COPY_MAKING") return say("هالنسخة عم تنعمل هلأ.|This copy is being made now.|העותק הזה נוצר עכשיו.");
  if (data.error === "ASK_NOT_WAITING") return say("هالموقع ما عاد عم يستنى: يمكن انقبل أو انرفض من قبل.|This site isn't waiting any more: it may have been said yes or no to already.|האתר הזה כבר לא מחכה: אולי כבר אושר או נדחה.");
  return null;
}
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
