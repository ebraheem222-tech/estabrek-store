/**
 * How a game's thing looks (gameSpec.ts GameLook), drawn once on a little canvas: a shape in its colour, an emoji,
 * its words (joined and right to left as the page's letters are), or a picture covering its box (a box in its colour
 * until it loads, or if it can't be read). The shop's GameView.tsx puts it on a three.js square; the editor's game
 * editor draws its "try it" with the same pictures. Plain DOM (no React, no "@/" imports).
 */
import type { GameLook } from "./gameSpec";

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

/** A CSS colour (a theme's variable or a hex) as the browser reads it here. */
export function cssColour(probe: HTMLElement, value: string): string {
  probe.style.color = "";
  probe.style.color = value;
  return getComputedStyle(probe).color || "#888";
}
export function lookCanvas(look: GameLook, w: number, h: number, fill: string, font: string, rtl: boolean, onPicture: (c: HTMLCanvasElement) => void): HTMLCanvasElement {
  const scale = Math.min(4, Math.max(1, 256 / Math.max(w, h)));
  const c = document.createElement("canvas");
  c.width = Math.max(4, Math.round(w * scale));
  c.height = Math.max(4, Math.round(h * scale));
  const x = c.getContext("2d")!;
  const box = () => { x.fillStyle = fill; x.fillRect(0, 0, c.width, c.height); };
  if (look.kind === "circle") { x.fillStyle = fill; x.beginPath(); x.ellipse(c.width / 2, c.height / 2, c.width / 2, c.height / 2, 0, 0, Math.PI * 2); x.fill(); }
  else if (look.kind === "emoji" || look.kind === "text") {
    const text = look.kind === "emoji" ? look.emoji ?? "⭐" : look.text ?? "";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.direction = rtl ? "rtl" : "ltr";
    x.fillStyle = fill;
    let size = Math.min(c.width, c.height) * (look.kind === "emoji" ? 0.86 : 0.7);
    x.font = `${look.kind === "emoji" ? 400 : 700} ${size}px ${look.kind === "emoji" ? EMOJI_FONT : font}`;
    // Long words shrink to the thing's width.
    const fit = x.measureText(text).width;
    if (fit > c.width * 0.96) { size *= (c.width * 0.96) / fit; x.font = `${look.kind === "emoji" ? 400 : 700} ${size}px ${look.kind === "emoji" ? EMOJI_FONT : font}`; }
    x.fillText(text, c.width / 2, c.height / 2 + size * 0.04);
  } else if (look.kind === "image" && look.src) {
    box();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Covering its box, as a picture on the page does.
      const r = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
      const iw = img.naturalWidth * r, ih = img.naturalHeight * r;
      x.clearRect(0, 0, c.width, c.height);
      try { x.drawImage(img, (c.width - iw) / 2, (c.height - ih) / 2, iw, ih); onPicture(c); } catch { box(); }
    };
    img.src = look.src;
  } else box();
  return c;
}
