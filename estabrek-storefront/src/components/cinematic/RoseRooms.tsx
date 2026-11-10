"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { tr } from "@/lib/words";
import { normalHex, photoColour, sceneTheme } from "@/lib/sceneColour";
import { useLanguage } from "./Language";

/** `colour`: the piece's own (its first colour option); `photo`: its picture, to read a colour from otherwise. */
export type RoomPiece = { slug: string; title: string; image: string; price?: string | null; colour?: string | null; photo?: string | null };

/*
 * The rooms (rose-wonders.css, "the rooms"): a room for each signature piece, like a pavilion's alcoves. The
 * section holds the screen while the page scroll walks sideways through them; the room in front lights up
 * (a spotlight, its piece comes forward), the others wait in the half-dark. A piece's room tilts a little
 * towards the pointer. A tap opens the piece. While the rooms hold the screen the gallery and the page (the
 * header too) wear the lit piece's colour: its own colour, else its photo's (lib/sceneColour.ts).
 */
export function RoseRooms({ pieces, title }: { pieces: RoomPiece[]; title?: string }) {
  const { language: lang } = useLanguage();
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(0);
  // Each piece's colour, once known.
  const [colours, setColours] = useState<Array<string | null>>(() => pieces.map((p) => normalHex(p.colour)));
  useEffect(() => {
    let live = true;
    void Promise.all(pieces.map((p) => normalHex(p.colour) ? Promise.resolve(normalHex(p.colour)) : photoColour(p.photo || p.image))).then((found) => { if (live) setColours(found); });
    return () => { live = false; };
  }, [pieces]);
  const theme = useRef<ReturnType<typeof sceneTheme>>(null);
  const holding = useRef(false);
  const dress = useRef(() => {});
  // The lit piece's colour on the gallery and the page, while the rooms hold the screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    theme.current = sceneTheme(el, "rooms");
    let raf = 0;
    const check = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const on = r.top < window.innerHeight * 0.55 && r.bottom > window.innerHeight * 0.45;
      if (on === holding.current) return;
      holding.current = on;
      if (on) dress.current();
      else theme.current?.giveBack();
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", schedule); theme.current?.giveBack(true); theme.current = null; holding.current = false; };
  }, []);
  useEffect(() => {
    dress.current = () => { const c = colours[lit]; if (holding.current && c) theme.current?.wear(c, 0.7); };
    dress.current();
  }, [lit, colours]);

  useEffect(() => {
    const el = root.current;
    const tr_ = track.current;
    if (!el || !tr_ || pieces.length < 2) return;
    let raf = 0;
    let shown = -1;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / span));
      // The room in front stands in the middle of the screen; each one holds a moment before the next slides in
      // (the rooms' centres in their own order, so right to left in Arabic and Hebrew).
      const rooms = Array.from(tr_.children) as HTMLElement[];
      const at = p * (rooms.length - 1);
      const i = Math.min(rooms.length - 2, Math.floor(at));
      const f = at - i;
      const eased = f < 0.2 ? 0 : f > 0.8 ? 1 : (f - 0.2) / 0.6;
      const glide = eased * eased * (3 - 2 * eased);
      const centre = (room: HTMLElement) => room.offsetLeft + room.offsetWidth / 2;
      const x = centre(rooms[i]) + (centre(rooms[i + 1]) - centre(rooms[i])) * glide;
      tr_.style.transform = `translate3d(${el.clientWidth / 2 - x}px, 0, 0)`;
      const lead = Math.round(at);
      if (lead !== shown) { shown = lead; setLit(lead); }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [pieces.length]);

  // The room in front leans towards the pointer.
  const lean = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--lean-x", `${(((e.clientX - r.left) / r.width) - 0.5) * 10}deg`);
    e.currentTarget.style.setProperty("--lean-y", `${(0.5 - (e.clientY - r.top) / r.height) * 6}deg`);
  };
  const rest = (e: React.PointerEvent<HTMLElement>) => { e.currentTarget.style.setProperty("--lean-x", "0deg"); e.currentTarget.style.setProperty("--lean-y", "0deg"); };

  if (pieces.length < 2) return null;
  return (
    <section ref={root} className="rose-rooms" style={{ "--rooms": pieces.length } as CSSProperties} aria-label={title || tr(lang, "غرف القطع المميزة", "Rooms of signature pieces")}>
      <div className="rose-rooms-stage">
        <header className="rose-rooms-head">
          <span className="atelier-eyebrow">{tr(lang, "قطع مميزة", "SIGNATURE PIECES")}</span>
          <h2>{title || tr(lang, "لكل قطعة غرفتها.", "Every piece has its room.")}</h2>
          <span className="rose-rooms-count" dir="ltr">{String(lit + 1).padStart(2, "0")} <i /> {String(pieces.length).padStart(2, "0")}</span>
        </header>
        <div ref={track} className="rose-rooms-track">
          {pieces.map((p, i) => (
            <article key={p.slug} className="rose-room" data-lit={i === lit || undefined} style={{ "--i": i } as CSSProperties} onPointerMove={lean} onPointerLeave={rest}>
              <Link href={`/p/${p.slug}`} className="rose-room-alcove" aria-label={p.title}>
                <span className="rose-room-light" aria-hidden="true" />
                <span className="rose-room-back">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt="" loading="lazy" />
                </span>
                <span className="rose-room-floor" aria-hidden="true" />
              </Link>
              <div className="rose-room-label">
                <small dir="ltr">{tr(lang, "الغرفة", "Room")} {String(i + 1).padStart(2, "0")}</small>
                <h3>{p.title}</h3>
                {p.price ? <span className="rose-room-price">{p.price}</span> : null}
                <Link href={`/p/${p.slug}`} className="atelier-text-link">{tr(lang, "اكتشفيها", "Discover it")}</Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
