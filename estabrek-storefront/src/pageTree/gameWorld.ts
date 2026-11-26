/**
 * The world's helpers for the games stage (G1b of docs/game-engine-plan.ar.md), small and pure (no DOM, no React):
 *  - a maze made from a seed: a recursive backtracker, then a few walls knocked through so a chase has ways round;
 *    the marks drawn on the map (where the player starts, coins, a door, enemies) each moved to the corridor nearest
 *    to where they were drawn;
 *  - the shortest way through a tile map (A*, four ways, never through a solid tile);
 *  - a ray through the map's solid tiles (cell by cell) and through boxes, the first thing it meets, for sight;
 *  - a path through points, straight or smoothed (Catmull-Rom), walked by the distance gone.
 * gameEngine.ts uses them; the admin's game editor shows the same maze.
 */

/** Mulberry32 from a seed: the same maze for the same seed, everywhere. */
function rng(seed: number) {
  let s = seed | 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WAYS: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** The free cell nearest to (c, r), ring by ring (null: none). */
function nearestFree(g: string[][], c: number, r: number, free: string): [number, number] | null {
  const far = g.length + (g[0]?.length ?? 0);
  for (let d = 0; d <= far; d++) {
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      if (g[r + dy]?.[c + dx] === free) return [c + dx, r + dy];
    }
  }
  return null;
}

/**
 * A maze as big as the map: `wall` for its walls, "." its corridors; each other mark of `map` (not a wall, not
 * empty) at the free corridor nearest to where it was drawn.
 */
export function mazeOf(map: string[], cols: number, rows: number, wall: string, isWall: (ch: string) => boolean, seed: number): string[] {
  const cw = Math.floor((cols - 1) / 2), ch = Math.floor((rows - 1) / 2);
  if (cw < 1 || ch < 1) return map;
  const g = Array.from({ length: rows }, () => Array<string>(cols).fill(wall));
  const random = rng(seed);
  const seen = new Uint8Array(cw * ch);
  const stack = [0];
  seen[0] = 1;
  g[1][1] = ".";
  while (stack.length) {
    const cur = stack[stack.length - 1], cx = cur % cw, cy = Math.floor(cur / cw);
    const next = WAYS.filter(([dx, dy]) => { const nx = cx + dx, ny = cy + dy; return nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen[ny * cw + nx]; });
    if (!next.length) { stack.pop(); continue; }
    const [dx, dy] = next[Math.floor(random() * next.length)];
    const nx = cx + dx, ny = cy + dy;
    seen[ny * cw + nx] = 1;
    g[1 + cy * 2 + dy][1 + cx * 2 + dx] = ".";
    g[1 + ny * 2][1 + nx * 2] = ".";
    stack.push(ny * cw + nx);
  }
  // A few walls between two corridors knocked through: loops, so a chase isn't always a dead end.
  for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
    if (g[r][c] !== wall) continue;
    const across = g[r][c - 1] === "." && g[r][c + 1] === "." && g[r - 1][c] === wall && g[r + 1][c] === wall;
    const down = g[r - 1][c] === "." && g[r + 1][c] === "." && g[r][c - 1] === wall && g[r][c + 1] === wall;
    if ((across || down) && random() < 0.12) g[r][c] = ".";
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const m = map[r]?.[c] ?? ".";
    if (m === "." || isWall(m)) continue;
    const at = nearestFree(g, c, r, ".");
    if (at) g[at[1]][at[0]] = m;
  }
  return g.map((row) => row.join(""));
}

/** A grid to find a way through: its size and which cells are closed. */
export type Grid = { cols: number; rows: number; blocked: (c: number, r: number) => boolean };

/**
 * The shortest way from one cell to another (A*, four ways, by the city-block distance): the cells after `from`, up
 * to and with `to`; [] when they're the same cell; null when there's no way (or it's further than `max` cells looked at).
 */
export function findPath(g: Grid, from: [number, number], to: [number, number], max = 4000): Array<[number, number]> | null {
  const { cols, rows } = g;
  const inside = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows;
  if (!inside(...from) || !inside(...to) || g.blocked(...to)) return null;
  if (from[0] === to[0] && from[1] === to[1]) return [];
  const n = cols * rows, start = from[1] * cols + from[0], goal = to[1] * cols + to[0];
  const cost = new Float64Array(n).fill(Infinity), came = new Int32Array(n).fill(-1), done = new Uint8Array(n);
  const h = (i: number) => Math.abs((i % cols) - to[0]) + Math.abs(Math.floor(i / cols) - to[1]);
  // A small binary heap of [f, order, cell]: the order keeps ties the same everywhere.
  const heap: Array<[number, number, number]> = [];
  let order = 0;
  const less = (a: [number, number, number], b: [number, number, number]) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const push = (x: [number, number, number]) => {
    heap.push(x);
    for (let i = heap.length - 1; i > 0;) { const p = (i - 1) >> 1; if (!less(heap[i], heap[p])) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; }
  };
  const pop = () => {
    const top = heap[0], end = heap.pop()!;
    if (heap.length) {
      heap[0] = end;
      for (let i = 0; ;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < heap.length && less(heap[l], heap[m])) m = l;
        if (r < heap.length && less(heap[r], heap[m])) m = r;
        if (m === i) break;
        [heap[i], heap[m]] = [heap[m], heap[i]];
        i = m;
      }
    }
    return top;
  };
  cost[start] = 0;
  push([h(start), order++, start]);
  let looked = 0;
  while (heap.length) {
    const [, , cur] = pop();
    if (done[cur]) continue;
    if (cur === goal) break;
    done[cur] = 1;
    if (++looked > max) return null;
    const cc = cur % cols, cr = Math.floor(cur / cols);
    for (const [dx, dy] of WAYS) {
      const nc = cc + dx, nr = cr + dy;
      if (!inside(nc, nr) || g.blocked(nc, nr)) continue;
      const ni = nr * cols + nc, next = cost[cur] + 1;
      if (next >= cost[ni]) continue;
      cost[ni] = next;
      came[ni] = cur;
      push([next + h(ni), order++, ni]);
    }
  }
  if (came[goal] < 0) return null;
  const way: Array<[number, number]> = [];
  for (let i = goal; i !== start; i = came[i]) way.push([i % cols, Math.floor(i / cols)]);
  return way.reverse();
}

/**
 * How far along the ray from (x0, y0) to (x1, y1) the first closed cell is (0–1; 1: none on the way), stepped cell by
 * cell through a grid of `size` cells (Amanatides & Woo). The cell it starts in doesn't count.
 */
export function rayCells(size: number, blocked: (c: number, r: number) => boolean, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0, dy = y1 - y0;
  let c = Math.floor(x0 / size), r = Math.floor(y0 / size);
  const c1 = Math.floor(x1 / size), r1 = Math.floor(y1 / size);
  const sx = Math.sign(dx), sy = Math.sign(dy);
  const tdx = dx ? Math.abs(size / dx) : Infinity, tdy = dy ? Math.abs(size / dy) : Infinity;
  let tx = dx ? ((sx > 0 ? (c + 1) * size - x0 : x0 - c * size) / Math.abs(dx)) : Infinity;
  let ty = dy ? ((sy > 0 ? (r + 1) * size - y0 : y0 - r * size) / Math.abs(dy)) : Infinity;
  for (let n = 0; n < 1000 && (c !== c1 || r !== r1); n++) {
    let t: number;
    if (tx < ty) { c += sx; t = tx; tx += tdx; } else { r += sy; t = ty; ty += tdy; }
    if (t > 1) return 1;
    if (blocked(c, r)) return Math.max(0, t);
  }
  return 1;
}

/** How far along a ray (0–1) it first meets a box placed by its centre (1: it doesn't). */
export function rayBox(x0: number, y0: number, x1: number, y1: number, b: { x: number; y: number; w: number; h: number }): number {
  let lo = 0, hi = 1;
  const axis = (p: number, d: number, min: number, max: number) => {
    if (Math.abs(d) < 1e-9) return p >= min && p <= max;
    let a = (min - p) / d, z = (max - p) / d;
    if (a > z) [a, z] = [z, a];
    lo = Math.max(lo, a);
    hi = Math.min(hi, z);
    return lo <= hi;
  };
  if (!axis(x0, x1 - x0, b.x - b.w / 2, b.x + b.w / 2) || !axis(y0, y1 - y0, b.y - b.h / 2, b.y + b.h / 2)) return 1;
  return lo;
}

/** A path ready to walk: its points (a smoothed one sampled finely), the distance to each, and its whole length. */
export type Track = { pts: Array<[number, number]>; at: number[]; total: number; loop: boolean };

/** A path through points (it starts at the first), straight or smoothed; a loop comes back to its start. */
export function trackOf(points: Array<[number, number]>, loop: boolean, smooth: boolean): Track {
  let pts = points.slice();
  if (smooth && pts.length > 2) {
    // Catmull-Rom through every point, 12 pieces between two.
    const p = (i: number) => (loop ? pts[(i + pts.length) % pts.length] : pts[Math.max(0, Math.min(pts.length - 1, i))]);
    const out: Array<[number, number]> = [];
    const spans = loop ? pts.length : pts.length - 1;
    for (let i = 0; i < spans; i++) {
      const [a, b, c, d] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
      for (let k = 0; k < 12; k++) {
        const t = k / 12, t2 = t * t, t3 = t2 * t;
        const f = (q: 0 | 1) => 0.5 * (2 * b[q] + (-a[q] + c[q]) * t + (2 * a[q] - 5 * b[q] + 4 * c[q] - d[q]) * t2 + (-a[q] + 3 * b[q] - 3 * c[q] + d[q]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    if (!loop) out.push(pts[pts.length - 1]);
    pts = out;
  }
  if (loop && pts.length > 1) pts = [...pts, pts[0]];
  const at = [0];
  for (let i = 1; i < pts.length; i++) at.push(at[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, at, total: at[at.length - 1] ?? 0, loop };
}

/** Where on a path, `d` along it: round and round on a loop, there and back on the rest. */
export function onTrack(t: Track, d: number): [number, number] {
  if (t.pts.length < 2 || t.total <= 0) return t.pts[0] ?? [0, 0];
  let m = d % (t.loop ? t.total : t.total * 2);
  if (m < 0) m += t.loop ? t.total : t.total * 2;
  if (!t.loop && m > t.total) m = t.total * 2 - m;
  let i = 1;
  while (i < t.at.length - 1 && t.at[i] < m) i++;
  const a = t.pts[i - 1], b = t.pts[i], span = t.at[i] - t.at[i - 1] || 1, k = (m - t.at[i - 1]) / span;
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}
