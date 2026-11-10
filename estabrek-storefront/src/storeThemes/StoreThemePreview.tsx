"use client";
/**
 * The admin's theme gallery shows a theme on the shop before it is saved:
 * ?storeTheme=<id>&themeMode=light|dark (storeTheme=rose for the rose design), and the store's
 * changes being tried in the customizer (&themeCustom=, custom.ts) and a pack being tried
 * (&kit=, packs.ts: its focus ring and cursor; the page's motion follows it in the studio frame). Inside
 * the admin's frame the choice follows the shopper's clicks for the rest of the visit
 * (sessionStorage, which in a frame belongs to that admin tab only); a normal visit
 * forgets it with the next page. Only the look changes here: the home page's own
 * layout follows a preview through the studio frame (app/[lang]/studio-frame).
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { themeCss } from "./css";
import { applyCursorTheme } from "@/theme/cursorTheme";
import { applyCustom, customFromParam } from "./custom";
import { kitCss, kitFromParam } from "./packs";
import type { StoreTheme } from "./types";

const KEY = "store-theme-preview";

export function StoreThemePreview({ saved, owned }: { saved: string | null; owned?: StoreTheme | null }) {
  const pathname = usePathname();
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const framed = window.self !== window.top;
    const template = /(^|\/)design-frame$/.test(pathname ?? "") ? sp.get("template") : null;
    let want = sp.get("storeTheme") ?? (template ? `tpl-${template}` : null);
    let mode = sp.get("themeMode");
    let custom = sp.get("themeCustom");
    let kitParam = sp.get("kit");
    try {
      if (want && framed) sessionStorage.setItem(KEY, JSON.stringify({ id: want, mode, custom, kit: kitParam }));
      if (!want && framed) {
        const kept = JSON.parse(sessionStorage.getItem(KEY) || "null") as { id?: string; mode?: string; custom?: string; kit?: string } | null;
        want = kept?.id ?? null;
        mode = kept?.mode ?? null;
        custom = kept?.custom ?? null;
        kitParam = kept?.kit ?? null;
      }
    } catch {
      /* storage off: the address alone decides */
    }
    if (!want) return;
    const root = document.documentElement;
    let live = true;
    // The list of every theme and template (over 1 MB of code) loads only for a preview: it was in every
    // shopper's first download.
    const wanted = want;
    void (want === owned?.id ? Promise.resolve(owned) : import("./registry").then((m) => m.themeById(wanted))).then((found) => {
    if (!live) return;
    const theme = found ? applyCustom(found, customFromParam(custom)) : null;
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
    // A pack being tried: its focus ring and cursor.
    const kit = kitFromParam(kitParam, theme);
    if (kit) {
      let kitTag = document.getElementById(`${KEY}-kit`) as HTMLStyleElement | null;
      if (!kitTag) {
        kitTag = document.createElement("style");
        kitTag.id = `${KEY}-kit`;
        document.head.appendChild(kitTag);
      }
      kitTag.textContent = kitCss(kit);
      root.dataset.storeKit = "";
      applyCursorTheme(kit.cursor === "none" ? null : kit.cursor);
    }
    });
    return () => { live = false; };
  }, [pathname, saved, owned]);
  return null;
}
