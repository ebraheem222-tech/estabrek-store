/**
 * A picture's stars on the canvas (focus mode, A3+): a dot for each, at its place over the picture's box. A dot is
 * dragged to move its star (saved when let go) and double-clicked to take it away; the chosen one is ringed.
 * Adding one (a click on the picture with the pen on) is the studio's: it owns clicks on the page.
 */
import { useRef, useState } from "react";
import type { SparklePoint } from "../../../../shared/sparkle";
import type { Box } from "../geometry";
import { say } from "../say";

export function SparkleHandles({ box, points, chosen, busy, onMove, onRemove, onPick }: {
  box: Box;
  points: SparklePoint[];
  chosen: number | null;
  busy: boolean;
  onMove: (i: number, p: { x: number; y: number }) => void;
  onRemove: (i: number) => void;
  onPick: (i: number) => void;
}) {
  const [drag, setDrag] = useState<{ i: number; x: number; y: number } | null>(null);
  const grab = useRef<{ i: number; pointer: number; moved: boolean } | null>(null);
  const frac = (e: React.PointerEvent) => {
    const r = (e.currentTarget as Element).closest("[data-sparkle-area]")!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  return (
    <div className="pointer-events-none absolute" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} data-sparkle-area="" data-testid="studio-sparkle-handles" aria-label={say("نجوم الصورة|The picture's stars|כוכבי התמונה")}>
      {points.map((p, i) => {
        const at = drag?.i === i ? drag : p;
        return (
          <button
            key={i} type="button" tabIndex={-1}
            className={`pointer-events-auto absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${chosen === i ? "border-sky-300 bg-sky-400/70" : "border-white bg-amber-300/80"} shadow ${busy ? "" : "cursor-move"}`}
            style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}
            aria-label={`${say("نجمة|Star|כוכב")} ${i + 1}`}
            onPointerDown={(e) => {
              if (busy || e.button !== 0) return;
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              grab.current = { i, pointer: e.pointerId, moved: false };
              onPick(i);
            }}
            onPointerMove={(e) => {
              const g = grab.current;
              if (!g || g.pointer !== e.pointerId) return;
              g.moved = true;
              setDrag({ i, ...frac(e) });
            }}
            onPointerUp={(e) => {
              const g = grab.current;
              if (!g || g.pointer !== e.pointerId) return;
              e.stopPropagation();
              grab.current = null;
              const end = drag;
              setDrag(null);
              if (g.moved && end) onMove(i, { x: Math.round(end.x * 1000) / 1000, y: Math.round(end.y * 1000) / 1000 });
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!busy) onRemove(i);
            }}
            data-testid="studio-sparkle-dot"
            data-i={i}
          />
        );
      })}
    </div>
  );
}
