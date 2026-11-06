"use client";
import { useEffect, useState } from "react";
import { sameViewTargets, viewTargets } from "./viewRuntime";

/** Rebuild the motion runtime only when its own targets or configs changed. */
export function useStudioViewRevision(selector: string, attributes: readonly string[], scope: string): number {
  const [revision, setRevision] = useState(0);
  const keys = JSON.stringify(attributes);
  useEffect(() => {
    if (window.parent === window || !/\/studio-frame/.test(window.location.pathname)) return;
    const names: string[] = JSON.parse(keys);
    let previous = viewTargets(document,selector,names);
    // Motion applies legacy-look attributes synchronously in its own effect.
    const frame = requestAnimationFrame(() => { previous = viewTargets(document,selector,names); });
    const committed = () => {
      const current = viewTargets(document,selector,names);
      if (!sameViewTargets(previous,current)) { previous=current; setRevision(value=>value+1); }
    };
    window.addEventListener("studio-view-updated",committed);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("studio-view-updated",committed); };
  }, [selector,keys,scope,revision]);
  return revision;
}
