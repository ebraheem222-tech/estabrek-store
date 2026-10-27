"use client";
/**
 * The page tree's motion (GSAP 3.13 with ScrollTrigger and SplitText), loaded only on a
 * page whose elements move: TreeNodeView writes each one's cleaned `motion` into
 * data-pt-motion. Turns and moves go through CSS variables that pageTree/css.ts adds to
 * the element's own look (TREE_TRANSFORM): --pt-e* coming in, --pt-m* the scroll,
 * --pt-l* loops, --pt-h* the pointer, so they never fight each other or the look.
 *
 * A drawing (svg) can also be drawn line by line, morph into its second shape and back,
 * or run its lines (DrawSVG and MorphSVG, loaded only then).
 *
 * "Reduce motion" leaves everything still and shown. On a phone `lite` keeps only the
 * coming in and `off` nothing; pointer effects need a mouse. Inside the editor's frame
 * things come in and loop only when the editor asks (motionLive, motionPlay through
 * studioLink); what follows the scroll follows the frame's scroll as on the shop.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { studioLink } from "./studioLink";
import { lookSelector, motionOf, type MotionKeys, type TreeMotionSpec } from "./tree";

type Gsap = typeof import("gsap").gsap;
type ST = typeof import("gsap/ScrollTrigger").ScrollTrigger;
type Split = typeof import("gsap/SplitText").SplitText;
const SHAPES = "path,circle,ellipse,rect,line,polyline,polygon";
/** A drawing's shapes with lines, and those filled. */
const linesOf = (el: Element) => Array.from(el.querySelectorAll<SVGElement>(SHAPES)).filter((s) => getComputedStyle(s).stroke !== "none");
const fillsOf = (el: Element) => Array.from(el.querySelectorAll<SVGElement>(SHAPES)).filter((s) => getComputedStyle(s).fill !== "none");
type Vars = Record<string, string | number>;

export const MOTION_EASE: Record<string, string> = { smooth: "power2.out", soft: "sine.inOut", strong: "power4.out", back: "back.out(1.6)", elastic: "elastic.out(1, 0.5)", bounce: "bounce.out", linear: "none" };

/** Where an element comes in from (the variables and values it starts at). */
export function enterFrom(kind: string, distance: number, rtl: boolean): Vars {
  const side = rtl ? -1 : 1;
  switch (kind) {
    case "up": return { "--pt-ey": `${distance}px`, opacity: 0 };
    case "down": return { "--pt-ey": `${-distance}px`, opacity: 0 };
    case "start": return { "--pt-ex": `${-distance * side}px`, opacity: 0 };
    case "end": return { "--pt-ex": `${distance * side}px`, opacity: 0 };
    case "zoom-in": return { "--pt-es": 0.85, opacity: 0 };
    case "zoom-out": return { "--pt-es": 1.15, opacity: 0 };
    case "blur": return { filter: "blur(16px)", opacity: 0 };
    case "flip-x": return { "--pt-erx": "80deg", opacity: 0 };
    case "flip-y": return { "--pt-ery": `${80 * side}deg`, opacity: 0 };
    case "turn": return { "--pt-erz": `${-12 * side}deg`, "--pt-es": 0.9, opacity: 0 };
    case "wipe-start": return { clipPath: rtl ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" };
    case "wipe-end": return { clipPath: rtl ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)" };
    case "wipe-up": return { clipPath: "inset(100% 0% 0% 0%)" };
    case "wipe-down": return { clipPath: "inset(0% 0% 100% 0%)" };
    case "wipe-center": return { clipPath: "inset(0% 50% 0% 50%)" };
    case "circle": return { clipPath: "circle(0% at 50% 50%)" };
    default: return { opacity: 0 };
  }
}

/** Where it comes in to: every variable back at rest, the picture whole, its own opacity. */
export function enterTo(from: Vars, opacity: number): Vars {
  const to: Vars = {};
  for (const k of Object.keys(from)) {
    if (k === "opacity") to.opacity = opacity;
    else if (k === "filter") to.filter = "blur(0px)";
    else if (k === "clipPath") to.clipPath = String(from.clipPath).startsWith("circle") ? "circle(75% at 50% 50%)" : "inset(0% 0% 0% 0%)";
    else to[k] = k.endsWith("s") ? 1 : String(from[k]).endsWith("deg") ? "0deg" : "0px";
  }
  return to;
}

/** A scroll moment as the scroll's variables (missing turns and moves at rest). */
export function scrollVars(k: MotionKeys | undefined, other: MotionKeys | undefined): Vars {
  const v: Vars = {};
  const both = { ...other, ...k };
  if (both.rx !== undefined) v["--pt-mrx"] = `${k?.rx ?? 0}deg`;
  if (both.ry !== undefined) v["--pt-mry"] = `${k?.ry ?? 0}deg`;
  if (both.rz !== undefined) v["--pt-mrz"] = `${k?.rz ?? 0}deg`;
  if (both.x !== undefined) v["--pt-mx"] = `${k?.x ?? 0}px`;
  if (both.y !== undefined) v["--pt-my"] = `${k?.y ?? 0}px`;
  if (both.scale !== undefined) v["--pt-ms"] = k?.scale ?? 1;
  if (both.opacity !== undefined) v.opacity = k?.opacity ?? 1;
  return v;
}

type Env = { phone: boolean; mouse: boolean; rtl: boolean; live: boolean; only: string | null };

function animate(gsap: Gsap, ScrollTrigger: ST, SplitText: Split, el: HTMLElement, m: TreeMotionSpec, env: Env, off: Array<() => void>) {
  if (env.phone && m.phone === "off") return;
  const lite = env.phone && m.phone === "lite";
  const id = el.dataset.treeNode ?? el.dataset.ptLook ?? "";
  const plays = env.live || env.only === id;
  let enterEnds = 0;

  if (m.enter && plays) {
    const e = m.enter;
    const duration = e.duration ?? 0.8;
    const delay = e.delay ?? 0;
    enterEnds = delay + duration;
    const vars = { duration, delay, ease: MOTION_EASE[e.ease ?? "smooth"] ?? "power2.out" };
    const sight = env.only === id ? undefined : { trigger: el, start: "top 90%", toggleActions: "play none none none" };
    if (e.kind === "draw") {
      // Its lines draw themselves, then what's filled comes in.
      const lines = linesOf(el);
      const fills = fillsOf(el);
      // Their own strength, read before the start hides them.
      const ends = fills.map((f) => getComputedStyle(f).fillOpacity);
      const tl = gsap.timeline({ delay, scrollTrigger: sight });
      if (lines.length) tl.fromTo(lines, { drawSVG: "0%" }, { drawSVG: "100%", duration, ease: vars.ease, stagger: e.stagger ?? 0.08 });
      if (fills.length) tl.fromTo(fills, { fillOpacity: 0 }, { fillOpacity: (i: number) => ends[i], duration: duration * 0.6, ease: "power1.out" }, lines.length ? `-=${duration * 0.4}` : 0);
    } else if (e.kind === "words") {
      const split = SplitText.create(el, { type: "words", aria: "auto" });
      gsap.fromTo(split.words, { y: (e.distance ?? 24), autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: e.stagger || 0.06, ...vars, scrollTrigger: sight });
    } else {
      const kids = e.stagger ? Array.from(el.querySelectorAll<HTMLElement>(":scope > [data-tree-node], :scope > .pt-inner > [data-tree-node]")) : [];
      const targets = kids.length ? kids : [el];
      const from = enterFrom(e.kind, e.distance ?? 40, env.rtl);
      const to = enterTo(from, Number(getComputedStyle(targets[0]).opacity) || 1);
      gsap.fromTo(targets, from, { ...to, ...vars, stagger: kids.length ? e.stagger : 0, clearProps: "clipPath,filter", scrollTrigger: sight });
    }
  }

  if (m.scroll && !lite) {
    const s = m.scroll;
    if (s.kind === "parallax") {
      const d = 120 * (s.speed ?? 0.4);
      gsap.fromTo(el, { "--pt-my": `${-d}px` }, { "--pt-my": `${d}px`, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    } else {
      gsap.fromTo(el, scrollVars(s.from, s.to), {
        ...scrollVars(s.to, s.from),
        ease: MOTION_EASE[s.ease ?? "linear"] ?? "none",
        scrollTrigger: { trigger: el, start: `top ${s.start ?? 90}%`, end: `top ${s.end ?? 30}%`, scrub: 0.6 },
      });
    }
  }

  if (m.loop && plays && !lite) {
    const l = m.loop;
    const a = l.amount ?? 1;
    const each = (l.duration ?? 3) / 2;
    const base = { duration: each, repeat: -1, yoyo: true, ease: "sine.inOut", delay: enterEnds } as const;
    const morphTo = l.kind === "morph" ? el.querySelector<SVGPathElement>("path[data-pt-morph]") : null;
    const lines = l.kind === "dash" ? linesOf(el) : [];
    if (l.kind === "dash") lines.forEach((s) => getComputedStyle(s).strokeDasharray === "none" && gsap.set(s, { strokeDasharray: "10 12" }));
    const tween =
      l.kind === "morph" ? (morphTo ? gsap.to(morphTo, { morphSVG: morphTo.dataset.ptMorph ?? "", ...base }) : null)
      : l.kind === "dash" ? (lines.length ? gsap.to(lines, { strokeDashoffset: "-=220", duration: l.duration ?? 4, repeat: -1, ease: "none", delay: enterEnds }) : null)
      : l.kind === "spin" ? gsap.fromTo(el, { "--pt-lrz": "0deg" }, { "--pt-lrz": "360deg", duration: l.duration ?? 8, repeat: -1, ease: "none", delay: enterEnds })
      : l.kind === "pulse" ? gsap.fromTo(el, { "--pt-ls": 1 }, { "--pt-ls": 1 + 0.05 * a, ...base })
      : l.kind === "wobble" ? gsap.fromTo(el, { "--pt-lrz": `${-4 * a}deg` }, { "--pt-lrz": `${4 * a}deg`, ...base })
      : l.kind === "swing" ? gsap.fromTo(el, { "--pt-lrz": `${-10 * a}deg`, transformOrigin: "50% 0%" }, { "--pt-lrz": `${10 * a}deg`, ...base })
      : l.kind === "breathe" ? gsap.fromTo(el, { opacity: Number(getComputedStyle(el).opacity) || 1 }, { opacity: 0.65, ...base })
      : l.kind === "bounce" ? gsap.fromTo(el, { "--pt-ly": "0px" }, { "--pt-ly": `${-16 * a}px`, ...base, ease: "power1.out" })
      : gsap.fromTo(el, { "--pt-ly": "0px" }, { "--pt-ly": `${-10 * a}px`, ...base });
    // Loops rest while out of sight.
    if (tween) ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onToggle: (self) => (self.isActive ? tween.play() : tween.pause()) });
  }

  if (m.hover && env.mouse && !lite && m.hover.kind !== "glow") {
    const a = m.hover.amount ?? 1;
    const k = m.hover.kind;
    const media = el.querySelector(":scope > .pt-frame-media");
    if (k === "zoom" && media) return; // drawn by CSS (.pt-hv-zoom)
    const on = (type: string, fn: (e: PointerEvent) => void) => {
      el.addEventListener(type, fn as EventListener);
      off.push(() => el.removeEventListener(type, fn as EventListener));
    };
    const rest = { "--pt-hx": "0px", "--pt-hy": "0px", "--pt-hrx": "0deg", "--pt-hry": "0deg", "--pt-hs": 1, duration: 0.5, ease: "power3.out" };
    if (k === "lift") on("pointerenter", () => gsap.to(el, { "--pt-hy": `${-6 * a}px`, duration: 0.35, ease: "power2.out" }));
    if (k === "grow" || k === "zoom") on("pointerenter", () => gsap.to(el, { "--pt-hs": 1 + 0.04 * a, duration: 0.35, ease: "power2.out" }));
    if (k === "tilt" || k === "magnetic") {
      on("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(el, k === "tilt"
          ? { "--pt-hry": `${px * 14 * a}deg`, "--pt-hrx": `${-py * 14 * a}deg`, duration: 0.4, ease: "power2.out" }
          : { "--pt-hx": `${px * r.width * 0.15 * a}px`, "--pt-hy": `${py * r.height * 0.15 * a}px`, duration: 0.4, ease: "power2.out" });
      });
    }
    on("pointerleave", () => gsap.to(el, rest));
  }
}

export function TreeMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    const done = () => root.classList.remove("pt-pending");
    // Parts of old sections and scenes that move (the editor's looks, #pt-looks): they get their motion too.
    try {
      const looks = JSON.parse(document.getElementById("pt-looks")?.textContent || "[]") as Array<[string, unknown]>;
      for (const [target, motion] of Array.isArray(looks) ? looks : []) {
        const sel = typeof target === "string" ? lookSelector(target) : null;
        if (!sel) continue;
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
          if (el.dataset.treeNode) return;
          el.dataset.ptLook = target;
          el.dataset.ptMotion = JSON.stringify(motion);
        });
      }
    } catch {
      /* no looks, or broken ones: nothing more moves */
    }
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-pt-motion]"));
    if (!els.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return done();
    const studio = window.parent !== window && /\/studio-frame/.test(window.location.pathname);
    let dead = false;
    let revert: () => void = () => {};
    // The editor's frame: everything comes in and loops while "live", or one element once. Its
    // requests are heard from the start (they often come before GSAP has loaded) and the
    // latest one is played once the engine is ready.
    const mode = { live: !studio, only: null as string | null };
    let build: (() => void) | null = null;
    const unlisten = studio
      ? studioLink.listen((msg) => {
          if (msg.type === "motionLive") {
            mode.live = msg.on === true;
            mode.only = null;
          } else if (msg.type === "motionPlay") mode.only = typeof msg.nodeId === "string" ? msg.nodeId : null;
          else return;
          build?.();
        })
      : () => {};
    void (async () => {
      const drawn = els.some((el) => /"kind":"(draw|morph|dash)"/.test(el.dataset.ptMotion ?? ""));
      const [{ gsap }, { ScrollTrigger }, { SplitText }, svg] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("gsap/SplitText"),
        drawn ? Promise.all([import("gsap/DrawSVGPlugin"), import("gsap/MorphSVGPlugin")]) : Promise.resolve(null),
      ]);
      if (dead) return;
      gsap.registerPlugin(ScrollTrigger, SplitText, ...(svg ? [svg[0].DrawSVGPlugin, svg[1].MorphSVGPlugin] : []));
      build = () => {
        revert();
        const off: Array<() => void> = [];
        const env: Env = {
          phone: window.matchMedia("(max-width: 639.98px)").matches,
          mouse: window.matchMedia("(hover: hover) and (pointer: fine)").matches,
          rtl: root.dir === "rtl",
          live: mode.live,
          only: mode.only,
        };
        const ctx = gsap.context(() => {
          for (const el of els) {
            let spec: TreeMotionSpec | null = null;
            try {
              spec = motionOf({ id: el.dataset.treeNode ?? el.dataset.ptLook ?? "", type: "", props: {}, motion: JSON.parse(el.dataset.ptMotion ?? "null") });
            } catch {
              spec = null;
            }
            if (spec) animate(gsap, ScrollTrigger, SplitText, el, spec, env, off);
          }
        });
        done();
        revert = () => {
          off.forEach((f) => f());
          ctx.revert();
        };
      };
      build();
    })().catch(done);
    return () => {
      dead = true;
      unlisten();
      revert();
    };
  }, [pathname]);
  return null;
}
