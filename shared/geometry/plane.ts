/** Row-major matrices multiply column points; planes map local border-box CSS px. */
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];
export type Mat4 = readonly [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
/** Whether local X/Y movement remains outside a self perspective projection. */
export const isAffineXY = (m: Mat4) => m.every(Number.isFinite) && [2,6,8,9,11,12,13].every(i => Math.abs(m[i]) < 1e-10) && Math.abs(m[15] - 1) < 1e-10;
export type Point = { x: number; y: number };
export type Size = { w: number; h: number };
export type Plane = Size & { matrix: Mat3 };
export type Point3 = Point & { z: number };
export type Box = Point & Size;
export type MovementAxis = "horizontal" | "vertical" | "both" | "free";
export type ResizeOptions = {
  rtl: boolean;
  keep?: boolean;
  min?: number;
  constrain?: (size: Size) => Size | null;
};
export type ResizeResult = { size: Size; layout: Point; matrix: Mat3; quad: Point[]; box: Box };

const EPS = 1e-10;
const validPoint = (p: Point): boolean => Number.isFinite(p.x) && Number.isFinite(p.y);
const validSize = (s: Size): boolean => Number.isFinite(s.w) && Number.isFinite(s.h) && s.w > 0 && s.h > 0;
const translation = (x: number, y: number): Mat3 => [1, 0, x, 0, 1, y, 0, 0, 1];

function multiply(a: readonly number[], b: readonly number[], n: number): number[] {
  const out = Array<number>(n * n).fill(0);
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      for (let k = 0; k < n; k++) out[row * n + col] += a[row * n + k] * b[k * n + col];
    }
  }
  return out;
}

/** Arithmetic composition; inverse/project/quad boundaries validate its result. */
export function multiply3(a: Mat3, b: Mat3): Mat3 {
  return multiply(a, b, 3) as unknown as Mat3;
}
export function multiply4(a: Mat4, b: Mat4): Mat4 {
  return multiply(a, b, 4) as unknown as Mat4;
}

function inverse(matrix: readonly number[], n: number): number[] | null {
  if (!matrix.every(Number.isFinite)) return null;
  // Translation does not determine whether the local axes have collapsed.
  const scale = Math.max(...matrix.filter((_, i) => i % n !== n - 1 || i >= n * (n - 1)).map(Math.abs));
  if (!(scale > 0)) return null;
  const rows = Array.from({ length: n }, (_, row) => [
    ...matrix.slice(row * n, (row + 1) * n),
    ...Array.from({ length: n }, (_, col) => row === col ? 1 : 0),
  ]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    if (Math.abs(rows[pivot][col]) <= EPS * scale) return null;
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const d = rows[col][col];
    for (let k = 0; k < n * 2; k++) rows[col][k] /= d;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = rows[row][col];
      for (let k = 0; k < n * 2; k++) rows[row][k] -= f * rows[col][k];
    }
  }
  const out = rows.flatMap((row) => row.slice(n));
  return out.every(Number.isFinite) ? out : null;
}

export function inverse3(matrix: Mat3): Mat3 | null {
  return inverse(matrix, 3) as unknown as Mat3 | null;
}
export function inverse4(matrix: Mat4): Mat4 | null {
  return inverse(matrix, 4) as unknown as Mat4 | null;
}

/** W must remain positive: points behind or on the camera plane are unsafe. */
export function project3(matrix: Mat3, point: Point): Point | null {
  if (!matrix.every(Number.isFinite) || !validPoint(point)) return null;
  const w = matrix[6] * point.x + matrix[7] * point.y + matrix[8];
  const tolerance = EPS * Math.max(1, Math.abs(matrix[6] * point.x) + Math.abs(matrix[7] * point.y) + Math.abs(matrix[8]));
  if (!(w > tolerance)) return null;
  const out = { x: (matrix[0] * point.x + matrix[1] * point.y + matrix[2]) / w, y: (matrix[3] * point.x + matrix[4] * point.y + matrix[5]) / w };
  return validPoint(out) ? out : null;
}

export function project4(matrix: Mat4, point: Point & { z?: number }): Point3 | null {
  const z = point.z ?? 0;
  if (!matrix.every(Number.isFinite) || !validPoint(point) || !Number.isFinite(z)) return null;
  const w = matrix[12] * point.x + matrix[13] * point.y + matrix[14] * z + matrix[15];
  const tolerance = EPS * Math.max(1, Math.abs(matrix[12] * point.x) + Math.abs(matrix[13] * point.y) + Math.abs(matrix[14] * z) + Math.abs(matrix[15]));
  if (!(w > tolerance)) return null;
  const out = {
    x: (matrix[0] * point.x + matrix[1] * point.y + matrix[2] * z + matrix[3]) / w,
    y: (matrix[4] * point.x + matrix[5] * point.y + matrix[6] * z + matrix[7]) / w,
    z: (matrix[8] * point.x + matrix[9] * point.y + matrix[10] * z + matrix[11]) / w,
  };
  return validPoint(out) && Number.isFinite(out.z) ? out : null;
}

function convexQuad(quad: readonly Point[]): boolean {
  if (quad.length !== 4 || !quad.every(validPoint)) return false;
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = quad[i], b = quad[(i + 1) % 4], c = quad[(i + 2) % 4];
    const ux = b.x - a.x, uy = b.y - a.y, vx = c.x - b.x, vy = c.y - b.y;
    const cross = ux * vy - uy * vx;
    if (Math.abs(cross) <= EPS * Math.max(1, Math.hypot(ux, uy) * Math.hypot(vx, vy))) return false;
    if (sign && Math.sign(cross) !== sign) return false;
    sign = Math.sign(cross);
  }
  return true;
}

/** Quad order is local top-left, top-right, bottom-right, bottom-left. */
export function planeFromQuad(size: Size, quad: readonly Point[]): Mat3 | null {
  if (!validSize(size) || !convexQuad(quad)) return null;
  const [a, b, c, d] = quad;
  const dx1 = b.x - c.x, dx2 = d.x - c.x, dx3 = a.x - b.x + c.x - d.x;
  const dy1 = b.y - c.y, dy2 = d.y - c.y, dy3 = a.y - b.y + c.y - d.y;
  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) <= EPS * Math.max(1, Math.hypot(dx1, dy1) * Math.hypot(dx2, dy2))) return null;
  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const h = (dx1 * dy3 - dx3 * dy1) / det;
  const matrix: Mat3 = [
    (b.x - a.x + g * b.x) / size.w, (d.x - a.x + h * d.x) / size.h, a.x,
    (b.y - a.y + g * b.y) / size.w, (d.y - a.y + h * d.y) / size.h, a.y,
    g / size.w, h / size.h, 1,
  ];
  return planeQuad(matrix, size) ? matrix : null;
}

export function planeQuad(matrix: Mat3, size: Size): Point[] | null {
  if (!validSize(size) || !inverse3(matrix)) return null;
  const points = [{ x: 0, y: 0 }, { x: size.w, y: 0 }, { x: size.w, y: size.h }, { x: 0, y: size.h }].map((p) => project3(matrix, p));
  if (points.some((p) => p === null)) return null;
  const quad = points as Point[];
  return convexQuad(quad) ? quad : null;
}

/** A projective plane embedding; this is not a recovered 3D world transform. */
export function embedPlane(matrix: Mat3): Mat4 {
  return [matrix[0], matrix[1], 0, matrix[2], matrix[3], matrix[4], 0, matrix[5], 0, 0, 1, 0, matrix[6], matrix[7], 0, matrix[8]];
}

export function boundsOfQuad(quad: readonly Point[]): Box | null {
  if (!quad.length || !quad.every(validPoint)) return null;
  const x = Math.min(...quad.map((p) => p.x)), y = Math.min(...quad.map((p) => p.y));
  const box = { x, y, w: Math.max(...quad.map((p) => p.x)) - x, h: Math.max(...quad.map((p) => p.y)) - y };
  return Number.isFinite(box.w) && Number.isFinite(box.h) ? box : null;
}

const ANCHORS: Record<string, readonly [number, number]> = {
  "top-start": [0, 0], top: [0.5, 0], "top-end": [1, 0],
  start: [0, 0.5], center: [0.5, 0.5], end: [1, 0.5],
  "bottom-start": [0, 1], bottom: [0.5, 1], "bottom-end": [1, 1],
};
const numberIn = (v: unknown, min: number, max: number, fallback: number): number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : fallback;

/**
 * Resting TREE_TRANSFORM, including the changing relative transform-origin:
 * T(origin) T(anchor) P T(move) Rx Ry Rz S T(-origin).
 * Layout left/top stays outside this transform. RTL changes the anchor sign only.
 */
export function cmsTransform(look: Record<string, unknown>, size: Size, rtl: boolean): Mat3 | null {
  if (!validSize(size)) return null;
  for (const key of ["rotateX", "rotateY", "rotateZ", "perspective", "scale", "moveX", "moveY"]) {
    if (typeof look[key] === "number" && !Number.isFinite(look[key])) return null;
  }
  const ox = size.w / 2, oy = look.origin === "top" ? 0 : look.origin === "bottom" ? size.h : size.h / 2;
  let ax = 0, ay = 0;
  const layer = look.layer;
  if (layer && typeof layer === "object") {
    const l = layer as Record<string, unknown>;
    if (typeof l.x === "number" && !Number.isFinite(l.x) || typeof l.y === "number" && !Number.isFinite(l.y)) return null;
    if (numberIn(l.x, 0, 100, -1) >= 0 && numberIn(l.y, 0, 100, -1) >= 0) {
      const anchor = ANCHORS[typeof l.anchor === "string" ? l.anchor : "center"] ?? ANCHORS.center;
      ax = anchor[0] * size.w * (rtl ? 1 : -1);
      ay = -anchor[1] * size.h;
    }
  }
  const rad = Math.PI / 180;
  const rx = numberIn(look.rotateX, -180, 180, 0) * rad, ry = numberIn(look.rotateY, -180, 180, 0) * rad, rz = numberIn(look.rotateZ, -360, 360, 0) * rad;
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  const scale = numberIn(look.scale, 0.1, 4, 1), perspective = numberIn(look.perspective, 200, 4000, 1200);
  const t4 = (x: number, y: number): Mat4 => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, 0, 0, 0, 0, 1];
  const parts: Mat4[] = [
    t4(ox + ax, oy + ay),
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -1 / perspective, 1],
    t4(numberIn(look.moveX, -1000, 1000, 0), numberIn(look.moveY, -1000, 1000, 0)),
    [1, 0, 0, 0, 0, cx, -sx, 0, 0, sx, cx, 0, 0, 0, 0, 1],
    [cy, 0, sy, 0, 0, 1, 0, 0, -sy, 0, cy, 0, 0, 0, 0, 1],
    [cz, -sz, 0, 0, sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [scale, 0, 0, 0, 0, scale, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    t4(-ox, -oy),
  ];
  const m = parts.reduce(multiply4);
  const plane: Mat3 = [m[0], m[1], m[3], m[4], m[5], m[7], m[12], m[13], m[15]];
  return planeQuad(plane, size) ? plane : null;
}

/** at is LOCAL, delta is SCREEN; the result is a delta in local CSS px. */
export function localAxisDelta(matrix: Mat3, at: Point, delta: Point, axis: MovementAxis): Point | null {
  if (!validPoint(at) || !validPoint(delta)) return null;
  const inv = inverse3(matrix), start = project3(matrix, at);
  if (!inv || !start) return null;
  let target = { x: start.x + delta.x, y: start.y + delta.y };
  if (axis === "horizontal" || axis === "vertical") {
    const col = axis === "horizontal" ? 0 : 1;
    const w = matrix[6] * at.x + matrix[7] * at.y + matrix[8];
    const ux = (matrix[col] - start.x * matrix[6 + col]) / w;
    const uy = (matrix[3 + col] - start.y * matrix[6 + col]) / w;
    const norm = ux * ux + uy * uy;
    if (!(norm > EPS * EPS)) return null;
    const t = (delta.x * ux + delta.y * uy) / norm;
    target = { x: start.x + t * ux, y: start.y + t * uy };
  }
  const end = project3(inv, target);
  if (!end) return null;
  return { x: axis === "vertical" ? 0 : end.x - at.x, y: axis === "horizontal" ? 0 : end.y - at.y };
}

/**
 * Same-holder planar resize. Frame/holder matrices share a screen coordinate space.
 * Requires H^-1 F C^-1 to be a translation within 0.1 screen CSS px, allowing
 * the browser's serialized transform coefficient rounding.
 * layout is the NEW absolute untransformed border-left/top in holder coordinates.
 */
export function resizePlane(frame: Plane, holder: Plane, look: Record<string, unknown>, handle: string, delta: Point, options: ResizeOptions): ResizeResult | null {
  if (!["n", "ne", "e", "se", "s", "sw", "w", "nw"].includes(handle) || !validSize(frame) || !validSize(holder) || !validPoint(delta)) return null;
  const min = options.min ?? 8;
  if (!(min > 0) || !Number.isFinite(min) || !planeQuad(frame.matrix, frame) || !planeQuad(holder.matrix, holder)) return null;
  const oldOwn = cmsTransform(look, frame, options.rtl), invHolder = inverse3(holder.matrix);
  const invOwn = oldOwn && inverse3(oldOwn);
  if (!oldOwn || !invOwn || !invHolder) return null;
  const samples = [{ x: 0, y: 0 }, { x: frame.w, y: 0 }, { x: frame.w, y: frame.h }, { x: 0, y: frame.h }, { x: frame.w / 2, y: frame.h / 2 }];
  const offsets: Point[] = [];
  for (const p of samples) {
    const screen = project3(frame.matrix, p), ownPoint = project3(oldOwn, p);
    const holderPoint = screen && project3(invHolder, screen);
    if (!holderPoint || !ownPoint) return null;
    offsets.push({ x: holderPoint.x - ownPoint.x, y: holderPoint.y - ownPoint.y });
  }
  const layout = { x: offsets.reduce((sum, p) => sum + p.x, 0) / offsets.length, y: offsets.reduce((sum, p) => sum + p.y, 0) / offsets.length };
  const reconstructed = multiply3(holder.matrix, multiply3(translation(layout.x, layout.y), oldOwn));
  for (const p of samples) {
    const actual = project3(frame.matrix, p), expected = project3(reconstructed, p);
    if (!actual || !expected || Math.hypot(actual.x - expected.x, actual.y - expected.y) > 0.1) return null;
  }
  const horizontal = handle.includes("e") || handle.includes("w"), vertical = handle.includes("n") || handle.includes("s");
  const hx = handle.includes("w") ? 0 : handle.includes("e") ? 1 : 0.5;
  const hy = handle.includes("n") ? 0 : handle.includes("s") ? 1 : 0.5;
  const fx = 1 - hx, fy = 1 - hy;
  const fixedScreen = project3(frame.matrix, { x: fx * frame.w, y: fy * frame.h });
  const active = project3(frame.matrix, { x: hx * frame.w, y: hy * frame.h });
  const fixed = fixedScreen && project3(invHolder, fixedScreen);
  if (!fixed || !active) return null;
  const target = { x: active.x + delta.x, y: active.y + delta.y };
  const ratio = frame.w / frame.h;
  const lower = options.keep ? [Math.max(min, min * ratio)] : horizontal && vertical ? [min, min] : [min];
  let params = options.keep ? [Math.max(lower[0], frame.w)] : horizontal && vertical ? [Math.max(min, frame.w), Math.max(min, frame.h)] : [Math.max(min, horizontal ? frame.w : frame.h)];
  const sizeOf = (p: number[]): Size => options.keep ? { w: p[0], h: p[0] / ratio } : horizontal && vertical ? { w: p[0], h: p[1] } : horizontal ? { w: p[0], h: frame.h } : { w: frame.w, h: p[0] };
  const evaluate = (size: Size): (ResizeResult & { active: Point }) | null => {
    if (!validSize(size)) return null;
    const own = cmsTransform(look, size, options.rtl);
    const ownFixed = own && project3(own, { x: fx * size.w, y: fy * size.h });
    if (!own || !ownFixed) return null;
    const layout = { x: fixed.x - ownFixed.x, y: fixed.y - ownFixed.y };
    const matrix = multiply3(holder.matrix, multiply3(translation(layout.x, layout.y), own));
    const quad = planeQuad(matrix, size), active = project3(matrix, { x: hx * size.w, y: hy * size.h });
    const box = quad && boundsOfQuad(quad);
    return quad && box && active ? { size, layout, matrix, quad, box, active } : null;
  };
  let current = evaluate(sizeOf(params));
  if (!current) return null;
  const error = (p: Point) => (p.x - target.x) ** 2 + (p.y - target.y) ** 2;
  // A tiny bounded Gauss-Newton solve accounts for the changing relative origin
  // under authored X/Y perspective. Affine corner resizing converges in one step.
  for (let iteration = 0; iteration < 30 && error(current.active) > 1e-15; iteration++) {
    const jacobian: Point[] = [];
    for (let k = 0; k < params.length; k++) {
      const step = Math.max(0.001, Math.abs(params[k]) * 1e-5);
      const p = [...params]; p[k] += step;
      const probe = evaluate(sizeOf(p));
      if (!probe) return null;
      jacobian.push({ x: (probe.active.x - current.active.x) / step, y: (probe.active.y - current.active.y) / step });
    }
    const dx = target.x - current.active.x, dy = target.y - current.active.y;
    let change: number[];
    if (jacobian.length === 1) {
      const u = jacobian[0], norm = u.x * u.x + u.y * u.y;
      if (!(norm > EPS * EPS)) return null;
      change = [(dx * u.x + dy * u.y) / norm];
    } else {
      const [u, v] = jacobian, det = u.x * v.y - v.x * u.y;
      if (Math.abs(det) <= EPS * Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y)) return null;
      change = [(dx * v.y - v.x * dy) / det, (u.x * dy - dx * u.y) / det];
    }
    if (!change.every(Number.isFinite)) return null;
    let improved = false;
    for (let trial = 0; trial < 18; trial++) {
      const fraction = 2 ** -trial;
      const p = params.map((v, k) => Math.max(lower[k], v + change[k] * fraction));
      const candidate = evaluate(sizeOf(p));
      if (candidate && error(candidate.active) < error(current.active) - 1e-15) {
        params = p; current = candidate; improved = true; break;
      }
    }
    if (!improved) break;
  }
  if (options.constrain) {
    const constrained = options.constrain({ ...current.size });
    if (!constrained || !validSize(constrained) || constrained.w < min || constrained.h < min) return null;
    if (options.keep && Math.abs(constrained.w - ratio * constrained.h) > 1e-6 * Math.max(constrained.w, ratio * constrained.h)) return null;
    current = evaluate(constrained);
    if (!current) return null;
  }
  return { size: current.size, layout: current.layout, matrix: current.matrix, quad: current.quad, box: current.box };
}
