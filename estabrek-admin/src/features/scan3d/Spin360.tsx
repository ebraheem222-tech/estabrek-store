/**
 * A product turning under the pointer: dragging sideways (or the arrow keys) turns it, a
 * little faster than the hand, round and round. Shows either the scan's frames just cut
 * out (ImageData, before saving) or a saved scan's sprite sheet.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { tr } from "../../lib/words";

type Source = { kind: "frames"; frames: ImageData[] } | { kind: "sheet"; url: string; cols: number; cellW: number; cellH: number; count: number };

export function Spin360({ source, height = 280, testId }: { source: Source; height?: number; testId?: string }) {
  const count = source.kind === "frames" ? source.frames.length : source.count;
  const [at, setAt] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; at: number } | null>(null);
  const [sheet, setSheet] = useState<HTMLImageElement | null>(null);
  const size = useMemo(() => (source.kind === "frames" ? { w: source.frames[0]?.width ?? 1, h: source.frames[0]?.height ?? 1 } : { w: source.cellW, h: source.cellH }), [source]);

  useEffect(() => {
    if (source.kind !== "sheet") return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setSheet(img);
    img.src = source.url;
    return () => {
      img.onload = null;
    };
  }, [source]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !count) return;
    const ctx = c.getContext("2d")!;
    const k = ((at % count) + count) % count;
    ctx.clearRect(0, 0, c.width, c.height);
    if (source.kind === "frames") ctx.putImageData(source.frames[k], 0, 0);
    else if (sheet) ctx.drawImage(sheet, (k % source.cols) * source.cellW, Math.floor(k / source.cols) * source.cellH, source.cellW, source.cellH, 0, 0, source.cellW, source.cellH);
  }, [at, count, source, sheet]);

  if (!count) return null;
  // One frame per few pixels of drag: a whole turn across about the viewer's width.
  const step = Math.max(2, Math.round((size.w * (height / size.h)) / count));
  return (
    <div className="flex flex-col items-center gap-1">
      <canvas
        ref={canvas}
        width={size.w}
        height={size.h}
        style={{ height, width: (size.w * height) / size.h, touchAction: "none", cursor: "grab" }}
        className="max-w-full rounded-xl bg-[repeating-conic-gradient(#0000000d_0%_25%,transparent_0%_50%)] [background-size:16px_16px]"
        tabIndex={0}
        role="slider"
        aria-label={tr("لفّ القطعة", "Turn the product")}
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={((at % count) + count) % count}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, at };
          (e.target as Element).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current) setAt(drag.current.at + Math.round((e.clientX - drag.current.x) / step));
        }}
        onPointerUp={() => (drag.current = null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setAt((a) => a - 1);
          if (e.key === "ArrowRight") setAt((a) => a + 1);
        }}
        data-testid={testId}
        data-frame={((at % count) + count) % count}
      />
      <span className="text-[11px] text-white/40">{tr("اسحب لتلفّ القطعة", "Drag to turn the product")}</span>
    </div>
  );
}
