import { describe, expect, it } from "vitest";
import { isSiteStore, showsShop } from "./siteKind";
import { NAV_GROUPS } from "./adminNav";

const SITE = { siteHome: { featureId: "f1", pageId: "p1", at: "2026-11-24", menus: { header: null, footer: null }, before: { primaryNavId: null, footerNavId: null, cmsNav: false } } };

describe("the admin follows what the store is", () => {
  it("a plain store always has the shop's pages", () => {
    expect(showsShop({}, 0)).toBe(true);
    expect(showsShop(null, undefined)).toBe(true);
    expect(isSiteStore({})).toBe(false);
  });

  it("a whole site that sells nothing tucks them away, until a product or its owner asks for them", () => {
    expect(isSiteStore(SITE)).toBe(true);
    expect(showsShop(SITE, 0)).toBe(false);
    // While the count is asked: hidden (no flash in and out).
    expect(showsShop(SITE, undefined)).toBe(false);
    // A member who can't see the count: as before.
    expect(showsShop(SITE, null)).toBe(true);
    expect(showsShop(SITE, 3)).toBe(true);
    expect(showsShop({ ...SITE, adminShop: true }, 0)).toBe(true);
  });

  it("the selling pages are marked, the site's own and the team's are not", () => {
    const shop = NAV_GROUPS.flatMap((g) => g.items).filter((i) => i.shop).map((i) => i.to);
    for (const to of ["/admin/orders", "/admin/catalog/products", "/admin/inventory/stock", "/admin/discounts/coupons", "/admin/requests"]) expect(shop).toContain(to);
    for (const to of ["/admin/dashboard", "/admin/pages", "/admin/my-features", "/admin/data", "/admin/settings", "/admin/themes", "/admin/team", "/admin/customers", "/admin/outbox"]) expect(shop).not.toContain(to);
  });
});
