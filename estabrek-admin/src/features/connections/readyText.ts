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
};
/** What its key is, and what one looks like. */
const KEY_NAME: Record<string, string> = {
  telegram: "توكن البوت|The bot's token|הטוקן של הבוט",
  slack: "عنوان الـ webhook|The webhook's address|כתובת ה-webhook",
  google: "ملف مفتاح حساب الخدمة (JSON)|The service account's key file (JSON)|קובץ המפתח של חשבון השירות (JSON)",
  api: "مفتاح الـ API|The API key|מפתח ה-API",
};
const KEY_LOOKS: Record<string, string> = {
  telegram: "123456789:AAH…",
  slack: "https://hooks.slack.com/services/…",
  google: '{"type": "service_account", …}',
  api: "المفتاح اللي أعطاك ياه النظام (لـ Basic: name:password)",
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
/** A kind's settings: "kind.setting". */
const SETTING_NAME: Record<string, string> = {
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
};
/** A setting's choices: "kind.setting.choice". */
const CHOICE_NAME: Record<string, string> = {
  "api.auth.bearer": "Authorization: Bearer <المفتاح>|Authorization: Bearer <the key>|Authorization: Bearer <המפתח>",
  "api.auth.header": "بترويسة من عندك (متل X-API-Key)|In a header of yours (like X-API-Key)|בכותרת משלך (כמו X-API-Key)",
  "api.auth.basic": "اسم وكلمة سر (Basic)|A name and password (Basic)|שם וסיסמה (Basic)",
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
