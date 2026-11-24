/**
 * The theme library's physics and generative canvases (its Premium 51–60: Themes/Premium/src/premium-k.jsx and
 * premium-l.jsx), made section backgrounds of the editor's own (docs/themes-library-plan.ar.md, phase 3): each draws a
 * frame from its state, in the section's colours (a background and three; the originals by default), and answers the
 * pointer moving over the section (its words stay on top and keep every click) and a press on it. Plain code, no
 * imports: the shop draws them (ShaderView.tsx), the admin's panel makes their pictures.
 */
export type Rgb = [number, number, number];
export type FxFrame = {
  ctx: CanvasRenderingContext2D;
  /** Seconds since it started (times its speed). */
  t: number;
  w: number;
  h: number;
  /** Its own state, kept from frame to frame; `resized` true on the first frame and after a resize. */
  s: Record<string, any>;
  bg: Rgb; c1: Rgb; c2: Rgb; c3: Rgb;
  /** Where the pointer is over the section (null when it isn't). */
  pointer: { x: number; y: number } | null;
  /** A press on the section since the last frame (taken by the frame). */
  press: { x: number; y: number } | null;
};
export type FxDef = { bg: string; c1: string; c2: string; c3: string; draw: (f: FxFrame) => void };

const css = (c: Rgb, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const times = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** A colour as the pixel buffers hold it (little-endian ABGR). */
const u32 = (c: Rgb) => ((255 << 24) | ((Math.min(255, Math.max(0, c[2])) | 0) << 16) | ((Math.min(255, Math.max(0, c[1])) | 0) << 8) | (Math.min(255, Math.max(0, c[0])) | 0)) >>> 0;

/* ── 51 · Cloth flag (verlet), a gust where the pointer is ── */
const CLOTH_C = 32, CLOTH_R = 20;
function buildCloth(w: number, h: number) {
  const sp = Math.min((w * 0.6) / CLOTH_C, (h * 0.6) / CLOTH_R);
  const x0 = Math.max(70, (w - CLOTH_C * sp) / 2 + (w > 900 ? w * 0.12 : 0));
  const y0 = h * 0.16;
  const pts = [];
  for (let j = 0; j < CLOTH_R; j++)
    for (let i = 0; i < CLOTH_C; i++) {
      const x = x0 + i * sp, y = y0 + j * sp;
      pts.push({ x, y, z: 0, px: x, py: y, pz: 0, pin: i === 0, r: i < CLOTH_C - 1, d: j < CLOTH_R - 1 });
    }
  return { pts, sp, x0, y0 };
}
const cloth: FxDef = {
  bg: "#0b1530", c1: "#7c3aed", c2: "#d946ef", c3: "#22d3ee",
  draw({ ctx, t, w, h, s, bg, c1, c2, c3, pointer }) {
    if (!s.cloth || s.resized) s.cloth = buildCloth(w, h);
    const { pts, sp, x0, y0 } = s.cloth;
    const k = sp / 20;
    const near = pointer && pointer.x > x0 - 40 ? 1 : 0;
    s.gust = (s.gust ?? 1) + ((near ? 2.2 : 1) - (s.gust ?? 1)) * 0.05;
    const lvl = s.gust;
    for (let n = 0; n < 2; n++) {
      for (let idx = 0; idx < pts.length; idx++) {
        const p = pts[idx];
        if (p.pin) continue;
        const i = idx % CLOTH_C, j = (idx / CLOTH_C) | 0;
        const vx = (p.x - p.px) * 0.985, vy = (p.y - p.py) * 0.985, vz = (p.z - p.pz) * 0.985;
        p.px = p.x; p.py = p.y; p.pz = p.z;
        p.x += vx + lvl * (0.11 + 0.06 * Math.sin(t * 0.9 + j * 0.2)) * k;
        p.y += vy + 0.09 * k;
        p.z += vz + lvl * 0.35 * Math.sin(t * 4 - i * 0.45 + j * 0.12) * k;
      }
      for (let it = 0; it < 4; it++)
        for (let idx = 0; idx < pts.length; idx++) {
          const a = pts[idx];
          for (const [has, off] of [[a.r, 1], [a.d, CLOTH_C]] as const) {
            if (!has) continue;
            const b = pts[idx + off];
            const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
            const dist = Math.hypot(dx, dy, dz) || 0.0001;
            const diff = (dist - sp) / dist;
            const wa = a.pin ? 0 : b.pin ? 1 : 0.5, wb = b.pin ? 0 : a.pin ? 1 : 0.5;
            a.x += dx * diff * wa; a.y += dy * diff * wa; a.z += dz * diff * wa;
            b.x -= dx * diff * wb; b.y -= dy * diff * wb; b.z -= dz * diff * wb;
          }
        }
    }
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, css(bg)); g.addColorStop(1, css(mix(bg, WHITE, 0.1)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(x0 - 5, y0 - 26, 6, h - y0 + 26);
    ctx.beginPath(); ctx.arc(x0 - 2, y0 - 30, 7, 0, Math.PI * 2); ctx.fillStyle = "#fbbf24"; ctx.fill();
    const L = [0.3, -0.5, 0.8], Ln = Math.hypot(...L), bands = [c1, c2, c3];
    for (let j = 0; j < CLOTH_R - 1; j++)
      for (let i = 0; i < CLOTH_C - 1; i++) {
        const a = pts[j * CLOTH_C + i], b = pts[j * CLOTH_C + i + 1], c = pts[(j + 1) * CLOTH_C + i + 1], d = pts[(j + 1) * CLOTH_C + i];
        const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, vx = d.x - a.x, vy = d.y - a.y, vz = d.z - a.z;
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const nl = Math.hypot(nx, ny, nz) || 1;
        const sh = 0.5 + 0.5 * Math.abs((nx * L[0] + ny * L[1] + nz * L[2]) / (nl * Ln));
        const fill = css(times(bands[Math.min(2, Math.floor((j / (CLOTH_R - 1)) * 3))], sh));
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
        ctx.closePath();
        ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineWidth = 0.7;
        ctx.fill(); ctx.stroke();
      }
  },
};

/* ── 52 · Murmuration (boids), parting round the pointer ── */
const murmuration: FxDef = {
  bg: "#2b1a4a", c1: "#c2546b", c2: "#f6a35b", c3: "#1a0f2e",
  draw({ ctx, w, h, s, bg, c1, c2, c3, pointer }) {
    if (!s.b || s.resized) {
      const n = Math.max(90, Math.min(220, Math.round((w * h) / 3800)));
      s.b = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h * 0.7, vx: Math.random() * 2 - 1, vy: Math.random() * 2 - 1 }));
      s.fresh = true;
    }
    for (const b of s.b) {
      let ax = 0, ay = 0, cx = 0, cy = 0, sx = 0, sy = 0, n = 0;
      for (const o of s.b) {
        if (o === b) continue;
        const dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < 2500) {
          ax += o.vx; ay += o.vy; cx += o.x; cy += o.y; n++;
          if (d2 < 400) { sx -= dx / (d2 + 1); sy -= dy / (d2 + 1); }
        }
      }
      if (n) {
        b.vx += (ax / n - b.vx) * 0.05 + (cx / n - b.x) * 0.0025;
        b.vy += (ay / n - b.vy) * 0.05 + (cy / n - b.y) * 0.0025;
      }
      b.vx += sx * 1.6; b.vy += sy * 1.6;
      if (pointer) {
        const dx = b.x - pointer.x, dy = b.y - pointer.y, d = Math.hypot(dx, dy);
        if (d < 130 && d > 0) { b.vx += (dx / d) * 0.9; b.vy += (dy / d) * 0.9; }
      }
      b.vy += (h * 0.42 - b.y) * 0.00004;
      const sp = Math.hypot(b.vx, b.vy) || 1, cl = Math.min(3.4, Math.max(1.6, sp));
      b.vx = (b.vx / sp) * cl; b.vy = (b.vy / sp) * cl;
      b.x += b.vx; b.y += b.vy;
      if (b.x < -20) b.x += w + 40; else if (b.x > w + 20) b.x -= w + 40;
      if (b.y < -20) b.y += h + 40; else if (b.y > h + 20) b.y -= h + 40;
    }
    const a = s.fresh ? 1 : 0.38;
    s.fresh = false;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, css(bg, a)); g.addColorStop(0.6, css(c1, a)); g.addColorStop(1, css(c2, a));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = css(c3);
    for (const b of s.b) {
      const an = Math.atan2(b.vy, b.vx), co = Math.cos(an), si = Math.sin(an);
      ctx.beginPath();
      ctx.moveTo(b.x + co * 6, b.y + si * 6);
      ctx.lineTo(b.x - co * 4 - si * 3, b.y - si * 4 + co * 3);
      ctx.lineTo(b.x - co * 2, b.y - si * 2);
      ctx.lineTo(b.x - co * 4 + si * 3, b.y - si * 4 - co * 3);
      ctx.fill();
    }
  },
};

/* ── 53 · Falling sand (a cellular world), poured where the pointer is ── */
const CS = 4;
const EMPTY = 0, SAND = 1, STONE = 3;
const sand: FxDef = {
  bg: "#0f0c1a", c1: "#f59e0b", c2: "#ec4899", c3: "#64748b",
  draw({ ctx, t, w, h, s, bg, c1, c2, c3, pointer }) {
    const fresh = !s.g || s.resized || (s.g.count ?? 0) > s.g.cols * s.g.rows * 0.42;
    if (fresh) {
      const cols = Math.max(1, Math.floor(w / CS)), rows = Math.max(1, Math.floor(h / CS));
      const off = document.createElement("canvas");
      off.width = cols; off.height = rows;
      const octx = off.getContext("2d")!;
      const img = octx.createImageData(cols, rows);
      s.g = { cols, rows, type: new Uint8Array(cols * rows), col: new Uint32Array(cols * rows), moved: new Uint8Array(cols * rows), off, octx, img, buf: new Uint32Array(img.data.buffer), frame: 0, born: t, count: 0 };
      const { type, col } = s.g;
      const ledge = (x0: number, y0: number, len: number, slope: number) => {
        for (let i = 0; i < len; i++) for (let k = 0; k < 3; k++) {
          const x = x0 + i, y = Math.round(y0 + i * slope) + k;
          if (x >= 0 && x < cols && y >= 0 && y < rows) { type[y * cols + x] = STONE; col[y * cols + x] = u32(times(c3, 0.85 + Math.random() * 0.3)); }
        }
      };
      ledge(Math.floor(cols * 0.52), Math.floor(rows * 0.38), Math.floor(cols * 0.16), 0.35);
      ledge(Math.floor(cols * 0.7), Math.floor(rows * 0.62), Math.floor(cols * 0.18), -0.3);
    }
    const G = s.g, { cols, rows, type, col, moved } = G;
    const grain = () => u32(times(mix(c1, c2, 0.5 + 0.5 * Math.sin(t * 0.7)), 0.85 + Math.random() * 0.3));
    const put = (cx: number, cy: number, r: number) => {
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++) {
          if (x * x + y * y > r * r) continue;
          const gx = cx + x, gy = cy + y;
          if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) continue;
          const i = gy * cols + gx;
          if (type[i] !== EMPTY || Math.random() > 0.45) continue;
          type[i] = SAND;
          col[i] = grain();
        }
    };
    if (t - G.born < 7) put(Math.floor(cols * (0.62 + Math.sin(t * 0.8) * 0.12)), 2, 2);
    if (pointer) put(Math.floor(pointer.x / CS), Math.floor(pointer.y / CS), 3);
    moved.fill(0);
    G.frame++;
    const swap = (a: number, b: number) => { const tt = type[a], cc = col[a]; type[a] = type[b]; col[a] = col[b]; type[b] = tt; col[b] = cc; moved[b] = 1; };
    for (let y = rows - 2; y >= 0; y--) {
      const ltr = (G.frame + y) & 1;
      for (let k = 0; k < cols; k++) {
        const x = ltr ? k : cols - 1 - k;
        const i = y * cols + x;
        if (type[i] !== SAND || moved[i]) continue;
        const below = i + cols;
        if (type[below] === EMPTY) { swap(i, below); continue; }
        const dir = Math.random() < 0.5 ? -1 : 1;
        if (x + dir >= 0 && x + dir < cols && type[below + dir] === EMPTY) { swap(i, below + dir); continue; }
        if (x - dir >= 0 && x - dir < cols && type[below - dir] === EMPTY) swap(i, below - dir);
      }
    }
    let n = 0;
    const empty = u32(bg);
    for (let i = 0; i < type.length; i++) {
      if (type[i] === EMPTY) G.buf[i] = empty;
      else { G.buf[i] = col[i]; if (type[i] !== STONE) n++; }
    }
    G.count = n;
    G.octx.putImageData(G.img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = css(bg);
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(G.off, 0, 0, cols * CS, rows * CS);
  },
};

/* ── 54 · Magnetic field, its first pole following the pointer ── */
const magnetic: FxDef = {
  bg: "#070b1a", c1: "#ef4444", c2: "#3b82f6", c3: "#7dd3fc",
  draw({ ctx, t, w, h, s, bg, c1, c2, c3, pointer }) {
    if (!s.poles) s.poles = [{ x: 0.42, y: 0.55, q: 1 }, { x: 0.72, y: 0.5, q: -1 }, { x: 0.6, y: 0.22, q: 1 }];
    if (pointer) {
      const p = s.poles[0];
      p.x += (pointer.x / w - p.x) * 0.08;
      p.y += (pointer.y / h - p.y) * 0.08;
    }
    const P = s.poles.map((p: { x: number; y: number; q: number }) => ({ x: p.x * w, y: p.y * h, q: p.q }));
    const field = (x: number, y: number) => {
      let ex = 0, ey = 0;
      for (const p of P) {
        const dx = x - p.x, dy = y - p.y, r2 = dx * dx + dy * dy + 30, r3 = r2 * Math.sqrt(r2);
        ex += (p.q * dx) / r3; ey += (p.q * dy) / r3;
      }
      return [ex, ey];
    };
    ctx.fillStyle = css(bg);
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1.2;
    const filing = mix(c3, WHITE, 0.55);
    for (let y = 11; y < h; y += 22)
      for (let x = 11; x < w; x += 22) {
        const [ex, ey] = field(x, y), m = Math.hypot(ex, ey);
        if (!m) continue;
        const a = Math.min(0.55, 0.08 + Math.log10(1 + m * 6e5) * 0.12);
        const ux = (ex / m) * 5, uy = (ey / m) * 5;
        ctx.strokeStyle = css(filing, a);
        ctx.beginPath(); ctx.moveTo(x - ux, y - uy); ctx.lineTo(x + ux, y + uy); ctx.stroke();
      }
    const pos = P.filter((p: { q: number }) => p.q > 0), seeds = pos.length ? pos : P, sign = pos.length ? 1 : -1;
    ctx.lineWidth = 1.4;
    for (const p of seeds)
      for (let k = 0; k < 16; k++) {
        let x = p.x + Math.cos((k / 16) * Math.PI * 2) * 12, y = p.y + Math.sin((k / 16) * Math.PI * 2) * 12;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let step = 0; step < 300; step++) {
          const [ex, ey] = field(x, y), m = Math.hypot(ex, ey) || 1;
          x += (ex / m) * 4 * sign; y += (ey / m) * 4 * sign;
          ctx.lineTo(x, y);
          if (x < -20 || y < -20 || x > w + 20 || y > h + 20) break;
          if (P.some((o: { x: number; y: number; q: number }) => o.q * sign < 0 && Math.hypot(o.x - x, o.y - y) < 10)) break;
        }
        ctx.setLineDash([]); ctx.strokeStyle = css(c3, 0.22); ctx.stroke();
        ctx.setLineDash([3, 14]); ctx.lineDashOffset = -t * 40; ctx.strokeStyle = css(mix(c3, WHITE, 0.4), 0.85); ctx.stroke();
      }
    ctx.setLineDash([]);
    for (const p of P) {
      const tone = p.q > 0 ? c1 : c2;
      const g = ctx.createRadialGradient(p.x - 5, p.y - 5, 2, p.x, p.y, 22);
      g.addColorStop(0, css(mix(tone, WHITE, 0.7))); g.addColorStop(1, css(tone));
      ctx.shadowColor = css(tone); ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "white"; ctx.font = "bold 14px Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(p.q > 0 ? "N" : "S", p.x, p.y + 1);
    }
  },
};

/* ── 55 · Newton's cradle, set swinging by itself and by a press ── */
const newton: FxDef = {
  bg: "#0b0b0d", c1: "#94a3b8", c2: "#e2e8f0", c3: "#1e293b",
  draw({ ctx, t, w, h, s, bg, c1, c2, c3, press }) {
    const N = 5;
    if (!s.th) { s.th = [-0.7, 0, 0, 0, 0]; s.om = [0, 0, 0, 0, 0]; s.calm = t; }
    const R = Math.max(18, Math.min(34, Math.min(w, h) * 0.055));
    const narrow = w < 640;
    const L = narrow ? h * 0.26 : h * 0.42, topY = narrow ? h * 0.56 : h * 0.17, cx = w > 900 ? w * 0.66 : w * 0.5;
    const pivot = (i: number) => cx + (i - (N - 1) / 2) * 2 * R;
    const still = s.th.every((th: number, i: number) => Math.abs(th) < 0.02 && Math.abs(s.om[i]) < 0.05);
    if (press || (still && t - s.calm > 1.5)) {
      const left = press ? press.x < cx : Math.random() < 0.5;
      if (left) s.th[0] = -0.7; else s.th[N - 1] = 0.7;
    }
    if (!still) s.calm = t;
    const k = 9.8 / 0.38, sub = 12, dt = 1 / 60 / sub;
    for (let n = 0; n < sub; n++) {
      for (let i = 0; i < N; i++) {
        s.om[i] += (-k * Math.sin(s.th[i]) - 0.04 * s.om[i]) * dt;
        s.th[i] += s.om[i] * dt;
      }
      for (let i = 0; i < N - 1; i++) {
        const xa = pivot(i) + L * Math.sin(s.th[i]), xb = pivot(i + 1) + L * Math.sin(s.th[i + 1]);
        const va = L * s.om[i] * Math.cos(s.th[i]), vb = L * s.om[i + 1] * Math.cos(s.th[i + 1]);
        if (xb - xa < 2 * R + 0.01 && va > vb) [s.om[i], s.om[i + 1]] = [s.om[i + 1], s.om[i]];
      }
    }
    const back = ctx.createRadialGradient(cx, h * 0.5, 50, cx, h * 0.5, Math.max(w, h) * 0.8);
    back.addColorStop(0, css(mix(bg, WHITE, 0.12))); back.addColorStop(1, css(bg));
    ctx.fillStyle = back; ctx.fillRect(0, 0, w, h);
    const floor = topY + L + R + 50;
    ctx.fillStyle = css(mix(bg, WHITE, 0.05)); ctx.fillRect(0, floor, w, h - floor);
    const fw = (N - 1) * R + R * 6;
    const metal = ctx.createLinearGradient(0, topY - 10, 0, topY + 6);
    metal.addColorStop(0, css(mix(c1, WHITE, 0.8))); metal.addColorStop(0.5, css(c1)); metal.addColorStop(1, css(c3));
    ctx.fillStyle = metal;
    ctx.fillRect(cx - fw, topY - 10, fw * 2, 10);
    ctx.fillRect(cx - fw, topY - 10, 8, floor - topY + 10);
    ctx.fillRect(cx + fw - 8, topY - 10, 8, floor - topY + 10);
    ctx.fillStyle = css(c3); ctx.fillRect(cx - fw - 20, floor - 6, fw * 2 + 40, 12);
    for (let i = 0; i < N; i++) {
      const px = pivot(i), bx = px + L * Math.sin(s.th[i]), by = topY + L * Math.cos(s.th[i]);
      const sh = ctx.createRadialGradient(bx, floor + 4, 2, bx, floor + 4, R * 1.4);
      sh.addColorStop(0, `rgba(0,0,0,${Math.max(0, 0.55 - (floor - by) / 900)})`); sh.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(bx, floor + 4, R * 1.4, R * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = css(c2, 0.55); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px - R * 0.7, topY); ctx.lineTo(bx, by - R); ctx.moveTo(px + R * 0.7, topY); ctx.lineTo(bx, by - R); ctx.stroke();
      const g = ctx.createRadialGradient(bx - R * 0.35, by - R * 0.4, R * 0.08, bx, by, R);
      g.addColorStop(0, "#ffffff"); g.addColorStop(0.25, css(c2)); g.addColorStop(0.6, css(mix(c1, BLACK, 0.3))); g.addColorStop(0.85, css(c3)); g.addColorStop(1, css(c1));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, R, 0, Math.PI * 2); ctx.fill();
    }
  },
};

/* ── 56 · Flow-field poster: drawn over a few seconds, drawn again on a press ── */
function makeNoise(seed: number) {
  const hash = (x: number, y: number) => {
    let hh = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 982451653)) | 0;
    hh = Math.imul(hh ^ (hh >>> 13), 1274126177);
    return ((hh ^ (hh >>> 16)) >>> 0) / 4294967296;
  };
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
const flow: FxDef = {
  bg: "#140f2d", c1: "#f25f5c", c2: "#ffe066", c3: "#247ba0",
  draw({ ctx, w, h, s, bg, c1, c2, c3, press }) {
    if (press) s.seed = (s.seed ?? 427) + 1;
    if (s.resized || press || !s.p) {
      s.frame = 0; s.noise = makeNoise(s.seed ?? 427);
      ctx.fillStyle = css(bg);
      ctx.fillRect(0, 0, w, h);
      s.p = Array.from({ length: 900 }, (_, i) => ({ x: Math.random() * w, y: Math.random() * h, c: i % 4, life: 40 + Math.random() * 160 }));
    }
    if (s.frame > 520) return;
    s.frame++;
    const sc = 0.0042, cols = [c1, c2, c3, mix(c3, WHITE, 0.35)];
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.16;
    for (let c = 0; c < 4; c++) {
      ctx.strokeStyle = css(cols[c]);
      ctx.beginPath();
      for (const p of s.p) {
        if (p.c !== c) continue;
        const a = s.noise(p.x * sc, p.y * sc) * Math.PI * 4;
        const nx = p.x + Math.cos(a) * 1.4, ny = p.y + Math.sin(a) * 1.4;
        ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny);
        p.x = nx; p.y = ny;
        if (--p.life < 0 || nx < 0 || ny < 0 || nx > w || ny > h) { p.x = Math.random() * w; p.y = Math.random() * h; p.life = 40 + Math.random() * 160; }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
};

/* ── 57 · Electric arcs to the pointer; a press bursts ── */
function bolt(pts: number[][], x1: number, y1: number, x2: number, y2: number, disp: number) {
  if (disp < 3) { pts.push([x2, y2]); return; }
  const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * disp, my = (y1 + y2) / 2 + (Math.random() - 0.5) * disp;
  bolt(pts, x1, y1, mx, my, disp / 2);
  bolt(pts, mx, my, x2, y2, disp / 2);
}
const arcs: FxDef = {
  bg: "#060310", c1: "#8b5cf6", c2: "#a78bfa", c3: "#ffffff",
  draw({ ctx, t, w, h, s, bg, c1, c2, c3, pointer, press }) {
    const cx = w > 800 ? w * 0.7 : w * 0.5, cy = h * (w >800 ? 0.5 : w < 640 ? 0.88 : 0.62);
    if (!s.fil) s.fil = Array.from({ length: 6 }, (_, i) => ({ a: (i / 6) * Math.PI * 2, r: 170 + Math.random() * 90, sp: (Math.random() - 0.5) * 0.6 }));
    if (press) s.burst = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = css(bg, s.resized ? 1 : 0.38);
    ctx.fillRect(0, 0, w, h);
    const targets: number[][] = [];
    if (pointer && Math.hypot(pointer.x - cx, pointer.y - cy) < 420) for (let i = 0; i < 3; i++) targets.push([pointer.x + (Math.random() - 0.5) * 16, pointer.y + (Math.random() - 0.5) * 16]);
    for (const f of s.fil) {
      f.a += f.sp * 0.02 + (Math.random() - 0.5) * 0.04;
      targets.push([cx + Math.cos(f.a) * f.r, cy + Math.sin(f.a) * f.r]);
    }
    if (s.burst > 0) {
      for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2; targets.push([cx + Math.cos(a) * w, cy + Math.sin(a) * w]); }
      ctx.fillStyle = css(mix(c2, WHITE, 0.5), s.burst * 0.35);
      ctx.fillRect(0, 0, w, h);
      s.burst = Math.max(0, s.burst - 0.06);
    }
    ctx.globalCompositeOperation = "lighter";
    ctx.lineJoin = "round";
    for (const [tx, ty] of targets) {
      const len = Math.hypot(tx - cx, ty - cy) || 1;
      if (len < 50) continue;
      const sx = cx + (tx - cx) * (46 / len), sy = cy + (ty - cy) * (46 / len);
      const pts = [[sx, sy]];
      bolt(pts, sx, sy, tx, ty, Math.hypot(tx - sx, ty - sy) * 0.35);
      for (const [lw, col] of [[7, css(c1, 0.1)], [3, css(c2, 0.35)], [1.2, css(c3, 0.9)]] as const) {
        ctx.lineWidth = lw; ctx.strokeStyle = col;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
      if (Math.random() < 0.35) {
        const [bx, by] = pts[(pts.length / 2) | 0], br = [[bx, by]];
        bolt(br, bx, by, bx + (Math.random() - 0.5) * 120, by + (Math.random() - 0.5) * 120, 30);
        ctx.lineWidth = 1; ctx.strokeStyle = css(c2, 0.6);
        ctx.beginPath(); br.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";
    const pulse = 0.85 + Math.sin(t * 8) * 0.08 + Math.random() * 0.07;
    const g = ctx.createRadialGradient(cx - 12, cy - 14, 4, cx, cy, 46);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.3, css(mix(c2, WHITE, 0.4), pulse)); g.addColorStop(0.75, css(c1, 0.9)); g.addColorStop(1, css(times(c1, 0.35)));
    ctx.shadowColor = css(c2); ctx.shadowBlur = 60;
    ctx.beginPath(); ctx.arc(cx, cy, 46, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.shadowBlur = 0;
  },
};

/* ── 58 · Constellations: twinkling stars, a shooting star, lines drawn near the pointer ── */
const constellation: FxDef = {
  bg: "#050816", c1: "#e0e7ff", c2: "#a5b4fc", c3: "#ffffff",
  draw({ ctx, t, w, h, s, bg, c1, c2, c3, pointer }) {
    if (!s.st || s.resized) s.st = Array.from({ length: Math.round((w * h) / 2200) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.1 + 0.2, p: Math.random() * 6 }));
    ctx.fillStyle = css(bg);
    ctx.fillRect(0, 0, w, h);
    for (const st of s.st) {
      ctx.globalAlpha = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.5 + st.p));
      ctx.fillStyle = css(c1);
      ctx.fillRect(st.x, st.y, st.r, st.r);
    }
    ctx.globalAlpha = 1;
    if (pointer) {
      const near = s.st.filter((st: { x: number; y: number }) => Math.hypot(st.x - pointer.x, st.y - pointer.y) < 140).slice(0, 40);
      ctx.lineWidth = 0.8;
      for (let i = 0; i < near.length; i++)
        for (let j = i + 1; j < near.length; j++) {
          const d = Math.hypot(near[i].x - near[j].x, near[i].y - near[j].y);
          if (d > 80) continue;
          ctx.strokeStyle = css(c2, 0.5 * (1 - d / 80));
          ctx.beginPath(); ctx.moveTo(near[i].x, near[i].y); ctx.lineTo(near[j].x, near[j].y); ctx.stroke();
        }
    }
    const shoot = (t % 7) / 7;
    if (shoot < 0.12) {
      const k = shoot / 0.12, x = w * (0.2 + 0.5 * ((t / 7) % 1)), y = h * 0.15;
      ctx.strokeStyle = css(c3, 1 - k); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + k * 260, y + k * 120); ctx.lineTo(x + k * 260 - 70, y + k * 120 - 32); ctx.stroke();
    }
  },
};

/* ── 59 · Particle galaxy, turned and tilted by the pointer ── */
function makeGalaxy(arms: number, n: number) {
  return Array.from({ length: n }, () => {
    const r = Math.pow(Math.random(), 1.6);
    const arm = Math.floor(Math.random() * arms);
    const spread = (Math.random() - 0.5) * (0.5 / (r * 3 + 0.4));
    const a = (arm / arms) * Math.PI * 2 + Math.log(r + 0.05) * 2.2 + spread;
    const y = (Math.random() - 0.5) * 0.12 * (1 - r) + (Math.random() - 0.5) * 0.02;
    const neb = Math.random() < 0.05;
    const c = neb ? 4 : r < 0.1 ? 0 : r < 0.3 ? (Math.random() < 0.6 ? 1 : 0) : r < 0.65 ? 2 : 3;
    return { r, a, y, c, s: neb ? 3 : Math.random() < 0.1 ? 2 : 1.2 };
  });
}
const galaxy: FxDef = {
  bg: "#020208", c1: "#fff4d6", c2: "#b2cdff", c3: "#ff78c8",
  draw({ ctx, t, w, h, s, bg, c1, c2, c3, pointer }) {
    if (!s.g) s.g = makeGalaxy(3, 5200);
    if (!s.bgs || s.resized) s.bgs = Array.from({ length: 220 }, () => [Math.random() * w, Math.random() * h, Math.random() * 0.6]);
    s.spin = (s.spin ?? 0) + 0.0015;
    const wantTilt = pointer ? 0.5 + (pointer.y / h) * 1.0 : 1.1;
    s.tilt = (s.tilt ?? 1.1) + (wantTilt - (s.tilt ?? 1.1)) * 0.04;
    s.turn = (s.turn ?? 0) + ((pointer ? (pointer.x / w - 0.5) * 2 : 0) - (s.turn ?? 0)) * 0.04;
    const cx = w / 2, cy = h / 2, scale = Math.min(w, h) * 0.62, f = 2.4;
    ctx.fillStyle = css(bg);
    ctx.fillRect(0, 0, w, h);
    for (const [x, y, a] of s.bgs) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(x, y, 1, 1); }
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.35);
    glow.addColorStop(0, css(c1, 0.35)); glow.addColorStop(1, css(c1, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    const cols = [css(c1, 0.85), css(mix(c1, c3, 0.35), 0.7), css(c2, 0.7), css(times(c2, 0.7), 0.6), css(c3, 0.35)];
    const ct = Math.cos(s.tilt), stl = Math.sin(s.tilt);
    for (let c = 0; c < cols.length; c++) {
      ctx.fillStyle = cols[c];
      for (const p of s.g) {
        if (p.c !== c) continue;
        const a = p.a + s.spin + s.turn + t * 0.06 + Math.sin(t * 0.4 + p.r * 12) * 0.015;
        const X = p.r * Math.cos(a), Z = p.r * Math.sin(a);
        const Y2 = p.y * ct - Z * stl, Z2 = p.y * stl + Z * ct;
        const k = f / (f + Z2);
        ctx.fillRect(cx + X * scale * k, cy + Y2 * scale * k, p.s * k, p.s * k);
      }
    }
    ctx.globalCompositeOperation = "source-over";
  },
};

/* ── 60 · Koi pond: real ripples under the pointer, a drop on a press ── */
const PC = 3;
const PADS = [[0.14, 0.22, 38], [0.86, 0.3, 46], [0.78, 0.8, 34], [0.24, 0.84, 30], [0.56, 0.12, 26]];
const koi: FxDef = {
  bg: "#06262b", c1: "#f97316", c2: "#1f6f78", c3: "#3f8f4a",
  draw({ ctx, t, w, h, s, bg, c1, c2, c3, pointer, press }) {
    if (!s.W || s.resized) {
      const W = Math.max(2, Math.floor(w / PC)), H = Math.max(2, Math.floor(h / PC));
      const scene = document.createElement("canvas"), out = document.createElement("canvas");
      scene.width = out.width = W; scene.height = out.height = H;
      s.W = W; s.H = H; s.a = new Float32Array(W * H); s.b = new Float32Array(W * H);
      s.scene = scene; s.sctx = scene.getContext("2d", { willReadFrequently: true }); s.out = out; s.octx = out.getContext("2d"); s.img = s.octx.createImageData(W, H);
      s.koi = Array.from({ length: 5 }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, a: Math.random() * 6.28, sp: 0.25 + Math.random() * 0.2, c: i % 3, ph: Math.random() * 6 }));
      s.last = 0;
    }
    const { W, H } = s;
    const disturb = (x: number, y: number, r: number, amp: number) => {
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        const X = x + i, Y = y + j;
        if (X > 0 && Y > 0 && X < W - 1 && Y < H - 1 && i * i + j * j <= r * r) s.a[Y * W + X] += amp;
      }
    };
    if (pointer) disturb(Math.floor(pointer.x / PC), Math.floor(pointer.y / PC), 1, 60);
    if (press) disturb(Math.floor(press.x / PC), Math.floor(press.y / PC), 3, 500);
    if (t - s.last > 0.5) { s.last = t; disturb(Math.floor(Math.random() * W), Math.floor(Math.random() * H), 1, 160); }
    const { a, b } = s;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      b[i] = ((a[i - 1] + a[i + 1] + a[i - W] + a[i + W]) / 2 - b[i]) * 0.975;
    }
    s.a = b; s.b = a;
    const sc = s.sctx as CanvasRenderingContext2D;
    const g = sc.createRadialGradient(W * 0.5, H * 0.45, 4, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
    g.addColorStop(0, css(c2)); g.addColorStop(1, css(bg));
    sc.fillStyle = g; sc.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) { sc.fillStyle = css(times(bg, 1.6), 0.4 + (i % 3) * 0.15); sc.beginPath(); sc.ellipse((i * 97) % W, (i * 53) % H, 4 + (i % 4) * 2, 3 + (i % 3) * 2, i, 0, Math.PI * 2); sc.fill(); }
    const fish = [css(c1), "#fafafa", css(mix(c1, WHITE, 0.25))];
    for (const k of s.koi) {
      k.a += Math.sin(t * 0.4 + k.ph) * 0.012;
      k.x += Math.cos(k.a) * k.sp; k.y += Math.sin(k.a) * k.sp;
      if (k.x < -20) k.x = W + 20; if (k.x > W + 20) k.x = -20; if (k.y < -20) k.y = H + 20; if (k.y > H + 20) k.y = -20;
      sc.save(); sc.translate(k.x, k.y); sc.rotate(k.a);
      const wig = Math.sin(t * 6 + k.ph) * 0.35;
      sc.fillStyle = fish[k.c];
      sc.beginPath(); sc.ellipse(0, 0, 10, 3.6, 0, 0, Math.PI * 2); sc.fill();
      sc.beginPath(); sc.moveTo(-8, 0); sc.lineTo(-15, -4 + wig * 4); sc.lineTo(-15, 4 + wig * 4); sc.fill();
      sc.fillStyle = k.c === 1 ? css(c1) : "#fff7ed";
      sc.beginPath(); sc.ellipse(3, 0.5, 3.5, 2, 0.3, 0, Math.PI * 2); sc.fill();
      sc.restore();
    }
    const src = sc.getImageData(0, 0, W, H).data, dst = s.img.data, hgt = s.a;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const dx = hgt[i - 1] - hgt[i + 1], dy = hgt[i - W] - hgt[i + W];
      const sx = Math.min(W - 1, Math.max(0, x + ((dx * 0.06) | 0))), sy = Math.min(H - 1, Math.max(0, y + ((dy * 0.06) | 0)));
      const si = (sy * W + sx) * 4, di = i * 4, l = dx * 0.35;
      dst[di] = src[si] + l; dst[di + 1] = src[si + 1] + l; dst[di + 2] = src[si + 2] + l; dst[di + 3] = 255;
    }
    s.octx.putImageData(s.img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(s.out, 0, 0, w, h);
    for (const [px, py, r] of PADS) {
      const x = px * w + Math.sin(t * 0.3 + px * 9) * 4, y = py * h + Math.cos(t * 0.25 + py * 9) * 3;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath(); ctx.ellipse(x + 6, y + 8, r, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = css(c3);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, 0.35, Math.PI * 2 - 0.05); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = css(times(c3, 0.45), 0.6); ctx.lineWidth = 1.2;
      for (let k = 0; k < 7; k++) { const an = 0.6 + k * 0.8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(an) * r * 0.85, y + Math.sin(an) * r * 0.85); ctx.stroke(); }
      if (r > 40) { ctx.fillStyle = "#f9a8d4"; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(x - 6 + Math.cos(k) * 5, y - 6 + Math.sin(k) * 5, 7, 3.5, k, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = "#fde047"; ctx.beginPath(); ctx.arc(x - 6, y - 6, 3, 0, Math.PI * 2); ctx.fill(); }
    }
  },
};

export const FX_ENGINES: Record<string, FxDef> = { cloth, murmuration, sand, magnetic, newton, flow, arcs, constellation, galaxy, koi };
/** How many frames to run before a still picture (for whoever asked for less motion): a poster's whole drawing. */
export const FX_WARMUP: Record<string, number> = { flow: 520, sand: 240 };
