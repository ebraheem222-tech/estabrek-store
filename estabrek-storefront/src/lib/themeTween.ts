import { gsap } from "gsap";

/**
 * Every storefront colour change goes through here so it is always a smooth
 * GSAP transition instead of a jump: swatch picks, collection hovers, the
 * seasonal scene, and returning to the page's own colours.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB = /^rgba?\(/i;
const isColor = (v: string) => HEX.test(v) || RGB.test(v);

function reduced() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Current value of a custom property, resolved from inline style or the cascade. */
function current(el: HTMLElement, name: string) {
  return el.style.getPropertyValue(name).trim() || getComputedStyle(el).getPropertyValue(name).trim();
}

/** Animate CSS custom properties on `el` to `values`. Non-colour values are set at once. */
export function tweenTheme(
  el: HTMLElement,
  values: Record<string, string>,
  { duration = 0.7, ease = "power2.out", onComplete }: { duration?: number; ease?: string; onComplete?: () => void } = {},
) {
  const from: Record<string, string> = {};
  const to: Record<string, string> = {};
  for (const [name, value] of Object.entries(values)) {
    const start = current(el, name);
    if (duration > 0 && !reduced() && isColor(value) && isColor(start)) {
      from[name] = start;
      to[name] = value;
    } else {
      el.style.setProperty(name, value);
    }
  }
  const names = Object.keys(to);
  if (!names.length) {
    onComplete?.();
    return null;
  }
  // Pin the start values inline so GSAP interpolates from what is on screen now.
  for (const name of names) el.style.setProperty(name, from[name]);
  return gsap.to(el, { ...to, duration, ease, overwrite: "auto", onComplete });
}

/**
 * Animate back to the colours the page had before (`saved` inline values, or
 * the stylesheet default when nothing was inline), then drop the inline value.
 */
export function tweenThemeBack(
  el: HTMLElement,
  saved: Map<string, string>,
  { duration = 0.7, onComplete }: { duration?: number; onComplete?: () => void } = {},
) {
  const targets: Record<string, string> = {};
  const clear: string[] = [];
  saved.forEach((value, name) => {
    if (value) {
      targets[name] = value;
      return;
    }
    // Read the stylesheet value by briefly lifting the inline one.
    const inline = el.style.getPropertyValue(name);
    el.style.removeProperty(name);
    const fallback = getComputedStyle(el).getPropertyValue(name).trim();
    if (inline) el.style.setProperty(name, inline);
    if (fallback) targets[name] = fallback;
    clear.push(name);
  });
  return tweenTheme(el, targets, {
    duration,
    onComplete: () => {
      clear.forEach((name) => el.style.removeProperty(name));
      onComplete?.();
    },
  });
}

/** Stop any colour transition still running on `el` (e.g. before a new owner takes over). */
export function stopThemeTween(el: HTMLElement) {
  gsap.killTweensOf(el);
}
