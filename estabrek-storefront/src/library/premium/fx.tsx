// @ts-nocheck
/* eslint-disable */
// Made by scripts/library/convert.mjs from the owner's Themes folder (Premium/src/fx.jsx): do not edit.
/* Effects engine for the Premium sections: a tiny WebGL shader renderer and a 2D canvas loop.
   Both pause when they scroll off screen and clean up after themselves. No extra libraries. */
import { useEffect, useId, useRef, useState } from "react";

/** GLSL helpers you can paste into any fragment shader: hash, value noise, fbm. */
export const NOISE = `
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
`;
const HEADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
`;

/**
 * Full-bleed fragment shader. Uniforms: u_time (seconds), u_res (pixels), u_mouse (0..1, eased).
 * Falls back to `fallback` classes if WebGL isn't available.
 *
 * It only holds a WebGL context while it is near the screen. Browsers allow about 16 live contexts
 * per page, so a long page full of shaders would otherwise start losing the oldest ones.
 */
export function Shader({
  frag,
  className = "absolute inset-0 size-full",
  fallback = "bg-linear-to-br from-indigo-950 via-fuchsia-950 to-black",
  scale = 0.75
}) {
  const ref = useRef(null);
  const [ok, setOk] = useState(true);
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const host = box.parentElement;
    let mx = 0.5,
      my = 0.5,
      tx = 0.5,
      ty = 0.5;
    const onMove = e => {
      const r = box.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width;
      ty = 1 - (e.clientY - r.top) / r.height;
    };
    host.addEventListener("pointermove", onMove);
    const born = performance.now();

    // Builds a fresh canvas + context and starts drawing. Returns a function that tears it all down.
    // A fresh canvas every time: a context we released can't be reused (React may also run this twice).
    const start = () => {
      const c = document.createElement("canvas");
      c.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
      box.appendChild(c);
      const gl = c.getContext("webgl", {
        antialias: false,
        alpha: false,
        powerPreference: "high-performance"
      });
      const fail = () => {
        c.remove();
        setOk(false);
        return null;
      };
      if (!gl) return fail();
      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s));
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }"));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, HEADER + frag));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return fail();
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const uT = gl.getUniformLocation(prog, "u_time");
      const uR = gl.getUniformLocation(prog, "u_res");
      const uM = gl.getUniformLocation(prog, "u_mouse");
      const size = () => {
        const dpr = Math.min(1.5, window.devicePixelRatio || 1) * scale;
        c.width = Math.max(1, Math.round(c.clientWidth * dpr));
        c.height = Math.max(1, Math.round(c.clientHeight * dpr));
        gl.viewport(0, 0, c.width, c.height);
      };
      size();
      const ro = new ResizeObserver(size);
      ro.observe(c);
      let raf;
      const loop = () => {
        mx += (tx - mx) * 0.06;
        my += (ty - my) * 0.06;
        gl.uniform1f(uT, (performance.now() - born) / 1000);
        gl.uniform2f(uR, c.width, c.height);
        gl.uniform2f(uM, mx, my);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        raf = requestAnimationFrame(loop);
      };
      const onLost = e => {
        e.preventDefault();
        cancelAnimationFrame(raf);
      };
      c.addEventListener("webglcontextlost", onLost);
      loop();
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        c.removeEventListener("webglcontextlost", onLost);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        c.remove();
      };
    };
    let stop = null;
    const r = box.getBoundingClientRect();
    if (r.bottom > -200 && r.top < window.innerHeight + 200) stop = start();
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !stop) stop = start();else if (!e.isIntersecting && stop) {
        stop();
        stop = null;
      }
    }, {
      rootMargin: "200px"
    });
    io.observe(box);
    return () => {
      io.disconnect();
      host.removeEventListener("pointermove", onMove);
      stop?.();
      stop = null;
    };
  }, [frag, scale]);
  return ok ? <div ref={ref} className={className} /> : <div className={`${className} ${fallback}`} />;
}

/**
 * 2D canvas loop. `draw(ctx, t, w, h, state)` runs every frame while visible.
 * `state` is a plain object that lives as long as the component — keep particles etc. in it.
 * Returns a ref for the <canvas> (it fills its box; size it with CSS).
 */
export function useCanvas(draw) {
  const ref = useRef(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const state = useRef({});
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!ctx) return; // no canvas, or it already holds another kind of context
    let w = 0,
      h = 0,
      raf,
      visible = true;
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = Math.max(1, Math.round(w * dpr));
      c.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.current.resized = true;
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(c);
    const start = performance.now();
    const loop = () => {
      cancelAnimationFrame(raf);
      if (!visible) return;
      drawRef.current(ctx, (performance.now() - start) / 1000, w, h, state.current);
      state.current.resized = false;
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) loop();
    }, {
      rootMargin: "120px"
    });
    io.observe(c);
    loop();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);
  return [ref, state];
}

/** Pointer position relative to an element, in pixels (null when outside). */
export function usePointer(ref) {
  const p = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const move = e => {
      const r = el.getBoundingClientRect();
      p.current = {
        x: e.clientX - r.left,
        y: e.clientY - r.top
      };
    };
    const leave = () => p.current = null;
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [ref]);
  return p;
}

/** Film-grain overlay, drawn with an SVG turbulence filter. */
export function Grain({
  opacity = 0.08
}) {
  const id = `grain${useId().replace(/:/g, "")}`;
  return <svg className="pointer-events-none absolute inset-0 size-full mix-blend-overlay" style={{
    opacity
  }} aria-hidden="true">
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>;
}
