import { nodeCss } from "./css";
import type { ScreenStyle, TreeNode } from "./tree";

const SAFE_ID = /^[A-Za-z0-9_-]{1,40}$/;
const SAFE_TYPE = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/;
const GEOMETRY_KEYS = ["width", "height", "minHeight", "maxWidth", "layer", "moveX", "moveY", "rotateX", "rotateY", "rotateZ", "scale", "perspective", "origin"] as const;
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

/** Only bounded node identities and geometry reach the frame's preview CSS. */
export function geometryPreviewNodes(input: unknown): TreeNode[] {
  if (!Array.isArray(input) || input.length > 2000) return [];
  return input.flatMap((value) => {
    const node = record(value);
    if (!node || typeof node.id !== "string" || !SAFE_ID.test(node.id) || typeof node.type !== "string" || !SAFE_TYPE.test(node.type)) return [];
    const base = record(record(node.style)?.base);
    if (!base) return [];
    const geometry = Object.fromEntries(GEOMETRY_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(base, key)).map((key) => [key, base[key]])) as ScreenStyle;
    return [{ id: node.id, type: node.type, props: {}, style: { base: geometry } }];
  });
}

/** Temporary geometry CSS keeps the original node's .pt-ID class and other rules. */
export function geometryPreviewCss(input: unknown): string {
  // Geometry declarations are shared by all node types. A neutral holder avoids
  // nodeCss adding structural defaults, such as a columns node's track count.
  return geometryPreviewNodes(input).map((node) => nodeCss({ ...node, type: "stack" }, node.id)).join("");
}
