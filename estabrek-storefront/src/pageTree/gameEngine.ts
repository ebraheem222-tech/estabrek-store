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
 *  - G1b: levels (a map each, or a maze from the seed), "next" and "again" with a cover between (closing on the old
 *    level, the new one made under it, opening), a thing put at its level's start cell; sight (a ray through the
 *    solid tiles and things); brains: a guard (goes round, sees the player and chases it, looks where it was last
 *    seen, gives up), one that flees, a homing one that turns toward the player, and one that goes round its path
 *    (a moving platform carries what stands on it); the shortest way through a map (A*) for those that fly over it,
 *    a jump at a wall and a stop at a ledge for those on foot; a four-way player kept to the corridors' middles.
 *  - G2: rigid things moved by Rapier (gamePhysics.ts) when the game is given it (newGame's second argument; without
 *    it they fall back to the arcade's dynamic bodies); the sling (pulled back from the thing, the shot's way shown,
 *    let go); a shot thing coming to rest; back home; an explosion's push. Rigid things meet by Rapier's touches.
 *  - G2b: joints (gamePhysics.ts), their motors driven by the keys held, and the rules when one breaks or is cut; a
 *    rigid crate pushed along by a body that walks into its side.
 * Things are placed by their centre. Pure (no DOM, no React): GameView.tsx feeds it presses and draws its state.
 */
import { GAME_LIMITS, isWho, type GameAct, type GameRule, type GameSpec, type GameThing, type GameTileKind } from "./gameSpec";
import { findPath, mazeOf, onTrack, rayBox, rayCells, trackOf, type Track } from "./gameWorld";
import { aimPath, isRigid, needsPhysics, physAdd, physCut, physExplode, physFree, physHome, physPush, physSpeed, physStep, physWorld, type Broken, type Phys, type Rapier } from "./gamePhysics";

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
  /** A guard's mind (going round, chasing, looking where it last saw the player), when and where it last saw it. */
  mind: "patrol" | "chase" | "search";
  seen: number;
  lx: number; ly: number;
  /** The cells of its way (A*) and when it works the way out again. */
  route: Array<[number, number]>;
  thinkAt: number;
  /** How far along its path it has gone, from where it started (ox, oy). */
  along: number;
  ox: number; oy: number;
  /** What it stands on (a moving platform carries it). */
  ride: number;
  /** Shot from the sling (when), still in the air or rolling, and how long it has been slow. */
  shotAt: number;
  flying: boolean;
  slow: number;
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
  | { kind: "shake" }
  /** A guard has seen the player: a mark over it. */
  | { kind: "alert"; x: number; y: number };
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
  /** The level played (from 0), when it began, the cover between levels (seconds left) and the level it goes to. */
  level: number;
  levelT: number;
  trans: number;
  goTo: number;
  /** Who sees whom now (a rule's "sees" once, as it begins). */
  seeing: Set<string>;
  /** Rapier, when the game was given it, and the level's world of rigid things. */
  rapier: Rapier | null;
  phys: Phys | null;
  /** A sling pulled back: from which thing, the shot it would be, and its way. */
  aim: { n: number; vx: number; vy: number; pull: number; pts: Array<[number, number]> } | null;
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
  const b: Body = {
    n: s.next++, of: thing.id, thing, x, y, w: thing.w, h: thing.h, vx, vy, rot: 0, born: s.t, grounded: false, dir: 1, turnAt: 0, dead: false, anim: "idle", face: 1, air: 0, jumpAt: -9, cut: false,
    mind: "patrol", seen: -9, lx: x, ly: y, route: [], thinkAt: 0, along: 0, ox: x, oy: y, ride: 0, shotAt: -9, flying: false, slow: 0,
  };
  s.bodies.push(b);
  if (s.phys) physAdd(s.phys, b);
  return b;
}

/** The cover between two levels lasts this long (closing, then opening). */
const TRANS = 0.9;
export const levelCount = (spec: GameSpec) => (spec.tiles ? 1 + spec.tiles.levels.length : 1);

/** A level's map as it's played: as drawn, or a maze from the seed with the drawn marks in its corridors. */
export function levelMap(spec: GameSpec, i: number): string[] {
  const t = spec.tiles;
  if (!t) return [];
  const drawn = i === 0 ? t.map : t.levels[i - 1] ?? t.map;
  if (t.gen !== "maze") return drawn;
  const wall = Object.keys(t.kinds).find((c) => t.kinds[c].solid);
  return wall ? mazeOf(drawn, t.cols, t.rows, wall, (c) => t.kinds[c]?.solid === true, spec.seed + i * 7919) : drawn;
}

/** A level made: its map, the things that aren't templates in their places (or at their start cells), the map's things. */
function setLevel(s: GameState, i: number) {
  const { spec } = s;
  s.level = i;
  s.levelT = s.t;
  s.bodies = [];
  s.contacts = new Set();
  s.seeing = new Set();
  s.dragging = null;
  s.aim = null;
  physFree(s.phys);
  s.phys = null;
  s.tiles = spec.tiles ? levelMap(spec, i).map((r) => r.split("")) : null;
  s.tilesV++;
  for (const thing of spec.things) if (!thing.template) make(s, thing, thing.x, thing.y, thing.vx, thing.vy);
  if (spec.tiles && s.tiles) {
    const { size, kinds } = spec.tiles;
    const placed = new Set<string>();
    s.tiles.forEach((row, r) => row.forEach((ch, c) => {
      const id = kinds[ch]?.thing;
      const thing = id ? spec.things.find((t) => t.id === id) : null;
      if (!thing) return;
      row[c] = ".";
      // On its cell's floor in a world seen from the side; in its middle in one seen from above.
      const x = c * size + size / 2, y = spec.gravity > 0 ? r * size + size - thing.h / 2 : r * size + size / 2;
      if (thing.template) { make(s, thing, x, y, thing.vx, thing.vy); return; }
      // A thing in the world starts here on this level (its first such cell).
      if (placed.has(thing.id)) return;
      placed.add(thing.id);
      const b = s.bodies.find((o) => o.of === thing.id);
      if (b) { b.x = x; b.y = y; b.ox = x; b.oy = y; b.lx = x; b.ly = y; }
    }));
  }
  if (s.rapier && needsPhysics(spec)) s.phys = physWorld(s.rapier, s);
  camera(s, 1);
}

/**
 * A new game, waiting to start: its first level. Given Rapier (loaded, its init() done), its rigid things are
 * Rapier's; without it they are the arcade's dynamic bodies.
 */
export function newGame(spec: GameSpec, rapier: Rapier | null = null): GameState {
  if (!rapier && needsPhysics(spec)) spec = { ...spec, things: spec.things.map((t) => (t.body === "rigid" ? { ...t, body: "dynamic" } : t)) };
  const s: GameState = {
    spec, phase: "ready", t: 0, score: 0, lives: spec.lives, bodies: [], effects: [], shake: 0, speed: 1, next: 1,
    seed: spec.seed, every: spec.rules.map(() => 0), fired: new Set(), contacts: new Set(), dragging: null, steps: 0,
    cx: 0, cy: 0, tiles: null, tilesV: 0, level: 0, levelT: 0, trans: 0, goTo: -1, seeing: new Set(),
    rapier: rapier && needsPhysics(spec) ? rapier : null, phys: null, aim: null,
  };
  setLevel(s, 0);
  return s;
}

export function startGame(s: GameState) {
  if (s.phase === "playing") return;
  if (s.phase !== "ready") { physFree(s.phys); Object.assign(s, newGame(s.spec, s.rapier)); }
  s.phase = "playing";
  run(s, (w) => w.on === "start", {});
  run(s, (w) => w.on === "level" && (w.at === 0 || w.at === 1), {});
}

/** The game put away: its world of rigid things freed (the page left, the editor closed). */
export function endGame(s: GameState) {
  physFree(s.phys);
  s.phys = null;
}

/** A thing let go from the sling. */
function shoot(s: GameState, b: Body, vx: number, vy: number) {
  physSpeed(s.phys, b, vx, vy);
  b.flying = true;
  b.shotAt = s.t;
  b.slow = 0;
  b.grounded = false;
  s.effects.push({ kind: "sound", sound: "whoosh" });
  run(s, (w) => w.on === "shot" && isWho(w.who, { id: b.of, tags: b.thing.tags }), { self: b });
}

/** A joint let go: the rules for each of its two things ("break"), the other as the second. */
function snapped(s: GameState, br: Broken) {
  const A = s.bodies.find((x) => x.n === br.a), B = br.b >= 0 ? s.bodies.find((x) => x.n === br.b) : undefined;
  for (const [self, other] of [[A, B], [B, A]] as const) {
    if (!self) continue;
    run(s, (w) => w.on === "break" && isWho(w.who, { id: self.of, tags: self.thing.tags }), { self, other });
  }
}

/** How much of the view the cover between two levels hides (0–1), and whether it's closing (on the old level). */
export function coverOf(s: GameState): { k: number; closing: boolean } {
  if (s.trans <= 0) return { k: 0, closing: false };
  return { k: Math.max(0, Math.min(1, 1 - Math.abs((s.trans / TRANS) * 2 - 1))), closing: s.goTo >= 0 };
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

/** Is there ground (a solid tile or a one-way platform) under the foot in front, the way it goes. */
function groundAhead(s: GameState, b: Body): boolean {
  const z = s.spec.tiles!.size;
  const k = kindAt(s, Math.floor((b.x + b.dir * (b.w / 2 + 1)) / z), Math.floor((b.y + b.h / 2 + 2) / z));
  return Boolean(k && (k.solid || k.oneWay));
}
const wallAhead = (s: GameState, b: Body) => kindAt(s, Math.floor((b.x + b.dir * (b.w / 2 + 2)) / s.spec.tiles!.size), Math.floor(b.y / s.spec.tiles!.size))?.solid === true;
/** It goes over the map (seen from above, or no gravity on it), rather than on foot. */
const flies = (s: GameState, b: Body) => b.thing.body !== "dynamic" || s.spec.gravity * b.thing.gravity === 0;
const cellOf = (s: GameState, x: number, y: number): [number, number] => [Math.floor(x / s.spec.tiles!.size), Math.floor(y / s.spec.tiles!.size)];
const solidAt = (s: GameState) => (c: number, r: number) => kindAt(s, c, r)?.solid === true;

/** Does `a` see `b`: in its sight, ahead of it in a world seen from the side (`ahead`), nothing solid between. */
function sees(s: GameState, a: Body, b: Body, ahead = true): boolean {
  const range = a.thing.sight;
  if (!range) return false;
  const dx = b.x - a.x, dy = b.y - a.y;
  if (dx * dx + dy * dy > range * range) return false;
  if (ahead && !flies(s, a) && dx * a.face < -a.w / 2) return false;
  const t = s.spec.tiles;
  if (t && s.tiles && rayCells(t.size, solidAt(s), a.x, a.y, b.x, b.y) < 1) return false;
  for (const o of s.bodies) if (!o.dead && o.thing.solid && o !== a && o !== b && rayBox(a.x, a.y, b.x, b.y, o) < 1) return false;
  return true;
}

/**
 * A body steered toward a place: on foot, toward it across (jumping a wall, waiting at a ledge); over a tile map, along
 * its shortest way (worked out again every so often), the way's other line kept to the corridor's middle; over open
 * ground, straight. True once it's there (or there's no way there).
 */
function goToward(s: GameState, b: Body, tx: number, ty: number, speed: number): boolean {
  const t = s.spec.tiles;
  if (!flies(s, b)) {
    const dx = tx - b.x;
    b.vx = Math.abs(dx) > 6 ? Math.sign(dx) * speed : 0;
    if (b.vx) b.dir = b.vx > 0 ? 1 : -1;
    if (t && s.tiles && b.grounded && b.vx) {
      if (wallAhead(s, b) && b.thing.jump) { b.vy = -b.thing.jump; b.grounded = false; }
      else if (!groundAhead(s, b)) b.vx = 0;
    }
    return Math.abs(dx) <= 6;
  }
  if (!t || !s.tiles) {
    const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
    if (d < 4) { b.vx = 0; b.vy = 0; return true; }
    b.vx = (dx / d) * speed;
    b.vy = (dy / d) * speed;
    return false;
  }
  const z = t.size, here = cellOf(s, b.x, b.y), goal = cellOf(s, tx, ty);
  if (s.t >= b.thinkAt || !b.route.length) {
    b.thinkAt = s.t + 0.35;
    b.route = findPath({ cols: t.cols, rows: t.rows, blocked: solidAt(s) }, here, goal, 3000) ?? [];
  }
  const near = Math.max(2, speed * STEP);
  while (b.route.length) {
    const [c, r] = b.route[0];
    const cx = c * z + z / 2, cy = r * z + z / 2, dx = cx - b.x, dy = cy - b.y;
    if (Math.abs(dx) <= near && Math.abs(dy) <= near) { b.route.shift(); continue; }
    if (Math.abs(dx) >= Math.abs(dy)) { b.vx = Math.sign(dx) * speed; b.vy = Math.max(-speed, Math.min(speed, dy * 10)); }
    else { b.vy = Math.sign(dy) * speed; b.vx = Math.max(-speed, Math.min(speed, dx * 10)); }
    return false;
  }
  if (here[0] !== goal[0] || here[1] !== goal[1]) { b.vx = 0; b.vy = 0; return true; }
  const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
  if (d < 3) { b.vx = 0; b.vy = 0; return true; }
  b.vx = (dx / d) * speed;
  b.vy = (dy / d) * speed;
  return false;
}

/** A guard going round: on foot back and forth (turning at a wall or a ledge); over a map, to one near cell after another. */
function goRound(s: GameState, b: Body) {
  const t = s.spec.tiles, speed = b.thing.speed * 0.6;
  if (!flies(s, b)) {
    b.vx = speed * b.dir;
    if (t && s.tiles && b.grounded && (wallAhead(s, b) || !groundAhead(s, b))) { b.dir = b.dir === 1 ? -1 : 1; b.vx = speed * b.dir; }
    return;
  }
  if (!t || !s.tiles) {
    if (s.t >= b.turnAt) { const a = random(s) * Math.PI * 2; b.vx = Math.cos(a) * speed; b.vy = Math.sin(a) * speed; b.turnAt = s.t + 1 + random(s) * 1.5; }
    return;
  }
  if (s.t >= b.turnAt) {
    const [hc, hr] = cellOf(s, b.x, b.y);
    for (let k = 0; k < 8; k++) {
      const c = hc + Math.floor(random(s) * 11) - 5, r = hr + Math.floor(random(s) * 11) - 5;
      if (c < 0 || r < 0 || c >= t.cols || r >= t.rows || kindAt(s, c, r)?.solid) continue;
      b.lx = c * t.size + t.size / 2;
      b.ly = r * t.size + t.size / 2;
      b.route = [];
      break;
    }
    b.turnAt = s.t + 4;
  }
  if (goToward(s, b, b.lx, b.ly, speed)) b.turnAt = Math.min(b.turnAt, s.t + 0.3);
}

/** A thing's path, from where it starts, made ready once. */
const tracks = new WeakMap<GameThing, Track>();
function trackFor(thing: GameThing): Track {
  let t = tracks.get(thing);
  if (!t) { t = trackOf([[0, 0], ...(thing.path?.points ?? [])], thing.path?.loop === true, thing.path?.smooth === true); tracks.set(thing, t); }
  return t;
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
    case "speed": { const b = a.who === "self" ? ctx.self : ctx.other; if (b) physSpeed(s.phys, b, a.vx, a.vy); return; }
    case "faster": s.speed = Math.min(4, s.speed * a.by); return;
    case "shake": s.shake = 0.3; s.effects.push({ kind: "shake" }); return;
    case "sound": s.effects.push({ kind: "sound", sound: a.kind }); return;
    case "burst": { const b = a.who === "other" ? ctx.other ?? ctx.self : ctx.self ?? ctx.other; if (b) s.effects.push({ kind: "burst", x: b.x, y: b.y, color: b.thing.look.color }); return; }
    case "home": { const b = a.who === "other" ? ctx.other : ctx.self; if (b) { physHome(s.phys, b); b.flying = false; } return; }
    case "explode": {
      const b = a.who === "other" ? ctx.other ?? ctx.self : ctx.self ?? ctx.other;
      if (!b) return;
      physExplode(s.phys, s, b.x, b.y, a.radius, a.power, b);
      s.effects.push({ kind: "burst", x: b.x, y: b.y, color: b.thing.look.color }, { kind: "sound", sound: "hit" });
      s.shake = 0.3;
      s.effects.push({ kind: "shake" });
      return;
    }
    case "cut": { const b = a.who === "other" ? ctx.other : ctx.self; if (b) for (const br of physCut(s.phys, b.n)) snapped(s, br); return; }
    case "next": case "retry": {
      // Made when the cover has closed (at the next step), never in the middle of one.
      if (s.goTo >= 0) return;
      const to = a.act === "retry" ? s.level : s.level + 1;
      if (to >= levelCount(s.spec)) { s.phase = "won"; s.effects.push({ kind: "sound", sound: "success" }); return; }
      s.goTo = to;
      s.trans = s.spec.transition === "none" ? 0 : TRANS;
      return;
    }
  }
}

type Box = Pick<Body, "x" | "y" | "w" | "h">;
/** A body's box; a turned rigid one's is the box round it. */
function boxOf(b: Body): Box {
  if (!b.rot || !isRigid(b) || b.thing.shape === "circle") return b;
  const c = Math.abs(Math.cos(b.rot)), n = Math.abs(Math.sin(b.rot));
  return { x: b.x, y: b.y, w: b.w * c + b.h * n, h: b.w * n + b.h * c };
}
const overlap = (a: Box, b: Box, pad = 0) => Math.abs(a.x - b.x) * 2 < a.w + b.w + pad && Math.abs(a.y - b.y) * 2 < a.h + b.h + pad;
const at = (b: Body, x: number, y: number) => Math.abs(b.x - x) * 2 <= b.w && Math.abs(b.y - y) * 2 <= b.h;
const moves = (b: Body) => b.thing.body !== "static";
const player = (s: GameState) => s.bodies.find((b) => !b.dead && b.thing.control !== "none");

/** One step of the game. */
export function stepGame(s: GameState, input: GameInput = NO_INPUT, dt = STEP) {
  if (s.phase !== "playing") return;
  const { spec } = s;
  // Between two levels: the cover closes on the old one, the new one is made under it, and it opens.
  if (s.goTo >= 0 || s.trans > 0) {
    s.trans = Math.max(0, s.trans - dt);
    if (s.goTo >= 0 && s.trans <= TRANS / 2) {
      const i = s.goTo;
      s.goTo = -1;
      setLevel(s, i);
      run(s, (w) => w.on === "level" && (w.at === 0 || w.at === i + 1), {});
    }
    if (s.trans > 0) return;
  }
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
        // In a tile map's corridors: kept to the middle across its way, so it turns into an opening.
        if (s.tiles && spec.tiles && t.body === "dynamic" && b.w <= spec.tiles.size && b.h <= spec.tiles.size) {
          const z = spec.tiles.size, cap = (v: number) => Math.max(-t.speed, Math.min(t.speed, v));
          if (b.vx && !b.vy) b.vy = cap(((Math.floor(b.y / z) + 0.5) * z - b.y) * 10);
          else if (b.vy && !b.vx) b.vx = cap(((Math.floor(b.x / z) + 0.5) * z - b.x) * 10);
        }
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
      case "sling": {
        // Pulled back from the thing (near it, while it's still): the shot goes the other way, harder the further.
        const PULL = 170, p = input.pointer, aiming = s.aim?.n === b.n;
        const still = Math.hypot(b.vx, b.vy) < 12;
        if (input.pointerDown && p && (aiming || (!s.aim && still && Math.abs(p.x - b.x) < b.w / 2 + 60 && Math.abs(p.y - b.y) < b.h / 2 + 60))) {
          const dx = b.x - p.x, dy = b.y - p.y, len = Math.hypot(dx, dy) || 1, k = (Math.min(len, PULL) / PULL) * t.speed;
          const vx = (dx / len) * k, vy = (dy / len) * k;
          s.aim = { n: b.n, vx, vy, pull: Math.min(len, PULL), pts: aimPath(spec, t, b.x, b.y, vx, vy) };
        } else if (aiming && !input.pointerDown) {
          const a = s.aim!;
          s.aim = null;
          if (Math.hypot(a.vx, a.vy) > t.speed * 0.1) shoot(s, b, a.vx, a.vy);
        }
        break;
      }
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
      case "guard": {
        const p = player(s);
        if (p && p !== b && sees(s, b, p)) {
          if (b.mind !== "chase") s.effects.push({ kind: "alert", x: b.x, y: b.y - b.h / 2 - 14 });
          b.mind = "chase"; b.seen = s.t; b.lx = p.x; b.ly = p.y;
        } else if (b.mind === "chase" && s.t - b.seen > 1.2) { b.mind = "search"; b.route = []; b.thinkAt = 0; }
        if (b.mind === "chase" && p) goToward(s, b, p.x, p.y, t.speed * 1.3);
        else if (b.mind === "search") { if (goToward(s, b, b.lx, b.ly, t.speed) || s.t - b.seen > 6) { b.mind = "patrol"; b.route = []; b.turnAt = 0; } }
        else goRound(s, b);
        break;
      }
      case "flee": {
        const p = player(s);
        if (!p || p === b || !sees(s, b, p, false)) { goRound(s, b); break; }
        if (spec.tiles && s.tiles && flies(s, b)) {
          // The open cell beside it furthest from the player.
          const z = spec.tiles.size, [hc, hr] = cellOf(s, b.x, b.y);
          let best: [number, number] = [hc, hr], far = -1;
          for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const c = hc + dx, r = hr + dy;
            if (c < 0 || r < 0 || c >= spec.tiles.cols || r >= spec.tiles.rows || kindAt(s, c, r)?.solid) continue;
            const d = Math.hypot(c * z + z / 2 - p.x, r * z + z / 2 - p.y);
            if (d > far) { far = d; best = [c, r]; }
          }
          b.route = [];
          goToward(s, b, best[0] * z + z / 2, best[1] * z + z / 2, t.speed);
        } else {
          const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1;
          b.vx = (dx / d) * t.speed;
          if (flies(s, b)) b.vy = (dy / d) * t.speed;
        }
        break;
      }
      case "homing": {
        // It turns toward the player a little at a time (it can be dodged), pointing the way it goes.
        const p = player(s);
        if (p && p !== b) {
          const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, dt * 2.5);
          b.vx += ((dx / d) * t.speed - b.vx) * k;
          b.vy += ((dy / d) * t.speed - b.vy) * k;
        }
        if (Math.hypot(b.vx, b.vy) > 1) b.rot = Math.atan2(b.vy, b.vx);
        break;
      }
      case "path": {
        if (!t.path) break;
        b.along += t.speed * dt;
        const [px, py] = onTrack(trackFor(t), b.along);
        b.vx = (b.ox + px - b.x) / dt;
        b.vy = (b.oy + py - b.y) / dt;
        break;
      }
    }
  }
  if (!input.pointerDown) s.dragging = null;

  /* ---- moving, solids and edges */
  const solids = s.bodies.filter((b) => !b.dead && b.thing.solid);
  for (const b of s.bodies) {
    if (b.dead || !moves(b) || isRigid(b)) continue;
    if (b.thing.body === "dynamic") b.vy += spec.gravity * b.thing.gravity * dt;
    const dynamicOnTiles = b.thing.body === "dynamic" && s.tiles;
    // Carried by the moving thing it stands on.
    if (b.ride) {
      const o = s.bodies.find((x) => x.n === b.ride);
      if (o && !o.dead && moves(o)) { b.x += o.vx * dt; if (o.vy > 0) b.y += o.vy * dt; }
      b.ride = 0;
    }
    const prevBottom = b.y + b.h / 2;
    b.grounded = false;
    b.x += b.vx * dt;
    if (dynamicOnTiles) tileBlock(s, b, "x", prevBottom);
    b.y += b.vy * dt;
    if (dynamicOnTiles) tileBlock(s, b, "y", prevBottom);
    // A patrol on the ground turns back at a ledge (no tile under the foot in front).
    if (dynamicOnTiles && b.grounded && b.thing.behave === "patrol" && !groundAhead(s, b)) b.dir = b.dir === 1 ? -1 : 1;
    // Only a dynamic body is pushed by solids (a kinematic one, a paddle or a falling coin, just moves by its speed).
    if (b.thing.body !== "dynamic") continue;
    for (const o of solids) {
      if (o === b || !overlap(b, o)) continue;
      // Out along the shortest way; a bouncy body turns back, the rest stop on that side.
      const px = (b.w + o.w) / 2 - Math.abs(b.x - o.x), py = (b.h + o.h) / 2 - Math.abs(b.y - o.y);
      if (px < py) {
        const side = b.x < o.x ? -1 : 1;
        // Walked into a rigid crate's side: it's pushed along.
        if (isRigid(o)) physPush(s.phys, o, side, b.vx);
        b.x += side * px;
        b.vx = b.thing.bounce ? Math.abs(b.vx) * side * b.thing.bounce : 0;
        if (b.thing.behave === "patrol") b.dir = side;
      } else {
        const side = b.y < o.y ? -1 : 1;
        b.y += side * py;
        if (side < 0) { b.grounded = true; b.ride = o.n; }
        b.vy = b.thing.bounce ? Math.abs(b.vy) * side * b.thing.bounce : 0;
      }
    }
  }
  // The rigid things: Rapier's step, with what the game moved put in place first.
  if (s.phys) for (const br of physStep(s.phys, s, dt, input)) snapped(s, br);
  const closed = { top: spec.edges === "walls" || spec.edges === "sides", sides: spec.edges === "walls" || spec.edges === "sides", bottom: spec.edges === "walls" || spec.edges === "floor" };
  for (const b of s.bodies) {
    if (b.dead || !moves(b)) continue;
    // A rigid thing's edges are Rapier's walls.
    const keep = b.thing.keepIn && !isRigid(b);
    const bounce = b.thing.bounce;
    const cl = isRigid(b) ? { top: false, sides: false, bottom: false } : closed;
    if ((cl.sides || keep) && b.x - b.w / 2 < 0) { b.x = b.w / 2; b.vx = bounce ? Math.abs(b.vx) * bounce : 0; b.dir = 1; }
    if ((cl.sides || keep) && b.x + b.w / 2 > W) { b.x = W - b.w / 2; b.vx = bounce ? -Math.abs(b.vx) * bounce : 0; b.dir = -1; }
    if ((cl.top || keep) && b.y - b.h / 2 < 0) { b.y = b.h / 2; b.vy = bounce ? Math.abs(b.vy) * bounce : 0; }
    if ((cl.bottom || keep) && b.y + b.h / 2 > H) { b.y = H - b.h / 2; b.vy = bounce ? -Math.abs(b.vy) * bounce : 0; b.grounded = true; }
    // Out of the world: past a margin on its way out (a thing spawned at an edge, half out, is still coming in).
    const m = Math.max(b.w, b.h);
    const outside = () => b.x < -m || b.x > W + m || b.y < -m * 1.5 || b.y > H + m * 0.6;
    if (outside()) {
      run(s, (w) => w.on === "out" && isWho(w.who, { id: b.of, tags: b.thing.tags }), { self: b });
      // A rule may have put it back (home): then it stays.
      if (outside()) b.dead = true;
    }
    // A shot thing that has come to rest.
    if (b.flying && !b.dead) {
      b.slow = Math.hypot(b.vx, b.vy) < 10 ? b.slow + dt : 0;
      if (b.slow >= 0.4 && s.t - b.shotAt > 0.3) { b.flying = false; run(s, (w) => w.on === "rest" && isWho(w.who, { id: b.of, tags: b.thing.tags }), { self: b }); }
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
      // Two in Rapier's world meet when it says they touch; the rest by their boxes (a turned rigid one's whole box).
      const both = s.phys?.bodies.has(a.n) && s.phys.bodies.has(b.n);
      if (both ? !s.phys!.touching.has(`${Math.min(a.n, b.n)}:${Math.max(a.n, b.n)}`) : !overlap(boxOf(a), boxOf(b), 1)) continue;
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
          tile = { n: -1 - cell, of: thing.id, thing, x: c * z + z / 2, y: r * z + z / 2, w: z, h: z, vx: 0, vy: 0, rot: 0, born: 0, grounded: true, dir: 1, turnAt: 0, dead: false, anim: "idle", face: 1, air: 0, jumpAt: -9, cut: false, mind: "patrol", seen: -9, lx: 0, ly: 0, route: [], thinkAt: 0, along: 0, ox: 0, oy: 0, ride: 0, shotAt: -9, flying: false, slow: 0 };
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

  /* ---- sight: each pair once, as the first comes to see the second */
  const looks = spec.rules.filter((r) => r.when.on === "see");
  if (looks.length) {
    const seeing = new Set<string>();
    const living = s.bodies.filter((b) => !b.dead);
    for (const r of looks) {
      const w = r.when as { a: string; b: string };
      const as = living.filter((x) => isWho(w.a, { id: x.of, tags: x.thing.tags })).slice(0, 24);
      const bs = living.filter((x) => isWho(w.b, { id: x.of, tags: x.thing.tags })).slice(0, 24);
      for (const a of as) for (const b of bs) {
        if (a === b || a.dead || b.dead || !sees(s, a, b)) continue;
        const key = `${a.n}>${b.n}`;
        seeing.add(key);
        if (!s.seeing.has(key)) for (const x of r.do) act(s, x, { self: a, other: b });
      }
    }
    s.seeing = seeing;
  }

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
  // The clock is each level's own.
  if (spec.time && s.t - s.levelT >= spec.time) { s.phase = spec.timeWins ? "won" : "lost"; if (s.phase === "won") s.effects.push({ kind: "sound", sound: "success" }); }
}

/** Seconds left on this level's clock (null: no clock). */
export const timeLeft = (s: GameState) => (s.spec.time ? Math.max(0, Math.ceil(s.spec.time - (s.t - s.levelT))) : null);
