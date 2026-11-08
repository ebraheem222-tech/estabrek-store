import { expect, test } from "vitest";
import { LIVE_GROUPS, LIVE_SECTIONS, makeLiveSection } from "./liveSections";
import { makeNode } from "./insert";
import { MORE_SCENE_KINDS } from "../../../estabrek-storefront/src/pageTree/scene";
import type { PageTreeNode } from "../api/pages.api";

const flatten = (node: PageTreeNode): PageTreeNode[] => [node, ...(node.children ?? []).flatMap(flatten)];

test("forty live sections, each on its own new drawn background, in three groups", () => {
  expect(LIVE_SECTIONS).toHaveLength(40);
  expect(new Set(LIVE_SECTIONS.map(s => s.kind)).size).toBe(40);
  expect(new Set(LIVE_SECTIONS.map(s => s.scene))).toEqual(new Set(MORE_SCENE_KINDS));
  for (const [group] of LIVE_GROUPS) expect(LIVE_SECTIONS.some(s => s.group === group)).toBe(true);
});

test("every live section is a complete editable section in each language", () => {
  for (const lang of ["ar", "en", "he"] as const) for (const def of LIVE_SECTIONS) {
    let n = 0;
    const ids = (prefix: string) => `${prefix}-${n++}`;
    const section = makeLiveSection(def.kind, lang, ids)!;
    expect(section.type, def.kind).toBe("section");
    expect(section.props.scene, def.kind).toMatchObject({ kind: def.scene, interactive: true });
    const nodes = flatten(section);
    expect(new Set(nodes.map(node => node.id)).size, def.kind).toBe(nodes.length);
    expect(nodes.some(node => node.type === "heading"), def.kind).toBe(true);
    expect(nodes.length, def.kind).toBeGreaterThan(3);
    // Every word is in the edited language, and none is left empty.
    const words = JSON.stringify(section);
    expect(words, def.kind).not.toMatch(/"(ar|en|he)":""/);
    for (const other of ["ar", "en", "he"].filter(l => l !== lang)) expect(words, `${def.kind} ${lang}`).not.toContain(`"${other}":`);
    expect(makeNode(def.kind, lang, ids).type).toBe("section");
  }
});
