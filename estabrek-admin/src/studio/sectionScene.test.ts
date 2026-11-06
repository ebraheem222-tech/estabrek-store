import { describe, expect, it } from "vitest";
import { sceneOf } from "../../../estabrek-storefront/src/pageTree/scene";

describe("untrusted section scene data", () => {
  it("accepts matrix rain without allowing unbounded values or unsafe colors", () => {
    expect(sceneOf({ kind: "matrix", color: "#00ffff", secondary: "accent", amount: 100, speed: 3, intensity: 2, interactive: true })).toEqual({ kind: "matrix", color: "#00ffff", secondary: "accent", amount: 100, speed: 3, intensity: 2, interactive: true });
    expect(sceneOf({ kind: "matrix", color: "url(evil)", secondary: "red;display:none", amount: 100000, speed: Infinity, intensity: NaN, interactive: "true" })).toEqual({ kind: "matrix", amount: 32, speed: 1, intensity: 1, interactive: false });
  });

  it("drops unknown backgrounds and unsafe colors while defaulting invalid settings", () => {
    expect(sceneOf(null)).toBeNull();
    expect(sceneOf({ kind: "scripts" })).toBeNull();
    expect(sceneOf({ kind: "constellation", color: "url(evil)", secondary: "red;display:none", amount: 7, speed: Infinity, intensity: -1, interactive: "true" })).toEqual({ kind: "constellation", amount: 32, speed: 1, intensity: 1, interactive: false });
    expect(sceneOf({ kind: "orbs", color: "#12345678", secondary: "accent", amount: 12.4, speed: 0, intensity: 0, interactive: true })).toEqual({ kind: "orbs", color: "#12345678", secondary: "accent", amount: 32, speed: 0, intensity: 0, interactive: true });
    expect(sceneOf({ kind: "snow", amount: 100, speed: 3, intensity: 2 })).toMatchObject({ amount: 100, speed: 3, intensity: 2 });
  });
});
