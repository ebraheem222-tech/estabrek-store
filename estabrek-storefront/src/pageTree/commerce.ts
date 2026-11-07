type Node = { type: string; style?: Record<string, { hidden?: boolean } | undefined>; children?: Node[] };
export type CommerceTree = { root: Node };

/** Keep public fallback aligned with backend lib/commercePage.ts (parity tested). */
export function commercePageValid(slug: string, tree: unknown) {
  const required = slug === "/shop" ? ["shop"] : slug === "/cart" ? ["cartItems", "cartSummary", "cartCheckout"] : [];
  if (!required.length) return true;
  if (!tree || typeof tree !== "object" || !(tree as CommerceTree).root) return false;
  const all = new Map<string, number>(), visible = new Map<string, number>();
  const walk = (node: Node, excluded: boolean) => {
    const hidden = excluded || ["popup", "deck"].includes(node.type) || Object.values(node.style ?? {}).some(style => style?.hidden === true);
    all.set(node.type, (all.get(node.type) ?? 0) + 1);
    if (!hidden) visible.set(node.type, (visible.get(node.type) ?? 0) + 1);
    node.children?.forEach(child => walk(child, hidden));
  };
  walk((tree as CommerceTree).root, false);
  return required.every(type => all.get(type) === 1 && visible.get(type) === 1);
}

export function commerceNeeds(tree: CommerceTree) {
  let shop = false, cart = false;
  const walk = (node: Node) => {
    if (node.type === "shop") shop = true;
    if (["cartItems", "cartSummary", "cartCheckout"].includes(node.type)) cart = true;
    node.children?.forEach(walk);
  };
  walk(tree.root);
  return { shop, cart };
}
