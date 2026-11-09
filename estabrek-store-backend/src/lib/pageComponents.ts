/**
 * Main components (W2) in the database: a page of kind "component" (never served as a page),
 * edited in the editor like any page; publishing it changes every page that uses it. The tree
 * work (variants, overrides, renaming) is lib/componentTree.ts.
 */
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { NODE_PROPS, storedTree, type NodeType, type PageTree, type TreeNode } from "./pageTree.js";
import { COMPONENT_DEPTH, componentIdsOf, expandComponents, variantsOf } from "./componentTree.js";

export const COMPONENT_KIND = "component";
export const componentSlug = () => `/__component/${randomBytes(6).toString("hex")}`;

/** An instance's change to an inner element is kept only if the element stays valid with it. */
export const acceptOverride = (type: string, props: Record<string, unknown>) => Boolean(NODE_PROPS[type as NodeType]?.safeParse(props).success);

/** Each component's published variants, with the components they use in turn (three deep at most). */
export async function loadComponents(ids: string[], db: Pick<Prisma.TransactionClient, "page"> = prisma): Promise<Map<string, TreeNode[]>> {
  const out = new Map<string, TreeNode[]>();
  let want = [...new Set(ids)];
  for (let depth = 0; want.length && depth < COMPONENT_DEPTH; depth++) {
    const rows = await db.page.findMany({ where: { id: { in: want }, kind: COMPONENT_KIND, status: "PUBLISHED" }, select: { id: true, tree: true } });
    const nested: string[] = [];
    for (const r of rows) {
      const tree = storedTree(r.tree);
      out.set(r.id, variantsOf(tree) as TreeNode[]);
      nested.push(...componentIdsOf(tree));
    }
    want = [...new Set(nested)].filter((id) => !out.has(id));
  }
  return out;
}

/** A tree for the shop: its instances drawn as their components. */
export async function withComponents<T extends PageTree | null | undefined>(tree: T, db: Pick<Prisma.TransactionClient, "page"> = prisma): Promise<T> {
  const ids = componentIdsOf(tree as never);
  if (!tree || !ids.length) return tree;
  return expandComponents(tree as PageTree, (await loadComponents(ids, db)) as never, acceptOverride) as T;
}

/** How many pages use each component (their saved tree or their draft). */
export async function componentUses(): Promise<Map<string, number>> {
  const pages = await prisma.page.findMany({ where: { kind: { not: COMPONENT_KIND } }, select: { tree: true, draft: true } });
  const uses = new Map<string, number>();
  for (const p of pages) {
    const draftTree = (p.draft as { tree?: unknown } | null)?.tree;
    const ids = new Set([...componentIdsOf(storedTree(p.tree) as never), ...componentIdsOf(storedTree(draftTree) as never)]);
    for (const id of ids) uses.set(id, (uses.get(id) ?? 0) + 1);
  }
  return uses;
}
