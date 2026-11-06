import type { PageTreeNode, TreeScreen } from "../api/pages.api";
import type { Box, Pt } from "./geometry";
import { placedOn, placeFor, shownLook } from "./look";
import type { Handle, RatioLimits } from "./handles";

export type CanvasMode = "free" | "flow";
const KEY = "studio-canvas-placement";
const CONTENTS_KEY = "studio-scale-contents";

export function readScaleContents(): boolean {
  try { return localStorage.getItem(CONTENTS_KEY) === "1"; } catch { return false; }
}

export function saveScaleContents(on: boolean) {
  try { localStorage.setItem(CONTENTS_KEY, on ? "1" : "0"); } catch { /* In-memory preference remains available. */ }
}

export function readCanvasMode(): CanvasMode {
  try {
    return localStorage.getItem(KEY) === "flow" ? "flow" : "free";
  } catch {
    return "free";
  }
}

export function saveCanvasMode(mode: CanvasMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // A private window retains the current in-memory choice.
  }
}

export function effectiveLook(node: PageTreeNode, screen: TreeScreen): Record<string, unknown> {
  const styles = node.style as Record<string, Record<string, unknown>> | undefined;
  return {
    ...styles?.base,
    ...(screen !== "base" ? styles?.tablet : {}),
    ...(screen === "mobile" ? styles?.mobile : {}),
  };
}

type Size = { w: number; h: number };
const finiteSize = (size: Size) => [size.w, size.h].every((value) => Number.isFinite(value) && value > 0);
const finiteBox = (box: Box) => [box.x, box.y].every(Number.isFinite) && finiteSize(box);
const positive = (value: number) => Number.isFinite(value) && value > 0;
const length = (value: number) => `${Math.round(Math.max(1, Math.min(9999, value)))}px`;

function lookNumber(node: PageTreeNode, screen: TreeScreen, key: string, fallback: number): number {
  const value = shownLook(node, screen, key);
  const number = Number(value);
  return value !== null && value !== undefined && Number.isFinite(number) ? number : fallback;
}

/** Own transformed centre relative to the untransformed layout top-left, before ancestors. */
function centerOffset(node: PageTreeNode, screen: TreeScreen, size: Size): Pt {
  const origin = shownLook(node, screen, "origin");
  const ox = size.w / 2;
  const oy = origin === "top" ? 0 : origin === "bottom" ? size.h : size.h / 2;
  const x = size.w / 2 - ox;
  const y = size.h / 2 - oy;
  const angle = lookNumber(node, screen, "rotateZ", 0) * Math.PI / 180;
  const scale = lookNumber(node, screen, "scale", 1);
  return {
    x: ox + scale * (x * Math.cos(angle) - y * Math.sin(angle)),
    y: oy + scale * (x * Math.sin(angle) + y * Math.cos(angle)),
  };
}

/**
 * Recover the layout box from a rendered AABB. `size` is raw CSS border-box size
 * times editor zoom; `parentScale` is the positive uniform scale of the destination
 * ancestors. Own rotation/scale and center/top/bottom transform origins are removed.
 * All returned coordinates and dimensions are canvas pixels, including parentScale.
 */
export function placementBox(
  node: PageTreeNode,
  screen: TreeScreen,
  rendered: Box,
  size: Size,
  zoom: number,
  parentScale = 1,
): Box | null {
  if (!finiteBox(rendered) || !finiteSize(size) || !positive(zoom) || !positive(parentScale)) return null;
  const offset = centerOffset(node, screen, size);
  return {
    x: rendered.x + rendered.w / 2 - parentScale * (offset.x + lookNumber(node, screen, "moveX", 0) * zoom),
    y: rendered.y + rendered.h / 2 - parentScale * (offset.y + lookNumber(node, screen, "moveY", 0) * zoom),
    w: size.w * parentScale,
    h: size.h * parentScale,
  };
}

/** Freeze CSS dimensions from raw size; ancestor scaling affects only placement. */
export function placementPatch(
  node: PageTreeNode,
  screen: TreeScreen,
  rendered: Box,
  holder: Box,
  size: Size,
  zoom: number,
  rtl: boolean,
  freeze: boolean,
  parentScale = 1,
): Record<string, unknown> | null {
  if (!finiteBox(holder)) return null;
  const logical = placementBox(node, screen, rendered, size, zoom, parentScale);
  if (!logical) return null;
  const was = placedOn(node, screen);
  const anchor = was?.anchor ?? "top-start";
  return {
    layer: { ...was, anchor, ...placeFor(logical, holder, anchor, rtl) },
    ...(freeze ? { width: length(size.w / zoom), height: length(size.h / zoom), maxWidth: length(size.w / zoom) } : {}),
  };
}

/** Keep the entire object/subtree at its displayed size across differently scaled holders. */
export function transferPatch(
  node: PageTreeNode,
  screen: TreeScreen,
  rendered: Box,
  holder: Box,
  size: Size,
  zoom: number,
  rtl: boolean,
  sourceScale: number,
  targetScale: number,
): Record<string, unknown> | null {
  if (!positive(sourceScale) || !positive(targetScale)) return null;
  const scale = Math.round(lookNumber(node, screen, "scale", 1) * sourceScale / targetScale * 1e6) / 1e6;
  // Stay within the renderer/schema scale range; an out-of-range holder is ineligible.
  if (scale < 0.1 || scale > 4) return null;
  const styles = node.style as Record<string, Record<string, unknown>> | undefined;
  const target = { ...node, style: { ...styles, [screen]: { ...styles?.[screen], scale } } };
  const patch = placementPatch(target, screen, rendered, holder, size, zoom, rtl, true, targetScale);
  return patch ? { ...patch, ...(Math.abs(sourceScale - targetScale) > 1e-6 ? { scale } : {}) } : null;
}

/** Ratios that preserve the fixed edge within the existing scale/translation ranges. Raw CSS size in. */
export function scaleContentsLimits(node: PageTreeNode, screen: TreeScreen, size: Size, handle: Handle): RatioLimits {
  if (!finiteSize(size)) return { min: 1, max: 1 };
  const scale = lookNumber(node, screen, "scale", 1);
  let min = .1 / scale, max = 4 / scale;
  const origin = shownLook(node, screen, "origin");
  const oy = origin === "top" ? 0 : origin === "bottom" ? size.h : size.h / 2;
  const x = (handle.includes("w") ? -1 : 1) * size.w / 2 * scale;
  const y = ((handle.includes("n") ? -1 : 1) * size.h / 2 - (size.h / 2 - oy)) * scale;
  const radians = lookNumber(node, screen, "rotateZ", 0) * Math.PI / 180;
  const dx = x * Math.cos(radians) - y * Math.sin(radians);
  const dy = x * Math.sin(radians) + y * Math.cos(radians);
  for (const [key, coefficient] of [["moveX", dx], ["moveY", dy]] as const) {
    if (Math.abs(coefficient) < 1e-9) continue;
    const move = lookNumber(node, screen, key, 0);
    const a = 1 + (-1000 - move) / coefficient, b = 1 + (1000 - move) / coefficient;
    min = Math.max(min, Math.min(a, b)); max = Math.min(max, Math.max(a, b));
  }
  return { min: Math.min(1, min), max: Math.max(1, max) };
}

/** Scale + translate only: keep raw dimensions and insets so auto/% layouts never reflow. */
export function scaleContentsPatch(
  node: PageTreeNode,
  screen: TreeScreen,
  start: Box,
  next: Box,
  size: Size,
  ratio: number,
  zoom: number,
  parentScale = 1,
): Record<string, unknown> | null {
  if (!finiteBox(start) || !finiteBox(next) || !finiteSize(size) || !positive(ratio) || !positive(zoom) || !positive(parentScale)) return null;
  const requested = lookNumber(node, screen, "scale", 1) * ratio;
  if (requested < .1 - 1e-9 || requested > 4 + 1e-9) return null;
  // Keep the planner's full ratio precision at the movement boundary.
  const scale = Math.max(.1, Math.min(4, requested));
  const styles = node.style as Record<string, Record<string, unknown>> | undefined;
  const target = { ...node, style: { ...styles, [screen]: { ...styles?.[screen], scale } } };
  const before = centerOffset(node, screen, size), after = centerOffset(target, screen, size);
  const move = (key: string, delta: number) => Math.round((lookNumber(node, screen, key, 0) + delta) * 1e6) / 1e6;
  const patch = {
    scale,
    moveX: move("moveX", (next.x + next.w / 2 - start.x - start.w / 2) / (zoom * parentScale) - (after.x - before.x) / zoom),
    moveY: move("moveY", (next.y + next.h / 2 - start.y - start.h / 2) / (zoom * parentScale) - (after.y - before.y) / zoom),
  };
  if (Math.abs(patch.moveX) > 1000 + 1e-6 || Math.abs(patch.moveY) > 1000 + 1e-6) return null;
  return { ...patch, moveX: Math.max(-1000, Math.min(1000, patch.moveX)), moveY: Math.max(-1000, Math.min(1000, patch.moveY)) };
}

/**
 * Size and anchor position form one patch. `size` is the original raw CSS size
 * times editor zoom; width/height are the requested raw CSS dimensions.
 */
export function resizePatch(
  node: PageTreeNode,
  screen: TreeScreen,
  start: Box,
  next: Box,
  size: Size,
  width: number | null,
  height: number | null,
  holder: Box | null,
  zoom: number,
  rtl: boolean,
  free: boolean,
  parentScale = 1,
): Record<string, unknown> | null {
  if (!finiteBox(start) || !finiteBox(next) || !finiteSize(size) || !positive(zoom) || !positive(parentScale)) return null;
  const w = width ?? size.w / zoom;
  const h = height ?? size.h / zoom;
  if (!positive(w) || !positive(h)) return null;
  const resized = { w: w * zoom, h: h * zoom };
  if (free && holder) {
    const patch = placementPatch(node, screen, next, holder, resized, zoom, rtl, true, parentScale);
    return patch ? { ...patch, ...(height !== null ? { minHeight: "0px" } : {}) } : null;
  }

  const before = centerOffset(node, screen, size);
  const after = centerOffset(node, screen, resized);
  const dx = (next.x + next.w / 2 - start.x - start.w / 2) / (zoom * parentScale) - (after.x - before.x) / zoom;
  const dy = (next.y + next.h / 2 - start.y - start.h / 2) / (zoom * parentScale) - (after.y - before.y) / zoom;
  const move = (key: string, delta: number) => Math.max(-1000, Math.min(1000, lookNumber(node, screen, key, 0) + delta));
  return {
    ...(width !== null ? { width: length(w), maxWidth: length(w) } : {}),
    ...(height !== null ? { height: length(h), minHeight: "0px" } : {}),
    moveX: move("moveX", dx),
    moveY: move("moveY", dy),
  };
}
