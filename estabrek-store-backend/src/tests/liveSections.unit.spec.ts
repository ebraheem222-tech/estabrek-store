import { describe, expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
import { LIVE_SECTIONS, makeLiveSection } from "../../../estabrek-admin/src/studio/liveSections";

const dropped = (a: unknown, b: unknown, path: string, out: string[] = []): string[] => {
  if (a && typeof a === "object") for (const [k, v] of Object.entries(a)) {
    const there = b && typeof b === "object" ? (b as Record<string, unknown>)[k] : undefined;
    if (there === undefined) out.push(`${path}.${k}`); else dropped(v, there, `${path}.${k}`, out);
  }
  return out;
};

// The editor's forty ready sections on live backgrounds (admin studio/liveSections.ts) must pass
// the same check a page passes before it's saved, in every language.
describe("live background sections", () => {
  test.each(["ar", "en", "he"] as const)("all forty pass the page check in %s", (lang) => {
    for (const def of LIVE_SECTIONS) {
      let n = 0;
      const section = makeLiveSection(def.kind, lang, prefix => `${prefix.replace(/[^A-Za-z0-9_-]/g, "x")}-${n++}`)!;
      const result = checkTree({ version: 1, root: { id: "page", type: "page", props: {}, children: [section] } });
      expect(result.ok ? [] : result.issues, def.kind).toEqual([]);
      // Nothing is dropped on the way: every setting the section carries is a real one.
      if (result.ok) expect(dropped(JSON.parse(JSON.stringify(section)), result.tree.root.children![0], def.kind), def.kind).toEqual([]);
    }
  });
});
