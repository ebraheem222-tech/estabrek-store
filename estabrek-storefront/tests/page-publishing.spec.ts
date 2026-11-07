import { expect, test } from "@playwright/test";

for (const lang of ["en", "ar"]) test(`${lang}: publish a new page after a missing URL visit, retaining its SVG edges`, async ({ page, context }) => {
  test.setTimeout(120000);
  await page.goto(`http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=${lang}&publishing=1`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  const customer = await context.newPage();
  const url = `http://127.0.0.1:3000/${lang}/publication-fixture-${lang}`;
  const missing = await customer.goto(url);
  expect(missing!.status()).toBe(404);
  await expect(customer.locator('[data-cms-page-id="editor-controls-fixture"]')).toHaveCount(0);
  const frame = page.frameLocator('[data-testid="studio-frame"]');
  await frame.locator("html").evaluate(() => { (window as any).__publicationDocument = "retained"; });
  await page.getByTestId("studio-page-motion-open").click();
  await page.locator('[data-testid="studio-layer"][data-node="objects"]').click();
  await page.locator('[data-testid="studio-layer"][data-node="drawing"]').click();
  for (const side of ["top", "bottom"]) {
    await page.getByTestId(`studio-edge-pick-${side}`).click();
    await page.getByTestId("decor-grid").locator("button[data-decor]").first().click();
    await expect(frame.locator(`[data-tree-node="drawing"] > .pt-edge-${side}`)).toHaveCount(1);
  }
  expect(await frame.locator("html").evaluate(() => (window as any).__publicationDocument)).toBe("retained");
  await page.getByTestId("studio-publish").click();
  await page.getByTestId("page-publish-confirm").click();
  await expect(page.getByTestId("studio-publish")).toBeDisabled();
  await expect(page.getByTestId("page-publish-dialog")).toHaveCount(0);
  const live = await customer.goto(url);
  expect(live!.status()).toBe(200);
  await expect(customer.locator('[data-cms-page-id="editor-controls-fixture"]')).toHaveAttribute("data-cms-publication", /^publication-/);
  await expect(customer.locator('[data-tree-node="drawing"] > .pt-edge-top svg')).toHaveCount(1);
  await expect(customer.locator('[data-tree-node="drawing"] > .pt-edge-bottom svg')).toHaveCount(1);
  await customer.close();
});
