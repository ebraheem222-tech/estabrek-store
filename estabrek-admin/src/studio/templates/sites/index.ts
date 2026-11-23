/**
 * The whole sites the gallery lists (admin → ميزاتي → مواقع كاملة). Each is a blueprint (blueprint.ts):
 * its business, its archetype and its modules; compile.ts builds it into the template the store
 * installs, when it is looked at or installed. More come in their own files.
 */
import { ARCHETYPES, SITE_FIELDS, type Archetype, type ModuleKey, type PanelPage, type PanelPart, type SettingKind, type SiteBlueprint, type SiteField, type SiteSetting } from "./blueprint";
import { blueprintProblems, buildSite, modulesOf, pagesOf, panelOf, settingsOf, siteCounts, slugsOf, type BuildSite } from "./compile";
import { MODULES, type SiteFile, type SiteModule } from "./modules";
import { shellOf, type Shell, type ShellLink } from "./shell";
import { FRONT_LOOKS, buildChosen, choosable, keepModules, withChoices, type ChosenFile, type SiteBiz, type SiteChoices } from "./choices";
import { BAKERY, RESTAURANT } from "./sitesFood";
import { CLINIC, GYM, SALON } from "./sitesCare";
import { ACADEMY, AGENCY, LAW } from "./sitesWork";
import { GUESTHOUSE, HALL, PHOTOGRAPHER, PROPERTY } from "./sitesPlace";
import { FIVEM_RP, MC_SURVIVAL, RUST_WIPE } from "./sitesGames";
import { COOP_SURVIVAL, FIVEM_OPEN, FIVEM_RACING, GMOD_RP, MC_FAMILY, MC_SKYBLOCK } from "./sitesGamesMore";
import { CS2_COMMUNITY, MC_NETWORK } from "./sitesGamesNet";
import { DISCORD_COMMUNITY, GAMING_CLAN, ROBLOX_COMMUNITY } from "./sitesCommunity";
import { GAMING_STREAMER, LFG_BOARD } from "./sitesCommunityMore";

/** Every site, in the order the gallery shows them. */
export const SITES: SiteBlueprint[] = [RESTAURANT, BAKERY, CLINIC, SALON, GYM, ACADEMY, PROPERTY, GUESTHOUSE, HALL, PHOTOGRAPHER, LAW, AGENCY, FIVEM_RP, MC_SURVIVAL, RUST_WIPE, FIVEM_OPEN, FIVEM_RACING, MC_SKYBLOCK, MC_FAMILY, GMOD_RP, COOP_SURVIVAL, MC_NETWORK, CS2_COMMUNITY, ROBLOX_COMMUNITY, DISCORD_COMMUNITY, GAMING_CLAN, LFG_BOARD, GAMING_STREAMER];

export const siteByKey = (key: string): SiteBlueprint | null => SITES.find((s) => s.key === key) ?? null;
/** A site's file by its key, or null. */
export function siteFile(key: string, o: BuildSite): SiteFile | null {
  const bp = siteByKey(key);
  return bp ? buildSite(bp, o) : null;
}

export { ARCHETYPES, FRONT_LOOKS, MODULES, SITE_FIELDS, blueprintProblems, buildChosen, buildSite, choosable, keepModules, modulesOf, pagesOf, panelOf, settingsOf, shellOf, siteCounts, slugsOf, withChoices };
export type { Archetype, BuildSite, ChosenFile, ModuleKey, PanelPage, PanelPart, SettingKind, Shell, ShellLink, SiteBiz, SiteBlueprint, SiteChoices, SiteField, SiteFile, SiteModule, SiteSetting };
