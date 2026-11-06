import { expect, test } from "@playwright/test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { createRequire } from "node:module";
import { geometryPreviewCss } from "../src/pageTree/geometryPreview";
import { measureStudio, STUDIO_SOURCE, StudioBridge } from "../src/pageTree/StudioBridge";

const require = createRequire(import.meta.url);

const preview = (base: Record<string, unknown>, id = "card", type = "stack") => ({ id, type, style: { base } });

test("geometry previews keep dimensions, layer placement and the complete transform", () => {
  const css = geometryPreviewCss([preview({
    width: "240px", height: "120px", minHeight: "100px", maxWidth: "80%",
    layer: { x: 20, y: 30, anchor: "top-start" }, moveX: -8, moveY: 12,
    rotateX: 5, rotateY: -10, rotateZ: 45, scale: 1.2, perspective: 900, origin: "top",
  })]);
  expect(css).toContain(".pt-card{");
  for (const declaration of ["width:240px", "height:120px", "min-height:100px", "max-width:80%", "position:absolute", "inset-inline-start:20%", "top:30%", "--pt-x:-8px", "--pt-y:12px", "--pt-rx:5deg", "--pt-ry:-10deg", "--pt-rz:45deg", "--pt-s:1.2", "--pt-p:900px", "transform-origin:50% 0%", "transform:translate(", "perspective(var(--pt-p"]) expect(css).toContain(declaration);
});

test("geometry previews ignore unrelated style, responsive, motion and node fields", () => {
  const css = geometryPreviewCss([{
    ...preview({ width: "240px", color: "#ff0000", bg: "#00ff00", gap: 80, hidden: true, opacity: 0, transition: { duration: 3 } }),
    props: { aspect: "16/9", size: 20 }, motion: { enter: { kind: "fade" } },
    style: { base: { width: "240px", color: "#ff0000", bg: "#00ff00", gap: 80, hidden: true, opacity: 0, transition: { duration: 3 } }, mobile: { width: "10px" } },
  }]);
  expect(css).toBe(".pt-card{width:240px}");
});

test("unsafe identifiers and CSS values never become selector or declaration injection", () => {
  const css = geometryPreviewCss([
    preview({ width: "10px}body{color:red", height: "url(https://evil.test)", rotateZ: "1;display:none", scale: Infinity, layer: { x: "0;display:none", y: 20 }, origin: "top;display:none" }),
    preview({ width: "20px" }, "card}body"),
    preview({ width: "20px" }, "x".repeat(41)),
    preview({ width: "20px" }, "safe", "stack;display:none"),
  ]);
  expect(css).not.toMatch(/evil|display|body|Infinity|url\(/);
  expect(css).not.toContain("20px");
});

test("malformed messages, invalid node shapes and oversized lists are ignored", () => {
  for (const input of [null, undefined, true, "style", {}, { nodes: [] }, 1, [null, false, {}, { id: "card", type: "stack" }, { id: "card", type: 3, style: { base: { width: "20px" } } }], Array.from({ length: 2001 }, () => preview({ width: "20px" }))]) expect(geometryPreviewCss(input)).toBe("");
});

test("previewing columns geometry preserves its original structural layout rules", () => {
  const css = geometryPreviewCss([preview({ width: "300px" }, "cols", "columns")]);
  expect(css).toBe(".pt-cols{width:300px}");
});

async function frame(run: (dom: any) => Promise<void> | void) {
  const { JSDOM } = require("../../estabrek-admin/node_modules/jsdom");
  const dom = new JSDOM('<!doctype html><style id="original">.pt-card{width:100px;color:red}</style><div id="mount"></div><div data-tree-node="card" class="pt pt-stack pt-card"></div>');
  Object.defineProperty(dom.window, "parent", { configurable: true, value: { postMessage() {} } });
  const globals: Record<string, unknown> = {
    window: dom.window, document: dom.window.document,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    CSS: { escape: (id: string) => id },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    ResizeObserver: class { observe() {} disconnect() {} },
    MutationObserver: dom.window.MutationObserver,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const previous = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
  const root = createRoot(dom.window.document.querySelector("#mount"));
  let previewRemoved = false;
  try {
    await act(async () => root.render(createElement(StudioBridge, { origins: ["https://admin.test"], pageId: "home", lang: "en" })));
    await run(dom);
  } finally {
    await act(async () => root.unmount());
    previewRemoved = dom.window.document.getElementById("pt-geometry-preview") === null;
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    dom.window.close();
  }
  return previewRemoved;
}

const postGeometry = (dom: any, nodes: unknown, origin = "https://admin.test", source = STUDIO_SOURCE) => dom.window.dispatchEvent(new dom.window.MessageEvent("message", { origin, data: { source, type: "previewGeometry", nodes } }));

test("trusted geometry messages style existing nodes without replacing their classes and null clears", async () => {
  await frame((dom) => {
    postGeometry(dom, [preview({ width: "240px", color: "blue" }), preview({ width: "999px" }, "missing")]);
    const style = dom.window.document.getElementById("pt-geometry-preview");
    expect(style?.textContent).toBe(".pt-card{width:240px}");
    expect(style?.previousElementSibling?.hasAttribute("data-tree-node")).toBe(true);
    expect(dom.window.document.querySelector('[data-tree-node="card"]').className).toBe("pt pt-stack pt-card");
    expect(dom.window.document.getElementById("original").textContent).toContain("color:red");
    postGeometry(dom, null);
    expect(dom.window.document.getElementById("pt-geometry-preview")).toBeNull();
  });
});

test("geometry messages retain origin and studio-source checks, and unmount releases preview CSS", async () => {
  const previewRemoved = await frame((dom) => {
    postGeometry(dom, [preview({ width: "240px" })], "https://untrusted.test");
    postGeometry(dom, [preview({ width: "240px" })], "https://admin.test", "other-source");
    expect(dom.window.document.getElementById("pt-geometry-preview")).toBeNull();
    postGeometry(dom, [preview({ width: "240px" })]);
    expect(dom.window.document.getElementById("pt-geometry-preview")).not.toBeNull();
  });
  expect(previewRemoved).toBe(true);
});

test("container measurements use padding boxes for holders and inner placement under axis scaling", async () => {
  await frame((dom) => {
    const holder = dom.window.document.querySelector('[data-tree-node="card"]');
    holder.innerHTML = '<div data-tree-node="child" class="pt pt-text pt-child" style="position:absolute"></div>';
    const child = holder.firstElementChild;
    holder.getBoundingClientRect = () => ({ left: 10, top: 20, width: 440, height: 240 });
    child.getBoundingClientRect = () => ({ left: 50, top: 60, width: 80, height: 40 });
    for (const [key, value] of Object.entries({ offsetWidth: 220, offsetHeight: 120, clientWidth: 200, clientHeight: 100, clientLeft: 10, clientTop: 10 })) Object.defineProperty(holder, key, { value });
    Object.defineProperty(child, "offsetParent", { value: holder });
    Object.defineProperty(child, "offsetWidth", { value: 40 });
    Object.defineProperty(child, "offsetHeight", { value: 20 });
    const items = measureStudio();
    expect(items.find((item) => item.kind === "node" && item.id === "card")).toMatchObject({ rect: { x: 10, y: 20, w: 440, h: 240 }, inner: { x: 30, y: 40, w: 400, h: 200 } });
    expect(items.find((item) => item.kind === "node" && item.id === "child")).toMatchObject({ size: { w: 40, h: 20 }, holder: { x: 30, y: 40, w: 400, h: 200 } });
  });
});

test("native section, grid, cell and popup containers expose their padding placement boxes", async () => {
  await frame((dom) => {
    const holder = dom.window.document.querySelector('[data-tree-node="card"]');
    holder.getBoundingClientRect = () => ({ left: 10, top: 20, width: 220, height: 120 });
    for (const [key, value] of Object.entries({ offsetWidth: 220, offsetHeight: 120, clientWidth: 200, clientHeight: 100, clientLeft: 10, clientTop: 10 })) Object.defineProperty(holder, key, { value });
    for (const type of ["section", "grid", "cell", "popup"]) {
      holder.className = `pt pt-${type} pt-card`;
      expect(measureStudio().find((item) => item.kind === "node" && item.id === "card")).toMatchObject({ inner: { x: 20, y: 30, w: 200, h: 100 } });
    }
  });
});

test("a contained section uses its direct inner padding box", async () => {
  await frame((dom) => {
    const section = dom.window.document.querySelector('[data-tree-node="card"]');
    section.className = "pt pt-section pt-card";
    section.innerHTML = '<div class="pt-inner"></div>';
    section.getBoundingClientRect = () => ({ left: 10, top: 20, width: 600, height: 400 });
    const inner = section.firstElementChild;
    inner.getBoundingClientRect = () => ({ left: 50, top: 80, width: 400, height: 200 });
    for (const [key, value] of Object.entries({ offsetWidth: 400, offsetHeight: 200, clientWidth: 380, clientHeight: 180, clientLeft: 10, clientTop: 10 })) Object.defineProperty(inner, key, { value });
    expect(measureStudio().find((item) => item.kind === "node" && item.id === "card")).toMatchObject({ rect: { x: 10, y: 20, w: 600, h: 400 }, inner: { x: 60, y: 90, w: 380, h: 180 } });
  });
});

test("geometry carries cumulative DOM ancestor scale and marks rotated holders explicitly", async () => {
  await frame((dom) => {
    const card = dom.window.document.querySelector('[data-tree-node="card"]');
    const wrapper = dom.window.document.createElement("div");
    card.replaceWith(wrapper);
    wrapper.appendChild(card);
    wrapper.style.transform = "matrix(1.25,0,0,1.25,12,20)";
    // The native transform includes perspective on Z even when its XY plane is flat.
    card.style.transform = "matrix3d(2,0,0,0,0,2,0,0,0,0,1,-0.000833,0,0,0,1)";
    card.innerHTML = '<div data-tree-node="child" class="pt pt-text pt-child"></div>';
    let items = measureStudio();
    expect(items.find(item => item.kind === "node" && item.id === "card")).toMatchObject({ parentScale: 1.25, innerScale: 2.5 });
    expect(items.find(item => item.kind === "node" && item.id === "child")).toMatchObject({ parentScale: 2.5 });
    card.style.transform = "matrix(0,1,-1,0,0,0)";
    items = measureStudio();
    expect(items.find(item => item.kind === "node" && item.id === "card")).toMatchObject({ parentScale: 1.25, innerScale: null });
    expect(items.find(item => item.kind === "node" && item.id === "child")).toMatchObject({ parentScale: null });
  });
});
