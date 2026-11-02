/**
 * Ready cards and boxes, and ready backgrounds (phase 10): flat, lined, shadowed, tinted,
 * glass, pop, gradient, pastel, mesh and patterned boxes; solid, gradient, radial, mesh,
 * moving aurora and patterned backgrounds, light and dark (dark ones turn the words light).
 */
import { tr } from "../../lib/words";
import { PATTERN_KINDS } from "../cutShapes";
import { PALETTES, both, gradOf, meshOf, type Ready, type Style } from "./core";

const RADII: Array<[string, number, () => string]> = [
  ["0", 0, () => tr("زوايا حادة", "Square corners")],
  ["12", 12, () => tr("زوايا ناعمة", "Soft corners")],
  ["20", 20, () => tr("مدوّرة", "Rounded")],
  ["28", 28, () => tr("مدوّرة كتير", "Very round")],
];
const C: Record<string, () => string> = {
  flat: () => tr("سادة", "Plain"),
  line: () => tr("بخط", "Lined"),
  shadow: () => tr("بظل", "Shadowed"),
  tint: () => tr("ملوّنة فاتح", "Tinted"),
  glass: () => tr("زجاج", "Glass"),
  pop: () => tr("بوب", "Pop"),
  gradient: () => tr("متدرّجة", "Gradient"),
  pastel: () => tr("باستيل", "Pastel"),
  mesh: () => tr("شبكة ألوان", "Colour mesh"),
  pattern: () => tr("بنقشة", "Patterned"),
  dark: () => tr("غامقة", "Dark"),
  shape: () => tr("بشكل", "Shaped"),
  hover: () => tr("بتتحرك مع الماوس", "Move on hover"),
};
export const CARD_GROUPS = Object.keys(C).map((k) => [k, C[k]] as const);
const PAD: [number, number, number, number] = [24, 24, 24, 24];
const lift = { moveY: -6, shade: { x: 0, y: 22, blur: 44, color: "#00000026" } };

const cards: Ready[] = [];
const card = (id: string, group: string, name: () => string, style: Style) => cards.push({ id: `card-${id}`, kind: "card", group, name, style: { pad: PAD, ...style } });

for (const [k, r, rn] of RADII) {
  card(`flat-${k}`, "flat", both(C.flat, rn), { bg: "surface", radius: r });
  card(`line-${k}`, "line", both(C.line, rn), { bg: "surface", radius: r, border: { width: 1, color: "border" } });
  card(`tint-${k}`, "tint", both(C.tint, rn), { bg: "accent-soft", radius: r });
  card(`hover-${k}`, "hover", both(C.hover, rn), { bg: "surface", radius: r, shadow: "sm", hover: lift, transition: { duration: 0.35, ease: "smooth" } });
}
for (const [s, sn] of [["sm", () => tr("ظل خفيف", "Light shadow")], ["md", () => tr("ظل وسط", "Medium shadow")], ["lg", () => tr("ظل قوي", "Strong shadow")]] as const)
  for (const [k, r, rn] of RADII.slice(1)) card(`shadow-${s}-${k}`, "shadow", both(sn, rn), { bg: "surface", radius: r, shadow: s });
for (const [k, r, rn] of RADII.slice(1)) {
  card(`float-${k}`, "shadow", both(() => tr("طايرة", "Floating"), rn), { bg: "surface", radius: r, shade: { x: 0, y: 24, blur: 60, color: "#0000001f" } });
  card(`dark-${k}`, "dark", both(C.dark, rn), { bg: "text", color: "bg", radius: r });
  card(`ring-${k}`, "line", both(() => tr("إطار بلون المتجر", "Store-colour frame"), rn), { bg: "surface", radius: r, border: { width: 2, color: "accent" } });
  card(`glow-${k}`, "shadow", both(() => tr("متوهّجة", "Glowing"), rn), { bg: "surface", radius: r, glow: { color: "accent-soft", size: 30 } });
}
card("dashed", "line", () => tr("خط متقطّع", "Dashed line"), { bg: "transparent", radius: 16, border: { width: 2, color: "border", style: "dashed" } });
card("dotted", "line", () => tr("خط منقّط", "Dotted line"), { bg: "transparent", radius: 16, border: { width: 2, color: "accent", style: "dotted" } });
for (const [k, blur, bg, text, name] of [
  ["light", 12, "#ffffff59", undefined, () => tr("زجاج فاتح", "Light glass")],
  ["light-strong", 22, "#ffffff80", undefined, () => tr("زجاج فاتح قوي", "Strong light glass")],
  ["clear", 6, "#ffffff26", undefined, () => tr("زجاج شفاف", "Clear glass")],
  ["dark", 14, "#0000004d", "white", () => tr("زجاج غامق", "Dark glass")],
  ["dark-strong", 24, "#00000080", "white", () => tr("زجاج غامق قوي", "Strong dark glass")],
  ["tint", 16, "accent-soft", undefined, () => tr("زجاج ملوّن", "Tinted glass")],
] as const)
  card(`glass-${k}`, "glass", name, { bg, radius: 20, backdrop: { blur, saturate: 1.3 }, border: { width: 1, color: "#ffffff4d" }, ...(text ? { color: text } : {}) });
const ink = "#111827";
for (const [k, c, cn] of [
  ["white", "#ffffff", () => tr("أبيض", "White")],
  ["yellow", "#fef08a", () => tr("أصفر", "Yellow")],
  ["mint", "#bbf7d0", () => tr("نعنعي", "Mint")],
  ["pink", "#fbcfe8", () => tr("زهري", "Pink")],
  ["sky", "#bae6fd", () => tr("سماوي", "Sky")],
] as const)
  for (const [rk, r] of [["0", 0], ["16", 16]] as const)
    card(`pop-${k}-${rk}`, "pop", both(C.pop, cn), { bg: c, color: ink, radius: r, border: { width: 2, color: ink }, shade: { x: 6, y: 6, blur: 0, color: ink }, hover: { moveX: -2, moveY: -2, shade: { x: 8, y: 8, blur: 0, color: ink } }, transition: { duration: 0.2, ease: "smooth" } });
for (const p of PALETTES) {
  card(`grad-${p.id}`, "gradient", both(C.gradient, p.name), { gradient: gradOf(p, 135), bg: p.from, color: p.ink, radius: 20 });
  card(`pastel-${p.id}`, "pastel", both(C.pastel, p.name), { bg: p.light, radius: 20 });
}
for (const p of PALETTES.slice(0, 14)) card(`mesh-${p.id}`, "mesh", both(C.mesh, p.name), { mesh: meshOf(p), bg: p.light, color: "text", radius: 24 });
for (const p of PALETTES.slice(14, 26)) card(`frost-${p.id}`, "glass", both(() => tr("زجاج على ألوان", "Glass over colours"), p.name), { gradient: gradOf(p, 135), bg: p.from, backdrop: { blur: 18 }, color: p.ink, radius: 24, border: { width: 1, color: "#ffffff59" } });
for (const [kind, kn] of PATTERN_KINDS) card(`pattern-${kind}`, "pattern", both(C.pattern, kn), { bg: "surface", radius: 20, border: { width: 1, color: "border" }, pattern: { kind, color: "accent", size: 22, opacity: 0.18 } });
for (const [shape, sn] of [
  ["ticket", () => tr("تذكرة", "Ticket")],
  ["bubble", () => tr("فقاعة كلام", "Speech bubble")],
  ["arch", () => tr("قوس", "Arch")],
  ["squircle", () => tr("مربع ناعم", "Squircle")],
  ["slant", () => tr("مائلة", "Slanted")],
  ["wave", () => tr("أسفل متموّج", "Wavy bottom")],
] as const)
  card(`shape-${shape}`, "shape", both(C.shape, sn), { bg: "accent-soft", shape, pad: [36, 32, 44, 32] });

/** Every ready card or box. */
export const CARDS: Ready[] = cards;

/* ------------------------------------------------------------ backgrounds */

const B: Record<string, () => string> = {
  theme: () => tr("ألوان الثيم", "Theme colours"),
  light: () => tr("فاتحة", "Light"),
  deep: () => tr("غامقة", "Deep"),
  gradient: () => tr("متدرّجة", "Gradient"),
  radial: () => tr("من النص لبرّا", "From the middle"),
  mesh: () => tr("شبكة ألوان", "Colour mesh"),
  aurora: () => tr("شفق متحرك", "Moving aurora"),
  pattern: () => tr("نقشات", "Patterns"),
  glass: () => tr("زجاج", "Glass"),
};
export const BACKGROUND_GROUPS = Object.keys(B).map((k) => [k, B[k]] as const);
const bgs: Ready[] = [];
const bg = (id: string, group: string, name: () => string, style: Style, motion?: Ready["motion"]) => bgs.push({ id: `bg-${id}`, kind: "background", group, name, style, ...(motion ? { motion } : {}) });
/** Words on a deep colour are light. */
const onDeep = (ink: string) => (ink === "accent-contrast" ? "accent-contrast" : ink.toLowerCase() === "#ffffff" ? "white" : undefined);

for (const [k, c, text, name] of [
  ["page", "bg", undefined, () => tr("لون الصفحة", "The page colour")],
  ["surface", "surface", undefined, () => tr("لون البطاقات", "The card colour")],
  ["soft", "accent-soft", undefined, () => tr("لون المتجر الفاتح", "The light store colour")],
  ["accent", "accent", "accent-contrast", () => tr("لون المتجر", "The store colour")],
  ["ink", "text", "bg", () => tr("غامق متل الكلام", "Dark as the words")],
] as const)
  bg(`theme-${k}`, "theme", name, { bg: c, ...(text ? { color: text } : {}) });
for (const p of PALETTES) {
  bg(`light-${p.id}`, "light", both(B.light, p.name), { bg: p.light });
  bg(`deep-${p.id}`, "deep", both(B.deep, p.name), { bg: p.from, ...(onDeep(p.ink) ? { color: onDeep(p.ink) } : {}) });
  bg(`grad-${p.id}`, "gradient", both(B.gradient, p.name), { bg: p.from, gradient: gradOf(p, 135), ...(onDeep(p.ink) ? { color: onDeep(p.ink) } : {}) });
  bg(`grad-down-${p.id}`, "gradient", both(() => tr("متدرّجة لتحت", "Gradient downwards"), p.name), { bg: p.light, gradient: { color: p.light, to: p.from === "accent" ? "accent-soft" : `${p.from.slice(0, 7)}33`, angle: 180 } });
  bg(`mesh-${p.id}`, "mesh", both(B.mesh, p.name), { bg: p.light, mesh: meshOf(p) });
}
for (const p of PALETTES.slice(0, 13)) bg(`radial-${p.id}`, "radial", both(B.radial, p.name), { bg: p.to, gradient: gradOf(p, 0, true), ...(onDeep(p.ink) ? { color: onDeep(p.ink) } : {}) });
for (const p of PALETTES.slice(0, 16)) bg(`aurora-${p.id}`, "aurora", both(B.aurora, p.name), { bg: p.from, mesh: { ...meshOf(p, true), soft: 70 }, ...(onDeep(p.ink) ? { color: onDeep(p.ink) } : {}) });
for (const [kind, kn] of PATTERN_KINDS) {
  bg(`pattern-${kind}`, "pattern", both(B.pattern, kn), { bg: "bg", pattern: { kind, color: "border", size: 24, opacity: 0.9 } });
  bg(`pattern-soft-${kind}`, "pattern", both(() => tr("نقشة على لون المتجر", "Pattern on the store colour"), kn), { bg: "accent-soft", pattern: { kind, color: "accent", size: 28, opacity: 0.15 } });
}
for (const p of PALETTES.slice(1, 9)) bg(`pattern-grad-${p.id}`, "pattern", both(() => tr("نقاط على تدرّج", "Dots on a gradient"), p.name), { bg: p.from, gradient: gradOf(p, 135), pattern: { kind: "dots", color: "white", size: 26, opacity: 0.22 }, ...(onDeep(p.ink) ? { color: onDeep(p.ink) } : {}) });
bg("glass-light", "glass", () => tr("زجاج فاتح", "Light glass"), { bg: "#ffffff4d", backdrop: { blur: 16 } });
bg("glass-dark", "glass", () => tr("زجاج غامق", "Dark glass"), { bg: "#0000004d", backdrop: { blur: 16 }, color: "white" });
bg("glass-tint", "glass", () => tr("زجاج ملوّن", "Tinted glass"), { bg: "accent-soft", backdrop: { blur: 12, saturate: 1.4 } });
bg("grain", "theme", () => tr("لون الصفحة بحبيبات", "The page colour, grainy"), { bg: "bg" }, { fx: { kind: "grain" } });

/** Every ready background. */
export const BACKGROUNDS: Ready[] = bgs;
