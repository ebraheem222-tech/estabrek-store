// The store setup when a new copy starts as a whole site («شو نوع موقعك؟», sites wave 0.4): the store's part
// of it (its name, logo, a theme that fits, the assistant) as the setup's request, with nothing a store sells
// (no categories, product types, store home or menu: the site brings its own pages and menus). Pure (tested).
import { PACKS, type Pack } from "./packs";
import { buildSetup, type SetupRequest } from "./buildSetup";
import type { SiteBlueprint } from "../../studio/templates/sites";
import type { W } from "../myFeatures/siteForm";

/**
 * The theme a store set up as a site starts with, out of the shop's own (estabrek-storefront
 * src/storeThemes/themes). Until the themes matched to each kind of site come (wave 2), one that sits well
 * with it; any other is one click away in الثيمات.
 */
export const SITE_THEMES: Record<string, string> = {
  "site-restaurant": "coffee-roast",
  "site-bakery-cafe": "bakery-crumb",
  "site-dental-clinic": "mono-minimal",
  "site-beauty-salon": "spa-leaf",
  "site-gym": "iron-gym",
  "site-academy": "school-days",
  "site-real-estate": "marble-living",
  "site-guest-house": "terracotta-home",
  "site-events-hall": "diamond-facet",
  "site-photographer": "camera-room",
  "site-law-office": "silver-line",
  "site-creative-agency": "white-gallery",
  // The game servers' own family (wave G6c, the shop's themes/servers.ts): a city at night, squares, ash and embers.
  "site-fivem-rp": "night-neon",
  "site-minecraft-survival": "square-pixel",
  "site-rust-wipe": "rough-survival",
  "site-fivem-open": "night-neon",
  "site-fivem-racing": "race-stripes",
  "site-minecraft-skyblock": "fantasy-guild",
  "site-minecraft-family": "square-pixel",
  "site-gmod-rp": "clean-esports",
  "site-coop-survival": "rough-survival",
  "site-minecraft-network": "square-pixel",
  "site-cs2-community": "clean-esports",
  // The communities (wave G7c): a Roblox game in squares, a Discord at night, a clan as a guild.
  "site-roblox-community": "square-pixel",
  "site-discord-community": "night-neon",
  "site-gaming-clan": "fantasy-guild",
};

/** A site's kind in a word or two (its name before the colon: «مطعم»), where it is picked. */
export const siteKindName = (bp: SiteBlueprint, lang: "ar" | "en" | "he") => bp.name[lang].split(":")[0].trim();

/** The kind of store a site is set up as (what the assistant fits and the identity says): its library family's. */
export const packOfSite = (bp: SiteBlueprint): Pack => PACKS.find((p) => p.id === bp.fam) ?? PACKS.find((p) => p.id === "general") ?? PACKS[0];

export type SiteSetupChoices = { bp: SiteBlueprint; name: W; logoUrl?: string; assistant: { enabled: boolean; persona: string | null } };

/** The setup's request for a store set up as `bp`: the business's name as the store's, the site's theme, nothing to sell. */
export function siteSetupRequest(c: SiteSetupChoices): SetupRequest {
  const pack = packOfSite(c.bp);
  const body = buildSetup({ pack, name: c.name, logoUrl: c.logoUrl, themeId: SITE_THEMES[c.bp.key] ?? pack.theme, mode: null, include: { categories: false, types: false, home: false, menu: false }, replaceHome: false });
  return { ...body, assistant: c.assistant };
}
