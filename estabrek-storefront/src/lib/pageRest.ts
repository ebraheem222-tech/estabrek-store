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
 * `after` ms from now), when the browser is idle. Returns a cancel function.
 */
export function onPageRest(fn: () => void, { quiet = 400, after = 0 }: { quiet?: number; after?: number } = {}) {
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
    if ("requestIdleCallback" in window) idle = window.requestIdleCallback(run, { timeout: 1000 });
    else run();
  };
  check();
  return () => {
    done = true;
    window.clearTimeout(timer);
    if (idle && "cancelIdleCallback" in window) window.cancelIdleCallback(idle);
  };
}
