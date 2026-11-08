import { afterEach, expect, test } from "vitest";
import { collectSelectionParts, domPartPath, domPartSelector, partId, targetSelector } from "../../../estabrek-storefront/src/pageTree/selectionParts";
// GSAP declares package imports, but this regression uses the storefront's installed JS.
// @ts-expect-error The relative entry has no declaration module.
import { SplitText } from "../../../estabrek-storefront/node_modules/gsap/SplitText";
afterEach(() => { document.body.innerHTML = ""; });
test("structural paths use bounded tag/type positions and cannot inject selectors", () => {
  document.body.innerHTML = '<div id="owner"><div><p>First</p><button><span>Buy</span></button><p>Second</p></div></div>';
  const owner = document.querySelector("#owner")!, text = document.querySelector("span")!;
  const path = domPartPath(text, owner)!;
  expect(path).toBe("~div.1.button.1.span.1");
  expect(owner.querySelector(domPartSelector(path)!)).toBe(text);
  for (const bad of ["~div.0", "~div.1000", "~div.1,body", "~div.1:hover", "~svg.1.path.1;display:none", "~div.1".repeat(17)]) expect(domPartSelector(bad)).toBeNull();
});
test("nested parts retain their hierarchy and repeated card names use one shared style target", () => {
  document.body.innerHTML = '<div data-tree-node="shop"><div><article data-cms-part="card"><h3 data-cms-part="card-name">First</h3><button data-cms-part="card-add"><span>Buy</span></button></article><article data-cms-part="card"><h3 data-cms-part="card-name">Second</h3></article></div></div>';
  const owner = document.querySelector("[data-tree-node]")!;
  const parts = collectSelectionParts([{ key: "n:shop", el: owner }]);
  const titles = parts.filter(p => p.target === "@card-name");
  expect(titles).toHaveLength(2); expect(titles[0].count).toBe(2);
  expect(titles[0].key).not.toBe(titles[1].key);
  const card = parts.find(p => p.target === "@card")!;
  expect(titles[0].within).toBe(`d:${card.key}`);
  expect(titles[0].kind).toBe("text");
  expect(parts.find(p => p.target === "@card-add")?.kind).toBe("button");
  expect(partId("n:shop", titles[0].key)).toContain("detail:n:shop:");
});
test("native child owners and atomic primitives stop collection at their boundaries", () => {
  document.body.innerHTML = '<div id="section"><div id="shop"><div><h3>Item</h3></div></div><div id="svg"><svg><path d="M0 0"/></svg></div></div>';
  const owners = [{ key: "n:section", el: document.querySelector("#section")!, atomic: true }, { key: "n:shop", el: document.querySelector("#shop")! }, { key: "n:svg", el: document.querySelector("#svg")!, atomic: true }];
  const parts = collectSelectionParts(owners);
  expect(parts.length).toBeGreaterThan(1);
  expect(parts.every(p => p.owner === "n:shop")).toBe(true);
  expect(new Set(parts.map(p => partId(p.owner, p.key))).size).toBe(parts.length);
});
test("a complex native owner cannot claim the root of a nested native object", () => {
  document.body.innerHTML = '<div id="outer"><div id="child"><h2>Native text</h2></div><p>Outer text</p></div>';
  const outer = document.querySelector("#outer")!, child = document.querySelector("#child")!;
  const parts = collectSelectionParts([{ key: "n:popup", el: outer }, { key: "n:heading", el: child, atomic: true }]);
  expect(parts.some(part => part.el === child || child.contains(part.el))).toBe(false);
  expect(parts.find(part => part.label === "Outer text")).toBeDefined();
});
test("a writable legacy text or button keeps ownership of its formatted descendants", () => {
  document.body.innerHTML = '<section id="owner"><a id="button"><span><strong>Editable label</strong></span></a><h2 id="heading"><em>Editable title</em></h2><p>Other text</p></section>';
  const owner = document.querySelector("#owner")!, button = document.querySelector("#button")!, heading = document.querySelector("#heading")!;
  const seeds = new Map([[button, "f:primaryButton.label"], [heading, "f:title"]]);
  const parts = collectSelectionParts([{ key: "s:old", el: owner }], seeds);
  expect(parts.some(p => button.contains(p.el) || heading.contains(p.el))).toBe(false);
  expect(parts.find(p => p.label === "Other text")).toBeDefined();
});
test("renderer source identities survive selection and keep formatted words as one editable object", () => {
  document.body.innerHTML = '<div id="owner"><p data-pt-field="items.2.label"><strong>Same words</strong></p><p>Same words</p></div>';
  const parts = collectSelectionParts([{ key: "n:widget", el: document.querySelector("#owner")! }]);
  expect(parts.find(p => p.propPath === "items.2.label")).toMatchObject({ text: "Same words" });
  expect(parts.some(p => p.el.localName === "strong")).toBe(false);
  expect(parts.find(p => p.key === "~p.2")?.propPath).toBeUndefined();
});
test("hidden helpers, animation text fragments and hidden inputs are excluded", () => {
  document.body.innerHTML = '<div id="widget"><div hidden><button>Hidden</button></div><input type="hidden"/><style></style><span class="pt-fx">effect</span><p>Visible</p></div>';
  const parts = collectSelectionParts([{ key: "n:widget", el: document.querySelector("#widget")! }]);
  expect(parts.some(p => p.label === "Visible")).toBe(true);
  expect(parts.some(p => p.label === "Hidden" || p.label === "effect")).toBe(false);
});
test("parts hidden by saved editor styles remain available for editing in the layers", () => {
  document.body.innerHTML = '<div id="widget"><p data-cms-part="title" style="display:none">Hidden title</p></div>';
  const parts = collectSelectionParts([{ key: "n:widget", el: document.querySelector("#widget")!, retained: new Set(["@title"]) }], new Map(), () => false);
  expect(parts.find(p => p.target === "@title")?.label).toBe("Hidden title");
});
test("native semantic style selectors do not leak into a nested native widget", () => {
  document.body.innerHTML = '<div data-tree-node="outer"><h3 data-cms-part="title">Outer</h3><div data-tree-node="inner"><h3 data-cms-part="title">Inner</h3></div></div>';
  const matches = document.querySelectorAll(targetSelector("n:outer/@title")!);
  expect([...matches].map(el => el.textContent)).toEqual(["Outer"]);
});
test("generated motion fragments never replace their selectable text host", () => {
  document.body.innerHTML = '<div id="widget"><blockquote>Hello world</blockquote><p><span class="th-word"><span class="th-char">A</span></span></p><svg aria-hidden="true"></svg></div>';
  const quote = document.querySelector("blockquote")!;
  const split = SplitText.create(quote, { type: "lines,words", mask: "lines", linesClass: "pt-split-piece", wordsClass: "pt-split-piece", aria: "auto" });
  const parts = collectSelectionParts([{ key: "n:widget", el: document.querySelector("#widget")! }]);
  expect(parts.some(p => p.el === quote)).toBe(true);
  expect(parts.filter(p => quote.contains(p.el))).toEqual([expect.objectContaining({ el: quote })]);
  expect(parts.some(p => p.el.closest(".th-word"))).toBe(false);
  expect(parts.some(p => p.el.localName === "svg")).toBe(true);
  split.revert();
});
