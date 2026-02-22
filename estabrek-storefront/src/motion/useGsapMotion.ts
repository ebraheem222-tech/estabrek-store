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
    if (!enabled) return;
    if (prefersReducedMotion()) return;

    let disposed = false;
    let ctx: { revert: () => void } | null = null;
    let observer: MutationObserver | null = null;
    let rafId: number | null = null;

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

            createScrollAnimation(el, config, gsap, ScrollTrigger);
          });
        }, root);

        ScrollTrigger?.refresh?.();
      };

      const scheduleApply = () => {
        if (rafId != null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          rafId = null;
          applyAnimations();
        });
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
