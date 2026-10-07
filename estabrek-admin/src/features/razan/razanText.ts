// Labels, built-in lines and the season of today for the «رزان» page.
import type { RazanOutfit, RazanSeason, RazanSettings } from "../../api/razan.api";

export const OUTFIT_LABELS: Record<RazanOutfit, string> = {
  abaya: "عباية 🤍",
  dress: "فستان 👗",
  coat: "معطف الشتا 🧥",
  khimar: "خمار طويل ✨",
  tunic: "لبس مرح للصغار 🎀",
  eid: "لبس العيد ✨",
};

export const SEASON_LABELS: Record<RazanSeason, string> = { ramadan: "رمضان 🌙", eid: "العيد ✨", summer: "الصيف ☀️", winter: "الشتا ❄️" };

/** Her built-in lines (what shows when the owner leaves a box empty). */
export const BUILT_IN = {
  welcome: { ar: "أهلاً فيكِ في استبرق 🌸", en: "Welcome to Estabrek 🌸" },
  greetingChat: { ar: "أهلاً! أنا رزان 🌸 اسأليني عن المقاسات، التوصيل، الاستبدال، أو خليني أساعدك تختاري.", en: "Hi! I'm Rose 🌸 ask me about sizes, delivery, exchanges — or let me help you choose." },
  greetingOffline: { ar: "أهلاً! أنا رزان 🌸 فريقنا بيرد عليكِ بسرعة على واتساب، أو تصفّحي المجموعة معي.", en: "Hi! I'm Rose 🌸 our team answers fast on WhatsApp — or browse the collection with me." },
  seasons: {
    ramadan: { ar: "رمضان كريم 🌙 أهلاً فيكِ في استبرق", en: "Ramadan Kareem 🌙 welcome to Estabrek" },
    eid: { ar: "عيدكِ مبارك ✨ أهلاً فيكِ في استبرق", en: "Eid Mubarak ✨ welcome to Estabrek" },
    summer: { ar: "صيف حلو ☀️ شوفي القطع الخفيفة", en: "Hello summer ☀️ see the light pieces" },
    winter: { ar: "دفّي حالكِ ❄️ وصلت قطع الشتا", en: "Stay warm ❄️ winter pieces are here" },
  } as Record<RazanSeason, { ar: string; en: string }>,
};

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
  { key: "open", label: "فتحوا لوحتها" },
  { key: "offer:help", label: "عرضت المساعدة بالطلب" },
  { key: "accept:help", label: "قبلوا المساعدة" },
  { key: "call:help", label: "طلبوا اتصال" },
  { key: "offer:history", label: "عرضت «شو كنتِ شايفة»" },
  { key: "accept:history", label: "فتحوا السجل" },
  { key: "quiz:start", label: "بلّشوا «رزان بتختارلك»" },
  { key: "quiz:done", label: "كمّلوه ولقوا قطع" },
  { key: "quiz:nomatch", label: "ما لقوا إشي قريب" },
  { key: "quiz:like", label: "👍 على اقتراحاتها" },
  { key: "quiz:dislike", label: "👎 على اقتراحاتها" },
  { key: "request:sent", label: "طلبات خاصة انبعتت" },
];

/** The quiz's answers in words (the report shows what shoppers choose most). */
export const QUIZ_ANSWER_LABELS: Record<string, Record<string, string>> = {
  occasion: { daily: "اليوم العادي", work: "الدوام والجامعة", evening: "السهرات", wedding: "الأعراس", prayer: "الصلاة", eid: "العيد ورمضان" },
  season: { summer: "صيفي", winter: "شتوي" },
  color: { black: "أسود", white: "أبيض", beige: "بيج", brown: "بني", grey: "رمادي", navy: "كحلي", blue: "أزرق", green: "أخضر وزيتي", pink: "زهري", wine: "خمري", purple: "ليلكي", mustard: "خردلي" },
  look: { full: "لبسة كاملة", piece: "قطعة بتكمّل" },
  budget: { "150": "لحد ₪150", "300": "لحد ₪300", "500": "لحد ₪500", "500+": "أكثر من ₪500" },
};
export const QUIZ_GROUP_LABELS: Record<string, string> = { occasion: "المناسبة", season: "الموسم", color: "الألوان", look: "النوع", budget: "الميزانية" };
