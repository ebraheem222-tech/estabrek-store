import { describe, expect, it } from "vitest";
import { PICTURE_FX, PICTURE_FX_POINTER, pictureFxOnPointer } from "../../../../shared/pictureFx";
import { PRODUCT_PICTURE_FX_OPTIONS, readProductPictureFx } from "./productPictureFx";

describe("settings → the product page's picture under the pointer", () => {
  it("offers the zoom first, then every kind that answers the pointer, each with a name", () => {
    expect(PRODUCT_PICTURE_FX_OPTIONS.map((o) => o.value)).toEqual(["none", ...PICTURE_FX.filter(pictureFxOnPointer), "3d"]);
    expect(PICTURE_FX_POINTER).toEqual(["ripple", "liquid", "shift"]);
    for (const option of PRODUCT_PICTURE_FX_OPTIONS) expect(option.label.trim().length).toBeGreaterThan(2);
    expect(new Set(PRODUCT_PICTURE_FX_OPTIONS.map((o) => o.label)).size).toBe(PRODUCT_PICTURE_FX_OPTIONS.length);
  });

  it("reads a saved kind, and the zoom for anything else (a reveal is for pictures that scroll into view)", () => {
    expect(readProductPictureFx("ripple")).toBe("ripple");
    expect(readProductPictureFx("liquid")).toBe("liquid");
    expect(readProductPictureFx("shift")).toBe("shift");
    expect(readProductPictureFx("3d")).toBe("3d");
    for (const other of [undefined, null, "", "none", "reveal", "zoom", 1, { kind: "ripple" }]) expect(readProductPictureFx(other)).toBe("none");
  });
});
