// الإشعارات: the page's own sums, apart from it so they can be tested (features/push/PushPage.tsx).
import type { PushAudience, PushMessage, PushSend } from "../../api/push.api";

export type Lang = "ar" | "en" | "he";
export type PushDraft = {
  title: string;
  body: string;
  url: string;
  image: string;
  /** The store's other languages: their own title and words (empty = the main ones). */
  words: Partial<Record<Lang, { title: string; body: string }>>;
  audience: PushAudience;
  email: string;
};
export const EMPTY_DRAFT: PushDraft = { title: "", body: "", url: "", image: "", words: {}, audience: "all", email: "" };
export const LIMITS = { title: 80, body: 240, url: 300 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What is wrong with it, each as the page says it (empty: ready to send). */
export function draftProblems(d: PushDraft): string[] {
  const out: string[] = [];
  if (!d.title.trim()) out.push("العنوان فاضي|The title is empty|הכותרת ריקה");
  if (d.title.trim().length > LIMITS.title) out.push(`العنوان أطول من ${LIMITS.title} حرف|The title is longer than ${LIMITS.title} letters|הכותרת ארוכה מ־${LIMITS.title} תווים`);
  if (d.body.trim().length > LIMITS.body) out.push(`النص أطول من ${LIMITS.body} حرف|The text is longer than ${LIMITS.body} letters|הטקסט ארוך מ־${LIMITS.body} תווים`);
  const url = d.url.trim();
  if (url && (!url.startsWith("/") || url.startsWith("//") || /\s/.test(url))) out.push("الرابط مكان بالمتجر، بيبلّش بـ / (مثلاً /shop)|The link is a place in the shop, starting with / (e.g. /shop)|הקישור הוא מקום בחנות, ומתחיל ב־/ (למשל /shop)");
  const image = d.image.trim();
  if (image && !/^https:\/\/[^\s"'<>]+$/.test(image)) out.push("الصورة لازم تكون رابط https|The picture has to be an https address|התמונה צריכה להיות כתובת https");
  if (d.audience === "customer" && !EMAIL.test(d.email.trim())) out.push("اكتب إيميل الزبون|Write the customer's email|צריך לכתוב את האימייל של הלקוח");
  return out;
}

/** What is sent: trimmed, and only the other languages that have a title of their own. */
export function sendBodyOf(d: PushDraft, mainLang: Lang): PushSend {
  const words: NonNullable<PushSend["words"]> = {};
  for (const [lang, w] of Object.entries(d.words) as Array<[Lang, { title: string; body: string }]>) {
    if (lang === mainLang || !w?.title.trim()) continue;
    words[lang] = { title: w.title.trim(), ...(w.body.trim() ? { body: w.body.trim() } : {}) };
  }
  return {
    title: d.title.trim(),
    ...(d.body.trim() ? { body: d.body.trim() } : {}),
    ...(d.url.trim() ? { url: d.url.trim() } : {}),
    ...(d.image.trim() ? { image: d.image.trim() } : {}),
    ...(Object.keys(words).length ? { words } : {}),
    audience: d.audience,
    ...(d.audience === "customer" ? { email: d.email.trim().toLowerCase() } : {}),
  };
}

export const AUDIENCE_WORDS: Record<PushAudience, string> = {
  all: "كل اللي قبلوا|Everyone who said yes|כל מי שהסכים",
  customers: "الزباين المسجّلين بس|Signed-in customers only|רק לקוחות מחוברים",
  customer: "زبون واحد|One customer|לקוח אחד",
};

/** "رح يوصل لـ 3 تلفونات" in three languages. */
export function reachText(phones: number): string {
  if (phones === 0) return "ما في ولا تلفون لهلّق|No phone yet|אין עדיין אף טלפון";
  if (phones === 1) return "رح يوصل لتلفون واحد|It will reach one phone|זה יגיע לטלפון אחד";
  return `رح يوصل لـ ${phones} تلفون|It will reach ${phones} phones|זה יגיע ל־${phones} טלפונים`;
}

export const FROM_WORDS: Record<PushMessage["from"], string> = {
  admin: "من هون|From here|מכאן",
  function: "من function|From a function|מפונקציה",
  order: "خبر طلب|An order's news|עדכון הזמנה",
};

export const STATUS_WORDS: Record<PushMessage["status"], string> = {
  QUEUED: "بالدور|Waiting|בתור",
  SENDING: "عم ينبعت|Sending|נשלח",
  DONE: "انبعت|Sent|נשלח",
};

/** A sent one's counts, each in three languages (said one by one): how many it reached, opened, and what went. */
export function countsParts(m: Pick<PushMessage, "sent" | "total" | "opened" | "gone" | "failed">): string[] {
  const parts = [`وصل ${m.sent} من ${m.total}|Reached ${m.sent} of ${m.total}|הגיע ל־${m.sent} מתוך ${m.total}`];
  if (m.opened) parts.push(`فتحوه ${m.opened}|Opened ${m.opened}|נפתח ${m.opened}`);
  if (m.gone) parts.push(`${m.gone} تلفون ما عاد موجود|${m.gone} phones no longer there|${m.gone} טלפונים כבר לא קיימים`);
  if (m.failed) parts.push(`ما وصل ${m.failed}|Didn't reach ${m.failed}|לא הגיע ל־${m.failed}`);
  return parts;
}
