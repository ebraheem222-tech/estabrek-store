"use client";

import { useEffect, useRef } from "react";
import type { SceneSpec } from "./scene";
import { mountScene } from "./sceneCanvas";
import styles from "./SceneView.module.css";

/** Decorative canvas: section content remains the sole pointer/focus target. */
export function SceneView({ spec, primary, secondary }: { spec: SceneSpec; primary: string; secondary: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const canvas = ref.current; return canvas ? mountScene(canvas, spec) : undefined; }, [spec.kind, spec.amount, spec.speed, spec.intensity, spec.interactive, spec.color, spec.secondary]);
  const style = { color: primary, borderColor: secondary };
  return <canvas ref={ref} className={styles.canvas} style={style} aria-hidden="true" data-pt-scene={spec.kind} data-scene-state="idle" />;
}
