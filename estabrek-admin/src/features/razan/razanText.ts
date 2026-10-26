// Labels, built-in lines and the season of today for the «رزان» page.
import type { RazanOutfit, RazanSeason, RazanSettings } from "../../api/razan.api";
import { money } from "../../lib/money";
import type { Lang } from "../../lib/storeIdentity";
import { tr } from "@/lib/words";

export const OUTFIT_LABELS: Record<RazanOutfit, string> = {
  abaya: tr("عباية 🤍", "Abaya 🤍"),
  dress: tr("فستان 👗", "Dress 👗"),
  coat: tr("معطف الشتا 🧥", "Winter coat 🧥"),
  khimar: tr("خمار طويل ✨", "Long khimar ✨"),
  tunic: tr("لبس مرح للصغار 🎀", "Playful kids' outfit 🎀"),
  eid: tr("لبس العيد ✨", "Eid outfit ✨"),
};

export const SEASON_LABELS: Record<RazanSeason, string> = { ramadan: tr("رمضان 🌙", "Ramadan 🌙"), eid: tr("العيد ✨", "Eid ✨"), summer: tr("الصيف ☀️", "Summer ☀️"), winter: tr("الشتا ❄️", "Winter ❄️") };

/** Her built-in lines (what shows when the owner leaves a box empty). */
export const BUILT_IN = {
  welcome: { ar: "أهلاً فيكِ في {store} 🌸", en: "Welcome to {store} 🌸", he: "ברוכים הבאים ל־{store} 🌸" },
  greetingChat: { ar: "أهلاً! أنا {assistant} 🌸 اسأليني عن المقاسات، التوصيل، الاستبدال، أو خليني أساعدك تختاري.", en: "Hi! I'm {assistant} 🌸 ask me about sizes, delivery, exchanges — or let me help you choose.", he: "היי! אני {assistant} 🌸 אפשר לשאול אותי על מידות, משלוחים, החלפות — או לתת לי לעזור לבחור." },
  greetingOffline: { ar: "أهلاً! أنا {assistant} 🌸 فريقنا بيرد عليكِ بسرعة على واتساب، أو تصفّحي المجموعة معي.", en: "Hi! I'm {assistant} 🌸 our team answers fast on WhatsApp — or browse the collection with me.", he: "היי! אני {assistant} 🌸 הצוות שלנו עונה מהר בוואטסאפ — או שאפשר לעבור על הקולקציה איתי." },
  seasons: {
    ramadan: { ar: "رمضان كريم 🌙 أهلاً فيكِ في {store}", en: "Ramadan Kareem 🌙 welcome to {store}", he: "רמדאן כרים 🌙 ברוכים הבאים ל־{store}" },
    eid: { ar: "عيدكِ مبارك ✨ أهلاً فيكِ في {store}", en: "Eid Mubarak ✨ welcome to {store}", he: "עיד מובארכ ✨ ברוכים הבאים ל־{store}" },
    summer: { ar: "صيف حلو ☀️ شوفي القطع الخفيفة", en: "Hello summer ☀️ see the light pieces", he: "קיץ נעים ☀️ הפריטים הקלילים כבר כאן" },
    winter: { ar: "دفّي حالكِ ❄️ وصلت قطع الشتا", en: "Stay warm ❄️ winter pieces are here", he: "חם ונעים ❄️ פריטי החורף הגיעו" },
  } as Record<RazanSeason, Record<Lang, string>>,
};

export type LineNames = Record<Lang, { store: string; assistant: string }>;

/** A built-in line with the store's and her names in it ({store}, {assistant}; the owner may use them too). */
export function fillLine(t: Record<Lang, string>, n: LineNames) {
  const one = (s: string, x: { store: string; assistant: string }) => s.replace(/\{store\}/g, x.store).replace(/\{assistant\}/g, x.assistant);
  return { ar: one(t.ar, n.ar), en: one(t.en, n.en), he: one(t.he, n.he) };
}

/** Same rule as the shop: Hijri month for Ramadan and the Eids, Gregorian for summer/winter (Israel time). */
export function seasonNow(s: Pick<RazanSettings, "seasonal">, now = new Date()): RazanSeason | null {
  if (s.seasonal.mode === "off") return null;
  if (s.seasonal.mode !== "auto") return s.seasonal.mode;
  let hm = 0, hd = 0, gm = now.getMonth() + 1;
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { timeZone: "Asia/Jerusalem", month: "numeric", day: "numeric" }).formatToParts(now);
    hm = Number(parts.find((p) => p.type === "month")?.value);
    hd = Number(parts.find((p) => p.type === "day")?.value);
    gm = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Jerusalem", month: "numeric" }).format(now));
  } catch {
    /* old browser: Gregorian only */
  }
  if (hm === 9) return "ramadan";
  if ((hm === 10 && hd <= 3) || (hm === 12 && hd >= 9 && hd <= 13)) return "eid";
  if (gm >= 6 && gm <= 8) return "summer";
  if (gm === 12 || gm <= 2) return "winter";
  return null;
}

/** "/cart, /checkout" ⇄ list of page prefixes. */
export function parsePaths(text: string) {
  return [...new Set(text.split(/[\s,،]+/).map((p) => p.trim()).filter(Boolean).map((p) => (p.startsWith("/") ? p : `/${p}`)))]
    .filter((p) => /^\/[\w\-/[\]]*$/.test(p))
    .slice(0, 20);
}

export const REPORT_LABELS: Array<{ key: string; label: string }> = [
  { key: "open", label: tr("فتحوا لوحتها", "Opened her panel") },
  { key: "offer:help", label: tr("عرضت المساعدة بالطلب", "She offered help ordering") },
  { key: "accept:help", label: tr("قبلوا المساعدة", "Accepted the help") },
  { key: "call:help", label: tr("طلبوا اتصال", "Asked for a call") },
  { key: "offer:history", label: tr("عرضت «آخر اللي انشاف»", "She offered “What you were looking at”") },
  { key: "accept:history", label: tr("فتحوا السجل", "Opened the history") },
  { key: "quiz:start", label: tr("بلّشوا «رزان بتختارلك»", "Started “Razan picks for you”") },
  { key: "quiz:done", label: tr("كمّلوه ولقوا قطع", "Finished it and found pieces") },
  { key: "quiz:nomatch", label: tr("ما لقوا إشي قريب", "Found nothing close") },
  { key: "quiz:like", label: tr("👍 على اقتراحاتها", "👍 on her picks") },
  { key: "quiz:dislike", label: tr("👎 على اقتراحاتها", "👎 on her picks") },
  { key: "request:sent", label: tr("طلبات خاصة انبعتت", "Special requests sent") },
];

/** The quiz's answers in words (the report shows what shoppers choose most). */
export const QUIZ_ANSWER_LABELS: Record<string, Record<string, string>> = {
  occasion: { daily: tr("اليوم العادي", "Everyday"), work: tr("الدوام والجامعة", "Work and university"), evening: tr("السهرات", "Evenings out"), wedding: tr("الأعراس", "Weddings"), prayer: tr("الصلاة", "Prayer"), eid: tr("العيد ورمضان", "Eid and Ramadan") },
  season: { summer: tr("صيفي", "Summer"), winter: tr("شتوي", "Winter") },
  color: { black: tr("أسود", "Black"), white: tr("أبيض", "White"), beige: tr("بيج", "Beige"), brown: tr("بني", "Brown"), grey: tr("رمادي", "Grey"), navy: tr("كحلي", "Navy"), blue: tr("أزرق", "Blue"), green: tr("أخضر وزيتي", "Green and olive"), pink: tr("زهري", "Pink"), wine: tr("خمري", "Wine"), purple: tr("ليلكي", "Lilac"), mustard: tr("خردلي", "Mustard") },
  look: { full: tr("لبسة كاملة", "A full outfit"), piece: tr("قطعة بتكمّل", "A piece to complete") },
  // In the store's currency, worked out when shown.
  get budget() {
    return { "150": tr(`لحد ${money(150)}`, "Up to {0}", [money(150)]), "300": tr(`لحد ${money(300)}`, "Up to {0}", [money(300)]), "500": tr(`لحد ${money(500)}`, "Up to {0}", [money(500)]), "500+": tr(`أكثر من ${money(500)}`, "More than {0}", [money(500)]) };
  },
};
export const QUIZ_GROUP_LABELS: Record<string, string> = { occasion: tr("المناسبة", "Occasion"), season: tr("الموسم", "Season"), color: tr("الألوان", "Colours"), look: tr("النوع", "Kind"), budget: tr("الميزانية", "Budget") };
