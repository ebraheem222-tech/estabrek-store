/**
 * A feature the owner built, switched off (M; admin → ميزاتي): its functions aren't started by
 * anything but the admin's own run, its tables' API answers as if they weren't open, and its pages
 * answer on the shop as pages that aren't there (the editor still opens them). The things
 * themselves stay as they are: switched back on, everything works as before.
 *
 * The store's own pages (the home, the shop, the cart) never follow a switch: they are the store,
 * not a feature, and aren't taken into one.
 *
 * Asked on every call to a function's address, to a table's API and for a shop page, so it is read
 * once every few seconds (and at once after a feature changes: `forgetFeatureGate`).
 */
import { prisma } from "./prisma.js";
import { forgetSiteSettings } from "./siteSettings.js";

export const FEATURE_KINDS = ["table", "function", "page"] as const;
export type FeatureKind = (typeof FEATURE_KINDS)[number];

/** The store's own pages: never hidden by a feature's switch. */
export const STORE_PAGES = ["/", "/shop", "/cart"] as const;
export const isStorePage = (slug: string) => (STORE_PAGES as readonly string[]).includes(slug);

type Off = { at: number; tables: Set<string>; fns: Set<string>; pages: Set<string> };
let cache: Off | null = null;

export function forgetFeatureGate() {
  cache = null;
  // What a feature holds or its file changed: its settings are read again too.
  forgetSiteSettings();
}

/** The tables, functions and pages that belong to a feature that is switched off. */
export async function switchedOff(now = Date.now()): Promise<Pick<Off, "tables" | "fns" | "pages">> {
  if (!cache || now - cache.at > 10_000) {
    const items = await prisma.featureItem.findMany({ where: { feature: { enabled: false } }, select: { kind: true, refId: true } });
    const of = (kind: FeatureKind) => new Set(items.filter((i) => i.kind === kind).map((i) => i.refId));
    cache = { at: now, tables: of("table"), fns: of("function"), pages: of("page") };
  }
  return cache;
}

/**
 * For the shop's questions about pages: not a page of a switched-off feature (`off`: their ids). The store's own
 * pages always pass, whatever they were put in.
 */
export function shownPagesWhere(off: ReadonlySet<string>): { NOT?: { id: { in: string[] }; slug: { notIn: string[] } } } {
  return off.size ? { NOT: { id: { in: [...off] }, slug: { notIn: [...STORE_PAGES] } } } : {};
}

/** The switched-off feature that hides a page from the shop (null: it shows as its publication says). Asked afresh: the admin's own view. */
export async function hiddenBy(page: { id: string; slug: string; kind?: string | null }): Promise<{ id: string; name: string } | null> {
  if ((page.kind && page.kind !== "page") || isStorePage(page.slug)) return null;
  const item = await prisma.featureItem.findUnique({ where: { kind_refId: { kind: "page", refId: page.id } }, select: { feature: { select: { id: true, name: true, enabled: true } } } });
  return item && !item.feature.enabled ? { id: item.feature.id, name: item.feature.name } : null;
}
