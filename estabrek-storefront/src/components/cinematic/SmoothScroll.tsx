"use client";
import { useEffect } from "react";

/*
 * Smooth scrolling for the store (like the 3D sites): the page glides after the wheel instead of jumping, so
 * the scroll scenes, the films that follow the scroll and the pictures that drift all move steadily (Lenis,
 * kept in step with GSAP's scroll scenes). Only with a mouse or a trackpad: a phone keeps its own native
 * scrolling, and so do shoppers who ask for less motion. Panels that scroll inside (the bag, a product's
 * sheet) keep their own scrolling, and it pauses while a panel holds the page still (useBodyScrollLock).
 * Automated browsers (navigator.webdriver: the tests) keep plain scrolling, so a scroll lands exactly.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (navigator.webdriver) return;
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Another smoother already runs (a CMS page's own, pageTree/TreeMedia).
    if (document.documentElement.classList.contains("lenis")) return;
    let stop = () => {};
    let cancelled = false;
    void Promise.all([import("lenis"), import("gsap"), import("gsap/ScrollTrigger")]).then(([{ default: Lenis }, { gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, anchors: true, allowNestedScroll: true, autoRaf: false });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      // Still while a panel holds the page (the bag, a sheet, the menu): useBodyScrollLock hides the overflow.
      const sync = () => {
        const held = document.body.style.overflow === "hidden" || document.documentElement.style.overflow === "hidden";
        if (held) lenis.stop();
        else lenis.start();
      };
      const watch = new MutationObserver(sync);
      watch.observe(document.body, { attributes: true, attributeFilter: ["style"] });
      watch.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
      sync();
      stop = () => {
        watch.disconnect();
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, []);
  return null;
}
