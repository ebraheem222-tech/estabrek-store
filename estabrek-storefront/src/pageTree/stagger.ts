/**
 * The order things come in one after another (an entrance's stagger): from the first to the last, the last to
 * the first, the middle one outward, the two ends inward, or mixed. Each thing waits a number of steps, and a step
 * is the stagger's seconds. Plain TypeScript: no React and no "@/" imports.
 */
export const STAGGER_ORDERS = ["first", "last", "center", "edges", "random"] as const;
export type StaggerOrder = (typeof STAGGER_ORDERS)[number];

/** A small seeded generator (mulberry32): the same numbers for the same seed, so a mixed order never changes between plays. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * How many steps each of `n` things waits before it starts.
 *  - first: 0, 1, 2…  - last: …2, 1, 0
 *  - center: by its distance from the middle (the middle one, or the middle two, start together at 0)
 *  - edges: by its distance from the nearer end (both ends start together at 0)
 *  - random: every thing a step of its own, in a mixed order that is the same every time for the same `n`
 */
export function staggerSteps(n: number, order: StaggerOrder = "first"): number[] {
  const count = Math.max(0, Math.floor(n));
  const mid = (count - 1) / 2;
  const nearest = count % 2 ? 0 : 0.5;
  switch (order) {
    case "last":
      return Array.from({ length: count }, (_, i) => count - 1 - i);
    case "center":
      return Array.from({ length: count }, (_, i) => Math.abs(i - mid) - nearest);
    case "edges":
      return Array.from({ length: count }, (_, i) => mid - Math.abs(i - mid));
    case "random": {
      const steps = Array.from({ length: count }, (_, i) => i);
      const next = seeded(count * 2654435761);
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [steps[i], steps[j]] = [steps[j], steps[i]];
      }
      return steps;
    }
    default:
      return Array.from({ length: count }, (_, i) => i);
  }
}

/**
 * The stagger as the motion engine takes it: the seconds between one and the next for the usual order, or a
 * function (the thing's place, the thing, the whole list) giving the seconds that one waits.
 */
export function staggerOf(each: number, order: StaggerOrder | undefined): number | ((index: number, target: unknown, list: ArrayLike<unknown>) => number) {
  if (!order || order === "first" || !each) return each;
  let steps: number[] = [];
  return (index, _target, list) => {
    const n = list?.length ?? 0;
    if (steps.length !== n) steps = staggerSteps(n, order);
    return (steps[index] ?? index) * each;
  };
}
