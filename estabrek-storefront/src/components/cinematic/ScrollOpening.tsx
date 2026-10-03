"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { useLanguage } from "./Language";

/** The unenhanced markup is an ordinary, readable campaign section. */
export function ScrollOpening({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const { scrollAnimationsEnabled } = useStorefrontSettings();
  const { language } = useLanguage();

  useEffect(() => {
    const scene = root.current;
    if (!scene || !scrollAnimationsEnabled) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      scene.dataset.motion = "true";
      const sticky = scene.querySelector<HTMLElement>(".rose-opening-sticky")!;
      const visual = scene.querySelector<HTMLElement>(".hero-visual")!;
      const photo = scene.querySelector<HTMLElement>(".hero-image-wrap")!;
      const measure = () => {
        const stage = sticky.getBoundingClientRect();
        const frame = visual.getBoundingClientRect();
        const mobile = window.innerWidth <= 760;
        // offset dimensions remain stable while the image is transformed.
        const scale =
          Math.max(
            stage.width / photo.offsetWidth,
            stage.height / photo.offsetHeight,
          ) * (mobile ? 1.02 : 1.12);
        const x =
          stage.left +
          stage.width * (mobile ? 0.5 : 0.42) -
          frame.left -
          photo.offsetLeft -
          photo.offsetWidth / 2;
        const y = stage.top - frame.top - photo.offsetTop;
        scene.style.setProperty("--opening-scale", String(scale));
        scene.style.setProperty("--opening-x", `${x}px`);
        scene.style.setProperty("--opening-y", `${y}px`);
      };
      measure();
      const context = gsap.context(() => {
        const timeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: scene,
            start: () => `top top+=${parseFloat(getComputedStyle(sticky).top)}`,
            end: "bottom bottom",
            scrub: 0.65,
            invalidateOnRefresh: true,
            onRefresh: measure,
            onUpdate: (self) => {
              scene.dataset.progress = self.progress.toFixed(3);
            },
          },
        });
        timeline.fromTo(
          scene,
          { "--opening-progress": 0 },
          { "--opening-progress": 1, duration: 0.8, ease: "power1.inOut" },
          0,
        );
        timeline.fromTo(
          ".hero-headline",
          { scale: 1.2 },
          {
            scale: 1,
            duration: 0.7,
            transformOrigin: language === "ar" ? "right center" : "left center",
          },
          0,
        );
        timeline.fromTo(
          ".hero-orbit, .hero-image-caption, .image-edge-label, .hero-brand-card",
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, duration: 0.3 },
          0.55,
        );
        timeline.to({}, { duration: 0.15 }, 0.85);
      }, scene);
      let disposed = false;
      document.fonts.ready.then(() => {
        if (!disposed) ScrollTrigger.refresh();
      });
      return () => {
        disposed = true;
        context.revert();
        scene.dataset.motion = "false";
        delete scene.dataset.progress;
        [
          "--opening-scale",
          "--opening-x",
          "--opening-y",
          "--opening-progress",
        ].forEach((name) => scene.style.removeProperty(name));
      };
    });
    return () => media.revert();
  }, [language, scrollAnimationsEnabled]);

  return (
    <div ref={root} className="rose-opening" data-motion="false">
      <div className="rose-opening-sticky">{children}</div>
    </div>
  );
}
