/**
 * A motion's curve as the shop plays it: one of the editor's own names (smooth, strong, bounce…), or a free curve
 * as text (shared/ease.ts: a GSAP name such as "power3.out", a cubic-bezier drawn with two handles, or a spring
 * with its mass, stiffness and damping). An entrance and keyframes take either.
 * Plain TypeScript: no React and no "@/" imports (the admin reads the files that read this one).
 */
import { easeFn, readEase } from "../../../shared/ease";

/** The text kept when it names a curve the shop can play (an own name or a free curve); nothing else passes. */
export function easeText(v: unknown, names: readonly string[]): string | undefined {
  if (typeof v !== "string") return undefined;
  if (names.includes(v)) return v;
  return readEase(v) ? v.trim() : undefined;
}

/**
 * What GSAP is given for it: GSAP's curve for an own name (`names`) or a named free curve, and a function of time
 * for handles or a spring (a spring goes past its end and comes back). `fallback` for none or an unknown one.
 */
export function playEase(v: string | undefined, names: Record<string, string>, fallback: string): string | ((t: number) => number) {
  if (!v) return fallback;
  if (names[v]) return names[v];
  const curve = readEase(v);
  if (!curve) return fallback;
  return curve.kind === "named" ? curve.name : easeFn(curve);
}
