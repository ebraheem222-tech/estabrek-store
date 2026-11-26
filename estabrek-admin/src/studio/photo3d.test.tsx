import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import type { PageDraft, PageDraftOp, PageTreeNode } from "../api/pages.api";
import { simulate } from "./draft";
import { DEPTH_MODELS, depthInput, depthInputSize, depthPlan, depthToGrey } from "../lib/depthEngine";
import { elementTools } from "./elementTools";

// «صورة 3D»: the depth model's sums (lib/depthEngine.ts) and the picture's 3D panel (the model itself runs in a
// browser worker: here it is stood in for).
vi.mock("../lib/depth", async () => {
  const engine = await vi.importActual<typeof import("../lib/depthEngine")>("../lib/depthEngine");
  return {
    DepthError: engine.DepthError,
    depthPlanHere: vi.fn(async () => ({ backend: "wasm", model: engine.DEPTH_MODELS["depth-anything-v2-small-int8"] })),
    estimateDepth: vi.fn(async (_src: string, o?: { onProgress?: (p: { phase: string; loaded?: number; total?: number }) => void }) => {
      o?.onProgress?.({ phase: "download", loaded: 50, total: 100 });
      return { width: 2, height: 2, grey: new Uint8ClampedArray(16), engine: "wasm" };
    }),
    quickDepth: vi.fn(async () => ({ width: 2, height: 2, grey: new Uint8ClampedArray(16), engine: "light" })),
    depthFile: vi.fn(async () => new File([new Uint8Array(4)], "pic-depth.png", { type: "image/png" })),
  };
});
vi.mock("../api/uploads.api", () => ({ uploadImages: vi.fn(async () => ({ files: [{ url: "https://res.cloudinary.com/x/pic-depth.png" }] })) }));
const { Photo3dPanel } = await import("./Photo3dPanel");
const depthLib = await import("../lib/depth");

afterEach(cleanup);

describe("the depth model's sums", () => {
  it("reads a picture at 518 on its shorter side, in multiples of 14, at most 924 long", () => {
    expect(depthInputSize(1920, 1080)).toEqual({ w: 924, h: 518 });
    expect(depthInputSize(800, 600)).toEqual({ w: 686, h: 518 });
    expect(depthInputSize(300, 600)).toEqual({ w: 518, h: 924 });
    expect(depthInputSize(500, 500)).toEqual({ w: 518, h: 518 });
    for (const [w, h] of [[1000, 777], [333, 1999], [5000, 4000]]) {
      const s = depthInputSize(w, h);
      expect(s.w % 14).toBe(0);
      expect(s.h % 14).toBe(0);
    }
  });
  it("normalises the picture as the model was taught, channels first", () => {
    const px = new Uint8ClampedArray([255, 0, 128, 255]);
    const t = depthInput(px, 1, 1);
    expect(t[0]).toBeCloseTo((1 - 0.485) / 0.229);
    expect(t[1]).toBeCloseTo((0 - 0.456) / 0.224);
    expect(t[2]).toBeCloseTo((128 / 255 - 0.406) / 0.225);
  });
  it("spreads the answer over grey (white = near), a few odd pixels not flattening the rest", () => {
    const values = Array.from({ length: 200 }, (_, i) => i);
    values[0] = -1e6;
    values[199] = 1e6;
    const g = depthToGrey(values, 200, 1);
    expect(g[10 * 4]).toBeLessThan(20);
    expect(g[190 * 4]).toBeGreaterThan(235);
    expect(g[100 * 4]).toBeGreaterThan(110);
    expect(g[100 * 4]).toBeLessThan(145);
    expect(g[3]).toBe(255);
  });
  it("half precision on a WebGPU that has it, else the 8-bit model on WASM; pinned files of the small model", () => {
    expect(depthPlan({ webgpu: true, f16: true, maxStorageBuffers: 10 }).model.id).toBe("depth-anything-v2-small-fp16");
    expect(depthPlan({ webgpu: true, f16: false, maxStorageBuffers: 10 }).backend).toBe("wasm");
    expect(depthPlan({ webgpu: true, f16: true, maxStorageBuffers: 10, failedBefore: true }).model.id).toBe("depth-anything-v2-small-int8");
    for (const m of Object.values(DEPTH_MODELS)) {
      expect(m.url).toMatch(/depth-anything-v2-small\/resolve\/[0-9a-f]{40}\//);
      expect(m.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

function Editor({ node }: { node: PageTreeNode }) {
  const [state, setState] = useState<PageDraft>({ version: 1, rev: 1, baseHash: "x", sections: [], trash: [], startedAt: "", updatedAt: "", tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [node] }] } } });
  const shown = state.tree.root.children![0].children![0];
  return <><Photo3dPanel node={shown} busy={false} onOps={(_, ops: PageDraftOp[]) => setState(ops.reduce(simulate, state))} /><output data-testid="props">{JSON.stringify(shown.props)}</output></>;
}
const props = () => JSON.parse(screen.getByTestId("props").textContent!);
const pic: PageTreeNode = { id: "pic", type: "image", props: { src: "https://res.cloudinary.com/x/pic.jpg" } };

describe("a picture's 3D in the editor", () => {
  it("its tool takes the owner to the panel", () => {
    expect(elementTools(pic).find((t) => t.id === "image-3d")?.go).toEqual({ kind: "group", group: "motion", card: "studio-photo3d" });
  });

  it("the depth made by the model is saved beside the picture, then its look, motion and light are the owner's", async () => {
    render(<Editor node={pic} />);
    fireEvent.click(screen.getByTestId("studio-photo3d-model"));
    await waitFor(() => expect(props().photo3d).toEqual({ map: "https://res.cloudinary.com/x/pic-depth.png" }));
    expect(depthLib.estimateDepth).toHaveBeenCalledWith("https://res.cloudinary.com/x/pic.jpg", expect.anything());
    fireEvent.click(screen.getByTestId("studio-photo3d-look").querySelector('[data-value="points"]')!);
    fireEvent.click(screen.getByTestId("studio-photo3d-move").querySelector('[data-value="auto"]')!);
    const depth = screen.getByTestId("studio-photo3d-depth");
    fireEvent.change(depth, { target: { value: "0.9" } });
    fireEvent.pointerUp(depth);
    expect(props().photo3d).toEqual({ map: "https://res.cloudinary.com/x/pic-depth.png", look: "points", move: "auto", depth: 0.9 });
    fireEvent.click(screen.getByTestId("studio-photo3d-remove"));
    expect(props()).not.toHaveProperty("photo3d");
  });

  it("the quick depth needs no model", async () => {
    render(<Editor node={pic} />);
    fireEvent.click(screen.getByTestId("studio-photo3d-quick"));
    await waitFor(() => expect(props().photo3d?.map).toBe("https://res.cloudinary.com/x/pic-depth.png"));
    expect(depthLib.quickDepth).toHaveBeenCalled();
  });

  it("a failed download says so, and nothing is saved", async () => {
    vi.mocked(depthLib.estimateDepth).mockRejectedValueOnce(new depthLib.DepthError("MODEL_DOWNLOAD"));
    render(<Editor node={pic} />);
    fireEvent.click(screen.getByTestId("studio-photo3d-model"));
    await waitFor(() => expect(screen.getByTestId("studio-photo3d-error")).toBeTruthy());
    expect(props()).not.toHaveProperty("photo3d");
  });
});
