"use client";
/**
 * A piece of the owner's theme library on a page (the editor's "من المكتبة", a page tree's "lib" node): the item
 * as the library made it, in the owner's own words and colours (docs/themes-library-plan.ar.md).
 * - words: the library's text → the owner's (runtime.tsx); brand: the store's name for the item's made-up one.
 * - colours: a colour as the library wrote it (6 digits) → the owner's (the --lx-… variables, cv() and lib.css).
 * - families: a Tailwind colour family the item uses → one colour (or "theme": the store theme's accent), its
 *   whole scale made from it (--color-<family>-50 … 950).
 */
import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { LIB_COMPONENTS } from "./items.gen";
import { libItem } from "./meta";
import { LibWordsProvider, hexKey } from "./runtime";

/** The library's styles: one module, loaded with the first item a page shows. */
const LibStyles = dynamic(() => import("./LibStyles"));

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

export function LibBlock({ item, words, colours, families, brand, className, ...rest }: {
  item: string;
  words?: Record<string, string>;
  colours?: Record<string, string>;
  families?: Record<string, string>;
  brand?: string;
  className?: string;
  [data: `data-${string}`]: unknown;
}) {
  const meta = libItem(item);
  const Item = LIB_COMPONENTS[item];
  if (!meta || !Item) return null;
  // The store's name wherever the item says its made-up one (as written, and in capitals for the letter-spaced logos).
  const swaps: Array<readonly [string, string]> = brand && meta.brand ? [[meta.brand, brand], [meta.brand.toUpperCase(), brand.toLocaleUpperCase()]] : [];
  const own = { map: { ...(words ?? {}) }, swaps };
  // A whole website brings its own bar and footer: on its page the store's step aside (drawn with the page, no flash).
  const site = meta.kind === "site";
  return (
    <div className={`lx-scope${className ? ` ${className}` : ""}`} dir="ltr" data-lib={item} data-lib-kind={meta.kind} style={libVars(colours, families)} {...rest}>
      <link rel="stylesheet" href={FONTS} />
      <LibStyles />
      {site ? <style>{".atelier-announcement,.atelier-header,.atelier-footer{display:none!important}[data-lib-kind=site]{width:100vw;margin-inline:calc(50% - 50vw)}"}</style> : null}
      <LibWordsProvider words={own}>
        <Item />
      </LibWordsProvider>
    </div>
  );
}
