"use client";
import { createContext, useContext, useRef, useCallback, useEffect, useLayoutEffect, type ReactNode, type RefObject } from "react";
import { rosePalettes } from "./roseDesign";
import { storefrontPalette } from "@/lib/storefrontPalette";
import { tweenTheme } from "@/lib/themeTween";
import { discardThemePreview } from "@/lib/themePreview";

type Theme = { root: RefObject<HTMLDivElement>; apply: (background: string) => void; reset: () => void };
const ThemeContext = createContext<Theme | null>(null);
const properties = ["--atelier-bg", "--atelier-ink", "--atelier-muted", "--atelier-line", "--bg", "--text", "--muted", "--border", "--color-bg", "--color-text", "--color-text-muted", "--color-border"];
const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
/** The shopper's last chosen colour theme, carried from page to page. */
export const THEME_STORAGE_KEY = "estabrek_theme_color";
function readSavedColor(): string | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value && /^#[0-9a-f]{6}$/i.test(value) ? value : null;
  } catch {
    return null;
  }
}
function saveColor(color: string) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, color);
  } catch {
    // Private mode or blocked storage: the theme still applies on this page.
  }
}
export function RoseThemeProvider({ children, className, restoreSelection = true }: { children: ReactNode; className: string; restoreSelection?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useClientLayoutEffect(() => {
    let selected = false;
    const globalProperties = new Map<string, string>();
    const select = (event: Event) => {
      const color = (event as CustomEvent<string>).detail;
      if (!/^#[0-9a-f]{6}$/i.test(color) || !root.current) return;
      const restored = Boolean((event as CustomEvent & { restored?: boolean }).restored);
      if (!restored) discardThemePreview();
      const palette = storefrontPalette(color);
      // Global quick view and floating controls are outside the shell.
      const global: Record<string, string> = {};
      Object.entries(palette).forEach(([property, value]) => {
        if (!property.startsWith("--selection-")) return;
        if (!globalProperties.has(property)) globalProperties.set(property, document.documentElement.style.getPropertyValue(property));
        global[property] = value;
      });
      // A picked colour glides in; a colour carried over from the last page is applied at once.
      const duration = restored ? 0 : 0.7;
      tweenTheme(root.current, palette, { duration });
      tweenTheme(document.documentElement, global, { duration });
      selected = true;
      root.current.dataset.navbarColor = color;
      root.current.dataset.storefrontColor = color;
      document.documentElement.dataset.storefrontColor = color;
      if (!(event as CustomEvent & { restored?: boolean }).restored) saveColor(color);
    };
    window.addEventListener("storefront-color-selected", select);
    // Pages other than About open in the colour the shopper picked last.
    const saved = restoreSelection ? readSavedColor() : null;
    if (saved) select(Object.assign(new CustomEvent("storefront-color-selected", { detail: saved }), { restored: true }));
    if (root.current) root.current.dataset.colorSelectionReady = "true";
    return () => {
      window.removeEventListener("storefront-color-selected", select);
      if (selected) {
        globalProperties.forEach((previous, property) => previous
          ? document.documentElement.style.setProperty(property, previous)
          : document.documentElement.style.removeProperty(property));
        delete document.documentElement.dataset.storefrontColor;
      }
    };
  }, [restoreSelection]);
  const apply = useCallback((background: string) => {
    const el = root.current;
    if (!el) return;
    if (el.dataset.storefrontColor) return;
    const rgb = [1, 3, 5].map(i => parseInt(background.slice(i, i + 2), 16) / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
    const luminance = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    const light = luminance > .179;
    const readable = (color: string) => {
      const c = [1,3,5].map(i => parseInt(color.slice(i,i+2),16)/255).map(n => n <= .04045 ? n/12.92 : ((n+.055)/1.055)**2.4);
      const l = c[0]*.2126+c[1]*.7152+c[2]*.0722;
      return (Math.max(l,luminance)+.05)/(Math.min(l,luminance)+.05) >= 4.5;
    };
    const preferredInk = light ? "#4d2039" : "#fff8f4";
    const ink = readable(preferredInk) ? preferredInk : light ? "#000000" : "#ffffff";
    const preferredMuted = light ? "#703c58" : "#f2d8e4";
    const muted = readable(preferredMuted) ? preferredMuted : ink;
    const line = light ? "#cfa7bc" : "#ac6c8b";
    const values = [background, ink, muted, line, background, ink, muted, line, background, ink, muted, line];
    properties.forEach((name, i) => el.style.setProperty(name, values[i]));
    el.dataset.roseTone = light ? "light" : "dark";
  }, []);
  const reset = useCallback(() => {
    if (root.current?.dataset.storefrontColor) return;
    properties.forEach(name => root.current?.style.removeProperty(name));
    if (root.current) delete root.current.dataset.roseTone;
  }, []);
  return <ThemeContext.Provider value={{ root, apply, reset }}>
    <div ref={root} className={className} data-rose-theme="true" style={{ "--atelier-bg": className.includes("cinematic-home-shell") ? rosePalettes.blush : rosePalettes.pearl } as React.CSSProperties}>{children}</div>
  </ThemeContext.Provider>;
}
export function useRoseTheme() { return useContext(ThemeContext); }
