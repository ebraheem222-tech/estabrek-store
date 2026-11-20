import { expect, test } from "@playwright/test";
import { TEMPLATES, type KitNode } from "../src/storeThemes/kits";
import { importDesign, markLogo } from "../src/storeThemes/kits/importDesign";

// The setup puts the owner's logo in the header part named "Store logo" (admin buildSetup.ts). The templates drawn
// from references wrote the store's name as a plain button, so a client's logo never showed in its header
// (Liberty Market on a client's shop). The import names the header's first mention of {{store.name}} so.
const all = (n: KitNode): KitNode[] => [n, ...(n.children ?? []).flatMap(all)];
const saysName = (n: KitNode) => JSON.stringify(n.type === "button" ? n.props.label : n.type === "heading" ? n.props.text : null).includes("{{store.name}}");

test("every template's header that shows the store's name has one logo place, the first mention", () => {
  let withName = 0;
  for (const template of TEMPLATES) {
    const header = importDesign(template.id)!.design.header.root as KitNode;
    const nodes = all(header);
    const places = nodes.filter((n) => n.name === "Store logo");
    if (!nodes.some(saysName) && !places.length) continue;
    withName++;
    expect(places, template.id).toHaveLength(1);
    expect(saysName(places[0]) || places[0].type === "heading", template.id).toBe(true);
  }
  // Nearly all of the library's 2000 templates write the store's name in their header.
  expect(withName).toBeGreaterThan(1900);
  const liberty = all(importDesign("reference-liberty-market")!.design.header.root as KitNode).find((n) => n.name === "Store logo")!;
  expect(liberty.type).toBe("button");
});

test("a header already naming its logo place is left as it is; one without the name gets none", () => {
  const named = { id: "r", type: "stack", props: {}, children: [{ id: "a", type: "heading", name: "Store logo", props: { text: { en: "Brand" } } }, { id: "b", type: "button", props: { label: { en: "{{store.name}}" } } }] } as KitNode;
  expect(markLogo(named)).toBe(named);
  const none = { id: "r", type: "stack", props: {}, children: [{ id: "m", type: "menu", props: { items: [] } }] } as KitNode;
  expect(all(markLogo(none)).some((n) => n.name === "Store logo")).toBe(false);
  const two = { id: "r", type: "stack", props: {}, children: [{ id: "x", type: "button", props: { label: { ar: "{{store.name}}", en: "{{store.name}}" } } }, { id: "y", type: "heading", props: { text: { en: "{{store.name}}" } } }] } as KitNode;
  expect(all(markLogo(two)).filter((n) => n.name === "Store logo").map((n) => n.id)).toEqual(["x"]);
});
