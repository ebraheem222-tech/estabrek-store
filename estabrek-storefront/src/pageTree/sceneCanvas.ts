import type { MoreSceneKind, SceneSpec } from "./scene";
type Pointer = { x: number; y: number } | null;
const TAU = Math.PI * 2;
const seed = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const wrap = (n: number, max: number) => ((n % max) + max) % max;

/* ------------------------------------------------------------------------------------------
 * Forty more original backgrounds (aurora … gems). Each is deterministic for a moment in time,
 * only follows the pointer when the section asks for it (dx/dy/p are zero/null otherwise), keeps
 * every number finite and bounds its own workload whatever the section's size (tilings pick a
 * cell size from the area, loops are capped). Kept in this one file: tests load it standalone.
 * ---------------------------------------------------------------------------------------- */
export type SceneEnv = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** Time × the scene's speed, in seconds. */
  t: number;
  /** The scene's amount (8–100). */
  n: number;
  size: number;
  /** The pointer inside the section (0–1), only for interactive scenes. */
  p: { x: number; y: number } | null;
  /** The pointer's offset from the middle, in pixels (0 without a pointer). */
  dx: number;
  dy: number;
  alpha: number;
  intensity: number;
  primary: string;
  secondary: string;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const circle = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => { ctx.beginPath(); ctx.arc(x, y, Math.max(.2, r), 0, TAU); };
const polygon = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number, rot: number) => {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) { const a = rot + i / sides * TAU; if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
};
const starPath = (ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number, points: number, rot: number) => {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) { const r = i % 2 ? inner : outer, a = rot + i / (points * 2) * TAU; if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
};
/** A soft round light. */
const glow = (e: SceneEnv, x: number, y: number, r: number, color: string, a: number) => {
  const g = e.ctx.createRadialGradient(x, y, 0, x, y, Math.max(.5, r));
  g.addColorStop(0, color); g.addColorStop(1, "transparent");
  e.ctx.fillStyle = g; e.ctx.globalAlpha = clamp(a, 0, 1); circle(e.ctx, x, y, r); e.ctx.fill();
};
/** A cell size that keeps a tiling under `cells` pieces however big the section is. */
const cellFor = (e: SceneEnv, cells: number, min: number) => Math.max(min, Math.sqrt(e.width * e.height / Math.max(1, cells)));

type Draw = (e: SceneEnv) => void;

export const MORE_SCENES: Record<MoreSceneKind, Draw> = {
  aurora(e) {
    const { ctx, width, height, t } = e, bands = 3 + Math.round(e.n / 16), steps = 28;
    for (let b = 0; b < bands; b++) {
      const base = height * (.22 + .14 * b / bands) + e.dy * .05, amp = height * .1, top: number[] = [];
      for (let i = 0; i <= steps; i++) top.push(base + Math.sin(i * .5 + t * .5 + b * 1.7) * amp * .6 + Math.sin(i * .17 - t * .3 + b) * amp + e.dx * .03 * (b + 1) * Math.sin(i * .3));
      const g = ctx.createLinearGradient(0, base - amp * 1.6, 0, base + height * .55);
      g.addColorStop(0, "transparent"); g.addColorStop(.3, b % 2 ? e.primary : e.secondary); g.addColorStop(1, "transparent");
      ctx.beginPath();
      top.forEach((y, i) => { const x = i / steps * width; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      for (let i = steps; i >= 0; i--) ctx.lineTo(i / steps * width, top[i] + height * (.32 + .1 * Math.sin(t * .2 + i * .3 + b)));
      ctx.closePath(); ctx.fillStyle = g; ctx.globalAlpha = e.alpha * .26; ctx.fill();
    }
  },
  bokeh(e) {
    const { ctx, width, height, t } = e;
    for (let i = 0; i < e.n; i++) {
      const depth = .3 + seed(i + 70), r = e.size * (.025 + seed(i + 5) * .08) * depth;
      const x = wrap(seed(i + 1) * width + Math.sin(t * .1 + i) * 30 + e.dx * .08 * depth, width), y = wrap(seed(i + 11) * height + Math.cos(t * .08 + i) * 24 + e.dy * .08 * depth, height);
      const g = ctx.createRadialGradient(x, y, r * .15, x, y, r);
      const c = i % 3 ? e.primary : e.secondary;
      g.addColorStop(0, c); g.addColorStop(.78, c); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.globalAlpha = e.alpha * (.1 + seed(i + 9) * .16); circle(ctx, x, y, r); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.globalAlpha = e.alpha * .12; circle(ctx, x, y, r * .92); ctx.stroke();
    }
  },
  fireflies(e) {
    const { ctx, width, height, t } = e;
    for (let i = 0; i < e.n; i++) {
      let x = wrap(seed(i + 3) * width + Math.sin(t * .3 * (.5 + seed(i + 9)) + i * 2) * 60 + Math.sin(t * .7 + i) * 14, width);
      let y = wrap(seed(i + 41) * height + Math.cos(t * .25 * (.5 + seed(i + 19)) + i) * 50, height);
      if (e.p) { x += (e.p.x * width - x) * .12; y += (e.p.y * height - y) * .12; }
      const pulse = .5 + .5 * Math.sin(t * 2 * (.6 + seed(i + 30)) + i);
      glow(e, x, y, 5 + 12 * pulse, i % 4 ? e.primary : e.secondary, e.alpha * (.2 + .55 * pulse));
      ctx.fillStyle = e.secondary; ctx.globalAlpha = e.alpha * (.4 + .6 * pulse); circle(ctx, x, y, 1.3); ctx.fill();
    }
  },
  petals(e) {
    const { ctx, width, height, t } = e;
    for (let i = 0; i < e.n; i++) {
      const r = 5 + seed(i + 4) * 8;
      const x = wrap(seed(i + 2) * width + t * (14 + seed(i + 8) * 16) + Math.sin(t * .5 + i) * 40 + e.dx * .08, width + 40) - 20;
      const y = wrap(seed(i + 50) * height + t * (18 + seed(i + 7) * 22) + e.dy * .04, height + 40) - 20;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * (.4 + seed(i + 11)) + i); ctx.scale(1, .35 + .65 * Math.abs(Math.sin(t * .9 + i)));
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.bezierCurveTo(r * 1.1, -r * .6, r * .7, r * .9, 0, r); ctx.bezierCurveTo(-r * .7, r * .9, -r * 1.1, -r * .6, 0, -r); ctx.closePath();
      ctx.fillStyle = i % 3 ? e.primary : e.secondary; ctx.globalAlpha = e.alpha * .5; ctx.fill();
      ctx.restore();
    }
  },
  bubbles(e) {
    const { ctx, width, height, t } = e;
    for (let i = 0; i < e.n; i++) {
      const r = 4 + seed(i + 4) * e.size * .05;
      const x = wrap(seed(i + 8) * width + Math.sin(t * .8 + i) * 12 + e.dx * .05, width);
      const y = wrap(seed(i + 60) * height - t * (16 + seed(i + 2) * 30) + e.dy * .03, height + r * 2) - r;
      ctx.strokeStyle = i % 2 ? e.primary : e.secondary; ctx.lineWidth = 1.2; ctx.globalAlpha = e.alpha * .45; circle(ctx, x, y, r); ctx.stroke();
      ctx.fillStyle = e.secondary; ctx.globalAlpha = e.alpha * .1; ctx.fill();
      ctx.fillStyle = e.secondary; ctx.globalAlpha = e.alpha * .55; circle(ctx, x - r * .38, y - r * .38, r * .2); ctx.fill();
    }
  },
  rain(e) {
    const { ctx, width, height, t } = e, slant = .22 + e.dx / Math.max(1, width) * .3, drops = Math.min(200, e.n * 2);
    for (let i = 0; i < drops; i++) {
      const len = 10 + seed(i) * 22, speed = 280 + seed(i + 3) * 220;
      const x = wrap(seed(i + 13) * width * 1.3 + t * speed * slant, width * 1.3) - width * .15, y = wrap(seed(i + 70) * height + t * speed + e.dy * .05, height + len) - len;
      ctx.strokeStyle = i % 4 ? e.primary : e.secondary; ctx.lineWidth = .8 + seed(i + 5) * .8; ctx.globalAlpha = e.alpha * .35;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - slant * len, y - len); ctx.stroke();
    }
    for (let i = 0; i < Math.round(e.n / 3); i++) {
      const age = wrap(t * 1.4 + seed(i + 90), 1), x = seed(i + 91) * width;
      ctx.strokeStyle = e.secondary; ctx.lineWidth = 1; ctx.globalAlpha = e.alpha * (1 - age) * .4;
      ctx.beginPath(); ctx.ellipse(x, height - 6, Math.max(.2, age * 14), Math.max(.2, age * 3.5), 0, 0, TAU); ctx.stroke();
    }
  },
  confetti(e) {
    const { ctx, width, height, t } = e;
    for (let i = 0; i < e.n; i++) {
      const w = 5 + seed(i + 1) * 7, h = 3 + seed(i + 2) * 4;
      const x = wrap(seed(i + 21) * width + Math.sin(t * .9 + i) * 30 + e.dx * .07, width);
      const y = wrap(seed(i + 33) * height + t * (40 + seed(i + 5) * 50) + e.dy * .03, height + 20) - 10;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * (1 + seed(i + 44) * 2) + i); ctx.scale(Math.cos(t * 2.3 + i) * .9 + .1, 1);
      ctx.fillStyle = i % 2 ? e.primary : e.secondary; ctx.globalAlpha = e.alpha * (.45 + seed(i + 6) * .4);
      if (i % 5 === 0) { circle(ctx, 0, 0, h * .8); ctx.fill(); } else ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
  },
  honeycomb(e) {
    const { ctx, width, height, t } = e, s = cellFor(e, Math.min(700, 160 + e.n * 6), 14) / 1.6, w = Math.sqrt(3) * s, h = 1.5 * s;
    const cols = Math.ceil(width / w) + 1, rows = Math.ceil(height / h) + 1;
    if (cols * rows > 1400) return;
    const cx = e.p ? e.p.x * width : width * (.5 + .3 * Math.sin(t * .2)), cy = e.p ? e.p.y * height : height * (.5 + .3 * Math.cos(t * .17));
    ctx.lineWidth = 1;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * w + (r % 2 ? w / 2 : 0), y = r * h, d = Math.hypot(x - cx, y - cy);
      const pulse = Math.pow(.5 + .5 * Math.sin(d / (e.size * .07) - t * 1.6), 4);
      polygon(ctx, x, y, s * .92, 6, Math.PI / 6);
      ctx.strokeStyle = e.primary; ctx.globalAlpha = e.alpha * .16; ctx.stroke();
      if (pulse > .05) { ctx.fillStyle = (r + c) % 3 ? e.primary : e.secondary; ctx.globalAlpha = e.alpha * pulse * .22; ctx.fill(); }
    }
  },
  dotwave(e) {
    const { ctx, width, height, t } = e, gap = cellFor(e, Math.min(1500, 300 + e.n * 12), 12);
    const cols = Math.floor(width / gap) + 1, rows = Math.floor(height / gap) + 1;
    if (cols * rows > 1800) return;
    const cx = width * .5 + e.dx * .6, cy = height * .5 + e.dy * .6;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * gap + gap / 2, y = r * gap + gap / 2, wave = Math.sin(Math.hypot(x - cx, y - cy) / (gap * 2.2) - t * 2);
      ctx.fillStyle = wave > 0 ? e.primary : e.secondary; ctx.globalAlpha = e.alpha * (.18 + .3 * (wave + 1) / 2);
      circle(ctx, x, y, gap * .11 * (1.6 + wave)); ctx.fill();
    }
  },
  topography(e) {
    const { ctx, width, height, t } = e, levels = 6 + Math.round(e.n / 8), steps = 56;
    ctx.lineWidth = .9;
    for (let c = 0; c < 3; c++) {
      const cx = width * (.2 + .3 * c + .05 * Math.sin(t * .1 + c)) + e.dx * .08, cy = height * (.35 + .3 * seed(c + 4)) + e.dy * .08, base = e.size * (.035 + .01 * c);
      for (let j = 0; j < levels; j++) {
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const a = i / steps * TAU, r = base * (j + 1) * (1 + .18 * Math.sin(a * 3 + seed(c) * 6 + t * .3 + j * .4) + .08 * Math.sin(a * 5 - t * .2));
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * .72;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.strokeStyle = j % 4 === 3 ? e.secondary : e.primary; ctx.globalAlpha = e.alpha * (j % 4 === 3 ? .4 : .22); ctx.stroke();
      }
    }
  },
  circuit(e) {
    const { ctx, width, height, t } = e, traces = 6 + Math.round(e.n / 2), unit = Math.max(14, e.size * .06);
    const ox = e.dx * .04, oy = e.dy * .04;
    for (let i = 0; i < traces; i++) {
      const pts: Array<[number, number]> = [[seed(i + 1) * width + ox, seed(i + 2) * height + oy]];
      for (let s = 0; s < 4; s++) {
        const [x, y] = pts[pts.length - 1], dir = Math.floor(seed(i * 7 + s) * 4), len = unit * (1 + Math.floor(seed(i * 5 + s + 3) * 4));
        pts.push(dir === 0 ? [x + len, y] : dir === 1 ? [x, y + len] : dir === 2 ? [x + len, y + len] : [x - len, y + len]);
      }
      ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = e.primary; ctx.lineWidth = 1.3; ctx.globalAlpha = e.alpha * .28; ctx.stroke();
      ctx.fillStyle = e.primary; for (const [x, y] of [pts[0], pts[pts.length - 1]]) { circle(ctx, x, y, 2.6); ctx.globalAlpha = e.alpha * .4; ctx.fill(); }
      // A signal running along the trace.
      const along = wrap(t * .25 + seed(i + 50), 1) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(along)), f = along - k;
      glow(e, pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f, 9, e.secondary, e.alpha * .8);
    }
  },
  lava(e) {
    const { ctx, width, height, t } = e, blobs = 4 + Math.round(e.n / 12);
    for (let i = 0; i < blobs; i++) {
      const x = width * (.12 + .76 * seed(i + 3)) + Math.sin(t * .21 + i) * width * .08 + e.dx * .1;
      const y = wrap(seed(i + 9) * height * 1.4 - t * (12 + seed(i) * 18) + e.dy * .05, height * 1.4) - height * .2;
      const r = e.size * (.12 + .16 * seed(i + 20)) * (1 + .15 * Math.sin(t * .6 + i));
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(.5, r)), c = i % 2 ? e.primary : e.secondary;
      g.addColorStop(0, c); g.addColorStop(.55, c); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.globalAlpha = e.alpha * .3; circle(ctx, x, y, r); ctx.fill();
    }
  },
  galaxy(e) {
    const { ctx, width, height, t } = e, cx = width * .5 + e.dx * .15, cy = height * .5 + e.dy * .15, stars = Math.min(500, e.n * 5), reach = e.size * .48;
    glow(e, cx, cy, e.size * .16, e.secondary, e.alpha * .5);
    for (let i = 0; i < stars; i++) {
      const arm = i % 3, dist = Math.pow(seed(i + 1), .7) * reach;
      const a = arm / 3 * TAU + dist / (e.size * .12) + t * .08 + (seed(i + 7) - .5) * .7;
      const x = cx + Math.cos(a) * dist * 1.35, y = cy + Math.sin(a) * dist * .6;
      ctx.fillStyle = i % 3 ? e.primary : e.secondary; ctx.globalAlpha = e.alpha * ((1 - dist / reach) * .75 + .15);
      circle(ctx, x, y, .6 + seed(i + 3) * 1.4); ctx.fill();
    }
  },
  tunnel(e) {
    const { ctx, width, height, t } = e, rings = 10 + Math.round(e.n / 6);
    const cx = width * .5 + e.dx * .25 + Math.sin(t * .3) * width * .04, cy = height * .5 + e.dy * .25 + Math.cos(t * .23) * height * .04;
    ctx.strokeStyle = e.primary; ctx.lineWidth = .8; ctx.globalAlpha = e.alpha * .12;
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * .05; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * e.size * 1.6, cy + Math.sin(a) * e.size * 1.6); ctx.stroke(); }
    for (let j = 0; j < rings; j++) {
      const z = wrap(j / rings - t * .12, 1), r = z * z * e.size * 1.1 + 4;
      polygon(ctx, cx, cy, r, 8, t * .1 + z * 1.2);
      ctx.strokeStyle = j % 2 ? e.primary : e.secondary; ctx.lineWidth = .5 + z * 2.2; ctx.globalAlpha = e.alpha * z * .55; ctx.stroke();
    }
  },
  sunburst(e) {
    const { ctx, width, height, t } = e, rays = 12 + Math.round(e.n / 4), cx = width * .5 + e.dx * .2, cy = height * .92 + e.dy * .1, reach = Math.hypot(width, height);
    for (let i = 0; i < rays; i++) {
      const a0 = i / rays * TAU + t * .05, a1 = a0 + TAU / rays * .5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * reach, cy + Math.sin(a0) * reach); ctx.lineTo(cx + Math.cos(a1) * reach, cy + Math.sin(a1) * reach); ctx.closePath();
      ctx.fillStyle = i % 2 ? e.primary : e.secondary; ctx.globalAlpha = e.alpha * (i % 2 ? .08 : .05); ctx.fill();
    }
    glow(e, cx, cy, e.size * .35, e.primary, e.alpha * .55);
  },
  ripples(e) {
    const { ctx, width, height, t } = e, sources = 3 + Math.round(e.n / 25);
    const at: Array<[number, number]> = Array.from({ length: sources }, (_, s) => [seed(s + 2) * width + e.dx * .1, seed(s + 8) * height + e.dy * .1]);
    if (e.p) at.push([e.p.x * width, e.p.y * height]);
    at.forEach(([x, y], s) => {
      for (let k = 0; k < 5; k++) {
        const age = wrap(t * .25 + k / 5 + seed(s + 30), 1);
        ctx.strokeStyle = (s + k) % 2 ? e.primary : e.secondary; ctx.lineWidth = .4 + 1.6 * (1 - age); ctx.globalAlpha = e.alpha * (1 - age) * .5;
        circle(ctx, x, y, age * e.size * .55); ctx.stroke();
      }
    });
  },
  flow(e) {
    const { ctx, width, height, t } = e, lines = Math.min(160, e.n * 2), step = Math.max(6, e.size * .02);
    ctx.lineWidth = .9;
    for (let i = 0; i < lines; i++) {
      let x = wrap(seed(i + 1) * width + t * 18, width), y = seed(i + 2) * height;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let s = 0; s < 18; s++) {
        const a = Math.sin(x * .006 + t * .1) * Math.cos(y * .007 - t * .08) * Math.PI + (e.dx * .002 + e.dy * .001);
        x += Math.cos(a) * step; y += Math.sin(a) * step; ctx.lineTo(x, y);
      }
      ctx.strokeStyle = i % 2 ? e.primary : e.secondary; ctx.globalAlpha = e.alpha * .22; ctx.stroke();
    }
  },
  silk(e) {
    const { ctx, width, height, t } = e, threads = 18 + Math.round(e.n / 2);
    const g = ctx.createLinearGradient(0, 0, width, height); g.addColorStop(0, e.primary); g.addColorStop(1, e.secondary);
    ctx.strokeStyle = g; ctx.lineWidth = .8;
    for (let i = 0; i < threads; i++) {
      const k = i / threads, off = (k - .5) * height * .35;
      ctx.beginPath(); ctx.moveTo(-20, height * .62 + off + e.dy * .05);
      ctx.bezierCurveTo(width * .3 + e.dx * .1, height * (.1 + .2 * Math.sin(t * .3 + k * 2)) + off, width * .6 + e.dx * .06, height * (.95 - .2 * Math.cos(t * .25 + k * 3)) + off, width + 20, height * .35 + off * .6);
      ctx.globalAlpha = e.alpha * (.12 + .25 * Math.sin(k * Math.PI)); ctx.stroke();
    }
  },
  mountains(e) {
    const { ctx, width, height, t } = e, steps = 48;
    for (let layer = 0; layer < 4; layer++) {
      const base = height * (.45 + layer * .13), shift = t * (layer + 1) * 6 + e.dx * .05 * (layer + 1);
      ctx.beginPath(); ctx.moveTo(0, height);
      for (let i = 0; i <= steps; i++) {
        const x = i / steps * width, u = (x + shift) / Math.max(60, width * .18);
        ctx.lineTo(x, base - Math.abs(Math.sin(u * 1.3 + layer * 2)) * height * .18 - Math.abs(Math.sin(u * 3.1 + layer)) * height * .06 + e.dy * .02 * layer);
      }
      ctx.lineTo(width, height); ctx.closePath();
      ctx.fillStyle = layer % 2 ? e.secondary : e.primary; ctx.globalAlpha = e.alpha * (.08 + layer * .06); ctx.fill();
    }
  },
  clouds(e) {
    const { ctx, width, height, t } = e, count = 4 + Math.round(e.n / 10);
    for (let i = 0; i < count; i++) {
      const depth = .5 + seed(i + 5) * .7, w = e.size * (.3 + .3 * seed(i + 2)) * depth;
      const x = wrap(seed(i + 3) * width * 1.4 + t * (6 + seed(i) * 10) * depth + e.dx * .06 * depth, width * 1.4) - width * .2, y = height * (.08 + .62 * seed(i + 7)) + e.dy * .03 * depth;
      for (let k = 0; k < 5; k++) glow(e, x + (k - 2) * w * .32, y - Math.sin(k / 4 * Math.PI) * w * .22, w * (.4 + .22 * Math.sin(k / 4 * Math.PI)), i % 3 ? e.primary : e.secondary, e.alpha * .42 * depth);
    }
  },
  sparkles(e) {
    const { ctx, width, height, t } = e;
    for (let i = 0; i < e.n; i++) {
      const depth = .4 + seed(i + 50), x = wrap(seed(i + 1) * width + e.dx * .05 * depth, width), y = wrap(seed(i + 2) * height + e.dy * .05 * depth, height);
      const tw = Math.max(0, Math.sin(t * 1.5 * (.5 + seed(i + 3)) + i * 1.7)), r = (4 + seed(i + 4) * 9) * (.25 + .75 * tw);
      starPath(ctx, x, y, r, r * .22, 4, t * .2 + i);
      ctx.fillStyle = i % 2 ? e.primary : e.secondary; ctx.globalAlpha = e.alpha * (.15 + .7 * tw); ctx.fill();
    }
  },
  hearts(e) {
    const { ctx, width, height, t } = e;
    for (let i = 0; i < e.n; i++) {
      const s = 6 + seed(i + 1) * 12;
      const x = wrap(seed(i + 3) * width + Math.sin(t * .7 + i) * 20 + e.dx * .06, width), y = wrap(seed(i + 9) * height - t * (14 + seed(i + 5) * 20) + e.dy * .04, height + s * 2) - s;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * .8 + i) * .3); ctx.scale(s / 16, s / 16);
      ctx.beginPath(); ctx.moveTo(0, 5); ctx.bezierCurveTo(-14, -4, -7, -15, 0, -7); ctx.bezierCurveTo(7, -15, 14, -4, 0, 5); ctx.closePath();
      ctx.fillStyle = i % 3 ? e.primary : e.secondary; ctx.globalAlpha = e.alpha * (.25 + seed(i + 8) * .35); ctx.fill();
      ctx.restore();
    }
  },
  leaves(e) {
    const { ctx, width, height, t } = e;
    for (let i = 0; i < e.n; i++) {
      const r = 7 + seed(i + 4) * 10;
      const x = wrap(seed(i + 2) * width + Math.sin(t * .6 + i) * 50 + e.dx * .08, width + 40) - 20, y = wrap(seed(i + 31) * height + t * (20 + seed(i + 6) * 20) + e.dy * .04, height + 40) - 20;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * (.3 + seed(i + 15) * .8) + i); ctx.scale(Math.cos(t * 1.1 + i) * .8 + .2, 1);
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * .75, -r * .15, 0, r); ctx.quadraticCurveTo(-r * .75, -r * .15, 0, -r); ctx.closePath();
      ctx.fillStyle = i % 2 ? e.primary : e.secondary; ctx.globalAlpha = e.alpha * .45; ctx.fill();
      ctx.strokeStyle = e.secondary; ctx.lineWidth = .7; ctx.globalAlpha = e.alpha * .35; ctx.beginPath(); ctx.moveTo(0, -r * .8); ctx.lineTo(0, r * 1.15); ctx.stroke();
      ctx.restore();
    }
  },
  lanterns(e) {
    const { ctx, width, height, t } = e, count = 6 + Math.round(e.n / 6);
    for (let i = 0; i < count; i++) {
      const w = 10 + seed(i + 1) * 12, h = w * 1.35, depth = .5 + seed(i + 20) * .7;
      const x = wrap(seed(i + 3) * width + Math.sin(t * .4 + i) * 16 + e.dx * .07 * depth, width), y = wrap(seed(i + 8) * height - t * (8 + seed(i + 4) * 10) * depth + e.dy * .04, height + h * 3) - h;
      const flicker = .8 + .2 * Math.sin(t * 6 + i * 3);
      glow(e, x, y, w * 2.6 * depth, e.primary, e.alpha * .35 * flicker);
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * .6 + i) * .08); ctx.scale(depth, depth);
      ctx.beginPath(); ctx.moveTo(-w * .4, -h / 2); ctx.lineTo(w * .4, -h / 2); ctx.quadraticCurveTo(w * .62, 0, w * .4, h / 2); ctx.lineTo(-w * .4, h / 2); ctx.quadraticCurveTo(-w * .62, 0, -w * .4, -h / 2); ctx.closePath();
      ctx.fillStyle = e.primary; ctx.globalAlpha = e.alpha * .75; ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.globalAlpha = e.alpha * .5 * flicker; ctx.beginPath(); ctx.ellipse(0, h * .05, w * .18, h * .28, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  },
  crescent(e) {
    const { ctx, width, height, t } = e, r = e.size * .11, mx = width * .78 + e.dx * .05, my = height * .28 + e.dy * .05;
    glow(e, mx, my, r * 3.2, e.primary, e.alpha * .35);
    ctx.fillStyle = e.primary; ctx.globalAlpha = e.alpha * .9; circle(ctx, mx, my, r); ctx.fill();
    ctx.globalCompositeOperation = "destination-out"; ctx.globalAlpha = 1; circle(ctx, mx + r * .42, my - r * .18, r * .9); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < e.n; i++) {
      const x = seed(i + 1) * width + e.dx * .02, y = seed(i + 2) * height * .85 + e.dy * .02, tw = .5 + .5 * Math.sin(t * (1 + seed(i + 3) * 2) + i);
      if (i % 7 === 0) { starPath(ctx, x, y, 3 + 3 * tw, 1, 4, 0); ctx.fillStyle = e.secondary; ctx.globalAlpha = e.alpha * (.3 + .6 * tw); ctx.fill(); }
      else { ctx.fillStyle = e.secondary; ctx.globalAlpha = e.alpha * (.2 + .6 * tw); circle(ctx, x, y, .6 + seed(i + 4) * 1.2); ctx.fill(); }
    }
    const age = wrap(t * .12, 1);
    if (age < .18) { const k = age / .18, sx = width * (.1 + .5 * k), sy = height * (.1 + .25 * k); ctx.strokeStyle = e.secondary; ctx.lineWidth = 1.4; ctx.globalAlpha = e.alpha * (1 - k) * .8; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 60, sy - 30); ctx.stroke(); }
  },
  arabesque(e) {
    const { ctx, width, height, t } = e, cell = cellFor(e, Math.min(220, 50 + e.n * 2), 44), cols = Math.ceil(width / cell) + 1, rows = Math.ceil(height / cell) + 1;
    if (cols * rows > 400) return;
    const cx = width * .5 + e.dx * .5, cy = height * .5 + e.dy * .5;
    ctx.lineWidth = 1;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * cell, y = r * cell, spin = t * .05 * ((r + c) % 2 ? 1 : -1), R = cell * .42;
      const wave = .5 + .5 * Math.sin(Math.hypot(x - cx, y - cy) / (cell * 1.4) - t * 1.1);
      ctx.strokeStyle = e.primary; ctx.globalAlpha = e.alpha * .26;
      polygon(ctx, x, y, R, 4, spin); ctx.stroke(); polygon(ctx, x, y, R, 4, spin + Math.PI / 4); ctx.stroke();
      polygon(ctx, x, y, R * .48, 8, spin + Math.PI / 8); ctx.fillStyle = e.secondary; ctx.globalAlpha = e.alpha * wave * .2; ctx.fill();
    }
  },
  lowpoly(e) {
    const { ctx, width, height, t } = e, cell = cellFor(e, Math.min(260, 60 + e.n * 2), 40), cols = Math.ceil(width / cell) + 1, rows = Math.ceil(height / cell) + 1;
    if (cols * rows > 500) return;
    const pt = (c: number, r: number): [number, number] => [c * cell + (seed(c * 31 + r) - .5) * cell * .6 + Math.sin(t * .5 + c + r) * cell * .06, r * cell + (seed(r * 17 + c + 5) - .5) * cell * .6 + Math.cos(t * .4 + c * 2 + r) * cell * .06];
    ctx.lineWidth = .6;
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
      const a = pt(c, r), b = pt(c + 1, r), d = pt(c, r + 1), f = pt(c + 1, r + 1);
      for (const [k, tri] of [[0, [a, b, f]], [1, [a, f, d]]] as const) {
        const mx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, my = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const light = .5 + .5 * Math.sin(t * .6 + mx * .01 + my * .013 + e.dx * .004 + e.dy * .004);
        ctx.beginPath(); ctx.moveTo(tri[0][0], tri[0][1]); ctx.lineTo(tri[1][0], tri[1][1]); ctx.lineTo(tri[2][0], tri[2][1]); ctx.closePath();
        ctx.fillStyle = (r + c + k) % 2 ? e.primary : e.secondary; ctx.globalAlpha = e.alpha * (.04 + .14 * light); ctx.fill();
        ctx.strokeStyle = e.primary; ctx.globalAlpha = e.alpha * .08; ctx.stroke();
      }
    }
  },
  synthwave(e) {
    const { ctx, width, height, t } = e, R = e.size * .3, cx = width * .5 + e.dx * .06, cy = height * .58 + e.dy * .05, horizon = cy + R * .35;
    const g = ctx.createLinearGradient(0, cy - R, 0, cy + R); g.addColorStop(0, e.secondary); g.addColorStop(1, e.primary);
    ctx.fillStyle = g; ctx.globalAlpha = e.alpha * .7; circle(ctx, cx, cy, R); ctx.fill();
    ctx.globalCompositeOperation = "destination-out"; ctx.globalAlpha = 1; ctx.fillStyle = "#000";
    for (let k = 0; k < 7; k++) { const f = wrap(k / 7 + t * .06, 1), y = cy + f * R, th = 1 + f * R * .09; ctx.fillRect(cx - R, y, R * 2, th); }
    ctx.fillRect(0, horizon, width, height - horizon);
    ctx.globalCompositeOperation = "source-over";
    glow(e, cx, cy, R * 1.8, e.primary, e.alpha * .25);
    const lines = 8 + Math.round(e.n / 6);
    for (let i = 0; i < lines; i++) {
      const depth = wrap(i / lines + t * .07, 1), y = horizon + depth * depth * (height - horizon);
      ctx.strokeStyle = i % 2 ? e.primary : e.secondary; ctx.lineWidth = .6 + depth * 1.4; ctx.globalAlpha = e.alpha * (.15 + depth * .35);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
  },
  equalizer(e) {
    const { ctx, width, height, t } = e, bars = 16 + Math.round(e.n / 3), w = width / bars, mid = height * .5 + e.dy * .05;
    const g = ctx.createLinearGradient(0, mid - height * .4, 0, mid + height * .4); g.addColorStop(0, e.secondary); g.addColorStop(.5, e.primary); g.addColorStop(1, e.secondary);
    for (let i = 0; i < bars; i++) {
      const x = i * w + w * .5, near = e.p ? Math.max(0, 1 - Math.abs(x - e.p.x * width) / (width * .2)) : 0;
      const level = .12 + .5 * Math.abs(Math.sin(t * 2.2 * (.6 + seed(i)) + i * .7)) * (.55 + .45 * Math.sin(t * .7 + i * .3)) + near * .3;
      const h = height * Math.min(.9, level);
      ctx.fillStyle = g; ctx.globalAlpha = e.alpha * .32; ctx.fillRect(x - w * .3, mid - h / 2, w * .6, h);
      ctx.fillStyle = e.secondary; ctx.globalAlpha = e.alpha * .5; ctx.fillRect(x - w * .3, mid - h / 2 - 6, w * .6, 2);
    }
  },
  heartbeat(e) {
    const { ctx, width, height, t } = e, steps = 260, speed = 140;
    const ecg = (ph: number) => ph < .1 ? Math.sin(ph / .1 * Math.PI) * .08 : ph < .18 ? 0 : ph < .21 ? -(ph - .18) / .03 * .15 : ph < .25 ? -.15 + (ph - .21) / .04 * 1.15 : ph < .29 ? 1 - (ph - .25) / .04 * 1.35 : ph < .32 ? -.35 + (ph - .29) / .03 * .35 : ph < .45 ? 0 : ph < .6 ? Math.sin((ph - .45) / .15 * Math.PI) * .2 : 0;
    for (let line = 0; line < 3; line++) {
      const base = height * (.3 + line * .22) + e.dy * .05, amp = height * .14, period = Math.max(120, width / (2 + line)), head = wrap(t * speed + line * 200 + e.dx * .2, width);
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) { const x = i / steps * width, y = base - ecg(wrap((x - t * speed * .2) / period + line * .3, 1)) * amp; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.strokeStyle = line % 2 ? e.secondary : e.primary; ctx.lineWidth = 1.6; ctx.globalAlpha = e.alpha * .3; ctx.stroke();
      glow(e, head, base - ecg(wrap((head - t * speed * .2) / period + line * .3, 1)) * amp, 14, e.primary, e.alpha * .7);
    }
  },
  helix(e) {
    const { ctx, width, height, t } = e, points = 24 + Math.round(e.n / 2), cy = height * .5 + e.dy * .1, amp = Math.min(height * .3, e.size * .25);
    for (let i = 0; i < points; i++) {
      const x = (i + .5) / points * width, ph = i * .35 + t * 1.2 + e.dx * .004, y1 = cy + Math.sin(ph) * amp, y2 = cy - Math.sin(ph) * amp, depth = Math.cos(ph);
      ctx.strokeStyle = e.primary; ctx.lineWidth = 1; ctx.globalAlpha = e.alpha * .14; ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
      ctx.fillStyle = e.primary; ctx.globalAlpha = e.alpha * (.3 + .3 * (depth + 1)); circle(ctx, x, y1, 2 + 1.6 * (depth + 1)); ctx.fill();
      ctx.fillStyle = e.secondary; ctx.globalAlpha = e.alpha * (.3 + .3 * (1 - depth)); circle(ctx, x, y2, 2 + 1.6 * (1 - depth)); ctx.fill();
    }
  },
  orbits(e) {
    const { ctx, width, height, t } = e, cx = width * .5 + e.dx * .1, cy = height * .5 + e.dy * .1, rings = 3 + Math.round(e.n / 25);
    for (let i = 0; i < e.n; i++) { ctx.fillStyle = e.secondary; ctx.globalAlpha = e.alpha * .3 * seed(i + 9); circle(ctx, seed(i + 1) * width, seed(i + 2) * height, .8); ctx.fill(); }
    glow(e, cx, cy, e.size * .1, e.primary, e.alpha * .8);
    for (let j = 0; j < rings; j++) {
      const rx = e.size * (.14 + .1 * j), ry = rx * .4, tilt = -.35;
      ctx.strokeStyle = e.primary; ctx.lineWidth = 1; ctx.globalAlpha = e.alpha * .2; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, tilt, 0, TAU); ctx.stroke();
      const a = t * (.6 / (j + 1)) + seed(j + 3) * TAU, px = Math.cos(a) * rx, py = Math.sin(a) * ry;
      const x = cx + px * Math.cos(tilt) - py * Math.sin(tilt), y = cy + px * Math.sin(tilt) + py * Math.cos(tilt);
      ctx.fillStyle = j % 2 ? e.secondary : e.primary; ctx.globalAlpha = e.alpha * .85; circle(ctx, x, y, 3 + seed(j + 7) * 5); ctx.fill();
    }
  },
  radar(e) {
    const { ctx, width, height, t } = e, cx = width * .5 + e.dx * .1, cy = height * .5 + e.dy * .1, R = e.size * .45, sweep = wrap(t * 1.2, TAU);
    ctx.strokeStyle = e.primary; ctx.lineWidth = 1;
    for (let k = 1; k <= 4; k++) { ctx.globalAlpha = e.alpha * .2; circle(ctx, cx, cy, R * k / 4); ctx.stroke(); }
    ctx.globalAlpha = e.alpha * .15; ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    for (let k = 0; k < 14; k++) {
      const a1 = sweep - k * .05, a0 = a1 - .05;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath(); ctx.fillStyle = e.primary; ctx.globalAlpha = e.alpha * .28 * (1 - k / 14); ctx.fill();
    }
    for (let i = 0; i < Math.round(e.n / 3); i++) {
      const a = seed(i + 1) * TAU, d = (.15 + .8 * seed(i + 2)) * R, since = wrap(sweep - a, TAU), bright = Math.max(0, 1 - since / 2.2);
      ctx.fillStyle = e.secondary; ctx.globalAlpha = e.alpha * (.08 + .8 * bright); circle(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2 + bright * 2); ctx.fill();
    }
  },
  smoke(e) {
    const { width, height, t } = e;
    for (let i = 0; i < e.n; i++) {
      const age = wrap(t * .08 * (.7 + seed(i + 1)) + seed(i + 2), 1), source = width * (.15 + .7 * seed(Math.floor(i / 6) + 40));
      const x = source + Math.sin(age * 6 + i) * e.size * .08 * age + e.dx * .05 * age, y = height * (1.05 - age * 1.1) + e.dy * .03;
      glow(e, x, y, e.size * (.05 + age * .22), i % 2 ? e.primary : e.secondary, e.alpha * (1 - age) * age * 1.2 * .8);
    }
  },
  weave(e) {
    const { ctx, width, height, t } = e, g = Math.max(14, Math.max(width, height) / Math.min(60, 20 + e.n / 2)), steps = 24;
    ctx.lineCap = "round";
    const cols = Math.min(120, Math.ceil(width / g) + 1), rows = Math.min(120, Math.ceil(height / g) + 1);
    for (let i = 0; i < cols; i++) {
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) { const y = s / steps * height, x = i * g + Math.sin(y / g * Math.PI + t + i) * g * .16 + e.dx * .03; if (s) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.strokeStyle = e.primary; ctx.lineWidth = g * .32; ctx.globalAlpha = e.alpha * .1; ctx.stroke();
    }
    for (let j = 0; j < rows; j++) {
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) { const x = s / steps * width, y = j * g + Math.sin(x / g * Math.PI + t * .8 + j) * g * .16 + e.dy * .03; if (s) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.strokeStyle = e.secondary; ctx.lineWidth = g * .32; ctx.globalAlpha = e.alpha * .08; ctx.stroke();
    }
  },
  shapes(e) {
    const { ctx, width, height, t } = e;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < e.n; i++) {
      const s = 7 + seed(i + 1) * 20, depth = .4 + seed(i + 9);
      const x = wrap(seed(i + 2) * width + Math.sin(t * .2 + i) * 30 + e.dx * .07 * depth, width), y = wrap(seed(i + 3) * height + Math.cos(t * .17 + i) * 30 + e.dy * .07 * depth, height), rot = t * (.2 + seed(i + 4) * .5) * (i % 2 ? 1 : -1);
      ctx.strokeStyle = i % 3 ? e.primary : e.secondary; ctx.globalAlpha = e.alpha * .38;
      const kind = i % 4;
      if (kind === 0) { circle(ctx, x, y, s * .5); ctx.stroke(); }
      else if (kind === 1) { polygon(ctx, x, y, s * .6, 3, rot); ctx.stroke(); }
      else if (kind === 2) { polygon(ctx, x, y, s * .6, 4, rot); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(x - Math.cos(rot) * s * .5, y - Math.sin(rot) * s * .5); ctx.lineTo(x + Math.cos(rot) * s * .5, y + Math.sin(rot) * s * .5); ctx.moveTo(x + Math.sin(rot) * s * .5, y - Math.cos(rot) * s * .5); ctx.lineTo(x - Math.sin(rot) * s * .5, y + Math.cos(rot) * s * .5); ctx.stroke(); }
    }
  },
  memphis(e) {
    const { ctx, width, height, t } = e, cell = cellFor(e, Math.min(160, 30 + e.n * 1.5), 56), cols = Math.ceil(width / cell), rows = Math.ceil(height / cell);
    if (cols * rows > 300) return;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, x = (c + .2 + .6 * seed(i + 1)) * cell + e.dx * .04, y = (r + .2 + .6 * seed(i + 2)) * cell + e.dy * .04, rot = Math.sin(t * .5 + i) * .25 + seed(i + 3) * TAU, s = cell * .22;
      const col = i % 2 ? e.primary : e.secondary;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3; ctx.globalAlpha = e.alpha * .4;
      switch (Math.floor(seed(i + 4) * 5)) {
        case 0: ctx.beginPath(); for (let k = 0; k <= 6; k++) { const px = (k / 6 - .5) * s * 2.4, py = (k % 2 ? -1 : 1) * s * .3; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); break;
        case 1: for (let k = 0; k < 3; k++) for (let m = 0; m < 3; m++) { circle(ctx, (k - 1) * s * .45, (m - 1) * s * .45, 2.2); ctx.fill(); } break;
        case 2: polygon(ctx, 0, 0, s * .7, 3, 0); ctx.fill(); break;
        case 3: circle(ctx, 0, 0, s * .6); ctx.stroke(); break;
        default: ctx.beginPath(); ctx.moveTo(-s, 0); ctx.bezierCurveTo(-s * .5, -s * .8, s * .5, s * .8, s, 0); ctx.stroke();
      }
      ctx.restore();
    }
  },
  beams(e) {
    const { ctx, width, height, t } = e, lights = 3 + Math.round(e.n / 20), reach = height * 1.4;
    for (let i = 0; i < lights; i++) {
      const x0 = width * (i + .5) / lights, aim = e.p ? Math.atan2(e.p.y * height + 10, e.p.x * width - x0) - Math.PI / 2 : 0;
      const a = Math.PI / 2 + Math.sin(t * .5 * (.7 + seed(i + 1)) + i * 1.3) * .45 + aim * .6, half = .11 + seed(i + 2) * .05;
      const g = ctx.createLinearGradient(x0, -10, x0 + Math.cos(a) * reach, -10 + Math.sin(a) * reach);
      const col = i % 2 ? e.primary : e.secondary;
      g.addColorStop(0, col); g.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.moveTo(x0, -10); ctx.lineTo(x0 + Math.cos(a - half) * reach, -10 + Math.sin(a - half) * reach); ctx.lineTo(x0 + Math.cos(a + half) * reach, -10 + Math.sin(a + half) * reach); ctx.closePath();
      ctx.fillStyle = g; ctx.globalAlpha = e.alpha * .22; ctx.fill();
      glow(e, x0, 0, 26, col, e.alpha * .7);
    }
    for (let i = 0; i < e.n; i++) { ctx.fillStyle = e.secondary; ctx.globalAlpha = e.alpha * .25 * (.5 + .5 * Math.sin(t * 2 + i)); circle(ctx, wrap(seed(i + 5) * width + t * 6, width), wrap(seed(i + 6) * height - t * 4, height), .9); ctx.fill(); }
  },
  dunes(e) {
    const { ctx, width, height, t } = e, steps = 40;
    glow(e, width * .72 + e.dx * .04, height * .25 + e.dy * .04, e.size * .2, e.primary, e.alpha * .6);
    for (let layer = 0; layer < 5; layer++) {
      const base = height * (.5 + layer * .1), drift = t * .03 * (layer + 1) + e.dx * .0008 * (layer + 1);
      const crest: Array<[number, number]> = [];
      for (let i = 0; i <= steps; i++) { const x = i / steps * width, u = x / Math.max(80, width * .35); crest.push([x, base - Math.sin(u * 2 + drift * 4 + layer * 1.3) * height * .05 - Math.sin(u * 4.3 + layer) * height * .015]); }
      ctx.beginPath(); ctx.moveTo(0, height); crest.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(width, height); ctx.closePath();
      ctx.fillStyle = layer % 2 ? e.secondary : e.primary; ctx.globalAlpha = e.alpha * (.07 + layer * .04); ctx.fill();
      ctx.beginPath(); crest.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.strokeStyle = e.primary; ctx.lineWidth = 1; ctx.globalAlpha = e.alpha * .2; ctx.stroke();
    }
  },
  gems(e) {
    const { ctx, width, height, t } = e, count = Math.max(6, Math.round(e.n / 2));
    for (let i = 0; i < count; i++) {
      const s = 10 + seed(i + 1) * 18, depth = .5 + seed(i + 30);
      const x = wrap(seed(i + 2) * width + Math.sin(t * .2 + i) * 20 + e.dx * .06 * depth, width), y = wrap(seed(i + 3) * height + Math.cos(t * .18 + i) * 16 + e.dy * .06 * depth, height);
      ctx.save(); ctx.translate(x, y); ctx.scale(Math.cos(t * .6 + i) * .7 + .3, 1);
      ctx.beginPath(); ctx.moveTo(-s * .5, -s * .2); ctx.lineTo(-s * .25, -s * .5); ctx.lineTo(s * .25, -s * .5); ctx.lineTo(s * .5, -s * .2); ctx.lineTo(0, s * .6); ctx.closePath();
      ctx.fillStyle = e.secondary; ctx.globalAlpha = e.alpha * .1; ctx.fill();
      ctx.strokeStyle = i % 2 ? e.primary : e.secondary; ctx.lineWidth = 1; ctx.globalAlpha = e.alpha * .45; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * .5, -s * .2); ctx.lineTo(s * .5, -s * .2); ctx.moveTo(-s * .25, -s * .5); ctx.lineTo(-s * .1, -s * .2); ctx.lineTo(0, s * .6); ctx.moveTo(s * .25, -s * .5); ctx.lineTo(s * .1, -s * .2); ctx.lineTo(0, s * .6); ctx.globalAlpha = e.alpha * .25; ctx.stroke();
      ctx.restore();
      const glint = Math.max(0, Math.sin(t * 1.3 + i * 2.1));
      if (glint > .6) { starPath(ctx, x + s * .2, y - s * .35, 6 * glint, 1.2, 4, 0); ctx.fillStyle = e.secondary; ctx.globalAlpha = e.alpha * (glint - .6) * 2.2; ctx.fill(); }
    }
  },
};

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
    default: {
      const more = MORE_SCENES[spec.kind as MoreSceneKind];
      if (more) more({ ctx, width, height, t, n: Math.max(1, Math.min(100, n)), size, p, dx, dy, alpha, intensity: spec.intensity, primary, secondary });
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
