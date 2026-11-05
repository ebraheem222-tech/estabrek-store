import { test, expect } from "@playwright/test";
import { gsap } from "gsap";
import { createAnimeMotionEngine } from "../src/pageTree/animeMotion";

test("Anime entry tweens interpolate actual values in seconds and restore them on disposal", () => {
  const adapter = createAnimeMotionEngine(gsap);
  const value = { n: 4 };
  const tween = adapter.engine.fromTo(value, { n: 0 }, { n: 20, duration: 2, ease: "none", paused: true });
  tween.progress(0.25);
  expect(value.n).toBe(5);
  tween.progress(1);
  expect(value.n).toBe(20);
  adapter.dispose();
  expect(value.n).toBe(4);
});

test("Anime loops reverse and repeat without losing the pre-animation value", () => {
  const adapter = createAnimeMotionEngine(gsap);
  const value = { n: 3 };
  const tween = adapter.engine.fromTo(value, { n: 0 }, { n: 10, duration: 1, repeat: -1, yoyo: true, ease: "none", paused: true });
  tween.totalTime(1.5);
  expect(value.n).toBeCloseTo(5);
  tween.totalTime(2);
  expect(value.n).toBe(0);
  adapter.dispose();
  expect(value.n).toBe(3);
});

test("Anime hover keyframes end at rest and interrupted players cannot write after disposal", () => {
  const adapter = createAnimeMotionEngine(gsap);
  const value = { n: 2 };
  const tween = adapter.engine.to(value, { keyframes: [{ n: 10 }, { n: 0 }], duration: 1, ease: "none", paused: true });
  tween.progress(0.5);
  expect(value.n).toBe(10);
  tween.progress(1);
  expect(value.n).toBe(0);
  adapter.dispose();
  expect(value.n).toBe(2);
  tween.progress(0.5);
  expect(value.n).toBe(2);
});

test("Anime text timelines keep stagger and repeat delay", () => {
  const adapter = createAnimeMotionEngine(gsap);
  const words = [{ opacity: 1 }, { opacity: 1 }, { opacity: 1 }];
  const tween = adapter.engine.timeline({ paused: true, repeat: -1, yoyo: true, repeatDelay: 0.5 })
    .fromTo(words, { opacity: 0 }, { opacity: 1, duration: 0.01, stagger: 0.2, ease: "none" });
  tween.totalTime(0.25);
  expect(words.map(word => word.opacity)).toEqual([1, 1, 0]);
  tween.totalTime(0.6);
  expect(words.map(word => word.opacity)).toEqual([1, 1, 1]);
  adapter.dispose();
  expect(words.map(word => word.opacity)).toEqual([1, 1, 1]);
});

test("scroll geometry seeks Anime values in both directions and loses ownership on disposal", () => {
  // Geometry belongs to ScrollTrigger in the browser; keep its GSAP progress tween
  // real here and drive that progress without a document or a running web server.
  let geometry: gsap.core.Animation;
  const scrollTrigger = { create: (vars: any) => { geometry = vars.animation; return { kill() {} }; } };
  const adapter = createAnimeMotionEngine(gsap, scrollTrigger as any);
  const value = { n: 12 };
  adapter.engine.fromTo(value, { n: 0 }, { n: 100, ease: "none", scrollTrigger: { scrub: 0.6 } });
  geometry!.progress(0.6);
  expect(value.n).toBe(60);
  geometry!.progress(0.1);
  expect(value.n).toBe(10);
  adapter.dispose();
  expect(value.n).toBe(12);
  geometry!.progress(0.9);
  expect(value.n).toBe(12);
});
