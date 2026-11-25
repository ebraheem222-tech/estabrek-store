import { expect, test, type Page } from "@playwright/test";

// Plan 3.6c: the booking calendar. A service of the store's booked for a day and a time; the time goes with the line
// ("YYYY-MM-DD HH:MM") and one order holds it.
const API = "http://127.0.0.1:4100";
const PATH = "/en/publication-fixture-en";

const calendar = {
  id: "book", type: "bookingCalendar",
  props: { title: { en: "Book your time" }, product: "rose-dress", days: [0, 1, 2, 3, 4], from: "10:00", to: "13:00", every: 60, ahead: 30, closed: ["2026-12-03"] },
};
const publish = async (page: Page) => {
  const res = await page.request.post(`${API}/__test/published-page`, {
    data: {
      slug: "/publication-fixture-en",
      page: {
        id: "booking-fixture", slug: "/publication-fixture-en", name: "Booking", status: "PUBLISHED", format: 2, sections: [],
        tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: { contained: true }, children: [calendar] }] } },
      },
    },
  });
  expect(res.ok()).toBeTruthy();
};
const booked = (page: Page, slots: string[]) => page.request.post(`${API}/__test/booked-slots`, { data: { slots } });
const day = (page: Page, d: string) => page.locator(`[data-tree-node="book"] [data-pt-day="${d}"]`);
const time = (page: Page, t: string) => page.locator(`[data-tree-node="book"] [data-pt-time="${t}"]`);

test.describe.configure({ mode: "serial" });
test.beforeEach(async ({ page }) => {
  // Tuesday 1 December 2026, 8 in the morning, on the shopper's clock.
  await page.clock.setFixedTime(new Date("2026-12-01T08:00:00"));
  await booked(page, ["rose-dress|2026-12-02 11:00"]);
  await page.goto("/en");
  await page.evaluate(() => localStorage.removeItem("estabrak_cart_v1"));
});
test.afterEach(async ({ request }) => {
  await request.post(`${API}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
  await request.post(`${API}/__test/booked-slots`, { data: { slots: [] } });
});

test("open days only, a day off closed, a time another order holds can't be picked; the time goes to the bag", async ({ page }) => {
  await publish(page);
  await page.goto(PATH);
  await expect(page.locator('[data-tree-node="book"] .pt-book')).toHaveAttribute("data-ready", "true");
  // Friday and Saturday aren't open days; Thursday the 3rd is a day off; November is not in this month.
  await expect(day(page, "2026-12-04")).toBeDisabled();
  await expect(day(page, "2026-12-05")).toBeDisabled();
  await expect(day(page, "2026-12-03")).toBeDisabled();
  await expect(day(page, "2026-11-30")).toHaveCount(0);
  await day(page, "2026-12-02").click();
  // Ten to one, an hour each: 10, 11 (held by another order) and 12.
  await expect(page.locator('[data-tree-node="book"] [data-pt-time]')).toHaveCount(3);
  await expect(time(page, "11:00")).toBeDisabled();
  const add = page.locator('[data-tree-node="book"] [data-pt-build-add]');
  await expect(add).toBeDisabled();
  await time(page, "10:00").click();
  await add.click();
  await expect(add).toHaveText(/Added/);
  // The time just put in the bag can't be picked twice.
  await page.keyboard.press("Escape");
  await expect(time(page, "10:00")).toBeDisabled();

  await page.goto("/en/cart");
  await expect(page.locator(".rose-cart-line").getByTestId("cart-detail")).toHaveText("When: 2026-12-02 10:00");
});

test("an order for a time someone took meanwhile is refused, and the bag says which", async ({ page }) => {
  await publish(page);
  await page.goto(PATH);
  await expect(page.locator('[data-tree-node="book"] .pt-book')).toHaveAttribute("data-ready", "true");
  await day(page, "2026-12-02").click();
  await time(page, "12:00").click();
  await page.locator('[data-tree-node="book"] [data-pt-build-add]').click();
  // Someone else books noon first.
  await booked(page, ["rose-dress|2026-12-02 11:00", "rose-dress|2026-12-02 12:00"]);
  await page.goto("/ar/cart");
  await page.getByLabel(/الاسم/).fill("سارة");
  await page.getByLabel(/رقم الهاتف/).fill("0599123456");
  const address = page.getByLabel("العنوان");
  if (await address.count()) await address.fill("شارع البحر 4");
  await page.getByRole("button", { name: /أرسلي الطلب ونتصل بكِ/ }).click();
  await expect(page.getByText(/2026-12-02 12:00/).last()).toBeVisible();
  await expect(page.getByText(/انحجز قبل شوي/)).toBeVisible();
});

test("the days ahead end the calendar: the 30th day ahead is the last, and no month after it", async ({ page }) => {
  await publish(page);
  await page.goto(PATH);
  const cal = page.locator('[data-tree-node="book"]');
  await expect(cal.locator(".pt-book")).toHaveAttribute("data-ready", "true");
  // 30 days from Tuesday 1 December: Wednesday the 30th is the last; Thursday the 31st is past it.
  await expect(cal.locator('[data-pt-day="2026-12-30"]')).toBeEnabled();
  await expect(cal.locator('[data-pt-day="2026-12-31"]')).toBeDisabled();
  await expect(cal.getByRole("button", { name: "Previous month" })).toBeDisabled();
  await expect(cal.getByRole("button", { name: "Next month" })).toBeDisabled();
});
