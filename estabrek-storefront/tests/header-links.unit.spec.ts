import { expect, test } from "@playwright/test";
import { headerLinks } from "../src/lib/headerLinks";

// What a designed header links to already (the store's bar adds only the rest): any `href` in its tree, in any
// language's path or as a full address; a link that only starts the same (/carts, /accounting) isn't one.
test("a designed header's own cart and account links are found wherever they are in its tree", () => {
  expect(headerLinks({ root: { children: [{ type: "menu", props: { items: [{ href: "/" }, { href: "/about" }] } }] } })).toEqual({ cart: false, account: false });
  expect(headerLinks({ root: { children: [{ type: "button", props: { href: "/cart" } }] } })).toEqual({ cart: true, account: false });
  expect(headerLinks({ root: { children: [{ type: "menu", props: { items: [{ href: "/ar/account?tab=orders" }] } }] } })).toEqual({ cart: false, account: true });
  expect(headerLinks({ root: { children: [{ type: "image", props: { href: "https://shop.test/en/cart" } }, { props: { href: "/account/login" } }] } })).toEqual({ cart: true, account: true });
  expect(headerLinks({ root: { children: [{ props: { href: "/carts" } }, { props: { href: "/accounting" } }, { props: { label: "/cart" } }] } })).toEqual({ cart: false, account: false });
});
