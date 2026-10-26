/**
 * The editor's ready drawings: each one is built here from a few knobs (how many points,
 * how wavy, which seed…) into the data the page keeps (studio/svgArt.ts), so the shop
 * only ever draws checked data. Some carry a second shape (`morph`) that the shop's
 * motion can turn them into and back. Colours start as theme colours.
 */
import { tr } from "../lib/words";
import type { Art } from "./svgArt";

export type Knob = { key: string; label: () => string; min: number; max: number; step: number; def: number };
export type ShapeDef = { key: string; label: () => string; knobs: Knob[]; make: (k: Record<string, number>) => Art };

const f = (v: number) => String(Math.round(v * 10) / 10);
/** A small seeded random (the same seed draws the same blob). */
function random(seed: number) {
  let a = (Math.floor(seed) * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A smooth closed line through the points (Catmull-Rom as curves). */
export function smoothClosed(pts: Array<[number, number]>): string {
  const n = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d} Z`;
}
const around = (count: number, r: (i: number, angle: number) => number, cx = 100, cy = 100, turn = -Math.PI / 2): Array<[number, number]> =>
  Array.from({ length: count }, (_, i) => {
    const a = turn + (i / count) * Math.PI * 2;
    const rr = r(i, a);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
const knob = (key: string, label: () => string, min: number, max: number, def: number, step = 1): Knob => ({ key, label, min, max, step, def });
const k = (v: Record<string, number>, key: string, def: number) => (typeof v[key] === "number" ? v[key] : def);

const blobPath = (points: number, wobble: number, seed: number) => {
  const rand = random(seed);
  return smoothClosed(around(points, () => 88 * (1 - wobble / 2 + rand() * wobble)));
};
const wavePath = (waves: number, height: number, phase: number, y: number) => {
  const w = 1200 / waves;
  let d = `M0 ${f(y + Math.sin(phase) * height)}`;
  const steps = waves * 8;
  for (let i = 1; i <= steps; i++) {
    const x = (i / steps) * 1200;
    d += ` L${f(x)} ${f(y + Math.sin(phase + (x / w) * Math.PI * 2) * height)}`;
  }
  return `${d} L1200 120 L0 120 Z`;
};
const sealPath = (bumps: number, depth: number) => smoothClosed(around(bumps * 2, (i) => (i % 2 ? 90 - depth : 90)));

export const SHAPES: ShapeDef[] = [
  {
    key: "blob", label: () => tr("فقاعة", "Blob"),
    knobs: [knob("points", () => tr("عدد النقاط", "Points"), 3, 12, 7), knob("wobble", () => tr("التموّج", "Waviness"), 0, 0.6, 0.3, 0.05), knob("seed", () => tr("شكل تاني", "Another shape"), 1, 99, 1)],
    make: (v) => ({ viewBox: "0 0 200 200", morph: blobPath(k(v, "points", 7), k(v, "wobble", 0.3), k(v, "seed", 1) + 17), nodes: [{ t: "path", a: { d: blobPath(k(v, "points", 7), k(v, "wobble", 0.3), k(v, "seed", 1)), fill: "accent-soft" } }] }),
  },
  {
    key: "wave", label: () => tr("موجة (فاصل)", "Wave (divider)"),
    knobs: [knob("waves", () => tr("عدد الموجات", "Waves"), 1, 8, 3), knob("height", () => tr("الارتفاع", "Height"), 4, 40, 18), knob("layers", () => tr("الطبقات", "Layers"), 1, 3, 2)],
    make: (v) => {
      const [waves, height, layers] = [k(v, "waves", 3), k(v, "height", 18), k(v, "layers", 2)];
      const nodes = Array.from({ length: layers }, (_, i) => ({ t: "path", a: { d: wavePath(waves, height, i * 1.3, 60 + i * 14), fill: "accent", ...(i < layers - 1 ? { opacity: f(0.35 + i * 0.2) } : {}) } }));
      return { viewBox: "0 0 1200 120", morph: wavePath(waves, height, Math.PI, 60), nodes };
    },
  },
  {
    key: "squiggle", label: () => tr("خط متعرّج", "Squiggle"),
    knobs: [knob("turns", () => tr("التعرّجات", "Turns"), 2, 12, 5), knob("height", () => tr("الارتفاع", "Height"), 4, 24, 14), knob("width", () => tr("سمك الخط", "Line width"), 2, 16, 6)],
    make: (v) => {
      const [turns, height] = [k(v, "turns", 5), k(v, "height", 14)];
      const step = 290 / turns;
      let d = `M5 30 Q ${f(5 + step / 2)} ${f(30 - height * 1.6)} ${f(5 + step)} 30`;
      for (let i = 2; i <= turns; i++) d += ` T ${f(5 + step * i)} 30`;
      return { viewBox: "0 0 300 60", nodes: [{ t: "path", a: { d, fill: "none", stroke: "accent", "stroke-width": f(k(v, "width", 6)), "stroke-linecap": "round", "stroke-linejoin": "round" } }] };
    },
  },
  {
    key: "underline", label: () => tr("خط فرشاة", "Brush underline"),
    knobs: [knob("curve", () => tr("الانحناء", "Curve"), -20, 20, 8), knob("width", () => tr("سمك الخط", "Line width"), 2, 20, 8)],
    make: (v) => {
      const c = k(v, "curve", 8);
      return { viewBox: "0 0 300 40", nodes: [{ t: "path", a: { d: `M8 ${f(24 + c / 2)} C 90 ${f(24 - c)} 210 ${f(24 - c)} 292 ${f(20 + c / 3)}`, fill: "none", stroke: "accent", "stroke-width": f(k(v, "width", 8)), "stroke-linecap": "round" } }] };
    },
  },
  {
    key: "ring", label: () => tr("حلقة", "Ring"),
    knobs: [knob("dashes", () => tr("التقطيع (0 = كامل)", "Dashes (0 = whole)"), 0, 40, 0), knob("width", () => tr("سمك الخط", "Line width"), 1, 20, 4)],
    make: (v) => {
      const dashes = k(v, "dashes", 0);
      const len = (2 * Math.PI * 88) / Math.max(1, dashes);
      return { viewBox: "0 0 200 200", nodes: [{ t: "circle", a: { cx: "100", cy: "100", r: "88", fill: "none", stroke: "accent", "stroke-width": f(k(v, "width", 4)), "stroke-linecap": "round", ...(dashes ? { "stroke-dasharray": `${f(len * 0.55)} ${f(len * 0.45)}` } : {}) } }] };
    },
  },
  {
    key: "star", label: () => tr("نجمة", "Star"),
    knobs: [knob("points", () => tr("الرؤوس", "Points"), 4, 16, 5), knob("inner", () => tr("النحافة", "Thinness"), 0.2, 0.9, 0.45, 0.05)],
    make: (v) => {
      const [points, inner] = [k(v, "points", 5), k(v, "inner", 0.45)];
      const pts = around(points * 2, (i) => (i % 2 ? 90 * inner : 90));
      return { viewBox: "0 0 200 200", nodes: [{ t: "polygon", a: { points: pts.map(([x, y]) => `${f(x)},${f(y)}`).join(" "), fill: "accent", "stroke-linejoin": "round" } }] };
    },
  },
  {
    key: "seal", label: () => tr("ختم مموّج", "Wavy seal"),
    knobs: [knob("bumps", () => tr("التموّجات", "Bumps"), 8, 30, 16), knob("depth", () => tr("العمق", "Depth"), 2, 16, 6)],
    make: (v) => ({ viewBox: "0 0 200 200", morph: sealPath(k(v, "bumps", 16), -k(v, "depth", 6)), nodes: [{ t: "path", a: { d: sealPath(k(v, "bumps", 16), k(v, "depth", 6)), fill: "accent" } }] }),
  },
  {
    key: "sparkle", label: () => tr("لمعة", "Sparkle"),
    knobs: [knob("sharp", () => tr("الحدّة", "Sharpness"), 5, 45, 22)],
    make: (v) => {
      const s = k(v, "sharp", 22);
      const d = (q: number) => `M100 5 Q ${f(100 + q)} ${f(100 - q)} 195 100 Q ${f(100 + q)} ${f(100 + q)} 100 195 Q ${f(100 - q)} ${f(100 + q)} 5 100 Q ${f(100 - q)} ${f(100 - q)} 100 5 Z`;
      return { viewBox: "0 0 200 200", morph: d(Math.min(60, s + 22)), nodes: [{ t: "path", a: { d: d(s), fill: "accent" } }] };
    },
  },
  {
    key: "arrow", label: () => tr("سهم مرسوم", "Drawn arrow"),
    knobs: [knob("bend", () => tr("الانحناء", "Bend"), -60, 60, 30), knob("width", () => tr("سمك الخط", "Line width"), 2, 12, 5)],
    make: (v) => {
      const b = k(v, "bend", 30);
      const line = { fill: "none", stroke: "accent", "stroke-width": f(k(v, "width", 5)), "stroke-linecap": "round", "stroke-linejoin": "round" };
      return { viewBox: "0 0 240 120", nodes: [{ t: "path", a: { d: `M15 ${f(90)} Q 120 ${f(60 - b)} 215 40`, ...line } }, { t: "path", a: { d: "M190 30 L 215 40 L 200 63", ...line } }] };
    },
  },
  {
    key: "heart", label: () => tr("قلب", "Heart"),
    knobs: [],
    make: () => ({ viewBox: "0 0 200 200", nodes: [{ t: "path", a: { d: "M100 175 C 40 130 10 95 10 62 C 10 35 32 15 58 15 C 78 15 92 26 100 42 C 108 26 122 15 142 15 C 168 15 190 35 190 62 C 190 95 160 130 100 175 Z", fill: "accent" } }] }),
  },
  {
    key: "arch", label: () => tr("إطار قوس", "Arch frame"),
    knobs: [knob("width", () => tr("سمك الخط", "Line width"), 1, 12, 3)],
    make: (v) => ({ viewBox: "0 0 200 260", nodes: [{ t: "path", a: { d: "M10 250 L10 100 A 90 90 0 0 1 190 100 L190 250 Z", fill: "none", stroke: "accent", "stroke-width": f(k(v, "width", 3)), "stroke-linejoin": "round" } }] }),
  },
  {
    key: "dots", label: () => tr("نقاط", "Dots"),
    knobs: [knob("cols", () => tr("بالعرض", "Across"), 2, 12, 6), knob("rows", () => tr("بالطول", "Down"), 1, 8, 4), knob("size", () => tr("الحجم", "Size"), 1, 10, 4)],
    make: (v) => {
      const [cols, rows, size] = [k(v, "cols", 6), k(v, "rows", 4), k(v, "size", 4)];
      const gap = 24;
      const nodes = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) nodes.push({ t: "circle", a: { cx: f(gap / 2 + c * gap), cy: f(gap / 2 + r * gap), r: f(size), fill: "accent" } });
      return { viewBox: `0 0 ${cols * gap} ${rows * gap}`, nodes };
    },
  },
  {
    key: "petal", label: () => tr("ورقة وردة", "Petal"),
    knobs: [knob("curve", () => tr("الامتلاء", "Fullness"), 20, 90, 55)],
    make: (v) => {
      const c = k(v, "curve", 55);
      return { viewBox: "0 0 200 200", nodes: [{ t: "path", a: { d: `M100 190 C ${f(100 - c * 1.4)} ${f(150 - c / 2)} ${f(100 - c)} 40 100 10 C ${f(100 + c)} 40 ${f(100 + c * 1.4)} ${f(150 - c / 2)} 100 190 Z`, fill: "accent-soft", stroke: "accent", "stroke-width": "3" } }] };
    },
  },
];

export const shapeByKey = (key: unknown) => SHAPES.find((s) => s.key === key);
export const defaultsOf = (s: ShapeDef) => Object.fromEntries(s.knobs.map((kn) => [kn.key, kn.def]));
