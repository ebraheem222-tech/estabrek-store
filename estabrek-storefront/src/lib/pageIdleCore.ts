/**
 * The page at rest: nobody has touched, scrolled or typed for a few seconds (or the tab is hidden). Then what
 * only moves for show stops drawing: the endless CSS animations (seals turning, waves, shimmers, breathing
 * pictures) pause where they are, Razan stands still, the 3D ring stops turning, and the 3D scenes keep their
 * last frame. Any touch, scroll or key wakes it all at once, from where it stopped. A page nobody touched kept
 * the processor about half busy (the category page: 57 endless animations and four loops drawing 60 times a
 * second), and phones heat up and drain on it.
 *
 * html[data-idle] marks the state for CSS; onPageIdle()/usePageIdle() for code.
 *
 * No React here: the admin draws the same scenes (pageTree/sceneCanvas.ts) and imports this file by its path.
 * The hook is in pageIdle.ts.
 */
const IDLE_MS = 4000;
let idle = false;
let started = false;
let timer = 0;
const listeners = new Set<(idle: boolean) => void>();
/** Endless animations this paused (and only those are played again). */
let paused: Animation[] = [];

function pauseEndless(on: boolean) {
  if (on) {
    paused = [];
    for (const a of document.getAnimations()) {
      // Scroll-driven ones follow the scroll and cost nothing at rest; one-off ones finish on their own.
      if (a.timeline && !(a.timeline instanceof DocumentTimeline)) continue;
      if (a.playState !== "running" || a.effect?.getComputedTiming().iterations !== Infinity) continue;
      a.pause();
      paused.push(a);
    }
  } else {
    for (const a of paused) if (a.playState === "paused") a.play();
    paused = [];
  }
}

function set(next: boolean) {
  if (idle === next) return;
  idle = next;
  document.documentElement.toggleAttribute("data-idle", next);
  pauseEndless(next);
  listeners.forEach((fn) => fn(next));
}

function wake() {
  set(false);
  window.clearTimeout(timer);
  timer = window.setTimeout(() => set(true), IDLE_MS);
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const opts = { passive: true, capture: true } as const;
  for (const type of ["pointerdown", "pointermove", "wheel", "touchstart", "keydown", "scroll", "focusin"]) window.addEventListener(type, wake, opts);
  document.addEventListener("visibilitychange", () => (document.hidden ? set(true) : wake()));
  wake();
}

/** True while the page rests. */
export function isPageIdle() {
  return idle;
}

/**
 * Called with true when the page comes to rest and false when it wakes. Returns an unsubscribe. `start: false`
 * only listens (the CMS's pieces, also drawn in the studio, where the page never rests: StorefrontChrome starts it).
 */
export function onPageIdle(fn: (idle: boolean) => void, { start: starting = true }: { start?: boolean } = {}) {
  if (starting) start();
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Starts watching (once per page): StorefrontChrome. */
export function watchPageIdle() {
  start();
}
