import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { seasonByDate } from "../src/components/SeasonalThemes";

// The seasons "auto" shows (admin → الإعدادات → الثيم الموسمي): winter and summer by the date, decorations only.
// Black Friday is never picked by the date: its badge promises "up to 70% off", a sale a store may not have
// (it showed on every store from 20 to 30 November). It shows only when the owner picks it.

test("by the date: winter and summer; never Black Friday", () => {
  expect(seasonByDate(new Date(2026, 10, 20))).toBe("default");
  expect(seasonByDate(new Date(2026, 10, 25))).toBe("default");
  expect(seasonByDate(new Date(2026, 10, 30))).toBe("default");
  expect(seasonByDate(new Date(2026, 11, 5))).toBe("winter");
  expect(seasonByDate(new Date(2027, 0, 15))).toBe("winter");
  expect(seasonByDate(new Date(2027, 6, 1))).toBe("summer");
  expect(seasonByDate(new Date(2027, 3, 1))).toBe("default");
});

test("the badge's Arabic line keeps its order (its own direction in the left-to-right badge)", () => {
  // Read as written (React can't draw inside this runner's test files).
  for (const file of ["../src/components/SeasonalThemes.tsx"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    expect(source, file).toContain('<span className="bf-discount" dir="rtl">خصم حتى 70%</span>');
  }
});

test("a shop on 25 November shows no Black Friday on its own; in December it is in winter", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-25T10:00:00") });
  await page.goto("/en");
  await page.clock.runFor(4000);
  await expect(page.locator("html")).toHaveAttribute("data-seasonal-theme", "default");
  await expect(page.locator(".black-friday-effect")).toHaveCount(0);

  await page.evaluate(() => localStorage.clear());
  await page.clock.setSystemTime(new Date("2026-12-05T10:00:00"));
  await page.reload();
  await page.clock.runFor(1000);
  await expect(page.locator("html")).toHaveAttribute("data-seasonal-theme", "winter");
});
