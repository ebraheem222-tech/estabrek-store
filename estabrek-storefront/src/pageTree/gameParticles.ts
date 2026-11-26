/**
 * Particles for the games stage (G3 of docs/game-engine-plan.ar.md): what things leave behind as they move (sparkles,
 * smoke, fire, bubbles), the weather across the view (snow, rain, stars that twinkle, falling leaves, rising bubbles),
 * a burst where something happened, and confetti for a win. Worked out here, a little each frame, the same for the
 * shop (GameView.tsx draws them as points on the graphics card) and the editor's try-out (a 2D canvas). Only how they
 * look: the game's rules never meet them. Pure (no DOM, no React).
 */
import type { GameState } from "./gameEngine";

/** How a particle is drawn: a soft dot, a ring (a bubble), a little square (confetti, a leaf). */
export type Shape = 0 | 1 | 2;
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; grow: number; color: string; shape: Shape; twinkle: number; sway: number };
export type Particles = { list: Particle[]; max: number; trailAcc: Map<number, number>; weatherAcc: number; starsFor: string };

export const newParticles = (max = 1500): Particles => ({ list: [], max, trailAcc: new Map(), weatherAcc: 0, starsFor: "" });

const FIRE = ["#ff9f1c", "#ffbf47", "#ff6b35"];
const CONFETTI = ["#ff5d8f", "#ffd23f", "#3bceac", "#5c7cfa", "#ff9f1c", "#b388ff"];
const LEAVES = ["#e07a2f", "#c8553d", "#f2a541", "#8c5e3c"];
const pickOf = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

function add(p: Particles, q: Partial<Particle> & Pick<Particle, "x" | "y">) {
  if (p.list.length >= p.max) p.list.shift();
  p.list.push({ vx: 0, vy: 0, life: 1, size: 6, grow: 0, color: "#ffffff", shape: 0, twinkle: 0, sway: 0, ...q, max: q.life ?? 1 });
}

/** A burst where something happened, in its colour. */
export function burst(p: Particles, x: number, y: number, color: string, few = false) {
  const n = few ? 6 : 16;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.4, v = 160 + Math.random() * 260;
    add(p, { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6, size: 7, grow: -6, color });
  }
}
/** Confetti from the top of the view. */
export function confetti(p: Particles, cx: number, cy: number, w: number, few = false) {
  for (let k = 0; k < (few ? 40 : 140); k++) {
    add(p, { x: cx + Math.random() * w, y: cy - 10 - Math.random() * 120, vx: (Math.random() - 0.5) * 120, vy: 120 + Math.random() * 160, life: 3 + Math.random() * 1.5, size: 8 + Math.random() * 5, color: pickOf(CONFETTI), shape: 2, sway: 2 + Math.random() * 3 });
  }
}

/** A frame of the particles: trails from moving things, the weather, then each one moved, faded and let go. */
export function stepParticles(p: Particles, s: GameState, dt: number, few = false) {
  const { spec } = s;
  const rate = few ? 0.35 : 1;
  /* ---- trails behind things that move */
  for (const b of s.bodies) {
    const kind = b.thing.trail;
    if (!kind || b.dead) continue;
    const speed = Math.hypot(b.vx, b.vy);
    // Fire and smoke go on still; sparkles and bubbles while it moves.
    if ((kind === "sparkle" || kind === "bubbles") && speed < 20) continue;
    const per = { sparkle: 30, smoke: 18, fire: 40, bubbles: 10 }[kind] * rate;
    let acc = (p.trailAcc.get(b.n) ?? 0) + per * dt;
    while (acc >= 1) {
      acc -= 1;
      const x = b.x + (Math.random() - 0.5) * b.w * 0.5, y = b.y + (Math.random() - 0.5) * b.h * 0.5;
      if (kind === "sparkle") add(p, { x, y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.5, size: 6, grow: -8, color: "#fff6c2", twinkle: 14 });
      else if (kind === "smoke") add(p, { x, y: b.y - b.h * 0.3, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 20, life: 1.1, size: 10, grow: 22, color: "#9aa0a6" });
      else if (kind === "fire") add(p, { x, y: b.y - b.h * 0.2, vx: (Math.random() - 0.5) * 30, vy: -80 - Math.random() * 60, life: 0.45, size: 12, grow: -18, color: pickOf(FIRE) });
      else add(p, { x, y, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 30, life: 1.2, size: 8, grow: 4, color: "#bfe9ff", shape: 1, sway: 3 });
    }
    p.trailAcc.set(b.n, acc);
  }
  /* ---- the weather across the view */
  const W = spec.w, H = spec.h, cx = s.cx, cy = s.cy;
  if (spec.weather === "stars") {
    // Stars stay: made once for a view, each twinkling.
    const key = `${W}x${H}`;
    if (p.starsFor !== key) {
      p.starsFor = key;
      for (let k = 0; k < (few ? 30 : 70); k++) add(p, { x: Math.random() * W, y: Math.random() * H * 0.8, life: 1e9, size: 2 + Math.random() * 3, color: "#ffffff", twinkle: 1 + Math.random() * 3, sway: -1 });
    }
  } else if (spec.weather && !few) {
    const per = { snow: 40, rain: 120, leaves: 6, bubbles: 8 }[spec.weather] * rate;
    p.weatherAcc += per * dt;
    while (p.weatherAcc >= 1) {
      p.weatherAcc -= 1;
      const x = cx + Math.random() * (W + 100) - 50;
      if (spec.weather === "snow") add(p, { x, y: cy - 10, vx: 0, vy: 40 + Math.random() * 40, life: H / 50 + 2, size: 3 + Math.random() * 4, color: "#ffffff", sway: 1 + Math.random() * 2 });
      else if (spec.weather === "rain") add(p, { x, y: cy - 10, vx: -60, vy: 700 + Math.random() * 200, life: H / 650 + 0.3, size: 2.5, color: "#9ecfff" });
      else if (spec.weather === "leaves") add(p, { x, y: cy - 10, vx: 20, vy: 50 + Math.random() * 30, life: H / 50 + 2, size: 9, color: pickOf(LEAVES), shape: 2, sway: 2 + Math.random() * 2 });
      else add(p, { x, y: cy + H + 10, vx: 0, vy: -50 - Math.random() * 40, life: H / 50 + 2, size: 6 + Math.random() * 8, color: "#d4f1ff", shape: 1, sway: 1.5 });
    }
  }
  /* ---- each one moved, grown or shrunk, faded, let go */
  for (let i = p.list.length - 1; i >= 0; i--) {
    const q = p.list[i];
    q.life -= dt;
    if (q.life <= 0 || q.size <= 0.3) { p.list.splice(i, 1); continue; }
    if (q.sway > 0) q.vx += Math.sin((q.max - q.life) * q.sway + q.y * 0.01) * 30 * dt;
    if (q.sway >= 0) { q.x += q.vx * dt; q.y += q.vy * dt; }
    q.size = Math.max(0, q.size + q.grow * dt);
  }
}

/** How see-through a particle is now: fading at its end, twinkling if it twinkles. */
export function alphaOf(q: Particle, t: number): number {
  const fade = q.max > 1e6 ? 1 : Math.min(1, q.life / Math.min(0.4, q.max * 0.5));
  const tw = q.twinkle ? 0.55 + 0.45 * Math.sin(t * q.twinkle + q.x) : 1;
  return Math.max(0, Math.min(1, fade * tw));
}
/** Where a particle is drawn: weather stars stay put in the view (they don't move with the camera). */
export const placeOf = (q: Particle, cx: number, cy: number): [number, number] => (q.sway === -1 ? [cx + q.x, cy + q.y] : [q.x, q.y]);
