import { expect, test, type Page } from "@playwright/test";

// Plan 3.7: the chart's new kinds on a shop page: a sunburst that opens, flows, flight lines, bars in 3D and a live
// line counting a table's rows (the backend's GET /v1/data/<table>/per/<every>, played by the test catalog).
const API = "http://127.0.0.1:4100";
const PATH = "/en/publication-fixture-en";
const en = (text: string) => ({ en: text });
const it = (label: string, value: number, more: Record<string, unknown> = {}) => ({ label: en(label), value, ...more });

const charts = [
  { id: "sun", type: "chart", props: { kind: "sunburst", label: en("Where it goes"), unit: en("k"), items: [it("VMs", 40, { group: en("Compute") }), it("Functions", 10, { group: en("Compute") }), it("Disks", 20, { group: en("Storage") }), it("Support", 30)] } },
  { id: "flow", type: "chart", props: { kind: "sankey", label: en("Journeys"), items: [it("Search", 60, { to: en("Pricing") }), it("Social", 40, { to: en("Pricing") }), it("Pricing", 30, { to: en("Trial") }), it("Pricing", 70, { to: en("Left") })] } },
  { id: "fly", type: "chart", props: { kind: "flights", label: en("We deliver to"), hub: "amman", unit: en("days"), items: [it("", 5, { city: "london" }), it("", 2, { city: "dubai" }), it("Beirut shop", 1, { city: "beirut" })] } },
  { id: "iso", type: "chart", props: { kind: "bars3d", label: en("Orders"), items: [it("Mon", 12, { group: en("W1") }), it("Tue", 30, { group: en("W1") }), it("Mon", 8, { group: en("W2") })] } },
  { id: "live", type: "chart", props: { kind: "live", label: en("Sign-ups"), table: "visits", every: "hour", last: 12, items: [it("-", 0)] } },
  { id: "shut", type: "chart", props: { kind: "live", label: en("Closed"), table: "closed-table", items: [it("-", 0)] } },
  // Not set yet: no city to start from. The shop doesn't show it.
  { id: "unset", type: "chart", props: { kind: "flights", label: en("Unset"), items: [it("x", 1, { city: "paris" })] } },
];
const publish = async (page: Page) => {
  const res = await page.request.post(`${API}/__test/published-page`, {
    data: {
      slug: "/publication-fixture-en",
      page: {
        id: "charts-fixture", slug: "/publication-fixture-en", name: "Charts", status: "PUBLISHED", format: 2, sections: [],
        tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: { contained: true }, children: charts }] } },
      },
    },
  });
  expect(res.ok()).toBeTruthy();
};
const node = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`);

test.describe.configure({ mode: "serial" });
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.request.post(`${API}/__test/per-counts`, { data: { counts: [{ ago: 0, n: 3 }, { ago: 2, n: 1 }] } });
  await page.request.post(`${API}/__test/live`, { data: { reset: true } });
  await publish(page);
  await page.goto(PATH);
});
test.afterEach(async ({ request }) => {
  await request.post(`${API}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
  await request.post(`${API}/__test/per-counts`, { data: { counts: [] } });
});

test("sunburst: the groups with their share; a group opens to its items and comes back", async ({ page }) => {
  const sun = node(page, "sun");
  const rows = sun.locator("[data-pt-chart-row]");
  await expect(rows).toHaveCount(3);
  await expect(sun.locator('[data-pt-chart-row="Compute"]')).toContainText("50 k");
  await expect(sun.locator('[data-pt-chart-row="Compute"]')).toContainText("50%");
  // A group without items doesn't open.
  await expect(sun.locator('[data-pt-chart-row="Support"]')).toBeDisabled();
  await sun.locator('[data-pt-chart-row="Compute"]').click();
  await expect(rows).toHaveText([/VMs.*40 k.*80%/, /Functions.*10 k.*20%/]);
  await expect(sun.locator("svg")).toHaveAttribute("aria-label", "Compute");
  await sun.locator("[data-pt-chart-back]").click();
  await expect(rows).toHaveCount(3);
});

test("sankey: a ribbon per flow, its words shown on pointing at it; flights: sorted by distance, planes in the air", async ({ page }) => {
  const flow = node(page, "flow");
  await expect(flow.locator("[data-pt-flow]")).toHaveCount(4);
  await flow.locator('[data-pt-flow="Search>Pricing"]').hover({ force: true });
  await expect(flow.locator("p").first()).toContainText("Search → Pricing · 60 (100%)");

  const fly = node(page, "fly");
  await expect(fly.locator("[data-pt-chart-row]")).toHaveText([/Beirut shop.*km.*1 days/, /Dubai.*km.*2 days/, /London.*km.*5 days/]);
  await expect(fly.getByText("From Amman").first()).toBeVisible();
  await expect(fly.locator("animateMotion")).toHaveCount(3);
});

test("3D bars: a bar per item; pointing at one tells its row, name and value", async ({ page }) => {
  const iso = node(page, "iso");
  await expect(iso.locator("[data-pt-bar]")).toHaveCount(3);
  await expect(iso.getByText("Total")).toBeVisible();
  await iso.locator('[data-pt-bar="Tue"]').hover({ force: true });
  await expect(iso.locator("[aria-live]")).toContainText("W1 · Tue");
  await expect(iso.locator("[aria-live]")).toContainText("30");
});

test("live: the table's count this hour, again the moment a row is added; a closed table says so; an unset chart isn't shown", async ({ page }) => {
  const live = node(page, "live");
  await expect(live.locator("[data-pt-live-now]")).toHaveText("3");
  await expect(live.locator("[data-state]")).toHaveAttribute("data-state", "ready");
  // A row is added: the count is read again (the table now says 4 this hour).
  await page.request.post(`${API}/__test/per-counts`, { data: { counts: [{ ago: 0, n: 4 }, { ago: 2, n: 1 }] } });
  await expect.poll(async () => (await (await page.request.get(`${API}/__test/live`)).json()).open.join(",")).toContain("visits");
  await page.request.post(`${API}/__test/live`, { data: { table: "visits", op: "added", id: "row-9" } });
  await expect(live.locator("[data-pt-live-now]")).toHaveText("4", { timeout: 8000 });
  // Per minute instead: asked of the table per minute.
  await live.getByRole("button", { name: "Per minute" }).click();
  await expect.poll(async () => (await (await page.request.get(`${API}/__test/per-counts`)).json()).reads.some((r: { every: string }) => r.every === "minute")).toBe(true);

  await expect(node(page, "shut").getByText("This table isn't open to visitors.")).toBeVisible();
  await expect(node(page, "unset")).toBeHidden();
});
