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
        gsap.from(".hero-eyebrow, .hero-description, .hero-actions", {
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
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) =>
          gsap.from(element, {
            y: 24,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            clearProps: "all",
            scrollTrigger: { trigger: element, start: "top 94%", once: true },
          }),
        );
      }, root);
      return () => context.revert();
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
