import { storefrontPalette } from "@/lib/storefrontPalette";
import { tweenTheme } from "@/lib/themeTween";
import { claimTheme, dropTheme, holdsTheme, releaseTheme } from "@/lib/themeBase";

/**
 * Temporary storefront colour on hover (collection cards, add-to-bag buttons).
 * One preview at a time; leaving glides back to whatever the page had before.
 * Scenes that own the colours (seasons, collection worlds) are left alone.
 */

let saved: { shell: HTMLElement; navbar?: string } | null = null;
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
  if (!saved || saved.shell !== shell || !holdsTheme(shell, "preview")) {
    if (saved && saved.shell !== shell) dropTheme(saved.shell, "preview");
    saved = { shell, navbar: shell.dataset.navbarColor };
    claimTheme(shell, "preview", Object.keys(values));
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
  releaseTheme(shell, "preview", {
    duration: 0.6,
    onComplete: () => {
      if (saved) return; // a new preview started meanwhile
      delete shell.dataset.themePreview;
      const chosen = shell.dataset.storefrontColor;
      if (chosen) shell.dataset.navbarColor = chosen;
      else if (previous.navbar) shell.dataset.navbarColor = previous.navbar;
      else delete shell.dataset.navbarColor;
    },
  });
}

/** A real colour choice replaces the preview: nothing to restore afterwards. */
export function discardThemePreview() {
  if (saved) {
    delete saved.shell.dataset.themePreview;
    dropTheme(saved.shell, "preview");
  }
  saved = null;
}

/**
 * Add-to-bag hover: after the pointer rests on the button for a moment, a new
 * random colour, then another every couple of seconds while it stays. Leaving
 * glides back. Passing over buttons on the way somewhere (a product grid is
 * full of them) changes nothing — that used to recolour the whole site again
 * and again and read as flashing.
 */
const HOVER_INTENT_MS = 400;
let cycle: { timer: number; source: HTMLElement; started: boolean } | null = null;

export function startThemeCycle(source: HTMLElement, everyMs = 2200) {
  const shell = shellOf(source);
  if (!shell) return;
  // Touch screens have no hover: a tap must not leave the colours spinning.
  if (window.matchMedia?.("(hover: none)").matches && !source.matches(":focus-visible")) return;
  stopThemeCycle(null);
  const state = { timer: 0, source, started: false };
  state.timer = window.setTimeout(() => {
    if (cycle !== state) return;
    if (!source.isConnected || !shell.isConnected) return stopThemeCycle(source);
    state.started = true;
    previewTheme(shell, randomThemeSeed());
    state.timer = window.setInterval(() => {
      if (!source.isConnected || !shell.isConnected) return stopThemeCycle(source);
      previewTheme(shell, randomThemeSeed());
    }, everyMs);
  }, HOVER_INTENT_MS);
  cycle = state;
}

/** Stops the cycle (only the one this button started, unless null) and restores the colours. */
export function stopThemeCycle(source: HTMLElement | null) {
  if (!cycle || (source && cycle.source !== source)) return;
  // Clears either the waiting timeout or the running interval (they share the id space).
  window.clearTimeout(cycle.timer);
  window.clearInterval(cycle.timer);
  const { started } = cycle;
  const shell = shellOf(cycle.source);
  cycle = null;
  // A quick pass never changed anything, so there is nothing to give back.
  if (source && started) endThemePreview(shell);
}
