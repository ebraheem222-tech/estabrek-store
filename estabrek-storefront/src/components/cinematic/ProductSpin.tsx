"use client";
/**
 * A product's 360° view: its sprite sheet (made in the admin from a video, backend
 * lib/productSpins.ts) shown one frame at a time. Dragging or swiping sideways turns it
 * (about one turn across its width), the arrow keys step it, and it turns by itself until
 * it's touched — unless the shopper asked for less motion, then it stays still on its
 * first frame. The sheet loads only when the view is shown. SpinDialog opens it full
 * screen from the product page, with a 3D tab when the scan has a model.
 */
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/lib/bodyScrollLock";
import { tr } from "@/lib/words";
import type { Lang } from "@/lib/i18n";

export type ProductSpinData = { id: string; url: string; cols: number; rows: number; cellW: number; cellH: number; count: number; itemId: string | null; modelUrl: string | null };

const SAFE = /^(\/(?!\/)|https?:\/\/)[^\s<>"'`\\()]+$/;
/** The view for the colour on screen: its own, else the one for every colour. */
export function spinFor(spins: unknown, itemId?: string | null): ProductSpinData | null {
  const list = (Array.isArray(spins) ? spins : []).filter(
    (s): s is ProductSpinData => Boolean(s) && typeof s.url === "string" && SAFE.test(s.url) && s.cols > 0 && s.rows > 0 && s.cellW > 0 && s.cellH > 0 && s.count > 1,
  );
  return list.find((s) => itemId && s.itemId === itemId) ?? list.find((s) => !s.itemId) ?? null;
}

const ProductModelView = dynamic(() => import("./ProductModelView").then((m) => m.ProductModelView), { ssr: false });

/** The turning picture itself. */
export function SpinView({ spin, lang, label, auto = true, className, testId = "product-spin" }: { spin: ProductSpinData; lang: Lang; label: string; auto?: boolean; className?: string; testId?: string }) {
  const [frame, setFrame] = useState(0);
  const [ready, setReady] = useState(false);
  const [touched, setTouched] = useState(false);
  const el = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; frame: number } | null>(null);
  const count = spin.count;
  const at = ((Math.round(frame) % count) + count) % count;

  useEffect(() => {
    setReady(false);
    const img = new Image();
    img.onload = () => setReady(true);
    img.src = spin.url;
    return () => {
      img.onload = null;
    };
  }, [spin.url]);

  // Turns by itself (one turn in about 8 s) until it's touched; never with reduced motion.
  useEffect(() => {
    if (!auto || touched || !ready || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      setFrame((f) => f + ((now - last) / 8000) * count);
      last = now;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [auto, touched, ready, count]);

  const col = at % spin.cols;
  const row = Math.floor(at / spin.cols);
  return (
    <div
      ref={el}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={count - 1}
      aria-valuenow={at}
      aria-valuetext={`${Math.round((at * 360) / count)}°`}
      className={`relative w-full touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--selection-accent,#7d2448)] ${className ?? ""}`}
      style={{
        aspectRatio: `${spin.cellW} / ${spin.cellH}`,
        cursor: "grab",
        backgroundImage: ready ? `url("${spin.url}")` : undefined,
        backgroundSize: `${spin.cols * 100}% ${spin.rows * 100}%`,
        backgroundPosition: `${spin.cols > 1 ? (col / (spin.cols - 1)) * 100 : 0}% ${spin.rows > 1 ? (row / (spin.rows - 1)) * 100 : 0}%`,
        backgroundRepeat: "no-repeat",
      }}
      data-testid={testId}
      data-frame={at}
      data-ready={ready ? "1" : "0"}
      onPointerDown={(e) => {
        setTouched(true);
        drag.current = { x: e.clientX, frame };
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        const w = el.current?.clientWidth ?? 300;
        if (d) setFrame(d.frame + ((e.clientX - d.x) / (w * 0.9)) * count);
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          setTouched(true);
          setFrame((f) => Math.round(f) + (e.key === "ArrowRight" ? 1 : -1));
        } else if (e.key === "Home") {
          e.preventDefault();
          setTouched(true);
          setFrame(0);
        }
      }}
    >
      {!ready ? <span className="absolute inset-0 grid place-items-center text-sm opacity-60">{tr(lang, "عم يحمّل…", "Loading…")}</span> : null}
      {ready && !touched ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-max rounded-full bg-black/45 px-3 py-1 text-xs text-white">{tr(lang, "اسحبي لتلفّيها", "Drag to turn it")}</span>
      ) : null}
    </div>
  );
}

/** The 360° view full screen, from the product page; "3D" too when there's a model. */
export function SpinDialog({ spin, title, lang, onClose }: { spin: ProductSpinData; title: string; lang: Lang; onClose: () => void }) {
  const [tab, setTab] = useState<"spin" | "3d">("spin");
  const closeRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(true);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.({ preventScroll: true });
    };
  }, [onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${title} · 360°`} className="fixed inset-0 z-[90] flex items-center justify-center bg-[color-mix(in_srgb,var(--selection-surface,#fff8f4)_94%,transparent)] p-4 backdrop-blur" data-testid="product-spin-dialog" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex w-full max-w-[min(92vw,640px)] flex-col items-center gap-3">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex gap-1" role="tablist" aria-label={title}>
            <button type="button" role="tab" aria-selected={tab === "spin"} onClick={() => setTab("spin")} className={`rounded-full px-4 py-1.5 text-sm ${tab === "spin" ? "bg-[var(--selection-accent,#7d2448)] text-[var(--selection-surface,#fff8f4)]" : "bg-black/5"}`}>360°</button>
            {spin.modelUrl ? <button type="button" role="tab" aria-selected={tab === "3d"} onClick={() => setTab("3d")} className={`rounded-full px-4 py-1.5 text-sm ${tab === "3d" ? "bg-[var(--selection-accent,#7d2448)] text-[var(--selection-surface,#fff8f4)]" : "bg-black/5"}`} data-testid="product-spin-3d">3D</button> : null}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-black/5 text-xl" aria-label={tr(lang, "إغلاق", "Close")}>×</button>
        </div>
        {tab === "spin" ? (
          <SpinView spin={spin} lang={lang} label={tr(lang, "لفّي القطعة", "Turn the product")} className="max-h-[78vh]" />
        ) : (
          <div className="aspect-square w-full max-h-[78vh] overflow-hidden rounded-3xl" data-testid="product-model">
            <ProductModelView url={spin.modelUrl!} />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
