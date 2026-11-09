/**
 * An element's look beyond its box, in the new editor (track B, phase 3): turns and
 * moves, a colour layer, its own shadow and glow, a free place over its container —
 * kept per screen — and how it moves (the shop's pageTree/TreeMotion plays it with
 * GSAP). Here: the ready-made motions, every kind's name, the values a slider shows
 * live in the frame before it's saved, and where a screen takes its look from.
 */
import type { PageDraftOp, PageTreeNode, TreeScreen } from "../api/pages.api";
import { tr } from "../lib/words";

export type Look = Record<string, unknown>;
export type MotionKeys = { rx?: number; ry?: number; rz?: number; x?: number; y?: number; scale?: number; opacity?: number };
export type Motion = {
  engine?: "gsap" | "anime";
  enter?: { kind: string; duration?: number; delay?: number; ease?: string; distance?: number; stagger?: number };
  scroll?: { kind: "parallax" | "keys" | "words" | "pin" | "sideways"; speed?: number; from?: MotionKeys; to?: MotionKeys; start?: number; end?: number; ease?: string; length?: number };
  /** Its own keyframes, 0–100 %, for itself and its pieces (keyframes.ts). */
  keys?: Record<string, unknown>;
  /** When it shows inside a scroll scene (scrollScene.ts). */
  cue?: { from: number; to: number; in?: string; out?: string; soft?: number };
  loop?: { kind: string; duration?: number; amount?: number };
  hover?: { kind: string; amount?: number; color?: string };
  fx?: { kind: string; speed?: number; color?: string; to?: string };
  phone?: "same" | "lite" | "off";
};

export const lookOf = (n: PageTreeNode, screen: TreeScreen): Look => (((n.style ?? {}) as Record<string, Look | undefined>)[screen] ?? {});
const CHAIN: Record<TreeScreen, TreeScreen[]> = { base: ["base"], tablet: ["tablet", "base"], mobile: ["mobile", "tablet", "base"] };
/** What a screen shows for one key: its own value, else the bigger screens' (phone → tablet → computer). */
export function shownLook(n: PageTreeNode, screen: TreeScreen, key: string): unknown {
  for (const s of CHAIN[screen]) {
    const v = lookOf(n, s)[key];
    if (v !== undefined) return v;
  }
  return undefined;
}
/** Placed freely over its container on this screen. */
export const placedOn = (n: PageTreeNode, screen: TreeScreen) => {
  const v = shownLook(n, screen, "layer");
  return v && typeof v === "object" ? (v as { x: number; y: number; anchor?: string }) : null;
};

/** The variable a look's slider changes live in the frame (the shop's pageTree/tree.ts PREVIEW_VARS). */
export const PREVIEW: Record<string, (v: number) => [string, string | number]> = {
  rotateX: (v) => ["--pt-rx", `${v}deg`],
  rotateY: (v) => ["--pt-ry", `${v}deg`],
  rotateZ: (v) => ["--pt-rz", `${v}deg`],
  perspective: (v) => ["--pt-p", `${v}px`],
  scale: (v) => ["--pt-s", String(v)],
  moveX: (v) => ["--pt-x", `${v}px`],
  moveY: (v) => ["--pt-y", `${v}px`],
  opacity: (v) => ["opacity", v],
  overlayOpacity: (v) => ["--pt-ovo", String(v)],
};
export const previewOf = (key: string, v: number): Record<string, string | number> => {
  const p = PREVIEW[key];
  if (!p) return {};
  const [k, val] = p(v);
  return { [k]: val };
};

/** The anchor of a freely placed element, as shares of its box along the line and down. */
export const ANCHOR_AT: Record<string, [number, number]> = {
  "top-start": [0, 0], top: [50, 0], "top-end": [100, 0],
  start: [0, 50], center: [50, 50], end: [100, 50],
  "bottom-start": [0, 100], bottom: [50, 100], "bottom-end": [100, 100],
};
type Box = { x: number; y: number; w: number; h: number };
/**
 * Where an element dragged to `box` sits in `holder` (its container), as the x/y %
 * the shop draws it at: its anchor's distance from the line's start and the top.
 */
export function placeFor(box: Box, holder: Box, anchor: string, rtl: boolean): { x: number; y: number } {
  const [ax, ay] = ANCHOR_AT[anchor] ?? ANCHOR_AT.center;
  const px = rtl ? box.x + box.w - (ax / 100) * box.w : box.x + (ax / 100) * box.w;
  const py = box.y + (ay / 100) * box.h;
  const x = ((rtl ? holder.x + holder.w - px : px - holder.x) / holder.w) * 100;
  const y = ((py - holder.y) / holder.h) * 100;
  const round = (v: number) => Math.round(Math.max(0, Math.min(100, v)) * 10) / 10;
  return { x: round(x), y: round(y) };
}

/* ------------------------------------------------------------------ motion */

export const ENTER_LABEL: Record<string, () => string> = {
  fade: () => tr("يظهر بهدوء", "Fades in"),
  up: () => tr("من تحت", "From below"),
  down: () => tr("من فوق", "From above"),
  start: () => tr("من أول السطر", "From the line start"),
  end: () => tr("من آخر السطر", "From the line end"),
  "zoom-in": () => tr("بيكبر لمكانه", "Grows into place"),
  "zoom-out": () => tr("بيصغر لمكانه", "Shrinks into place"),
  blur: () => tr("من ضباب لوضوح", "Out of a blur"),
  "flip-x": () => tr("قلبة لفوق", "Flips up"),
  "flip-y": () => tr("قلبة عالجنب", "Flips sideways"),
  turn: () => tr("بيلف شوي لمكانه", "Turns into place"),
  "wipe-start": () => tr("مسح من أول السطر", "Wipe from the line start"),
  "wipe-end": () => tr("مسح من آخر السطر", "Wipe from the line end"),
  "wipe-up": () => tr("مسح من تحت", "Wipe from below"),
  "wipe-down": () => tr("مسح من فوق", "Wipe from above"),
  "wipe-center": () => tr("مسح من النص", "Wipe from the middle"),
  circle: () => tr("دائرة بتكبر", "A growing circle"),
  words: () => tr("كلمة كلمة", "Word by word"),
  draw: () => tr("بترسم حالها", "Draws itself"),
  letters: () => tr("حرف حرف (العربي كلمة كلمة)", "Letter by letter (Arabic word by word)"),
  lines: () => tr("سطر سطر من تحت قناع", "Line by line from under a mask"),
  scramble: () => tr("حروف ملخبطة بتترتّب", "Scrambled letters falling into place"),
  typewriter: () => tr("آلة كاتبة", "Typewriter"),
  count: () => tr("الرقم بيعدّ لحاله", "Its number counts up"),
};
/** Coming in that only words have. */
export const WORDS_ONLY = new Set(["words", "letters", "lines", "scramble", "typewriter", "count"]);
export const LOOP_LABEL: Record<string, () => string> = {
  float: () => tr("يطفو", "Floats"),
  pulse: () => tr("ينبض", "Pulses"),
  spin: () => tr("يلف", "Spins"),
  wobble: () => tr("يهتز", "Wobbles"),
  swing: () => tr("يتمرجح", "Swings"),
  breathe: () => tr("يتنفس", "Breathes"),
  bounce: () => tr("ينط", "Bounces"),
  morph: () => tr("بتتحوّل لشكلها التاني وبترجع", "Turns into its second shape and back"),
  dash: () => tr("خطوطها ماشية", "Its lines run"),
  type: () => tr("بينكتب وبينمسح", "Types and erases"),
};
export const HOVER_LABEL: Record<string, () => string> = {
  lift: () => tr("يرتفع", "Lifts"),
  grow: () => tr("يكبر", "Grows"),
  tilt: () => tr("يميل مع الماوس", "Tilts with the mouse"),
  magnetic: () => tr("مغناطيس", "Magnetic"),
  glow: () => tr("يتوهج", "Glows"),
  zoom: () => tr("زوم للصورة", "Zooms the picture"),
  bounce: () => tr("ينط مرة", "Bounces once"),
  shake: () => tr("يهتز مرة", "Shakes once"),
  pulse: () => tr("ينبض مرة", "Pulses once"),
  wiggle: () => tr("يتلوّى", "Wiggles"),
  jello: () => tr("متل الجيلي", "Like jelly"),
  rubber: () => tr("متل المطاط", "Like rubber"),
  heartbeat: () => tr("دقة قلب", "Heartbeat"),
  swing: () => tr("يتمرجح مرة", "Swings once"),
  flip: () => tr("ينقلب لفة", "Flips round"),
  spin: () => tr("يلف لفة", "Spins round"),
  pop: () => tr("يفقع", "Pops"),
  spotlight: () => tr("ضو بيلحق الماوس", "A light that follows the mouse"),
  ripple: () => tr("موجة مكان الضغط", "A ripple where it's pressed"),
  spring: () => tr("زنبرك بيلحق الماوس", "Springs after the mouse"),
  jelly: () => tr("بيتهز متل الزنبرك", "Wobbles on a spring"),
};
/** The mouse effects that have a strength, and those that take a colour. */
export const HOVER_STRENGTH = new Set(["lift", "grow", "tilt", "magnetic", "bounce", "shake", "pulse", "wiggle", "jello", "rubber", "heartbeat", "swing", "pop", "spotlight", "spring", "jelly"]);
export const HOVER_COLOUR = new Set(["spotlight", "ripple"]);
export const FX_LABEL: Record<string, () => string> = {
  shine: () => tr("لمعة ماشية", "Running shine"),
  gradient: () => tr("ألوان ماشية", "Moving colours"),
  grain: () => tr("حبيبات فيلم", "Film grain"),
};
export const EASE_LABEL: Record<string, () => string> = {
  smooth: () => tr("ناعمة", "Smooth"),
  soft: () => tr("هادية", "Gentle"),
  strong: () => tr("قوية بالأول", "Strong start"),
  back: () => tr("بتعدّي وبترجع", "Overshoots"),
  elastic: () => tr("مطاطية", "Elastic"),
  bounce: () => tr("بتنط", "Bouncy"),
  linear: () => tr("ثابتة", "Even"),
};
/** Words come in word by word only where there are words. */
export const WORDY = new Set(["heading", "text", "button"]);
/** What it holds comes in one after another only where it holds things. */
export const HOLDS = new Set(["section", "grid", "stack", "columns", "cell"]);

export type MotionPreset = { key: string; label: () => string; motion: Motion; only?: ReadonlySet<string>; fits?: (n: PageTreeNode) => boolean };
const SVG_ONLY = new Set(["svg"]);
type ArtLike = { nodes?: Array<{ a?: Record<string, string>; c?: unknown[] }>; morph?: string };
/** A drawing that has lines (it can draw itself, its lines can run). */
export function drawingHasLines(n: PageTreeNode): boolean {
  const walk = (list: unknown): boolean => Array.isArray(list) && list.some((x: { a?: Record<string, string>; c?: unknown[] }) => (x?.a?.stroke && x.a.stroke !== "none") || walk(x?.c));
  return n.type === "svg" && walk((n.props?.art as ArtLike | undefined)?.nodes);
}
/** Words with a number in them (to count up). */
export const hasNumber = (n: PageTreeNode) => Object.values(((n.props?.text ?? n.props?.label) ?? {}) as Record<string, unknown>).some((w) => typeof w === "string" && /[\d٠-٩]/.test(w));
/** A drawing with a second shape to turn into. */
export const drawingMorphs = (n: PageTreeNode) => n.type === "svg" && typeof (n.props?.art as ArtLike | undefined)?.morph === "string";
export const MOTION_PRESETS: MotionPreset[] = [
  { key: "tilt-scroll", label: () => tr("مايل وبيتعدّل مع السكرول", "Tilted, straightens with the scroll"), motion: { scroll: { kind: "keys", from: { rx: 28, scale: 0.88, y: 60 }, to: { rx: 0, scale: 1, y: 0 }, start: 100, end: 35 } } },
  { key: "rise", label: () => tr("بيطلع من تحت", "Rises in"), motion: { enter: { kind: "up", duration: 0.8, ease: "strong", distance: 40 } } },
  { key: "words", label: () => tr("كلمة كلمة", "Word by word"), motion: { enter: { kind: "words", duration: 0.7, stagger: 0.06 } }, only: WORDY },
  { key: "letters", label: () => tr("حرف حرف", "Letter by letter"), motion: { enter: { kind: "letters", duration: 0.6, ease: "back" } }, only: WORDY },
  { key: "lines", label: () => tr("سطر سطر", "Line by line"), motion: { enter: { kind: "lines", duration: 0.9, ease: "strong" } }, only: WORDY },
  { key: "scramble", label: () => tr("حروف بتترتّب", "Unscrambles"), motion: { enter: { kind: "scramble", duration: 1.4 } }, only: WORDY },
  { key: "typewriter", label: () => tr("آلة كاتبة", "Typewriter"), motion: { enter: { kind: "typewriter", duration: 1.6 } }, only: WORDY },
  { key: "count", label: () => tr("الرقم بيعدّ", "Counts up"), motion: { enter: { kind: "count", duration: 2 } }, only: WORDY, fits: hasNumber },
  { key: "scroll-words", label: () => tr("الكلمات بتضوي مع السكرول", "Words light up with the scroll"), motion: { scroll: { kind: "words" } }, only: WORDY },
  { key: "typing", label: () => tr("بينكتب وبينمسح", "Types and erases"), motion: { loop: { kind: "type", duration: 2.5 } }, only: WORDY },
  { key: "words-bounce", label: () => tr("كلمات بتنط", "Bouncing words"), motion: { enter: { kind: "words", duration: 0.9, ease: "bounce", stagger: 0.08 } }, only: WORDY },
  { key: "words-elastic", label: () => tr("كلمات مطاطية", "Elastic words"), motion: { enter: { kind: "words", duration: 1.1, ease: "elastic", stagger: 0.07 } }, only: WORDY },
  { key: "words-slow", label: () => tr("كلمات بهدوء", "Slow calm words"), motion: { enter: { kind: "words", duration: 1.4, ease: "soft", stagger: 0.15 } }, only: WORDY },
  { key: "letters-drop", label: () => tr("حروف بتنزل", "Dropping letters"), motion: { enter: { kind: "letters", duration: 0.7, ease: "strong", distance: 60 } }, only: WORDY },
  { key: "letters-spring", label: () => tr("حروف بزنبرك", "Springy letters"), motion: { enter: { kind: "letters", duration: 0.8, ease: "back", stagger: 0.04 } }, only: WORDY },
  { key: "lines-soft", label: () => tr("سطور بنعومة", "Soft lines"), motion: { enter: { kind: "lines", duration: 1.2, ease: "soft" } }, only: WORDY },
  { key: "words-blur", label: () => tr("بيوضح من الضباب", "Clears from a blur"), motion: { enter: { kind: "blur", duration: 1, ease: "smooth" } }, only: WORDY },
  { key: "words-zoom", label: () => tr("بيكبر لمكانه", "Zooms into place"), motion: { enter: { kind: "zoom-in", duration: 0.8, ease: "back" } }, only: WORDY },
  { key: "typewriter-slow", label: () => tr("آلة كاتبة بطيئة", "Slow typewriter"), motion: { enter: { kind: "typewriter", duration: 3 } }, only: WORDY },
  { key: "scramble-fast", label: () => tr("حروف بتترتّب بسرعة", "Quick unscramble"), motion: { enter: { kind: "scramble", duration: 0.8 } }, only: WORDY },
  { key: "colours-moving", label: () => tr("ألوان ماشية بالكلام", "Colours moving through the words"), motion: { fx: { kind: "gradient", speed: 1 } }, only: WORDY },
  { key: "pin", label: () => tr("بيثبت والصفحة ماشية", "Holds while the page scrolls"), motion: { scroll: { kind: "pin", length: 100 } }, only: new Set(["section"]) },
  { key: "wipe", label: () => tr("بينكشف بالمسح", "Wipes in"), motion: { enter: { kind: "wipe-start", duration: 1, ease: "strong" } } },
  { key: "circle", label: () => tr("بينكشف بدائرة", "Opens in a circle"), motion: { enter: { kind: "circle", duration: 1.1, ease: "smooth" } } },
  { key: "flip", label: () => tr("بينقلب لمكانه", "Flips into place"), motion: { enter: { kind: "flip-x", duration: 0.9, ease: "back" } } },
  { key: "stagger", label: () => tr("اللي جوّاه واحد ورا التاني", "What it holds, one after another"), motion: { enter: { kind: "up", duration: 0.7, ease: "strong", stagger: 0.12 } }, only: HOLDS },
  { key: "parallax", label: () => tr("أبطأ من السكرول", "Slower than the scroll"), motion: { scroll: { kind: "parallax", speed: 0.4 } } },
  { key: "float", label: () => tr("بيطفو", "Floats"), motion: { loop: { kind: "float", duration: 4 } } },
  { key: "pulse", label: () => tr("بينبض", "Pulses"), motion: { loop: { kind: "pulse", duration: 1.6 } } },
  { key: "tilt-hover", label: () => tr("بيميل مع الماوس", "Tilts with the mouse"), motion: { hover: { kind: "tilt" } } },
  { key: "magnetic", label: () => tr("مغناطيس", "Magnetic"), motion: { hover: { kind: "magnetic" } } },
  { key: "ripple", label: () => tr("موجة لما ينضغط", "A ripple when pressed"), motion: { hover: { kind: "ripple" } }, only: new Set(["button", "cell", "image", "icon"]) },
  { key: "spotlight", label: () => tr("ضو بيلحق الماوس", "A light following the mouse"), motion: { hover: { kind: "spotlight" } }, only: HOLDS },
  { key: "jelly", label: () => tr("زنبرك", "Springy"), motion: { hover: { kind: "jelly" } } },
  { key: "heartbeat", label: () => tr("دقة قلب", "Heartbeat"), motion: { hover: { kind: "heartbeat" } } },
  { key: "shine", label: () => tr("لمعة ماشية", "Running shine"), motion: { fx: { kind: "shine", speed: 1 } } },
  { key: "draw", label: () => tr("بترسم حالها", "Draws itself"), motion: { enter: { kind: "draw", duration: 1.4, ease: "soft" } }, only: SVG_ONLY, fits: drawingHasLines },
  { key: "morph", label: () => tr("بتتحوّل وبترجع", "Morphs and back"), motion: { loop: { kind: "morph", duration: 4 } }, only: SVG_ONLY, fits: drawingMorphs },
  { key: "dash", label: () => tr("خطوطها ماشية", "Its lines run"), motion: { loop: { kind: "dash", duration: 4 } }, only: SVG_ONLY, fits: drawingHasLines },
];
/** The ready motions that suit an element (`node` also checks what a drawing has). */
export const presetsFor = (type: string, node?: PageTreeNode) => MOTION_PRESETS.filter((p) => (!p.only || p.only.has(type)) && (!p.fits || !node || p.fits(node)));
/** A preset sets its own part (coming in, scroll, loop, pointer or layer) and keeps the rest. */
export const withPreset = (m: Motion | undefined, p: MotionPreset): Motion => ({ ...(m ?? {}), ...p.motion });
/** Clicking a selected preset removes its part while leaving other motion alone. */
export function togglePreset(m: Motion | undefined, p: MotionPreset): Motion {
  if (!hasPreset(m, p)) return withPreset(m, p);
  const next = { ...m };
  for (const key of Object.keys(p.motion) as Array<keyof Motion>) delete next[key];
  return next;
}
const orderedMotion = (value: unknown): unknown => value && typeof value === "object"
  ? Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, orderedMotion(v)]))
  : value;
/** Whether the element already moves the way a preset does. */
export const hasPreset = (m: Motion | undefined, p: MotionPreset) =>
  Object.entries(p.motion).every(([k, v]) => JSON.stringify(orderedMotion((m as Record<string, unknown> | undefined)?.[k])) === JSON.stringify(orderedMotion(v)));

/** The change that sets an element's motion; a part set to undefined comes out, nothing left = no motion. */
export function motionOp(n: PageTreeNode, m: Motion | null): PageDraftOp {
  const clean = m ? (JSON.parse(JSON.stringify(m)) as Record<string, unknown>) : {};
  return { op: "setMotion", nodeId: n.id, motion: Object.keys(clean).length ? clean : null };
}
