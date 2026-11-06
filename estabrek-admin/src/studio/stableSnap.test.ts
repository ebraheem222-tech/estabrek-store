import { describe, expect, it } from "vitest";
import { stableSnapBox, type SnapMemory, type SnapTarget } from "./stableSnap";

const box = (x: number, y: number, w = 10, h = 10) => ({ x, y, w, h });
const target: SnapTarget = { id: "target", box: box(100, 100, 40, 40) };

describe("stable screen-pixel snapping", () => {
  it("acquires at six pixels, retains at ten, then releases beyond ten", () => {
    const memory: SnapMemory = {};
    expect(stableSnapBox(box(83, 20), [target], memory).box.x).toBe(83);
    expect(stableSnapBox(box(84, 20), [target], memory).box.x).toBe(90);
    expect(stableSnapBox(box(80, 20), [target], memory).box.x).toBe(90);
    const released = stableSnapBox(box(79, 20), [target], memory);
    expect(released.box.x).toBe(79);
    expect(released.guides).toEqual([]);
  });

  it("keeps its acquired target when another becomes closer and targets reorder", () => {
    const a: SnapTarget = { id: "a", box: box(14, 100, 20, 20) };
    const b: SnapTarget = { id: "b", box: box(16, 200, 20, 20) };
    const memory: SnapMemory = {};
    expect(stableSnapBox(box(0, 20), [a, b], memory).box.x).toBe(4);
    expect(stableSnapBox(box(6, 20), [b, a], memory).box.x).toBe(4);
  });

  it("breaks acquisition ties by target id regardless of input ordering", () => {
    const a: SnapTarget = { id: "a", box: box(99, 100, 40, 40) };
    const b: SnapTarget = { id: "b", box: box(101, 200, 40, 40) };
    expect(stableSnapBox(box(90, 20), [b, a], {}).box.x).toBe(89);
    expect(stableSnapBox(box(90, 20), [a, b], {}).box.x).toBe(89);
  });

  it("clears both axes when bypassed so release does not resurrect an old snap", () => {
    const memory: SnapMemory = {};
    expect(stableSnapBox(box(84, 84), [target], memory).box).toMatchObject({ x: 90, y: 90 });
    const loose = stableSnapBox(box(81, 81), [target], memory, { bypass: true });
    expect(loose.box).toMatchObject({ x: 81, y: 81 });
    expect(loose.guides).toEqual([]);
    expect(stableSnapBox(box(81, 81), [target], memory).box).toMatchObject({ x: 81, y: 81 });
  });

  it("lets go of a removed target while the other axis stays latched", () => {
    const a: SnapTarget = { id: "a", box: box(100, 300, 40, 40) };
    const b: SnapTarget = { id: "b", box: box(300, 100, 40, 40) };
    const memory: SnapMemory = {};
    expect(stableSnapBox(box(84, 84), [a, b], memory).box).toMatchObject({ x: 90, y: 90 });
    expect(stableSnapBox(box(81, 81), [b], memory).box).toMatchObject({ x: 81, y: 90 });
  });
});
