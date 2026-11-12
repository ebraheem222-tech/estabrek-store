"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

import { usePageIdle } from "@/lib/pageIdle";
import { quietShaders } from "./warmScene";
import { pageScrolling } from "@/lib/pageRest";
import {
  onMotionLevel,
  sceneDpr,
  sceneFrameGap,
  watchSceneFrames,
} from "@/lib/motionBudget";

/**
 * Full pace only while something moves a scene: the scroll (scenes follow it), or the pointer (models lean
 * towards it). Otherwise a scene's own slow motion (a model turning, snow, smoke) is drawn 30 times a second.
 * Drawn at the screen's 120–144 a second while nobody touched anything, the 3D kept a laptop's graphics card as
 * busy as a game; a site's slow ambient motion looks the same at 30.
 */
const AMBIENT_GAP = 1000 / 30;
let lastPointer = 0;
let watchingPointer = false;
function moving() {
  if (!watchingPointer && typeof window !== "undefined") {
    watchingPointer = true;
    window.addEventListener("pointermove", () => { lastPointer = performance.now(); }, { passive: true, capture: true });
  }
  return pageScrolling(250) || performance.now() - lastPointer < 400;
}

/**
 * Adaptive 3D scene pacer.
 *
 * Browser rAF remains the master clock.
 *
 * The accumulator lets us correctly render:
 *
 * 120Hz → 120
 * 120Hz → 90
 * 120Hz → 60
 * 120Hz → 45
 *
 * instead of accidentally collapsing
 * intermediate rates to divisors of 120.
 */
export function ScenePacer({
  active: wanted,
  maxFps,
}: {
  active: boolean;
  /** An element's own cap on its frames a second (its speed settings, pageTree/perf.ts). */
  maxFps?: number | null;
}) {
  const cap = maxFps && maxFps > 0 ? 1000 / maxFps : 0;
  // While the page rests (lib/pageIdle.ts) the scene keeps its last frame: its models turning on their own were
  // drawn every frame for nobody. The first touch or scroll brings them back.
  const resting = usePageIdle();
  const active = wanted && !resting;
  const invalidate =
    useThree(
      (state) =>
        state.invalidate,
    );
  // No shader checks that stall the page (warmScene.ts quietShaders).
  const gl = useThree((state) => state.gl);
  useEffect(() => quietShaders(gl), [gl]);

  const setDpr =
    useThree(
      (state) =>
        state.setDpr,
    );

  /**
   * FPS tier changes also emit through
   * onMotionLevel.
   */
  useEffect(
    () =>
      onMotionLevel(() => {
        setDpr(
          sceneDpr(),
        );

        invalidate();
      }),
    [
      setDpr,
      invalidate,
    ],
  );

  useEffect(() => {
    if (!active) {
      return;
    }

    /**
     * Ensure current adaptive DPR is
     * applied as soon as scene wakes.
     */
    setDpr(
      sceneDpr(),
    );

    const stopWatching =
      watchSceneFrames();

    let raf = 0;

    let last = 0;

    let accumulator = 0;

    const tick = (
      time: number,
    ) => {
      if (!last) {
        last = time;

        /**
         * Render immediately when the
         * scene first becomes active.
         */
        accumulator =
          sceneFrameGap();
      } else {
        const elapsed =
          time - last;

        last = time;

        /**
         * A background-tab pause should
         * not create a huge backlog.
         */
        if (
          elapsed > 250
        ) {
          accumulator =
            sceneFrameGap();
        } else {
          accumulator +=
            Math.min(
              elapsed,
              100,
            );
        }
      }

      // A weak device (TreePerf's automatic lightening): at most 30 a second.
      const floor = document.documentElement.hasAttribute("data-weak") ? Math.max(cap, 1000 / 30) : cap;
      const interval = moving()
        ? Math.max(sceneFrameGap(), floor)
        : Math.max(sceneFrameGap(), AMBIENT_GAP, floor);

      /**
       * Small tolerance handles floating
       * point differences between:
       *
       * 8.333ms
       * 11.111ms
       * 16.667ms
       */
      if (
        accumulator +
          0.5 >=
        interval
      ) {
        accumulator -=
          interval;

        if (
          accumulator < 0
        ) {
          accumulator = 0;
        }

        /**
         * Never try to catch up several
         * old frames in one browser frame.
         */
        if (
          accumulator >
          interval * 2
        ) {
          accumulator %=
            interval;
        }

        invalidate();
      }

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

      stopWatching();
    };
  }, [
    active,
    invalidate,
    setDpr,
  ]);

  return null;
}
