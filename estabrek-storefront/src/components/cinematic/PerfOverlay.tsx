"use client";

import { useEffect, useState } from "react";
import { motionLevel, motionStats, onMotionLevel } from "@/lib/motionBudget";

/**
 * Add `?perf=1` to any storefront address to see how smoothly this device runs
 * the scroll scenes (frame rate, light/full mode, film seek time). Meant for
 * checking a phone that stutters; nobody else ever sees it.
 */
export function PerfOverlay() {
  const [on, setOn] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    try {
      const asked = new URLSearchParams(window.location.search).get("perf");
      if (asked === "1") sessionStorage.setItem("estabrek_perf", "1");
      if (asked === "0") sessionStorage.removeItem("estabrek_perf");
      setOn(sessionStorage.getItem("estabrek_perf") === "1");
    } catch {
      /* storage blocked */
    }
  }, []);

  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let last = 0;
    let frames = 0;
    let sum = 0;
    let worst = 0;
    let fps = 0;
    let avg = 0;
    let shownWorst = 0;
    const tick = (t: number) => {
      if (last) {
        const gap = t - last;
        if (gap < 1000) { frames++; sum += gap; worst = Math.max(worst, gap); }
      }
      last = t;
      if (sum >= 500) {
        fps = Math.round((frames * 1000) / sum);
        avg = Math.round((sum / frames) * 10) / 10;
        shownWorst = Math.round(worst);
        frames = 0; sum = 0; worst = 0;
        const s = motionStats;
        const level = motionLevel();
        setText([
          `${fps} fps · ${avg} ms · worst ${shownWorst} ms`,
          `screen ${s.hz || "?"} Hz · dpr ${window.devicePixelRatio} · ${screen.width}×${screen.height}`,
          `mode ${level}${s.reason ? ` (${s.reason})` : ""}`,
          `scene ${s.frameMs || "-"} ms · late ${Math.round(s.late * 100)}%`,
          `film seek ${s.seekMs || "-"} ms`,
        ].join("\n"));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const off = onMotionLevel(() => setText((t) => t));
    return () => { cancelAnimationFrame(raf); off(); };
  }, [on]);

  if (!on) return null;
  return (
    <pre
      data-testid="perf-overlay"
      dir="ltr"
      style={{
        position: "fixed", left: 8, top: 72, zIndex: 2147483000, margin: 0, padding: "6px 8px",
        font: "11px/1.45 ui-monospace, Menlo, Consolas, monospace", color: "#fff",
        background: "rgba(20, 8, 14, .78)", borderRadius: 8, pointerEvents: "none", whiteSpace: "pre",
      }}
    >
      {text || "…"}
    </pre>
  );
}
