import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * The pinned scenes on the home page (opening, video, seasons, collection
 * worlds) each asked GSAP to re-measure the page after mounting, on `load`
 * and again a moment later. Each re-measure reads the layout of every scroll
 * trigger; several back to back showed up as a stutter, and one landing
 * mid-scroll could nudge a pinned scene. Requests made close together now
 * share a single re-measure on the next frame.
 */
let frame = 0;
export function requestScrollRefresh() {
  if (typeof window === "undefined" || frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });
}
