import { storefrontPalette } from "@/lib/storefrontPalette";
import { tweenTheme, tweenThemeBack } from "@/lib/themeTween";

/**
 * Temporary storefront colour on hover (collection cards, add-to-bag buttons).
 * One preview at a time; leaving glides back to whatever the page had before.
 * Scenes that own the colours (seasons, collection worlds) are left alone.
 */

type Saved = { shell: HTMLElement; values: Map<string, string>; navbar?: string };
let saved: Saved | null = null;
let lastSeed = "";

/** Soft brand-friendly seeds for the random add-to-bag preview. */
const RANDOM_SEEDS = ["#c97794", "#a08cbd", "#7d8ec4", "#e9a27c", "#8ea58a", "#c4a266", "#e59b9b", "#9b6b4e", "#5f8f9b", "#b5658f"];

export function randomThemeSeed() {
  const pool = RANDOM_SEEDS.filter((s) => s !== lastSeed);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function shellOf(el: Element | null | undefined) {
  return el?.closest<HTMLElement>(".cinematic-shell") ?? null;
}

export function previewTheme(shell: HTMLElement | null, seed: string) {
  if (!shell || shell.dataset.season) return;
  const values = storefrontPalette(seed);
  if (!saved || saved.shell !== shell) {
    saved = { shell, values: new Map(Object.keys(values).map((k) => [k, shell.style.getPropertyValue(k)])), navbar: shell.dataset.navbarColor };
  }
  lastSeed = seed;
  shell.dataset.themePreview = "true";
  shell.dataset.navbarColor = seed;
  tweenTheme(shell, values, { duration: 0.6 });
}

export function endThemePreview(shell: HTMLElement | null) {
  if (!shell || !saved || saved.shell !== shell) return;
  const previous = saved;
  saved = null;
  tweenThemeBack(shell, previous.values, {
    duration: 0.6,
    onComplete: () => {
      if (saved) return; // a new preview started meanwhile
      delete shell.dataset.themePreview;
      if (previous.navbar) shell.dataset.navbarColor = previous.navbar;
      else delete shell.dataset.navbarColor;
    },
  });
}

/** A real colour choice replaces the preview: nothing to restore afterwards. */
export function discardThemePreview() {
  if (saved) delete saved.shell.dataset.themePreview;
  saved = null;
}
