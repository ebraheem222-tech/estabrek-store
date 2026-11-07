import { applyOps, draftFromPage } from "./pageDraft.js";
import type { TreeNode } from "./pageTree.js";

/** Used only by the atomic create branch; existing customer designs are never reseeded. */
export function storePageDraft(kind: "shop" | "cart") {
  const heading: TreeNode = { id: "commerce-title", type: "heading", props: { level: 1, text: kind === "shop" ? { ar: "المتجر", en: "Shop", he: "חנות" } : { ar: "سلة المشتريات", en: "Shopping cart", he: "סל הקניות" } } };
  const part = (type: "cartItems" | "cartSummary" | "cartCheckout"): TreeNode => ({ id: `commerce-${type}`, type, props: {} });
  const children: TreeNode[] = kind === "shop" ? [{ id: "commerce-shop", type: "shop", props: { columns: 3, mobileColumns: 2, showFilters: true, showSearch: true } }]
    : [{ id: "commerce-layout", type: "columns", props: {}, style: { base: { widths: [2, 1], gap: 32 } }, children: [
      { id: "commerce-items-cell", type: "cell", props: {}, children: [part("cartItems")] },
      { id: "commerce-checkout-cell", type: "cell", props: {}, children: [{ id: "commerce-order", type: "stack", props: {}, style: { base: { gap: 24 } }, children: [part("cartSummary"), part("cartCheckout")] }] },
    ] }];
  const draft = draftFromPage({ tree: null, sections: [], status: "DRAFT", slug: `/${kind}` });
  const ready = applyOps(draft, [{ op: "insert", parentId: "page", index: 0, node: { id: "commerce-section", type: "section", props: { contained: true }, style: { base: { pad: [32, 16, 32, 16] } }, children: [heading, ...children] } }], { main: "ar" });
  ready.tree.root.props.commerceVersion = 1;
  return ready;
}
