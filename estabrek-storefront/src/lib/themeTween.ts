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

/**
 * While the storefront colours glide, CSS colour transitions are switched off
 * (see `html[data-theme-gliding]` in cinematic.css). Otherwise every element
 * with its own colour transition (header, buttons, swatches, filters) restarted
 * it on every frame of the glide and trailed behind the page — measured: the
 * page reached a new colour at 0.6 s while the header got there at 1.05 s, with
 * 800–1000 transition restarts per pick. One animation source keeps everything
 * moving together.
 */
let gliding = 0;
function beginGlide(seconds: number) {
  if (typeof document === "undefined") return () => {};
  gliding++;
  document.documentElement.dataset.themeGliding = "";
  let open = true;
  const end = () => {
    if (!open) return;
    open = false;
    window.clearTimeout(safety);
    gliding = Math.max(0, gliding - 1);
    if (!gliding) delete document.documentElement.dataset.themeGliding;
  };
  // A tween replaced by a newer one never completes: let go of it anyway.
  const safety = window.setTimeout(end, seconds * 1000 + 400);
  return end;
}

/** One computed-style lookup, made only if an inline value is missing. */
function lazyComputed(el: HTMLElement) {
  let style: CSSStyleDeclaration | null = null;
  return () => (style ??= getComputedStyle(el));
}

type Rgb = [number, number, number];
function parseColor(v: string): Rgb | null {
  const s = v.trim();
  let m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) return [0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16)) as Rgb;
  m = /^#([0-9a-f]{3})$/i.exec(s);
  if (m) return [0, 1, 2].map((i) => parseInt(m![1][i] + m![1][i], 16)) as Rgb;
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i.exec(s);
  if (m && (m[4] === undefined || m[4] === "1" || m[4] === "100%")) return [+m[1], +m[2], +m[3]];
  return null;
}
const toHex = (c: Rgb) => `#${c.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("")}`;

/**
 * For scroll-driven scenes (seasons, collection worlds) that change the colours
 * on every scroll frame. Starting a new GSAP tween each frame made the browser
 * re-read the whole page's styles every frame, and several tweens chased each
 * other (colours from two seasons on screen at once). The follower is one
 * light loop: it eases the current colours towards the latest target and only
 * writes a property when its visible value actually changes.
 */
const STAND_IN: Record<string, string> = { "--navbar-bg": "--atelier-bg", "--navbar-ink": "--atelier-ink" };

export function themeFollower(el: HTMLElement) {
  const now = new Map<string, Rgb>();
  const target = new Map<string, Rgb>();
  const written = new Map<string, string>();
  let raf = 0;
  let last = 0;
  let smooth = 0.12;
  let endGlide: (() => void) | null = null;
  const settle = () => { endGlide?.(); endGlide = null; };
  const step = (t: number) => {
    const dt = last ? Math.min(0.1, (t - last) / 1000) : 1 / 60;
    last = t;
    const k = 1 - Math.exp(-dt / smooth);
    let moving = false;
    target.forEach((to, name) => {
      const c = now.get(name);
      if (!c) return;
      for (let i = 0; i < 3; i++) {
        const d = to[i] - c[i];
        if (Math.abs(d) < 0.5) c[i] = to[i];
        else { c[i] += d * k; moving = true; }
      }
      const value = toHex(c);
      if (written.get(name) !== value) {
        el.style.setProperty(name, value);
        written.set(name, value);
      }
    });
    raf = moving ? requestAnimationFrame(step) : 0;
    if (!moving) { last = 0; settle(); }
  };
  return {
    /** Glide towards `values`; `seconds` is roughly how long most of the change takes. */
    to(values: Record<string, string>, seconds = 0.35) {
      smooth = Math.max(0.02, seconds / 3);
      if (!now.size) gsap.killTweensOf(el); // a colour still gliding back from another scene: take over from where it is
      const fresh: string[] = [];
      for (const [name, value] of Object.entries(values)) {
        const c = reduced() ? null : parseColor(value);
        if (!c) {
          if (written.get(name) !== value) { el.style.setProperty(name, value); written.set(name, value); }
          target.delete(name);
          continue;
        }
        target.set(name, c);
        if (!now.has(name)) fresh.push(name);
      }
      if (fresh.length) {
        const computed = lazyComputed(el);
        const read = (name: string) => parseColor(el.style.getPropertyValue(name).trim() || computed().getPropertyValue(name).trim());
        fresh.forEach((name) => {
          // A property with no colour yet (the navbar before any pick) starts from
          // what is on screen in its place, so it glides in instead of jumping.
          const start = read(name) ?? (STAND_IN[name] ? read(STAND_IN[name]) : null);
          now.set(name, start ?? ([...target.get(name)!] as Rgb));
        });
      }
      if (!raf) {
        // Long scroll scenes keep renewing this, so give it a generous safety window.
        endGlide ??= beginGlide(30);
        raf = requestAnimationFrame(step);
      }
    },
    /** Stop following (the scene hands the colours back). */
    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      settle();
      now.clear();
      target.clear();
      written.clear();
    },
  };
}

/** Animate CSS custom properties on `el` to `values`. Non-colour values are set at once. */
export function tweenTheme(
  el: HTMLElement,
  values: Record<string, string>,
  { duration = 0.7, ease = "power2.out", onComplete }: { duration?: number; ease?: string; onComplete?: () => void } = {},
) {
  const from: Record<string, string> = {};
  const to: Record<string, string> = {};
  // Read every start value before writing any: a read after a write forces the
  // browser to restyle the whole page once per colour.
  const computed = lazyComputed(el);
  const starts = Object.keys(values).map((name) => el.style.getPropertyValue(name).trim() || computed().getPropertyValue(name).trim());
  Object.entries(values).forEach(([name, value], i) => {
    const start = starts[i];
    if (duration > 0 && !reduced() && isColor(value) && isColor(start)) {
      from[name] = start;
      to[name] = value;
    } else {
      el.style.setProperty(name, value);
    }
  });
  const names = Object.keys(to);
  if (!names.length) {
    onComplete?.();
    return null;
  }
  // Pin the start values inline so GSAP interpolates from what is on screen now.
  for (const name of names) el.style.setProperty(name, from[name]);
  const endGlide = beginGlide(duration);
  return gsap.to(el, {
    ...to, duration, ease, overwrite: "auto",
    // Transitions come back before anything the caller does at the end (like
    // dropping the navbar colour), so that last step still eases in CSS.
    onComplete: () => { endGlide(); onComplete?.(); },
  });
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
    if (value) targets[name] = value;
    else clear.push(name);
  });
  if (clear.length) {
    // Read the stylesheet values by briefly lifting the inline ones — all at
    // once, so the page restyles once instead of once per colour.
    const inline = clear.map((name) => el.style.getPropertyValue(name));
    clear.forEach((name) => el.style.removeProperty(name));
    const style = getComputedStyle(el);
    const fallbacks = clear.map((name) => style.getPropertyValue(name).trim());
    clear.forEach((name, i) => { if (inline[i]) el.style.setProperty(name, inline[i]); });
    clear.forEach((name, i) => { if (fallbacks[i]) targets[name] = fallbacks[i]; });
  }
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

/** Set colours at once (stopping any glide still running on `el`). */
export function setThemeNow(el: HTMLElement, values: Record<string, string>) {
  gsap.killTweensOf(el);
  for (const [name, value] of Object.entries(values)) el.style.setProperty(name, value);
}

type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } };

/**
 * Change the colours as one smooth cross-fade done by the graphics card: the
 * browser keeps a picture of the page as it was, applies the new colours in a
 * single step, and fades between the two. Gliding the colours instead means
 * restyling every element on every frame — on the home page (the biggest page,
 * with the 3D scenes, Rose and the tinted hero) that was what made a pick lag.
 * Returns false where the browser has no view transitions (then the caller glides).
 */
export function crossfadeTheme(update: () => void): boolean {
  const doc = document as ViewTransitionDocument;
  if (typeof doc.startViewTransition !== "function" || reduced()) return false;
  const root = document.documentElement;
  root.dataset.themeCrossfade = "";
  try {
    const transition = doc.startViewTransition(update);
    transition.finished.finally(() => delete root.dataset.themeCrossfade);
  } catch {
    delete root.dataset.themeCrossfade;
    update();
  }
  return true;
}
