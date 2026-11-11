import { test, expect, type APIRequestContext } from "@playwright/test";

// The product page's reviews (RoseReviews.tsx): the average from the product, the approved reviews (first
// names only), and a form whose writer the server takes from the session, never from the form.
const API = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";

test.describe.configure({ mode: "serial" });

/** Gives the dress its reviews (or none), and drops the shop's cached copy of it. */
async function setReviews(request: APIRequestContext, data: Record<string, unknown>) {
  await request.post(`${API}/__test/reviews`, { data });
  await request.post(SITE + "/api/revalidate", { data: { tags: ["catalog"] } });
}

const LIST = [
  { id: "r1", rating: 5, title: "قماش بجنن", body: "القماش ناعم والمقاس مزبوط.", createdAt: "2026-10-02T10:00:00.000Z", author: "لينا" },
  { id: "r2", rating: 4, title: null, body: "حلو كتير بس التوصيل تأخر يوم.", createdAt: "2026-09-20T10:00:00.000Z", author: "سارة" },
  { id: "r3", rating: 4, title: null, body: "اللون متل الصورة بالزبط.", createdAt: "2026-09-02T10:00:00.000Z", author: null },
  { id: "r4", rating: 4, title: "بنصح فيه", body: "لبسته بعرس أختي وكل الناس سألت عنه.", createdAt: "2026-08-12T10:00:00.000Z", author: "رنا" },
];

test.afterAll(async ({ request }) => {
  await setReviews(request, {});
  await request.post(`${API}/__test/languages`, { data: {} });
  await request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms", "catalog"] } });
});

test("a product with no reviews yet invites the first one, with no stars by the price", async ({ page, request }) => {
  await setReviews(request, {});
  await page.goto("/p/rose-dress");
  const reviews = page.getByTestId("product-reviews");
  await expect(reviews.getByRole("heading", { name: "التقييمات" })).toBeVisible();
  await expect(reviews).toContainText("لسا ما في تقييمات");
  await expect(page.getByTestId("product-rating")).toHaveCount(0);
  await expect(reviews.getByTestId("review-write")).toHaveText("اكتبي رأيكِ");
});

test("the average shows by the price and in search results; the list shows first names, three first", async ({ page, request }) => {
  await setReviews(request, { rating: { count: 4, average: 4.3 }, list: LIST });
  await page.goto("/p/rose-dress");
  const link = page.getByTestId("product-rating");
  await expect(link).toContainText("4.3");
  await expect(link).toContainText("4 تقييمات");
  await expect(link).toHaveAttribute("href", "#pdp-reviews");
  // Search engines get the same numbers.
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  const product = ld.map((t) => JSON.parse(t)).find((x) => x["@type"] === "Product");
  expect(product.aggregateRating).toMatchObject({ "@type": "AggregateRating", ratingValue: 4.3, reviewCount: 4 });

  await link.click();
  const reviews = page.getByTestId("product-reviews");
  const list = reviews.getByTestId("review-list");
  await expect(list.locator("li")).toHaveCount(3);
  await expect(list).toContainText("لينا");
  await expect(list).toContainText("القماش ناعم والمقاس مزبوط.");
  // No name given: a plain "shopper".
  await expect(list.locator("li").nth(2)).toContainText("زبونة");
  // How the stars spread, since the list holds every review: one five, three fours.
  await expect(reviews.locator(".rose-reviews-spread li").first()).toContainText("25%");
  await expect(reviews.locator(".rose-reviews-spread li").nth(1)).toContainText("75%");
  await reviews.getByRole("button", { name: "عرض كل التقييمات" }).click();
  await expect(list.locator("li")).toHaveCount(4);
  await expect(list).toContainText("رنا");
});

test("writing a review: stars and a few words, sent without any account id, then a thank-you", async ({ page, request }) => {
  await setReviews(request, {});
  await page.goto("/p/rose-dress");
  const reviews = page.getByTestId("product-reviews");
  await reviews.getByTestId("review-write").click();
  const form = reviews.getByTestId("review-form");
  await form.getByRole("button", { name: "أرسلي رأيكِ" }).click();
  await expect(form.getByRole("alert")).toContainText("اختاري النجوم");

  await form.locator(".rose-review-stars label").nth(4).click();
  await form.getByLabel("عنوان قصير (اختياري)").fill("أحلى فستان");
  await form.getByLabel("شو رأيكِ بالقطعة؟").fill("القماش خفيف ومريح كتير.");
  await form.getByRole("button", { name: "أرسلي رأيكِ" }).click();
  await expect(reviews.getByTestId("review-sent")).toContainText("شكراً");

  const log = await (await request.get(`${API}/__test/review-log`)).json();
  expect(log).toHaveLength(1);
  expect(log[0].productId).toBe("coat");
  expect(log[0].body).toEqual({ rating: 5, title: "أحلى فستان", body: "القماش خفيف ومريح كتير." });
  // Signed out: no session to send.
  expect(log[0].auth).toBeNull();
});

test("the reviews speak Hebrew on a Hebrew page", async ({ page, request }) => {
  await request.post(`${API}/__test/languages`, { data: { enabled: ["ar", "en", "he"], default: "ar" } });
  await request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms"] } });
  await setReviews(request, { rating: { count: 1, average: 5 }, list: LIST.slice(0, 1) });
  await page.waitForTimeout(1200); // the middleware re-reads the store's languages
  await page.goto("/he/p/rose-dress");
  await expect(page.getByTestId("product-rating")).toContainText("ביקורת אחת");
  const reviews = page.getByTestId("product-reviews");
  await expect(reviews.getByRole("heading", { name: "ביקורות" })).toBeVisible();
  await expect(reviews.getByTestId("review-write")).toHaveText("כתיבת ביקורת");
});
