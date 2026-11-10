import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REFERENCE_SECTIONS, makeReferenceSection } from "../../estabrek-admin/src/studio/referenceSections";

test.beforeAll(() => {
  let next = 0;
  const sections = REFERENCE_SECTIONS.map(reference => makeReferenceSection(reference.kind, "en", prefix => `${prefix}-${next++}`));
  const folder = path.resolve(process.cwd(), "../.tmp");
  mkdirSync(folder, { recursive: true });
  writeFileSync(path.join(folder, "reference-ready-sections.json"), JSON.stringify(sections));
});

// Every starter in the list (19 at first; the list grew with the new reference designs, cc97d9b).
test("all the reference starters render editable content and fit desktop and mobile", async ({ page }) => {
  test.setTimeout(420000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/en/reference-lab");
    await page.addStyleTag({ content: "header:not([data-tree-node]){visibility:hidden!important}" });
    const sections = page.locator("section[data-tree-node]");
    await expect(sections).toHaveCount(REFERENCE_SECTIONS.length);
    for (const [index, reference] of REFERENCE_SECTIONS.entries()) {
      const section = sections.nth(index);
      await section.scrollIntoViewIfNeeded();
      await expect(section.locator("h2").first(), reference.kind).toContainText(reference.name.en);
      const overflow = await section.evaluate(element => element.scrollWidth - element.clientWidth);
      expect(overflow, `${reference.kind}/${width}`).toBeLessThanOrEqual(1);
      if (width === 1440 && [0, 1, 5, 9, 10, 14, 18].includes(index)) await section.screenshot({ path: `../.tmp/reference-capabilities/${reference.kind}.png` });
      if (width === 390 && [0, 5, 10].includes(index)) await section.screenshot({ path: `../.tmp/reference-capabilities/${reference.kind}-phone.png` });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${width}px page overflow`).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});
