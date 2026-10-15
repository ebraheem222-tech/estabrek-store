import { gsap } from "gsap";
import { sceneFrameGap } from "./motionBudget";

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

export type FollowerOptions = {
  /**
   * The parts of the page that take the colours (a scene's own section and the
   * header). While the colours move, only these get them: a colour written on
   * the page shell is inherited by every element, so the browser restyled the
   * whole page (about 2,000 elements) on every frame of a hand-over — measured
   * at 10–20× the normal style work, right while the 3D model turns. With an
   * empty list the colours go on the shell.
   */
  local?: () => Array<HTMLElement | null | undefined>;
};

export function themeFollower(el: HTMLElement, opts: FollowerOptions = {}) {
  const now = new Map<string, Rgb>();
  const target = new Map<string, Rgb>();
  /** What the shell has (or will get at the next flush, for values that aren't colours). */
  const written = new Map<string, string>();
  /** Values on screen in the local parts, not yet on the shell. */
  const behind = new Map<string, string>();
  const localWritten = new Map<HTMLElement, Map<string, string>>();
  let raf = 0;
  let last = 0;
  let smooth = 0.12;
  let endGlide: (() => void) | null = null;
  let glideFrom = 0;
  /** Set while the local parts glide back to the page's own colours before letting go. */
  let releasing: (() => void) | null = null;
  const settle = () => { endGlide?.(); endGlide = null; };
  const locals = () => (opts.local?.() ?? []).filter((x): x is HTMLElement => Boolean(x) && x !== el);
  /** One value: on the local parts while moving (shell later), or straight on the shell. */
  const put = (name: string, value: string, parts: HTMLElement[]) => {
    if (!parts.length) {
      // The whole page is in view again: it takes over from the local parts.
      if (localWritten.size) { flush(); dropLocal(); }
      if (written.get(name) !== value) { el.style.setProperty(name, value); written.set(name, value); }
      return;
    }
    for (const part of parts) {
      let mine = localWritten.get(part);
      if (!mine) localWritten.set(part, (mine = new Map()));
      if (mine.get(name) !== value) { part.style.setProperty(name, value); mine.set(name, value); }
    }
    if (written.get(name) !== value) behind.set(name, value);
    else behind.delete(name);
  };
  /** The shell catches up with what is on screen (one restyle of the page). */
  const flush = () => {
    behind.forEach((value, name) => {
      if (written.get(name) !== value) { el.style.setProperty(name, value); written.set(name, value); }
    });
    behind.clear();
  };
  /** The local parts inherit from the shell again. */
  const dropLocal = () => {
    localWritten.forEach((names, part) => names.forEach((_, name) => part.style.removeProperty(name)));
    localWritten.clear();
  };
  /** The local parts reached the page's own colours: let go of them (the shell was never touched). */
  const letGo = () => {
    const done = releasing;
    releasing = null;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    dropLocal();
    behind.clear();
    now.clear();
    target.clear();
    written.clear();
    settle();
    done?.();
  };
  const step = (t: number) => {
    const parts = locals();
    // At most 60 writes a second (30 in the light mode), also on 120 Hz screens. While a
    // scene is on stage each write restyles the whole scene (Rose's outfit follows the
    // colour), so 30 a second there: a colour this slow looks the same, the scroll keeps 60.
    if (last && t - last < (parts.length ? Math.max(sceneFrameGap(), 1000 / 30 - 2) : sceneFrameGap())) { raf = requestAnimationFrame(step); return; }
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
      put(name, toHex(c), parts);
    });
    raf = moving ? requestAnimationFrame(step) : 0;
    if (moving) return;
    last = 0;
    if (releasing) return letGo();
    // While a scene holds the colours the shell and the glide flag wait for it to leave:
    // catching up at every pause in the scroll restyled the whole page each time.
    if (!parts.length) { flush(); settle(); }
  };
  return {
    /** Glide towards `values`; `seconds` is roughly how long most of the change takes. */
    to(values: Record<string, string>, seconds = 0.35) {
      smooth = Math.max(0.02, seconds / 3);
      releasing = null; // taken again while handing back: carry on from where the colours are
      const fresh: string[] = [];
      const parts = locals();
      for (const [name, value] of Object.entries(values)) {
        const c = reduced() ? null : parseColor(value);
        if (!c) {
          put(name, value, parts);
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
        const t = performance.now();
        if (endGlide && t - glideFrom > 25000) settle();
        if (!endGlide) { endGlide = beginGlide(30); glideFrom = t; }
        raf = requestAnimationFrame(step);
      }
    },
    /** The scene left the stage: the page catches up with the colours shown in its parts. */
    unpin() {
      if (localWritten.size) { flush(); dropLocal(); }
      if (!raf) settle();
    },
    /**
     * Hand the colours back without touching the page shell: the local parts glide
     * to what the shell shows (the page's own colours, or one picked meanwhile),
     * then let go and inherit it again. Writing the scene's colours on the shell
     * and gliding the shell back restyled the whole page on every frame of the
     * hand-back, right while the scene's 3D was still on screen.
     */
    release(seconds = 0.8, done?: () => void) {
      releasing = done ?? (() => {});
      if (!localWritten.size || seconds <= 0 || reduced()) return letGo();
      const computed = getComputedStyle(el);
      const read = (name: string) => parseColor(el.style.getPropertyValue(name).trim() || computed.getPropertyValue(name).trim());
      target.forEach((_, name) => {
        // A property the page has no colour for (the navbar before any pick) goes back to
        // what shows in its place, so nothing jumps when the parts let go.
        const home = read(name) ?? (STAND_IN[name] ? read(STAND_IN[name]) : null);
        if (home) target.set(name, home);
        else target.delete(name);
      });
      smooth = Math.max(0.02, seconds / 3);
      if (!raf) raf = requestAnimationFrame(step);
    },
    /** Stop following (the scene hands the colours back). */
    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      // The shell takes what is on screen before the local parts let go, so nothing jumps;
      // the colours then glide back from there.
      flush();
      dropLocal();
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
    // Already showing this colour (a scene that only coloured its own section hands
    // back a page that never changed): no write, so no restyle of the whole page.
    if (el.style.getPropertyValue(name).trim() === value.trim()) return;
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
    // Nothing inline to take away: the stylesheet colour is already showing.
    else if (el.style.getPropertyValue(name)) clear.push(name);
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
