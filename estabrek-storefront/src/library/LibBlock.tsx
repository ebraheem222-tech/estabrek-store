"use client";
/**
 * A piece of the owner's theme library on a page (the editor's "من المكتبة", a page tree's "lib" node): the item
 * as the library made it, in the owner's own words and colours (docs/themes-library-plan.ar.md).
 * - words: the library's text → the owner's (runtime.tsx); brand: the store's name for the item's made-up one.
 * - colours: a colour as the library wrote it (6 digits) → the owner's (the --lx-… variables, cv() and lib.css).
 * - families: a Tailwind colour family the item uses → one colour (or "theme": the store theme's accent), its
 *   whole scale made from it (--color-<family>-50 … 950).
 */
import { Component, useEffect, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { loadPiece } from "./loader";
import { LibWordsProvider, hexKey, libHost, type Drawn, type LibWords, type Spelled } from "./runtime";

/** The library's fonts (its index.html): the browser fetches only the ones an item's text uses. */
const FONTS =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Press+Start+2P&family=Space+Grotesk:wght@500;600;700&family=Syne:wght@600;700;800&family=Bebas+Neue&family=Chakra+Petch:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,500&family=Orbitron:wght@500;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Unbounded:wght@500;700;900&family=Russo+One&family=DM+Serif+Display:ital@0;1&family=Caveat:wght@500;700&display=swap";

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
/** A family's scale from one colour: lighter towards white, darker towards black, the colour itself at 500. */
const MIX: Record<(typeof SHADES)[number], [number, "white" | "black" | null]> = {
  50: [8, "white"], 100: [16, "white"], 200: [30, "white"], 300: [50, "white"], 400: [75, "white"],
  500: [100, null], 600: [85, "black"], 700: [70, "black"], 800: [55, "black"], 900: [42, "black"], 950: [28, "black"],
};
const HEX6 = /^#[0-9a-f]{6}$/i;

export function libVars(colours: unknown, families: unknown): CSSProperties {
  const vars: Record<string, string> = {};
  if (colours && typeof colours === "object") {
    for (const [from, to] of Object.entries(colours as Record<string, unknown>)) {
      if (/^[0-9a-f]{6}$/i.test(from) && typeof to === "string" && HEX6.test(to)) vars[`--lx-${hexKey(from)}`] = to;
    }
  }
  if (families && typeof families === "object") {
    for (const [family, to] of Object.entries(families as Record<string, unknown>)) {
      if (!/^[a-z]+$/.test(family)) continue;
      const base = to === "theme" ? "var(--th-accent, #6366f1)" : typeof to === "string" && HEX6.test(to) ? to : null;
      if (!base) continue;
      for (const s of SHADES) {
        const [pct, toward] = MIX[s];
        vars[`--color-${family}-${s}`] = toward ? `color-mix(in oklab, ${base} ${pct}%, ${toward})` : base;
      }
    }
  }
  return vars as CSSProperties;
}

/**
 * A piece that throws while it's drawn: the page never goes down with it (a piece crashing took the whole page to
 * the shop's error screen). LibBlock shows it again in the words the library wrote, and else not at all.
 */
class Guard extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** A size the owner gave (½ to twice as made), or 1. */
const sizeOf = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && Math.abs(v - 1) > 0.001 ? Math.min(2, Math.max(0.5, v)) : 1);

/** What the server's list (meta.ts) says of the piece: a page never downloads the whole library's list. */
export function LibBlock({ item, kind, madeUp, minH, js, css, version, dir = "ltr", words, colours, families, brand, textSize, drawnSize, draws, fresh, className, ...rest }: {
  item: string;
  kind: string;
  /** The piece's made-up brand (a site's name), the store's name replaces. */
  madeUp?: string;
  /** Its height while it loads. */
  minH?: number;
  /** Its file (public/library/js) and its file's styles (public/library/css), and the styles' version. */
  js: string;
  css: string;
  version: string;
  /** As the library made it (left to right), or turned for a right-to-left page. */
  dir?: "ltr" | "rtl";
  words?: Record<string, string>;
  colours?: Record<string, string>;
  families?: Record<string, string>;
  brand?: string;
  /** The size of all its words (1 as the library made them): its styles' sizes are times --lx-ts (build-css.mjs). */
  textSize?: number;
  /** The size of the big words it draws on a canvas (runtime.tsx canvasText). */
  drawnSize?: number;
  /** It draws words on a canvas (convert.mjs): their size is a setting of its own. */
  draws?: boolean;
  /** It reads its words once (a canvas, an effect, a timer: convert.mjs): it starts again when they change. */
  fresh?: boolean;
  className?: string;
  [data: `data-${string}`]: unknown;
}) {
  // The piece itself comes in the browser (with its styles, before it shows): until then its place keeps its height.
  const [Piece, setPiece] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setFailed(false);
    loadPiece(js, css, version).then((c) => live && setPiece(() => c), () => live && setFailed(true));
    return () => { live = false; };
  }, [js, css, version]);
  // In the editor's frame its words can be written over in place (runtime.tsx T, StudioBridge "editLibWord").
  const [studio, setStudio] = useState(false);
  useEffect(() => setStudio(window.parent !== window && /\/studio-frame/.test(window.location.pathname)), []);
  // A whole site spans the screen less the page's own scrollbar (100vw counts it: it stuck out by its width).
  useEffect(() => {
    if (kind !== "site") return;
    const root = document.documentElement;
    const measure = () => root.style.setProperty("--lx-sbw", `${Math.max(0, window.innerWidth - root.clientWidth)}px`);
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => { window.removeEventListener("resize", measure); ro.disconnect(); };
  }, [kind]);
  // The store's name wherever the item says its made-up one (as written, and in capitals for the letter-spaced logos).
  // One object while they're the same (what it drew lately is noted on it in the editor: runtime.tsx canvasText).
  const wordsKey = JSON.stringify(words ?? {});
  const drawn = sizeOf(drawnSize);
  // What it drew lately, kept across its words' objects (a loop started early still notes where the editor looks).
  // And what each text shown was written as, and the words it read letter by letter (runtime.tsx spell).
  const [seen] = useState<Drawn[]>(() => []);
  const [origin] = useState(() => new Map<string, string>());
  const [spelled] = useState(() => new Map<string, Spelled>());
  const own = useMemo<LibWords>(() => {
    const swaps: Array<readonly [string, string]> = brand && madeUp ? [[madeUp, brand], [madeUp.toUpperCase(), brand.toLocaleUpperCase()]] : [];
    return { map: JSON.parse(wordsKey) as Record<string, string>, swaps, marks: studio, drawn, seen, ...(studio ? { origin, spelled } : {}) };
  }, [wordsKey, brand, madeUp, studio, drawn, seen, origin, spelled]);
  // Safe: 0 as the owner has it. 1 it threw in the owner's words (a word its own code uses to work, as a key it
  // looks up): its code keeps the library's words, what it shows is still the owner's. 2 it threw so too: all in the
  // library's words. 3 it threw as made: not shown. Tried again from 0 when the words change.
  const [safe, setSafe] = useState(0);
  useEffect(() => setSafe(0), [wordsKey, brand]);
  const shownOnly = useMemo<LibWords>(() => ({ ...own, shownOnly: true }), [own]);
  const plain = useMemo<LibWords>(() => ({ map: {}, swaps: [], marks: studio, drawn, seen }), [studio, drawn, seen]);
  const ts = sizeOf(textSize);
  // A whole website brings its own bar and footer: on its page the store's step aside (drawn with the page, no flash).
  const site = kind === "site";
  return (
    <div
      ref={(el) => libHost(el, own)}
      className={`lx-scope lx-f-${css}${className ? ` ${className}` : ""}`}
      dir={dir}
      data-lib={item}
      data-lib-kind={kind}
      data-lib-ready={Piece ? "" : undefined}
      data-lib-safe={safe ? (["", "shown", "words", "off"] as const)[safe] : undefined}
      // Its words' size: what its styles size is times --lx-ts; what it doesn't (it takes the page's) from here.
      style={{ ...libVars(colours, families), ...(ts !== 1 ? { "--lx-ts": String(ts), fontSize: `${ts}em` } : {}) } as CSSProperties}
      {...rest}
    >
      <link rel="stylesheet" href={FONTS} />
      {site ? <style>{".atelier-announcement,.atelier-header,.atelier-footer{display:none!important}[data-lib-kind=site]{width:calc(100vw - var(--lx-sbw,0px));margin-inline:calc(50% - 50vw + var(--lx-sbw,0px) / 2)}"}</style> : null}
      {/* What scrolls inside a piece (a carousel, a scrolling phone…) scrolls without a bar showing. */}
      <style>{".lx-scope,.lx-scope *{scrollbar-width:none}.lx-scope::-webkit-scrollbar,.lx-scope *::-webkit-scrollbar{display:none}"}</style>
      {Piece ? (
        <LibWordsProvider words={safe === 1 ? shownOnly : safe ? plain : own}>
          <Guard key={safe} onError={() => setSafe((s) => (s < 2 && (wordsKey !== "{}" || brand) ? s + 1 : 3))}>
            {/* What it draws on a canvas is drawn once (a word sampled into particles), and what it reads in an
                effect or a timer is read once: new words or size, it starts again. */}
            {safe < 3 ? <Piece key={draws || fresh ? `${wordsKey}|${brand ?? ""}|${drawn}` : undefined} /> : null}
          </Guard>
        </LibWordsProvider>
      ) : (
        <div aria-hidden="true" style={{ minHeight: failed ? undefined : minH ? `min(${Math.round(minH)}px, 100vh)` : undefined }} />
      )}
    </div>
  );
}
