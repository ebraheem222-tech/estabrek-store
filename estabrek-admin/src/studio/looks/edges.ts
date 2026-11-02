/**
 * Ready section edges (phase 10), drawn by formulas as bands 1440 × 120 whose lower part is
 * filled (the next section's colour): waves of every height and count, layered waves,
 * zigzags, scallops, curves, slopes, peaks and notches, steps and blocks, and seeded
 * mountains, clouds, drips, torn paper, skylines, grass and ripples. They become the page's
 * drawings the way the old library's do (decor.ts), so only shapes and colours reach it.
 */
import { tr } from "../../lib/words";
import { both, type Ready } from "./core";

const W = 1440;
const H = 120;
const r1 = (v: number) => Math.round(v * 10) / 10;
const svg = (...paths: Array<[string, number?]>) =>
  `<svg viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">${paths.map(([d, o]) => `<path d="${d}" fill="currentColor"${o !== undefined && o < 1 ? ` opacity="${o}"` : ""}/>`).join("")}</svg>`;
const close = (d: string) => `${d}V${H}H0Z`;
/** A seeded random (mulberry32), so a drawing is the same every time. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth waves: `n` crests across, `amp` high around `mid`, starting up or down. */
function wave(n: number, amp: number, mid: number, down = false) {
  const half = W / (2 * n);
  let d = `M0 ${mid}Q${r1(half / 2)} ${r1(down ? mid + amp : mid - amp)} ${r1(half)} ${mid}`;
  for (let x = 2 * half; x <= W + 0.5; x += half) d += `T${r1(x)} ${mid}`;
  return close(d);
}
/** Points across as a line, then closed below. */
const line = (pts: Array<[number, number]>) => close(`M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join("L")}`);
function zigzag(teeth: number, depth: number, top = 40) {
  const step = W / teeth;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= teeth; i++) pts.push([i * step, top + (i % 2 ? depth : 0)]);
  return line(pts);
}
function scallops(n: number, top = 60, up = true) {
  const w = W / n;
  const r = w / 2;
  let d = `M0 ${top}`;
  for (let i = 1; i <= n; i++) d += `A${r1(r)} ${r1(r)} 0 0 ${up ? 1 : 0} ${r1(i * w)} ${top}`;
  return close(d);
}
const curve = (edge: number, middle: number) => close(`M0 ${edge}Q${W / 2} ${middle} ${W} ${edge}`);
function steps(n: number, from: number, to: number) {
  const w = W / n;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const y = from + ((to - from) * i) / (n - 1);
    pts.push([i * w, y], [(i + 1) * w, y]);
  }
  return line(pts);
}
function blocks(n: number, high: number, low: number) {
  const w = W / (2 * n);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 2 * n; i++) pts.push([i * w, i % 2 ? low : high], [(i + 1) * w, i % 2 ? low : high]);
  return line(pts);
}
function mountains(seed: number, peaks: number, low: number, high: number) {
  const rnd = seeded(seed);
  const pts: Array<[number, number]> = [[0, low + rnd() * 20]];
  for (let i = 1; i <= peaks * 2; i++) pts.push([(i * W) / (peaks * 2), i % 2 ? high + rnd() * (low - high) * 0.5 : low - rnd() * 15]);
  return line(pts);
}
function torn(seed: number, mid: number, rough: number) {
  const rnd = seeded(seed);
  const pts: Array<[number, number]> = [];
  for (let x = 0; x <= W; x += 24) pts.push([x, mid + (rnd() - 0.5) * rough]);
  return line(pts);
}
function clouds(seed: number, n: number, base: number) {
  const rnd = seeded(seed);
  const w = W / n;
  let d = `M0 ${base}`;
  for (let i = 1; i <= n; i++) {
    const r = r1(w / 2 + rnd() * w * 0.1);
    d += `A${r} ${r1(r * (0.6 + rnd() * 0.5))} 0 0 1 ${r1(i * w)} ${base}`;
  }
  return close(d);
}
function drips(seed: number, n: number, top: number) {
  const rnd = seeded(seed);
  let d = `M0 ${top}`;
  for (let i = 0; i < n; i++) {
    const x0 = (i * W) / n;
    const w = W / n;
    const len = 18 + rnd() * 50;
    d += `L${r1(x0 + w * 0.3)} ${top}C${r1(x0 + w * 0.3)} ${r1(top - len)} ${r1(x0 + w * 0.7)} ${r1(top - len)} ${r1(x0 + w * 0.7)} ${top}L${r1(x0 + w)} ${top}`;
  }
  return close(d);
}
function skyline(seed: number) {
  const rnd = seeded(seed);
  const pts: Array<[number, number]> = [];
  let x = 0;
  while (x < W) {
    const w = 30 + rnd() * 70;
    const y = 20 + rnd() * 70;
    pts.push([x, y], [Math.min(W, x + w), y]);
    x += w;
  }
  return line(pts);
}
function grass(seed: number, n: number) {
  const rnd = seeded(seed);
  const pts: Array<[number, number]> = [[0, 100]];
  for (let i = 0; i < n; i++) {
    const x = (i * W) / n;
    pts.push([x + W / n / 2, 100 - 20 - rnd() * 70], [x + W / n, 100]);
  }
  return line(pts);
}
function ripples(a: number, b: number, mid: number) {
  const pts: Array<[number, number]> = [];
  for (let x = 0; x <= W; x += 20) pts.push([x, mid + a * Math.sin((x / W) * Math.PI * 4) + b * Math.sin((x / W) * Math.PI * 13)]);
  return line(pts);
}

const N: Record<string, () => string> = {
  wave: () => tr("موجة", "Wave"),
  layers: () => tr("موجات طبقات", "Layered waves"),
  zigzag: () => tr("زيكزاك", "Zigzag"),
  scallop: () => tr("أقواس صغيرة", "Scallops"),
  curve: () => tr("منحنى", "Curve"),
  slope: () => tr("مائل", "Slope"),
  peak: () => tr("رأس ونقرة", "Peaks and notches"),
  steps: () => tr("درج ومكعبات", "Steps and blocks"),
  nature: () => tr("طبيعة", "Nature"),
  paper: () => tr("ورق وألوان", "Paper and paint"),
  city: () => tr("مدينة", "City"),
};
export const EDGE_GROUPS = Object.keys(N).map((k) => [k, N[k]] as const);
const SIZE: Record<string, () => string> = { low: () => tr("واطية", "Low"), mid: () => tr("وسط", "Medium"), high: () => tr("عالية", "High") };
const COUNT: Record<number, () => string> = { 1: () => tr("وحدة", "One"), 2: () => tr("اتنين", "Two"), 3: () => tr("تلاتة", "Three"), 4: () => tr("أربعة", "Four"), 6: () => tr("ستة", "Six") };
const nth = (i: number) => () => `${i}`;
const out: Ready[] = [];
const edge = (id: string, group: string, name: () => string, art: string) => out.push({ id: `edge-${id}`, kind: "edge", group, name, edge: art });

for (const [k, amp] of [["low", 14], ["mid", 28], ["high", 44]] as const)
  for (const n of [1, 2, 3, 4] as const) edge(`wave-${k}-${n}`, "wave", both(both(N.wave, SIZE[k]), COUNT[n]), svg([wave(n, amp, 60, n % 2 === 0)]));
for (const n of [2, 3, 4, 6] as const) edge(`layers-${n}`, "layers", both(N.layers, COUNT[n]), svg([wave(n, 26, 40), 0.3], [wave(n, 22, 60, true), 0.55], [wave(n, 18, 80)]));
for (const n of [2, 3] as const) edge(`layers-soft-${n}`, "layers", both(both(N.layers, () => tr("ناعمة", "Soft")), COUNT[n]), svg([wave(n, 30, 50), 0.4], [wave(n + 1, 20, 76, true)]));
for (const [teeth, depth] of [[8, 40], [16, 30], [24, 24], [40, 16], [60, 10]] as const) edge(`zigzag-${teeth}`, "zigzag", both(N.zigzag, nth(teeth)), svg([zigzag(teeth, depth)]));
for (const n of [6, 10, 16, 24, 36] as const) edge(`scallop-${n}`, "scallop", both(N.scallop, nth(n)), svg([scallops(n)]));
for (const n of [6, 12] as const) edge(`scallop-down-${n}`, "scallop", both(both(N.scallop, () => tr("مقلوبة", "Upside down")), nth(n)), svg([scallops(n, 40, false)]));
for (const [k, e, m] of [["up-low", 80, 40], ["up-high", 110, 0], ["down-low", 40, 90], ["down-high", 10, 120], ["soft", 70, 30]] as const)
  edge(`curve-${k}`, "curve", both(N.curve, nth(out.filter((x) => x.group === "curve").length + 1)), svg([curve(e, m)]));
edge("curve-side", "curve", both(N.curve, () => tr("من الجنب", "From the side")), svg([close(`M0 110C480 110 960 10 ${W} 0`)]));
edge("curve-s", "curve", both(N.curve, () => tr("حرف S", "S-shaped")), svg([close(`M0 20C480 20 960 100 ${W} 100`)]));
edge("curve-hill", "curve", both(N.curve, () => tr("تلة", "A hill")), svg([close(`M0 110C360 110 520 20 720 20C920 20 1080 110 ${W} 110`)]));
edge("curve-valley", "curve", both(N.curve, () => tr("وادي", "A valley")), svg([close(`M0 20C360 20 520 110 720 110C920 110 1080 20 ${W} 20`)]));
for (const [k, a, b] of [["gentle", 90, 60], ["mid", 110, 30], ["steep", 120, 0]] as const) {
  edge(`slope-${k}`, "slope", both(N.slope, SIZE[k === "gentle" ? "low" : k === "mid" ? "mid" : "high"]), svg([line([[0, a], [W, b]])]));
  edge(`slope-layers-${k}`, "slope", both(both(N.slope, () => tr("طبقتين", "Two layers")), SIZE[k === "gentle" ? "low" : k === "mid" ? "mid" : "high"]), svg([line([[0, b], [W, a]]), 0.35], [line([[0, a], [W, b]])]));
}
for (const [k, top, low] of [["low", 80, 120], ["mid", 50, 120], ["high", 10, 120]] as const) {
  edge(`peak-${k}`, "peak", both(() => tr("رأس بالنص", "A point in the middle"), SIZE[k]), svg([line([[0, low - 1], [W / 2, top], [W, low - 1]])]));
  edge(`notch-${k}`, "peak", both(() => tr("نقرة بالنص", "A notch in the middle"), SIZE[k]), svg([line([[0, top], [W / 2, low - 1], [W, top]])]));
  edge(`arrow-${k}`, "peak", both(() => tr("سهم صغير", "A small arrow"), SIZE[k]), svg([line([[0, 70], [W / 2 - 60, 70], [W / 2, 70 - (120 - top) / 3], [W / 2 + 60, 70], [W, 70]])]));
}
for (const n of [3, 5, 8] as const) edge(`steps-${n}`, "steps", both(() => tr("درج", "Steps"), nth(n)), svg([steps(n, 100, 20)]));
for (const n of [10, 20, 36] as const) edge(`blocks-${n}`, "steps", both(() => tr("مكعبات", "Blocks"), nth(n)), svg([blocks(n, 50, 80)]));
for (let s = 1; s <= 6; s++) edge(`mountains-${s}`, "nature", both(() => tr("جبال", "Mountains"), nth(s)), svg([mountains(s * 97, 4 + (s % 3) * 2, 100, 20)]));
edge("mountains-layers", "nature", () => tr("جبال طبقات", "Layered mountains"), svg([mountains(11, 5, 80, 5), 0.35], [mountains(23, 7, 105, 40)]));
for (let s = 1; s <= 4; s++) edge(`clouds-${s}`, "nature", both(() => tr("غيوم", "Clouds"), nth(s)), svg([clouds(s * 31, 5 + s * 2, 80)]));
for (let s = 1; s <= 3; s++) edge(`grass-${s}`, "nature", both(() => tr("عشب", "Grass"), nth(s)), svg([grass(s * 53, 60 + s * 30)]));
for (let s = 1; s <= 4; s++) edge(`drips-${s}`, "paper", both(() => tr("نقاط دهان", "Paint drips"), nth(s)), svg([drips(s * 41, 8 + s * 2, 60)]));
for (let s = 1; s <= 4; s++) edge(`torn-${s}`, "paper", both(() => tr("ورق ممزّق", "Torn paper"), nth(s)), svg([torn(s * 67, 60, 18 + s * 6)]));
edge("torn-layers", "paper", () => tr("ورق ممزّق طبقتين", "Two layers of torn paper"), svg([torn(5, 45, 30), 0.35], [torn(9, 70, 22)]));
for (const [k, a, b] of [["calm", 10, 3], ["busy", 16, 6], ["choppy", 8, 10], ["deep", 24, 4]] as const) edge(`ripples-${k}`, "wave", both(() => tr("تموّجات", "Ripples"), nth(["calm", "busy", "choppy", "deep"].indexOf(k) + 1)), svg([ripples(a, b, 60)]));
for (let s = 1; s <= 3; s++) edge(`skyline-${s}`, "city", both(() => tr("أفق مدينة", "A skyline"), nth(s)), svg([skyline(s * 19)]));
edge("city-layers", "city", () => tr("مدينة طبقتين", "A city in two layers"), svg([skyline(77), 0.35], [skyline(13)]));
for (const [k, n, big, small] of [["even", 12, 50, 50], ["mixed", 9, 70, 36], ["tiny", 30, 24, 24]] as const) {
  const w = W / n;
  let d = "M0 100";
  for (let i = 0; i < n; i++) {
    const r = r1((i % 2 ? small : big) * (w / 100) * 0.9);
    d += `L${r1(i * w + w / 2 - r)} 100A${r} ${r} 0 0 1 ${r1(i * w + w / 2 + r)} 100L${r1((i + 1) * w)} 100`;
  }
  edge(`bumps-${k}`, "scallop", both(() => tr("فقاعات", "Bubbles"), nth(n)), svg([close(d)]));
}
edge("zigzag-layers", "zigzag", () => tr("زيكزاك طبقتين", "Two layers of zigzag"), svg([zigzag(12, 36, 30), 0.35], [zigzag(20, 26, 60)]));
edge("zigzag-soft-layers", "zigzag", () => tr("زيكزاك ناعم طبقتين", "Two layers of soft zigzag"), svg([zigzag(30, 14, 50), 0.4], [zigzag(46, 10, 72)]));
edge("curve-layers", "curve", () => tr("منحنى طبقتين", "Two curves"), svg([curve(100, 0), 0.35], [curve(110, 40)]));
edge("curve-layers-down", "curve", () => tr("منحنى طبقتين لتحت", "Two curves downwards"), svg([curve(20, 120), 0.35], [curve(50, 110)]));
for (const [k, n, r] of [["small", 40, 6], ["big", 18, 12]] as const) {
  let d = "M0 104H1440V120H0Z";
  for (let i = 0; i < n; i++) {
    const cx = r1((i + 0.5) * (W / n));
    d += `M${r1(cx - r)} 84A${r} ${r} 0 1 0 ${r1(cx + r)} 84A${r} ${r} 0 1 0 ${r1(cx - r)} 84Z`;
  }
  edge(`dots-${k}`, "paper", both(() => tr("صف نقاط", "A row of dots"), nth(n)), svg([d]));
}
edge("wave-sharp", "wave", () => tr("موجة حادة", "A sharp wave"), svg([line([[0, 70], [180, 30], [360, 70], [540, 20], [720, 80], [900, 40], [1080, 90], [1260, 50], [1440, 60]])]));

/** Every ready section edge. */
export const EDGES: Ready[] = out;
