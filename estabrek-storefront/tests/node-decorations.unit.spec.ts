import { expect, test } from "@playwright/test";
import { act, createElement, Fragment, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createRequire } from "node:module";
import { withDecoration } from "../src/pageTree/NodeDecorations";

const require = createRequire(import.meta.url);
test("adding and removing a container decoration preserves its nested client state and DOM", async () => {
  const { JSDOM } = require("../../estabrek-admin/node_modules/jsdom");
  const dom = new JSDOM('<div id="root"></div>');
  const saved = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const root = createRoot(dom.window.document.getElementById("root")!);
  let mounts = 0;
  function Child() { useEffect(() => { mounts++; }, []); return createElement("input", { defaultValue: "Initial" }); }
  const render = (on: boolean) => withDecoration(createElement("div", null, createElement(Fragment, null, [createElement(Child, { key: "nested" })], null)), on ? [createElement("span", { key: "edge" }, "Decoration")] : []);
  try {
    await act(async () => { root.render(render(false)); });
    const input = dom.window.document.querySelector("input")!; input.value = "Keep this edit";
    await act(async () => { root.render(render(true)); });
    expect(dom.window.document.querySelector("input")).toBe(input);
    expect(input.value).toBe("Keep this edit");
    await act(async () => { root.render(render(false)); });
    expect(dom.window.document.querySelector("input")).toBe(input);
    expect(mounts).toBe(1);
  } finally {
    await act(async () => root.unmount()); dom.window.close();
    for (const [key, value] of saved) { if (value) Object.defineProperty(globalThis, key, value); else Reflect.deleteProperty(globalThis, key); }
  }
});
