/**
 * The scanned 3D model, turned with the pointer (or the arrow keys), drawn in plain code
 * (raster.ts): its own colours, lit from the front and above. No 3D library in the admin.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { tr } from "../../lib/words";
import type { Mesh } from "./model";
import { rasterize } from "./raster";

const SIZE = 360;

export function ModelPreview({ mesh, testId }: { mesh: Mesh; testId?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState({ yaw: 0.6, pitch: 0.35 });
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  // Centred on its box, scaled to fill the picture.
  const frame = useMemo(() => {
    const p = mesh.positions;
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.length; i += 3)
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], p[i + k]);
        hi[k] = Math.max(hi[k], p[i + k]);
      }
    const centre = lo.map((v, k) => (v + hi[k]) / 2);
    const radius = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2 || 1;
    return { centre, radius };
  }, [mesh]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const n = mesh.positions.length / 3;
    const p = mesh.positions;
    const nr = mesh.normals;
    const cy = Math.cos(view.yaw);
    const sy = Math.sin(view.yaw);
    const cp = Math.cos(view.pitch);
    const sp = Math.sin(view.pitch);
    const screen = new Float32Array(n * 3);
    const lit = new Float32Array(n * 3);
    const scale = (SIZE * 0.42) / frame.radius;
    const dist = frame.radius * 4;
    // The light, in the view's own terms: from the front, above and a little left.
    const L = [-0.35, 0.55, 0.76];
    for (let i = 0; i < n; i++) {
      const x = p[i * 3] - frame.centre[0];
      const y = p[i * 3 + 1] - frame.centre[1];
      const z = p[i * 3 + 2] - frame.centre[2];
      // Turn round y (yaw), then tip towards the viewer (pitch).
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y2 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      const persp = dist / (dist - z2);
      screen[i * 3] = SIZE / 2 + x1 * scale * persp;
      screen[i * 3 + 1] = SIZE / 2 - y2 * scale * persp;
      screen[i * 3 + 2] = -z2;
      const nx = nr[i * 3] * cy + nr[i * 3 + 2] * sy;
      const nz1 = -nr[i * 3] * sy + nr[i * 3 + 2] * cy;
      const ny = nr[i * 3 + 1] * cp - nz1 * sp;
      const nz = nr[i * 3 + 1] * sp + nz1 * cp;
      const light = 0.38 + 0.62 * Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      for (let k = 0; k < 3; k++) lit[i * 3 + k] = Math.min(255, mesh.colors[i * 4 + k] * light);
    }
    const img = new ImageData(SIZE, SIZE);
    const depth = new Float32Array(SIZE * SIZE).fill(Infinity);
    rasterize(
      screen,
      mesh.indices,
      SIZE,
      SIZE,
      depth,
      (px, a, b, cc, wa, wb, wc) => {
        for (let k = 0; k < 3; k++) img.data[px * 4 + k] = wa * lit[a * 3 + k] + wb * lit[b * 3 + k] + wc * lit[cc * 3 + k];
        img.data[px * 4 + 3] = 255;
      },
    );
    c.getContext("2d")!.putImageData(img, 0, 0);
  }, [mesh, view, frame]);

  return (
    <div className="flex flex-col items-center gap-1">
      <canvas
        ref={canvas}
        width={SIZE}
        height={SIZE}
        className="max-w-full rounded-xl bg-[repeating-conic-gradient(#0000000d_0%_25%,transparent_0%_50%)] [background-size:16px_16px]"
        style={{ touchAction: "none", cursor: "grab" }}
        tabIndex={0}
        role="img"
        aria-label={tr("الموديل 3D، اسحب لتلفّه", "The 3D model; drag to turn it")}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, ...view };
          (e.target as Element).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) setView({ yaw: d.yaw + (e.clientX - d.x) * 0.012, pitch: Math.max(-1.3, Math.min(1.3, d.pitch + (e.clientY - d.y) * 0.01)) });
        }}
        onPointerUp={() => (drag.current = null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setView((v) => ({ ...v, yaw: v.yaw - 0.2 }));
          if (e.key === "ArrowRight") setView((v) => ({ ...v, yaw: v.yaw + 0.2 }));
          if (e.key === "ArrowUp") setView((v) => ({ ...v, pitch: Math.max(-1.3, v.pitch - 0.15) }));
          if (e.key === "ArrowDown") setView((v) => ({ ...v, pitch: Math.min(1.3, v.pitch + 0.15) }));
        }}
        data-testid={testId}
        data-yaw={view.yaw.toFixed(2)}
      />
      <span className="text-[11px] text-white/40">{tr("اسحب لتلفّ الموديل", "Drag to turn the model")}</span>
    </div>
  );
}
