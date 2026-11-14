/**
 * What an element's words are drawn in and on, for the editor's contrast note (studio only): the text's colour
 * and the colour behind it, each as "#rrggbb" once every see-through layer is put over what is under it, with the
 * size and weight the words are drawn at (big or bold words may read at a lower contrast).
 *
 * The ground is the element's own background colour, or the first one up through what holds it. A picture or a
 * gradient on the way (or words painted with one) can't be judged as one colour: that is said instead. A picture
 * that merely sits behind the element as another element of the page is not seen here.
 */

export type Rgba = { r: number; g: number; b: number; a: number };
export type Ink =
  | { color: string; ground: string; size: number; bold: boolean }
  /** Why there is nothing to judge: a picture or gradient is behind (or in) the words, or a colour written a way this doesn't read. */
  | { unknown: "picture" | "colour" };

/** A colour as the browser computes it ("rgb(1, 2, 3)", "rgba(1, 2, 3, 0.5)", "rgb(1 2 3 / 50%)"), or null. */
export function parseColour(text: string): Rgba | null {
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(text.trim());
  if (!m) return text.trim() === "transparent" ? { r: 0, g: 0, b: 0, a: 0 } : null;
  const [r, g, b] = [m[1], m[2], m[3]].map(Number);
  const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? Number.parseFloat(m[4]) / 100 : Number(m[4]);
  if (![r, g, b, a].every(Number.isFinite) || r > 255 || g > 255 || b > 255) return null;
  return { r, g, b, a: Math.max(0, Math.min(1, a)) };
}

/** A see-through colour over an opaque one, as the screen shows the two together. */
export function over(top: Rgba, under: Rgba): Rgba {
  const k = top.a;
  return { r: top.r * k + under.r * (1 - k), g: top.g * k + under.g * (1 - k), b: top.b * k + under.b * (1 - k), a: 1 };
}

export const hexOf = (c: Rgba) => `#${[c.r, c.g, c.b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

/**
 * The ground under some layers: `layers` are background colours from the element outwards (nearest first), ending
 * with an opaque one when there is one; with none opaque the page's own white is under them all.
 */
export function groundOf(layers: Rgba[]): Rgba {
  let ground: Rgba = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = layers.length - 1; i >= 0; i--) ground = over(layers[i], ground);
  return ground;
}

/** The element's words: their colour over their ground, their size and whether they are bold; or why not. */
export function inkOf(el: HTMLElement): Ink {
  const cs = getComputedStyle(el);
  // Words painted with a picture or a gradient have no one colour.
  if (cs.getPropertyValue("-webkit-background-clip") === "text" || cs.getPropertyValue("background-clip") === "text") return { unknown: "picture" };
  const text = parseColour(cs.color);
  if (!text) return { unknown: "colour" };
  const layers: Rgba[] = [];
  for (let at: HTMLElement | null = el; at; at = at.parentElement) {
    const s = getComputedStyle(at);
    if (s.backgroundImage && s.backgroundImage !== "none") return { unknown: "picture" };
    const c = parseColour(s.backgroundColor);
    if (!c) return { unknown: "colour" };
    if (c.a > 0) layers.push(c);
    if (c.a >= 0.999) break;
  }
  const ground = groundOf(layers);
  return { color: hexOf(over(text, ground)), ground: hexOf(ground), size: Number.parseFloat(cs.fontSize) || 16, bold: (Number.parseInt(cs.fontWeight, 10) || 400) >= 700 };
}
