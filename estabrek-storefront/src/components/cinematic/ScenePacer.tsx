"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

import {
  onMotionLevel,
  sceneDpr,
  sceneFrameGap,
  watchSceneFrames,
} from "@/lib/motionBudget";

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
  active,
}: {
  active: boolean;
}) {
  const invalidate =
    useThree(
      (state) =>
        state.invalidate,
    );

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

      const interval =
        sceneFrameGap();

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
