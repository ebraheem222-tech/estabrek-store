/**
 * The mood of a product's category, for its page's backdrop (RoseProductBackdrop): read from the category's
 * names and slugs along the way to the product (and its title), the season first ("winter dresses" are winter).
 * The same kind of matching as the home's seasons and stories (seasonalEdits, collectionStories).
 */
export type Mood = "winter" | "spring" | "incense" | "accessories" | "kids" | "prayer" | "hijab" | "dresses" | "default";

const RULES: Array<[Mood, RegExp]> = [
  ["winter", /winter|شتو|شتاء|شتي/i],
  ["spring", /spring|summer|ربيع|صيف/i],
  ["incense", /incense|بخور|مبخر|مباخر/i],
  ["accessories", /accessor|إكسسوار|اكسسوار|\bring\b|خاتم|معصم|wrist|دبوس|\bpins?\b|jewel/i],
  ["kids", /\bkids?\b|أطفال|اطفال|طفل/i],
  ["prayer", /prayer|مصل|سجاد/i],
  ["hijab", /hijab|scarf|shawl|حجاب|شال|طرح|لفة/i],
  ["dresses", /dress|abaya|فستان|فساتين|عباي|جلباب/i],
];

export function moodOf(words: Array<string | null | undefined>): Mood {
  const list = words.filter((w): w is string => Boolean(w)).map((w) => decodeURIComponent(w.replace(/[-_/]+/g, " ")));
  for (const [mood, pattern] of RULES) if (list.some((w) => pattern.test(w))) return mood;
  return "default";
}
