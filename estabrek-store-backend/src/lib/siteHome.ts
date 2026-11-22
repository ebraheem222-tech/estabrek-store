/**
 * «خلّيه الرئيسية» (sites wave 0.2, docs/sites-300-plan.ar.md): an installed site's first page shown at
 * the store's own address ("/"). Kept in the settings' header as `siteHome` (public: ids only); made and
 * undone in modules/admin/siteHome.ts. Nothing is moved: the site's page keeps its own address too, and
 * the store's page at "/" waits behind it, to come back with one undo.
 */

export type SiteHome = {
  /** The site's feature, and its first page. */
  featureId: string;
  pageId: string;
  at: string;
  /** The menus made from the site's pages (null: it had none to put there). */
  menus: { header: string | null; footer: string | null };
  /** What was in place before, to be put back: the store's menus, and whether its CMS menu was on. */
  before: { primaryNavId: string | null; footerNavId: string | null; cmsNav: boolean };
};

/** The site shown as the store's home, if one is. */
export function readSiteHome(header: unknown): SiteHome | null {
  const h = header && typeof header === "object" && !Array.isArray(header) ? (header as { siteHome?: unknown }).siteHome : null;
  if (!h || typeof h !== "object") return null;
  const s = h as Partial<SiteHome>;
  return typeof s.pageId === "string" && typeof s.featureId === "string" ? (s as SiteHome) : null;
}
