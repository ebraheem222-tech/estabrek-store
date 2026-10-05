/**
 * Moments Rose (the storefront guide) reacts to. Anything in the shop can call
 * roseReact(); whichever Rose is on screen answers. Colour picks already go
 * through the "storefront-color-selected" event and need nothing here.
 */
export type RoseMoment = "cart-add" | "wishlist-add" | "size-pick" | "product-view";

export const ROSE_EVENT = "rose:react";

export function roseReact(moment: RoseMoment) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<RoseMoment>(ROSE_EVENT, { detail: moment }));
}

/** What she says, in both languages. */
export const ROSE_LINES: Record<RoseMoment | "color-pick" | "hello", { ar: string[]; en: string[] }> = {
  "cart-add": { ar: ["تمّت الإضافة للسلة! 🛍️", "يا سلام، اختيار موفّق! 🛍️", "صارت بسلتك 💗"], en: ["Added to your bag! 🛍️", "Great pick! 🛍️", "It's in your bag 💗"] },
  "wishlist-add": { ar: ["حطّيناها بالمفضلة 💗", "عجبتك؟ وأنا كمان! 💗"], en: ["Saved to your wishlist 💗", "I love it too! 💗"] },
  "size-pick": { ar: ["مقاس حلو! ✨", "تمام، هذا مقاسك ✨"], en: ["Nice size! ✨", "That's your size ✨"] },
  "product-view": { ar: ["شو رأيك بهالقطعة؟ 😍", "هاي من المفضّلات عندي 😍"], en: ["What do you think of this one? 😍", "One of my favourites 😍"] },
  "color-pick": { ar: ["يا حلو هاللون! 💗", "هاللون لايق عليكِ 💗"], en: ["Love that colour! 💗", "That colour suits you 💗"] },
  hello: { ar: ["أنا رزان 🌸 قريباً بتقدري تحكي معي هون", "أهلاً! أنا رزان، دليلتك بالمتجر 🌸"], en: ["I'm Rose 🌸 soon you can chat with me here", "Hi! I'm Rose, your shop guide 🌸"] },
};

export function roseLine(kind: keyof typeof ROSE_LINES, ar: boolean) {
  const list = ROSE_LINES[kind][ar ? "ar" : "en"];
  return list[Math.floor(Math.random() * list.length)];
}

/* ------------------------------------------------------------------ outfits */

export type RoseOutfit = "abaya" | "dress" | "coat" | "khimar" | "tunic" | "eid";
export type RoseExtras = { pearls?: boolean };

export const ROSE_OUTFIT_EVENT = "rose:outfit";

/** Which outfit suits a category (by its slug or name, Arabic or English). */
export function outfitFor(text: string | null | undefined): { outfit: RoseOutfit; extras: RoseExtras } {
  const t = (text ?? "").toLowerCase();
  if (/winter|coat|jacket|شتو|شتاء|معطف|جاكيت|جاكيت/.test(t)) return { outfit: "coat", extras: {} };
  if (/kid|child|girl|أطفال|اطفال|طفل|بنات|صغير/.test(t)) return { outfit: "tunic", extras: {} };
  if (/incense|bakh|بخور|مبخر|مباخر|عيد|eid/.test(t)) return { outfit: "eid", extras: {} };
  if (/accessor|إكسسوار|اكسسوار|pin|دبوس|tasbih|تسبيح/.test(t)) return { outfit: "abaya", extras: { pearls: true } };
  if (/hijab|khimar|scarf|shawl|حجاب|خمار|شال|طرح/.test(t)) return { outfit: "khimar", extras: {} };
  if (/dress|summer|spring|فستان|فساتين|صيف|ربيع/.test(t)) return { outfit: "dress", extras: {} };
  return { outfit: "abaya", extras: {} };
}

/** Ask the floating Rose to change into the outfit of this category. */
export function roseOutfit(categoryText: string | null | undefined) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ROSE_OUTFIT_EVENT, { detail: outfitFor(categoryText) }));
}

export const ROSE_OUTFIT_LINES: Record<RoseOutfit, { ar: string; en: string }> = {
  abaya: { ar: "عبايتي المفضّلة 🤍", en: "My favourite abaya 🤍" },
  dress: { ar: "لبست فستان! شو رأيك؟ 👗", en: "Dress on! What do you think? 👗" },
  coat: { ar: "جاهزة للشتا 🧥", en: "Ready for winter 🧥" },
  khimar: { ar: "خماري الطويل ✨", en: "My long khimar ✨" },
  tunic: { ar: "لبس مرح للصغيرات 🎀", en: "A playful look for little ones 🎀" },
  eid: { ar: "لبس العيد ✨", en: "My Eid look ✨" },
};
