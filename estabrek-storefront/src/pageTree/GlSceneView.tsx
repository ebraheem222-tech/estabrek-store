"use client";
/**
 * A WebGL scene the owner built (glScene.ts), drawn by glEngine.ts: the element `glScene` (a box of its height) or a
 * section's background `gl` (behind its content, which keeps every click). It holds a WebGL context only while it is
 * near the screen (browsers allow about sixteen per page), answers the pointer over it, a press, a drag (turning it,
 * when the owner asks) and the page's scroll, and shows one still frame to whoever asked for less motion (or, without
 * WebGL, its background's colours).
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { startGl, type GlColours, type GlRun, type Rgb } from "./glEngine";
import type { GlSpec } from "./glScene";

/** The scene's colours as the page writes them (var(--accent), #hex…), read where it is drawn. */
export type GlCss = { bg: Array<string | undefined>; layers: Array<Array<string | undefined>> };

function rgbOf(probe: HTMLElement, css: string | undefined): Rgb | null {
  if (!css) return null;
  probe.style.color = "";
  probe.style.color = css;
  if (!probe.style.color) return null;
  const m = getComputedStyle(probe).color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  return m ? [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255] : null;
}

const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

export function GlSceneView({ spec, css, mode, height, label }: { spec: GlSpec; css: GlCss; mode: "element" | "bg"; height?: number; label?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "running" | "still" | "none">("idle");
  const key = JSON.stringify([spec, css, mode]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const host = mode === "bg" ? el.parentElement ?? el : el;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const probe = document.createElement("span");
    probe.style.display = "none";
    el.appendChild(probe);
    const colours: GlColours = { bg: css.bg.map((c) => rgbOf(probe, c)), layers: css.layers.map((l) => l.map((c) => rgbOf(probe, c))) };
    probe.remove();
    const look = getComputedStyle(el);
    const phone = (window.matchMedia?.("(pointer: coarse)").matches ?? false) && window.innerWidth < 820;
    let run: GlRun | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let raf = 0;
    let gone = false;
    const progress = () => {
      const r = el.getBoundingClientRect(), vh = window.innerHeight || 1;
      return Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
    };
    const start = () => {
      // A copy the page hides (another screen size's) draws nothing.
      if (run || gone || !el.clientWidth || !el.clientHeight) return;
      canvas = document.createElement("canvas");
      canvas.className = "pt-gl-canvas";
      el.prepend(canvas);
      run = startGl(canvas, spec, { colours, family: look.fontFamily, rtl: look.direction === "rtl", phone, preserve: still });
      if (!run) {
        canvas.remove();
        canvas = null;
        setState("none");
        return;
      }
      (el as HTMLDivElement & { __glRun?: GlRun }).__glRun = run;
      el.dataset.glParticles = String(run.particles);
      run.scroll(progress());
      if (still) {
        run.warm(4);
        setState("still");
        return;
      }
      const born = performance.now();
      const loop = () => {
        run?.frame((performance.now() - born) / 1000);
        raf = requestAnimationFrame(loop);
      };
      loop();
      setState("running");
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      run?.dispose();
      run = null;
      canvas?.remove();
      canvas = null;
      delete (el as HTMLDivElement & { __glRun?: GlRun }).__glRun;
    };

    // The pointer over it, a press (and a drag that turns it), the page's scroll.
    let held: { x: number; y: number; id: number } | null = null;
    const at = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return { x: (e.clientX - r.left) / Math.max(1, r.width), y: (e.clientY - r.top) / Math.max(1, r.height) };
    };
    const onMove = (e: PointerEvent) => {
      if (!run || still) return;
      const p = at(e);
      if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
        run.pointer(null, null);
        return;
      }
      run.pointer(p.x, p.y);
      if (held && held.id === e.pointerId) {
        run.drag(e.clientX - held.x, e.clientY - held.y);
        held.x = e.clientX;
        held.y = e.clientY;
      }
    };
    const onEnter = () => run?.hover(true);
    const onLeave = () => {
      run?.pointer(null, null);
      run?.hover(false);
      held = null;
    };
    const onDown = (e: PointerEvent) => {
      if (!run || still) return;
      const p = at(e);
      if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return;
      run.press(p.x, p.y);
      if (spec.camera.drag && mode === "element") held = { x: e.clientX, y: e.clientY, id: e.pointerId };
    };
    const onUp = () => {
      held = null;
    };
    const onScroll = () => run?.scroll(progress());
    if (!still) {
      host.addEventListener("pointermove", onMove);
      host.addEventListener("pointerenter", onEnter);
      host.addEventListener("pointerleave", onLeave);
      host.addEventListener("pointerdown", onDown);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    const ro = new ResizeObserver(() => run?.resize());
    ro.observe(el);

    const near = () => {
      const r = el.getBoundingClientRect();
      return r.bottom > -300 && r.top < window.innerHeight + 300;
    };
    let io: IntersectionObserver | null = null;
    const begin = () => {
      if (gone) return;
      if (near()) start();
      io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) start();
        else if (run) {
          stop();
          setState("idle");
        }
      }, { rootMargin: "300px" });
      io.observe(el);
    };
    // Words are drawn in the page's font once it has come.
    if (spec.layers.some((l) => l.shapes.includes("text")) && document.fonts?.ready) void document.fonts.ready.then(begin, begin);
    else begin();
    return () => {
      gone = true;
      io?.disconnect();
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", onScroll);
      stop();
    };
    // `key` holds everything the scene is drawn from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const style: CSSProperties = {
    ...(mode === "element" && height ? ({ "--pt-gl-h": `${height}px` } as CSSProperties) : {}),
    // Without WebGL: the background's colours.
    ...(state === "none" ? { background: `linear-gradient(160deg, ${css.bg[0] ?? "#0b0b1d"}, ${css.bg[1] ?? "#25124a"})` } : {}),
  };
  return (
    <div
      ref={box} className={mode === "bg" ? "pt-gl pt-gl-bg" : "pt-gl pt-gl-box"} style={style} data-pt-gl={mode} data-gl-state={state}
      {...(mode === "bg" ? { "aria-hidden": true } : label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      {...(spec.camera.drag && mode === "element" ? { "data-gl-drag": "" } : {})}
    >
      {spec.grain > 0 ? <div className="pt-gl-grain" style={{ backgroundImage: GRAIN, opacity: spec.grain }} /> : null}
      {spec.vignette > 0 ? <div className="pt-gl-vignette" style={{ opacity: spec.vignette }} /> : null}
      {spec.veil > 0 ? <div className="pt-gl-veil" style={{ opacity: spec.veil }} /> : null}
    </div>
  );
}
