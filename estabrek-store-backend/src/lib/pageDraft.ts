/**
 * A page's draft in the new editor (track B, phase 2): every change lands here
 * first, the editor's frame shows it, and "publish" writes it to the page in one
 * go (a revision is saved first). The draft is a copy of the page's sections (with
 * their words in the other languages) and its tree, plus a recycle bin for deleted
 * sections so undo can bring them back.
 *
 * Changes are small operations (setField, move, remove, restore, setVisible,
 * placeBlock for the old sections; insert, move, remove, setProps, setStyle, setMotion for the
 * tree's own elements at any depth), checked one by one; a section's data must
 * still pass its type's check after a change, and the tree the page tree's.
 */
import { createHash } from "node:crypto";
import { type PageTree, type TreeNode, OVERLAY_HOSTS, TREE_VERSION, checkTree, storedTree, syncWithSections, treeFromSections } from "./pageTree.js";

export const DRAFT_LANGS = ["ar", "en", "he"] as const;
export type DraftLang = (typeof DRAFT_LANGS)[number];
export const ROSE_BLOCKS = ["seasons", "stories", "instagram"] as const;
export const SCREENS = ["base", "tablet", "mobile"] as const;

export type DraftSection = { id: string; type: string; data: unknown; isVisible: boolean; tr: Partial<Record<DraftLang, unknown>> };
export type PageDraft = {
  version: 1;
  rev: number;
  /** What the page looked like when the draft began (publish refuses if it changed since, unless forced). */
  baseHash: string;
  sections: DraftSection[];
  tree: PageTree;
  trash: Array<{ section: DraftSection; node: TreeNode; index: number }>;
  startedAt: string;
  updatedAt: string;
};

export type DraftOp =
  | { op: "setField"; sectionId: string; lang: DraftLang; path: Array<string | number>; value: unknown }
  /** Moves an element to `index` in `parentId` (the page when left out). */
  | { op: "move"; nodeId: string; index: number; parentId?: string }
  /** Takes an element out of the page, from wherever it is (an old section goes to the bin). */
  | { op: "remove"; nodeId: string }
  /** A new element (with what's inside it) at `index` in `parentId`. */
  | { op: "insert"; parentId: string; index: number; node: TreeNode }
  /** An element's settings, all of them (words in every language included). */
  | { op: "setProps"; nodeId: string; props: Record<string, unknown> }
  /** An element's look on one screen size; null clears it. */
  | { op: "setStyle"; nodeId: string; screen: (typeof SCREENS)[number]; style: Record<string, unknown> | null }
  /** How an element moves (coming in, scroll, loop, pointer, animated layer); null stops it. */
  | { op: "setMotion"; nodeId: string; motion: Record<string, unknown> | null }
  | { op: "restore"; sectionId: string }
  | { op: "setVisible"; sectionId: string; visible: boolean }
  | { op: "placeBlock"; block: (typeof ROSE_BLOCKS)[number]; index: number | null };

export class DraftError extends Error {}

type RowSection = { id: string; type: string; data: unknown; isVisible: boolean; order: number; translations?: Array<{ locale: string; data: unknown }> };

const clone = <T,>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));

/** A fingerprint of the page's sections and their words, to notice changes made elsewhere. */
export function sectionsHash(rows: RowSection[], tree: unknown): string {
  const flat = rows
    .slice()
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((s) => [s.id, s.type, s.data, s.isVisible, (s.translations ?? []).slice().sort((a, b) => a.locale.localeCompare(b.locale)).map((t) => [t.locale, t.data])]);
  return createHash("sha256").update(JSON.stringify([flat, tree ?? null])).digest("hex").slice(0, 32);
}

/** A fresh draft of the page as it is now. */
export function draftFromPage(page: { tree: unknown; sections: RowSection[] }, now = new Date()): PageDraft {
  const ordered = page.sections.slice().sort((a, b) => a.order - b.order);
  const saved = storedTree(page.tree);
  const tree = saved ? syncWithSections(saved, ordered).tree : treeFromSections(ordered);
  return {
    version: 1,
    rev: 0,
    baseHash: sectionsHash(page.sections, page.tree),
    sections: ordered.map((s) => ({
      id: s.id,
      type: s.type,
      data: clone(s.data ?? {}),
      isVisible: s.isVisible !== false,
      tr: Object.fromEntries((s.translations ?? []).filter((t) => (DRAFT_LANGS as readonly string[]).includes(t.locale)).map((t) => [t.locale, clone(t.data)])),
    })),
    tree,
    trash: [],
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/** A saved draft, or null when missing or broken. */
export function storedDraft(value: unknown): PageDraft | null {
  const d = value as PageDraft | null;
  if (!d || typeof d !== "object" || d.version !== 1 || !Array.isArray(d.sections) || !Array.isArray(d.trash)) return null;
  const tree = storedTree(d.tree);
  return tree ? { ...d, tree } : null;
}

/* ------------------------------------------------------------- fields */

const KEY = /^[A-Za-z_][A-Za-z0-9_]{0,40}$/;
const MAX_TEXT = 5000;

function checkPath(path: unknown): Array<string | number> {
  if (!Array.isArray(path) || !path.length || path.length > 8) throw new DraftError("A field's path has 1–8 steps");
  for (const step of path) {
    if (typeof step === "number" ? !(Number.isInteger(step) && step >= 0 && step < 200) : !(typeof step === "string" && KEY.test(step) && step !== "__proto__" && step !== "constructor" && step !== "prototype")) {
      throw new DraftError(`Not a field step: ${String(step)}`);
    }
  }
  return path as Array<string | number>;
}

function checkValue(v: unknown): unknown {
  if (v === null || typeof v === "boolean") return v;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new DraftError("Not a number");
    return v;
  }
  if (typeof v === "string") {
    if (v.length > MAX_TEXT) throw new DraftError(`Up to ${MAX_TEXT} characters`);
    return v;
  }
  if (Array.isArray(v) && v.length <= 50 && v.every((x) => typeof x === "string" && x.length <= 500)) return v.slice();
  throw new DraftError("A value is text, a number, yes/no, a list of short texts, or empty");
}

/** Writes a value at a path, making the objects (or list items) on the way. */
export function setPath(target: Record<string, unknown>, path: Array<string | number>, value: unknown) {
  let at: any = target;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (at[k] === undefined || at[k] === null || typeof at[k] !== "object") at[k] = typeof path[i + 1] === "number" ? [] : {};
    at = at[k];
  }
  const last = path[path.length - 1];
  if (value === null) {
    if (Array.isArray(at) && typeof last === "number") at[last] = null;
    else delete at[last];
  } else at[last] = value;
}

const getPath = (v: unknown, path: Array<string | number>) => path.reduce<any>((at, k) => (at && typeof at === "object" ? at[k] : undefined), v);

/**
 * A word in another language: its translation overrides the main data, and a
 * translated list replaces the whole main list — so a list on the way is first
 * copied from what the shopper sees now, then changed.
 */
export function setTranslated(base: unknown, tr: unknown, path: Array<string | number>, value: unknown): Record<string, unknown> {
  const out: any = tr && typeof tr === "object" ? clone(tr) : {};
  let at = out;
  let seen: any = base;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    seen = seen && typeof seen === "object" ? seen[k] : undefined;
    if (at[k] === undefined || at[k] === null || typeof at[k] !== "object") {
      if (Array.isArray(seen)) at[k] = clone(seen);
      else at[k] = typeof path[i + 1] === "number" ? [] : {};
    } else if (Array.isArray(seen) && Array.isArray(at[k])) {
      // Fill gaps from the main list, so the list stays whole.
      at[k] = seen.map((item: unknown, j: number) => (at[k][j] !== undefined ? at[k][j] : clone(item)));
    }
    at = at[k];
  }
  at[path[path.length - 1]] = value;
  return out;
}

/* ---------------------------------------------------------------- ops */

/** An element anywhere in the tree, with its parent and its place there. */
export function locate(tree: PageTree, id: unknown): { node: TreeNode; parent: TreeNode | null; index: number } | null {
  if (tree.root.id === id) return { node: tree.root, parent: null, index: 0 };
  const walk = (parent: TreeNode): ReturnType<typeof locate> => {
    const kids = parent.children ?? [];
    for (let i = 0; i < kids.length; i++) {
      if (kids[i].id === id) return { node: kids[i], parent, index: i };
      const deeper = walk(kids[i]);
      if (deeper) return deeper;
    }
    return null;
  };
  return walk(tree.root);
}

/** Types the editor's own changes never make or touch: the page, old sections (setField…) and rose scenes (placeBlock). */
const FIXED_TYPES = new Set(["page", "legacy", "roseBlock"]);
const isPlain = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const place = (n: number, max: number) => Math.max(0, Math.min(max, Math.trunc(Number(n)) || 0));

/** What an element holds; an old section or a scene starts holding objects placed over it. */
const holdsOf = (n: TreeNode): TreeNode[] | undefined => n.children ?? (OVERLAY_HOSTS.has(n.type) ? (n.children = []) : undefined);

const legacyIndex = (tree: PageTree, sectionId: string) => (tree.root.children ?? []).findIndex((n) => n.type === "legacy" && n.props.sectionId === sectionId);

export type ApplyCtx = {
  main: DraftLang;
  /** The section type's own check (admin pageSectionData.schemas validateSectionData); throws when the data is wrong. */
  checkSection?: (type: string, data: unknown) => unknown;
};

/** Applies the editor's changes in order; nothing is applied when one is refused. */
export function applyOps(draft: PageDraft, ops: unknown, ctx: ApplyCtx, now = new Date()): PageDraft {
  if (!Array.isArray(ops) || !ops.length || ops.length > 50) throw new DraftError("1–50 changes at a time");
  const d: PageDraft = clone(draft);
  const section = (id: unknown) => {
    const s = d.sections.find((x) => x.id === id);
    if (!s) throw new DraftError(`No section ${String(id)} in the draft`);
    return s;
  };
  const kids = () => (d.tree.root.children ??= []);
  for (const raw of ops as DraftOp[]) {
    switch (raw?.op) {
      case "setField": {
        const s = section(raw.sectionId);
        const path = checkPath(raw.path);
        const value = checkValue(raw.value);
        const lang = (DRAFT_LANGS as readonly string[]).includes(raw.lang) ? raw.lang : ctx.main;
        if (lang === ctx.main) {
          const data = clone((s.data ?? {}) as Record<string, unknown>);
          setPath(data, path, value);
          // Checked by the type's rules, but kept as written (the check fills defaults the shop doesn't need).
          ctx.checkSection?.(s.type, data);
          s.data = data;
        } else {
          s.tr[lang] = setTranslated(s.data, s.tr[lang], path, value);
        }
        break;
      }
      case "move": {
        if (raw.parentId !== undefined && raw.parentId !== d.tree.root.id) {
          const at = locate(d.tree, raw.nodeId);
          const into = locate(d.tree, raw.parentId);
          if (!at?.parent || FIXED_TYPES.has(at.node.type)) throw new DraftError(`No element ${String(raw.nodeId)} to move`);
          const held = into ? holdsOf(into.node) : undefined;
          if (!into || !held) throw new DraftError(`${String(raw.parentId)} can't hold other elements`);
          if (locate({ version: TREE_VERSION, root: at.node }, raw.parentId)) throw new DraftError("An element can't go inside itself");
          at.parent.children!.splice(at.index, 1);
          held.splice(place(raw.index, held.length), 0, at.node);
          break;
        }
        const list = kids();
        const from = list.findIndex((n) => n.id === raw.nodeId);
        if (from < 0) {
          // An element from inside a section, coming up to the page.
          const at = locate(d.tree, raw.nodeId);
          if (!at?.parent || FIXED_TYPES.has(at.node.type)) throw new DraftError(`No element ${String(raw.nodeId)} on the page`);
          at.parent.children!.splice(at.index, 1);
          list.splice(place(raw.index, list.length), 0, at.node);
          break;
        }
        const to = Math.max(0, Math.min(list.length - 1, Math.trunc(Number(raw.index))));
        const [n] = list.splice(from, 1);
        list.splice(to, 0, n);
        break;
      }
      case "insert": {
        const into = locate(d.tree, raw.parentId);
        const held = into ? holdsOf(into.node) : undefined;
        if (!into || !held) throw new DraftError(`${String(raw.parentId)} can't hold other elements`);
        if (!isPlain(raw.node)) throw new DraftError("Expected an element");
        const node = clone(raw.node);
        const fixed = (n: TreeNode): boolean => FIXED_TYPES.has(String(n?.type)) || (Array.isArray(n?.children) && n.children.some(fixed));
        if (fixed(node)) throw new DraftError("Old sections and scenes come back through their own changes");
        held.splice(place(raw.index, held.length), 0, node);
        break;
      }
      case "setProps": {
        const at = locate(d.tree, raw.nodeId);
        if (!at || FIXED_TYPES.has(at.node.type)) throw new DraftError(`No element ${String(raw.nodeId)} with settings`);
        if (!isPlain(raw.props)) throw new DraftError("Settings are an object");
        at.node.props = clone(raw.props);
        break;
      }
      case "setStyle": {
        const at = locate(d.tree, raw.nodeId);
        if (!at || FIXED_TYPES.has(at.node.type)) throw new DraftError(`No element ${String(raw.nodeId)} with a look`);
        if (!(SCREENS as readonly string[]).includes(raw.screen)) throw new DraftError(`Not a screen: ${String(raw.screen)}`);
        if (raw.style !== null && !isPlain(raw.style)) throw new DraftError("A look is an object");
        const style: Record<string, unknown> = { ...(at.node.style ?? {}) };
        if (raw.style === null || !Object.keys(raw.style).length) delete style[raw.screen];
        else style[raw.screen] = clone(raw.style);
        if (Object.keys(style).length) at.node.style = style as TreeNode["style"];
        else delete at.node.style;
        break;
      }
      case "setMotion": {
        const at = locate(d.tree, raw.nodeId);
        if (!at || FIXED_TYPES.has(at.node.type)) throw new DraftError(`No element ${String(raw.nodeId)} that moves`);
        if (raw.motion !== null && !isPlain(raw.motion)) throw new DraftError("Motion is an object");
        if (raw.motion === null || !Object.keys(raw.motion).length) delete at.node.motion;
        else at.node.motion = clone(raw.motion) as TreeNode["motion"];
        break;
      }
      case "remove": {
        const list = kids();
        const at = list.findIndex((n) => n.id === raw.nodeId);
        if (at < 0) {
          const inside = locate(d.tree, raw.nodeId);
          if (!inside?.parent) throw new DraftError(`No element ${String(raw.nodeId)} on the page`);
          inside.parent.children!.splice(inside.index, 1);
          break;
        }
        const [node] = list.splice(at, 1);
        if (node.type === "legacy") {
          const i = d.sections.findIndex((x) => x.id === node.props.sectionId);
          if (i >= 0) {
            const [gone] = d.sections.splice(i, 1);
            d.trash = [...d.trash.filter((t) => t.section.id !== gone.id), { section: gone, node, index: at }].slice(-30);
          }
        }
        break;
      }
      case "restore": {
        const t = d.trash.find((x) => x.section.id === raw.sectionId);
        if (!t) throw new DraftError(`Section ${String(raw.sectionId)} isn't in the bin`);
        d.trash = d.trash.filter((x) => x !== t);
        d.sections.push(t.section);
        const list = kids();
        list.splice(Math.min(t.index, list.length), 0, t.node);
        break;
      }
      case "setVisible": {
        section(raw.sectionId).isVisible = raw.visible === true;
        break;
      }
      case "placeBlock": {
        if (!(ROSE_BLOCKS as readonly string[]).includes(raw.block)) throw new DraftError(`Not a block: ${String(raw.block)}`);
        const list = kids();
        const id = `rb-${raw.block}`;
        const at = list.findIndex((n) => n.id === id);
        const node: TreeNode = at >= 0 ? list.splice(at, 1)[0] : { id, type: "roseBlock", props: { block: raw.block } };
        if (raw.index !== null && raw.index !== undefined) list.splice(Math.max(0, Math.min(list.length, Math.trunc(Number(raw.index)))), 0, node);
        break;
      }
      default:
        throw new DraftError(`Unknown change “${String((raw as any)?.op)}”`);
    }
  }
  const checked = checkTree(d.tree);
  if (!checked.ok) throw new DraftError(checked.issues[0]?.message ?? "The page's layout isn't valid");
  d.tree = checked.tree;
  d.rev += 1;
  d.updatedAt = now.toISOString();
  return d;
}

/** The section order to write on publish: the order of their old-section nodes. */
export function publishOrder(d: PageDraft): Map<string, number> {
  const order = new Map<string, number>();
  (d.tree.root.children ?? []).forEach((n) => {
    if (n.type === "legacy") order.set(String(n.props.sectionId), order.size);
  });
  for (const s of d.sections) if (!order.has(s.id)) order.set(s.id, order.size);
  return order;
}

/** Whether the published page needs its tree (anything besides old sections in order, or objects placed over them). */
export const needsTree = (tree: PageTree) => (tree.root.children ?? []).some((n) => n.type !== "legacy" || Boolean(n.children?.length));

export { TREE_VERSION, getPath };
