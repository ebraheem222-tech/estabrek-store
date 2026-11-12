import { expect, test, type Page } from "@playwright/test";

// A recipe built in the editor (when → who → if → do, on fail) and tried in the preview: the question it asks shows
// over the page, a "no" runs its fail steps; what a recipe keeps for customers still shows in the editor.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const readNode = (page: Page, id: string) => page.evaluate((nodeId) => (window as any).__canvasHarness.getNode(nodeId)?.node, id);
const recipe = async (page: Page) => (await readNode(page, "action"))?.props?.triggers?.[0];
const pick = async (page: Page, id: string) => {
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator(`[data-testid="studio-layer"][data-node="${id}"]`).click();
  await expect(page.getByTestId("studio-info")).toContainText(id);
};
/** The editor takes the next press once its last save is done. */
const settled = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 30000 });

test("a recipe that asks first is built from a ready one, kept for customers, and tried in the preview", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await pick(page, "action");
  const panel = page.getByTestId("studio-triggers");
  await expect(panel).toBeVisible();

  // A ready one: a click asks "Sure?", then opens a link; a "no" says so.
  await panel.locator('[data-trigger-preset="ask-go"]').click();
  await expect.poll(async () => (await recipe(page))?.do?.map((s: { act: string }) => s.act)).toEqual(["confirm", "link"]);
  expect((await recipe(page)).fail?.[0]?.act).toBe("toast");
  await settled(page);

  // Customers only, hidden from everyone else: in the editor it still shows.
  await panel.getByTestId("trigger-0-who").selectOption("customer");
  await expect.poll(async () => (await recipe(page))?.who).toBe("customer");
  await settled(page);
  await panel.getByTestId("trigger-0-deny").selectOption("hide");
  await expect.poll(async () => (await recipe(page))?.deny).toBe("hide");
  await settled(page);
  const button = frame(page).locator('[data-tree-node="action"]');
  await expect(button).toHaveAttribute("data-pt-who", "customer", { timeout: 20000 });
  await expect(button).toBeVisible();

  // Tried from the panel (a click in the preview selects): the question shows over the page.
  await panel.getByTestId("trigger-0-test").click();
  const ask = frame(page).locator("#pt-ask");
  await expect(ask).toBeVisible({ timeout: 20000 });
  await expect(ask.locator("[data-pt-ask]")).toHaveCount(2);
  await ask.locator('[data-pt-ask="no"]').click();
  await expect(ask).toHaveCount(0);
  // The fail steps ran: their message shows; the link didn't open.
  await expect(frame(page).locator("#pt-toast")).toHaveText(/\S/);
  await expect(button).toBeVisible();

  // A condition on the bag, with steps for when it doesn't hold.
  await panel.getByTestId("trigger-0-if-add").click();
  await expect.poll(async () => (await recipe(page))?.if?.[0]?.if).toBe("var");
  await settled(page);
  await panel.getByTestId("trigger-0-if-0-kind").selectOption("bag");
  await expect.poll(async () => (await recipe(page))?.if?.[0]).toEqual({ if: "bag", cmp: "gte", value: 1 });
  await settled(page);
  await panel.getByTestId("trigger-0-else-add").click();
  await expect.poll(async () => (await recipe(page))?.else?.length).toBe(1);
});
