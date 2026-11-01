"use client";
/**
 * A page tree's 3D model in the page: its place, and its canvas (Model3dCanvas, loaded on its
 * own) only while it's near the screen, so a page with several holds only a few at once. The
 * theme colours (accent, text…) are read from the page here, since a 3D scene can't use CSS.
 * "Reduce motion" draws it still. With a link, the whole model is the link.
 */
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { modelColours } from "@/storeThemes/three/colours";
import type { ModelColours } from "@/storeThemes/three/parts";
import type { Palette } from "@/storeThemes/colour";
import type { Model3dSpec } from "./model3d";

const Canvas3d = dynamic(() => import("./Model3dCanvas"), { ssr: false });

/** A colour as the page draws it (a theme colour through its CSS variable), as #rrggbb. */
function readColour(probe: HTMLElement, value: string): string {
  const fixed: Record<string, string> = { white: "#ffffff", black: "#000000", transparent: "#000000" };
  probe.style.color = /^#/.test(value) ? value : fixed[value] ?? `var(--${value})`;
  const m = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return "#888888";
  return `#${m.slice(0, 3).map((n) => Math.round(Number(n)).toString(16).padStart(2, "0")).join("")}`;
}

type Read = { colours: ModelColours; rims: [string, string]; floor: string };
function readPage(el: HTMLElement, spec: Model3dSpec): Read {
  const probe = document.createElement("span");
  probe.style.display = "none";
  el.appendChild(probe);
  const c = (v: string) => readColour(probe, v);
  // The page's colours as a palette, for the model's default colours in its finish.
  const palette: Palette = { bg: c("bg"), surface: c("surface"), soft: c("accent-soft"), line: c("border"), glow: c("accent-soft"), muted: c("muted"), accent: c("accent"), strong: c("accent"), ink: c("text"), onStrong: c("accent-contrast") };
  const own = Object.fromEntries(Object.entries(spec.colours).map(([k, v]) => [k, c(v)]));
  const read: Read = { colours: { ...modelColours(palette, spec.finish), ...own }, rims: [c(spec.lights.colours[0]), c(spec.lights.colours[1])], floor: c(spec.floor === "grid" ? "border" : "accent-soft") };
  probe.remove();
  return read;
}

export function Model3dSpot({ spec, label, href }: { spec: Model3dSpec; label?: string; href?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [seen, setSeen] = useState(false);
  const [still, setStill] = useState(false);
  const [read, setRead] = useState<Read | null>(null);
  const hovered = useRef(false);
  const progress = useRef(0);
  const key = JSON.stringify(spec);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setRead(readPage(el, spec));
    // Near (a screen away): it has a canvas. Seen: it moves.
    const nearBy = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "100% 0px" });
    const inView = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.05 });
    nearBy.observe(el);
    inView.observe(el);
    const enter = () => (hovered.current = true);
    const leave = () => (hovered.current = false);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    // With the scroll: 0 as it comes up the screen, 1 as it leaves at the top.
    const scrolled = () => {
      const r = el.getBoundingClientRect();
      progress.current = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
    };
    if (spec.anim.trigger === "scroll") {
      scrolled();
      addEventListener("scroll", scrolled, { passive: true });
    }
    return () => {
      nearBy.disconnect();
      inView.disconnect();
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      removeEventListener("scroll", scrolled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const canvas = near && read ? (
    <Canvas3d spec={spec} colours={read.colours} rims={read.rims} floorTint={read.floor} active={seen} still={still} hovered={hovered} progress={progress} />
  ) : null;
  return (
    <div ref={box} className="pt-model3d-stage" data-near={near ? "" : undefined} {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
      {canvas}
      {href ? <a className="pt-model3d-link" href={href} aria-label={label || undefined} /> : null}
    </div>
  );
}
