import { expect, test } from "@playwright/test";
import { TEMPLATES, templateById, templatePage, type KitNode } from "../src/storeThemes/kits";
import { importDesign } from "../src/storeThemes/kits/importDesign";
import { pageStructure } from "./catalog-structure";

const IDS = ["electronics-foundry", "art-kinetic", "home-lantern"];
const flatten = (nodes: KitNode[]): KitNode[] => nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);

test("three new designs extend the established catalog without replacing its IDs", () => {
  expect(TEMPLATES).toHaveLength(2000);
  for (const id of IDS) {
    expect(templateById(id), id).toBeTruthy();
    expect(TEMPLATES.filter((x) => x.id === id)).toHaveLength(1);
  }
  for (const id of ["shoes-street", "fashion-boutique", "coffee-archive", "electronics-prism"]) expect(templateById(id), id).toBeTruthy();
  expect(new Set(IDS.map((id) => templateById(id)!.style.seed.bg)).size).toBe(3);
  expect(new Set(IDS.map((id) => templateById(id)!.style.fonts.display.join(","))).size).toBe(3);
});

for (const id of IDS) test(`${id} is an original editable composition with a usable merchant import`, () => {
  const imported = importDesign(id)!;
  expect(imported, id).toBeTruthy();
  expect(imported.sections.length).toBeGreaterThanOrEqual(6);
  const nodes = flatten(imported.sections);
  expect(nodes.some((node) => node.type === "showcase")).toBe(true);
  expect(nodes.some((node) => node.type === "products")).toBe(true);
  expect(nodes.filter((node) => ["legacy", "roseBlock", "block", "testimonials", "countdown"].includes(node.type))).toEqual([]);
  const text = JSON.stringify(imported);
  expect(text.match(/addons_themes|templatemo|nexus-|toro studio|estabrek|images\/kinetic-\d|98\.4%|64 hot.swap|free delivery/i)).toBeNull();
  expect(JSON.stringify(imported.design)).toContain("{{store.name}}");
  const heroWords = flatten([imported.sections[0]]).find((node) => node.type === "heading")!.props.text as Record<string, string>;
  for (const lang of ["ar", "en", "he"]) expect(heroWords[lang]?.length, lang).toBeGreaterThan(3);
  const preview = templatePage(id, "home", true)!;
  expect(preview.length).toBe(imported.sections.length + 2);
  expect(flatten(preview).some((node) => node.type === "products")).toBe(false);
  imported.sections[0].props.changedInCustomerEditor = true;
  expect(templatePage(id)![0].props).not.toHaveProperty("changedInCustomerEditor");
  const still = importDesign(id, { engine: "anime", preset: "none" })!;
  expect(flatten(still.sections).every((node) => node.motion === undefined)).toBe(true);
});

test("reference-inspired homes have distinct structure and the lantern stays editable", () => {
  const structures = IDS.map((id) => pageStructure(templatePage(id)!, true));
  expect(new Set(structures).size).toBe(3);
  const model = flatten(templatePage("home-lantern")!).find((node) => node.type === "model3d")!;
  expect(model?.props.model).toBe("lantern");
  expect(model?.props.poster).toMatch(/^\/templates\//);
});
