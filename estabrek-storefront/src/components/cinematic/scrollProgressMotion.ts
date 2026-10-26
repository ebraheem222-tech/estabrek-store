/**
 * Game-loop scroll motion, shared by every scroll scene (opening film,
 * campaign clip, fabric study, seasons, collection worlds).
 *
 * Scroll does not draw. ScrollTrigger only moves the target; a
 * requestAnimationFrame loop moves the shown position towards it, like a game
 * camera following a player:
 *
 *   scroll → target → rAF (the screen's own 60/90/120/144 Hz) → spring(dt) → present
 *
 * The spring is a critically damped one (game "SmoothDamp"): it keeps its
 * velocity between frames, eases in and out, reverses smoothly and never
 * overshoots. It is solved exactly for the real time that passed (dt in
 * seconds), so the result does not depend on how often it is stepped: a 120 Hz
 * screen taking 8.3 ms steps, a 60 Hz phone taking 16.7 ms steps and a busy
 * phone taking 50 ms steps all show the same position at the same moment.
 *
 * Earlier each step was cut to 1/30 s. On a phone running below 30 frames a
 * second that cut real time away every frame, so the scenes played in slow
 * motion there while a computer was fine. Only a real stall (over a quarter of
 * a second: a hidden tab, a debugger) is now cut.
 */

type Options = {
  /** Seconds to (almost) reach a new target. Smaller = tighter, larger = softer. */
  smoothTime?: number;
  /** Longest single step in seconds; anything longer is a stall, not a slow frame. */
  maxFrame?: number;
  epsilon?: number;
};

export type ScrollMotion = {
  /** ScrollTrigger calls this: it only moves the destination. */
  target(progress: number): void;
  /** Jump straight to a position (first paint, ScrollTrigger refresh, resize). */
  snap(progress: number): void;
  enable(on: boolean): void;
  stop(): void;
};

import { motionSettings } from "@/lib/motionSettings";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * One exact step of a critically damped spring towards `target` over `dt`
 * seconds. Stepping 3 × 10 ms or 1 × 30 ms gives the same answer.
 */
export function springStep(current: number, target: number, velocity: number, smoothTime: number, dt: number) {
  const omega = 2 / Math.max(0.0001, smoothTime);
  const decay = Math.exp(-omega * dt);
  const change = current - target;
  const temp = (velocity + omega * change) * dt;
  let value = target + (change + temp) * decay;
  velocity = (velocity - omega * temp) * decay;
  // Arriving with speed must not carry it past the target.
  if ((target - current > 0) === (value > target)) {
    value = target;
    velocity = 0;
  }
  return { value, velocity };
}

export function createScrollProgressMotion(present: (progress: number) => void, options: Options = {}): ScrollMotion {
  const smoothTime = options.smoothTime ?? 0.09;
  const maxFrame = options.maxFrame ?? motionSettings().maxStepMs / 1000;
  const epsilon = options.epsilon ?? 0.00001;

  let current = 0;
  let target = 0;
  let velocity = 0;
  let frame = 0;
  let last: number | null = null;
  let alive = true;
  let enabled = true;

  const active = () => alive && enabled && !document.hidden;
  const moving = () => Math.abs(target - current) > epsilon || Math.abs(velocity) > epsilon;
  const cancel = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };

  const schedule = () => {
    if (!active() || frame || !moving()) return;
    frame = requestAnimationFrame(tick);
  };

  function tick(now: number) {
    frame = 0;
    if (!active()) return;
    // The first frame of a movement has no elapsed time yet.
    if (last === null) {
      last = now;
      schedule();
      return;
    }
    const dt = Math.max(0, Math.min((now - last) / 1000, maxFrame));
    last = now;
    const next = springStep(current, target, velocity, smoothTime, dt);
    current = clamp01(next.value);
    velocity = next.velocity;
    // Snap the last hair of the way, or rAF would keep running for nothing.
    if (Math.abs(target - current) < epsilon && Math.abs(velocity) < epsilon) {
      current = target;
      velocity = 0;
    }
    present(current);
    if (moving()) schedule();
    else last = null;
  }

  // Back from another tab: no giant step for the time spent away.
  const visibility = () => {
    cancel();
    last = null;
    schedule();
  };
  document.addEventListener("visibilitychange", visibility);

  return {
    target(progress) {
      target = clamp01(progress);
      schedule();
    },
    snap(progress) {
      cancel();
      current = target = clamp01(progress);
      velocity = 0;
      last = null;
      present(current);
    },
    enable(on) {
      enabled = on;
      if (on) return schedule();
      cancel();
      last = null;
      velocity = 0;
    },
    stop() {
      alive = false;
      cancel();
      velocity = 0;
      last = null;
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}
