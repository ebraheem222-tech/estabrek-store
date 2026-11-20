// Ready connections' words (the kinds themselves, with what each asks for and can do, come from
// the server: backend lib/fnKinds.ts). A kind or a field the page has no words for is shown by
// its own name, so a kind added on the server still works here.
import { say } from "../../studio/say";

/** The service, as it is called. */
const KIND_NAME: Record<string, string> = {
  telegram: "تلغرام|Telegram|טלגרם",
  slack: "Slack|Slack|Slack",
  google: "Google Sheets|Google Sheets|Google Sheets",
  api: "نظام تاني (API)|Another system (API)|מערכת אחרת (API)",
  neon: "Neon|Neon|Neon",
  railway: "Railway|Railway|Railway",
  vercel: "Vercel|Vercel|Vercel",
  cloudflare: "Cloudflare|Cloudflare|Cloudflare",
};
/** What its key is, and what one looks like. */
const KEY_NAME: Record<string, string> = {
  telegram: "توكن البوت|The bot's token|הטוקן של הבוט",
  slack: "عنوان الـ webhook|The webhook's address|כתובת ה-webhook",
  google: "ملف مفتاح حساب الخدمة (JSON)|The service account's key file (JSON)|קובץ המפתח של חשבון השירות (JSON)",
  api: "مفتاح الـ API|The API key|מפתח ה-API",
  neon: "مفتاح الـ API تبع Neon|Neon's API key|מפתח ה-API של Neon",
  railway: "توكن Railway|The Railway token|הטוקן של Railway",
  vercel: "توكن Vercel|The Vercel token|הטוקן של Vercel",
  cloudflare: "توكن الـ API تبع Cloudflare|Cloudflare's API token|טוקן ה-API של Cloudflare",
};
const KEY_LOOKS: Record<string, string> = {
  telegram: "123456789:AAH…",
  slack: "https://hooks.slack.com/services/…",
  google: '{"type": "service_account", …}',
  api: "المفتاح اللي أعطاك ياه النظام (لـ Basic: name:password)",
  neon: "napi_…",
  railway: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
};
/** Where the key comes from, step by step. */
const KIND_HOW: Record<string, string> = {
  telegram:
    "بتلغرام افتح @BotFather، اكتب ‎/newbot، وانسخ التوكن اللي بيعطيك ياه. بعدها ضيف البوت على المجموعة أو القناة اللي بدك يكتب فيها (أو ابعتله رسالة أول لو بدك يكتبلك إنت).|In Telegram open @BotFather, write /newbot, and copy the token it gives you. Then add the bot to the group or channel it should write in (or write to it first, if it should write to you).|בטלגרם פתחו את @BotFather, כתבו ‎/newbot והעתיקו את הטוקן שהוא נותן. אחר כך הוסיפו את הבוט לקבוצה או לערוץ שבו הוא אמור לכתוב (או כתבו לו קודם, אם הוא אמור לכתוב אליכם).",
  slack:
    "بـ Slack: ‏Apps ← Incoming Webhooks ← Add to Slack، اختار القناة، وانسخ العنوان (Webhook URL). كل عنوان لقناة وحدة.|In Slack: Apps → Incoming Webhooks → Add to Slack, pick the channel, and copy the address (Webhook URL). Each address is for one channel.|ב-Slack: ‏Apps ← Incoming Webhooks ← Add to Slack, בחרו ערוץ והעתיקו את הכתובת (Webhook URL). כל כתובת מיועדת לערוץ אחד.",
  google:
    "مرة وحدة بـ Google Cloud Console: اعمل مشروع، شغّل فيه «Google Sheets API»، وبعدين IAM ← Service Accounts ← Create، وجوّا الحساب Keys ← Add key ← JSON: بينزل ملف، اختاره هون. بعد ما توصل، المتجر بيعطيك إيميل الحساب: افتح الشيت ← Share ← حط الإيميل كـ Editor، متل ما بتشارك مع شخص.|Once, in Google Cloud Console: make a project, turn on “Google Sheets API” in it, then IAM → Service Accounts → Create, and in the account Keys → Add key → JSON: a file is downloaded, pick it here. Once connected, the store shows the account's email: open the sheet → Share → add that email as an Editor, as you would share with a person.|פעם אחת ב-Google Cloud Console: צור פרויקט, הפעל בו «Google Sheets API», ואז IAM ← Service Accounts ← Create, ובתוך החשבון Keys ← Add key ← JSON: יורד קובץ, בחר אותו כאן. אחרי החיבור החנות מציגה את האימייל של החשבון: פתח את הגיליון ← Share ← הוסף את האימייל כ-Editor, כמו שמשתפים עם אדם.",
  api:
    "لأي نظام إله API (برنامج محاسبة، مخزن، شركة شحن…): حط العنوان الأساسي اللي بيعطيك ياه النظام (متل https://erp.example.com/api)، والمفتاح، وكيف بينبعت المفتاح (بتلاقيها بصفحة الـ API عندهم). بعدها خطوة «ابعت باتصال جاهز» بتكتب فيها المسار بس (متل /orders) واللي بينبعت، والمفتاح ما بينكتب بالخطوة وما بيروح إلا لهالنظام. لازم يكون النظام على https بالمنفذ العادي.|For any system with an API (accounting, a warehouse, a shipping company…): give the base address the system gives (like https://erp.example.com/api), the key, and how the key is sent (it says so on their API page). A “send through a ready connection” step then writes only the path (like /orders) and what is sent; the key is never written in the step and goes to that system only. The system has to be on https at the standard port.|לכל מערכת עם API (הנהלת חשבונות, מחסן, חברת משלוחים…): הזן את הכתובת הבסיסית שהמערכת נותנת (כמו https://erp.example.com/api), את המפתח, ואיך המפתח נשלח (כתוב בעמוד ה-API שלהם). שלב «שליחה בחיבור מוכן» כותב רק את הנתיב (כמו /orders) ומה שנשלח; המפתח לא נכתב בשלב והולך רק למערכת הזו. המערכת צריכה להיות ב-https בפורט הרגיל.",
};
// Where the store itself is hosted: read, never changed (backend lib/fnKindsInfra.ts).
Object.assign(KIND_HOW, {
  neon:
    "قاعدة بيانات المتجر. بـ Neon Console: افتح Account settings ← API keys ← Create new API key وانسخه، أو من Organization settings ← API keys اعمل مفتاح للمنظمة كلها أو لمشروع واحد بس. المتجر بيقرأ فيه بس: المشاريع، فروعها، وإذا الـ compute صاحي أو نايم. ما بيغيّر شي، وما بيقرأ كلمات السر ولا عناوين الاتصال.|The store's database. In Neon Console: Account settings → API keys → Create new API key, and copy it; or, in Organization settings → API keys, make one for the whole organization or for one project only. The store only reads with it: the projects, their branches, and whether each compute is awake or asleep. It changes nothing, and never reads passwords or connection strings.|מסד הנתונים של החנות. ב-Neon Console: ‏Account settings ← API keys ← Create new API key, והעתיקו אותו; או ב-Organization settings ← API keys צרו מפתח לכל הארגון או לפרויקט אחד בלבד. החנות רק קוראת איתו: הפרויקטים, הענפים שלהם, ואם כל compute ער או ישן. היא לא משנה כלום, ולא קוראת סיסמאות או מחרוזות חיבור.",
  railway:
    "سيرفر المتجر (الـ API). بـ Railway: افتح Account Settings ← Tokens ← Create، ولو المشاريع بـ workspace اختارها وانت عم تعمل التوكن. أو من إعدادات مشروع ← Tokens اعمل توكن لمشروع واحد وبيئة وحدة. اختار تحت لمين التوكن. المتجر بيقرأ المشاريع وخدماتها وكيف كان آخر نشر لكل وحدة. ما بيقرأ المتغيرات (Variables) أبداً، وما بيغيّر شي.|The store's server (the API). In Railway: Account Settings → Tokens → Create; if the projects are in a workspace, pick it while making the token. Or, in a project's Settings → Tokens, make one for a single project and environment. Pick below whose token it is. The store reads the projects, their services and how each one's last deploy went. It never reads the Variables, and changes nothing.|השרת של החנות (ה-API). ב-Railway: ‏Account Settings ← Tokens ← Create; אם הפרויקטים ב-workspace, בחרו אותו כשיוצרים את הטוקן. או, ב-Settings ← Tokens של פרויקט, צרו טוקן לפרויקט וסביבה אחת. בחרו למטה של מי הטוקן. החנות קוראת את הפרויקטים, השירותים שלהם ואיך עברה הפריסה האחרונה של כל אחד. היא לעולם לא קוראת את ה-Variables, ולא משנה כלום.",
  vercel:
    "صفحات المتجر. بـ Vercel: افتح Account Settings ← Tokens ← Create، واختار الـ Scope اللي فيه مشاريعك. إذا المشاريع بفريق، حط تحت الـ id تبع الفريق (team_…) أو اسمه اللي بالعنوان. المتجر بيقرأ المشاريع وعمليات النشر وإذا نجحت. ما بيقرأ متغيرات البيئة (Environment Variables)، وما بيغيّر شي.|The shop's pages. In Vercel: Account Settings → Tokens → Create, and pick the Scope your projects are in. If they are in a team, give the team's id (team_…) or the name in its address below. The store reads the projects, their deploys and whether they went well. It never reads Environment Variables, and changes nothing.|דפי החנות. ב-Vercel: ‏Account Settings ← Tokens ← Create, ובחרו את ה-Scope שבו הפרויקטים שלכם. אם הם בצוות, הזינו למטה את המזהה של הצוות (team_…) או את השם שבכתובת שלו. החנות קוראת את הפרויקטים, את הפריסות שלהם ואם הצליחו. היא לעולם לא קוראת Environment Variables, ולא משנה כלום.",
  cloudflare:
    "صفحات الإدارة وأسماء المواقع. بـ Cloudflare: افتح My Profile ← API Tokens ← Create Token ← Custom token، وأعطيه قراءة بس: Account ← Cloudflare Pages ← Read، وAccount ← Workers Scripts ← Read، وZone ← Zone ← Read. وحط تحت رقم الحساب (Account ID): بتلاقيه بصفحة الحساب الرئيسية. المتجر بيقرأ المشاريع وآخر نشر والأسماء. ما بيقرأ متغيرات البيئة، وما بيغيّر شي.|The admin's pages and the site names. In Cloudflare: My Profile → API Tokens → Create Token → Custom token, and give it reading only: Account → Cloudflare Pages → Read, Account → Workers Scripts → Read, Zone → Zone → Read. Then give the Account ID below: it is on the account's home page. The store reads the projects, their last deploys and the names. It never reads environment variables, and changes nothing.|דפי הניהול ושמות האתרים. ב-Cloudflare: ‏My Profile ← API Tokens ← Create Token ← Custom token, ותנו לו קריאה בלבד: ‏Account ← Cloudflare Pages ← Read, ‏Account ← Workers Scripts ← Read, ‏Zone ← Zone ← Read. אחר כך הזינו למטה את ה-Account ID: הוא מופיע בעמוד הבית של החשבון. החנות קוראת את הפרויקטים, הפריסות האחרונות שלהם ואת השמות. היא לעולם לא קוראת משתני סביבה, ולא משנה כלום.",
});
/** A kind's settings: "kind.setting". */
const SETTING_NAME: Record<string, string> = {
  "neon.org": "المنظمة|The organization|הארגון",
  "neon.project": "المشروع المعتاد|The usual project|הפרויקט הרגיל",
  "railway.token": "لمين التوكن|Whose token it is|של מי הטוקן",
  "railway.workspace": "الـ workspace|The workspace|ה-workspace",
  "vercel.team": "الفريق|The team|הצוות",
  "cloudflare.account": "رقم الحساب (Account ID)|The Account ID|ה-Account ID",
  "telegram.chat": "المحادثة المعتادة|The usual chat|הצ׳אט הרגיל",
  "google.sheet": "الشيت المعتاد|The usual spreadsheet|הגיליון הרגיל",
  "google.tab": "الورقة المعتادة|The usual tab|הלשונית הרגילה",
  "google.account": "شارك الشيت مع|Share the sheet with|שתף את הגיליון עם",
  "api.base": "العنوان الأساسي|The base address|הכתובת הבסיסית",
  "api.auth": "كيف بينبعت المفتاح|How the key is sent|איך המפתח נשלח",
  "api.header": "اسم الترويسة|The header's name|שם הכותרת",
  "api.check": "مسار للتجربة|A path to try|נתיב לבדיקה",
};
const SETTING_HINT: Record<string, string> = {
  "telegram.chat": "رقمها أو @اسم القناة (اختياري)|its number, or @channelname (optional)|המספר שלו, או @שם_הערוץ (לא חובה)",
  "google.sheet": "رابط الشيت من المتصفح (اختياري)|the sheet's link from the browser (optional)|הקישור לגיליון מהדפדפן (לא חובה)",
  "google.tab": "اسم الورقة تحت، متل Sheet1 (اختياري)|the tab's name at the bottom, like Sheet1 (optional)|שם הלשונית למטה, כמו Sheet1 (לא חובה)",
  "api.base": "https://erp.example.com/api",
  "api.header": "X-API-Key",
  "api.check": "/me (اختياري؛ فاضي = العنوان الأساسي)|/me (optional; empty = the base address)|/me (לא חובה; ריק = הכתובת הבסיסית)",
  "neon.org": "org-… (اختياري؛ فاضي = كل منظماتك)|org-… (optional; empty = all your organizations)|org-… (לא חובה; ריק = כל הארגונים שלך)",
  "neon.project": "الـ id، متل cool-sky-12345678 (اختياري)|its id, like cool-sky-12345678 (optional)|המזהה, כמו cool-sky-12345678 (לא חובה)",
  "railway.workspace": "الـ id تبع الـ workspace (اختياري)|the workspace's id (optional)|המזהה של ה-workspace (לא חובה)",
  "vercel.team": "team_… أو اسم الفريق (اختياري)|team_… or the team's name (optional)|team_… או שם הצוות (לא חובה)",
  "cloudflare.account": "32 حرف ورقم|32 letters and digits|32 אותיות וספרות",
};
/** A setting's choices: "kind.setting.choice". */
const CHOICE_NAME: Record<string, string> = {
  "api.auth.bearer": "Authorization: Bearer <المفتاح>|Authorization: Bearer <the key>|Authorization: Bearer <המפתח>",
  "api.auth.header": "بترويسة من عندك (متل X-API-Key)|In a header of yours (like X-API-Key)|בכותרת משלך (כמו X-API-Key)",
  "api.auth.basic": "اسم وكلمة سر (Basic)|A name and password (Basic)|שם וסיסמה (Basic)",
  "railway.token.account": "توكن حسابي|My account's token|הטוקן של החשבון שלי",
  "railway.token.workspace": "توكن workspace (فريق)|A workspace's (team's) token|טוקן של workspace (צוות)",
  "railway.token.project": "توكن مشروع واحد|One project's token|טוקן של פרויקט אחד",
};
/** What a kind can do: "kind.action". */
const ACTION_NAME: Record<string, string> = {
  "telegram.message": "ابعت رسالة|Send a message|שליחת הודעה",
  "slack.message": "ابعت رسالة|Send a message|שליחת הודעה",
  "google.append": "ضيف سطر|Add a row|הוספת שורה",
  "google.read": "اقرأ سطور|Read rows|קריאת שורות",
  "api.get": "اجلب (GET)|Fetch (GET)|שליפה (GET)",
  "api.post": "ابعت جديد (POST)|Send something new (POST)|שליחת חדש (POST)",
  "api.put": "بدّل (PUT)|Replace (PUT)|החלפה (PUT)",
  "api.patch": "عدّل (PATCH)|Change (PATCH)|שינוי (PATCH)",
  "api.delete": "احذف (DELETE)|Delete (DELETE)|מחיקה (DELETE)",
  "neon.projects": "اقرأ المشاريع|Read the projects|קריאת הפרויקטים",
  "neon.branches": "اقرأ فروع مشروع|Read a project's branches|קריאת הענפים של פרויקט",
  "neon.computes": "اقرأ الـ computes (صاحي أو نايم)|Read the computes (awake or asleep)|קריאת ה-computes (ער או ישן)",
  "railway.projects": "اقرأ المشاريع|Read the projects|קריאת הפרויקטים",
  "railway.status": "حالة مشروع (خدماته وآخر نشر)|A project's status (its services, last deploys)|מצב פרויקט (השירותים, הפריסות האחרונות)",
  "railway.deployments": "اقرأ آخر عمليات النشر|Read the latest deploys|קריאת הפריסות האחרונות",
  "vercel.projects": "اقرأ المشاريع|Read the projects|קריאת הפרויקטים",
  "vercel.deployments": "اقرأ آخر عمليات النشر|Read the latest deploys|קריאת הפריסות האחרונות",
  "cloudflare.pages": "اقرأ مشاريع Pages|Read the Pages projects|קריאת פרויקטי Pages",
  "cloudflare.deployments": "اقرأ نشرات مشروع Pages|Read a Pages project's deploys|קריאת הפריסות של פרויקט Pages",
  "cloudflare.workers": "اقرأ الـ Workers|Read the Workers|קריאת ה-Workers",
  "cloudflare.zones": "اقرأ الأسماء (Zones)|Read the domains (zones)|קריאת הדומיינים (zones)",
};
/** What that asks for: "kind.field". */
const FIELD_NAME: Record<string, string> = {
  "telegram.chat": "لأي محادثة|To which chat|לאיזה צ׳אט",
  "telegram.text": "نص الرسالة|The message|ההודעה",
  "slack.text": "نص الرسالة|The message|ההודעה",
  "google.sheet": "بأي شيت|Which spreadsheet|איזה גיליון",
  "google.tab": "بأي ورقة|Which tab|איזו לשונית",
  "google.cells": "خانات السطر (كل سطر هون خانة)|The row's cells (one a line)|תאי השורה (תא בכל שורה)",
  "google.range": "أي خانات (متل A1:D100، فاضي = كل الورقة)|Which cells (like A1:D100; empty = the whole tab)|אילו תאים (כמו A1:D100; ריק = כל הלשונית)",
  "api.path": "المسار بعد العنوان الأساسي (متل /orders)|The path after the base address (like /orders)|הנתיב אחרי הכתובת הבסיסית (כמו /orders)",
  "api.body": "اللي بينبعت (كل سطر اسم: قيمة، أو JSON)|What is sent (a line a field, name: value; or JSON)|מה שנשלח (שורה לכל שדה, שם: ערך; או JSON)",
  "neon.project": "أي مشروع (الـ id؛ فاضي = المعتاد)|Which project (its id; empty = the usual one)|איזה פרויקט (המזהה; ריק = הרגיל)",
  "railway.workspace": "أي workspace (اختياري)|Which workspace (optional)|איזה workspace (לא חובה)",
  "railway.project": "أي مشروع (الـ id)|Which project (its id)|איזה פרויקט (המזהה)",
  "railway.service": "أي خدمة (الـ id، اختياري)|Which service (its id, optional)|איזה שירות (המזהה, לא חובה)",
  "railway.environment": "أي بيئة (الـ id، اختياري)|Which environment (its id, optional)|איזו סביבה (המזהה, לא חובה)",
  "vercel.project": "أي مشروع (الـ id أو الاسم، اختياري)|Which project (its id or name, optional)|איזה פרויקט (המזהה או השם, לא חובה)",
  "vercel.target": "لوين (production، اختياري)|Where to (production; optional)|לאן (production; לא חובה)",
  "cloudflare.account": "أي حساب (Account ID؛ فاضي = المعتاد)|Which account (Account ID; empty = the usual one)|איזה חשבון (Account ID; ריק = הרגיל)",
  "cloudflare.project": "أي مشروع Pages (اسمه)|Which Pages project (its name)|איזה פרויקט Pages (השם שלו)",
};

/** What a look found, by kind of thing ("projects"). */
const GROUP_NAME: Record<string, string> = {
  projects: "المشاريع|Projects|פרויקטים",
  pages: "مشاريع Pages|Pages projects|פרויקטי Pages",
  workers: "الـ Workers|Workers|Workers",
  zones: "الأسماء (Zones)|Domains (zones)|דומיינים (zones)",
};
/** A fact about a thing shown ("region"). A flag ("default") is shown by its name alone. */
const FACT_NAME: Record<string, string> = {
  region: "المنطقة|Region|אזור",
  postgres: "Postgres|Postgres|Postgres",
  default: "الأساسي|Default|ברירת מחדל",
  protected: "محمي|Protected|מוגן",
  compute: "الحجم|Size|גודל",
  workspace: "Workspace|Workspace|Workspace",
  environment: "البيئة|Environment|סביבה",
  target: "لوين|Target|יעד",
  branch: "الفرع|Branch|ענף",
  commit: "Commit|Commit|Commit",
  domains: "الأسماء|Domains|דומיינים",
  plan: "الخطة|Plan|תוכנית",
};
/** How a thing is going, in a word. */
const TONE_NAME: Record<string, string> = {
  good: "شغّال|Working|עובד",
  bad: "فيه مشكلة|Has a problem|יש בעיה",
  busy: "عم يشتغل عليه|In progress|בתהליך",
  idle: "نايم أو موقّف|Asleep or stopped|ישן או עצור",
};

/**
 * A service account's key file, read here only to say whose it is: its address, or null when the
 * file isn't one. The file goes to the server as it is (the server checks it again and keeps it).
 */
export function keyFileAccount(text: string): string | null {
  try {
    const file = JSON.parse(text) as { type?: unknown; client_email?: unknown; private_key?: unknown };
    return file.type === "service_account" && typeof file.client_email === "string" && typeof file.private_key === "string" && file.client_email.includes("@") ? file.client_email : null;
  } catch {
    return null;
  }
}

const words = (table: Record<string, string>, key: string, or: string) => (table[key] ? say(table[key]) : or);
export const kindName = (kind: string, label?: string) => words(KIND_NAME, kind, label ?? kind);
export const keyName = (kind: string) => words(KEY_NAME, kind, say("المفتاح|The key|המפתח"));
export const keyLooks = (kind: string) => KEY_LOOKS[kind] ?? "";
export const kindHow = (kind: string) => words(KIND_HOW, kind, "");
export const settingName = (kind: string, id: string) => words(SETTING_NAME, `${kind}.${id}`, id);
export const settingHint = (kind: string, id: string) => words(SETTING_HINT, `${kind}.${id}`, "");
export const choiceName = (kind: string, setting: string, choice: string) => words(CHOICE_NAME, `${kind}.${setting}.${choice}`, choice);
export const actionName = (kind: string, id: string) => words(ACTION_NAME, `${kind}.${id}`, id);
export const fieldName = (kind: string, id: string) => words(FIELD_NAME, `${kind}.${id}`, id);
export const lookGroupName = (id: string) => words(GROUP_NAME, id, id);
export const factName = (id: string) => words(FACT_NAME, id, id);
export const toneName = (tone: string) => words(TONE_NAME, tone, tone);
