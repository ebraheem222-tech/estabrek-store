/**
 * A game on the page (the plan's «مسرح الألعاب», docs/game-engine-plan.ar.md, G0): a world of things the owner made
 * (shapes, pictures, emoji, words), each with a body, a way to be moved and a behaviour, and rules (when → do) that
 * spawn, destroy, score, take lives, win and lose. gameEngine.ts runs it, GameView.tsx draws it.
 *
 * What a page's `game` prop holds, read here into a spec that is always safe to run: every number in its range,
 * every list at most so long, every name a plain word. Pure (no React, no "@/" imports): the admin reads it too.
 */

export type Local = Partial<Record<"ar" | "en" | "he", string>>;
type Say = (w: unknown) => string;

export const GAME_LIMITS = { things: 40, rules: 40, acts: 8, tags: 4, alive: 200, tileKinds: 12, cols: 200, rows: 60, layers: 4 } as const;
export const GAME_LOOKS = ["box", "circle", "image", "emoji", "text", "sprite"] as const;
export const GAME_ANIMS = ["idle", "run", "jump", "fall"] as const;
export const LAYER_KINDS = ["color", "gradient", "image"] as const;
export const GAME_BODIES = ["none", "static", "dynamic", "kinematic"] as const;
export const GAME_CONTROLS = ["none", "leftRight", "fourWay", "platform", "pointer", "drag"] as const;
export const GAME_BEHAVES = ["none", "patrol", "chase", "wander", "spin"] as const;
export const GAME_EDGES = ["walls", "sides", "floor", "open"] as const;
export const GAME_WHENS = ["start", "every", "hit", "out", "tap", "key", "score", "time"] as const;
export const GAME_ACTS = ["spawn", "destroy", "score", "lives", "win", "lose", "speed", "faster", "shake", "sound", "burst"] as const;
export const GAME_SPOTS = ["top", "bottom", "left", "right", "random", "floorRight", "floorLeft", "self", "other", "center"] as const;
export const GAME_KEYS = ["Space", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"] as const;
export const GAME_SOUNDS = ["click", "pop", "chime", "whoosh", "success", "hit"] as const;

/** A picture of frames (a sprite sheet): `cols` × `rows` cells, each of the body's states a run of them ([first, how many]). */
export type GameSheet = { cols: number; rows: number; fps: number; anims: Partial<Record<(typeof GAME_ANIMS)[number], [number, number]>> };
export type GameLook = { kind: (typeof GAME_LOOKS)[number]; color: string; src?: string; emoji?: string; text?: string; sheet?: GameSheet };
/** A kind of tile on the map: how it looks; solid (stops bodies), a one-way platform (only from above), its tags (rules
 *  meet it by them); or, `thing`, a template put at each of its cells when the game starts (a coin, an enemy, a flag). */
export type GameTileKind = { look: GameLook; solid: boolean; oneWay: boolean; tags: string[]; thing: string };
export type GameTiles = { size: number; cols: number; rows: number; map: string[]; kinds: Record<string, GameTileKind> };
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
};
export type GameWhen =
  | { on: "start" }
  | { on: "every"; seconds: number }
  | { on: "hit"; a: string; b: string }
  | { on: "out"; who: string }
  | { on: "tap"; who: string }
  | { on: "key"; key: (typeof GAME_KEYS)[number] }
  | { on: "score"; at: number }
  | { on: "time"; at: number };
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
  | { act: "burst"; who: "self" | "other" };
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
  bg: string;
  gravity: number;
  edges: (typeof GAME_EDGES)[number];
  things: GameThing[];
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
function tilesOf(raw: unknown, say: Say, ids: Set<string>, templates: Set<string>): GameTiles | null {
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
    const thing = typeof kk.thing === "string" && templates.has(kk.thing) && ids.has(kk.thing) ? kk.thing : "";
    const tags = (Array.isArray(kk.tags) ? kk.tags : []).filter((t): t is string => typeof t === "string" && TAG.test(t)).slice(0, GAME_LIMITS.tags);
    kinds[ch] = { look, solid: !thing && kk.solid === true, oneWay: !thing && kk.oneWay === true, tags, thing };
  }
  const lines = Array.isArray(x.map) ? x.map : [];
  // Each row as long as the map is wide; what isn't a kind of tile is empty.
  const map = Array.from({ length: rows }, (_, r) => {
    const line = typeof lines[r] === "string" ? (lines[r] as string) : "";
    return Array.from({ length: cols }, (_, c) => (kinds[line[c] ?? "."] ? line[c] : ".")).join("");
  });
  return { size, cols, rows, map, kinds };
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
  };
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
    default: return null;
  }
}

/** A page's game, read into a spec safe to run; null when there's nothing to play (no thing in the world). */
export function gameOf(raw: unknown, say: Say = (w) => (typeof w === "string" ? w : "")): GameSpec | null {
  const x = obj(raw);
  const things = (Array.isArray(x.things) ? x.things : []).slice(0, GAME_LIMITS.things).map((t) => thingOf(t, say)).filter((t): t is GameThing => Boolean(t));
  // Ids are names the rules use: the first of a name wins.
  const seen = new Set<string>();
  const unique = things.filter((t) => !seen.has(t.id) && Boolean(seen.add(t.id)));
  const ids = new Set(unique.map((t) => t.id)), templates = new Set(unique.filter((t) => t.template).map((t) => t.id));
  const tiles = tilesOf(x.tiles, say, ids, templates);
  if (!unique.some((t) => !t.template) && !tiles?.map.some((r) => /[^.]/.test(r))) return null;
  const rules = (Array.isArray(x.rules) ? x.rules : []).slice(0, GAME_LIMITS.rules).flatMap((r): GameRule[] => {
    const when = whenOf(obj(r).when);
    const acts = (Array.isArray(obj(r).do) ? (obj(r).do as unknown[]) : []).slice(0, GAME_LIMITS.acts).map(actOf).filter((a): a is GameAct => Boolean(a));
    return when && acts.length ? [{ when, do: acts }] : [];
  });
  const words = obj(x.words);
  const w = int(x.w, 320, 1920, 960), h = int(x.h, 240, 1920, 540);
  const cam = obj(x.camera);
  return {
    w, h,
    ww: tiles ? Math.max(w, tiles.cols * tiles.size) : int(x.ww, w, 8000, w),
    wh: tiles ? Math.max(h, tiles.rows * tiles.size) : int(x.wh, h, 8000, h),
    tiles,
    camera: { follow: whoOf(cam.follow), lerp: num(cam.lerp, 0.02, 1, 0.12) },
    layers: (Array.isArray(x.layers) ? x.layers : []).slice(0, GAME_LIMITS.layers).map(layerOf),
    bg: colourOf(x.bg, "surface"),
    gravity: num(x.gravity, 0, 4000, 0),
    edges: pick(x.edges, GAME_EDGES, "walls"),
    things: unique, rules,
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
export const STAGE_WORDS: Record<"ar" | "en" | "he", { start: string; again: string; win: string; lose: string; score: string; lives: string; time: string; sound: string; left: string; right: string; up: string; down: string; jump: string; paused: string }> = {
  ar: { start: "ابدأ", again: "العب كمان مرة", win: "ربحت! 🎉", lose: "خلصت اللعبة", score: "النقاط", lives: "الأرواح", time: "الوقت", sound: "الصوت", left: "شمال", right: "يمين", up: "لفوق", down: "لتحت", jump: "نطّ", paused: "اللعبة واقفة، ارجع لعندها لتكمّل" },
  en: { start: "Start", again: "Play again", win: "You won! 🎉", lose: "Game over", score: "Score", lives: "Lives", time: "Time", sound: "Sound", left: "Left", right: "Right", up: "Up", down: "Down", jump: "Jump", paused: "Paused: come back to it to go on" },
  he: { start: "התחלה", again: "שחקו שוב", win: "ניצחת! 🎉", lose: "המשחק נגמר", score: "נקודות", lives: "חיים", time: "זמן", sound: "צליל", left: "שמאלה", right: "ימינה", up: "למעלה", down: "למטה", jump: "קפיצה", paused: "המשחק בהשהיה: חזרו אליו כדי להמשיך" },
};
