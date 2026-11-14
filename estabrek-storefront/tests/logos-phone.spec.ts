import { expect, test } from "@playwright/test";

// Brands' logos on a phone (pageTree/css.ts): smaller and closer together, so two sit in a row. At a computer's
// size and gap (40 px high, 44 px apart) two didn't fit a phone's width and each logo took a row of its own.

const LOGOS = [1, 2, 3, 4, 5, 6].map((n) => ({ src: `/templates/logos/logo-${n}.svg`, alt: { en: `Brand ${n}` } }));

test("logos sit two in a row on a phone and all in one row on a computer", async ({ page }) => {
  await page.request.post("http://127.0.0.1:4100/__test/preview-draft", {
    data: { pageId: "logos", sections: [], rev: 1, updatedAt: "", slug: "/", tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: { contained: true }, children: [{ id: "brands", type: "logos", props: { items: LOGOS } }] }] } } },
  });
  const logos = page.locator(".pt-brands img");
  /** How many rows the logos take. */
  const rows = async () => new Set(await logos.evaluateAll((list) => list.map((el) => Math.round(el.getBoundingClientRect().top)))).size;

  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/en/studio-frame?token=good-draft");
  await expect(logos).toHaveCount(6);
  await expect(logos.first()).toHaveCSS("height", "32px");
  await expect.poll(rows).toBe(3);

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(logos.first()).toHaveCSS("height", "40px");
  await expect.poll(rows).toBe(1);
});
