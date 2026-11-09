/**
 * Keyframes (0–100 %) for an element and its pieces, and when it shows inside a scroll scene,
 * as the shop reads them (the backend checks them first: lib/pageTree.ts NodeKeys, NodeCue).
 *
 * A piece's moments become one list of steps: every property any moment names is given a value
 * at every moment, like CSS @keyframes (a moment that leaves a turn or move out glides between
 * the moments around it; one with no 0 % or 100 % moment starts or ends at rest), so each step
 * is one tween from the step before. TreeMotion (GSAP) plays them as a timeline whose length
 * is the keyframes' duration; a scroll scene sets that timeline's progress itself.
 *
 * Plain data in, plain data out: no DOM and no "@/" imports, so tests load this file directly.
 */
export const KEY_TRIGGERS = ["load", "view", "scroll", "scene", "hover", "click", "loop", "trigger"] as const;
export const KEY_PARTS = ["self", "before", "after", "inner"] as const;
export const KEY_ORIGINS = ["center", "top", "bottom", "start", "end", "top-start", "top-end", "bottom-start", "bottom-end"] as const;
export const KEY_EASES = ["smooth", "soft", "strong", "back", "elastic", "bounce", "linear"] as const;
export const CUE_KINDS = ["fade", "up", "down", "start", "end", "zoom", "shrink", "blur", "turn", "flip", "wipe", "none"] as const;
/** GSAP's eases for the editor's names (TreeMotion's too). */
export const EASE_MAP: Record<string, string> = { smooth: "power2.out", soft: "sine.inOut", strong: "power4.out", back: "back.out(1.6)", elastic: "elastic.out(1, 0.5)", bounce: "bounce.out", linear: "none" };

export type KeyPart = (typeof KEY_PARTS)[number];
export type KeyFrameSpec = {
  at: number;
  x?: number; y?: number; xp?: number; yp?: number;
  rx?: number; ry?: number; rz?: number;
  scale?: number; sx?: number; sy?: number; skewX?: number; skewY?: number;
  opacity?: number; blur?: number; bright?: number; hue?: number;
  color?: string; bg?: string; radius?: number;
  clip?: [number, number, number, number];
  ease?: string;
};
export type KeysSpec = {
  on: (typeof KEY_TRIGGERS)[number];
  duration?: number; delay?: number; ease?: string; repeat?: number; yoyo?: boolean;
  start?: number; end?: number; scrub?: number;
  origin?: (typeof KEY_ORIGINS)[number];
  parts: Partial<Record<KeyPart, KeyFrameSpec[]>>;
};
export type CueSpec = { from: number; to: number; in?: (typeof CUE_KINDS)[number]; out?: (typeof CUE_KINDS)[number] | "stay"; soft?: number };

const COLOR_TOKENS = ["text", "muted", "accent", "accent-soft", "accent-contrast", "bg", "surface", "border", "white", "black", "transparent"];
const isColor = (v: unknown): v is string => typeof v === "string" && (COLOR_TOKENS.includes(v) || /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v));
const within = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
const inList = <T extends string>(v: unknown, list: readonly T[]) => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined);
const obj = (v: unknown): Record<string, unknown> | undefined => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
const drop = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/** The numbers a moment may carry, with their ranges and their value at rest. */
const NUMBERS: Record<string, [number, number, number]> = {
  x: [-2000, 2000, 0], y: [-2000, 2000, 0], xp: [-500, 500, 0], yp: [-500, 500, 0],
  rx: [-720, 720, 0], ry: [-720, 720, 0], rz: [-1440, 1440, 0],
  scale: [0, 6, 1], sx: [-6, 6, 1], sy: [-6, 6, 1], skewX: [-80, 80, 0], skewY: [-80, 80, 0],
  opacity: [0, 1, 1], blur: [0, 60, 0], bright: [0, 3, 1], hue: [-180, 180, 0], radius: [0, 999, NaN],
};

function frameOf(raw: unknown): KeyFrameSpec | undefined {
  const r = obj(raw);
  const at = within(r?.at, 0, 100);
  if (!r || at === undefined) return undefined;
  const f: KeyFrameSpec = { at };
  for (const [k, [min, max]] of Object.entries(NUMBERS)) {
    const v = within(r[k], min, max);
    if (v !== undefined) (f as Record<string, unknown>)[k] = v;
  }
  if (isColor(r.color)) f.color = r.color;
  if (isColor(r.bg)) f.bg = r.bg;
  if (Array.isArray(r.clip) && r.clip.length === 4 && r.clip.every((v) => within(v, 0, 100) !== undefined)) f.clip = r.clip.slice() as KeyFrameSpec["clip"];
  const ease = inList(r.ease, KEY_EASES);
  if (ease) f.ease = ease;
  return f;
}

/** A piece's moments: 2–16 of them, in order of their time. */
function framesOf(raw: unknown): KeyFrameSpec[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw.slice(0, 16).map(frameOf).filter((f): f is KeyFrameSpec => Boolean(f)).sort((a, b) => a.at - b.at);
  return list.length >= 2 ? list : undefined;
}

/** Keyframes the shop may play: known names and numbers in range only, else undefined. */
export function keysSpecOf(raw: unknown): KeysSpec | undefined {
  const r = obj(raw);
  const on = inList(r?.on, KEY_TRIGGERS);
  const p = obj(r?.parts);
  if (!r || !on || !p) return undefined;
  const parts: KeysSpec["parts"] = {};
  for (const part of KEY_PARTS) {
    const frames = framesOf(p[part]);
    if (frames) parts[part] = frames;
  }
  if (!Object.keys(parts).length) return undefined;
  return drop({
    on, parts,
    duration: within(r.duration, 0.05, 60),
    delay: within(r.delay, 0, 20),
    ease: inList(r.ease, KEY_EASES),
    repeat: typeof r.repeat === "number" && Number.isInteger(r.repeat) && r.repeat >= -1 && r.repeat <= 50 ? r.repeat : undefined,
    yoyo: typeof r.yoyo === "boolean" ? r.yoyo : undefined,
    start: within(r.start, 0, 100),
    end: within(r.end, 0, 100),
    scrub: within(r.scrub, 0, 3),
    origin: inList(r.origin, KEY_ORIGINS),
  });
}

/** When it shows inside a scroll scene, or undefined. */
export function cueOf(raw: unknown): CueSpec | undefined {
  const r = obj(raw);
  const from = within(r?.from, 0, 100);
  const to = within(r?.to, 0, 100);
  if (!r || from === undefined || to === undefined || to <= from) return undefined;
  return drop({ from, to, in: inList(r.in, CUE_KINDS), out: r.out === "stay" ? "stay" as const : inList(r.out, CUE_KINDS), soft: within(r.soft, 0, 50) });
}

/* ------------------------------------------------------------ the steps */

export type KeyVars = Record<string, string | number>;
export type KeyStep = { at: number; vars: KeyVars; ease?: string };
export type StepEnv = {
  /** The element itself moves through its CSS variables (so its other motions add up); a piece by GSAP's own transform. */
  self: boolean;
  rtl: boolean;
  /** A theme colour ("accent") as the browser's colour. */
  resolve: (color: string) => string;
  /** Its own opacity at rest (a moment without one goes back to it). */
  restOpacity?: number;
};

const round = (v: number) => Math.round(v * 1000) / 1000;
/** Every moment's value of one number: its own, else between the moments around it, else at rest (0 % and 100 %), like CSS. */
function track(frames: KeyFrameSpec[], key: string, rest: number): Array<number | undefined> {
  const at = frames.map((f) => f.at);
  const own = frames.map((f) => (f as Record<string, unknown>)[key] as number | undefined);
  const known: Array<[number, number]> = [];
  own.forEach((v, i) => v !== undefined && known.push([at[i], v]));
  if (!known.length) return own;
  const hasRest = Number.isFinite(rest);
  if (hasRest && known[0][0] > 0) known.unshift([0, rest]);
  if (hasRest && known[known.length - 1][0] < 100) known.push([100, rest]);
  return own.map((v, i) => {
    if (v !== undefined) return v;
    const t = at[i];
    let a = known[0], b = known[known.length - 1];
    for (const k of known) {
      if (k[0] <= t) a = k;
      if (k[0] >= t) { b = k; break; }
    }
    if (t <= a[0] || a === b) return a[1];
    if (t >= b[0]) return b[1];
    return round(a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0]));
  });
}
/** A colour at every moment: its own, else the one before (or the first after). */
function holdColor(frames: KeyFrameSpec[], key: "color" | "bg"): Array<string | undefined> {
  const own = frames.map((f) => f[key]);
  const first = own.find(Boolean);
  let last = first;
  return own.map((v) => (v ? (last = v) : last));
}

const SELF_VAR: Record<string, [string, string]> = {
  x: ["--pt-kx", "px"], y: ["--pt-ky", "px"], xp: ["--pt-kxp", "%"], yp: ["--pt-kyp", "%"],
  rx: ["--pt-krx", "deg"], ry: ["--pt-kry", "deg"], rz: ["--pt-krz", "deg"],
  scale: ["--pt-ks", ""], sx: ["--pt-ksx", ""], sy: ["--pt-ksy", ""], skewX: ["--pt-kkx", "deg"], skewY: ["--pt-kky", "deg"],
};
const PIECE_PROP: Record<string, string> = {
  x: "x", y: "y", xp: "xPercent", yp: "yPercent", rx: "rotationX", ry: "rotationY", rz: "rotation",
  scale: "scale", sx: "scaleX", sy: "scaleY", skewX: "skewX", skewY: "skewY",
};
const MOVES = Object.keys(SELF_VAR);
const FILTERS: Array<[string, string, string]> = [["blur", "blur", "px"], ["bright", "brightness", ""], ["hue", "hue-rotate", "deg"]];

/**
 * A piece's moments as steps: the first is where it starts (set at once), each next one a tween
 * from the step before. x moves toward the reading direction's end (mirrored in Arabic and Hebrew).
 */
export function keySteps(frames: KeyFrameSpec[], env: StepEnv): KeyStep[] {
  if (frames.length < 2) return [];
  const named = (k: string) => frames.some((f) => (f as Record<string, unknown>)[k] !== undefined);
  const vars: KeyVars[] = frames.map(() => ({}));
  const flip = env.rtl ? -1 : 1;
  // A piece's scale and its stretch along each side join into GSAP's scaleX/scaleY.
  const joinScale = !env.self && (named("sx") || named("sy"));
  const values: Record<string, Array<number | undefined>> = {};
  for (const k of [...MOVES, "opacity", "radius", ...FILTERS.map(([k]) => k)]) {
    if (!named(k) && !(joinScale && k === "scale")) continue;
    const rest = k === "opacity" ? (env.restOpacity ?? 1) : NUMBERS[k][2];
    values[k] = track(frames, k, rest);
  }
  frames.forEach((_, i) => {
    const v = vars[i];
    for (const k of MOVES) {
      const n = values[k]?.[i];
      if (n === undefined) continue;
      if (joinScale && (k === "scale" || k === "sx" || k === "sy")) continue;
      const value = k === "x" || k === "xp" ? n * flip : n;
      if (env.self) v[SELF_VAR[k][0]] = `${round(value)}${SELF_VAR[k][1]}`;
      else v[PIECE_PROP[k]] = round(value);
    }
    if (joinScale) {
      const s = values.scale?.[i] ?? 1;
      v.scaleX = round(s * (values.sx?.[i] ?? 1));
      v.scaleY = round(s * (values.sy?.[i] ?? 1));
    }
    if (values.opacity?.[i] !== undefined) v.opacity = values.opacity[i]!;
    if (values.radius?.[i] !== undefined) v.borderRadius = `${values.radius[i]}px`;
    const fs = FILTERS.filter(([k]) => values[k]);
    if (fs.length) v.filter = fs.map(([k, fn, unit]) => `${fn}(${values[k]![i] ?? NUMBERS[k][2]}${unit})`).join(" ");
  });
  for (const [key, prop] of [["color", "color"], ["bg", "backgroundColor"]] as const) {
    if (!named(key)) continue;
    holdColor(frames, key).forEach((c, i) => c && (vars[i][prop] = env.resolve(c)));
  }
  if (named("clip")) {
    const sides = [0, 1, 2, 3].map((s) => track(frames.map((f) => ({ at: f.at, v: f.clip?.[s] })) as unknown as KeyFrameSpec[], "v", 0));
    frames.forEach((_, i) => {
      const [t, end, b, start] = sides.map((s) => s[i] ?? 0);
      // inset() is top, right, bottom, left: the line's end is on the right in English, on the left in Arabic.
      vars[i].clipPath = env.rtl ? `inset(${t}% ${start}% ${b}% ${end}%)` : `inset(${t}% ${end}% ${b}% ${start}%)`;
    });
  }
  return frames.map((f, i) => ({ at: f.at, vars: vars[i], ...(f.ease ? { ease: f.ease } : {}) }));
}

/** Where a piece turns and grows from, in CSS, for the reading direction. */
export function originCss(origin: KeysSpec["origin"], rtl: boolean): string | undefined {
  if (!origin) return undefined;
  const start = rtl ? "100%" : "0%";
  const end = rtl ? "0%" : "100%";
  const [v, h] = origin === "center" ? ["50%", "50%"] : origin.includes("-") ? origin.split("-") : ["top", "bottom"].includes(origin) ? [origin, "center"] : ["center", origin];
  const x = h === "start" ? start : h === "end" ? end : "50%";
  const y = v === "top" ? "0%" : v === "bottom" ? "100%" : "50%";
  return `${x} ${y}`;
}

/* ------------------------------------------------------------ in a scene */

/** How far into its moment something in a scroll scene is: 0 = not shown, 1 = fully, with the in/out ramps. */
export function cueAmount(cue: CueSpec, p: number): { v: number; phase: "before" | "in" | "on" | "out" | "after" } {
  const at = p * 100;
  const span = cue.to - cue.from;
  const ramp = Math.max(0.001, Math.min(span / 2, (span * (cue.soft ?? 20)) / 100));
  const stays = cue.out === "stay";
  if (at < cue.from) return { v: 0, phase: "before" };
  if (!stays && at > cue.to) return { v: 0, phase: "after" };
  // What starts with the scene is there from its first moment; what ends with it stays to its last.
  if (cue.from > 0 && at < cue.from + ramp && cue.in !== "none") return { v: (at - cue.from) / ramp, phase: "in" };
  if (!stays && cue.to < 100 && at > cue.to - ramp && cue.out !== "none") return { v: (cue.to - at) / ramp, phase: "out" };
  return { v: 1, phase: "on" };
}

const smooth = (t: number) => t * t * (3 - 2 * t);
/**
 * The look of something coming in (or going) at amount `v` (0–1): CSS variables of its
 * coming-in motion and plain styles, written by the scene runtime each frame.
 */
export function cueLook(kind: CueSpec["in"] | "stay" | undefined, v: number, rtl: boolean): Record<string, string> {
  const t = smooth(Math.max(0, Math.min(1, v)));
  const left = 1 - t;
  const side = rtl ? -1 : 1;
  const out: Record<string, string> = { opacity: kind === "none" ? (v > 0 ? "1" : "0") : String(round(t)) };
  const px = (n: number) => `${round(n)}px`;
  switch (kind) {
    case "up": out["--pt-ey"] = px(70 * left); break;
    case "down": out["--pt-ey"] = px(-70 * left); break;
    case "start": out["--pt-ex"] = px(-90 * left * side); break;
    case "end": out["--pt-ex"] = px(90 * left * side); break;
    case "zoom": out["--pt-es"] = String(round(0.7 + 0.3 * t)); break;
    case "shrink": out["--pt-es"] = String(round(1.3 - 0.3 * t)); break;
    case "blur": out.filter = `blur(${round(18 * left)}px)`; break;
    case "turn": out["--pt-erz"] = `${round(-14 * left * side)}deg`; out["--pt-es"] = String(round(0.9 + 0.1 * t)); break;
    case "flip": out["--pt-erx"] = `${round(80 * left)}deg`; break;
    case "wipe": out.opacity = v > 0 ? "1" : "0"; out.clipPath = `inset(0% ${rtl ? 0 : round(100 * left)}% 0% ${rtl ? round(100 * left) : 0}%)`; break;
    default: break;
  }
  return out;
}

/** A value between two moments of a scene (0 before `from`, 1 after `to`, smooth between). */
export function between(p: number, from: number, to: number): number {
  const at = p * 100;
  if (to <= from) return at >= to ? 1 : 0;
  return smooth(Math.max(0, Math.min(1, (at - from) / (to - from))));
}
