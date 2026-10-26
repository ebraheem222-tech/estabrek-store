import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * The pinned scenes on the home page (opening, video, seasons, collection
 * worlds) each asked GSAP to re-measure the page after mounting, on `load`
 * and again a moment later. Each re-measure reads the layout of every scroll
 * trigger; several back to back showed up as a stutter, and one landing
 * mid-scroll could nudge a pinned scene. Requests made close together now
 * share a single re-measure on the next frame.
 *
 * It also waits for a pause in the scroll (at most a few seconds): `load` and the
 * late re-measure used to land right in the shopper's first scroll through the
 * opening film, the busiest moment of the page.
 */
let frame = 0;
let waiting = 0;
let firstAsked = 0;
let lastScroll = 0;
let listening = false;
const QUIET_MS = 220;
const MAX_WAIT_MS = 2500;

export function requestScrollRefresh() {
  if (typeof window === "undefined" || frame || waiting) return;
  if (!listening) {
    listening = true;
    window.addEventListener("scroll", () => { lastScroll = performance.now(); }, { passive: true, capture: true });
  }
  const now = performance.now();
  if (!firstAsked) firstAsked = now;
  if (now - lastScroll < QUIET_MS && now - firstAsked < MAX_WAIT_MS) {
    waiting = window.setTimeout(() => { waiting = 0; requestScrollRefresh(); }, QUIET_MS);
    return;
  }
  firstAsked = 0;
  frame = requestAnimationFrame(() => {
    frame = 0;
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });
}
