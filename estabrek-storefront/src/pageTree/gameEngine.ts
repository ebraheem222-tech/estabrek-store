/**
 * The game engine (G0 of docs/game-engine-plan.ar.md): a page's game (gameSpec.ts) run a 60th of a second at a time.
 *  - Arcade physics: velocities, the world's gravity on dynamic bodies, solid things pushing others out along the
 *    shortest way (and bouncing them by their `bounce`), the world's edges (all walls, three sides, a floor or open).
 *  - Controls (left/right, four ways, a platformer's run and jump, follow the pointer, drag) and behaviours (patrol,
 *    chase the player, wander, spin).
 *  - Rules: when the game starts, every so often, two things meet (once, as they touch), a thing leaves the world, is
 *    tapped, a key is pressed, the score or the clock reaches a number → spawn, destroy, score, lives, win, lose,
 *    speed, faster, shake, sound, burst.
 *  - Its own random numbers from the spec's seed: the same presses give the same game (a replay, a fair prize).
 * Things are placed by their centre. Pure (no DOM, no React): GameView.tsx feeds it presses and draws its state.
 */
import { GAME_LIMITS, isWho, type GameAct, type GameRule, type GameSpec, type GameThing } from "./gameSpec";

export const STEP = 1 / 60;

export type Body = {
  /** This body's own number (a spawned thing's copies each get theirs). */
  n: number;
  /** The thing it is (its id: what rules name). */
  of: string;
  thing: GameThing;
  x: number; y: number; w: number; h: number;
  vx: number; vy: number;
  rot: number;
  born: number;
  grounded: boolean;
  /** A patrol's way (1 or -1), a wanderer's next turn. */
  dir: number;
  turnAt: number;
  dead: boolean;
};
export type GameInput = {
  left: boolean; right: boolean; up: boolean; down: boolean;
  /** Keys pressed since the last step (a rule's "key", a platformer's jump). */
  pressed: string[];
  /** The pointer in the world's units, and whether it is down. */
  pointer: { x: number; y: number } | null;
  pointerDown: boolean;
  /** Taps since the last step, in the world's units. */
  taps: Array<{ x: number; y: number }>;
};
export const NO_INPUT: GameInput = { left: false, right: false, up: false, down: false, pressed: [], pointer: null, pointerDown: false, taps: [] };

export type Effect =
  | { kind: "sound"; sound: string }
  | { kind: "burst"; x: number; y: number; color: string }
  | { kind: "shake" };
export type Phase = "ready" | "playing" | "won" | "lost";
export type GameState = {
  spec: GameSpec;
  phase: Phase;
  /** Seconds played. */
  t: number;
  score: number;
  lives: number;
  bodies: Body[];
  effects: Effect[];
  /** Seconds of shaking left. */
  shake: number;
  /** "faster": spawned things' speed. */
  speed: number;
  next: number;
  seed: number;
  every: number[];
  fired: Set<number>;
  contacts: Set<string>;
  dragging: number | null;
  steps: number;
};

/** Mulberry32: small, quick, and the same everywhere. */
function random(s: GameState): number {
  let t = (s.seed = (s.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function make(s: GameState, thing: GameThing, x: number, y: number, vx: number, vy: number): Body | null {
  if (s.bodies.filter((b) => !b.dead).length >= GAME_LIMITS.alive) return null;
  const b: Body = { n: s.next++, of: thing.id, thing, x, y, w: thing.w, h: thing.h, vx, vy, rot: 0, born: s.t, grounded: false, dir: 1, turnAt: 0, dead: false };
  s.bodies.push(b);
  return b;
}

/** A new game, waiting to start: the things that aren't templates in their places. */
export function newGame(spec: GameSpec): GameState {
  const s: GameState = {
    spec, phase: "ready", t: 0, score: 0, lives: spec.lives, bodies: [], effects: [], shake: 0, speed: 1, next: 1,
    seed: spec.seed, every: spec.rules.map(() => 0), fired: new Set(), contacts: new Set(), dragging: null, steps: 0,
  };
  for (const thing of spec.things) if (!thing.template) make(s, thing, thing.x, thing.y, thing.vx, thing.vy);
  return s;
}

export function startGame(s: GameState) {
  if (s.phase === "playing") return;
  if (s.phase !== "ready") Object.assign(s, newGame(s.spec));
  s.phase = "playing";
  run(s, (w) => w.on === "start", {});
}

type Ctx = { self?: Body; other?: Body };

function run(s: GameState, match: (w: GameRule["when"]) => boolean, ctx: Ctx) {
  s.spec.rules.forEach((r) => { if (match(r.when)) for (const a of r.do) act(s, a, ctx); });
}

function spot(s: GameState, at: string, w: number, h: number, ctx: Ctx): [number, number] {
  const W = s.spec.w, H = s.spec.h;
  const along = (len: number, size: number) => size / 2 + random(s) * Math.max(0, len - size);
  switch (at) {
    case "top": return [along(W, w), -h / 2];
    case "bottom": return [along(W, w), H + h / 2];
    case "left": return [-w / 2, along(H, h)];
    case "right": return [W + w / 2, along(H, h)];
    case "random": return [along(W, w), along(H, h)];
    case "floorRight": return [W + w / 2, H - h / 2];
    case "floorLeft": return [-w / 2, H - h / 2];
    case "self": return ctx.self ? [ctx.self.x, ctx.self.y] : [W / 2, H / 2];
    case "other": return ctx.other ? [ctx.other.x, ctx.other.y] : [W / 2, H / 2];
    default: return [W / 2, H / 2];
  }
}

function act(s: GameState, a: GameAct, ctx: Ctx) {
  if (s.phase !== "playing") return;
  switch (a.act) {
    case "spawn": {
      const thing = s.spec.things.find((t) => t.id === a.what);
      if (!thing) return;
      const [x, y] = spot(s, a.at, thing.w, thing.h, ctx);
      const vx = (a.vx || thing.vx) * s.speed, vy = (a.vy || thing.vy) * s.speed;
      make(s, thing, x, y, vx, vy);
      return;
    }
    case "destroy":
      if ((a.who === "self" || a.who === "both") && ctx.self) ctx.self.dead = true;
      if ((a.who === "other" || a.who === "both") && ctx.other) ctx.other.dead = true;
      return;
    case "score": s.score += a.add; return;
    case "lives": s.lives = Math.max(0, s.lives + a.add); return;
    case "win": s.phase = "won"; s.effects.push({ kind: "sound", sound: "success" }); return;
    case "lose": s.phase = "lost"; return;
    case "speed": { const b = a.who === "self" ? ctx.self : ctx.other; if (b) { b.vx = a.vx; b.vy = a.vy; } return; }
    case "faster": s.speed = Math.min(4, s.speed * a.by); return;
    case "shake": s.shake = 0.3; s.effects.push({ kind: "shake" }); return;
    case "sound": s.effects.push({ kind: "sound", sound: a.kind }); return;
    case "burst": { const b = a.who === "other" ? ctx.other ?? ctx.self : ctx.self ?? ctx.other; if (b) s.effects.push({ kind: "burst", x: b.x, y: b.y, color: b.thing.look.color }); return; }
  }
}

const overlap = (a: Body, b: Body, pad = 0) => Math.abs(a.x - b.x) * 2 < a.w + b.w + pad && Math.abs(a.y - b.y) * 2 < a.h + b.h + pad;
const at = (b: Body, x: number, y: number) => Math.abs(b.x - x) * 2 <= b.w && Math.abs(b.y - y) * 2 <= b.h;
const moves = (b: Body) => b.thing.body !== "static";
const player = (s: GameState) => s.bodies.find((b) => !b.dead && b.thing.control !== "none");

/** One step of the game. */
export function stepGame(s: GameState, input: GameInput = NO_INPUT, dt = STEP) {
  if (s.phase !== "playing") return;
  const { spec } = s;
  const W = spec.w, H = spec.h;
  s.t += dt;
  s.steps++;
  s.shake = Math.max(0, s.shake - dt);

  /* ---- the clock and its rules */
  spec.rules.forEach((r, i) => {
    if (r.when.on === "every") {
      s.every[i] += dt;
      if (s.every[i] >= r.when.seconds) { s.every[i] -= r.when.seconds; for (const a of r.do) act(s, a, {}); }
    } else if (r.when.on === "time" && !s.fired.has(i) && s.t >= r.when.at) { s.fired.add(i); for (const a of r.do) act(s, a, {}); }
  });
  for (const key of input.pressed) run(s, (w) => w.on === "key" && w.key === key, {});

  /* ---- controls and behaviours */
  const jumpPressed = input.up || input.pressed.some((k) => k === "Space" || k === "ArrowUp") || input.taps.length > 0;
  for (const b of s.bodies) {
    if (b.dead) continue;
    const t = b.thing;
    const toward = (target: number, from: number, max: number) => Math.max(-max, Math.min(max, (target - from) * 12));
    switch (t.control) {
      case "leftRight":
        b.vx = input.pointerDown && input.pointer ? toward(input.pointer.x, b.x, t.speed * 1.6) : ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * t.speed;
        break;
      case "fourWay": {
        if (input.pointerDown && input.pointer) { b.vx = toward(input.pointer.x, b.x, t.speed * 1.6); b.vy = toward(input.pointer.y, b.y, t.speed * 1.6); break; }
        const x = (input.right ? 1 : 0) - (input.left ? 1 : 0), y = (input.down ? 1 : 0) - (input.up ? 1 : 0);
        const len = Math.hypot(x, y) || 1;
        b.vx = (x / len) * t.speed; b.vy = (y / len) * t.speed;
        break;
      }
      case "platform": {
        const want = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * t.speed;
        b.vx += (want - b.vx) * Math.min(1, dt * 14);
        if (jumpPressed && b.grounded) { b.vy = -t.jump; b.grounded = false; s.effects.push({ kind: "sound", sound: "whoosh" }); }
        break;
      }
      case "pointer":
        if (input.pointer) { b.vx = 0; b.vy = 0; b.x += (input.pointer.x - b.x) * Math.min(1, dt * 18); b.y += (input.pointer.y - b.y) * Math.min(1, dt * 18); }
        break;
      case "drag":
        if (input.pointerDown && input.pointer) {
          if (s.dragging === null && at(b, input.pointer.x, input.pointer.y)) s.dragging = b.n;
          if (s.dragging === b.n) { b.x = input.pointer.x; b.y = input.pointer.y; b.vx = 0; b.vy = 0; }
        }
        break;
    }
    switch (t.behave) {
      case "patrol": b.vx = t.speed * b.dir; break;
      case "chase": { const p = player(s); if (p && p !== b) { const dx = p.x - b.x, dy = p.y - b.y, len = Math.hypot(dx, dy) || 1; b.vx = (dx / len) * t.speed; if (t.body !== "dynamic") b.vy = (dy / len) * t.speed; } break; }
      case "wander":
        if (s.t >= b.turnAt) { const a = random(s) * Math.PI * 2; b.vx = Math.cos(a) * t.speed; if (t.body !== "dynamic") b.vy = Math.sin(a) * t.speed; b.turnAt = s.t + 0.8 + random(s) * 1.4; }
        break;
      case "spin": b.rot += dt * Math.PI; break;
    }
  }
  if (!input.pointerDown) s.dragging = null;

  /* ---- moving, solids and edges */
  const solids = s.bodies.filter((b) => !b.dead && b.thing.solid);
  for (const b of s.bodies) {
    if (b.dead || !moves(b)) continue;
    if (b.thing.body === "dynamic") b.vy += spec.gravity * b.thing.gravity * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.grounded = false;
    // Only a dynamic body is pushed by solids (a kinematic one, a paddle or a falling coin, just moves by its speed).
    if (b.thing.body !== "dynamic") continue;
    for (const o of solids) {
      if (o === b || !overlap(b, o)) continue;
      // Out along the shortest way; a bouncy body turns back, the rest stop on that side.
      const px = (b.w + o.w) / 2 - Math.abs(b.x - o.x), py = (b.h + o.h) / 2 - Math.abs(b.y - o.y);
      if (px < py) {
        const side = b.x < o.x ? -1 : 1;
        b.x += side * px;
        b.vx = b.thing.bounce ? Math.abs(b.vx) * side * b.thing.bounce : 0;
        if (b.thing.behave === "patrol") b.dir = side;
      } else {
        const side = b.y < o.y ? -1 : 1;
        b.y += side * py;
        if (side < 0) b.grounded = true;
        b.vy = b.thing.bounce ? Math.abs(b.vy) * side * b.thing.bounce : 0;
      }
    }
  }
  const closed = { top: spec.edges === "walls" || spec.edges === "sides", sides: spec.edges === "walls" || spec.edges === "sides", bottom: spec.edges === "walls" || spec.edges === "floor" };
  for (const b of s.bodies) {
    if (b.dead || !moves(b)) continue;
    const keep = b.thing.keepIn;
    const bounce = b.thing.bounce;
    if ((closed.sides || keep) && b.x - b.w / 2 < 0) { b.x = b.w / 2; b.vx = bounce ? Math.abs(b.vx) * bounce : 0; b.dir = 1; }
    if ((closed.sides || keep) && b.x + b.w / 2 > W) { b.x = W - b.w / 2; b.vx = bounce ? -Math.abs(b.vx) * bounce : 0; b.dir = -1; }
    if ((closed.top || keep) && b.y - b.h / 2 < 0) { b.y = b.h / 2; b.vy = bounce ? Math.abs(b.vy) * bounce : 0; }
    if ((closed.bottom || keep) && b.y + b.h / 2 > H) { b.y = H - b.h / 2; b.vy = bounce ? -Math.abs(b.vy) * bounce : 0; b.grounded = true; }
    // Out of the world: past a margin on its way out (a thing spawned at an edge, half out, is still coming in).
    const m = Math.max(b.w, b.h);
    if (b.x < -m || b.x > W + m || b.y < -m * 1.5 || b.y > H + m * 0.6) {
      run(s, (w) => w.on === "out" && isWho(w.who, { id: b.of, tags: b.thing.tags }), { self: b });
      b.dead = true;
    }
    if (b.thing.life && s.t - b.born >= b.thing.life) b.dead = true;
  }

  /* ---- meetings: each pair once, as it begins to touch */
  const alive = s.bodies.filter((b) => !b.dead);
  const hits = spec.rules.filter((r) => r.when.on === "hit");
  const now = new Set<string>();
  if (hits.length) {
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j];
      if (!overlap(a, b, 1)) continue;
      const key = `${a.n}:${b.n}`;
      now.add(key);
      if (s.contacts.has(key)) continue;
      for (const r of hits) {
        const w = r.when as { a: string; b: string };
        const one = { id: a.of, tags: a.thing.tags }, two = { id: b.of, tags: b.thing.tags };
        const pair = isWho(w.a, one) && isWho(w.b, two) ? [a, b] : isWho(w.a, two) && isWho(w.b, one) ? [b, a] : null;
        if (pair && !pair[0].dead && !pair[1].dead) for (const x of r.do) act(s, x, { self: pair[0], other: pair[1] });
      }
    }
  }
  s.contacts = now;

  /* ---- taps: the topmost thing under each */
  for (const tap of input.taps) {
    const hit = [...s.bodies].reverse().find((b) => !b.dead && at(b, tap.x, tap.y));
    if (hit) run(s, (w) => w.on === "tap" && isWho(w.who, { id: hit.of, tags: hit.thing.tags }), { self: hit });
  }

  /* ---- the score's rules, and the end */
  spec.rules.forEach((r, i) => {
    if (r.when.on === "score" && !s.fired.has(i) && s.score >= r.when.at) { s.fired.add(i); for (const a of r.do) act(s, a, {}); }
  });
  s.bodies = s.bodies.filter((b) => !b.dead);
  if (s.phase !== "playing") return;
  if (spec.winScore && s.score >= spec.winScore) { s.phase = "won"; s.effects.push({ kind: "sound", sound: "success" }); return; }
  if (spec.lives && s.lives <= 0) { s.phase = "lost"; return; }
  if (spec.time && s.t >= spec.time) { s.phase = spec.timeWins ? "won" : "lost"; if (s.phase === "won") s.effects.push({ kind: "sound", sound: "success" }); }
}

/** Seconds left on the clock (null: no clock). */
export const timeLeft = (s: GameState) => (s.spec.time ? Math.max(0, Math.ceil(s.spec.time - s.t)) : null);
