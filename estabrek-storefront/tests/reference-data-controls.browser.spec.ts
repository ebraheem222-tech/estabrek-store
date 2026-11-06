import { expect, test } from "@playwright/test";
import { build } from "../../estabrek-admin/node_modules/esbuild/lib/main.js";
import path from "node:path";

let javascript = "", css = "";
test.beforeAll(async () => {
  // Use the repository's installed bundler; exercise real components without API/DB fixtures.
  const result = await build({ stdin: { contents: `
    import React from "react";
    import {createRoot} from "react-dom/client";
    import {ScheduleView,ComparisonView} from "./src/pageTree/ReferenceDataViews";
    import {scheduleOf,comparisonOf} from "./src/pageTree/referenceData";
    const items = [{day:{en:"Friday",he:"שישי"},time:"09:00",title:{en:"Welcome",he:"פתיחה"},location:{en:"Hall A",he:"אולם א"},href:"/shop"},{day:{he:"שישי"},time:"10:00",title:{en:"Workshop",he:"סדנה"}},{day:{en:"Saturday",he:"שבת"},time:"11:00",title:{en:"Closing",he:"סיום"},href:"javascript:alert(1)"}];
    const comparison = comparisonOf({label:{en:"Plans",he:"מסלולים"},caption:{he:"לבחירתכם"},columns:Array.from({length:6},(_,i)=>({title:{he:"מסלול "+(i+1)},highlight:i===1,href:i===0?"javascript:alert(1)":"/shop",cta:{he:"בחירה"}})),rows:[{label:{he:"משלוח"},values:[{state:"yes"},{state:"no"},null,{text:{he:"מהיר"}}]},...Array.from({length:15},(_,i)=>({label:{he:"תכונה "+i},values:[]}))],stickyHeader:true});
    createRoot(document.getElementById("root")).render(<main dir="rtl" style={{maxWidth:"100%"}}>{["cards","table","timeline"].map(layout=><section key={layout} data-layout={layout}><ScheduleView spec={scheduleOf({label:{he:"תכנית "+layout},items,layout,filterDays:true,showLocation:layout!=="timeline"})} lang="he" main="en"/></section>)}<ComparisonView spec={comparison} lang="he" main="en"/></main>);
  `, resolveDir: path.resolve("."), loader: "tsx" }, bundle: true, write: false, platform: "browser", outfile: "reference-fixture.js", jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
  javascript = result.outputFiles.find(file => file.path.endsWith(".js"))!.text;
  css = result.outputFiles.find(file => file.path.endsWith(".css"))?.text ?? "";
});
test.beforeEach(async ({ page }) => {
  await page.setContent(`<style>body{margin:0;padding:12px;box-sizing:border-box}*{box-sizing:inherit}${css}</style><div id="root"></div>`);
  await page.addScriptTag({ content: javascript });
});

test("every schedule layout filters translated days by keyboard without changing another instance", async ({ page }) => {
  for (const layout of ["cards", "table", "timeline"]) {
    const schedule = page.locator(`[data-layout="${layout}"]`);
    const friday = schedule.getByRole("button", { name: "שישי", exact: true });
    await friday.focus();
    await page.keyboard.press("Enter");
    await expect(friday).toHaveAttribute("aria-pressed", "true");
    await expect(schedule.getByText("פתיחה", { exact: true })).toBeVisible();
    await expect(schedule.getByText("סדנה", { exact: true })).toBeVisible();
    await expect(schedule.getByText("סיום", { exact: true })).toHaveCount(0);
    await schedule.getByRole("button", { name: "כל הימים", exact: true }).click();
    await expect(schedule.getByText("סיום", { exact: true })).toBeVisible();
  }
  await page.locator('[data-layout="cards"]').getByRole("button", { name: "שישי", exact: true }).click();
  await expect(page.locator('[data-layout="table"]').getByText("סיום", { exact: true })).toBeVisible();
  await expect(page.locator('[data-layout="timeline"]').getByText("אולם א", { exact: true })).toHaveCount(0);
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
});

test("comparison preserves semantic cells, localized statuses and confined mobile scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const table = page.getByRole("table", { name: /מסלולים/ });
  await expect(table.getByRole("columnheader")).toHaveCount(7);
  await expect(table.getByRole("rowheader", { name: "משלוח", exact: true })).toHaveCount(1);
  const row = table.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "משלוח", exact: true }) });
  await expect(row.getByRole("cell")).toHaveCount(6);
  await expect(row.getByRole("cell").nth(0)).toContainText("כן");
  await expect(row.getByRole("cell").nth(1)).toContainText("לא");
  await expect(row.getByRole("cell").nth(2)).toContainText("—");
  await expect(row.getByRole("cell").nth(3)).toContainText("מהיר");
  await expect(table.getByRole("link")).toHaveCount(5);
  const highlight = table.getByRole("columnheader", { name: /מסלול 2/ });
  await expect(highlight).toHaveClass(/highlight/);
  await expect(highlight).toHaveCSS("position", "sticky");
  const scroll = page.getByRole("region", { name: "מסלולים", exact: true });
  await scroll.focus();
  await expect(scroll).toBeFocused();
  expect(await scroll.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
