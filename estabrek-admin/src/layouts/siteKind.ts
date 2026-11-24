/**
 * The admin follows what the store is (docs/clean-platform-plan.ar.md, phase 4). A store whose face is a whole
 * site (header.siteHome, set by «خلّيه الرئيسية»: a game server's site, a clinic, a community…) and that sells
 * nothing has no use for the shop's pages (products, stock, orders, coupons…): they are tucked away until its
 * owner asks for them (header.adminShop) or a product is added. A plain store always has them. Pure (tested).
 *
 * products: how many products the store has; undefined while it is being asked (hidden meanwhile, so they
 * don't flash in and out); null when it can't be known (a member without the dashboard: shown, as before).
 */
export function showsShop(header: unknown, products: number | null | undefined): boolean {
  const h = header as { siteHome?: unknown; adminShop?: unknown } | null | undefined;
  if (h?.adminShop === true) return true;
  if (!h?.siteHome || typeof h.siteHome !== "object") return true;
  if (products === null) return true;
  return (products ?? 0) > 0;
}

/** Whether the store's face is a whole site (the admin then asks how many products it has). */
export const isSiteStore = (header: unknown): boolean => {
  const s = (header as { siteHome?: unknown } | null | undefined)?.siteHome;
  return !!s && typeof s === "object";
};
