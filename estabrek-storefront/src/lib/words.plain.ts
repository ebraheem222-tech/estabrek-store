/**
 * Any store's words. The shop's lines were first written for a clothes shop (the rose design's
 * store): a "bag" for the cart, a "look", fabrics and hijabs. That voice belongs to the store that
 * wears the rose design; every other store (a phone shop, a game server's site…) gets these
 * instead (lib/words.ts setPlainWords). Plain lines are written to no one in particular, so
 * they need no tone (words.tone.ts).
 */

/** Whole lines, keyed by the line as written in the code: [Arabic, English]. Hebrew: words.he.ts. */
const LINES: ReadonlyArray<readonly [from: readonly [string, string], to: readonly [string, string]]> = [
  [["طرق أخرى لاكتشاف إطلالتكِ", "More ways to find your look"], ["طرق أخرى للبحث", "More ways to search"]],
  [["جرّبي تغيير الفلاتر أو البحث عن إطلالة أخرى.", "Try another filter or search for a different look."], ["ممكن تغيير الفلاتر أو البحث بكلمة أخرى.", "Try another filter or a different search."]],
  [["اكتبي اسم القطعة، اللون أو القماش.", "Type a piece, a colour or a fabric."], ["اسم المنتج، لونه أو أي كلمة عنه.", "A product's name, its colour or any word about it."]],
  [["سؤال عن إطلالة، مقاس، أو طلب؟ يسعدنا نساعدكِ باختيار تفاصيلكِ.", "A question about your look, size or order? We'd love to help."], ["سؤال عن منتج أو طلب؟ يسعدنا نساعد.", "A question about a product or an order? We'd love to help."]],
  [["مثلاً: حجاب شيفون طويل، أو عباية زي اللي بالصورة", "e.g. a long chiffon hijab, or an abaya like the photo"], ["مثلاً: منتج زي اللي بالصورة، بلون أو مقاس معيّن", "e.g. a product like the one in the photo, in a certain colour or size"]],
  [["✨ كمّلي اللبسة", "✨ Complete the look"], ["✨ بيلبق معه", "✨ Goes well with it"]],
  [["كمّلي اللبسة", "Complete the look"], ["بيلبق معه", "Goes well with it"]],
];

export const PLAIN_AR: Readonly<Record<string, string>> = Object.fromEntries(LINES.map(([from, to]) => [from[0], to[0]]));
export const PLAIN_EN: Readonly<Record<string, string>> = Object.fromEntries(LINES.map(([from, to]) => [from[1], to[1]]));
/** The plain English lines (their Hebrew must be in words.he.ts). */
export const PLAIN_EN_LINES: readonly string[] = LINES.map(([, to]) => to[1]);

/**
 * The bag is the cart. Both words are feminine in Arabic (حقيبة → سلة) and masculine in Hebrew
 * (תיק → סל), so the words around them still agree.
 */
export function cartAr(text: string): string {
  return text.includes("حقيب") || text.includes("حقائب") ? text.replace(/حقائب/g, "سلال").replace(/حقيبت/g, "سلت").replace(/حقيبة/g, "سلة") : text;
}
export function cartEn(text: string): string {
  return /\bbag/i.test(text)
    ? text.replace(/\b(b|B)ag(s?)\b/g, (_m, b: string, s: string) => `${b === "B" ? "C" : "c"}art${s}`).replace(/\bBAG\b/g, "CART")
    : text;
}
// A whole Hebrew word: after a space, a quote or the start, with its little prefixes (ה, ל, ב, מ, מה, ש, and ו only before ה: a bare ותיק is "veteran").
const HE_BAG = /(^|[\s„"״“(])((?:ו?(?:מה|ה)|ש|ל|ב|מ)?)תיק(ים)?(?=$|[\s.,!?:;״"”)✅…])/g;
export function cartHe(text: string): string {
  return text.includes("תיק") ? text.replace(HE_BAG, (_m, pre: string, prefix: string, many: string | undefined) => `${pre}${prefix}${many ? "סלים" : "סל"}`) : text;
}
