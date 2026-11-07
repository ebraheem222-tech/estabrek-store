import { expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
import { commercePageIssues } from "../lib/commercePage.js";
import { storePageDraft } from "../lib/storePageTemplates.js";

const node = (type: string, id = type, extra = {}) => ({ id, type, props: {}, ...extra });
const tree = (children: any[]) => ({ version: 1 as const, root: node("page", "page", { children: [node("section", "section", { children })] }) });
const cart = () => [node("cartItems"), node("cartSummary"), node("cartCheckout")];

test("a shop requires one functional catalog and a cart requires all three independent parts", () => {
  expect(commercePageIssues("/shop", tree([node("shop")]))).toEqual([]);
  expect(commercePageIssues("/shop", tree([node("products")]))).toEqual([{ code: "REQUIRED_COMMERCE_OBJECT", nodeType: "shop", count: 0 }]);
  expect(commercePageIssues("/cart", tree(cart()))).toEqual([]);
  expect(commercePageIssues("/cart", tree(cart().slice(0, 2)))).toEqual([{ code: "REQUIRED_COMMERCE_OBJECT", nodeType: "cartCheckout", count: 0 }]);
  expect(commercePageIssues("/about", tree([]))).toEqual([]);
});
test("duplicate controllers or cart parts are rejected", () => {
  expect(commercePageIssues("/shop", tree([node("shop", "one"), node("shop", "two")]))).toEqual([{ code: "DUPLICATE_COMMERCE_OBJECT", nodeType: "shop", count: 2 }]);
  expect(commercePageIssues("/cart", tree([...cart(), node("cartSummary", "two")]))).toEqual([{ code: "DUPLICATE_COMMERCE_OBJECT", nodeType: "cartSummary", count: 2 }]);
});
test.each(["base", "tablet", "mobile"])("a required object hidden on %s cannot satisfy the page contract", screen => {
  expect(commercePageIssues("/shop", tree([node("stack", "hidden", { style: { [screen]: { hidden: true } }, children: [node("shop")] })]))).toEqual([{ code: "REQUIRED_COMMERCE_OBJECT", nodeType: "shop", count: 0 }]);
});
test.each(["popup", "deck"])("an object inside a conditional %s cannot replace the normal shop", type => {
  expect(commercePageIssues("/shop", tree([node(type, "conditional", { children: [node("shop")] })]))).toEqual([{ code: "REQUIRED_COMMERCE_OBJECT", nodeType: "shop", count: 0 }]);
});
test.each(["shop", "cart"] as const)("a new %s draft is ready to customize and meets its page contract", kind => {
  const draft = storePageDraft(kind);
  const checked = checkTree(draft.tree);
  expect(checked.ok).toBe(true);
  expect(commercePageIssues(`/${kind}`, draft.tree)).toEqual([]);
  expect(draft.basePublication).toMatchObject({ status: "DRAFT", slug: `/${kind}` });
  expect(draft.tree.root.props.commerceVersion).toBe(1);
  expect(draft.rev).toBeGreaterThan(0);
  expect(draft.sections).toEqual([]);
});
test("commerce schemas accept display settings and reject prices and service credentials", () => {
  expect(checkTree(tree([node("shop", "s", { props: { columns: 3, mobileColumns: 2, showFilters: false, showSearch: true } }), ...cart()])).ok).toBe(true);
  for (const props of [{ columns: 9 }, { pageSize: 500 }, { apiUrl: "https://attacker.test" }, { price: 1 }, { stripeSecret: "anything" }]) {
    expect(checkTree(tree([node("shop", "s", { props })])).ok).toBe(false);
  }
  expect(checkTree(tree([node("cartCheckout", "c", { props: { total: 1 } })])).ok).toBe(false);
});
