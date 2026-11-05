/**
 * Saved blocks of the new editor: sections kept once and used on many pages. A block is a
 * page of its own kind (Page.kind "block", never served as a page), edited in the editor
 * like any page. A page links one with a `block` node; the shop gets the block's published
 * sections in its place, each node renamed after the link so ids stay unique on the page
 * (the first section takes the link's own id, so the editor can select it as one).
 */
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";
import { TREE_VERSION, storedTree, type PageTree, type TreeNode } from "./pageTree.js";

export const BLOCK_KIND = "block";
export const blockSlug = () => `/__block/${randomBytes(6).toString("hex")}`;
/** The store's own templates: sections (and popups) kept to be copied onto pages, never served or linked. */
export const TEMPLATE_KIND = "template";
export const templateSlug = () => `/__template/${randomBytes(6).toString("hex")}`;

/** The blocks a tree links (straight on the page only). */
export function blockIdsOf(tree: PageTree | null | undefined): string[] {
  return [...new Set((tree?.root.children ?? []).filter((n) => n.type === "block" && typeof n.props.blockId === "string").map((n) => String(n.props.blockId)))];
}

/** A block's sections renamed after the link: the first takes the link's id, the rest `<link>_<n>`. */
function renamed(sections: TreeNode[], linkId: string): TreeNode[] {
  const stem = linkId.slice(0, 30);
  let n = 0;
  const next = () => `${stem}_${(n++).toString(36)}`;
  const walk = (node: TreeNode, id: string): TreeNode => {
    const { children, ...rest } = node;
    return { ...structuredClone(rest), id, ...(children ? { children: children.map((c) => walk(c, next())) } : {}) };
  };
  return sections.map((s, i) => walk(s, i === 0 ? linkId : next()));
}

/** The tree with each linked block's sections in its place; a link to a block that's gone draws nothing. */
export function expandBlocks(tree: PageTree, blocks: Map<string, TreeNode[]>): PageTree {
  const kids = tree.root.children ?? [];
  if (!kids.some((n) => n.type === "block")) return tree;
  const children = kids.flatMap((n) => (n.type === "block" ? renamed(blocks.get(String(n.props.blockId)) ?? [], n.id) : [n]));
  return { version: TREE_VERSION, root: { ...tree.root, children } };
}

/** Each block's published sections (its saved tree's sections; not its draft). */
export async function loadBlocks(ids: string[]): Promise<Map<string, TreeNode[]>> {
  const out = new Map<string, TreeNode[]>();
  if (!ids.length) return out;
  const rows = await prisma.page.findMany({ where: { id: { in: ids }, kind: BLOCK_KIND, status: "PUBLISHED" }, select: { id: true, tree: true } });
  for (const r of rows) out.set(r.id, (storedTree(r.tree)?.root.children ?? []).filter((n) => n.type === "section"));
  return out;
}

/** A tree for the shop: its linked blocks drawn in place. */
export async function withBlocks<T extends PageTree | null | undefined>(tree: T): Promise<T> {
  const ids = blockIdsOf(tree);
  if (!tree || !ids.length) return tree;
  return expandBlocks(tree, await loadBlocks(ids)) as T;
}

/** How many pages link each block (their saved tree or their draft). */
export async function blockUses(): Promise<Map<string, number>> {
  const pages = await prisma.page.findMany({ where: { kind: { not: BLOCK_KIND } }, select: { tree: true, draft: true } });
  const uses = new Map<string, number>();
  for (const p of pages) {
    const draftTree = (p.draft as { tree?: unknown } | null)?.tree;
    const ids = new Set([...blockIdsOf(storedTree(p.tree)), ...blockIdsOf(storedTree(draftTree))]);
    for (const id of ids) uses.set(id, (uses.get(id) ?? 0) + 1);
  }
  return uses;
}
