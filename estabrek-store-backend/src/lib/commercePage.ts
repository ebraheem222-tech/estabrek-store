import { PublicationError } from "./pagePublication.js";
type Node = { type: string; style?: Record<string, { hidden?: boolean } | undefined>; children?: Node[] };
export type CommerceIssue = { code: "REQUIRED_COMMERCE_OBJECT" | "DUPLICATE_COMMERCE_OBJECT"; nodeType: string; count: number };
export class CommercePageError extends PublicationError {
  constructor(readonly issues: CommerceIssue[]) { super("COMMERCE_PAGE_INVALID", 422); }
}

/** Required commerce must be in the normal document and visible at every breakpoint. */
export function commercePageIssues(slug: string, tree: { root: Node }): CommerceIssue[] {
  const required = slug === "/shop" ? ["shop"] : slug === "/cart" ? ["cartItems", "cartSummary", "cartCheckout"] : [];
  const all = new Map<string, number>(), visible = new Map<string, number>();
  const walk = (node: Node, excluded: boolean) => {
    const hidden = excluded || ["popup", "deck"].includes(node.type) || Object.values(node.style ?? {}).some(style => style?.hidden === true);
    all.set(node.type, (all.get(node.type) ?? 0) + 1);
    if (!hidden) visible.set(node.type, (visible.get(node.type) ?? 0) + 1);
    node.children?.forEach(child => walk(child, hidden));
  };
  walk(tree.root, false);
  return required.flatMap<CommerceIssue>(nodeType => (all.get(nodeType) ?? 0) > 1
    ? [{ code: "DUPLICATE_COMMERCE_OBJECT" as const, nodeType, count: all.get(nodeType)! }]
    : visible.get(nodeType) === 1 ? [] : [{ code: "REQUIRED_COMMERCE_OBJECT" as const, nodeType, count: 0 }]);
}
