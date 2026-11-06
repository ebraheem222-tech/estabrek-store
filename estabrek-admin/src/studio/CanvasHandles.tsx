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
import { boundsOfQuad, planeQuad, project3, type Mat3, type Plane } from "../../../shared/geometry/plane";
import { CURSOR, HANDLES, angleAt, handleAt, nudgeOf, resizeBox, resizeFrame, turnTo, type Gap, type Guide, type Handle, type RatioLimits, type ResizeChange, type ResizeFrame } from "./handles";

export type PlanarHandleGeometry = {
  plane: Plane;
  resize: (handle: Handle, delta: Pt, keep: boolean) => (NonNullable<ResizeChange["plane"]> & { box: Box }) | null;
};

type SizeDrag = { kind: "size"; h: Handle; start: Box; p0: Pt; zoom: number; frame?: ResizeFrame; geometry?: PlanarHandleGeometry; proportional?: boolean; ratioLimits?: RatioLimits };
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
  /** The measured local plane and a resize planner captured for each gesture. */
  geometry?: PlanarHandleGeometry;
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

function finiteValues(value: unknown, seen = new Set<object>()): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (!value || typeof value !== "object") return typeof value !== "function";
  if (seen.has(value)) return false;
  seen.add(value);
  const valid = Object.values(value).every(child => finiteValues(child, seen));
  seen.delete(value);
  return valid;
}

function planarHandle(plane: Plane, handle: Handle): Pt | null {
  return project3(plane.matrix, { x: plane.w * (handle.includes("w") ? 0 : handle.includes("e") ? 1 : .5), y: plane.h * (handle.includes("n") ? 0 : handle.includes("s") ? 1 : .5) });
}

function changeAt(d: SizeDrag, p: Pt, keepProportions: boolean): ResizeChange | null {
  keepProportions = Boolean(d.proportional || keepProportions);
  const dx = p.x - d.p0.x;
  const dy = p.y - d.p0.y;
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (d.geometry) {
    const result = d.geometry.resize(d.h, { x: dx, y: dy }, keepProportions);
    if (!result || !Array.isArray(result.matrix) || result.matrix.length !== 9 || !result.matrix.every(Number.isFinite) || !result.patch || typeof result.patch !== "object" || Array.isArray(result.patch) || !finiteValues(result.patch)) return null;
    const quad = planeQuad(result.matrix, result);
    if (!quad || !Array.isArray(result.quad) || result.quad.length !== 4 || !result.quad.every((point, index) => point && Number.isFinite(point.x) && Number.isFinite(point.y) && Math.hypot(point.x - quad[index].x, point.y - quad[index].y) <= 1e-6)) return null;
    if (!result.box || ![result.box.x, result.box.y, result.box.w, result.box.h].every(Number.isFinite) || result.box.w <= 0 || result.box.h <= 0) return null;
    const bounds = boundsOfQuad(quad);
    if (!bounds || !(["x", "y", "w", "h"] as const).every(key => Math.abs(result.box[key] - bounds[key]) <= 1e-6)) return null;
    return { handle: d.h, start: d.start, box: { ...result.box }, zoom: d.zoom, keepProportions, plane: { matrix: [...result.matrix] as unknown as Mat3, w: result.w, h: result.h, quad: quad.map(point => ({ ...point })), patch: result.patch } };
  }
  if (d.frame) {
    const resized = resizeFrame(d.start, d.frame, d.h, dx, dy, keepProportions, 8 * d.zoom, d.ratioLimits);
    return { handle: d.h, start: d.start, box: resized.box, zoom: d.zoom, keepProportions, frame: { start: d.frame, current: resized.current, offset: resized.offset } };
  }
  return { handle: d.h, start: d.start, box: resizeBox(d.start, d.h, dx, dy, keepProportions, 8 * d.zoom), zoom: d.zoom, keepProportions };
}

function dimensions(change: ResizeChange): [number | null, number | null] {
  if (change.plane) return [change.plane.w, change.plane.h];
  const size = change.frame?.current ?? change.box;
  return [
    change.keepProportions || /[ew]/.test(change.handle) ? Math.round(size.w / change.zoom) : null,
    change.keepProportions || /[ns]/.test(change.handle) ? Math.round(size.h / change.zoom) : null,
  ];
}

function unchanged(change: ResizeChange, original?: PlanarHandleGeometry): boolean {
  if (change.plane && original) {
    return Math.abs(change.plane.w - original.plane.w) < 1e-7 && Math.abs(change.plane.h - original.plane.h) < 1e-7 && change.plane.matrix.every((value, index) => Math.abs(value - original.plane.matrix[index]) < 1e-7);
  }
  return (["x", "y", "w", "h"] as const).every(key => Math.abs(change.box[key] - change.start[key]) < 1e-7);
}

function captureGeometry(geometry: PlanarHandleGeometry | undefined): PlanarHandleGeometry | undefined {
  return geometry ? { resize: geometry.resize, plane: { w: geometry.plane.w, h: geometry.plane.h, matrix: [...geometry.plane.matrix] as unknown as Mat3 } } : undefined;
}

function release(d: Drag) {
  if (d.target.hasPointerCapture?.(d.pointerId)) d.target.releasePointerCapture(d.pointerId);
}

function restore(d: Drag) {
  if (d.callbacks.onCancel) d.callbacks.onCancel();
  else if (d.kind === "turn") d.callbacks.onTurnLive(d.base);
}

export function SelectionHandles({ box, zoom, frame, geometry, proportional, ratioLimits, sides, turn, local, onSize, onSizeLive, onCancel, onReset, onTurnLive, onTurn }: SelectionHandlesProps) {
  const drag = useRef<Drag | null>(null);
  const [live, setLive] = useState<{ change?: ResizeChange; deg?: number } | null>(null);
  const shown = live?.change?.box ?? box;
  const shownFrame = live?.change?.frame?.current ?? frame;
  const shownPlane = live?.change?.plane ?? (drag.current?.kind === "size" ? drag.current.geometry?.plane : undefined) ?? geometry?.plane;
  const shownQuad = shownPlane ? planeQuad(shownPlane.matrix, shownPlane) : null;
  const handles = geometry && !shownQuad ? [] : sides === "all" ? HANDLES : (["e", "w"] as Handle[]);
  const scale = zoom > 0 && Number.isFinite(zoom) ? zoom : 1;
  const shownWidth = shownPlane?.w ?? (shownFrame?.w ?? shown.w) / scale;
  const shownHeight = shownPlane?.h ?? (shownFrame?.h ?? shown.h) / scale;
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
    const contextChanged=()=>{cancelActive();setLive(null);};
    window.addEventListener("studio-cancel-geometry",contextChanged);
    return () => {
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("studio-cancel-geometry",contextChanged);
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
      if (!change) { drag.current = null; release(d); restore(d); setLive(null); return; }
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
      if (!change || unchanged(change, d.geometry)) {
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
    if (geometry) {
      const initial = planarHandle(geometry.plane, h);
      const local = { x: geometry.plane.w * (h.includes("w") ? 0 : h.includes("e") ? 1 : .5), y: geometry.plane.h * (h.includes("n") ? 0 : h.includes("s") ? 1 : .5) };
      const moved = project3(geometry.plane.matrix, { x: local.x + delta.x, y: local.y + delta.y });
      if (!initial || !moved) return;
      p.x = moved.x - initial.x;
      p.y = moved.y - initial.y;
    } else if (frame) {
      const radians = frame.rotation * Math.PI / 180;
      [p.x, p.y] = [p.x * Math.cos(radians) - p.y * Math.sin(radians), p.x * Math.sin(radians) + p.y * Math.cos(radians)];
    }
    const change = changeAt({ kind: "size", h, start: box, p0: { x: 0, y: 0 }, zoom: scale, frame, geometry: captureGeometry(geometry), proportional, ratioLimits: limitsFor(h) }, p, false);
    if (!change || unchanged(change, geometry)) return;
    onSize(...dimensions(change), change);
  };
  const knob = { x: box.x + box.w / 2, y: box.y - 28 };
  return (
    <>
      {shownQuad && <svg className="pointer-events-none absolute overflow-visible" style={{ left: 0, top: 0, width: 1, height: 1 }} aria-hidden="true" data-testid="studio-plane-outline"><polygon points={shownQuad.map(point => `${point.x},${point.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth={1} className="text-accent-300" strokeDasharray={live?.change ? "5 3" : undefined} /></svg>}
      {live?.change ? (
        <div className={`pointer-events-none absolute ${shownPlane ? "" : "border-2 border-dashed border-accent-300"}`} style={shownFrame && !shownPlane ? { left: shown.x + shown.w / 2 - shownFrame.w / 2, top: shown.y + shown.h / 2 - shownFrame.h / 2, width: shownFrame.w, height: shownFrame.h, transform: `rotate(${shownFrame.rotation}deg)` } : { left: shown.x, top: shown.y, width: shown.w, height: shown.h }} data-testid="studio-sizing">
          <span className="absolute -bottom-6 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-accent-500 px-1.5 py-0.5 text-[11px] text-white" dir="ltr">
            {Math.round(shownWidth)} × {Math.round(shownHeight)}
          </span>
        </div>
      ) : null}
      {handles.map((h) => {
        const at = shownPlane ? planarHandle(shownPlane, h) : handleAt(shown, h, shownFrame);
        if (!at) return null;
        return (
          <div
            key={h}
            role="slider"
            tabIndex={0}
            aria-valuemin={8}
            aria-valuenow={Math.round(h === "n" || h === "s" ? shownHeight : shownWidth)}
            aria-valuetext={`${Math.round(shownWidth)} × ${Math.round(shownHeight)}`}
            aria-label={tr("اسحب لتغيير الحجم، كبستين للحجم الطبيعي", "Drag to resize, double-click for its natural size")}
            className="pointer-events-auto absolute z-20 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 touch-none rounded-sm border border-accent-500 bg-white shadow"
            style={{ left: at.x, top: at.y, cursor: CURSOR[h] }}
            onPointerDown={(e) => start(e, { kind: "size", h, start: { ...box }, p0: local(e), zoom: scale, frame: frame ? { ...frame } : undefined, geometry: captureGeometry(geometry), proportional, ratioLimits: limitsFor(h) ? { ...limitsFor(h)! } : undefined })}
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
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible" aria-hidden="true">
        {guides.map((g,i)=><line key={`g${i}`} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="#ec4899" strokeWidth={1} data-testid="studio-guide" />)}
        {gaps.map((g,i)=><line key={`d${i}`} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="#f43f5e" strokeWidth={1} data-testid="studio-gap" />)}
      </svg>
      {gaps.map((g,i)=><span key={`label${i}`} className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-rose-500 px-1 text-[10px] text-white" style={{left:(g.x1+g.x2)/2,top:(g.y1+g.y2)/2}} dir="ltr">{Math.round(g.length/zoom)}</span>)}
    </>
  );
}
