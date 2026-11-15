import { describe, expect, it } from "vitest";
import { PREVIEW_MOST, previewSize } from "./videoFit";

describe("the video editor's preview on the screen", () => {
  it("is as it always was on a computer: the video's shape inside 560×315", () => {
    expect(previewSize({ w: 1280, h: 720 })).toEqual({ w: 560, h: 315 });
    expect(previewSize({ w: 720, h: 1280 })).toEqual({ w: 177, h: 315 });
    // A small video is never made bigger.
    expect(previewSize({ w: 320, h: 180 })).toEqual({ w: 320, h: 180 });
    // A computer's room is bigger than the most it takes: the room changes nothing.
    expect(previewSize({ w: 1280, h: 720 }, { w: 900, h: 500 })).toEqual(PREVIEW_MOST);
  });

  it("fits a phone's width, and a tall video fits the share of the height it is given", () => {
    // 366px of room across (a 390px screen less its margins): 16:9 takes all of it.
    expect(previewSize({ w: 1280, h: 720 }, { w: 366, h: 253 })).toEqual({ w: 366, h: 206 });
    // 9:16 is held by the height.
    expect(previewSize({ w: 720, h: 1280 }, { w: 366, h: 253 })).toEqual({ w: 142, h: 253 });
    // A room not measured yet (zero) never squeezes it to nothing.
    expect(previewSize({ w: 1280, h: 720 }, { w: 0, h: 0 })).toEqual({ w: 80, h: 45 });
    expect(previewSize({ w: 0, h: 0 }, { w: 366, h: 253 })).toEqual({ w: 0, h: 0 });
  });
});
