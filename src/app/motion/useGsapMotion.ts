"use client";

import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import { ANIMATION_PRESETS, createScrollAnimation, type AnimationConfig } from "./gsapPresets";
import type { AnimPreset, EasingPreset } from "@/cms/style/tokens";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function useGsapMotion(rootRef: RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (prefersReducedMotion()) return;

    let ctxCleanup: (() => void) | null = null;

    (async () => {
      const gsapMod = await import("gsap");
      const stMod = await import("gsap/ScrollTrigger");

      const gsap = gsapMod.gsap ?? (gsapMod as any).default ?? (gsapMod as any);
      const ScrollTrigger = stMod.ScrollTrigger ?? (stMod as any).default;
      if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        const sections = root.querySelectorAll<HTMLElement>("[data-motion]");

        const toNumber = (value: string | null): number | undefined => {
          if (value == null) return undefined;
          const n = Number(value);
          return Number.isFinite(n) ? n : undefined;
        };

        const toBool = (value: string | null): boolean | undefined => {
          if (value == null) return undefined;
          if (value === "true" || value === "1") return true;
          if (value === "false" || value === "0") return false;
          return undefined;
        };

        const legacyPresetMap: Record<string, string> = {
          reveal: "fade-up",
          stagger: "stagger-fade",
          parallax: "parallax-slow",
        };

        sections.forEach((el) => {
          const rawPreset = el.getAttribute("data-motion");
          if (!rawPreset || rawPreset === "none") return;

          if (rawPreset === "pin") {
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

          const presetKey = legacyPresetMap[rawPreset] ?? rawPreset;
          if (!(presetKey in ANIMATION_PRESETS)) return;

          const config: AnimationConfig = {
            preset: presetKey as AnimPreset,
          };

          const duration = toNumber(el.getAttribute("data-motion-duration"));
          if (duration !== undefined) config.duration = duration;

          const delay = toNumber(el.getAttribute("data-motion-delay"));
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

          createScrollAnimation(el, config, gsap, ScrollTrigger);
        });
      }, root);

      ctxCleanup = () => ctx.revert();
    })();

    return () => {
      try {
        ctxCleanup?.();
      } catch {
        // ignore
      }
    };
  }, [rootRef]);
}
