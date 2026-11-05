import { expect, test } from "vitest";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { checkTree } from "../lib/pageTree.js";
test("all reference sections save as real editable customer nodes in every language", async () => {
  const { REFERENCE_SECTIONS, makeReferenceSection } = await import(pathToFileURL(path.resolve(__dirname, "../../../estabrek-admin/src/studio/referenceSections.ts")).href);
  const bad: string[] = [];
  for (const lang of ["ar", "en", "he"]) {
    let count = 0;
    const sections = REFERENCE_SECTIONS.map(({ kind }: { kind: string }) => makeReferenceSection(kind, lang, (prefix: string) => `${prefix}-${count++}`));
    const result = checkTree({ version: 1, root: { id: "page", type: "page", props: {}, children: sections } });
    if (!result.ok) bad.push(`${lang}: ${JSON.stringify(result.issues.slice(0, 8))}`);
  }
  expect(bad).toEqual([]);
});
