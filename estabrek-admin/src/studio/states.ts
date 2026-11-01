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

/** Ready looks for the mouse over an element (one click fills the hover state), in groups. */
export type StatePreset = { key: string; label: () => string; look: Look; for?: string[]; group?: string };
const PICTURES = ["image", "video", "slider", "svg", "product360"];
const WORDS = ["heading", "text", "button"];
export const PRESET_GROUPS: Array<[string, () => string]> = [
  ["move", () => tr("حركة", "Move")],
  ["shadow", () => tr("ظلال", "Shadows")],
  ["colour", () => tr("ألوان", "Colours")],
  ["frame", () => tr("إطار وزوايا", "Frame and corners")],
  ["glow", () => tr("توهّج", "Glow")],
  ["picture", () => tr("صور", "Pictures")],
  ["words", () => tr("كلام", "Words")],
  ["3d", () => tr("ثلاثي الأبعاد", "3D")],
];
export const HOVER_PRESETS: StatePreset[] = [
  // Move
  { key: "lift", group: "move", label: () => tr("بيرتفع", "Lifts"), look: { moveY: -6, shadow: "lg" } },
  { key: "lift-more", group: "move", label: () => tr("بيرتفع كتير", "Lifts high"), look: { moveY: -12, shadow: "lg" } },
  { key: "grow", group: "move", label: () => tr("بيكبر شوي", "Grows a little"), look: { scale: 1.04 } },
  { key: "grow-more", group: "move", label: () => tr("بيكبر", "Grows"), look: { scale: 1.08 } },
  { key: "shrink", group: "move", label: () => tr("بيصغر شوي", "Shrinks a little"), look: { scale: 0.97 } },
  { key: "tilt", group: "move", label: () => tr("بيميل", "Tilts"), look: { rotateZ: -2, scale: 1.02 } },
  { key: "tilt-end", group: "move", label: () => tr("بيميل للجهة التانية", "Tilts the other way"), look: { rotateZ: 2, scale: 1.02 } },
  { key: "slide", group: "move", label: () => tr("بيزحط شوي", "Slides a little"), look: { moveX: 6 } },
  { key: "sink", group: "move", label: () => tr("بينزل شوي", "Sinks a little"), look: { moveY: 4, shadow: "sm" } },
  { key: "float", group: "move", label: () => tr("بيطفو", "Floats up"), look: { moveY: -8, scale: 1.02, shade: { x: 0, y: 22, blur: 40, color: "#00000026" } } },
  // Shadows
  { key: "shadow-sm", group: "shadow", label: () => tr("ظل خفيف", "Light shadow"), look: { shadow: "sm" } },
  { key: "shadow-md", group: "shadow", label: () => tr("ظل وسط", "Medium shadow"), look: { shadow: "md" } },
  { key: "shadow-lg", group: "shadow", label: () => tr("ظل قوي", "Strong shadow"), look: { shadow: "lg" } },
  { key: "shade-soft", group: "shadow", label: () => tr("ظل ناعم طويل", "Long soft shadow"), look: { shade: { x: 0, y: 24, blur: 48, color: "#00000029" } } },
  { key: "shade-accent", group: "shadow", label: () => tr("ظل بلون المتجر", "Shadow in the store colour"), look: { shade: { x: 0, y: 16, blur: 36, color: "accent-soft" } } },
  { key: "shade-hard", group: "shadow", label: () => tr("ظل حاد", "Hard shadow"), look: { shade: { x: 6, y: 6, blur: 0, color: "text" }, moveX: -3, moveY: -3 } },
  { key: "no-shadow", group: "shadow", label: () => tr("بيروح الظل", "Shadow goes"), look: { shadow: "none" } },
  // Colours
  { key: "accent", group: "colour", label: () => tr("بياخد لون المتجر", "Takes the store colour"), look: { color: "accent" } },
  { key: "fill", group: "colour", label: () => tr("بيتعبّى بلون", "Fills with colour"), look: { bg: "accent", color: "accent-contrast" } },
  { key: "soft-fill", group: "colour", label: () => tr("خلفية فاتحة", "A soft background"), look: { bg: "accent-soft" } },
  { key: "dark", group: "colour", label: () => tr("بيغمق", "Turns dark"), look: { bg: "text", color: "bg" } },
  { key: "gradient", group: "colour", label: () => tr("خلفية متدرّجة", "A gradient background"), look: { gradient: { color: "accent", to: "accent-soft", angle: 135 }, color: "accent-contrast" } },
  { key: "glass", group: "colour", label: () => tr("زجاج", "Glass"), look: { backdrop: { blur: 12 }, bg: "#ffffff33" } },
  { key: "soft", group: "colour", label: () => tr("بيخفّ", "Fades a little"), look: { opacity: 0.8 } },
  { key: "muted", group: "colour", label: () => tr("لون هادي", "A quiet colour"), look: { color: "muted" } },
  // Frame and corners
  { key: "ring", group: "frame", label: () => tr("إطار بلون المتجر", "A frame in the store colour"), look: { border: { width: 2, color: "accent" } } },
  { key: "ring-dashed", group: "frame", label: () => tr("إطار متقطّع", "A dashed frame"), look: { border: { width: 2, color: "accent", style: "dashed" } } },
  { key: "ring-soft", group: "frame", label: () => tr("إطار ناعم", "A soft frame"), look: { border: { width: 1, color: "border" } } },
  { key: "rounder", group: "frame", label: () => tr("زوايا أنعم", "Rounder corners"), look: { radius: 24 } },
  { key: "pill", group: "frame", label: () => tr("كبسولة", "Pill"), look: { radius: 999 } },
  { key: "square", group: "frame", label: () => tr("زوايا حادة", "Square corners"), look: { radius: 0 } },
  // Glow
  { key: "glow", group: "glow", label: () => tr("بيتوهّج", "Glows"), look: { glow: { color: "accent", size: 24 } } },
  { key: "glow-soft", group: "glow", label: () => tr("توهّج ناعم", "Soft glow"), look: { glow: { color: "accent-soft", size: 36 } } },
  { key: "glow-strong", group: "glow", label: () => tr("توهّج قوي", "Strong glow"), look: { glow: { color: "accent", size: 56 } } },
  { key: "glow-white", group: "glow", label: () => tr("توهّج أبيض", "White glow"), look: { glow: { color: "white", size: 30 } } },
  { key: "neon", group: "glow", label: () => tr("نيون", "Neon"), look: { shadows: [{ x: 0, y: 0, blur: 6, color: "accent" }, { x: 0, y: 0, blur: 18, color: "accent" }] }, for: WORDS },
  // Pictures
  { key: "colour", group: "picture", label: () => tr("من أبيض وأسود للألوان", "From grey to colour"), look: { filters: { gray: 0 } }, for: PICTURES },
  { key: "brighter", group: "picture", label: () => tr("بيضوّي", "Brightens"), look: { filters: { bright: 1.12 } }, for: PICTURES },
  { key: "darker", group: "picture", label: () => tr("بيعتّم", "Darkens"), look: { filters: { bright: 0.85 } }, for: PICTURES },
  { key: "vivid", group: "picture", label: () => tr("ألوان أقوى", "Brighter colours"), look: { filters: { saturate: 1.5 } }, for: PICTURES },
  { key: "contrast", group: "picture", label: () => tr("تباين أقوى", "More contrast"), look: { filters: { contrast: 1.25 } }, for: PICTURES },
  { key: "hue", group: "picture", label: () => tr("ألوان مقلوبة شوي", "Shifted colours"), look: { filters: { hue: 40 } }, for: PICTURES },
  { key: "sharp", group: "picture", label: () => tr("من ضباب لوضوح", "Out of a blur"), look: { filters: { blur: 0 } }, for: PICTURES },
  { key: "veil", group: "picture", label: () => tr("طبقة غامقة", "A dark veil"), look: { overlay: { color: "#000000", opacity: 0.35 } }, for: PICTURES },
  { key: "tint", group: "picture", label: () => tr("طبقة بلون المتجر", "A store-colour veil"), look: { overlay: { color: "accent", opacity: 0.35, blend: "multiply" } }, for: PICTURES },
  // Words
  { key: "underline", group: "words", label: () => tr("خط تحته", "Underline"), look: { decoration: { line: "underline", width: 2, offset: 6 } }, for: WORDS },
  { key: "wavy", group: "words", label: () => tr("خط متموّج", "Wavy line"), look: { decoration: { line: "underline", style: "wavy", color: "accent", width: 2, offset: 6 } }, for: WORDS },
  { key: "marker", group: "words", label: () => tr("قلم تظليل", "Highlighter"), look: { decoration: { line: "underline", color: "accent-soft", width: 12, offset: -8 } }, for: WORDS },
  { key: "spaced", group: "words", label: () => tr("أحرف متباعدة", "Letters spread"), look: { letterSpacing: 2 }, for: WORDS },
  { key: "bold", group: "words", label: () => tr("بيغمق الخط", "Bolder"), look: { weight: 700 }, for: WORDS },
  { key: "outline", group: "words", label: () => tr("مفرّغ", "Outline"), look: { stroke: { width: 1.5, color: "accent" }, fill: { color: "transparent", to: "transparent" } }, for: WORDS },
  { key: "paint", group: "words", label: () => tr("تدرّج بالكلام", "Gradient words"), look: { fill: { color: "accent", to: "#f59e0b", angle: 90 } }, for: WORDS },
  // 3D
  { key: "lean-back", group: "3d", label: () => tr("بيميل لورا", "Leans back"), look: { rotateX: 14, moveY: -4 } },
  { key: "turn-side", group: "3d", label: () => tr("بيلف عالجنب", "Turns sideways"), look: { rotateY: -14 } },
  { key: "turn-3d", group: "3d", label: () => tr("بيلف ثلاثي", "Turns in 3D"), look: { rotateX: 8, rotateY: -8, scale: 1.03, shadow: "lg" } },
  { key: "tip", group: "3d", label: () => tr("بيتشقلب شوي", "Tips forward"), look: { rotateX: -10, scale: 1.02 } },
  { key: "card-up", group: "3d", label: () => tr("بطاقة بتطلع", "A card rising"), look: { rotateX: 6, moveY: -10, shade: { x: 0, y: 30, blur: 50, color: "#00000030" } } },
];
/** Ready looks for the keyboard's focus (always clear) and a press. */
export const FOCUS_PRESETS: StatePreset[] = [
  { key: "ring", label: () => tr("إطار واضح", "Clear ring"), look: { border: { width: 2, color: "accent" } } },
  { key: "ring-thick", label: () => tr("إطار عريض", "Thick ring"), look: { border: { width: 3, color: "accent" } } },
  { key: "ring-dashed", label: () => tr("إطار متقطّع", "Dashed ring"), look: { border: { width: 2, color: "accent", style: "dashed" } } },
  { key: "ring-dark", label: () => tr("إطار غامق", "Dark ring"), look: { border: { width: 2, color: "text" } } },
  { key: "halo", label: () => tr("هالة", "Halo"), look: { glow: { color: "accent", size: 16 } } },
  { key: "halo-soft", label: () => tr("هالة ناعمة", "Soft halo"), look: { glow: { color: "accent-soft", size: 28 } } },
  { key: "soft-fill", label: () => tr("خلفية فاتحة", "A soft background"), look: { bg: "accent-soft" } },
  { key: "underline", label: () => tr("خط تحته", "Underline"), look: { decoration: { line: "underline", width: 2, offset: 6 } }, for: WORDS },
];
export const PRESS_PRESETS: StatePreset[] = [
  { key: "push", label: () => tr("بينضغط لجوّا", "Pushes in"), look: { scale: 0.96 } },
  { key: "push-more", label: () => tr("بينضغط كتير", "Pushes in deep"), look: { scale: 0.92 } },
  { key: "darker", label: () => tr("بيغمق", "Darkens"), look: { filters: { bright: 0.9 } } },
  { key: "flash", label: () => tr("بيضوّي", "Flashes"), look: { filters: { bright: 1.15 } } },
  { key: "down", label: () => tr("بينزل", "Moves down"), look: { moveY: 2, shadow: "sm" } },
  { key: "flat", label: () => tr("بيروح ظله", "Goes flat"), look: { moveY: 2, shadow: "none" } },
];
export const presetsOf = (state: StateName, type: string) =>
  (state === "hover" ? HOVER_PRESETS : state === "focused" ? FOCUS_PRESETS : PRESS_PRESETS).filter((p) => !p.for || p.for.includes(type));

/** For a black-and-white-until-hover or blurred-until-hover picture: the normal look needs the grey or the blur too. */
export const NEEDS_NORMAL: Record<string, Look> = { colour: { filters: { gray: 1 } }, sharp: { filters: { blur: 6 } } };
