/**
 * An element's looks for the mouse over it, the keyboard's focus and a press (the
 * backend's StateStyle, kept inside each screen's look as hover / focused / pressed).
 * The editor shows a state as the element itself with only that state's values, so the
 * same style panels edit it; their changes are put back inside the screen's look here.
 */
import type { PageDraftOp, PageTreeNode, TreeScreen } from "../api/pages.api";
import { tr } from "../lib/words";

export const STATES = ["hover", "focused", "pressed"] as const;
export type StateName = (typeof STATES)[number];
/** Normal = the element's own look. */
export type StateChoice = "normal" | StateName;

export const STATE_LABEL: Record<StateChoice, () => string> = {
  normal: () => tr("عادي", "Normal"),
  hover: () => tr("الماوس فوقه", "Mouse over"),
  focused: () => tr("عليه التركيز", "Focused"),
  pressed: () => tr("مضغوط", "Pressed"),
};

/** What a state may change (the shop's css.ts STATE_KEYS): never the size or place. */
export const STATE_KEYS = new Set([
  "bg", "gradient", "backdrop", "color", "radius", "border", "shadow", "opacity", "weight", "letterSpacing", "wordSpacing", "decoration",
  "stroke", "fill", "shadows", "filters", "rotateX", "rotateY", "rotateZ", "scale", "moveX", "moveY", "overlay", "shade", "glow",
]);

type Look = Record<string, unknown>;
const SCREENS: TreeScreen[] = ["base", "tablet", "mobile"];
const isObj = (v: unknown): v is Look => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/** The element as a state shows it: each screen's look is that state's values only. */
export function stateView(node: PageTreeNode, state: StateName): PageTreeNode {
  const style = (node.style ?? {}) as Record<string, Look | undefined>;
  const out: Record<string, Look> = {};
  for (const s of SCREENS) {
    const v = style[s]?.[state];
    if (isObj(v) && Object.keys(v).length) out[s] = v;
  }
  return { ...node, style: out };
}

/**
 * The panels' changes to a state view, as changes to the element: each screen's new
 * state values go back inside that screen's look (keys a state can't take are dropped).
 */
export function stateOps(node: PageTreeNode, state: StateName, ops: PageDraftOp[]): PageDraftOp[] {
  const style = { ...((node.style ?? {}) as Record<string, Look | undefined>) };
  return ops.map((o) => {
    if (o.op !== "setStyle" || o.nodeId !== node.id) return o;
    const own: Look = { ...(style[o.screen] ?? {}) };
    const kept = o.style ? Object.fromEntries(Object.entries(o.style).filter(([k]) => STATE_KEYS.has(k))) : {};
    if (Object.keys(kept).length) own[state] = kept;
    else delete own[state];
    style[o.screen] = own;
    return { ...o, style: Object.keys(own).length ? own : null };
  });
}

/** The states the element has a look for, on any screen. */
export function statesOf(node: PageTreeNode): StateName[] {
  const style = (node.style ?? {}) as Record<string, Look | undefined>;
  return STATES.filter((st) => SCREENS.some((s) => isObj(style[s]?.[st]) && Object.keys(style[s]![st] as Look).length > 0));
}

/** Ready looks for the mouse over an element (one click fills the hover state). */
export type StatePreset = { key: string; label: () => string; look: Look; for?: string[] };
export const HOVER_PRESETS: StatePreset[] = [
  { key: "lift", label: () => tr("بيرتفع", "Lifts"), look: { moveY: -6, shadow: "lg" } },
  { key: "grow", label: () => tr("بيكبر شوي", "Grows a little"), look: { scale: 1.04 } },
  { key: "shrink", label: () => tr("بيصغر شوي", "Shrinks a little"), look: { scale: 0.97 } },
  { key: "tilt", label: () => tr("بيميل", "Tilts"), look: { rotateZ: -2, scale: 1.02 } },
  { key: "accent", label: () => tr("بياخد لون المتجر", "Takes the store colour"), look: { color: "accent" } },
  { key: "fill", label: () => tr("بيتعبّى بلون", "Fills with colour"), look: { bg: "accent", color: "accent-contrast" } },
  { key: "glow", label: () => tr("بيتوهّج", "Glows"), look: { glow: { color: "accent", size: 24 } } },
  { key: "underline", label: () => tr("خط تحته", "Underline"), look: { decoration: { line: "underline", width: 2, offset: 6 } }, for: ["heading", "text", "button"] },
  { key: "colour", label: () => tr("من أبيض وأسود للألوان", "From grey to colour"), look: { filters: { gray: 0 } }, for: ["image", "video", "slider"] },
  { key: "brighter", label: () => tr("بيضوّي", "Brightens"), look: { filters: { bright: 1.12 } }, for: ["image", "video", "slider", "svg"] },
  { key: "soft", label: () => tr("بيخفّ", "Fades a little"), look: { opacity: 0.8 } },
];
/** Ready looks for the keyboard's focus (a clear ring) and a press. */
export const FOCUS_PRESETS: StatePreset[] = [
  { key: "ring", label: () => tr("إطار واضح", "Clear ring"), look: { border: { width: 2, color: "accent" } } },
  { key: "halo", label: () => tr("هالة", "Halo"), look: { glow: { color: "accent", size: 16 } } },
  { key: "underline", label: () => tr("خط تحته", "Underline"), look: { decoration: { line: "underline", width: 2, offset: 6 } }, for: ["heading", "text", "button"] },
];
export const PRESS_PRESETS: StatePreset[] = [
  { key: "push", label: () => tr("بينضغط لجوّا", "Pushes in"), look: { scale: 0.96 } },
  { key: "darker", label: () => tr("بيغمق", "Darkens"), look: { filters: { bright: 0.9 } } },
  { key: "down", label: () => tr("بينزل", "Moves down"), look: { moveY: 2, shadow: "sm" } },
];
export const presetsOf = (state: StateName, type: string) =>
  (state === "hover" ? HOVER_PRESETS : state === "focused" ? FOCUS_PRESETS : PRESS_PRESETS).filter((p) => !p.for || p.for.includes(type));

/** For a black-and-white-until-hover picture: the normal look needs the grey too. */
export const NEEDS_NORMAL: Record<string, Look> = { colour: { filters: { gray: 1 } } };
