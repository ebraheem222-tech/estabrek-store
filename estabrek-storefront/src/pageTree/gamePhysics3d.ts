/**
 * Real 3D physics for the games stage (G4b of docs/game-engine-plan.ar.md), worked out by Rapier's 3D deterministic
 * build, for a game seen in 3D on the ground that asks for it (`view3d.physics`).
 *  - The package isn't imported here: the shop (GameView.tsx) loads it and hands it over (as gamePhysics.ts does
 *    for 2D). What's used of it is described by the small types below.
 *  - Its world: the ground under everything, the closed edges as walls, the map's solid tiles as blocks of their
 *    height, each rigid thing in its 3D shape (a box, a ball, a cylinder, a cone, its convex shape raised) falling,
 *    rolling, tumbling and stacking for real, the things solid but not rigid (fixed, or moved by the game), and a
 *    walker: an upright capsule the arrows move across the ground and Space makes jump (only from the ground).
 *  - Each step: what the game moved put in place, the walkers' wishes, the world stepped, who touches whom, and back:
 *    across (x), away (y) and up (z) in pixels, the turn as a quaternion, and which things have just tipped over.
 * Rapier works in metres (PX pixels each) with y up; the game's y (away) is Rapier's z.
 */
import type { Body, GameInput, GameState } from "./gameEngine";
import { heightOf3d, shapeOf3d, type GameSpec, type GameThing } from "./gameSpec";

type V = { x: number; y: number; z: number };
type Q = { x: number; y: number; z: number; w: number };
type RBody = {
  handle: number;
  translation(): V; rotation(): Q; linvel(): V; mass(): number;
  setLinvel(v: V, wake: boolean): void; setAngvel(v: V, wake: boolean): void;
  setTranslation(v: V, wake: boolean): void; setRotation(q: Q, wake: boolean): void;
  applyImpulse(v: V, wake: boolean): void; setNextKinematicTranslation(v: V): void;
};
type RBodyDesc = {
  setTranslation(x: number, y: number, z: number): RBodyDesc; setRotation(q: Q): RBodyDesc; setLinvel(x: number, y: number, z: number): RBodyDesc;
  setGravityScale(s: number): RBodyDesc; setLinearDamping(d: number): RBodyDesc; setAngularDamping(d: number): RBodyDesc;
  setCcdEnabled(on: boolean): RBodyDesc; lockRotations(): RBodyDesc;
};
type RColliderDesc = {
  setDensity(d: number): RColliderDesc; setFriction(f: number): RColliderDesc; setRestitution(r: number): RColliderDesc;
  setActiveEvents(e: number): RColliderDesc; setTranslation(x: number, y: number, z: number): RColliderDesc;
  setFrictionCombineRule(rule: number): RColliderDesc;
};
type RWorld = {
  timestep: number;
  step(q?: RQueue): void;
  createRigidBody(d: RBodyDesc): RBody;
  createCollider(d: RColliderDesc, parent?: RBody): { handle: number };
  removeRigidBody(b: RBody): void;
  castRay(ray: unknown, maxToi: number, solid: boolean, flags?: number, groups?: number, exceptCollider?: unknown, exceptBody?: RBody): { timeOfImpact: number } | null;
  free(): void;
};
type RQueue = { drainCollisionEvents(f: (a: number, b: number, started: boolean) => void): void; free(): void };
/** The loaded 3D package (its default export, after its init()). */
export type Rapier3 = {
  World: new (gravity: V) => RWorld;
  EventQueue: new (autoDrain: boolean) => RQueue;
  Ray: new (origin: V, dir: V) => unknown;
  RigidBodyDesc: { dynamic(): RBodyDesc; fixed(): RBodyDesc; kinematicPositionBased(): RBodyDesc };
  ColliderDesc: {
    cuboid(hx: number, hy: number, hz: number): RColliderDesc; ball(r: number): RColliderDesc; cylinder(hh: number, r: number): RColliderDesc;
    cone(hh: number, r: number): RColliderDesc; capsule(hh: number, r: number): RColliderDesc; convexHull(p: Float32Array): RColliderDesc | null;
  };
  ActiveEvents: { COLLISION_EVENTS: number };
  CoefficientCombineRule: { Min: number };
};

export const PX = 50;
export type Phys3 = {
  R: Rapier3; world: RWorld; queue: RQueue;
  bodies: Map<number, RBody>;
  owner: Map<number, number>;
  touching: Set<string>;
  map: RBody | null; mapV: number;
  /** Things that have tipped over (each once), and each walker's half height (to its feet). */
  tipped: Set<number>;
  feet: Map<number, number>;
};

/** Does a game ask for real 3D physics (on the ground in 3D). */
export const needs3d = (spec: GameSpec) => spec.view3d.mode === "ground" && spec.view3d.physics;
/** Is a body the 3D world's: a rigid thing, or a walker. */
export const in3d = (b: Body) => b.thing.body === "rigid" || b.thing.control === "walk";

const yawQ = (rot: number): Q => ({ x: 0, y: Math.sin(-rot / 2), z: 0, w: Math.cos(-rot / 2) });

/** A thing's shape in metres, and its half height. */
function shapeOf(R: Rapier3, t: GameThing, w: number, h: number): { desc: RColliderDesc; half: number } {
  const h3 = heightOf3d(t, w, h), shape = shapeOf3d(t);
  if (shape === "ball") { const r = Math.min(w, h) / 2; return { desc: R.ColliderDesc.ball(r / PX), half: r }; }
  if (shape === "cylinder") return { desc: R.ColliderDesc.cylinder(h3 / 2 / PX, w / 2 / PX), half: h3 / 2 };
  if (shape === "cone") return { desc: R.ColliderDesc.cone(h3 / 2 / PX, w / 2 / PX), half: h3 / 2 };
  if (shape === "poly" && t.points.length >= 3) {
    const pts = new Float32Array(t.points.flatMap(([x, y]) => [x * w, -h3 / 2, y * h, x * w, h3 / 2, y * h]).map((v) => v / PX));
    const hull = R.ColliderDesc.convexHull(pts);
    if (hull) return { desc: hull, half: h3 / 2 };
  }
  return { desc: R.ColliderDesc.cuboid(w / 2 / PX, h3 / 2 / PX, h / 2 / PX), half: h3 / 2 };
}

/** A body into the 3D world: a rigid thing (falling from where it is, its lift up), a walker, a solid one. */
export function physAdd3d(p: Phys3, b: Body) {
  const t = b.thing, R = p.R;
  if (p.bodies.has(b.n)) return;
  const walker = t.control === "walk";
  if (!walker && t.body !== "rigid" && !(t.solid && t.body !== "dynamic")) return;
  let col: RColliderDesc, half: number;
  if (walker) {
    // An upright capsule as tall as the thing (its card), as wide as its narrower side.
    const r = Math.min(t.w, t.h) / 2 * 0.8, tall = heightOf3d(t, t.w, t.h);
    half = Math.max(tall / 2, r);
    col = R.ColliderDesc.capsule(Math.max(0.01, (half - r) / PX), r / PX);
    p.feet.set(b.n, half);
  } else ({ desc: col, half } = shapeOf(R, t, b.w, b.h));
  if (!b.z) b.z = t.d3.lift + half;
  let desc: RBodyDesc;
  if (walker || t.body === "rigid") {
    desc = R.RigidBodyDesc.dynamic().setTranslation(b.x / PX, b.z / PX, b.y / PX).setRotation(yawQ(b.rot)).setLinvel(b.vx / PX, 0, b.vy / PX)
      .setGravityScale(t.gravity).setLinearDamping(walker ? 0 : t.drag).setAngularDamping(Math.max(0.05, t.drag)).setCcdEnabled(t.fast || walker);
    if (walker || t.spinLock) desc = desc.lockRotations();
  } else desc = (t.body === "static" ? R.RigidBodyDesc.fixed() : R.RigidBodyDesc.kinematicPositionBased()).setTranslation(b.x / PX, b.z / PX, b.y / PX).setRotation(yawQ(b.rot));
  const rb = p.world.createRigidBody(desc);
  col = col.setDensity(t.density).setFriction(walker ? 0 : t.friction).setRestitution(t.bounce).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
  // A walker never sticks to a wall it walks into (its friction, none, is the one that counts).
  if (walker) col = col.setFrictionCombineRule(R.CoefficientCombineRule.Min);
  p.owner.set(p.world.createCollider(col, rb).handle, b.n);
  p.bodies.set(b.n, rb);
}

/** The map's solid tiles (and platforms) as blocks of their height on the ground, each run of a row one block. */
function buildMap(p: Phys3, s: GameState) {
  if (p.map) { p.world.removeRigidBody(p.map); p.map = null; }
  p.mapV = s.tilesV;
  const t = s.spec.tiles;
  if (!t || !s.tiles) return;
  const rb = p.world.createRigidBody(p.R.RigidBodyDesc.fixed());
  s.tiles.forEach((row, r) => {
    for (let c = 0; c < row.length;) {
      const ch = row[c], k = t.kinds[ch];
      if (!k || !(k.solid || k.oneWay)) { c++; continue; }
      let e = c;
      while (e + 1 < row.length && row[e + 1] === ch) e++;
      const hgt = k.height || (k.solid ? t.size : t.size * 0.25);
      const w = (e - c + 1) * t.size, cx = c * t.size + w / 2, cz = r * t.size + t.size / 2;
      p.owner.set(p.world.createCollider(p.R.ColliderDesc.cuboid(w / 2 / PX, hgt / 2 / PX, t.size / 2 / PX).setTranslation(cx / PX, hgt / 2 / PX, cz / PX).setFriction(0.7), rb).handle, -1);
      c = e + 1;
    }
  });
  p.map = rb;
}

/** A world for a level: gravity down, the ground, the closed edges, the map, and the game's bodies. */
export function physWorld3d(R: Rapier3, s: GameState): Phys3 {
  const { spec } = s;
  const world = new R.World({ x: 0, y: -spec.view3d.gravity / PX, z: 0 });
  world.timestep = 1 / 60;
  const p: Phys3 = { R, world, queue: new R.EventQueue(true), bodies: new Map(), owner: new Map(), touching: new Set(), map: null, mapV: -1, tipped: new Set(), feet: new Map() };
  const W = spec.ww / PX, D = spec.wh / PX, T = 2, H = 20;
  const fixed = world.createRigidBody(R.RigidBodyDesc.fixed());
  const box = (cx: number, cy: number, cz: number, hx: number, hy: number, hz: number) => p.owner.set(world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(cx, cy, cz).setFriction(0.7), fixed).handle, -1);
  // The ground, a little wider than the world.
  box(W / 2, -1, D / 2, W / 2 + 40, 1, D / 2 + 40);
  if (spec.edges !== "open") { box(-T, H / 2, D / 2, T, H / 2, D / 2 + T * 2); box(W + T, H / 2, D / 2, T, H / 2, D / 2 + T * 2); box(W / 2, H / 2, -T, W / 2 + T * 2, H / 2, T); box(W / 2, H / 2, D + T, W / 2 + T * 2, H / 2, T); }
  buildMap(p, s);
  for (const b of s.bodies) if (!b.dead) physAdd3d(p, b);
  return p;
}

/**
 * One step: the game's moves put in place, the walkers' way and jumps, the world stepped, touches noted, the 3D
 * things read back (across, away, up, their turn); the things that have just tipped over are returned.
 */
export function physStep3d(p: Phys3, s: GameState, dt: number, input: GameInput): { tipped: number[] } {
  if (p.mapV !== s.tilesV) buildMap(p, s);
  for (const [n, rb] of p.bodies) {
    const b = s.bodies.find((x) => x.n === n);
    if (!b || b.dead) { p.world.removeRigidBody(rb); p.bodies.delete(n); p.feet.delete(n); continue; }
    if (b.thing.control === "walk") {
      // Across the ground as the arrows say; a jump from the ground (a press kept a moment).
      const v = rb.linvel(), at = rb.translation(), half = p.feet.get(n) ?? 0, r = (Math.min(b.w, b.h) / 2) * 0.5 / PX;
      // On the ground: a short ray down from under its middle, or from four points round it (an edge, a corner).
      const down = (dx: number, dz: number) => p.world.castRay(new p.R.Ray({ x: at.x + dx, y: at.y - half / PX + 0.02 + (dx || dz ? 0.04 : 0), z: at.z + dz }, { x: 0, y: -1, z: 0 }), 0.12, true, undefined, undefined, undefined, rb);
      b.grounded = v.y < 1 && [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]].some(([dx, dz]) => Boolean(down(dx, dz)));
      let vy = v.y;
      if (b.grounded && s.t - b.jumpAt <= 0.12) { vy = b.thing.jump / PX; b.jumpAt = -9; b.grounded = false; s.effects.push({ kind: "sound", sound: "jump", x: b.x }); }
      rb.setLinvel({ x: b.vx / PX, y: vy, z: b.vy / PX }, true);
    } else if (b.thing.body !== "rigid") rb.setNextKinematicTranslation({ x: b.x / PX, y: (b.z || b.thing.d3.lift + heightOf3d(b.thing, b.w, b.h) / 2) / PX, z: b.y / PX });
  }
  void input;
  p.world.timestep = dt;
  p.world.step(p.queue);
  p.queue.drainCollisionEvents((h1, h2, started) => {
    const a = p.owner.get(h1), b = p.owner.get(h2);
    if (a === undefined || b === undefined || a < 0 || b < 0 || a === b) return;
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (started) p.touching.add(key); else p.touching.delete(key);
  });
  const tipped: number[] = [];
  for (const b of s.bodies) {
    const rb = in3d(b) ? p.bodies.get(b.n) : undefined;
    if (!rb) continue;
    const at = rb.translation(), v = rb.linvel(), q = rb.rotation();
    b.x = at.x * PX; b.y = at.z * PX; b.z = at.y * PX;
    b.vx = v.x * PX; b.vy = v.z * PX; b.vz = v.y * PX;
    b.q = [q.x, q.y, q.z, q.w];
    b.rot = -2 * Math.atan2(q.y, q.w);
    // Tipped over: its up has leant past fifty degrees.
    const up = 1 - 2 * (q.x * q.x + q.z * q.z);
    if (b.thing.body === "rigid" && up < 0.64 && !p.tipped.has(b.n)) { p.tipped.add(b.n); tipped.push(b.n); }
  }
  return { tipped };
}

export function physFree3d(p: Phys3 | null) {
  if (!p) return;
  try { p.queue.free(); p.world.free(); } catch { /* already freed */ }
}
/** A 3D thing's speed across the ground set (a shot rolls; `lift` throws it up too). */
export function physSpeed3d(p: Phys3 | null, b: Body, vx: number, vy: number, lift = 0): boolean {
  const rb = p?.bodies.get(b.n);
  if (!rb) return false;
  b.vx = vx; b.vy = vy;
  rb.setLinvel({ x: vx / PX, y: lift / PX, z: vy / PX }, true);
  return true;
}
/** Back where it started, upright and still. */
export function physHome3d(p: Phys3 | null, b: Body): boolean {
  const rb = p?.bodies.get(b.n);
  if (!rb) return false;
  const half = heightOf3d(b.thing, b.w, b.h) / 2;
  b.x = b.ox; b.y = b.oy; b.z = b.thing.d3.lift + (shapeOf3d(b.thing) === "ball" ? Math.min(b.w, b.h) / 2 : half);
  rb.setTranslation({ x: b.x / PX, y: b.z / PX, z: b.y / PX }, true);
  rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
  rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
  rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
  p!.tipped.delete(b.n);
  return true;
}
/** An explosion: the 3D things near pushed away and up, harder the nearer. */
export function physExplode3d(p: Phys3 | null, s: GameState, x: number, y: number, radius: number, power: number, not?: Body) {
  if (!p) return;
  for (const b of s.bodies) {
    const rb = p.bodies.get(b.n);
    if (!rb || b === not || b.thing.body !== "rigid") continue;
    const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy);
    if (d >= radius) continue;
    const k = power * (1 - d / radius), m = rb.mass(), ux = d ? dx / d : 0, uy = d ? dy / d : 0;
    rb.applyImpulse({ x: (ux * k * m) / PX, y: (0.6 * k * m) / PX, z: (uy * k * m) / PX }, true);
  }
}
