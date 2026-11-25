import { describe, expect, test } from "vitest";
import { GL_BGS, GL_CLICK, GL_COLOURING, GL_FLOWS, GL_FONTS, GL_FORMS, GL_MORPH_BY, GL_POINTER, GL_SCROLL, GL_SPRITES, checkTree } from "../lib/pageTree.js";
import * as shop from "../../../estabrek-storefront/src/pageTree/glScene";
import { GL_PRESETS, randomScene } from "../../../estabrek-admin/src/studio/glPresets";

// The WebGL scene the owner builds in the editor (the shop's pageTree/glScene.ts): the element and a section's background.
const page = (children: unknown[]) => ({ version: 1, root: { id: "page", type: "page", children } });
const scene = (gl: Record<string, unknown>, more: Record<string, unknown> = {}) => page([{ id: "s", type: "section", props: {}, children: [{ id: "gl", type: "glScene", props: { gl, ...more } }] }]);
const layer = (more: Record<string, unknown> = {}) => ({ shapes: ["sphere"], count: 3000, ...more });

describe("a built WebGL scene", () => {
  test("names the same forms, flows, sprites and choices as the shop", () => {
    expect([...GL_FORMS]).toEqual([...shop.GL_FORMS]);
    expect([...GL_FLOWS]).toEqual([...shop.GL_FLOWS]);
    expect([...GL_SPRITES]).toEqual([...shop.GL_SPRITES]);
    expect([...GL_COLOURING]).toEqual([...shop.GL_COLOURING]);
    expect([...GL_FONTS]).toEqual([...shop.GL_FONTS]);
    expect([...GL_BGS]).toEqual([...shop.GL_BGS]);
    expect([...GL_POINTER]).toEqual([...shop.GL_POINTER]);
    expect([...GL_CLICK]).toEqual([...shop.GL_CLICK]);
    expect([...GL_SCROLL]).toEqual([...shop.GL_SCROLL]);
    expect([...GL_MORPH_BY]).toEqual([...shop.GL_MORPH_BY]);
  });

  test("keeps a whole scene: words in dots that morph, a flow, a shader under them, the camera, pointer and finish", () => {
    const props = {
      bg: { kind: "shader", shader: "aurora", c1: "#05050b", c2: "accent", speed: 0.5, rainbow: false },
      layers: [
        layer({ shapes: ["text", "sphere", "heart"], text: { en: "HELLO", ar: "أهلا" }, font: "display", weight: 900, colouring: "three", c1: "#ffffff", c2: "accent", c3: "$brand", size: 2.5, vary: 0.4, sprite: "soft", glow: true, opacity: 0.9, scale: 1.2, x: -0.2, y: 0.1, depth: 0.5, speed: 1.5, wander: 0.2, wave: 0.1, twinkle: 0.3, pulse: 0.2, spin: -0.4, links: 0 }),
        layer({ shapes: ["rain"], count: 900, sprite: "glyph", glyphs: "01アイウ", colouring: "one", c1: "#22c55e" }),
        layer({ shapes: ["image"], image: "https://res.cloudinary.com/demo/image/upload/logo.png", colouring: "picture" }),
      ],
      camera: { spin: 0.3, tilt: 40, zoom: 1.2, depth: 0.6, drag: true },
      pointer: { mode: "swirl", radius: 0.3, strength: 2 },
      click: "next", scroll: "scatter",
      morph: { by: "scroll", hold: 2, time: 1.2 },
      trails: 0.8, grain: 0.1, vignette: 0.5, veil: 0.2,
    };
    const more = { height: 560, label: { en: "Our name in light" } };
    const got = checkTree(scene(props, more));
    expect(got.ok).toBe(true);
    if (got.ok) expect(got.tree.root.children![0].children![0].props).toEqual({ gl: props, ...more });
    // A section's background takes the same scene.
    const bg = page([{ id: "s", type: "section", props: { gl: { bg: { kind: "radial" }, layers: [layer({ shapes: ["fireflies"] })] } }, children: [] }]);
    const kept = checkTree(bg);
    expect(kept.ok).toBe(true);
    if (kept.ok) expect(kept.tree.root.children![0].props!.gl).toEqual({ bg: { kind: "radial" }, layers: [layer({ shapes: ["fireflies"] })] });
  });

  test("the editor's ready designs and its surprises are all saved as they are", () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const all = [...GL_PRESETS.map((p) => [p.id, p.gl] as const), ...Array.from({ length: 30 }, (_, i) => [`random-${i}`, randomScene(rand)] as const)];
    for (const [id, gl] of all) {
      const got = checkTree(scene(gl as Record<string, unknown>, { height: 480 }));
      expect(got.ok, `${id}: ${JSON.stringify(got.ok ? "" : got.issues)}`).toBe(true);
      if (got.ok) expect(got.tree.root.children![0].children![0].props!.gl, id).toEqual(gl);
    }
  });

  test("refuses what the shop can't draw or shouldn't", () => {
    for (const bad of [
      { layers: [layer({ shapes: ["rain", "sphere"] })] },
      { layers: [layer({ shapes: [] })] },
      { layers: [layer({ shapes: ["cube", "cube", "cube", "cube", "cube"] })] },
      { layers: [layer({ shapes: ["teapot"] })] },
      { layers: [layer({ count: 30001 })] },
      { layers: [layer({ count: 20000 }), layer({ count: 20000 }), layer({ count: 20000 }), layer({ count: 1000 })] },
      { layers: [layer(), layer(), layer(), layer(), layer()] },
      { layers: [layer({ sprite: "skull" })] },
      { layers: [layer({ image: "javascript:alert(1)" })] },
      { layers: [layer({ c1: "red;display:none" })] },
      { layers: [layer({ glyphs: "<script>" })] },
      { layers: [layer({ size: 0 })] },
      { layers: [layer({ x: 2 })] },
      { layers: [layer({ unknown: 1 })] },
      { bg: { kind: "shader", shader: "cloth" } },
      { bg: { kind: "video" } },
      { camera: { tilt: 90 } },
      { pointer: { mode: "explode" } },
      { click: "launch" },
      { morph: { by: "time" } },
      { trails: 1 },
    ]) expect(checkTree(scene(bad)).ok, JSON.stringify(bad)).toBe(false);
    expect(checkTree(scene({}, { height: 100 })).ok).toBe(false);
    expect(checkTree(page([{ id: "gl", type: "glScene", props: {} }])).ok).toBe(false);
  });
});

describe("the shop reads a scene", () => {
  test("bounded: a flow alone, four forms, 60,000 particles in all, words in the page's language", () => {
    const spec = shop.glSceneOf({
      layers: [
        { shapes: ["rain", "sphere"], count: 40000 },
        { shapes: ["sphere", "cube", "torus", "knot", "helix", "rain"], count: 30000, text: { en: "Hi", ar: "مرحبا" } },
        { shapes: ["galaxy"], count: 30000 },
      ],
    }, (t) => (t && typeof t === "object" ? String((t as Record<string, string>).ar ?? "") : ""));
    expect(spec).not.toBeNull();
    expect(spec!.layers.map((l) => l.shapes)).toEqual([["rain"], ["sphere", "cube", "torus", "knot"]]);
    expect(spec!.layers.map((l) => l.count)).toEqual([30000, 30000]);
    expect(spec!.layers[1].text).toBe("مرحبا");
    expect(shop.glSceneOf({})).toBeNull();
    expect(shop.glSceneOf({ bg: { kind: "none" }, layers: [] })).toBeNull();
    expect(shop.glHeightOf(5000)).toBe(1400);
  });
});
