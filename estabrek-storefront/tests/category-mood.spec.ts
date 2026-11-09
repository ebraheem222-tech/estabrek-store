import { test, expect } from "@playwright/test";
import { moodOf } from "../src/lib/categoryMood";

// The mood of a product page's backdrop, read from its category's names and slugs (the season first).
test("a category's mood: the season wins, then the kind of piece, else the store's own", () => {
  expect(moodOf(["فساتين", "/c/dresses", "شتوي", "/c/winter", "فستان هودي"])).toBe("winter");
  expect(moodOf(["Summer dresses", "/c/summer"])).toBe("spring");
  expect(moodOf(["مباخر", "/c/incense-burner", "مبخرة النافورة"])).toBe("incense");
  expect(moodOf(["إكسسوارات", "/c/accessories"])).toBe("accessories");
  expect(moodOf(["/c/zikr-ring"])).toBe("accessories");
  expect(moodOf(["شالات كتف", "/c/scarf"])).toBe("hijab");
  expect(moodOf(["مصليات", "/c/prayer-rug"])).toBe("prayer");
  expect(moodOf(["أطفال/ جيل محير", "/c/-kids"])).toBe("kids");
  expect(moodOf(["فساتين", "/c/dresses"])).toBe("dresses");
  expect(moodOf(["ستاند خشب", "/c/-wooden-stand"])).toBe("default");
  expect(moodOf([])).toBe("default");
});
