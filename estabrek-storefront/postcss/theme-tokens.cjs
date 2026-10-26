/**
 * Store themes (src/storeThemes): makes the rose design's stylesheet themeable without
 * touching how it is written. In cinematic.css every colour becomes a variable named
 * after it (#7d2448 → var(--st-7d2448,#7d2448)), fonts become the theme's display or
 * text face, and corners scale with the theme's roundness. With no theme every
 * variable is unset, so the shop looks exactly as written.
 *
 * The list of colours it finds is what a theme maps onto its own palette
 * (src/storeThemes/roseColours.gen.ts, checked against this file by a test).
 */
const FILES = /[\\/]cinematic\.css$/;

const full = (hex) => {
  const h = hex.slice(1).toLowerCase();
  return h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
};
const toHex = (n) => Math.max(0, Math.min(255, Math.round(Number(n)))).toString(16).padStart(2, "0");

/** Colours in a value: hex and rgb()/rgba(), never inside url(). */
function colours(value) {
  if (!/#[0-9a-f]{3}|rgba?\(/i.test(value)) return value;
  return value
    .split(/(url\([^)]*\))/i)
    .map((part, i) => {
      if (i % 2) return part;
      return part
        .replace(/(^|[^\w-])#([0-9a-f]{6}|[0-9a-f]{3})(?![0-9a-z])/gi, (m, pre, h) => `${pre}var(--st-${full(`#${h}`)},#${h})`)
        .replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+%?)\s*)?\)/gi, (m, r, g, b, a) => {
          const hex = `${toHex(r)}${toHex(g)}${toHex(b)}`;
          // Black shadows stay shadows in every theme.
          if (hex === "000000" && a !== undefined) return m;
          const v = `var(--st-${hex},#${hex})`;
          if (a === undefined) return v;
          const pct = a.endsWith("%") ? parseFloat(a) : parseFloat(a) * 100;
          return pct >= 100 ? v : `color-mix(in srgb,${v} ${+pct.toFixed(2)}%,transparent)`;
        });
    })
    .join("");
}

const DISPLAY = /Atelier Serif|Rose Arabic|Rose Hebrew|--atelier-serif/;
const TEXT = /Estabrek Text|Atelier Sans/;

function radius(value) {
  return value.replace(/(^|[\s(,])(\d+(?:\.\d+)?)px\b/g, (m, pre, n) => {
    const px = Number(n);
    if (px === 0) return m;
    if (px >= 999) return `${pre}var(--st-pill,${n}px)`;
    return `${pre}calc(${n}px * var(--st-round,1))`;
  });
}

module.exports = () => ({
  postcssPlugin: "estabrek-theme-tokens",
  Once(root, { result }) {
    const from = root.source?.input?.file ?? result.opts.from ?? "";
    if (!FILES.test(from)) return;
    root.walkDecls((decl) => {
      const prop = decl.prop.toLowerCase();
      if (prop === "font-family" && !decl.value.includes("var(--st-font")) {
        if (DISPLAY.test(decl.value)) decl.value = `var(--st-font-display,${decl.value})`;
        else if (TEXT.test(decl.value)) decl.value = `var(--st-font-text,${decl.value})`;
        return;
      }
      if (prop === "--atelier-serif") {
        decl.value = `var(--st-font-display,${decl.value})`;
        return;
      }
      if (prop === "border-radius" || /^border-(start|end|top|bottom)-(start|end|left|right)-radius$/.test(prop)) {
        decl.value = radius(decl.value);
      }
      decl.value = colours(decl.value);
    });
  },
});
module.exports.postcss = true;
module.exports.colours = colours;
module.exports.radius = radius;
