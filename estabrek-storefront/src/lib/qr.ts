/**
 * A small QR code maker (no dependency) for ticket codes and short links.
 * Byte mode, error correction L, versions 1–5 (one block each: up to 106
 * bytes). Picks the mask with the lowest penalty, like the standard says.
 * Returns the module grid (true = dark), without the quiet zone.
 */

// Versions 1–5 at level L: [data codewords, error-correction codewords]; each is a single block.
const CAPACITY: Array<[number, number]> = [
  [0, 0],
  [19, 7],
  [34, 10],
  [55, 15],
  [80, 20],
  [108, 26],
];

function gfMul(x: number, y: number) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function rsDivisor(degree: number) {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]) {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => (result[i] ^= gfMul(coef, factor)));
  }
  return result;
}

function utf8(text: string) {
  return Array.from(new TextEncoder().encode(text));
}

function codewords(bytes: number[], version: number) {
  const [dataLen, ecLen] = CAPACITY[version];
  const bits: number[] = [];
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  push(0b0100, 4); // byte mode
  push(bytes.length, 8); // versions 1–9: 8-bit count
  for (const b of bytes) push(b, 8);
  const cap = dataLen * 8;
  push(0, Math.min(4, cap - bits.length));
  while (bits.length % 8) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; data.length < dataLen; pad ^= 0xec ^ 0x11) data.push(pad);
  return [...data, ...rsRemainder(data, rsDivisor(ecLen))];
}

type Grid = { size: number; dark: boolean[][]; fixed: boolean[][] };

function setFixed(g: Grid, x: number, y: number, dark: boolean) {
  g.dark[y][x] = dark;
  g.fixed[y][x] = true;
}

function drawFunctionPatterns(g: Grid, version: number) {
  const n = g.size;
  for (let i = 0; i < n; i++) {
    setFixed(g, 6, i, i % 2 === 0);
    setFixed(g, i, 6, i % 2 === 0);
  }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx, y = cy + dy;
        if (x >= 0 && x < n && y >= 0 && y < n) setFixed(g, x, y, d !== 2 && d !== 4);
      }
  };
  finder(3, 3);
  finder(n - 4, 3);
  finder(3, n - 4);
  if (version >= 2) {
    const c = n - 7; // the one alignment pattern of versions 2–6
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFixed(g, c + dx, c + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  drawFormat(g, 0); // reserves the format areas
}

function drawFormat(g: Grid, mask: number) {
  const n = g.size;
  const data = (1 << 3) | mask; // level L = 01
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const bit = (i: number) => ((bits >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) setFixed(g, 8, i, bit(i));
  setFixed(g, 8, 7, bit(6));
  setFixed(g, 8, 8, bit(7));
  setFixed(g, 7, 8, bit(8));
  for (let i = 9; i < 15; i++) setFixed(g, 14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) setFixed(g, n - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) setFixed(g, 8, n - 15 + i, bit(i));
  setFixed(g, 8, n - 8, true); // the dark module
}

function drawData(g: Grid, data: number[]) {
  const n = g.size;
  let i = 0;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? n - 1 - vert : vert;
        if (!g.fixed[y][x] && i < data.length * 8) {
          g.dark[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
  }
}

const MASKS: Array<(x: number, y: number) => boolean> = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function applyMask(g: Grid, mask: number) {
  for (let y = 0; y < g.size; y++) for (let x = 0; x < g.size; x++) if (!g.fixed[y][x] && MASKS[mask](x, y)) g.dark[y][x] = !g.dark[y][x];
}

/** The standard's penalty score (lower reads better). */
function penalty(m: boolean[][]) {
  const n = m.length;
  let score = 0;
  const lines = (get: (a: number, b: number) => boolean) => {
    for (let a = 0; a < n; a++) {
      let run = 1;
      for (let b = 1; b <= n; b++) {
        if (b < n && get(a, b) === get(a, b - 1)) run++;
        else {
          if (run >= 5) score += 3 + (run - 5);
          run = 1;
        }
      }
      // finder-like 1:1:3:1:1 with 4 light on a side
      for (let b = 0; b + 10 < n + 0; b++) {
        const seq = Array.from({ length: 11 }, (_, k) => get(a, b + k));
        const p1 = [true, false, true, true, true, false, true, false, false, false, false];
        const p2 = [false, false, false, false, true, false, true, true, true, false, true];
        if (seq.every((v, k) => v === p1[k]) || seq.every((v, k) => v === p2[k])) score += 40;
      }
    }
  };
  lines((y, x) => m[y][x]);
  lines((x, y) => m[y][x]);
  for (let y = 0; y + 1 < n; y++) for (let x = 0; x + 1 < n; x++) {
    const c = m[y][x];
    if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
  }
  let dark = 0;
  for (const row of m) for (const v of row) if (v) dark++;
  const total = n * n;
  score += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
  return score;
}

export function qrMatrix(text: string): boolean[][] {
  const bytes = utf8(text);
  const version = CAPACITY.findIndex(([d], v) => v > 0 && bytes.length + 2 <= d);
  if (version < 1) throw new Error("QR text too long");
  const data = codewords(bytes, version);
  const size = 17 + version * 4;
  let best: boolean[][] | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const g: Grid = { size, dark: Array.from({ length: size }, () => new Array(size).fill(false)), fixed: Array.from({ length: size }, () => new Array(size).fill(false)) };
    drawFunctionPatterns(g, version);
    drawData(g, data);
    applyMask(g, mask);
    drawFormat(g, mask);
    const s = penalty(g.dark);
    if (s < bestScore) {
      bestScore = s;
      best = g.dark;
    }
  }
  return best!;
}

/** An SVG path ("M x y h1 v1 h-1 z" per dark module) for a viewBox of size + 2*margin. */
export function qrPath(m: boolean[][], margin = 4) {
  let d = "";
  m.forEach((row, y) => row.forEach((v, x) => { if (v) d += `M${x + margin} ${y + margin}h1v1h-1z`; }));
  return { d, size: m.length + margin * 2 };
}
