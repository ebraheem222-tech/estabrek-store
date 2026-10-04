import { describe, expect, it } from "vitest";
import { ALL_DIVIDER_STYLES } from "./containerStyles";

describe("containerStyles dividers", () => {
  it("has exactly 100 divider presets", () => {
    expect(ALL_DIVIDER_STYLES).toHaveLength(100);
  });

  it("uses unique divider ids", () => {
    const ids = ALL_DIVIDER_STYLES.map((divider) => divider.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
