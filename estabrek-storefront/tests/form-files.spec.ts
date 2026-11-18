import { expect, test, type Page } from "@playwright/test";
import { formOf, problemOf, valuesFor, type FormFieldSpec } from "../src/pageTree/formSpec";

// A form with a file box (the form element's "file" kind, to a table): the file the shopper picks is uploaded into the
// table's field of the same name first (the backend's POST /v1/data/<table>/files/<field>, played by the fixture),
// and what comes back is the value the row is sent with. The field's own limits are said under the box, in the
// page's language; nothing is sent then.

const say = (w: unknown) => (w && typeof w === "object" ? String((w as Record<string, string>).en ?? "") : "");
const MOCK = "http://127.0.0.1:4100";
const PDF = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(3000, 32), Buffer.from("\n%%EOF")]);

test.describe("a file box as data", () => {
  test("a field of its own kind; checked as needed or not; never sent as words (its upload is)", () => {
    const spec = formOf({ kind: "custom", send: { to: "table", table: "applications" }, fields: [{ name: "cv", kind: "file", label: { en: "Your CV" }, required: true }] }, say);
    expect(spec.fields[0]).toMatchObject({ name: "cv", kind: "file", required: true });
    const f: FormFieldSpec = spec.fields[0];
    expect(problemOf(f, "", "en")).toBe("This is needed");
    expect(problemOf(f, "cv.pdf", "en")).toBeNull();
    expect(valuesFor([f], { cv: "cv.pdf" }, "table")).toEqual({});
  });
});

const PAGE = {
  id: "files-fixture",
  slug: "/publication-fixture-en",
  name: "Files",
  status: "PUBLISHED",
  format: 2,
  sections: [],
  tree: {
    version: 1,
    root: {
      id: "page", type: "page", props: {}, children: [
        { id: "sec", type: "section", props: { contained: true }, style: { base: { pad: [80, 24, 80, 24] } }, children: [
          { id: "apply", type: "form", props: { kind: "custom", title: { en: "Apply" }, button: { en: "Send it" }, send: { to: "table", table: "applications" }, fields: [
            { name: "name", kind: "text", label: { en: "Your name" }, required: true },
            { name: "cv", kind: "file", label: { en: "Your CV (PDF)" }, required: true },
          ] } },
        ] },
      ],
    },
  },
};
const el = (page: Page) => page.locator('[data-tree-node="apply"]');
const cv = (page: Page) => el(page).locator('[name="cv"]');
const bad = (page: Page) => el(page).locator('[data-field="cv"] [role="alert"]');
const sent = async (page: Page) => (await (await page.request.get(`${MOCK}/__test/data-rows`)).json()).rows as Array<{ table: string; values: Record<string, unknown> }>;
const uploads = async (page: Page) => (await (await page.request.get(`${MOCK}/__test/uploads`)).json()).uploads as Array<{ name: string; field: string }>;

test.describe("a file box on a page", () => {
  test.beforeEach(async ({ page }) => {
    expect((await page.request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: PAGE } })).ok()).toBeTruthy();
    await page.request.post(`${MOCK}/__test/data-rows`);
    await page.request.post(`${MOCK}/__test/uploads`);
    await page.goto("/en/publication-fixture-en");
    await expect(el(page).locator("form[data-pt-form]")).toBeVisible();
  });
  test.afterEach(async ({ request }) => {
    await request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
  });

  test("the file is uploaded first, and the row goes with what came back; the form empties", async ({ page }) => {
    await expect(cv(page)).toHaveAttribute("type", "file");
    await el(page).locator('[name="name"]').fill("Rana");
    // Needed: said before anything goes.
    await el(page).locator('button[type="submit"]').click();
    await expect(bad(page)).toHaveText("This is needed");
    await cv(page).setInputFiles({ name: "Rana CV.pdf", mimeType: "application/pdf", buffer: PDF });
    await expect(bad(page)).toHaveCount(0);
    await el(page).locator('button[type="submit"]').click();
    await expect(el(page).locator("[data-pt-form-note]")).toHaveText("Sent ✓");
    expect(await uploads(page)).toMatchObject([{ name: "Rana CV.pdf", field: "cv" }]);
    expect(await sent(page)).toMatchObject([{ table: "applications", values: { name: "Rana", cv: "file:fixtureupload000000000001" } }]);
    await expect(el(page).locator('[name="name"]')).toHaveValue("");
    await expect(cv(page)).toHaveValue("");
  });

  test("the field's own limits are said under the box, and nothing is sent", async ({ page }) => {
    await el(page).locator('[name="name"]').fill("Sami");
    await cv(page).setInputFiles({ name: "big.pdf", mimeType: "application/pdf", buffer: Buffer.concat([PDF, Buffer.alloc(1_200_000)]) });
    await el(page).locator('button[type="submit"]').click();
    await expect(bad(page)).toHaveText("The file is over 1 MB");
    await cv(page).setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a", "hex") });
    await el(page).locator('button[type="submit"]').click();
    await expect(bad(page)).toHaveText("This kind of file isn't taken here");
    expect(await sent(page)).toEqual([]);
  });
});
