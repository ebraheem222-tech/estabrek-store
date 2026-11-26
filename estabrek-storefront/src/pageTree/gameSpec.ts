/**
 * A game on the page (the plan's «مسرح الألعاب», docs/game-engine-plan.ar.md, G0): a world of things the owner made
 * (shapes, pictures, emoji, words), each with a body, a way to be moved and a behaviour, and rules (when → do) that
 * spawn, destroy, score, take lives, win and lose. gameEngine.ts runs it, GameView.tsx draws it.
 *
 * What a page's `game` prop holds, read here into a spec that is always safe to run: every number in its range,
 * every list at most so long, every name a plain word. Pure (no React, no "@/" imports): the admin reads it too.
 * G1b: levels (more maps of the same size, or mazes made from the seed), the cover between them, a thing's sight
 * and path, the brains (guard, flee, homing, path), and the rules for them (sees, a level begins, next, again).
 * G2: rigid things (a box, a circle or a convex shape; density, friction, drag, turning or not, fast), the sling
 * (pulled back and let go), and the rules for them (it's shot, it comes to rest; back home, an explosion).
 * G2b: joints between two things or a thing and the world (a pin, a weld, a spring, a rope, a slider), with limits,
 * a motor (always, or while a key is held), and a stretch that breaks them; the rules (it breaks; cut it).
 * G3: effects and sound: a thing's trail and its look's effect (glow, pulse, wobble, rainbow), the weather across the
 * world, an effect over the whole picture, music made for a mood, more sounds, notes on instruments up a scale, confetti.
 * G3b: on the beat of the game's tempo; a key pressed (or the first thing tapped) while two things touch; a copy made
 * where its template stands; a thing flashed.
 */

export type Local = Partial<Record<"ar" | "en" | "he", string>>;
type Say = (w: unknown) => string;

export const GAME_LIMITS = { things: 40, rules: 40, acts: 8, tags: 4, alive: 200, tileKinds: 12, cols: 200, rows: 60, layers: 4, levels: 8, path: 12, joints: 40 } as const;
export const GAME_LOOKS = ["box", "circle", "image", "emoji", "text", "sprite"] as const;
export const GAME_ANIMS = ["idle", "run", "jump", "fall"] as const;
export const LAYER_KINDS = ["color", "gradient", "image"] as const;
export const GAME_BODIES = ["none", "static", "dynamic", "kinematic", "rigid"] as const;
/** A rigid thing's shape: its box, a circle in it, or a convex shape of points (each in the box, -0.5…0.5). */
export const GAME_SHAPES = ["box", "circle", "poly"] as const;
export const GAME_CONTROLS = ["none", "leftRight", "fourWay", "platform", "pointer", "drag", "sling"] as const;
export const GAME_BEHAVES = ["none", "patrol", "chase", "wander", "spin", "guard", "flee", "homing", "path"] as const;
export const GAME_EDGES = ["walls", "sides", "floor", "open"] as const;
export const GAME_WHENS = ["start", "every", "hit", "out", "tap", "key", "score", "time", "see", "level", "shot", "rest", "break", "beat", "press"] as const;
export const GAME_ACTS = ["spawn", "destroy", "score", "lives", "win", "lose", "speed", "faster", "shake", "sound", "burst", "next", "retry", "home", "explode", "cut", "note", "confetti", "flash"] as const;
/** How two things are joined: a pin (they turn about it), a weld, a spring, a rope (no further than its length), a slider (along a line). */
export const GAME_JOINTS = ["pin", "weld", "spring", "rope", "slider"] as const;
/** How one level gives way to the next: a fade, a wipe across, a closing circle, or at once. */
export const GAME_TRANSITIONS = ["fade", "wipe", "circle", "none"] as const;
export const GAME_SPOTS = ["top", "bottom", "left", "right", "random", "floorRight", "floorLeft", "self", "other", "center", "own"] as const;
export const GAME_KEYS = ["Space", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"] as const;
export const GAME_SOUNDS = ["click", "pop", "chime", "whoosh", "success", "hit", "coin", "jump", "laser", "boom", "power", "blip"] as const;
/** G3: a thing's trail, its look's effect; the world's weather; an effect over the whole picture; the music's mood. */
export const GAME_TRAILS = ["", "sparkle", "smoke", "fire", "bubbles"] as const;
export const GAME_FX = ["", "glow", "pulse", "wobble", "rainbow"] as const;
export const GAME_WEATHER = ["", "snow", "rain", "stars", "leaves", "bubbles"] as const;
export const GAME_POST = ["", "vignette", "crt", "pixel", "mono", "dream"] as const;
export const GAME_MOODS = ["", "lively", "calm", "spooky", "arcade"] as const;
export const GAME_INSTRUMENTS = ["piano", "bell", "pluck", "bass", "drum"] as const;
export const GAME_SCALES = ["major", "minor", "pentatonic", "blues"] as const;

/** A picture of frames (a sprite sheet): `cols` × `rows` cells, each of the body's states a run of them ([first, how many]). */
export type GameSheet = { cols: number; rows: number; fps: number; anims: Partial<Record<(typeof GAME_ANIMS)[number], [number, number]>> };
/** `poly`: a box drawn as the thing's convex shape (its points, each in the box, -0.5…0.5). */
export type GameLook = { kind: (typeof GAME_LOOKS)[number]; color: string; src?: string; emoji?: string; text?: string; sheet?: GameSheet; poly?: Array<[number, number]> };
/** A kind of tile on the map: how it looks; solid (stops bodies), a one-way platform (only from above), its tags (rules
 *  meet it by them); or, `thing`, a template put at each of its cells when the game starts (a coin, an enemy, a flag),
 *  or a thing in the world (the player) put at its first cell: where it starts on that level. */
export type GameTileKind = { look: GameLook; solid: boolean; oneWay: boolean; tags: string[]; thing: string };
export type GameTiles = {
  size: number; cols: number; rows: number; map: string[]; kinds: Record<string, GameTileKind>;
  /** The levels after the first (whose map is `map`), each a map of the same size. */
  levels: string[][];
  /** "maze": each level's walls made from the seed, its marks (not walls) moved to the nearest corridor. */
  gen: "" | "maze";
};
/**
 * A joint (G2b): `a` joined to `b` (another thing in the world, or "" for the world itself). A pin, a weld and a
 * slider are at a's anchor (ax, ay: pixels from its middle); a spring and a rope run from a's anchor to b's (bx, by;
 * on the world, a point in it), `length` long (0: as far apart as they start). A pin's limits are degrees either way,
 * a slider's pixels along its `axis` (degrees); a motor turns a pin (degrees a second) or pushes a slider (pixels a
 * second), always or while its key is held (back the other way when it's let go). It breaks when one of its two
 * things is hit or pressed on harder than `breakAt` (newtons of the world, a 40-pixel box of density 1 weighs about 26
 * under a gravity of 2000), or caught in an explosion (0: never). `collide`: the two still knock into each other.
 */
export type GameJoint = {
  kind: (typeof GAME_JOINTS)[number];
  a: string; b: string;
  ax: number; ay: number; bx: number; by: number;
  length: number; stiffness: number; damping: number;
  limits: [number, number] | null;
  axis: number;
  motor: { speed: number; key: "" | (typeof GAME_KEYS)[number]; power: number } | null;
  breakAt: number;
  collide: boolean;
};
/** A way a thing goes round (its `behave` "path"): the points after where it starts, from it; a loop, or there and back. */
export type GamePath = { points: Array<[number, number]>; loop: boolean; smooth: boolean };
/** A layer behind the world: a colour, a gradient or a picture, in a band of the view, moving `factor` as fast as the camera. */
export type GameLayer = { kind: (typeof LAYER_KINDS)[number]; color: string; color2: string; src?: string; factor: number; y: number; h: number };
export type GameThing = {
  id: string;
  look: GameLook;
  x: number; y: number; w: number; h: number;
  /** Not in the world at the start: made by a rule's "spawn". */
  template: boolean;
  body: (typeof GAME_BODIES)[number];
  /** A dynamic body's share of the world's gravity (0–3). */
  gravity: number;
  /** How much of its speed it keeps when it meets something solid (0–1). */
  bounce: number;
  /** It stops others (else they pass through, and only meet it). */
  solid: boolean;
  vx: number; vy: number;
  control: (typeof GAME_CONTROLS)[number];
  speed: number;
  jump: number;
  behave: (typeof GAME_BEHAVES)[number];
  tags: string[];
  /** Seconds it lasts (0: for ever). */
  life: number;
  /** Kept inside the world (else it can leave it). */
  keepIn: boolean;
  /** How far it sees (0: blind): a guard's, one that flees, and a rule's "sees". */
  sight: number;
  path: GamePath | null;
  /** A rigid thing (G2): its shape (and its points, for "poly"), density, friction, drag (slowing in the air or on
   *  the ground seen from above), not turning, and continuous collision (fast: never through a thin wall). */
  shape: (typeof GAME_SHAPES)[number];
  points: Array<[number, number]>;
  density: number;
  friction: number;
  drag: number;
  spinLock: boolean;
  fast: boolean;
  /** G3: what it leaves behind as it moves, and its look's effect. */
  trail: (typeof GAME_TRAILS)[number];
  fx: (typeof GAME_FX)[number];
};
export type GameWhen =
  | { on: "start" }
  | { on: "every"; seconds: number }
  | { on: "hit"; a: string; b: string }
  | { on: "out"; who: string }
  | { on: "tap"; who: string }
  | { on: "key"; key: (typeof GAME_KEYS)[number] }
  | { on: "score"; at: number }
  | { on: "time"; at: number }
  /** `a` comes to see `b` (in its sight, nothing solid between). */
  | { on: "see"; a: string; b: string }
  /** A level begins (0: each one). */
  | { on: "level"; at: number }
  /** It's shot (let go from the sling), and it comes to rest after. */
  | { on: "shot"; who: string }
  | { on: "rest"; who: string }
  /** A joint holding it breaks (stretched too far, or cut). */
  | { on: "break"; who: string }
  /** On the beat of the game's tempo (its music's): every so many beats, from `offset` beats in. */
  | { on: "beat"; every: number; offset: number }
  /** `key` pressed (or `a` tapped) while `a` touches `b`: a rhythm game's hit, a lock opened while standing at it. */
  | { on: "press"; key: (typeof GAME_KEYS)[number]; a: string; b: string };
export type GameAct =
  | { act: "spawn"; what: string; at: (typeof GAME_SPOTS)[number]; vx: number; vy: number }
  | { act: "destroy"; who: "self" | "other" | "both" }
  | { act: "score"; add: number }
  | { act: "lives"; add: number }
  | { act: "win" }
  | { act: "lose" }
  | { act: "speed"; who: "self" | "other"; vx: number; vy: number }
  | { act: "faster"; by: number }
  | { act: "shake" }
  | { act: "sound"; kind: (typeof GAME_SOUNDS)[number] }
  | { act: "burst"; who: "self" | "other" }
  /** The next level (after the last: won). */
  | { act: "next" }
  /** This level again, from its start. */
  | { act: "retry" }
  /** Back where it started, still. */
  | { act: "home"; who: "self" | "other" }
  /** Everything within `radius` pushed away, by up to `power` (px/s) the nearer it is. */
  | { act: "explode"; who: "self" | "other"; radius: number; power: number }
  /** Every joint holding it let go. */
  | { act: "cut"; who: "self" | "other" }
  /** A note on an instrument: the scale's next one (step -1), one at random (-2), or that step of it (0…20). */
  | { act: "note"; instrument: (typeof GAME_INSTRUMENTS)[number]; scale: (typeof GAME_SCALES)[number]; step: number }
  /** Confetti over the whole view. */
  | { act: "confetti" }
  /** The thing lit up for a moment (a pad played, a note hit). */
  | { act: "flash"; who: "self" | "other" };
export type GameRule = { when: GameWhen; do: GameAct[] };
export type GameWords = { title: string; start: string; win: string; lose: string; again: string; prize: string; help: string };
export type GameSpec = {
  /** The view (the stage's size, in the world's units). */
  w: number; h: number;
  /** The world (as big as the view, or bigger: the camera follows). */
  ww: number; wh: number;
  tiles: GameTiles | null;
  /** What the camera follows ("#tag" or an id; "": it stays). */
  camera: { follow: string; lerp: number };
  layers: GameLayer[];
  transition: (typeof GAME_TRANSITIONS)[number];
  /** G3: the weather across the world, an effect over the whole picture, and music made for a mood. */
  weather: (typeof GAME_WEATHER)[number];
  post: (typeof GAME_POST)[number];
  music: { mood: (typeof GAME_MOODS)[number]; tempo: number; volume: number };
  bg: string;
  gravity: number;
  edges: (typeof GAME_EDGES)[number];
  things: GameThing[];
  joints: GameJoint[];
  rules: GameRule[];
  lives: number;
  /** Seconds (0: no clock). When it runs out: `timeWins` → won, else lost. */
  time: number;
  timeWins: boolean;
  /** The score that wins (0: none). */
  winScore: number;
  seed: number;
  coupon: string;
  once: boolean;
  words: GameWords;
};

const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const int = (v: unknown, lo: number, hi: number, d: number) => Math.round(num(v, lo, hi, d));
const pick = <T extends string>(v: unknown, list: readonly T[], d: T): T => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : d);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const ID = /^[a-z][a-z0-9-]{0,23}$/;
const TAG = /^[a-z][a-z0-9-]{0,15}$/;
/** A colour as the page tree writes one: a theme token or a hex. */
const COLOUR = /^(#[0-9a-fA-F]{3,8}|\$?[a-z][a-z0-9-]{1,30})$/;
const colourOf = (v: unknown, d: string) => (typeof v === "string" && COLOUR.test(v) ? v : d);
const srcOf = (v: unknown) => (typeof v === "string" && /^(https:\/\/|\/)[^\s"'<>]{1,500}$/.test(v) ? v : undefined);
/** A target of a rule: one thing (its id) or every thing with a tag ("#tag"). */
const whoOf = (v: unknown) => (typeof v === "string" && (ID.test(v) || (v.startsWith("#") && TAG.test(v.slice(1)))) ? v : "");
export const COUPON = /^[A-Za-z0-9_-]{2,32}$/;

function sheetOf(raw: unknown): GameSheet {
  const x = obj(raw);
  const cols = int(x.cols, 1, 16, 1), rows = int(x.rows, 1, 16, 1), cells = cols * rows;
  const anims: GameSheet["anims"] = {};
  for (const a of GAME_ANIMS) {
    const r = Array.isArray(obj(x.anims)[a]) ? (obj(x.anims)[a] as unknown[]) : null;
    if (!r) continue;
    const from = int(r[0], 0, cells - 1, 0);
    anims[a] = [from, int(r[1], 1, cells - from, 1)];
  }
  if (!anims.idle) anims.idle = [0, 1];
  return { cols, rows, fps: int(x.fps, 1, 30, 10), anims };
}
const TILE_CHAR = /^[!-~]$/;
function tilesOf(raw: unknown, say: Say, ids: Set<string>): GameTiles | null {
  const x = obj(raw);
  if (!Object.keys(x).length) return null;
  const size = int(x.size, 16, 128, 48), cols = int(x.cols, 1, GAME_LIMITS.cols, 20), rows = int(x.rows, 1, GAME_LIMITS.rows, 12);
  const kinds: Record<string, GameTileKind> = {};
  for (const [ch, k] of Object.entries(obj(x.kinds)).slice(0, GAME_LIMITS.tileKinds)) {
    if (!TILE_CHAR.test(ch) || ch === ".") continue;
    const kk = obj(k);
    const lk = obj(kk.look);
    const kind = pick(lk.kind, GAME_LOOKS, "box");
    const look: GameLook = { kind: kind === "sprite" ? "image" : kind, color: colourOf(lk.color, "text") };
    if (look.kind === "image") { const src = srcOf(lk.src); if (src) look.src = src; else look.kind = "box"; }
    if (look.kind === "emoji") look.emoji = typeof lk.emoji === "string" && lk.emoji.length <= 8 && lk.emoji.trim() ? lk.emoji : "⬛";
    if (look.kind === "text") look.text = say(lk.text).slice(0, 4);
    const thing = typeof kk.thing === "string" && ids.has(kk.thing) ? kk.thing : "";
    const tags = (Array.isArray(kk.tags) ? kk.tags : []).filter((t): t is string => typeof t === "string" && TAG.test(t)).slice(0, GAME_LIMITS.tags);
    kinds[ch] = { look, solid: !thing && kk.solid === true, oneWay: !thing && kk.oneWay === true, tags, thing };
  }
  // Each row as long as the map is wide; what isn't a kind of tile is empty.
  const mapOf = (v: unknown) => {
    const lines = Array.isArray(v) ? v : [];
    return Array.from({ length: rows }, (_, r) => {
      const line = typeof lines[r] === "string" ? (lines[r] as string) : "";
      return Array.from({ length: cols }, (_, c) => (kinds[line[c] ?? "."] ? line[c] : ".")).join("");
    });
  };
  const levels = (Array.isArray(x.levels) ? x.levels : []).slice(0, GAME_LIMITS.levels - 1).map(mapOf);
  return { size, cols, rows, map: mapOf(x.map), kinds, levels, gen: x.gen === "maze" ? "maze" : "" };
}
function layerOf(raw: unknown): GameLayer {
  const x = obj(raw);
  const kind = pick(x.kind, LAYER_KINDS, "color");
  const layer: GameLayer = { kind, color: colourOf(x.color, "accent-soft"), color2: colourOf(x.color2, "surface"), factor: num(x.factor, 0, 1, 0.3), y: num(x.y, 0, 1, 0), h: num(x.h, 0.05, 1, 1) };
  if (kind === "image") { const src = srcOf(x.src); if (src) layer.src = src; else layer.kind = "color"; }
  return layer;
}

function thingOf(raw: unknown, say: Say): GameThing | null {
  const x = obj(raw);
  const id = typeof x.id === "string" && ID.test(x.id) ? x.id : "";
  if (!id) return null;
  const lk = obj(x.look);
  const kind = pick(lk.kind, GAME_LOOKS, "box");
  const look: GameLook = { kind, color: colourOf(lk.color, "accent") };
  if (kind === "image") { const src = srcOf(lk.src); if (src) look.src = src; else look.kind = "box"; }
  if (kind === "emoji") look.emoji = typeof lk.emoji === "string" && lk.emoji.length <= 8 && lk.emoji.trim() ? lk.emoji : "⭐";
  if (kind === "text") look.text = say(lk.text).slice(0, 40);
  if (kind === "sprite") {
    const src = srcOf(lk.src);
    if (!src) look.kind = "box";
    else { look.src = src; look.sheet = sheetOf(lk.sheet); }
  }
  const tags = (Array.isArray(x.tags) ? x.tags : []).filter((t): t is string => typeof t === "string" && TAG.test(t)).slice(0, GAME_LIMITS.tags);
  // Its shape (a circle look is a circle unless told), a convex shape's points in its box.
  const points = (Array.isArray(x.points) ? x.points : []).slice(0, 8).flatMap((p): Array<[number, number]> =>
    Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number" && Number.isFinite(p[0]) && Number.isFinite(p[1]) ? [[num(p[0], -0.5, 0.5, 0), num(p[1], -0.5, 0.5, 0)]] : []);
  let shape = pick(x.shape, GAME_SHAPES, look.kind === "circle" ? "circle" : "box");
  if (shape === "poly" && points.length < 3) shape = "box";
  if (shape === "poly" && look.kind === "box") look.poly = points;
  return {
    id, look,
    x: num(x.x, -2000, 4000, 100), y: num(x.y, -2000, 4000, 100),
    w: num(x.w, 4, 2000, 48), h: num(x.h, 4, 2000, 48),
    template: x.template === true,
    body: pick(x.body, GAME_BODIES, "none"),
    gravity: num(x.gravity, 0, 3, 1),
    bounce: num(x.bounce, 0, 1, 0),
    solid: x.solid === true,
    vx: num(x.vx, -3000, 3000, 0), vy: num(x.vy, -3000, 3000, 0),
    control: pick(x.control, GAME_CONTROLS, "none"),
    speed: num(x.speed, 0, 2000, 360),
    jump: num(x.jump, 0, 3000, 720),
    behave: pick(x.behave, GAME_BEHAVES, "none"),
    tags,
    life: num(x.life, 0, 120, 0),
    keepIn: x.keepIn === true,
    sight: num(x.sight, 0, 3000, 320),
    path: pathOf(x.path),
    shape, points,
    density: num(x.density, 0.05, 50, 1),
    friction: num(x.friction, 0, 2, 0.5),
    drag: num(x.drag, 0, 20, 0),
    spinLock: x.spinLock === true,
    fast: x.fast === true,
    trail: pick(x.trail, GAME_TRAILS, ""),
    fx: pick(x.fx, GAME_FX, ""),
  };
}
function pathOf(raw: unknown): GamePath | null {
  const x = obj(raw);
  const points = (Array.isArray(x.points) ? x.points : []).slice(0, GAME_LIMITS.path).flatMap((p): Array<[number, number]> =>
    Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number" && Number.isFinite(p[0]) && Number.isFinite(p[1]) ? [[num(p[0], -8000, 8000, 0), num(p[1], -8000, 8000, 0)]] : []);
  return points.length ? { points, loop: x.loop === true, smooth: x.smooth === true } : null;
}

function whenOf(raw: unknown): GameWhen | null {
  const x = obj(raw);
  switch (x.on) {
    case "start": return { on: "start" };
    case "every": return { on: "every", seconds: num(x.seconds, 0.2, 60, 1) };
    case "hit": { const a = whoOf(x.a), b = whoOf(x.b); return a && b ? { on: "hit", a, b } : null; }
    case "out": { const who = whoOf(x.who); return who ? { on: "out", who } : null; }
    case "tap": { const who = whoOf(x.who); return who ? { on: "tap", who } : null; }
    case "key": return { on: "key", key: pick(x.key, GAME_KEYS, "Space") };
    case "score": return { on: "score", at: int(x.at, -9999, 99999, 10) };
    case "time": return { on: "time", at: num(x.at, 0, 600, 10) };
    case "see": { const a = whoOf(x.a), b = whoOf(x.b); return a && b ? { on: "see", a, b } : null; }
    case "level": return { on: "level", at: int(x.at, 0, GAME_LIMITS.levels, 0) };
    case "shot": case "rest": { const who = whoOf(x.who); return who ? { on: x.on === "shot" ? "shot" : "rest", who } : null; }
    case "break": { const who = whoOf(x.who); return who ? { on: "break", who } : null; }
    case "beat": return { on: "beat", every: num(x.every, 0.25, 16, 1), offset: num(x.offset, 0, 16, 0) };
    case "press": { const a = whoOf(x.a), b = whoOf(x.b); return a && b ? { on: "press", key: pick(x.key, GAME_KEYS, "Space"), a, b } : null; }
    default: return null;
  }
}
const who3 = (v: unknown) => pick(v, ["self", "other", "both"] as const, "self");
function actOf(raw: unknown): GameAct | null {
  const x = obj(raw);
  switch (x.act) {
    case "spawn": { const what = typeof x.what === "string" && ID.test(x.what) ? x.what : ""; return what ? { act: "spawn", what, at: pick(x.at, GAME_SPOTS, "top"), vx: num(x.vx, -3000, 3000, 0), vy: num(x.vy, -3000, 3000, 0) } : null; }
    case "destroy": return { act: "destroy", who: who3(x.who) };
    case "score": return { act: "score", add: int(x.add, -999, 999, 1) };
    case "lives": return { act: "lives", add: int(x.add, -9, 9, -1) };
    case "win": return { act: "win" };
    case "lose": return { act: "lose" };
    case "speed": return { act: "speed", who: pick(x.who, ["self", "other"] as const, "self"), vx: num(x.vx, -3000, 3000, 0), vy: num(x.vy, -3000, 3000, 0) };
    case "faster": return { act: "faster", by: num(x.by, 0.5, 2, 1.1) };
    case "shake": return { act: "shake" };
    case "sound": return { act: "sound", kind: pick(x.kind, GAME_SOUNDS, "pop") };
    case "burst": return { act: "burst", who: pick(x.who, ["self", "other"] as const, "self") };
    case "next": return { act: "next" };
    case "retry": return { act: "retry" };
    case "home": return { act: "home", who: pick(x.who, ["self", "other"] as const, "self") };
    case "cut": return { act: "cut", who: pick(x.who, ["self", "other"] as const, "self") };
    case "note": return { act: "note", instrument: pick(x.instrument, GAME_INSTRUMENTS, "piano"), scale: pick(x.scale, GAME_SCALES, "pentatonic"), step: int(x.step, -2, 20, -1) };
    case "confetti": return { act: "confetti" };
    case "flash": return { act: "flash", who: pick(x.who, ["self", "other"] as const, "self") };
    case "explode": return { act: "explode", who: pick(x.who, ["self", "other"] as const, "self"), radius: num(x.radius, 40, 1000, 160), power: num(x.power, 100, 5000, 900) };
    default: return null;
  }
}

/** A joint between things in the world (not templates: a joint holds one thing, not its copies). */
function jointOf(raw: unknown, inWorld: Set<string>): GameJoint | null {
  const x = obj(raw);
  const a = typeof x.a === "string" && inWorld.has(x.a) ? x.a : "";
  const b = typeof x.b === "string" && inWorld.has(x.b) && x.b !== a ? x.b : "";
  if (!a) return null;
  const kind = pick(x.kind, GAME_JOINTS, "pin");
  const lim = Array.isArray(x.limits) && typeof x.limits[0] === "number" && typeof x.limits[1] === "number" ? x.limits : null;
  const range = kind === "slider" ? 4000 : 360;
  const limits: [number, number] | null = lim ? [num(lim[0], -range, range, 0), num(lim[1], -range, range, 0)].sort((p, q) => p - q) as [number, number] : null;
  const m = obj(x.motor);
  const motor = (kind === "pin" || kind === "slider") && typeof m.speed === "number" && Number.isFinite(m.speed) && m.speed !== 0
    ? { speed: num(m.speed, -3600, 3600, 0), key: pick(m.key, ["", ...GAME_KEYS] as const, ""), power: num(m.power, 1, 1000, 60) }
    : null;
  return {
    kind, a, b,
    ax: num(x.ax, -2000, 2000, 0), ay: num(x.ay, -2000, 2000, 0), bx: num(x.bx, -8000, 8000, 0), by: num(x.by, -8000, 8000, 0),
    length: num(x.length, 0, 4000, 0), stiffness: num(x.stiffness, 0.1, 1000, 20), damping: num(x.damping, 0, 100, 1),
    limits, axis: num(x.axis, -360, 360, 0), motor,
    breakAt: num(x.breakAt, 0, 100000, 0),
    collide: x.collide === true,
  };
}

/** A page's game, read into a spec safe to run; null when there's nothing to play (no thing in the world). */
export function gameOf(raw: unknown, say: Say = (w) => (typeof w === "string" ? w : "")): GameSpec | null {
  const x = obj(raw);
  const things = (Array.isArray(x.things) ? x.things : []).slice(0, GAME_LIMITS.things).map((t) => thingOf(t, say)).filter((t): t is GameThing => Boolean(t));
  // Ids are names the rules use: the first of a name wins.
  const seen = new Set<string>();
  const unique = things.filter((t) => !seen.has(t.id) && Boolean(seen.add(t.id)));
  const ids = new Set(unique.map((t) => t.id));
  const tiles = tilesOf(x.tiles, say, ids);
  if (!unique.some((t) => !t.template) && !tiles?.map.some((r) => /[^.]/.test(r))) return null;
  const rules = (Array.isArray(x.rules) ? x.rules : []).slice(0, GAME_LIMITS.rules).flatMap((r): GameRule[] => {
    const when = whenOf(obj(r).when);
    const acts = (Array.isArray(obj(r).do) ? (obj(r).do as unknown[]) : []).slice(0, GAME_LIMITS.acts).map(actOf).filter((a): a is GameAct => Boolean(a));
    return when && acts.length ? [{ when, do: acts }] : [];
  });
  const words = obj(x.words);
  const inWorld = new Set(unique.filter((t) => !t.template).map((t) => t.id));
  const joints = (Array.isArray(x.joints) ? x.joints : []).slice(0, GAME_LIMITS.joints).map((j) => jointOf(j, inWorld)).filter((j): j is GameJoint => Boolean(j));
  const w = int(x.w, 320, 1920, 960), h = int(x.h, 240, 1920, 540);
  const cam = obj(x.camera);
  return {
    w, h,
    ww: tiles ? Math.max(w, tiles.cols * tiles.size) : int(x.ww, w, 8000, w),
    wh: tiles ? Math.max(h, tiles.rows * tiles.size) : int(x.wh, h, 8000, h),
    tiles,
    camera: { follow: whoOf(cam.follow), lerp: num(cam.lerp, 0.02, 1, 0.12) },
    layers: (Array.isArray(x.layers) ? x.layers : []).slice(0, GAME_LIMITS.layers).map(layerOf),
    transition: pick(x.transition, GAME_TRANSITIONS, "circle"),
    weather: pick(x.weather, GAME_WEATHER, ""),
    post: pick(x.post, GAME_POST, ""),
    music: { mood: pick(obj(x.music).mood, GAME_MOODS, ""), tempo: int(obj(x.music).tempo, 60, 180, 110), volume: num(obj(x.music).volume, 0, 1, 0.5) },
    bg: colourOf(x.bg, "surface"),
    gravity: num(x.gravity, 0, 4000, 0),
    edges: pick(x.edges, GAME_EDGES, "walls"),
    things: unique, joints, rules,
    lives: int(x.lives, 0, 9, 3),
    time: int(x.time, 0, 600, 0),
    timeWins: x.timeWins === true,
    winScore: int(x.winScore, 0, 99999, 0),
    seed: int(x.seed, 1, 2 ** 31 - 1, 7),
    coupon: typeof x.coupon === "string" && COUPON.test(x.coupon) ? x.coupon : "",
    once: x.once === true,
    words: { title: say(words.title), start: say(words.start), win: say(words.win), lose: say(words.lose), again: say(words.again), prize: say(words.prize), help: say(words.help) },
  };
}

/** Does a target name this thing: its own id, or "#tag" for a tag it has. */
export const isWho = (who: string, t: Pick<GameThing, "id" | "tags">) => (who.startsWith("#") ? t.tags.includes(who.slice(1)) : who === t.id);

/** The stage's own words (GameView.tsx), the game's words aside. */
export const STAGE_WORDS: Record<"ar" | "en" | "he", { start: string; again: string; win: string; lose: string; score: string; lives: string; time: string; sound: string; left: string; right: string; up: string; down: string; jump: string; paused: string; level: string }> = {
  ar: { start: "ابدأ", again: "العب كمان مرة", win: "ربحت! 🎉", lose: "خلصت اللعبة", score: "النقاط", lives: "الأرواح", time: "الوقت", sound: "الصوت", left: "شمال", right: "يمين", up: "لفوق", down: "لتحت", jump: "نطّ", paused: "اللعبة واقفة، ارجع لعندها لتكمّل", level: "المرحلة" },
  en: { start: "Start", again: "Play again", win: "You won! 🎉", lose: "Game over", score: "Score", lives: "Lives", time: "Time", sound: "Sound", left: "Left", right: "Right", up: "Up", down: "Down", jump: "Jump", paused: "Paused: come back to it to go on", level: "Level" },
  he: { start: "התחלה", again: "שחקו שוב", win: "ניצחת! 🎉", lose: "המשחק נגמר", score: "נקודות", lives: "חיים", time: "זמן", sound: "צליל", left: "שמאלה", right: "ימינה", up: "למעלה", down: "למטה", jump: "קפיצה", paused: "המשחק בהשהיה: חזרו אליו כדי להמשיך", level: "שלב" },
};
