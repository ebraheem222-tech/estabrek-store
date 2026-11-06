import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SelectionHandles,Guides } from "./CanvasHandles";
import type { Plane } from "../../../shared/geometry/plane";

afterEach(cleanup);

const box = { x: 100, y: 100, w: 200, h: 100 };
it("draws diagonal and reversed projected alignment lines and gap labels at their true endpoints",()=>{
 render(<Guides zoom={1} guides={[{x1:100,y1:20,x2:20,y2:100}]} gaps={[{x1:50,y1:60,x2:10,y2:20,length:56.57}]} />);
 const line=screen.getByTestId("studio-guide");expect(line.getAttribute("x1")).toBe("100");expect(line.getAttribute("y2")).toBe("100");
 const gap=screen.getByTestId("studio-gap");expect(gap.getAttribute("x2")).toBe("10");expect(screen.getByText("57")).toHaveStyle({left:"30px",top:"40px"});
});
function setup(extra = {}) {
  const props = {
    box, zoom: 1, sides: "all" as const, turn: 0,
    local: (e: { clientX: number; clientY: number }) => ({ x: e.clientX, y: e.clientY }),
    onSize: vi.fn(), onSizeLive: vi.fn(), onCancel: vi.fn(),
    onReset: vi.fn(), onTurnLive: vi.fn(), onTurn: vi.fn(), ...extra,
  };
  const view = render(<SelectionHandles {...props} />);
  const handle = (name = "e") => {
    const el = screen.getAllByTestId("studio-handle").find((h) => h.dataset.handle === name)!;
    el.setPointerCapture = vi.fn();
    el.releasePointerCapture = vi.fn();
    el.hasPointerCapture = () => true;
    return el;
  };
  return { ...view, props, handle };
}

// jsdom has no native pointer capture; keep pointer coordinates and identities real.
function pointer(el: Element, type: string, x: number, y: number, options: { pointerId?: number; shiftKey?: boolean } = {}) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0, ...options });
  Object.defineProperty(event, "pointerId", { value: options.pointerId ?? 7 });
  fireEvent(el, event);
}

describe("canvas resize gestures", () => {
  it("places every planar handle using its projected local point and draws the actual quadrilateral", () => {
    const plane: Plane = { w: 100, h: 50, matrix: [2, .5, 10, 0, 1, 20, .005, 0, 1] };
    const { handle } = setup({ geometry: { plane, resize: () => null }, turn: null });
    expect(Number.parseFloat(handle("n").style.left)).toBeCloseTo(88, 10);
    expect(Number.parseFloat(handle("n").style.top)).toBeCloseTo(16, 10);
    expect(Number.parseFloat(handle("e").style.left)).toBeCloseTo(148.333333333333, 10);
    expect(Number.parseFloat(handle("e").style.top)).toBeCloseTo(30, 10);
    expect(handle("nw").style.left).toBe("10px");
    expect(handle("sw").style.top).toBe("70px");
    const points = screen.getByTestId("studio-plane-outline").querySelector("polygon")!.getAttribute("points")!.split(" ").map(point => point.split(",").map(Number));
    expect(points[0]).toEqual([10, 20]);
    expect(points[1][0]).toBeCloseTo(140, 10);
    expect(points[2][0]).toBeCloseTo(156.666666666667, 10);
    expect(points[3]).toEqual([35, 70]);
  });

  it("uses the pointerdown planar planner and callbacks after a live rerender and commits the release patch", () => {
    const plane: Plane = { w: 100, h: 50, matrix: [2, 0, 10, 0, 2, 20, 0, 0, 1] };
    const resize = vi.fn((_h, delta: { x: number; y: number }, keep: boolean) => {
      const w = 100 + delta.x / 2, h = keep ? w / 2 : 50;
      return { matrix: plane.matrix, w, h, quad: [{ x: 10, y: 20 }, { x: 10 + 2 * w, y: 20 }, { x: 10 + 2 * w, y: 20 + 2 * h }, { x: 10, y: 20 + 2 * h }], patch: { width: `${w}px`, height: `${h}px` }, box: { x: 10, y: 20, w: 2 * w, h: 2 * h } };
    });
    const { props, handle, rerender } = setup({ geometry: { plane, resize }, box: { x: 10, y: 20, w: 200, h: 100 }, zoom: 2, turn: null });
    const east = handle("e"), replacement = vi.fn(), replacementSize = vi.fn();
    pointer(east, "pointerdown", 210, 70);
    pointer(east, "pointermove", 230, 70);
    expect(props.onSizeLive).toHaveBeenCalledWith(110, 50, expect.objectContaining({ plane: expect.objectContaining({ patch: { width: "110px", height: "50px" } }) }));
    rerender(<SelectionHandles {...props} geometry={{ plane: { ...plane, w: 110 }, resize: replacement }} zoom={.5} local={() => ({ x: -999, y: -999 })} onSize={replacementSize} />);
    pointer(east, "pointerup", 250, 70, { shiftKey: true });
    expect(resize).toHaveBeenLastCalledWith("e", { x: 40, y: 0 }, true);
    expect(props.onSize).toHaveBeenCalledExactlyOnceWith(120, 60, expect.objectContaining({ zoom: 2, keepProportions: true, plane: expect.objectContaining({ w: 120, h: 60, patch: { width: "120px", height: "60px" } }) }));
    expect(replacement).not.toHaveBeenCalled();
    expect(replacementSize).not.toHaveBeenCalled();
  });

  it("projects keyboard steps from the start plane in local CSS pixels even under perspective and zoom", () => {
    const plane: Plane = { w: 100, h: 50, matrix: [2, .5, 10, 0, 1, 20, .005, 0, 1] };
    const resize = vi.fn(() => null);
    const { handle, props } = setup({ geometry: { plane, resize }, zoom: .25, turn: null });
    fireEvent.keyDown(handle("e"), { key: "ArrowRight" });
    expect(resize).toHaveBeenCalledWith("e", { x: 224.5 / 1.505 - 222.5 / 1.5, y: 45 / 1.505 - 45 / 1.5 }, false);
    resize.mockClear();
    fireEvent.keyDown(handle("n"), { key: "ArrowUp", shiftKey: true });
    expect(resize).toHaveBeenCalledWith("n", { x: -5 / 1.25, y: -10 / 1.25 }, false);
    expect(props.onSize).not.toHaveBeenCalled();
  });

  it.each([null, { w: NaN }, { matrix: [0, 0, 0, 0, 0, 0, 0, 0, 1] }, { patch: { width: Infinity } }, { quad: [{ x: 0, y: NaN }] }, { box: { x: 0, y: 0, w: 99, h: 50 } }])("cancels an invalid planar result without saving a patch: %s", invalid => {
    const plane: Plane = { w: 100, h: 50, matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
    const result = { ...plane, w: 110, quad: [{ x: 0, y: 0 }, { x: 110, y: 0 }, { x: 110, y: 50 }, { x: 0, y: 50 }], patch: { width: "110px" }, box: { x: 0, y: 0, w: 110, h: 50 } };
    const resize = () => invalid === null ? null : { ...result, ...invalid };
    const { props, handle } = setup({ geometry: { plane, resize }, turn: null });
    const east = handle("e");
    pointer(east, "pointerdown", 100, 25);
    pointer(east, "pointermove", 110, 25);
    pointer(east, "pointerup", 120, 25);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onSize).not.toHaveBeenCalled();
    expect(props.onSizeLive).not.toHaveBeenCalled();
  });

  it("restores a valid planar preview on cancellation without saving", () => {
    const plane: Plane = { w: 100, h: 50, matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
    const resize = () => ({ ...plane, w: 110, quad: [{ x: 0, y: 0 }, { x: 110, y: 0 }, { x: 110, y: 50 }, { x: 0, y: 50 }], patch: { width: "110px" }, box: { x: 0, y: 0, w: 110, h: 50 } });
    const { props, handle } = setup({ geometry: { plane, resize }, turn: null });
    const east = handle("e");
    pointer(east, "pointerdown", 100, 25);
    pointer(east, "pointermove", 110, 25);
    expect(props.onSizeLive).toHaveBeenCalledWith(110, 50, expect.any(Object));
    pointer(east, "pointercancel", 110, 25);
    pointer(east, "pointerup", 110, 25);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onSize).not.toHaveBeenCalled();
    expect(screen.queryByTestId("studio-sizing")).not.toBeInTheDocument();
  });

  it("keeps a group's contents proportional without Shift, including keyboard resizing", () => {
    const { props, handle } = setup({ frame: { w: 200, h: 100, rotation: 0 }, proportional: true, ratioLimits: { min: .1, max: 4 } });
    const east = handle();
    pointer(east, "pointerdown", 300, 150);
    pointer(east, "pointerup", 350, 150);
    expect(props.onSize).toHaveBeenCalledWith(250, 125, expect.objectContaining({ keepProportions: true }));
    fireEvent.keyDown(east, { key: "ArrowRight" });
    expect(props.onSize).toHaveBeenLastCalledWith(201, 101, expect.objectContaining({ keepProportions: true }));
  });
  it("clamps a group ratio and preserves its opposite edge using the gesture's original limits", () => {
    const { props, handle, rerender } = setup({ frame: { w: 200, h: 100, rotation: 0 }, proportional: true, ratioLimits: { min: .25, max: 2 } });
    const west = handle("w");
    pointer(west, "pointerdown", 100, 150);
    pointer(west, "pointermove", 50, 150);
    rerender(<SelectionHandles {...props} proportional={false} ratioLimits={{ min: .5, max: 1 }} />);
    pointer(west, "pointerup", -900, 150);
    expect(props.onSize).toHaveBeenCalledWith(400, 200, expect.objectContaining({ box: { x: -100, y: 100, w: 400, h: 200 }, keepProportions: true }));
  });
  it("does not save a keyboard group resize already at its authored scale limit", () => {
    const { props, handle } = setup({ frame: { w: 200, h: 100, rotation: 0 }, proportional: true, ratioLimits: { min: .025, max: 1 } });
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(props.onSize).not.toHaveBeenCalled();
  });
  it("commits pointer release coordinates even after an earlier move", () => {
    const { props, handle } = setup();
    const east = handle();
    pointer(east, "pointerdown", 300, 150);
    pointer(east, "pointermove", 320, 150);
    pointer(east, "pointerup", 340, 150);
    expect(props.onSize).toHaveBeenCalledExactlyOnceWith(240, null, {
      handle: "e", start: box, box: { ...box, w: 240 }, zoom: 1, keepProportions: false,
    });
  });

  it("commits a resize released without a preceding pointermove", () => {
    const { props, handle } = setup();
    const east = handle();
    pointer(east, "pointerdown", 300, 150);
    pointer(east, "pointerup", 325, 150);
    expect(props.onSize).toHaveBeenCalledWith(225, null, expect.any(Object));
  });

  it("previews west/north position in screen pixels and commits page pixels at zoom", () => {
    const { props, handle } = setup({ zoom: 0.5 });
    const nw = handle("nw");
    pointer(nw, "pointerdown", 100, 100);
    pointer(nw, "pointermove", 120, 110);
    expect(props.onSizeLive).toHaveBeenCalledWith(360, 180, {
      handle: "nw", start: box, box: { x: 120, y: 110, w: 180, h: 90 }, zoom: 0.5, keepProportions: false,
    });
    expect(props.onSize).not.toHaveBeenCalled();
    pointer(nw, "pointerup", 120, 110);
    expect(props.onSize).toHaveBeenCalledWith(360, 180, expect.objectContaining({ box: { x: 120, y: 110, w: 180, h: 90 } }));
  });

  it("includes the second dimension when Shift keeps proportions on an edge", () => {
    const { props, handle } = setup();
    const west = handle("w");
    pointer(west, "pointerdown", 100, 150);
    pointer(west, "pointerup", 50, 150, { shiftKey: true });
    expect(props.onSize).toHaveBeenCalledWith(250, 125, expect.objectContaining({ keepProportions: true, box: { x: 50, y: 100, w: 250, h: 125 } }));
  });

  it.each(["pointercancel", "lostpointercapture"])("restores the preview without committing on %s", (event) => {
    const { props, handle } = setup();
    const east = handle();
    pointer(east, "pointerdown", 300, 150);
    pointer(east, "pointermove", 330, 150);
    pointer(east, event, 330, 150);
    pointer(east, "pointerup", 330, 150);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onSize).not.toHaveBeenCalled();
    expect(screen.queryByTestId("studio-sizing")).not.toBeInTheDocument();
  });

  it("restores the preview when the active handles unmount", () => {
    const { props, handle, unmount } = setup();
    const east = handle();
    pointer(east, "pointerdown", 300, 150);
    pointer(east, "pointermove", 330, 150);
    unmount();
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onSize).not.toHaveBeenCalled();
  });

  it("ignores other pointers while a resize is captured", () => {
    const { props, handle } = setup();
    const east = handle();
    pointer(east, "pointerdown", 300, 150);
    pointer(east, "pointermove", 500, 150, { pointerId: 8 });
    pointer(east, "pointerup", 500, 150, { pointerId: 8 });
    expect(props.onSize).not.toHaveBeenCalled();
    expect(props.onSizeLive).not.toHaveBeenCalled();
    pointer(east, "pointerup", 320, 150);
    expect(props.onSize).toHaveBeenCalledWith(220, null, expect.any(Object));
  });

  it("cancels a captured resize with Escape", () => {
    const { props, handle } = setup();
    const east = handle();
    pointer(east, "pointerdown", 300, 150);
    pointer(east, "pointermove", 330, 150);
    fireEvent.keyDown(window, { key: "Escape" });
    pointer(east, "pointerup", 330, 150);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onSize).not.toHaveBeenCalled();
  });

  it("offers keyboard resizing in page pixels with anchored position metadata", () => {
    const { props, handle } = setup({ zoom: 0.5 });
    const west = handle("w");
    expect(west).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(west, { key: "ArrowLeft" });
    expect(props.onSize).toHaveBeenCalledWith(401, null, expect.objectContaining({ box: { x: 99.5, y: 100, w: 200.5, h: 100 } }));
  });

  it("uses explicit rotated local sizes for resizing instead of the measured AABB", () => {
    const { props, handle } = setup({
      box: { x: 150, y: 50, w: 100, h: 200 }, zoom: 0.5, turn: 90,
      frame: { w: 200, h: 100, rotation: 90 },
    });
    const west = handle("w");
    expect(west.style.left).toBe("200px");
    expect(west.style.top).toBe("50px");
    pointer(west, "pointerdown", 200, 50);
    pointer(west, "pointerup", 200, 70);
    expect(props.onSize).toHaveBeenCalledWith(360, null, expect.objectContaining({
      frame: expect.objectContaining({
        start: { w: 200, h: 100, rotation: 90 },
        current: expect.objectContaining({ w: 180, h: 100, rotation: 90 }),
        offset: { x: 10, y: 10 },
      }),
    }));
  });

  it("does not freeze natural size when a handle is clicked without dragging", () => {
    const { props, handle } = setup();
    const east = handle();
    pointer(east, "pointerdown", 300, 150);
    pointer(east, "pointerup", 300, 150);
    expect(props.onSize).not.toHaveBeenCalled();
  });

  it("keeps the original geometry and zoom after a live preview rerender", () => {
    const { props, handle, rerender } = setup({ zoom: 0.5 });
    const west = handle("w");
    pointer(west, "pointerdown", 100, 150);
    pointer(west, "pointermove", 120, 150);
    rerender(<SelectionHandles {...props} box={{ x: 120, y: 100, w: 180, h: 100 }} zoom={2} />);
    pointer(west, "pointerup", 130, 150);
    expect(props.onSize).toHaveBeenCalledWith(340, null, expect.objectContaining({ start: box, zoom: 0.5, box: { x: 130, y: 100, w: 170, h: 100 } }));
  });

  it("restores a cancelled rotation for callers without onCancel", () => {
    const { props } = setup({ onCancel: undefined, turn: 20 });
    const knob = screen.getByTestId("studio-turn");
    knob.setPointerCapture = vi.fn();
    knob.releasePointerCapture = vi.fn();
    knob.hasPointerCapture = () => true;
    pointer(knob, "pointerdown", 200, 72);
    pointer(knob, "pointermove", 300, 150);
    pointer(knob, "pointercancel", 300, 150);
    expect(props.onTurnLive).toHaveBeenLastCalledWith(20);
    expect(props.onTurn).not.toHaveBeenCalled();
  });
});
