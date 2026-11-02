import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_SETS, iconArt, iconAsDrawing, iconLineOf, iconRef, readIconSet, searchIcons, setOfRef, withIconLine, type IconSetKey } from "./iconLibrary";
import { artIsSafe } from "./svgArt";

// The icon library's files (public/icon-sets, from scripts/gen-icon-sets.mjs), read from disk.
const file = (key: IconSetKey) => readIconSet(key, JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../public/icon-sets", `${key}.json`), "utf8")));
// The backend's rule for an icon's name (estabrek-store-backend src/lib/pageTree.ts ICON_REF).
const ICON_REF = /^(lucide|tabler|tabler-filled|ph-(regular|thin|light|bold|fill|duotone)):[a-z0-9][a-z0-9-]{0,60}$/;

describe("the icon library", () => {
  it("has every set, thousands of icons, each one a safe drawing with a name the backend takes", () => {
    let total = 0;
    for (const { key } of ICON_SETS) {
      const set = file(key);
      expect(set.icons.length, key).toBeGreaterThan(900);
      total += set.icons.length;
      for (const icon of set.icons) {
        const art = iconArt(set, icon);
        if (!artIsSafe(art) || !ICON_REF.test(iconRef(key, icon.name))) throw new Error(`${key}:${icon.name}`);
      }
    }
    expect(total).toBeGreaterThan(16000);
  });

  it("finds by name and words, best first, in English, Arabic or Hebrew", () => {
    const lucide = file("lucide");
    const names = (q: string, group?: string) => searchIcons(lucide, q, group).map((i) => i.name);
    expect(names("heart")[0]).toBe("heart");
    expect(names("shopping cart")).toContain("shopping-cart");
    // Arabic with or without "ال", vowel marks or letter variants, and Hebrew.
    for (const q of ["سلة", "السلّة", "עגלה"]) expect(names(q), q).toContain("shopping-cart");
    expect(names("قلب")[0]).toBe("heart");
    expect(names("לב")).toContain("heart");
    expect(names("توصيل")).toContain("truck");
    expect(names("zzzz")).toEqual([]);
    expect(names("كلمةغريبة")).toEqual([]);
    // A group narrows it.
    const tabler = file("tabler");
    expect(tabler.groups).toContain("e-commerce");
    const shop = searchIcons(tabler, "", "e-commerce");
    expect(shop.length).toBeGreaterThan(50);
    expect(shop.every((i) => i.group === "e-commerce")).toBe(true);
  });

  it("an icon picked keeps its set's look; a line icon's line width changes, a filled one has none", () => {
    const lucide = file("lucide");
    const cart = lucide.icons.find((i) => i.name === "shopping-cart")!;
    const art = iconArt(lucide, cart, 1.5);
    expect(art.viewBox).toBe("0 0 24 24");
    expect(art.nodes[0]).toMatchObject({ t: "g", a: { fill: "none", stroke: "currentColor", "stroke-width": "1.5" } });
    expect(art.nodes[0].c?.length).toBe(3);
    expect(iconLineOf(art)).toBe(1.5);
    expect(iconLineOf(withIconLine(art, 2.75))).toBe(2.75);
    const duo = file("ph-duotone");
    const heart = iconArt(duo, duo.icons.find((i) => i.name === "heart")!, 1.5);
    expect(heart.viewBox).toBe("0 0 256 256");
    expect(iconLineOf(heart)).toBeUndefined();
    expect(heart.nodes[0].c?.[0].a.opacity).toBe("0.2");
    // As a drawing of its own, it takes the theme's colour so its colours can change.
    expect(iconAsDrawing(art).nodes[0].a).toMatchObject({ fill: "none", stroke: "accent" });
    expect(setOfRef("ph-bold:gift")).toBe("ph-bold");
    expect(setOfRef("heart")).toBeUndefined();
  });
});
