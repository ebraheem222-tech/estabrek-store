"use client";
import { createContext, useContext, useRef, useCallback, useEffect, useLayoutEffect, type ReactNode, type RefObject } from "react";
import { rosePalettes } from "./roseDesign";
import { storefrontPalette } from "@/lib/storefrontPalette";
import { crossfadeTheme, setThemeNow, tweenTheme, tweenThemeBack } from "@/lib/themeTween";
import { themeHeld } from "@/lib/themeBase";
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
    window.localStorage.setItem(THEME_SEEN_KEY, String(Date.now()));
  } catch {
    // Private mode or blocked storage: the theme still applies on this page.
  }
}
function forgetColor() {
  try {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    window.localStorage.removeItem(THEME_SEEN_KEY);
  } catch {
    /* storage blocked */
  }
}
/**
 * Away from the keyboard: when the shopper does nothing for this long (no
 * scroll, touch, click, typing or pointer movement), the picked colour fades
 * back to the shop's own colours, and the next visit after such a break opens
 * in them too. The colour stays while she keeps browsing, page to page.
 */
export const THEME_IDLE_MS = 3 * 60_000;
/** When the shopper was last active with a colour picked (to tell a break from page-to-page browsing). */
const THEME_SEEN_KEY = "estabrek_theme_seen";
function awayTooLong() {
  try {
    const seen = Number(window.localStorage.getItem(THEME_SEEN_KEY));
    return seen > 0 && Date.now() - seen > THEME_IDLE_MS;
  } catch {
    return false;
  }
}
/** A colour kept by an older version (no "seen" time): it may be a product's own colour, so it is dropped once. */
function savedBeforeThisVersion() {
  try {
    return Boolean(window.localStorage.getItem(THEME_STORAGE_KEY)) && !window.localStorage.getItem(THEME_SEEN_KEY);
  } catch {
    return false;
  }
}
const ACTIVITY = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;
export function RoseThemeProvider({ children, className, restoreSelection = true }: { children: ReactNode; className: string; restoreSelection?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useClientLayoutEffect(() => {
    let selected = false;
    const globalProperties = new Map<string, string>();
    // The shell's own colours before the first pick, to fade back to after a break.
    let ownColours: Map<string, string> | null = null;
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
      const shell = root.current;
      if (!ownColours) ownColours = new Map(Object.keys(palette).map((key) => [key, shell.style.getPropertyValue(key)]));
      const mark = () => {
        shell.dataset.navbarColor = color;
        shell.dataset.storefrontColor = color;
        document.documentElement.dataset.storefrontColor = color;
      };
      selected = true;
      // A picked colour cross-fades in (one restyle, the fade runs on the graphics
      // card); a colour carried over from the last page is applied at once. While a
      // scene (seasons, collection worlds) or a hover preview holds the colours, or in
      // a browser without view transitions, it glides as before.
      const fade = !restored && !themeHeld(shell) && crossfadeTheme(() => {
        setThemeNow(shell, palette);
        setThemeNow(document.documentElement, global);
        mark();
      });
      if (!fade) {
        const duration = restored ? 0 : 0.7;
        tweenTheme(shell, palette, { duration });
        tweenTheme(document.documentElement, global, { duration });
        mark();
      }
      // Only a colour the shopper picked is carried to the next pages. The colour a
      // product page takes on its own (`auto`, e.g. a white piece) stays on that page:
      // carried over, it turned the whole site white after a refresh.
      const auto = Boolean((event as CustomEvent & { auto?: boolean }).auto);
      if (!restored && !auto) saveColor(color);
      arm();
    };

    // Back to the shop's own colours after a break (see THEME_IDLE_MS).
    let idleTimer = 0;
    let lastActive = Date.now();
    let lastSaved = 0;
    const arm = () => {
      window.clearTimeout(idleTimer);
      if (selected) idleTimer = window.setTimeout(goIdle, THEME_IDLE_MS);
    };
    const goIdle = () => {
      const shell = root.current;
      if (!selected || !shell) return;
      // A scene (seasons, collection worlds) or a preview is borrowing the colours: wait for it to give them back.
      if (themeHeld(shell)) { idleTimer = window.setTimeout(goIdle, 5000); return; }
      const own = ownColours ?? new Map<string, string>();
      const global = new Map(globalProperties);
      const restore = () => {
        own.forEach((value, key) => (value ? shell.style.setProperty(key, value) : shell.style.removeProperty(key)));
        global.forEach((previous, property) => previous
          ? document.documentElement.style.setProperty(property, previous)
          : document.documentElement.style.removeProperty(property));
      };
      const unmark = () => {
        delete shell.dataset.navbarColor;
        delete shell.dataset.storefrontColor;
        delete document.documentElement.dataset.storefrontColor;
      };
      // Nobody watching (hidden tab): at once. Otherwise the same soft cross-fade as a pick.
      if (document.hidden || !crossfadeTheme(() => { restore(); unmark(); })) {
        if (document.hidden) restore();
        else {
          tweenThemeBack(shell, own, { duration: 1.2 });
          tweenThemeBack(document.documentElement, global, { duration: 1.2 });
        }
        unmark();
      }
      selected = false;
      ownColours = null;
      globalProperties.clear();
      forgetColor();
      window.dispatchEvent(new CustomEvent("storefront-color-reset"));
    };
    const active = () => {
      const now = Date.now();
      // Pointer moves come many times a second: re-arm at most once a second.
      if (now - lastActive < 1000) return;
      lastActive = now;
      if (!selected) return;
      arm();
      if (now - lastSaved > 15_000) {
        lastSaved = now;
        try { window.localStorage.setItem(THEME_SEEN_KEY, String(now)); } catch { /* storage blocked */ }
      }
    };
    // Timers sleep in a background tab: on return, check how long she was away.
    const back = () => {
      if (document.visibilityState === "visible" && selected && Date.now() - lastActive > THEME_IDLE_MS) goIdle();
    };
    // A colour picked in another tab, or this page shown again from the browser's
    // back/forward memory (its scripts don't run again): it catches up with the colour
    // she picked last, as a fresh visit would. A product page keeps the piece's colour.
    let pendingSync = false;
    const sync = () => {
      pendingSync = false;
      const shell = root.current;
      const saved = restoreSelection ? readSavedColor() : null;
      if (!shell || !saved || awayTooLong() || shell.querySelector(".rose-pdp")) return;
      if (shell.dataset.storefrontColor?.toLowerCase() === saved.toLowerCase()) return;
      window.dispatchEvent(Object.assign(new CustomEvent("storefront-color-selected", { detail: saved }), { restored: true }));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY || !event.newValue) return;
      // Applied when she comes back to this tab (nothing to restyle while it is hidden).
      if (document.visibilityState === "visible") sync(); else pendingSync = true;
    };
    const onShow = (event: PageTransitionEvent) => { if (event.persisted) sync(); };
    const onVisible = () => { if (pendingSync && document.visibilityState === "visible") sync(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onVisible);
    ACTIVITY.forEach((name) => window.addEventListener(name, active, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", back);
    window.addEventListener("storefront-color-selected", select);
    // Pages other than About open in the colour the shopper picked last (unless she was away a long while).
    if (awayTooLong() || savedBeforeThisVersion()) forgetColor();
    const saved = restoreSelection ? readSavedColor() : null;
    if (saved) select(Object.assign(new CustomEvent("storefront-color-selected", { detail: saved }), { restored: true }));
    if (root.current) root.current.dataset.colorSelectionReady = "true";
    return () => {
      window.clearTimeout(idleTimer);
      ACTIVITY.forEach((name) => window.removeEventListener(name, active, { capture: true }));
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVisible);
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
