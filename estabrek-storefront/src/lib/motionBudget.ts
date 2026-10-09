/**
 * Adaptive pacing for heavy scroll scenes.
 *
 * Preferred ladder:
 *
 * 120 → 90 → 60 → 45 → 30
 *
 * ?motion=auto  = adaptive
 * ?motion=full  = force highest tier
 * ?motion=lite  = force 30 fps
 * ?perf=1       = show performance overlay
 */

export type MotionLevel =
  | "full"
  | "lite";

const KEY =
  "estabrek_motion_level";

const FPS_LADDER = [
  120,
  90,
  60,
  45,
  30,
] as const;

let level:
  MotionLevel | null = null;

let forced = false;

/**
 * Start conservatively until we measure
 * the actual display refresh rate.
 */
let adaptiveFps = 60;

let refreshTierApplied = false;

const listeners =
  new Set<
    (level: MotionLevel) => void
  >();

export const motionStats = {
  hz: 0,

  targetFps: 60,

  renderDpr: 1,

  frameMs: 0,

  late: 0,

  seekMs: 0,

  reason: "",
};

function read(): MotionLevel {
  if (
    typeof window === "undefined"
  ) {
    return "full";
  }

  try {
    const asked =
      new URLSearchParams(
        window.location.search,
      ).get("motion");

    /**
     * Clear an old full/lite override.
     */
    if (asked === "auto") {
      sessionStorage.removeItem(
        KEY,
      );

      forced = false;
      motionStats.reason = "";
    }

    if (
      asked === "lite" ||
      asked === "full"
    ) {
      sessionStorage.setItem(
        KEY,
        asked,
      );

      forced = true;

      if (asked === "lite") {
        motionStats.reason =
          "asked";
      }

      return asked;
    }

    const kept =
      sessionStorage.getItem(KEY);

    if (
      kept === "full" ||
      kept === "lite"
    ) {
      forced =
        kept === "full";

      if (kept === "lite") {
        motionStats.reason =
          "earlier this visit";
      }

      return kept;
    }
  } catch {
    // storage blocked
  }

  const nav =
    navigator as Navigator & {
      connection?: {
        saveData?: boolean;
      };

      deviceMemory?: number;
    };

  if (
    nav.connection?.saveData
  ) {
    motionStats.reason =
      "data saver";

    return "lite";
  }

  if (
    nav.deviceMemory &&
    nav.deviceMemory <= 2
  ) {
    motionStats.reason =
      "low memory";

    return "lite";
  }

  return "full";
}

export function motionLevel():
  MotionLevel {
  if (!level) {
    level = read();

    if (
      typeof document !==
      "undefined"
    ) {
      document.documentElement
        .dataset.motionLevel =
        level;
    }
  }

  return level;
}

export function onMotionLevel(
  fn: (
    level: MotionLevel,
  ) => void,
) {
  listeners.add(fn);

  return () => {
    listeners.delete(fn);
  };
}

/**
 * We also use this notification when
 * FPS changes without changing full/lite.
 */
function emitBudgetChange() {
  const current =
    motionLevel();

  listeners.forEach(
    (fn) => fn(current),
  );
}

/**
 * Convert measured screen refresh rate
 * into our supported scene tiers.
 */
function displayTier(
  hz: number,
) {
  if (hz >= 105) {
    return 120;
  }

  if (hz >= 80) {
    return 90;
  }

  if (hz >= 54) {
    return 60;
  }

  if (hz >= 40) {
    return 45;
  }

  return 30;
}

function nextLowerTier(
  current: number,
) {
  const displayMax =
    displayTier(
      motionStats.hz || 60,
    );

  return (
    FPS_LADDER.find(
      (fps) =>
        fps < current &&
        fps <= displayMax,
    ) ?? 30
  );
}

function setAdaptiveFps(
  next: number,
  reason = "",
) {
  adaptiveFps = next;

  motionStats.targetFps =
    next;

  if (reason) {
    motionStats.reason =
      reason;
  }

  emitBudgetChange();
}

function goLite(
  reason: string,
) {
  if (
    motionLevel() ===
      "lite" ||
    forced
  ) {
    return;
  }

  level = "lite";

  adaptiveFps = 30;

  motionStats.targetFps =
    30;

  motionStats.reason =
    reason;

  document.documentElement
    .dataset.motionLevel =
    level;

  try {
    sessionStorage.setItem(
      KEY,
      "lite",
    );
  } catch {
    // storage blocked
  }

  emitBudgetChange();
}

function degradeSceneFps(
  reason: string,
) {
  if (
    forced ||
    motionLevel() ===
      "lite"
  ) {
    return false;
  }

  const current =
    sceneFps();

  const next =
    nextLowerTier(current);

  if (
    next >= current
  ) {
    return false;
  }

  if (next <= 30) {
    goLite(
      `${reason} -> 30fps`,
    );

    return true;
  }

  setAdaptiveFps(
    next,
    `${reason} -> ${next}fps`,
  );

  return true;
}

/**
 * Current heavy-scene target.
 */
export function sceneFps() {
  if (
    motionLevel() ===
    "lite"
  ) {
    motionStats.targetFps =
      30;

    return 30;
  }

  motionStats.targetFps =
    adaptiveFps;

  return adaptiveFps;
}

/**
 * Exact interval.
 *
 * ScenePacer now uses an accumulator,
 * so don't subtract arbitrary slack.
 */
export function sceneFrameGap() {
  return (
    1000 / sceneFps()
  );
}

/**
 * Dynamic WebGL DPR.
 *
 * High refresh phones sacrifice a
 * little resolution to gain GPU
 * headroom for 90/120 fps.
 */
export function sceneDpr():
  number {
  if (
    typeof window ===
    "undefined"
  ) {
    return 1;
  }

  if (
    motionLevel() ===
    "lite"
  ) {
    motionStats.renderDpr =
      1;

    return 1;
  }

  const raw =
    window.devicePixelRatio ||
    1;

  const fps =
    sceneFps();

  const coarse =
    window.matchMedia?.(
      "(pointer: coarse)",
    ).matches ?? false;

  /**
   * Desktop keeps more resolution.
   */
  let cap = 1.6;

  /**
   * Phones/tablets:
   * prioritize smooth movement.
   */
  if (coarse) {
    if (fps >= 110) {
      cap = 1.2;
    } else if (
      fps >= 80
    ) {
      cap = 1.3;
    } else if (
      fps >= 60
    ) {
      cap = 1.4;
    } else if (
      fps >= 45
    ) {
      cap = 1.15;
    } else {
      cap = 1;
    }
  }

  const dpr =
    Math.min(
      raw,
      cap,
    );

  motionStats.renderDpr =
    Math.round(
      dpr * 100,
    ) / 100;

  return dpr;
}

/**
 * Measure actual browser/display refresh.
 */
function measureHz() {
  if (
    motionStats.hz ||
    typeof window ===
      "undefined"
  ) {
    return;
  }

  const gaps: number[] =
    [];

  let last = 0;

  const tick = (
    t: number,
  ) => {
    if (last) {
      gaps.push(
        t - last,
      );
    }

    last = t;

    if (
      gaps.length < 24
    ) {
      requestAnimationFrame(
        tick,
      );

      return;
    }

    gaps.sort(
      (a, b) => a - b,
    );

    /**
     * Fast quartile avoids one-off
     * slow startup frames.
     */
    const gap =
      gaps[
        Math.floor(
          gaps.length * 0.25,
        )
      ];

    const hz =
      Math.max(
        30,
        Math.min(
          240,
          Math.round(
            1000 / gap,
          ),
        ),
      );

    motionStats.hz = hz;

    if (
      !refreshTierApplied
    ) {
      refreshTierApplied =
        true;

      if (
        motionLevel() ===
        "lite"
      ) {
        adaptiveFps = 30;

        motionStats.targetFps =
          30;
      } else {
        /**
         * 120Hz → 120
         * 90Hz  → 90
         * 60Hz  → 60
         */
        setAdaptiveFps(
          displayTier(hz),
        );
      }
    }
  };

  requestAnimationFrame(
    tick,
  );
}

/**
 * Observe browser frame delivery.
 *
 * Two bad windows:
 *
 * 120 → 90
 * 90  → 60
 * 60  → 45
 * 45  → 30
 *
 * We never automatically jump upward
 * again while the scene is running.
 */
export function watchSceneFrames():
  () => void {
  if (
    typeof window ===
    "undefined"
  ) {
    return () => {};
  }

  measureHz();

  if (
    motionLevel() ===
    "lite"
  ) {
    return () => {};
  }

  let raf = 0;

  let last = 0;

  let count = 0;

  let late = 0;

  let sum = 0;

  let badWindows = 0;

  /**
   * Ignore shader compile / initial
   * WebGL startup.
   */
  const from =
    performance.now() +
    1200;

  let cooldownUntil =
    from;

  const tick = (
    t: number,
  ) => {
    if (
      last &&
      t > from
    ) {
      const gap =
        t - last;

      /**
       * Tab hidden, devtools pause, etc.
       */
      if (gap < 250) {
        const screenHz =
          motionStats.hz ||
          60;

        const expected =
          1000 /
          screenHz;

        count++;

        sum += gap;

        /**
         * Missing a native display
         * frame is a visible hitch.
         */
        if (
          gap >
          expected * 1.65
        ) {
          late++;
        }

        if (
          count >= 72
        ) {
          const average =
            sum / count;

          const lateRatio =
            late / count;

          motionStats.frameMs =
            Math.round(
              average * 10,
            ) / 10;

          motionStats.late =
            Math.round(
              lateRatio *
                100,
            ) / 100;

          const bad =
            lateRatio >
              0.18 ||
            average >
              expected *
                1.25;

          if (bad) {
            badWindows++;
          } else {
            badWindows =
              Math.max(
                0,
                badWindows -
                  1,
              );
          }

          count = 0;
          late = 0;
          sum = 0;

          if (
            badWindows >=
              2 &&
            t >=
              cooldownUntil
          ) {
            const changed =
              degradeSceneFps(
                "slow frames",
              );

            badWindows = 0;

            if (changed) {
              /**
               * Let the GPU settle
               * after lowering FPS.
               */
              cooldownUntil =
                t + 1800;
            }
          }
        }
      }
    }

    last = t;

    raf =
      requestAnimationFrame(
        tick,
      );
  };

  raf =
    requestAnimationFrame(
      tick,
    );

  return () => {
    cancelAnimationFrame(
      raf,
    );
  };
}

/**
 * Hero film decoder metrics.
 */
const seeks: number[] =
  [];

export function reportSeek(
  ms: number,
) {
  if (
    !(ms > 0) ||
    ms > 3000
  ) {
    return;
  }

  seeks.push(ms);

  if (
    seeks.length > 15
  ) {
    seeks.shift();
  }

  const sorted = [
    ...seeks,
  ].sort(
    (a, b) => a - b,
  );

  motionStats.seekMs =
    Math.round(
      sorted[
        Math.floor(
          sorted.length /
            2,
        )
      ],
    );
}
