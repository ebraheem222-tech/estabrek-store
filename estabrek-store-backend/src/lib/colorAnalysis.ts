import sharp from "sharp";

type RGB = { r: number; g: number; b: number };

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function rgbToHex(rgb: RGB): string {
  const r = Math.max(0, Math.min(255, Math.round(rgb.r)));
  const g = Math.max(0, Math.min(255, Math.round(rgb.g)));
  const b = Math.max(0, Math.min(255, Math.round(rgb.b)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
}

export function hexToRgb(hex: string): RGB | null {
  const h = (hex || "").trim().replace("#", "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    if ([r, g, b].some((x) => Number.isNaN(x))) return null;
    return { r, g, b };
  }
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return { r, g, b };
}

export function colorDistance(a: RGB, b: RGB) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function rgbToHsv({ r, g, b }: RGB) {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h = h * 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

export function nameColor(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "Color";
  const { h, s, v } = rgbToHsv(rgb);

  // black/white/gray first
  if (v < 0.15) return "Black";
  if (v > 0.9 && s < 0.12) return "White";
  if (s < 0.18) return "Gray";

  // hue buckets
  if (h < 15 || h >= 345) return "Red";
  if (h < 40) return "Orange";
  if (h < 70) return "Yellow";
  if (h < 160) return "Green";
  if (h < 200) return "Teal";
  if (h < 255) return "Blue";
  if (h < 290) return "Purple";
  if (h < 345) return "Pink";
  return "Color";
}

function samplePixels(data: Buffer, channels: number, step: number) {
  const out: RGB[] = [];
  for (let i = 0; i < data.length; i += channels * step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r === undefined || g === undefined || b === undefined) break;
    // ignore transparent pixels if alpha exists
    if (channels === 4) {
      const a = data[i + 3];
      if (a !== undefined && a < 10) continue;
    }
    out.push({ r, g, b });
  }
  return out;
}

function kmeans(pixels: RGB[], k: number, iters: number) {
  if (!pixels.length) return { centers: [] as RGB[], counts: [] as number[] };
  const kk = Math.max(1, Math.min(k, pixels.length));

  // init centers from random samples
  const centers: RGB[] = [];
  const used = new Set<number>();
  while (centers.length < kk) {
    const idx = Math.floor(Math.random() * pixels.length);
    if (used.has(idx)) continue;
    used.add(idx);
    centers.push({ ...pixels[idx] });
  }

  const counts = new Array(kk).fill(0);
  const sums = new Array(kk).fill(0).map(() => ({ r: 0, g: 0, b: 0 }));

  for (let iter = 0; iter < iters; iter++) {
    counts.fill(0);
    for (const s of sums) { s.r = 0; s.g = 0; s.b = 0; }

    for (const p of pixels) {
      let best = 0;
      let bestD = Infinity;
      for (let j = 0; j < kk; j++) {
        const d = colorDistance(p, centers[j]);
        if (d < bestD) { bestD = d; best = j; }
      }
      counts[best]++;
      sums[best].r += p.r;
      sums[best].g += p.g;
      sums[best].b += p.b;
    }

    for (let j = 0; j < kk; j++) {
      if (counts[j] > 0) {
        centers[j] = {
          r: sums[j].r / counts[j],
          g: sums[j].g / counts[j],
          b: sums[j].b / counts[j],
        };
      }
    }
  }

  return { centers, counts };
}

export async function extractDominantAndPaletteFromFile(filePath: string, k = 5) {
  // use a small size for speed
  const { data, info } = await sharp(filePath, { failOnError: false })
    .rotate()
    .resize({ width: 80, height: 80, fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels ?? 3;
  const step = 2; // sample every 2 pixels
  const pixels = samplePixels(data, channels, step);
  if (!pixels.length) return { dominantColorHex: null as string | null, palette: [] as string[] };

  const { centers, counts } = kmeans(pixels, k, 8);
  if (!centers.length) return { dominantColorHex: null, palette: [] };

  const ordered = centers
    .map((c, i) => ({ hex: rgbToHex(c), count: counts[i] ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const palette = Array.from(new Set(ordered.map((x) => x.hex))).slice(0, k);
  const dominantColorHex = palette[0] ?? ordered[0]?.hex ?? null;

  return { dominantColorHex, palette };
}

export function autoGroupByColor<T extends { dominantColorHex?: string | null }>(
  items: T[],
  opts?: { threshold?: number }
) {
  const threshold = opts?.threshold ?? 42; // RGB distance
  type Group = { color: RGB; items: T[] };
  const groups: Group[] = [];

  for (const it of items) {
    const rgb = it.dominantColorHex ? hexToRgb(it.dominantColorHex) : null;
    if (!rgb) {
      groups.push({ color: { r: 0, g: 0, b: 0 }, items: [it] });
      continue;
    }

    let best: Group | null = null;
    let bestD = Infinity;
    for (const g of groups) {
      const d = colorDistance(rgb, g.color);
      if (d < bestD) { bestD = d; best = g; }
    }

    if (best && bestD <= threshold) {
      best.items.push(it);
      // update group representative as running mean
      const n = best.items.length;
      best.color = {
        r: (best.color.r * (n - 1) + rgb.r) / n,
        g: (best.color.g * (n - 1) + rgb.g) / n,
        b: (best.color.b * (n - 1) + rgb.b) / n,
      };
    } else {
      groups.push({ color: { ...rgb }, items: [it] });
    }
  }

  return groups
    .map((g, idx) => {
      const colorHex = rgbToHex(g.color);
      return {
        id: `g${idx + 1}`,
        colorHex,
        colorName: nameColor(colorHex),
        items: g.items,
      };
    })
    .sort((a, b) => (b.items.length - a.items.length));
}
