import type { MotionStyle } from "../types";

/** How a heading comes in: by lines behind a mask, by words, or by letters (never letters in Arabic: they join). */
export type HeadlineIn = "lines-mask" | "words-rise" | "chars-glitch" | "words-blur" | "words-pop";
export type BlockIn = "rise" | "fade" | "skew" | "pop";
export type ImageIn = "clip-up" | "scale-in" | "scan" | "bloom" | "drop";

export type MotionPreset = {
  headline: HeadlineIn;
  block: BlockIn;
  image: ImageIn;
  /** Seconds and ease for most entrances. */
  duration: number;
  ease: string;
  stagger: number;
  /** Images drift against the scroll (computers only). */
  parallax: number;
  draw: number;
  morph: number;
  float: number;
  magnetic: boolean;
  tilt: boolean;
  /** Seconds for one turn of the running strip. */
  marquee: number;
};

export const MOTION: Record<MotionStyle, MotionPreset> = {
  editorial: { headline: "lines-mask", block: "fade", image: "clip-up", duration: 1.2, ease: "expo.out", stagger: 0.12, parallax: 10, draw: 2.4, morph: 6, float: 0, magnetic: false, tilt: false, marquee: 60 },
  precise: { headline: "words-rise", block: "rise", image: "scale-in", duration: 0.7, ease: "power3.out", stagger: 0.05, parallax: 6, draw: 1.4, morph: 4, float: 6, magnetic: false, tilt: true, marquee: 32 },
  arcade: { headline: "chars-glitch", block: "skew", image: "scan", duration: 0.55, ease: "power4.out", stagger: 0.025, parallax: 8, draw: 1, morph: 2.4, float: 10, magnetic: true, tilt: true, marquee: 18 },
  soft: { headline: "words-blur", block: "fade", image: "bloom", duration: 1.3, ease: "power2.out", stagger: 0.08, parallax: 5, draw: 2, morph: 6, float: 14, magnetic: false, tilt: false, marquee: 45 },
  bouncy: { headline: "words-pop", block: "pop", image: "drop", duration: 0.9, ease: "back.out(1.7)", stagger: 0.07, parallax: 0, draw: 1.2, morph: 1.6, float: 12, magnetic: true, tilt: false, marquee: 24 },
  // Jewellery, perfume, galleries: slow, unhurried, nothing bounces.
  luxe: { headline: "lines-mask", block: "fade", image: "bloom", duration: 1.6, ease: "power4.out", stagger: 0.16, parallax: 12, draw: 3.2, morph: 8, float: 6, magnetic: false, tilt: false, marquee: 70 },
  // Sport and street: fast, leaning forward.
  sporty: { headline: "words-rise", block: "skew", image: "clip-up", duration: 0.6, ease: "power4.out", stagger: 0.04, parallax: 14, draw: 1, morph: 2, float: 4, magnetic: true, tilt: true, marquee: 16 },
};
