"use client";
import { createContext, useContext, useRef, useCallback, useEffect, useLayoutEffect, type ReactNode, type RefObject } from "react";
import { rosePalettes, roseVar } from "./roseDesign";
import { storefrontPalette } from "@/lib/storefrontPalette";
import { crossfadeTheme, setThemeNow, tweenTheme } from "@/lib/themeTween";
import { themeHeld } from "@/lib/themeBase";
import { discardThemePreview, storeThemeOn } from "@/lib/themePreview";
import { COLOURS_EVENT, addToMix, blendColours, dyeDepth, dyePaint, isHex, meshBackground, readMix, saveMix } from "@/lib/colourMix";
import { MIX_PAINTS, mixPaints } from "@/lib/mixPaints";
import { isNearWhite } from "@/lib/storefrontPalette";
import { colourBlendOn } from "@/lib/colourEngine";

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
 * A break: when the shopper did nothing for this long (no scroll, touch, click, typing or pointer movement), the
 * next page she opens is in the shop's own colours. The colour stays while she keeps browsing, page to page, and
 * it never changes under her eyes on an open page: faded back there after the break, a product page lost its
 * piece's colour (a blue dress in the shop's pink header) and a picked colour changed while she looked away.
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
/**
 * colorScope: where a picked colour shows (Admin → الإعدادات → الثيم والألوان). "everything" (the default):
 * the bar, the header, the page and the footer take it; "product": on the inner pages only a product page's
 * product area does (app/rose-inner.css reads the shell's data-color-scope).
 */
export function RoseThemeProvider({ children, className, restoreSelection = true, colorScope = "everything" }: { children: ReactNode; className: string; restoreSelection?: boolean; colorScope?: "everything" | "product" }) {
  const root = useRef<HTMLDivElement>(null);
  useClientLayoutEffect(() => {
    let selected = false;
    let picks = 0;
    const globalProperties = new Map<string, string>();
    // The colours she tapped on the shop's cards, oldest → newest (lib/colourMix.ts): the theme is their blend.
    let mix: string[] = readMix();
    const select = (event: Event) => {
      const picked = (event as CustomEvent<string>).detail;
      if (!/^#[0-9a-f]{6}$/i.test(picked) || !root.current || storeThemeOn()) return;
      const restored = Boolean((event as CustomEvent & { restored?: boolean }).restored);
      const auto = Boolean((event as CustomEvent & { auto?: boolean }).auto);
      const mixing = Boolean((event as CustomEvent & { mix?: boolean }).mix) && colourBlendOn();
      if (!restored && !auto) {
        // A card's colour joins the mix; tapping the newest one again keeps it alone. Any other pick starts afresh.
        const again = mix.length > 1 && mix[mix.length - 1] === picked.toLowerCase();
        mix = mixing && !again ? addToMix(mix, picked) : [picked.toLowerCase()];
        saveMix(mix);
      }
      // A page's own colours (the checkout: the colours of what's in the bag, the most bought last): worn mixed
      // on this page only, like a product page's own colour (not saved, her own mix stays as it was).
      const ownRaw = (event as CustomEvent & { colours?: unknown }).colours;
      const own = auto && Array.isArray(ownRaw) ? [...new Set(ownRaw.filter(isHex).map((c) => c.toLowerCase()))].slice(-4) : [];
      const pageMix = own.length > 1 && colourBlendOn() ? own : null;
      // A colour carried over from the last page is the mix's blend when it was one.
      const blended = pageMix ? blendColours(pageMix) : mix.length > 1 ? blendColours(mix) : null;
      const meshOn = pageMix ? true : Boolean(blended) && !auto && (restored ? blended === picked.toLowerCase() : mixing);
      const worn = pageMix ?? mix;
      const color = meshOn ? blended! : picked;
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
      const mark = () => {
        shell.dataset.navbarColor = color;
        shell.dataset.storefrontColor = color;
        document.documentElement.dataset.storefrontColor = color;
        // How much the dyed pictures (the shop's silk film) also deepen: wine and navy, not their pastels.
        shell.style.setProperty("--selection-dye-depth", isNearWhite(color) ? "0" : dyeDepth(color));
        // The mixed colours: the header wears them as a gradient mesh over their blend, the page as a light one
        // behind everything, and the dyes (the scarf, the films, the campaign photo) flow through them.
        if (meshOn) {
          shell.style.setProperty("--navbar-mesh", meshBackground(worn));
          shell.style.setProperty("--page-mesh", meshBackground(worn, { light: 0.86 }));
          const dyed = worn.filter((c) => !isNearWhite(c));
          if (dyed.length > 1) shell.style.setProperty("--selection-dye-paint", dyePaint(dyed));
          else shell.style.removeProperty("--selection-dye-paint");
          // Buttons, headings, prices and the footer flow through the colours too (lib/mixPaints.ts); on the
          // page (html) as well, for the floating buttons outside the shell.
          const paints = mixPaints(worn);
          for (const name of MIX_PAINTS) {
            for (const el of [shell, document.documentElement]) {
              if (paints[name]) el.style.setProperty(name, paints[name]!);
              else el.style.removeProperty(name);
            }
          }
          shell.dataset.colourMix = worn.join(" ");
          document.documentElement.dataset.colourMix = worn.join(" ");
        } else {
          for (const name of ["--navbar-mesh", "--page-mesh", "--selection-dye-paint", ...MIX_PAINTS]) shell.style.removeProperty(name);
          for (const name of MIX_PAINTS) document.documentElement.style.removeProperty(name);
          delete shell.dataset.colourMix;
          delete document.documentElement.dataset.colourMix;
        }
        window.dispatchEvent(new CustomEvent(COLOURS_EVENT, { detail: { colours: meshOn ? [...worn] : [color] } }));
      };
      selected = true;
      const pick = ++picks;
      // A picked colour cross-fades in (one restyle, the fade runs on the graphics
      // card); a colour carried over from the last page is applied at once. While a
      // scene (seasons, collection worlds) or a hover preview holds the colours, or in
      // a browser without view transitions, it glides as before.
      const fade = !restored && !themeHeld(shell) && crossfadeTheme(() => {
        // The browser can run an older pick's change after a newer one (its snapshot
        // took longer): that older colour must not win.
        if (pick !== picks) return;
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
      // Only a colour the shopper picked is carried to the next pages (a mix as its blend). The colour a
      // product page takes on its own (`auto`, e.g. a white piece) stays on that page:
      // carried over, it turned the whole site white after a refresh.
      if (!restored && !auto) saveColor(color);
      lastActive = Date.now();
    };

    // When she was last active with a colour on, for the next page (see THEME_IDLE_MS).
    let lastActive = Date.now();
    let lastSaved = 0;
    const active = () => {
      const now = Date.now();
      // Pointer moves come many times a second: at most once a second.
      if (now - lastActive < 1000) return;
      lastActive = now;
      if (!selected) return;
      if (now - lastSaved > 15_000) {
        lastSaved = now;
        try { window.localStorage.setItem(THEME_SEEN_KEY, String(now)); } catch { /* storage blocked */ }
      }
    };
    // A colour picked in another tab, or this page shown again from the browser's
    // back/forward memory (its scripts don't run again): it catches up with the colour
    // she picked last, as a fresh visit would. A product page keeps the piece's colour.
    let pendingSync = false;
    const sync = () => {
      pendingSync = false;
      const shell = root.current;
      const saved = restoreSelection ? readSavedColor() : null;
      // A product page keeps the piece's colour, the checkout the bag's.
      if (!shell || !saved || awayTooLong() || shell.querySelector(".rose-pdp, .rose-cart:not(.rose-cart-empty)")) return;
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
    window.addEventListener("storefront-color-selected", select);
    // Pages other than About open in the colour the shopper picked last (unless she was away a long while).
    if (awayTooLong() || savedBeforeThisVersion()) forgetColor();
    const saved = restoreSelection ? readSavedColor() : null;
    if (saved) select(Object.assign(new CustomEvent("storefront-color-selected", { detail: saved }), { restored: true }));
    if (root.current) root.current.dataset.colorSelectionReady = "true";
    return () => {
      ACTIVITY.forEach((name) => window.removeEventListener(name, active, { capture: true }));
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storefront-color-selected", select);
      if (selected) {
        globalProperties.forEach((previous, property) => previous
          ? document.documentElement.style.setProperty(property, previous)
          : document.documentElement.style.removeProperty(property));
        delete document.documentElement.dataset.storefrontColor;
        delete document.documentElement.dataset.colourMix;
        for (const name of MIX_PAINTS) document.documentElement.style.removeProperty(name);
      }
    };
  }, [restoreSelection]);
  const apply = useCallback((background: string) => {
    const el = root.current;
    // A store theme keeps one page colour; the scenes' colours belong to the rose design.
    if (!el || storeThemeOn()) return;
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
    // Only when it changes: written again on each step of a scroll's palette, it restyled the page each time.
    const tone = light ? "light" : "dark";
    if (el.dataset.roseTone !== tone) el.dataset.roseTone = tone;
  }, []);
  const reset = useCallback(() => {
    if (root.current?.dataset.storefrontColor) return;
    properties.forEach(name => root.current?.style.removeProperty(name));
    if (root.current) delete root.current.dataset.roseTone;
  }, []);
  return <ThemeContext.Provider value={{ root, apply, reset }}>
    <div ref={root} className={className} data-rose-theme="true" data-color-scope={colorScope} style={{ "--atelier-bg": roseVar(className.includes("cinematic-home-shell") ? rosePalettes.blush : rosePalettes.pearl) } as React.CSSProperties}>{children}</div>
  </ThemeContext.Provider>;
}
export function useRoseTheme() { return useContext(ThemeContext); }
