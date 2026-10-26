"use client";
/**
 * The admin's theme gallery shows a theme on the shop before it is saved:
 * ?storeTheme=<id>&themeMode=light|dark (storeTheme=rose for the rose design). Inside
 * the admin's frame the choice follows the shopper's clicks for the rest of the visit
 * (sessionStorage, which in a frame belongs to that admin tab only); a normal visit
 * forgets it with the next page. Only the look changes here: the home page's own
 * layout follows a preview through the studio frame (app/[lang]/studio-frame).
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { themeCss } from "./css";
import { themeById } from "./registry";

const KEY = "store-theme-preview";

export function StoreThemePreview({ saved }: { saved: string | null }) {
  const pathname = usePathname();
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const framed = window.self !== window.top;
    let want = sp.get("storeTheme");
    let mode = sp.get("themeMode");
    try {
      if (want && framed) sessionStorage.setItem(KEY, JSON.stringify({ id: want, mode }));
      if (!want && framed) {
        const kept = JSON.parse(sessionStorage.getItem(KEY) || "null") as { id?: string; mode?: string } | null;
        want = kept?.id ?? null;
        mode = kept?.mode ?? null;
      }
    } catch {
      /* storage off: the address alone decides */
    }
    if (!want) return;
    const root = document.documentElement;
    const theme = themeById(want);
    let tag = document.getElementById(KEY) as HTMLStyleElement | null;
    if (!theme) {
      // The rose design: no theme at all.
      tag?.remove();
      document.getElementById("store-theme")?.setAttribute("media", "not all");
      delete root.dataset.storeTheme;
      return;
    }
    if (!tag) {
      tag = document.createElement("style");
      tag.id = KEY;
      document.head.appendChild(tag);
    }
    tag.textContent = themeCss(theme, mode === "light" || mode === "dark" ? mode : null);
    root.dataset.storeTheme = theme.id;
  }, [pathname, saved]);
  return null;
}
