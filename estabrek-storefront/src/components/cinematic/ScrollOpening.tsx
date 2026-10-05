"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { useLanguage } from "./Language";

/** Static-first campaign, progressively enhanced with one reversible held scene. */
export function ScrollOpening({ children, model, subtle = false }: { children: ReactNode; model?: ReactNode; subtle?: boolean }) {
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
      const state = { p: 0 };
      const frame = () => {
        const p = state.p;
        const reveal = model ? Math.min(1, Math.max(0, (p - .18) / .1), Math.max(0, (1 - p) / .13)) : 0;
        const imageProgress = model ? Math.min(1, p / .2) : Math.min(1, p / .85);
        scene.dataset.progress = p.toFixed(3);
        scene.dataset.phase = reveal > .15 ? "fabric" : "campaign";
        const fabric = scene.querySelector<HTMLElement>(".opening-fabric");
        if (fabric) { fabric.inert = reveal <= .15; fabric.setAttribute("aria-hidden", String(reveal <= .15)); }
        scene.style.setProperty("--opening-progress", String(imageProgress));
        scene.style.setProperty("--opening-model", String(reveal));
        scene.style.setProperty("--opening-wordmark", String(Math.min(1, p / .25)));
        scene.style.setProperty("--opening-copy", String(1 - reveal));
        scene.dispatchEvent(new CustomEvent("rose-opening-progress", { detail: p }));
      };
      const measure = () => {
        const stage = sticky.getBoundingClientRect(), box = visual.getBoundingClientRect();
        const mobile = innerWidth <= 760;
        const scale = Math.max(stage.width / photo.offsetWidth, stage.height / photo.offsetHeight) * (mobile ? 1.02 : 1.12);
        const x = stage.left + stage.width * (mobile ? .5 : .42) - box.left - photo.offsetLeft - photo.offsetWidth / 2;
        scene.style.setProperty("--opening-scale", String(scale));
        scene.style.setProperty("--opening-x", `${x}px`);
        scene.style.setProperty("--opening-y", `${stage.top - box.top - photo.offsetTop}px`);
        frame();
      };
      measure();
      const tween = gsap.fromTo(state, { p: 0 }, { p: 1, ease: "none", onUpdate: frame,
        scrollTrigger: { trigger: scene, start: () => `top top+=${parseFloat(getComputedStyle(sticky).top)}`, end: "bottom bottom", scrub: .4, onRefresh: measure }
      });
      let disposed = false;
      document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(true); });
      const resize = new ResizeObserver(() => { if (!disposed) { measure(); ScrollTrigger.refresh(true); } });
      resize.observe(sticky);
      resize.observe(photo);
      return () => {
        disposed = true;
        resize.disconnect();
        tween.scrollTrigger?.kill(); tween.kill();
        scene.dataset.motion = "false";
        delete scene.dataset.progress;
        delete scene.dataset.phase;
        const fabric = scene.querySelector<HTMLElement>(".opening-fabric");
        if (fabric) { fabric.inert = false; fabric.removeAttribute("aria-hidden"); }
        ["--opening-progress", "--opening-scale", "--opening-x", "--opening-y", "--opening-model", "--opening-wordmark", "--opening-copy"].forEach(n => scene.style.removeProperty(n));
      };
    });
    return () => media.revert();
  }, [language, scrollAnimationsEnabled, Boolean(model), subtle]);
  return <div ref={root} className="rose-opening" data-motion="false" data-model={Boolean(model)} data-intensity={subtle ? "subtle" : "cinematic"}>
    <div className="rose-opening-sticky">
      <span className="opening-wordmark" aria-hidden="true">{language === "ar" ? "استبرق" : "Estabrek"}</span>
      {children}
      {model && <div className="opening-fabric">{model}</div>}
    </div>
  </div>;
}
