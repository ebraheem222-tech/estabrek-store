/**
 * The pixel work behind «شيل الخلفية» (bgRemove.ts), with no browser APIs so it can be
 * tested and used in a worker:
 * - the model's input (a square photo → three normalised planes) and its output
 *   (logits → a mask);
 * - masks: one byte a pixel, 0 = background, 255 = the product, row by row;
 * - the cut-out (the mask as alpha) and the same flattened onto white or a colour;
 * - the fix-up brush (keep / erase, size, soft edge) and its undo, kept as patches of
 *   the area each stroke touched rather than whole copies of the mask.
 */

export type Mask = { w: number; h: number; data: Uint8ClampedArray };
/** Pixels as in ImageData: RGBA, 0–255, not premultiplied. */
export type Rgba = { w: number; h: number; data: Uint8ClampedArray };
/** A box of pixels: x0/y0 included, x1/y1 not. */
export type Rect = { x0: number; y0: number; x1: number; y1: number };
/** "transparent", or a colour as #rrggbb. */
export type Background = "transparent" | string;

/** What BiRefNet was trained on (ImageNet). */
export const IMAGENET_MEAN = [0.485, 0.456, 0.406] as const;
export const IMAGENET_STD = [0.229, 0.224, 0.225] as const;

/* ------------------------------------------------------------------ model in / out */

/** A size×size RGBA photo → the model's input: R, G and B planes, normalised (NCHW). */
export function toModelInput(rgba: ArrayLike<number>, size: number, out = new Float32Array(3 * size * size)): Float32Array {
  const plane = size * size;
  for (let c = 0; c < 3; c++) {
    const m = IMAGENET_MEAN[c];
    const s = IMAGENET_STD[c];
    const base = c * plane;
    for (let i = 0, j = c; i < plane; i++, j += 4) out[base + i] = (rgba[j] / 255 - m) / s;
  }
  return out;
}

/** The model's logits (size×size) → a mask (sigmoid × 255). */
export function logitsToMask(logits: ArrayLike<number>, size: number): Mask {
  const data = new Uint8ClampedArray(size * size);
  for (let i = 0; i < data.length; i++) {
    const v = Number(logits[i]);
    data[i] = v !== v ? 0 : 255 / (1 + Math.exp(-v));
  }
  return { w: size, h: size, data };
}

/** A mask stretched to another size (bilinear, pixel centres aligned). */
export function resizeMask(m: Mask, w: number, h: number): Mask {
  if (m.w === w && m.h === h) return { w, h, data: m.data.slice() };
  const data = new Uint8ClampedArray(w * h);
  const sx = m.w / w;
  const sy = m.h / h;
  for (let y = 0; y < h; y++) {
    const fy = Math.min(Math.max((y + 0.5) * sy - 0.5, 0), m.h - 1);
    const y0 = Math.floor(fy);
    const y1 = Math.min(y0 + 1, m.h - 1);
    const ty = fy - y0;
    const r0 = y0 * m.w;
    const r1 = y1 * m.w;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(Math.max((x + 0.5) * sx - 0.5, 0), m.w - 1);
      const x0 = Math.floor(fx);
      const x1 = Math.min(x0 + 1, m.w - 1);
      const tx = fx - x0;
      const top = m.data[r0 + x0] + (m.data[r0 + x1] - m.data[r0 + x0]) * tx;
      const bot = m.data[r1 + x0] + (m.data[r1 + x1] - m.data[r1 + x0]) * tx;
      data[y * w + x] = top + (bot - top) * ty;
    }
  }
  return { w, h, data };
}

/** A mask from a picture's own alpha (a cut-out made elsewhere, e.g. by Cloudinary). */
export function maskFromAlpha(img: Rgba): Mask {
  const data = new Uint8ClampedArray(img.w * img.h);
  for (let i = 0, j = 3; i < data.length; i++, j += 4) data[i] = img.data[j];
  return { w: img.w, h: img.h, data };
}

/* ------------------------------------------------------------------ the result */

/** "#fff" or "#ffffff" → [r, g, b]; anything else → null. */
export function parseHex(hex: string): [number, number, number] | null {
  const s = String(hex ?? "").trim().replace(/^#/, "").toLowerCase();
  const full = /^[0-9a-f]{3}$/.test(s) ? s.replace(/./g, (c) => c + c) : s;
  if (!/^[0-9a-f]{6}$/.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

const fullRect = (w: number, h: number): Rect => ({ x0: 0, y0: 0, x1: w, y1: h });

/**
 * The cut-out: the photo's colours with the mask as alpha. `ghost` (0–1) lets part of
 * what was removed show through, so the editor can show what the brush can bring back.
 * Only `rect` is written when given (a brush stroke).
 */
export function applyMask(img: Rgba, mask: Mask, out = new Uint8ClampedArray(img.w * img.h * 4), rect: Rect = fullRect(img.w, img.h), ghost = 0): Uint8ClampedArray {
  const g = Math.min(Math.max(ghost, 0), 1);
  for (let y = rect.y0; y < rect.y1; y++) {
    for (let x = rect.x0; x < rect.x1; x++) {
      const i = y * img.w + x;
      const j = i * 4;
      const a = mask.data[i];
      out[j] = img.data[j];
      out[j + 1] = img.data[j + 1];
      out[j + 2] = img.data[j + 2];
      out[j + 3] = g ? a + (255 - a) * g : a;
    }
  }
  return out;
}

/** The cut-out laid on a solid colour: every pixel opaque. */
export function flatten(img: Rgba, mask: Mask, bg: [number, number, number], out = new Uint8ClampedArray(img.w * img.h * 4)): Uint8ClampedArray {
  for (let i = 0, j = 0; i < mask.data.length; i++, j += 4) {
    const a = mask.data[i] / 255;
    out[j] = img.data[j] * a + bg[0] * (1 - a);
    out[j + 1] = img.data[j + 1] * a + bg[1] * (1 - a);
    out[j + 2] = img.data[j + 2] * a + bg[2] * (1 - a);
    out[j + 3] = 255;
  }
  return out;
}

/** The final pixels for a background choice (transparent keeps the alpha). */
export function composite(img: Rgba, mask: Mask, background: Background = "transparent"): Uint8ClampedArray {
  const rgb = background === "transparent" ? null : parseHex(background);
  return rgb ? flatten(img, mask, rgb) : applyMask(img, mask);
}

/** The smallest box around what the mask keeps (null when it keeps nothing). */
export function maskBounds(mask: Mask, threshold = 8): Rect | null {
  let x0 = mask.w, y0 = mask.h, x1 = -1, y1 = -1;
  for (let y = 0; y < mask.h; y++) {
    const row = y * mask.w;
    for (let x = 0; x < mask.w; x++) {
      if (mask.data[row + x] < threshold) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

/** How much of the picture the mask keeps (0–1). */
export function keptShare(mask: Mask): number {
  let sum = 0;
  for (let i = 0; i < mask.data.length; i++) sum += mask.data[i];
  return mask.data.length ? sum / (255 * mask.data.length) : 0;
}

/* ------------------------------------------------------------------ the brush */

export type BrushMode = "keep" | "erase";
export type Brush = {
  mode: BrushMode;
  /** In the picture's pixels. */
  radius: number;
  /** 0 = a hard edge, 1 = soft all the way from the centre. */
  softness: number;
};

/** How strongly the brush paints at a distance from its centre (1 inside, 0 outside). */
export function brushStrength(d: number, radius: number, softness: number): number {
  if (d >= radius) return 0;
  const inner = radius * (1 - Math.min(Math.max(softness, 0), 1));
  if (d <= inner) return 1;
  const t = 1 - (d - inner) / (radius - inner);
  return t * t * (3 - 2 * t);
}

export function unionRect(a: Rect | null, b: Rect | null): Rect | null {
  if (!a) return b;
  if (!b) return a;
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}

/**
 * One touch of the brush at (cx, cy). "keep" raises the mask towards 255, "erase"
 * lowers it towards 0; going over the same place again never goes past the brush's
 * own edge, so a stroke stays even. Returns the box it changed.
 */
export function dab(mask: Mask, cx: number, cy: number, brush: Brush): Rect | null {
  const r = Math.max(0.5, brush.radius);
  const x0 = Math.max(0, Math.floor(cx - r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const x1 = Math.min(mask.w, Math.ceil(cx + r) + 1);
  const y1 = Math.min(mask.h, Math.ceil(cy + r) + 1);
  if (x0 >= x1 || y0 >= y1) return null;
  const keep = brush.mode === "keep";
  for (let y = y0; y < y1; y++) {
    const dy = y + 0.5 - cy;
    for (let x = x0; x < x1; x++) {
      const f = brushStrength(Math.hypot(x + 0.5 - cx, dy), r, brush.softness);
      if (f <= 0) continue;
      const i = y * mask.w + x;
      const v = Math.round(255 * f);
      if (keep) {
        if (mask.data[i] < v) mask.data[i] = v;
      } else if (mask.data[i] > 255 - v) mask.data[i] = 255 - v;
    }
  }
  return { x0, y0, x1, y1 };
}

/** The brush dragged from one point to another: touches a quarter of its radius apart. */
export function stroke(mask: Mask, from: [number, number], to: [number, number], brush: Brush): Rect | null {
  const step = Math.max(1, brush.radius * 0.25);
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const n = Math.max(1, Math.ceil(len / step));
  let changed: Rect | null = null;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    changed = unionRect(changed, dab(mask, from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, brush));
  }
  return changed;
}

/* ------------------------------------------------------------------ undo */

export function copyRect(mask: Mask, r: Rect): Uint8ClampedArray {
  const w = r.x1 - r.x0;
  const out = new Uint8ClampedArray(w * (r.y1 - r.y0));
  for (let y = r.y0; y < r.y1; y++) out.set(mask.data.subarray(y * mask.w + r.x0, y * mask.w + r.x1), (y - r.y0) * w);
  return out;
}

export function pasteRect(mask: Mask, r: Rect, bytes: Uint8ClampedArray) {
  const w = r.x1 - r.x0;
  for (let y = r.y0; y < r.y1; y++) mask.data.set(bytes.subarray((y - r.y0) * w, (y - r.y0 + 1) * w), y * mask.w + r.x0);
}

type Patch = { rect: Rect; bytes: Uint8ClampedArray };

/**
 * Undo and redo for a mask. `begin()` before a stroke, `commit(rect)` after it with the
 * box it changed: only that box's old bytes are kept. Old steps go first when there are
 * more than `limit` or they take more than `maxBytes`.
 */
export class MaskHistory {
  private undos: Patch[] = [];
  private redos: Patch[] = [];
  private before: Uint8ClampedArray | null = null;
  private readonly mask: Mask;
  private readonly limit: number;
  private readonly maxBytes: number;

  constructor(mask: Mask, limit = 40, maxBytes = 64 * 1024 * 1024) {
    this.mask = mask;
    this.limit = limit;
    this.maxBytes = maxBytes;
  }

  get canUndo() {
    return this.undos.length > 0;
  }

  get canRedo() {
    return this.redos.length > 0;
  }

  begin() {
    this.before = this.mask.data.slice();
  }

  commit(rect: Rect | null) {
    const before = this.before;
    this.before = null;
    if (!before || !rect) return;
    this.undos.push({ rect, bytes: copyRect({ w: this.mask.w, h: this.mask.h, data: before }, rect) });
    this.redos = [];
    let bytes = this.undos.reduce((n, p) => n + p.bytes.length, 0);
    while (this.undos.length > 1 && (this.undos.length > this.limit || bytes > this.maxBytes)) bytes -= this.undos.shift()!.bytes.length;
  }

  /** A change to the whole mask (e.g. back to the model's result) as one step. */
  replace(next: Uint8ClampedArray) {
    this.begin();
    this.mask.data.set(next);
    this.commit(fullRect(this.mask.w, this.mask.h));
  }

  /** Returns the box that changed, to draw again. */
  undo(): Rect | null {
    return this.swap(this.undos, this.redos);
  }

  redo(): Rect | null {
    return this.swap(this.redos, this.undos);
  }

  private swap(from: Patch[], to: Patch[]): Rect | null {
    const p = from.pop();
    if (!p) return null;
    to.push({ rect: p.rect, bytes: copyRect(this.mask, p.rect) });
    pasteRect(this.mask, p.rect, p.bytes);
    return p.rect;
  }
}
