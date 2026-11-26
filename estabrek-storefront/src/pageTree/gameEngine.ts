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
 *  - G1: a tile map (solid tiles, one-way platforms, tiles rules meet by their tags and can remove, tiles that put a
 *    thing in their place at the start), moved through one axis at a time so a body never snags on a seam; a world
 *    bigger than the view with a camera that follows; a platformer's feel (a little time to jump after leaving an
 *    edge, a press kept a moment before landing, a shorter jump when the key is let go); each body's state for its
 *    frames (idle, run, jump, fall) and the way it faces; a patrol turns back at a ledge.
 * Things are placed by their centre. Pure (no DOM, no React): GameView.tsx feeds it presses and draws its state.
 */
import { GAME_LIMITS, isWho, type GameAct, type GameRule, type GameSpec, type GameThing, type GameTileKind } from "./gameSpec";

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
  /** Its frames' state, the way it faces, seconds off the ground, when a jump was last pressed, a jump already cut. */
  anim: "idle" | "run" | "jump" | "fall";
  face: 1 | -1;
  air: number;
  jumpAt: number;
  cut: boolean;
};
export type GameInput = {
  left: boolean; right: boolean; up: boolean; down: boolean;
  /** The jump key held (a platformer's jump is shorter when it's let go early). */
  jumpHeld?: boolean;
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
  /** The camera: the view's top-left in the world. */
  cx: number; cy: number;
  /** The tile map as it is now (a tile removed by a rule is "."), and a count that changes when it does. */
  tiles: string[][] | null;
  tilesV: number;
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
  const b: Body = { n: s.next++, of: thing.id, thing, x, y, w: thing.w, h: thing.h, vx, vy, rot: 0, born: s.t, grounded: false, dir: 1, turnAt: 0, dead: false, anim: "idle", face: 1, air: 0, jumpAt: -9, cut: false };
  s.bodies.push(b);
  return b;
}

/** A new game, waiting to start: the things that aren't templates in their places. */
export function newGame(spec: GameSpec): GameState {
  const s: GameState = {
    spec, phase: "ready", t: 0, score: 0, lives: spec.lives, bodies: [], effects: [], shake: 0, speed: 1, next: 1,
    seed: spec.seed, every: spec.rules.map(() => 0), fired: new Set(), contacts: new Set(), dragging: null, steps: 0,
    cx: 0, cy: 0, tiles: spec.tiles ? spec.tiles.map.map((r) => r.split("")) : null, tilesV: 0,
  };
  for (const thing of spec.things) if (!thing.template) make(s, thing, thing.x, thing.y, thing.vx, thing.vy);
  // The map's tiles that are things (a coin, an enemy, a flag): each made at its cell.
  if (spec.tiles && s.tiles) {
    const { size, kinds } = spec.tiles;
    s.tiles.forEach((row, r) => row.forEach((ch, c) => {
      const thing = kinds[ch]?.thing ? spec.things.find((t) => t.id === kinds[ch].thing) : null;
      if (!thing) return;
      make(s, thing, c * size + size / 2, r * size + size - thing.h / 2, thing.vx, thing.vy);
      row[c] = ".";
    }));
  }
  camera(s, 1);
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

/** Where a spawned thing starts: at an edge of the view (the camera's), anywhere in it, on the world's floor, at a thing. */
function spot(s: GameState, at: string, w: number, h: number, ctx: Ctx): [number, number] {
  const W = s.spec.w, H = s.spec.h, X = s.cx, Y = s.cy;
  const along = (len: number, size: number) => size / 2 + random(s) * Math.max(0, len - size);
  switch (at) {
    case "top": return [X + along(W, w), Y - h / 2];
    case "bottom": return [X + along(W, w), Y + H + h / 2];
    case "left": return [X - w / 2, Y + along(H, h)];
    case "right": return [X + W + w / 2, Y + along(H, h)];
    case "random": return [X + along(W, w), Y + along(H, h)];
    case "floorRight": return [X + W + w / 2, s.spec.wh - h / 2];
    case "floorLeft": return [X - w / 2, s.spec.wh - h / 2];
    case "self": return ctx.self ? [ctx.self.x, ctx.self.y] : [X + W / 2, Y + H / 2];
    case "other": return ctx.other ? [ctx.other.x, ctx.other.y] : [X + W / 2, Y + H / 2];
    default: return [X + W / 2, Y + H / 2];
  }
}

/** The camera moves toward what it follows (the player when the world is bigger and it names nothing), kept inside the world. */
function camera(s: GameState, ease: number) {
  const { spec } = s;
  if (spec.ww <= spec.w && spec.wh <= spec.h) { s.cx = 0; s.cy = 0; return; }
  const follow = spec.camera.follow;
  const target = follow ? s.bodies.find((b) => !b.dead && isWho(follow, { id: b.of, tags: b.thing.tags })) : s.bodies.find((b) => !b.dead && b.thing.control !== "none");
  if (!target) return;
  const clamp = (v: number, hi: number) => Math.max(0, Math.min(hi, v));
  const tx = clamp(target.x - spec.w / 2, spec.ww - spec.w), ty = clamp(target.y - spec.h / 2, spec.wh - spec.h);
  s.cx += (tx - s.cx) * ease;
  s.cy += (ty - s.cy) * ease;
}

/* ---- the tile map */
const kindAt = (s: GameState, c: number, r: number): GameTileKind | null => {
  const t = s.spec.tiles;
  if (!t || !s.tiles || c < 0 || r < 0 || c >= t.cols || r >= t.rows) return null;
  return t.kinds[s.tiles[r][c]] ?? null;
};
/** A body pushed out of the solid tiles it moved into along one axis (`prevBottom`: where its feet were, for one-way tiles). */
function tileBlock(s: GameState, b: Body, axis: "x" | "y", prevBottom: number) {
  const t = s.spec.tiles!;
  const z = t.size;
  const c0 = Math.floor((b.x - b.w / 2) / z), c1 = Math.floor((b.x + b.w / 2 - 0.001) / z);
  const r0 = Math.floor((b.y - b.h / 2) / z), r1 = Math.floor((b.y + b.h / 2 - 0.001) / z);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const k = kindAt(s, c, r);
    if (!k || !(k.solid || k.oneWay)) continue;
    if (axis === "x") {
      if (!k.solid) continue;
      const right = b.vx > 0;
      if (right) b.x = c * z - b.w / 2; else if (b.vx < 0) b.x = (c + 1) * z + b.w / 2; else continue;
      b.vx = b.thing.bounce ? -b.vx * b.thing.bounce : 0;
      // A patrol turns back from the wall it walked into.
      b.dir = right ? -1 : 1;
      return;
    }
    if (b.vy > 0) {
      // A one-way platform stops only what comes down onto it from above.
      if (!k.solid && prevBottom > r * z + 0.5) continue;
      b.y = r * z - b.h / 2;
      b.vy = b.thing.bounce ? -b.vy * b.thing.bounce : 0;
      b.grounded = true;
      return;
    }
    if (b.vy < 0 && k.solid) { b.y = (r + 1) * z + b.h / 2; b.vy = 0; return; }
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

type Box = Pick<Body, "x" | "y" | "w" | "h">;
const overlap = (a: Box, b: Box, pad = 0) => Math.abs(a.x - b.x) * 2 < a.w + b.w + pad && Math.abs(a.y - b.y) * 2 < a.h + b.h + pad;
const at = (b: Body, x: number, y: number) => Math.abs(b.x - x) * 2 <= b.w && Math.abs(b.y - y) * 2 <= b.h;
const moves = (b: Body) => b.thing.body !== "static";
const player = (s: GameState) => s.bodies.find((b) => !b.dead && b.thing.control !== "none");

/** One step of the game. */
export function stepGame(s: GameState, input: GameInput = NO_INPUT, dt = STEP) {
  if (s.phase !== "playing") return;
  const { spec } = s;
  const W = spec.ww, H = spec.wh;
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
  const jumpPressed = input.pressed.some((k) => k === "Space" || k === "ArrowUp") || input.taps.length > 0;
  const jumpHeld = input.up || input.jumpHeld === true || input.pointerDown;
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
        // Quicker to start than to stop on the ground; slower to turn in the air.
        b.vx += (want - b.vx) * Math.min(1, dt * (b.grounded ? (want ? 14 : 18) : 7));
        if (jumpPressed) b.jumpAt = s.t;
        // A press a moment before landing still jumps, and so does one a moment after leaving an edge.
        if (s.t - b.jumpAt <= 0.12 && (b.grounded || b.air <= 0.1)) {
          b.vy = -t.jump; b.grounded = false; b.air = 1; b.jumpAt = -9; b.cut = false;
          s.effects.push({ kind: "sound", sound: "whoosh" });
        } else if (b.vy < 0 && !jumpHeld && !b.cut && b.air < 1.5 && b.air > 0) {
          // Let go early: a shorter jump.
          b.vy *= 0.5; b.cut = true;
        }
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
    const dynamicOnTiles = b.thing.body === "dynamic" && s.tiles;
    const prevBottom = b.y + b.h / 2;
    b.grounded = false;
    b.x += b.vx * dt;
    if (dynamicOnTiles) tileBlock(s, b, "x", prevBottom);
    b.y += b.vy * dt;
    if (dynamicOnTiles) tileBlock(s, b, "y", prevBottom);
    // A patrol on the ground turns back at a ledge (no tile under the foot in front).
    if (dynamicOnTiles && b.grounded && b.thing.behave === "patrol") {
      const z = spec.tiles!.size;
      const foot = Math.floor((b.x + b.dir * (b.w / 2 + 1)) / z), below = Math.floor((b.y + b.h / 2 + 2) / z);
      const k = kindAt(s, foot, below);
      if (!k || !(k.solid || k.oneWay)) b.dir = b.dir === 1 ? -1 : 1;
    }
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
    b.air = b.grounded ? 0 : b.air + dt;
    if (b.vx > 4) b.face = 1; else if (b.vx < -4) b.face = -1;
    b.anim = b.grounded || b.thing.body !== "dynamic" ? (Math.abs(b.vx) > 20 ? "run" : "idle") : b.vy < 0 ? "jump" : "fall";
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
  if (hits.length && s.tiles && spec.tiles) {
    const z = spec.tiles.size;
    const cells = new Map<number, Body>();
    for (const a of alive) {
      if (a.dead) continue;
      const c0 = Math.floor((a.x - a.w / 2 - 1) / z), c1 = Math.floor((a.x + a.w / 2 + 1) / z);
      const r0 = Math.floor((a.y - a.h / 2 - 1) / z), r1 = Math.floor((a.y + a.h / 2 + 1) / z);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const k = kindAt(s, c, r);
        if (!k || !k.tags.length) continue;
        const cell = r * spec.tiles.cols + c;
        const key = `${a.n}:t${cell}`;
        now.add(key);
        if (s.contacts.has(key)) continue;
        // The tile, as a body for the rules (removing it clears its cell).
        let tile = cells.get(cell);
        if (!tile) {
          const thing = { id: `tile-${s.tiles[r][c]}`, look: k.look, tags: k.tags } as unknown as GameThing;
          tile = { n: -1 - cell, of: thing.id, thing, x: c * z + z / 2, y: r * z + z / 2, w: z, h: z, vx: 0, vy: 0, rot: 0, born: 0, grounded: true, dir: 1, turnAt: 0, dead: false, anim: "idle", face: 1, air: 0, jumpAt: -9, cut: false };
          cells.set(cell, tile);
        }
        for (const rule of hits) {
          const w = rule.when as { a: string; b: string };
          const one = { id: a.of, tags: a.thing.tags }, two = { id: tile.of, tags: k.tags };
          const pair = isWho(w.a, one) && isWho(w.b, two) ? [a, tile] : isWho(w.a, two) && isWho(w.b, one) ? [tile, a] : null;
          if (pair && !pair[0].dead && !pair[1].dead) for (const x of rule.do) act(s, x, { self: pair[0], other: pair[1] });
        }
      }
    }
    for (const [cell, tile] of cells) if (tile.dead) { s.tiles[Math.floor(cell / spec.tiles.cols)][cell % spec.tiles.cols] = "."; s.tilesV++; }
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
  camera(s, 1 - Math.pow(1 - spec.camera.lerp, dt * 60));
  if (s.phase !== "playing") return;
  if (spec.winScore && s.score >= spec.winScore) { s.phase = "won"; s.effects.push({ kind: "sound", sound: "success" }); return; }
  if (spec.lives && s.lives <= 0) { s.phase = "lost"; return; }
  if (spec.time && s.t >= spec.time) { s.phase = spec.timeWins ? "won" : "lost"; if (s.phase === "won") s.effects.push({ kind: "sound", sound: "success" }); }
}

/** Seconds left on the clock (null: no clock). */
export const timeLeft = (s: GameState) => (s.spec.time ? Math.max(0, Math.ceil(s.spec.time - s.t)) : null);
