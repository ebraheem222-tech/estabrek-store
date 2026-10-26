"use client";
/**
 * A store theme's motion (GSAP 3.13 with ScrollTrigger, SplitText, DrawSVG, MorphSVG),
 * loaded only when a theme is on: the rose design keeps its own. It reads marks in the page:
 *   data-th-reveal="headline|block|image"  comes in once, when it is first seen
 *   data-th-stagger                         its children come in one after another
 *   data-th-parallax                        drifts against the scroll
 *   data-th-magnetic / data-th-tilt         follows the pointer a little
 *   data-th-marquee                         the running strip (its track is written twice)
 *   data-th-count="120"                     counts up to the number
 * and the drawings' marks (svg/kits.tsx). With "reduce motion" nothing moves and
 * everything shows; on phones the pointer effects and parallax are off and loops pause
 * when out of sight. The home adds html.th-pending before the first paint so its opening
 * waits for the engine (removed here, or after 2.5 s whatever happens).
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { themeById } from "../registry";
import { MOTION, type MotionPreset } from "./presets";

type Gsap = typeof import("gsap").gsap;

/** Follows the page's theme (html data-store-theme, also when the admin previews another). */
export function ThemeMotion() {
  const pathname = usePathname();
  const [themeId, setThemeId] = useState<string | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setThemeId(root.dataset.storeTheme ?? null);
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ["data-store-theme"] });
    return () => mo.disconnect();
  }, []);
  const style = themeById(themeId)?.motion ?? null;
  useEffect(() => {
    const root = document.documentElement;
    if (!style) {
      root.classList.remove("th-pending");
      return;
    }
    let dead = false;
    let revert: (() => void) | null = null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.matchMedia("(max-width: 640px), (pointer: coarse)").matches;
    if (reduce) {
      root.classList.remove("th-pending");
      return;
    }
    void (async () => {
      const [{ gsap }, { ScrollTrigger }, { SplitText }, { DrawSVGPlugin }, { MorphSVGPlugin }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("gsap/SplitText"),
        import("gsap/DrawSVGPlugin"),
        import("gsap/MorphSVGPlugin"),
      ]);
      if (dead) return;
      gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MorphSVGPlugin);
      let unhook: () => void = () => {};
      const ctx = gsap.context(() => {
        unhook = run(gsap, ScrollTrigger, SplitText, MOTION[style], { phone, arabic: root.lang.startsWith("ar") });
      });
      root.classList.remove("th-pending");
      revert = () => {
        unhook();
        ctx.revert();
      };
    })().catch(() => root.classList.remove("th-pending"));
    return () => {
      dead = true;
      revert?.();
    };
  }, [style, pathname]);
  return null;
}

type ST = typeof import("gsap/ScrollTrigger").ScrollTrigger;
type Split = typeof import("gsap/SplitText").SplitText;

function run(gsap: Gsap, ScrollTrigger: ST, SplitText: Split, m: MotionPreset, env: { phone: boolean; arabic: boolean }): () => void {
  const vh = window.innerHeight;
  const off: Array<() => void> = [];
  const listen = (el: HTMLElement, type: string, fn: (e: PointerEvent) => void) => {
    el.addEventListener(type, fn as EventListener);
    off.push(() => el.removeEventListener(type, fn as EventListener));
  };
  const seen = (el: Element) => el.getBoundingClientRect().top < vh * 0.92;
  /** Plays now when on screen, else when scrolled to; what waits is hidden meanwhile. */
  const onSight = (el: Element, play: () => gsap.core.Animation | void, hide: Element[] = [el]) => {
    if (seen(el)) return play();
    gsap.set(hide, { autoAlpha: 0 });
    ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => { gsap.set(hide, { autoAlpha: 1 }); play(); } });
  };
  // Loops only run while their drawing is in sight.
  const loop = (el: Element, tween: gsap.core.Animation) => {
    ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onToggle: (self) => (self.isActive ? tween.play() : tween.pause()) });
  };

  /* -------------------------------------------------------------- headlines */
  gsap.utils.toArray<HTMLElement>('[data-th-reveal="headline"]').forEach((el) => {
    const kind = env.arabic && m.headline === "chars-glitch" ? "words-rise" : env.phone && m.headline === "chars-glitch" ? "words-rise" : m.headline;
    const split = (type: string, mask?: "lines" | "words") =>
      SplitText.create(el, { type, mask, linesClass: "th-line", wordsClass: "th-word", charsClass: "th-char", aria: "auto" });
    onSight(el, () => {
      gsap.set(el, { autoAlpha: 1 });
      if (kind === "lines-mask") {
        const s = split("lines", "lines");
        return gsap.from(s.lines, { yPercent: 110, duration: m.duration, ease: m.ease, stagger: m.stagger });
      }
      if (kind === "words-rise") {
        const s = split("words");
        return gsap.from(s.words, { y: 28, autoAlpha: 0, duration: m.duration, ease: m.ease, stagger: m.stagger });
      }
      if (kind === "words-blur") {
        const s = split("words");
        return gsap.from(s.words, { y: 18, autoAlpha: 0, filter: "blur(12px)", duration: m.duration, ease: m.ease, stagger: m.stagger, clearProps: "filter" });
      }
      if (kind === "words-pop") {
        const s = split("words");
        return gsap.from(s.words, { scale: 0, rotation: () => gsap.utils.random(-12, 12), transformOrigin: "50% 80%", duration: m.duration, ease: "elastic.out(1, 0.55)", stagger: m.stagger });
      }
      const s = split("words,chars");
      const tl = gsap.timeline();
      tl.from(s.chars, { yPercent: () => gsap.utils.random(-120, 120), rotation: () => gsap.utils.random(-25, 25), autoAlpha: 0, duration: m.duration, ease: "back.out(2)", stagger: { each: m.stagger, from: "random" } });
      tl.fromTo(el, { textShadow: "4px 0 var(--th-accent), -4px 0 var(--th-strong)" }, { textShadow: "0px 0 var(--th-accent), 0px 0 var(--th-strong)", duration: 0.5, ease: "steps(5)" }, "-=0.2");
      return tl;
    });
  });

  /* ----------------------------------------------------------------- blocks */
  const blockFrom: Record<MotionPreset["block"], gsap.TweenVars> = {
    rise: { y: 32, autoAlpha: 0 },
    fade: { y: 18, autoAlpha: 0 },
    skew: { x: -40, skewX: 12, autoAlpha: 0 },
    pop: { y: 50, scale: 0.9, autoAlpha: 0 },
  };
  gsap.utils.toArray<HTMLElement>('[data-th-reveal="block"]').forEach((el) =>
    onSight(el, () => gsap.from(el, { ...blockFrom[m.block], duration: m.duration, ease: m.ease, clearProps: "transform" })),
  );
  gsap.utils.toArray<HTMLElement>("[data-th-stagger]").forEach((group) => {
    const kids = Array.from(group.children) as HTMLElement[];
    if (!kids.length) return;
    onSight(group, () => gsap.from(kids, { ...blockFrom[m.block], duration: m.duration, ease: m.ease, stagger: m.stagger * 1.5, clearProps: "transform" }), kids);
  });

  /* ----------------------------------------------------------------- images */
  gsap.utils.toArray<HTMLElement>('[data-th-reveal="image"]').forEach((el) =>
    onSight(el, () => {
      if (m.image === "clip-up") return gsap.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)", scale: 1.12 }, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: m.duration * 1.2, ease: "power3.out", clearProps: "clipPath,transform" });
      if (m.image === "scan") return gsap.fromTo(el, { clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)" }, { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", duration: m.duration * 1.4, ease: "steps(12)", clearProps: "clipPath" });
      if (m.image === "bloom") return gsap.from(el, { scale: 0.88, autoAlpha: 0, borderRadius: "50%", duration: m.duration, ease: m.ease, clearProps: "transform,borderRadius" });
      if (m.image === "drop") return gsap.from(el, { y: -80, rotation: -6, autoAlpha: 0, duration: m.duration, ease: "bounce.out", clearProps: "transform" });
      return gsap.from(el, { scale: 0.94, autoAlpha: 0, duration: m.duration, ease: m.ease, clearProps: "transform" });
    }),
  );
  if (!env.phone && m.parallax) {
    gsap.utils.toArray<HTMLElement>("[data-th-parallax]").forEach((el) => {
      gsap.fromTo(el, { yPercent: -m.parallax }, { yPercent: m.parallax, ease: "none", scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  /* --------------------------------------------------------------- drawings */
  gsap.utils.toArray<SVGGeometryElement>("[data-th-draw]").forEach((el) =>
    onSight(el.ownerSVGElement ?? el, () => gsap.from(el, { drawSVG: "0%", duration: m.draw, ease: "power2.inOut", delay: gsap.utils.random(0, 0.4) })),
  );
  gsap.utils.toArray<SVGPathElement>("[data-th-morph]").forEach((el) => {
    const to = el.getAttribute("data-th-morph");
    if (!to) return;
    loop(el.ownerSVGElement ?? el, gsap.to(el, { morphSVG: to, duration: m.morph, ease: "sine.inOut", repeat: -1, yoyo: true, paused: true }));
  });
  gsap.utils.toArray<SVGGeometryElement>("[data-th-dash]").forEach((el) => {
    const length = el.getTotalLength?.() ?? 1000;
    loop(el.ownerSVGElement ?? el, gsap.fromTo(el, { strokeDashoffset: length }, { strokeDashoffset: 0, duration: m.draw * 2.2, ease: "none", repeat: -1, paused: true, delay: gsap.utils.random(0, 1.2) }));
  });
  gsap.utils.toArray<SVGElement>("[data-th-float]").forEach((el, i) => {
    if (!m.float) return;
    loop(el.ownerSVGElement ?? el, gsap.to(el, { y: (i % 2 ? 1 : -1) * m.float, rotation: (i % 3) - 1, duration: 2.6 + (i % 4) * 0.6, ease: "sine.inOut", repeat: -1, yoyo: true, paused: true }));
  });
  gsap.utils.toArray<SVGElement>("[data-th-pulse]").forEach((el, i) => {
    loop(el.ownerSVGElement ?? el, gsap.to(el, { scale: 1.25, opacity: 0.55, transformOrigin: "50% 50%", duration: 1.2 + (i % 3) * 0.3, ease: "sine.inOut", repeat: -1, yoyo: true, paused: true }));
  });
  gsap.utils.toArray<HTMLElement | SVGElement>("[data-th-spin]").forEach((el) => {
    loop(el, gsap.to(el, { rotation: 360, transformOrigin: "50% 50%", duration: 18, ease: "none", repeat: -1, paused: true }));
  });

  /* ------------------------------------------------------- strips, numbers */
  gsap.utils.toArray<HTMLElement>("[data-th-marquee]").forEach((el) => {
    const track = el.firstElementChild as HTMLElement | null;
    if (!track) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    loop(el, gsap.fromTo(track, { xPercent: 0 }, { xPercent: rtl ? 50 : -50, duration: m.marquee, ease: "none", repeat: -1, paused: true }));
  });
  gsap.utils.toArray<HTMLElement>("[data-th-count]").forEach((el) => {
    const to = Number(el.dataset.thCount);
    if (!Number.isFinite(to)) return;
    const v = { n: 0 };
    onSight(el, () => gsap.to(v, { n: to, duration: 1.6, ease: "power2.out", onUpdate: () => { el.textContent = Math.round(v.n).toLocaleString(document.documentElement.lang); } }));
  });

  /* ---------------------------------------------------- the pointer, computers */
  const done = () => off.forEach((f) => f());
  if (env.phone) return done;
  if (m.magnetic) {
    gsap.utils.toArray<HTMLElement>("[data-th-magnetic]").forEach((el) => {
      const x = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
      const y = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });
      listen(el, "pointermove", (e) => {
        const r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.3);
        y((e.clientY - r.top - r.height / 2) * 0.3);
      });
      listen(el, "pointerleave", () => {
        x(0);
        y(0);
      });
    });
  }
  if (m.tilt) {
    gsap.utils.toArray<HTMLElement>("[data-th-tilt]").forEach((el) => {
      gsap.set(el, { transformPerspective: 800 });
      const rx = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power2.out" });
      const ry = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power2.out" });
      listen(el, "pointermove", (e) => {
        const r = el.getBoundingClientRect();
        rx(((e.clientY - r.top) / r.height - 0.5) * -8);
        ry(((e.clientX - r.left) / r.width - 0.5) * 8);
      });
      listen(el, "pointerleave", () => {
        rx(0);
        ry(0);
      });
    });
  }
  return done;
}
