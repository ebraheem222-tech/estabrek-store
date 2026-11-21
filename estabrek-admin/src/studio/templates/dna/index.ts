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
import { LOOK_BY_KEY, LOOKS, MOOD_NAMES, MOODS, type Look } from "./looks";

export { LOOKS, LOOK_BY_KEY, MOODS, MOOD_NAMES };
export type { Look };

/** Full-picture layouts: the picture is the ground, so one skin is enough. */
const PICTURE_GROUND = new Set(["cover", "cover-card"]);

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

export const DNA_RECIPES: SectionRecipe[] = [...recipes("hero", "hero", HERO_LAYOUTS, HERO_PICKS)];
