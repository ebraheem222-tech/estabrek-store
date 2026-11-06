import { expect, test } from "vitest";
import { REFERENCE_SECTIONS, makeReferenceSection } from "./referenceSections";
import { makeNode } from "./insert";
import type { PageTreeNode } from "../api/pages.api";
const flatten = (node: PageTreeNode): PageTreeNode[] => [node, ...(node.children ?? []).flatMap(flatten)];
test("all 34 references have independent editable starting sections in each language", () => {
  expect(REFERENCE_SECTIONS).toHaveLength(34);
  expect(new Set(REFERENCE_SECTIONS.map(section => section.kind)).size).toBe(34);
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

test("the latest reference starters expose editable timetables, comparison cells and matrix scenes", () => {
  let count = 0;
  const ids = (prefix: string) => `${prefix}-${count++}`;
  const event = makeReferenceSection("reference-festava", "ar", ids)!;
  expect(flatten(event).find(n => n.type === "schedule")?.props.items).toEqual(expect.arrayContaining([expect.objectContaining({time: "18:00"})]));
  const club = makeReferenceSection("reference-tiya", "en", ids)!;
  const matrix = flatten(club).find(n => n.type === "comparison")!;
  expect(matrix.props.columns).toHaveLength(3);
  expect(matrix.props.rows).toHaveLength(3);
  expect(makeReferenceSection("reference-nexus", "en", ids)?.props.scene).toMatchObject({kind: "matrix"});
});
