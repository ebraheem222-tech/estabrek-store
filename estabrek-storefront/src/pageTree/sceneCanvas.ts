import type { SceneSpec } from "./scene";
type Pointer = { x: number; y: number } | null;
const TAU = Math.PI * 2;
const seed = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const wrap = (n: number, max: number) => ((n % max) + max) % max;

/** Distinct drawings, each deterministic at a given time (including the still frame). */
export function drawScene(ctx: CanvasRenderingContext2D, spec: SceneSpec, width: number, height: number, time: number, pointer: Pointer, primary: string, secondary: string): void {
  ctx.clearRect(0, 0, width, height);
  if (!width || !height || spec.intensity === 0) return;
  const t = time * spec.speed, n = spec.amount, size = Math.min(width, height);
  const p = spec.interactive ? pointer : null, dx = p ? (p.x - .5) * width : 0, dy = p ? (p.y - .5) * height : 0;
  const alpha = Math.min(1, spec.intensity * .75);
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = "round";
  const dot = (x: number, y: number, r: number) => { ctx.beginPath(); ctx.arc(x, y, Math.max(.2, r), 0, TAU); ctx.fill(); };
  const line = (ax: number, ay: number, bx: number, by: number) => { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); };
  switch (spec.kind) {
    case "constellation": {
      const dots = Array.from({ length: n }, (_, i) => {
        let x = wrap(seed(i + 1) * width + Math.sin(t * .15 + i) * 26, width), y = wrap(seed(i + 101) * height + Math.cos(t * .12 + i) * 22, height);
        if (p) { const ax = x - p.x * width, ay = y - p.y * height, dist = Math.hypot(ax, ay), push = Math.max(0, 1 - dist / 160) * 40; x += ax / Math.max(1, dist) * push + dx * .015; y += ay / Math.max(1, dist) * push + dy * .015; }
        return { x, y };
      });
      ctx.strokeStyle = primary; ctx.lineWidth = .8;
      const reach = Math.min(160, size * .4);
      dots.forEach((a, i) => dots.slice(i + 1).forEach((b) => { const dist = Math.hypot(a.x - b.x, a.y - b.y); if (dist < reach) { ctx.globalAlpha = alpha * .4 * (1 - dist / reach); line(a.x, a.y, b.x, b.y); } }));
      ctx.globalAlpha = alpha; ctx.fillStyle = secondary;
      dots.forEach((point, i) => dot(point.x, point.y, 1.2 + seed(i + 400) * 1.6));
      break;
    }
    case "orbs": {
      for (let i = 0; i < n; i++) {
        const r = size * (.035 + seed(i + 40) * .1), x = seed(i + 3) * width + Math.sin(t * .2 + i) * r + dx * .12, y = seed(i + 61) * height + Math.cos(t * .16 + i) * r + dy * .12;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, i % 2 ? primary : secondary); gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient; ctx.globalAlpha = alpha * .3; dot(x, y, r);
      }
      break;
    }
    case "waves": {
      const layers = Math.max(3, Math.round(n / 4));
      for (let i = 0; i < layers; i++) {
        const base = height * (.35 + i / layers * .6) + dy * .04;
        ctx.beginPath(); ctx.moveTo(0, height);
        for (let x = 0; x <= width + 12; x += 12) {
          const y = base + Math.sin(x / Math.max(50, width * .16) + t * .7 + i * .6 + dx / width) * size * .065 * spec.intensity + Math.cos(x / Math.max(80, width * .27) - t * .4) * size * .025;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height); ctx.closePath(); ctx.fillStyle = i % 2 ? primary : secondary; ctx.globalAlpha = alpha * .12; ctx.fill();
      }
      break;
    }
    case "grid": {
      const horizon = height * .3 + dy * .12, center = width * .5 + dx * .16, lines = Math.max(4, Math.round(n / 2));
      ctx.strokeStyle = primary; ctx.lineWidth = 1; ctx.globalAlpha = alpha * .38;
      for (let i = -lines; i <= lines; i++) line(center + i * 6, horizon, center + i * width / lines, height);
      ctx.strokeStyle = secondary;
      for (let i = 0; i < lines; i++) { const depth = wrap(i / lines + t * .055, 1); const y = horizon + depth * depth * (height - horizon); line(0, y, width, y); }
      ctx.globalAlpha = alpha * .2; line(0, horizon, width, horizon);
      break;
    }
    case "starfield": {
      const cx = width * .5 + dx * .2, cy = height * .5 + dy * .2;
      for (let i = 0; i < n; i++) {
        const z = .15 + wrap(seed(i + 100) - t * .07, 1) * 1.85, x = (seed(i + 7) - .5) * width / z + cx, y = (seed(i + 86) - .5) * height / z + cy;
        ctx.strokeStyle = i % 3 ? primary : secondary; ctx.fillStyle = secondary; ctx.lineWidth = 1.2 / z; ctx.globalAlpha = alpha * Math.min(1, 1 / z);
        line(x, y, x + (x - cx) * .025 / z, y + (y - cy) * .025 / z); dot(x, y, 1.25 / z);
      }
      break;
    }
    case "ribbons": {
      const bands = Math.max(3, Math.round(n / 5));
      for (let i = 0; i < bands; i++) {
        const y = height * (i + .5) / bands, sway = Math.sin(t * .35 + i * .7) * size * .18;
        const gradient = ctx.createLinearGradient(0, y, width, y); gradient.addColorStop(0, primary); gradient.addColorStop(1, secondary);
        ctx.beginPath(); ctx.moveTo(-width * .1, y + size * .1 + dy * .06);
        ctx.bezierCurveTo(width * .25 + dx * .14, y - size * .65 + sway, width * .65 + dx * .1, y + size * .65 - sway, width * 1.1, y - size * .1 + dy * .06);
        ctx.strokeStyle = gradient; ctx.lineWidth = 5 + seed(i + 71) * size * .045; ctx.globalAlpha = alpha * .22; ctx.stroke();
      }
      break;
    }
    case "snow": {
      for (let i = 0; i < n; i++) {
        const r = 2 + seed(i + 23) * 4, x = wrap(seed(i + 14) * width + Math.sin(t * .4 + i) * 18 + dx * .08, width), y = wrap(seed(i + 91) * height + t * (10 + seed(i + 62) * 18) + dy * .04, height);
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * .12 + i); ctx.strokeStyle = i % 3 ? secondary : primary; ctx.lineWidth = .8; ctx.globalAlpha = alpha * (.35 + seed(i) * .6);
        for (let branch = 0; branch < 3; branch++) { const angle = branch * Math.PI / 3; line(-Math.cos(angle) * r, -Math.sin(angle) * r, Math.cos(angle) * r, Math.sin(angle) * r); }
        ctx.restore();
      }
      break;
    }
    case "fireworks": {
      const bursts = Math.max(2, Math.round(n / 8));
      for (let burst = 0; burst < bursts; burst++) {
        const age = wrap(t * .22 + seed(burst + 13), 1), radius = age * size * .4, x = width * (.15 + seed(burst + 20) * .7) + dx * .1, y = height * (.15 + seed(burst + 45) * .6) + dy * .1 + age * age * size * .12;
        ctx.strokeStyle = burst % 2 ? primary : secondary; ctx.lineWidth = 1.4; ctx.globalAlpha = alpha * (1 - age);
        for (let spark = 0; spark < 20; spark++) { const angle = spark / 20 * TAU + burst, reach = radius * (.6 + seed(spark + burst * 20) * .4); line(x + Math.cos(angle) * reach * .83, y + Math.sin(angle) * reach * .83, x + Math.cos(angle) * reach, y + Math.sin(angle) * reach); }
      }
      break;
    }
    case "matrix": {
      const glyphs = "01アイウエオカキクケコサシスセソタチツテト";
      const fontSize = Math.max(12, Math.min(20, size * .04)), step = fontSize * 1.35;
      // At most 100 columns × 18 glyphs, regardless of the section's dimensions.
      const columns = Math.max(1, Math.min(100, n, Math.floor(width / (fontSize * 1.4))));
      const trail = Math.max(3, Math.min(18, Math.ceil(height / step * .45)));
      const span = height + trail * step;
      ctx.font = `${fontSize}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let column = 0; column < columns; column++) {
        const x = (column + .5) / columns * width + dx * .035;
        const head = wrap(seed(column + 31) * span + t * (24 + seed(column + 17) * 42) + dy * .025, span);
        const change = Math.floor(t * (2 + seed(column + 70) * 4));
        for (let index = 0; index < trail; index++) {
          const y = head - index * step;
          if (y < -fontSize || y >= height) continue;
          const glyph = glyphs[Math.floor(seed(column * 43 + index * 7 + change + 500) * glyphs.length)];
          ctx.fillStyle = index === 0 ? secondary : primary;
          ctx.globalAlpha = alpha * (index === 0 ? .95 : .6 * (1 - index / trail));
          ctx.fillText(glyph, x, y);
        }
      }
      break;
    }
  }
  ctx.restore();
}

/** Owns one section only. Nothing is scheduled until that section enters the viewport. */
export function mountScene(canvas: HTMLCanvasElement, spec: SceneSpec): () => void {
  const host = canvas.parentElement;
  if (!host) return () => {};
  let disposed = false, visible = typeof IntersectionObserver === "undefined", activated = false, frame = 0, elapsed = 0, last = 0, width = 0, height = 0, pointer: Pointer = null;
  let ctx: CanvasRenderingContext2D | null = null, primary = "#8b5cf6", secondary = "#38bdf8";
  const media = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  canvas.dataset.sceneState = "idle";
  const stop = () => { if (frame) cancelAnimationFrame(frame); frame = 0; last = 0; };
  const measure = () => {
    const rect = host.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    const dpr = Math.min(2, Math.max(1, devicePixelRatio || 1), 4096 / width, 4096 / height);
    canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr));
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    const style = getComputedStyle(canvas); primary = style.color || "#8b5cf6"; secondary = style.borderTopColor || "#38bdf8";
  };
  const paint = () => { if (ctx) drawScene(ctx, spec, width, height, elapsed, media?.matches ? null : pointer, primary, secondary); };
  const tick = (now: number) => {
    frame = 0;
    if (disposed || !visible || document.hidden || media?.matches || spec.speed === 0) return;
    if (last) elapsed += Math.min(.05, Math.max(0, (now - last) / 1000));
    last = now; paint(); frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    if (disposed) return;
    stop();
    if (!visible || document.hidden) { canvas.dataset.sceneState = activated ? "paused" : "idle"; return; }
    if (!activated) { ctx = canvas.getContext("2d"); activated = true; measure(); }
    if (!ctx) { canvas.dataset.sceneState = "unsupported"; return; }
    paint();
    canvas.dataset.sceneState = media?.matches || spec.speed === 0 ? "static" : "running";
    if (canvas.dataset.sceneState === "running") frame = requestAnimationFrame(tick);
  };
  const onResize = () => { if (disposed || !activated) return; measure(); if (visible && !document.hidden) paint(); };
  const observer = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((entries) => { if (disposed) return; visible = entries.some((entry) => entry.isIntersecting); sync(); }, { threshold: 0 }) : null;
  const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
  const onPointer = (event: PointerEvent) => {
    if (disposed || !visible || document.hidden || media?.matches || spec.speed === 0) return;
    const rect = host.getBoundingClientRect(); pointer = { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width))), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height))) };
  };
  const onLeave = () => { pointer = null; };
  observer?.observe(host); resize?.observe(host);
  if (!resize) window.addEventListener("resize", onResize, { passive: true });
  document.addEventListener("visibilitychange", sync);
  media?.addEventListener("change", sync);
  if (spec.interactive) { host.addEventListener("pointermove", onPointer, { passive: true }); host.addEventListener("pointerleave", onLeave, { passive: true }); }
  if (visible) sync();
  return () => {
    disposed = true; stop(); observer?.disconnect(); resize?.disconnect();
    window.removeEventListener("resize", onResize); document.removeEventListener("visibilitychange", sync); media?.removeEventListener("change", sync);
    host.removeEventListener("pointermove", onPointer); host.removeEventListener("pointerleave", onLeave);
    ctx = null; pointer = null;
  };
}
