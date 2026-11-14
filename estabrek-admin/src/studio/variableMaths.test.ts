import { expect, test } from "vitest";
import { contrast, hexToLch } from "../../../shared/colour";
import type { DesignTokens } from "./designTokens";
import { starterTokens } from "./tokenSets";
import { grounds, matesToAdd, readings, spacesOnScale, tonesToAdd, VARIABLE_LIMITS, weakGrounds } from "./variableMaths";

// What the Variables panel works out with the colour and scale maths (variableMaths.ts).

const tokens = starterTokens(["inter", "cairo"]);
const brand = tokens.colors.find((c) => c.id === "brand")!;
const named = (text: string) => ({ en: text });

test("a colour is judged on the store's own paper and ink, or on white and near-black without them", () => {
  expect(grounds(tokens)).toEqual({ paper: "#fbf7f4", ink: "#1d1a1f" });
  expect(grounds({ ...tokens, colors: [brand] })).toEqual({ paper: "#ffffff", ink: "#111111" });
  const r = readings(tokens, brand.value);
  expect(r.map((x) => x.on)).toEqual(["paper", "ink"]);
  // The rose is a button colour: dark words read on it, and it is an edge (not small words) on the paper.
  expect(r[0]).toMatchObject({ grade: "large", best: false });
  expect(r[1]).toMatchObject({ grade: "AA", best: true });
  expect(r[0].ratio).toBeCloseTo(contrast(brand.value, "#fbf7f4")!, 1);
  // The paper on itself reads as nothing; what isn't a colour has no reading.
  expect(readings(tokens, "#fbf7f4")[0]).toMatchObject({ ratio: 1, grade: "fail", best: false });
  expect(readings(tokens, "rose")).toEqual([]);
});

test("ink that hardly reads on the paper is said", () => {
  expect(weakGrounds(tokens)).toBeNull();
  const pale = { ...tokens, colors: tokens.colors.map((c) => (c.id === "ink" ? { ...c, value: "#9a9a9a" } : c)) };
  expect(weakGrounds(pale)).toBeCloseTo(2.6, 0);
});

test("a colour's tones are added as variables: every step but its own, by its id", () => {
  const add = tonesToAdd(tokens, brand, (step) => named(`Brand ${step}`));
  expect(add.map((t) => t.id)).toEqual(["brand-50", "brand-100", "brand-200", "brand-300", "brand-400", "brand-600", "brand-700", "brand-800", "brand-900"]);
  expect(add[0].name).toEqual({ en: "Brand 50" });
  const light = add.map((t) => hexToLch(t.value)!.L);
  for (let i = 1; i < light.length; i++) expect(light[i]).toBeLessThan(light[i - 1]);
  // Added once: a second press adds nothing.
  const after: DesignTokens = { ...tokens, colors: [...tokens.colors, ...add] };
  expect(tonesToAdd(after, brand, (step) => named(String(step)))).toEqual([]);
  // Little room left: four tones spread over the scale; no room: none.
  const filler = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `c${i}`, value: "#123456" }));
  const tight: DesignTokens = { ...tokens, colors: [brand, ...filler(VARIABLE_LIMITS.colors - 5)] };
  expect(tonesToAdd(tight, brand, (step) => named(String(step))).map((t) => t.id)).toEqual(["brand-100", "brand-300", "brand-700", "brand-900"]);
  const full: DesignTokens = { ...tokens, colors: [brand, ...filler(VARIABLE_LIMITS.colors - 1)] };
  expect(tonesToAdd(full, brand, (step) => named(String(step)))).toEqual([]);
  // A long id still gives ids of 31 characters at most, each its own.
  const long = { id: "a-very-long-name-for-a-colour-x", value: "#c86b98" };
  const ids = tonesToAdd({ ...tokens, colors: [long] }, long, (step) => named(String(step))).map((t) => t.id);
  expect(new Set(ids).size).toBe(9);
  for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]{0,30}$/);
});

test("the colours that go with one are added by their kind", () => {
  expect(matesToAdd(tokens, brand, "complement", () => named("Opposite")).map((t) => t.id)).toEqual(["brand-opposite"]);
  expect(matesToAdd(tokens, brand, "triad", (i) => named(`Third ${i + 1}`)).map((t) => t.id)).toEqual(["brand-third-1", "brand-third-2"]);
  expect(matesToAdd(tokens, brand, "neighbours", () => named("x")).map((t) => t.id)).toEqual(["brand-near-1", "brand-near-2"]);
  expect(matesToAdd(tokens, brand, "split", () => named("x"))).toHaveLength(2);
  const once: DesignTokens = { ...tokens, colors: [...tokens.colors, ...matesToAdd(tokens, brand, "complement", () => named("Opposite"))] };
  expect(matesToAdd(once, brand, "complement", () => named("Opposite"))).toEqual([]);
});

test("the spaces go on a scale in their order; a store without any gets six", () => {
  const golden = (1 + Math.sqrt(5)) / 2;
  expect(spacesOnScale(tokens, 4, 2)!.spaces.map((s) => [s.id, s.value])).toEqual([["xs", 4], ["sm", 8], ["md", 16], ["lg", 32], ["xl", 64]]);
  expect(spacesOnScale(tokens, 8, golden)!.spaces.map((s) => s.value)).toEqual([8, 13, 21, 34, 55]);
  // Names and ids are kept; nothing else changes.
  const named5 = { ...tokens, spaces: tokens.spaces.map((s) => ({ ...s, name: { en: `Space ${s.id}` } })) };
  const scaled = spacesOnScale(named5, 4, 1.5)!;
  expect(scaled.spaces[2]).toEqual({ id: "md", name: { en: "Space md" }, value: 9 });
  expect(scaled.colors).toBe(named5.colors);
  expect(spacesOnScale({ ...tokens, spaces: [] }, 4, 2)!.spaces).toEqual([{ id: "xs", value: 4 }, { id: "sm", value: 8 }, { id: "md", value: 16 }, { id: "lg", value: 32 }, { id: "xl", value: 64 }, { id: "xxl", value: 128 }]);
  // A scale that runs past the most a space can be before the last one: not applied.
  expect(spacesOnScale(tokens, 100, 2)).toBeNull();
  expect(spacesOnScale(tokens, 0, 2)).toBeNull();
});
