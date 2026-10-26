import { describe, expect, it } from "vitest";
import { MODELS, browserPlan, chooseEngine, engineOptions, megabytes } from "./bgEngine";

const gpu = { webgpu: true, f16: true, maxStorageBuffers: 16 };

describe("choosing the engine", () => {
  it("the free one by default, whatever Cloudinary's state", () => {
    expect(chooseEngine(undefined, { on: true, ready: true })).toEqual({ engine: "browser" });
    expect(chooseEngine("auto", null)).toEqual({ engine: "browser" });
    expect(chooseEngine("browser", { on: true, ready: true })).toEqual({ engine: "browser" });
  });

  it("Cloudinary only when switched on and the store has it", () => {
    expect(chooseEngine("cloudinary", { on: true, ready: true })).toEqual({ engine: "cloudinary" });
    expect(chooseEngine("cloudinary", { on: false, ready: true })).toEqual({ error: "CLOUD_OFF" });
    expect(chooseEngine("cloudinary", { on: true, ready: false })).toEqual({ error: "CLOUD_NOT_READY" });
    expect(chooseEngine("cloudinary", null)).toEqual({ error: "CLOUD_OFF" });
  });

  it("the picker shows Cloudinary only when it is switched on", () => {
    expect(engineOptions({ on: false, ready: true })).toEqual([{ id: "browser", usable: true }]);
    expect(engineOptions({ on: true, ready: false })).toEqual([
      { id: "browser", usable: true },
      { id: "cloudinary", usable: false },
    ]);
  });
});

describe("the model for this device", () => {
  it("WebGPU with half precision: the 1024 graph; fast: the 512 one", () => {
    expect(browserPlan(gpu)).toEqual({ backend: "webgpu", model: MODELS["birefnet-lite-1024"] });
    expect(browserPlan(gpu, "fast")).toEqual({ backend: "webgpu", model: MODELS["birefnet-lite-512"] });
  });

  it("no WebGPU, no half precision, too few buffers or failed before: 512 on WASM", () => {
    for (const g of [
      { ...gpu, webgpu: false },
      { ...gpu, f16: false },
      { ...gpu, maxStorageBuffers: 4 },
      { ...gpu, failedBefore: true },
    ]) expect(browserPlan(g)).toEqual({ backend: "wasm", model: MODELS["birefnet-lite-512"] });
  });

  it("the models are pinned: an exact revision and a SHA-256 each", () => {
    for (const m of Object.values(MODELS)) {
      expect(m.url).toMatch(/\/resolve\/[0-9a-f]{40}\//);
      expect(m.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(m.bytes).toBeGreaterThan(50 * 1024 * 1024);
    }
    expect(megabytes(MODELS["birefnet-lite-1024"].bytes)).toBe("110 MB");
    expect(megabytes(MODELS["birefnet-lite-512"].bytes)).toBe("94 MB");
  });
});
