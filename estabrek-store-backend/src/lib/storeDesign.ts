import { prisma } from "./prisma.js";
import { storedTree, type TreeNode, type PageTree } from "./pageTree.js";
import { withBlocks } from "./pageBlocks.js";
import { withComponents } from "./pageComponents.js";

/** Give each global region its own IDs, separate from each other and the page's nodes. */
export function regionTree(tree: PageTree, region: "header" | "footer"): PageTree {
  let n = 0;
  const copy = (node: TreeNode): TreeNode => ({ ...structuredClone(node), id: `${region}_${(n++).toString(36)}`, ...(node.children ? { children: node.children.map(copy) } : {}) });
  return { ...tree, root: copy(tree.root) };
}

/** Only a store's configured, published block documents are public. Drafts are never read. */
export async function publishedDesignRegions(header: unknown) {
  const design = (header as { storeDesign?: { mode?: string; headerId?: string; footerId?: string } } | null)?.storeDesign;
  if (design?.mode !== "cms") return { header: null, footer: null };
  const ids = [design.headerId, design.footerId].filter((id): id is string => typeof id === "string");
  if (!ids.length) return { header: null, footer: null };
  const rows = await prisma.page.findMany({ where: { id: { in: ids }, kind: "block", status: "PUBLISHED" }, select: { id: true, tree: true } });
  const result: Record<"header" | "footer", PageTree | null> = { header: null, footer: null };
  for (const region of ["header", "footer"] as const) {
    const row = rows.find((r) => r.id === design[`${region}Id`]);
    const tree = row ? storedTree(row.tree) : null;
    if (tree) result[region] = regionTree(await withComponents(await withBlocks(tree)), region);
  }
  return result;
}
