// Ready connections' words (the kinds themselves, with what each asks for and can do, come from
// the server: backend lib/fnKinds.ts). A kind or a field the page has no words for is shown by
// its own name, so a kind added on the server still works here.
import { say } from "../../studio/say";

/** The service, as it is called. */
const KIND_NAME: Record<string, string> = {
  telegram: "تلغرام|Telegram|טלגרם",
  slack: "Slack|Slack|Slack",
};
/** What its key is, and what one looks like. */
const KEY_NAME: Record<string, string> = {
  telegram: "توكن البوت|The bot's token|הטוקן של הבוט",
  slack: "عنوان الـ webhook|The webhook's address|כתובת ה-webhook",
};
const KEY_LOOKS: Record<string, string> = {
  telegram: "123456789:AAH…",
  slack: "https://hooks.slack.com/services/…",
};
/** Where the key comes from, step by step. */
const KIND_HOW: Record<string, string> = {
  telegram:
    "بتلغرام افتح @BotFather، اكتب ‎/newbot، وانسخ التوكن اللي بيعطيك ياه. بعدها ضيف البوت على المجموعة أو القناة اللي بدك يكتب فيها (أو ابعتله رسالة أول لو بدك يكتبلك إنت).|In Telegram open @BotFather, write /newbot, and copy the token it gives you. Then add the bot to the group or channel it should write in (or write to it first, if it should write to you).|בטלגרם פתחו את @BotFather, כתבו ‎/newbot והעתיקו את הטוקן שהוא נותן. אחר כך הוסיפו את הבוט לקבוצה או לערוץ שבו הוא אמור לכתוב (או כתבו לו קודם, אם הוא אמור לכתוב אליכם).",
  slack:
    "بـ Slack: ‏Apps ← Incoming Webhooks ← Add to Slack، اختار القناة، وانسخ العنوان (Webhook URL). كل عنوان لقناة وحدة.|In Slack: Apps → Incoming Webhooks → Add to Slack, pick the channel, and copy the address (Webhook URL). Each address is for one channel.|ב-Slack: ‏Apps ← Incoming Webhooks ← Add to Slack, בחרו ערוץ והעתיקו את הכתובת (Webhook URL). כל כתובת מיועדת לערוץ אחד.",
};
/** A kind's settings: "kind.setting". */
const SETTING_NAME: Record<string, string> = {
  "telegram.chat": "المحادثة المعتادة|The usual chat|הצ׳אט הרגיל",
};
const SETTING_HINT: Record<string, string> = {
  "telegram.chat": "رقمها أو @اسم القناة (اختياري)|its number, or @channelname (optional)|המספר שלו, או @שם_הערוץ (לא חובה)",
};
/** What a kind can do: "kind.action". */
const ACTION_NAME: Record<string, string> = {
  "telegram.message": "ابعت رسالة|Send a message|שליחת הודעה",
  "slack.message": "ابعت رسالة|Send a message|שליחת הודעה",
};
/** What that asks for: "kind.field". */
const FIELD_NAME: Record<string, string> = {
  "telegram.chat": "لأي محادثة|To which chat|לאיזה צ׳אט",
  "telegram.text": "نص الرسالة|The message|ההודעה",
  "slack.text": "نص الرسالة|The message|ההודעה",
};

const words = (table: Record<string, string>, key: string, or: string) => (table[key] ? say(table[key]) : or);
export const kindName = (kind: string, label?: string) => words(KIND_NAME, kind, label ?? kind);
export const keyName = (kind: string) => words(KEY_NAME, kind, say("المفتاح|The key|המפתח"));
export const keyLooks = (kind: string) => KEY_LOOKS[kind] ?? "";
export const kindHow = (kind: string) => words(KIND_HOW, kind, "");
export const settingName = (kind: string, id: string) => words(SETTING_NAME, `${kind}.${id}`, id);
export const settingHint = (kind: string, id: string) => words(SETTING_HINT, `${kind}.${id}`, "");
export const actionName = (kind: string, id: string) => words(ACTION_NAME, `${kind}.${id}`, id);
export const fieldName = (kind: string, id: string) => words(FIELD_NAME, `${kind}.${id}`, id);
