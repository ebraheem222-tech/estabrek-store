"use client";
import { useEffect, useState } from "react";
import { isPageIdle, onPageIdle } from "./pageIdleCore";

// The page at rest (pageIdleCore.ts), and its hook for components.
export { isPageIdle, onPageIdle, watchPageIdle } from "./pageIdleCore";

/** The rest state for a component (a 3D canvas's frame loop, say). */
export function usePageIdle() {
  const [value, setValue] = useState(false);
  useEffect(() => {
    setValue(isPageIdle());
    return onPageIdle(setValue);
  }, []);
  return value;
}
