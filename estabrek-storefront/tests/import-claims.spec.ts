import { expect, test } from "@playwright/test";
import { importDesign } from "../src/storeThemes/kits/importDesign";
import { templatePage, type KitNode } from "../src/storeThemes/kits";
import { buildSetup, type SetupChoices } from "../../estabrek-admin/src/features/setup/buildSetup";
import { PACKS } from "../../estabrek-admin/src/features/setup/packs";

const originals = ["street", "race", "atelier", "kids", "quiet", "retro", "night", "edit", "trail", "lab"];
const english = (value: unknown): string[] => {
  if (!value || typeof value !== "object") return [];
  if ("en" in value && typeof value.en === "string") return [value.en];
  return Object.values(value).flatMap(english);
};
const nodes = (items: KitNode[]): KitNode[] => items.flatMap((node) => [node, ...nodes(node.children ?? [])]);
const visibleEnglish = (items: KitNode[]) => nodes(items).flatMap((node) => english(node.props)).join("\n");

const demoClaims: Record<string, RegExp> = {
  street: /Samer|300|free size swaps|two-day delivery|customer.s photo|our customers/i,
  race: /85%|230 g|Runner Pro|free training|20 km|grip that holds/i,
  atelier: /1998|200 stitches|Goodyear|lifetime|century-old|stitched by hand/i,
  kids: /4\.9|60.day|60 days|days to swap|first order|birthday gift|Rana|lights in the sole/i,
  quiet: /last years|for years|sole that can be replaced|natural rubber|one letter a month/i,
  retro: /Court 85|RETRO10|10%|limited retro releases|swapped one free/i,
  night: /300|raffle|48 hours|12k|one pair each|minutes to sell out|an hour before/i,
  edit: /three makers|No\. 12|reader from issue|last shoemaker|Paris to Rome|ten pieces/i,
  trail: /4\.9|6 mm|5 mm|waterproof|below zero|rain-proof|lightest running shoe/i,
  lab: /238g|8mm|36mm|600km|600 km|1\.2M|41 tests|carbon fibre|Gen 4|70%|animal materials/i,
};

for (const original of originals) {
  const id = `shoes-${original}`;
  test(`${id} imports merchant copy rather than sample reviews, promises or specifications`, () => {
    const imported = importDesign(id)!;
    expect(imported, id).toBeTruthy();
    const installed = buildSetup({
      pack: PACKS.find((pack) => pack.id === "shoes")!,
      name: { ar: "خطوة شمال", en: "North Steps", he: "צעדי צפון" },
      themeId: "store-design", mode: "light", replaceHome: false,
      include: { categories: true, types: false, home: true, menu: true },
      templateTree: { version: 1, root: { id: "page", type: "page", props: {}, children: imported.sections } } as SetupChoices["templateTree"],
      design: imported.design as SetupChoices["design"],
    });
    const home = installed.pages[0].tree!.root.children!;
    const content = visibleEnglish([...home, ...installed.design!.header.root.children!, ...installed.design!.footer.root.children!]);
    expect(content, id).toContain("North Steps");
    expect(content, id).not.toContain("{{store.name}}");
    expect(content, id).not.toMatch(demoClaims[original]);
    expect(content, id).not.toMatch(/\b(?:SCHOOL15|RETRO10|Samer|Rana|Yousef)\b|\braffle\b|\b\d+(?:\.\d+)?\s*%/i);
    expect(nodes(home).some((node) => node.type === "products"), id).toBe(true);
    expect(nodes(home).some((node) => ["testimonials", "countdown"].includes(node.type)), id).toBe(false);
    expect(content, id).toContain("product page");
  });

  test(`${id} keeps its gallery's illustrative copy and its own live composition`, () => {
    const gallery = templatePage(id, "home", true)!;
    expect(visibleEnglish(gallery), id).toMatch(demoClaims[original]);
    const live = templatePage(id, "home", false)!;
    expect(live.length, id).toBeGreaterThanOrEqual(6);
    expect(visibleEnglish(live), id).not.toMatch(demoClaims[original]);
  });
}
