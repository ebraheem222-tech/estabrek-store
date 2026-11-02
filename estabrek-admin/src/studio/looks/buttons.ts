/**
 * Ready buttons (phase 10): solid, soft, outline, link, gradient, glass, neon, pop, 3D,
 * shine, mesh and one per colour, in square to pill corners, each with its hover and press.
 */
import { tr } from "../../lib/words";
import { EASE, PALETTES, both, darker, gradOf, meshOf, type Ready, type Style } from "./core";

const CORNERS: Array<[string, number, () => string]> = [
  ["sq", 0, () => tr("مربع", "Square")],
  ["soft", 8, () => tr("زوايا ناعمة", "Soft corners")],
  ["round", 14, () => tr("مدوّر", "Rounded")],
  ["pill", 999, () => tr("كبسولة", "Pill")],
];
const G: Record<string, () => string> = {
  solid: () => tr("مليان", "Solid"),
  soft: () => tr("ناعم", "Soft"),
  outline: () => tr("بإطار", "Outline"),
  link: () => tr("رابط", "Link"),
  gradient: () => tr("متدرّج", "Gradient"),
  glass: () => tr("زجاج", "Glass"),
  neon: () => tr("نيون", "Neon"),
  pop: () => tr("بوب", "Pop"),
  "3d": () => tr("ثلاثي الأبعاد", "3D"),
  shine: () => tr("لمعة", "Shine"),
  mesh: () => tr("شبكة ألوان", "Colour mesh"),
  colour: () => tr("لون", "Colour"),
  size: () => tr("أحجام", "Sizes"),
};
export const BUTTON_GROUPS = Object.keys(G).map((k) => [k, G[k]] as const);

const lift = { moveY: -2, shade: { x: 0, y: 10, blur: 24, color: "#00000026" } };
const press = { scale: 0.97 };
const out: Ready[] = [];
const add = (id: string, group: string, name: () => string, style: Style, motion?: Ready["motion"]) => out.push({ id: `btn-${id}`, kind: "button", group, name, style: { transition: EASE, ...style }, ...(motion ? { motion } : {}) });

for (const [k, r, cn] of CORNERS) {
  add(`solid-${k}`, "solid", both(G.solid, cn), { bg: "accent", color: "accent-contrast", radius: r, hover: lift, pressed: press });
  add(`dark-${k}`, "solid", both(() => tr("غامق", "Dark"), cn), { bg: "text", color: "bg", radius: r, hover: { ...lift, opacity: 0.92 }, pressed: press });
  add(`light-${k}`, "solid", both(() => tr("فاتح", "Light"), cn), { bg: "surface", color: "text", radius: r, border: { width: 1, color: "border" }, hover: { border: { width: 1, color: "accent" }, color: "accent" }, pressed: press });
  add(`soft-${k}`, "soft", both(G.soft, cn), { bg: "accent-soft", color: "text", radius: r, hover: { bg: "accent", color: "accent-contrast" }, pressed: press });
  add(`outline-${k}`, "outline", both(G.outline, cn), { bg: "transparent", color: "accent", radius: r, border: { width: 2, color: "accent" }, hover: { bg: "accent", color: "accent-contrast" }, pressed: press });
  add(`outline-dark-${k}`, "outline", both(() => tr("إطار غامق", "Dark outline"), cn), { bg: "transparent", color: "text", radius: r, border: { width: 2, color: "text" }, hover: { bg: "text", color: "bg" }, pressed: press });
  add(`glass-${k}`, "glass", both(G.glass, cn), { bg: "#ffffff33", color: "text", radius: r, backdrop: { blur: 12, saturate: 1.4 }, border: { width: 1, color: "#ffffff66" }, hover: { bg: "#ffffff55" }, pressed: press });
  add(`soft-shadow-${k}`, "soft", both(() => tr("ظل ناعم", "Soft shadow"), cn), { bg: "surface", color: "text", radius: r, shade: { x: 0, y: 8, blur: 24, color: "#0000001f" }, hover: { moveY: -2, shade: { x: 0, y: 14, blur: 32, color: "#00000029" } }, pressed: press });
}
add("glass-dark", "glass", () => tr("زجاج غامق", "Dark glass"), { bg: "#0000004d", color: "white", radius: 999, backdrop: { blur: 14 }, border: { width: 1, color: "#ffffff33" }, hover: { bg: "#00000073" }, pressed: press });
add("glass-tint", "glass", () => tr("زجاج بلون المتجر", "Store-tinted glass"), { bg: "accent-soft", color: "text", radius: 14, backdrop: { blur: 10 }, opacity: undefined, border: { width: 1, color: "#ffffff80" }, hover: { bg: "accent", color: "accent-contrast" }, pressed: press });
add("ghost", "link", () => tr("شفاف", "Ghost"), { bg: "transparent", color: "text", radius: 8, hover: { bg: "accent-soft" }, pressed: press });
add("link-line", "link", () => tr("رابط بخط", "Underlined link"), { bg: "transparent", color: "accent", pad: [6, 2, 6, 2], decoration: { line: "underline", width: 2, offset: 6 }, hover: { color: "text", decoration: { line: "underline", width: 2, offset: 4 } } });
add("link-marker", "link", () => tr("رابط بقلم تظليل", "Highlighted link"), { bg: "transparent", color: "text", pad: [6, 2, 6, 2], decoration: { line: "underline", color: "accent-soft", width: 10, offset: -6 }, hover: { decoration: { line: "underline", color: "accent", width: 10, offset: -6 }, color: "accent-contrast" } });
add("link-arrow", "link", () => tr("رابط هادي", "Quiet link"), { bg: "transparent", color: "muted", pad: [6, 2, 6, 2], weight: 600, hover: { color: "accent" } });
add("caps-solid", "solid", () => tr("حروف كبيرة مليان", "Capitals, solid"), { bg: "accent", color: "accent-contrast", radius: 0, caps: "upper", letterSpacing: 2, weight: 700, pad: [14, 28, 14, 28], hover: lift, pressed: press });
add("caps-outline", "outline", () => tr("حروف كبيرة بإطار", "Capitals, outline"), { bg: "transparent", color: "text", radius: 0, caps: "upper", letterSpacing: 2, weight: 700, border: { width: 1, color: "text" }, pad: [14, 28, 14, 28], hover: { bg: "text", color: "bg" }, pressed: press });
add("caps-dark", "solid", () => tr("حروف كبيرة غامق", "Capitals, dark"), { bg: "text", color: "bg", radius: 999, caps: "upper", letterSpacing: 2, weight: 700, pad: [14, 30, 14, 30], hover: lift, pressed: press });
add("caps-link", "link", () => tr("حروف كبيرة رابط", "Capitals, link"), { bg: "transparent", color: "text", caps: "upper", letterSpacing: 3, weight: 700, pad: [6, 2, 6, 2], decoration: { line: "underline", width: 1, offset: 8 }, hover: { color: "accent" } });

// Sizes
const SIZES: Array<[string, [number, number, number, number], () => string]> = [
  ["s", [8, 16, 8, 16], () => tr("صغير", "Small")],
  ["l", [18, 36, 18, 36], () => tr("كبير", "Large")],
];
for (const [k, pad, sn] of SIZES) {
  add(`size-solid-${k}`, "size", both(G.solid, sn), { bg: "accent", color: "accent-contrast", radius: 999, pad, hover: lift, pressed: press });
  add(`size-outline-${k}`, "size", both(G.outline, sn), { bg: "transparent", color: "accent", radius: 999, pad, border: { width: 2, color: "accent" }, hover: { bg: "accent", color: "accent-contrast" }, pressed: press });
  add(`size-dark-${k}`, "size", both(() => tr("غامق", "Dark"), sn), { bg: "text", color: "bg", radius: 10, pad, hover: lift, pressed: press });
  add(`size-soft-${k}`, "size", both(G.soft, sn), { bg: "accent-soft", color: "text", radius: 10, pad, hover: { bg: "accent", color: "accent-contrast" }, pressed: press });
}

// Neon
const NEONS: Array<[string, string, () => string]> = [
  ["store", "accent", () => tr("بلون المتجر", "In the store colour")],
  ["cyan", "#22d3ee", () => tr("سماوي", "Cyan")],
  ["pink", "#f472b6", () => tr("زهري", "Pink")],
  ["lime", "#a3e635", () => tr("أخضر فاقع", "Lime")],
  ["violet", "#a78bfa", () => tr("بنفسجي", "Violet")],
  ["amber", "#fbbf24", () => tr("كهرماني", "Amber")],
];
for (const [k, c, cn] of NEONS) {
  add(`neon-${k}`, "neon", both(G.neon, cn), { bg: "transparent", color: c, radius: 999, border: { width: 2, color: c }, glow: { color: c, size: 12 }, hover: { glow: { color: c, size: 28 }, bg: c, color: "#0b0b12" }, pressed: press });
  add(`neon-sq-${k}`, "neon", both(() => tr("نيون مربع", "Square neon"), cn), { bg: "#0b0b12", color: c, radius: 4, border: { width: 1, color: c }, shadows: [{ x: 0, y: 0, blur: 8, color: c }], glow: { color: c, size: 10 }, hover: { glow: { color: c, size: 24 } }, pressed: press });
}

// Pop (a hard shadow that moves with the press)
const POPS: Array<[string, string, () => string]> = [
  ["store", "accent", () => tr("بلون المتجر", "In the store colour")],
  ["yellow", "#fde047", () => tr("أصفر", "Yellow")],
  ["mint", "#a7f3d0", () => tr("نعنعي", "Mint")],
  ["pink", "#fbcfe8", () => tr("زهري", "Pink")],
  ["white", "#ffffff", () => tr("أبيض", "White")],
  ["sky", "#bae6fd", () => tr("سماوي", "Sky")],
];
const ink = "#111827";
for (const [k, c, cn] of POPS)
  for (const [rk, r, rn] of [CORNERS[0], CORNERS[2]] as const) {
    add(`pop-${k}-${rk}`, "pop", both(both(G.pop, cn), rn), {
      bg: c, color: c === "accent" ? "accent-contrast" : ink, radius: r, weight: 700, border: { width: 2, color: ink }, shade: { x: 4, y: 4, blur: 0, color: ink },
      hover: { moveX: -2, moveY: -2, shade: { x: 6, y: 6, blur: 0, color: ink } }, pressed: { moveX: 3, moveY: 3, shade: { x: 0, y: 0, blur: 0, color: ink } },
    });
  }

// 3D (an edge under it that it presses into)
const RAISED: Array<[string, string, string, () => string]> = [
  ["store", "accent", "accent-contrast", () => tr("بلون المتجر", "In the store colour")],
  ["dark", "text", "bg", () => tr("غامق", "Dark")],
  ["rose", "#e11d48", "#ffffff", () => tr("أحمر وردي", "Rose red")],
  ["blue", "#2563eb", "#ffffff", () => tr("أزرق", "Blue")],
  ["green", "#16a34a", "#ffffff", () => tr("أخضر", "Green")],
  ["orange", "#f97316", "#ffffff", () => tr("برتقالي", "Orange")],
  ["violet", "#7c3aed", "#ffffff", () => tr("بنفسجي", "Violet")],
  ["gold", "#f59e0b", "#1f1300", () => tr("ذهبي", "Gold")],
];
for (const [k, c, text, cn] of RAISED) {
  const edge = c === "accent" ? "text" : c === "text" ? "#000000" : darker(c);
  add(`3d-${k}`, "3d", both(G["3d"], cn), {
    bg: c, color: text, radius: 12, weight: 700, shade: { x: 0, y: 6, blur: 0, color: edge },
    hover: { moveY: -2, shade: { x: 0, y: 8, blur: 0, color: edge } }, pressed: { moveY: 5, shade: { x: 0, y: 1, blur: 0, color: edge } },
  });
}

// Shine (a light running over it)
for (const [k, r, cn] of CORNERS) add(`shine-${k}`, "shine", both(G.shine, cn), { bg: "accent", color: "accent-contrast", radius: r, hover: lift, pressed: press }, { fx: { kind: "shine", speed: 1 } });
add("shine-dark", "shine", () => tr("لمعة غامق", "Shine, dark"), { bg: "text", color: "bg", radius: 999, hover: lift, pressed: press }, { fx: { kind: "shine", speed: 1.2 } });
add("shine-gold", "shine", () => tr("لمعة ذهبي", "Shine, gold"), { gradient: gradOf(PALETTES.find((p) => p.id === "gold")!, 90), bg: "#d97706", color: "#ffffff", radius: 999, hover: lift, pressed: press }, { fx: { kind: "shine", speed: 1 } });

// Gradients, colour meshes, one per colour, outlines in a colour
for (const p of PALETTES) {
  add(`grad-${p.id}`, "gradient", both(G.gradient, p.name), { gradient: gradOf(p, 120), bg: p.from, color: p.ink, radius: 999, hover: { ...lift, filters: { bright: 1.08 } }, pressed: press });
  add(`grad-glow-${p.id}`, "gradient", both(() => tr("متدرّج متوهّج", "Glowing gradient"), p.name), { gradient: gradOf(p, 90), bg: p.from, color: p.ink, radius: 14, glow: { color: p.to, size: 10 }, hover: { glow: { color: p.to, size: 26 }, moveY: -1 }, pressed: press });
  add(`colour-${p.id}`, "colour", both(G.colour, p.name), { bg: p.from, color: p.from.startsWith("#") ? "#ffffff" : p.ink, radius: 10, hover: { bg: p.to, color: p.ink }, pressed: press });
  add(`tint-${p.id}`, "colour", both(() => tr("فاتح", "Light"), p.name), { bg: p.light, color: p.from, radius: 999, hover: { bg: p.from, color: p.from.startsWith("#") ? "#ffffff" : p.ink }, pressed: press });
  if (p.id !== "store") add(`outline-${p.id}`, "outline", both(G.outline, p.name), { bg: "transparent", color: p.from, radius: 999, border: { width: 2, color: p.from }, hover: { bg: p.from, color: "#ffffff" }, pressed: press });
}
for (const p of PALETTES.filter((x) => x.via || ["dusk", "lavender", "aqua", "rose"].includes(x.id)))
  add(`mesh-${p.id}`, "mesh", both(G.mesh, p.name), { mesh: meshOf(p, true), bg: p.from, color: p.ink, radius: 999, weight: 700, hover: lift, pressed: press });

/** Every ready button. */
export const BUTTONS: Ready[] = out.map((r) => ({ ...r, style: Object.fromEntries(Object.entries(r.style ?? {}).filter(([, v]) => v !== undefined)) }));
