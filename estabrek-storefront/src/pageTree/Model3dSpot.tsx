"use client";
/**
 * A page tree's 3D model in the page: its place, and its canvas (Model3dCanvas, loaded on its
 * own) only while it's near the screen, so a page with several holds only a few at once. The
 * theme colours (accent, text…) are read from the page here, since a 3D scene can't use CSS.
 * "Reduce motion" draws it still. With a link, the whole model is the link.
 */
import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { modelColours } from "@/storeThemes/three/colours";
import type { ModelColours } from "@/storeThemes/three/parts";
import type { Palette } from "@/storeThemes/colour";
import type { Model3dSpec } from "./model3d";

const Canvas3d = dynamic(() => import("./Model3dCanvas"), { ssr: false });

/**
 * At most this many 3D canvases at once (a browser allows only a few drawing contexts):
 * one more near the screen waits until another leaves.
 */
export const LIVE_3D = 6;
const live = new Set<symbol>();
const waiting: Array<{ id: symbol; wake: () => void }> = [];
function claim(id: symbol, wake: () => void): boolean {
  if (live.has(id)) return true;
  if (live.size < LIVE_3D) {
    live.add(id);
    return true;
  }
  if (!waiting.some((w) => w.id === id)) waiting.push({ id, wake });
  return false;
}
function release(id: symbol) {
  const at = waiting.findIndex((w) => w.id === id);
  if (at >= 0) waiting.splice(at, 1);
  if (live.delete(id)) waiting.shift()?.wake();
}

/** A device that can't draw 3D (no WebGL) leaves the model's place empty, never the page broken. */
class NoWebGl extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() { this.props.onError(); }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

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

type SpotProps = { spec: Model3dSpec; label?: string; href?: string; poster?: string };

/** A changed scene gets a fresh loading/error lifecycle, even when returning to a previous file. */
export function Model3dSpot(props: SpotProps) {
  return <Model3dInstance key={JSON.stringify(props.spec)} {...props} />;
}

function Model3dInstance({ spec, label, href, poster }: SpotProps) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  // Near and given one of the few canvases.
  const [held, setHeld] = useState(false);
  const me = useRef(Symbol("model3d"));
  const [seen, setSeen] = useState(false);
  const [still, setStill] = useState(false);
  const [read, setRead] = useState<Read | null>(null);
  const hovered = useRef(false);
  const progress = useRef(0);
  const key = JSON.stringify(spec);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setFailed(true), []);

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
      release(me.current);
      nearBy.disconnect();
      inView.disconnect();
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      removeEventListener("scroll", scrolled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // A canvas while near the screen and one is free; given back as it leaves.
  useEffect(() => {
    const id = me.current;
    if (!near || failed) {
      release(id);
      setHeld(false);
      setReady(false);
      return;
    }
    const wake = () => setHeld(claim(id, wake));
    setHeld(claim(id, wake));
  }, [near, failed]);

  const canvas = near && held && read && !failed ? (
    <NoWebGl key={key} onError={onError}>
      <Canvas3d spec={spec} colours={read.colours} rims={read.rims} floorTint={read.floor} active={seen} still={still} hovered={hovered} progress={progress} onReady={onReady} onError={onError} />
    </NoWebGl>
  ) : null;
  return (
    <div ref={box} className="pt-model3d-stage" data-near={near ? "" : undefined} data-model-state={failed ? "fallback" : ready ? "ready" : "loading"} aria-busy={!ready && !failed} {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
      {canvas}
      {!ready || failed ? poster ? <img className="pt-model3d-poster" src={poster} alt="" loading="lazy" /> : <span className="pt-model3d-fallback" aria-hidden="true">{label || "3D"}</span> : null}
      {href ? <a className="pt-model3d-link" href={href} aria-label={label || undefined} /> : null}
    </div>
  );
}
