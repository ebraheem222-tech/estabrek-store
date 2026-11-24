"use client";
/**
 * What the converted library (scripts/library/convert.mjs) shows through: the owner's own words for an item and
 * its colours. An item's words are a map from the text as the library wrote it to the owner's (the logic keeps
 * the original; only what's shown changes), and names swapped wherever they appear (the item's made-up brand →
 * the store's name, in any text); its colours are CSS variables its wrapper sets (LibBlock).
 */
import { createContext, useContext, type ReactNode } from "react";

export type LibWords = { map: Readonly<Record<string, string>>; swaps: ReadonlyArray<readonly [string, string]> };

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
  return (v === undefined ? null : v) as ReactNode;
}

/** At the top of a component: its item's words for the attributes people read (alt, title, placeholder…). */
export function useLx() {
  const words = useContext(Words);
  return (v: unknown) => swapWords(words, v);
}

/** The same outside a component. */
export const lx = (v: unknown) => swapWords(last, v);

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
