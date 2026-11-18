/**
 * The whole sites the gallery lists (admin → ميزاتي → مواقع كاملة), each built when it is looked at or
 * installed (siteKit.ts buildSite): one per field, more to come in their own files.
 */
import { buildSite, siteCounts, slugsOf, SITE_FIELDS, type BuildSite, type SiteField, type SiteFile, type SiteSpec } from "./siteKit";
import { BAKERY, RESTAURANT } from "./sitesFood";
import { CLINIC, GYM, SALON } from "./sitesCare";
import { ACADEMY, AGENCY, LAW } from "./sitesWork";
import { GUESTHOUSE, HALL, PHOTOGRAPHER, PROPERTY } from "./sitesPlace";

/** Every site, in the order the gallery shows them. */
export const SITES: SiteSpec[] = [RESTAURANT, BAKERY, CLINIC, SALON, GYM, ACADEMY, PROPERTY, GUESTHOUSE, HALL, PHOTOGRAPHER, LAW, AGENCY];

export const siteByKey = (key: string): SiteSpec | null => SITES.find((s) => s.key === key) ?? null;
/** A site's file by its key, or null. */
export function siteFile(key: string, o: BuildSite): SiteFile | null {
  const spec = siteByKey(key);
  return spec ? buildSite(spec, o) : null;
}

export { buildSite, siteCounts, slugsOf, SITE_FIELDS };
export type { BuildSite, SiteField, SiteFile, SiteSpec };
