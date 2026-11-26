import { describe, expect, test } from "vitest";
import { LAYER_POPS, PHOTO3D_LOOKS, PHOTO3D_MOVES, checkTree } from "../lib/pageTree.js";
import { LAYER_POPS as SHOP_LAYER_POPS, layersOf } from "../../../estabrek-storefront/src/pageTree/pieces";
import { ProductDeepUpdateBody, SetImageDepthBody } from "../modules/admin/catalog.schemas.js";
import { CARD_HOVERS } from "../lib/visualControls.js";
import * as shared from "../../../shared/photo3d";
import { fitUv } from "../../../shared/pictureFx";
import { picturePoints } from "../../../estabrek-storefront/src/pageTree/glPicture";
import { rng } from "../../../estabrek-storefront/src/pageTree/glShapes";

// «صورة 3D» (shared/photo3d.ts): a picture lifted by its depth picture, and the server's check of its settings.
const page = (photo3d: unknown) => ({ version: 1, root: { id: "page", type: "page", children: [{ id: "s", type: "section", props: {}, children: [{ id: "pic", type: "image", props: { src: "https://res.cloudinary.com/x/pic.jpg", photo3d } }] }] } });
/** A depth picture: `f(x, y)` (0 … 1) as grey pixels. */
const grey = (w: number, h: number, f: (x: number, y: number) => number) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = Math.round(f(x / (w - 1), y / (h - 1)) * 255), k = (y * w + x) * 4; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255; }
  return d;
};
const flatUv = (x: number, y: number) => ({ u: x, v: y });

describe("a 3D picture's settings", () => {
  test("the same choices as the shop's, kept as written, refused when unsafe", () => {
    expect([...PHOTO3D_LOOKS]).toEqual([...shared.PHOTO3D_LOOKS]);
    expect([...PHOTO3D_MOVES]).toEqual([...shared.PHOTO3D_MOVES]);
    const all = { map: "https://res.cloudinary.com/x/pic-depth.png", look: "points", move: "scroll", depth: 0.8, turn: 0.3, light: 0.6 };
    const got = checkTree(page(all));
    expect(got.ok).toBe(true);
    if (got.ok) expect(got.tree.root.children![0].children![0].props!.photo3d).toEqual(all);
    for (const bad of [{}, { map: "javascript:alert(1)" }, { map: "/d.png", look: "cube" }, { map: "/d.png", move: "mouse" }, { map: "/d.png", depth: 2 }, { map: "/d.png", turn: 0 }, { map: "/d.png", light: -1 }, { map: "/d.png", other: 1 }]) {
      expect(checkTree(page(bad)).ok, JSON.stringify(bad)).toBe(false);
    }
    expect(shared.photo3dOf({ map: "/d.png" })).toEqual({ map: "/d.png", ...shared.PHOTO3D_DEFAULT });
    expect(shared.photo3dOf({ map: "data:image/png;base64,x" })).toBeNull();
  });
});

describe("the mesh lifted by depth", () => {
  test("a flat depth gives a flat picture, every triangle kept, normals facing out", () => {
    const g = shared.depthGrid(grey(32, 32, () => 0.5), 32, 32);
    const m = shared.photoMesh(g, 1.5, 0.6, flatUv, { cols: 40 });
    expect(m.cut).toBe(0);
    expect(m.index.length / 3).toBe(m.cols * m.rows * 2);
    for (let i = 0; i < m.pos.length / 3; i++) {
      expect(Math.abs(m.pos[i * 3 + 2])).toBeLessThan(1e-6);
      expect(m.normal[i * 3 + 2]).toBeCloseTo(1, 5);
    }
    // It covers the box: −aspect … aspect across, −1 … 1 up.
    expect(Math.min(...Array.from(m.pos).filter((_, i) => i % 3 === 0))).toBeCloseTo(-1.5);
    expect(Math.max(...Array.from(m.pos).filter((_, i) => i % 3 === 1))).toBeCloseTo(1);
  });

  test("a near square on a far ground: lifted forward, its edge marked as a jump, its triangles there counted", () => {
    const near = (x: number, y: number) => (x > 0.3 && x < 0.7 && y > 0.3 && y < 0.7 ? 1 : 0);
    const g = shared.depthGrid(grey(64, 64, near), 64, 64);
    const m = shared.photoMesh(g, 1, 0.6, flatUv, { cols: 60 });
    const at = (x: number, y: number) => Math.round(y * m.rows) * (m.cols + 1) + Math.round(x * m.cols);
    expect(m.pos[at(0.5, 0.5) * 3 + 2]).toBeGreaterThan(m.pos[at(0.1, 0.1) * 3 + 2] + 0.5);
    expect(m.cut).toBeGreaterThan(0);
    expect(m.jump[at(0.5, 0.5)]).toBe(0);
    expect(m.jump[at(0.3, 0.5)]).toBeGreaterThan(0.9);
    // A ramp leans its normals the way it rises.
    const ramp = shared.photoMesh(shared.depthGrid(grey(32, 32, (x) => x), 32, 32), 1, 0.6, flatUv, { cols: 20 });
    const mid = Math.round(ramp.rows / 2) * (ramp.cols + 1) + Math.round(ramp.cols / 2);
    expect(ramp.normal[mid * 3]).toBeLessThan(-0.1);
  });

  test("a picture cut by its box (object-fit cover) maps the box onto the part that shows", () => {
    const g = shared.depthGrid(grey(16, 16, () => 0.5), 16, 16);
    // A square picture in a box twice as wide: cover shows its middle half, top to bottom.
    const m = shared.photoMesh(g, 2, 0.5, (x, y) => fitUv(x, y, { w: 200, h: 100 }, { w: 100, h: 100 }, "cover"), { cols: 20 });
    const v = Array.from(m.uv).filter((_, i) => i % 2 === 1), u = Array.from(m.uv).filter((_, i) => i % 2 === 0);
    expect(Math.min(...v)).toBeCloseTo(0.25);
    expect(Math.max(...v)).toBeCloseTo(0.75);
    expect(Math.min(...u)).toBeCloseTo(0);
    expect(Math.max(...u)).toBeCloseTo(1);
    // Never more points than 16-bit triangles can reach.
    const big = shared.photoMesh(g, 0.25, 0.5, flatUv, { cols: 600 });
    expect((big.cols + 1) * (big.rows + 1)).toBeLessThanOrEqual(65535);
  });

  test("the quick depth: light comes forward, and a dark thing on a light ground is turned the right way", () => {
    const w = 40, h = 40;
    const lightOnDark = new Uint8ClampedArray(w * h * 4), darkOnLight = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const mid = Math.abs(x - 20) < 8 && Math.abs(y - 20) < 8, k = (y * w + x) * 4;
      lightOnDark.set(mid ? [240, 240, 240, 255] : [10, 10, 10, 255], k);
      darkOnLight.set(mid ? [10, 10, 10, 255] : [240, 240, 240, 255], k);
    }
    const centre = (d: Uint8ClampedArray) => d[(20 * w + 20) * 4], corner = (d: Uint8ClampedArray) => d[(2 * w + 2) * 4];
    const a = shared.lightDepth(lightOnDark, w, h), b = shared.lightDepth(darkOnLight, w, h);
    expect(centre(a)).toBeGreaterThan(corner(a) + 100);
    expect(centre(b)).toBeGreaterThan(corner(b) + 100);
  });
});

describe("a WebGL scene's picture with its real depth", () => {
  test("each dot takes the depth under it", () => {
    const w = 40, h = 40, px = new Uint8ClampedArray(w * h * 4).fill(200), depth = grey(w, h, (x) => x);
    for (let i = 3; i < px.length; i += 4) px[i] = 255;
    // A frame of black so the picture isn't one plain ground.
    for (let x = 0; x < w; x++) px.set([0, 0, 0, 255], x * 4);
    const d = picturePoints(px, w, h, 500, rng(3), "pixels", 1, 1, depth)!;
    expect(d.dep).toBeTruthy();
    for (let i = 0; i < 500; i++) {
      const x = d.pos[i * 3];
      // Left (far, 0) to right (near, 1), as the depth picture says.
      expect(Math.abs(d.dep![i] - (x / 1 + 0.5))).toBeLessThan(0.1);
    }
  });
});

describe("a product picture's depth picture (the 3D card and product page)", () => {
  test("an http(s) address or none; never a script, data or another kind of address", () => {
    expect(SetImageDepthBody.parse({ depthUrl: "https://res.cloudinary.com/x/a-depth.png" })).toEqual({ depthUrl: "https://res.cloudinary.com/x/a-depth.png" });
    expect(SetImageDepthBody.parse({ depthUrl: null })).toEqual({ depthUrl: null });
    for (const bad of ["javascript:alert(1)", "data:image/png;base64,AAAA", "ftp://x/y.png", "", "nothing"]) expect(SetImageDepthBody.safeParse({ depthUrl: bad }).success, bad).toBe(false);
    expect(SetImageDepthBody.safeParse({}).success).toBe(false);
    expect(SetImageDepthBody.safeParse({ depthUrl: null, other: 1 }).success).toBe(false);
  });
  test("a product's save may carry it with each picture, or leave it out (kept as it is)", () => {
    const items = (depthUrl?: unknown) => ({ items: [{ colorName: "Black", skuBase: "B", images: [{ url: "https://res.cloudinary.com/x/a.jpg", ...(depthUrl !== undefined ? { depthUrl } : {}) }] }] });
    expect(ProductDeepUpdateBody.parse(items("https://res.cloudinary.com/x/a-depth.png")).items![0].images![0].depthUrl).toBe("https://res.cloudinary.com/x/a-depth.png");
    expect(ProductDeepUpdateBody.parse(items()).items![0].images![0]).not.toHaveProperty("depthUrl");
    expect(ProductDeepUpdateBody.parse(items(null)).items![0].images![0].depthUrl).toBeNull();
    expect(ProductDeepUpdateBody.safeParse(items("javascript:alert(1)")).success).toBe(false);
  });
  test("the card's 3D hover is one of its kinds, here as in the shop", () => {
    expect(CARD_HOVERS).toContain("3d");
  });
});

describe("a picture's cut thing as its front layer («طلّع الغرض من الصورة»)", () => {
  const withLayers = (layers: unknown) => ({ version: 1, root: { id: "page", type: "page", children: [{ id: "s", type: "section", props: {}, children: [{ id: "pic", type: "image", props: { src: "https://res.cloudinary.com/x/pic.jpg", layers } }] }] } });
  test("a picture of its own and how it comes forward, as the shop reads it; nothing unsafe", () => {
    expect([...LAYER_POPS]).toEqual([...SHOP_LAYER_POPS]);
    const after = { image: "https://res.cloudinary.com/x/cut.png", front: true, pop: "hover" };
    const got = checkTree(withLayers({ after }));
    expect(got.ok).toBe(true);
    if (got.ok) expect(got.tree.root.children![0].children![0].props!.layers).toEqual({ after });
    expect(layersOf({ after })).toEqual({ after });
    for (const bad of [{ image: "javascript:alert(1)" }, { image: "data:image/png;base64,x" }, { image: "/x.png", pop: "spin" }]) {
      expect(checkTree(withLayers({ after: bad })).ok, JSON.stringify(bad)).toBe(false);
    }
    // The shop never draws an unsafe one either.
    expect(layersOf({ after: { image: "javascript:alert(1)", front: true } })).toEqual({ after: { front: true } });
    expect(layersOf({ after: { image: '/x.png") ; background:red' } })?.after?.image).toBeUndefined();
  });
});
