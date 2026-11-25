import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PageDraft, PageDraftOp, PageTreeNode } from "../api/pages.api";
import { glSceneOf } from "../../../estabrek-storefront/src/pageTree/glScene";
import { GlScenePanel } from "./GlScenePanel";
import { GL_PRESETS, randomScene } from "./glPresets";
import { newElement } from "./columns";
import { simulate } from "./draft";
import { elementTools } from "./elementTools";

// «ابنِ مشهد WebGL»: the builder of a WebGL scene (the element, and a section's background).
afterEach(cleanup);
function Editor({ node, mode }: { node: PageTreeNode; mode: "element" | "bg" }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { enabled: false } } }));
  const [state, setState] = useState<PageDraft>({ version: 1, rev: 1, baseHash: "x", sections: [], trash: [], startedAt: "", updatedAt: "", tree: { version: 1, root: { id: "page", type: "page", props: {}, children: mode === "bg" ? [node] : [{ id: "section", type: "section", props: {}, children: [node] }] } } });
  const shown = mode === "bg" ? state.tree.root.children![0] : state.tree.root.children![0].children![0];
  return <QueryClientProvider client={client}><GlScenePanel node={shown} mode={mode} lang="en" busy={false} onOps={(_, ops: PageDraftOp[]) => setState(ops.reduce(simulate, state))} /><output data-testid="props">{JSON.stringify(shown.props)}</output></QueryClientProvider>;
}
const props = () => JSON.parse(screen.getByTestId("props").textContent!);
const gl = () => props().gl;
const ids = () => { let n = 0; return (p: string) => `${p}-${++n}`; };
const pick = (group: string, value: string) => fireEvent.click(screen.getByTestId(group).querySelector(`[data-value="${value}"]`)!);
const slide = (id: string, value: number) => { fireEvent.change(screen.getByTestId(id), { target: { value: String(value) } }); fireEvent.pointerUp(screen.getByTestId(id)); };
const shape = (s: string) => fireEvent.click(screen.getAllByTestId("studio-gl-shape").find((b) => b.getAttribute("data-shape") === s)!);
const read = (g: unknown) => glSceneOf(g, (t) => (t && typeof t === "object" ? String((t as Record<string, string>).en ?? "") : ""));

describe("a WebGL scene in the editor", () => {
  it("a new one is a whole scene the shop draws, and its tool takes the owner to the builder", () => {
    const node = newElement("glScene", "en", ids()) as PageTreeNode;
    expect(node.props).toMatchObject({ height: 480 });
    const spec = read(node.props!.gl);
    expect(spec?.layers[0]).toMatchObject({ shapes: ["text"], text: "WELCOME" });
    expect(elementTools(node).find((t) => t.id === "gl-build")?.go).toEqual({ kind: "group", group: "content", card: "studio-gl" });
    expect(elementTools({ id: "s", type: "section", props: {}, children: [] }).find((t) => t.id === "gl-bg")?.go).toEqual({ kind: "group", group: "decor", card: "studio-gl" });
  });

  it("every ready design and every surprise is a scene the shop draws", () => {
    expect(GL_PRESETS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(GL_PRESETS.map((p) => p.id)).size).toBe(GL_PRESETS.length);
    for (const p of GL_PRESETS) {
      const spec = read(p.gl);
      expect(spec, p.id).not.toBeNull();
      expect(spec!.layers.length, p.id).toBeGreaterThan(0);
      expect(p.name.split("|"), p.id).toHaveLength(3);
    }
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 40; i++) expect(read(randomScene(rand))?.layers.length).toBeGreaterThan(0);
  });

  it("a ready design, a form that morphs into the owner's words, a flow, how many, the background, the pointer and the scroll", () => {
    render(<Editor node={newElement("glScene", "en", ids()) as PageTreeNode} mode="element" />);
    fireEvent.click(screen.getAllByTestId("studio-gl-preset").find((b) => b.getAttribute("data-preset") === "galaxy")!);
    expect(gl().layers[0].shapes).toEqual(["galaxy"]);
    expect(props().height).toBe(480);
    // A form, then another it morphs into: the owner's words, written in the language shown.
    shape("heart");
    expect(gl().layers[0].shapes).toEqual(["heart"]);
    fireEvent.change(screen.getByTestId("studio-gl-morph-add"), { target: { value: "text" } });
    expect(gl().layers[0].shapes).toEqual(["heart", "text"]);
    const words = screen.getByTestId("studio-gl-text");
    fireEvent.change(words, { target: { value: "Hi there" } });
    fireEvent.blur(words);
    expect(gl().layers[0].text).toEqual({ en: "Hi there" });
    pick("studio-gl-morph-by", "scroll");
    expect(gl().morph.by).toBe("scroll");
    // A flow moves alone: the morph's settings go.
    shape("rain");
    expect(gl().layers[0].shapes).toEqual(["rain"]);
    expect(screen.queryByTestId("studio-gl-morph")).toBeNull();
    slide("studio-gl-count", 9000);
    expect(gl().layers[0].count).toBe(9000);
    pick("studio-gl-sprite", "glyph");
    expect(gl().layers[0].sprite).toBe("glyph");
    expect(screen.getByTestId("studio-gl-glyphs")).toBeTruthy();
    // The background: one of the library's shaders.
    pick("studio-gl-bg-kind", "shader");
    expect(gl().bg).toMatchObject({ kind: "shader", shader: "aurora" });
    fireEvent.click(screen.getAllByTestId("studio-gl-shader").find((b) => b.getAttribute("data-kind") === "ink")!);
    expect(gl().bg.shader).toBe("ink");
    pick("studio-gl-pointer", "swirl");
    pick("studio-gl-click", "shock");
    pick("studio-gl-scroll", "scatter");
    expect(gl()).toMatchObject({ pointer: { mode: "swirl" }, click: "shock", scroll: "scatter" });
    slide("studio-gl-cam-tilt", 40);
    expect(gl().camera.tilt).toBe(40);
    // The galaxy turns by hand: unticked, it doesn't.
    expect(gl().camera.drag).toBe(true);
    fireEvent.click(screen.getByTestId("studio-gl-cam-drag"));
    expect(gl().camera).not.toHaveProperty("drag");
    slide("studio-gl-trails", 0.6);
    expect(gl().trails).toBe(0.6);
    slide("studio-gl-height", 640);
    expect(props().height).toBe(640);
    // Layers: one more, then taken away.
    fireEvent.click(screen.getByTestId("studio-gl-add-layer"));
    expect(gl().layers).toHaveLength(2);
    fireEvent.click(screen.getByTestId("studio-gl-remove-layer"));
    expect(gl().layers).toHaveLength(1);
    expect(read(gl())).not.toBeNull();
  });

  it("a section's background: started from a design, and taken away again", () => {
    render(<Editor node={{ id: "s", type: "section", props: { contained: true }, children: [] }} mode="bg" />);
    expect(screen.getByTestId("studio-gl").getAttribute("data-mode")).toBe("bg");
    fireEvent.click(screen.getByTestId("studio-gl-open"));
    fireEvent.click(screen.getAllByTestId("studio-gl-preset").find((b) => b.getAttribute("data-preset") === "snow")!);
    expect(gl().layers[0].shapes).toEqual(["snow"]);
    expect(props()).toMatchObject({ contained: true });
    expect(props()).not.toHaveProperty("height");
    slide("studio-gl-veil", 0.4);
    expect(gl().veil).toBe(0.4);
    fireEvent.click(screen.getByTestId("studio-gl-remove"));
    expect(props()).not.toHaveProperty("gl");
  });
});
