import { describe, expect, it } from "vitest";
import { tokensToClassName } from "./tokensToTw";

describe("media shape tokens", () => {
  it("adds media shape class for image shaping", () => {
    const className = tokensToClassName({
      effects: { mediaShape: "hexagon" },
    } as any);
    expect(className).toContain("cms-media-shape-hexagon");
  });

  it("does not add class when media shape is none", () => {
    const className = tokensToClassName({
      effects: { mediaShape: "none" },
    } as any);
    expect(className).not.toContain("cms-media-shape-");
  });
});
