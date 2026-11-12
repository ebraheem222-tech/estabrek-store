/**
 * Focus mode (an object opened on its own, docs/cms-big-engine-plan.ar.md A1): what kind of editor each element
 * opens, and the parts listed beside it. A drawing lists its shapes (groups, paths, circles…), a container its
 * elements; the other kinds get their parts with their own editors (pictures, video, 3D: A3–A5).
 *
 * Pure (tested): the studio draws what this says.
 */
import type { PageTreeNode } from "../../api/pages.api";
import { say } from "../say";
import type { Art, ArtNode } from "../svgArt";
import { typeLabel, type TreeIndex } from "../treeIndex";

export type FocusGroup = "svg" | "image" | "video" | "model" | "text" | "container" | "other";
/** One part of the opened object: a shape of a drawing (`id` its place, "0.2.1") or an element inside it. */
export type FocusPart = { id: string; label: string; kind: string; depth: number; nodeId?: string };

const GROUPS: Record<string, FocusGroup> = {
  svg: "svg",
  image: "image", beforeAfter: "image",
  video: "video", scrollScene: "video",
  model3d: "model", product360: "model",
  heading: "text", text: "text", button: "text", icon: "text",
  section: "container", cell: "container", columns: "container", stack: "container", grid: "container", deck: "container", popup: "container",
};

/** Which editor an element opens in focus mode. */
export function focusGroup(node: Pick<PageTreeNode, "type" | "children">): FocusGroup {
  return GROUPS[node.type] ?? (node.children?.length ? "container" : "other");
}

const GROUP_TITLE: Record<FocusGroup, string> = {
  svg: "رسمة|Drawing|ציור",
  image: "صورة|Picture|תמונה",
  video: "فيديو|Video|וידאו",
  model: "مجسّم ثلاثي الأبعاد|3D model|מודל תלת־ממדי",
  text: "نص|Text|טקסט",
  container: "حاوية|Container|מכל",
  other: "عنصر|Element|רכיב",
};
export const focusTitle = (group: FocusGroup) => say(GROUP_TITLE[group]);

/** Whether an element can be opened on its own (the page itself can't: it is the whole canvas). */
export const canFocus = (node: Pick<PageTreeNode, "type"> | null | undefined) => Boolean(node && node.type !== "page");

/* ------------------------------------------------------------------ a drawing's shapes */

const SHAPE_WORD: Record<string, string> = {
  g: "مجموعة|Group|קבוצה",
  path: "مسار|Path|נתיב",
  circle: "دائرة|Circle|עיגול",
  ellipse: "بيضاوي|Ellipse|אליפסה",
  rect: "مستطيل|Rectangle|מלבן",
  line: "خط|Line|קו",
  polyline: "خط متكسّر|Polyline|קו שבור",
  polygon: "مضلّع|Polygon|מצולע",
};
/** The tags a drawing's parts are made of (definitions, gradients and masks aren't parts). */
const DRAWN = new Set(Object.keys(SHAPE_WORD));
export const ART_PARTS_MAX = 200;

/** A drawing's shapes as parts, in drawing order, nested under their groups. */
export function artParts(art: Art | undefined | null): FocusPart[] {
  if (!art?.nodes?.length) return [];
  const out: FocusPart[] = [];
  const count = new Map<string, number>();
  const walk = (nodes: ArtNode[], at: string, depth: number) => {
    nodes.forEach((n, i) => {
      if (out.length >= ART_PARTS_MAX || !DRAWN.has(n.t)) return;
      const id = at ? `${at}.${i}` : String(i);
      const k = (count.get(n.t) ?? 0) + 1;
      count.set(n.t, k);
      out.push({ id, kind: n.t, depth, label: n.a.id ? n.a.id.replace(/[-_]+/g, " ") : `${say(SHAPE_WORD[n.t])} ${k}` });
      if (n.t === "g" && n.c?.length) walk(n.c, id, depth + 1);
    });
  };
  walk(art.nodes, "", 0);
  return out;
}

/** The shape at a part's place ("0.2.1"), or null. */
export function artNodeAt(art: Art | undefined | null, id: string): ArtNode | null {
  if (!art || !/^\d+(\.\d+)*$/.test(id)) return null;
  let list: ArtNode[] | undefined = art.nodes;
  let found: ArtNode | null = null;
  for (const step of id.split(".").map(Number)) {
    found = list?.[step] ?? null;
    if (!found) return null;
    list = found.c;
  }
  return found;
}

/** The drawing with one shape replaced by what `fn` makes of it. Unchanged when not found. */
export function withArtNode(art: Art, id: string, fn: (n: ArtNode) => ArtNode): Art {
  if (!artNodeAt(art, id)) return art;
  const steps = id.split(".").map(Number);
  const change = (nodes: ArtNode[], depth: number): ArtNode[] =>
    nodes.map((n, i) => (i !== steps[depth] ? n : depth < steps.length - 1 ? { ...n, c: change(n.c ?? [], depth + 1) } : fn(n)));
  return { ...art, nodes: change(art.nodes, 0) };
}

/** The drawing with one shape's attributes changed (a value of null takes it away). Unchanged when not found. */
export function withArtAttrs(art: Art, id: string, patch: Record<string, string | null>): Art {
  return withArtNode(art, id, (n) => {
    const a = { ...n.a };
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) delete a[k];
      else a[k] = v;
    }
    return { ...n, a };
  });
}

/** The settings that place a circle, rectangle, line or polygon (a path's `d` replaces them all). */
const GEOMETRY = ["cx", "cy", "r", "rx", "ry", "x", "y", "width", "height", "x1", "y1", "x2", "y2", "points"];
/** One shape turned into a path that looks the same (its points can then be moved, it can morph). */
export function asPathNode(n: ArtNode, d: string): ArtNode {
  const a: Record<string, string> = { d };
  for (const [k, v] of Object.entries(n.a)) if (!GEOMETRY.includes(k) && k !== "d") a[k] = v;
  return { t: "path", a };
}

/* ------------------------------------------------------------------ the parts beside it */

/** The parts listed for an opened element. */
export function focusParts(node: PageTreeNode, index: TreeIndex | null): FocusPart[] {
  const group = focusGroup(node);
  if (group === "svg") return artParts((node.props as Record<string, unknown> | undefined)?.art as Art | undefined);
  const kids = index?.nodes.get(node.id)?.children ?? (node.children ?? []).map((c) => c.id);
  return kids
    .map((id) => index?.nodes.get(id)?.node ?? node.children?.find((c) => c.id === id))
    .filter((c): c is PageTreeNode => Boolean(c))
    .map((c) => ({ id: c.id, nodeId: c.id, kind: c.type, depth: 0, label: c.name || typeLabel(c.type) }));
}

/** The opened element and the elements it holds down to `id` (for the path along the top), or null when outside. */
export function focusTrail(index: TreeIndex, focusId: string, id: string): string[] | null {
  const trail: string[] = [];
  for (let at: string | null = id; at; at = index.nodes.get(at)?.parentId ?? null) {
    trail.unshift(at);
    if (at === focusId) return trail;
  }
  return null;
}
