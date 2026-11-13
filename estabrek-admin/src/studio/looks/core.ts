/**
 * The look libraries (phase 10): ready looks as data, each a set of the page's own style keys
 * (and sometimes motion), so the shop draws them with the CSS it already has. A kind of look
 * owns some keys: picking one clears those keys and sets its own, so looks of one kind replace
 * each other instead of piling up, and anything else stays. Pure (tested).
 */
import type { PageDraftOp, PageTreeNode, TreeScreen } from "../../api/pages.api";
import { tr } from "../../lib/words";
import { styleOp } from "../columns";
import { motionOp, type Motion } from "../look";

export type Style = Record<string, unknown>;
export type ReadyKind = "button" | "card" | "type" | "paint" | "frame" | "background" | "shadow" | "hover" | "entrance" | "edge";
/** A ready look: its kind, its group in the gallery, its name, what it sets; `for` = only these elements. */
export type Ready = { id: string; kind: ReadyKind; group: string; name: () => string; style?: Style; motion?: Motion; edge?: string; for?: readonly string[] };

/** What holds other things, and the blocks that draw their own content: a card or a background goes around any of them. */
const BOXES = [
  "stack", "cell", "grid", "columns", "section", "popup", "form",
  "accordion", "testimonials", "pricing", "schedule", "comparison", "team", "logos", "alert", "marquee", "tabs", "countdown",
  "search", "menu", "showcase", "products", "categories", "chart", "clock", "instrument", "filterGallery", "deck",
  "collectionList", "shop", "cartItems", "cartSummary", "cartCheckout", "productDetail",
] as const;
const WORDS = ["heading", "text", "button"] as const;
/** Pictures and clips, and what's shown in a frame like one (a drawing, a 3D model, a map, a before/after). */
const PICTURES = ["image", "video", "slider", "product360", "svg", "model3d", "lottie", "rive", "beforeAfter", "hotspots", "map"] as const;
/** What each kind of look is called, the elements it fits ("*" = any), and the style and motion keys it owns. */
export const KINDS: Record<ReadyKind, { name: () => string; types: readonly string[]; owns: readonly string[]; moves?: ReadonlyArray<keyof Motion> }> = {
  button: {
    name: () => tr("أزرار", "Buttons"), types: ["button"],
    owns: ["bg", "gradient", "mesh", "color", "radius", "border", "shadow", "shade", "glow", "backdrop", "weight", "letterSpacing", "caps", "pad", "stroke", "fill", "shadows", "decoration", "hover", "pressed", "focused", "transition"],
    moves: ["fx"],
  },
  card: { name: () => tr("بطاقات وصناديق", "Cards and boxes"), types: BOXES, owns: ["bg", "gradient", "mesh", "pattern", "color", "radius", "border", "shadow", "shade", "glow", "backdrop", "pad", "shape", "overlay", "hover", "transition"] },
  type: { name: () => tr("خطوط", "Type"), types: WORDS, owns: ["family", "font", "weight", "lineHeight", "letterSpacing", "wordSpacing", "caps", "italic"] },
  paint: { name: () => tr("تأثيرات الكلام", "Word effects"), types: WORDS, owns: ["stroke", "fill", "shadows", "glow", "decoration"] },
  frame: { name: () => tr("إطارات الصور", "Picture frames"), types: PICTURES, owns: ["shape", "radius", "border", "shadow", "shade", "glow", "pad", "bg", "rotateZ", "filters", "overlay", "aspect", "hover", "transition"] },
  background: { name: () => tr("خلفيات", "Backgrounds"), types: BOXES, owns: ["bg", "gradient", "mesh", "pattern", "color", "backdrop"], moves: ["fx"] },
  shadow: { name: () => tr("ظلال وزجاج", "Shadows and glass"), types: ["*"], owns: ["shadow", "shade", "glow", "backdrop"] },
  hover: { name: () => tr("لما الماوس فوقه", "On hover"), types: ["*"], owns: ["hover", "transition"], moves: ["hover"] },
  entrance: { name: () => tr("دخول", "Coming in"), types: ["*"], owns: [], moves: ["enter"] },
  edge: { name: () => tr("حواف الأقسام", "Section edges"), types: ["section"], owns: [] },
};
export const KIND_ORDER: ReadyKind[] = ["button", "card", "background", "frame", "type", "paint", "shadow", "hover", "entrance", "edge"];

/** Whether a look fits an element of this type. */
export const fits = (r: Ready, type: string) => (KINDS[r.kind].types.includes("*") ? !["page", "legacy", "roseBlock", "block"].includes(type) : KINDS[r.kind].types.includes(type)) && (!r.for || r.for.includes(type));

/**
 * What picking a look changes on an element, on one screen: the kind's keys (its own values,
 * the others cleared) and its motion (the kind's motion keys replaced by the look's). An edge
 * goes along the section's bottom (`edgeArt` turns its drawing into data).
 */
export function lookOps(n: PageTreeNode, screen: TreeScreen, r: Ready, edgeArt?: (svg: string) => unknown): PageDraftOp[] {
  const k = KINDS[r.kind];
  const ops: PageDraftOp[] = [];
  if (r.kind === "edge") {
    const art = r.edge && edgeArt ? edgeArt(r.edge) : null;
    if (!art) return [];
    const edges = (n.props?.edges && typeof n.props.edges === "object" ? n.props.edges : {}) as Record<string, Record<string, unknown> | undefined>;
    return [{ op: "setProps", nodeId: n.id, props: { ...n.props, edges: { ...edges, bottom: { height: 80, color: "bg", ...edges.bottom, art } } } }];
  }
  // Its kind's keys (cleared when it has none of its own), and anything else it sets.
  const patch = { ...Object.fromEntries(k.owns.map((key) => [key, null])), ...(r.style ?? {}) };
  if (Object.keys(patch).length) ops.push(styleOp(n, screen, patch));
  if (k.moves?.length || r.motion) {
    const was = (n.motion ?? {}) as Motion & Record<string, unknown>;
    const next: Record<string, unknown> = { ...was };
    for (const key of k.moves ?? []) delete next[key];
    Object.assign(next, r.motion ?? {});
    if (JSON.stringify(next) !== JSON.stringify(was)) ops.push(motionOp(n, Object.keys(next).length ? (next as Motion) : null));
  }
  return ops;
}

/** The element as it would look with a look picked (for the frame's preview), on one screen. */
export function withLook(n: PageTreeNode, screen: TreeScreen, r: Ready): PageTreeNode {
  const k = KINDS[r.kind];
  const style = { ...((n.style ?? {}) as Record<string, Style | undefined>) };
  const own: Style = { ...(style[screen] ?? {}) };
  for (const key of k.owns) delete own[key];
  Object.assign(own, r.style ?? {});
  style[screen] = own;
  const motion: Record<string, unknown> = { ...((n.motion ?? {}) as Record<string, unknown>) };
  for (const key of k.moves ?? []) delete motion[key];
  Object.assign(motion, r.motion ?? {});
  return { ...n, style, motion };
}

/* ---------------------------------------------------------------- colours */

/** A palette: a gradient's colours, a light tint of it, and the words' colour on the gradient. */
export type Palette = { id: string; name: () => string; from: string; via?: string; to: string; light: string; ink: string };
export const PALETTES: Palette[] = [
  { id: "store", name: () => tr("المتجر", "Store"), from: "accent", to: "text", light: "accent-soft", ink: "accent-contrast" },
  { id: "sunset", name: () => tr("غروب", "Sunset"), from: "#f43f5e", via: "#f97316", to: "#facc15", light: "#fff1e6", ink: "#ffffff" },
  { id: "ocean", name: () => tr("بحر", "Ocean"), from: "#06b6d4", via: "#3b82f6", to: "#8b5cf6", light: "#e0f2fe", ink: "#ffffff" },
  { id: "mint", name: () => tr("نعنع", "Mint"), from: "#34d399", to: "#06b6d4", light: "#d1fae5", ink: "#064e3b" },
  { id: "peach", name: () => tr("خوخ", "Peach"), from: "#fb923c", to: "#f9a8d4", light: "#ffedd5", ink: "#7c2d12" },
  { id: "lavender", name: () => tr("خزامى", "Lavender"), from: "#a78bfa", to: "#f0abfc", light: "#ede9fe", ink: "#3b0764" },
  { id: "forest", name: () => tr("غابة", "Forest"), from: "#14532d", to: "#22c55e", light: "#dcfce7", ink: "#ffffff" },
  { id: "berry", name: () => tr("توت", "Berry"), from: "#831843", to: "#db2777", light: "#fce7f3", ink: "#ffffff" },
  { id: "gold", name: () => tr("ذهب", "Gold"), from: "#92400e", via: "#d97706", to: "#fcd34d", light: "#fef3c7", ink: "#ffffff" },
  { id: "night", name: () => tr("ليل", "Night"), from: "#0f172a", to: "#4338ca", light: "#e0e7ff", ink: "#ffffff" },
  { id: "dusk", name: () => tr("مغرب", "Dusk"), from: "#7c3aed", to: "#ec4899", light: "#f5d0fe", ink: "#ffffff" },
  { id: "sand", name: () => tr("رمل", "Sand"), from: "#a8835a", to: "#e7d3bd", light: "#faf3ea", ink: "#3f2d1d" },
  { id: "rose", name: () => tr("ورد", "Rose"), from: "#be123c", to: "#fda4af", light: "#ffe4e6", ink: "#ffffff" },
  { id: "sky", name: () => tr("سما", "Sky"), from: "#0284c7", to: "#7dd3fc", light: "#e0f2fe", ink: "#ffffff" },
  { id: "coral", name: () => tr("مرجان", "Coral"), from: "#f43f5e", to: "#fdba74", light: "#ffe4e6", ink: "#ffffff" },
  { id: "lime", name: () => tr("ليمون أخضر", "Lime"), from: "#65a30d", to: "#bef264", light: "#ecfccb", ink: "#1a2e05" },
  { id: "royal", name: () => tr("ملكي", "Royal"), from: "#1e3a8a", to: "#7c3aed", light: "#e0e7ff", ink: "#ffffff" },
  { id: "candy", name: () => tr("سكاكر", "Candy"), from: "#f472b6", via: "#a78bfa", to: "#60a5fa", light: "#fdf2f8", ink: "#ffffff" },
  { id: "fire", name: () => tr("نار", "Fire"), from: "#b91c1c", via: "#f97316", to: "#fde047", light: "#fef2f2", ink: "#ffffff" },
  { id: "aqua", name: () => tr("فيروزي", "Aqua"), from: "#0f766e", to: "#2dd4bf", light: "#ccfbf1", ink: "#ffffff" },
  { id: "olive", name: () => tr("زيتوني", "Olive"), from: "#3f6212", to: "#a3e635", light: "#f7fee7", ink: "#ffffff" },
  { id: "cocoa", name: () => tr("كاكاو", "Cocoa"), from: "#451a03", to: "#b45309", light: "#fef3c7", ink: "#ffffff" },
  { id: "steel", name: () => tr("فولاذ", "Steel"), from: "#1e293b", to: "#94a3b8", light: "#f1f5f9", ink: "#ffffff" },
  { id: "blush", name: () => tr("خجول", "Blush"), from: "#fda4af", to: "#fde2e4", light: "#fff1f2", ink: "#881337" },
  { id: "mono", name: () => tr("رمادي", "Grey"), from: "#111827", to: "#4b5563", light: "#f3f4f6", ink: "#ffffff" },
  { id: "emerald", name: () => tr("زمرد", "Emerald"), from: "#065f46", to: "#10b981", light: "#d1fae5", ink: "#ffffff" },
  { id: "plum", name: () => tr("برقوق", "Plum"), from: "#581c87", to: "#c084fc", light: "#f3e8ff", ink: "#ffffff" },
];
/** A palette's gradient, at an angle (radial from the middle). */
export const gradOf = (p: Palette, angle = 135, radial = false) => ({ color: p.from, ...(p.via ? { via: p.via } : {}), to: p.to, ...(radial ? { radial: true } : { angle }) });
/** A palette as a mesh's colours (its tint in the fourth corner). */
export const meshOf = (p: Palette, move = false) => ({ colors: [p.from, p.via ?? p.to, p.to, p.light].slice(0, 4), ...(move ? { move: true, speed: 0.8 } : {}) });
/** A hex colour darker (for a 3D button's edge); a theme colour gets the words' colour. */
export function darker(c: string, by = 0.28): string {
  if (!/^#[0-9a-f]{6}$/i.test(c)) return "text";
  const n = (i: number) => Math.round(parseInt(c.slice(i, i + 2), 16) * (1 - by)).toString(16).padStart(2, "0");
  return `#${n(1)}${n(3)}${n(5)}`;
}
/** A name made of two names ("Gradient · Sunset"). */
export const both = (a: () => string, b: () => string) => () => `${a()} · ${b()}`;
/** The usual change between states. */
export const EASE = { duration: 0.25, ease: "smooth" } as const;
