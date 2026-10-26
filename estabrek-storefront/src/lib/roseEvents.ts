/**
 * Moments Rose (the storefront guide) reacts to. Anything in the shop can call
 * roseReact(); whichever Rose is on screen answers. Colour picks already go
 * through the "storefront-color-selected" event and need nothing here.
 */
import { razanNow } from "./razanRuntime";
import type { Lang } from "./i18n";
import { toneAr } from "./words";

export type RoseMoment = "cart-add" | "wishlist-add" | "size-pick" | "product-view";

export const ROSE_EVENT = "rose:react";

export function roseReact(moment: RoseMoment) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<RoseMoment>(ROSE_EVENT, { detail: moment }));
}

/** What she says, in both languages. */
export const ROSE_LINES: Record<RoseMoment | "color-pick" | "hello", { ar: string[]; en: string[]; he: string[] }> = {
  "cart-add": { ar: ["تمّت الإضافة للسلة! 🛍️", "يا سلام، اختيار موفّق! 🛍️", "صارت بسلتك 💗"], en: ["Added to your bag! 🛍️", "Great pick! 🛍️", "It's in your bag 💗"], he: ["נוסף לתיק! 🛍️", "איזו בחירה מוצלחת! 🛍️", "זה כבר בתיק 💗"] },
  "wishlist-add": { ar: ["حطّيناها بالمفضلة 💗", "عجبتك؟ وأنا كمان! 💗"], en: ["Saved to your wishlist 💗", "I love it too! 💗"], he: ["שמרנו במועדפים 💗", "אהבת? גם אני! 💗"] },
  "size-pick": { ar: ["مقاس حلو! ✨", "تمام، هذا مقاسك ✨"], en: ["Nice size! ✨", "That's your size ✨"], he: ["מידה מעולה! ✨", "מעולה, זאת המידה ✨"] },
  "product-view": { ar: ["شو رأيك بهالقطعة؟ 😍", "هاي من المفضّلات عندي 😍"], en: ["What do you think of this one? 😍", "One of my favourites 😍"], he: ["מה דעתך על הפריט הזה? 😍", "זה אחד האהובים עליי 😍"] },
  "color-pick": { ar: ["يا حلو هاللون! 💗", "هاللون لايق عليكِ 💗"], en: ["Love that colour! 💗", "That colour suits you 💗"], he: ["איזה צבע יפה! 💗", "הצבע הזה ממש מתאים 💗"] },
  hello: { ar: ["أنا {assistant} 🌸 قريباً بتقدري تحكي معي هون", "أهلاً! أنا {assistant}، دليلتك بالمتجر 🌸"], en: ["I'm {assistant} 🌸 soon you can chat with me here", "Hi! I'm {assistant}, your shop guide 🌸"], he: ["אני {assistant} 🌸 בקרוב אפשר יהיה לדבר איתי כאן", "היי! אני {assistant}, המדריכה שלך בחנות 🌸"] },
};

export function roseLine(kind: keyof typeof ROSE_LINES, lang: Lang) {
  const list = ROSE_LINES[kind][lang];
  const line = list[Math.floor(Math.random() * list.length)];
  return lang === "ar" ? toneAr(line) : line;
}

/* ------------------------------------------------------------------ outfits */

export type RoseOutfit = "abaya" | "dress" | "coat" | "khimar" | "tunic" | "eid";
export type RoseExtras = { pearls?: boolean };

export const ROSE_OUTFIT_EVENT = "rose:outfit";

/** Which outfit suits a category (by its slug or name, Arabic or English). */
export function outfitFor(text: string | null | undefined): { outfit: RoseOutfit; extras: RoseExtras } {
  const t = (text ?? "").toLowerCase();
  // The owner's own rules first (admin → رزان → اللبس).
  const owner = razanNow().outfits;
  const rule = owner.rules.find((r) => t.includes(r.match.toLowerCase()));
  if (rule) return { outfit: rule.outfit, extras: rule.pearls ? { pearls: true } : {} };
  if (/winter|coat|jacket|شتو|شتاء|معطف|جاكيت|جاكيت/.test(t)) return { outfit: "coat", extras: {} };
  if (/kid|child|girl|أطفال|اطفال|طفل|بنات|صغير/.test(t)) return { outfit: "tunic", extras: {} };
  if (/incense|bakh|بخور|مبخر|مباخر|عيد|eid/.test(t)) return { outfit: "eid", extras: {} };
  if (/accessor|إكسسوار|اكسسوار|pin|دبوس|tasbih|تسبيح/.test(t)) return { outfit: "abaya", extras: { pearls: true } };
  if (/hijab|khimar|scarf|shawl|حجاب|خمار|شال|طرح/.test(t)) return { outfit: "khimar", extras: {} };
  if (/dress|summer|spring|فستان|فساتين|صيف|ربيع/.test(t)) return { outfit: "dress", extras: {} };
  return { outfit: owner.default, extras: {} };
}

/** Ask the floating Rose to change into the outfit of this category. */
export function roseOutfit(categoryText: string | null | undefined) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ROSE_OUTFIT_EVENT, { detail: outfitFor(categoryText) }));
}

export const ROSE_OUTFIT_LINES: Record<RoseOutfit, { ar: string; en: string; he: string }> = {
  abaya: { ar: "عبايتي المفضّلة 🤍", en: "My favourite abaya 🤍", he: "העבאיה האהובה עליי 🤍" },
  dress: { ar: "لبست فستان! شو رأيك؟ 👗", en: "Dress on! What do you think? 👗", he: "לבשתי שמלה! מה דעתך? 👗" },
  coat: { ar: "جاهزة للشتا 🧥", en: "Ready for winter 🧥", he: "מוכנה לחורף 🧥" },
  khimar: { ar: "خماري الطويل ✨", en: "My long khimar ✨", he: "החימאר הארוך שלי ✨" },
  tunic: { ar: "لبس مرح للصغيرات 🎀", en: "A playful look for little ones 🎀", he: "לוק שובב לקטנות 🎀" },
  eid: { ar: "لبس العيد ✨", en: "My Eid look ✨", he: "הלוק שלי לחג ✨" },
};
