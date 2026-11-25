/**
 * Every kind of the section DNA made so far: [the library's category, the kind's key, its layouts, its picks]. The
 * recipes (dna/index.ts) and the whole premium themes (dna/themes.ts) both read it.
 */
import type { SectionCat } from "../sections";
import { HERO_LAYOUTS, HERO_PICKS, type Layout } from "./heroes";
import { BANNER_LAYOUTS, BANNER_PICKS, CATEGORY_LAYOUTS, CATEGORY_PICKS, OFFER_LAYOUTS, OFFER_PICKS, PRODUCT_LAYOUTS, PRODUCT_PICKS } from "./sell";
import { PERK_LAYOUTS, PERK_PICKS, REVIEW_LAYOUTS, REVIEW_PICKS, STAT_LAYOUTS, STAT_PICKS, TRUST_LAYOUTS, TRUST_PICKS } from "./trust";
import * as more from "./sellMore";
import * as site from "./siteParts";
import * as wow from "./wow";

export const DNA_KINDS: Array<[SectionCat, string, Layout[], Record<string, string[]>]> = [
  ["hero", "hero", HERO_LAYOUTS, HERO_PICKS],
  // Wave 1: selling.
  ["products", "products", PRODUCT_LAYOUTS, PRODUCT_PICKS],
  ["categories", "categories", CATEGORY_LAYOUTS, CATEGORY_PICKS],
  ["offer", "offer", OFFER_LAYOUTS, OFFER_PICKS],
  ["banner", "banner", BANNER_LAYOUTS, BANNER_PICKS],
  // Wave 1: what wins a customer over.
  ["testimonials", "reviews", REVIEW_LAYOUTS, REVIEW_PICKS],
  ["trust", "trust", TRUST_LAYOUTS, TRUST_PICKS],
  ["stats", "stats", STAT_LAYOUTS, STAT_PICKS],
  ["features", "perks", PERK_LAYOUTS, PERK_PICKS],
  // Wave 1: new kinds of selling sections.
  ["lookbook", "shoplook", more.LOOK_LAYOUTS, more.LOOK_PICKS],
  ["boxes", "boxes", more.BOX_LAYOUTS, more.BOX_PICKS],
  ["sizes", "sizes", more.SIZE_LAYOUTS, more.SIZE_PICKS],
  ["finder", "finder", more.FINDER_LAYOUTS, more.FINDER_PICKS],
  ["drops", "drops", more.DROP_LAYOUTS, more.DROP_PICKS],
  ["giftcards", "giftcards", more.GIFT_LAYOUTS, more.GIFT_PICKS],
  ["loyalty", "club", more.CLUB_LAYOUTS, more.CLUB_PICKS],
  ["delivery", "delivery", more.DELIVERY_LAYOUTS, more.DELIVERY_PICKS],
  ["specs", "specs", more.SPEC_LAYOUTS, more.SPEC_PICKS],
  // Wave 1: the site's parts.
  ["header", "header", site.HEADER_LAYOUTS, site.HEADER_PICKS],
  ["footer", "footer", site.FOOTER_LAYOUTS, site.FOOTER_PICKS],
  ["cta", "cta", site.CTA_LAYOUTS, site.CTA_PICKS],
  ["newsletter", "news", site.NEWS_LAYOUTS, site.NEWS_PICKS],
  ["contact", "contact", site.CONTACT_LAYOUTS, site.CONTACT_PICKS],
  // Plan 3.9a of the themes library: premium sections from its tricks (live grounds, 3D, scroll tricks, games, charts).
  ["wowopen", "wowopen", wow.WOW_OPEN_LAYOUTS, wow.WOW_OPEN_PICKS],
  ["wowstory", "wowstory", wow.WOW_STORY_LAYOUTS, wow.WOW_STORY_PICKS],
  ["wowsell", "wowsell", wow.WOW_SELL_LAYOUTS, wow.WOW_SELL_PICKS],
  ["wowdata", "wowdata", wow.WOW_DATA_LAYOUTS, wow.WOW_DATA_PICKS],
];

/** Full-picture layouts, and the premium ones on a live WebGL ground: the ground is their own, so one skin is enough. */
export const PICTURE_GROUND = new Set(["cover", "cover-card", "shader-center", "shader-split", "earth-reach", "canvas-word"]);
