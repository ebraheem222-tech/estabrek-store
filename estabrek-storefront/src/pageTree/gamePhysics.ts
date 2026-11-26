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
 *  - G2b: joints (Rapier's impulse joints, the world's own fixed body for a joint to the world): their limits, their
 *    motors (set again when their key is pressed or let go), and their breaking: Rapier holds a joint perfectly and
 *    tells no joint's force, so a joint breaks when one of its things is hit or pressed on harder than its strength
 *    (Rapier's contact forces, in newtons of this world) or is caught in an explosion; a crate pushed by the player.
 */
import type { Body, GameState } from "./gameEngine";
import type { GameInput } from "./gameEngine";
import type { GameJoint, GameSpec, GameThing } from "./gameSpec";

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
  setContactForceEventThreshold(f: number): RColliderDesc;
};
type RWorld = {
  timestep: number;
  step(q?: RQueue): void;
  createRigidBody(d: RBodyDesc): RBody;
  createCollider(d: RColliderDesc, parent?: RBody): { handle: number };
  removeRigidBody(b: RBody): void;
  createImpulseJoint(d: RJointData, a: RBody, b: RBody, wake: boolean): RJoint;
  removeImpulseJoint(j: RJoint, wake: boolean): void;
  free(): void;
};
type RJointData = object;
type RJoint = {
  isValid(): boolean;
  setContactsEnabled(on: boolean): void;
  setLimits?(min: number, max: number): void;
  configureMotorVelocity?(target: number, factor: number): void;
};
type RQueue = {
  drainCollisionEvents(f: (a: number, b: number, started: boolean) => void): void;
  drainContactForceEvents(f: (e: { collider1(): number; collider2(): number; totalForceMagnitude(): number }) => void): void;
  free(): void;
};
/** The loaded package (its default export, after its init()). */
export type Rapier = {
  World: new (gravity: V) => RWorld;
  EventQueue: new (autoDrain: boolean) => RQueue;
  RigidBodyDesc: { dynamic(): RBodyDesc; fixed(): RBodyDesc; kinematicPositionBased(): RBodyDesc };
  ColliderDesc: { cuboid(hx: number, hy: number): RColliderDesc; ball(r: number): RColliderDesc; convexHull(p: Float32Array): RColliderDesc | null };
  ActiveEvents: { COLLISION_EVENTS: number; CONTACT_FORCE_EVENTS: number };
  JointData: {
    revolute(a1: V, a2: V): RJointData;
    fixed(a1: V, f1: number, a2: V, f2: number): RJointData;
    spring(rest: number, stiffness: number, damping: number, a1: V, a2: V): RJointData;
    rope(length: number, a1: V, a2: V): RJointData;
    prismatic(a1: V, a2: V, axis: V): RJointData;
  };
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
  /** The world's own fixed body (a joint to the world holds to it), and the joints made. */
  ground: RBody | null;
  joints: PJoint[];
  /** The weakest breakable joint on each thing (by its id): what its contact forces are told above. */
  tough: Map<string, number>;
  /** The greatest force on each body this step (contacts, explosions), for the joints that break. */
  load: Map<number, number>;
};
/** A joint made: what it is, its two bodies (b: -1 for the world), its anchors (pixels: on a, and on b or in the
 *  world), its rest length, the motor's way now (1, -1, 0), and whether it has broken. */
type PJoint = { j: GameJoint; rj: RJoint; a: number; b: number; la: V; lb: V; rest: number; drive: number; gone: boolean };
/** A joint let go: its two bodies (b: -1, the world). */
export type Broken = { a: number; b: number };

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
export function physAdd(p: Phys, b: Body, jointed = false) {
  const t = b.thing, R = p.R;
  if (p.bodies.has(b.n)) return;
  let desc: RBodyDesc;
  // Not solid, but a joint holds to it: in the world without a shape (nothing knocks into it).
  const bare = t.body !== "rigid" && !t.solid && jointed && t.body !== "dynamic";
  if (t.body === "rigid") {
    desc = R.RigidBodyDesc.dynamic().setTranslation(b.x / PX, b.y / PX).setRotation(b.rot).setLinvel(b.vx / PX, b.vy / PX)
      .setGravityScale(t.gravity).setLinearDamping(t.drag).setAngularDamping(Math.max(0.05, t.drag)).setCcdEnabled(t.fast);
    if (t.spinLock) desc = desc.lockRotations();
  } else if ((t.solid || bare) && t.body !== "dynamic") {
    desc = (t.body === "static" ? R.RigidBodyDesc.fixed() : R.RigidBodyDesc.kinematicPositionBased()).setTranslation(b.x / PX, b.y / PX).setRotation(b.rot);
  } else return;
  const rb = p.world.createRigidBody(desc);
  p.bodies.set(b.n, rb);
  if (bare) return;
  // A thing a breakable joint holds: its contact forces told, above the weakest such joint's strength.
  const tough = p.tough.get(t.id);
  const col = shapeOf(R, t, b.w, b.h).setDensity(t.density).setFriction(t.friction).setRestitution(t.bounce)
    .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS | (tough ? R.ActiveEvents.CONTACT_FORCE_EVENTS : 0));
  if (tough) col.setContactForceEventThreshold(tough);
  p.owner.set(p.world.createCollider(col, rb).handle, b.n);
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
  const p: Phys = { R, world, queue: new R.EventQueue(true), bodies: new Map(), owner: new Map(), touching: new Set(), map: null, mapV: -1, ground: null, joints: [], tough: new Map(), load: new Map() };
  // The edges: a thick wall just outside each closed side.
  const W = spec.ww / PX, H = spec.wh / PX, T = 2;
  const sides = spec.edges === "walls" || spec.edges === "sides", bottom = spec.edges === "walls" || spec.edges === "floor", top = spec.edges === "walls" || spec.edges === "sides";
  const edges = world.createRigidBody(R.RigidBodyDesc.fixed());
  const wall = (cx: number, cy: number, hx: number, hy: number) => p.owner.set(world.createCollider(R.ColliderDesc.cuboid(hx, hy).setTranslation(cx, cy).setFriction(0.6), edges).handle, -1);
  if (sides) { wall(-T, H / 2, T, H / 2 + T * 2); wall(W + T, H / 2, T, H / 2 + T * 2); }
  if (top) wall(W / 2, -T, W / 2 + T * 2, T);
  if (bottom) wall(W / 2, H + T, W / 2 + T * 2, T);
  buildMap(p, s);
  const jointed = new Set(spec.joints.flatMap((j) => [j.a, j.b]));
  for (const j of spec.joints) if (j.breakAt > 0) for (const id of [j.a, j.b]) if (id) p.tough.set(id, Math.min(p.tough.get(id) ?? Infinity, j.breakAt));
  for (const b of s.bodies) if (!b.dead) physAdd(p, b, jointed.has(b.of));
  for (const j of spec.joints) join(p, s, j);
  return p;
}

const rotate = (v: V, a: number): V => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });
const worldOf = (b: Body, local: V): V => { const r = rotate(local, b.rot); return { x: b.x + r.x, y: b.y + r.y }; };
const toLocal = (b: Body, at: V): V => rotate({ x: at.x - b.x, y: at.y - b.y }, -b.rot);
const metres = (v: V): V => ({ x: v.x / PX, y: v.y / PX });

/** A joint of the game made in the world: between the first bodies of its two things (or a thing and the world). */
function join(p: Phys, s: GameState, j: GameJoint) {
  const R = p.R;
  const A = s.bodies.find((x) => !x.dead && x.of === j.a), B = j.b ? s.bodies.find((x) => !x.dead && x.of === j.b) : null;
  const ra = A && p.bodies.get(A.n), rb = B ? p.bodies.get(B.n) : (p.ground ??= p.world.createRigidBody(R.RigidBodyDesc.fixed()));
  if (!A || !ra || !rb || (j.b && !B)) return;
  const la: V = { x: j.ax, y: j.ay };
  const at = worldOf(A, la);
  // A pin, a weld and a slider are at a's anchor: b holds the same point of the world, in its own frame.
  const anchored = j.kind === "pin" || j.kind === "weld" || j.kind === "slider";
  const lb: V = anchored ? (B ? toLocal(B, at) : at) : B ? { x: j.bx, y: j.by } : { x: j.bx, y: j.by };
  const other = B ? worldOf(B, lb) : lb;
  const rest = j.length || Math.hypot(at.x - other.x, at.y - other.y);
  let data: RJointData;
  switch (j.kind) {
    case "weld": data = R.JointData.fixed(metres(lb), 0, metres(la), (B?.rot ?? 0) - A.rot); break;
    case "spring": data = R.JointData.spring(rest / PX, j.stiffness, j.damping, metres(lb), metres(la)); break;
    case "rope": data = R.JointData.rope(rest / PX, metres(lb), metres(la)); break;
    case "slider": data = R.JointData.prismatic(metres(lb), metres(la), { x: Math.cos((j.axis * Math.PI) / 180), y: Math.sin((j.axis * Math.PI) / 180) }); break;
    default: data = R.JointData.revolute(metres(lb), metres(la));
  }
  const rj = p.world.createImpulseJoint(data, rb, ra, true);
  rj.setContactsEnabled(j.collide);
  if (j.limits && rj.setLimits) rj.setLimits(...(j.kind === "slider" ? [j.limits[0] / PX, j.limits[1] / PX] as const : [(j.limits[0] * Math.PI) / 180, (j.limits[1] * Math.PI) / 180] as const));
  p.joints.push({ j, rj, a: A.n, b: B?.n ?? -1, la, lb, rest, drive: 0, gone: false });
}

/** Is a motor's key held. */
function held(input: GameInput, key: string): boolean {
  switch (key) {
    case "ArrowLeft": return input.left;
    case "ArrowRight": return input.right;
    case "ArrowUp": return input.up;
    case "ArrowDown": return input.down;
    case "Space": return input.jumpHeld === true;
    default: return false;
  }
}

/** The motors: on always, or one way while the key is held and back the other way when it's let go. */
function drive(p: Phys, input: GameInput) {
  for (const pj of p.joints) {
    const mo = pj.j.motor;
    if (pj.gone || !mo || !pj.rj.configureMotorVelocity) continue;
    const way = mo.key ? (held(input, mo.key) ? 1 : -1) : 1;
    if (way === pj.drive) continue;
    pj.drive = way;
    const v = pj.j.kind === "slider" ? (mo.speed * way) / PX : (mo.speed * way * Math.PI) / 180;
    pj.rj.configureMotorVelocity(v, mo.power);
  }
}

function letGo(p: Phys, pj: PJoint) {
  pj.gone = true;
  if (pj.rj.isValid()) p.world.removeImpulseJoint(pj.rj, true);
}

/** Every joint holding a body let go (a rule's "cut"). */
export function physCut(p: Phys | null, n: number): Broken[] {
  if (!p) return [];
  const out: Broken[] = [];
  for (const pj of p.joints) if (!pj.gone && (pj.a === n || pj.b === n)) { letGo(p, pj); out.push({ a: pj.a, b: pj.b }); }
  return out;
}

/** A rigid crate pushed by a body that walks into it from `side` (-1: from its left), at up to that body's speed. */
export function physPush(p: Phys | null, crate: Body, side: number, speed: number) {
  const rb = p?.bodies.get(crate.n);
  if (!rb || !isRigid(crate) || !speed) return;
  const v = rb.linvel(), want = (-side * Math.abs(speed) * Math.min(1, 1.5 / crate.thing.density)) / PX;
  if (Math.sign(want) * v.x < Math.abs(want)) rb.setLinvel({ x: want, y: v.y }, true);
}

/**
 * One step of the world: the game's moves put in place, the motors driven, the world stepped, touches noted, the
 * rigid things read back; the joints stretched too far let go (and returned, for the game's rules).
 */
export function physStep(p: Phys, s: GameState, dt: number, input?: GameInput): Broken[] {
  if (p.mapV !== s.tilesV) buildMap(p, s);
  for (const [n, rb] of p.bodies) {
    const b = s.bodies.find((x) => x.n === n);
    if (!b || b.dead) {
      // Its joints go with it (Rapier's too), not broken.
      for (const pj of p.joints) if (pj.a === n || pj.b === n) pj.gone = true;
      p.world.removeRigidBody(rb);
      p.bodies.delete(n);
      continue;
    }
    if (isRigid(b)) {
      // What the controls ask of a rigid thing: a speed across (and down, four ways).
      const c = b.thing.control;
      if (c === "leftRight") rb.setLinvel({ x: b.vx / PX, y: rb.linvel().y }, true);
      else if (c === "fourWay") rb.setLinvel({ x: b.vx / PX, y: b.vy / PX }, true);
    } else rb.setNextKinematicTranslation({ x: b.x / PX, y: b.y / PX });
  }
  if (input) drive(p, input);
  p.world.timestep = dt;
  p.world.step(p.queue);
  // The forces on the things breakable joints hold (only theirs are told).
  p.queue.drainContactForceEvents((e) => {
    const f = e.totalForceMagnitude();
    for (const h of [e.collider1(), e.collider2()]) { const n = p.owner.get(h); if (n !== undefined && n >= 0) p.load.set(n, Math.max(p.load.get(n) ?? 0, f)); }
  });
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
  const broken: Broken[] = [];
  for (const pj of p.joints) {
    if (pj.gone || !pj.j.breakAt) continue;
    if (Math.max(p.load.get(pj.a) ?? 0, p.load.get(pj.b) ?? 0) > pj.j.breakAt) { letGo(p, pj); broken.push({ a: pj.a, b: pj.b }); }
  }
  p.load.clear();
  return broken;
}

/** The joints held now, for drawing: each one's two ends in the world (pixels). */
export function physJoints(p: Phys | null, s: GameState): Array<{ kind: GameJoint["kind"]; from: V; to: V }> {
  if (!p) return [];
  return p.joints.flatMap((pj) => {
    if (pj.gone) return [];
    const A = s.bodies.find((x) => x.n === pj.a), B = pj.b >= 0 ? s.bodies.find((x) => x.n === pj.b) : null;
    if (!A || (pj.b >= 0 && !B)) return [];
    return [{ kind: pj.j.kind, from: worldOf(A, pj.la), to: B ? worldOf(B, pj.lb) : pj.lb }];
  });
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
    if (rb && isRigid(b)) {
      const mass = rb.mass();
      rb.applyImpulse({ x: (ux * k * mass) / PX, y: (uy * k * mass) / PX }, true);
      // As a force over one step, for the joints that hold it.
      p?.load.set(b.n, Math.max(p.load.get(b.n) ?? 0, ((k * mass) / PX) * 60));
    }
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
