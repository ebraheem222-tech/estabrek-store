import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SelectionHandles } from "./CanvasHandles";

afterEach(cleanup);

const box = { x: 100, y: 100, w: 200, h: 100 };
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
