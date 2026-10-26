import { describe, test, expect } from "vitest";
import { renderEmail, requestFoundText } from "../modules/outbox/sender/emailTemplates.js";

// The shopper emails in Arabic, English and Hebrew, in the store's way of speaking. No database.
const stock = { productTitle: "فستان الورد", colorName: "توتي", sizeName: "M", url: "https://shop.test/p/rose", stopUrl: "https://shop.test/stock-alert/stop?t=x" };

describe("shopper emails", () => {
  test("Estabrek (to women, clothes) reads exactly as before", () => {
    const e = renderEmail("STOCK_BACK_IN", stock, "متجر استبرق", { lang: "ar", audience: "women", industry: "fashion" })!;
    expect(e.subject).toBe("رجعت متوفرة: فستان الورد");
    expect(e.html).toContain("القطعة اللي طلبتِ نخبّركِ عنها رجعت متوفرة:");
    expect(e.html).toContain("الكمية قليلة، فإذا عاجبتكِ لا تتأخري.");
    expect(e.html).toContain("شوفي القطعة");
    expect(e.html).toContain('<html lang="ar" dir="rtl">');
  });

  test("a store for men, or for everyone, says it in its own way; another kind of shop says «المنتج»", () => {
    const men = renderEmail("STOCK_BACK_IN", stock, "Store", { lang: "ar", audience: "men", industry: "fashion" })!;
    expect(men.html).toContain("القطعة اللي طلبت نخبّرك عنها رجعت متوفرة:");
    expect(men.html).toContain("شوف القطعة");
    const all = renderEmail("STOCK_BACK_IN", stock, "Store", { lang: "ar", audience: "everyone", industry: "electronics" })!;
    expect(all.subject).toBe("رجع متوفر: فستان الورد");
    expect(all.html).toContain("المنتج اللي طلبتوا نخبّركم عنه رجع متوفر:");
    expect(all.html).toContain("شوفوا المنتج");
    for (const e of [men, all]) expect(e.html).not.toMatch(/كِ|تتأخري|شوفي/);
  });

  test("English and Hebrew: their own words, direction and stop link", () => {
    const en = renderEmail("STOCK_BACK_IN", { ...stock, productTitle: "Rose dress" }, "Estabrek", { lang: "en", audience: "women", industry: "fashion" })!;
    expect(en.subject).toBe("Back in stock: Rose dress");
    expect(en.html).toContain('<html lang="en" dir="ltr">');
    expect(en.html).toContain("Stop my alerts");
    const he = renderEmail("STOCK_BACK_IN", { ...stock, productTitle: "שמלת ורד", colorName: "פטל" }, "Estabrek", { lang: "he", audience: "women", industry: "fashion" })!;
    expect(he.subject).toBe("חזר למלאי: שמלת ורד");
    expect(he.html).toContain('<html lang="he" dir="rtl">');
    expect(he.html).toContain("לצפייה בפריט");
    expect(he.html).not.toMatch(/[؀-ۿ]{3}/); // no Arabic words (the product title was translated)
  });

  test("sign-in code, files ready and «found it» in each language", () => {
    expect(renderEmail("CUSTOMER_LOGIN_CODE", { code: "123456", minutes: 10 }, "S", { lang: "he" })!.subject).toBe("קוד הכניסה: 123456");
    expect(renderEmail("CUSTOMER_LOGIN_CODE", { code: "123456", minutes: 10 }, "S", { lang: "ar", audience: "men" })!.html).toContain("هذا كود الدخول لحسابك في");
    const files = { name: "سارة", orderNo: "AB12", url: "https://shop.test/en/order/t", files: [{ name: "a.pdf", productTitle: "Pattern" }], maxDownloads: 3 };
    expect(renderEmail("ORDER_DELIVERY", files, "S", { lang: "en" })!.subject).toBe("Your files are ready - order AB12");
    expect(renderEmail("ORDER_DELIVERY", files, "S", { lang: "ar", audience: "women" })!.subject).toBe("ملفاتكِ جاهزة - طلب AB12");
    expect(renderEmail("ORDER_DELIVERY", { ...files, files: [], codes: 1 }, "S", { lang: "ar", audience: "everyone" })!.subject).toBe("كودكم جاهز - طلب AB12");
    expect(renderEmail("REQUEST_FOUND", { name: "Dana", productTitle: "Rose", url: "u" }, "S", { lang: "en", industry: "fashion" })!.subject).toBe("We found what you asked for: Rose");
    expect(requestFoundText({ lang: "ar", audience: "women", industry: "fashion", siteName: "", name: "سارة", productTitle: "فستان", url: "u" })).toBe(
      "أهلاً سارة 🌸\nلقينا اللي طلبتيه: فستان\nu\nالكمية قليلة، فإذا عجبتكِ لا تتأخري.",
    );
  });

  test("emails to the team stay in Arabic", () => {
    expect(renderEmail("ADMIN_INVITE", { name: "Rami", url: "u" }, "S", { lang: "en" })!.subject).toBe("دعوة للوحة إدارة S");
  });
});
