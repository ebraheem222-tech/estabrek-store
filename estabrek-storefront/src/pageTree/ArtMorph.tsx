"use client";
/**
 * A drawing's shapes turning into others (svg props `morph`, made in the editor's focus mode): each listed shape
 * (data-art-part, svgArt.tsx) becomes its target path through GSAP's MorphSVG (free since 2025), loaded only
 * here. When:
 *  - hover: in while the pointer (or the keyboard's focus) is on it, back out when it leaves;
 *  - click: there and back, one click each;
 *  - loop: there and back without end, only while it's in sight;
 *  - scroll: follows the page's scroll across the screen;
 *  - view: once, as it comes into sight.
 * The curve is the editor's (shared/ease.ts: a name, a cubic-bezier or a spring). Nothing moves for whoever asked
 * their device for less motion. The editor's "try it" plays it once there and back (studio "motionMorph").
 */
import { useEffect, useRef } from "react";
import { easeFn, readEase } from "../../../shared/ease";
import type { ArtMorphData } from "./svgArt";
import { studioLink } from "./studioLink";

export function ArtMorph({ nodeId, morph }: { nodeId: string; morph: ArtMorphData }) {
  const mark = useRef<HTMLElement>(null);
  const key = JSON.stringify(morph);
  useEffect(() => {
    const host = mark.current?.parentElement;
    if (!host || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let live = true;
    const undo: Array<() => void> = [];
    void (async () => {
      const [{ gsap }, { MorphSVGPlugin }, scroll] = await Promise.all([
        import("gsap"),
        import("gsap/MorphSVGPlugin"),
        morph.on === "scroll" ? import("gsap/ScrollTrigger") : Promise.resolve(null),
      ]);
      if (!live) return;
      gsap.registerPlugin(MorphSVGPlugin, ...(scroll ? [scroll.ScrollTrigger] : []));
      const curve = morph.ease ? readEase(morph.ease) : null;
      const ease = !curve ? "power2.inOut" : curve.kind === "named" ? curve.name : easeFn(curve);
      const tl = gsap.timeline({ paused: true, defaults: { duration: morph.duration ?? 0.6, ease } });
      morph.pairs.forEach((p, i) => {
        const el = host.querySelector<SVGPathElement>(`path[data-art-part="${p.part}"]`);
        if (el) tl.to(el, { morphSVG: { shape: p.to, shapeIndex: "auto" } }, i * (morph.stagger ?? 0));
      });
      if (!tl.getChildren().length) return;
      undo.push(() => tl.revert());
      const on = (type: string, fn: () => void) => {
        host.addEventListener(type, fn);
        undo.push(() => host.removeEventListener(type, fn));
      };
      const inSight = (enter: () => void, leave?: () => void) => {
        const io = new IntersectionObserver(([e]) => (e.isIntersecting ? enter() : leave?.()));
        io.observe(host);
        undo.push(() => io.disconnect());
      };
      if (morph.on === "hover") {
        on("pointerenter", () => tl.play());
        on("pointerleave", () => tl.reverse());
        on("focusin", () => tl.play());
        on("focusout", () => tl.reverse());
      } else if (morph.on === "click") {
        let there = false;
        on("click", () => {
          there = !there;
          if (there) tl.play();
          else tl.reverse();
        });
      } else if (morph.on === "loop") {
        tl.repeat(-1).yoyo(true).repeatDelay(0.25);
        inSight(() => tl.play(), () => tl.pause());
      } else if (morph.on === "view") {
        inSight(() => tl.play());
      } else if (scroll) {
        const st = scroll.ScrollTrigger.create({ trigger: host, start: "top bottom", end: "bottom top", scrub: 0.4, animation: tl });
        undo.push(() => st.kill());
      }
      // The editor's "try it": there and back once.
      undo.push(studioLink.listen((msg) => {
        if (msg.type === "motionMorph" && msg.nodeId === nodeId) void tl.restart().then(() => tl.reverse());
      }));
    })();
    return () => {
      live = false;
      undo.splice(0).reverse().forEach((u) => u());
    };
    // `key` stands for the morph's contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, key]);
  return <i ref={mark} hidden aria-hidden="true" />;
}
