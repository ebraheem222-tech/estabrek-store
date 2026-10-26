/**
 * The editor's side of a page's draft (backend src/lib/pageDraft.ts): the field
 * values the shopper sees in a language, and the change that undoes each change
 * (worked out one after the other, so a batch that moves things and then removes
 * their old place undoes cleanly).
 */
import type { PageDraft, PageDraftOp, DraftSection, PageTree, PageTreeNode } from "../api/pages.api";

export type Lang = "ar" | "en" | "he";

/** "items.2.question" → ["items", 2, "question"]. */
export const parsePath = (p: string): Array<string | number> => p.split(".").filter(Boolean).map((s) => (/^\d+$/.test(s) ? Number(s) : s));

/** A translation over the main data, as the shop merges it: objects field by field, a list as a whole. */
export function mergeTranslated(base: unknown, over: unknown): unknown {
  if (over === undefined || over === null) return base;
  if (base === undefined || base === null) return over;
  if (Array.isArray(base) || Array.isArray(over)) return Array.isArray(over) ? over : base;
  if (typeof base === "object" && typeof over === "object") {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(over as Record<string, unknown>)) if (v !== undefined) out[k] = mergeTranslated((base as Record<string, unknown>)[k], v);
    return out;
  }
  return over;
}

export const getPath = (v: unknown, path: Array<string | number>) => path.reduce<unknown>((at, k) => (at && typeof at === "object" ? (at as Record<string | number, unknown>)[k] : undefined), v);

/** What a section's field says in a language (its translation over the main words). */
export function fieldValue(s: DraftSection | undefined, lang: Lang, main: Lang, path: Array<string | number>): unknown {
  if (!s) return undefined;
  const data = lang === main ? s.data : mergeTranslated(s.data, s.tr?.[lang]);
  return getPath(data, path);
}

/** What only this language's translation holds at the path (undefined = it follows the main words). */
const ownValue = (s: DraftSection | undefined, lang: Lang, main: Lang, path: Array<string | number>) =>
  lang === main ? getPath(s?.data, path) : getPath(s?.tr?.[lang], path);

/** An element anywhere in the tree, with its parent and its place there. */
export function locate(tree: PageTree, id: string): { node: PageTreeNode; parent: PageTreeNode | null; index: number } | null {
  if (tree.root.id === id) return { node: tree.root, parent: null, index: 0 };
  const walk = (parent: PageTreeNode): ReturnType<typeof locate> => {
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

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, Math.trunc(Number(n)) || 0));

/** The change that puts things back as they were before `op` (worked out before it is applied). */
export function inverseOf(op: PageDraftOp, d: PageDraft, main: Lang): PageDraftOp[] {
  const kids = d.tree.root.children ?? [];
  switch (op.op) {
    case "setField": {
      const s = d.sections.find((x) => x.id === op.sectionId);
      const old = ownValue(s, op.lang, main, op.path);
      return [{ ...op, value: old === undefined ? null : old }];
    }
    case "move": {
      if (op.parentId === undefined && kids.some((n) => n.id === op.nodeId)) return [{ op: "move", nodeId: op.nodeId, index: kids.findIndex((n) => n.id === op.nodeId) }];
      const at = locate(d.tree, op.nodeId);
      return at?.parent ? [{ op: "move", nodeId: op.nodeId, parentId: at.parent.id, index: at.index }] : [];
    }
    case "remove": {
      const at = locate(d.tree, op.nodeId);
      if (!at?.parent) return [];
      if (at.node.type === "legacy") return [{ op: "restore", sectionId: String(at.node.props.sectionId) }];
      if (at.node.type === "roseBlock") return [{ op: "placeBlock", block: at.node.props.block as "seasons", index: at.index }];
      return [{ op: "insert", parentId: at.parent.id, index: at.index, node: structuredClone(at.node) }];
    }
    case "insert":
      return [{ op: "remove", nodeId: op.node.id }];
    case "setProps": {
      const at = locate(d.tree, op.nodeId);
      return at ? [{ op: "setProps", nodeId: op.nodeId, props: structuredClone(at.node.props ?? {}) }] : [];
    }
    case "setStyle": {
      const old = locate(d.tree, op.nodeId)?.node.style?.[op.screen];
      return [{ op: "setStyle", nodeId: op.nodeId, screen: op.screen, style: old && typeof old === "object" ? structuredClone(old as Record<string, unknown>) : null }];
    }
    case "setMotion": {
      const old = locate(d.tree, op.nodeId)?.node.motion;
      return [{ op: "setMotion", nodeId: op.nodeId, motion: old ? structuredClone(old) : null }];
    }
    case "restore":
      return [{ op: "remove", nodeId: `s-${op.sectionId}` }];
    case "setVisible": {
      const s = d.sections.find((x) => x.id === op.sectionId);
      return [{ op: "setVisible", sectionId: op.sectionId, visible: s?.isVisible !== false }];
    }
    case "placeBlock": {
      const at = kids.findIndex((n) => n.id === `rb-${op.block}`);
      return [{ op: "placeBlock", block: op.block, index: at >= 0 ? at : null }];
    }
  }
}

/**
 * The tree after `op`, as the server will make it (without its checks). Changes to
 * the old sections' words and visibility leave the tree as it is.
 */
export function simulate(d: PageDraft, op: PageDraftOp): PageDraft {
  if (!["move", "remove", "insert", "setProps", "setStyle", "setMotion"].includes(op.op)) return d;
  const tree = structuredClone(d.tree);
  tree.root.children ??= [];
  switch (op.op) {
    case "move": {
      const at = locate(tree, op.nodeId);
      const into = op.parentId === undefined ? tree.root : locate(tree, op.parentId)?.node;
      if (!at?.parent || !into?.children) return d;
      at.parent.children!.splice(at.index, 1);
      into.children.splice(clamp(op.index, into.children.length), 0, at.node);
      break;
    }
    case "remove": {
      const at = locate(tree, op.nodeId);
      if (!at?.parent) return d;
      at.parent.children!.splice(at.index, 1);
      break;
    }
    case "insert": {
      const into = locate(tree, op.parentId)?.node;
      if (!into?.children) return d;
      into.children.splice(clamp(op.index, into.children.length), 0, structuredClone(op.node));
      break;
    }
    case "setProps": {
      const at = locate(tree, op.nodeId);
      if (!at) return d;
      at.node.props = structuredClone(op.props);
      break;
    }
    case "setStyle": {
      const at = locate(tree, op.nodeId);
      if (!at) return d;
      const style: Record<string, unknown> = { ...(at.node.style ?? {}) };
      if (op.style && Object.keys(op.style).length) style[op.screen] = structuredClone(op.style);
      else delete style[op.screen];
      if (Object.keys(style).length) at.node.style = style;
      else delete at.node.style;
      break;
    }
    case "setMotion": {
      const at = locate(tree, op.nodeId);
      if (!at) return d;
      if (op.motion && Object.keys(op.motion).length) at.node.motion = structuredClone(op.motion);
      else delete at.node.motion;
      break;
    }
  }
  return { ...d, tree };
}

/** How to take back a batch of changes: each one's undo, worked out on the page as it is by then, last first. */
export function undoOf(ops: PageDraftOp[], d: PageDraft, main: Lang): PageDraftOp[] {
  const steps: PageDraftOp[][] = [];
  let at = d;
  for (const op of ops) {
    steps.push(inverseOf(op, at, main));
    at = simulate(at, op);
  }
  return steps.reverse().flat();
}

/** An undo/redo list: each entry is what was done and how to take it back. */
export type HistoryEntry = { label: string; ops: PageDraftOp[]; undo: PageDraftOp[] };
export class History {
  done: HistoryEntry[] = [];
  undone: HistoryEntry[] = [];
  push(e: HistoryEntry) {
    this.done.push(e);
    if (this.done.length > 100) this.done.shift();
    this.undone = [];
  }
  takeUndo() {
    const e = this.done.pop();
    if (e) this.undone.push(e);
    return e ?? null;
  }
  takeRedo() {
    const e = this.undone.pop();
    if (e) this.done.push(e);
    return e ?? null;
  }
  /** A change that failed on the server comes off the list again. */
  drop(e: HistoryEntry) {
    this.done = this.done.filter((x) => x !== e);
    this.undone = this.undone.filter((x) => x !== e);
  }
}
