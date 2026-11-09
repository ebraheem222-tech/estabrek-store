/**
 * Keyframes in the editor (the shop plays them: pageTree/keyframes.ts and TreeMotion): an
 * element's own animation from 0 % to 100 %, for itself and its pieces — its layer behind
 * (before), its layer in front (after) and what's inside it (its words or picture) — each piece
 * with its own moments and where it goes. Here: which pieces each kind has, the moments' fields,
 * the changes that add, move and remove moments, and ready animations (some bring their layers
 * and an overflow with them, like a button filling from one side).
 */
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { motionOp, type Motion } from "./look";
import { styleOp } from "./columns";
import { say } from "./say";

export type KeyPart = "self" | "before" | "after" | "inner";
export type KeyTrigger = "load" | "view" | "scroll" | "scene" | "hover" | "click" | "loop" | "trigger";
export type KeyFrame = {
  at: number;
  x?: number; y?: number; xp?: number; yp?: number;
  rx?: number; ry?: number; rz?: number;
  scale?: number; sx?: number; sy?: number; skewX?: number; skewY?: number;
  opacity?: number; blur?: number; bright?: number; hue?: number;
  color?: string; bg?: string; radius?: number;
  clip?: [number, number, number, number];
  ease?: string;
};
export type Keys = {
  on: KeyTrigger;
  duration?: number; delay?: number; ease?: string; repeat?: number; yoyo?: boolean;
  start?: number; end?: number; scrub?: number; origin?: string;
  parts: Partial<Record<KeyPart, KeyFrame[]>>;
};
export type Layer = {
  bg?: string; to?: string; angle?: number; radial?: boolean;
  inset?: [number, number, number, number];
  at?: "fill" | "top" | "bottom" | "start" | "end" | "center"; w?: number; h?: number;
  radius?: number; opacity?: number; blend?: string; blur?: number;
  border?: { width: number; color: string; style?: "solid" | "dashed" | "dotted" };
  front?: boolean;
};
export type Layers = { before?: Layer; after?: Layer };

/** The pieces an element of this kind has (its layers need a box around its content; words and pictures have an inside). */
const LAYERED = new Set(["section", "stack", "grid", "cell", "columns", "heading", "text", "button", "image", "video", "icon"]);
const INSIDE = new Set(["heading", "text", "button", "image", "video"]);
export function partsFor(type: string): KeyPart[] {
  return ["self", ...(LAYERED.has(type) ? (["before", "after"] as const) : []), ...(INSIDE.has(type) ? (["inner"] as const) : [])];
}
export const PART_NAME: Record<KeyPart, () => string> = {
  self: () => say("العنصر كله|The whole element|הרכיב כולו"),
  before: () => say("طبقة ورا (before)|Layer behind (before)|שכבה מאחור (before)"),
  after: () => say("طبقة قدّام (after)|Layer in front (after)|שכבה מלפנים (after)"),
  inner: () => say("اللي جوّاه (الكلام/الصورة)|Its inside (words/picture)|התוכן שבפנים (מילים/תמונה)"),
};
export const TRIGGER_NAME: Record<KeyTrigger, () => string> = {
  load: () => say("لما تفتح الصفحة|When the page opens|כשהעמוד נפתח"),
  view: () => say("لما يبين بالشاشة|When it comes into view|כשהוא נכנס לתצוגה"),
  scroll: () => say("مع التمرير (سكرول)|With the scroll|עם הגלילה"),
  scene: () => say("مع مشهد التمرير|With its scroll scene|עם סצנת הגלילה"),
  hover: () => say("لما يمر الماوس (ويرجع)|On hover (and back)|בריחוף (וחזרה)"),
  click: () => say("بالكبس (كبسة تانية بترجّعه)|On click (again = back)|בלחיצה (שוב = חזרה)"),
  loop: () => say("يعيد على طول|Loops|בלולאה"),
  trigger: () => say("بس لما مشغّل يطلبه|Only when a trigger asks|רק כשטריגר מבקש"),
};
export const ORIGIN_NAME: Array<[string, () => string]> = [
  ["center", () => say("النص|Centre|מרכז")], ["top", () => say("فوق|Top|למעלה")], ["bottom", () => say("تحت|Bottom|למטה")],
  ["start", () => say("البداية|Start|התחלה")], ["end", () => say("النهاية|End|סוף")],
  ["top-start", () => say("فوق البداية|Top start|למעלה בהתחלה")], ["top-end", () => say("فوق النهاية|Top end|למעלה בסוף")],
  ["bottom-start", () => say("تحت البداية|Bottom start|למטה בהתחלה")], ["bottom-end", () => say("تحت النهاية|Bottom end|למטה בסוף")],
];

/** A moment's number fields: key, name, min, max, step, unit. */
export const FRAME_FIELDS: Array<[keyof KeyFrame, () => string, number, number, number, string]> = [
  ["x", () => say("يمشي بالعرض|Moves across|זז לרוחב"), -1000, 1000, 1, "px"],
  ["y", () => say("يمشي بالطول|Moves down|זז לאורך"), -1000, 1000, 1, "px"],
  ["xp", () => say("بالعرض % من حجمه|Across, % of itself|לרוחב, % מעצמו"), -500, 500, 1, "%"],
  ["yp", () => say("بالطول % من حجمه|Down, % of itself|לאורך, % מעצמו"), -500, 500, 1, "%"],
  ["rz", () => say("يلف|Turns|מסתובב"), -720, 720, 1, "°"],
  ["rx", () => say("يميل لقدّام|Tilts forward|נוטה קדימה"), -360, 360, 1, "°"],
  ["ry", () => say("يلف عالجنب|Turns sideways|מסתובב הצידה"), -360, 360, 1, "°"],
  ["scale", () => say("الحجم|Size|גודל"), 0, 4, 0.01, "×"],
  ["sx", () => say("يتمطّ بالعرض|Stretch across|מתיחה לרוחב"), -4, 4, 0.01, "×"],
  ["sy", () => say("يتمطّ بالطول|Stretch down|מתיחה לאורך"), -4, 4, 0.01, "×"],
  ["skewX", () => say("ميلان بالعرض|Slant across|הטיה לרוחב"), -60, 60, 1, "°"],
  ["skewY", () => say("ميلان بالطول|Slant down|הטיה לאורך"), -60, 60, 1, "°"],
  ["opacity", () => say("الوضوح|Opacity|אטימות"), 0, 1, 0.01, ""],
  ["blur", () => say("ضبابية|Blur|טשטוש"), 0, 40, 0.5, "px"],
  ["bright", () => say("الإضاءة|Brightness|בהירות"), 0, 3, 0.05, "×"],
  ["hue", () => say("درجة اللون|Hue|גוון"), -180, 180, 1, "°"],
  ["radius", () => say("الزوايا|Corners|פינות"), 0, 300, 1, "px"],
];
/** What a field is at rest (what the editor fills in when it's turned on). */
export const FIELD_REST: Partial<Record<keyof KeyFrame, number>> = { scale: 1, sx: 1, sy: 1, opacity: 1, bright: 1 };

const clean = <T>(v: T): T => JSON.parse(JSON.stringify(v));
export const keysOf = (n: PageTreeNode): Keys | undefined => (n.motion as Motion | undefined)?.keys as Keys | undefined;
export const layersOf = (n: PageTreeNode): Layers | undefined => n.props?.layers as Layers | undefined;

/** Its motion with these keyframes (or none), the rest of its motion kept. */
export function withKeys(m: Motion | undefined, keys: Keys | null): Motion | null {
  const next: Motion = { ...(m ?? {}) };
  if (keys && Object.values(keys.parts).some((f) => f && f.length >= 2)) next.keys = clean(keys);
  else delete next.keys;
  return Object.keys(next).length ? next : null;
}
export const keysOp = (n: PageTreeNode, keys: Keys | null): PageDraftOp => motionOp(n, withKeys(n.motion as Motion | undefined, keys));
/** Its props with these layers (or none). */
export function layersOp(n: PageTreeNode, layers: Layers | null): PageDraftOp {
  const props = { ...n.props };
  const kept = layers ? Object.fromEntries(Object.entries(layers).filter(([, l]) => l && Object.keys(l).length)) : {};
  if (Object.keys(kept).length) props.layers = clean(kept);
  else delete props.layers;
  return { op: "setProps", nodeId: n.id, props };
}

/** New keyframes: from where it is to a little lifted and back, on hover. */
export const starterKeys = (part: KeyPart = "self"): Keys => ({ on: "hover", duration: 0.6, ease: "smooth", parts: { [part]: [{ at: 0 }, { at: 100, y: -8, scale: 1.04 }] } });

/** A moment added at `at` % (its values in between the moments around it, so nothing jumps), kept in order. */
export function addFrame(frames: KeyFrame[], at: number): KeyFrame[] {
  const t = Math.max(0, Math.min(100, Math.round(at)));
  if (frames.some((f) => f.at === t)) return frames;
  const before = [...frames].reverse().find((f) => f.at < t);
  const after = frames.find((f) => f.at > t);
  const mid: KeyFrame = { at: t };
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})].filter((k) => k !== "at" && k !== "ease"));
  for (const k of keys) {
    const a = (before as Record<string, unknown> | undefined)?.[k];
    const b = (after as Record<string, unknown> | undefined)?.[k];
    if (typeof a === "number" && typeof b === "number" && before && after) (mid as Record<string, unknown>)[k] = Math.round((a + ((b - a) * (t - before.at)) / (after.at - before.at)) * 100) / 100;
    else if (a !== undefined) (mid as Record<string, unknown>)[k] = clean(a);
    else if (b !== undefined) (mid as Record<string, unknown>)[k] = clean(b);
  }
  return [...frames, mid].sort((x, y) => x.at - y.at);
}
/** Moment `i` changed (a field set to undefined comes out); its time stays between its neighbours. */
export function setFrame(frames: KeyFrame[], i: number, patch: Partial<KeyFrame>): KeyFrame[] {
  return frames
    .map((f, j) => {
      if (j !== i) return f;
      const next: Record<string, unknown> = { ...f, ...patch };
      for (const [k, v] of Object.entries(next)) if (v === undefined) delete next[k];
      return next as KeyFrame;
    })
    .sort((a, b) => a.at - b.at);
}
/** Moment `i` taken out (two always stay). */
export const dropFrame = (frames: KeyFrame[], i: number): KeyFrame[] => (frames.length <= 2 ? frames : frames.filter((_, j) => j !== i));

/* -------------------------------------------------------------- ready ones */

export type KeyPreset = {
  key: string;
  group: "self" | "button" | "words" | "picture" | "scroll" | "box";
  name: () => string;
  keys: Keys;
  layers?: Layers;
  overflow?: "hidden" | "clip";
  /** Kinds it suits (none = all). */
  only?: ReadonlySet<string>;
};
const BUTTONS = new Set(["button", "stack", "cell", "section", "grid", "image", "heading", "text"]);
const WORDY = new Set(["heading", "text", "button"]);
const PICTURES = new Set(["image", "video"]);
const K = (on: KeyTrigger, parts: Keys["parts"], more: Partial<Keys> = {}): Keys => ({ on, duration: 0.6, ease: "smooth", ...more, parts });
const P = (key: string, group: KeyPreset["group"], name: string, keys: Keys, extra: Partial<KeyPreset> = {}): KeyPreset => ({ key, group, name: () => say(name), keys, ...extra });

export const KEY_PRESETS: KeyPreset[] = [
  // The whole element.
  P("float-path", "self", "يطفو بمسار|Floats along a path|מרחף במסלול", K("loop", { self: [{ at: 0, y: 0, rz: 0 }, { at: 50, y: -18, rz: 3 }, { at: 100, y: 0, rz: 0 }] }, { duration: 3.2, ease: "soft" })),
  P("orbit", "self", "يدور بدائرة|Orbits|מקיף במעגל", K("loop", { self: [{ at: 0, x: 0, y: 0 }, { at: 25, x: 22, y: -22 }, { at: 50, x: 0, y: -44 }, { at: 75, x: -22, y: -22 }, { at: 100, x: 0, y: 0 }] }, { duration: 4, ease: "linear" })),
  P("pendulum", "self", "بندول|Pendulum|מטוטלת", K("loop", { self: [{ at: 0, rz: -12 }, { at: 50, rz: 12 }, { at: 100, rz: -12 }] }, { duration: 2.4, ease: "soft", origin: "top" })),
  P("breathe-glow", "self", "يتنفس ويضوي|Breathes and glows|נושם וזוהר", K("loop", { self: [{ at: 0, scale: 1, bright: 1 }, { at: 50, scale: 1.05, bright: 1.18 }, { at: 100, scale: 1, bright: 1 }] }, { duration: 2.6, ease: "soft" })),
  P("heartbeat-pro", "self", "نبضة قلب|Heartbeat|דופק", K("loop", { self: [{ at: 0, scale: 1 }, { at: 14, scale: 1.15 }, { at: 28, scale: 1 }, { at: 42, scale: 1.15 }, { at: 70, scale: 1 }, { at: 100, scale: 1 }] }, { duration: 1.3, ease: "soft" })),
  P("zoom-blur-in", "self", "يطلع من الضباب|Comes out of a blur|יוצא מטשטוש", K("view", { self: [{ at: 0, scale: 1.35, blur: 18, opacity: 0 }, { at: 100, scale: 1, blur: 0, opacity: 1 }] }, { duration: 1.1, ease: "strong" })),
  P("rise-tilt", "self", "يطلع مايل ويتعدّل|Rises tilted, settles|עולה נטוי ומתיישר", K("view", { self: [{ at: 0, y: 90, rx: 35, opacity: 0 }, { at: 65, y: -6, rx: -4, opacity: 1 }, { at: 100, y: 0, rx: 0 }] }, { duration: 1.2, ease: "smooth" })),
  P("drop-bounce", "self", "يوقع وينط|Drops and bounces|נופל וקופץ", K("view", { self: [{ at: 0, y: -160, opacity: 0 }, { at: 55, y: 0, opacity: 1, ease: "strong" }, { at: 72, y: -26, sy: 1 }, { at: 86, y: 0, sy: 0.92 }, { at: 100, y: 0, sy: 1 }] }, { duration: 1.2 })),
  P("glitch", "self", "غلتش|Glitch|גליץ'", K("hover", { self: [{ at: 0, x: 0, skewX: 0, hue: 0 }, { at: 20, x: -5, skewX: 9, hue: 50 }, { at: 40, x: 5, skewX: -7, hue: -40 }, { at: 60, x: -3, skewX: 4, hue: 30 }, { at: 80, x: 2, skewX: -2, hue: 0 }, { at: 100, x: 0, skewX: 0, hue: 0 }] }, { duration: 0.5, ease: "linear" })),
  P("squash", "self", "ينعصر وينط|Squash and stretch|נמעך ונמתח", K("click", { self: [{ at: 0, sx: 1, sy: 1 }, { at: 30, sx: 1.25, sy: 0.8 }, { at: 60, sx: 0.9, sy: 1.1 }, { at: 100, sx: 1, sy: 1 }] }, { duration: 0.6, ease: "soft" })),
  P("spin-3d", "self", "يلف ثلاثي الأبعاد|Spins in 3D|מסתובב בתלת ממד", K("hover", { self: [{ at: 0, ry: 0 }, { at: 100, ry: 360 }] }, { duration: 0.9, ease: "smooth" })),
  P("jelly", "self", "جيلي|Jelly|ג'לי", K("hover", { self: [{ at: 0, sx: 1, sy: 1 }, { at: 30, sx: 1.15, sy: 0.85 }, { at: 40, sx: 0.85, sy: 1.15 }, { at: 50, sx: 1.05, sy: 0.95 }, { at: 65, sx: 0.98, sy: 1.02 }, { at: 100, sx: 1, sy: 1 }] }, { duration: 0.8, ease: "soft" })),
  P("colour-cycle", "self", "ألوانه بتدور|Colours cycle|צבעים מתחלפים", K("loop", { self: [{ at: 0, hue: -180 }, { at: 100, hue: 180 }] }, { duration: 6, ease: "linear" })),
  P("flip-card", "self", "بطاقة بتنقلب|Flips like a card|מתהפך כמו קלף", K("click", { self: [{ at: 0, ry: 0 }, { at: 100, ry: 180 }] }, { duration: 0.8, ease: "back" })),
  // Buttons and boxes: their layers fill, draw and shine.
  P("fill-start", "button", "يتعبّى من البداية|Fills from the start|מתמלא מההתחלה", K("hover", { before: [{ at: 0, xp: -101 }, { at: 100, xp: 0 }] }, { duration: 0.45 }), { layers: { before: { bg: "accent" } }, overflow: "hidden", only: BUTTONS }),
  P("fill-bottom", "button", "يتعبّى من تحت|Fills from below|מתמלא מלמטה", K("hover", { before: [{ at: 0, yp: 101 }, { at: 100, yp: 0 }] }, { duration: 0.45 }), { layers: { before: { bg: "accent" } }, overflow: "hidden", only: BUTTONS }),
  P("fill-circle", "button", "دائرة بتكبر من النص|A circle grows from the middle|עיגול גדל מהמרכז", K("hover", { before: [{ at: 0, scale: 0 }, { at: 100, scale: 1 }] }, { duration: 0.55 }), { layers: { before: { bg: "accent", at: "center", w: 600, h: 600, radius: 999 } }, overflow: "hidden", only: BUTTONS }),
  P("slant-fill", "button", "تعبئة مايلة|Slanted fill|מילוי נטוי", K("hover", { before: [{ at: 0, xp: -125, skewX: -25 }, { at: 100, xp: 0, skewX: 0 }] }, { duration: 0.5 }), { layers: { before: { bg: "accent", inset: [0, -20, 0, -20] } }, overflow: "hidden", only: BUTTONS }),
  P("curtain-split", "button", "ستارة بتنفتح|Curtain opens|וילון נפתח", K("hover", { before: [{ at: 0, sx: 0 }, { at: 100, sx: 1 }] }, { duration: 0.45, origin: "center" }), { layers: { before: { bg: "accent" } }, overflow: "hidden", only: BUTTONS }),
  P("underline-grow", "button", "خط تحت بيكبر|Underline grows|קו תחתון גדל", K("hover", { after: [{ at: 0, sx: 0 }, { at: 100, sx: 1 }] }, { duration: 0.4, origin: "start" }), { layers: { after: { bg: "accent", at: "bottom", h: 2, inset: [0, 0, -6, 0], front: true } }, only: BUTTONS }),
  P("shine-sweep", "button", "لمعة بتمر|A shine sweeps across|ברק חוצה", K("hover", { after: [{ at: 0, x: -80, skewX: -20, opacity: 0 }, { at: 20, opacity: 0.55 }, { at: 100, x: 520, skewX: -20, opacity: 0 }] }, { duration: 0.8, ease: "soft" }), { layers: { after: { bg: "white", at: "start", w: 36, front: true } }, overflow: "hidden", only: BUTTONS }),
  P("border-draw", "button", "إطار بينرسم|The frame draws itself|המסגרת מצטיירת", K("hover", { after: [{ at: 0, clip: [0, 100, 100, 0] }, { at: 100, clip: [0, 0, 0, 0] }] }, { duration: 0.6 }), { layers: { after: { border: { width: 2, color: "accent" }, front: true } }, only: BUTTONS }),
  P("glow-pulse", "button", "هالة بتنبض|A glow pulses|הילה פועמת", K("loop", { before: [{ at: 0, opacity: 0.25, scale: 0.96 }, { at: 50, opacity: 0.75, scale: 1.08 }, { at: 100, opacity: 0.25, scale: 0.96 }] }, { duration: 2, ease: "soft" }), { layers: { before: { bg: "accent", inset: [-6, -6, -6, -6], blur: 14, radius: 999 } }, only: BUTTONS }),
  P("ripple-ring", "button", "حلقة بتتوسع|A ring spreads out|טבעת מתרחבת", K("loop", { after: [{ at: 0, scale: 1, opacity: 0.8 }, { at: 100, scale: 1.6, opacity: 0 }] }, { duration: 1.6, ease: "smooth" }), { layers: { after: { border: { width: 2, color: "accent" }, radius: 999 } }, only: BUTTONS }),
  P("press-in", "button", "بينضغط بالكبس|Presses in on click|נלחץ בלחיצה", K("click", { self: [{ at: 0, scale: 1, y: 0 }, { at: 40, scale: 0.94, y: 2 }, { at: 100, scale: 1, y: 0 }] }, { duration: 0.35, ease: "soft" }), { only: BUTTONS }),
  P("text-nudge", "button", "الكلام بيزحط لقدّام|The words nudge forward|המילים זזות קדימה", K("hover", { inner: [{ at: 0, x: 0 }, { at: 100, x: 6 }] }, { duration: 0.3 }), { only: WORDY }),
  // Words.
  P("text-rise-reveal", "words", "الكلام بيطلع من تحت قناع|Words rise from behind a mask|מילים עולות מאחורי מסכה", K("view", { inner: [{ at: 0, yp: 110 }, { at: 100, yp: 0 }] }, { duration: 0.9, ease: "strong" }), { overflow: "clip", only: WORDY }),
  P("marker", "words", "تظليل بالقلم|Highlighter stroke|סימון במרקר", K("view", { before: [{ at: 0, sx: 0 }, { at: 100, sx: 1 }] }, { duration: 0.8, origin: "start" }), { layers: { before: { bg: "accent-soft", at: "bottom", h: 14, inset: [0, -4, 2, -4] } }, only: WORDY }),
  P("strike", "words", "خط بيقطع الكلام|A line strikes through|קו חוצה את המילים", K("view", { after: [{ at: 0, sx: 0 }, { at: 100, sx: 1 }] }, { duration: 0.6, origin: "start" }), { layers: { after: { bg: "accent", at: "center", h: 3, front: true } }, only: WORDY }),
  P("words-wave", "words", "الكلام بيتموّج|The words sway|המילים מתנדנדות", K("loop", { inner: [{ at: 0, skewX: 0, y: 0 }, { at: 25, skewX: 6, y: -3 }, { at: 75, skewX: -6, y: 3 }, { at: 100, skewX: 0, y: 0 }] }, { duration: 2.4, ease: "soft" }), { only: WORDY }),
  P("type-colour", "words", "لون الكلام بيتغيّر|The words change colour|צבע המילים משתנה", K("hover", { self: [{ at: 0, color: "text" }, { at: 100, color: "accent" }] }, { duration: 0.4 }), { only: WORDY }),
  // Pictures.
  P("ken-burns", "picture", "تقريب سينمائي بطيء|Slow cinematic zoom|זום קולנועי איטי", K("loop", { inner: [{ at: 0, scale: 1, x: 0 }, { at: 100, scale: 1.15, x: -24 }] }, { duration: 12, ease: "linear", yoyo: true }), { only: PICTURES }),
  P("zoom-hover", "picture", "بتقرّب مع الماوس|Zooms in on hover|מתקרב בריחוף", K("hover", { inner: [{ at: 0, scale: 1 }, { at: 100, scale: 1.12 }] }, { duration: 0.6 }), { only: PICTURES }),
  P("curtain-reveal", "picture", "ستارة بتكشف الصورة|A curtain reveals the picture|וילון חושף את התמונה", K("view", { before: [{ at: 0, xp: 0 }, { at: 100, xp: 101 }], inner: [{ at: 0, scale: 1.3 }, { at: 100, scale: 1 }] }, { duration: 1.1, ease: "strong" }), { layers: { before: { bg: "accent", front: true } }, only: PICTURES }),
  P("depth-scroll", "picture", "عمق مع التمرير|Depth as you scroll|עומק בגלילה", K("scroll", { inner: [{ at: 0, yp: -8, scale: 1.18 }, { at: 100, yp: 8, scale: 1.18 }] }, { start: 100, end: 0, scrub: 0.4 }), { only: PICTURES }),
  P("colour-in", "picture", "بتتلوّن لما تبين|Colours in as it shows|נצבעת כשהיא מופיעה", K("view", { inner: [{ at: 0, bright: 0.4, blur: 6 }, { at: 100, bright: 1, blur: 0 }] }, { duration: 1.4 }), { only: PICTURES }),
  // With the scroll.
  P("scroll-turn", "scroll", "يلف لمكانه مع التمرير|Turns into place as you scroll|מסתובב למקומו בגלילה", K("scroll", { self: [{ at: 0, rz: -20, scale: 0.8, opacity: 0.3 }, { at: 100, rz: 0, scale: 1, opacity: 1 }] }, { start: 95, end: 40, scrub: 0.6 })),
  P("scroll-across", "scroll", "يقطع الشاشة مع التمرير|Crosses the screen as you scroll|חוצה את המסך בגלילה", K("scroll", { self: [{ at: 0, xp: -60 }, { at: 100, xp: 60 }] }, { start: 100, end: 0, scrub: 0.5 })),
  P("scroll-reveal", "scroll", "بينكشف مع التمرير|Uncovers as you scroll|נחשף בגלילה", K("scroll", { self: [{ at: 0, clip: [0, 100, 0, 0] }, { at: 100, clip: [0, 0, 0, 0] }] }, { start: 90, end: 40, scrub: 0.4 })),
  P("scroll-grow", "scroll", "يكبر لملء الشاشة|Grows to fill the screen|גדל למלא את המסך", K("scroll", { self: [{ at: 0, scale: 0.7, radius: 40 }, { at: 100, scale: 1, radius: 0 }] }, { start: 100, end: 30, scrub: 0.5 })),
  P("scene-fly", "scroll", "يطير بالمشهد ويروح|Flies through its scene|עף דרך הסצנה", K("scene", { self: [{ at: 0, x: -300, rz: -25, opacity: 0 }, { at: 30, x: 0, rz: 0, opacity: 1 }, { at: 70, x: 0, rz: 0, opacity: 1 }, { at: 100, x: 300, rz: 25, opacity: 0 }] }, { duration: 1 })),
  // Boxes.
  P("card-lift", "box", "بطاقة بترتفع بظل|A card lifts|כרטיס מתרומם", K("hover", { self: [{ at: 0, y: 0, scale: 1 }, { at: 100, y: -10, scale: 1.02 }], before: [{ at: 0, opacity: 0 }, { at: 100, opacity: 1 }] }, { duration: 0.4 }), { layers: { before: { bg: "black", opacity: 0.18, blur: 24, inset: [16, 10, -14, 10], radius: 24 } }, only: new Set(["stack", "cell", "grid", "section", "image"]) }),
  P("corner-glow", "box", "ضو بالزاوية|Corner glow|זוהר בפינה", K("hover", { before: [{ at: 0, opacity: 0, scale: 0.6 }, { at: 100, opacity: 0.6, scale: 1 }] }, { duration: 0.6 }), { layers: { before: { bg: "accent", to: "transparent", radial: true, at: "center", w: 420, h: 420, radius: 999 } }, overflow: "hidden", only: new Set(["stack", "cell", "grid", "section"]) }),
];
export const PRESET_GROUPS: Array<[KeyPreset["group"], () => string]> = [
  ["self", () => say("العنصر كله|The whole element|הרכיב כולו")],
  ["button", () => say("أزرار وصناديق بطبقات|Buttons and boxes with layers|כפתורים וקופסאות עם שכבות")],
  ["words", () => say("الكلام|Words|מילים")],
  ["picture", () => say("الصور والفيديو|Pictures and video|תמונות ווידאו")],
  ["scroll", () => say("مع التمرير والمشهد|With the scroll and scene|עם הגלילה והסצנה")],
  ["box", () => say("بطاقات|Cards|כרטיסים")],
];
export const presetsFor = (type: string) => KEY_PRESETS.filter((p) => (!p.only || p.only.has(type)) && Object.keys(p.keys.parts).every((part) => partsFor(type).includes(part as KeyPart)));

/** The changes that put a ready animation on: its keyframes, its layers and its overflow, in one step. */
export function presetOps(n: PageTreeNode, p: KeyPreset): PageDraftOp[] {
  const ops: PageDraftOp[] = [keysOp(n, p.keys)];
  if (p.layers) {
    // A solid button is already the accent colour: its fill comes in the text colour so it shows.
    const solid = n.type === "button" && (n.props?.variant ?? "solid") === "solid";
    const layers = clean(p.layers);
    for (const l of Object.values(layers)) if (solid && l?.bg === "accent") l.bg = "text";
    ops.push(layersOp(n, { ...(layersOf(n) ?? {}), ...layers }));
  }
  if (p.overflow) ops.push(styleOp(n, "base", { overflow: p.overflow }));
  return ops;
}
