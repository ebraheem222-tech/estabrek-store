/**
 * Drawing triangles into a picture in plain code (no WebGL), for the 3D scan: a depth
 * picture per frame (which parts of the product a frame really sees, colour.ts) and the
 * admin's preview of the finished model (ModelPreview.tsx). Points come already placed
 * on the picture: x, y in pixels and a depth (smaller = nearer).
 */

/** Draws triangles: each pixel keeps the nearest one; `paint` (optional) colours it from its three corners. */
export function rasterize(
  screen: Float32Array,
  indices: Uint32Array,
  w: number,
  h: number,
  depth: Float32Array,
  paint?: (pixel: number, a: number, b: number, c: number, wa: number, wb: number, wc: number) => void,
  cullBack = false,
) {
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t];
    const b = indices[t + 1];
    const c = indices[t + 2];
    const ax = screen[a * 3];
    const ay = screen[a * 3 + 1];
    const bx = screen[b * 3];
    const by = screen[b * 3 + 1];
    const cx = screen[c * 3];
    const cy = screen[c * 3 + 1];
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (!(Math.abs(area) > 1e-9)) continue;
    // y grows downwards: a face turned to the viewer winds clockwise on the picture.
    if (cullBack && area > 0) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by, cy)));
    if (x0 > x1 || y0 > y1) continue;
    const da = screen[a * 3 + 2];
    const db = screen[b * 3 + 2];
    const dc = screen[c * 3 + 2];
    for (let y = y0; y <= y1; y++) {
      const py = y + 0.5;
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5;
        const wa = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / area;
        const wb = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / area;
        const wc = 1 - wa - wb;
        if (wa < 0 || wb < 0 || wc < 0) continue;
        const z = wa * da + wb * db + wc * dc;
        const i = y * w + x;
        if (z >= depth[i]) continue;
        depth[i] = z;
        paint?.(i, a, b, c, wa, wb, wc);
      }
    }
  }
}
