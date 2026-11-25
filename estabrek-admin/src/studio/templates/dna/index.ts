/**
 * The section DNA (docs: the owner's template plan, wave 0): sections made as a layout × a look × the store's own
 * words, each pair picked by hand. They join the library as ordinary recipes (sections.ts), so the gallery, the
 * three-language checks and the backend's tree check take them like any other; `dna` tells the gallery their look,
 * layout and mood.
 */
import type { Skin } from "../build";
import type { SectionCat, SectionRecipe } from "../sections";
import { w } from "../words";
import type { Layout } from "./heroes";
import { DNA_KINDS, PICTURE_GROUND } from "./kinds";
import { LOOK_BY_KEY, LOOKS, MOOD_NAMES, MOODS, type Look } from "./looks";

export { DNA_KINDS, LOOKS, LOOK_BY_KEY, MOODS, MOOD_NAMES };
export type { Look };

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

export const DNA_RECIPES: SectionRecipe[] = DNA_KINDS.flatMap(([cat, kind, layouts, picks]) => recipes(cat, kind, layouts, picks));
