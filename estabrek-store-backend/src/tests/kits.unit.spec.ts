import { describe, test, expect, beforeAll } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkTree } from "../lib/pageTree.js";

// The shop's ready templates (estabrek-storefront src/storeThemes/kits, phase 11.3): every page
// of every template, as the gallery shows it and as a store gets it in the editor, must pass
// the same check a page's tree passes before it's saved.

type N = { id: string; type: string; props: Record<string, unknown>; children?: N[] };
type Kits = {
  KIT_KINDS: string[];
  KIT_PAGES: readonly string[];
  kitPage: (kind: string, page?: string, demo?: boolean) => N[] | null;
  TEMPLATES?: Array<{ id: string }>;
  templatePage?: (id: string, page?: string, demo?: boolean) => N[] | null;
};
const SHOP = path.resolve(__dirname, "../../../estabrek-storefront");
let kits: Kits;

beforeAll(async () => {
  kits = (await import(pathToFileURL(path.join(SHOP, "src/storeThemes/kits/index.ts")).href)) as Kits;
}, 120_000);

const treeOf = (sections: N[]) => ({ version: 1, root: { id: "root", type: "page", props: {}, children: sections } });
const ids = (n: N, seen: string[]) => {
  seen.push(n.id);
  n.children?.forEach((c) => ids(c, seen));
  return seen;
};

describe("the shop's ready templates", () => {
  test("every page passes the page's check, in the gallery and in a store", () => {
    const bad: string[] = [];
    const pages: Array<[string, N[] | null]> = [];
    for (const kind of kits.KIT_KINDS) for (const page of kits.KIT_PAGES) for (const demo of [true, false]) pages.push([`${kind}/${page}${demo ? " (gallery)" : ""}`, kits.kitPage(kind, page, demo)]);
    for (const t of kits.TEMPLATES ?? []) for (const page of kits.KIT_PAGES) for (const demo of [true, false]) pages.push([`${t.id}/${page}${demo ? " (gallery)" : ""}`, kits.templatePage!(t.id, page, demo)]);
    expect(kits.TEMPLATES?.length ?? 0).toBeGreaterThanOrEqual(10);
    expect(pages.length).toBeGreaterThan(20);
    for (const [name, sections] of pages) {
      if (!sections) continue;
      const res = checkTree(treeOf(sections));
      if (!res.ok) bad.push(`${name}: ${res.issues.slice(0, 3).map((i) => `${i.path} ${i.message}`).join("; ")}`);
      // Ids are the editor's handles: one of each on a page.
      const all = sections.flatMap((s) => ids(s, []));
      if (new Set(all).size !== all.length) bad.push(`${name}: the same id twice`);
    }
    expect(bad).toEqual([]);
  });
});
