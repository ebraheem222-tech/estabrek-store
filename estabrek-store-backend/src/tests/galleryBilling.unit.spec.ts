import { describe, expect, it } from "vitest";
import { checkTree, NODE_PROPS } from "../lib/pageTree.js";

const item = { title: { en: " First ", he: "ראשון" }, image: "/art/one.svg", category: { en: "Art" }, href: "/shop" };
const check = (type: string, props: Record<string, unknown>) => checkTree({ version: 1, root: { id: "page", type: "page", children: [{ id: "section", type: "section", children: [{ id: "content", type, props }] }] } });

describe("filter gallery saved contract", () => {
  it("accepts localized gallery content and applies bounded usable defaults", () => {
    const result = check("filterGallery", { items: [item] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tree.root.children![0].children![0].props).toEqual({ items: [{ ...item, title: { en: "First", he: "ראשון" } }], layout: "grid", columns: 3, gap: 20, hoverEffect: "none", lightbox: false, searchable: false, activation: "click" });
  });

  it("retains all presentation and interaction settings", () => {
    const props = { items: [{ ...item, text: { ar: "تفاصيل" }, cta: { en: "View" } }], label: { en: "Work" }, layout: "split", columns: 6, gap: 0, hoverEffect: "tilt", lightbox: true, searchable: true, activation: "hover" };
    const result = check("filterGallery", props);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tree.root.children![0].children![0].props).toMatchObject({ ...props, items: [{ ...props.items[0], title: { en: "First", he: "ראשון" } }] });
    expect(check("filterGallery", { items: [item], layout: "masonry", gap: 48 }).ok).toBe(true);
  });

  it.each([
    { items: [] }, { items: Array.from({ length: 41 }, () => item) },
    { items: [{ ...item, image: "javascript:alert(1)" }] }, { items: [{ ...item, image: "//evil.test/x" }] },
    { items: [{ ...item, href: "data:text/html,x" }] }, { items: [{ ...item, image: undefined }] },
    { items: [{ ...item, title: { en: "x".repeat(161) } }] }, { items: [{ ...item, category: { he: "x".repeat(81) } }] },
    { items: [{ ...item, text: { en: "x".repeat(1201) } }] }, { items: [{ ...item, cta: { en: "x".repeat(61) } }] },
    { label: { en: "x".repeat(161) } }, { layout: "rows" }, { columns: 0 }, { columns: 7 }, { columns: 1.5 },
    { gap: -1 }, { gap: 49 }, { hoverEffect: "script" }, { activation: "auto" }, { lightbox: "true" }, { searchable: 1 },
  ])("rejects invalid gallery values %#", (patch) => expect(check("filterGallery", { items: [item], ...patch }).ok).toBe(false));
});

describe("pricing billing and optional FAQ controls", () => {
  it("retains yearly content and the billing choice without changing legacy defaults", () => {
    const legacy = { items: [{ name: { en: "Plan" }, price: { en: "Contact" } }] };
    expect(NODE_PROPS.pricing.parse(legacy)).toEqual(legacy);
    const props = { items: [{ ...legacy.items[0], yearlyPrice: { en: " Ask us " }, yearlyPeriod: { en: "/year" } }], billing: true, initialBilling: "yearly" };
    expect(NODE_PROPS.pricing.parse(props)).toMatchObject({ billing: true, initialBilling: "yearly", items: [{ yearlyPrice: { en: "Ask us" }, yearlyPeriod: { en: "/year" } }] });
  });

  it.each([{ billing: "yes" }, { initialBilling: "annual" }, { items: [{ name: { en: "Plan" }, price: { en: "10" }, yearlyPrice: { en: "x".repeat(41) } }] }, { items: [{ name: { en: "Plan" }, price: { en: "10" }, yearlyPeriod: { en: "x".repeat(41) } }] }])("rejects malformed billing input %#", (patch) => {
    expect(NODE_PROPS.pricing.safeParse({ items: [], ...patch }).success).toBe(false);
  });

  it("retains explicit FAQ controls but requires a boolean", () => {
    expect(NODE_PROPS.accordion.parse({ items: [], single: false, controls: true })).toEqual({ items: [], single: false, controls: true });
    expect(NODE_PROPS.accordion.safeParse({ items: [], controls: "true" }).success).toBe(false);
  });
});
