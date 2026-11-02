/**
 * Every ready look (phase 10) in one library, by kind and group, and what fits an element.
 */
import { BACKGROUNDS, BACKGROUND_GROUPS, CARDS, CARD_GROUPS } from "./boxes";
import { BUTTONS, BUTTON_GROUPS } from "./buttons";
import { KINDS, KIND_ORDER, fits, type Ready, type ReadyKind } from "./core";
import { EDGES, EDGE_GROUPS } from "./edges";
import { ENTRANCES, ENTRANCE_GROUPS, HOVERS, HOVER_GROUPS } from "./motion";
import { FRAMES, FRAME_GROUPS, SHADOWS, SHADOW_GROUPS } from "./pictures";
import { WORD_GROUPS, WORD_LOOKS } from "./words";

export { KINDS, lookOps, withLook, type Ready, type ReadyKind } from "./core";

export const LIBRARY: Ready[] = [...BUTTONS, ...CARDS, ...BACKGROUNDS, ...FRAMES, ...WORD_LOOKS, ...SHADOWS, ...HOVERS, ...ENTRANCES, ...EDGES];
const GROUPS: Record<ReadyKind, ReadonlyArray<readonly [string, () => string]>> = {
  button: BUTTON_GROUPS, card: CARD_GROUPS, background: BACKGROUND_GROUPS, frame: FRAME_GROUPS, type: WORD_GROUPS, paint: WORD_GROUPS,
  shadow: SHADOW_GROUPS, hover: HOVER_GROUPS, entrance: ENTRANCE_GROUPS, edge: EDGE_GROUPS,
};
/** A kind's groups that have looks in it, in order. */
export function groupsOf(kind: ReadyKind): Array<readonly [string, () => string]> {
  const used = new Set(LIBRARY.filter((r) => r.kind === kind).map((r) => r.group));
  return GROUPS[kind].filter(([g]) => used.has(g));
}
/** The kinds of look an element can take, in the gallery's order. */
export const kindsFor = (type: string): ReadyKind[] => KIND_ORDER.filter((k) => LIBRARY.some((r) => r.kind === k && fits(r, type)));
/** The looks of a kind that fit an element, in a group (or all), whose name has the words searched. */
export function looksFor(type: string, kind: ReadyKind, group: string | null, q = ""): Ready[] {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return LIBRARY.filter((r) => r.kind === kind && fits(r, type) && (!group || r.group === group) && words.every((w) => r.name().toLowerCase().includes(w)));
}
export const kindName = (k: ReadyKind) => KINDS[k].name();
