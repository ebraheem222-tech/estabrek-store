"use client";
import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Language } from "./Language";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
export function ScrollExperience({
  root,
  language,
}: {
  root: RefObject<HTMLDivElement>;
  language: Language;
}) {
  const settings = useStorefrontSettings();
  useEffect(() => {
    if (!root.current || !settings.scrollAnimationsEnabled) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.from(".hero-eyebrow, .hero-description", {
          y: 24,
          opacity: 0,
          duration: 1,
          stagger: 0.12,
          ease: "power3.out",
          clearProps: "all",
        });
        gsap.fromTo(
          ".hero-campaign-image",
          { scale: 1.06 },
          { scale: 1, duration: 1.6, ease: "power2.out" },
        );
        // Short reveals that begin before the element enters the viewport, so a
        // fast scroll never lands on a blank, still-hidden section.
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) =>
          gsap.from(element, {
            y: element.closest('[data-rose-intensity="subtle"]') ? 6 : 14,
            opacity: 0,
            duration: 0.4,
            ease: "power2.out",
            clearProps: "all",
            scrollTrigger: { trigger: element, start: "top bottom+=160", once: true },
          }),
        );
      }, root);
      // Pinned scenes (opening, fabric study, seasons) add spacing after mount;
      // re-measure so reveals fire at the right place on a fast scroll.
      const refresh = () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); };
      window.addEventListener("load", refresh);
      const late = window.setTimeout(refresh, 1200);
      return () => {
        window.removeEventListener("load", refresh);
        window.clearTimeout(late);
        context.revert();
      };
    });
    return () => media.revert();
  }, [
    root,
    language,
    settings.scrollAnimationsEnabled,
    settings.parallaxEffectsEnabled,
  ]);
  return null;
}
