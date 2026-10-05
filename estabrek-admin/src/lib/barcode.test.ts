import { describe, expect, it } from "vitest";
import { canEncode, code128Svg, code128Widths, __PATTERNS_FOR_TEST } from "./barcode";

const bits = (t: string) => code128Widths(t).map((w, i) => (i % 2 === 0 ? "1" : "0").repeat(w)).join("");

describe("Code 128 barcodes", () => {
  it("every symbol is 11 modules wide (stop 13)", () => {
    expect(new Set(__PATTERNS_FOR_TEST.slice(0, 106).map((p) => [...p].reduce((a, b) => a + Number(b), 0)))).toEqual(new Set([11]));
    expect([...__PATTERNS_FOR_TEST[106]].reduce((a, b) => a + Number(b), 0)).toBe(13);
  });

  it("matches an independent encoder (python-barcode) for a shop SKU", () => {
    expect(bits("ROSE-ABAYA-BLACK-M")).toBe("11010010000110001011101000111011011011101000100011010001001101110010100011000100010110001010001100011101101000101000110001001101110010001011000100011011101010001100010001000110101100011101001101110010111011000101100111001100011101011");
  });

  it("only encodes printable ASCII; makes an SVG", () => {
    expect(canEncode("ABAYA-M")).toBe(true);
    expect(canEncode("عباية")).toBe(false);
    expect(code128Svg("AB-1")).toMatch(/^<svg[^>]+><rect/);
  });
});
