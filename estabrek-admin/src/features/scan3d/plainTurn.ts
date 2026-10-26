/**
 * A 360° view from a plain video (no printed mat): the product turns once in front of the
 * camera, on a turntable or by hand. One turn is found by comparing small grey frames
 * with the first: they drift apart as it turns away, and the frame most like the first
 * once it has come back round ends the turn. The admin can move both ends. A product that
 * looks the same all round (a plain bottle) gives no answer: the turn is then marked by
 * hand. Then `count` frames evenly round the turn, and the sheet's grid.
 */
export type Grey = { w: number; h: number; data: Uint8Array };
type Rgba = { w: number; h: number; data: Uint8ClampedArray };

/** A frame as a small grey picture (`size` pixels wide), for comparing. */
export function greyOf(img: Rgba, size = 48): Grey {
  const w = Math.max(1, Math.min(size, img.w));
  const h = Math.max(1, Math.round((img.h * w) / img.w));
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor((y * img.h) / h);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * img.h) / h));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor((x * img.w) / w);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * img.w) / w));
      let sum = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy += Math.max(1, (y1 - y0) >> 2))
        for (let xx = x0; xx < x1; xx += Math.max(1, (x1 - x0) >> 2)) {
          const i = (yy * img.w + xx) * 4;
          sum += img.data[i] * 0.299 + img.data[i + 1] * 0.587 + img.data[i + 2] * 0.114;
          n++;
        }
      out[y * w + x] = Math.round(sum / n);
    }
  }
  return { w, h, data: out };
}

/** How different two grey frames are: 0 (the same) to 1. */
export function difference(a: Grey, b: Grey): number {
  if (a.w !== b.w || a.h !== b.h) return 1;
  let sum = 0;
  for (let i = 0; i < a.data.length; i++) sum += Math.abs(a.data[i] - b.data[i]);
  return sum / (a.data.length * 255);
}

export type Turn = { start: number; end: number; score: number };

/**
 * One turn from the first frame: the frame most like it after it turned away (at least
 * `minFrames` on), before it turns away a second time. Null when it never turns away
 * (it looks the same all round) or never comes back (less than one turn filmed).
 */
export function findTurn(frames: Grey[], times: number[], opts: { minFrames?: number } = {}): Turn | null {
  if (frames.length < 6) return null;
  const d = frames.map((f) => difference(frames[0], f));
  const top = Math.max(...d);
  if (top < 0.02) return null;
  const minFrames = opts.minFrames ?? 4;
  let away = -1;
  for (let k = minFrames; k < d.length; k++) if (d[k] >= top * 0.55) {
    away = k;
    break;
  }
  if (away < 0) return null;
  let best = -1;
  for (let k = away + 1; k < d.length; k++) {
    if (best < 0 || d[k] < d[best]) best = k;
    // Came back near the start and is turning away again: that was the end of the first turn.
    if (d[best] < top * 0.35 && d[k] > top * 0.55) break;
  }
  if (best < 0 || d[best] > top * 0.5) return null;
  return { start: times[0], end: times[best], score: Math.round((1 - d[best] / top) * 100) / 100 };
}

/** `count` times evenly round a turn (its end is its start again, so it isn't taken twice). */
export function turnTimes(start: number, end: number, count: number): number[] {
  const span = Math.max(0, end - start);
  return Array.from({ length: count }, (_, k) => Math.round((start + (span * k) / count) * 1000) / 1000);
}

/** The sheet's grid for `count` cells of `cellW`×`cellH`: about square. */
export function sheetGrid(count: number, cellW: number, cellH: number) {
  const cols = Math.max(1, Math.ceil(Math.sqrt((count * cellH) / Math.max(1, cellW))));
  return { cols, rows: Math.ceil(count / cols) };
}

/** Where the product is in a mask (alpha above `cut`), or null when there's none. */
export function maskBox(mask: Uint8ClampedArray | Uint8Array, w: number, h: number, cut = 24) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (mask[y * w + x] > cut) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** The box around every frame's product, with room (5 % each side), kept inside the picture. */
export function unionBox(boxes: Array<{ x0: number; y0: number; x1: number; y1: number } | null>, w: number, h: number) {
  const b = { x0: w, y0: h, x1: -1, y1: -1 };
  for (const x of boxes) if (x) {
    b.x0 = Math.min(b.x0, x.x0);
    b.y0 = Math.min(b.y0, x.y0);
    b.x1 = Math.max(b.x1, x.x1);
    b.y1 = Math.max(b.y1, x.y1);
  }
  if (b.x1 < 0) return { x0: 0, y0: 0, x1: w - 1, y1: h - 1 };
  const mx = Math.round((b.x1 - b.x0) * 0.05) + 1;
  const my = Math.round((b.y1 - b.y0) * 0.05) + 1;
  return { x0: Math.max(0, b.x0 - mx), y0: Math.max(0, b.y0 - my), x1: Math.min(w - 1, b.x1 + mx), y1: Math.min(h - 1, b.y1 + my) };
}
