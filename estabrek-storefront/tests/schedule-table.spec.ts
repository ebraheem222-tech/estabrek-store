import { expect, test, type Page } from "@playwright/test";

// A programme shown as a table (pageTree/ReferenceDataViews.tsx) has a column for who speaks, and one for where,
// only when an item says so. Opening hours and a timetable name neither, and showed two empty columns.

type Item = { day: { en: string }; time: string; title: { en: string }; speaker?: { en: string }; location?: { en: string } };
async function show(page: Page, items: Item[]) {
  await page.request.post("http://127.0.0.1:4100/__test/preview-draft", {
    data: { pageId: "hours", sections: [], rev: 1, updatedAt: "", slug: "/", tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: { contained: true }, children: [{ id: "hours", type: "schedule", props: { layout: "table", items } }] }] } } },
  });
  await page.goto(`/en/studio-frame?token=good-draft&t=${Date.now()}`);
}
const HOURS: Item[] = [
  { day: { en: "Saturday to Thursday" }, time: "9:00 – 20:00", title: { en: "The store is open" } },
  { day: { en: "Friday" }, time: "9:00 – 14:00", title: { en: "A short day" } },
];

test("a programme's table has its speakers and places columns only when an item has them", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await show(page, HOURS);
  const table = page.locator(".pt-hours table");
  await expect(table.locator("thead th")).toHaveText(["Day", "Time", "Session"]);
  await expect(table.locator("tbody tr").first().locator("td, th")).toHaveCount(3);

  // One item with a speaker: the column is there for every row.
  await show(page, [...HOURS, { day: { en: "Monday" }, time: "18:00", title: { en: "A workshop" }, speaker: { en: "Layla" } }]);
  await expect(table.locator("thead th")).toHaveText(["Day", "Time", "Session", "Speaker"]);
  await expect(table.locator("tbody tr").first().locator("td, th")).toHaveCount(4);
  await expect(table.locator("tbody tr").last()).toContainText("Layla");

  // And one with a place.
  await show(page, [...HOURS, { day: { en: "Monday" }, time: "18:00", title: { en: "A workshop" }, location: { en: "The store" } }]);
  await expect(table.locator("thead th")).toHaveText(["Day", "Time", "Session", "Location"]);
  await expect(table.locator("tbody tr").last()).toContainText("The store");
});
