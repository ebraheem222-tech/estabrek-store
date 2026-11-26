import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { SAM_MODELS, SAM_SIDE, bestMask, samInput, samInputSize, samMask, samPrompt, type SamPoint } from "./samEngine";

// «قصّ بكبسة»: the model's sums (samEngine.ts), the cut editor's clicks (CutoutEditor) and «طلّع الغرض من الصورة»
// (PopOutPanel). The model itself runs in a browser worker: here it is stood in for.
const render = (ui: ReactElement) => rtlRender(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

const h = vi.hoisted(() => ({ picks: [] as Array<{ points: SamPoint[]; w: number; h: number }> }));
vi.mock("./sam", async () => {
  const engine = await vi.importActual<typeof import("./samEngine")>("./samEngine");
  return {
    SamError: engine.SamError,
    SAM_BYTES: engine.SAM_BYTES,
    pickSession: vi.fn(async () => ({
      pick: async (points: SamPoint[], w: number, hh: number) => {
        h.picks.push({ points, w, h: hh });
        // The thing: the picture's left half; a "leave out" click takes its top away.
        const mask = new Uint8ClampedArray(w * hh);
        for (let y = 0; y < hh; y++) for (let x = 0; x < w / 2; x++) mask[y * w + x] = points.some((p) => !p.keep) && y < hh / 2 ? 0 : 255;
        return { mask, score: 0.93 };
      },
    })),
  };
});
vi.mock("./bgRemove", async () => {
  const actual = await vi.importActual<typeof import("./bgRemove")>("./bgRemove");
  return {
    ...actual,
    pictureOnly: vi.fn(async () => ({ width: 4, height: 4, image: { width: 4, height: 4, data: new Uint8ClampedArray(64) }, mask: new Uint8ClampedArray(16), engine: "wasm" })),
  };
});
vi.mock("../api/uploads.api", async () => ({ ...(await vi.importActual<object>("../api/uploads.api")), getCloudCutoutStatus: vi.fn(async () => ({ on: false, ready: false })), uploadImages: vi.fn(async () => ({ files: [{ id: "m1", url: "https://res.cloudinary.com/x/cut.png" }] })) }));
vi.mock("../components/media/cutoutShared", async () => {
  const actual = await vi.importActual<typeof import("../components/media/cutoutShared")>("../components/media/cutoutShared");
  return { ...actual, saveCutout: vi.fn(async () => ({ id: "m1", url: "https://res.cloudinary.com/x/cut.png" })) };
});

beforeAll(() => {
  // jsdom has no ResizeObserver nor ImageData.
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
  if (typeof globalThis.ImageData === "undefined") {
    (globalThis as { ImageData?: unknown }).ImageData = class { data: Uint8ClampedArray; width: number; height: number; constructor(width: number, height: number) { this.width = width; this.height = height; this.data = new Uint8ClampedArray(width * height * 4); } };
  }
});
afterEach(() => {
  cleanup();
  h.picks.length = 0;
});

describe("the model's sums", () => {
  it("reads a picture at 1024 on its longest side", () => {
    expect(samInputSize(2000, 1000)).toEqual({ w: 1024, h: 512, k: 0.512 });
    expect(samInputSize(600, 800)).toMatchObject({ w: 768, h: 1024 });
  });
  it("normalises as ImageNet, channels first, the rest of the 1024² left at zero", () => {
    const t = samInput(new Uint8ClampedArray([255, 0, 128, 255, 0, 0, 0, 255]), 2, 1);
    const n = SAM_SIDE * SAM_SIDE;
    expect(t.length).toBe(3 * n);
    expect(t[0]).toBeCloseTo((1 - 0.485) / 0.229);
    expect(t[n]).toBeCloseTo((0 - 0.456) / 0.224);
    expect(t[2 * n]).toBeCloseTo((128 / 255 - 0.406) / 0.225);
    expect(t[1]).toBeCloseTo((0 - 0.485) / 0.229);
    expect(t[2]).toBe(0);
    expect(t[SAM_SIDE]).toBe(0);
  });
  it("clicks in the model's pixels, keep = 1 and leave out = 0", () => {
    const { coords, labels } = samPrompt([{ x: 100, y: 50, keep: true }, { x: 10, y: 20, keep: false }], 0.5);
    expect(Array.from(coords)).toEqual([50, 25, 5, 10]);
    expect(Array.from(labels)).toEqual([1n, 0n]);
  });
  it("takes the mask it is surest of", () => {
    expect(bestMask([0.4, 0.9, 0.7])).toBe(1);
    expect(bestMask([0.95, 0.2, 0.3])).toBe(0);
  });
  it("turns the low mask into the picture's own size, the part that shows only, with a soft edge", () => {
    // Mask 2 of 3: logits +3 in the left half of the picture's part (the picture is 1024 × 512: rows 0 … 127 of 256),
    // −3 elsewhere; the picture itself is 2048 × 1024 (a low pixel is 8 of its pixels).
    const low = new Float32Array(3 * 256 * 256).fill(-3);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) low[2 * 256 * 256 + y * 256 + x] = 3;
    const W = 2048, H = 1024, m = samMask(low, 2, 1024, 512, W, H);
    expect(m.length).toBe(W * H);
    expect(m[500 * W + 200]).toBeGreaterThan(250);
    expect(m[500 * W + 1800]).toBeLessThan(5);
    // Across the edge (x = 1024): soft, not a step.
    const edge = Array.from(m.slice(500 * W + 1016, 500 * W + 1032));
    expect(edge.some((v) => v > 20 && v < 235)).toBe(true);
    // Its bottom rows are the picture's bottom, not the padding below it.
    expect(m[(H - 1) * W + 200]).toBeGreaterThan(250);
  });
  it("the pinned files of the small model", () => {
    for (const m of Object.values(SAM_MODELS)) {
      expect(m.url).toMatch(/slimsam-77-uniform\/resolve\/[0-9a-f]{40}\/onnx\/\w+_quantized\.onnx$/);
      expect(m.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

describe("the cut editor with clicks", () => {
  it("opens ready for clicks; a click keeps the thing, Alt or «شيله» leaves a part out; the clicks can be cleared", async () => {
    const { CutoutEditor } = await import("../components/media/CutoutEditor");
    render(<CutoutEditor open target={{ url: "https://res.cloudinary.com/x/pic.jpg" }} startWith="pick" transparentOnly onClose={() => undefined} />);
    await waitFor(() => expect(screen.getByTestId("cutout-pick-status").textContent).toMatch(/Click|كبسة|לחיצה/));
    // No background choice for a layer: it is laid on transparency.
    expect(screen.queryByTestId("cutout-bg-colour")).toBeNull();
    const canvas = screen.getByTestId("cutout-canvas");
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 4, height: 4, right: 4, bottom: 4, x: 0, y: 0, toJSON: () => ({}) });
    Object.defineProperty(canvas, "width", { value: 4, configurable: true });
    Object.defineProperty(canvas, "height", { value: 4, configurable: true });
    fireEvent.pointerDown(canvas, { clientX: 1, clientY: 3, button: 0, pointerId: 1 });
    await waitFor(() => expect(screen.getByTestId("cutout-pick-status").textContent).toMatch(/93/));
    expect(h.picks[0]).toEqual({ points: [{ x: 1, y: 3, keep: true }], w: 4, h: 4 });
    expect(screen.getAllByTestId("cutout-point")).toHaveLength(1);
    fireEvent.pointerDown(canvas, { clientX: 1, clientY: 0, button: 0, pointerId: 1, altKey: true });
    await waitFor(() => expect(h.picks).toHaveLength(2));
    expect(h.picks[1].points[1]).toEqual({ x: 1, y: 0, keep: false });
    fireEvent.click(screen.getByTestId("cutout-pick-leave"));
    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 1, button: 0, pointerId: 1 });
    await waitFor(() => expect(h.picks).toHaveLength(3));
    expect(h.picks[2].points[2].keep).toBe(false);
    fireEvent.click(screen.getByTestId("cutout-pick-clear"));
    expect(screen.queryAllByTestId("cutout-point")).toHaveLength(0);
  });
});

describe("«طلّع الغرض من الصورة»", () => {
  it("the cut lies over the picture as its front layer, coming forward with the pointer; another way, still, or gone", async () => {
    const { PopOutPanel, withFront } = await import("../studio/PopOutPanel");
    const { useState } = await import("react");
    type Node = import("../api/pages.api").PageTreeNode;
    function Editor() {
      const [node, setNode] = useState<Node>({ id: "pic", type: "image", props: { src: "https://res.cloudinary.com/x/pic.jpg", layers: { before: { bg: "#ff0000" } } } });
      return <><PopOutPanel node={node} busy={false} onOps={(_, ops) => ops.forEach((op) => op.op === "setProps" && setNode((n) => ({ ...n, props: op.props })))} /><output data-testid="props">{JSON.stringify(node.props)}</output></>;
    }
    render(<Editor />);
    const props = () => JSON.parse(screen.getByTestId("props").textContent!);
    fireEvent.click(screen.getByTestId("studio-popout-cut-start"));
    // The editor opens on the picture, ready for clicks; a click, then save.
    await waitFor(() => expect(screen.getByTestId("cutout-pick-status").textContent).toMatch(/Click|كبسة|לחיצה/));
    const canvas = screen.getByTestId("cutout-canvas");
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 4, height: 4, right: 4, bottom: 4, x: 0, y: 0, toJSON: () => ({}) });
    Object.defineProperty(canvas, "width", { value: 4, configurable: true });
    Object.defineProperty(canvas, "height", { value: 4, configurable: true });
    fireEvent.pointerDown(canvas, { clientX: 1, clientY: 1, button: 0, pointerId: 1 });
    await waitFor(() => expect(h.picks).toHaveLength(1));
    fireEvent.click(screen.getByTestId("cutout-save"));
    await waitFor(() => expect(props().layers.after).toEqual({ image: "https://res.cloudinary.com/x/cut.png", front: true, pop: "hover" }));
    // Its layer behind stays.
    expect(props().layers.before).toEqual({ bg: "#ff0000" });
    fireEvent.click(screen.getByTestId("studio-popout-pop").querySelector('[data-value="scroll"]')!);
    expect(props().layers.after.pop).toBe("scroll");
    fireEvent.click(screen.getByTestId("studio-popout-pop").querySelector('[data-value="still"]')!);
    expect(props().layers.after).not.toHaveProperty("pop");
    fireEvent.click(screen.getByTestId("studio-popout-remove"));
    expect(props().layers).toEqual({ before: { bg: "#ff0000" } });
    expect(withFront({ after: { image: "/x.png" } }, null)).toBeUndefined();
  });
});
