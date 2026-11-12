"use client";
/**
 * Elements' own speed settings at work in the page (pageTree/perf.ts), loaded only on a page that has them:
 *  - a weak device (little memory, few cores, data saving asked) is marked html[data-weak] once;
 *  - elements to be light on phones (on a phone) or only full on strong devices (on a weak one) are marked
 *    data-perf-light-now, as are those light by their own setting; their clips stop playing by themselves, and the
 *    3D and canvases inside read the mark (the "pt:perf" event tells them it changed);
 *  - elements with endless motion rest while off screen: data-perf-away takes their CSS motion away (css.ts) and
 *    pauses their clips; back on screen they move again.
 * Again whenever the page's elements change (a new page, or the editor's preview updating in place).
 */
import { useEffect } from "react";

const WATCH = "[data-perf-watch]";
const LIGHT_WHEN = "[data-perf-tier=light],[data-perf-phone=light],[data-perf-strong]";

export function weakDevice(): boolean {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return (n.deviceMemory !== undefined && n.deviceMemory < 4) || (n.hardwareConcurrency !== undefined && n.hardwareConcurrency < 4) || n.connection?.saveData === true;
}

export function TreePerf({ revision }: { revision: number }) {
  useEffect(() => {
    const weak = weakDevice();
    document.documentElement.toggleAttribute("data-weak", weak);
    const phone = matchMedia("(max-width: 767.98px)");
    const mark = () => {
      for (const el of document.querySelectorAll<HTMLElement>(LIGHT_WHEN)) {
        const light = el.dataset.perfTier === "light" || (el.dataset.perfPhone === "light" && phone.matches) || (el.hasAttribute("data-perf-strong") && weak);
        el.toggleAttribute("data-perf-light-now", light);
        if (light) for (const v of el.querySelectorAll("video")) if (v.autoplay) { v.autoplay = false; v.pause(); v.controls = true; }
      }
      // Marks left on elements that no longer ask for them.
      for (const el of document.querySelectorAll("[data-perf-light-now]")) if (!el.matches(LIGHT_WHEN)) el.removeAttribute("data-perf-light-now");
      window.dispatchEvent(new Event("pt:perf"));
    };
    // Off screen: its endless motion rests.
    const io = typeof IntersectionObserver === "function"
      ? new IntersectionObserver((entries) => {
          for (const e of entries) {
            const el = e.target as HTMLElement;
            const away = !e.isIntersecting;
            if (away === el.hasAttribute("data-perf-away")) continue;
            el.toggleAttribute("data-perf-away", away);
            for (const v of el.querySelectorAll("video")) {
              if (away && !v.paused) { v.dataset.perfPlaying = ""; v.pause(); }
              else if (!away && v.dataset.perfPlaying !== undefined) { delete v.dataset.perfPlaying; void v.play().catch(() => undefined); }
            }
          }
        }, { rootMargin: "120px 0px" })
      : null;
    const apply = () => {
      mark();
      io?.disconnect();
      for (const el of document.querySelectorAll(WATCH)) io?.observe(el);
    };
    apply();
    phone.addEventListener("change", mark);
    window.addEventListener("studio-view-updated", apply);
    return () => {
      phone.removeEventListener("change", mark);
      window.removeEventListener("studio-view-updated", apply);
      io?.disconnect();
    };
  }, [revision]);
  return null;
}
