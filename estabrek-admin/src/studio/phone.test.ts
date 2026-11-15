import { describe, expect, it } from "vitest";
import { PHONE_TABS, SHEET_ICON, SHEET_VIEWS, SHEET_WORD, phoneFrame, phoneSheetTop, pinchStep } from "./phone";

describe("the editor on a phone: its sums", () => {
  it("fits the phone frame to the canvas by its width, as tall as the canvas shows", () => {
    // A 390-wide phone: the frame loses the two margins and fills the canvas's height at that zoom.
    const f = phoneFrame({ w: 390, h: 640 }, 390)!;
    expect(f.zoom).toBeCloseTo(374 / 390, 5);
    expect(Math.round(f.h * f.zoom)).toBe(624);
    // A screen wider than the frame shows it at its real size, never bigger.
    expect(phoneFrame({ w: 700, h: 500 }, 390)).toEqual({ zoom: 1, h: 484 });
    // A phone held sideways: a short canvas, and the frame is as tall as it shows.
    expect(phoneFrame({ w: 844, h: 236 }, 390)).toEqual({ zoom: 1, h: 220 });
    // A canvas squeezed to almost nothing still gets a frame a page can be read in.
    expect(phoneFrame({ w: 390, h: 120 }, 390)!.h).toBe(160);
    // No size yet: nothing to fit.
    expect(phoneFrame({ w: 0, h: 0 }, 390)).toBeNull();
    expect(phoneFrame({ w: 390, h: 10 }, 390)).toBeNull();
    // The sheet takes 56% of the screen above the 56px row of jobs: its top edge on an 844px screen.
    expect(phoneSheetTop(844)).toBe(315);
  });

  it("reads two fingers: the point between them, how far apart they got, how far they moved", () => {
    // Fingers move apart to twice the distance round the same middle: a zoom of 2, no move.
    const apart = pinchStep([{ x: 100, y: 200 }, { x: 200, y: 200 }], [{ x: 50, y: 200 }, { x: 250, y: 200 }]);
    expect(apart.scale).toBeCloseTo(2, 5);
    expect(apart.at).toEqual({ x: 150, y: 200 });
    expect(apart.move).toEqual({ x: 0, y: 0 });
    // Both slide the same way: no zoom, the canvas moves with them.
    const slide = pinchStep([{ x: 100, y: 200 }, { x: 200, y: 200 }], [{ x: 130, y: 260 }, { x: 230, y: 260 }]);
    expect(slide.scale).toBeCloseTo(1, 5);
    expect(slide.move).toEqual({ x: 30, y: 60 });
    // Fingers on top of each other say nothing about the zoom.
    expect(pinchStep([{ x: 10, y: 10 }, { x: 12, y: 10 }], [{ x: 10, y: 10 }, { x: 60, y: 10 }]).scale).toBe(1);
  });

  it("names every sheet in the three languages, and the bottom bar opens all but 'more'", () => {
    for (const view of SHEET_VIEWS) {
      expect(SHEET_WORD[view].split("|")).toHaveLength(3);
      expect(SHEET_ICON[view].length).toBeGreaterThan(0);
    }
    expect([...PHONE_TABS]).toEqual(SHEET_VIEWS.filter((v) => v !== "more"));
  });
});
