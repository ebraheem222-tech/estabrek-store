/**
 * The section DNA (docs: the owner's template plan, wave 0): sections made as a layout × a look × the store's own
 * words, each pair picked by hand. They join the library as ordinary recipes (sections.ts), so the gallery, the
 * three-language checks and the backend's tree check take them like any other; `dna` tells the gallery their look,
 * layout and mood.
 */
import type { Skin } from "../build";
import type { SectionCat, SectionRecipe } from "../sections";
import { w } from "../words";
import { HERO_LAYOUTS, HERO_PICKS, type Layout } from "./heroes";
import { BANNER_LAYOUTS, BANNER_PICKS, CATEGORY_LAYOUTS, CATEGORY_PICKS, OFFER_LAYOUTS, OFFER_PICKS, PRODUCT_LAYOUTS, PRODUCT_PICKS } from "./sell";
import { PERK_LAYOUTS, PERK_PICKS, REVIEW_LAYOUTS, REVIEW_PICKS, STAT_LAYOUTS, STAT_PICKS, TRUST_LAYOUTS, TRUST_PICKS } from "./trust";
import * as more from "./sellMore";
import * as site from "./siteParts";
import * as wow from "./wow";
import { LOOK_BY_KEY, LOOKS, MOOD_NAMES, MOODS, type Look } from "./looks";

export { LOOKS, LOOK_BY_KEY, MOODS, MOOD_NAMES };
export type { Look };

/** Full-picture layouts, and the premium ones on a live WebGL ground: the ground is their own, so one skin is enough. */
const PICTURE_GROUND = new Set(["cover", "cover-card", "shader-center", "shader-split", "earth-reach", "canvas-word"]);

function recipes(cat: SectionCat, kind: string, layouts: Layout[], picks: Record<string, string[]>): SectionRecipe[] {
  return layouts.flatMap((layout) =>
    (picks[layout.key] ?? []).map((lookKey) => {
      const look = LOOK_BY_KEY.get(lookKey);
      if (!look) throw new Error(`DNA: no look "${lookKey}" (${kind} ${layout.key})`);
      const skins = (PICTURE_GROUND.has(layout.key) ? look.skins.slice(0, 1) : look.skins) as Skin[];
      return {
        key: `dna-${kind}-${layout.key}-${look.key}`,
        cat,
        name: w(`${look.name.ar}: ${layout.name.ar}`, `${look.name.en}: ${layout.name.en}`, `${look.name.he}: ${layout.name.he}`),
        skins,
        build: (c) => layout.build(c, look),
        dna: { look: look.key, layout: layout.key, mood: look.mood },
      } satisfies SectionRecipe;
    }),
  );
}

/** Every kind made so far: [the library's category, the kind's key, its layouts, its picks]. */
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

export const DNA_RECIPES: SectionRecipe[] = DNA_KINDS.flatMap(([cat, kind, layouts, picks]) => recipes(cat, kind, layouts, picks));
