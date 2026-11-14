/**
 * What the Variables panel works out with the colour and scale maths (shared/colour.ts): how a colour reads on the
 * store's paper and ink, the tones and the mates to add for a colour, and a group's values on a scale. Pure: the
 * panel only draws what these give and saves what they return.
 */
import { contrast, contrastGrade, harmony, modularScale, tonalScale, type ContrastGrade, type Harmony } from "../../../shared/colour";
import type { DesignTokens } from "./designTokens";

type Colour = DesignTokens["colors"][number];
type Name = NonNullable<Colour["name"]>;
/** The most variables a group holds (the API's lib/designTokens.ts TOKEN_LIMITS). */
export const VARIABLE_LIMITS = { colors: 40, spaces: 20, sizes: 20 } as const;
/** The smallest and the biggest a font size can be (the range an element's own size has). */
export const SIZE_MIN = 8;
export const SIZE_MAX = 200;
export const SPACE_MAX = 400;
/** An id made of a variable's id and a tail, inside the 31 characters an id may have. */
const idFor = (base: string, tail: string) => `${base.slice(0, 31 - tail.length - 1).replace(/-+$/, "")}-${tail}`;

/** The two grounds a colour is judged on: the store's own paper and ink when it has variables by those ids, else white and near-black. */
export function grounds(tokens: DesignTokens): { paper: string; ink: string } {
  const by = (id: string, fallback: string) => tokens.colors.find((c) => c.id === id)?.value.slice(0, 7) ?? fallback;
  return { paper: by("paper", "#ffffff"), ink: by("ink", "#111111") };
}

export type Reading = { on: "paper" | "ink"; ground: string; ratio: number; grade: ContrastGrade; best: boolean };
/**
 * How a colour reads against the paper and against the ink (the same number whichever of the two is the words and
 * which the ground): the ratio to one decimal, its grade, and which ground it reads best with.
 */
export function readings(tokens: DesignTokens, value: string): Reading[] {
  const g = grounds(tokens);
  const both = (["paper", "ink"] as const).flatMap((on) => {
    const ratio = contrast(value, g[on]);
    return ratio === null ? [] : [{ on, ground: g[on], ratio: Math.round(ratio * 10) / 10, grade: contrastGrade(ratio), best: false }];
  });
  const top = Math.max(0, ...both.map((r) => r.ratio));
  return both.map((r) => ({ ...r, best: r.ratio === top && top > 1 }));
}

/** The ink on the paper, when it reads worse than any text should (under 4.5): the ratio to say; else null. */
export function weakGrounds(tokens: DesignTokens): number | null {
  const g = grounds(tokens);
  const ratio = contrast(g.ink, g.paper);
  return ratio !== null && ratio < 4.5 ? Math.round(ratio * 10) / 10 : null;
}

/**
 * The tones to add for a colour: the steps of its scale that aren't variables yet (never the colour's own step),
 * as many as there is room for: all of them, else four spread over the scale, else none.
 */
export function tonesToAdd(tokens: DesignTokens, colour: Colour, name: (step: number) => Name): Colour[] {
  const room = VARIABLE_LIMITS.colors - tokens.colors.length;
  const have = new Set(tokens.colors.map((c) => c.id));
  const all = tonalScale(colour.value).filter((t) => !t.own).map((t) => ({ step: t.step, id: idFor(colour.id, String(t.step)), name: name(t.step), value: t.value })).filter((t) => !have.has(t.id));
  const fits = all.length <= room ? all : all.filter((t) => [100, 300, 700, 900].includes(t.step));
  return fits.length <= room ? fits.map(({ id, name: n, value }) => ({ id, name: n, value })) : [];
}

const MATE_TAILS: Record<Harmony, string> = { complement: "opposite", neighbours: "near", triad: "third", split: "split" };
/** The colours that go with one, to add as variables (none when there is no room for all of them, or they are there). */
export function matesToAdd(tokens: DesignTokens, colour: Colour, kind: Harmony, name: (i: number) => Name): Colour[] {
  const room = VARIABLE_LIMITS.colors - tokens.colors.length;
  const have = new Set(tokens.colors.map((c) => c.id));
  const all = harmony(colour.value, kind).map((value, i, list) => ({ id: idFor(colour.id, list.length > 1 ? `${MATE_TAILS[kind]}-${i + 1}` : MATE_TAILS[kind]), name: name(i), value })).filter((t) => !have.has(t.id));
  return all.length <= room ? all : [];
}

/**
 * A picture's colours as colour variables to add: the ones the store doesn't have yet (by their value), in their
 * order, as many as there is room for, by the ids "photo", "photo-2"…
 */
export function coloursToAdd(tokens: DesignTokens, hexes: string[], name: (i: number) => Name): Colour[] {
  const room = VARIABLE_LIMITS.colors - tokens.colors.length;
  const values = new Set(tokens.colors.map((c) => c.value.slice(0, 7).toLowerCase()));
  const ids = new Set(tokens.colors.map((c) => c.id));
  const out: Colour[] = [];
  for (const hex of hexes) {
    if (out.length >= room) break;
    const value = String(hex).slice(0, 7).toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(value) || values.has(value)) continue;
    let n = 1, id = "photo";
    while (ids.has(id)) id = `photo-${++n}`;
    ids.add(id);
    values.add(value);
    out.push({ id, name: name(out.length), value });
  }
  return out;
}

/** The ids a store without spaces starts with, smallest first. */
export const STARTER_SPACES = ["xs", "sm", "md", "lg", "xl", "xxl"] as const;
/**
 * The spaces on a scale: each one `ratio` times the one before, from `base`, in their order (a store without any
 * gets six). Null when the scale can't give every space its own value under the most a space can be.
 */
export function spacesOnScale(tokens: DesignTokens, base: number, ratio: number): DesignTokens | null {
  const ids: string[] = tokens.spaces.length ? tokens.spaces.map((s) => s.id) : [...STARTER_SPACES];
  const values = modularScale(base, ratio, ids.length, { max: SPACE_MAX });
  if (values.length !== ids.length) return null;
  return { ...tokens, spaces: ids.map((id, i) => ({ ...(tokens.spaces[i] ?? { id }), value: values[i] })) };
}

/** The ids of the font sizes a store without any starts with, smallest first. */
export const STARTER_SIZES = ["small", "body", "lead", "h3", "h2", "h1", "display"] as const;
/**
 * The font sizes on a scale: each one `ratio` times the one before, from `base` (the smallest, 8 px at least), in
 * their order; a store without any gets seven, named as in `ready` (the ready set's sizes) when it is given. Null
 * when the scale can't give every size its own value under the biggest a size can be.
 */
export function sizesOnScale(tokens: DesignTokens, base: number, ratio: number, ready: DesignTokens["sizes"] = []): DesignTokens | null {
  if (!(base >= SIZE_MIN)) return null;
  const ids: string[] = tokens.sizes.length ? tokens.sizes.map((z) => z.id) : [...STARTER_SIZES];
  const values = modularScale(base, ratio, ids.length, { max: SIZE_MAX });
  if (values.length !== ids.length) return null;
  const fresh = (id: string) => ready.find((z) => z.id === id) ?? { id };
  return { ...tokens, sizes: ids.map((id, i) => ({ ...(tokens.sizes[i] ?? fresh(id)), value: values[i] })) };
}
