"use client";

import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import { ANIMATION_PRESETS, createScrollAnimation, type AnimationConfig } from "./gsapPresets";
import type { AnimPreset, EasingPreset } from "@/cms/style/tokens";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function toNumber(value: string | null): number | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function toTimeSeconds(value: string | null): number | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.endsWith("ms")) {
    const n = Number(trimmed.slice(0, -2));
    return Number.isFinite(n) ? n / 1000 : undefined;
  }
  if (trimmed.endsWith("s")) {
    const n = Number(trimmed.slice(0, -1));
    return Number.isFinite(n) ? n : undefined;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function toBool(value: string | null): boolean | undefined {
  if (value == null) return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return undefined;
}

function normalizeMotionPreset(rawPreset: string): AnimPreset | "pin" | null {
  const legacyPresetMap: Record<string, string> = {
    reveal: "fade-up",
    stagger: "stagger-fade",
    parallax: "parallax-slow",
  };

  const mapped = legacyPresetMap[rawPreset] ?? rawPreset;
  if (mapped === "pin") return "pin";
  if (mapped in ANIMATION_PRESETS) return mapped as AnimPreset;

  const compact = mapped
    .trim()
    .toLowerCase()
    .replace(/^animate-cms-/, "")
    .replace(/^animate-/, "")
    .replace(/^anim-/, "")
    .replace(/_/g, "-");

  if (compact in ANIMATION_PRESETS) return compact as AnimPreset;
  return null;
}

export function useGsapMotion(rootRef: RefObject<HTMLElement>, enabled = true, refreshKey?: string | number | null) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // The cinematic homepage owns its ScrollTriggers. Its changing story text
    // must not cause the CMS mutation observer to refresh the entire page.
    if (root.querySelector(".cinematic-home")) return;
    if (!enabled) return;
    if (prefersReducedMotion()) return;

    let disposed = false;
    let ctx: { revert: () => void } | null = null;
    let observer: MutationObserver | null = null;
    let rafId: number | null = null;
    let stopMeasuring = () => {};

    (async () => {
      const gsapMod = await import("gsap");
      const stMod = await import("gsap/ScrollTrigger");
      if (disposed) return;

      const gsap = gsapMod.gsap ?? (gsapMod as any).default ?? (gsapMod as any);
      const ScrollTrigger = stMod.ScrollTrigger ?? (stMod as any).default;
      if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

      const applyAnimations = () => {
        if (disposed) return;
        ctx?.revert();
        ctx = gsap.context(() => {
          const sections = root.querySelectorAll<HTMLElement>("[data-motion]");
          sections.forEach((el) => {
            const rawPreset = el.getAttribute("data-motion");
            if (!rawPreset || rawPreset === "none") return;

            const normalized = normalizeMotionPreset(rawPreset);
            if (!normalized) return;

            if (normalized === "pin") {
              gsap.to(el, {
                scrollTrigger: {
                  trigger: el,
                  start: "top top",
                  end: "+=500",
                  pin: true,
                  pinSpacing: true,
                },
              });
              return;
            }

            const config: AnimationConfig = { preset: normalized };
            // Inside the rose storefront, CMS motion stays short and plays once.
            const roseShell = root.classList.contains("rose-native-sections");

            const duration = toTimeSeconds(el.getAttribute("data-motion-duration"));
            if (duration !== undefined) config.duration = duration;

            const delay = toTimeSeconds(el.getAttribute("data-motion-delay"));
            if (delay !== undefined) config.delay = delay;

            const easing = el.getAttribute("data-motion-easing") as EasingPreset | null;
            if (easing) config.easing = easing;

            const stagger = toNumber(el.getAttribute("data-motion-stagger"));
            if (stagger !== undefined) config.stagger = stagger;

            const staggerDir = el.getAttribute("data-motion-stagger-dir");
            if (staggerDir) config.staggerDir = staggerDir as any;

            const threshold = toNumber(el.getAttribute("data-motion-threshold"));
            if (threshold !== undefined) config.threshold = threshold;

            const once = toBool(el.getAttribute("data-motion-once"));
            if (once !== undefined) config.once = once;

            const scrub = toBool(el.getAttribute("data-motion-scrub"));
            if (scrub !== undefined) config.scrub = scrub;

            if (roseShell) {
              config.duration = Math.min(config.duration ?? 0.4, 0.45);
              config.delay = Math.min(config.delay ?? 0, 0.1);
              config.once = true;
              config.scrub = false;
              config.threshold = 0;
            }

            createScrollAnimation(el, config, gsap, ScrollTrigger);
          });
        }, root);

        // Defer layout refresh until scrolling settles; an immediate refresh
        // temporarily scrolls to zero and can cancel native smooth navigation.
        ScrollTrigger?.refresh?.(true);
        // What this did to the page itself (a held section wrapped or unwrapped) is not a change to answer.
        observer?.takeRecords();
      };

      const scheduleApply = () => {
        if (rafId != null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          rafId = null;
          applyAnimations();
        });
      };

      // The page is watched for changes, and a change is answered with a new measure (above). The measure
      // itself changes the page: GSAP takes every held (pinned) section out of its holder and puts it back.
      // Seen as a change, that asked for another measure, which made another change: a page with a held
      // section was measured about three times a second, for ever (and a word being written in the section
      // lost its focus each time). What a measure does to the page is now left out: what waits when it
      // starts is real and is answered, what it leaves behind is its own and is dropped.
      let measuredHeight = root.offsetHeight;
      const measureStarts = () => {
        if (observer?.takeRecords().length) scheduleApply();
      };
      const measureEnds = () => {
        observer?.takeRecords();
        measuredHeight = root.offsetHeight;
      };
      ScrollTrigger?.addEventListener?.("refreshInit", measureStarts);
      ScrollTrigger?.addEventListener?.("refresh", measureEnds);
      // The endless measuring also kept a held section in its place when the page grew without anything
      // added or removed (a picture loading above it, an answer opening): that part is kept, on purpose
      // now. While something is held, a page whose height is no longer the one last measured is measured
      // again. The height a measure ends at is the one remembered, so what a measure itself adds to the
      // page (a holder's room) asks for nothing and this can't go round.
      const grown = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
        if (disposed || root.offsetHeight === measuredHeight) return;
        if (ScrollTrigger?.getAll?.().some((t: { pin?: unknown }) => Boolean(t.pin))) ScrollTrigger.refresh(true);
      });
      grown?.observe(root);
      stopMeasuring = () => {
        ScrollTrigger?.removeEventListener?.("refreshInit", measureStarts);
        ScrollTrigger?.removeEventListener?.("refresh", measureEnds);
        grown?.disconnect();
      };

      applyAnimations();
      observer = new MutationObserver(() => scheduleApply());
      observer.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [
          "data-motion",
          "data-motion-duration",
          "data-motion-delay",
          "data-motion-easing",
          "data-motion-stagger",
          "data-motion-stagger-dir",
          "data-motion-threshold",
          "data-motion-once",
          "data-motion-scrub",
        ],
      });
    })();

    return () => {
      disposed = true;
      observer?.disconnect();
      observer = null;
      stopMeasuring();
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = null;
      try {
        ctx?.revert();
      } catch {
        // ignore
      }
    };
  }, [rootRef, enabled, refreshKey]);
}
