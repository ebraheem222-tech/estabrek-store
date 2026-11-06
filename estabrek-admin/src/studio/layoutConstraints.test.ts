import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { constrainSize, spaceBoxes } from "./layoutConstraints";
import { LayoutConstraintsPanel } from "./LayoutConstraintsPanel";

afterEach(cleanup);

describe("required dimensions", () => {
  it("projects to the nearest feasible rectangle without changing unconstrained dimensions", () => {
    expect(constrainSize(120, 60, {})).toEqual({ w: 120, h: 60 });
    expect(constrainSize(20, 300, { minWidth: 80, maxHeight: 200 })).toEqual({ w: 80, h: 200 });
    expect(constrainSize(-10, 12000, {})).toEqual({ w: 8, h: 9999 });
  });

  it("projects both dimensions onto a required aspect ratio rather than choosing one axis", () => {
    // Closest point to (100,100) on w=2h is (120,60).
    expect(constrainSize(100, 100, { aspectRatio: 2 })).toEqual({ w: 120, h: 60 });
    expect(constrainSize(100, 100, { aspectRatio: 2, minHeight: 80 })).toEqual({ w: 160, h: 80 });
    expect(constrainSize(500, 400, { aspectRatio: 2, maxWidth: 200 })).toEqual({ w: 200, h: 100 });
  });

  it("reports conflicting hard bounds including conflicts implied by the ratio", () => {
    expect(constrainSize(100, 100, { minWidth: 200, maxWidth: 100 })).toBeNull();
    expect(constrainSize(100, 100, { minHeight: 200, maxHeight: 100 })).toBeNull();
    expect(constrainSize(100, 100, { maxWidth: 100, minHeight: 80, aspectRatio: 2 })).toBeNull();
    expect(constrainSize(100, 100, { minWidth: 80, maxWidth: 80, minHeight: 40, maxHeight: 40, aspectRatio: 2 })).toEqual({ w: 80, h: 40 });
  });

  it("rejects nonfinite or malformed suggestions and requirements", () => {
    for (const invalid of [NaN, Infinity, -Infinity]) {
      expect(constrainSize(invalid, 100, {})).toBeNull();
      expect(constrainSize(100, invalid, {})).toBeNull();
      expect(constrainSize(100, 100, { minWidth: invalid })).toBeNull();
      expect(constrainSize(100, 100, { aspectRatio: invalid })).toBeNull();
    }
    expect(constrainSize(100, 100, { aspectRatio: 0 })).toBeNull();
    expect(constrainSize(100, 100, { maxHeight: 10000 })).toBeNull();
    expect(constrainSize(100, 100, { minWidth: "80" as unknown as number })).toBeNull();
  });

  it("is stable when the same suggestion is applied repeatedly", () => {
    const spec = { minWidth: 80, maxWidth: 300, minHeight: 40, aspectRatio: 1.5 };
    const first = constrainSize(245, 110, spec)!;
    const again = constrainSize(first.w, first.h, spec)!;
    expect(again.w).toBeCloseTo(first.w, 10);
    expect(again.h).toBeCloseTo(first.h, 10);
    expect(first.w / first.h).toBeCloseTo(1.5, 12);
  });
});

describe("fixed-gap placement", () => {
  it("keeps the original input order while placing spatially ordered boxes at exactly the gap", () => {
    const boxes = [{ x: 100, y: 9, w: 20, h: 12 }, { x: 0, y: 5, w: 30, h: 14 }];
    const original = structuredClone(boxes);
    expect(spaceBoxes(boxes, "x", 10)).toEqual([{ x: 70, y: 9, w: 20, h: 12 }, { x: 30, y: 5, w: 30, h: 14 }]);
    expect(boxes).toEqual(original);
  });

  it("fits an exact chain into a holder and clamps each cross-axis position", () => {
    expect(spaceBoxes([{ x: -50, y: -10, w: 30, h: 20 }, { x: 10, y: 80, w: 20, h: 10 }], "x", 10, { x: 5, y: 5, w: 60, h: 40 })).toEqual([
      { x: 5, y: 5, w: 30, h: 20 }, { x: 45, y: 35, w: 20, h: 10 },
    ]);
    expect(spaceBoxes([{ x: 0, y: 30, w: 15, h: 20 }, { x: 5, y: 0, w: 20, h: 10 }], "y", 5, { x: 10, y: 20, w: 30, h: 35 })).toEqual([
      { x: 10, y: 35, w: 15, h: 20 }, { x: 10, y: 20, w: 20, h: 10 },
    ]);
  });

  it("reports insufficient space rather than reducing the requested gap or dimensions", () => {
    const boxes = [{ x: 0, y: 0, w: 30, h: 20 }, { x: 60, y: 0, w: 20, h: 10 }];
    expect(spaceBoxes(boxes, "x", 11, { x: 0, y: 0, w: 60, h: 40 })).toBeNull();
    expect(spaceBoxes(boxes, "y", 0, { x: 0, y: 0, w: 25, h: 40 })).toBeNull();
    expect(spaceBoxes(boxes, "x", -1)).toBeNull();
    expect(spaceBoxes(boxes, "x", Infinity)).toBeNull();
    expect(spaceBoxes([{ x: NaN, y: 0, w: 10, h: 10 }], "x", 5)).toBeNull();
    expect(spaceBoxes([], "x", 10)).toEqual([]);
  });

  it("breaks equal-position ties consistently and does not move an already spaced chain", () => {
    const tied = [{ x: 10, y: 0, w: 20, h: 20 }, { x: 10, y: 0, w: 20, h: 20 }];
    expect(spaceBoxes(tied, "x", 10)).toEqual([{ x: -5, y: 0, w: 20, h: 20 }, { x: 25, y: 0, w: 20, h: 20 }]);
    const placed = spaceBoxes(tied, "x", 10)!;
    expect(spaceBoxes(placed, "x", 10)).toEqual(placed);
  });
});

describe("dimension controls", () => {
  it("saves valid optional fields, rejects out-of-range entries and resets all fields", () => {
    const onChange = vi.fn();
    render(createElement(LayoutConstraintsPanel, { value: { maxWidth: 300 }, onChange }));
    const min = screen.getByTestId("constraint-minWidth");
    fireEvent.change(min, { target: { value: "80" } });
    fireEvent.blur(min);
    expect(onChange).toHaveBeenLastCalledWith({ maxWidth: 300, minWidth: 80 });
    onChange.mockClear();
    fireEvent.change(min, { target: { value: "1" } });
    fireEvent.blur(min);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("constraints-reset"));
    expect(onChange).toHaveBeenCalledWith({});
    expect((screen.getByTestId("constraint-minWidth") as HTMLInputElement).value).toBe("");
    expect(screen.getByTestId("studio-constraints")).toBeTruthy();
  });

  it("removes a cleared field and disables editing while saving", () => {
    const onChange = vi.fn();
    const view = render(createElement(LayoutConstraintsPanel, { value: { minWidth: 80, aspectRatio: 2 }, onChange }));
    fireEvent.change(screen.getByTestId("constraint-minWidth"), { target: { value: "" } });
    fireEvent.blur(screen.getByTestId("constraint-minWidth"));
    expect(onChange).toHaveBeenCalledWith({ aspectRatio: 2 });
    view.rerender(createElement(LayoutConstraintsPanel, { value: {}, busy: true, onChange }));
    expect((screen.getByTestId("constraint-aspectRatio") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId("constraints-reset") as HTMLButtonElement).disabled).toBe(true);
  });
});
