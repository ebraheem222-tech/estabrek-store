/**
 * A path's points on the canvas (focus mode, A2): squares for its points, circles for its curve handles with a line
 * to the point they hang from. Dragging one moves it (a point takes its handles along); the page shows the new
 * shape while the hand moves (onLive) and it's saved when let go (onDone). `matrix` takes the path's own numbers
 * to the canvas (the frame's measure of the shape, then the zoom and pan).
 */
import { useRef, useState } from "react";
import { say } from "../say";
import { apply, handlesOf, invert, moveHandle, parsePath, writePath, type Handle, type Matrix, type Seg } from "./pathData";

/** b then a: the matrix that does `b` first, then `a`. */
export const compose = (a: Matrix, b: Matrix): Matrix => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];

export function PathHandles({ d, matrix, area, busy, onLive, onDone }: { d: string; matrix: Matrix; area: { w: number; h: number }; busy: boolean; onLive: (d: string) => void; onDone: (d: string) => void }) {
  const [live, setLive] = useState<Seg[] | null>(null);
  const grab = useRef<{ h: Pick<Handle, "i" | "k">; start: Seg[]; pointer: number } | null>(null);
  const segs = live ?? parsePath(d);
  const back = invert(matrix);
  if (!back || segs.length > 400) return null;
  const handles = handlesOf(segs);
  const on = (p: { x: number; y: number }) => apply(matrix, p);
  const local = (e: React.PointerEvent) => {
    const r = (e.currentTarget as Element).closest("svg")!.getBoundingClientRect();
    return apply(back, { x: e.clientX - r.left, y: e.clientY - r.top });
  };
  return (
    <svg className="pointer-events-none absolute inset-0" width={area.w} height={area.h} data-testid="studio-path-handles" aria-label={say("نقاط المسار|The path's points|נקודות הנתיב")}>
      {handles.filter((h) => h.k !== "p").map((h) => {
        const a = on(h.anchor), c = on(h.at);
        return <line key={`l${h.i}${h.k}`} x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="rgba(168,140,255,0.7)" strokeWidth={1} />;
      })}
      {handles.map((h) => {
        const c = on(h.at);
        const props = {
          className: `pointer-events-auto ${busy ? "" : "cursor-move"}`,
          onPointerDown: (e: React.PointerEvent<SVGElement>) => {
            if (busy || e.button !== 0) return;
            e.stopPropagation();
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
            grab.current = { h: { i: h.i, k: h.k }, start: segs, pointer: e.pointerId };
          },
          onPointerMove: (e: React.PointerEvent<SVGElement>) => {
            const g = grab.current;
            if (!g || g.pointer !== e.pointerId) return;
            e.stopPropagation();
            const next = moveHandle(g.start, g.h, local(e));
            setLive(next);
            onLive(writePath(next));
          },
          onPointerUp: (e: React.PointerEvent<SVGElement>) => {
            const g = grab.current;
            if (!g || g.pointer !== e.pointerId) return;
            e.stopPropagation();
            grab.current = null;
            const next = live;
            setLive(null);
            if (next) onDone(writePath(next));
          },
          "data-testid": h.k === "p" ? "studio-path-point" : "studio-path-control",
          "data-at": `${h.i}:${h.k}`,
        };
        return h.k === "p"
          ? <rect key={`p${h.i}`} x={c.x - 4.5} y={c.y - 4.5} width={9} height={9} rx={1.5} fill="white" stroke="rgb(124,92,255)" strokeWidth={1.5} {...props} />
          : <circle key={`c${h.i}${h.k}`} cx={c.x} cy={c.y} r={4} fill="rgb(168,140,255)" stroke="white" strokeWidth={1} {...props} />;
      })}
    </svg>
  );
}
