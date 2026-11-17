// الـ Functions: an input's rules as the page keeps them (backend lib/fnInputs.ts): the pure parts
// of the rules box (./InputRules.tsx); the box itself.
import type { FnInput } from "../../api/functions.api";

const RULES = ["min", "max", "choices", "format"] as const;

/** How many rules an input has (its button says it). */
export const rulesCount = (i: FnInput): number => [i.min, i.max, i.choices?.length ? i.choices : undefined, i.format].filter((x) => x !== undefined).length;
/** The input with these rules (a rule left empty isn't kept). */
export function withRules(i: FnInput, more: Partial<Pick<FnInput, "min" | "max" | "choices" | "format">>): FnInput {
  const next: FnInput = { ...i, ...more };
  for (const k of RULES) if (next[k] === undefined) delete next[k];
  return next;
}
/** An input without its rules (its kind changed: the old ones may not fit it). */
export function withoutRules(i: FnInput): FnInput {
  const next: FnInput = { ...i };
  for (const k of RULES) delete next[k];
  return next;
}
/** Choices as the box writes them ("S, M, L"), and back (nothing written: no choices). */
export const choicesText = (choices?: string[]) => (choices ?? []).join(", ");
export function choicesOf(text: string): string[] | undefined {
  const list = text.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length ? list : undefined;
}
/** A bound as typed: nothing, or a number. */
export function boundOf(text: string): number | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}
