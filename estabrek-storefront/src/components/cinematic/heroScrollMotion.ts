import { createScrollProgressMotion } from "./scrollProgressMotion";
import { sectionSmoothTime } from "@/lib/motionSettings";

/**
 * Smooth time in seconds for the opening film.
 *
 * Smaller = more responsive.
 * Larger  = more cinematic / softer.
 *
 * Good values:
 * 0.065 = fast
 * 0.090 = balanced (the other scroll scenes)
 * 0.110 = very smooth
 * 0.140 = cinematic
 */
const SMOOTH_TIME = 0.11;

/**
 * Stateless first-order version of the same follow, kept for the timing
 * checks: exact for any step, so 15 and 165 frames a second agree.
 */
export function advanceScrollMotion(current: number, target: number, seconds: number) {
  const dt = Math.max(0, seconds);
  return current + (target - current) * -Math.expm1(-dt / SMOOTH_TIME);
}

/**
 * The opening film's scroll controller: the shared game-loop motion
 * (see scrollProgressMotion.ts) with the film's softer smooth time
 * (admin → الحركة والتحميل; SMOOTH_TIME by default).
 */
export function createHeroScrollMotion(present: (progress: number) => void) {
  return createScrollProgressMotion(present, { smoothTime: sectionSmoothTime("hero") });
}
