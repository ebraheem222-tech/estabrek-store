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
  /** In the editor's frame: each text shown in the owner's words → as the library wrote it (the key of its words). */
  origin?: Map<string, string>;
  /** In the editor's frame: the words it read letter by letter or changed before showing them (spell), as shown. */
  spelled?: Map<string, Spelled>;
  /**
   * The piece threw with the owner's words (LibBlock): what its own code handles (a prop, a word it spells out or
   * looks up: lx, spell) keeps the library's words; what it shows as it is (<T/>, a canvas's text) is still theirs.
   */
  shownOnly?: boolean;
};

/** A word the piece's own code handles: the owner's, unless the piece threw with them (shownOnly). */
const handled = (words: LibWords | null, v: unknown) => (words?.shownOnly ? v : swapWords(words, v));

/** Words a piece read letter by letter (spell): as the library wrote them; shown in part (typed out: slice…). */
export type Spelled = { src: string; part: boolean };

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
  else if (v && (/\s/.test(v[0]) || /\s/.test(v[v.length - 1]))) {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(v);
    const inner = m && m[2] ? words.map[m[2]] : undefined;
    if (inner !== undefined && m) out = m[1] + inner + m[3];
  }
  for (const [from, to] of words.swaps) if (from && out.includes(from)) out = out.split(from).join(to);
  // In the editor: what it was written as, for the text shown (a text given on already in the owner's words, as a
  // component's prop is, is written over under the library's words, not under what it shows).
  if (out !== v && words.origin) {
    if (words.origin.size > 2000) words.origin.clear();
    const k = v.trim();
    words.origin.set(out.trim(), words.origin.get(k) ?? k);
  }
  return out;
}

/**
 * In the editor: the words a text shown was written as (the key of the owner's words for it). Typed: it's a word
 * typed out letter by letter (whole or in part): it changes as it's written over, so it's written over whole, in a
 * box (spelledAt), never in place.
 */
function sourceOf(words: LibWords, s: string): { src: string; typed?: boolean } {
  const k = s.trim();
  let spelled: Spelled | undefined;
  if (words.spelled?.size) {
    // Read letter by letter, shown in capitals (TEXT.toUpperCase()) or typed out so far: the same words.
    const low = k.toLowerCase();
    for (const [shown, e] of words.spelled) {
      const sl = shown.toLowerCase();
      if (sl === low || (e.part && sl.startsWith(low))) { spelled = e; if (e.part) break; }
    }
  }
  if (spelled?.part) return { src: spelled.src, typed: true };
  const o = words.origin?.get(k);
  if (o !== undefined) return { src: o };
  return { src: spelled?.src ?? k };
}

/** A piece shown on the page (text, a number, an element or a list of them): the owner's words for a text. */
export function T({ s, svg }: { s: unknown; svg?: boolean }) {
  const words = useContext(Words);
  const v = swapWords(words, s);
  // In the editor, a text says what the library wrote (the key of the owner's words for it) on a box that takes no
  // room of its own (display: contents), so a double-click on it can write over it (StudioBridge, "editLibWord").
  // In an SVG text the box is a tspan (a span shows nothing there). One letter alone is a word's letter (a word
  // spelled out to move letter by letter): the word is found whole (spelledAt).
  if (words?.marks && typeof s === "string" && typeof v === "string" && /\p{L}/u.test(s) && [...s.trim()].length > 1) {
    const { src, typed } = sourceOf(words, s);
    if (!typed) return svg ? <tspan data-lx-src={src}>{v}</tspan> : <span data-lx-src={src} style={{ display: "contents" }}>{v}</span>;
  }
  return (v === undefined ? null : v) as ReactNode;
}

/** At the top of a component: its item's words for the attributes people read (alt, title, placeholder…). */
export function useLx() {
  const words = useContext(Words);
  // It carries the words themselves too, for what the component draws on its canvases (canvasText).
  return useMemo(() => Object.assign((v: unknown) => handled(words, v), { words }), [words]);
}

/** The same outside a component. */
export const lx = (v: unknown) => handled(running ?? last, v);

const ownWords = (own: unknown) => (own && typeof own === "function" && "words" in own ? ((own as { words: LibWords | null }).words ?? null) : null);
/** What is done to a text before it's shown that keeps only part of it (typed out a letter at a time). */
const PART = new Set(["slice", "substring", "substr", "charAt", "at"]);
/**
 * A text a piece reads letter by letter or changes before showing it ("LIQUID".split(""), a word typed out with
 * slice, a name in capitals: convert.mjs, op says what's done to it): in the owner's words first, or the letters
 * kept spelling the library's word. In the editor it's noted, to be written over whole where its letters show.
 */
export function spell(own: unknown, v: unknown, op?: string): unknown {
  // A list joined into one text ("Kira, Bolt, Mossy"): each of its words in the owner's words.
  if (op === "join" && Array.isArray(v)) {
    const w = ownWords(own) ?? running ?? last;
    return w ? v.map((x) => handled(w, x)) : v;
  }
  if (typeof v !== "string") return v;
  const words = ownWords(own) ?? running ?? last;
  const out = handled(words, v);
  if (words?.spelled && op !== "length" && typeof out === "string" && out.length < 400 && /\p{L}/u.test(out) && out.trim().length > 1) {
    const k = out.trim();
    if (!words.spelled.has(k)) {
      if (words.spelled.size > 400) words.spelled.clear();
      words.spelled.set(k, { src: words.origin?.get(k) ?? v.trim(), part: PART.has(op ?? "") });
    }
  }
  return out;
}

/** The words of the item whose helper is running now (lxIn): a helper outside the item's components draws for it. */
let running: LibWords | null = null;
/**
 * A helper of the piece's file (outside its components) called from one of them: what it draws on a canvas is in
 * that component's item's words (convert.mjs wraps such calls: a word sampled on a canvas of its own, off the page).
 */
export function lxIn<R>(own: unknown, run: () => R): R {
  const words = ownWords(own);
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
    // New words drawn: the editor measures the page again (StudioBridge), so a canvas picked there offers them.
    if (typeof window !== "undefined") window.dispatchEvent(new Event("studio-remeasure"));
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
  if (words && inStudio() && typeof s === "string" && s.trim().length > 1 && /\p{L}/u.test(s)) note(words, ctx, sourceOf(words, s).src, text.trim(), Number(at[0]), Number(at[1]));
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

/**
 * In the editor: words a piece spelled out letter by letter (spell) under a point of the page: the element there, or
 * around it, that shows them whole (or their start, while they're typed out), with where it is. One letter alone
 * has no words to write over (T marks none), so the double-click finds its word here.
 */
export function spelledAt(host: Element, x: number, y: number): { src: string; shown: string; rect: DOMRect } | null {
  const scope = host.closest(".lx-scope") ?? host.querySelector(".lx-scope");
  const words = scope ? hosts.get(scope) : undefined;
  if (!scope || !words?.spelled?.size) return null;
  let tried = 0;
  for (const at of document.elementsFromPoint(x, y)) {
    if (at === scope || !scope.contains(at)) continue;
    if (++tried > 3) break;
    const hit = spelledRun(at, words, 6);
    if (hit) return hit;
  }
  return null;
}

const flatText = (v: string) => v.replace(/\s+/g, "").toLowerCase();
/**
 * Words read letter by letter (spell) that an element shows: whole, typed out so far, or one letter of them each
 * beside the others with no holder of their own ("LIQUID" next to "METAL" in one heading). Looked for in the
 * element and up to `levels` of what holds it.
 */
function spelledRun(el: Element, words: LibWords, levels: number): { src: string; shown: string; rect: DOMRect } | null {
  const list = words.spelled;
  if (!list?.size) return null;
  const byFlat = new Map<string, { src: string; shown: string; part: boolean }>();
  for (const [shown, e] of list) { const f = flatText(shown); if (f.length > 1 && !byFlat.has(f)) byFlat.set(f, { src: e.src, shown, part: e.part }); }
  const typedSoFar = (text: string) => { for (const [f, e] of byFlat) if (e.part && f.startsWith(text)) return e; return undefined; };
  for (let at: Element | null = el, up = 0; at && !at.classList.contains("lx-scope") && up < levels; at = at.parentElement, up++) {
    const text = flatText(at.textContent ?? "");
    if (!text) continue;
    if (text.length > 400) break;
    const whole = byFlat.get(text) ?? (text.length > 1 ? typedSoFar(text) : undefined);
    if (whole) return { src: whole.src, shown: whole.shown, rect: at.getBoundingClientRect() };
    // A letter: the run of letters beside it that spells a word.
    const kids = text.length <= 3 && at.parentElement ? Array.from(at.parentElement.children) : [];
    if (kids.length > 1 && kids.length <= 120) {
      const i = kids.indexOf(at);
      for (let a = Math.max(0, i - 60); a <= i; a++) {
        let joined = "";
        for (let b = a; b < kids.length && b - a < 80 && joined.length <= 200; b++) {
          joined += flatText(kids[b].textContent ?? "");
          const run = b >= i ? byFlat.get(joined) : undefined;
          if (!run) continue;
          const rects = kids.slice(a, b + 1).map((k) => k.getBoundingClientRect());
          const left = Math.min(...rects.map((r) => r.left)), top = Math.min(...rects.map((r) => r.top));
          return { src: run.src, shown: run.shown, rect: new DOMRect(left, top, Math.max(...rects.map((r) => r.right)) - left, Math.max(...rects.map((r) => r.bottom)) - top) };
        }
      }
    }
  }
  return null;
}

/**
 * In the editor: the words a part of a piece shows (a text's, a button's, a word spelled out in letters) or draws (a
 * canvas: what it drew on itself, and what its piece drew off the page for it, as a word sampled into dots), as the
 * library wrote them and as they show now. The editor's panel offers them when that part is picked.
 */
export function libWordsIn(el: Element, max = 6): Array<{ src: string; shown: string }> {
  const scope = el.closest(".lx-scope");
  const words = scope ? hosts.get(scope) : undefined;
  if (!scope || !words) return [];
  const out = new Map<string, string>();
  if (typeof HTMLCanvasElement !== "undefined" && el instanceof HTMLCanvasElement) {
    for (const d of words.seen ?? []) if ((d.canvas === el || !d.canvas) && !out.has(d.src)) out.set(d.src, d.shown);
  } else {
    const marks = el.matches("[data-lx-src]") ? [el] : Array.from(el.querySelectorAll("[data-lx-src]"));
    for (const m of marks) {
      const src = m.getAttribute("data-lx-src");
      if (src && !out.has(src)) out.set(src, (m.textContent ?? "").replace(/\s+/g, " ").trim());
      if (out.size >= max) break;
    }
    if (!out.size && words.spelled?.size) {
      const run = spelledRun(el, words, 1);
      if (run) out.set(run.src, run.shown);
    }
  }
  return [...out].slice(0, max).map(([src, shown]) => ({ src, shown }));
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
