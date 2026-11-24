import { expect, test } from "@playwright/test";
import { setArabicTone, setPlainWords, tr } from "../src/lib/words";
import { HE } from "../src/lib/words.he";
import { PLAIN_AR, PLAIN_EN, PLAIN_EN_LINES, cartAr, cartEn, cartHe } from "../src/lib/words.plain";

// The clothes shop's words (the bag, the look, fabrics, hijabs) belong to the store that wears the
// rose design; any other store speaks plainly.

test.afterEach(() => {
  setPlainWords(false);
  setArabicTone("women");
});

test("a store on any other theme gets a cart, not a bag, in every language and tone", () => {
  setPlainWords(true);
  expect(tr("ar", "أضيفي للحقيبة", "Add to bag")).toBe("أضيفي للسلة");
  expect(tr("en", "أضيفي للحقيبة", "Add to bag")).toBe("Add to cart");
  expect(tr("he", "أضيفي للحقيبة", "Add to bag")).toBe("הוספה לסל");
  setArabicTone("everyone");
  expect(tr("ar", "أضيفي للحقيبة", "Add to bag")).toBe("إضافة للسلة");
  // With numbers or names, the same.
  expect(tr("en", "أضيفي للحقيبة", "Add {0} to bag", ["2"])).toBe("Add 2 to cart");
  expect(tr("he", "أضيفي للحقيبة", "Add {0} to bag", ["2"])).toBe("הוספת 2 לסל");
  // The rose design's own store keeps its bag.
  setPlainWords(false);
  setArabicTone("women");
  expect(tr("ar", "أضيفي للحقيبة", "Add to bag")).toBe("أضيفي للحقيبة");
  expect(tr("en", "أضيفي للحقيبة", "Add to bag")).toBe("Add to bag");
});

test("the look, fabric and hijab lines become plain ones, with their Hebrew", () => {
  setPlainWords(true);
  for (const [ar, plainAr] of Object.entries(PLAIN_AR)) {
    expect(tr("ar", ar, "x")).toBe(plainAr);
    expect(plainAr).not.toMatch(/إطلال|قماش|أقمشة|حجاب|عباي|حقيب|كِ\b/);
  }
  for (const [en, plainEn] of Object.entries(PLAIN_EN)) {
    expect(tr("en", "x", en)).toBe(plainEn);
    expect(plainEn).not.toMatch(/\blook\b|fabric|hijab|abaya|\bbag/i);
  }
  for (const en of PLAIN_EN_LINES) expect(HE[en], en).toBeTruthy();
});

test("only the word for the bag changes, never a word that merely holds its letters", () => {
  expect(cartAr("حقيبتكِ فارغة")).toBe("سلتكِ فارغة");
  expect(cartAr("بالحقيبة")).toBe("بالسلة");
  expect(cartAr("لا شيء هنا")).toBe("لا شيء هنا");
  expect(cartEn("Your bag (3 bags)")).toBe("Your cart (3 carts)");
  expect(cartEn("BAG")).toBe("CART");
  expect(cartEn("baggage and handbag")).toBe("baggage and handbag");
  expect(cartHe("ריקון התיק")).toBe("ריקון הסל");
  expect(cartHe("נוסף לתיק ✅")).toBe("נוסף לסל ✅");
  expect(cartHe("„{0}” כבר התקיים; צריך להסיר אותו מהתיק.")).toBe("„{0}” כבר התקיים; צריך להסיר אותו מהסל.");
  // Old, ancient, silence: not bags.
  expect(cartHe("לקוח ותיק, חפץ עתיק, שתיקה")).toBe("לקוח ותיק, חפץ עתיק, שתיקה");
  // Every Hebrew line for an English "bag" loses its bag.
  for (const [en, he] of Object.entries(HE)) {
    if (/\bbag\b/i.test(en)) expect(cartHe(he), en).not.toMatch(/(^|[\s„"״“(])((?:ו?(?:מה|ה)|ש|ל|ב|מ)?)תיק(?=$|[\s.,!?:;״"”)✅…])/);
  }
});
