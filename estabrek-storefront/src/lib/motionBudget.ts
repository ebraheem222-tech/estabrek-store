/**
 * Adaptive pacing for the heavy scroll scenes (3D seasons, collection worlds,
 * fabric study).
 *
 * Scene frame rates: 120 → 90 → 60 → 45 → 30, never above what the screen shows.
 *
 * ?motion=auto  = adaptive (default)
 * ?motion=full  = highest tier the screen allows, never lowered
 * ?motion=lite  = 30 fps and 1× resolution for this visit
 * ?perf=1       = show performance overlay
 *
 * Why phones ran slower than computers: a phone's refresh rate is not fixed.
 * It moves between 120, 90 and 60 Hz (LTPO panels idling, battery saver,
 * video on screen) and iPhones in Low Power Mode give 30. The rate was
 * measured once at start-up and every later frame judged against it, so a
 * phone measured at 120 Hz that then showed 60 counted every frame as
 * "late", stepped all the way down to 30 fps, switched to the light mode and
 * saved it for the rest of the visit. Now:
 *
 * - the screen's rate is followed while the scenes run (the fast quartile of
 *   recent frame gaps), and a frame is only "late" against that;
 * - a lowered rate climbs back after a run of smooth windows (waiting longer
 *   each time it had to come down again) and is never saved;
 * - only the shopper's own ?motion= choice, data saver or a 2 GB device turn
 *   on the light mode.
 */

export type MotionLevel = "full" | "lite";

/** Only an explicit ?motion=full|lite is kept for the visit (not the old automatic "lite"). */
const KEY = "estabrek_motion_choice";

const LADDER = [120, 90, 60, 45, 30] as const;

/** Frames per window when judging how the scenes run. */
const WINDOW = 72;

/** Below this a scene is struggling on any screen of 60 Hz or more. */
const FLOOR_FPS = 48;

let level: MotionLevel | null = null;
let forced = false;

/** Highest tier the screen has shown (60 until measured; then it only rises). */
let ceiling = 60;
let measured = false;

/** Tier the scenes have earned: lowered on slow windows, raised again on smooth ones. */
let budget: number = LADDER[0];
let drops = 0;

const listeners = new Set<(level: MotionLevel) => void>();

export const motionStats = {
  /** The screen's current refresh rate. */
  hz: 0,
  targetFps: 60,
  renderDpr: 1,
  frameMs: 0,
  late: 0,
  seekMs: 0,
  reason: "",
};

function read(): MotionLevel {
  if (typeof window === "undefined") return "full";
  const asked = new URLSearchParams(window.location.search).get("motion");
  let choice: MotionLevel | null = asked === "lite" || asked === "full" ? asked : null;
  try {
    if (asked === "auto") sessionStorage.removeItem(KEY);
    else if (choice) sessionStorage.setItem(KEY, choice);
    else {
      const kept = sessionStorage.getItem(KEY);
      if (kept === "lite" || kept === "full") choice = kept;
    }
  } catch {
    // storage blocked
  }
  if (choice) {
    forced = true;
    if (choice === "lite") motionStats.reason = asked === "lite" ? "asked" : "asked earlier this visit";
    return choice;
  }
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) {
    motionStats.reason = "data saver";
    return "lite";
  }
  if (nav.deviceMemory && nav.deviceMemory <= 2) {
    motionStats.reason = "low memory";
    return "lite";
  }
  return "full";
}

export function motionLevel(): MotionLevel {
  if (!level) {
    level = read();
    if (typeof document !== "undefined") document.documentElement.dataset.motionLevel = level;
  }
  return level;
}

/** Also told when the scene frame rate changes without full/lite changing. */
export function onMotionLevel(fn: (level: MotionLevel) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emitBudgetChange() {
  const current = motionLevel();
  listeners.forEach((fn) => fn(current));
}

/** Screen refresh rate → the scene tier it can show. */
function displayTier(hz: number) {
  if (hz >= 105) return 120;
  if (hz >= 80) return 90;
  if (hz >= 54) return 60;
  if (hz >= 40) return 45;
  return 30;
}

/** Current heavy-scene target. */
export function sceneFps() {
  const fps = motionLevel() === "lite" ? 30 : forced ? ceiling : Math.min(budget, ceiling);
  motionStats.targetFps = fps;
  return fps;
}

/** Exact interval (ScenePacer uses an accumulator, so no slack is subtracted). */
export function sceneFrameGap() {
  return 1000 / sceneFps();
}

/**
 * Dynamic WebGL DPR.
 *
 * High refresh phones sacrifice a little resolution to gain GPU headroom
 * for 90/120 fps.
 */
export function sceneDpr(): number {
  if (typeof window === "undefined") return 1;
  if (motionLevel() === "lite") {
    motionStats.renderDpr = 1;
    return 1;
  }
  const raw = window.devicePixelRatio || 1;
  const fps = sceneFps();
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  // Desktop keeps more resolution; phones and tablets put smooth movement first.
  let cap = 1.6;
  if (coarse) cap = fps >= 110 ? 1.2 : fps >= 80 ? 1.3 : fps >= 60 ? 1.4 : fps >= 45 ? 1.15 : 1;
  const dpr = Math.min(raw, cap);
  motionStats.renderDpr = Math.round(dpr * 100) / 100;
  return dpr;
}

/** Fast quartile: the screen's own pace, ignoring the slow frames among them. */
function fastQuartile(gaps: number[]) {
  const sorted = [...gaps].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.25)];
}

/**
 * The screen showed frames `gapMs` apart. The first measurement sets the
 * ceiling (an iPhone in Low Power Mode really is 30); later ones only raise
 * it, so a panel idling at 60 does not hide that it can show 120.
 */
function sawScreen(gapMs: number) {
  const hz = Math.max(30, Math.min(240, Math.round(1000 / gapMs)));
  motionStats.hz = hz;
  const tier = displayTier(hz);
  if (!measured || tier > ceiling) {
    const changed = tier !== ceiling;
    measured = true;
    ceiling = tier;
    if (changed) emitBudgetChange();
  }
}

/** Quick first look at the screen's refresh rate. */
let measuring = false;
function measureHz() {
  if (measured || measuring || typeof window === "undefined") return;
  measuring = true;
  const gaps: number[] = [];
  let last = 0;
  const tick = (t: number) => {
    if (last && t - last < 250) gaps.push(t - last);
    last = t;
    if (gaps.length < 24) {
      requestAnimationFrame(tick);
      return;
    }
    measuring = false;
    sawScreen(fastQuartile(gaps));
  };
  requestAnimationFrame(tick);
}

function lower(reason: string) {
  const current = Math.min(budget, ceiling);
  const next = LADDER.find((fps) => fps < current);
  if (!next) return false;
  budget = next;
  drops++;
  motionStats.reason = `${reason} -> ${next}fps`;
  emitBudgetChange();
  return true;
}

function raise() {
  const next = LADDER.filter((fps) => fps > budget && fps <= ceiling).pop();
  if (!next) return;
  budget = next;
  motionStats.reason = `smooth again -> ${next}fps`;
  emitBudgetChange();
}

/** One watcher however many scenes run (two of them used to count every frame twice). */
let watchers = 0;
let stopWatching: (() => void) | null = null;

function startWatching() {
  let raf = 0;
  let last = 0;
  const gaps: number[] = [];
  let slow = 0;
  let smooth = 0;
  // Ignore shader compiles and the first WebGL uploads.
  let calmFrom = performance.now() + 1200;
  const tick = (t: number) => {
    raf = requestAnimationFrame(tick);
    const gap = last ? t - last : 0;
    last = t;
    // Hidden tab, devtools pause…
    if (!gap || gap > 250 || t < calmFrom) return;
    gaps.push(gap);
    if (gaps.length < WINDOW) return;
    const pace = fastQuartile(gaps);
    sawScreen(pace);
    const average = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
    // A missed frame is a visible hitch against the screen's current pace.
    const late = gaps.filter((g) => g > pace * 1.65).length / gaps.length;
    gaps.length = 0;
    motionStats.frameMs = Math.round(average * 10) / 10;
    motionStats.late = Math.round(late * 100) / 100;
    if (forced || motionLevel() === "lite") return;
    const struggling = late > 0.18 || (ceiling >= 60 && average > 1000 / FLOOR_FPS);
    if (struggling) {
      smooth = 0;
      if (++slow >= 2) {
        slow = 0;
        // Let the GPU settle after lowering.
        if (lower("slow frames")) calmFrom = t + 1800;
      }
      return;
    }
    slow = 0;
    // Climb back one step after a run of smooth windows; longer after each drop.
    if (budget < ceiling && ++smooth >= Math.min(24, 3 * 2 ** drops)) {
      smooth = 0;
      raise();
      calmFrom = t + 1800;
    }
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/**
 * Observe browser frame delivery while a scene runs.
 *
 * Two struggling windows lower the scenes one tier (120 → 90 → 60 → 45 → 30);
 * a run of smooth windows raises them again, up to what the screen shows.
 */
export function watchSceneFrames(): () => void {
  if (typeof window === "undefined") return () => {};
  measureHz();
  if (motionLevel() === "lite") return () => {};
  if (watchers++ === 0) stopWatching = startWatching();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    if (--watchers === 0) {
      stopWatching?.();
      stopWatching = null;
    }
  };
}

/**
 * Hero film decoder metrics.
 */
const seeks: number[] = [];

export function reportSeek(ms: number) {
  if (!(ms > 0) || ms > 3000) return;
  seeks.push(ms);
  if (seeks.length > 15) seeks.shift();
  const sorted = [...seeks].sort((a, b) => a - b);
  motionStats.seekMs = Math.round(sorted[Math.floor(sorted.length / 2)]);
}
