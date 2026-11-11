import { test, expect } from "@playwright/test";

// «كمّلي اللبسة» without AI (RoseCompleteLook.tsx): pieces in colours that go with the colour she picked; it
// follows her pick, each piece opens in its matching colour, and the section stays away when nothing matches.
const API = "http://127.0.0.1:4100";

test.describe.configure({ mode: "serial" });
test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/look`, { data: {} });
});

test("the pieces that go with her colour, following her pick", async ({ page, request }) => {
  await request.post(`${API}/__test/look`, { data: {} });
  await page.goto("/p/rose-dress");
  const look = page.getByTestId("complete-look");
  await look.scrollIntoViewIfNeeded();
  await expect(look.getByRole("heading", { name: "✨ كمّلي اللبسة" })).toBeVisible();
  await expect(look).toContainText("بألوان بتلبق مع Rose");
  await expect(look.getByRole("listitem")).toHaveCount(2);
  // Each opens in the colour that matched.
  await expect(look.getByRole("link", { name: /شال وردي/ })).toHaveAttribute("href", "/p/rose-hijab?c=Rose");
  await expect(look.getByRole("link", { name: /حجاب لؤلؤي/ })).toHaveAttribute("href", "/p/pearl-hijab");
  let log = await (await request.get(`${API}/__test/look-log`)).json();
  expect(log.at(-1)).toEqual({ productId: "coat", color: "c97794" });

  // Another colour: asked again for that one.
  await page.getByRole("radiogroup", { name: "اللون" }).getByRole("radio", { name: /Berry/ }).click();
  await expect(look).toContainText("بألوان بتلبق مع Berry");
  await expect.poll(async () => (await (await request.get(`${API}/__test/look-log`)).json()).at(-1)).toEqual({ productId: "coat", color: "6b2446" });
  log = await (await request.get(`${API}/__test/look-log`)).json();
  expect(log.every((x: { productId: string }) => x.productId === "coat")).toBe(true);
});

test("nothing that goes with it: no empty section", async ({ page, request }) => {
  await request.post(`${API}/__test/look`, { data: { off: true } });
  await page.goto("/p/rose-dress");
  const look = page.getByTestId("complete-look");
  // Scrolled near it (the reviews come right after; an empty section has nothing to scroll to).
  await page.getByTestId("product-reviews").scrollIntoViewIfNeeded();
  await expect.poll(async () => (await (await request.get(`${API}/__test/look-log`)).json()).length).toBeGreaterThan(0);
  await expect(look).toBeHidden();
  await expect(page.getByRole("heading", { name: "✨ كمّلي اللبسة" })).toHaveCount(0);
});
