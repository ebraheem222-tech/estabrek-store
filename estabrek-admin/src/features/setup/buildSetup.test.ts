import { describe, expect, it } from "vitest";
import { buildSetup, type SetupChoices } from "./buildSetup";
import { PACKS } from "./packs";
import type { ImportedDesign } from "../../api/storeTemplates.api";

const choices = (): SetupChoices => ({ pack: PACKS.find((p) => p.id === "fashion")!, name: { ar: "متجري", en: "My Shop", he: "החנות שלי" }, themeId: "tpl-fashion-street", mode: "light", include: { categories: true, types: true, home: true, menu: true }, replaceHome: false });

describe("store setup with a complete template", () => {
  it("copies the chosen design without mutating it and personalizes editable global regions", () => {
    const input = choices();
    const logo = { id: "logo", type: "heading", name: "Store logo", props: { level: 3, text: { ar: "{{store.name}}", en: "{{store.name}}", he: "{{store.name}}" } } };
    const tree = { version: 1 as const, root: { id: "page", type: "page", props: {}, children: [{ id: "section", type: "section", props: {}, children: [logo] }] } };
    input.design = { templateId: "fashion-quiet", theme: { id: "tpl-fashion-quiet", name: input.name, blurb: input.name, family: "fashion", mode: "light", palettes: {}, fonts: { display: ["Inter"], text: ["Inter"] } }, header: tree, footer: tree } as ImportedDesign;
    input.templateTree = tree;
    input.logoUrl = "https://cdn.example.com/logo.png";
    const source = JSON.stringify(input.design);
    const request = buildSetup(input);
    expect(request.design?.theme.id).toBe("store-design");
    expect(request.design?.theme.name).toEqual(input.name);
    expect(request.design?.header.root.children?.[0].children?.[0]).toMatchObject({ type: "image", props: { src: input.logoUrl, href: "/" } });
    expect(request.theme.id).toBe("store-design");
    expect(JSON.stringify(input.design)).toBe(source);
  });
  it("keeps old starter pages and omitted branding compatible", () => {
    const body = buildSetup(choices());
    expect(body.pages[0].sections.length).toBeGreaterThan(0);
    expect(body.pages[0].tree).toBeUndefined();
    expect(body).not.toHaveProperty("logoUrl");
  });
  it("uses an editable tree with the merchant's own name in every language and logo", () => {
    const input = choices();
    input.logoUrl = " https://cdn.example.com/brand.png ";
    input.templateTree = { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "section", type: "section", props: {}, children: [{ id: "h", type: "heading", props: { text: { ar: "{{store.name}}", en: "{{store.name}}", he: "{{store.name}}" }, level: 1 } }] }] } };
    const before = JSON.stringify(input.templateTree);
    const body = buildSetup(input);
    expect(body.logoUrl).toBe("https://cdn.example.com/brand.png");
    expect(body.pages[0].sections).toEqual([]);
    expect(body.pages[0].tree?.root.children?.[0].children?.[0].props.text).toEqual(input.name);
    expect(JSON.stringify(input.templateTree)).toBe(before);
    expect(body.replaceHome).toBe(false);
    input.include.home = false;
    input.replaceHome = true;
    expect(buildSetup(input).pages).toEqual([]);
    expect(buildSetup(input).replaceHome).toBe(false);
  });
});
