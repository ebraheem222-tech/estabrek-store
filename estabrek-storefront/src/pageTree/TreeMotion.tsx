"use client";
/**
 * The page tree's motion (GSAP, or lazy Anime.js with ScrollTrigger and SplitText), loaded only on a
 * page whose elements move: TreeNodeView writes each one's cleaned `motion` into
 * data-pt-motion. Turns and moves go through CSS variables that pageTree/css.ts adds to
 * the element's own look (TREE_TRANSFORM): --pt-e* coming in, --pt-m* the scroll,
 * --pt-l* loops, --pt-h* the pointer, so they never fight each other or the look.
 *
 * A drawing (svg) can also be drawn line by line, morph into its second shape and back,
 * or run its lines (DrawSVG and MorphSVG, loaded only then). The mouse can play a short
 * move once (bounce, shake…), carry a light, leave a ripple where it presses, or pull an
 * element on a spring (Motion's springs, loaded only then).
 *
 * "Reduce motion" leaves everything still and shown. On a phone `lite` keeps only the
 * coming in and `off` nothing; pointer effects need a mouse. Inside the editor's frame
 * things come in and loop only when the editor asks (motionLive, motionPlay through
 * studioLink); what follows the scroll follows the frame's scroll as on the shop.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { studioLink } from "./studioLink";
import { ARABIC, countUpText, scrambleChars } from "./textMotion";
import { lookSelector, motionOf, type MotionKeys, type TreeMotionSpec } from "./tree";
import { useStudioViewRevision } from "./useStudioViewRevision";

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

/** A short play as the mouse comes over (`a` = its strength): the pointer variables' steps, and how long it takes. */
export function hoverPlay(kind: string, a: number): { steps: Vars[]; duration: number } | null {
  const deg = (v: number) => `${+(v * a).toFixed(2)}deg`;
  const px = (v: number) => `${+(v * a).toFixed(2)}px`;
  const sc = (v: number) => +(1 + (v - 1) * a).toFixed(3);
  switch (kind) {
    case "bounce": return { steps: [{ "--pt-hy": px(-14) }, { "--pt-hy": "0px" }, { "--pt-hy": px(-6) }, { "--pt-hy": "0px" }], duration: 0.7 };
    case "shake": return { steps: [{ "--pt-hx": px(-7) }, { "--pt-hx": px(7) }, { "--pt-hx": px(-5) }, { "--pt-hx": px(5) }, { "--pt-hx": "0px" }], duration: 0.5 };
    case "pulse": return { steps: [{ "--pt-hs": sc(1.08) }, { "--pt-hs": 1 }], duration: 0.45 };
    case "wiggle": return { steps: [{ "--pt-hrz": deg(-7) }, { "--pt-hrz": deg(7) }, { "--pt-hrz": deg(-4) }, { "--pt-hrz": deg(4) }, { "--pt-hrz": "0deg" }], duration: 0.6 };
    case "jello": return { steps: [{ "--pt-hrz": deg(-4), "--pt-hs": sc(1.05) }, { "--pt-hrz": deg(3), "--pt-hs": sc(0.97) }, { "--pt-hrz": deg(-1.5), "--pt-hs": sc(1.02) }, { "--pt-hrz": "0deg", "--pt-hs": 1 }], duration: 0.8 };
    case "rubber": return { steps: [{ "--pt-hs": sc(1.14) }, { "--pt-hs": sc(0.92) }, { "--pt-hs": sc(1.06) }, { "--pt-hs": 1 }], duration: 0.7 };
    case "heartbeat": return { steps: [{ "--pt-hs": sc(1.1) }, { "--pt-hs": 1 }, { "--pt-hs": sc(1.1) }, { "--pt-hs": 1 }], duration: 0.8 };
    case "swing": return { steps: [{ "--pt-hrz": deg(12) }, { "--pt-hrz": deg(-8) }, { "--pt-hrz": deg(4) }, { "--pt-hrz": deg(-2) }, { "--pt-hrz": "0deg" }], duration: 0.8 };
    case "flip": return { steps: [{ "--pt-hry": "360deg" }], duration: 0.7 };
    case "spin": return { steps: [{ "--pt-hrz": "360deg" }], duration: 0.7 };
    case "pop": return { steps: [{ "--pt-hs": sc(1.15) }, { "--pt-hs": 1 }], duration: 0.4 };
    default: return null;
  }
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

/** Its words typed over `seconds`, held, then taken back, again and again (Arabic word by word). */
function typing(gsap: Gsap, SplitText: Split, el: HTMLElement, seconds: number, delay: number, off: Array<() => void>) {
  const joined = ARABIC.test(el.textContent ?? "");
  const split = SplitText.create(el, { type: joined ? "words" : "words,chars", aria: "auto", wordsClass: "pt-split-piece", charsClass: "pt-split-piece", linesClass: "pt-split-piece" });
  const parts = joined ? split.words : split.chars;
  el.classList.add("pt-typing");
  off.push(() => el.classList.remove("pt-typing"));
  return gsap.timeline({ repeat: -1, yoyo: true, repeatDelay: 1.4, delay }).fromTo(parts, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, ease: "none", stagger: seconds / Math.max(1, parts.length) });
}

function animate(gsap: Gsap, ScrollTrigger: ST, SplitText: Split, el: HTMLElement, m: TreeMotionSpec, env: Env, off: Array<() => void>, context: ReturnType<Gsap["context"]>) {
  if (env.phone && m.phone === "off") return;
  const lite = env.phone && m.phone === "lite";
  const id = el.dataset.treeNode ?? el.dataset.ptLook ?? "";
  const plays = env.live || env.only === id;
  let textScope: HTMLElement | null = null;
  // SplitText and ScrambleText own their target's children. Keep decorations on
  // the original host, outside word/line masks, and unwrap after plugin reversion.
  const textTarget = () => {
    if (textScope) return textScope;
    if (!el.querySelector(":scope > .pt-edge")) return el;
    const scope = document.createElement("span");
    scope.style.display = "block";
    scope.style.minWidth = "0";
    const content = Array.from(el.childNodes).filter(node => !(node instanceof Element && node.matches(".pt-edge,.pt-fx,.pt-spot")));
    scope.append(...content);
    el.prepend(scope);
    textScope = scope;
    context.add(() => () => { if (scope.parentNode === el) scope.replaceWith(...Array.from(scope.childNodes)); });
    return scope;
  };
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
      const split = SplitText.create(textTarget(), { type: "words", aria: "auto", wordsClass: "pt-split-piece", charsClass: "pt-split-piece", linesClass: "pt-split-piece" });
      gsap.fromTo(split.words, { y: (e.distance ?? 24), autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: e.stagger || 0.06, ...vars, scrollTrigger: sight });
    } else if (e.kind === "letters" || e.kind === "typewriter") {
      const joined = ARABIC.test(el.textContent ?? "");
      const target = textTarget();
      const split = SplitText.create(target, { type: joined ? "words" : "words,chars", aria: "auto", wordsClass: "pt-split-piece", charsClass: "pt-split-piece", linesClass: "pt-split-piece" });
      const parts = joined ? split.words : split.chars;
      if (e.kind === "letters") gsap.fromTo(parts, { y: e.distance ?? 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: e.stagger || (joined ? 0.06 : 0.025), ...vars, scrollTrigger: sight });
      else {
        // Typed one by one over its duration, a caret after it until the last one.
        let caretTimer: ReturnType<typeof setTimeout> | undefined;
        gsap.set(parts, { autoAlpha: 0 });
        gsap.to(parts, {
          autoAlpha: 1, duration: 0.01, delay, ease: "none", stagger: duration / Math.max(1, parts.length), scrollTrigger: sight,
          onStart: () => target.classList.add("pt-typing"),
          onComplete: () => { caretTimer = setTimeout(() => target.classList.remove("pt-typing"), 900); },
        });
        off.push(() => { clearTimeout(caretTimer); target.classList.remove("pt-typing"); });
      }
    } else if (e.kind === "lines") {
      const split = SplitText.create(textTarget(), { type: "lines", mask: "lines", aria: "auto", wordsClass: "pt-split-piece", charsClass: "pt-split-piece", linesClass: "pt-split-piece" });
      gsap.fromTo(split.lines, { yPercent: 110 }, { yPercent: 0, stagger: e.stagger || 0.12, ...vars, scrollTrigger: sight });
    } else if (e.kind === "scramble") {
      // Only words alone (no formatting inside) can be scrambled; others just fade in.
      const target = textTarget();
      const text = target.textContent ?? "";
      if (target.children.length === 0 && text.trim()) gsap.to(target, { scrambleText: { text, chars: scrambleChars(text), revealDelay: duration * 0.3, speed: 0.6 }, ...vars, ease: "none", scrollTrigger: sight });
      else gsap.fromTo(el, { opacity: 0 }, { opacity: Number(getComputedStyle(el).opacity) || 1, ...vars, scrollTrigger: sight });
    } else if (e.kind === "count") {
      // The first number in its words counts up to itself.
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let found: { node: Text; at: NonNullable<ReturnType<typeof countUpText>> } | null = null;
      while (!found && walker.nextNode()) {
        const at = countUpText((walker.currentNode as Text).data);
        if (at) found = { node: walker.currentNode as Text, at };
      }
      if (found) {
        const { node, at } = found;
        const was = node.data;
        const v = { n: 0 };
        node.data = at.before + at.format(0) + at.after;
        gsap.to(v, { n: at.target, ...vars, ease: "power1.out", scrollTrigger: sight, onUpdate: () => void (node.data = at.before + at.format(v.n) + at.after) });
        off.push(() => void (node.data = was));
      }
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
    if (s.kind === "words") {
      // Its words light up one by one as it comes up the screen.
      const split = SplitText.create(textTarget(), { type: "words", aria: "auto", wordsClass: "pt-split-piece", charsClass: "pt-split-piece", linesClass: "pt-split-piece" });
      gsap.fromTo(split.words, { opacity: 0.15 }, { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: el, start: `top ${s.start ?? 85}%`, end: `bottom ${s.end ?? 45}%`, scrub: 0.5 } });
    } else if (s.kind === "pin") {
      // Held in place while the page scrolls on for `length` % of a screen.
      ScrollTrigger.create({ trigger: el, start: "top top", end: `+=${s.length ?? 100}%`, pin: true, pinSpacing: true });
    } else if (s.kind === "parallax") {
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
      : l.kind === "type" ? typing(gsap, SplitText, textTarget(), l.duration ?? 3, enterEnds, off)
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

  const on = (type: string, fn: (e: PointerEvent) => void) => {
    // Pointer tweens start after setup; keep them in the same cleanup context.
    const listener = (event: Event) => { context.add(() => fn(event as PointerEvent)); };
    el.addEventListener(type, listener);
    off.push(() => el.removeEventListener(type, listener));
  };
  // A ripple where it's pressed, by a mouse or a finger.
  if (m.hover?.kind === "ripple" && !lite) {
    on("pointerdown", (e) => {
      const r = el.getBoundingClientRect();
      const size = Math.hypot(r.width, r.height) * 2;
      const dot = document.createElement("span");
      dot.className = "pt-rpl";
      dot.setAttribute("aria-hidden", "true");
      dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left}px;top:${e.clientY - r.top}px`;
      el.appendChild(dot);
      dot.addEventListener("animationend", () => dot.remove(), { once: true });
      off.push(() => dot.remove());
    });
    return;
  }

  if (m.hover && env.mouse && !lite && m.hover.kind !== "glow") {
    const a = m.hover.amount ?? 1;
    const k = m.hover.kind;
    const media = el.querySelector(":scope > .pt-frame-media");
    if (k === "zoom" && media) return; // drawn by CSS (.pt-hv-zoom)
    if (k === "spotlight") {
      // The light's place follows the mouse (CSS draws it: .pt-spot).
      on("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--pt-sx", `${Math.round(e.clientX - r.left)}px`);
        el.style.setProperty("--pt-sy", `${Math.round(e.clientY - r.top)}px`);
      });
      return;
    }
    const play = hoverPlay(k, a);
    if (play) {
      let running: ReturnType<Gsap["to"]> | null = null;
      on("pointerenter", () => {
        if (running?.isActive()) return;
        running = gsap.to(el, { keyframes: play.steps, duration: play.duration, ease: "power1.inOut", onComplete: () => void gsap.set(el, { "--pt-hry": "0deg", "--pt-hrz": "0deg" }) });
      });
      return;
    }
    if (k === "spring" || k === "jelly") {
      // On Motion's springs: it follows the mouse a little and springs back, or wobbles as it grows.
      const now = { x: 0, y: 0, s: 1 };
      let cancelled = false;
      const stops = new Map<string, { stop: () => void }>();
      // Motion writes these variables directly, outside the GSAP/Anime cleanup.
      const before = ["--pt-hx", "--pt-hy", "--pt-hs"].map(key => ({ key, value: el.style.getPropertyValue(key), priority: el.style.getPropertyPriority(key) }));
      const springTo = (key: "x" | "y" | "s", to: number, bouncy: boolean) =>
        void import("motion").then(({ animate: spring }) => {
          if (cancelled) return;
          stops.get(key)?.stop();
          const c = spring(now[key], to, {
            type: "spring", stiffness: bouncy ? 260 : 180, damping: bouncy ? 9 : 14,
            onUpdate: (v: number) => {
              now[key] = v;
              el.style.setProperty(key === "s" ? "--pt-hs" : key === "x" ? "--pt-hx" : "--pt-hy", key === "s" ? String(v) : `${v}px`);
            },
          });
          stops.set(key, c);
        });
      off.push(() => {
        cancelled = true;
        stops.forEach((c) => c.stop());
        before.forEach(({ key, value, priority }) => {
          if (value) el.style.setProperty(key, value, priority);
          else el.style.removeProperty(key);
        });
      });
      if (k === "spring") {
        on("pointermove", (e) => {
          const r = el.getBoundingClientRect();
          springTo("x", ((e.clientX - r.left) / r.width - 0.5) * r.width * 0.2 * a, false);
          springTo("y", ((e.clientY - r.top) / r.height - 0.5) * r.height * 0.2 * a, false);
        });
        on("pointerleave", () => {
          springTo("x", 0, true);
          springTo("y", 0, true);
        });
      } else {
        on("pointerenter", () => springTo("s", 1 + 0.06 * a, true));
        on("pointerleave", () => springTo("s", 1, true));
      }
      return;
    }
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

export function TreeMotion({ revision = 0 }: { revision?: number }) {
  const pathname = usePathname();
  const viewRevision = useStudioViewRevision("[data-pt-motion],#pt-looks", ["data-pt-motion","data-pt-look-version"], `${pathname}:${revision}`);
  useEffect(() => {
    const root = document.documentElement;
    const done = () => root.classList.remove("pt-pending");
    const lookAttributes: Array<{ el: HTMLElement; look?: string; motion?: string }> = [];
    const restoreLooks = () => lookAttributes.forEach(({el,look,motion}) => {
      if (look === undefined) delete el.dataset.ptLook; else el.dataset.ptLook = look;
      if (motion === undefined) delete el.dataset.ptMotion; else el.dataset.ptMotion = motion;
    });
    // Parts of old sections and scenes that move (the editor's looks, #pt-looks): they get their motion too.
    try {
      const looks = JSON.parse(document.getElementById("pt-looks")?.textContent || "[]") as Array<[string, unknown]>;
      for (const [target, motion] of Array.isArray(looks) ? looks : []) {
        const sel = typeof target === "string" ? lookSelector(target) : null;
        if (!sel) continue;
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
          if (el.dataset.treeNode) return;
          lookAttributes.push({el,look:el.dataset.ptLook,motion:el.dataset.ptMotion});
          el.dataset.ptLook = target;
          el.dataset.ptMotion = JSON.stringify(motion);
        });
      }
    } catch {
      /* no looks, or broken ones: nothing more moves */
    }
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-pt-motion]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia("(max-width: 639.98px)");
    const mouse = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!els.length || reduced.matches) { done(); return restoreLooks; }
    const studio = window.parent !== window && /\/studio-frame/.test(window.location.pathname);
    let dead = false;
    let revert: () => void = () => {};
    // The editor's frame: everything comes in and loops while "live", or one element once. Its
    // requests are heard from the start (they often come before GSAP has loaded) and the
    // latest one is played once the engine is ready.
    const mode = { live: !studio, only: null as string | null };
    let build: (() => void) | null = null;
    let refreshLayout = () => {};
    const unlisten = studio
      ? studioLink.listen((msg) => {
          if (msg.type === "linkOpen") { studioLink.send({type:"motionStateRequest"}); return; }
          if (msg.type === "motionLayout") { refreshLayout(); return; }
          if (msg.type === "motionLive") {
            mode.live = msg.on === true;
            mode.only = null;
          } else if (msg.type === "motionPlay") mode.only = typeof msg.nodeId === "string" ? msg.nodeId : null;
          else return;
          build?.();
        })
      : () => {};
    if (studio) studioLink.send({type:"motionStateRequest"});
    void (async () => {
      const drawn = els.some((el) => /"kind":"(draw|morph|dash)"/.test(el.dataset.ptMotion ?? ""));
      const scrambles = els.some((el) => /"kind":"scramble"/.test(el.dataset.ptMotion ?? ""));
      const hasAnime = els.some(el => { try { return JSON.parse(el.dataset.ptMotion ?? "null")?.engine === "anime"; } catch { return false; } });
      const [{ gsap }, { ScrollTrigger }, { SplitText }, svg, scramble, anime] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("gsap/SplitText"),
        drawn ? Promise.all([import("gsap/DrawSVGPlugin"), import("gsap/MorphSVGPlugin")]) : Promise.resolve(null),
        scrambles ? import("gsap/ScrambleTextPlugin") : Promise.resolve(null),
        hasAnime ? import("./animeMotion") : Promise.resolve(null),
      ]);
      if (dead) return;
      gsap.registerPlugin(ScrollTrigger, SplitText, ...(svg ? [svg[0].DrawSVGPlugin, svg[1].MorphSVGPlugin] : []), ...(scramble ? [scramble.ScrambleTextPlugin] : []));
      refreshLayout = () => { if (!dead) ScrollTrigger.refresh(); };
      build = () => {
        revert();
        if (reduced.matches) { done(); return; }
        const off: Array<() => void> = [];
        const adapter = anime?.createAnimeMotionEngine(gsap, ScrollTrigger);
        if (adapter) off.push(adapter.dispose);
        const env: Env = {
          phone: phone.matches,
          mouse: mouse.matches,
          rtl: root.dir === "rtl",
          live: mode.live,
          only: mode.only,
        };
        const ctx = gsap.context(() => {});
        revert = () => {
          off.forEach((f) => f());
          ctx.revert();
        };
        ctx.add(() => {
          for (const el of els) {
            let spec: TreeMotionSpec | null = null;
            try {
              spec = motionOf({ id: el.dataset.treeNode ?? el.dataset.ptLook ?? "", type: "", props: {}, motion: JSON.parse(el.dataset.ptMotion ?? "null") });
            } catch {
              spec = null;
            }
            if (spec) {
              const previousEngine = el.dataset.ptEngine;
              el.dataset.ptEngine = spec.engine === "anime" && adapter ? "anime" : "gsap";
              off.push(() => { if (previousEngine === undefined) delete el.dataset.ptEngine; else el.dataset.ptEngine = previousEngine; });
              animate(spec.engine === "anime" && adapter ? adapter.engine : gsap, ScrollTrigger, SplitText, el, spec, env, off, ctx);
            }
          }
        });
        done();
      };
      build();
    })().catch(() => { revert(); done(); });
    const mediaChanged = () => build?.();
    for (const media of [reduced, phone, mouse]) media.addEventListener("change", mediaChanged);
    return () => {
      dead = true;
      unlisten();
      for (const media of [reduced, phone, mouse]) media.removeEventListener("change", mediaChanged);
      revert();
      restoreLooks();
    };
  }, [pathname, revision, viewRevision]);
  return null;
}
