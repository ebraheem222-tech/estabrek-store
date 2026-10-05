/**
 * Pacing for the heavy scroll scenes (the 3D seasons and collection worlds, and
 * the colours they lend the page).
 *
 * A phone with a 120 Hz, very high resolution screen (reported on a Poco F5 Pro)
 * drew these scenes at the screen's full rate and stuttered, while 60 Hz phones
 * were smooth. Now:
 *   - the scenes draw about 60 times a second at most (every other frame on a 120 Hz screen);
 *   - while a scene runs, the frames are watched: if they keep arriving late, the
 *     scenes switch to a lighter mode for the rest of the visit (30 frames a
 *     second, normal pixel density, fewer colour updates).
 *
 * `?motion=lite` forces the light mode, `?motion=full` keeps the full one
 * (both remembered for the visit); `?perf=1` shows the numbers on screen.
 */
export type MotionLevel = "full" | "lite";

const KEY = "estabrek_motion_level";
let level: MotionLevel | null = null;
let forced = false;
const listeners = new Set<(level: MotionLevel) => void>();

export const motionStats = {
  /** The screen's frame rate, measured (0 until known). */
  hz: 0,
  /** Recent average time between frames while a scene ran (ms). */
  frameMs: 0,
  /** Share of late frames in the last window (0–1). */
  late: 0,
  /** Film seeks: recent median time from asking for a frame to getting it (ms). */
  seekMs: 0,
  /** Why the light mode was chosen ("" while full). */
  reason: "",
};

function read(): MotionLevel {
  if (typeof window === "undefined") return "full";
  try {
    const asked = new URLSearchParams(window.location.search).get("motion");
    if (asked === "lite" || asked === "full") {
      sessionStorage.setItem(KEY, asked);
      forced = true;
      if (asked === "lite") motionStats.reason = "asked";
      return asked;
    }
    const kept = sessionStorage.getItem(KEY);
    if (kept === "full" || kept === "lite") {
      forced = kept === "full";
      if (kept === "lite") motionStats.reason = "earlier this visit";
      return kept;
    }
  } catch {
    /* storage blocked */
  }
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) { motionStats.reason = "data saver"; return "lite"; }
  if (nav.deviceMemory && nav.deviceMemory <= 2) { motionStats.reason = "low memory"; return "lite"; }
  return "full";
}

export function motionLevel(): MotionLevel {
  if (!level) {
    level = read();
    if (typeof document !== "undefined") document.documentElement.dataset.motionLevel = level;
  }
  return level;
}

export function onMotionLevel(fn: (level: MotionLevel) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function goLite(reason: string) {
  if (motionLevel() === "lite" || forced) return;
  level = "lite";
  motionStats.reason = reason;
  document.documentElement.dataset.motionLevel = level;
  try { sessionStorage.setItem(KEY, "lite"); } catch { /* storage blocked */ }
  listeners.forEach((fn) => fn("lite"));
}

/** How many times a second the heavy scenes draw. */
export function sceneFps() {
  return motionLevel() === "lite" ? 30 : 60;
}

/**
 * Shortest gap between two scene frames. The slack keeps every frame on 60 and
 * 90 Hz screens and every other one on 120/144 Hz screens (about 60 a second).
 */
export function sceneFrameGap() {
  return 1000 / sceneFps() - 6;
}

/** Pixel density for the 3D scenes. */
export function sceneDpr(): number {
  if (typeof window === "undefined") return 1;
  return motionLevel() === "lite" ? 1 : Math.min(window.devicePixelRatio || 1, 1.6);
}

/** Measures the screen's frame rate once (a few frames, at the start of the first scene). */
function measureHz() {
  if (motionStats.hz || typeof window === "undefined") return;
  const gaps: number[] = [];
  let last = 0;
  const tick = (t: number) => {
    if (last) gaps.push(t - last);
    last = t;
    if (gaps.length < 24) requestAnimationFrame(tick);
    else {
      gaps.sort((a, b) => a - b);
      // The fastest steady gaps are the screen's own rhythm.
      const g = gaps[Math.floor(gaps.length * 0.25)];
      motionStats.hz = Math.round(1000 / g);
    }
  };
  requestAnimationFrame(tick);
}

/**
 * Watches the frames while a heavy scene runs. Two late windows in a row
 * (more than a third of the frames missing the 60 fps beat) switch to the light mode.
 * Returns a function that stops watching.
 */
export function watchSceneFrames(): () => void {
  if (typeof window === "undefined") return () => {};
  measureHz();
  if (motionLevel() === "lite") return () => {};
  let raf = 0;
  let last = 0;
  let count = 0;
  let late = 0;
  let sum = 0;
  let badWindows = 0;
  // The first moments of a scene (shaders, textures) are always slower: not counted.
  const from = performance.now() + 1200;
  const tick = (t: number) => {
    if (last && t > from) {
      const gap = t - last;
      // A long pause is the tab in the background or a scroll fling stop, not a slow frame.
      if (gap < 250) {
        count++;
        sum += gap;
        if (gap > 26) late++;
      }
      if (count >= 60) {
        motionStats.frameMs = Math.round((sum / count) * 10) / 10;
        motionStats.late = Math.round((late / count) * 100) / 100;
        badWindows = late / count > 0.34 ? badWindows + 1 : 0;
        count = late = sum = 0;
        if (badWindows >= 2) { goLite("slow frames"); return; }
      }
    }
    last = t;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/** The film reports how long each seek took; very slow seeks mean a struggling decoder. */
const seeks: number[] = [];
export function reportSeek(ms: number) {
  if (!(ms > 0) || ms > 3000) return;
  seeks.push(ms);
  if (seeks.length > 15) seeks.shift();
  const sorted = [...seeks].sort((a, b) => a - b);
  motionStats.seekMs = Math.round(sorted[Math.floor(sorted.length / 2)]);
}
