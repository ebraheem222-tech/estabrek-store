/**
 * The printed mat a product turns on while it is filmed (Admin → الوسائط → مسح 3D):
 * two solid dark rings (found in the video as two ellipses: where the turntable is, how
 * high the camera is, how many pixels a millimetre is) and between them a ring of 63
 * dark/light cells (an m-sequence: any visible stretch of it tells how far the mat has
 * turned). The middle stays plain (a dot at the centre only), so it looks the same at any angle.
 * Printed on A4 at 100%; the 10 cm ruler checks the scale; cut along the dashed circle.
 * In colour (deep purple on light green) black, white and grey products stand out from
 * every part of it; the black-and-white one is for printers without colour (a black or
 * white product then loses the bits of it seen over the mat's own black or white).
 */
export const MAT_STYLES = {
  colour: { ink: "#5b1a66", paper: "#a6e9bf" },
  mono: { ink: "#000000", paper: "#ffffff" },
} as const;
export type MatStyle = keyof typeof MAT_STYLES;

/** Millimetres from the centre. */
export const MAT_MM = {
  innerRing: [62, 67],
  code: [71, 86],
  outerRing: [90, 95],
  cut: 98,
} as const;
/** Everything measured against the outer ring's middle (the ellipse found in the video). */
export const MAT_UNIT_MM = (MAT_MM.outerRing[0] + MAT_MM.outerRing[1]) / 2;
const n = (mm: number) => mm / MAT_UNIT_MM;
/** The same radii, 1 = the outer ring's middle. */
export const MAT_R = {
  innerRing: [n(MAT_MM.innerRing[0]), n(MAT_MM.innerRing[1])] as const,
  innerRingMid: n((MAT_MM.innerRing[0] + MAT_MM.innerRing[1]) / 2),
  code: [n(MAT_MM.code[0]), n(MAT_MM.code[1])] as const,
  outerRing: [n(MAT_MM.outerRing[0]), n(MAT_MM.outerRing[1])] as const,
};

/**
 * The ring's cells: a maximum-length sequence of 63 bits (x⁶ + x + 1), 1 = black. Every
 * turn of it is unlike every other (its circular correlation is 63 at one shift, −1 at
 * all others), so even half the ring, the rest hidden by the product, gives the angle.
 */
export const MAT_CODE: readonly number[] = (() => {
  const bits: number[] = [];
  let state = 0b000001;
  for (let i = 0; i < 63; i++) {
    bits.push(state & 1);
    const fb = (state ^ (state >> 1)) & 1; // taps for x^6 + x + 1
    state = (state >> 1) | (fb << 5);
  }
  return bits;
})();
export const MAT_CELL_DEG = 360 / MAT_CODE.length;

/** The cell's colour at an angle on the mat (degrees, any value): 1 black, 0 white. */
export function matBit(deg: number) {
  const k = Math.floor((((deg % 360) + 360) % 360) / MAT_CELL_DEG);
  return MAT_CODE[k % MAT_CODE.length];
}

/** An annulus sector as an SVG path (centre cx, cy; radii r0 < r1; degrees, counter-clockwise on paper = y up). */
function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => {
    const t = (a * Math.PI) / 180;
    return `${(cx + r * Math.cos(t)).toFixed(3)} ${(cy - r * Math.sin(t)).toFixed(3)}`;
  };
  const big = a1 - a0 > 180 ? 1 : 0;
  return `M${p(r1, a0)} A${r1} ${r1} 0 ${big} 0 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${big} 1 ${p(r0, a0)} Z`;
}

/** The whole A4 page, in millimetres, with the words in the admin's language. */
export function matSvg(words: { title: string; print: string; ruler: string; cut: string }, style: MatStyle = "colour") {
  const { ink, paper } = MAT_STYLES[style];
  const cx = 105;
  const cy = 112;
  const cells: string[] = [];
  // Neighbouring black cells as one sector (cleaner print, no hairlines between them).
  let start = -1;
  for (let i = 0; i <= MAT_CODE.length; i++) {
    const on = i < MAT_CODE.length && MAT_CODE[i] === 1;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      cells.push(`<path d="${sector(cx, cy, MAT_MM.code[0], MAT_MM.code[1], start * MAT_CELL_DEG, i * MAT_CELL_DEG)}"/>`);
      start = -1;
    }
  }
  const ring = (r: readonly [number, number]) => `<circle cx="${cx}" cy="${cy}" r="${(r[0] + r[1]) / 2}" fill="none" stroke="${ink}" stroke-width="${r[1] - r[0]}"/>`;
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const x = 55 + i * 10;
    return `<line x1="${x}" y1="232" x2="${x}" y2="${i % 5 === 0 ? 239 : 236}" stroke="#000" stroke-width="0.4"/>`;
  }).join("");
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">
  <rect width="210" height="297" fill="#fff"/>
  <circle cx="${cx}" cy="${cy}" r="${MAT_MM.cut}" fill="${paper}" stroke="#999" stroke-width="0.4" stroke-dasharray="3 2"/>
  ${ring(MAT_MM.outerRing)}
  ${ring(MAT_MM.innerRing)}
  <g fill="${ink}">${cells.join("")}</g>
  <circle cx="${cx}" cy="${cy}" r="1.5" fill="#bbb"/>
  <line x1="55" y1="232" x2="155" y2="232" stroke="#000" stroke-width="0.6"/>
  ${ticks}
  <text x="105" y="246" font-size="4" text-anchor="middle" font-family="sans-serif">${esc(words.ruler)}</text>
  <text x="105" y="262" font-size="5.5" font-weight="bold" text-anchor="middle" font-family="sans-serif">${esc(words.title)}</text>
  <text x="105" y="272" font-size="3.6" text-anchor="middle" font-family="sans-serif">${esc(words.print)}</text>
  <text x="105" y="280" font-size="3.6" text-anchor="middle" font-family="sans-serif">${esc(words.cut)}</text>
</svg>`;
}
