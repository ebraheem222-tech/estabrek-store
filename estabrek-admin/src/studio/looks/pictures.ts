/**
 * Ready picture frames (phase 10): every cut shape, mats and polaroids, borders, shadows,
 * tilts, colour moods, duotones and fades in every palette, sizes of frame; and ready shadows
 * and glass for anything (soft, long, hard, coloured, glowing, frosted).
 */
import { tr } from "../../lib/words";
import { CUT_SHAPES } from "../cutShapes";
import { EASE, PALETTES, both, type Ready, type Style } from "./core";

const F: Record<string, () => string> = {
  shape: () => tr("أشكال", "Shapes"),
  mat: () => tr("إطار ورقي", "Mats"),
  border: () => tr("إطارات", "Borders"),
  shadow: () => tr("ظلال", "Shadows"),
  mood: () => tr("ألوان ومزاج", "Moods"),
  duo: () => tr("لونين", "Duotones"),
  fade: () => tr("تلاشي", "Fades"),
  size: () => tr("مقاسات", "Proportions"),
  hover: () => tr("مع الماوس", "On hover"),
};
export const FRAME_GROUPS = Object.keys(F).map((k) => [k, F[k]] as const);
const frames: Ready[] = [];
const frame = (id: string, group: string, name: () => string, style: Style) => frames.push({ id: `frame-${id}`, kind: "frame", group, name, style });

for (const [shape, sn] of CUT_SHAPES) frame(`shape-${shape}`, "shape", sn, { shape, ...(["circle", "squircle", "hexagon", "octagon", "pentagon", "diamond", "star", "heart", "flower", "blob", "blob2", "shield", "plus"].includes(shape) ? { aspect: "1 / 1" } : {}) });
for (const [shape, sn] of [["arch", () => tr("قوس", "Arch")], ["blob", () => tr("فقاعة", "Blob")], ["circle", () => tr("دائرة", "Circle")], ["leaf", () => tr("ورقة", "Leaf")]] as const) {
  frame(`shape-shade-${shape}`, "shape", both(sn, () => tr("بظل", "With a shadow")), { shape, aspect: shape === "arch" ? "4 / 5" : "1 / 1", shade: { x: 0, y: 18, blur: 36, color: "#00000033", follow: true } });
  frame(`shape-ring-${shape}`, "shape", both(sn, () => tr("بهالة", "With a halo")), { shape, aspect: shape === "arch" ? "4 / 5" : "1 / 1", glow: { color: "accent-soft", size: 24 } });
}
const MORE_SHAPES: Array<[string, () => string]> = [
  ["hexagon", () => tr("سداسي", "Hexagon")], ["octagon", () => tr("ثماني", "Octagon")], ["diamond", () => tr("معيّن", "Diamond")], ["star", () => tr("نجمة", "Star")],
  ["heart", () => tr("قلب", "Heart")], ["flower", () => tr("وردة", "Flower")], ["blob2", () => tr("فقاعة تانية", "Another blob")], ["drop", () => tr("نقطة", "Drop")],
  ["shield", () => tr("درع", "Shield")], ["squircle", () => tr("مربع ناعم", "Squircle")], ["pentagon", () => tr("خماسي", "Pentagon")], ["ticket", () => tr("تذكرة", "Ticket")],
];
for (const [shape, sn] of MORE_SHAPES) {
  frame(`shape-glow-${shape}`, "shape", both(sn, () => tr("متوهّج", "Glowing")), { shape, aspect: "1 / 1", glow: { color: "accent", size: 18 } });
  frame(`shape-hard-${shape}`, "shape", both(sn, () => tr("بظل حاد", "With a hard shadow")), { shape, aspect: "1 / 1", shade: { x: 10, y: 10, blur: 0, color: "accent-soft", follow: true } });
}
const white = "#ffffff";
for (const [id, name, style] of [
  ["polaroid", () => tr("بولارويد", "Polaroid"), { bg: white, pad: [10, 10, 44, 10], radius: 2, shade: { x: 0, y: 10, blur: 26, color: "#00000026" } }],
  ["polaroid-tilt", () => tr("بولارويد مايل", "Tilted polaroid"), { bg: white, pad: [10, 10, 44, 10], radius: 2, rotateZ: -3, shade: { x: 0, y: 10, blur: 26, color: "#00000026" } }],
  ["polaroid-tilt-end", () => tr("بولارويد مايل للجهة التانية", "Polaroid tilted the other way"), { bg: white, pad: [10, 10, 44, 10], radius: 2, rotateZ: 3, shade: { x: 0, y: 10, blur: 26, color: "#00000026" } }],
  ["mat", () => tr("إطار أبيض", "White mat"), { bg: white, pad: [16, 16, 16, 16], shade: { x: 0, y: 6, blur: 18, color: "#0000001f" } }],
  ["mat-wide", () => tr("إطار أبيض عريض", "Wide white mat"), { bg: white, pad: [32, 32, 32, 32], border: { width: 1, color: "border" } }],
  ["mat-store", () => tr("إطار بلون المتجر", "Store-colour mat"), { bg: "accent-soft", pad: [18, 18, 18, 18], radius: 16 }],
  ["mat-dark", () => tr("إطار غامق", "Dark mat"), { bg: "text", pad: [14, 14, 14, 14], radius: 6 }],
  ["gallery", () => tr("معرض", "Gallery"), { bg: "surface", pad: [12, 12, 12, 12], border: { width: 1, color: "border" }, radius: 4 }],
  ["film", () => tr("فيلم", "Film"), { bg: "#111111", pad: [18, 6, 18, 6], radius: 4 }],
  ["stamp", () => tr("طابع", "Stamp"), { bg: white, pad: [10, 10, 10, 10], border: { width: 3, color: "border", style: "dotted" } }],
] as const)
  frame(id, "mat", name, style as Style);
for (const [id, name, style] of [
  ["thin", () => tr("خط رفيع", "A thin line"), { border: { width: 1, color: "border" }, radius: 8 }],
  ["thick", () => tr("إطار عريض", "A thick frame"), { border: { width: 6, color: "surface" }, radius: 12, shadow: "md" }],
  ["store", () => tr("إطار بلون المتجر", "A store-colour frame"), { border: { width: 3, color: "accent" }, radius: 14 }],
  ["dark", () => tr("إطار غامق", "A dark frame"), { border: { width: 4, color: "text" }, radius: 0 }],
  ["dashed", () => tr("إطار متقطّع", "A dashed frame"), { border: { width: 2, color: "accent", style: "dashed" }, radius: 16 }],
  ["round", () => tr("زوايا مدوّرة", "Rounded"), { radius: 24 }],
  ["rounder", () => tr("مدوّرة كتير", "Very round"), { radius: 40 }],
  ["sharp", () => tr("زوايا حادة", "Sharp"), { radius: 0 }],
  ["neon", () => tr("إطار نيون", "A neon frame"), { border: { width: 2, color: "accent" }, glow: { color: "accent", size: 18 }, radius: 16 }],
  ["neon-cyan", () => tr("نيون سماوي", "Cyan neon"), { border: { width: 2, color: "#22d3ee" }, glow: { color: "#22d3ee", size: 18 }, radius: 16 }],
  ["ring-circle", () => tr("دائرة بإطار", "A ringed circle"), { shape: "circle", aspect: "1 / 1", border: { width: 4, color: "accent" } }],
  ["ring-circle-white", () => tr("دائرة بإطار أبيض", "A white-ringed circle"), { shape: "circle", aspect: "1 / 1", border: { width: 6, color: white }, shadow: "lg" }],
] as const)
  frame(`border-${id}`, "border", name, style as Style);
for (const [id, name, style] of [
  ["soft", () => tr("ظل ناعم", "Soft shadow"), { radius: 16, shade: { x: 0, y: 16, blur: 40, color: "#00000026" } }],
  ["long", () => tr("ظل طويل", "Long shadow"), { radius: 16, shade: { x: 0, y: 30, blur: 60, color: "#00000033" } }],
  ["hard", () => tr("ظل حاد", "Hard shadow"), { radius: 0, shade: { x: 10, y: 10, blur: 0, color: "text" } }],
  ["hard-store", () => tr("ظل حاد بلون المتجر", "Hard store-colour shadow"), { radius: 12, shade: { x: -12, y: 12, blur: 0, color: "accent" } }],
  ["hard-soft", () => tr("ظل حاد فاتح", "Light hard shadow"), { radius: 20, shade: { x: 14, y: 14, blur: 0, color: "accent-soft" } }],
  ["float", () => tr("طايرة", "Floating"), { radius: 20, shade: { x: 0, y: 40, blur: 50, color: "#0000002e" }, rotateZ: -1 }],
  ["glow", () => tr("متوهّجة", "Glowing"), { radius: 20, glow: { color: "accent-soft", size: 40 } }],
  ["shadow-lg", () => tr("ظل قوي", "Strong shadow"), { radius: 12, shadow: "lg" }],
] as const)
  frame(`shadow-${id}`, "shadow", name, style as Style);
for (const [id, name, filters] of [
  ["bw", () => tr("أبيض وأسود", "Black and white"), { gray: 1 }],
  ["bw-contrast", () => tr("أبيض وأسود قوي", "Strong black and white"), { gray: 1, contrast: 1.3 }],
  ["faded", () => tr("باهت", "Faded"), { contrast: 0.88, bright: 1.06, saturate: 0.75 }],
  ["vivid", () => tr("ألوان قوية", "Vivid"), { saturate: 1.5, contrast: 1.08 }],
  ["warm", () => tr("دافي", "Warm"), { hue: -12, saturate: 1.25 }],
  ["cool", () => tr("بارد", "Cool"), { hue: 14, saturate: 0.95 }],
  ["dramatic", () => tr("درامي", "Dramatic"), { contrast: 1.35, bright: 0.92 }],
  ["bright", () => tr("مضوّي", "Bright"), { bright: 1.15 }],
  ["moody", () => tr("معتّم", "Moody"), { bright: 0.8, saturate: 0.85, contrast: 1.1 }],
  ["vintage", () => tr("قديم", "Vintage"), { saturate: 0.7, hue: -18, contrast: 0.95 }],
] as const)
  frame(`mood-${id}`, "mood", name, { radius: 12, filters });
for (const p of PALETTES.slice(0, 15)) frame(`duo-${p.id}`, "duo", both(F.duo, p.name), { radius: 12, filters: { gray: 1, contrast: 1.1 }, overlay: { color: p.from, to: p.to, angle: 135, opacity: 0.6, blend: "color" } });
for (const p of PALETTES.slice(0, 12)) frame(`tint-${p.id}`, "duo", both(() => tr("طبقة لون", "A colour veil"), p.name), { radius: 12, overlay: { color: p.from, opacity: 0.35, blend: "multiply" } });
for (const [id, name, overlay] of [
  ["bottom", () => tr("غامق من تحت", "Dark at the bottom"), { color: "transparent", to: "#000000", angle: 180, opacity: 0.6 }],
  ["top", () => tr("غامق من فوق", "Dark at the top"), { color: "#000000", to: "transparent", angle: 180, opacity: 0.55 }],
  ["veil", () => tr("طبقة غامقة", "A dark veil"), { color: "#000000", opacity: 0.35 }],
  ["light", () => tr("طبقة فاتحة", "A light veil"), { color: "#ffffff", opacity: 0.35 }],
  ["store-bottom", () => tr("لون المتجر من تحت", "The store colour at the bottom"), { color: "transparent", to: "accent", angle: 180, opacity: 0.7 }],
  ["side", () => tr("غامق من الجنب", "Dark from the side"), { color: "#000000", to: "transparent", angle: 90, opacity: 0.55 }],
] as const)
  frame(`fade-${id}`, "fade", name, { radius: 12, overlay });
for (const [aspect, an] of [["1 / 1", () => tr("مربع", "Square")], ["4 / 5", () => tr("طولي", "Portrait")], ["3 / 4", () => tr("طولي ٣:٤", "Portrait 3:4")], ["16 / 9", () => tr("عرضي", "Wide")], ["21 / 9", () => tr("سينما", "Cinema")]] as const)
  for (const [r, rn] of [[0, () => tr("حاد", "Sharp")], [16, () => tr("ناعم", "Soft")], [999, () => tr("مدوّر كامل", "Fully round")]] as const)
    if (!(r === 999 && aspect !== "1 / 1" && aspect !== "4 / 5")) frame(`size-${aspect.replace(" / ", "x")}-${r}`, "size", both(an, rn), { aspect, radius: r === 999 ? (aspect === "1 / 1" ? 999 : 200) : r });
const ease = { transition: EASE };
for (const [id, name, style] of [
  ["to-colour", () => tr("من رمادي لألوان", "Grey to colour"), { radius: 12, filters: { gray: 1 }, hover: { filters: { gray: 0 } }, ...ease }],
  ["to-sharp", () => tr("من ضباب لوضوح", "Blur to sharp"), { radius: 12, filters: { blur: 4 }, hover: { filters: { blur: 0 } }, ...ease }],
  ["brighten", () => tr("بتضوّي", "Brightens"), { radius: 12, hover: { filters: { bright: 1.12 } }, ...ease }],
  ["lift", () => tr("بترتفع", "Lifts"), { radius: 16, hover: { moveY: -8, shade: { x: 0, y: 24, blur: 40, color: "#00000033" } }, ...ease }],
  ["tilt", () => tr("بتميل", "Tilts"), { radius: 16, hover: { rotateZ: -2, scale: 1.03 }, ...ease }],
  ["veil-off", () => tr("بتروح الطبقة", "The veil lifts"), { radius: 12, overlay: { color: "#000000", opacity: 0.4 }, hover: { overlay: { color: "#000000", opacity: 0 } }, ...ease }],
  ["glow", () => tr("بتتوهّج", "Glows"), { radius: 16, hover: { glow: { color: "accent", size: 30 } }, ...ease }],
  ["turn-3d", () => tr("بتلف ثلاثي", "Turns in 3D"), { radius: 16, hover: { rotateY: -12, rotateX: 6, scale: 1.02 }, ...ease }],
] as const)
  frame(`hover-${id}`, "hover", name, style as Style);

/** Every ready picture frame. */
export const FRAMES: Ready[] = frames;

/* ------------------------------------------------------------ shadows and glass */

const S: Record<string, () => string> = {
  basic: () => tr("أساسية", "Basic"),
  soft: () => tr("ناعمة", "Soft"),
  hard: () => tr("حادة", "Hard"),
  glow: () => tr("توهّج", "Glow"),
  glass: () => tr("زجاج", "Glass"),
};
export const SHADOW_GROUPS = Object.keys(S).map((k) => [k, S[k]] as const);
const shadows: Ready[] = [];
const shadow = (id: string, group: string, name: () => string, style: Style) => shadows.push({ id: `shadow-${id}`, kind: "shadow", group, name, style });
for (const [k, kn] of [["none", () => tr("بلا ظل", "No shadow")], ["sm", () => tr("ظل خفيف", "Light shadow")], ["md", () => tr("ظل وسط", "Medium shadow")], ["lg", () => tr("ظل قوي", "Strong shadow")]] as const) shadow(k, "basic", kn, { shadow: k });
const SOFT: Array<[string, number, number, () => string]> = [
  ["close", 4, 12, () => tr("قريب", "Close")],
  ["mid", 12, 28, () => tr("وسط", "Middle")],
  ["far", 24, 48, () => tr("بعيد", "Far")],
  ["deep", 36, 72, () => tr("عميق", "Deep")],
  ["wide", 8, 60, () => tr("واسع", "Wide")],
];
for (const [k, y, blur, kn] of SOFT)
  for (const [c, colour, cn] of [["black", "#00000029", () => tr("رمادي", "Grey")], ["soft", "accent-soft", () => tr("بلون المتجر الفاتح", "Light store colour")], ["store", "accent", () => tr("بلون المتجر", "Store colour")]] as const)
    shadow(`soft-${k}-${c}`, "soft", both(kn, cn), { shade: { x: 0, y, blur, color: colour } });
const HARD: Array<[string, string, () => string]> = [
  ["ink", "text", () => tr("غامق", "Dark")],
  ["store", "accent", () => tr("بلون المتجر", "Store colour")],
  ["soft", "accent-soft", () => tr("فاتح", "Light")],
  ["yellow", "#facc15", () => tr("أصفر", "Yellow")],
  ["pink", "#f472b6", () => tr("زهري", "Pink")],
  ["blue", "#60a5fa", () => tr("أزرق", "Blue")],
  ["green", "#34d399", () => tr("أخضر", "Green")],
  ["violet", "#a78bfa", () => tr("بنفسجي", "Violet")],
];
for (const [k, c, cn] of HARD)
  for (const off of [4, 8] as const) shadow(`hard-${k}-${off}`, "hard", both(cn, () => (off === 4 ? tr("قريب", "Close") : tr("بعيد", "Far"))), { shade: { x: off, y: off, blur: 0, color: c } });
const GLOWS: Array<[string, string, () => string]> = [
  ["store", "accent", () => tr("بلون المتجر", "Store colour")],
  ["soft", "accent-soft", () => tr("فاتح", "Light")],
  ["white", "white", () => tr("أبيض", "White")],
  ["cyan", "#22d3ee", () => tr("سماوي", "Cyan")],
  ["pink", "#f472b6", () => tr("زهري", "Pink")],
  ["gold", "#fbbf24", () => tr("ذهبي", "Gold")],
  ["lime", "#a3e635", () => tr("أخضر فاقع", "Lime")],
  ["violet", "#a78bfa", () => tr("بنفسجي", "Violet")],
  ["red", "#f87171", () => tr("أحمر", "Red")],
];
for (const [k, c, cn] of GLOWS) for (const size of [16, 40] as const) shadow(`glow-${k}-${size}`, "glow", both(cn, () => (size === 16 ? tr("خفيف", "Faint") : tr("قوي", "Strong"))), { glow: { color: c, size } });
// What's behind it blurred (seen through a see-through background).
for (const [k, blur, sat, name] of [
  ["faint", 6, 1.2, () => tr("زجاج خفيف", "Faint glass")],
  ["light", 12, 1.3, () => tr("زجاج", "Glass")],
  ["strong", 22, 1.4, () => tr("زجاج قوي", "Strong glass")],
  ["frost", 32, 1.1, () => tr("صقيع", "Frost")],
  ["vivid", 14, 1.9, () => tr("زجاج بألوان قوية", "Vivid glass")],
  ["clear", 3, 1, () => tr("زجاج شفاف", "Clear glass")],
] as const)
  shadow(`glass-${k}`, "glass", name, { backdrop: { blur, saturate: sat }, shade: { x: 0, y: 8, blur: 32, color: "#0000001a" } });

/** Every ready shadow and glass. */
export const SHADOWS: Ready[] = shadows;
