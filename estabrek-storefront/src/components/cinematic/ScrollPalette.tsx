"use client";
import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { useRoseTheme } from "./RoseThemeProvider";
import { isRosePalette, mixHex, openingPalette, rosePalettes } from "./roseDesign";

/** Steps a blend between two palettes is shown in (a tenth of the way each: the eye sees no steps in it). */
const STEPS = 10;

/**
 * The inner pages' colour follows the scroll: each part of the page ([data-rose-palette]) has its palette, and the
 * page glides from one to the next as the next one comes up. The palette is written on the page's shell, so every
 * write restyles the whole page: it used to be written on every frame of a scroll (with every part's place read
 * from the page, and the header's colour transitions restarting each time), and the page was repainted, header
 * and all, on each frame. Now a new colour is written only when the blend has moved a step on, the parts' places
 * are measured when the page is laid out, and colour transitions wait while the palette moves (data-palette-moving,
 * cinematic.css).
 */
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
      const shell = frame.closest<HTMLElement>(".cinematic-shell");
      const opening = frame.querySelector<HTMLElement>(".rose-opening");
      // Where each part starts on the page, and the opening's scroll span: read when the page is laid out.
      let tops: number[] = [];
      let open: { top: number; height: number; stick: number } | null = null;
      const measure = () => {
        tops = scenes.map(scene => scene.getBoundingClientRect().top + scrollY);
        if (opening?.dataset.motion === "true" && !opening.closest("[data-rose-explicit]")) {
          const box = opening.getBoundingClientRect();
          const sticky = opening.querySelector<HTMLElement>(".rose-opening-sticky");
          open = { top: box.top + scrollY, height: box.height, stick: sticky ? parseFloat(getComputedStyle(sticky).top) || 0 : 0 };
        } else open = null;
      };
      let shown = "";
      let quiet = 0;
      const wear = (colour: string) => {
        if (colour === shown) return;
        shown = colour;
        // Colour transitions wait while the palette moves (each write restarted them on the header).
        if (shell && !("paletteMoving" in shell.dataset)) shell.dataset.paletteMoving = "";
        window.clearTimeout(quiet);
        quiet = window.setTimeout(() => { if (shell) delete shell.dataset.paletteMoving; }, 400);
        apply(colour);
      };
      const update = () => {
        if (!tops.length) measure();
        const y = scrollY;
        if (open) {
          const top = open.top - y;
          if (top <= open.stick + 1 && top + open.height >= innerHeight - 1) {
            const p = Math.max(0, Math.min(1, (open.stick - top) / (open.height - innerHeight + open.stick)));
            wear(openingPalette(Math.round(p * STEPS * 2) / (STEPS * 2)));
            return;
          }
        }
        const line = innerHeight * .65;
        let current = 0, previous = 0;
        tops.forEach((t, i) => { if (t - y <= line) { previous = current; current = i; } });
        const mix = Math.max(0, Math.min(1, (line - (tops[current] - y)) / (innerHeight * .5)));
        const step = Math.round(mix * STEPS) / STEPS;
        const from = rosePalettes[scenes[previous].dataset.rosePalette as keyof typeof rosePalettes];
        const to = rosePalettes[scenes[current].dataset.rosePalette as keyof typeof rosePalettes];
        wear(mixHex(from, to, step));
      };
      const trigger = ScrollTrigger.create({ trigger: frame, start: 0, end: "bottom bottom", onUpdate: update, onRefresh: () => { measure(); update(); } });
      measure();
      update();
      let disposed = false;
      document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(true); });
      return () => {
        disposed = true;
        trigger.kill();
        window.clearTimeout(quiet);
        if (shell) delete shell.dataset.paletteMoving;
        reset();
      };
    });
    return () => { media.revert(); reset(); };
  }, [root, settings.scrollAnimationsEnabled, apply, reset]);
  return null;
}
