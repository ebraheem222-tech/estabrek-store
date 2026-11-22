/**
 * The whole sites the gallery lists (admin → ميزاتي → مواقع كاملة). Each is a blueprint (blueprint.ts):
 * its business, its archetype and its modules; compile.ts builds it into the template the store
 * installs, when it is looked at or installed. More come in their own files.
 */
import { ARCHETYPES, SITE_FIELDS, type Archetype, type ModuleKey, type SettingKind, type SiteBlueprint, type SiteField, type SiteSetting } from "./blueprint";
import { blueprintProblems, buildSite, modulesOf, pagesOf, settingsOf, siteCounts, slugsOf, type BuildSite } from "./compile";
import { MODULES, type SiteFile, type SiteModule } from "./modules";
import { shellOf, type Shell, type ShellLink } from "./shell";
import { FRONT_LOOKS, buildChosen, choosable, keepModules, withChoices, type ChosenFile, type SiteBiz, type SiteChoices } from "./choices";
import { BAKERY, RESTAURANT } from "./sitesFood";
import { CLINIC, GYM, SALON } from "./sitesCare";
import { ACADEMY, AGENCY, LAW } from "./sitesWork";
import { GUESTHOUSE, HALL, PHOTOGRAPHER, PROPERTY } from "./sitesPlace";

/** Every site, in the order the gallery shows them. */
export const SITES: SiteBlueprint[] = [RESTAURANT, BAKERY, CLINIC, SALON, GYM, ACADEMY, PROPERTY, GUESTHOUSE, HALL, PHOTOGRAPHER, LAW, AGENCY];

export const siteByKey = (key: string): SiteBlueprint | null => SITES.find((s) => s.key === key) ?? null;
/** A site's file by its key, or null. */
export function siteFile(key: string, o: BuildSite): SiteFile | null {
  const bp = siteByKey(key);
  return bp ? buildSite(bp, o) : null;
}

export { ARCHETYPES, FRONT_LOOKS, MODULES, SITE_FIELDS, blueprintProblems, buildChosen, buildSite, choosable, keepModules, modulesOf, pagesOf, settingsOf, shellOf, siteCounts, slugsOf, withChoices };
export type { Archetype, BuildSite, ChosenFile, ModuleKey, SettingKind, Shell, ShellLink, SiteBiz, SiteBlueprint, SiteChoices, SiteField, SiteFile, SiteModule, SiteSetting };
