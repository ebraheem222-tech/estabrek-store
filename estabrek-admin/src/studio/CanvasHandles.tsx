/**
 * The selected element's handles on the editor's canvas: resize from a side or corner
 * (Shift keeps the proportions; a double-click goes back to its natural size) and turn it
 * from the knob above it (Shift snaps to 15°). The frame shows a turn while it's dragged;
 * a resize previews its new size. Both save from the final pointer coordinates.
 */
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { tr } from "../lib/words";
import type { Box, Pt } from "./geometry";
import { CURSOR, HANDLES, angleAt, handleAt, nudgeOf, resizeBox, resizeFrame, turnTo, type Gap, type Guide, type Handle, type RatioLimits, type ResizeChange, type ResizeFrame } from "./handles";

type SizeDrag = { kind: "size"; h: Handle; start: Box; p0: Pt; zoom: number; frame?: ResizeFrame; proportional?: boolean; ratioLimits?: RatioLimits };
type Drag = (SizeDrag | { kind: "turn"; c: Pt; a0: number; base: number }) & {
  pointerId: number;
  target: HTMLElement;
  local: (e: { clientX: number; clientY: number }) => Pt;
  callbacks: Pick<SelectionHandlesProps, "onSize" | "onSizeLive" | "onCancel" | "onTurn" | "onTurnLive">;
};

type SelectionHandlesProps = {
  /** The element's box on the canvas. */
  box: Box;
  zoom: number;
  /** Optional unrotated canvas-pixel dimensions and own 2D rotation about the box centre. */
  frame?: ResizeFrame;
  /** Groups scale all descendants together, independently of the Shift key. */
  proportional?: boolean;
  ratioLimits?: RatioLimits | ((handle: Handle) => RatioLimits);
  /** "all": every side; "width": the sides only (words keep their own height). */
  sides: "all" | "width";
  /** Its turn now (degrees), or null when it can't be turned here. */
  turn: number | null;
  local: (e: { clientX: number; clientY: number }) => Pt;
  /** The new size in the page's pixels; null for a side that wasn't dragged. */
  onSize: (w: number | null, h: number | null, change: ResizeChange) => void;
  onSizeLive?: (w: number | null, h: number | null, change: ResizeChange) => void;
  /** Restore a live preview after cancellation (also called on active unmount). */
  onCancel?: () => void;
  onReset: () => void;
  onTurnLive: (deg: number) => void;
  onTurn: (deg: number) => void;
};

function changeAt(d: SizeDrag, p: Pt, keepProportions: boolean): ResizeChange {
  keepProportions = Boolean(d.proportional || keepProportions);
  const dx = p.x - d.p0.x;
  const dy = p.y - d.p0.y;
  if (d.frame) {
    const resized = resizeFrame(d.start, d.frame, d.h, dx, dy, keepProportions, 8 * d.zoom, d.ratioLimits);
    return { handle: d.h, start: d.start, box: resized.box, zoom: d.zoom, keepProportions, frame: { start: d.frame, current: resized.current, offset: resized.offset } };
  }
  return { handle: d.h, start: d.start, box: resizeBox(d.start, d.h, dx, dy, keepProportions, 8 * d.zoom), zoom: d.zoom, keepProportions };
}

function dimensions(change: ResizeChange): [number | null, number | null] {
  const size = change.frame?.current ?? change.box;
  return [
    change.keepProportions || /[ew]/.test(change.handle) ? Math.round(size.w / change.zoom) : null,
    change.keepProportions || /[ns]/.test(change.handle) ? Math.round(size.h / change.zoom) : null,
  ];
}

function release(d: Drag) {
  if (d.target.hasPointerCapture?.(d.pointerId)) d.target.releasePointerCapture(d.pointerId);
}

function restore(d: Drag) {
  if (d.callbacks.onCancel) d.callbacks.onCancel();
  else if (d.kind === "turn") d.callbacks.onTurnLive(d.base);
}

export function SelectionHandles({ box, zoom, frame, proportional, ratioLimits, sides, turn, local, onSize, onSizeLive, onCancel, onReset, onTurnLive, onTurn }: SelectionHandlesProps) {
  const drag = useRef<Drag | null>(null);
  const [live, setLive] = useState<{ change?: ResizeChange; deg?: number } | null>(null);
  const shown = live?.change?.box ?? box;
  const shownFrame = live?.change?.frame?.current ?? frame;
  const handles = sides === "all" ? HANDLES : (["e", "w"] as Handle[]);
  const scale = zoom > 0 && Number.isFinite(zoom) ? zoom : 1;
  const limitsFor = (handle: Handle) => typeof ratioLimits === "function" ? ratioLimits(handle) : ratioLimits;
  // Keep this listener independent of changing live-preview props. Each gesture owns
  // its original callbacks, coordinate mapping, frame, and zoom until it ends.
  useEffect(() => {
    const cancelActive = () => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      release(d);
      restore(d);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !drag.current) return;
      e.preventDefault();
      e.stopPropagation();
      cancelActive();
      setLive(null);
    };
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      cancelActive();
    };
  }, []);
  const start = (e: ReactPointerEvent<HTMLElement>, d: SizeDrag | { kind: "turn"; c: Pt; a0: number; base: number }) => {
    if (drag.current || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    drag.current = { ...d, pointerId: e.pointerId, target: e.currentTarget, local, callbacks: { onSize, onSizeLive, onCancel, onTurnLive, onTurn } };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    e.stopPropagation();
    const p = d.local(e);
    if (d.kind === "size") {
      const change = changeAt(d, p, e.shiftKey);
      setLive({ change });
      d.callbacks.onSizeLive?.(...dimensions(change), change);
    } else {
      const deg = turnTo(d.base + angleAt(d.c, p) - d.a0, e.shiftKey ? 15 : 0);
      setLive({ deg });
      d.callbacks.onTurnLive(deg);
    }
  };
  const end = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    e.stopPropagation();
    release(d);
    setLive(null);
    const p = d.local(e);
    if (d.kind === "size") {
      const change = changeAt(d, p, e.shiftKey);
      if (["x", "y", "w", "h"].every((key) => Math.abs(change.box[key as keyof Box] - change.start[key as keyof Box]) < 1e-7)) {
        restore(d);
        return;
      }
      d.callbacks.onSize(...dimensions(change), change);
    } else {
      const deg = turnTo(d.base + angleAt(d.c, p) - d.a0, e.shiftKey ? 15 : 0);
      if (deg === turnTo(d.base)) restore(d);
      else d.callbacks.onTurn(deg);
    }
  };
  const cancel = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    e.stopPropagation();
    drag.current = null;
    release(d);
    setLive(null);
    restore(d);
  };
  const resizeKey = (e: ReactKeyboardEvent<HTMLElement>, h: Handle) => {
    if (drag.current || e.altKey || e.ctrlKey || e.metaKey) return;
    const delta = nudgeOf(e.key, e.shiftKey);
    if (!delta || (!(h.includes("w") || h.includes("e")) && delta.x) || (!(h.includes("n") || h.includes("s")) && delta.y)) return;
    e.preventDefault();
    e.stopPropagation();
    // Arrow keys move the local handle by one page pixel (Shift: ten).
    const p = { x: delta.x * scale, y: delta.y * scale };
    if (frame) {
      const radians = frame.rotation * Math.PI / 180;
      [p.x, p.y] = [p.x * Math.cos(radians) - p.y * Math.sin(radians), p.x * Math.sin(radians) + p.y * Math.cos(radians)];
    }
    const change = changeAt({ kind: "size", h, start: box, p0: { x: 0, y: 0 }, zoom: scale, frame, proportional, ratioLimits: limitsFor(h) }, p, false);
    if (["x", "y", "w", "h"].every(key => Math.abs(change.box[key as keyof Box] - change.start[key as keyof Box]) < 1e-7)) return;
    onSize(...dimensions(change), change);
  };
  const knob = { x: box.x + box.w / 2, y: box.y - 28 };
  return (
    <>
      {live?.change ? (
        <div className="pointer-events-none absolute border-2 border-dashed border-accent-300" style={shownFrame ? { left: shown.x + shown.w / 2 - shownFrame.w / 2, top: shown.y + shown.h / 2 - shownFrame.h / 2, width: shownFrame.w, height: shownFrame.h, transform: `rotate(${shownFrame.rotation}deg)` } : { left: shown.x, top: shown.y, width: shown.w, height: shown.h }} data-testid="studio-sizing">
          <span className="absolute -bottom-6 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-accent-500 px-1.5 py-0.5 text-[11px] text-white" dir="ltr">
            {Math.round((shownFrame?.w ?? shown.w) / scale)} × {Math.round((shownFrame?.h ?? shown.h) / scale)}
          </span>
        </div>
      ) : null}
      {handles.map((h) => {
        const at = handleAt(shown, h, shownFrame);
        return (
          <div
            key={h}
            role="slider"
            tabIndex={0}
            aria-valuemin={8}
            aria-valuenow={Math.round((h === "n" || h === "s" ? shownFrame?.h ?? shown.h : shownFrame?.w ?? shown.w) / scale)}
            aria-valuetext={`${Math.round((shownFrame?.w ?? shown.w) / scale)} × ${Math.round((shownFrame?.h ?? shown.h) / scale)}`}
            aria-label={tr("اسحب لتغيير الحجم، كبستين للحجم الطبيعي", "Drag to resize, double-click for its natural size")}
            className="pointer-events-auto absolute z-20 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 touch-none rounded-sm border border-accent-500 bg-white shadow"
            style={{ left: at.x, top: at.y, cursor: CURSOR[h] }}
            onPointerDown={(e) => start(e, { kind: "size", h, start: { ...box }, p0: local(e), zoom: scale, frame: frame ? { ...frame } : undefined, proportional, ratioLimits: limitsFor(h) ? { ...limitsFor(h)! } : undefined })}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={cancel}
            onLostPointerCapture={cancel}
            onKeyDown={(e) => resizeKey(e, h)}
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
            tabIndex={0}
            aria-valuemin={-180}
            aria-valuemax={180}
            aria-label={tr("اسحب لتدويره (Shift كل 15°)", "Drag to turn it (Shift: every 15°)")}
            aria-valuenow={live?.deg ?? turn}
            className="pointer-events-auto absolute z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-accent-500 bg-white shadow"
            style={{ left: knob.x, top: knob.y, cursor: "grab" }}
            onPointerDown={(e) => start(e, { kind: "turn", c: { x: box.x + box.w / 2, y: box.y + box.h / 2 }, a0: angleAt({ x: box.x + box.w / 2, y: box.y + box.h / 2 }, local(e)), base: turn })}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={cancel}
            onLostPointerCapture={cancel}
            onKeyDown={(e) => {
              if (drag.current || e.altKey || e.ctrlKey || e.metaKey) return;
              const delta = nudgeOf(e.key, false);
              if (!delta) return;
              e.preventDefault();
              e.stopPropagation();
              onTurn(turnTo(turn + (delta.x || -delta.y) * (e.shiftKey ? 15 : 1)));
            }}
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
