import { describe, expect, test } from "vitest";
import { MailchimpError, dataCentre, mailchimpLists, memberHash, putMember } from "../lib/mailchimp.js";
import { invoiceHtml, invoiceLines, type InvoiceOrder } from "../lib/invoice.js";

// Mailchimp's calls (lib/mailchimp.ts) against a stand-in for its API, and the invoice page (lib/invoice.ts); no
// database, no network.
// Made-up keys of Mailchimp's shape, put together from parts (not real keys; secret scanners match the whole).
const HEX = "0123456789abcdef".repeat(2);
const KEY = `${HEX}-us21`;
type Call = { url: string; init: RequestInit };
const fakeFetch = (status: number, body: unknown, calls: Call[] = []) =>
  (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }) as unknown as typeof fetch;

describe("Mailchimp", () => {
  test("a key's data centre; anything else isn't a key", () => {
    expect(dataCentre(KEY)).toBe("us21");
    expect(dataCentre(` ${HEX}-US6 `)).toBe("us6");
    expect(dataCentre("not-a-key")).toBeNull();
    expect(dataCentre(HEX)).toBeNull();
    expect(memberHash(" Sara@Shop.TEST ")).toBe(memberHash("sara@shop.test"));
    expect(memberHash("sara@shop.test")).toMatch(/^[0-9a-f]{32}$/);
  });

  test("a member added by PUT to the audience, in its data centre, with the key, subscribed or asked to confirm", async () => {
    const calls: Call[] = [];
    await putMember(KEY, "abc123", "Sara@Shop.test", false, fakeFetch(200, { id: "x" }, calls));
    await putMember(KEY, "abc123", "sara@shop.test", true, fakeFetch(200, { id: "x" }, calls));
    expect(calls[0].url).toBe(`https://us21.api.mailchimp.com/3.0/lists/abc123/members/${memberHash("sara@shop.test")}`);
    expect(calls[0].init.method).toBe("PUT");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from(`store:${KEY}`).toString("base64")}`);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ email_address: "sara@shop.test", status_if_new: "subscribed" });
    expect(JSON.parse(String(calls[1].init.body)).status_if_new).toBe("pending");
  });

  test("the key's audiences; Mailchimp's own words when it refuses", async () => {
    const lists = await mailchimpLists(KEY, fakeFetch(200, { lists: [{ id: "abc123", name: "Shop", stats: { member_count: 12 } }] }));
    expect(lists).toEqual([{ id: "abc123", name: "Shop", members: 12 }]);
    const err = await mailchimpLists(KEY, fakeFetch(401, { title: "API Key Invalid", detail: "Your API key may be invalid." })).catch((e) => e);
    expect(err).toBeInstanceOf(MailchimpError);
    expect([err.status, err.message]).toEqual([401, "Your API key may be invalid."]);
    await expect(mailchimpLists("nope", fakeFetch(200, {}))).rejects.toThrow(/Not a Mailchimp API key/);
  });
});

describe("the invoice page", () => {
  const order = (extra: Partial<InvoiceOrder> = {}): InvoiceOrder => ({
    id: "cmorder0000000000abcdef12", quantity: 1, unitPrice: null, subtotal: 300 as never, discountAmount: 30 as never, total: 270 as never, currencyCode: "ILS", couponCode: "EID10",
    customerName: "سارة <b>", phone: "0599123456", email: null, country: "IL", city: "الناصرة", address: "شارع 1", note: null,
    paymentProvider: null, paymentStatus: null, locale: "ar", termsAcceptedAt: null, createdAt: new Date("2026-11-21T10:00:00Z"), userId: "u1",
    items: [
      { productTitle: "شال حرير", colorName: "وردي", colorHex: null, sizeName: null, sku: "SH-1", imageUrl: "/uploads/a.jpg", quantity: 2, unitPrice: 100 as never, lineSubtotal: 200 as never },
      { productTitle: "فستان", colorName: null, colorHex: null, sizeName: "M", sku: null, imageUrl: null, quantity: 1, unitPrice: 100 as never, lineSubtotal: 100 as never },
    ],
    variant: null,
    ...extra,
  }) as InvoiceOrder;
  const site = { siteName: "استبرق", logoUrl: "/uploads/logo.png", contactEmail: "hi@shop.test", contactPhone: "0500000000", currencyCode: "ILS" };

  test("the discount spread over the lines; the totals", () => {
    const { lines, subtotal, discountAmount, total } = invoiceLines(order());
    expect([subtotal, discountAmount, total]).toEqual([300, 30, 270]);
    expect(lines.map((l) => l.lineTotal)).toEqual([180, 90]);
  });

  test("in Arabic right to left, in English left to right; the shopper's words escaped; paid and terms marked", () => {
    const ar = invoiceHtml(order(), site, { baseUrl: "https://api.shop.test/", lang: "ar" });
    expect(ar).toContain('<html lang="ar" dir="rtl">');
    expect(ar).toContain("المجموع الكلي");
    expect(ar).toContain("سارة &lt;b&gt;");
    expect(ar).not.toContain("سارة <b>");
    expect(ar).toContain('src="https://api.shop.test/uploads/a.jpg"');
    expect(ar).toContain("كوبون: EID10");
    expect(ar).toContain("الدفع عند الاستلام");
    expect(ar).not.toContain("وافقت على شروط المتجر");
    const en = invoiceHtml(order({ paymentStatus: "PAID", termsAcceptedAt: new Date() }), site, { baseUrl: "https://api.shop.test", lang: "en" });
    expect(en).toContain('<html lang="en" dir="ltr">');
    expect(en).toContain(">Paid<");
    expect(en).toContain("Agreed to the store&#39;s terms");
    expect(invoiceHtml(order(), site, { baseUrl: "https://x.test", lang: "fr" })).toContain('lang="ar"');
  });
});
