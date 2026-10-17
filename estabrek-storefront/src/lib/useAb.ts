"use client";

import { useEffect, useSyncExternalStore } from "react";
import { abPeek, abValue, onAbChange } from "./ab";

/**
 * The home page's opening for this visit: the CMS's choice, unless an A/B test
 * (admin → تجارب A/B) gives this visit the other one. The server and the first
 * paint use the CMS's choice; right after, this visit's side (the other opening
 * was kept hidden meanwhile, see abHeadScript).
 */
export function useHeroFilm(cmsFilm: boolean): boolean {
  const film = useSyncExternalStore(
    onAbChange,
    () => {
      const v = abPeek("heroOpening");
      return v == null ? cmsFilm : v === "film";
    },
    () => cmsFilm,
  );
  useEffect(() => {
    // Counts the visit for the test (and picks a side if the head script couldn't).
    abValue("heroOpening");
    const raf = requestAnimationFrame(() => document.documentElement.removeAttribute("data-ab-hero"));
    return () => cancelAnimationFrame(raf);
  }, []);
  return film;
}
