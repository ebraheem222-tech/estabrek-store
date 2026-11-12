/**
 * Marks an element data-near while it is on the screen or close to it (`margin`), for CSS that runs endless
 * animations only there. Off screen, an endless CSS animation of anything but a transform or opacity (map routes'
 * dashes, snow's backgrounds) was still worked out on every frame of the page, wherever the shopper was: the map's
 * routes alone, on every frame of a phone's scroll through the whole home. The CSS takes the animation away
 * (animation: none) rather than pausing it: the page's rest (lib/pageIdleCore.ts) pauses and plays endless
 * animations through their API, after which their CSS play state no longer counts.
 */
export function watchNear(el: Element, margin = "200px 0px"): () => void {
  if (typeof IntersectionObserver === "undefined") {
    el.setAttribute("data-near", "");
    return () => {};
  }
  const io = new IntersectionObserver(([entry]) => el.toggleAttribute("data-near", entry.isIntersecting), { rootMargin: margin });
  io.observe(el);
  return () => io.disconnect();
}
