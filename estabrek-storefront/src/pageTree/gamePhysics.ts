/**
 * Rigid bodies for the games stage (G2 of docs/game-engine-plan.ar.md), worked out by Rapier (its 2D deterministic
 * build: the same presses give the same game on every device, as the rest of the engine does).
 *  - The package isn't imported here: the shop (GameView.tsx) and the admin (its game editor) each load it and hand
 *    it over, since this file is shared and the admin's live build has no shop packages. What's used of it is
 *    described by the small types below.
 *  - Rapier works in metres: PX pixels are one metre. Its y goes down as the page's does.
 *  - In its world: each rigid thing (a box, a circle, or a convex shape of up to eight points, with its density,
 *    friction, bounce, drag, a share of the gravity, turning or not, and continuous collision for fast ones), the
 *    things that are solid but not rigid (fixed, or moved where the game puts them), the tile map's solid tiles (a
 *    run of a row as one box), and the world's closed edges.
 *  - Each step: what the game moved is put in place, the world steps, who began or stopped touching is noted, and
 *    the rigid things' places, turns and speeds are read back.
 *  - Also: a shot's way before it's shot (gravity and drag, as the world will do it), and an explosion's push that
 *    weakens with distance. Pure besides Rapier: no DOM, no React.
 */
import type { Body, GameState } from "./gameEngine";
import type { GameSpec, GameThing } from "./gameSpec";

/* ---- what of Rapier is used */
type V = { x: number; y: number };
type RBody = {
  handle: number;
  translation(): V; rotation(): number; linvel(): V; mass(): number;
  setLinvel(v: V, wake: boolean): void; setAngvel(a: number, wake: boolean): void;
  setTranslation(v: V, wake: boolean): void; setRotation(a: number, wake: boolean): void;
  applyImpulse(v: V, wake: boolean): void; setNextKinematicTranslation(v: V): void;
};
type RBodyDesc = {
  setTranslation(x: number, y: number): RBodyDesc; setRotation(a: number): RBodyDesc; setLinvel(x: number, y: number): RBodyDesc;
  setGravityScale(s: number): RBodyDesc; setLinearDamping(d: number): RBodyDesc; setAngularDamping(d: number): RBodyDesc;
  setCcdEnabled(on: boolean): RBodyDesc; lockRotations(): RBodyDesc;
};
type RColliderDesc = {
  setDensity(d: number): RColliderDesc; setFriction(f: number): RColliderDesc; setRestitution(r: number): RColliderDesc;
  setActiveEvents(e: number): RColliderDesc; setTranslation(x: number, y: number): RColliderDesc;
};
type RWorld = {
  timestep: number;
  step(q?: RQueue): void;
  createRigidBody(d: RBodyDesc): RBody;
  createCollider(d: RColliderDesc, parent?: RBody): { handle: number };
  removeRigidBody(b: RBody): void;
  free(): void;
};
type RQueue = { drainCollisionEvents(f: (a: number, b: number, started: boolean) => void): void; free(): void };
/** The loaded package (its default export, after its init()). */
export type Rapier = {
  World: new (gravity: V) => RWorld;
  EventQueue: new (autoDrain: boolean) => RQueue;
  RigidBodyDesc: { dynamic(): RBodyDesc; fixed(): RBodyDesc; kinematicPositionBased(): RBodyDesc };
  ColliderDesc: { cuboid(hx: number, hy: number): RColliderDesc; ball(r: number): RColliderDesc; convexHull(p: Float32Array): RColliderDesc | null };
  ActiveEvents: { COLLISION_EVENTS: number };
};

/** Pixels in a metre. */
export const PX = 50;

export type Phys = {
  R: Rapier;
  world: RWorld;
  queue: RQueue;
  /** Each body in the world, by the game's own number for it: rigid ones, and solid ones the game moves. */
  bodies: Map<number, RBody>;
  /** Whose each collider is (the map's and the edges': -1). */
  owner: Map<number, number>;
  /** Pairs of the game's bodies touching now ("a:b", the smaller number first). */
  touching: Set<string>;
  /** The map's solid tiles, made again when a rule takes a tile away. */
  map: RBody | null;
  mapV: number;
};

/** Does a game need the world: has it a rigid thing. */
export const needsPhysics = (spec: GameSpec) => spec.things.some((t) => t.body === "rigid");
export const isRigid = (b: Body) => b.thing.body === "rigid";

/** The thing's shape for the world, in metres, about its centre. */
function shapeOf(R: Rapier, t: GameThing, w: number, h: number): RColliderDesc {
  if (t.shape === "circle") return R.ColliderDesc.ball(Math.min(w, h) / 2 / PX);
  if (t.shape === "poly" && t.points.length >= 3) {
    const pts = new Float32Array(t.points.flatMap(([x, y]) => [(x * w) / PX, (y * h) / PX]));
    const hull = R.ColliderDesc.convexHull(pts);
    if (hull) return hull;
  }
  return R.ColliderDesc.cuboid(w / 2 / PX, h / 2 / PX);
}

/** A body of the game into the world: a rigid thing, or a solid one (fixed, or moved by the game). */
export function physAdd(p: Phys, b: Body) {
  const t = b.thing, R = p.R;
  if (p.bodies.has(b.n)) return;
  let desc: RBodyDesc;
  if (t.body === "rigid") {
    desc = R.RigidBodyDesc.dynamic().setTranslation(b.x / PX, b.y / PX).setRotation(b.rot).setLinvel(b.vx / PX, b.vy / PX)
      .setGravityScale(t.gravity).setLinearDamping(t.drag).setAngularDamping(Math.max(0.05, t.drag)).setCcdEnabled(t.fast);
    if (t.spinLock) desc = desc.lockRotations();
  } else if (t.solid && t.body !== "dynamic") {
    desc = (t.body === "static" ? R.RigidBodyDesc.fixed() : R.RigidBodyDesc.kinematicPositionBased()).setTranslation(b.x / PX, b.y / PX).setRotation(b.rot);
  } else return;
  const rb = p.world.createRigidBody(desc);
  const col = shapeOf(R, t, b.w, b.h).setDensity(t.density).setFriction(t.friction).setRestitution(t.bounce).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
  p.owner.set(p.world.createCollider(col, rb).handle, b.n);
  p.bodies.set(b.n, rb);
}

/** The map's solid tiles as fixed boxes, each run of a row one box. */
function buildMap(p: Phys, s: GameState) {
  if (p.map) { p.world.removeRigidBody(p.map); p.map = null; }
  p.mapV = s.tilesV;
  const t = s.spec.tiles;
  if (!t || !s.tiles) return;
  const rb = p.world.createRigidBody(p.R.RigidBodyDesc.fixed());
  s.tiles.forEach((row, r) => {
    let from = -1;
    for (let c = 0; c <= row.length; c++) {
      const solid = c < row.length && t.kinds[row[c]]?.solid === true;
      if (solid && from < 0) from = c;
      if (!solid && from >= 0) {
        const w = (c - from) * t.size, cx = from * t.size + w / 2, cy = r * t.size + t.size / 2;
        const col = p.R.ColliderDesc.cuboid(w / 2 / PX, t.size / 2 / PX).setTranslation(cx / PX, cy / PX).setFriction(0.6);
        p.owner.set(p.world.createCollider(col, rb).handle, -1);
        from = -1;
      }
    }
  });
  p.map = rb;
}

/** A world for a level: gravity, the closed edges, the map, and the game's bodies. */
export function physWorld(R: Rapier, s: GameState): Phys {
  const { spec } = s;
  const world = new R.World({ x: 0, y: spec.gravity / PX });
  world.timestep = 1 / 60;
  const p: Phys = { R, world, queue: new R.EventQueue(true), bodies: new Map(), owner: new Map(), touching: new Set(), map: null, mapV: -1 };
  // The edges: a thick wall just outside each closed side.
  const W = spec.ww / PX, H = spec.wh / PX, T = 2;
  const sides = spec.edges === "walls" || spec.edges === "sides", bottom = spec.edges === "walls" || spec.edges === "floor", top = spec.edges === "walls" || spec.edges === "sides";
  const edges = world.createRigidBody(R.RigidBodyDesc.fixed());
  const wall = (cx: number, cy: number, hx: number, hy: number) => p.owner.set(world.createCollider(R.ColliderDesc.cuboid(hx, hy).setTranslation(cx, cy).setFriction(0.6), edges).handle, -1);
  if (sides) { wall(-T, H / 2, T, H / 2 + T * 2); wall(W + T, H / 2, T, H / 2 + T * 2); }
  if (top) wall(W / 2, -T, W / 2 + T * 2, T);
  if (bottom) wall(W / 2, H + T, W / 2 + T * 2, T);
  buildMap(p, s);
  for (const b of s.bodies) if (!b.dead) physAdd(p, b);
  return p;
}

/** One step of the world: the game's moves put in place, the world stepped, touches noted, the rigid things read back. */
export function physStep(p: Phys, s: GameState, dt: number) {
  if (p.mapV !== s.tilesV) buildMap(p, s);
  for (const [n, rb] of p.bodies) {
    const b = s.bodies.find((x) => x.n === n);
    if (!b || b.dead) { p.world.removeRigidBody(rb); p.bodies.delete(n); continue; }
    if (isRigid(b)) {
      // What the controls ask of a rigid thing: a speed across (and down, four ways).
      const c = b.thing.control;
      if (c === "leftRight") rb.setLinvel({ x: b.vx / PX, y: rb.linvel().y }, true);
      else if (c === "fourWay") rb.setLinvel({ x: b.vx / PX, y: b.vy / PX }, true);
    } else rb.setNextKinematicTranslation({ x: b.x / PX, y: b.y / PX });
  }
  p.world.timestep = dt;
  p.world.step(p.queue);
  p.queue.drainCollisionEvents((h1, h2, started) => {
    const a = p.owner.get(h1), b = p.owner.get(h2);
    if (a === undefined || b === undefined || a < 0 || b < 0 || a === b) return;
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (started) p.touching.add(key); else p.touching.delete(key);
  });
  for (const b of s.bodies) {
    const rb = isRigid(b) ? p.bodies.get(b.n) : undefined;
    if (!rb) continue;
    const at = rb.translation(), v = rb.linvel();
    b.x = at.x * PX; b.y = at.y * PX; b.rot = rb.rotation();
    b.vx = v.x * PX; b.vy = v.y * PX;
  }
}

export function physFree(p: Phys | null) {
  if (!p) return;
  try { p.queue.free(); p.world.free(); } catch { /* already freed */ }
}

/** A rigid thing's speed set (a shot, a rule's "speed"); others take it as they are. */
export function physSpeed(p: Phys | null, b: Body, vx: number, vy: number) {
  b.vx = vx; b.vy = vy;
  const rb = p?.bodies.get(b.n);
  if (rb && isRigid(b)) rb.setLinvel({ x: vx / PX, y: vy / PX }, true);
}
/** A thing put back where it started, still (a rule's "home"). */
export function physHome(p: Phys | null, b: Body) {
  b.x = b.ox; b.y = b.oy; b.vx = 0; b.vy = 0; b.rot = 0;
  const rb = p?.bodies.get(b.n);
  if (rb && isRigid(b)) { rb.setTranslation({ x: b.x / PX, y: b.y / PX }, true); rb.setLinvel({ x: 0, y: 0 }, true); rb.setAngvel(0, true); rb.setRotation(0, true); }
}
/** An explosion at (x, y): each thing within `radius` pushed away, harder the nearer it is (a rigid one by an impulse). */
export function physExplode(p: Phys | null, s: GameState, x: number, y: number, radius: number, power: number, not?: Body) {
  for (const b of s.bodies) {
    if (b.dead || b === not || b.thing.body === "static" || b.thing.body === "none") continue;
    const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy);
    if (d >= radius) continue;
    const k = power * (1 - d / radius), ux = d ? dx / d : 0, uy = d ? dy / d : -1;
    const rb = p?.bodies.get(b.n);
    if (rb && isRigid(b)) { const m = rb.mass(); rb.applyImpulse({ x: (ux * k * m) / PX, y: (uy * k * m) / PX }, true); }
    else { b.vx += ux * k; b.vy += uy * k; }
  }
}

/** A shot's way before it's shot: where it will be every so often, under the world's gravity and its own drag. */
export function aimPath(spec: GameSpec, t: GameThing, x: number, y: number, vx: number, vy: number, count = 22): Array<[number, number]> {
  const g = spec.gravity * t.gravity, drag = t.body === "rigid" ? t.drag : 0, dt = 1 / 60;
  const pts: Array<[number, number]> = [];
  for (let k = 1; k <= count * 3; k++) {
    vy += g * dt;
    // As Rapier damps: a share off each step.
    const keep = 1 / (1 + dt * drag);
    vx *= keep; vy *= keep;
    x += vx * dt; y += vy * dt;
    if (k % 3 === 0) pts.push([x, y]);
  }
  return pts;
}
