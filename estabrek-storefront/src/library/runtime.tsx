"use client";
/**
 * What the converted library (scripts/library/convert.mjs) shows through: the owner's own words for an item and
 * its colours. An item's words are a map from the text as the library wrote it to the owner's (the logic keeps
 * the original; only what's shown changes), and names swapped wherever they appear (the item's made-up brand →
 * the store's name, in any text); its colours are CSS variables its wrapper sets (LibBlock).
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";

export type LibWords = {
  map: Readonly<Record<string, string>>;
  swaps: ReadonlyArray<readonly [string, string]>;
  /** In the editor's frame: each text carries the words it was written as, to be written over in place. */
  marks?: boolean;
  /** The size of the big words a piece draws on a canvas (its headline: "DESIGN" in particles), 1 as it was made. */
  drawn?: number;
  /** In the editor's frame: the words the piece drew on its canvases lately, to be written over in place there too. */
  seen?: Drawn[];
};

/** Words a piece drew on a canvas: as the library wrote them, where (on a canvas on the page: its own pixels). */
export type Drawn = { src: string; shown: string; canvas: HTMLCanvasElement | null; box: [number, number, number, number] | null; at: number };

const Words = createContext<LibWords | null>(null);
/** Outside a component (a helper building a piece of the page): the words of the item drawn last. */
let last: LibWords | null = null;

export function LibWordsProvider({ words, children }: { words: LibWords | null; children: ReactNode }) {
  last = words;
  return <Words.Provider value={words}>{children}</Words.Provider>;
}

/** A text as the owner wants it: their words for it (keeping the spaces around it), or as it was; names swapped. */
export function swapWords(words: LibWords | null, v: unknown): unknown {
  if (typeof v !== "string" || !words) return v;
  let out = v;
  const own = words.map[v];
  if (own !== undefined) out = own;
  else {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(v);
    const inner = m && m[2] ? words.map[m[2]] : undefined;
    if (inner !== undefined && m) out = m[1] + inner + m[3];
  }
  for (const [from, to] of words.swaps) if (from && out.includes(from)) out = out.split(from).join(to);
  return out;
}

/** A piece shown on the page (text, a number, an element or a list of them): the owner's words for a text. */
export function T({ s }: { s: unknown }) {
  const words = useContext(Words);
  const v = swapWords(words, s);
  // In the editor, a text says what the library wrote (the key of the owner's words for it) on a box that takes no
  // room of its own (display: contents), so a double-click on it can write over it (StudioBridge, "editLibWord").
  if (words?.marks && typeof s === "string" && typeof v === "string" && s.trim() && /\p{L}/u.test(s)) {
    return <span data-lx-src={s.trim()} style={{ display: "contents" }}>{v}</span>;
  }
  return (v === undefined ? null : v) as ReactNode;
}

/** At the top of a component: its item's words for the attributes people read (alt, title, placeholder…). */
export function useLx() {
  const words = useContext(Words);
  // It carries the words themselves too, for what the component draws on its canvases (canvasText).
  return useMemo(() => Object.assign((v: unknown) => swapWords(words, v), { words }), [words]);
}

/** The same outside a component. */
export const lx = (v: unknown) => swapWords(running ?? last, v);

/** The words of the item whose helper is running now (lxIn): a helper outside the item's components draws for it. */
let running: LibWords | null = null;
/**
 * A helper of the piece's file (outside its components) called from one of them: what it draws on a canvas is in
 * that component's item's words (convert.mjs wraps such calls: a word sampled on a canvas of its own, off the page).
 */
export function lxIn<R>(own: unknown, run: () => R): R {
  const words = own && typeof own === "function" && "words" in own ? ((own as { words: LibWords | null }).words ?? null) : null;
  if (!words) return run();
  const was = running;
  running = words;
  try {
    return run();
  } finally {
    running = was;
  }
}

/** Each piece's wrapper on the page (LibBlock) → its words: a canvas on the page draws in its own piece's words. */
const hosts = new WeakMap<Element, LibWords>();
export function libHost(el: Element | null, words: LibWords) {
  if (el) hosts.set(el, words);
}

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
/** The words a canvas draws in: given by its component, else of the helper's item running, else its piece's on the page. */
function wordsFor(ctx: Ctx2D | null | undefined, own: unknown): LibWords | null {
  if (own && typeof own === "function" && "words" in own) return (own as { words: LibWords | null }).words ?? null;
  if (running) return running;
  const c = ctx?.canvas;
  if (typeof HTMLCanvasElement !== "undefined" && c instanceof HTMLCanvasElement && c.isConnected) {
    const host = c.closest(".lx-scope");
    const w = host ? hosts.get(host) : undefined;
    if (w) return w;
  }
  return last;
}

const PX = /(\d*\.?\d+)px/;
/**
 * A text drawn in the middle of a canvas (centred on it): the piece's headline ("DESIGN" in particles). It's drawn
 * in the owner's size for it, and never wider than the canvas (the owner's longer words, or a narrower box than the
 * library's own page, were cut at both sides). Anything else (labels, letters of a rain, a pattern) is left as it is.
 */
function headlineScale(ctx: Ctx2D, text: string, x: unknown, words: LibWords | null): number {
  if (ctx.textAlign !== "center" || typeof x !== "number" || !Number.isFinite(x)) return 1;
  const c = ctx.canvas as { width: number; height: number } | null;
  if (!c || !c.width || !c.height) return 1;
  const m = typeof ctx.getTransform === "function" ? ctx.getTransform() : null;
  const a = m ? m.a : 1, d = m ? m.d : 1;
  if (m && (Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6)) return 1; // turned: as it was
  if (!(a > 0) || !(d > 0)) return 1;
  const atX = a * x + (m ? m.e : 0);
  if (Math.abs(atX - c.width / 2) > c.width * 0.12) return 1;
  const wish = words?.drawn && Number.isFinite(words.drawn) ? Math.min(2, Math.max(0.4, words.drawn)) : 1;
  const wide = ctx.measureText(text).width;
  const room = (c.width * 0.94) / a;
  let k = wide > 0 ? Math.min(wish, room / wide) : wish;
  // Bigger than it was made: never taller than the canvas.
  const size = Number(PX.exec(ctx.font)?.[1]);
  if (k > 1 && size > 0) k = Math.min(k, Math.max(1, (c.height * 0.9) / d / size));
  return Math.abs(k - 1) < 0.005 ? 1 : k;
}

let studioFrame: boolean | null = null;
/** The page is the editor's frame (as LibBlock tells it; known here too for a canvas loop started before it said). */
const inStudio = () => (studioFrame ??= typeof window !== "undefined" && window.parent !== window && /\/studio-frame/.test(window.location.pathname));

/** In the editor: the words drawn (once in a while for each canvas), with where they are, to be written over there. */
function note(words: LibWords, ctx: Ctx2D, src: string, shown: string, x: number, y: number) {
  const list = (words.seen ??= []);
  const c = typeof HTMLCanvasElement !== "undefined" && ctx.canvas instanceof HTMLCanvasElement && ctx.canvas.isConnected ? ctx.canvas : null;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const had = list.find((d) => d.src === src && d.canvas === c);
  if (had && now - had.at < 300) return;
  let box: Drawn["box"] = null;
  if (c && Number.isFinite(x) && Number.isFinite(y)) {
    const mt = ctx.measureText(shown);
    const w = mt.width, up = mt.actualBoundingBoxAscent || 0, down = mt.actualBoundingBoxDescent || 0;
    const left = ctx.textAlign === "center" ? x - w / 2 : ctx.textAlign === "right" || ctx.textAlign === "end" ? x - w : x;
    const m = ctx.getTransform();
    box = [m.a * left + m.e, m.d * (y - up) + m.f, m.a * w, m.d * (up + down)];
  }
  const entry: Drawn = { src, shown, canvas: c, box, at: now };
  if (had) Object.assign(had, entry);
  else {
    list.push(entry);
    if (list.length > 60) list.shift();
  }
}

/**
 * A text a piece draws on a canvas (convert.mjs: every fillText/strokeText of the library's): in the owner's words
 * for it, a headline in the owner's size and fitted to its canvas; in the editor, noted to be written over in place.
 */
export function canvasText(ctx: Ctx2D, how: "fillText" | "strokeText", own: unknown, s: unknown, ...at: unknown[]) {
  const draw = (t: unknown) => (ctx[how] as (...a: unknown[]) => void)(t, ...at);
  const words = wordsFor(ctx, own);
  const text = swapWords(words, s);
  if (typeof text !== "string" || !text) return draw(text);
  const k = headlineScale(ctx, text, at[0], words);
  const font = k !== 1 ? ctx.font : null;
  if (font) ctx.font = font.replace(PX, (_m, n: string) => `${Math.round(Number(n) * k * 100) / 100}px`);
  draw(text);
  if (words && inStudio() && typeof s === "string" && s.trim().length > 1 && /\p{L}/u.test(s)) note(words, ctx, s.trim(), text.trim(), Number(at[0]), Number(at[1]));
  if (font) ctx.font = font;
}

/** What a piece measures before it draws (to fit or box its words): the owner's words for it. */
export function canvasMeasure(ctx: Ctx2D, own: unknown, s: unknown): TextMetrics {
  return ctx.measureText(swapWords(wordsFor(ctx, own), s) as string);
}

/**
 * In the editor: the words a piece drew on a canvas under a point of the page (StudioBridge's double-click there):
 * the ones drawn at that point, else the last ones it drew off the page (a word sampled into particles), else the
 * nearest drawn on that canvas. With where they show (on the page), when that's known.
 */
export function drawnWordAt(host: Element, x: number, y: number): { src: string; shown: string; rect: DOMRect | null } | null {
  const scope = host.closest(".lx-scope") ?? host.querySelector(".lx-scope");
  const words = scope ? hosts.get(scope) : undefined;
  const seen = words?.seen ?? [];
  if (!scope || !seen.length) return null;
  const under = document.elementsFromPoint(x, y).filter((e): e is HTMLCanvasElement => e instanceof HTMLCanvasElement && scope.contains(e));
  if (!under.length) return null;
  const onPage = (d: Drawn) => {
    if (!d.canvas || !d.box || !d.canvas.isConnected) return null;
    const r = d.canvas.getBoundingClientRect();
    const sx = r.width / (d.canvas.width || 1), sy = r.height / (d.canvas.height || 1);
    return new DOMRect(r.left + d.box[0] * sx, r.top + d.box[1] * sy, d.box[2] * sx, d.box[3] * sy);
  };
  const latest = (list: Drawn[]) => list.reduce<Drawn | null>((b, d) => (!b || d.at > b.at ? d : b), null);
  const drawnHere = seen.filter((d) => d.canvas && under.includes(d.canvas));
  const at = drawnHere.filter((d) => { const r = onPage(d); return r && x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6; });
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const away = seen.filter((d) => !d.canvas && now - d.at < 30_000);
  let best = latest(at) ?? latest(away);
  if (!best && drawnHere.length) {
    const far = (d: Drawn) => { const r = onPage(d); return r ? Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) : Infinity; };
    best = drawnHere.reduce((b, d) => (far(d) < far(b) ? d : b));
    if (far(best) > 160) best = null;
  }
  return best ? { src: best.src, shown: best.shown, rect: onPage(best) } : null;
}

const HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
/** A colour as the library wrote it (6 lowercase digits): the name of its CSS variable. */
export const hexKey = (h: string) => {
  const x = h.replace("#", "").toLowerCase();
  return x.length === 3 ? x.split("").map((c) => c + c).join("") : x;
};

/** A colour value (or a gradient, a shadow…) with each colour in it as a variable the item's wrapper may set. */
export function cv(v: unknown): unknown {
  if (typeof v !== "string" || !v.includes("#") || v.includes("var(--lx-")) return v;
  return v.replace(HEX, (h) => `var(--lx-${hexKey(h)}, ${h})`);
}

/** A whole style object (given from a variable): its colours the same way. Motion values pass untouched. */
export function cvs(style: unknown): unknown {
  if (!style || typeof style !== "object" || Array.isArray(style)) return style;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(style as Record<string, unknown>)) out[k] = cv(v);
  return out;
}
