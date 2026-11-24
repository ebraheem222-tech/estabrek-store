"use client";
/**
 * A section's WebGL background (shader.ts, shaderGlsl.ts): the theme library's shader host made the editor's own.
 * It holds a WebGL context only while the section is near the screen (browsers allow about sixteen per page), draws
 * at a lowered resolution, follows the pointer over the section when asked, and shows one still frame to whoever
 * asked for less motion (or without WebGL, its colours as a gradient). The section's content stays on top and keeps
 * every click.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { SHADERS, SHADER_HEAD } from "./shaderGlsl";
import type { ShaderSpec } from "./shader";

type Rgb = [number, number, number];
const hexRgb = (h: string): Rgb => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

/** A CSS colour (a theme variable, a #hex) as the shader takes it, read where it's drawn. */
function rgbOf(probe: HTMLElement, css: string | undefined, fallback: string): Rgb {
  if (!css) return hexRgb(fallback);
  if (/^#[0-9a-f]{6}$/i.test(css)) return hexRgb(css);
  probe.style.color = "";
  probe.style.color = css;
  const m = getComputedStyle(probe).color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  return m ? [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255] : hexRgb(fallback);
}

/** Film grain: fine noise over the colours. */
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

export function ShaderView({ spec, colours }: { spec: ShaderSpec; colours: { bg?: string; c1?: string; c2?: string; c3?: string } }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "running" | "still" | "none">("idle");
  const def = SHADERS[spec.kind];
  const rainbow = spec.rainbow ?? Boolean(def?.rainbow);
  useEffect(() => {
    const el = box.current;
    if (!el || !def) return;
    const host = el.parentElement ?? el;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const probe = document.createElement("span");
    probe.style.display = "none";
    el.appendChild(probe);
    const col = { bg: rgbOf(probe, colours.bg, def.bg), c1: rgbOf(probe, colours.c1, def.c1), c2: rgbOf(probe, colours.c2, def.c2), c3: rgbOf(probe, colours.c3, def.c3) };
    probe.remove();
    let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      ty = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
    };
    if (spec.mouse && !still) host.addEventListener("pointermove", onMove);
    const born = performance.now();

    /** A fresh canvas and context, drawing; returns what takes them down (a released context can't be reused). */
    const start = (): (() => void) | null => {
      const c = document.createElement("canvas");
      c.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
      el.appendChild(c);
      const gl = c.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: still });
      const fail = () => {
        c.remove();
        setState("none");
        return null;
      };
      if (!gl) return fail();
      const compile = (type: number, src: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }"));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, SHADER_HEAD + def.frag));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return fail();
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const u = (n: string) => gl.getUniformLocation(prog, n);
      const uT = u("u_time"), uR = u("u_res"), uM = u("u_mouse");
      gl.uniform3fv(u("u_bg"), col.bg);
      gl.uniform3fv(u("u_c1"), col.c1);
      gl.uniform3fv(u("u_c2"), col.c2);
      gl.uniform3fv(u("u_c3"), col.c3);
      gl.uniform1f(u("u_rainbow"), rainbow ? 1 : 0);
      const draw = (seconds: number) => {
        gl.uniform1f(uT, seconds);
        gl.uniform2f(uR, c.width, c.height);
        gl.uniform2f(uM, mx, my);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      };
      // A still moment that shows the shader well (not its first, plain one).
      const stillAt = 6;
      const size = () => {
        const dpr = Math.min(1.5, window.devicePixelRatio || 1) * 0.75;
        c.width = Math.max(1, Math.round(c.clientWidth * dpr));
        c.height = Math.max(1, Math.round(c.clientHeight * dpr));
        gl.viewport(0, 0, c.width, c.height);
        if (still) draw(stillAt);
      };
      size();
      const ro = new ResizeObserver(size);
      ro.observe(c);
      let raf = 0;
      const loop = () => {
        mx += (tx - mx) * 0.06;
        my += (ty - my) * 0.06;
        draw(((performance.now() - born) / 1000) * spec.speed);
        raf = requestAnimationFrame(loop);
      };
      const onLost = (e: Event) => {
        e.preventDefault();
        cancelAnimationFrame(raf);
      };
      c.addEventListener("webglcontextlost", onLost);
      if (still) {
        draw(stillAt);
        setState("still");
      } else {
        loop();
        setState("running");
      }
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        c.removeEventListener("webglcontextlost", onLost);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        c.remove();
      };
    };

    let stop: (() => void) | null = null;
    const near = () => {
      const r = el.getBoundingClientRect();
      return r.bottom > -200 && r.top < window.innerHeight + 200;
    };
    if (near()) stop = start();
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !stop) stop = start();
      else if (!e.isIntersecting && stop) {
        stop();
        stop = null;
        setState("idle");
      }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => {
      io.disconnect();
      host.removeEventListener("pointermove", onMove);
      stop?.();
      stop = null;
    };
  }, [spec.kind, spec.speed, spec.mouse, rainbow, colours.bg, colours.c1, colours.c2, colours.c3, def]);

  // Without WebGL: its colours as a gradient.
  const flat: CSSProperties = state === "none" && def ? { background: `linear-gradient(135deg, ${colours.bg ?? def.bg}, ${colours.c1 ?? def.c1} 55%, ${colours.c2 ?? def.c2})` } : {};
  return (
    <div ref={box} className="pt-shader" style={flat} aria-hidden="true" data-pt-shader={spec.kind} data-shader-state={state}>
      {spec.grain > 0 ? <div className="pt-shader-grain" style={{ backgroundImage: GRAIN, opacity: spec.grain }} /> : null}
      {spec.veil > 0 ? <div className="pt-shader-veil" style={{ opacity: spec.veil }} /> : null}
    </div>
  );
}
