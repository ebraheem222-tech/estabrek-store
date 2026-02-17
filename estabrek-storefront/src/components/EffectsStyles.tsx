"use client";

import { useEffect } from "react";

export function EffectsStyles() {
  useEffect(() => {
    // Load heavy animation/effects CSS after first paint to avoid render-blocking.
    const id = "cms-effects-css";
    if (document.getElementById(id)) return;

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "/cms-effects.css";
    document.head.appendChild(link);
  }, []);

  return null;
}
