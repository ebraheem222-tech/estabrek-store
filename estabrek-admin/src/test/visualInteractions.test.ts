import { afterEach, expect, test, vi } from "vitest";
import { mountVisualInteractions, emitVisualInteraction, markVisualOrigin } from "../../../estabrek-storefront/src/lib/visualInteractions";
let dispose: (() => void) | undefined;
afterEach(() => { dispose?.(); document.body.innerHTML = ""; vi.restoreAllMocks(); });
test("nearest per-event override wins; explicit disable and auto picks perform no action", () => {
  document.body.innerHTML = '<div data-cms-interaction-page><div data-tree-node="shop"><button>pick</button></div></div>';
  const source = document.querySelector("button")!;
  const node = source.parentElement!;
  node.setAttribute("data-interactions", JSON.stringify({ version: 1, bindings: { colorChange: [] } }));
  const palette = vi.fn(() => ({ "--accent": "#123456" }));
  dispose = mountVisualInteractions(document, { version: 1, bindings: { colorChange: [{ type: "theme", color: "event" }] } }, palette);
  expect(emitVisualInteraction("colorChange", { source, color: "#123456" })).toBe(true);
  expect(palette).not.toHaveBeenCalled();
  node.removeAttribute("data-interactions");
  emitVisualInteraction("colorChange", { source, color: "#123456", auto: true });
  expect(palette).not.toHaveBeenCalled();
});
test("theme reset and navigation restore inline values and priorities on custom theme roots", () => {
  document.body.innerHTML = '<div class="cinematic-shell" style="--accent:#111111!important"><div data-cms-interaction-page><div data-page-store-theme="custom" style="--accent:#222222"><button>add</button></div></div></div>';
  const root = document.querySelector<HTMLElement>("[data-page-store-theme]")!, shell = document.querySelector<HTMLElement>(".cinematic-shell")!;
  const source = document.querySelector("button")!;
  dispose = mountVisualInteractions(document, { version: 1, bindings: { cartClick: [{ type: "theme", color: "#333333" }], cartAdded: [{ type: "themeReset" }] } }, color => ({ "--accent": color }));
  emitVisualInteraction("cartClick", { source }); expect(root.style.getPropertyValue("--accent")).toBe("#333333");
  expect(document.documentElement.hasAttribute("data-visual-theme")).toBe(true);
  expect(shell.style.getPropertyValue("--accent")).toBe("#333333");
  emitVisualInteraction("cartAdded", { source }); expect(root.style.getPropertyValue("--accent")).toBe("#222222");
  expect(document.documentElement.hasAttribute("data-visual-theme")).toBe(false);
  expect(shell.style.getPropertyPriority("--accent")).toBe("important");
  emitVisualInteraction("cartClick", { source }); dispose(); expect(root.style.getPropertyValue("--accent")).toBe("#222222");
});
test("portal origin retains node actions; detached origins cannot affect a new page", () => {
  document.body.innerHTML = '<div data-cms-interaction-page><div data-tree-node="card"><button>open</button></div><h2 data-tree-node="target">Title</h2></div><div id="portal"><button>Add</button></div>';
  const source = document.querySelector("[data-tree-node=card]")!, target = document.querySelector<HTMLElement>("h2")!;
  source.setAttribute("data-interactions", JSON.stringify({ version: 1, bindings: { cartAdded: [{ type: "visibility", target: "target", value: "hide" }] } }));
  dispose = mountVisualInteractions(document, undefined, () => ({}));
  emitVisualInteraction("cartAdded", { source }); expect(target.hidden).toBe(true);
  dispose(); expect(target.hidden).toBe(false);
  source.remove(); emitVisualInteraction("cartAdded", { source }); expect(target.hidden).toBe(false);
});
test("visibility works on elements with author display rules and restores their inline display", () => {
  document.body.innerHTML = '<style>h2{display:flex}</style><div data-cms-interaction-page><button>Toggle</button><h2 data-tree-node="title" style="display:flex!important">Title</h2></div>';
  const source = document.querySelector("button")!, title = document.querySelector<HTMLElement>("h2")!;
  dispose = mountVisualInteractions(document, { version: 1, bindings: { click: [{ type: "visibility", target: "title", value: "toggle" }] } }, () => ({}));
  emitVisualInteraction("click", { source }); expect(getComputedStyle(title).display).toBe("none");
  emitVisualInteraction("click", { source }); expect(getComputedStyle(title).display).toBe("flex");
  dispose(); expect(title.style.getPropertyPriority("display")).toBe("important");
});
test("automatic native clicks in portals use the originating element policy", () => {
  document.body.innerHTML = '<div data-cms-interaction-page><div data-tree-node="origin"></div></div><div id="portal"><button>Close</button></div>';
  const origin = document.querySelector("[data-tree-node=origin]")!, portal = document.querySelector("#portal")!;
  origin.setAttribute("data-interactions", JSON.stringify({ version: 1, bindings: { click: [] } }));
  const palette = vi.fn(() => ({}));
  dispose = mountVisualInteractions(document, { version: 1, bindings: { click: [{ type: "theme", color: "#123456" }] } }, palette);
  markVisualOrigin(portal, origin);
  document.querySelector<HTMLButtonElement>("button")!.click(); expect(palette).not.toHaveBeenCalled();
});
test("an automatic colour initialized without focus still respects the page override", () => {
  document.body.innerHTML = '<div data-cms-interaction-page></div>';
  document.querySelector("div")!.setAttribute("data-interactions", JSON.stringify({ version: 1, bindings: { colorChange: [] } }));
  dispose = mountVisualInteractions(document, undefined, () => ({}));
  expect(emitVisualInteraction("colorChange", { source: document.body, auto: true, color: "#123456" })).toBe(true);
});
