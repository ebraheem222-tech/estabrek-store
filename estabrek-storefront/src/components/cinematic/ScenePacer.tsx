"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { onMotionLevel, sceneDpr, sceneFrameGap, watchSceneFrames } from "@/lib/motionBudget";

/**
 * Drives a 3D scene (Canvas with frameloop="demand") at the paced rate from
 * motionBudget: 60 frames a second at most, 30 in the light mode, instead of
 * the screen's own rate (120 Hz on some phones). Also lowers the pixel density
 * when the light mode starts.
 */
export function ScenePacer({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const setDpr = useThree((s) => s.setDpr);

  useEffect(() => onMotionLevel(() => { setDpr(sceneDpr()); invalidate(); }), [setDpr, invalidate]);

  useEffect(() => {
    if (!active) return;
    const stopWatching = watchSceneFrames();
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      if (t - last >= sceneFrameGap()) {
        last = t;
        invalidate();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      stopWatching();
    };
  }, [active, invalidate]);

  return null;
}
