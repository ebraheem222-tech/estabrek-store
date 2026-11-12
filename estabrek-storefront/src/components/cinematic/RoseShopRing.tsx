"use client";
import Link from "next/link";
import { createContext, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { isPageIdle, onPageIdle } from "@/lib/pageIdle";

export type RingPiece = { slug: string; title: string; image: string };

/** The home's pieces for the ring around its silk film (RoseHome provides them; RoseVideoSection reads them). */
export const RingPiecesContext = createContext<RingPiece[]>([]);
/** For server-drawn pages (the CMS home): hands the ring its pieces. */
export function RingPiecesProvider({ pieces, children }: { pieces: RingPiece[]; children: ReactNode }) {
  return <RingPiecesContext.Provider value={pieces}>{children}</RingPiecesContext.Provider>;
}

/** How long one turn takes (s). */
const TURN_SECONDS = 16;
/** How long the scroll must be still before the ring turns again by itself (ms). */
const SCROLL_QUIET = 1400;

/*
 * The shop's own pieces on a 3D ring turning around the opening's arch (rose-showcase.css): drag it to turn it,
 * a throw glides on; a tap opens the piece.
 *
 * It turns like a game draws: a CSS animation of the ring's turn, which the graphics card runs at the screen's
 * own rate (60, 120 or 144 a second) with no work on the page at all. It was turned from script 20 times a
 * second at 6° a second (a turn a minute: slow, in steps), each step restyling all its cards.
 *
 * While the page scrolls it stands still (the scroll gets the whole frame); it turns again when the pointer
 * comes over it or a finger touches it, or once the scroll has rested a moment. Off screen, while the page
 * rests (lib/pageIdle.ts) and for shoppers who ask for less motion it stands still.
 */
export function RoseShopRing({ pieces, label }: { pieces: RingPiece[]; label: string }) {
  const ring = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    const el = ring.current;
    if (!el || pieces.length < 3) return;
    // Why it stands still now (none: it turns). Written on the ring only when that changes.
    const reasons = new Set<string>();
    let shown = "";
    // Its turn is played and paused here, by its animation (the page's own rest pauses skip it: data-own-pause).
    const spin = el.querySelector<HTMLElement>(".rose-ring-spin");
    const show = () => {
      const now = [...reasons].join(" ");
      if (now === shown) return;
      shown = now;
      if (now) el.dataset.paused = now;
      else delete el.dataset.paused;
      for (const a of spin?.getAnimations() ?? []) {
        if (now) a.pause();
        else a.play();
      }
    };
    const hold = (why: string, on: boolean) => {
      if (on) reasons.add(why);
      else reasons.delete(why);
      show();
    };

    // Off screen, or the page at rest.
    const io = new IntersectionObserver(([entry]) => hold("away", !entry.isIntersecting));
    io.observe(el);
    hold("rest", isPageIdle());
    const offIdle = onPageIdle((rest) => hold("rest", rest));

    // The scroll: still at once, turning again after a quiet moment or on the pointer / a touch.
    let quiet = 0;
    const scrolled = () => {
      hold("scroll", true);
      window.clearTimeout(quiet);
      quiet = window.setTimeout(() => hold("scroll", false), SCROLL_QUIET);
    };
    const wakeUp = () => {
      window.clearTimeout(quiet);
      hold("scroll", false);
    };
    window.addEventListener("scroll", scrolled, { passive: true });
    const area = el.parentElement ?? el;
    area.addEventListener("pointerenter", wakeUp);
    area.addEventListener("touchstart", wakeUp, { passive: true });

    // A drag turns the ring itself (its turn stands still meanwhile); a throw glides on and slows down.
    let turn = 0;
    let glide = 0;
    const apply = () => el.style.setProperty("--ring-turn", `${turn.toFixed(2)}deg`);
    let drag: null | { id: number; x: number; turn: number; lastX: number; lastT: number; v: number } = null;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      cancelAnimationFrame(glide);
      drag = { id: e.pointerId, x: e.clientX, turn, lastX: e.clientX, lastT: performance.now(), v: 0 };
      moved.current = false;
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6 && !moved.current) {
        moved.current = true;
        el.setPointerCapture?.(e.pointerId);
        el.dataset.dragging = "true";
        hold("drag", true);
      }
      if (!moved.current) return;
      const now = performance.now();
      turn = drag.turn + dx * 0.32;
      drag.v = ((e.clientX - drag.lastX) * 0.32) / Math.max(0.008, (now - drag.lastT) / 1000);
      drag.lastX = e.clientX;
      drag.lastT = now;
      apply();
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      let v = moved.current ? Math.max(-240, Math.min(240, drag.v)) : 0;
      drag = null;
      delete el.dataset.dragging;
      hold("drag", false);
      if (Math.abs(v) < 4) return;
      let last = performance.now();
      const step = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        turn += v * dt;
        v *= Math.exp(-dt * 2.6);
        apply();
        glide = Math.abs(v) > 2 ? requestAnimationFrame(step) : 0;
      };
      glide = requestAnimationFrame(step);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      io.disconnect();
      offIdle();
      window.clearTimeout(quiet);
      cancelAnimationFrame(glide);
      window.removeEventListener("scroll", scrolled);
      area.removeEventListener("pointerenter", wakeUp);
      area.removeEventListener("touchstart", wakeUp);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [pieces.length]);

  if (pieces.length < 3) return null;
  return (
    <div className="rose-ring" ref={ring} role="group" aria-label={label} data-own-pause="" style={{ "--ring-n": pieces.length, "--ring-period": `${TURN_SECONDS}s` } as CSSProperties}
      // A drag turns the ring; it doesn't open the piece under the finger.
      onClickCapture={(e) => { if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false; } }}>
      <div className="rose-ring-spin">
        {pieces.map((piece, i) => (
          <Link key={piece.slug} href={`/p/${piece.slug}`} className="rose-ring-piece" style={{ "--i": i } as CSSProperties} draggable={false}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={piece.image} alt={piece.title} loading="lazy" draggable={false} />
          </Link>
        ))}
      </div>
    </div>
  );
}
