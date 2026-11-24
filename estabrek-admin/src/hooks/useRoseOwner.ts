import { useSettings } from "./useSettings";
import { ownsRose } from "../studio/storeThemes";

/**
 * The store owns the rose design (studio/storeThemes ownsRose): its guide Razan, her requests and help, and its
 * own words are said in its admin alone (docs/clean-platform-plan.ar.md, phase 4.2).
 */
export function useRoseOwner(): boolean {
  return ownsRose(useSettings().data?.header);
}
