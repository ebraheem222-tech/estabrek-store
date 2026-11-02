/**
 * A ready look drawn small in the gallery (phase 10): its style keys as inline CSS in the
 * store's colours, the way the shop's pageTree/css.ts draws them (near enough for a tile;
 * the frame shows the real thing as the pointer rests on a tile).
 */
import type { CSSProperties } from "react";
import { CUT_SHAPES, patternCss } from "../cutShapes";
import type { ThumbColours } from "../templates/colours";
import type { Style } from "./core";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const SHADOW: Record<string, string> = { sm: "0 1px 3px rgba(0,0,0,.12)", md: "0 6px 18px rgba(0,0,0,.14)", lg: "0 18px 40px rgba(0,0,0,.2)" };
const CAPS: Record<string, CSSProperties> = { upper: { textTransform: "uppercase" }, lower: { textTransform: "lowercase" }, title: { textTransform: "capitalize" }, small: { fontVariantCaps: "small-caps" } };
const FONT: Record<string, string> = { serif: "Georgia,'Times New Roman',serif", sans: "system-ui,sans-serif", mono: "ui-monospace,Consolas,monospace" };
const MESH_AT: Record<number, string[]> = { 2: ["0% 0%", "100% 100%"], 3: ["0% 0%", "100% 0%", "50% 100%"], 4: ["0% 0%", "100% 0%", "100% 100%", "0% 100%"] };

/** A colour name or #hex as a colour the browser draws. */
export const paint = (c: unknown, col: ThumbColours): string => {
  const v = String(c ?? "");
  if (v in col) return col[v as keyof ThumbColours];
  if (v === "white") return "#ffffff";
  if (v === "black") return "#000000";
  return v;
};
const grad = (g: Obj, col: ThumbColours) => {
  const stops = [g.color, g.via, g.to].filter((x) => x !== undefined).map((x) => paint(x, col)).join(",");
  return g.radial ? `radial-gradient(circle at 50% 50%,${stops})` : `linear-gradient(${Number(g.angle ?? 180)}deg,${stops})`;
};
const maskOf = (shape: string) => {
  const d = CUT_SHAPES.find(([id]) => id === shape)?.[2];
  if (!d || shape === "rect") return {};
  const url = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${d}'/></svg>`)}")`;
  return { WebkitMaskImage: url, maskImage: url, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" } as CSSProperties;
};

/** A look's style as inline CSS; `words` = the glow goes round the letters. `small` scales paddings down for a tile. */
export function lookCss(s: Style, col: ThumbColours, words = false, small = 0.5): CSSProperties {
  const css: CSSProperties = {};
  const images: string[] = [];
  const sizes: string[] = [];
  const places: string[] = [];
  if (s.bg !== undefined) css.backgroundColor = paint(s.bg, col);
  if (isObj(s.pattern)) {
    const p = patternCss(String(s.pattern.kind), paint(s.pattern.color, col), Math.max(6, Number(s.pattern.size ?? 20) * 0.6));
    const op = Number(s.pattern.opacity ?? 1);
    images.push(op < 1 ? p.backgroundImage.replace(/#[0-9a-f]{6}/gi, (h) => `${h}${Math.round(op * 255).toString(16).padStart(2, "0")}`) : p.backgroundImage);
    sizes.push(p.backgroundSize);
    places.push(p.backgroundPosition);
  }
  if (isObj(s.mesh) && Array.isArray(s.mesh.colors)) {
    const cs = s.mesh.colors.slice(0, 4);
    const soft = Number(s.mesh.soft ?? 60);
    for (const [i, c] of cs.entries()) {
      images.push(`radial-gradient(at ${MESH_AT[cs.length]?.[i] ?? "50% 50%"},${paint(c, col)} 0,transparent ${soft}%)`);
      sizes.push("auto");
      places.push("0 0");
    }
  }
  if (isObj(s.gradient)) {
    images.push(grad(s.gradient, col));
    sizes.push("auto");
    places.push("0 0");
  }
  if (images.length) Object.assign(css, { backgroundImage: images.join(","), backgroundSize: sizes.join(","), backgroundPosition: places.join(",") });
  if (isObj(s.backdrop)) css.backdropFilter = `blur(${Number(s.backdrop.blur ?? 0)}px)${s.backdrop.saturate ? ` saturate(${s.backdrop.saturate})` : ""}`;
  if (s.color !== undefined) css.color = paint(s.color, col);
  if (typeof s.radius === "number") css.borderRadius = s.radius >= 999 ? 9999 : s.radius * (small < 1 ? 0.7 : 1);
  if (isObj(s.border)) css.border = `${Number(s.border.width ?? 1)}px ${String(s.border.style ?? "solid")} ${paint(s.border.color, col)}`;
  const boxShadows: string[] = [];
  if (typeof s.shadow === "string" && SHADOW[s.shadow]) boxShadows.push(SHADOW[s.shadow]);
  if (isObj(s.shade)) boxShadows.push(`${Number(s.shade.x ?? 0) * small}px ${Number(s.shade.y ?? 0) * small}px ${Number(s.shade.blur ?? 0) * small}px ${paint(s.shade.color, col)}`);
  const textShadows: string[] = Array.isArray(s.shadows) ? (s.shadows as Obj[]).map((x) => `${Number(x.x ?? 0)}px ${Number(x.y ?? 0)}px ${Number(x.blur ?? 0)}px ${paint(x.color, col)}`) : [];
  if (isObj(s.glow)) (words ? textShadows : boxShadows).push(`0 0 ${Number(s.glow.size ?? 0) * small}px ${paint(s.glow.color, col)}`);
  if (boxShadows.length) css.boxShadow = boxShadows.join(",");
  if (textShadows.length) css.textShadow = textShadows.join(",");
  if (typeof s.opacity === "number") css.opacity = s.opacity;
  if (typeof s.weight === "number") css.fontWeight = s.weight;
  if (typeof s.letterSpacing === "number") css.letterSpacing = `${s.letterSpacing * 0.6}px`;
  if (typeof s.wordSpacing === "number") css.wordSpacing = `${s.wordSpacing}px`;
  if (typeof s.lineHeight === "number") css.lineHeight = s.lineHeight;
  if (typeof s.caps === "string") Object.assign(css, CAPS[s.caps] ?? {});
  if (s.italic === true) css.fontStyle = "italic";
  if (typeof s.family === "string") css.fontFamily = `"${s.family.replace(/-/g, " ")}",system-ui,sans-serif`;
  else if (typeof s.font === "string" && FONT[s.font]) css.fontFamily = FONT[s.font];
  if (isObj(s.decoration)) {
    const d = s.decoration;
    css.textDecoration = [d.line === "through" ? "line-through" : d.line, d.style, d.color !== undefined ? paint(d.color, col) : undefined, d.width ? `${d.width}px` : undefined].filter(Boolean).join(" ");
    if (typeof d.offset === "number") css.textUnderlineOffset = `${d.offset}px`;
  }
  if (isObj(s.stroke)) Object.assign(css, { WebkitTextStroke: `${Number(s.stroke.width ?? 1)}px ${paint(s.stroke.color, col)}`, paintOrder: "stroke fill" });
  if (isObj(s.fill)) Object.assign(css, { backgroundImage: grad({ ...s.fill, radial: false, angle: s.fill.angle ?? 90 }, col), WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" });
  if (isObj(s.filters)) {
    const f = s.filters;
    css.filter = [f.blur !== undefined && `blur(${Number(f.blur) * small}px)`, f.bright !== undefined && `brightness(${f.bright})`, f.contrast !== undefined && `contrast(${f.contrast})`, f.saturate !== undefined && `saturate(${f.saturate})`, f.gray !== undefined && `grayscale(${f.gray})`, f.hue !== undefined && `hue-rotate(${f.hue}deg)`].filter(Boolean).join(" ");
  }
  const turns = [s.moveX || s.moveY ? `translate(${Number(s.moveX ?? 0) * small}px,${Number(s.moveY ?? 0) * small}px)` : "", s.rotateX ? `rotateX(${s.rotateX}deg)` : "", s.rotateY ? `rotateY(${s.rotateY}deg)` : "", s.rotateZ ? `rotate(${s.rotateZ}deg)` : "", s.scale ? `scale(${s.scale})` : ""].filter(Boolean);
  if (turns.length) css.transform = `perspective(600px) ${turns.join(" ")}`;
  if (Array.isArray(s.pad) && s.pad.length === 4) css.padding = (s.pad as number[]).map((v) => `${Math.round(v * small * 0.6)}px`).join(" ");
  if (typeof s.shape === "string") Object.assign(css, maskOf(s.shape));
  if (typeof s.aspect === "string") css.aspectRatio = s.aspect.replace(/\s+/g, "");
  return css;
}

/** A colour layer over a picture (its own absolutely placed layer in a tile). */
export function overlayCss(s: Style, col: ThumbColours): CSSProperties | null {
  const o = s.overlay;
  if (!isObj(o)) return null;
  return {
    position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none", opacity: Number(o.opacity ?? 1),
    background: o.to !== undefined ? `linear-gradient(${Number(o.angle ?? 180)}deg,${paint(o.color, col)},${paint(o.to, col)})` : paint(o.color, col),
    mixBlendMode: (o.blend as CSSProperties["mixBlendMode"]) ?? "normal",
  };
}

/** A look with its hover state laid over it (a tile under the pointer). */
export const hovered = (s: Style): Style => (isObj(s.hover) ? { ...s, ...s.hover } : s);

/** How each way of coming in plays in a tile (the Web Animations API), from its start to its place. */
export function enterFrames(kind: string, distance = 40): Keyframe[] {
  const d = Math.min(30, distance * 0.5);
  switch (kind) {
    case "up": return [{ opacity: 0, transform: `translateY(${d}px)` }, { opacity: 1, transform: "none" }];
    case "down": return [{ opacity: 0, transform: `translateY(-${d}px)` }, { opacity: 1, transform: "none" }];
    case "start": return [{ opacity: 0, transform: `translateX(${d}px)` }, { opacity: 1, transform: "none" }];
    case "end": return [{ opacity: 0, transform: `translateX(-${d}px)` }, { opacity: 1, transform: "none" }];
    case "zoom-in": return [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "none" }];
    case "zoom-out": return [{ opacity: 0, transform: "scale(1.4)" }, { opacity: 1, transform: "none" }];
    case "blur": return [{ opacity: 0, filter: "blur(10px)" }, { opacity: 1, filter: "blur(0)" }];
    case "flip-x": return [{ opacity: 0, transform: "perspective(400px) rotateX(80deg)" }, { opacity: 1, transform: "none" }];
    case "flip-y": return [{ opacity: 0, transform: "perspective(400px) rotateY(80deg)" }, { opacity: 1, transform: "none" }];
    case "turn": return [{ opacity: 0, transform: "rotate(-12deg) scale(.9)" }, { opacity: 1, transform: "none" }];
    case "wipe-start": return [{ clipPath: "inset(0 0 0 100%)" }, { clipPath: "inset(0)" }];
    case "wipe-end": return [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0)" }];
    case "wipe-up": return [{ clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0)" }];
    case "wipe-down": return [{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0)" }];
    case "wipe-center": return [{ clipPath: "inset(0 50%)" }, { clipPath: "inset(0)" }];
    case "circle": return [{ clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)" }];
    case "letters":
    case "words":
    case "lines":
    case "typewriter":
    case "scramble":
      return [{ opacity: 0, letterSpacing: "6px" }, { opacity: 1, letterSpacing: "0px" }];
    default:
      return [{ opacity: 0 }, { opacity: 1 }];
  }
}
/** The editor's eases as CSS's. */
export const EASING: Record<string, string> = { smooth: "cubic-bezier(.22,1,.36,1)", soft: "ease-in-out", strong: "cubic-bezier(.16,1,.3,1)", back: "cubic-bezier(.34,1.56,.64,1)", elastic: "cubic-bezier(.68,-.6,.32,1.6)", bounce: "cubic-bezier(.34,1.8,.64,1)", linear: "linear" };
