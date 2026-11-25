"use client";
/**
 * Two page-tree games that give the shopper a coupon (loaded through lazyParts.tsx, only on pages that have them):
 *  - a scratch card: a cover scratched away with a finger or the mouse (or a button for the keyboard) shows the
 *    prize and its code;
 *  - a memory game: cards turned two at a time; all the pairs found (within the moves allowed, if any) wins it.
 * The code won is kept on this device for the bag, which puts it in by itself (lib/wonCoupon.ts), and shown with a
 * copy button. `once`: a card already scratched, a game already won, stays won on the shopper's next visit.
 * Both are drawn on the server first (the card and its cover, the cards face down) and wait still in the editor.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { saveWonCoupon } from "../lib/wonCoupon";
import { TreeIcon } from "./icons";
import type { GameWords } from "./proWords";

const lessMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
const keyOf = (kind: string, id: string) => `estabrek_game_${kind}_${id}`;
const wonBefore = (kind: string, id: string) => { try { return window.localStorage.getItem(keyOf(kind, id)) === "won"; } catch { return false; } };
const markWon = (kind: string, id: string) => { try { window.localStorage.setItem(keyOf(kind, id), "won"); } catch { /* the prize still shows */ } };

/** The prize: what it is, its code to copy, and that the bag has it. */
function Prize({ prize, code, saved, words }: { prize: string; code: string; saved: boolean; words: GameWords }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); } catch { /* the code is on screen to copy by hand */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="pt-game-prize" role="status" data-pt-prize="">
      <div className="pt-game-won">{words.won}</div>
      {prize ? <div className="pt-game-what" data-pt-field="prize">{prize}</div> : null}
      {code ? (
        <>
          <button type="button" className="pt-game-code" onClick={() => void copy()} aria-label={`${words.copy}: ${code}`}>
            <span className="pt-game-code-label">{words.code}</span>
            <b dir="ltr">{code}</b>
            <span className="pt-game-copy">{copied ? words.copied : words.copy}</span>
          </button>
          {saved ? <p className="pt-game-note">{words.inBag}</p> : null}
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- scratch card */

export type ScratchProps = {
  id: string; code: string; prize: string; coverText: string; look: "silver" | "gold" | "brand" | "pink";
  cover?: string; once: boolean; save: boolean; height: number; words: GameWords;
};

const COVERS: Record<ScratchProps["look"], [string, string, string]> = {
  silver: ["#d9dde3", "#b6bcc6", "#eef1f5"],
  gold: ["#f3d98b", "#c9a243", "#fff0c2"],
  pink: ["#f6c7d8", "#d98aa8", "#ffe4ee"],
  brand: ["", "", ""],
};

export function ScratchCardView({ id, code, prize, coverText, look, cover, once, save, height, words }: ScratchProps) {
  const card = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const done = useRef(false);

  const reveal = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setRevealed(true);
    if (code && save) saveWonCoupon(code);
    if (once) markWon("scratch", id);
  }, [code, save, once, id]);

  // Won here before: shown won.
  useEffect(() => { if (once && wonBefore("scratch", id)) { done.current = true; setRevealed(true); } }, [once, id]);

  // The cover: painted on a canvas the size of the card, scratched away with destination-out.
  useEffect(() => {
    const el = canvas.current;
    const box = card.current;
    if (!el || !box || revealed) return;
    const ctx = el.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const style = getComputedStyle(box);
    const [a, b, c] = look === "brand" || cover
      ? [cover || style.getPropertyValue("--accent").trim() || "#9b5de5", style.getPropertyValue("--accent").trim() || "#7b3fc4", "#ffffff55"]
      : COVERS[look];
    const paint = () => {
      const { width, height: h } = box.getBoundingClientRect();
      el.width = Math.max(1, Math.round(width * dpr));
      el.height = Math.max(1, Math.round(h * dpr));
      ctx.globalCompositeOperation = "source-over";
      const g = ctx.createLinearGradient(0, 0, el.width, el.height);
      g.addColorStop(0, a); g.addColorStop(0.5, c); g.addColorStop(1, b);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, el.width, el.height);
      // A fine sparkle, so it reads as foil.
      for (let i = 0; i < (el.width * el.height) / 900; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.12 + Math.random() * 0.25})`;
        ctx.fillRect(Math.random() * el.width, Math.random() * el.height, dpr, dpr);
      }
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.font = `600 ${Math.round(18 * dpr)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(coverText, el.width / 2, el.height / 2);
      // The canvas is the cover now: the one drawn for the page's first look goes (else scratching shows it).
      box.dataset.painted = "";
    };
    paint();
    const ro = new ResizeObserver(() => { if (!done.current) paint(); });
    ro.observe(box);

    let down = false;
    let last: { x: number; y: number } | null = null;
    let strokes = 0;
    const at = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr }; };
    const cleared = () => {
      // How much of the cover is gone, read on a grid of points.
      const data = ctx.getImageData(0, 0, el.width, el.height).data;
      let clear = 0, all = 0;
      const step = Math.max(4, Math.round(8 * dpr));
      for (let y = 0; y < el.height; y += step) for (let x = 0; x < el.width; x += step) { all++; if (data[(y * el.width + x) * 4 + 3] < 40) clear++; }
      return all ? clear / all : 0;
    };
    const scratch = (p: { x: number; y: number }) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 38 * dpr;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo((last ?? p).x, (last ?? p).y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
      if (++strokes % 6 === 0 && cleared() > 0.5) reveal();
    };
    const onDown = (e: PointerEvent) => { down = true; last = null; el.setPointerCapture?.(e.pointerId); scratch(at(e)); e.preventDefault(); };
    const onMove = (e: PointerEvent) => { if (down) scratch(at(e)); };
    const onUp = () => { down = false; last = null; if (cleared() > 0.5) reveal(); };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [look, cover, coverText, revealed, reveal]);

  return (
    <div className="pt-scr" data-revealed={revealed ? "true" : "false"}>
      <div ref={card} className="pt-scr-card" style={{ "--pt-scr-h": `${height}px` } as CSSProperties}>
        <div className="pt-scr-under">
          {revealed ? <Prize prize={prize} code={code} saved={save && !!code} words={words} /> : <div className="pt-game-what" aria-hidden="true">{prize}</div>}
        </div>
        {!revealed ? (
          <>
            <div className={`pt-scr-cover pt-scr-${look}`} aria-hidden="true"><span>{coverText}</span></div>
            <canvas ref={canvas} className="pt-scr-canvas" aria-hidden="true" data-pt-scratch="" />
          </>
        ) : null}
      </div>
      {!revealed ? <button type="button" className="pt-game-reveal" onClick={reveal}>{words.reveal}</button> : null}
    </div>
  );
}

/* -------------------------------------------------------------- memory game */

export type MemoryFace = { icon?: string; src?: string };
export type MemoryProps = {
  id: string; code: string; prize: string; faces: MemoryFace[]; moves: number; once: boolean; save: boolean;
  look: "cards" | "tiles" | "round"; words: GameWords;
};

type Card = { face: number; key: number };
const deckOf = (pairs: number, shuffle: boolean): Card[] => {
  const cards = Array.from({ length: pairs * 2 }, (_, i) => ({ face: i % pairs, key: i }));
  if (shuffle) for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  return cards;
};

export function MemoryGameView({ id, code, prize, faces, moves, once, save, look, words }: MemoryProps) {
  const pairs = faces.length;
  // Face down in a fixed order on the server; shuffled once the page wakes (the same HTML both sides).
  const [deck, setDeck] = useState<Card[]>(() => deckOf(pairs, false));
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [tries, setTries] = useState(0);
  const [won, setWon] = useState(false);
  const busy = useRef(false);

  const restart = useCallback(() => {
    setDeck(deckOf(pairs, true));
    setOpen([]);
    setFound(new Set());
    setTries(0);
    busy.current = false;
  }, [pairs]);
  useEffect(() => {
    if (once && wonBefore("memory", id)) { setWon(true); return; }
    restart();
  }, [once, id, restart]);

  const lost = moves > 0 && tries >= moves && found.size < pairs && !won;
  const turn = (i: number) => {
    if (busy.current || won || lost || open.includes(i) || found.has(deck[i].face)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;
    setTries((t) => t + 1);
    const [x, y] = next;
    if (deck[x].face === deck[y].face) {
      const nowFound = new Set(found).add(deck[x].face);
      setFound(nowFound);
      setOpen([]);
      if (nowFound.size === pairs) {
        setWon(true);
        if (code && save) saveWonCoupon(code);
        if (once) markWon("memory", id);
      }
    } else {
      busy.current = true;
      window.setTimeout(() => { setOpen([]); busy.current = false; }, lessMotion() ? 900 : 750);
    }
  };

  if (won) return <div className={`pt-mem pt-mem-${look}`} data-won="true"><Prize prize={prize} code={code} saved={save && !!code} words={words} /></div>;
  return (
    <div className={`pt-mem pt-mem-${look}`} data-won="false" data-lost={lost ? "true" : "false"}>
      <div className="pt-mem-bar">
        <span>{words.memory}</span>
        <span className="pt-mem-count" data-pt-moves={tries}>
          {words.moves}: {tries}{moves > 0 ? ` · ${words.left} ${Math.max(0, moves - tries)}` : ""}
        </span>
      </div>
      <div className="pt-mem-grid" style={{ "--pt-mem-cols": pairs * 2 <= 6 ? 3 : 4 } as CSSProperties} role="group" aria-label={words.memory}>
        {deck.map((c, i) => {
          const up = open.includes(i) || found.has(c.face);
          const face = faces[c.face];
          return (
            <button
              key={c.key} type="button" className="pt-mem-card" data-up={up ? "true" : "false"} data-face={c.face}
              aria-pressed={up} aria-label={`${words.card} ${i + 1}${found.has(c.face) ? ` (${words.matched})` : ""}`}
              disabled={found.has(c.face) || lost} onClick={() => turn(i)}
            >
              <span className="pt-mem-inner" aria-hidden="true">
                <span className="pt-mem-back" />
                <span className="pt-mem-front">
                  {face?.src ? <img src={face.src} alt="" loading="lazy" draggable={false} /> : <TreeIcon name={face?.icon ?? "star"} />}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {lost ? (
        <div className="pt-mem-lost" role="status">
          <p>{words.lost}</p>
          <button type="button" className="pt-game-reveal" onClick={restart}>{words.again}</button>
        </div>
      ) : null}
    </div>
  );
}
