/**
 * Webhooks طالعة, the pure parts (tested): what each event and each state is called, what the
 * server's words for a failed delivery mean, an address checked as it is typed, and the few
 * lines a receiver needs to check a delivery's signature. Words are "ar|en|he" (say() picks).
 */
import type { Delivery, Endpoint } from "../../api/webhooks.api";

export type Lang = "ar" | "en" | "he";
const AT: Record<Lang, number> = { ar: 0, en: 1, he: 2 };
const part = (words: string, lang: Lang) => words.split("|")[AT[lang]] ?? words;

export const EVENT_NAME: Record<string, string> = {
  "row.added": "سطر انضاف|A row was added|שורה נוספה",
  "row.changed": "سطر تعدّل|A row was changed|שורה שונתה",
  "row.deleted": "سطر انحذف|A row was deleted|שורה נמחקה",
  "order.created": "طلب جديد|A new order|הזמנה חדשה",
  "stock.low": "مخزون قليل|Stock is low|מלאי נמוך",
  "video.ready": "فيديو جهز|A video is ready|וידאו מוכן",
  "product.viral": "منتج عم ينتشر|A product is taking off|מוצר ויראלי",
  "job.failing": "مهمة بالخلفية عم تفشل|A background job keeps failing|משימת רקע נכשלת",
  "deploy.failed": "النشر فشل|A deploy failed|פריסה נכשלה",
  ping: "تجربة|A test|בדיקה",
};
/** An event by the name the owner knows; one the page doesn't know, as the server calls it. */
export const eventName = (event: string) => EVENT_NAME[event] ?? `${event}|${event}|${event}`;

export type State = "on" | "off" | "paused";
/** Switched on, switched off by the owner, or paused by the server after its deliveries kept failing. */
export const stateOf = (e: Pick<Endpoint, "enabled" | "pausedAt">): State => (e.enabled ? "on" : e.pausedAt ? "paused" : "off");
export const STATE_NAME: Record<State, string> = {
  on: "شغّال|On|פעיל",
  off: "موقوف|Off|כבוי",
  paused: "توقّف لحاله (فشل ورا بعض)|Paused (it kept failing)|הושהה (נכשל שוב ושוב)",
};

/** A delivery's state in a word: sent, failed for good, or still to go (queued, or waiting for another try). */
export function deliveryState(d: Pick<Delivery, "status" | "attempts">): string {
  if (d.status === "sent") return "انبعت|Sent|נשלח";
  if (d.status === "failed") return "فشل|Failed|נכשל";
  return d.attempts ? "بيستنى محاولة ثانية|Waiting for another try|ממתין לניסיון נוסף" : "بالدور|Queued|בתור";
}

/** Why a delivery wasn't taken: the server's line, in the page's words. One it doesn't know is shown as it is. */
export function errorText(error: string | null | undefined, lang: Lang): string {
  if (!error) return "";
  const say = (words: string) => part(words, lang);
  let m = /^It answered (\d+)(?:: (.*))?$/.exec(error);
  if (m) return `${say("العنوان جاوب|The address answered|הכתובת ענתה")} ${m[1]}${m[2] ? `: ${m[2]}` : ""}`;
  m = /^"(.+)" didn't answer in time$/.exec(error);
  if (m) return say(`«${m[1]}» ما جاوب بالوقت|“${m[1]}” didn't answer in time|״${m[1]}״ לא ענה בזמן`);
  m = /^"(.+)" points inside the network: it isn't called$/.exec(error);
  if (m) return say(`«${m[1]}» بيأشّر لجوّا الشبكة: ما بينبعتله|“${m[1]}” points inside the network: nothing is sent there|״${m[1]}״ מצביע לתוך הרשת: לא נשלח לשם`);
  m = /^No site is found at "(.+)"$/.exec(error);
  if (m) return say(`ما في موقع على «${m[1]}»|No site is found at “${m[1]}”|לא נמצא אתר ב״${m[1]}״`);
  m = /^"(.+)" couldn't be reached$/.exec(error);
  if (m) return say(`ما قدرنا نوصل لـ «${m[1]}»|“${m[1]}” couldn't be reached|לא ניתן להגיע אל ״${m[1]}״`);
  if (error.startsWith("The endpoint was switched off")) return say("العنوان انطفى قبل ما ينبعت|The endpoint was switched off before it was sent|הכתובת כובתה לפני השליחה");
  if (error.startsWith("The signing secret can't be read")) return say("مفتاح التوقيع ما بينقرأ: جدّده|The signing secret can't be read: renew it|לא ניתן לקרוא את סוד החתימה: חדש אותו");
  m = /^More than (\d+) deliveries are waiting/.exec(error);
  if (m) return say(`أكتر من ${m[1]} تسليم بيستنوا: الأحداث الجديدة ما بتنضاف لحد ما يلحق|More than ${m[1]} deliveries are waiting: new events aren't queued until it catches up|יותר מ־${m[1]} מסירות ממתינות: אירועים חדשים לא נכנסים לתור עד שידביק`);
  return error;
}

/** What the server says about a value it refused when an endpoint is saved, in the page's words. */
const REFUSALS: Record<string, string> = {
  "The address starts with https://": "العنوان لازم يبلّش بـ https://|The address starts with https://|הכתובת מתחילה ב־https://",
  "A site is called by its name": "العنوان بينكتب باسم الموقع (مش رقم IP ولا localhost)|An address is a site's name (not an IP number, not localhost)|כתובת היא שם של אתר (לא מספר IP ולא localhost)",
  "Only the standard https port is called": "بس منفذ https العادي (بدون :رقم)|Only the standard https port (no :number)|רק פורט https הרגיל (בלי :מספר)",
  "An address doesn't carry a name and password": "العنوان ما بينحط فيه اسم وكلمة سر|An address doesn't carry a name and password|כתובת אינה נושאת שם וסיסמה",
  "An address has no spaces or braces": "العنوان ما فيه فراغات ولا أقواس { }|An address has no spaces or braces|בכתובת אין רווחים או סוגריים מסולסלים",
  "The address isn't one": "هاد مش عنوان|That isn't an address|זו אינה כתובת",
  "No such table": "في جدول من المختارين انحذف|One of the chosen tables is gone|אחת הטבלאות שנבחרו נמחקה",
};
export function refusalText(e: unknown, fallback: string): string {
  const data = (e as { response?: { data?: { error?: string; details?: { issues?: Array<{ message?: string }> } } } })?.response?.data;
  if (data?.error === "TOO_MANY") return "وصلت لأكتر عدد من العناوين|That is as many endpoints as there can be|זה מספר הכתובות המרבי";
  if (data?.error === "ENDPOINT_OFF") return "العنوان موقوف: شغّله أول|The endpoint is off: switch it on first|הכתובת כבויה: הפעל אותה קודם";
  if (data?.error === "STILL_WAITING") return "لسا بيستنى دوره|It is still waiting its turn|עדיין ממתין לתורו";
  const said = data?.details?.issues?.[0]?.message;
  return (said && REFUSALS[said]) || said || fallback;
}

/** An address as it is typed: what is wrong with it (in the three languages), or null. The server checks again. */
export function urlProblem(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/[{}\s]/.test(v)) return REFUSALS["An address has no spaces or braces"];
  if (!/^https:\/\//i.test(v)) return REFUSALS["The address starts with https://"];
  let read: URL;
  try {
    read = new URL(v);
  } catch {
    return REFUSALS["The address isn't one"];
  }
  if (read.username || read.password) return REFUSALS["An address doesn't carry a name and password"];
  if (read.port && read.port !== "443") return REFUSALS["Only the standard https port is called"];
  if (!read.hostname.includes(".") || /^[\d.]+$/.test(read.hostname) || read.hostname.startsWith("[")) return REFUSALS["A site is called by its name"];
  return null;
}

/** Arabic counts: one, two, a few (3 to 10), many (and a number with a fraction). */
const arabic = (n: number, [one, two, few]: [string, string, string]) => (n === 1 ? one : n === 2 ? two : Number.isInteger(n) && n >= 3 && n <= 10 ? `${n} ${few}` : `${n} ${one}`);

/** A wait in words: "30 ثانية", "8 دقايق", "6 ساعات". */
export function waitText(seconds: number, lang: Lang): string {
  const say = (words: string) => part(words, lang);
  if (seconds < 60) return lang === "ar" ? arabic(seconds, ["ثانية", "ثانيتين", "ثواني"]) : `${seconds} ${say("ثانية|seconds|שניות")}`;
  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return lang === "ar" ? arabic(minutes, ["دقيقة", "دقيقتين", "دقايق"]) : `${minutes} ${say("دقيقة|minutes|דקות")}`;
  }
  const hours = Math.round((seconds / 3600) * 10) / 10;
  return lang === "ar" ? arabic(hours, ["ساعة", "ساعتين", "ساعات"]) : `${hours} ${say("ساعة|hours|שעות")}`;
}
/** How long a delivery is tried for, all its waits together. */
export const totalWait = (waits: number[]) => waits.reduce((sum, s) => sum + s, 0);

/** The tables an endpoint's row events are of, in a line. */
export function tablesText(e: Pick<Endpoint, "events" | "tables">, names: Map<string, string>, lang: Lang): string {
  if (!e.events.some((x) => x.startsWith("row."))) return "";
  if (!e.tables.length) return part("كل جداولك|Every table of yours|כל הטבלאות שלך", lang);
  return e.tables.map((id) => names.get(id) ?? part("جدول انحذف|a deleted table|טבלה שנמחקה", lang)).join(lang === "ar" ? "، " : ", ");
}

/**
 * What a receiver runs to know a delivery is the store's: the three headers, the secret's bytes,
 * and the same HMAC the server makes. (Node; any language does the same four steps.)
 */
export const VERIFY_SNIPPET = `import crypto from "node:crypto";

// secret: the one shown when the endpoint was made ("whsec_…")
// body: the request's body exactly as it arrived (the raw text, before JSON.parse)
export function isFromTheStore(secret, headers, body) {
  const id = headers["webhook-id"];
  const seconds = Number(headers["webhook-timestamp"]);
  // Older than five minutes: someone may be sending an old delivery again.
  if (Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const mine = "v1," + crypto.createHmac("sha256", key).update(id + "." + seconds + "." + body).digest("base64");
  return String(headers["webhook-signature"]).split(" ").some((theirs) =>
    theirs.length === mine.length && crypto.timingSafeEqual(Buffer.from(theirs), Buffer.from(mine)));
}`;
