/**
 * Work that can wait until the shopper is not scrolling: building a 3D scene
 * ahead of time, putting back a flag that restyles the page. Done in the
 * middle of a scroll it showed as a stutter; done while she reads, nobody sees it.
 */
let lastScrollAt = 0;
let watching = false;

function watch() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  window.addEventListener("scroll", () => { lastScrollAt = performance.now(); }, { passive: true, capture: true });
}

/** True while the page scrolled within the last `ms`. */
export function pageScrolling(ms = 180) {
  watch();
  return performance.now() - lastScrollAt < ms;
}

/**
 * Runs `fn` once the page has not scrolled for `quiet` ms (and no sooner than
 * `after` ms from now), when the browser is idle (`idle: false`: at once then, for
 * what the shopper should see as she stops, like Razan greeting a new world; a busy
 * page's idle moment can come a second later). Returns a cancel function.
 */
export function onPageRest(fn: () => void, { quiet = 400, after = 0, idle: whenIdle = true }: { quiet?: number; after?: number; idle?: boolean } = {}) {
  if (typeof window === "undefined") return () => {};
  watch();
  let timer = 0;
  let idle = 0;
  let done = false;
  const notBefore = performance.now() + after;
  const check = () => {
    if (done) return;
    const now = performance.now();
    const wait = Math.max(quiet - (now - lastScrollAt), notBefore - now);
    if (wait > 0) {
      timer = window.setTimeout(check, wait + 20);
      return;
    }
    const run = () => { if (!done && !pageScrolling(quiet)) { done = true; fn(); } else if (!done) check(); };
    if (whenIdle && "requestIdleCallback" in window) idle = window.requestIdleCallback(run, { timeout: 1000 });
    else run();
  };
  check();
  return () => {
    done = true;
    window.clearTimeout(timer);
    if (idle && "cancelIdleCallback" in window) window.cancelIdleCallback(idle);
  };
}

/**
 * html[data-scrolling] while the wheel turns (and a moment after, as the page glides). The cards set the pointer
 * aside then (cinematic.css): with the pointer resting over a grid, every card the scroll carried under it played
 * its hover in and out (the arch drawn, the second photo, the lift), and the graphics card repainted cards on every
 * frame of the scroll (about 150 a second on the shop; 3% of a laptop's graphics with the pointer elsewhere, over
 * 20% over the cards). The wheel only: a scroll made by the page or a link (a card brought into view to be
 * clicked), the keys or a finger leave the cards as they are.
 *
 * Only a wheel that scrolls the page itself (2026-11-12): the layer over the page takes the next turns of the
 * wheel, so a slider swiped sideways (a trackpad), or a drawer, a list or the chat scrolled under the pointer,
 * stopped after the first turn and the page behind scrolled instead.
 */
let flagWatching = false;
export function watchScrollingFlag() {
  if (flagWatching || typeof window === "undefined") return;
  flagWatching = true;
  const root = document.documentElement;
  let timer = 0;
  window.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || scrollsInside(e.target)) {
      // Lifted at once if it was up: the next turns then reach what is under the pointer.
      if ("scrolling" in root.dataset) { window.clearTimeout(timer); delete root.dataset.scrolling; }
      return;
    }
    if (!("scrolling" in root.dataset)) root.dataset.scrolling = "";
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { delete root.dataset.scrolling; }, 300);
  }, { passive: true, capture: true });
}

/**
 * Whether a wheel over `target` scrolls something inside the page (a box of its own that scrolls up and down)
 * rather than the page. Asked only while the layer is down: once it is up, the wheel's target is the page.
 */
function scrollsInside(target: EventTarget | null) {
  const top = document.documentElement, body = document.body;
  for (let el = target instanceof Element ? target : null; el && el !== top && el !== body; el = el.parentElement) {
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    const y = getComputedStyle(el).overflowY;
    if (y === "auto" || y === "scroll" || y === "overlay") return true;
  }
  return false;
}
