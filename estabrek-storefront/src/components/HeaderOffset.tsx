"use client";

import { useEffect } from "react";

export function HeaderOffset({ targetId = "site-header" }: { targetId?: string }) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const el = document.getElementById(targetId);
    if (!el) {
      root.style.setProperty("--site-header-height", "0px");
      return;
    }

    const update = () => {
      const rect = el.getBoundingClientRect();
      const height = Math.max(0, Math.round(rect.height));
      root.style.setProperty("--site-header-height", `${height}px`);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [targetId]);

  return null;
}
