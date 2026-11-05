import { afterEach, describe, expect, it, vi } from "vitest";
import { drawScene, mountScene } from "../../../estabrek-storefront/src/pageTree/sceneCanvas";
import { sceneOf, SCENE_KINDS } from "../../../estabrek-storefront/src/pageTree/scene";

function recordingContext() {
  const commands: unknown[] = [];
  const gradient = { addColorStop: (...args: unknown[]) => commands.push(["colorStop", ...args]) };
  const context = new Proxy({}, { get: (_target, key) => (...args: unknown[]) => { commands.push([key, ...args]); return String(key).startsWith("create") ? gradient : undefined; }, set: (_target, key, value) => { commands.push([key, value === gradient ? "gradient" : value]); return true; } });
  return { context: context as CanvasRenderingContext2D, commands };
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.replaceChildren(); });

describe("procedural scene drawing", () => {
  it("draws eight distinct finite scenes and makes only opted-in scenes respond to the section pointer", () => {
    const drawings: string[] = [];
    for (const kind of SCENE_KINDS) {
      const spec = sceneOf({ kind })!;
      const first = recordingContext(), repeated = recordingContext(), pointer = recordingContext(), enabled = recordingContext();
      drawScene(first.context, spec, 640, 400, 0, null, "#8b5cf6", "#38bdf8");
      drawScene(repeated.context, spec, 640, 400, 0, null, "#8b5cf6", "#38bdf8");
      drawScene(pointer.context, spec, 640, 400, 0, { x: .1, y: .1 }, "#8b5cf6", "#38bdf8");
      drawScene(enabled.context, { ...spec, interactive: true }, 640, 400, 0, { x: .1, y: .1 }, "#8b5cf6", "#38bdf8");
      expect(first.commands.length, kind).toBeGreaterThan(20);
      expect(repeated.commands, kind).toEqual(first.commands);
      expect(pointer.commands, kind).toEqual(first.commands);
      expect(enabled.commands, kind).not.toEqual(first.commands);
      for (const command of enabled.commands as unknown[][]) for (const number of command.filter((value) => typeof value === "number")) expect(Number.isFinite(number), kind).toBe(true);
      drawings.push(JSON.stringify(first.commands));
    }
    expect(new Set(drawings).size).toBe(8);
  });
});

describe("section scene lifecycle", () => {
  it("activates lazily, pauses when hidden or out of view, caps DPR and releases every owned resource", () => {
    let intersection: IntersectionObserverCallback = () => {}, resize: ResizeObserverCallback = () => {}, reduced = false;
    let disconnected = 0, pending = 0, hidden = false;
    const frames = new Map<number, FrameRequestCallback>();
    const mediaListeners = new Set<() => void>();
    vi.stubGlobal("IntersectionObserver", class { constructor(cb: IntersectionObserverCallback) { intersection = cb; } observe() {} disconnect() { disconnected++; } });
    vi.stubGlobal("ResizeObserver", class { constructor(cb: ResizeObserverCallback) { resize = cb; } observe() {} disconnect() { disconnected++; } });
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { frames.set(++pending, cb); return pending; });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    vi.stubGlobal("matchMedia", () => ({ get matches() { return reduced; }, addEventListener: (_: string, fn: () => void) => mediaListeners.add(fn), removeEventListener: (_: string, fn: () => void) => mediaListeners.delete(fn) }));
    vi.stubGlobal("devicePixelRatio", 4);
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    const canvas = document.createElement("canvas"), host = document.createElement("section");
    const trace = recordingContext();
    vi.spyOn(canvas, "getContext").mockReturnValue(trace.context);
    vi.spyOn(host, "getBoundingClientRect").mockReturnValue({ width: 640, height: 400 } as DOMRect);
    host.append(canvas); document.body.append(host);
    const dispose = mountScene(canvas, sceneOf({ kind: "constellation", interactive: true })!);
    expect(canvas.dataset.sceneState).toBe("idle");
    expect(frames.size).toBe(0);
    intersection([{ isIntersecting: true, target: host } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(canvas.dataset.sceneState).toBe("running");
    expect(canvas.width).toBe(1280); expect(canvas.height).toBe(800);
    expect(frames.size).toBe(1);
    intersection([{ isIntersecting: false, target: host } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(canvas.dataset.sceneState).toBe("paused"); expect(frames.size).toBe(0);
    intersection([{ isIntersecting: true, target: host } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    hidden = true; document.dispatchEvent(new Event("visibilitychange"));
    expect(canvas.dataset.sceneState).toBe("paused"); expect(frames.size).toBe(0);
    hidden = false; reduced = true; document.dispatchEvent(new Event("visibilitychange"));
    expect(canvas.dataset.sceneState).toBe("static"); expect(frames.size).toBe(0);
    const still = JSON.stringify(trace.commands);
    host.dispatchEvent(new MouseEvent("pointermove", { clientX: 50, clientY: 60 }));
    expect(JSON.stringify(trace.commands)).toBe(still);
    reduced = false; for (const change of mediaListeners) change();
    expect(canvas.dataset.sceneState).toBe("running"); expect(frames.size).toBe(1);
    dispose(); const drawingCount = trace.commands.length;
    resize([], {} as ResizeObserver); document.dispatchEvent(new Event("visibilitychange"));
    host.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: 100 }));
    expect(trace.commands.length).toBe(drawingCount); expect(frames.size).toBe(0);
    expect(disconnected).toBe(2); expect(mediaListeners.size).toBe(0);
  });
});
