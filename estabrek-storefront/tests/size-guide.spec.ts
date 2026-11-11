import { test, expect } from "@playwright/test";

// The size guide (components/SizeGuide.tsx): this piece's sizes marked and the picked one, a tap there picks a size,
// and her size from her own measurements. The Berry dress comes in M and L (tests/catalog-server.mjs).
test("the guide marks the piece's sizes, picks one with a tap, and finds her size", async ({ page }) => {
  await page.goto("/p/rose-dress");
  await page.getByRole("radiogroup", { name: "اللون" }).getByRole("radio", { name: /Berry/ }).click();
  const sizes = page.locator(".rose-pdp-sizes");
  await expect(sizes.getByRole("radio", { name: "M" })).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: "دليل المقاسات" }).click();
  const guide = page.getByRole("dialog", { name: "دليل المقاسات" });
  await expect(guide).toBeVisible();
  const rows = guide.locator("tbody tr");
  await expect(rows).toHaveCount(5);
  await expect(guide.locator("tbody tr[data-has]")).toHaveCount(2);
  await expect(guide.locator("tbody tr[data-picked]")).toContainText("(M)");
  // S isn't one of this piece's sizes: nothing to tap there.
  await expect(rows.nth(0).getByRole("button")).toHaveCount(0);

  // Her measurements: a bust of 96 is an L, which this piece comes in.
  const finder = guide.getByTestId("size-finder");
  await finder.getByLabel("الصدر").fill("96");
  await expect(finder.getByRole("status")).toContainText("مقاسكِ الأقرب: 3 (L)");
  await expect(guide.locator("tbody tr[data-found]")).toContainText("(L)");
  // A waist of 85 makes it an XL (it has to fit everywhere), which this piece doesn't come in.
  await finder.getByLabel("الخصر").fill("85");
  await expect(finder.getByRole("status")).toContainText("4 (XL)");
  await expect(finder.getByRole("status")).toContainText("هالقطعة ما بتيجي بهالمقاس.");
  // Past the table.
  await finder.getByLabel("الخصر").fill("120");
  await expect(finder.getByRole("status")).toContainText("أكبر من الجدول");
  await finder.getByLabel("الخصر").fill("");

  // A tap on L picks it and closes the guide.
  await finder.getByRole("button", { name: "اختاري L" }).click();
  await expect(guide).toBeHidden();
  await expect(sizes.getByRole("radio", { name: "L" })).toHaveAttribute("aria-checked", "true");
});
