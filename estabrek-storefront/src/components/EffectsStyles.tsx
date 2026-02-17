"use client";

import { useEffect } from "react";

export function EffectsStyles() {
  useEffect(() => {
    // Load heavy animation/effects CSS after first paint to avoid render-blocking.
    import("../cms/effects/effects.css");
  }, []);

  return null;
}
