"use client";
import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { useRoseTheme } from "./RoseThemeProvider";
import { isRosePalette, mixHex, openingPalette, rosePalettes } from "./roseDesign";

export function ScrollPalette({ root }: { root: RefObject<HTMLDivElement> }) {
  const theme = useRoseTheme();
  const settings = useStorefrontSettings();
  const apply = theme?.apply, reset = theme?.reset;
  useEffect(() => {
    const frame = root.current;
    if (!frame || !apply || !reset) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const scenes = Array.from(frame.querySelectorAll<HTMLElement>("[data-rose-palette]")).filter(el => isRosePalette(el.dataset.rosePalette));
      if (!settings.scrollAnimationsEnabled || !scenes.length) return;
      const opening = frame.querySelector<HTMLElement>(".rose-opening");
      const update = () => {
        if (opening?.dataset.motion === "true" && !opening.closest("[data-rose-explicit]")) {
          const box = opening.getBoundingClientRect();
          const sticky = opening.querySelector<HTMLElement>(".rose-opening-sticky")!;
          const top = parseFloat(getComputedStyle(sticky).top) || 0;
          if (box.top <= top + 1 && box.bottom >= innerHeight - 1) {
            apply(openingPalette(Math.max(0, Math.min(1, (top - box.top) / (box.height - innerHeight + top)))));
            return;
          }
        }
        let current = scenes[0], previous = scenes[0];
        const line = innerHeight * .65;
        for (const scene of scenes) {
          if (scene.getBoundingClientRect().top <= line) { previous = current; current = scene; }
        }
        const mix = Math.max(0, Math.min(1, (line - current.getBoundingClientRect().top) / (innerHeight * .5)));
        apply(mixHex(rosePalettes[previous.dataset.rosePalette as keyof typeof rosePalettes], rosePalettes[current.dataset.rosePalette as keyof typeof rosePalettes], mix));
      };
      const trigger = ScrollTrigger.create({ trigger: frame, start: 0, end: "bottom bottom", onUpdate: update, onRefresh: update });
      update();
      let disposed = false;
      document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(true); });
      return () => { disposed = true; trigger.kill(); reset(); };
    });
    return () => { media.revert(); reset(); };
  }, [root, settings.scrollAnimationsEnabled, apply, reset]);
  return null;
}
