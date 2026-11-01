/**
 * The selected element's handles on the editor's canvas: resize from a side or corner
 * (Shift keeps the proportions; a double-click goes back to its natural size) and turn it
 * from the knob above it (Shift snaps to 15°). The frame shows a turn while it's dragged;
 * a resize shows its new size on the outline. Both save when let go (handles.ts).
 */
import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { tr } from "../lib/words";
import type { Box, Pt } from "./geometry";
import { CURSOR, HANDLES, angleAt, handleAt, resizeBox, turnTo, type Gap, type Guide, type Handle } from "./handles";

type Drag = { kind: "size"; h: Handle; start: Box; p0: Pt } | { kind: "turn"; c: Pt; a0: number; base: number };

export function SelectionHandles({ box, zoom, sides, turn, local, onSize, onReset, onTurnLive, onTurn }: {
  /** The element's box on the canvas. */
  box: Box;
  zoom: number;
  /** "all": every side; "width": the sides only (words keep their own height). */
  sides: "all" | "width";
  /** Its turn now (degrees), or null when it can't be turned here. */
  turn: number | null;
  local: (e: { clientX: number; clientY: number }) => Pt;
  /** The new size in the page's pixels; null for a side that wasn't dragged. */
  onSize: (w: number | null, h: number | null) => void;
  onReset: () => void;
  onTurnLive: (deg: number) => void;
  onTurn: (deg: number) => void;
}) {
  const drag = useRef<Drag | null>(null);
  const [live, setLive] = useState<{ box?: Box; deg?: number } | null>(null);
  const shown = live?.box ?? box;
  const handles = sides === "all" ? HANDLES : (["e", "w"] as Handle[]);
  const start = (e: ReactPointerEvent, d: Drag) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = d;
  };
  const move = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    const p = local(e);
    if (d.kind === "size") setLive({ box: resizeBox(d.start, d.h, p.x - d.p0.x, p.y - d.p0.y, e.shiftKey) });
    else {
      const deg = turnTo(d.base + angleAt(d.c, p) - d.a0, e.shiftKey ? 15 : 0);
      setLive({ deg });
      onTurnLive(deg);
    }
  };
  const end = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    e.stopPropagation();
    const was = live;
    setLive(null);
    if (!d || !was) return;
    if (d.kind === "size" && was.box) {
      const w = d.h === "n" || d.h === "s" ? null : Math.round(was.box.w / zoom);
      const h = d.h === "e" || d.h === "w" ? null : Math.round(was.box.h / zoom);
      onSize(w, h);
    } else if (d.kind === "turn" && typeof was.deg === "number") onTurn(was.deg);
  };
  const knob = { x: box.x + box.w / 2, y: box.y - 28 };
  return (
    <>
      {live?.box ? (
        <div className="pointer-events-none absolute border-2 border-dashed border-accent-300" style={{ left: shown.x, top: shown.y, width: shown.w, height: shown.h }} data-testid="studio-sizing">
          <span className="absolute -bottom-6 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-accent-500 px-1.5 py-0.5 text-[11px] text-white" dir="ltr">
            {Math.round(shown.w / zoom)} × {Math.round(shown.h / zoom)}
          </span>
        </div>
      ) : null}
      {handles.map((h) => {
        const at = handleAt(box, h);
        return (
          <div
            key={h}
            role="slider"
            aria-label={tr("اسحب لتغيير الحجم، كبستين للحجم الطبيعي", "Drag to resize, double-click for its natural size")}
            className="pointer-events-auto absolute z-20 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 touch-none rounded-sm border border-accent-500 bg-white shadow"
            style={{ left: at.x, top: at.y, cursor: CURSOR[h] }}
            onPointerDown={(e) => start(e, { kind: "size", h, start: box, p0: local(e) })}
            onPointerMove={move}
            onPointerUp={end}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            data-testid="studio-handle"
            data-handle={h}
          />
        );
      })}
      {turn !== null ? (
        <>
          <div className="pointer-events-none absolute z-10 w-px bg-accent-400/70" style={{ left: knob.x, top: knob.y + 6, height: 22 }} />
          <div
            role="slider"
            aria-label={tr("اسحب لتدويره (Shift كل 15°)", "Drag to turn it (Shift: every 15°)")}
            aria-valuenow={live?.deg ?? turn}
            className="pointer-events-auto absolute z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-accent-500 bg-white shadow"
            style={{ left: knob.x, top: knob.y, cursor: "grab" }}
            onPointerDown={(e) => start(e, { kind: "turn", c: { x: box.x + box.w / 2, y: box.y + box.h / 2 }, a0: angleAt({ x: box.x + box.w / 2, y: box.y + box.h / 2 }, local(e)), base: turn })}
            onPointerMove={move}
            onPointerUp={end}
            data-testid="studio-turn"
          />
          {typeof live?.deg === "number" ? (
            <span className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-accent-500 px-1.5 py-0.5 text-[11px] text-white" style={{ left: knob.x, top: knob.y - 30 }} dir="ltr" data-testid="studio-turn-deg">{live.deg}°</span>
          ) : null}
        </>
      ) : null}
    </>
  );
}

/** Guide lines a dragged element snaps to, and the distances shown with Alt (labels in the page's pixels). */
export function Guides({ guides, gaps, zoom }: { guides: Guide[]; gaps: Gap[]; zoom: number }) {
  return (
    <>
      {guides.map((g, i) => (
        <div key={`g${i}`} className="pointer-events-none absolute z-10 bg-pink-500" style={g.x1 === g.x2 ? { left: g.x1, top: g.y1, width: 1, height: g.y2 - g.y1 } : { left: g.x1, top: g.y1, width: g.x2 - g.x1, height: 1 }} data-testid="studio-guide" />
      ))}
      {gaps.map((g, i) => {
        const across = g.y1 === g.y2;
        return (
          <div key={`d${i}`} className="pointer-events-none absolute z-10 bg-rose-500" style={across ? { left: Math.min(g.x1, g.x2), top: g.y1, width: Math.abs(g.x2 - g.x1), height: 1 } : { left: g.x1, top: Math.min(g.y1, g.y2), width: 1, height: Math.abs(g.y2 - g.y1) }} data-testid="studio-gap">
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-rose-500 px-1 text-[10px] text-white" dir="ltr">{Math.round(g.length / zoom)}</span>
          </div>
        );
      })}
    </>
  );
}
