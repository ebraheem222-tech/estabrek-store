import { expect, test } from "vitest";
import { REFERENCE_SECTIONS, makeReferenceSection } from "./referenceSections";
import { makeNode } from "./insert";
import type { PageTreeNode } from "../api/pages.api";
const flatten = (node: PageTreeNode): PageTreeNode[] => [node, ...(node.children ?? []).flatMap(flatten)];
test("all 19 new references have independent editable starting sections in each language", () => {
  expect(REFERENCE_SECTIONS).toHaveLength(19);
  expect(new Set(REFERENCE_SECTIONS.map(section => section.kind)).size).toBe(19);
  for (const lang of ["ar", "en", "he"] as const) for (const reference of REFERENCE_SECTIONS) {
    let count = 0;
    const section = makeReferenceSection(reference.kind, lang, prefix => `${prefix}-${count++}`)!;
    expect(section.type).toBe("section");
    const nodes = flatten(section);
    expect(new Set(nodes.map(node => node.id)).size).toBe(nodes.length);
    expect(nodes.some(node => node.type === "heading")).toBe(true);
    expect(nodes.some(node => ["legacy", "roseBlock", "block"].includes(node.type))).toBe(false);
    expect(makeNode(reference.kind, lang, prefix => `${prefix}-${count++}`).type).toBe("section");
    section.props.customized = true;
    expect(makeReferenceSection(reference.kind, lang, prefix => `${prefix}-${count++}`)!.props.customized).toBeUndefined();
  }
});
